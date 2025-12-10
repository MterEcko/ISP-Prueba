// backend/src/plugins/whatsapp/src/whatsapp.routes.js
const whatsappController = require('./whatsapp.controller');

module.exports = function(app) {
  /**
   * Webhook para WhatsApp
   * POST /api/plugins/whatsapp/webhook
   */
  app.post(
    "/api/plugins/whatsapp/webhook",
    async (req, res) => {
      try {
        const result = await whatsappController.processWebhook(null, req.body);
        
        if (result) {
          return res.status(200).json({
            success: true,
            data: result,
            message: 'Webhook procesado exitosamente'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Webhook recibido'
        });

      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Error procesando webhook de WhatsApp'
        });
      }
    }
  );

  /**
   * Verificación de webhook de WhatsApp
   * GET /api/plugins/whatsapp/webhook
   */
  app.get(
    "/api/plugins/whatsapp/webhook",
    (req, res) => {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      // Verificar token (esto debería venir de la configuración)
      if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        res.status(200).send(challenge);
      } else {
        res.status(403).send('Forbidden');
      }
    }
  );

  /**
   * Obtener estado de QR para WhatsApp Web
   * GET /api/plugins/whatsapp/qr
   */
  app.get(
    "/api/plugins/whatsapp/qr",
    async (req, res) => {
      try {
        const qrData = await whatsappController.getQRCode();
        
        return res.status(200).json({
          success: true,
          data: qrData,
          message: 'Estado de QR obtenido'
        });

      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Error obteniendo QR'
        });
      }
    }
  );
};
