const multer = require("multer");
const path = require("path"); // librería nativa de Node para trabajar con rutas de archivos
const prisma = require("../lib/prisma");

// Le decimos a multer CÓMO y DÓNDE guardar cada archivo que llegue
const storage = multer.diskStorage({
  // dónde se guarda físicamente el archivo
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  // con qué nombre se guarda (no usamos el nombre original, para evitar que
  // dos archivos distintos con el mismo nombre se sobreescriban entre sí)
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + path.extname(file.originalname);
    // Date.now() = milisegundos actuales (siempre distinto cada vez)
    // path.extname("foto.png") devuelve ".png" — así el archivo guardado
    // queda, por ejemplo, "1789267200000.png"
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

    try {
      const usuarioId = req.usuario.id;
      const { registroMedicoId } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "No se recibió ningún archivo" });
      }
      if (!registroMedicoId) {
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

      res.status(201).json(documento);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al guardar el documento" });
    }
  });
}

module.exports = { subirDocumento };