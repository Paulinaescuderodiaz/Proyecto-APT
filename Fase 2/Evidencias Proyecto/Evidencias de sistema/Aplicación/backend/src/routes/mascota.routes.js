const express = require("express");
const router = express.Router();
const { crearMascota, listarMascotas, actualizarMascota } = require("../controllers/mascota.controller");
const verificarToken = require("../middleware/auth.middleware");

router.post("/", verificarToken, crearMascota);
router.get("/", verificarToken, listarMascotas);
router.put("/:id", verificarToken, actualizarMascota);

module.exports = router;
