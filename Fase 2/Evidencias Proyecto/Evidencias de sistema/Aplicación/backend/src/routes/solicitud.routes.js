const express = require("express");
const router = express.Router();
const { crearSolicitud } = require("../controllers/solicitud.controller");
const verificarToken = require("../middleware/auth.middleware");

// POST /api/solicitudes -> publicar una solicitud de sangre (requiere sesión iniciada)
router.post("/", verificarToken, crearSolicitud);

module.exports = router;
