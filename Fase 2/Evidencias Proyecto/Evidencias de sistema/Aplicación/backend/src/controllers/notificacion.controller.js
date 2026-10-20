const prisma = require("../lib/prisma");

// S4-HU11: listar las notificaciones del usuario logueado (las más recientes primero).
// Opcional: /api/notificaciones?leida=false para ver solo las que aún no leyó.
async function listarMisNotificaciones(req, res) {
  try {
    const usuarioId = req.usuario.id; // viene del token: solo ve las suyas

    const filtro = { usuarioId };
    if (req.query.leida !== undefined) {
      // Los query params llegan como texto, así que comparamos con "true"
      filtro.leida = String(req.query.leida).trim().toLowerCase() === "true";
    }

    const notificaciones = await prisma.notificacion.findMany({
      where: filtro,
      orderBy: { createdAt: "desc" },
    });

    res.json(notificaciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar las notificaciones" });
  }
}

// S4-HU11: marcar una notificación como leída
async function marcarLeida(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const notificacionId = Number(req.params.id); // viene de la URL, ej: /api/notificaciones/3/leida

    if (!Number.isInteger(notificacionId)) {
      return res.status(400).json({ error: "Id de notificación inválido" });
    }

    const notificacion = await prisma.notificacion.findUnique({ where: { id: notificacionId } });

    // Si no existe o es de otro usuario, respondemos lo mismo (no revelamos que existe)
    if (!notificacion || notificacion.usuarioId !== usuarioId) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    const actualizada = await prisma.notificacion.update({
      where: { id: notificacionId },
      data: { leida: true },
    });

    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al marcar la notificación como leída" });
  }
}

module.exports = { listarMisNotificaciones, marcarLeida };