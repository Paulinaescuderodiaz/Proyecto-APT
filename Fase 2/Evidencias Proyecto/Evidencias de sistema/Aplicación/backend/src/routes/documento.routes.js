const express = require("express");
const router = express.Router();
const { subirDocumento, listarDocumentos, obtenerArchivo } = require("../controllers/documento.controller");
const verificarToken = require("../middleware/auth.middleware");

// POST /api/documentos -> subir un archivo (recibe registroMedicoId + el archivo)
router.post("/", verificarToken, subirDocumento);

router.get("/registro/:registroMedicoId", verificarToken, listarDocumentos);
router.get("/:id/archivo", verificarToken, obtenerArchivo);

module.exports = router;
