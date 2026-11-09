const prisma = require("../lib/prisma");

// Misma idea que en vacuna.controller.js: confirma que la mascota sea del usuario logueado
async function verificarMascotaDelUsuario(mascotaId, usuarioId) {
  const mascota = await prisma.mascota.findUnique({ where: { id: mascotaId } });
  return mascota && mascota.usuarioId === usuarioId ? mascota : null;
}

// S5: valida un texto opcional (debe ser texto y no pasar de cierto largo).
// Devuelve el mensaje de error, o null si está bien.
function errorTexto(valor, max, nombre) {
  if (valor == null) return null;
  if (typeof valor !== "string" || valor.length > max) {
    return `${nombre} debe ser texto de hasta ${max} caracteres`;
  }
  return null;
}

// Escenario 1 (registro exitoso) y escenario 2 (sin diagnóstico) de S2-HU05
async function crearRegistroMedico(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const { mascotaId, diagnostico, fecha, tratamiento, veterinario, motivo, recomendaciones } = req.body;

    // Escenario 2: el diagnóstico es obligatorio, con su propio mensaje específico
    if (!diagnostico) {
      return res.status(400).json({ error: "Debes indicar un diagnóstico" });
    }

    // El resto de los datos obligatorios (no vienen explícitos en la historia,
    // pero son necesarios estructuralmente: sin mascota no sabemos de quién es
    // el registro, y sin fecha no se puede ordenar el historial)
    if (!mascotaId || !fecha) {
      return res.status(400).json({
        error: "Faltan datos: mascota y fecha son obligatorios",
      });
    }

    const mascota = await verificarMascotaDelUsuario(Number(mascotaId), usuarioId);
    if (!mascota) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

    // S5: validar los datos nuevos de la consulta (todos opcionales)
    const errorDetalle =
      errorTexto(veterinario, 100, "El veterinario") ||
      errorTexto(motivo, 200, "El motivo") ||
      errorTexto(recomendaciones, 1000, "Las recomendaciones");
    if (errorDetalle) {
      return res.status(400).json({ error: errorDetalle });
    }

    const registro = await prisma.registroMedico.create({
      data: {
        diagnostico,
        fecha: new Date(fecha),
        tratamiento: tratamiento || null,
        veterinario: veterinario?.trim() || null,
        motivo: motivo?.trim() || null,
        recomendaciones: recomendaciones?.trim() || null,
        mascotaId: Number(mascotaId),
      },
    });

    res.status(201).json(registro);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar el diagnóstico" });
  }
}

// Escenario 3 de S2-HU05: "todos los registros ordenados... del más reciente al más antiguo"
async function listarRegistrosMedicos(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const mascotaId = Number(req.params.mascotaId);

    const mascota = await verificarMascotaDelUsuario(mascotaId, usuarioId);
    if (!mascota) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

    const registros = await prisma.registroMedico.findMany({
      where: { mascotaId },
      orderBy: { fecha: "desc" }, // "desc" = descendente = del más nuevo al más viejo
    });

    res.json(registros);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el historial médico" });
  }
}

// S5: detalle de UNA consulta (la pantalla "Detalle de consulta" de la maqueta).
// Incluye los documentos adjuntos. Si no existe o no es de una mascota del usuario, 404.
async function obtenerRegistroMedico(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const registroId = Number(req.params.id);

    if (!Number.isInteger(registroId)) {
      return res.status(400).json({ error: "Id de registro inválido" });
    }

    const registro = await prisma.registroMedico.findUnique({
      where: { id: registroId },
      include: {
        mascota: true, // solo para comprobar de quién es
        documentos: { select: { id: true, nombreArchivo: true, tipoArchivo: true, tamano: true, createdAt: true } },
      },
    });

    // Si no existe o es de otra persona, respondemos lo mismo (no revelamos que existe)
    if (!registro || registro.mascota.usuarioId !== usuarioId) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    const { mascota, ...detalle } = registro; // la mascota no se devuelve, era solo para validar
    res.json(detalle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el registro" });
  }
}

module.exports = { crearRegistroMedico, listarRegistrosMedicos, obtenerRegistroMedico };