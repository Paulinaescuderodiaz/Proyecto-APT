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

        // S4-HU11: avisar a los dueños de donantes compatibles con esta solicitud.
    // Va en su propio try/catch: si falla un aviso, la solicitud igual queda publicada.
    let notificados = 0;
    try {
      // Buscamos donantes ACTIVOS con el mismo grupo sanguíneo (sin distinguir mayúsculas)
      // cuya mascota sea de la misma especie y NO sea del usuario que publicó la solicitud
      const donantes = await prisma.donante.findMany({
        where: {
          estado: "activo",
          grupoSanguineo: { equals: solicitud.grupoSanguineo, mode: "insensitive" },
          mascota: {
            especie: { equals: solicitud.especie, mode: "insensitive" },
            usuarioId: { not: usuarioId },
          },
        },
        include: { mascota: true }, // necesitamos la mascota para saber quién es el dueño
      });

      // Un dueño puede tener varios donantes compatibles: le mandamos un solo aviso.
      // new Set elimina los ids repetidos.
      const duenos = [...new Set(donantes.map((d) => d.mascota.usuarioId))];

      if (duenos.length > 0) {
        await prisma.notificacion.createMany({
          data: duenos.map((id) => ({
            usuarioId: id,
            tipo: "solicitud_compatible",
            // El mensaje no incluye datos de contacto de quien publica (privacidad)
            mensaje: `Hay una solicitud de sangre de urgencia ${solicitud.urgencia} para ${solicitud.especie} con grupo ${solicitud.grupoSanguineo}. Tu mascota podría ayudar.`,
            solicitudId: solicitud.id,
          })),
        });
      }
      notificados = duenos.length;
    } catch (errorAviso) {
      console.error("No se pudieron crear las notificaciones", errorAviso);
    }

    // Devolvemos la solicitud y, además, a cuántas personas se avisó
    res.status(201).json({ ...solicitud, notificados });
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