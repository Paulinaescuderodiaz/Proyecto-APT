const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Dos usuarios: A es la dueña de la mascota; B es una persona ajena
const emailA = `test.vacunanotas.a.${Date.now()}@pethub.cl`;
const emailB = `test.vacunanotas.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA, tokenB;
let mascotaId;
let vacunaId; // la vacuna que se crea con notas

describe("Vacunas: notas y estado aplicada - Sprint 5", () => {
  // Prepara todo UNA vez: usuarios y una mascota
  beforeAll(async () => {
    await request(app).post("/api/auth/registro").send({ nombre: "Ana Vacuna", email: emailA, password });
    await request(app).post("/api/auth/registro").send({ nombre: "Beto Vacuna", email: emailB, password });
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
    await prisma.recordatorio.deleteMany({ where: { vacuna: { mascota: { usuario: { email: filtro } } } } });
    await prisma.vacuna.deleteMany({ where: { mascota: { usuario: { email: filtro } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.usuario.deleteMany({ where: { email: filtro } });
    await prisma.$disconnect();
  });

  // --- Crear con notas ---

  test("POST /api/vacunas guarda las notas (sin espacios sobrantes)", async () => {
    const res = await request(app).post("/api/vacunas").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, nombre: "Óctuple", fechaAplicacion: "2026-09-12", notas: "  Buena tolerancia, sin reacciones.  " });
    expect(res.status).toBe(201);
    expect(res.body.notas).toBe("Buena tolerancia, sin reacciones.");
    vacunaId = res.body.id;
  });

  test("POST /api/vacunas sin notas las deja como no indicadas", async () => {
    const res = await request(app).post("/api/vacunas").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, nombre: "Rabia", fechaAplicacion: "2026-09-12" });
    expect(res.status).toBe(201);
    expect(res.body.notas).toBeNull();
  });

  test("POST /api/vacunas rechaza notas que no son texto", async () => {
    const res = await request(app).post("/api/vacunas").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, nombre: "Leptospirosis", fechaAplicacion: "2026-09-12", notas: { texto: "hola" } });
    expect(res.status).toBe(400);
  });

  test("POST /api/vacunas rechaza notas de más de 500 caracteres", async () => {
    const res = await request(app).post("/api/vacunas").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, nombre: "Leptospirosis", fechaAplicacion: "2026-09-12", notas: "x".repeat(501) });
    expect(res.status).toBe(400);
  });

  // --- Listar: notas y estado ---

  test("GET /api/vacunas/mascota/:id devuelve las notas y el estado aplicada", async () => {
    const res = await request(app).get(`/api/vacunas/mascota/${mascotaId}`).set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const octuple = res.body.find((v) => v.id === vacunaId);
    expect(octuple.notas).toBe("Buena tolerancia, sin reacciones.");
    expect(octuple.aplicada).toBe(false); // por defecto, el refuerzo aún no está cerrado
  });

  // --- Editar ---

  test("PUT /api/vacunas/:id edita las notas", async () => {
    const res = await request(app).put(`/api/vacunas/${vacunaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ notas: "Leve decaimiento por un día." });
    expect(res.status).toBe(200);
    expect(res.body.notas).toBe("Leve decaimiento por un día.");
  });

  test("PUT /api/vacunas/:id sin notas no las borra", async () => {
    const res = await request(app).put(`/api/vacunas/${vacunaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Óctuple (refuerzo anual)" });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Óctuple (refuerzo anual)");
    expect(res.body.notas).toBe("Leve decaimiento por un día."); // sigue igual
  });

  test("PUT /api/vacunas/:id permite marcar la vacuna como aplicada", async () => {
    const res = await request(app).put(`/api/vacunas/${vacunaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ aplicada: true });
    expect(res.status).toBe(200);
    expect(res.body.aplicada).toBe(true);
  });

  test("PUT /api/vacunas/:id rechaza notas de más de 500 caracteres", async () => {
    const res = await request(app).put(`/api/vacunas/${vacunaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ notas: "x".repeat(501) });
    expect(res.status).toBe(400);
  });

  test("PUT /api/vacunas/:id rechaza editar la vacuna de otra persona", async () => {
    const res = await request(app).put(`/api/vacunas/${vacunaId}`).set("Authorization", `Bearer ${tokenB}`)
      .send({ notas: "intento ajeno" });
    expect(res.status).toBe(404);
  });

  test("PUT /api/vacunas/:id con texto vacío borra las notas", async () => {
    const res = await request(app).put(`/api/vacunas/${vacunaId}`).set("Authorization", `Bearer ${tokenA}`)
      .send({ notas: "" });
    expect(res.status).toBe(200);
    expect(res.body.notas).toBeNull();
  });
});
