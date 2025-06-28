const express = require('express');
const router = express.Router();
const whatsappMessageController = require('../controllers/whatsappMessageController');
const konecteWebhookController = require('../controllers/konecteWebhookController');

// Ruta para verificar que la API de webhooks está funcionando
router.get('/', (req, res) => {
    res.json({ message: 'API de Webhooks funcionando' });
});

// Ruta para enviar mensajes de WhatsApp
router.post('/send-message', whatsappMessageController.sendMessage);

// Ruta para recibir mensajes de WhatsApp (si se configura un webhook externo)
router.post('/whatsapp', whatsappMessageController.handleIncomingMessage);

// Ruta para recibir mensajes de Konecte (webhook)
router.post('/konecte-incoming', konecteWebhookController.handleIncomingWebhook);

// Ruta para verificar que el webhook está funcionando
router.get('/konecte-incoming', konecteWebhookController.checkWebhook);

module.exports = router; 