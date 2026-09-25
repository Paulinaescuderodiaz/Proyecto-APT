const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

const email = `test.recordatorio.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let token;
let mascotaId;
let vacunaPendienteId; // va a quedar "fallida" (sin pushToken)
let vacunaAplicadaId;  // misma fecha, pero ya aplicada -> no debe generar recordatorio

// Mismo cálculo que usa recordatorio.controller.js (revisarVacunasProximas):
// "dentro de 3 días", pero en UTC, para que calce exacto con el rango que arma el backend.
const hoy = new Date();
const fechaEn3Dias = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + 3));
const fechaEn3DiasStr = fechaEn3Dias.toISOString().split("T")[0]; // "AAAA-MM-DD"

describe("Recordatorios - Sprint 2 (S2-HU07)", () => {
  beforeAll(async () => {
    await request(app).post("/api/auth/registro").send({ nombre: "Usuaria Recordatorios", email, password });

    const login = await request(app).post("/api/auth/login").send({ email, password });
    token = login.body.token;

    const mascota = await request(app)
      .post("/api/mascotas")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Firulais", especie: "Perro" });
    mascotaId = mascota.body.id;

    // Vacuna 1: su refuerzo cae justo dentro de 3 días -> debería generar recordatorio
    const vacuna1 = await request(app)
      .post("/api/vacunas")
      .set("Authorization", `Bearer ${token}`)
      .send({ mascotaId, nombre: "Antirrábica", fechaAplicacion: "2026-01-10", fechaProximoRefuerzo: fechaEn3DiasStr });
    vacunaPendienteId = vacuna1.body.id;

    // Vacuna 2: MISMA fecha de refuerzo, pero la marcamos como ya aplicada
    const vacuna2 = await request(app)
      .post("/api/vacunas")
      .set("Authorization", `Bearer ${token}`)
      .send({ mascotaId, nombre: "Parvovirus", fechaAplicacion: "2026-01-10", fechaProximoRefuerzo: fechaEn3DiasStr });
    vacunaAplicadaId = vacuna2.body.id;

    await request(app)
      .put(`/api/vacunas/${vacunaAplicadaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ aplicada: true });
  });

  afterAll(async () => {
    await prisma.recordatorio.deleteMany({ where: { vacuna: { mascota: { usuario: { email } } } } });
    await prisma.vacuna.deleteMany({ where: { mascota: { usuario: { email } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email } } });
    await prisma.usuario.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  test("POST /api/recordatorios/ejecutar sin token es rechazado", async () => {
    const res = await request(app).post("/api/recordatorios/ejecutar");
    expect(res.status).toBe(401);
  });

  // Escenario 1 y 2 de S2-HU07: revisa las vacunas próximas y registra el recordatorio,
  // aunque el envío "falle" (acá siempre falla, porque el usuario no tiene pushToken)
  test("POST /api/recordatorios/ejecutar crea un recordatorio 'fallido' para la vacuna pendiente", async () => {
    const res = await request(app)
      .post("/api/recordatorios/ejecutar")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    const recordatorio = await prisma.recordatorio.findFirst({ where: { vacunaId: vacunaPendienteId } });
    expect(recordatorio).not.toBeNull();
    expect(recordatorio.estado).toBe("fallido");
  });

  // Escenario 3 de S2-HU07: "aplicada: false" excluye del todo a las vacunas ya aplicadas
  test("POST /api/recordatorios/ejecutar no genera recordatorio para una vacuna ya aplicada", async () => {
    const recordatorio = await prisma.recordatorio.findFirst({ where: { vacunaId: vacunaAplicadaId } });
    expect(recordatorio).toBeNull();
  });

  test("GET /api/recordatorios/pendientes sin token es rechazado", async () => {
    const res = await request(app).get("/api/recordatorios/pendientes");
    expect(res.status).toBe(401);
  });

  // Escenario 2 de S2-HU07: "muestra el recordatorio dentro de la app al iniciar sesión"
  test("GET /api/recordatorios/pendientes devuelve el recordatorio recién creado, una sola vez", async () => {
    const primeraConsulta = await request(app)
      .get("/api/recordatorios/pendientes")
      .set("Authorization", `Bearer ${token}`);

    expect(primeraConsulta.status).toBe(200);
    expect(primeraConsulta.body.some((r) => r.vacunaId === vacunaPendienteId)).toBe(true);

    // El GET anterior ya lo marcó como "visto" -> no debe volver a aparecer
    const segundaConsulta = await request(app)
      .get("/api/recordatorios/pendientes")
      .set("Authorization", `Bearer ${token}`);

    expect(segundaConsulta.body.some((r) => r.vacunaId === vacunaPendienteId)).toBe(false);
  });
});
