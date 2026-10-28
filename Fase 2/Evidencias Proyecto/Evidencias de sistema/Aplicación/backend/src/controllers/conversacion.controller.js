const prisma = require("../lib/prisma");

// Largo máximo de un mensaje, para que nadie mande textos gigantes
const MAX_MENSAJE = 1000;

// Devuelve la conversación SOLO si el usuario participa en ella; si no, devuelve null.
// Así nadie puede leer ni escribir en conversaciones ajenas.
async function obtenerConversacionDelUsuario(conversacionId, usuarioId) {
  const conversacion = await prisma.conversacion.findUnique({ where: { id: conversacionId } });
  if (!conversacion) return null;
  const participa = conversacion.usuarioAId === usuarioId || conversacion.usuarioBId === usuarioId;
  return participa ? conversacion : null;
}

// S4-HU12: botón "Contactar". Abre (o recupera) la conversación con el dueño de un donante o de una solicitud.
// El cliente manda el id del DONANTE o de la SOLICITUD, nunca el id del usuario:
// así el servidor averigua quién es el dueño sin revelar sus datos.
async function iniciarConversacion(req, res) {
  try {
    const usuarioId = req.usuario.id; // quien presiona "Contactar", viene del token
    const { donanteId, solicitudId } = req.body;

    // Tiene que venir exactamente uno de los dos
    if ((donanteId == null) === (solicitudId == null)) {
      return res.status(400).json({ error: "Debes indicar un donante o una solicitud para contactar (solo uno de los dos)" });
    }

    let otroUsuarioId; // el dueño con quien se quiere hablar

    if (donanteId != null) {
      const id = Number(donanteId);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Id de donante inválido" });
      }
      const donante = await prisma.donante.findUnique({ where: { id }, include: { mascota: true } });
      // Solo se puede contactar a donantes activos (los mismos que muestra la búsqueda)
      if (!donante || donante.estado !== "activo") {
        return res.status(404).json({ error: "Donante no encontrado" });
      }
      otroUsuarioId = donante.mascota.usuarioId;
    } else {
      const id = Number(solicitudId);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Id de solicitud inválido" });
      }
      const solicitud = await prisma.solicitudSangre.findUnique({ where: { id } });
      if (!solicitud) {
        return res.status(404).json({ error: "Solicitud no encontrada" });
      }
      // Escenario 2 de la historia: no se puede contactar por una solicitud ya resuelta
      if (solicitud.estado === "resuelta") {
        return res.status(409).json({ error: "Esta solicitud ya está resuelta" });
      }
      otroUsuarioId = solicitud.usuarioId;
    }

    if (otroUsuarioId === usuarioId) {
      return res.status(400).json({ error: "No puedes iniciar una conversación contigo mismo" });
    }

    // Siempre guardamos el id menor en A y el mayor en B, así la pareja tiene UNA sola conversación
    const usuarioAId = Math.min(usuarioId, otroUsuarioId);
    const usuarioBId = Math.max(usuarioId, otroUsuarioId);

    // Si ya existía, la devolvemos (200); si no, la creamos (201)
    const existente = await prisma.conversacion.findUnique({
      where: { usuarioAId_usuarioBId: { usuarioAId, usuarioBId } },
    });
    if (existente) {
      return res.status(200).json({ id: existente.id, createdAt: existente.createdAt });
    }

    const nueva = await prisma.conversacion.create({ data: { usuarioAId, usuarioBId } });
    res.status(201).json({ id: nueva.id, createdAt: nueva.createdAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar la conversación" });
  }
}

// S4-HU12: listar mis conversaciones, con el nombre de la otra persona y el último mensaje.
// Nunca se exponen correo ni teléfono.
async function listarMisConversaciones(req, res) {
  try {
    const usuarioId = req.usuario.id;

    const conversaciones = await prisma.conversacion.findMany({
      where: { OR: [{ usuarioAId: usuarioId }, { usuarioBId: usuarioId }] },
      include: {
        usuarioA: { select: { id: true, nombre: true } },
        usuarioB: { select: { id: true, nombre: true } },
        mensajes: { orderBy: { createdAt: "desc" }, take: 1 }, // solo el último mensaje
      },
      orderBy: { createdAt: "desc" },
    });

    const resultado = conversaciones.map((c) => {
      const otro = c.usuarioAId === usuarioId ? c.usuarioB : c.usuarioA; // la otra persona
      return { id: c.id, con: otro, ultimoMensaje: c.mensajes[0] ? c.mensajes[0].texto : null };
    });

    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar las conversaciones" });
  }
}

// S4-HU12: ver los mensajes de una conversación (del más antiguo al más nuevo)
async function listarMensajes(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const conversacionId = Number(req.params.id);

    if (!Number.isInteger(conversacionId)) {
      return res.status(400).json({ error: "Id de conversación inválido" });
    }

    // Si no existe o no participo, respondemos lo mismo (no revelamos que existe)
    const conversacion = await obtenerConversacionDelUsuario(conversacionId, usuarioId);
    if (!conversacion) {
      return res.status(404).json({ error: "Conversación no encontrada" });
    }

    const mensajes = await prisma.mensaje.findMany({
      where: { conversacionId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    // esMio le sirve al frontend para mostrar el mensaje a la derecha o a la izquierda
    res.json(mensajes.map((m) => ({ id: m.id, texto: m.texto, createdAt: m.createdAt, esMio: m.remitenteId === usuarioId })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar los mensajes" });
  }
}

// S4-HU12: enviar un mensaje dentro de una conversación
async function enviarMensaje(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const conversacionId = Number(req.params.id);

    if (!Number.isInteger(conversacionId)) {
      return res.status(400).json({ error: "Id de conversación inválido" });
    }

    const conversacion = await obtenerConversacionDelUsuario(conversacionId, usuarioId);
    if (!conversacion) {
      return res.status(404).json({ error: "Conversación no encontrada" });
    }

    // Aceptamos solo texto; quitamos espacios al inicio y al final
    const texto = typeof req.body.texto === "string" ? req.body.texto.trim() : "";
    if (!texto) {
      return res.status(400).json({ error: "El mensaje no puede estar vacío" });
    }
    if (texto.length > MAX_MENSAJE) {
      return res.status(400).json({ error: `El mensaje no puede superar los ${MAX_MENSAJE} caracteres` });
    }

    const mensaje = await prisma.mensaje.create({
      data: { conversacionId, remitenteId: usuarioId, texto },
    });

    res.status(201).json({ id: mensaje.id, texto: mensaje.texto, createdAt: mensaje.createdAt, esMio: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al enviar el mensaje" });
  }
}

module.exports = { iniciarConversacion, listarMisConversaciones, listarMensajes, enviarMensaje };