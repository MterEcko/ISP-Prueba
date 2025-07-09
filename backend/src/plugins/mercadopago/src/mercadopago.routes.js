// backend/src/plugins/mercadopago/src/mercadopago.routes.js
const express = require('express');
const router = express.Router();
const mercadopagoController = require('./mercadopago.controller');
const { authJwt } = require('../../../middleware');

/**
 * Rutas específicas del plugin de MercadoPago
 * Estas rutas se montan automáticamente cuando el plugin está activo
 */

// ==================== CONFIGURACIÓN DEL PLUGIN ====================

/**
 * Obtener información del plugin
 * GET /api/plugins/mercadopago/info
 */
router.get('/info', [authJwt.verifyToken], async (req, res) => {
  try {
    const pluginInfo = mercadopagoController.getPluginInfo();
    
    return res.status(200).json({
      success: true,
      data: pluginInfo,
      message: 'Información del plugin obtenida exitosamente'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Validar configuración del plugin
 * POST /api/plugins/mercadopago/validate-config
 */
router.post('/validate-config', [authJwt.verifyToken], async (req, res) => {
  try {
    const { configuration } = req.body;
    
    if (!configuration) {
      return res.status(400).json({
        success: false,
        message: 'Configuración es requerida'
      });
    }

    const validation = mercadopagoController.validateConfig(configuration);
    
    return res.status(200).json({
      success: true,
      data: {
        valid: validation.valid,
        errors: validation.errors || []
      },
      message: validation.valid ? 'Configuración válida' : 'Configuración inválida'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Probar conexión con MercadoPago
 * POST /api/plugins/mercadopago/test-connection
 */
router.post('/test-connection', [authJwt.verifyToken, authJwt.checkPermission("manage_billing")], async (req, res) => {
  try {
    const { configuration } = req.body;
    
    if (!configuration) {
      return res.status(400).json({
        success: false,
        message: 'Configuración es requerida'
      });
    }

    // Validar configuración primero
    const validation = mercadopagoController.validateConfig(configuration);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Configuración inválida',
        errors: validation.errors
      });
    }

    // Intentar inicializar con la configuración de prueba
    const testClient = await mercadopagoController.initialize(configuration);
    
    // Probar conectividad obteniendo información del usuario
    const user = await testClient.users.get('me');
    
    if (!user.body || !user.body.id) {
      throw new Error('Error obteniendo información del usuario');
    }

    return res.status(200).json({
      success: true,
      data: {
        connected: true,
        userId: user.body.id,
        email: user.body.email,
        country: user.body.country_id,
        environment: configuration.sandbox ? 'sandbox' : 'production'
      },
      message: 'Conexión exitosa con MercadoPago'
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Error de conexión: ${error.message}`
    });
  }
});

// ==================== PROCESAMIENTO DE PAGOS ====================

/**
 * Procesar pago con MercadoPago
 * POST /api/plugins/mercadopago/process-payment
 */
router.post('/process-payment', [authJwt.verifyToken, authJwt.checkPermission("manage_billing")], async (req, res) => {
  try {
    const {
      amount,
      description,
      customerEmail,
      customerName,
      paymentMethod = 'all',
      metadata = {}
    } = req.body;

    // Validaciones
    if (!amount || !description || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'amount, description y customerEmail son requeridos'
      });
    }

    // Preparar datos del pago
    const paymentData = {
      amount: parseFloat(amount),
      currency: 'MXN',
      description,
      reference: `DIRECT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      customer: {
        firstName: customerName?.split(' ')[0] || 'Cliente',
        lastName: customerName?.split(' ').slice(1).join(' ') || '',
        email: customerEmail,
        phone: metadata.phone || ''
      },
      returnUrl: `${process.env.FRONTEND_URL}/payment/success`,
      cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel`,
      paymentMethod,
      metadata: {
        ...metadata,
        directPayment: true,
        processedBy: req.userId
      }
    };

    // Procesar pago usando el controlador
    const result = await mercadopagoController.processPayment(null, paymentData);

    return res.status(200).json({
      success: true,
      data: {
        reference: paymentData.reference,
        paymentUrl: result.paymentUrl,
        expiresAt: result.expiresAt,
        instructions: result.instructions
      },
      message: 'Pago procesado exitosamente'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error procesando pago: ${error.message}`
    });
  }
});

/**
 * Consultar estado de un pago específico
 * GET /api/plugins/mercadopago/payment-status/:reference
 */
router.get('/payment-status/:reference', [authJwt.verifyToken, authJwt.checkPermission("view_billing")], async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Referencia de pago requerida'
      });
    }

    const status = await mercadopagoController.getPaymentStatus(null, reference);

    return res.status(200).json({
      success: true,
      data: {
        reference,
        status
      },
      message: 'Estado consultado exitosamente'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error consultando estado: ${error.message}`
    });
  }
});

/**
 * Crear reembolso
 * POST /api/plugins/mercadopago/refund
 */
router.post('/refund', [authJwt.verifyToken, authJwt.checkPermission("manage_billing")], async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago requerido'
      });
    }

    const refundResult = await mercadopagoController.refundPayment(null, paymentId, amount);

    return res.status(200).json({
      success: true,
      data: refundResult,
      message: 'Reembolso procesado exitosamente'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error procesando reembolso: ${error.message}`
    });
  }
});

// ==================== MÉTODOS DE PAGO ====================

/**
 * Obtener métodos de pago disponibles
 * GET /api/plugins/mercadopago/payment-methods
 */
router.get('/payment-methods', [authJwt.verifyToken, authJwt.checkPermission("view_billing")], async (req, res) => {
  try {
    const { country = 'MX' } = req.query;

    // Métodos de pago por país (simplificado)
    const paymentMethods = {
      MX: [
        {
          id: 'credit_card',
          name: 'Tarjeta de Crédito',
          types: ['visa', 'mastercard', 'amex'],
          description: 'Pago inmediato con tarjeta de crédito'
        },
        {
          id: 'debit_card',
          name: 'Tarjeta de Débito',
          types: ['visa_debit', 'mastercard_debit'],
          description: 'Pago inmediato con tarjeta de débito'
        },
        {
          id: 'oxxo',
          name: 'OXXO',
          types: ['oxxo'],
          description: 'Pago en efectivo en tiendas OXXO'
        },
        {
          id: 'spei',
          name: 'Transferencia SPEI',
          types: ['spei'],
          description: 'Transferencia bancaria inmediata'
        }
      ],
      AR: [
        {
          id: 'credit_card',
          name: 'Tarjeta de Crédito',
          types: ['visa', 'mastercard'],
          description: 'Pago con tarjeta de crédito'
        },
        {
          id: 'rapipago',
          name: 'RapiPago',
          types: ['rapipago'],
          description: 'Pago en efectivo en RapiPago'
        }
      ]
    };

    const methods = paymentMethods[country] || paymentMethods.MX;

    return res.status(200).json({
      success: true,
      data: {
        country,
        methods,
        plugin: 'mercadopago',
        version: mercadopagoController.getPluginInfo().version
      },
      message: 'Métodos de pago obtenidos'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error obteniendo métodos de pago: ${error.message}`
    });
  }
});

// ==================== ESTADÍSTICAS ====================

/**
 * Obtener estadísticas del plugin
 * GET /api/plugins/mercadopago/stats
 */
router.get('/stats', [authJwt.verifyToken, authJwt.checkPermission("view_billing")], async (req, res) => {
  try {
    const statistics = await mercadopagoController.getStatistics();
    
    return res.status(200).json({
      success: true,
      data: statistics,
      message: 'Estadísticas obtenidas exitosamente'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== WEBHOOKS ====================

/**
 * Webhook para MercadoPago (ruta pública)
 * POST /api/plugins/mercadopago/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers['x-signature'];

    const result = await mercadopagoController.processWebhook(null, webhookData);

    if (result) {
      console.log(`MercadoPago webhook processed - Payment: ${result.reference}, Status: ${result.status}`);
      
      return res.status(200).json({
        success: true,
        message: 'Webhook procesado exitosamente'
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Webhook recibido pero sin acciones requeridas'
      });
    }

  } catch (error) {
    console.error(`Error procesando webhook de MercadoPago: ${error.message}`);
    
    // Siempre devolver 200 para webhooks para evitar reintentos
    return res.status(200).json({
      success: false,
      message: 'Error procesando webhook'
    });
  }
});

// ==================== SALUD DEL PLUGIN ====================

/**
 * Verificar salud del plugin
 * GET /api/plugins/mercadopago/health
 */
router.get('/health', [authJwt.verifyToken], async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      plugin: 'mercadopago',
      version: mercadopagoController.getPluginInfo().version,
      lastCheck: new Date(),
      capabilities: mercadopagoController.getPluginInfo().capabilities,
      countries: mercadopagoController.getPluginInfo().countries
    };

    return res.status(200).json({
      success: true,
      data: health,
      message: 'Plugin de MercadoPago funcionando correctamente'
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        plugin: 'mercadopago',
        error: error.message,
        lastCheck: new Date()
      },
      message: 'Plugin de MercadoPago con problemas'
    });
  }
});

module.exports = router;