const multer = require("multer");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path"); // librería nativa de Node para trabajar con rutas de archivos
const prisma = require("../lib/prisma");

// Le decimos a multer CÓMO y DÓNDE guardar cada archivo que llegue
const storage = multer.diskStorage({
  // dónde se guarda físicamente el archivo
  destination: (req, file, cb) => {
    fs.mkdirSync("uploads", { recursive: true });
    cb(null, "uploads/");
  },
  // con qué nombre se guarda (no usamos el nombre original, para evitar que
  // dos archivos distintos con el mismo nombre se sobreescriban entre sí)
  filename: (req, file, cb) => {
    const nombreUnico = randomUUID() + path.extname(file.originalname);
    cb(null, nombreUnico);
  },
});

// Escenario 2 de S2-HU06: solo se permiten estos 3 tipos de archivo
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "application/pdf"];

// Escenario 3 de S2-HU06: tamaño máximo permitido
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB, expresado en bytes

// Armamos la configuración completa de multer, lista para usar como middleware
const upload = multer({
  storage,
  limits: { fileSize: TAMANO_MAXIMO },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error("FORMATO_NO_SOPORTADO"));
    }
    cb(null, true); // true = "sí, aceptar este archivo"
  },
}).single("archivo");
// .single("archivo") significa "espero UN solo archivo, y el campo del
// formulario donde viene se debe llamar 'archivo'"

// Escenario 1 (carga exitosa), 2 (formato no soportado) y 3 (archivo muy pesado) de S2-HU06
async function subirDocumento(req, res) {
  // "upload" no es una función async normal (viene de multer), así que la
  // llamamos pasándole una función que se ejecuta cuando termina (con o sin error)
  upload(req, res, async (error) => {
    if (error) {
      // Escenario 3: multer pone este código cuando el archivo excede el límite de tamaño
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "El archivo supera el tamaño máximo permitido" });
      }
      // Escenario 2: este es nuestro propio error, el que lanzamos en fileFilter
      if (error.message === "FORMATO_NO_SOPORTADO") {
        return res.status(400).json({ error: "Formato de archivo no soportado" });
      }
      // Cualquier otro error inesperado de multer
      console.error(error);
      return res.status(500).json({ error: "Error al subir el archivo" });
    }

    // Borra el archivo temporal si no se llega a asociar a un registro válido.
    let guardado = false;
    try {
      const usuarioId = req.usuario.id;
      const { registroMedicoId } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "No se recibió ningún archivo" });
      }
      if (!Number.isSafeInteger(Number(registroMedicoId)) || Number(registroMedicoId) <= 0 || Number(registroMedicoId) > 2147483647) {
        return res.status(400).json({ error: "Falta indicar el registro médico" });
      }

      // Seguridad: el registro médico tiene que pertenecer a una mascota del usuario logueado
      const registro = await prisma.registroMedico.findUnique({
        where: { id: Number(registroMedicoId) },
        include: { mascota: true },
      });

      if (!registro || registro.mascota.usuarioId !== usuarioId) {
        return res.status(404).json({ error: "Registro médico no encontrado" });
      }

      // Escenario 1: ya pasó todas las validaciones, se guarda la referencia en la base de datos
      // (el archivo físico ya lo guardó multer solo, en la carpeta "uploads/")
      const documento = await prisma.documento.create({
        data: {
          nombreArchivo: req.file.originalname,
          rutaArchivo: req.file.path,
          tipoArchivo: req.file.mimetype,
          tamano: req.file.size,
          registroMedicoId: Number(registroMedicoId),
        },
      });

      guardado = true;
      res.status(201).json(datosPublicos(documento));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al guardar el documento" });
    } finally {
      if (!guardado && req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
    }
  });
}

// No expone la ruta física del servidor a la interfaz.
const seleccionPublica = {
  id: true, nombreArchivo: true, tipoArchivo: true, tamano: true,
  registroMedicoId: true, createdAt: true,
};
function datosPublicos(documento) {
  return Object.fromEntries(Object.keys(seleccionPublica).map(campo => [campo, documento[campo]]));
}
function idValido(valor) {
  return /^\d+$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0 && Number(valor) <= 2147483647;
}

// Lista los adjuntos de un registro propio, incluidos los guardados anteriormente.
async function listarDocumentos(req, res) {
  if (!idValido(req.params.registroMedicoId)) {
    return res.status(400).json({ error: "Registro médico inválido" });
  }
  try {
    const registroMedicoId = Number(req.params.registroMedicoId);
    const registro = await prisma.registroMedico.findFirst({
      where: { id: registroMedicoId, mascota: { usuarioId: req.usuario.id } },
      select: { id: true },
    });
    if (!registro) return res.status(404).json({ error: "Registro médico no encontrado" });
    const documentos = await prisma.documento.findMany({
      where: { registroMedicoId }, select: seleccionPublica,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    res.set("Cache-Control", "private, no-store");
    res.json(documentos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al consultar los documentos" });
  }
}

// La URL exige sesión y pertenencia; conocer un id o nombre de archivo no basta.
async function obtenerArchivo(req, res) {
  if (!idValido(req.params.id)) return res.status(400).json({ error: "Documento inválido" });
  try {
    const documento = await prisma.documento.findFirst({
      where: { id: Number(req.params.id), registroMedico: { mascota: { usuarioId: req.usuario.id } } },
    });
    if (!documento) return res.status(404).json({ error: "Documento no encontrado" });
    const raiz = path.resolve("uploads");
    const archivo = path.resolve(documento.rutaArchivo);
    if (!archivo.startsWith(raiz + path.sep) || !TIPOS_PERMITIDOS.includes(documento.tipoArchivo)) {
      return res.status(404).json({ error: "Archivo no disponible" });
    }
    // También evita seguir enlaces simbólicos fuera del directorio de adjuntos.
    const real = await fs.promises.realpath(archivo);
    const raizReal = await fs.promises.realpath(raiz);
    if (!real.startsWith(raizReal + path.sep)) return res.status(404).json({ error: "Archivo no disponible" });
    res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.type(documento.tipoArchivo);
    const finalizar = error => {
      if (!error || res.headersSent) return;
      res.status(error.code === "ENOENT" || error.status === 404 ? 404 : 500)
        .json({ error: "No se pudo abrir el archivo" });
    };
    if (req.query.descargar === "1") {
      return res.download(real, documento.nombreArchivo, finalizar);
    }
    res.set("Content-Disposition", "inline");
    res.sendFile(real, finalizar);
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ error: "Archivo no disponible" });
    console.error(error);
    res.status(500).json({ error: "Error al obtener el archivo" });
  }
}

module.exports = { subirDocumento, listarDocumentos, obtenerArchivo };