const express = require("express");
const router = express.Router();
const { crearSolicitud, resolverSolicitud, listarMisSolicitudes } = require("../controllers/solicitud.controller");
const verificarToken = require("../middleware/auth.middleware");

// POST /api/solicitudes -> publicar una solicitud de sangre (requiere sesión iniciada)
router.post("/", verificarToken, crearSolicitud);

// GET /api/solicitudes -> listar mis solicitudes (opcional ?estado=activa)
router.get("/", verificarToken, listarMisSolicitudes);

// PUT /api/solicitudes/:id/resolver -> marcar una solicitud como resuelta
router.put("/:id/resolver", verificarToken, resolverSolicitud);

module.exports = router;
