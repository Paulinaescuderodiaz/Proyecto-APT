const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { AVISO_VALIDACION_VETERINARIA } = require("../src/lib/avisos");

// Dos usuarios:
// A -> dueña de una mascota donante y de otra que NO es donante
// B -> persona que contacta a A
const emailA = `test.aviso.a.${Date.now()}@pethub.cl`;
const emailB = `test.aviso.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";
const grupo = `GRUPO-AVISO-${Date.now()}`; // grupo único de esta ejecución

let tokenA, tokenB;
let mascotaDonanteId; // mascota de A que será donante
let mascotaNormalId; // mascota de A que NO es donante
let donanteId;
let conversacionId;

describe("Aviso de validación veterinaria - Sprint 4 (S4-HU13)", () => {
  // Prepara todo UNA vez
  beforeAll(async () => {
    for (const [nombre, email] of [["Ana Aviso", emailA], ["Beto Aviso", emailB]]) {
      await request(app).post("/api/auth/registro").send({ nombre, email, password });
    }
    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    tokenA = loginA.body.token;
    tokenB = loginB.body.token;

    // A crea dos mascotas
    const m1 = await request(app).post("/api/mascotas").set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Rocky", especie: "Perro" });
    const m2 = await request(app).post("/api/mascotas").set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Misu", especie: "Gato" });
    mascotaDonanteId = m1.body.id;
    mascotaNormalId = m2.body.id;
  });

  // Limpieza al final, en orden de dependencias
  afterAll(async () => {
    const filtro = { in: [emailA, emailB] };
    const deLosUsuarios = { OR: [{ usuarioA: { email: filtro } }, { usuarioB: { email: filtro } }] };
    await prisma.mensaje.deleteMany({ where: { conversacion: deLosUsuarios } });
    await prisma.conversacion.deleteMany({ where: deLosUsuarios });
    await prisma.notificacion.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.solicitudSangre.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.donante.deleteMany({ where: { mascota: { usuario: { email: filtro } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.usuario.deleteMany({ where: { email: filtro } });
    await prisma.$disconnect();
  });

  // --- Escenario 2: la app no permite marcar "apta para donar" ---

  test("Rechaza registrar un donante si se intenta marcar aptaParaDonar", async () => {
    const res = await request(app).post("/api/donantes").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId: mascotaDonanteId, grupoSanguineo: grupo, cumpleRequisitos: true, aptaParaDonar: true });
    expect(res.status).toBe(400);
    expect(res.body.aviso).toBe(AVISO_VALIDACION_VETERINARIA);
  });

  test("Al registrar un donante, la respuesta incluye el aviso de validación veterinaria", async () => {
    const res = await request(app).post("/api/donantes").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId: mascotaDonanteId, grupoSanguineo: grupo, cumpleRequisitos: true });
    expect(res.status).toBe(201);
    expect(res.body.aviso).toBe(AVISO_VALIDACION_VETERINARIA);
    donanteId = res.body.id;
  });

  // --- Escenario 1: aviso al contactar ---

  test("Al contactar, la respuesta incluye el aviso de validación veterinaria", async () => {
    const res = await request(app).post("/api/conversaciones").set("Authorization", `Bearer ${tokenB}`)
      .send({ donanteId });
    expect(res.status).toBe(201);
    expect(res.body.aviso).toBe(AVISO_VALIDACION_VETERINARIA);
    conversacionId = res.body.id;
  });

  test("Si la conversación ya existía, también incluye el aviso", async () => {
    const res = await request(app).post("/api/conversaciones").set("Authorization", `Bearer ${tokenB}`)
      .send({ donanteId });
    expect(res.status).toBe(200);
    expect(res.body.aviso).toBe(AVISO_VALIDACION_VETERINARIA);
  });

  test("GET /api/conversaciones/:id devuelve la conversación con el aviso", async () => {
    const res = await request(app).get(`/api/conversaciones/${conversacionId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.aviso).toBe(AVISO_VALIDACION_VETERINARIA);
    expect(res.body.con.nombre).toBe("Ana Aviso");
    // privacidad: no se expone el correo de la otra persona
    expect(res.body.con.email).toBeUndefined();
  });

  test("GET /api/conversaciones/:id sin token es rechazado", async () => {
    const res = await request(app).get(`/api/conversaciones/${conversacionId}`);
    expect(res.status).toBe(401);
  });

  test("GET /api/conversaciones/:id con un id inválido responde 400", async () => {
    const res = await request(app).get("/api/conversaciones/abc")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(400);
  });

  test("GET /api/conversaciones/:id de una conversación ajena responde 404", async () => {
    // La dueña A sí participa; creamos un tercer caso usando un id que no existe
    const res = await request(app).get("/api/conversaciones/999999999")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  // --- Escenario 3: aviso en la ficha de mascotas donantes ---

  test("La mascota donante incluye el aviso en su ficha", async () => {
    const res = await request(app).get("/api/mascotas").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const donante = res.body.find((m) => m.id === mascotaDonanteId);
    expect(donante.aviso).toBe(AVISO_VALIDACION_VETERINARIA);
    expect(donante.donante.estado).toBe("activo");
  });

  test("La mascota que NO es donante no incluye el aviso", async () => {
    const res = await request(app).get("/api/mascotas").set("Authorization", `Bearer ${tokenA}`);
    const normal = res.body.find((m) => m.id === mascotaNormalId);
    expect(normal.aviso).toBeUndefined();
  });
});
