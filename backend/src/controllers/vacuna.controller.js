const prisma = require("../lib/prisma");

// Función de apoyo: confirma que la mascota exista Y que sea del usuario logueado.
// La usamos antes de crear, listar o editar vacunas, para que nadie pueda
// ver o modificar las vacunas de una mascota que no es suya.
async function verificarMascotaDelUsuario(mascotaId, usuarioId) {
  const mascota = await prisma.mascota.findUnique({ where: { id: mascotaId } });
  return mascota && mascota.usuarioId === usuarioId ? mascota : null;
}

// Escenario 1 de S2-HU04: registrar una vacuna nueva.
// Escenario 2 de S2-HU04: si la fecha de refuerzo es anterior a la de aplicación, rechazar.
async function crearVacuna(req, res) {
  try {
    const usuarioId = req.usuario.id; // viene del token (lo pone verificarToken)
    const { mascotaId, nombre, fechaAplicacion, fechaProximoRefuerzo } = req.body;

    // Validamos que lleguen los 3 datos obligatorios antes de tocar la base de datos
    if (!mascotaId || !nombre || !fechaAplicacion) {
      return res.status(400).json({
        error: "Faltan datos: mascota, nombre y fecha de aplicacion son obligatorios",
      });
    }

    // Seguridad: esta mascota tiene que ser del usuario que está haciendo la petición
    const mascota = await verificarMascotaDelUsuario(Number(mascotaId), usuarioId);
    if (!mascota) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

    // Convertimos los textos de fecha (ej: "2026-09-20") a objetos Date de JavaScript,
    // porque son los que Prisma espera guardar en la columna DateTime
    const fechaAplicacionDate = new Date(fechaAplicacion);
    let fechaProximoRefuerzoDate = null;

    if (fechaProximoRefuerzo) {
      fechaProximoRefuerzoDate = new Date(fechaProximoRefuerzo);

      // Escenario 2: la fecha de refuerzo no puede ser igual ni anterior a la de aplicación
      if (fechaProximoRefuerzoDate <= fechaAplicacionDate) {
        return res.status(400).json({
          error: "La fecha de refuerzo debe ser posterior a la fecha de aplicación",
        });
      }
    }

    // Si pasó todas las validaciones, recién ahí se guarda en la base de datos
    const vacuna = await prisma.vacuna.create({
      data: {
        nombre,
        fechaAplicacion: fechaAplicacionDate,
        fechaProximoRefuerzo: fechaProximoRefuerzoDate,
        mascotaId: Number(mascotaId),
      },
    });

    res.status(201).json(vacuna); // 201 = "creado exitosamente"
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar la vacuna" });
  }
}

// Escenario 1 de S2-HU04: "el sistema... la muestra ordenada por fecha"
// Esta función lista todas las vacunas de UNA mascota específica
async function listarVacunas(req, res) {
  try {
    const usuarioId = req.usuario.id; // usuario logueado (del token)
    const mascotaId = Number(req.params.mascotaId); // viene de la URL, ej: /api/vacunas/mascota/5

    // Misma verificación de seguridad que en crearVacuna:
    // esta mascota tiene que pertenecer al usuario que está pidiendo la lista
    const mascota = await verificarMascotaDelUsuario(mascotaId, usuarioId);
    if (!mascota) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

    // Buscamos todas las vacunas cuya mascotaId coincida, y las ordenamos
    // por fechaAplicacion de forma ascendente (de la más antigua a la más reciente)
    const vacunas = await prisma.vacuna.findMany({
      where: { mascotaId },
      orderBy: { fechaAplicacion: "asc" },
    });

    res.json(vacunas); // 200 (por defecto) con el arreglo de vacunas
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las vacunas" });
  }
}// Escenario 3 de S2-HU04: "el sistema actualiza el registro... sin duplicar la entrada"
// Por eso usamos prisma.vacuna.update() (modifica el registro existente),
// nunca prisma.vacuna.create() (eso crearía uno nuevo y duplicaría la vacuna)
async function actualizarVacuna(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const vacunaId = Number(req.params.id); // el id de la vacuna a editar, viene de la URL
    const { nombre, fechaAplicacion, fechaProximoRefuerzo, aplicada } = req.body;

    // Buscamos la vacuna Y de paso traemos su mascota (con "include"),
    // para poder revisar de quién es sin hacer una segunda consulta aparte
    const existente = await prisma.vacuna.findUnique({
      where: { id: vacunaId },
      include: { mascota: true },
    });

    // Seguridad: si la vacuna no existe, o su mascota no es del usuario logueado, se rechaza
    if (!existente || existente.mascota.usuarioId !== usuarioId) {
      return res.status(404).json({ error: "Vacuna no encontrada" });
    }

    // Si el usuario no manda una fecha de aplicación nueva, dejamos la que ya tenía guardada
    const nuevaFechaAplicacion = fechaAplicacion
      ? new Date(fechaAplicacion)
      : existente.fechaAplicacion;

    // Para la fecha de refuerzo usamos "!== undefined" (no solo "if (fechaProximoRefuerzo)")
    // porque queremos poder distinguir "no mandaron este campo" de "lo mandaron vacío a propósito"
    let nuevaFechaProximoRefuerzo = existente.fechaProximoRefuerzo;
    if (fechaProximoRefuerzo !== undefined) {
      nuevaFechaProximoRefuerzo = fechaProximoRefuerzo ? new Date(fechaProximoRefuerzo) : null;
    }

    // La misma validación de fechas del escenario 2 también aplica aquí, al editar
    if (nuevaFechaProximoRefuerzo && nuevaFechaProximoRefuerzo <= nuevaFechaAplicacion) {
      return res.status(400).json({
        error: "La fecha de refuerzo debe ser posterior a la fecha de aplicación",
      });
    }

    // update() modifica el registro que ya existe (identificado por su id), no crea uno nuevo
    const vacuna = await prisma.vacuna.update({
      where: { id: vacunaId },
      data: {
        nombre: nombre ?? existente.nombre,
        fechaAplicacion: nuevaFechaAplicacion,
        fechaProximoRefuerzo: nuevaFechaProximoRefuerzo,
        aplicada: aplicada ?? existente.aplicada,
      },
    });

    res.json(vacuna);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar la vacuna" });
  }
}

module.exports = { crearVacuna, listarVacunas, actualizarVacuna };