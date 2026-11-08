const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const fs = require("fs/promises");
const path = require("path");

const emailA = `test.documento.a.${Date.now()}@pethub.cl`;
const emailB = `test.documento.b.${Date.now()}@pethub.cl`;
const password = "ClaveSegura123";

let tokenA;
let tokenB;
let mascotaId;
let registroMedicoId;
let documentoId;
const bytesPrueba = Buffer.from("contenido de prueba, no es una foto real");

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
    const documentos = await prisma.documento.findMany({ where: { registroMedico: { mascota: { usuario: { email: { in: [emailA, emailB] } } } } } });
    for (const doc of documentos) {
      if (path.resolve(doc.rutaArchivo).startsWith(path.resolve("uploads") + path.sep)) {
        await fs.unlink(doc.rutaArchivo).catch(() => {});
      }
    }
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
    const archivoFalso = bytesPrueba;

    const res = await request(app)
      .post("/api/documentos")
      .set("Authorization", `Bearer ${tokenA}`)
      .field("registroMedicoId", registroMedicoId)
      .attach("archivo", archivoFalso, { filename: "foto.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(201);
    expect(res.body.tipoArchivo).toBe("image/jpeg");
    expect(res.body.rutaArchivo).toBeUndefined();
    documentoId = res.body.id;
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

  test("lista los adjuntos propios sin publicar rutas físicas", async () => {
    const res = await request(app).get(`/api/documentos/registro/${registroMedicoId}`).set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([expect.objectContaining({ id: documentoId, nombreArchivo: "foto.jpg", tamano: bytesPrueba.length })]);
    expect(res.body[0].rutaArchivo).toBeUndefined();
  });

  test("no permite listar ni abrir sin sesión o desde otra cuenta", async () => {
    for (const url of [`/api/documentos/registro/${registroMedicoId}`, `/api/documentos/${documentoId}/archivo`, `/api/documentos/${documentoId}/archivo?descargar=1`]) {
      expect((await request(app).get(url)).status).toBe(401);
      expect((await request(app).get(url).set("Authorization", `Bearer ${tokenB}`)).status).toBe(404);
    }
  });

  test("abre y descarga los bytes originales, con nombre y tipo correctos", async () => {
    const vista = await request(app).get(`/api/documentos/${documentoId}/archivo`).set("Authorization", `Bearer ${tokenA}`);
    expect(vista.status).toBe(200);
    expect(vista.body).toEqual(bytesPrueba);
    expect(vista.headers["content-type"]).toMatch(/^image\/jpeg/);
    expect(vista.headers["content-disposition"]).toBe("inline");
    expect(vista.headers["cache-control"]).toContain("no-store");
    const descarga = await request(app).get(`/api/documentos/${documentoId}/archivo?descargar=1`).set("Authorization", `Bearer ${tokenA}`);
    expect(descarga.status).toBe(200);
    expect(descarga.body).toEqual(bytesPrueba);
    expect(descarga.headers["content-disposition"]).toContain('attachment; filename="foto.jpg"');
  });

  test("la antigua URL pública del archivo ya no permite acceder", async () => {
    const doc = await prisma.documento.findUnique({ where: { id: documentoId } });
    expect((await request(app).get(`/uploads/${path.basename(doc.rutaArchivo)}`)).status).toBe(404);
  });

  test("dos exámenes con el mismo nombre conservan archivos distintos", async () => {
    const ids = [];
    for (const contenido of ["%PDF-1.4 examen uno", "%PDF-1.4 examen dos"]) {
      const res = await request(app).post("/api/documentos").set("Authorization", `Bearer ${tokenA}`)
        .field("registroMedicoId", registroMedicoId).attach("archivo", Buffer.from(contenido), { filename: "examen.pdf", contentType: "application/pdf" });
      expect(res.status).toBe(201); ids.push(res.body.id);
    }
    const docs = await prisma.documento.findMany({ where: { id: { in: ids } } });
    expect(new Set(docs.map(doc => doc.rutaArchivo)).size).toBe(2);
    for (let i = 0; i < ids.length; i++) {
      const res = await request(app).get(`/api/documentos/${ids[i]}/archivo`).set("Authorization", `Bearer ${tokenA}`)
        .buffer(true).parse((res, callback) => { const partes = []; res.on("data", parte => partes.push(parte)); res.on("end", () => callback(null, Buffer.concat(partes))); });
      expect(res.status).toBe(200);
      expect(res.body.toString()).toContain(i === 0 ? "examen uno" : "examen dos");
    }
  });

  test("rechaza ids inválidos y devuelve 404 cuando el archivo falta", async () => {
    expect((await request(app).get('/api/documentos/abc/archivo').set("Authorization", `Bearer ${tokenA}`)).status).toBe(400);
    expect((await request(app).get('/api/documentos/registro/1.5').set("Authorization", `Bearer ${tokenA}`)).status).toBe(400);
    expect((await request(app).get('/api/documentos/2147483647/archivo').set("Authorization", `Bearer ${tokenA}`)).status).toBe(404);
    const doc = await prisma.documento.findUnique({ where: { id: documentoId } });
    await fs.unlink(doc.rutaArchivo);
    expect((await request(app).get(`/api/documentos/${documentoId}/archivo`).set("Authorization", `Bearer ${tokenA}`)).status).toBe(404);
  });

  test("no sirve una ruta ajena al directorio de documentos", async () => {
    const doc = await prisma.documento.create({ data: { nombreArchivo: "otro.pdf", rutaArchivo: "package.json", tipoArchivo: "application/pdf", tamano: 1, registroMedicoId } });
    const res = await request(app).get(`/api/documentos/${doc.id}/archivo`).set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });
});