/**
 * OpenPay Payment Gateway Controller
 * 
 * Este controlador maneja la integración con la API de OpenPay
 * para procesar pagos de clientes.
 */

const axios = require('axios');
const crypto = require('crypto');
const db = require('../../../models');
const Payment = db.Payment;
const Invoice = db.Invoice;
const Client = db.Client;
const PaymentGateway = db.PaymentGateway;
const SystemPlugin = db.SystemPlugin;

// Configuración del plugin
let config = {
  merchantId: null,
  privateKey: null,
  publicKey: null,
  notificationUrl: null,
  successUrl: null,
  failureUrl: null,
  testMode: true
};

/**
 * Inicializa el plugin con la configuración guardada
 */
exports.initialize = async () => {
  try {
    const plugin = await SystemPlugin.findOne({
      where: { name: 'openpay' }
    });
    
    if (plugin && plugin.config) {
      config = JSON.parse(plugin.config);
      console.log('Plugin OpenPay inicializado correctamente');
      return true;
    } else {
      console.log('Plugin OpenPay no configurado');
      return false;
    }
  } catch (error) {
    console.error('Error al inicializar plugin OpenPay:', error);
    return false;
  }
};

/**
 * Guarda la configuración del plugin
 */
exports.saveConfig = async (req, res) => {
  try {
    const { merchantId, privateKey, publicKey, notificationUrl, successUrl, failureUrl, testMode } = req.body;
    
    if (!merchantId || !privateKey || !publicKey) {
      return res.status(400).send({ message: 'Se requieren Merchant ID, Private Key y Public Key' });
    }
    
    // Validar credenciales con OpenPay
    try {
      const auth = Buffer.from(`${privateKey}:`).toString('base64');
      const apiUrl = testMode 
        ? `https://sandbox-api.openpay.mx/v1/${merchantId}/customers`
        : `https://api.openpay.mx/v1/${merchantId}/customers`;
        
      const response = await axios.get(apiUrl, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      
      if (response.status !== 200) {
        return res.status(400).send({ message: 'Credenciales de OpenPay inválidas' });
      }
    } catch (error) {
      return res.status(400).send({ message: 'Error al validar credenciales de OpenPay' });
    }
    
    // Guardar configuración
    const newConfig = {
      merchantId,
      privateKey,
      publicKey,
      notificationUrl: notificationUrl || '',
      successUrl: successUrl || '',
      failureUrl: failureUrl || '',
      testMode: testMode || false
    };
    
    let plugin = await SystemPlugin.findOne({
      where: { name: 'openpay' }
    });
    
    if (plugin) {
      await plugin.update({
        config: JSON.stringify(newConfig),
        status: 'active'
      });
    } else {
      plugin = await SystemPlugin.create({
        name: 'openpay',
        displayName: 'OpenPay',
        description: 'Pasarela de pago OpenPay',
        version: '1.0.0',
        config: JSON.stringify(newConfig),
        status: 'active',
        type: 'payment'
      });
      
      // Crear entrada en PaymentGateway
      await PaymentGateway.create({
        name: 'OpenPay',
        pluginName: 'openpay',
        isActive: true,
        config: JSON.stringify({})
      });
    }
    
    // Actualizar configuración en memoria
    config = newConfig;
    
    return res.send({ message: 'Configuración guardada correctamente' });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    return res.status(500).send({ message: 'Error al guardar configuración' });
  }
};

/**
 * Obtiene la configuración actual del plugin
 */
exports.getConfig = async (req, res) => {
  try {
    const plugin = await SystemPlugin.findOne({
      where: { name: 'openpay' }
    });
    
    if (!plugin || !plugin.config) {
      return res.status(404).send({ message: 'Plugin no configurado' });
    }
    
    const config = JSON.parse(plugin.config);
    
    // No enviar las claves completas por seguridad
    if (config.privateKey) {
      config.privateKey = `${config.privateKey.substring(0, 8)}...`;
    }
    
    return res.send(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return res.status(500).send({ message: 'Error al obtener configuración' });
  }
};

/**
 * Crea un cargo en OpenPay
 */
exports.createPayment = async (req, res) => {
  try {
    const { invoiceId, cardToken, deviceSessionId } = req.body;
    
    if (!invoiceId || !cardToken || !deviceSessionId) {
      return res.status(400).send({ message: 'Se requiere ID de factura, token de tarjeta y ID de sesión del dispositivo' });
    }
    
    // Verificar si el plugin está configurado
    if (!config.merchantId || !config.privateKey) {
      await this.initialize();
      if (!config.merchantId || !config.privateKey) {
        return res.status(400).send({ message: 'Plugin OpenPay no configurado' });
      }
    }
    
    // Obtener datos de la factura
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [{ model: Client }]
    });
    
    if (!invoice) {
      return res.status(404).send({ message: 'Factura no encontrada' });
    }
    
    // Crear cliente en OpenPay si no existe
    let openPayCustomerId;
    const client = invoice.Client;
    
    // Buscar si el cliente ya tiene un ID de OpenPay
    const clientNetworkConfig = await db.ClientNetworkConfig.findOne({
      where: { clientId: client.id }
    });
    
    if (clientNetworkConfig && clientNetworkConfig.metadata && 
        JSON.parse(clientNetworkConfig.metadata).openPayCustomerId) {
      openPayCustomerId = JSON.parse(clientNetworkConfig.metadata).openPayCustomerId;
    } else {
      // Crear cliente en OpenPay
      const auth = Buffer.from(`${config.privateKey}:`).toString('base64');
      const apiUrl = config.testMode 
        ? `https://sandbox-api.openpay.mx/v1/${config.merchantId}/customers`
        : `https://api.openpay.mx/v1/${config.merchantId}/customers`;
      
      const customerData = {
        name: client.name,
        email: client.email || `client${client.id}@example.com`,
        phone_number: client.phone || '0000000000',
        requires_account: false
      };
      
      const customerResponse = await axios.post(apiUrl, customerData, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      
      if (customerResponse.status !== 200 && customerResponse.status !== 201) {
        return res.status(400).send({ message: 'Error al crear cliente en OpenPay' });
      }
      
      openPayCustomerId = customerResponse.data.id;
      
      // Guardar ID de cliente en metadata
      if (clientNetworkConfig) {
        const metadata = clientNetworkConfig.metadata ? JSON.parse(clientNetworkConfig.metadata) : {};
        metadata.openPayCustomerId = openPayCustomerId;
        await clientNetworkConfig.update({ metadata: JSON.stringify(metadata) });
      } else {
        await db.ClientNetworkConfig.create({
          clientId: client.id,
          metadata: JSON.stringify({ openPayCustomerId })
        });
      }
    }
    
    // Crear cargo
    const auth = Buffer.from(`${config.privateKey}:`).toString('base64');
    const apiUrl = config.testMode 
      ? `https://sandbox-api.openpay.mx/v1/${config.merchantId}/customers/${openPayCustomerId}/charges`
      : `https://api.openpay.mx/v1/${config.merchantId}/customers/${openPayCustomerId}/charges`;
    
    const chargeData = {
      source_id: cardToken,
      method: 'card',
      amount: parseFloat(invoice.amount),
      currency: 'MXN', // Ajustar según país
      description: `Factura #${invoice.invoiceNumber}`,
      order_id: `invoice_${invoice.id}`,
      device_session_id: deviceSessionId,
      customer: {
        name: client.name,
        email: client.email || `client${client.id}@example.com`,
        phone_number: client.phone || '0000000000'
      }
    };
    
    const chargeResponse = await axios.post(apiUrl, chargeData, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    
    if (chargeResponse.status !== 200 && chargeResponse.status !== 201) {
      return res.status(400).send({ message: 'Error al crear cargo en OpenPay' });
    }
    
    // Guardar referencia del pago
    await Payment.create({
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      amount: invoice.amount,
      gatewayId: (await PaymentGateway.findOne({ where: { pluginName: 'openpay' } })).id,
      status: chargeResponse.data.status === 'completed' ? 'completed' : 'pending',
      gatewayPaymentId: chargeResponse.data.id,
      gatewayResponse: JSON.stringify(chargeResponse.data)
    });
    
    // Si el pago fue completado, actualizar la factura
    if (chargeResponse.data.status === 'completed') {
      await invoice.update({
        status: 'paid',
        paidAt: new Date()
      });
    }
    
    return res.send({
      status: chargeResponse.data.status,
      paymentId: chargeResponse.data.id
    });
  } catch (error) {
    console.error('Error al crear pago:', error);
    return res.status(500).send({ message: 'Error al crear pago', error: error.message });
  }
};

/**
 * Procesa notificaciones de OpenPay (Webhook)
 */
exports.handleWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    if (event.type !== 'charge.succeeded' && event.type !== 'charge.failed') {
      return res.status(200).send({ message: 'Notificación recibida' });
    }
    
    // Verificar si el plugin está configurado
    if (!config.merchantId || !config.privateKey) {
      await this.initialize();
      if (!config.merchantId || !config.privateKey) {
        return res.status(400).send({ message: 'Plugin OpenPay no configurado' });
      }
    }
    
    // Verificar autenticidad del webhook
    const signature = req.headers['openpay-signature'];
    if (!signature) {
      return res.status(400).send({ message: 'Firma de webhook no proporcionada' });
    }
    
    // Obtener detalles del cargo
    const chargeId = event.data.id;
    const customerId = event.data.customer_id;
    
    const auth = Buffer.from(`${config.privateKey}:`).toString('base64');
    const apiUrl = config.testMode 
      ? `https://sandbox-api.openpay.mx/v1/${config.merchantId}/customers/${customerId}/charges/${chargeId}`
      : `https://api.openpay.mx/v1/${config.merchantId}/customers/${customerId}/charges/${chargeId}`;
    
    const response = await axios.get(apiUrl, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    
    if (response.status !== 200) {
      return res.status(400).send({ message: 'Error al obtener detalles del cargo' });
    }
    
    const chargeData = response.data;
    const orderId = chargeData.order_id;
    const invoiceId = orderId.replace('invoice_', '');
    
    // Actualizar estado del pago
    let status;
    if (event.type === 'charge.succeeded') {
      status = 'completed';
    } else if (event.type === 'charge.failed') {
      status = 'failed';
    }
    
    const payment = await Payment.findOne({
      where: { gatewayPaymentId: chargeId }
    });
    
    if (payment) {
      await payment.update({
        status,
        gatewayResponse: JSON.stringify(chargeData)
      });
      
      // Si el pago fue completado, actualizar la factura
      if (status === 'completed') {
        const invoice = await Invoice.findByPk(payment.invoiceId);
        if (invoice) {
          await invoice.update({
            status: 'paid',
            paidAt: new Date()
          });
        }
      }
    } else {
      // Crear nuevo registro de pago si no existe
      await Payment.create({
        invoiceId,
        clientId: (await Invoice.findByPk(invoiceId)).clientId,
        amount: chargeData.amount,
        gatewayId: (await PaymentGateway.findOne({ where: { pluginName: 'openpay' } })).id,
        status,
        gatewayPaymentId: chargeId,
        gatewayResponse: JSON.stringify(chargeData)
      });
      
      // Si el pago fue completado, actualizar la factura
      if (status === 'completed') {
        const invoice = await Invoice.findByPk(invoiceId);
        if (invoice) {
          await invoice.update({
            status: 'paid',
            paidAt: new Date()
          });
        }
      }
    }
    
    return res.status(200).send({ message: 'Notificación procesada correctamente' });
  } catch (error) {
    console.error('Error al procesar webhook:', error);
    return res.status(500).send({ message: 'Error al procesar webhook' });
  }
};

/**
 * Verifica el estado de un pago
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!paymentId) {
      return res.status(400).send({ message: 'Se requiere ID de pago' });
    }
    
    const payment = await Payment.findByPk(paymentId);
    
    if (!payment) {
      return res.status(404).send({ message: 'Pago no encontrado' });
    }
    
    // Si el pago ya está completado o fallido, devolver estado actual
    if (payment.status === 'completed' || payment.status === 'failed') {
      return res.send({ status: payment.status });
    }
    
    // Verificar si el plugin está configurado
    if (!config.merchantId || !config.privateKey) {
      await this.initialize();
      if (!config.merchantId || !config.privateKey) {
        return res.status(400).send({ message: 'Plugin OpenPay no configurado' });
      }
    }
    
    // Obtener cliente OpenPay ID
    const clientNetworkConfig = await db.ClientNetworkConfig.findOne({
      where: { clientId: payment.clientId }
    });
    
    if (!clientNetworkConfig || !clientNetworkConfig.metadata) {
      return res.send({ status: payment.status });
    }
    
    const metadata = JSON.parse(clientNetworkConfig.metadata);
    const openPayCustomerId = metadata.openPayCustomerId;
    
    if (!openPayCustomerId) {
      return res.send({ status: payment.status });
    }
    
    // Consultar estado en OpenPay
    try {
      const auth = Buffer.from(`${config.privateKey}:`).toString('base64');
      const apiUrl = config.testMode 
        ? `https://sandbox-api.openpay.mx/v1/${config.merchantId}/customers/${openPayCustomerId}/charges/${payment.gatewayPaymentId}`
        : `https://api.openpay.mx/v1/${config.merchantId}/customers/${openPayCustomerId}/charges/${payment.gatewayPaymentId}`;
      
      const response = await axios.get(apiUrl, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      
      if (response.status !== 200) {
        return res.send({ status: payment.status });
      }
      
      const chargeData = response.data;
      let status;
      
      switch (chargeData.status) {
        case 'completed':
          status = 'completed';
          break;
        case 'in_progress':
          status = 'pending';
          break;
        case 'failed':
          status = 'failed';
          break;
        default:
          status = payment.status;
      }
      
      // Actualizar estado si cambió
      if (status !== payment.status) {
        await payment.update({
          status,
          gatewayResponse: JSON.stringify(chargeData)
        });
        
        // Si el pago fue completado, actualizar la factura
        if (status === 'completed') {
          const invoice = await Invoice.findByPk(payment.invoiceId);
          if (invoice) {
            await invoice.update({
              status: 'paid',
              paidAt: new Date()
            });
          }
        }
      }
      
      return res.send({ status });
    } catch (error) {
      console.error('Error al verificar estado del pago:', error);
      return res.send({ status: payment.status });
    }
  } catch (error) {
    console.error('Error al verificar estado del pago:', error);
    return res.status(500).send({ message: 'Error al verificar estado del pago' });
  }
};

/**
 * Reembolsa un pago
 */
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { description } = req.body;
    
    if (!paymentId) {
      return res.status(400).send({ message: 'Se requiere ID de pago' });
    }
    
    const payment = await Payment.findByPk(paymentId);
    
    if (!payment) {
      return res.status(404).send({ message: 'Pago no encontrado' });
    }
    
    if (payment.status !== 'completed') {
      return res.status(400).send({ message: 'Solo se pueden reembolsar pagos completados' });
    }
    
    // Verificar si el plugin está configurado
    if (!config.merchantId || !config.privateKey) {
      await this.initialize();
      if (!config.merchantId || !config.privateKey) {
        return res.status(400).send({ message: 'Plugin OpenPay no configurado' });
      }
    }
    
    // Obtener cliente OpenPay ID
    const clientNetworkConfig = await db.ClientNetworkConfig.findOne({
      where: { clientId: payment.clientId }
    });
    
    if (!clientNetworkConfig || !clientNetworkConfig.metadata) {
      return res.status(400).send({ message: 'No se encontró información del cliente en OpenPay' });
    }
    
    const metadata = JSON.parse(clientNetworkConfig.metadata);
    const openPayCustomerId = metadata.openPayCustomerId;
    
    if (!openPayCustomerId) {
      return res.status(400).send({ message: 'No se encontró información del cliente en OpenPay' });
    }
    
    // Solicitar reembolso a OpenPay
    try {
      const auth = Buffer.from(`${config.privateKey}:`).toString('base64');
      const apiUrl = config.testMode 
        ? `https://sandbox-api.openpay.mx/v1/${config.merchantId}/customers/${openPayCustomerId}/charges/${payment.gatewayPaymentId}/refund`
        : `https://api.openpay.mx/v1/${config.merchantId}/customers/${openPayCustomerId}/charges/${payment.gatewayPaymentId}/refund`;
      
      const refundData = {
        description: description || `Reembolso de pago ${payment.id}`
      };
      
      const response = await axios.post(apiUrl, refundData, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      
      if (response.status !== 200 && response.status !== 201) {
        return res.status(400).send({ message: 'Error al procesar reembolso' });
      }
      
      // Actualizar estado del pago
      await payment.update({
        status: 'refunded',
        gatewayResponse: JSON.stringify(response.data)
      });
      
      return res.send({ message: 'Reembolso procesado correctamente' });
    } catch (error) {
      console.error('Error al procesar reembolso:', error);
      return res.status(400).send({ message: 'Error al procesar reembolso' });
    }
  } catch (error) {
    console.error('Error al procesar reembolso:', error);
    return res.status(500).send({ message: 'Error al procesar reembolso' });
  }
};
