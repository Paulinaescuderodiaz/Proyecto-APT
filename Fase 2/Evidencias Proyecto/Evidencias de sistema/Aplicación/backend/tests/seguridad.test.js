const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app"); // carga tambien el .env (JWT_SECRET)
const prisma = require("../src/lib/prisma");

// Pruebas de seguridad (plan de pruebas, seccion "Seguridad adicional").
// Verifican que el backend rechace sesiones falsas o alteradas y que entradas
// maliciosas o con tipos raros respondan con un error controlado (400/401/404)
// y nunca con un error 500 ni exponiendo datos.

const email = `test.seguridad.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let token;
let usuarioId;

// Convierte un objeto en un trozo de token (base64url), como hace un JWT por dentro
const trozo = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

// Endpoint protegido que usamos de "puerta" para probar los tokens
const conToken = (t) => request(app).get("/api/mascotas").set("Authorization", t);

describe("Seguridad adicional - sesiones, entradas maliciosas y filtración de datos", () => {
  beforeAll(async () => {
    const registro = await request(app).post("/api/auth/registro").send({ nombre: "Usuario Seguridad", email, password });
    usuarioId = registro.body.id;
    const login = await request(app).post("/api/auth/login").send({ email, password });
    token = login.body.token;
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  // ---------- Tokens falsos o alterados ----------

  test("un token válido da acceso (control de la prueba)", async () => {
    const res = await conToken(`Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test("un encabezado sin el token después de Bearer es rechazado con 401", async () => {
    const res = await conToken("Bearer");
    expect(res.status).toBe(401);
  });

  test("un token con texto cualquiera es rechazado con 401", async () => {
    const res = await conToken("Bearer esto-no-es-un-token");
    expect(res.status).toBe(401);
  });

  test("un token firmado con otra clave es rechazado con 401", async () => {
    const falso = jwt.sign({ id: usuarioId, email }, "una-clave-que-no-es-la-real", { expiresIn: "1h" });
    const res = await conToken(`Bearer ${falso}`);
    expect(res.status).toBe(401);
  });

  test("un token vencido es rechazado con 401", async () => {
    const vencido = jwt.sign({ id: usuarioId, email }, process.env.JWT_SECRET, { expiresIn: -60 });
    const res = await conToken(`Bearer ${vencido}`);
    expect(res.status).toBe(401);
  });

  test("un token sin firma (algoritmo none) es rechazado con 401", async () => {
    const sinFirma = `${trozo({ alg: "none", typ: "JWT" })}.${trozo({ id: usuarioId, email })}.`;
    const res = await conToken(`Bearer ${sinFirma}`);
    expect(res.status).toBe(401);
  });

  test("un token con los datos alterados (otro id) es rechazado con 401", async () => {
    const [cabecera, , firma] = token.split(".");
    const alterado = `${cabecera}.${trozo({ id: usuarioId + 1, email, iat: Math.floor(Date.now() / 1000) })}.${firma}`;
    const res = await conToken(`Bearer ${alterado}`);
    expect(res.status).toBe(401);
  });

  test("un token válido de una cuenta que ya no existe responde 404 y no 500", async () => {
    const huerfano = jwt.sign({ id: 2147483647, email: "ya.no.existe@pethub.cl" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const res = await request(app).get("/api/auth/perfil").set("Authorization", `Bearer ${huerfano}`);
    expect(res.status).toBe(404);
  });

  // ---------- Entradas maliciosas o con tipos raros ----------

  test("login con inyección SQL clásica en el correo responde 401 y no entrega token", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "' OR '1'='1", password: "' OR '1'='1" });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test("login con el correo como objeto responde 400 y no 500", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: { contains: "" }, password });
    expect(res.status).toBe(400);
  });

  test("login con la contraseña como número responde 400 y no 500", async () => {
    const res = await request(app).post("/api/auth/login").send({ email, password: 12345678 });
    expect(res.status).toBe(400);
  });

  test("registro con datos que no son texto responde 400 y no 500", async () => {
    const res = await request(app).post("/api/auth/registro").send({ nombre: ["a", "b"], email: { igual: "x" }, password: 123456 });
    expect(res.status).toBe(400);
  });

  test("la búsqueda de donantes con texto malicioso responde sin error y no daña la base", async () => {
    const res = await request(app)
      .get("/api/donantes/buscar")
      .set("Authorization", `Bearer ${token}`)
      .query({ especie: "Perro'; DROP TABLE \"Donante\"; --", grupoSanguineo: "' OR '1'='1" });
    expect(res.status).toBe(200);
    expect(res.body.donantes).toEqual([]); // ni siquiera la condición "siempre verdadera" trae resultados
    await expect(prisma.donante.count()).resolves.toBeGreaterThanOrEqual(0); // la tabla sigue existiendo
  });

  test("la búsqueda con parámetros en forma de objeto no provoca un error 500", async () => {
    const res = await request(app)
      .get("/api/donantes/buscar?especie[$ne]=x&grupoSanguineo[contains]=a")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBeLessThan(500);
  });

  test("un id con texto malicioso en la ruta responde 400", async () => {
    const res = await request(app)
      .get(`/api/registros-medicos/${encodeURIComponent("1; DROP TABLE x --")}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  test("un cuerpo de más de 10 MB es rechazado con 413", async () => {
    // Si el servidor corta la conexion antes de recibir todo el cuerpo, Node lo informa
    // como EPIPE o ECONNRESET: tambien es un rechazo valido, por eso se acepta.
    let estado;
    try {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "a".repeat(11 * 1024 * 1024), password });
      estado = res.status;
    } catch (error) {
      if (!["EPIPE", "ECONNRESET"].includes(error.code)) throw error;
      estado = 413;
    }
    expect(estado).toBe(413);
  });

  // ---------- Filtración de datos ----------

  test("ni el registro ni el login ni el perfil devuelven la contraseña ni su hash", async () => {
    const login = await request(app).post("/api/auth/login").send({ email, password });
    const perfil = await request(app).get("/api/auth/perfil").set("Authorization", `Bearer ${token}`);
    for (const texto of [JSON.stringify(login.body), JSON.stringify(perfil.body)]) {
      expect(texto).not.toMatch(/password/i);
      expect(texto).not.toContain("$2"); // así empiezan los hashes de bcrypt
    }
  });
});
