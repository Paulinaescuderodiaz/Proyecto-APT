const express = require("express");
const router = express.Router();
const { ejecutarRevision, listarRecordatoriosPendientes } = require("../controllers/recordatorio.controller");
const verificarToken = require("../middleware/auth.middleware");

// POST /api/recordatorios/ejecutar -> dispara la revisión manualmente (para pruebas/demo)
router.post("/ejecutar", verificarToken, ejecutarRevision);

// GET /api/recordatorios/pendientes -> recordatorios fallidos sin ver, del usuario logueado
router.get("/pendientes", verificarToken, listarRecordatoriosPendientes);

module.exports = router;
