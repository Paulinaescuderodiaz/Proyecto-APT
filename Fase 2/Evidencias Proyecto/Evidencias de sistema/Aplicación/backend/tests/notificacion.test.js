const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Tres usuarios:
// A -> dueño de un perro donante (debe recibir el aviso)
// B -> dueño de un gato donante con el mismo grupo (otra especie: NO debe recibirlo)
// C -> quien publica la solicitud (tiene un perro donante, pero NO debe avisarse a sí mismo)
const emailA = `test.notif.a.${Date.now()}@pethub.cl`;
const emailB = `test.notif.b.${Date.now()}@pethub.cl`;
const emailC = `test.notif.c.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

// Grupo sanguíneo único para esta ejecución, para no mezclar con donantes de tu base real
const grupo = `GRUPO-NOTIF-${Date.now()}`;

let tokenA, tokenB, tokenC;
let solicitudId; // la solicitud que publica C en el primer caso
let notificacionAId; // la notificación que recibe A

describe("Notificaciones de solicitudes compatibles - Sprint 4 (S4-HU11)", () => {
  // Prepara todo UNA vez: usuarios, mascotas y donantes activos.
  beforeAll(async () => {
    for (const email of [emailA, emailB, emailC]) {
      await request(app).post("/api/auth/registro").send({ nombre: "Usuario Prueba", email, password });
    }

    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    const loginC = await request(app).post("/api/auth/login").send({ email: emailC, password });
    tokenA = loginA.body.token;
    tokenB = loginB.body.token;
    tokenC = loginC.body.token;

    // Una mascota por usuario: A y C son perros, B es gato
    const mascotaA = await request(app).post("/api/mascotas").set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Firulais", especie: "Perro" });
    const mascotaB = await request(app).post("/api/mascotas").set("Authorization", `Bearer ${tokenB}`)
      .send({ nombre: "Michi", especie: "Gato" });
    const mascotaC = await request(app).post("/api/mascotas").set("Authorization", `Bearer ${tokenC}`)
      .send({ nombre: "Rocky", especie: "Perro" });

    // Las tres quedan inscritas como donantes activos con el mismo grupo sanguíneo
    const inscripciones = [
      [tokenA, mascotaA.body.id],
      [tokenB, mascotaB.body.id],
      [tokenC, mascotaC.body.id],
    ];
    for (const [token, mascotaId] of inscripciones) {
      await request(app).post("/api/donantes").set("Authorization", `Bearer ${token}`)
        .send({ mascotaId, grupoSanguineo: grupo, cumpleRequisitos: true });
    }
  });

  // Limpieza al final. El orden importa: primero lo que depende de otras tablas.
  afterAll(async () => {
    const filtro = { in: [emailA, emailB, emailC] };
    await prisma.notificacion.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.solicitudSangre.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.donante.deleteMany({ where: { mascota: { usuario: { email: filtro } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.usuario.deleteMany({ where: { email: filtro } });
    await prisma.$disconnect();
  });

  // Sin token no se pueden ver las notificaciones
  test("GET /api/notificaciones sin token es rechazado", async () => {
    const res = await request(app).get("/api/notificaciones");
    expect(res.status).toBe(401);
  });

  // Caso principal: al publicar una solicitud compatible se avisa solo a quien corresponde
  test("POST /api/solicitudes avisa solo al dueño del donante compatible", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${tokenC}`)
      .send({ especie: "Perro", grupoSanguineo: grupo, urgencia: "alta" });

    expect(res.status).toBe(201);
    // A (perro compatible) sí; B (gato) no; C (el que publica) no
    expect(res.body.notificados).toBe(1);
    solicitudId = res.body.id;
  });

  // El dueño del donante compatible ve su aviso, sin datos de contacto
  test("GET /api/notificaciones muestra el aviso al dueño del donante compatible", async () => {
    const res = await request(app)
      .get("/api/notificaciones")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].tipo).toBe("solicitud_compatible");
    expect(res.body[0].leida).toBe(false);
    expect(res.body[0].solicitudId).toBe(solicitudId);
    // Privacidad: el mensaje no debe revelar el correo de quien publica
    expect(res.body[0].mensaje).not.toContain(emailC);
    notificacionAId = res.body[0].id;
  });

  // Otra especie: no se avisa
  test("GET /api/notificaciones no avisa al dueño de un donante de otra especie", async () => {
    const res = await request(app)
      .get("/api/notificaciones")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // Quien publica no recibe aviso de su propia solicitud
  test("GET /api/notificaciones no avisa a quien publicó la solicitud", async () => {
    const res = await request(app)
      .get("/api/notificaciones")
      .set("Authorization", `Bearer ${tokenC}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // Solicitud sin donantes compatibles: se publica igual, pero a nadie se avisa
  test("POST /api/solicitudes sin donantes compatibles publica y no avisa a nadie", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${tokenC}`)
      .send({ especie: "Perro", grupoSanguineo: `${grupo}-OTRO`, urgencia: "media" });

    expect(res.status).toBe(201);
    expect(res.body.notificados).toBe(0);
  });

  // Otro usuario no puede marcar como leída una notificación ajena
  test("PUT /api/notificaciones/:id/leida de otro usuario responde 404", async () => {
    const res = await request(app)
      .put(`/api/notificaciones/${notificacionAId}/leida`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Notificación no encontrada");
  });

  // Id que no es un número
  test("PUT /api/notificaciones/:id/leida con id inválido responde 400", async () => {
    const res = await request(app)
      .put("/api/notificaciones/abc/leida")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
  });

  // El dueño marca su aviso como leído y deja de aparecer entre las no leídas
  test("PUT /api/notificaciones/:id/leida marca como leída y sale de las no leídas", async () => {
    const res = await request(app)
      .put(`/api/notificaciones/${notificacionAId}/leida`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.leida).toBe(true);

    const noLeidas = await request(app)
      .get("/api/notificaciones")
      .query({ leida: "false" })
      .set("Authorization", `Bearer ${tokenA}`);

    expect(noLeidas.status).toBe(200);
    expect(noLeidas.body).toEqual([]);
  });
});