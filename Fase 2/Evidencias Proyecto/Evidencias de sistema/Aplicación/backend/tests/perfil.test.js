const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Tres cuentas de prueba, con correo único por ejecución
const emailA = `test.perfil.a.${Date.now()}@pethub.cl`;
const emailB = `test.perfil.b.${Date.now()}@pethub.cl`;
const emailC = `test.perfil.c.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA, tokenB;

describe("Perfil de usuario - Sprint 5 (teléfono, comuna, ver y editar perfil)", () => {
  // Prepara todo UNA vez: dos cuentas con sesión iniciada
  beforeAll(async () => {
    await request(app).post("/api/auth/registro").send({
      nombre: "Ana Perfil", email: emailA, password, telefono: " +56 9 1111 2222 ", comuna: "Viña del Mar",
    });
    await request(app).post("/api/auth/registro").send({ nombre: "Beto Perfil", email: emailB, password });

    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    tokenA = loginA.body.token;
    tokenB = loginB.body.token;
  });

  // Limpieza al final
  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: { in: [emailA, emailB, emailC] } } });
    await prisma.$disconnect();
  });

  // --- Registro con teléfono ---

  test("El registro guarda el teléfono y la comuna sin espacios sobrantes", async () => {
    const guardado = await prisma.usuario.findUnique({ where: { email: emailA } });
    expect(guardado.telefono).toBe("+56 9 1111 2222");
    expect(guardado.comuna).toBe("Viña del Mar");
  });

  test("El registro funciona sin teléfono ni comuna (quedan como no indicados)", async () => {
    const guardado = await prisma.usuario.findUnique({ where: { email: emailB } });
    expect(guardado).not.toBeNull();
    expect(guardado.telefono).toBeNull();
    expect(guardado.comuna).toBeNull();
  });

  test("El registro rechaza un teléfono con tipo inválido", async () => {
    const res = await request(app).post("/api/auth/registro").send({
      nombre: "Carla Perfil", email: emailC, password, telefono: { numero: "123" },
    });
    expect(res.status).toBe(400);
  });

  // --- Ver perfil ---

  test("GET /api/auth/perfil sin token es rechazado", async () => {
    const res = await request(app).get("/api/auth/perfil");
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/perfil devuelve mis datos y nunca la contraseña", async () => {
    const res = await request(app).get("/api/auth/perfil").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Ana Perfil");
    expect(res.body.email).toBe(emailA);
    expect(res.body.telefono).toBe("+56 9 1111 2222");
    expect(res.body.comuna).toBe("Viña del Mar");
    expect(res.body.password).toBeUndefined();
  });

  test("Cada usuario ve solo su propio perfil", async () => {
    const res = await request(app).get("/api/auth/perfil").set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(emailB);
    expect(res.body.telefono).toBeNull();
  });

  // --- Editar perfil ---

  test("PUT /api/auth/perfil sin token es rechazado", async () => {
    const res = await request(app).put("/api/auth/perfil").send({ nombre: "Intruso" });
    expect(res.status).toBe(401);
  });

  test("PUT /api/auth/perfil actualiza nombre, teléfono y comuna", async () => {
    const res = await request(app).put("/api/auth/perfil").set("Authorization", `Bearer ${tokenB}`)
      .send({ nombre: "  Beto Editado ", telefono: "987654321", comuna: "Valparaíso" });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Beto Editado");
    expect(res.body.telefono).toBe("987654321");
    expect(res.body.comuna).toBe("Valparaíso");

    // y queda guardado de verdad
    const otra = await request(app).get("/api/auth/perfil").set("Authorization", `Bearer ${tokenB}`);
    expect(otra.body.nombre).toBe("Beto Editado");
  });

  test("PUT /api/auth/perfil cambia solo lo que se envía", async () => {
    const res = await request(app).put("/api/auth/perfil").set("Authorization", `Bearer ${tokenB}`)
      .send({ comuna: "Quilpué" });
    expect(res.status).toBe(200);
    expect(res.body.comuna).toBe("Quilpué");
    expect(res.body.nombre).toBe("Beto Editado"); // no se tocó
    expect(res.body.telefono).toBe("987654321"); // no se tocó
  });

  test("PUT /api/auth/perfil con texto vacío borra el teléfono", async () => {
    const res = await request(app).put("/api/auth/perfil").set("Authorization", `Bearer ${tokenB}`)
      .send({ telefono: "" });
    expect(res.status).toBe(200);
    expect(res.body.telefono).toBeNull();
  });

  test("PUT /api/auth/perfil rechaza un nombre vacío", async () => {
    const res = await request(app).put("/api/auth/perfil").set("Authorization", `Bearer ${tokenB}`)
      .send({ nombre: "   " });
    expect(res.status).toBe(400);
  });

  test("PUT /api/auth/perfil no permite cambiar el correo", async () => {
    const res = await request(app).put("/api/auth/perfil").set("Authorization", `Bearer ${tokenB}`)
      .send({ email: "otro@pethub.cl", nombre: "Beto Final" });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(emailB); // el correo sigue igual
    expect(res.body.nombre).toBe("Beto Final");
  });
});
