const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Dos usuarios de prueba para poder probar que cada uno
// solo ve y resuelve SUS PROPIAS solicitudes.
const emailA = `test.solicitud.a.${Date.now()}@pethub.cl`;
const emailB = `test.solicitud.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA;
let tokenB;
let solicitudId;

describe("Solicitudes de sangre - Sprint 3 (S3-HU09)", () => {
  // Se ejecuta UNA vez antes de las pruebas: crea y loguea a los dos usuarios.
  beforeAll(async () => {
    await request(app).post("/api/auth/registro").send({ nombre: "Usuaria A", email: emailA, password });
    await request(app).post("/api/auth/registro").send({ nombre: "Usuaria B", email: emailB, password });

    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    tokenA = loginA.body.token;

    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    tokenB = loginB.body.token;
  });

  // Se ejecuta UNA vez al final: borra lo que crearon las pruebas.
  // Primero las solicitudes, luego los usuarios.
  afterAll(async () => {
    await prisma.solicitudSangre.deleteMany({ where: { usuario: { email: { in: [emailA, emailB] } } } });
    await prisma.usuario.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await prisma.$disconnect();
  });

  // Sin token no se puede crear una solicitud
  test("POST /api/solicitudes sin token es rechazado", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .send({ especie: "Perro", grupoSanguineo: "DEA 1.1 positivo", urgencia: "alta" });
    expect(res.status).toBe(401);
  });

    // Caso: solicitud correcta -> queda "activa"
  test("POST /api/solicitudes crea una solicitud activa con datos válidos", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ especie: "Perro", grupoSanguineo: "DEA 1.1 positivo", urgencia: "alta" });

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe("activa");
    expect(res.body.urgencia).toBe("alta");
    solicitudId = res.body.id; // la guardamos para usarla en pruebas posteriores
  });

  // Caso: faltan especie y grupo sanguíneo
  test("POST /api/solicitudes rechaza si faltan especie y grupo sanguíneo", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ urgencia: "alta" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Faltan datos: especie y grupo sanguíneo son obligatorios");
  });

  // Caso: falta el nivel de urgencia
  test("POST /api/solicitudes rechaza si falta la urgencia", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ especie: "Perro", grupoSanguineo: "DEA 1.1 positivo" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Debes indicar el nivel de urgencia");
  });

  // Caso: urgencia con un valor que no existe
  test("POST /api/solicitudes rechaza una urgencia inválida", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ especie: "Perro", grupoSanguineo: "DEA 1.1 positivo", urgencia: "urgentisima" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("La urgencia debe ser alta, media o baja");
  });

    // Caso: el usuario A ve su solicitud en su listado
  test("GET /api/solicitudes lista las solicitudes del usuario logueado", async () => {
    const res = await request(app)
      .get("/api/solicitudes")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(solicitudId);
  });

  // Caso de seguridad: el usuario B no ve las solicitudes de A
  test("GET /api/solicitudes no muestra solicitudes de otro usuario", async () => {
    const res = await request(app)
      .get("/api/solicitudes")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // Caso de seguridad: B no puede resolver la solicitud de A
  test("PUT /api/solicitudes/:id/resolver no permite resolver la solicitud de otra persona", async () => {
    const res = await request(app)
      .put(`/api/solicitudes/${solicitudId}/resolver`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Solicitud no encontrada");
  });

  // Caso: el dueño marca su solicitud como resuelta
  test("PUT /api/solicitudes/:id/resolver marca la solicitud como resuelta", async () => {
    const res = await request(app)
      .put(`/api/solicitudes/${solicitudId}/resolver`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("resuelta");
  });

  // Caso: no se puede resolver dos veces
  test("PUT /api/solicitudes/:id/resolver rechaza resolver una solicitud ya resuelta", async () => {
    const res = await request(app)
      .put(`/api/solicitudes/${solicitudId}/resolver`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Esta solicitud ya está resuelta");
  });

  // Caso: el filtro por estado ya no encuentra la solicitud como activa
  test("GET /api/solicitudes?estado=activa ya no muestra la solicitud resuelta", async () => {
    const res = await request(app)
      .get("/api/solicitudes?estado=activa")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // Caso: id que no es un número
  test("PUT /api/solicitudes/:id/resolver rechaza un id inválido", async () => {
    const res = await request(app)
      .put("/api/solicitudes/abc/resolver")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Id de solicitud inválido");
  });
});
