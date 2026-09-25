const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

const emailA = `test.documento.a.${Date.now()}@pethub.cl`;
const emailB = `test.documento.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA;
let tokenB;
let mascotaId;
let registroMedicoId;

describe("Documentos - Sprint 2 (S2-HU06)", () => {
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

    // subirDocumento necesita un registro médico ya creado, para asociarle el archivo
    const registro = await request(app)
      .post("/api/registros-medicos")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ mascotaId, diagnostico: "Control", fecha: "2026-08-01" });
    registroMedicoId = registro.body.id;
  });

  afterAll(async () => {
    await prisma.documento.deleteMany({ where: { registroMedico: { mascota: { usuario: { email: { in: [emailA, emailB] } } } } } });
    await prisma.registroMedico.deleteMany({ where: { mascota: { usuario: { email: { in: [emailA, emailB] } } } } });
    await prisma.mascota.deleteMany({ where: { usuario: { email: { in: [emailA, emailB] } } } });
    await prisma.usuario.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await prisma.$disconnect();
  });

  test("POST /api/documentos sin token es rechazado", async () => {
    const res = await request(app).post("/api/documentos").field("registroMedicoId", registroMedicoId);
    expect(res.status).toBe(401);
  });

  // Escenario 1 de S2-HU06: carga exitosa
  test("POST /api/documentos sube un archivo válido (jpeg)", async () => {
    // No necesitamos una foto real: el fileFilter de multer solo revisa el
    // "Content-Type" que se declara al subir, no el contenido real del archivo.
    const archivoFalso = Buffer.from("contenido de prueba, no es una foto real");

    const res = await request(app)
      .post("/api/documentos")
      .set("Authorization", `Bearer ${tokenA}`)
      .field("registroMedicoId", registroMedicoId)
      .attach("archivo", archivoFalso, { filename: "foto.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(201);
    expect(res.body.tipoArchivo).toBe("image/jpeg");
  });

  // Escenario 2 de S2-HU06: formato no soportado
  test("POST /api/documentos rechaza un formato no soportado", async () => {
    const archivoFalso = Buffer.from("esto no es una imagen ni un pdf");

    const res = await request(app)
      .post("/api/documentos")
      .set("Authorization", `Bearer ${tokenA}`)
      .field("registroMedicoId", registroMedicoId)
      .attach("archivo", archivoFalso, { filename: "documento.txt", contentType: "text/plain" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Formato de archivo no soportado");
  });

  // Escenario 3 de S2-HU06: archivo demasiado pesado (más de 5 MB)
  test("POST /api/documentos rechaza un archivo que supera el tamaño máximo", async () => {
    const archivoGrande = Buffer.alloc(6 * 1024 * 1024); // 6 MB de puros ceros

    const res = await request(app)
      .post("/api/documentos")
      .set("Authorization", `Bearer ${tokenA}`)
      .field("registroMedicoId", registroMedicoId)
      .attach("archivo", archivoGrande, { filename: "grande.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("El archivo supera el tamaño máximo permitido");
  });

  test("POST /api/documentos rechaza un registro médico que no pertenece al usuario", async () => {
    const archivoFalso = Buffer.from("contenido de prueba");

    const res = await request(app)
      .post("/api/documentos")
      .set("Authorization", `Bearer ${tokenB}`)
      .field("registroMedicoId", registroMedicoId)
      .attach("archivo", archivoFalso, { filename: "foto.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(404);
  });
});