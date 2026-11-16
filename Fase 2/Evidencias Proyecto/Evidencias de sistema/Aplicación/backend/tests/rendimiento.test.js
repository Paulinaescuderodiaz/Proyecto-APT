const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Pruebas de rendimiento (plan de pruebas, seccion "Rendimiento").
// Miden cuanto tarda la API en responder a los endpoints mas usados, primero
// de a una peticion y luego con 20 personas usando la plataforma a la vez.
// Los limites son metas del equipo: si tu computador es mas lento, ajusta
// estos dos numeros, pero no los quites.
const LIMITE_LECTURA_MS = 500; // listar y buscar: el 95% debe responder bajo este tiempo
const LIMITE_LOGIN_MS = 1000; // el login es mas lento a proposito (cifrado bcrypt)
const USUARIOS_SIMULTANEOS = 20;

jest.setTimeout(60000);

const email = `test.rendimiento.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";
const grupo = `GRUPO-RENDIMIENTO-${Date.now()}`; // solo encuentra a los donantes de esta prueba

let token;
const resumen = [];

// Cuanto tarda (en milisegundos) una peticion; devuelve su estado y su tiempo.
async function medir(peticion) {
  const inicio = process.hrtime.bigint();
  const res = await peticion();
  const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
  return { estado: res.status, ms };
}

// Percentil por "rango mas cercano": p95 = el tiempo bajo el cual responde el 95%.
function percentil(tiempos, p) {
  const orden = [...tiempos].sort((a, b) => a - b);
  const indice = Math.min(orden.length - 1, Math.ceil((p / 100) * orden.length) - 1);
  return orden[indice];
}

// Guarda una linea para el informe final y devuelve las estadisticas.
function registrar(nombre, mediciones) {
  const tiempos = mediciones.map((m) => m.ms);
  const stats = { mediana: percentil(tiempos, 50), p95: percentil(tiempos, 95), maximo: Math.max(...tiempos) };
  resumen.push(
    `${nombre} (${mediciones.length} peticiones): mediana ${stats.mediana.toFixed(0)} ms, ` +
      `p95 ${stats.p95.toFixed(0)} ms, maximo ${stats.maximo.toFixed(0)} ms`
  );
  return stats;
}

const conSesion = () => ({ Authorization: `Bearer ${token}` });

describe("Rendimiento - tiempos de respuesta de los endpoints mas usados", () => {
  beforeAll(async () => {
    await request(app).post("/api/auth/registro").send({ nombre: "Usuario Rendimiento", email, password });
    const login = await request(app).post("/api/auth/login").send({ email, password });
    token = login.body.token;

    // Una mascota donante para que la lista y la busqueda tengan algo que devolver
    const mascota = await request(app)
      .post("/api/mascotas")
      .set(conSesion())
      .send({ nombre: "Rocky", especie: "Perro" });
    await request(app)
      .post("/api/donantes")
      .set(conSesion())
      .send({ mascotaId: mascota.body.id, grupoSanguineo: grupo, cumpleRequisitos: true });
  });

  afterAll(async () => {
    console.log(["", "Informe de rendimiento:", ...resumen.map((linea) => `  - ${linea}`)].join("\n"));
    await prisma.donante.deleteMany({ where: { mascota: { usuario: { email } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email } } });
    await prisma.usuario.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  test("GET /api/mascotas, una persona a la vez: el 95% responde bajo el límite", async () => {
    const mediciones = [];
    for (let i = 0; i < 30; i++) {
      mediciones.push(await medir(() => request(app).get("/api/mascotas").set(conSesion())));
    }
    const stats = registrar("GET /api/mascotas, secuencial", mediciones);
    expect(mediciones.every((m) => m.estado === 200)).toBe(true);
    expect(stats.p95).toBeLessThan(LIMITE_LECTURA_MS);
  });

  test("GET /api/mascotas con 20 personas a la vez: todas responden 200 y el 95% bajo el límite", async () => {
    const mediciones = await Promise.all(
      Array.from({ length: USUARIOS_SIMULTANEOS }, () => medir(() => request(app).get("/api/mascotas").set(conSesion())))
    );
    const stats = registrar(`GET /api/mascotas, ${USUARIOS_SIMULTANEOS} a la vez`, mediciones);
    expect(mediciones.every((m) => m.estado === 200)).toBe(true);
    expect(stats.p95).toBeLessThan(LIMITE_LECTURA_MS);
  });

  test("GET /api/donantes/buscar con 20 personas a la vez: todas responden 200 y el 95% bajo el límite", async () => {
    const mediciones = await Promise.all(
      Array.from({ length: USUARIOS_SIMULTANEOS }, () =>
        medir(() =>
          request(app)
            .get("/api/donantes/buscar")
            .set(conSesion())
            .query({ especie: "Perro", grupoSanguineo: grupo })
        )
      )
    );
    const stats = registrar(`GET /api/donantes/buscar, ${USUARIOS_SIMULTANEOS} a la vez`, mediciones);
    expect(mediciones.every((m) => m.estado === 200)).toBe(true);
    expect(stats.p95).toBeLessThan(LIMITE_LECTURA_MS);
  });

  test("POST /api/auth/login, una persona a la vez: el 95% responde bajo el límite", async () => {
    const mediciones = [];
    for (let i = 0; i < 10; i++) {
      mediciones.push(await medir(() => request(app).post("/api/auth/login").send({ email, password })));
    }
    const stats = registrar("POST /api/auth/login, secuencial", mediciones);
    expect(mediciones.every((m) => m.estado === 200)).toBe(true);
    expect(stats.p95).toBeLessThan(LIMITE_LOGIN_MS);
  });

  test("uso mixto con 20 personas a la vez (perfil, mascotas, notificaciones, búsqueda): ninguna falla", async () => {
    const rutas = [
      () => request(app).get("/api/auth/perfil").set(conSesion()),
      () => request(app).get("/api/mascotas").set(conSesion()),
      () => request(app).get("/api/notificaciones").set(conSesion()),
      () => request(app).get("/api/donantes/buscar").set(conSesion()).query({ especie: "Perro", grupoSanguineo: grupo }),
    ];
    const mediciones = await Promise.all(
      Array.from({ length: USUARIOS_SIMULTANEOS }, (_, i) => medir(rutas[i % rutas.length]))
    );
    const stats = registrar(`Uso mixto, ${USUARIOS_SIMULTANEOS} a la vez`, mediciones);
    expect(mediciones.every((m) => m.estado === 200)).toBe(true);
    expect(stats.p95).toBeLessThan(LIMITE_LECTURA_MS);
  });
});
