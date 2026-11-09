const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Dos usuarios: A es la dueña de la mascota; B es una persona ajena
const emailA = `test.consulta.a.${Date.now()}@pethub.cl`;
const emailB = `test.consulta.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA, tokenB;
let mascotaId;
let registroId; // la consulta completa que se crea en el primer test

describe("Historial de consultas: veterinario, motivo y recomendaciones - Sprint 5", () => {
  // Prepara todo UNA vez: usuarios y una mascota
  beforeAll(async () => {
    await request(app).post("/api/auth/registro").send({ nombre: "Ana Consulta", email: emailA, password });
    await request(app).post("/api/auth/registro").send({ nombre: "Beto Consulta", email: emailB, password });
    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    tokenA = loginA.body.token;
    tokenB = loginB.body.token;

    const mascota = await request(app).post("/api/mascotas").set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Luna", especie: "Perro" });
    mascotaId = mascota.body.id;
  });

  // Limpieza al final, en orden de dependencias
  afterAll(async () => {
    const filtro = { in: [emailA, emailB] };
    await prisma.registroMedico.deleteMany({ where: { mascota: { usuario: { email: filtro } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.usuario.deleteMany({ where: { email: filtro } });
    await prisma.$disconnect();
  });

  // --- Crear con los datos nuevos ---

  test("POST /api/registros-medicos guarda veterinario, motivo y recomendaciones", async () => {
    const res = await request(app).post("/api/registros-medicos").set("Authorization", `Bearer ${tokenA}`)
      .send({
        mascotaId,
        diagnostico: "Sano, sin alteraciones",
        fecha: "2026-09-12",
        veterinario: "  Dr. Sebastián Ohre ",
        motivo: "Control y desparasitación",
        recomendaciones: "Mantener esquema de vacunas.",
      });
    expect(res.status).toBe(201);
    expect(res.body.veterinario).toBe("Dr. Sebastián Ohre"); // sin espacios sobrantes
    expect(res.body.motivo).toBe("Control y desparasitación");
    expect(res.body.recomendaciones).toBe("Mantener esquema de vacunas.");
    registroId = res.body.id;
  });

  test("POST /api/registros-medicos sin esos datos los deja como no indicados", async () => {
    const res = await request(app).post("/api/registros-medicos").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, diagnostico: "Otitis", fecha: "2026-08-01" });
    expect(res.status).toBe(201);
    expect(res.body.veterinario).toBeNull();
    expect(res.body.motivo).toBeNull();
    expect(res.body.recomendaciones).toBeNull();
  });

  test("POST /api/registros-medicos rechaza un veterinario que no es texto", async () => {
    const res = await request(app).post("/api/registros-medicos").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, diagnostico: "Otitis", fecha: "2026-08-01", veterinario: { nombre: "Dr. X" } });
    expect(res.status).toBe(400);
  });

  test("POST /api/registros-medicos rechaza un motivo de más de 200 caracteres", async () => {
    const res = await request(app).post("/api/registros-medicos").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, diagnostico: "Otitis", fecha: "2026-08-01", motivo: "x".repeat(201) });
    expect(res.status).toBe(400);
  });

  test("POST /api/registros-medicos rechaza recomendaciones de más de 1000 caracteres", async () => {
    const res = await request(app).post("/api/registros-medicos").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, diagnostico: "Otitis", fecha: "2026-08-01", recomendaciones: "x".repeat(1001) });
    expect(res.status).toBe(400);
  });

  // --- Listar ---

  test("GET /api/registros-medicos/mascota/:id incluye los datos nuevos", async () => {
    const res = await request(app).get(`/api/registros-medicos/mascota/${mascotaId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const consulta = res.body.find((r) => r.id === registroId);
    expect(consulta.veterinario).toBe("Dr. Sebastián Ohre");
    expect(consulta.motivo).toBe("Control y desparasitación");
  });

  // --- Detalle de una consulta ---

  test("GET /api/registros-medicos/:id devuelve el detalle de la consulta", async () => {
    const res = await request(app).get(`/api/registros-medicos/${registroId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.diagnostico).toBe("Sano, sin alteraciones");
    expect(res.body.recomendaciones).toBe("Mantener esquema de vacunas.");
    expect(res.body.documentos).toEqual([]); // aún no tiene archivos adjuntos
    expect(res.body.mascota).toBeUndefined(); // la mascota no se devuelve
  });

  test("GET /api/registros-medicos/:id sin token es rechazado", async () => {
    const res = await request(app).get(`/api/registros-medicos/${registroId}`);
    expect(res.status).toBe(401);
  });

  test("GET /api/registros-medicos/:id con un id inválido responde 400", async () => {
    const res = await request(app).get("/api/registros-medicos/abc").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });

  test("GET /api/registros-medicos/:id de una consulta que no existe responde 404", async () => {
    const res = await request(app).get("/api/registros-medicos/999999999").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  test("GET /api/registros-medicos/:id de la mascota de otra persona responde 404", async () => {
    const res = await request(app).get(`/api/registros-medicos/${registroId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });
});
