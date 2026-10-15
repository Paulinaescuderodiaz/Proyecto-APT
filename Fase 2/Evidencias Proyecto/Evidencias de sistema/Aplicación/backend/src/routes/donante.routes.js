const express = require("express");
const router = express.Router();
const { crearDonante } = require("../controllers/donante.controller");
const verificarToken = require("../middleware/auth.middleware");

// verificarToken: solo usuarios con sesión iniciada pueden registrar donantes
router.post("/", verificarToken, crearDonante);

module.exports = router;