const express = require("express");
const router = express.Router();
const { listarMisNotificaciones, marcarLeida } = require("../controllers/notificacion.controller");
const verificarToken = require("../middleware/auth.middleware");

// GET /api/notificaciones -> listar mis notificaciones (opcional ?leida=false)
router.get("/", verificarToken, listarMisNotificaciones);

// PUT /api/notificaciones/:id/leida -> marcar una notificación como leída
router.put("/:id/leida", verificarToken, marcarLeida);

module.exports = router;