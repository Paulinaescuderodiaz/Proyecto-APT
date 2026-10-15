const express = require("express");
const router = express.Router();
const { crearDonante, buscarDonantes } = require("../controllers/donante.controller");
const verificarToken = require("../middleware/auth.middleware");

// verificarToken: solo usuarios con sesión iniciada pueden registrar donantes
router.post("/", verificarToken, crearDonante);

// GET /api/donantes/buscar?especie=perro&grupoSanguineo=DEA 1.1 positivo&comuna=Valparaíso
router.get("/buscar", verificarToken, buscarDonantes);

module.exports = router;