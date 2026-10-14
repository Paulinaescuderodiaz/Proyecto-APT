const express = require("express");
const router = express.Router();
const { crearVacuna, listarVacunas, actualizarVacuna } = require("../controllers/vacuna.controller");
const verificarToken = require("../middleware/auth.middleware");

// POST /api/vacunas -> registrar una vacuna nueva (recibe mascotaId en el body)
router.post("/", verificarToken, crearVacuna);

// GET /api/vacunas/mascota/:mascotaId -> listar las vacunas de una mascota específica
router.get("/mascota/:mascotaId", verificarToken, listarVacunas);

// PUT /api/vacunas/:id -> editar una vacuna existente por su id
router.put("/:id", verificarToken, actualizarVacuna);

module.exports = router;