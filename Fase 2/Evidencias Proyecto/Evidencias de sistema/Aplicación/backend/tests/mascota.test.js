const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

const emailA = `test.mascota.a.${Date.now()}@pethub.cl`;
const emailB = `test.mascota.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA;
let tokenB;
let mascotaId;

describe("Mascotas - Sprint 1 (S1-HU03)", () => {
  beforeAll(async () => {
    await request(app).post("/api/auth/registro").send({ nombre: "Usuaria A", email: emailA, password });
    await request(app).post("/api/auth/registro").send({ nombre: "Usuaria B", email: emailB, password });

    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    tokenA = loginA.body.token;

    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    tokenB = loginB.body.token;
  });

  afterAll(async () => {
    await prisma.mascota.deleteMany({ where: { usuario: { email: { in: [emailA, emailB] } } } });
    await prisma.usuario.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await prisma.$disconnect();
  });

  test("POST /api/mascotas sin token es rechazado", async () => {
    const res = await request(app).post("/api/mascotas").send({ nombre: "Firulais", especie: "Perro" });
    expect(res.status).toBe(401);
  });

  test("POST /api/mascotas crea una mascota para el usuario autenticado", async () => {
    const res = await request(app)
      .post("/api/mascotas")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Firulais", especie: "Perro", raza: "Mestizo" });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Firulais");
    mascotaId = res.body.id;
  });

  test("GET /api/mascotas solo devuelve las mascotas del usuario dueño", async () => {
    const resA = await request(app).get("/api/mascotas").set("Authorization", `Bearer ${tokenA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.some((m) => m.id === mascotaId)).toBe(true);

    const resB = await request(app).get("/api/mascotas").set("Authorization", `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.some((m) => m.id === mascotaId)).toBe(false);
  });

  test("PUT /api/mascotas/:id permite al dueño editar sin duplicar el registro", async () => {
    const res = await request(app)
      .put(`/api/mascotas/${mascotaId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Firulais Editado" });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Firulais Editado");

    const listado = await request(app).get("/api/mascotas").set("Authorization", `Bearer ${tokenA}`);
    const coincidencias = listado.body.filter((m) => m.nombre === "Firulais Editado");
    expect(coincidencias.length).toBe(1); // confirma que no quedó duplicada
  });

  test("PUT /api/mascotas/:id rechaza editar una mascota de otro usuario", async () => {
    const res = await request(app)
      .put(`/api/mascotas/${mascotaId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ nombre: "Intento ajeno" });

    expect(res.status).toBe(404);
  });
});
