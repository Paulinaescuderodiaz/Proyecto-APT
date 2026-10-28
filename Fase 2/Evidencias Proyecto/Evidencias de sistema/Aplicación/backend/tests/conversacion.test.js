const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Tres usuarios:
// A -> dueña de un perro donante activo
// B -> publica una solicitud de sangre y contacta a A
// C -> persona ajena a la conversación
const emailA = `test.chat.a.${Date.now()}@pethub.cl`;
const emailB = `test.chat.b.${Date.now()}@pethub.cl`;
const emailC = `test.chat.c.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

// Grupo sanguíneo único de esta ejecución, para no mezclar con datos reales
const grupo = `GRUPO-CHAT-${Date.now()}`;

let tokenA, tokenB, tokenC;
let donanteId; // el donante de A
let solicitudId; // la solicitud de B
let conversacionId; // la conversación entre A y B

describe("Chat inicial - Sprint 4 (S4-HU12)", () => {
  // Prepara todo UNA vez: usuarios, mascota donante y solicitud
  beforeAll(async () => {
    const usuarios = [
      ["Ana Test", emailA],
      ["Beto Test", emailB],
      ["Carla Test", emailC],
    ];
    for (const [nombre, email] of usuarios) {
      await request(app).post("/api/auth/registro").send({ nombre, email, password });
    }

    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    const loginC = await request(app).post("/api/auth/login").send({ email: emailC, password });
    tokenA = loginA.body.token;
    tokenB = loginB.body.token;
    tokenC = loginC.body.token;

    // A tiene un perro donante activo
    const mascotaA = await request(app).post("/api/mascotas").set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Firulais", especie: "Perro" });
    const donante = await request(app).post("/api/donantes").set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId: mascotaA.body.id, grupoSanguineo: grupo, cumpleRequisitos: true });
    donanteId = donante.body.id;

    // B publica una solicitud de sangre
    const solicitud = await request(app).post("/api/solicitudes").set("Authorization", `Bearer ${tokenB}`)
      .send({ especie: "Perro", grupoSanguineo: grupo, urgencia: "alta" });
    solicitudId = solicitud.body.id;
  });

  // Limpieza al final. El orden importa: primero lo que depende de otras tablas.
  afterAll(async () => {
    const filtro = { in: [emailA, emailB, emailC] };
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

  // --- Contactar ---

  test("POST /api/conversaciones sin token es rechazado", async () => {
    const res = await request(app).post("/api/conversaciones").send({ donanteId });
    expect(res.status).toBe(401);
  });

  test("POST /api/conversaciones rechaza si no se indica donante ni solicitud", async () => {
    const res = await request(app).post("/api/conversaciones")
      .set("Authorization", `Bearer ${tokenB}`).send({});
    expect(res.status).toBe(400);
  });

  test("POST /api/conversaciones rechaza si se indican ambos a la vez", async () => {
    const res = await request(app).post("/api/conversaciones")
      .set("Authorization", `Bearer ${tokenB}`).send({ donanteId, solicitudId });
    expect(res.status).toBe(400);
  });

  test("POST /api/conversaciones con un donante que no existe responde 404", async () => {
    const res = await request(app).post("/api/conversaciones")
      .set("Authorization", `Bearer ${tokenB}`).send({ donanteId: 999999999 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Donante no encontrado");
  });

  test("POST /api/conversaciones abre una conversación con el dueño del donante y no expone sus datos", async () => {
    const res = await request(app).post("/api/conversaciones")
      .set("Authorization", `Bearer ${tokenB}`).send({ donanteId });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    // Privacidad: la respuesta no trae datos personales de la otra persona
    expect(res.body.email).toBeUndefined();
    expect(res.body.telefono).toBeUndefined();
    conversacionId = res.body.id;
  });

  test("POST /api/conversaciones repetido devuelve la misma conversación", async () => {
    const res = await request(app).post("/api/conversaciones")
      .set("Authorization", `Bearer ${tokenB}`).send({ donanteId });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(conversacionId);
  });

  test("POST /api/conversaciones desde el otro lado (por solicitud) reutiliza la misma conversación", async () => {
    const res = await request(app).post("/api/conversaciones")
      .set("Authorization", `Bearer ${tokenA}`).send({ solicitudId });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(conversacionId);
  });

  test("POST /api/conversaciones no permite contactarse a uno mismo", async () => {
    const res = await request(app).post("/api/conversaciones")
      .set("Authorization", `Bearer ${tokenB}`).send({ solicitudId });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No puedes iniciar una conversación contigo mismo");
  });

  test("POST /api/conversaciones por una solicitud ya resuelta responde 409", async () => {
    // B publica otra solicitud y la marca como resuelta
    const otra = await request(app).post("/api/solicitudes").set("Authorization", `Bearer ${tokenB}`)
      .send({ especie: "Perro", grupoSanguineo: grupo, urgencia: "baja" });
    await request(app).put(`/api/solicitudes/${otra.body.id}/resolver`).set("Authorization", `Bearer ${tokenB}`);

    const res = await request(app).post("/api/conversaciones")
      .set("Authorization", `Bearer ${tokenC}`).send({ solicitudId: otra.body.id });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Esta solicitud ya está resuelta");
  });

  // --- Mensajes ---

  test("POST /api/conversaciones/:id/mensajes envía un mensaje", async () => {
    const res = await request(app).post(`/api/conversaciones/${conversacionId}/mensajes`)
      .set("Authorization", `Bearer ${tokenA}`).send({ texto: "Hola, mi perro puede ayudar" });

    expect(res.status).toBe(201);
    expect(res.body.texto).toBe("Hola, mi perro puede ayudar");
    expect(res.body.esMio).toBe(true);
  });

  test("POST /api/conversaciones/:id/mensajes rechaza un mensaje vacío", async () => {
    const res = await request(app).post(`/api/conversaciones/${conversacionId}/mensajes`)
      .set("Authorization", `Bearer ${tokenA}`).send({ texto: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("El mensaje no puede estar vacío");
  });

  test("POST /api/conversaciones/:id/mensajes rechaza un mensaje demasiado largo", async () => {
    const res = await request(app).post(`/api/conversaciones/${conversacionId}/mensajes`)
      .set("Authorization", `Bearer ${tokenA}`).send({ texto: "a".repeat(1001) });

    expect(res.status).toBe(400);
  });

  test("GET /api/conversaciones/:id/mensajes muestra el mensaje a la otra persona", async () => {
    const res = await request(app).get(`/api/conversaciones/${conversacionId}/mensajes`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].texto).toBe("Hola, mi perro puede ayudar");
    expect(res.body[0].esMio).toBe(false); // para B, el mensaje es de la otra persona
  });

  test("Una persona ajena no puede ver ni escribir en la conversación (404)", async () => {
    const ver = await request(app).get(`/api/conversaciones/${conversacionId}/mensajes`)
      .set("Authorization", `Bearer ${tokenC}`);
    const escribir = await request(app).post(`/api/conversaciones/${conversacionId}/mensajes`)
      .set("Authorization", `Bearer ${tokenC}`).send({ texto: "Intruso" });

    expect(ver.status).toBe(404);
    expect(escribir.status).toBe(404);
  });

  test("GET /api/conversaciones/:id/mensajes con id inválido responde 400", async () => {
    const res = await request(app).get("/api/conversaciones/abc/mensajes")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });

  test("GET /api/conversaciones lista mis conversaciones con el nombre del otro y el último mensaje", async () => {
    const res = await request(app).get("/api/conversaciones")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].con.nombre).toBe("Beto Test");
    expect(res.body[0].ultimoMensaje).toBe("Hola, mi perro puede ayudar");
    expect(res.body[0].con.email).toBeUndefined(); // nunca se expone el correo
  });
});