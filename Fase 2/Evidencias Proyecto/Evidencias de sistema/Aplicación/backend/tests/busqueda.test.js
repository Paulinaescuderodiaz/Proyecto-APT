const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Tres usuarios: A y B tienen mascotas donantes, C es quien busca.
const emailA = `test.busqueda.a.${Date.now()}@pethub.cl`;
const emailB = `test.busqueda.b.${Date.now()}@pethub.cl`;
const emailC = `test.busqueda.c.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

// Grupo sanguíneo único para esta ejecución: así la búsqueda
// solo encuentra los donantes creados por este test y no los de tu base real.
const grupo = `GRUPO-TEST-${Date.now()}`;

let tokenC;

describe("Búsqueda de donantes - Sprint 3 (S3-HU10)", () => {
  // Prepara todo UNA vez: usuarios, comunas, mascotas y donantes.
  beforeAll(async () => {
    const emails = [emailA, emailB, emailC];
    for (const email of emails) {
      await request(app).post("/api/auth/registro").send({ nombre: "Usuario Prueba", email, password });
    }

    // El registro no pide comuna, así que la asignamos directo en la base
    await prisma.usuario.update({ where: { email: emailA }, data: { comuna: "Viña del Mar" } });
    await prisma.usuario.update({ where: { email: emailB }, data: { comuna: "Valparaíso" } });

    const loginA = await request(app).post("/api/auth/login").send({ email: emailA, password });
    const loginB = await request(app).post("/api/auth/login").send({ email: emailB, password });
    const loginC = await request(app).post("/api/auth/login").send({ email: emailC, password });
    tokenC = loginC.body.token;

    // Una mascota donante activa para A y otra para B
    const mascotaA = await request(app)
      .post("/api/mascotas")
      .set("Authorization", `Bearer ${loginA.body.token}`)
      .send({ nombre: "Firulais", especie: "Perro" });
    const mascotaB = await request(app)
      .post("/api/mascotas")
      .set("Authorization", `Bearer ${loginB.body.token}`)
      .send({ nombre: "Rocky", especie: "Perro" });

    await request(app)
      .post("/api/donantes")
      .set("Authorization", `Bearer ${loginA.body.token}`)
      .send({ mascotaId: mascotaA.body.id, grupoSanguineo: grupo, cumpleRequisitos: true });
    await request(app)
      .post("/api/donantes")
      .set("Authorization", `Bearer ${loginB.body.token}`)
      .send({ mascotaId: mascotaB.body.id, grupoSanguineo: grupo, cumpleRequisitos: true });
  });

  // Limpieza al final: donantes, mascotas y usuarios de prueba.
  afterAll(async () => {
    const filtro = { in: [emailA, emailB, emailC] };
    await prisma.donante.deleteMany({ where: { mascota: { usuario: { email: filtro } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email: filtro } } });
    await prisma.usuario.deleteMany({ where: { email: filtro } });
    await prisma.$disconnect();
  });

  // Sin token no se puede buscar
  test("GET /api/donantes/buscar sin token es rechazado", async () => {
    const res = await request(app).get("/api/donantes/buscar?especie=Perro&grupoSanguineo=x");
    expect(res.status).toBe(401);
  });

  // Faltan los datos obligatorios
  test("GET /api/donantes/buscar rechaza si faltan especie y grupo sanguíneo", async () => {
    const res = await request(app)
      .get("/api/donantes/buscar")
      .set("Authorization", `Bearer ${tokenC}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Faltan datos: especie y grupo sanguíneo son obligatorios");
  });
  // Caso: encuentra a los donantes compatibles, aunque se escriba en minúsculas
  test("GET /api/donantes/buscar encuentra donantes activos sin distinguir mayúsculas", async () => {
    const res = await request(app)
      .get("/api/donantes/buscar")
      .query({ especie: "perro", grupoSanguineo: grupo.toLowerCase() })
      .set("Authorization", `Bearer ${tokenC}`);

    expect(res.status).toBe(200);
    expect(res.body.donantes.length).toBe(2);
  });

  // Caso: los donantes de la misma comuna aparecen primero
  test("GET /api/donantes/buscar muestra primero a los donantes de la misma comuna", async () => {
    const res = await request(app)
      .get("/api/donantes/buscar")
      .query({ especie: "Perro", grupoSanguineo: grupo, comuna: "Valparaíso" })
      .set("Authorization", `Bearer ${tokenC}`);

    expect(res.status).toBe(200);
    expect(res.body.donantes.length).toBe(2); // ordena, no filtra: siguen apareciendo los dos
    expect(res.body.donantes[0].comuna).toBe("Valparaíso");
    expect(res.body.donantes[0].mascota).toBe("Rocky");
  });

  // Caso de privacidad: no se muestran email ni teléfono del dueño
  test("GET /api/donantes/buscar no expone datos de contacto del dueño", async () => {
    const res = await request(app)
      .get("/api/donantes/buscar")
      .query({ especie: "Perro", grupoSanguineo: grupo })
      .set("Authorization", `Bearer ${tokenC}`);

    expect(res.status).toBe(200);
    for (const donante of res.body.donantes) {
      expect(donante.email).toBeUndefined();
      expect(donante.telefono).toBeUndefined();
      expect(donante.comuna).toBeDefined(); // la comuna sí se muestra
    }
  });

  // Caso: no hay donantes compatibles
  test("GET /api/donantes/buscar responde con mensaje y lista vacía si no hay coincidencias", async () => {
    const res = await request(app)
      .get("/api/donantes/buscar")
      .query({ especie: "Perro", grupoSanguineo: "GRUPO-QUE-NO-EXISTE" })
      .set("Authorization", `Bearer ${tokenC}`);

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBe("No se encontraron donantes compatibles en este momento");
    expect(res.body.donantes).toEqual([]);
  });

  // Caso: un donante que deja de estar activo ya no aparece en la búsqueda
  test("GET /api/donantes/buscar no muestra a los donantes inactivos", async () => {
    // Dejamos inactivo al donante del usuario A directamente en la base
    await prisma.donante.updateMany({
      where: { mascota: { usuario: { email: emailA } } },
      data: { estado: "inactivo" },
    });

    const res = await request(app)
      .get("/api/donantes/buscar")
      .query({ especie: "Perro", grupoSanguineo: grupo })
      .set("Authorization", `Bearer ${tokenC}`);

    expect(res.status).toBe(200);
    expect(res.body.donantes.length).toBe(1);
    expect(res.body.donantes[0].mascota).toBe("Rocky");
  });
  
});