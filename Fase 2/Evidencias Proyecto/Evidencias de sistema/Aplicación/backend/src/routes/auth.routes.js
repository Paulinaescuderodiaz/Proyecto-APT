const express = require("express");
const router = express.Router();
const { registro, login, verPerfil, actualizarPerfil } = require("../controllers/auth.controller");
const verificarToken = require("../middleware/auth.middleware"); // exige estar logueado

router.post("/registro", registro);
router.post("/login", login);

// GET /api/auth/perfil -> ver mis datos; PUT /api/auth/perfil -> editarlos
router.get("/perfil", verificarToken, verPerfil);
router.put("/perfil", verificarToken, actualizarPerfil);

module.exports = router;