const prisma = require("../lib/prisma");
const { AVISO_VALIDACION_VETERINARIA } = require("../lib/avisos");

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
    const { mascotaId, grupoSanguineo, cumpleRequisitos, aptaParaDonar } = req.body;

    if (!mascotaId) {
      return res.status(400).json({ error: "Faltan datos: la mascota es obligatoria" });
    }

    // S4-HU13 (escenario 2): la app NUNCA permite marcar a una mascota como "apta para donar".
    // Esa aptitud solo la confirma un veterinario de forma presencial.
    if (aptaParaDonar !== undefined) {
      return res.status(400).json({
        error: "La aptitud para donar no se puede marcar desde la app",
        aviso: AVISO_VALIDACION_VETERINARIA,
      });
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
      aviso: AVISO_VALIDACION_VETERINARIA,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar al donante" });
  }
}
// S3-HU10: buscar donantes compatibles por especie y grupo sanguíneo.
// Solo aparecen los donantes "activos". Si se indica la comuna, los de esa comuna salen primero.
async function buscarDonantes(req, res) {
  try {
    const { especie, grupoSanguineo, comuna } = req.query; // vienen en la URL: ?especie=perro&grupoSanguineo=...

    if (!especie || !grupoSanguineo) {
      return res.status(400).json({ error: "Faltan datos: especie y grupo sanguíneo son obligatorios" });
    }

    const donantes = await prisma.donante.findMany({
      where: {
        estado: "activo", // los "pendientes" (sin grupo) no sirven para buscar
        // mode: "insensitive" hace que "perro" y "Perro" cuenten como lo mismo
        grupoSanguineo: { equals: String(grupoSanguineo).trim(), mode: "insensitive" },
        mascota: { especie: { equals: String(especie).trim(), mode: "insensitive" } },
      },
      // Traemos la mascota y la comuna de su dueño (solo la comuna, nunca correo ni teléfono)
      include: { mascota: { include: { usuario: { select: { comuna: true } } } } },
    });

    // Armamos la respuesta solo con los datos que la búsqueda necesita mostrar
    const resultado = donantes.map((d) => ({
      id: d.id,
      mascota: d.mascota.nombre,
      especie: d.mascota.especie,
      raza: d.mascota.raza,
      grupoSanguineo: d.grupoSanguineo,
      comuna: d.mascota.usuario.comuna,
    }));

    // Si se indicó comuna, los de la misma comuna pasan adelante
    if (comuna) {
      const buscada = String(comuna).trim().toLowerCase();
      const esMisma = (c) => (c || "").trim().toLowerCase() === buscada;
      resultado.sort((a, b) => Number(esMisma(b.comuna)) - Number(esMisma(a.comuna)));
    }

    if (resultado.length === 0) {
      return res.json({
        mensaje: "No se encontraron donantes compatibles en este momento",
        donantes: [],
      });
    }

    res.json({ donantes: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al buscar donantes" });
  }
}
module.exports = { crearDonante, buscarDonantes };