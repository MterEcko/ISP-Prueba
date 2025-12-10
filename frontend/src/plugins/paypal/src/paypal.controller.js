/**
 * PayPal Payment Gateway Controller
 * 
 * Este controlador maneja la integración con la API de PayPal
 * para procesar pagos de clientes con soporte para suscripciones mensuales.
 */

const axios = require('axios');
const crypto = require('crypto');
const db = require('../../models');
const Payment = db.Payment;
const Invoice = db.Invoice;
const Client = db.Client;
const PaymentGateway = db.PaymentGateway;
const SystemPlugin = db.SystemPlugin;
const MikrotikPPPOE = db.MikrotikPPPOE;

// Configuración del plugin
let config = {
  clientId: null,
  clientSecret: null,
  notificationUrl: null,
  successUrl: null,
  cancelUrl: null,
  testMode: true
};

// Token de acceso y su expiración
let accessToken = null;
let tokenExpires = 0;

/**
 * Inicializa el plugin con la configuración guardada
 */
exports.initialize = async () => {
  try {
    const plugin = await SystemPlugin.findOne({
      where: { name: 'paypal' }
    });
    
    if (plugin && plugin.config) {
      config = JSON.parse(plugin.config);
      console.log('Plugin PayPal inicializado correctamente');
      return true;
    } else {
      console.log('Plugin PayPal no configurado');
      return false;
    }
  } catch (error) {
    console.error('Error al inicializar plugin PayPal:', error);
    return false;
  }
};

/**
 * Obtiene un token de acceso para la API de PayPal
 */
const getAccessToken = async () => {
  // Si ya tenemos un token válido, lo devolvemos
  if (accessToken && tokenExpires > Date.now()) {
    return accessToken;
  }
  
  try {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const apiUrl = config.testMode 
      ? 'https://api-m.sandbox.paypal.com/v1/oauth2/token'
      : 'https://api-m.paypal.com/v1/oauth2/token';
    
    const response = await axios.post(apiUrl, 'grant_type=client_credentials', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.status !== 200) {
      throw new Error('Error al obtener token de acceso');
    }
    
    accessToken = response.data.access_token;
    // Convertir expires_in (segundos) a timestamp
    tokenExpires = Date.now() + (response.data.expires_in * 1000);
    
    return accessToken;
  } catch (error) {
    console.error('Error al obtener token de acceso:', error);
    throw error;
  }
};

/**
 * Guarda la configuración del plugin
 */
exports.saveConfig = async (req, res) => {
  try {
    const { clientId, clientSecret, notificationUrl, successUrl, cancelUrl, testMode } = req.body;
    
    if (!clientId || !clientSecret) {
      return res.status(400).send({ message: 'Se requieren Client ID y Client Secret' });
    }
    
    // Validar credenciales con PayPal
    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const apiUrl = testMode 
        ? 'https://api-m.sandbox.paypal.com/v1/oauth2/token'
        : 'https://api-m.paypal.com/v1/oauth2/token';
      
      const response = await axios.post(apiUrl, 'grant_type=client_credentials', {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.status !== 200) {
        return res.status(400).send({ message: 'Credenciales de PayPal inválidas' });
      }
    } catch (error) {
      return res.status(400).send({ message: 'Error al validar credenciales de PayPal' });
    }
    
    // Guardar configuración
    const newConfig = {
      clientId,
      clientSecret,
      notificationUrl: notificationUrl || '',
      successUrl: successUrl || '',
      cancelUrl: cancelUrl || '',
      testMode: testMode || false
    };
    
    let plugin = await SystemPlugin.findOne({
      where: { name: 'paypal' }
    });
    
    if (plugin) {
      await plugin.update({
        config: JSON.stringify(newConfig),
        status: 'active'
      });
    } else {
      plugin = await SystemPlugin.create({
        name: 'paypal',
        displayName: 'PayPal',
        description: 'Pasarela de pago PayPal con soporte para suscripciones',
        version: '1.0.0',
        config: JSON.stringify(newConfig),
        status: 'active',
        type: 'payment'
      });
      
      // Crear entrada en PaymentGateway
      await PaymentGateway.create({
        name: 'PayPal',
        pluginName: 'paypal',
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
      where: { name: 'paypal' }
    });
    
    if (!plugin || !plugin.config) {
      return res.status(404).send({ message: 'Plugin no configurado' });
    }
    
    const config = JSON.parse(plugin.config);
    
    // No enviar el client secret completo por seguridad
    if (config.clientSecret) {
      config.clientSecret = `${config.clientSecret.substring(0, 8)}...`;
    }
    
    return res.send(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return res.status(500).send({ message: 'Error al obtener configuración' });
  }
};

/**
 * Crea un pago único en PayPal
 */
exports.createPayment = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    
    if (!invoiceId) {
      return res.status(400).send({ message: 'Se requiere ID de factura' });
    }
    
    // Verificar si el plugin está configurado
    if (!config.clientId || !config.clientSecret) {
      await this.initialize();
      if (!config.clientId || !config.clientSecret) {
        return res.status(400).send({ message: 'Plugin PayPal no configurado' });
      }
    }
    
    // Obtener datos de la factura
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [{ model: Client }]
    });
    
    if (!invoice) {
      return res.status(404).send({ message: 'Factura no encontrada' });
    }
    
    // Obtener token de acceso
    const token = await getAccessToken();
    
    // Crear orden de pago
    const apiUrl = config.testMode 
      ? 'https://api-m.sandbox.paypal.com/v2/checkout/orders'
      : 'https://api-m.paypal.com/v2/checkout/orders';
    
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `invoice_${invoice.id}`,
          description: `Factura #${invoice.invoiceNumber}`,
          custom_id: `${invoice.id}`,
          amount: {
            currency_code: 'MXN', // Ajustar según país
            value: invoice.amount.toString()
          }
        }
      ],
      application_context: {
        brand_name: 'Sistema ISP Manus',
        landing_page: 'BILLING',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: config.successUrl,
        cancel_url: config.cancelUrl
      }
    };
    
    const response = await axios.post(apiUrl, orderData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 201) {
      return res.status(400).send({ message: 'Error al crear orden de pago' });
    }
    
    // Guardar referencia del pago
    await Payment.create({
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      amount: invoice.amount,
      gatewayId: (await PaymentGateway.findOne({ where: { pluginName: 'paypal' } })).id,
      status: 'pending',
      gatewayPaymentId: response.data.id,
      gatewayResponse: JSON.stringify(response.data)
    });
    
    // Buscar el enlace de aprobación
    const approveLink = response.data.links.find(link => link.rel === 'approve');
    
    return res.send({
      paymentUrl: approveLink.href,
      orderId: response.data.id
    });
  } catch (error) {
    console.error('Error al crear pago:', error);
    return res.status(500).send({ message: 'Error al crear pago' });
  }
};

/**
 * Crea una suscripción mensual en PayPal
 */
exports.createSubscription = async (req, res) => {
  try {
    const { clientId, servicePackageId } = req.body;
    
    if (!clientId || !servicePackageId) {
      return res.status(400).send({ message: 'Se requiere ID de cliente y paquete de servicio' });
    }
    
    // Verificar si el plugin está configurado
    if (!config.clientId || !config.clientSecret) {
      await this.initialize();
      if (!config.clientId || !config.clientSecret) {
        return res.status(400).send({ message: 'Plugin PayPal no configurado' });
      }
    }
    
    // Obtener datos del cliente y paquete
    const client = await Client.findByPk(clientId);
    const servicePackage = await db.ServicePackage.findByPk(servicePackageId);
    
    if (!client) {
      return res.status(404).send({ message: 'Cliente no encontrado' });
    }
    
    if (!servicePackage) {
      return res.status(404).send({ message: 'Paquete de servicio no encontrado' });
    }
    
    // Obtener token de acceso
    const token = await getAccessToken();
    
    // Crear plan de suscripción (si no existe)
    const planName = `plan_${servicePackage.id}`;
    let planId;
    
    // Verificar si ya existe un plan para este paquete
    const existingPlan = await db.SystemConfiguration.findOne({
      where: { key: `paypal_plan_${servicePackage.id}` }
    });
    
    if (existingPlan) {
      planId = existingPlan.value;
    } else {
      // Crear nuevo plan
      const planApiUrl = config.testMode 
        ? 'https://api-m.sandbox.paypal.com/v1/billing/plans'
        : 'https://api-m.paypal.com/v1/billing/plans';
      
      // Primero crear un producto
      const productApiUrl = config.testMode 
        ? 'https://api-m.sandbox.paypal.com/v1/catalogs/products'
        : 'https://api-m.paypal.com/v1/catalogs/products';
      
      const productData = {
        name: `Servicio Internet - ${servicePackage.name}`,
        type: 'SERVICE',
        description: servicePackage.description || `Paquete de Internet ${servicePackage.name}`
      };
      
      const productResponse = await axios.post(productApiUrl, productData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (productResponse.status !== 201) {
        return res.status(400).send({ message: 'Error al crear producto para suscripción' });
      }
      
      const productId = productResponse.data.id;
      
      // Crear plan con el producto
      const planData = {
        product_id: productId,
        name: `Plan ${servicePackage.name}`,
        description: `Suscripción mensual - ${servicePackage.name}`,
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'MONTH',
              interval_count: 1
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Sin límite
            pricing_scheme: {
              fixed_price: {
                value: servicePackage.price.toString(),
                currency_code: 'MXN' // Ajustar según país
              }
            }
          }
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: '0',
            currency_code: 'MXN'
          },
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3
        }
      };
      
      const planResponse = await axios.post(planApiUrl, planData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (planResponse.status !== 201) {
        return res.status(400).send({ message: 'Error al crear plan de suscripción' });
      }
      
      planId = planResponse.data.id;
      
      // Guardar ID del plan
      await db.SystemConfiguration.create({
        key: `paypal_plan_${servicePackage.id}`,
        value: planId,
        description: `ID del plan PayPal para el paquete ${servicePackage.name}`
      });
    }
    
    // Crear suscripción
    const subscriptionApiUrl = config.testMode 
      ? 'https://api-m.sandbox.paypal.com/v1/billing/subscriptions'
      : 'https://api-m.paypal.com/v1/billing/subscriptions';
    
    const subscriptionData = {
      plan_id: planId,
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Iniciar mañana
      subscriber: {
        name: {
          given_name: client.name.split(' ')[0],
          surname: client.name.split(' ').slice(1).join(' ')
        },
        email_address: client.email || `client${client.id}@example.com`
      },
      application_context: {
        brand_name: 'Sistema ISP Manus',
        locale: 'es-MX',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: config.successUrl,
        cancel_url: config.cancelUrl
      },
      custom_id: `client_${client.id}_package_${servicePackage.id}`
    };
    
    const subscriptionResponse = await axios.post(subscriptionApiUrl, subscriptionData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (subscriptionResponse.status !== 201) {
      return res.status(400).send({ message: 'Error al crear suscripción' });
    }
    
    // Guardar referencia de la suscripción
    await db.Subscription.create({
      clientId: client.id,
      servicePackageId: servicePackage.id,
      status: 'pending',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      gatewayId: (await PaymentGateway.findOne({ where: { pluginName: 'paypal' } })).id,
      gatewaySubscriptionId: subscriptionResponse.data.id,
      gatewayResponse: JSON.stringify(subscriptionResponse.data),
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días después
      price: servicePackage.price
    });
    
    // Buscar el enlace de aprobación
    const approveLink = subscriptionResponse.data.links.find(link => link.rel === 'approve');
    
    return res.send({
      subscriptionUrl: approveLink.href,
      subscriptionId: subscriptionResponse.data.id
    });
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    return res.status(500).send({ message: 'Error al crear suscripción', error: error.message });
  }
};

/**
 * Captura un pago aprobado
 */
exports.capturePayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).send({ message: 'Se requiere ID de orden' });
    }
    
    // Verificar si el plugin está configurado
    if (!config.clientId || !config.clientSecret) {
      await this.initialize();
      if (!config.clientId || !config.clientSecret) {
        return res.status(400).send({ message: 'Plugin PayPal no configurado' });
      }
    }
    
    // Obtener token de acceso
    const token = await getAccessToken();
    
    // Capturar pago
    const apiUrl = config.testMode 
      ? `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`
      : `https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`;
    
    const response = await axios.post(apiUrl, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 201) {
      return res.status(400).send({ message: 'Error al capturar pago' });
    }
    
    // Actualizar estado del pago
    const payment = await Payment.findOne({
      where: { gatewayPaymentId: orderId }
    });
    
    if (payment) {
      await payment.update({
        status: 'completed',
        gatewayResponse: JSON.stringify(response.data)
      });
      
      // Actualizar la factura
      const invoice = await Invoice.findByPk(payment.invoiceId);
      if (invoice) {
        await invoice.update({
          status: 'paid',
          paidAt: new Date()
        });
      }
    }
    
    return res.send({ message: 'Pago capturado correctamente' });
  } catch (error) {
    console.error('Error al capturar pago:', error);
    return res.status(500).send({ message: 'Error al capturar pago' });
  }
};

/**
 * Procesa notificaciones de PayPal (Webhook)
 */
exports.handleWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    // Verificar si el plugin está configurado
    if (!config.clientId || !config.clientSecret) {
      await this.initialize();
      if (!config.clientId || !config.clientSecret) {
        return res.status(400).send({ message: 'Plugin PayPal no configurado' });
      }
    }
    
    // Verificar autenticidad del webhook
    // En producción, se debe verificar la firma del webhook
    
    // Procesar según el tipo de evento
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCompleted(event);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentFailed(event);
        break;
      case 'BILLING.SUBSCRIPTION.CREATED':
        await handleSubscriptionCreated(event);
        break;
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(event);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(event);
        break;
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(event);
        break;
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handleSubscriptionPaymentFailed(event);
        break;
    }
    
    return res.status(200).send({ message: 'Notificación procesada correctamente' });
  } catch (error) {
    console.error('Error al procesar webhook:', error);
    return res.status(500).send({ message: 'Error al procesar webhook' });
  }
};

/**
 * Maneja evento de pago completado
 */
const handlePaymentCompleted = async (event) => {
  const resource = event.resource;
  const customId = resource.custom_id || '';
  
  if (customId.startsWith('invoice_')) {
    const invoiceId = customId.replace('invoice_', '');
    
    // Actualizar estado del pago
    const payment = await Payment.findOne({
      where: { gatewayPaymentId: resource.id }
    });
    
    if (payment) {
      await payment.update({
        status: 'completed',
        gatewayResponse: JSON.stringify(resource)
      });
      
      // Actualizar la factura
      const invoice = await Invoice.findByPk(payment.invoiceId);
      if (invoice) {
        await invoice.update({
          status: 'paid',
          paidAt: new Date()
        });
      }
    } else {
      // Crear nuevo registro de pago si no existe
      await Payment.create({
        invoiceId,
        clientId: (await Invoice.findByPk(invoiceId)).clientId,
        amount: resource.amount.value,
        gatewayId: (await PaymentGateway.findOne({ where: { pluginName: 'paypal' } })).id,
        status: 'completed',
        gatewayPaymentId: resource.id,
        gatewayResponse: JSON.stringify(resource)
      });
      
      // Actualizar la factura
      const invoice = await Invoice.findByPk(invoiceId);
      if (invoice) {
        await invoice.update({
          status: 'paid',
          paidAt: new Date()
        });
      }
    }
  }
};

/**
 * Maneja evento de pago fallido
 */
const handlePaymentFailed = async (event) => {
  const resource = event.resource;
  const customId = resource.custom_id || '';
  
  if (customId.startsWith('invoice_')) {
    const invoiceId = customId.replace('invoice_', '');
    
    // Actualizar estado del pago
    const payment = await Payment.findOne({
      where: { gatewayPaymentId: resource.id }
    });
    
    if (payment) {
      await payment.update({
        status: 'failed',
        gatewayResponse: JSON.stringify(resource)
      });
    }
  }
};

/**
 * Maneja evento de suscripción creada
 */
const handleSubscriptionCreated = async (event) => {
  const resource = event.resource;
  const customId = resource.custom_id || '';
  
  if (customId.startsWith('client_')) {
    // Formato: client_X_package_Y
    const parts = customId.split('_');
    const clientId = parts[1];
    const servicePackageId = parts[3];
    
    // Actualizar estado de la suscripción
    const subscription = await db.Subscription.findOne({
      where: { gatewaySubscriptionId: resource.id }
    });
    
    if (subscription) {
      await subscription.update({
        status: 'pending',
        gatewayResponse: JSON.stringify(resource)
      });
    } else {
      // Crear nuevo registro de suscripción si no existe
      await db.Subscription.create({
        clientId,
        servicePackageId,
        status: 'pending',
        startDate: new Date(),
        gatewayId: (await PaymentGateway.findOne({ where: { pluginName: 'paypal' } })).id,
        gatewaySubscriptionId: resource.id,
        gatewayResponse: JSON.stringify(resource),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días después
        price: (await db.ServicePackage.findByPk(servicePackageId)).price
      });
    }
  }
};

/**
 * Maneja evento de suscripción activada
 */
const handleSubscriptionActivated = async (event) => {
  const resource = event.resource;
  
  // Actualizar estado de la suscripción
  const subscription = await db.Subscription.findOne({
    where: { gatewaySubscriptionId: resource.id }
  });
  
  if (subscription) {
    await subscription.update({
      status: 'active',
      gatewayResponse: JSON.stringify(resource)
    });
    
    // Activar servicio del cliente
    const clientId = subscription.clientId;
    const servicePackageId = subscription.servicePackageId;
    
    // Buscar usuario PPPoE del cliente
    const pppoeUser = await MikrotikPPPOE.findOne({
      where: { clientId }
    });
    
    if (pppoeUser) {
      // Activar usuario PPPoE
      await pppoeUser.update({
        status: 'active'
      });
      
      // Aquí se podría llamar a un servicio para sincronizar con el router Mikrotik
    }
  }
};

/**
 * Maneja evento de suscripción cancelada
 */
const handleSubscriptionCancelled = async (event) => {
  const resource = event.resource;
  
  // Actualizar estado de la suscripción
  const subscription = await db.Subscription.findOne({
    where: { gatewaySubscriptionId: resource.id }
  });
  
  if (subscription) {
    await subscription.update({
      status: 'cancelled',
      gatewayResponse: JSON.stringify(resource)
    });
    
    // Desactivar servicio del cliente
    const clientId = subscription.clientId;
    
    // Buscar usuario PPPoE del cliente
    const pppoeUser = await MikrotikPPPOE.findOne({
      where: { clientId }
    });
    
    if (pppoeUser) {
      // Desactivar usuario PPPoE
      await pppoeUser.update({
        status: 'disabled'
      });
      
      // Aquí se podría llamar a un servicio para sincronizar con el router Mikrotik
    }
  }
};

/**
 * Maneja evento de suscripción suspendida
 */
const handleSubscriptionSuspended = async (event) => {
  const resource = event.resource;
  
  // Actualizar estado de la suscripción
  const subscription = await db.Subscription.findOne({
    where: { gatewaySubscriptionId: resource.id }
  });
  
  if (subscription) {
    await subscription.update({
      status: 'suspended',
      gatewayResponse: JSON.stringify(resource)
    });
    
    // Suspender servicio del cliente
    const clientId = subscription.clientId;
    
    // Buscar usuario PPPoE del cliente
    const pppoeUser = await MikrotikPPPOE.findOne({
      where: { clientId }
    });
    
    if (pppoeUser) {
      // Suspender usuario PPPoE
      await pppoeUser.update({
        status: 'suspended'
      });
      
      // Aquí se podría llamar a un servicio para sincronizar con el router Mikrotik
    }
  }
};

/**
 * Maneja evento de pago de suscripción fallido
 */
const handleSubscriptionPaymentFailed = async (event) => {
  const resource = event.resource;
  
  // Actualizar estado de la suscripción
  const subscription = await db.Subscription.findOne({
    where: { gatewaySubscriptionId: resource.id }
  });
  
  if (subscription) {
    // No cambiar el estado de la suscripción, solo registrar el fallo
    await subscription.update({
      gatewayResponse: JSON.stringify(resource)
    });
    
    // Si hay demasiados fallos, se suspenderá automáticamente la suscripción
    // y se recibirá un evento BILLING.SUBSCRIPTION.SUSPENDED
  }
};

/**
 * Verifica el estado de una suscripción
 */
exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    if (!subscriptionId) {
      return res.status(400).send({ message: 'Se requiere ID de suscripción' });
    }
    
    const subscription = await db.Subscription.findByPk(subscriptionId);
    
    if (!subscription) {
      return res.status(404).send({ message: 'Suscripción no encontrada' });
    }
    
    // Verificar si el plugin está configurado
    if (!config.clientId || !config.clientSecret) {
      await this.initialize();
      if (!config.clientId || !config.clientSecret) {
        return res.status(400).send({ message: 'Plugin PayPal no configurado' });
      }
    }
    
    // Obtener token de acceso
    const token = await getAccessToken();
    
    // Consultar estado en PayPal
    try {
      const apiUrl = config.testMode 
        ? `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscription.gatewaySubscriptionId}`
        : `https://api-m.paypal.com/v1/billing/subscriptions/${subscription.gatewaySubscriptionId}`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        return res.send({ status: subscription.status });
      }
      
      const subscriptionData = response.data;
      let status;
      
      switch (subscriptionData.status) {
        case 'ACTIVE':
          status = 'active';
          break;
        case 'SUSPENDED':
          status = 'suspended';
          break;
        case 'CANCELLED':
          status = 'cancelled';
          break;
        case 'EXPIRED':
          status = 'expired';
          break;
        case 'APPROVAL_PENDING':
          status = 'pending';
          break;
        default:
          status = subscription.status;
      }
      
      // Actualizar estado si cambió
      if (status !== subscription.status) {
        await subscription.update({
          status,
          gatewayResponse: JSON.stringify(subscriptionData)
        });
        
        // Actualizar estado del servicio del cliente
        if (status === 'active' || status === 'suspended' || status === 'cancelled') {
          const pppoeUser = await MikrotikPPPOE.findOne({
            where: { clientId: subscription.clientId }
          });
          
          if (pppoeUser) {
            let pppoeStatus;
            
            switch (status) {
              case 'active':
                pppoeStatus = 'active';
                break;
              case 'suspended':
                pppoeStatus = 'suspended';
                break;
              case 'cancelled':
                pppoeStatus = 'disabled';
                break;
              default:
                pppoeStatus = pppoeUser.status;
            }
            
            if (pppoeStatus !== pppoeUser.status) {
              await pppoeUser.update({ status: pppoeStatus });
              // Aquí se podría llamar a un servicio para sincronizar con el router Mikrotik
            }
          }
        }
      }
      
      return res.send({ 
        status,
        nextBillingTime: subscriptionData.billing_info?.next_billing_time || null,
        lastPaymentStatus: subscriptionData.billing_info?.last_payment?.status || null
      });
    } catch (error) {
      console.error('Error al verificar estado de la suscripción:', error);
      return res.send({ status: subscription.status });
    }
  } catch (error) {
    console.error('Error al verificar estado de la suscripción:', error);
    return res.status(500).send({ message: 'Error al verificar estado de la suscripción' });
  }
};

/**
 * Cancela una suscripción
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).send({ message: 'Se requiere ID de suscripción' });
    }
    
    const subscription = await db.Subscription.findByPk(subscriptionId);
    
    if (!subscription) {
      return res.status(404).send({ message: 'Suscripción no encontrada' });
    }
    
    // Verificar si el plugin está configurado
    if (!config.clientId || !config.clientSecret) {
      await this.initialize();
      if (!config.clientId || !config.clientSecret) {
        return res.status(400).send({ message: 'Plugin PayPal no configurado' });
      }
    }
    
    // Obtener token de acceso
    const token = await getAccessToken();
    
    // Cancelar suscripción en PayPal
    try {
      const apiUrl = config.testMode 
        ? `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscription.gatewaySubscriptionId}/cancel`
        : `https://api-m.paypal.com/v1/billing/subscriptions/${subscription.gatewaySubscriptionId}/cancel`;
      
      const cancelData = {
        reason: reason || 'Cancelado por el cliente'
      };
      
      const response = await axios.post(apiUrl, cancelData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 204) {
        return res.status(400).send({ message: 'Error al cancelar suscripción' });
      }
      
      // Actualizar estado de la suscripción
      await subscription.update({
        status: 'cancelled'
      });
      
      // Desactivar servicio del cliente
      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: subscription.clientId }
      });
      
      if (pppoeUser) {
        await pppoeUser.update({
          status: 'disabled'
        });
        
        // Aquí se podría llamar a un servicio para sincronizar con el router Mikrotik
      }
      
      return res.send({ message: 'Suscripción cancelada correctamente' });
    } catch (error) {
      console.error('Error al cancelar suscripción:', error);
      return res.status(400).send({ message: 'Error al cancelar suscripción' });
    }
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    return res.status(500).send({ message: 'Error al cancelar suscripción' });
  }
};

/**
 * Suspende una suscripción
 */
exports.suspendSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).send({ message: 'Se requiere ID de suscripción' });
    }
    
    const subscription = await db.Subscription.findByPk(subscriptionId);
    
    if (!subscription) {
      return res.status(404).send({ message: 'Suscripción no encontrada' });
    }
    
    // Verificar si el plugin está configurado
    if (!config.clientId || !config.clientSecret) {
      await this.initialize();
      if (!config.clientId || !config.clientSecret) {
        return res.status(400).send({ message: 'Plugin PayPal no configurado' });
      }
    }
    
    // Obtener token de acceso
    const token = await getAccessToken();
    
    // Suspender suscripción en PayPal
    try {
      const apiUrl = config.testMode 
        ? `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscription.gatewaySubscriptionId}/suspend`
        : `https://api-m.paypal.com/v1/billing/subscriptions/${subscription.gatewaySubscriptionId}/suspend`;
      
      const suspendData = {
        reason: reason || 'Suspendido por el administrador'
      };
      
      const response = await axios.post(apiUrl, suspendData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 204) {
        return res.status(400).send({ message: 'Error al suspender suscripción' });
      }
      
      // Actualizar estado de la suscripción
      await subscription.update({
        status: 'suspended'
      });
      
      // Suspender servicio del cliente
      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: subscription.clientId }
      });
      
      if (pppoeUser) {
        await pppoeUser.update({
          status: 'suspended'
        });
        
        // Aquí se podría llamar a un servicio para sincronizar con el router Mikrotik
      }
      
      return res.send({ message: 'Suscripción suspendida correctamente' });
    } catch (error) {
      console.error('Error al suspender suscripción:', error);
      return res.status(400).send({ message: 'Error al suspender suscripción' });
    }
  } catch (error) {
    console.error('Error al suspender suscripción:', error);
    return res.status(500).send({ message: 'Error al suspender suscripción' });
  }
};

/**
 * Reactiva una suscripción suspendida
 */
exports.activateSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    if (!subscriptionId) {
      return res.status(400).send({ message: 'Se requiere ID de suscripción' });
    }
    
    const subscription = await db.Subscription.findByPk(subscriptionId);
    
    if (!subscription) {
      return res.status(404).send({ message: 'Suscripción no encontrada' });
    }
    
    if (subscription.status !== 'suspended') {
      return res.status(400).send({ message: 'Solo se pueden activar suscripciones suspendidas' });
    }
    
    // Verificar si el plugin está configurado
    if (!config.clientId || !config.clientSecret) {
      await this.initialize();
      if (!config.clientId || !config.clientSecret) {
        return res.status(400).send({ message: 'Plugin PayPal no configurado' });
      }
    }
    
    // Obtener token de acceso
    const token = await getAccessToken();
    
    // Activar suscripción en PayPal
    try {
      const apiUrl = config.testMode 
        ? `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscription.gatewaySubscriptionId}/activate`
        : `https://api-m.paypal.com/v1/billing/subscriptions/${subscription.gatewaySubscriptionId}/activate`;
      
      const activateData = {
        reason: 'Reactivado por el administrador'
      };
      
      const response = await axios.post(apiUrl, activateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 204) {
        return res.status(400).send({ message: 'Error al activar suscripción' });
      }
      
      // Actualizar estado de la suscripción
      await subscription.update({
        status: 'active'
      });
      
      // Activar servicio del cliente
      const pppoeUser = await MikrotikPPPOE.findOne({
        where: { clientId: subscription.clientId }
      });
      
      if (pppoeUser) {
        await pppoeUser.update({
          status: 'active'
        });
        
        // Aquí se podría llamar a un servicio para sincronizar con el router Mikrotik
      }
      
      return res.send({ message: 'Suscripción activada correctamente' });
    } catch (error) {
      console.error('Error al activar suscripción:', error);
      return res.status(400).send({ message: 'Error al activar suscripción' });
    }
  } catch (error) {
    console.error('Error al activar suscripción:', error);
    return res.status(500).send({ message: 'Error al activar suscripción' });
  }
};
