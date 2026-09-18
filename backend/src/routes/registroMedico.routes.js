const express = require("express");
const router = express.Router();
const { crearRegistroMedico, listarRegistrosMedicos } = require("../controllers/registroMedico.controller");
const verificarToken = require("../middleware/auth.middleware");

// POST /api/registros-medicos -> registrar un diagnóstico/tratamiento (recibe mascotaId en el body)
router.post("/", verificarToken, crearRegistroMedico);

// GET /api/registros-medicos/mascota/:mascotaId -> historial médico completo de una mascota
router.get("/mascota/:mascotaId", verificarToken, listarRegistrosMedicos);

module.exports = router;