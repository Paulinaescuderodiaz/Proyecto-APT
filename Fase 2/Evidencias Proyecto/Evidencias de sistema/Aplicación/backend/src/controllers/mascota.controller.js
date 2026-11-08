const prisma = require("../lib/prisma");
const { AVISO_VALIDACION_VETERINARIA } = require("../lib/avisos");

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
      include: { donante: true }, // trae el registro de donante (o null si no es donante)
    });

    // S4-HU13 (escenario 3): si la mascota es donante, su ficha muestra el aviso de validación veterinaria
    const resultado = mascotas.map((m) =>
      m.donante ? { ...m, aviso: AVISO_VALIDACION_VETERINARIA } : m
    );

    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las mascotas" });
  }
}

async function actualizarMascota(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const mascotaId = Number(req.params.id);
    const { nombre, especie, raza, foto, fechaNacimiento, sexo } = req.body;

    const existente = await prisma.mascota.findUnique({ where: { id: mascotaId } });
    if (!existente || existente.usuarioId !== usuarioId) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

        // S5: validar la fecha de nacimiento (si viene) y el sexo (si viene)
    if (fechaNacimiento) {
      const fecha = new Date(fechaNacimiento);
      if (isNaN(fecha.getTime())) {
        return res.status(400).json({ error: "La fecha de nacimiento no es válida" });
      }
      if (fecha > new Date()) {
        return res.status(400).json({ error: "La fecha de nacimiento no puede ser futura" });
      }
    }
    if (sexo && !["macho", "hembra"].includes(String(sexo).toLowerCase())) {
      return res.status(400).json({ error: "El sexo debe ser macho o hembra" });
    }

    const mascota = await prisma.mascota.update({
      where: { id: mascotaId },
      data: {
        nombre: nombre ?? existente.nombre,
        especie: especie ?? existente.especie,
        raza: raza ?? existente.raza,
        foto: foto ?? existente.foto,
        // undefined = no cambiar; "" o null = borrar el dato
        fechaNacimiento: fechaNacimiento === undefined ? existente.fechaNacimiento : (fechaNacimiento ? new Date(fechaNacimiento) : null),
        sexo: sexo === undefined ? existente.sexo : (sexo ? String(sexo).toLowerCase() : null),
      },
    });

    res.json(mascota);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar la mascota" });
  }
}

module.exports = { crearMascota, listarMascotas, actualizarMascota };
