const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

const emailA = `test.registro.a.${Date.now()}@pethub.cl`;
const emailB = `test.registro.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA;
let tokenB;
let mascotaId;

describe("Registro Médico - Sprint 2 (S2-HU05)", () => {
  beforeAll(async () => {
    await request(app).post("/api/auth/registro").send({ nombre: "Usuaria A", email: emailA, password });
    await request(app).post("/api/auth/registro").send({ nombre: "Usuaria B", email: emailB, password });

    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    tokenA = loginA.body.token;

    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    tokenB = loginB.body.token;

    const mascota = await request(app)
      .post("/api/mascotas")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Firulais", especie: "Perro" });
    mascotaId = mascota.body.id;
  });

  afterAll(async () => {
    // El orden importa: primero se borran los registros médicos (dependen de la mascota),
    // recién después la mascota, y al final los usuarios.
    await prisma.registroMedico.deleteMany({ where: { mascota: { usuario: { email: { in: [emailA, emailB] } } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email: { in: [emailA, emailB] } } } });
    await prisma.usuario.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await prisma.$disconnect();
  });

  test("POST /api/registros-medicos sin token es rechazado", async () => {
    const res = await request(app).post("/api/registros-medicos").send({ mascotaId, diagnostico: "Otitis" });
    expect(res.status).toBe(401);
  });

  // Escenario 1 de S2-HU05: registrar un diagnóstico correctamente
  test("POST /api/registros-medicos crea un registro con diagnóstico y tratamiento", async () => {
    const res = await request(app)
      .post("/api/registros-medicos")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        mascotaId,
        diagnostico: "Otitis",
        fecha: "2026-08-01",
        tratamiento: "Gotas óticas por 7 días",
      });

    expect(res.status).toBe(201);
    expect(res.body.diagnostico).toBe("Otitis");
  });

  // Escenario 2 de S2-HU05: el diagnóstico es obligatorio, con su mensaje específico
  test("POST /api/registros-medicos rechaza un registro sin diagnóstico", async () => {
    const res = await request(app)
      .post("/api/registros-medicos")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, fecha: "2026-08-01" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Debes indicar un diagnóstico");
  });

  test("POST /api/registros-medicos rechaza una mascota que no es del usuario", async () => {
    const res = await request(app)
      .post("/api/registros-medicos")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ mascotaId, diagnostico: "Otitis", fecha: "2026-08-01" });

    expect(res.status).toBe(404);
  });

  // Escenario 3 de S2-HU05: "del más reciente al más antiguo"
  test("GET /api/registros-medicos/mascota/:id devuelve el historial del más nuevo al más viejo", async () => {
    // Agregamos un segundo registro, con fecha MÁS VIEJA que el primero (2026-08-01),
    // para comprobar que el orden no depende de cuál se creó primero.
    await request(app)
      .post("/api/registros-medicos")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, diagnostico: "Control de rutina", fecha: "2026-01-15" });

    const res = await request(app)
      .get(`/api/registros-medicos/mascota/${mascotaId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    // "Otitis" (2026-08-01) es más reciente, así que debe aparecer primero
    expect(res.body[0].diagnostico).toBe("Otitis");
    expect(res.body[1].diagnostico).toBe("Control de rutina");
  });

  test("GET /api/registros-medicos/mascota/:id rechaza a un usuario que no es dueño", async () => {
    const res = await request(app)
      .get(`/api/registros-medicos/mascota/${mascotaId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});