const prisma = require("../lib/prisma");

// Simula el envío de una notificación push.
// Hoy no hay ningún dispositivo con pushToken registrado (el frontend todavía
// no lo implementa), así que esto siempre va a devolver "false" en la práctica.
// Queda aquí, marcado con un TODO, el lugar exacto donde se conectaría
// el SDK real de Firebase Cloud Messaging el día que se implemente.
function enviarNotificacionPush(usuario, vacuna) {
  if (!usuario.pushToken) {
    return false; // sin token, no hay a dónde mandar la notificación
  }

  // TODO: conectar Firebase Admin SDK, algo como:
  // await admin.messaging().send({ token: usuario.pushToken, notification: {...} });
  return true;
}

// Esta es la "revisión diaria de vacunas próximas" que menciona la historia.
// La llama automáticamente el cron todos los días (lo programamos más adelante),
// y también se puede ejecutar manualmente para pruebas.
async function revisarVacunasProximas() {
  const hoy = new Date();
  // Calculamos el rango de fechas correspondiente a "dentro de 3 días" (todo ese día completo)
  const inicio = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + 3, 0, 0, 0));
const fin = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + 3, 23, 59, 59));
  // Escenario 3: "aplicada: false" excluye automáticamente las vacunas
  // que el usuario ya marcó como aplicadas — no se les crea ningún recordatorio
  const vacunas = await prisma.vacuna.findMany({
    where: {
      aplicada: false,
      fechaProximoRefuerzo: { gte: inicio, lte: fin },
    },
    include: { mascota: { include: { usuario: true } } },
  });

  for (const vacuna of vacunas) {
    const usuario = vacuna.mascota.usuario;
    const seEnvio = enviarNotificacionPush(usuario, vacuna);

    // Escenario 1 (seEnvio = true) o escenario 2 (seEnvio = false): queda registrado igual
    await prisma.recordatorio.create({
      data: {
        vacunaId: vacuna.id,
        estado: seEnvio ? "enviado" : "fallido",
      },
    });
  }

  return vacunas.length; // cuántas vacunas se revisaron en total
}

// Ruta manual, para poder probar/demostrar la revisión sin tener que esperar
// a que el cron la ejecute solo (eso lo dejamos programado en app.js, aparte)
async function ejecutarRevision(req, res) {
  try {
    const cantidad = await revisarVacunasProximas();
    res.json({ mensaje: `Revisión completada. Vacunas procesadas: ${cantidad}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al ejecutar la revisión de vacunas" });
  }
}

// Escenario 2: "muestra el recordatorio dentro de la app al iniciar sesión"
async function listarRecordatoriosPendientes(req, res) {
  try {
    const usuarioId = req.usuario.id;

    // Buscamos recordatorios fallidos de ESTE usuario, que todavía no se le mostraron
    const pendientes = await prisma.recordatorio.findMany({
      where: {
        estado: "fallido",
        visto: false,
        vacuna: { mascota: { usuarioId } },
      },
      include: { vacuna: true },
    });

    // Una vez que se los mostramos, los marcamos como "vistos"
    // para que no le vuelvan a aparecer la próxima vez que inicie sesión
    if (pendientes.length > 0) {
      await prisma.recordatorio.updateMany({
        where: { id: { in: pendientes.map((r) => r.id) } },
        data: { visto: true },
      });
    }

    res.json(pendientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los recordatorios pendientes" });
  }
}

module.exports = { revisarVacunasProximas, ejecutarRevision, listarRecordatoriosPendientes };