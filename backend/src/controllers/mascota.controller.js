const prisma = require("../lib/prisma");

async function crearMascota(req, res) {
  try {
    const { nombre, especie, raza, fechaNacimiento, sexo } = req.body;
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
    });

    res.json(mascotas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las mascotas" });
  }
}

module.exports = { crearMascota, listarMascotas };
