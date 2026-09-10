const prisma = require("../lib/prisma");

async function crearMascota(req, res) {
  try {
    const { nombre, especie, raza, fechaNacimiento, sexo, foto } = req.body;
    const usuarioId = req.usuario.id;

    if (!nombre || !especie) {
      return res.status(400).json({ error: "Faltan datos: nombre y especie son obligatorios" });
    }

    const mascota = await prisma.mascota.create({
      data: {
        nombre,
        especie,
        raza: raza || null,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        sexo: sexo || null,
        foto: foto || null,
        usuarioId,
      },
    });

    res.status(201).json(mascota);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar la mascota" });
  }
}

async function listarMascotas(req, res) {
  try {
    const usuarioId = req.usuario.id;

    const mascotas = await prisma.mascota.findMany({
      where: { usuarioId },
      orderBy: { createdAt: "asc" },
    });

    res.json(mascotas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las mascotas" });
  }
}

async function actualizarMascota(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const mascotaId = Number(req.params.id);
    const { nombre, especie, raza, foto } = req.body;

    const existente = await prisma.mascota.findUnique({ where: { id: mascotaId } });
    if (!existente || existente.usuarioId !== usuarioId) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

    const mascota = await prisma.mascota.update({
      where: { id: mascotaId },
      data: {
        nombre: nombre ?? existente.nombre,
        especie: especie ?? existente.especie,
        raza: raza ?? existente.raza,
        foto: foto ?? existente.foto,
      },
    });

    res.json(mascota);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar la mascota" });
  }
}

module.exports = { crearMascota, listarMascotas, actualizarMascota };
