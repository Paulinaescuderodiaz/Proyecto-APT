const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Igual que en mascota.test.js: dos usuarios distintos para poder probar
// que cada uno solo ve/edita SUS PROPIAS vacunas.
const emailA = `test.vacuna.a.${Date.now()}@pethub.cl`;
const emailB = `test.vacuna.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA;
let tokenB;
let mascotaId;
let vacunaId;

describe("Vacunas - Sprint 2 (S2-HU04)", () => {
  // Se ejecuta UNA vez, antes de todas las pruebas de este archivo:
  // crea los dos usuarios, los loguea, y crea una mascota para el usuario A
  // (todas las vacunas de las pruebas van a pertenecer a esa mascota).
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

  // Se ejecuta UNA vez, al final: borra todo lo que crearon las pruebas,
  // para no dejar basura de prueba en la base de datos real.
  afterAll(async () => {
    await prisma.vacuna.deleteMany({ where: { mascota: { usuario: { email: { in: [emailA, emailB] } } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email: { in: [emailA, emailB] } } } });
    await prisma.usuario.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await prisma.$disconnect();
  });

  test("POST /api/vacunas sin token es rechazado", async () => {
    const res = await request(app).post("/api/vacunas").send({ mascotaId, nombre: "Rábica" });
    expect(res.status).toBe(401);
  });

  // Escenario 1 de S2-HU04: registrar una vacuna con datos válidos
  test("POST /api/vacunas registra una vacuna con fecha de refuerzo válida", async () => {
    const res = await request(app)
      .post("/api/vacunas")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        mascotaId,
        nombre: "Antirrábica",
        fechaAplicacion: "2026-01-10",
        fechaProximoRefuerzo: "2027-01-10",
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Antirrábica");
    vacunaId = res.body.id; // la guardamos para usarla en las pruebas de editar
  });

  // Escenario 2 de S2-HU04: la fecha de refuerzo no puede ser anterior (ni igual) a la de aplicación
  test("POST /api/vacunas rechaza una fecha de refuerzo anterior a la de aplicación", async () => {
    const res = await request(app)
      .post("/api/vacunas")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        mascotaId,
        nombre: "Antirrábica",
        fechaAplicacion: "2026-01-10",
        fechaProximoRefuerzo: "2025-01-10",
      });

    expect(res.status).toBe(400);
  });

  // Escenario 3 de S2-HU04: "las muestra ordenada por fecha"
  test("GET /api/vacunas/mascota/:id devuelve las vacunas ordenadas por fecha de aplicación", async () => {
    // Agregamos una segunda vacuna con fecha ANTERIOR a la primera,
    // para comprobar que el orden no depende del orden en que se crearon.
    await request(app)
      .post("/api/vacunas")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, nombre: "Parvovirus", fechaAplicacion: "2025-06-01" });

    const res = await request(app)
      .get(`/api/vacunas/mascota/${mascotaId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    // "Parvovirus" (2025-06-01) debe salir ANTES que "Antirrábica" (2026-01-10)
    expect(res.body[0].nombre).toBe("Parvovirus");
    expect(res.body[1].nombre).toBe("Antirrábica");
  });

  test("GET /api/vacunas/mascota/:id rechaza a un usuario que no es dueño de la mascota", async () => {
    const res = await request(app)
      .get(`/api/vacunas/mascota/${mascotaId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  // Escenario 4 de S2-HU04: editar sin duplicar (update sobre el mismo id, no create)
  test("PUT /api/vacunas/:id edita la vacuna sin crear una duplicada", async () => {
    const res = await request(app)
      .put(`/api/vacunas/${vacunaId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ aplicada: true });

    expect(res.status).toBe(200);
    expect(res.body.aplicada).toBe(true);

    const listado = await request(app)
      .get(`/api/vacunas/mascota/${mascotaId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    // Seguían siendo 2 vacunas en total: la edición no agregó una tercera
    expect(listado.body.length).toBe(2);
  });

  test("PUT /api/vacunas/:id rechaza editar una vacuna de otro usuario", async () => {
    const res = await request(app)
      .put(`/api/vacunas/${vacunaId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ aplicada: false });

    expect(res.status).toBe(404);
  });
});