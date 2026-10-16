const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Dos usuarios de prueba, como en vacuna.test.js. Usamos Date.now()
// para que el email sea distinto cada vez y no choque con datos anteriores.
const emailA = `test.donante.a.${Date.now()}@pethub.cl`;
const emailB = `test.donante.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA;
let tokenB;
let mascotaId; // mascota del usuario A

describe("Donantes - Sprint 3 (S3-HU08)", () => {
  // Se ejecuta UNA vez antes de las pruebas: crea los usuarios,
  // los loguea y crea una mascota para el usuario A.
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

      // Caso: la dueña no declara que la mascota cumple los requisitos
  test("POST /api/donantes rechaza si no se declara que cumple los requisitos", async () => {
    const res = await request(app)
      .post("/api/donantes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, grupoSanguineo: "DEA 1.1 positivo" }); // falta cumpleRequisitos

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Debes declarar que tu mascota cumple los requisitos para donar");
  });

  // Caso: inscripción correcta con grupo sanguíneo -> queda "activo"
  test("POST /api/donantes inscribe a la mascota como donante activo si indica grupo sanguíneo", async () => {
    const res = await request(app)
      .post("/api/donantes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, grupoSanguineo: "DEA 1.1 positivo", cumpleRequisitos: true });

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe("activo");
    expect(res.body.grupoSanguineo).toBe("DEA 1.1 positivo");
    expect(res.body.aviso).toBeDefined(); // aviso de validación por veterinario
  });

  // Caso: la misma mascota no se puede inscribir dos veces
  test("POST /api/donantes rechaza inscribir dos veces a la misma mascota", async () => {
    const res = await request(app)
      .post("/api/donantes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, grupoSanguineo: "DEA 1.1 positivo", cumpleRequisitos: true });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Esta mascota ya está registrada como donante");
  });
  

  // Se ejecuta UNA vez al final: borra lo que crearon las pruebas.
  // El orden importa: primero donantes, luego mascotas, luego usuarios.
  afterAll(async () => {
    await prisma.donante.deleteMany({ where: { mascota: { usuario: { email: { in: [emailA, emailB] } } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email: { in: [emailA, emailB] } } } });
    await prisma.usuario.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await prisma.$disconnect();
  });

  // Sin token no se puede inscribir a nadie
  test("POST /api/donantes sin token es rechazado", async () => {
    const res = await request(app).post("/api/donantes").send({ mascotaId, cumpleRequisitos: true });
    expect(res.status).toBe(401);
  });

    // Caso: sin grupo sanguíneo -> la mascota queda "pendiente"
  test("POST /api/donantes deja la inscripción pendiente si no se indica el grupo sanguíneo", async () => {
    // Creamos una segunda mascota del usuario A (la primera ya quedó inscrita)
    const nueva = await request(app)
      .post("/api/mascotas")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Luna", especie: "Gato" });

    const res = await request(app)
      .post("/api/donantes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId: nueva.body.id, cumpleRequisitos: true }); // sin grupoSanguineo

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe("pendiente");
    expect(res.body.grupoSanguineo).toBeNull();
  });

  // Caso de seguridad: el usuario B no puede inscribir la mascota del usuario A
  test("POST /api/donantes no permite inscribir la mascota de otra persona", async () => {
    const res = await request(app)
      .post("/api/donantes")
      .set("Authorization", `Bearer ${tokenB}`) // token de B, pero la mascota es de A
      .send({ mascotaId, cumpleRequisitos: true });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Mascota no encontrada");
  });

  // Caso: falta la mascota en la petición
  test("POST /api/donantes rechaza si falta la mascota", async () => {
    const res = await request(app)
      .post("/api/donantes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ cumpleRequisitos: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Faltan datos: la mascota es obligatoria");
  });
});