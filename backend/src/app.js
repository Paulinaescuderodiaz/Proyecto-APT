// Carga las variables del archivo .env (como DATABASE_URL y JWT_SECRET)
// y las deja disponibles en process.env. Tiene que ir en la primera línea,
// antes de que cualquier otro archivo intente usar esas variables.
require("dotenv").config();

const express = require("express"); // el framework que maneja el servidor HTTP y las rutas
const cors = require("cors"); // permite que el frontend (en otro puerto/origen) pueda llamar a este backend

// Cada archivo de rutas agrupa los endpoints de un solo "tema" del proyecto
const authRoutes = require("./routes/auth.routes"); // login y registro
const mascotaRoutes = require("./routes/mascota.routes"); // crear/listar/editar mascotas
const vacunaRoutes = require("./routes/vacuna.routes"); // crear/listar/editar vacunas
const registroMedicoRoutes = require("./routes/registroMedico.routes"); // crear/listar diagnósticos y tratamientos
const documentoRoutes = require("./routes/documento.routes"); // subir fotos/PDFs asociados a un registro médico

const app = express(); // crea la aplicación Express propiamente tal

// --- Middlewares globales ---
// Estos se ejecutan en TODAS las peticiones, sin importar la ruta.

app.use(cors());
// Sin esto, el navegador bloquearía las peticiones del frontend (Angular/Ionic,
// que corre en otro puerto, ej. localhost:4200) hacia este backend (localhost:3000),
// por la política de seguridad "CORS" de los navegadores.

app.use(express.json({ limit: "10mb" }));
// Permite que Express entienda el body de las peticiones cuando viene en formato JSON
// (que es como el frontend manda los datos: nombre, fechas, etc.)
// y lo deja disponible como req.body. El límite de 10mb evita que alguien
// mande un body gigante que sature el servidor.

app.use("/uploads", express.static("uploads"));
// Deja la carpeta "uploads/" accesible públicamente por URL, ej:
// http://localhost:3000/uploads/1789267200000.png
// Así, después de subir un documento, se puede ver o descargar desde el navegador
// o mostrarlo directamente en una imagen dentro de la app.

// --- Ruta de prueba / salud del servidor ---
app.get("/", (req, res) => {
  res.json({ mensaje: "Pethub backend funcionando" });
});
// Útil para comprobar rápidamente, desde el navegador o Postman,
// que el servidor está levantado y respondiendo.

// --- Conexión de cada grupo de rutas con su "prefijo" de URL ---
// A partir de aquí, cualquier ruta definida DENTRO de esos archivos
// se pega después del prefijo indicado.
app.use("/api/auth", authRoutes);                          // ej: POST /api/auth/login
app.use("/api/mascotas", mascotaRoutes);                    // ej: GET /api/mascotas
app.use("/api/vacunas", vacunaRoutes);                       // ej: POST /api/vacunas
app.use("/api/registros-medicos", registroMedicoRoutes);    // ej: POST /api/registros-medicos
app.use("/api/documentos", documentoRoutes);                 // ej: POST /api/documentos

// Se exporta "app" (sin llamar a .listen() aquí) para que:
// 1) index.js pueda importarla y hacerla escuchar en un puerto real, y
// 2) los tests con Supertest puedan importarla directo, sin necesidad
//    de levantar un servidor de verdad en un puerto.
module.exports = app;