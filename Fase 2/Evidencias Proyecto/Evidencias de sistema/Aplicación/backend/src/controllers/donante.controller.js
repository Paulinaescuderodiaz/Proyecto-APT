const prisma = require("../lib/prisma");

// Confirma que la mascota exista Y que sea del usuario logueado
// (mismo patrón que usamos en vacunas).
async function verificarMascotaDelUsuario(mascotaId, usuarioId) {
  const mascota = await prisma.mascota.findUnique({ where: { id: mascotaId } });
  return mascota && mascota.usuarioId === usuarioId ? mascota : null;
}

// S3-HU08: registrar una mascota como donante voluntario.
// Si se indica el grupo sanguíneo, el donante queda "activo".
// Si se deja vacío, queda "pendiente" (el grupo se puede agregar después).
async function crearDonante(req, res) {
  try {
    const usuarioId = req.usuario.id; // viene del token
    const { mascotaId, grupoSanguineo, cumpleRequisitos } = req.body;

    if (!mascotaId) {
      return res.status(400).json({ error: "Faltan datos: la mascota es obligatoria" });
    }

    // El dueño debe DECLARAR que su mascota cumple los requisitos para donar.
    // La app no evalúa la salud del animal: eso lo valida un veterinario.
    if (cumpleRequisitos !== true) {
      return res.status(400).json({
        error: "Debes declarar que tu mascota cumple los requisitos para donar",
      });
    }

    // Seguridad: la mascota tiene que ser del usuario que hace la petición
    const mascota = await verificarMascotaDelUsuario(Number(mascotaId), usuarioId);
    if (!mascota) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

    // Una mascota solo puede registrarse una vez como donante
    const yaExiste = await prisma.donante.findUnique({ where: { mascotaId: mascota.id } });
    if (yaExiste) {
      return res.status(409).json({ error: "Esta mascota ya está registrada como donante" });
    }

    // Limpiamos el texto: si viene vacío o con puros espacios, lo tratamos como "no indicado"
    const grupo = grupoSanguineo ? String(grupoSanguineo).trim() : "";

    const donante = await prisma.donante.create({
      data: {
        mascotaId: mascota.id,
        grupoSanguineo: grupo || null,
        estado: grupo ? "activo" : "pendiente",
      },
    });

    res.status(201).json({
      ...donante,
      aviso: "La aptitud médica para donar debe ser validada siempre por un veterinario de forma presencial.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar al donante" });
  }
}

module.exports = { crearDonante };