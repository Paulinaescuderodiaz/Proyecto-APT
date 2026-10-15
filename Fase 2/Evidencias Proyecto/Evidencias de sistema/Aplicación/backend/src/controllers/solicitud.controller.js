const prisma = require("../lib/prisma");

// Los únicos niveles de urgencia permitidos
const URGENCIAS_VALIDAS = ["alta", "media", "baja"];

// S3-HU09: publicar una solicitud de sangre para una mascota que la necesita
async function crearSolicitud(req, res) {
  try {
    const usuarioId = req.usuario.id; // quien publica, viene del token
    const { especie, grupoSanguineo, urgencia } = req.body;

    // Sin especie o grupo sanguíneo no se puede buscar un donante compatible
    if (!especie || !grupoSanguineo) {
      return res.status(400).json({ error: "Faltan datos: especie y grupo sanguíneo son obligatorios" });
    }

    // Escenario 2 de la historia: la urgencia es obligatoria
    if (!urgencia) {
      return res.status(400).json({ error: "Debes indicar el nivel de urgencia" });
    }

    // Aceptamos "Alta", "ALTA" o " alta ": lo dejamos en minúsculas y sin espacios
    const urgenciaLimpia = String(urgencia).trim().toLowerCase();
    if (!URGENCIAS_VALIDAS.includes(urgenciaLimpia)) {
      return res.status(400).json({ error: "La urgencia debe ser alta, media o baja" });
    }

    // El estado no se envía: la base de datos lo deja en "activa" por defecto
    const solicitud = await prisma.solicitudSangre.create({
      data: {
        usuarioId,
        especie: String(especie).trim(),
        grupoSanguineo: String(grupoSanguineo).trim(),
        urgencia: urgenciaLimpia,
      },
    });

    res.status(201).json(solicitud);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al publicar la solicitud" });
  }
}

module.exports = { crearSolicitud };