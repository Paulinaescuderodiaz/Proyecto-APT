const express = require("express");
const router = express.Router();
const { subirDocumento } = require("../controllers/documento.controller");
const verificarToken = require("../middleware/auth.middleware");

// POST /api/documentos -> subir un archivo (recibe registroMedicoId + el archivo)
router.post("/", verificarToken, subirDocumento);

module.exports = router;
