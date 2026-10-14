const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Correo único por corrida para no chocar con datos reales ni con corridas anteriores.
const emailPrueba = `test.sprint1.${Date.now()}@pethub.cl`;
const passwordPrueba = "ClaveSegura123";

describe("Autenticación - Sprint 1 (S1-HU01 y S1-HU02)", () => {
  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: emailPrueba } });
    await prisma.$disconnect();
  });

  test("POST /api/auth/registro crea una cuenta nueva", async () => {
    const res = await request(app).post("/api/auth/registro").send({
      nombre: "Usuario de Prueba",
      email: emailPrueba,
      password: passwordPrueba,
    });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe(emailPrueba);
    expect(res.body.password).toBeUndefined(); // la contraseña (hash) nunca debe salir en la respuesta
  });

  test("POST /api/auth/registro rechaza un correo ya registrado", async () => {
    const res = await request(app).post("/api/auth/registro").send({
      nombre: "Otro nombre",
      email: emailPrueba,
      password: passwordPrueba,
    });

    expect(res.status).toBe(409);
  });

  test("POST /api/auth/registro rechaza datos incompletos", async () => {
    const res = await request(app)
      .post("/api/auth/registro")
      .send({ email: "incompleto@pethub.cl" });

    expect(res.status).toBe(400);
  });

  test("POST /api/auth/login entrega un token con credenciales correctas", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: emailPrueba,
      password: passwordPrueba,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.email).toBe(emailPrueba);
  });

  test("POST /api/auth/login rechaza una contraseña incorrecta", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: emailPrueba,
      password: "claveIncorrecta",
    });

    expect(res.status).toBe(401);
  });

  test("POST /api/auth/login rechaza un correo que no existe", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "noexiste@pethub.cl",
      password: passwordPrueba,
    });

    expect(res.status).toBe(401);
  });
});
