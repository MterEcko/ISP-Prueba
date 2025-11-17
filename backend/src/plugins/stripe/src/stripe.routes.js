// backend/src/plugins/stripe/src/stripe.routes.js
const express = require('express');
const router = express.Router();
const StripeController = require('./stripe.controller');
const logger = require('../../../utils/logger');

/**
 * Webhook de Stripe
 * Importante: Esta ruta NO debe usar body parser JSON
 * ya que Stripe requiere el raw body para verificar la firma
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    logger.info('Webhook Stripe recibido');

    // Procesar webhook
    const result = await StripeController.processWebhook(
      null, // Usará el cliente del servicio
      JSON.parse(payload.toString()),
      signature
    );

    if (result) {
      logger.info(`Webhook Stripe procesado exitosamente: ${JSON.stringify(result)}`);
    }

    // Stripe espera un 200 rápido
    res.status(200).json({ received: true });

  } catch (error) {
    logger.error(`Error en webhook Stripe: ${error.message}`);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Obtener información del plugin
 */
router.get('/info', (req, res) => {
  try {
    const info = StripeController.getPluginInfo();
    res.json({ success: true, info });
  } catch (error) {
    logger.error(`Error obteniendo info de plugin: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Obtener estadísticas del plugin
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await StripeController.getStatistics();
    res.json({ success: true, statistics: stats });
  } catch (error) {
    logger.error(`Error obteniendo estadísticas: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Procesar pago
 */
router.post('/process-payment', async (req, res) => {
  try {
    const result = await StripeController.processPayment(null, req.body);
    res.json({ success: true, result });
  } catch (error) {
    logger.error(`Error procesando pago: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Obtener estado de pago
 */
router.get('/payment-status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const status = await StripeController.getPaymentStatus(null, paymentIntentId);
    res.json({ success: true, status });
  } catch (error) {
    logger.error(`Error obteniendo estado: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Reembolsar pago
 */
router.post('/refund', async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ success: false, error: 'paymentIntentId es requerido' });
    }

    const result = await StripeController.refundPayment(null, paymentIntentId, amount);
    res.json({ success: true, result });
  } catch (error) {
    logger.error(`Error procesando reembolso: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Cancelar Payment Intent
 */
router.post('/cancel', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ success: false, error: 'paymentIntentId es requerido' });
    }

    const result = await StripeController.cancelPayment(null, paymentIntentId);
    res.json({ success: true, result });
  } catch (error) {
    logger.error(`Error cancelando pago: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
