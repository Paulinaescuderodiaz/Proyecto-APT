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
// S3-HU09 (RF-13): marcar una solicitud como resuelta para retirarla de las búsquedas
async function resolverSolicitud(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const solicitudId = Number(req.params.id); // viene de la URL, ej: /api/solicitudes/3/resolver

    if (!Number.isInteger(solicitudId)) {
      return res.status(400).json({ error: "Id de solicitud inválido" });
    }

    const solicitud = await prisma.solicitudSangre.findUnique({ where: { id: solicitudId } });

    // Si no existe o es de otro usuario, respondemos lo mismo (no revelamos que existe)
    if (!solicitud || solicitud.usuarioId !== usuarioId) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    if (solicitud.estado === "resuelta") {
      return res.status(409).json({ error: "Esta solicitud ya está resuelta" });
    }

    const actualizada = await prisma.solicitudSangre.update({
      where: { id: solicitudId },
      data: { estado: "resuelta" },
    });

    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al resolver la solicitud" });
  }
}

// Listar las solicitudes del usuario logueado (las más recientes primero).
// Opcional: /api/solicitudes?estado=activa para ver solo las activas.
async function listarMisSolicitudes(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const { estado } = req.query;

    const filtro = { usuarioId };
    if (estado) {
      filtro.estado = String(estado).trim().toLowerCase();
    }

    const solicitudes = await prisma.solicitudSangre.findMany({
      where: filtro,
      orderBy: { createdAt: "desc" },
    });

    res.json(solicitudes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar las solicitudes" });
  }
}

module.exports = { crearSolicitud, resolverSolicitud, listarMisSolicitudes };