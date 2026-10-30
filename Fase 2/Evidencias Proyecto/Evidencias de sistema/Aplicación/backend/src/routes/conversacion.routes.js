const express = require("express");
const router = express.Router();
const { iniciarConversacion, listarMisConversaciones, verConversacion, listarMensajes, enviarMensaje } = require("../controllers/conversacion.controller");
const verificarToken = require("../middleware/auth.middleware");

// POST /api/conversaciones -> "Contactar": abre o recupera la conversación (body: donanteId o solicitudId)
router.post("/", verificarToken, iniciarConversacion);

// GET /api/conversaciones -> listar mis conversaciones
router.get("/", verificarToken, listarMisConversaciones);

// GET /api/conversaciones/:id -> datos de la conversación + aviso de validación veterinaria
router.get("/:id", verificarToken, verConversacion);

// GET /api/conversaciones/:id/mensajes -> ver los mensajes de una conversación
router.get("/:id/mensajes", verificarToken, listarMensajes);

// POST /api/conversaciones/:id/mensajes -> enviar un mensaje
router.post("/:id/mensajes", verificarToken, enviarMensaje);

module.exports = router;