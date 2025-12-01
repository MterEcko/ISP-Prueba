// backend/src/controllers/settings.controller.js
const db = require('../models');
const configHelper = require('../helpers/configHelper');
const nodemailer = require('nodemailer');

// Inicializar configHelper con DB
configHelper.init(db);

// ===============================
// CONFIGURACIÓN GENERAL
// ===============================

exports.getGeneralSettings = async (req, res) => {
  try {
    const settings = await configHelper.getGeneralConfig();
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error obteniendo configuración general:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuración general',
      error: error.message 
    });
  }
};

exports.updateGeneralSettings = async (req, res) => {
  try {
    const updates = req.body;
    
    await configHelper.updateModule('general', updates);
    
    const updatedSettings = await configHelper.getGeneralConfig();
    
    return res.status(200).json({
      success: true,
      message: 'Configuración general actualizada correctamente',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Error actualizando configuración general:', error);
    return res.status(500).json({ 
      message: 'Error actualizando configuración general',
      error: error.message 
    });
  }
};

// ===============================
// CONFIGURACIÓN DE EMAIL
// ===============================

exports.getEmailSettings = async (req, res) => {
  try {
    const settings = await configHelper.getEmailConfig();
    
    // No enviar la contraseña al frontend
    return res.status(200).json({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,  // Esto viene del configHelper
      user: settings.auth.user,
      fromName: settings.from.name,
      fromAddress: settings.from.address,
      // Indicar si hay contraseña configurada sin revelarla
      hasPassword: !!settings.auth.pass
    });
  } catch (error) {
    console.error('Error obteniendo configuración de email:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuración de email',
      error: error.message 
    });
  }
};

exports.updateEmailSettings = async (req, res) => {
  try {
    const { host, port, secure, user, password, fromName, fromAddress } = req.body;
    
    const updates = {
      smtpHost: host,
      smtpPort: String(port),
      smtpSecure: String(secure),
      smtpUser: user,
      emailFromName: fromName,
      emailFromAddress: fromAddress
    };

    // Solo actualizar contraseña si se proporciona
    if (password && password.trim() !== '') {
      updates.smtpPassword = password;
    }

    await configHelper.updateModule('email', updates);
    
    return res.status(200).json({
      success: true,
      message: 'Configuración de email actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando configuración de email:', error);
    return res.status(500).json({ 
      message: 'Error actualizando configuración de email',
      error: error.message 
    });
  }
};

exports.testEmailSettings = async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({ message: 'Email de prueba requerido' });
    }

    const emailConfig = await configHelper.getEmailConfig();
    
    // Crear transporter con la configuración
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      tls: emailConfig.tls
    });

    // Verificar conexión
    await transporter.verify();
    
    // Enviar email de prueba
    const info = await transporter.sendMail({
      from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
      to: testEmail,
      subject: 'Prueba de Configuración SMTP - Sistema ISP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50;">✓ Configuración SMTP Exitosa</h2>
          <p>Este es un email de prueba del Sistema ISP.</p>
          <p>Si recibiste este mensaje, la configuración SMTP está funcionando correctamente.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Enviado desde: ${emailConfig.from.address}<br>
            Servidor: ${emailConfig.host}:${emailConfig.port}<br>
            Fecha: ${new Date().toLocaleString('es-MX')}
          </p>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: 'Email de prueba enviado correctamente',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error en prueba de email:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error enviando email de prueba',
      error: error.message,
      code: error.code
    });
  }
};

// ===============================
// CONFIGURACIÓN DE TELEGRAM
// ===============================

exports.getTelegramSettings = async (req, res) => {
  try {
    const settings = await configHelper.getTelegramConfig();

    console.log('📖 GET Telegram Settings:', settings);

    return res.status(200).json({
      enabled: settings.enabled,
      chatId: settings.chatId,
      hasToken: !!settings.botToken
    });
  } catch (error) {
    console.error('Error obteniendo configuración de Telegram:', error);
    return res.status(500).json({
      message: 'Error obteniendo configuración de Telegram',
      error: error.message
    });
  }
};

exports.updateTelegramSettings = async (req, res) => {
  try {
    const { enabled, botToken, chatId } = req.body;

    console.log('📝 UPDATE Telegram Settings - Request Body:', {
      enabled: enabled,
      enabledType: typeof enabled,
      enabledString: String(enabled),
      hasBotToken: !!botToken,
      hasChatId: !!chatId,
      chatId: chatId
    });

    const updates = {
      telegramEnabled: String(enabled),
      telegramChatId: chatId
    };

    // Solo actualizar token si se proporciona
    if (botToken && botToken.trim() !== '') {
      updates.telegramBotToken = botToken;
    }

    console.log('💾 Guardando updates:', updates);
    await configHelper.updateModule('telegram', updates);

    // Verificar qué se guardó realmente
    const savedConfig = await configHelper.getTelegramConfig();
    console.log('✅ Config guardada:', savedConfig);

    return res.status(200).json({
      success: true,
      message: 'Configuración de Telegram actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando configuración de Telegram:', error);
    return res.status(500).json({
      message: 'Error actualizando configuración de Telegram',
      error: error.message
    });
  }
};

exports.testTelegramSettings = async (req, res) => {
  try {
    const config = await configHelper.getTelegramConfig();

    console.log('🔍 DEBUG Telegram Test Config:', {
      enabled: config.enabled,
      hasToken: !!config.botToken,
      tokenLength: config.botToken?.length,
      hasChatId: !!config.chatId,
      chatId: config.chatId
    });

    if (!config.enabled) {
      console.log('❌ Telegram no habilitado:', config.enabled);
      return res.status(400).json({
        success: false,
        message: 'Telegram no está habilitado. Actívalo en la configuración primero.'
      });
    }

    if (!config.botToken || !config.chatId) {
      console.log('❌ Falta config:', {
        botToken: config.botToken ? 'presente' : 'FALTA',
        chatId: config.chatId ? 'presente' : 'FALTA'
      });
      return res.status(400).json({
        success: false,
        message: 'Falta configuración de bot token o chat ID. Verifica que ambos estén guardados.'
      });
    }

    // Enviar mensaje de prueba
    const axios = require('axios');
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

    console.log('📤 Enviando mensaje de prueba a Telegram...');
    const response = await axios.post(url, {
      chat_id: config.chatId,
      text: `✓ Prueba de configuración Telegram\n\nFecha: ${new Date().toLocaleString('es-MX')}\n\nLa integración está funcionando correctamente.`,
      parse_mode: 'HTML'
    });

    if (response.data.ok) {
      console.log('✅ Mensaje enviado exitosamente a Telegram');
      return res.status(200).json({
        success: true,
        message: 'Mensaje de prueba enviado correctamente a Telegram'
      });
    } else {
      throw new Error(response.data.description || 'Error desconocido');
    }
  } catch (error) {
    console.error('❌ Error en prueba de Telegram:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Error enviando mensaje de prueba',
      error: error.response?.data?.description || error.message
    });
  }
};

// ===============================
// CONFIGURACIÓN DE WHATSAPP
// ===============================

exports.getWhatsAppSettings = async (req, res) => {
  try {
    const method = await configHelper.get('whatsappMethod', 'twilio');
    const enabled = await configHelper.get('whatsappEnabled', false);

    const settings = {
      enabled: enabled === 'true' || enabled === true,
      method: method
    };

    // Configuracion de Meta API
    if (method === 'api') {
      settings.api = {
        apiUrl: await configHelper.get('whatsappApiUrl', 'https://graph.facebook.com/v17.0/'),
        phoneNumberId: await configHelper.get('whatsappPhoneNumberId', ''),
        hasToken: !!(await configHelper.get('whatsappApiToken'))
      };
    }

    // Configuracion de Twilio
    if (method === 'twilio') {
      settings.twilio = {
        phoneNumber: await configHelper.get('whatsappTwilioNumber', ''),
        hasAccountSid: !!(await configHelper.get('whatsappTwilioAccountSid')),
        hasAuthToken: !!(await configHelper.get('whatsappTwilioAuthToken'))
      };
    }

    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error obteniendo configuración de WhatsApp:', error);
    return res.status(500).json({
      message: 'Error obteniendo configuración de WhatsApp',
      error: error.message
    });
  }
};

exports.updateWhatsAppSettings = async (req, res) => {
  try {
    const { enabled, method, api, twilio } = req.body;

    console.log('📝 UPDATE WhatsApp Settings - Request Body:', {
      enabled: enabled,
      enabledType: typeof enabled,
      method: method,
      hasApi: !!api,
      hasTwilio: !!twilio
    });

    const updates = {
      whatsappEnabled: String(enabled),
      whatsappMethod: method || 'twilio'
    };

    // Configuracion Meta API
    if (api) {
      if (api.apiUrl) updates.whatsappApiUrl = api.apiUrl;
      if (api.phoneNumberId) updates.whatsappPhoneNumberId = api.phoneNumberId;
      if (api.apiToken && api.apiToken.trim() !== '') {
        updates.whatsappApiToken = api.apiToken;
      }
    }

    // Configuracion Twilio
    if (twilio) {
      if (twilio.phoneNumber) updates.whatsappTwilioNumber = twilio.phoneNumber;
      if (twilio.accountSid && twilio.accountSid.trim() !== '') {
        updates.whatsappTwilioAccountSid = twilio.accountSid;
      }
      if (twilio.authToken && twilio.authToken.trim() !== '') {
        updates.whatsappTwilioAuthToken = twilio.authToken;
      }
    }

    console.log('💾 Guardando WhatsApp updates:', updates);
    await configHelper.updateModule('whatsapp', updates);

    // Verificar qué se guardó realmente
    const savedConfig = await configHelper.getWhatsAppConfig();
    console.log('✅ WhatsApp config guardada:', savedConfig);

    // Reinicializar servicio de WhatsApp
    const whatsappService = require('../services/whatsapp.service');
    await whatsappService.initialize();

    return res.status(200).json({
      success: true,
      message: 'Configuración de WhatsApp actualizada correctamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando configuración de WhatsApp:', error);
    return res.status(500).json({
      message: 'Error actualizando configuración de WhatsApp',
      error: error.message
    });
  }
};

exports.testWhatsAppSettings = async (req, res) => {
  try {
    console.log('📞 TEST WhatsApp - Request Body:', req.body);
    const { testPhoneNumber } = req.body;

    if (!testPhoneNumber) {
      console.log('❌ Falta número de teléfono para test de WhatsApp');
      return res.status(400).json({
        success: false,
        message: 'Número de teléfono de prueba requerido'
      });
    }

    console.log('📤 Probando WhatsApp con número:', testPhoneNumber);
    const whatsappService = require('../services/whatsapp.service');
    const result = await whatsappService.testConnection(testPhoneNumber);

    console.log('✅ Resultado test WhatsApp:', result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error en prueba de WhatsApp:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enviando mensaje de prueba',
      error: error.message
    });
  }
};

// ===============================
// CONFIGURACIÓN DE SMS
// ===============================

exports.getSMSSettings = async (req, res) => {
  try {
    const enabled = await configHelper.get('smsEnabled', false);
    const gatewayType = await configHelper.get('smsGatewayType', 'generic');
    const gatewayUrl = await configHelper.get('smsGatewayUrl', '');

    const settings = {
      enabled: enabled === 'true' || enabled === true,
      gatewayType: gatewayType,
      gatewayUrl: gatewayUrl,
      hasToken: !!(await configHelper.get('smsGatewayToken'))
    };

    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error obteniendo configuración de SMS:', error);
    return res.status(500).json({
      message: 'Error obteniendo configuración de SMS',
      error: error.message
    });
  }
};

exports.updateSMSSettings = async (req, res) => {
  try {
    const { enabled, gatewayType, gatewayUrl, gatewayToken } = req.body;

    const updates = {
      smsEnabled: String(enabled),
      smsGatewayType: gatewayType || 'generic',
      smsGatewayUrl: gatewayUrl || ''
    };

    if (gatewayToken && gatewayToken.trim() !== '') {
      updates.smsGatewayToken = gatewayToken;
    }

    await configHelper.updateModule('sms', updates);

    // Reinicializar servicio de SMS
    const smsService = require('../services/sms.service');
    await smsService.initialize();

    return res.status(200).json({
      success: true,
      message: 'Configuración de SMS actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando configuración de SMS:', error);
    return res.status(500).json({
      message: 'Error actualizando configuración de SMS',
      error: error.message
    });
  }
};

exports.testSMSSettings = async (req, res) => {
  try {
    const { testPhoneNumber } = req.body;

    if (!testPhoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Número de teléfono de prueba requerido'
      });
    }

    const smsService = require('../services/sms.service');
    const result = await smsService.testConnection(testPhoneNumber);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en prueba de SMS:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enviando SMS de prueba',
      error: error.message
    });
  }
};

exports.getSMSGatewayStatus = async (req, res) => {
  try {
    const smsService = require('../services/sms.service');
    const status = await smsService.getGatewayStatus();

    return res.status(200).json(status);
  } catch (error) {
    console.error('Error obteniendo estado del gateway SMS:', error);
    return res.status(500).json({
      message: 'Error obteniendo estado del gateway',
      error: error.message
    });
  }
};

// ===============================
// CONFIGURACIÓN DE JELLYFIN
// ===============================

exports.getJellyfinSettings = async (req, res) => {
  try {
    const settings = await configHelper.getJellyfinConfig();
    
    return res.status(200).json({
      enabled: settings.enabled,
      url: settings.url,
      hasApiKey: !!settings.apiKey,
      jfaGoEnabled: settings.jfaGoEnabled,
      jfaGoUrl: settings.jfaGoUrl,
      jfaGoDbPath: settings.jfaGoDbPath
    });
  } catch (error) {
    console.error('Error obteniendo configuración de Jellyfin:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuración de Jellyfin',
      error: error.message 
    });
  }
};

exports.updateJellyfinSettings = async (req, res) => {
  try {
    const { enabled, url, apiKey, jfaGoEnabled, jfaGoUrl, jfaGoDbPath } = req.body;
    
    const updates = {
      jellyfinEnabled: String(enabled),
      jellyfinUrl: url,
      jfaGoEnabled: String(jfaGoEnabled),
      jfaGoUrl: jfaGoUrl,
      jfaGoDbPath: jfaGoDbPath
    };

    if (apiKey && apiKey.trim() !== '') {
      updates.jellyfinApiKey = apiKey;
    }

    await configHelper.updateModule('jellyfin', updates);
    
    return res.status(200).json({
      success: true,
      message: 'Configuración de Jellyfin actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando configuración de Jellyfin:', error);
    return res.status(500).json({ 
      message: 'Error actualizando configuración de Jellyfin',
      error: error.message 
    });
  }
};

// ===============================
// CONFIGURACIÓN DE PAGOS
// ===============================

exports.getPaymentSettings = async (req, res) => {
  try {
    const settings = await configHelper.getPaymentConfig();
    
    return res.status(200).json({
      mercadoPago: {
        enabled: settings.mercadoPago.enabled,
        hasAccessToken: !!settings.mercadoPago.accessToken,
        publicKey: settings.mercadoPago.publicKey,
        webhookUrl: settings.mercadoPago.webhookUrl
      },
      paypal: {
        enabled: settings.paypal.enabled,
        hasClientId: !!settings.paypal.clientId,
        hasClientSecret: !!settings.paypal.clientSecret,
        sandbox: settings.paypal.sandbox
      }
    });
  } catch (error) {
    console.error('Error obteniendo configuración de pagos:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuración de pagos',
      error: error.message 
    });
  }
};

exports.updatePaymentSettings = async (req, res) => {
  try {
    const { mercadoPago, paypal } = req.body;
    
    const updates = {};

    if (mercadoPago) {
      updates.mercadoPagoEnabled = String(mercadoPago.enabled);
      if (mercadoPago.accessToken) updates.mercadoPagoAccessToken = mercadoPago.accessToken;
      if (mercadoPago.publicKey) updates.mercadoPagoPublicKey = mercadoPago.publicKey;
      if (mercadoPago.webhookUrl) updates.mercadoPagoWebhookUrl = mercadoPago.webhookUrl;
    }

    if (paypal) {
      updates.paypalEnabled = String(paypal.enabled);
      if (paypal.clientId) updates.paypalClientId = paypal.clientId;
      if (paypal.clientSecret) updates.paypalClientSecret = paypal.clientSecret;
      updates.paypalSandbox = String(paypal.sandbox);
    }

    await configHelper.updateModule('payments', updates);
    
    return res.status(200).json({
      success: true,
      message: 'Configuración de pagos actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando configuración de pagos:', error);
    return res.status(500).json({ 
      message: 'Error actualizando configuración de pagos',
      error: error.message 
    });
  }
};

// ===============================
// CONFIGURACIÓN DE MAPAS
// ===============================

exports.getMapSettings = async (req, res) => {
  try {
    const settings = await configHelper.getMapConfig();
    
    return res.status(200).json({
      provider: settings.provider,
      hasGoogleMapsKey: !!settings.googleMapsApiKey,
      defaultCenter: settings.defaultCenter,
      defaultZoom: settings.defaultZoom
    });
  } catch (error) {
    console.error('Error obteniendo configuración de mapas:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuración de mapas',
      error: error.message 
    });
  }
};

exports.updateMapSettings = async (req, res) => {
  try {
    const { provider, googleMapsApiKey, defaultCenter, defaultZoom } = req.body;
    
    const updates = {
      mapProvider: provider,
      defaultMapZoom: String(defaultZoom)
    };

    if (googleMapsApiKey && googleMapsApiKey.trim() !== '') {
      updates.googleMapsApiKey = googleMapsApiKey;
    }

    if (defaultCenter) {
      updates.defaultMapCenter = typeof defaultCenter === 'string' ? 
        defaultCenter : JSON.stringify(defaultCenter);
    }

    await configHelper.updateModule('maps', updates);
    
    return res.status(200).json({
      success: true,
      message: 'Configuración de mapas actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando configuración de mapas:', error);
    return res.status(500).json({ 
      message: 'Error actualizando configuración de mapas',
      error: error.message 
    });
  }
};

// ===============================
// CONFIGURACIÓN DE MONITOREO
// ===============================

exports.getMonitoringSettings = async (req, res) => {
  try {
    const settings = await configHelper.getMonitoringConfig();
    
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error obteniendo configuración de monitoreo:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuración de monitoreo',
      error: error.message 
    });
  }
};

exports.updateMonitoringSettings = async (req, res) => {
  try {
    const { interval, thresholds, retentionDays } = req.body;
    
    const updates = {};

    if (interval) updates.monitoringInterval = String(interval);
    if (retentionDays) updates.retentionDays = String(retentionDays);
    
    if (thresholds) {
      if (thresholds.cpu) updates.alertThresholdCpu = String(thresholds.cpu);
      if (thresholds.memory) updates.alertThresholdMemory = String(thresholds.memory);
      if (thresholds.disk) updates.alertThresholdDisk = String(thresholds.disk);
    }

    await configHelper.updateModule('monitoring', updates);
    
    return res.status(200).json({
      success: true,
      message: 'Configuración de monitoreo actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando configuración de monitoreo:', error);
    return res.status(500).json({ 
      message: 'Error actualizando configuración de monitoreo',
      error: error.message 
    });
  }
};

// ===============================
// CONFIGURACIÓN DE FACTURACIÓN
// ===============================

exports.getBillingSettings = async (req, res) => {
  try {
    const settings = await configHelper.getBillingConfig();
    
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error obteniendo configuración de facturación:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuración de facturación',
      error: error.message 
    });
  }
};

exports.updateBillingSettings = async (req, res) => {
  try {
    const { taxRate, graceDays, reminderDays, autoSuspendDays, invoicePrefix } = req.body;
    
    const updates = {};

    if (taxRate !== undefined) updates.taxRate = String(taxRate);
    if (graceDays !== undefined) updates.graceDays = String(graceDays);
    if (autoSuspendDays !== undefined) updates.autoSuspendDays = String(autoSuspendDays);
    if (invoicePrefix) updates.invoicePrefix = invoicePrefix;
    
    if (reminderDays) {
      updates.reminderDays = Array.isArray(reminderDays) ? 
        reminderDays.join(',') : String(reminderDays);
    }

    await configHelper.updateModule('billing', updates);
    
    return res.status(200).json({
      success: true,
      message: 'Configuración de facturación actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando configuración de facturación:', error);
    return res.status(500).json({ 
      message: 'Error actualizando configuración de facturación',
      error: error.message 
    });
  }
};

// ===============================
// CONFIGURACIÓN DE RED
// ===============================

exports.getNetworkSettings = async (req, res) => {
  try {
    // Esta configuración podría venir de otra tabla específica de dispositivos
    // Por ahora devolvemos valores por defecto
    const settings = {
      mikrotik: {
        defaultUser: 'admin',
        defaultPort: 8728,
        timeout: 5000
      },
      ubiquiti: {
        defaultUser: 'admin',
        timeout: 5000
      }
    };
    
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error obteniendo configuración de red:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuración de red',
      error: error.message 
    });
  }
};

// ===============================
// CONFIGURACIÓN DE DOMINIO Y CORS
// ===============================

exports.getDomainSettings = async (req, res) => {
  try {
    const systemDomain = await configHelper.get('system_domain', '');
    const allowedOrigins = await configHelper.get('allowed_origins', '[]');

    let parsedOrigins = [];
    try {
      parsedOrigins = JSON.parse(allowedOrigins);
    } catch (e) {
      parsedOrigins = [];
    }

    return res.status(200).json({
      systemDomain,
      allowedOrigins: parsedOrigins
    });
  } catch (error) {
    console.error('Error obteniendo configuración de dominio:', error);
    return res.status(500).json({
      message: 'Error obteniendo configuración de dominio',
      error: error.message
    });
  }
};

exports.updateDomainSettings = async (req, res) => {
  try {
    const { systemDomain, allowedOrigins } = req.body;

    // Actualizar system_domain si se proporciona
    if (systemDomain !== undefined) {
      await configHelper.set('system_domain', systemDomain, {
        configType: 'string',
        module: 'domain',
        description: 'Dominio principal del sistema'
      });
    }

    // Actualizar allowed_origins si se proporciona
    if (allowedOrigins !== undefined) {
      // Validar que sea un array
      if (!Array.isArray(allowedOrigins)) {
        return res.status(400).json({
          success: false,
          message: 'allowedOrigins debe ser un array'
        });
      }

      await configHelper.set('allowed_origins', JSON.stringify(allowedOrigins), {
        configType: 'string',
        module: 'domain',
        description: 'Orígenes permitidos para CORS'
      });
    }

    // Recargar origenes permitidos en el servidor
    const mainApp = require('../../index');
    if (mainApp.reloadAllowedOrigins) {
      await mainApp.reloadAllowedOrigins();
    }

    return res.status(200).json({
      success: true,
      message: 'Configuración de dominio actualizada correctamente'
    });
  } catch (error) {
    console.error('Error actualizando configuración de dominio:', error);
    return res.status(500).json({
      message: 'Error actualizando configuración de dominio',
      error: error.message
    });
  }
};

exports.reloadCors = async (req, res) => {
  try {
    const mainApp = require('../../index');
    if (mainApp.reloadAllowedOrigins) {
      await mainApp.reloadAllowedOrigins();
      return res.status(200).json({
        success: true,
        message: 'Orígenes CORS recargados correctamente'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Función de recarga no disponible'
      });
    }
  } catch (error) {
    console.error('Error recargando CORS:', error);
    return res.status(500).json({
      message: 'Error recargando CORS',
      error: error.message
    });
  }
};

// ===============================
// TODAS LAS CONFIGURACIONES
// ===============================

exports.getAllSettings = async (req, res) => {
  try {
    const allSettings = await configHelper.getAll();
    
    return res.status(200).json(allSettings);
  } catch (error) {
    console.error('Error obteniendo todas las configuraciones:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuraciones',
      error: error.message 
    });
  }
};

// ===============================
// OBTENER CONFIGURACIÓN ESPECÍFICA
// ===============================

exports.getConfigByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const value = await configHelper.get(key);
    
    if (value === null) {
      return res.status(404).json({ 
        message: `Configuración '${key}' no encontrada` 
      });
    }
    
    return res.status(200).json({ key, value });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuración',
      error: error.message 
    });
  }
};

exports.getConfigByModule = async (req, res) => {
  try {
    const { module } = req.params;
    const configs = await configHelper.getByModule(module);
    
    return res.status(200).json({ module, configs });
  } catch (error) {
    console.error('Error obteniendo configuraciones del módulo:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo configuraciones del módulo',
      error: error.message 
    });
  }
};

// ===============================
// INVALIDAR CACHÉ
// ===============================

exports.invalidateCache = async (req, res) => {
  try {
    configHelper.invalidateCache();

    return res.status(200).json({
      success: true,
      message: 'Caché de configuraciones invalidado correctamente'
    });
  } catch (error) {
    console.error('Error invalidando caché:', error);
    return res.status(500).json({
      message: 'Error invalidando caché',
      error: error.message
    });
  }
};

// ===============================
// CREAR CONFIGURACIÓN PERSONALIZADA
// ===============================

exports.createSetting = async (req, res) => {
  try {
    const { key, value, module, description } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'La clave y el valor son obligatorios'
      });
    }

    // Verificar si la configuración ya existe
    const existing = await configHelper.get(key);
    if (existing !== null) {
      return res.status(400).json({
        success: false,
        message: `La configuración con clave "${key}" ya existe`
      });
    }

    // Crear nueva configuración
    const setting = await configHelper.set(key, value, {
      module: module || 'custom',
      description: description || `Configuración personalizada: ${key}`
    });

    configHelper.invalidateCache();

    return res.status(201).json({
      success: true,
      data: setting,
      message: 'Configuración creada exitosamente'
    });
  } catch (error) {
    console.error('Error creando configuración:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creando configuración',
      error: error.message
    });
  }
};

// ===============================
// ELIMINAR CONFIGURACIÓN
// ===============================

exports.deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;

    // Verificar que la configuración existe
    const setting = await configHelper.get(key);
    if (setting === null) {
      return res.status(404).json({
        success: false,
        message: `Configuración con clave "${key}" no encontrada`
      });
    }

    // No permitir eliminar configuraciones críticas del sistema
    const protectedKeys = [
      'company_name',
      'database_version',
      'smtp_host',
      'smtp_port',
      'system_initialized'
    ];

    if (protectedKeys.includes(key)) {
      return res.status(403).json({
        success: false,
        message: 'No se pueden eliminar configuraciones críticas del sistema'
      });
    }

    // Eliminar configuración
    await configHelper.delete(key);
    configHelper.invalidateCache();

    return res.status(200).json({
      success: true,
      message: `Configuración "${key}" eliminada exitosamente`
    });
  } catch (error) {
    console.error('Error eliminando configuración:', error);
    return res.status(500).json({
      success: false,
      message: 'Error eliminando configuración',
      error: error.message
    });
  }
};