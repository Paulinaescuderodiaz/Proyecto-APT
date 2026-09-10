const express = require("express");
const router = express.Router();
const { crearMascota, listarMascotas } = require("../controllers/mascota.controller");
const verificarToken = require("../middleware/auth.middleware");

router.post("/", verificarToken, crearMascota);
router.get("/", verificarToken, listarMascotas);

module.exports = router;
