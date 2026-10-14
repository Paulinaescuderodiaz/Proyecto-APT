const prisma = require("../lib/prisma");

// Misma idea que en vacuna.controller.js: confirma que la mascota sea del usuario logueado
async function verificarMascotaDelUsuario(mascotaId, usuarioId) {
  const mascota = await prisma.mascota.findUnique({ where: { id: mascotaId } });
  return mascota && mascota.usuarioId === usuarioId ? mascota : null;
}

// Escenario 1 (registro exitoso) y escenario 2 (sin diagnóstico) de S2-HU05
async function crearRegistroMedico(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const { mascotaId, diagnostico, fecha, tratamiento } = req.body;

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

    const registro = await prisma.registroMedico.create({
      data: {
        diagnostico,
        fecha: new Date(fecha),
        tratamiento: tratamiento || null,
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

module.exports = { crearRegistroMedico, listarRegistrosMedicos };