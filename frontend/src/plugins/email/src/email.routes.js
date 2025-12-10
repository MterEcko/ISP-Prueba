// backend/src/plugins/email/src/email.routes.js
const express = require('express');
const router = express.Router();
const emailController = require('./email.controller');
const { authJwt } = require('../../../middleware');

/**
 * Rutas específicas del plugin de Email
 * Estas rutas se montan automáticamente cuando el plugin está activo
 */

// ==================== CONFIGURACIÓN DEL PLUGIN ====================

/**
 * Obtener información del plugin
 * GET /api/plugins/email/info
 */
router.get('/info', [authJwt.verifyToken], async (req, res) => {
  try {
    const pluginInfo = emailController.getPluginInfo();
    
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
 * POST /api/plugins/email/validate-config
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

    const validation = emailController.validateConfig(configuration);
    
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
 * Probar conexión con configuración
 * POST /api/plugins/email/test-connection
 */
router.post('/test-connection', [authJwt.verifyToken], async (req, res) => {
  try {
    const { configuration } = req.body;
    
    if (!configuration) {
      return res.status(400).json({
        success: false,
        message: 'Configuración es requerida'
      });
    }

    // Validar configuración primero
    const validation = emailController.validateConfig(configuration);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Configuración inválida',
        errors: validation.errors
      });
    }

    // Intentar inicializar con la configuración de prueba
    const testClient = await emailController.initialize(configuration);
    
    // Limpiar recursos de prueba
    if (testClient && testClient.cleanup) {
      await testClient.cleanup();
    }

    return res.status(200).json({
      success: true,
      data: {
        provider: configuration.provider,
        connected: true
      },
      message: 'Conexión exitosa'
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Error de conexión: ${error.message}`
    });
  }
});

// ==================== ENVÍO DE EMAILS ====================

/**
 * Enviar email de prueba
 * POST /api/plugins/email/test
 */
router.post('/test', [authJwt.verifyToken, authJwt.checkPermission("send_messages")], async (req, res) => {
  try {
    const {
      recipient,
      subject = 'Email de Prueba - Sistema ISP',
      message = 'Este es un email de prueba enviado desde el sistema ISP.',
      configuration
    } = req.body;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Destinatario es requerido'
      });
    }

    // Si se proporciona configuración, usar esa, sino usar la configuración actual
    let emailClient;
    
    if (configuration) {
      // Validar configuración
      const validation = emailController.validateConfig(configuration);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Configuración inválida',
          errors: validation.errors
        });
      }
      
      // Inicializar cliente temporal
      emailClient = await emailController.initialize(configuration);
    } else {
      // Usar cliente actual (debe estar inicializado)
      emailClient = null; // Se usará el cliente inicializado del servicio
    }

    // Preparar datos del mensaje
    const messageData = {
      recipient,
      subject,
      message,
      metadata: {
        type: 'test',
        sentBy: req.userId || 'system',
        timestamp: new Date().toISOString()
      }
    };

    // Enviar email
    const result = await emailController.sendMessage(emailClient, messageData);

    // Limpiar cliente temporal si se creó
    if (emailClient && configuration && emailClient.cleanup) {
      await emailClient.cleanup();
    }

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          messageId: result.deliveryId,
          recipient,
          sentAt: new Date(),
          provider: configuration ? configuration.provider : 'configured'
        },
        message: 'Email de prueba enviado exitosamente'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Error enviando email: ${result.error}`
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error interno: ${error.message}`
    });
  }
});

// ==================== ESTADÍSTICAS ====================

/**
 * Obtener estadísticas del plugin
 * GET /api/plugins/email/stats
 */
router.get('/stats', [authJwt.verifyToken], async (req, res) => {
  try {
    const statistics = await emailController.getStatistics();
    
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
 * Webhook para proveedores de email
 * POST /api/plugins/email/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers['x-signature'] || 
                     req.headers['x-twilio-email-event-webhook-signature'] ||
                     req.headers['x-mailgun-signature'];

    // Determinar proveedor por headers o contenido
    let provider = 'unknown';
    if (req.headers['x-twilio-email-event-webhook-signature']) {
      provider = 'sendgrid';
    } else if (req.headers['x-mailgun-signature']) {
      provider = 'mailgun';
    }

    const result = await emailController.processWebhook(null, webhookData);

    if (result) {
      // Log del webhook para debugging
      console.log(`Email webhook processed - Provider: ${provider}, Status: ${result.status}`);
      
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
    console.error(`Error procesando webhook de email: ${error.message}`);
    
    // Siempre devolver 200 para webhooks para evitar reintentos
    return res.status(200).json({
      success: false,
      message: 'Error procesando webhook'
    });
  }
});

// ==================== PLANTILLAS ====================

/**
 * Obtener plantillas recomendadas para email
 * GET /api/plugins/email/templates
 */
router.get('/templates', [authJwt.verifyToken], async (req, res) => {
  try {
    const recommendedTemplates = [
      {
        name: 'Bienvenida Email',
        templateType: 'welcome',
        subject: '¡Bienvenido a nuestros servicios, {firstName}!',
        messageBody: `
          <h2>¡Bienvenido {firstName}!</h2>
          <p>Nos complace darle la bienvenida a nuestros servicios de internet.</p>
          <p>Sus datos de contacto registrados son:</p>
          <ul>
            <li><strong>Email:</strong> {email}</li>
            <li><strong>Teléfono:</strong> {phone}</li>
          </ul>
          <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
          <p>¡Gracias por confiar en nosotros!</p>
        `,
        variables: ['firstName', 'email', 'phone']
      },
      {
        name: 'Recordatorio de Pago Email',
        templateType: 'paymentReminder',
        subject: 'Recordatorio de Pago - Factura {invoiceNumber}',
        messageBody: `
          <h2>Recordatorio de Pago</h2>
          <p>Estimado/a {firstName},</p>
          <p>Le recordamos que tiene un pago pendiente:</p>
          <ul>
            <li><strong>Factura:</strong> {invoiceNumber}</li>
            <li><strong>Monto:</strong> ${amount}</li>
            <li><strong>Fecha de vencimiento:</strong> {dueDate}</li>
            <li><strong>Días de atraso:</strong> {daysOverdue}</li>
          </ul>
          <p>Por favor realice su pago lo antes posible para evitar la suspensión del servicio.</p>
        `,
        variables: ['firstName', 'invoiceNumber', 'amount', 'dueDate', 'daysOverdue']
      },
      {
        name: 'Suspensión de Servicio Email',
        templateType: 'suspension',
        subject: 'Suspensión de Servicio - {firstName}',
        messageBody: `
          <h2>Suspensión de Servicio</h2>
          <p>Estimado/a {firstName},</p>
          <p>Lamentamos informarle que su servicio ha sido suspendido por: <strong>{reason}</strong></p>
          <p>Fecha de suspensión: {suspensionDate}</p>
          <p>Para reactivar su servicio, por favor póngase en contacto con nosotros.</p>
        `,
        variables: ['firstName', 'reason', 'suspensionDate']
      },
      {
        name: 'Reactivación de Servicio Email',
        templateType: 'reactivation',
        subject: '¡Servicio Reactivado! - {firstName}',
        messageBody: `
          <h2>¡Servicio Reactivado!</h2>
          <p>Estimado/a {firstName},</p>
          <p>Nos complace informarle que su servicio ha sido reactivado exitosamente.</p>
          <p>Fecha de reactivación: {reactivationDate}</p>
          <p>Gracias por su pago y confianza en nuestros servicios.</p>
        `,
        variables: ['firstName', 'reactivationDate']
      }
    ];

    return res.status(200).json({
      success: true,
      data: recommendedTemplates,
      message: 'Plantillas recomendadas para email obtenidas exitosamente'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== SALUD DEL PLUGIN ====================

/**
 * Verificar salud del plugin
 * GET /api/plugins/email/health
 */
router.get('/health', [authJwt.verifyToken], async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      plugin: 'email',
      version: emailController.getPluginInfo().version,
      lastCheck: new Date(),
      capabilities: emailController.getPluginInfo().capabilities,
      providers: emailController.getPluginInfo().supportedMethods
    };

    return res.status(200).json({
      success: true,
      data: health,
      message: 'Plugin de email funcionando correctamente'
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        plugin: 'email',
        error: error.message,
        lastCheck: new Date()
      },
      message: 'Plugin de email con problemas'
    });
  }
});

module.exports = router;