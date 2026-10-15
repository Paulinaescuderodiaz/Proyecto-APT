const app = require("./src/app");
const cron = require("node-cron");
const { revisarVacunasProximas } = require("./src/controllers/recordatorio.controller");

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Programamos la "revisión diaria de vacunas próximas" (S2-HU07) para que se
// ejecute sola, todos los días a las 8:00 AM, sin que nadie tenga que hacer nada.
cron.schedule("0 8 * * *", async () => {
  console.log("Ejecutando revisión diaria de vacunas próximas...");
  const cantidad = await revisarVacunasProximas();
  console.log(`Revisión diaria completada. Vacunas procesadas: ${cantidad}`);
});