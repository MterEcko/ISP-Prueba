const db = require('../models');
const logger = require('../utils/logger');
const clientBillingService = require('./client.billing.service');
const mikrotikService = require('./mikrotik.service');
const crypto = require('crypto');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// Modelos necesarios
const PaymentGateway = db.PaymentGateway;
const Payment = db.Payment;
const Invoice = db.Invoice;
const Client = db.Client;
const ClientBilling = db.ClientBilling;

class PaymentGatewayService {
  constructor() {
    this.gateways = new Map();
    this.webhookSecrets = new Map();
    this.loadedPlugins = new Map();
    this.initialized = false;
    this.pluginsPath = path.join(__dirname, '../plugins');
  }

  /**
   * Inicializa todas las pasarelas de pago configuradas
   * @returns {Promise<Object>} Resultado de la inicialización
   */
  async initializeAllGateways() {
    try {
      logger.info('Inicializando todas las pasarelas de pago');

      // Cargar plugins disponibles
      await this._loadAvailablePlugins();

      const activeGateways = await PaymentGateway.findAll({
        where: { active: true }
      });

      let initialized = 0;
      let errors = [];

      for (const gateway of activeGateways) {
        try {
          await this.initializeGateway(gateway.id);
          initialized++;
        } catch (error) {
          logger.error(`Error inicializando gateway ${gateway.name}: ${error.message}`);
          errors.push({
            gateway: gateway.name,
            error: error.message
          });
        }
      }

      this.initialized = true;

      return {
        success: true,
        data: {
          totalGateways: activeGateways.length,
          initialized,
          errors,
          availablePlugins: Array.from(this.loadedPlugins.keys())
        },
        message: `${initialized} pasarelas inicializadas correctamente`
      };

    } catch (error) {
      logger.error(`Error inicializando pasarelas de pago: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inicializa una pasarela específica
   * @param {number} gatewayId - ID de la pasarela
   * @returns {Promise<Object>} Resultado de la inicialización
   */
  async initializeGateway(gatewayId) {
    try {
      logger.info(`Inicializando pasarela ${gatewayId}`);

      const gateway = await PaymentGateway.findByPk(gatewayId);
      if (!gateway) {
        throw new Error(`Pasarela ${gatewayId} no encontrada`);
      }

      if (!gateway.active) {
        throw new Error(`Pasarela ${gateway.name} está inactiva`);
      }

      const config = gateway.configuration;
      const gatewayName = gateway.name.toLowerCase();

      // Verificar si hay plugin disponible
      const plugin = this.loadedPlugins.get(gatewayName);
      if (!plugin) {
        throw new Error(`Plugin para ${gateway.name} no encontrado`);
      }

      // Inicializar usando el plugin
      const client = await plugin.initialize(config);

      // Almacenar cliente inicializado
      this.gateways.set(gatewayId, {
        gateway,
        client,
        plugin,
        type: gatewayName
      });

      // Almacenar secreto del webhook si existe
      if (config.webhookSecret) {
        this.webhookSecrets.set(gatewayId, config.webhookSecret);
      }

      logger.info(`Pasarela ${gateway.name} inicializada correctamente`);

      return {
        success: true,
        gatewayId,
        name: gateway.name,
        country: gateway.country,
        pluginVersion: plugin.version || '1.0.0'
      };

    } catch (error) {
      logger.error(`Error inicializando pasarela ${gatewayId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Procesa un pago usando la pasarela especificada
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processPayment(paymentData) {
    try {
      logger.info(`Procesando pago para factura ${paymentData.invoiceId}`);

      const {
        gatewayId,
        invoiceId,
        amount,
        currency = 'MXN',
        paymentMethod,
        customerData,
        returnUrl,
        cancelUrl,
        metadata = {}
      } = paymentData;

      // Validaciones básicas
      if (!gatewayId || !invoiceId || !amount) {
        throw new Error('gatewayId, invoiceId y amount son requeridos');
      }

      // Validar factura
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          {
            model: Client,
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          }
        ]
      });

      if (!invoice) {
        throw new Error(`Factura ${invoiceId} no encontrada`);
      }

      if (invoice.status === 'paid') {
        throw new Error(`Factura ${invoiceId} ya está pagada`);
      }

      // Validar monto
      const invoiceAmount = parseFloat(invoice.totalAmount);
      const paymentAmount = parseFloat(amount);
      
      if (Math.abs(paymentAmount - invoiceAmount) > 0.01) {
        throw new Error(`Monto incorrecto: esperado ${invoiceAmount}, recibido ${paymentAmount}`);
      }

      // Obtener cliente de la pasarela
      const gatewayClient = this.gateways.get(gatewayId);
      if (!gatewayClient) {
        throw new Error(`Pasarela ${gatewayId} no inicializada`);
      }

      // Generar referencia única
      const paymentReference = this._generatePaymentReference(invoice.invoiceNumber);

      // Preparar datos para el plugin
      const pluginPaymentData = {
        amount: paymentAmount,
        currency,
        description: `Factura ${invoice.invoiceNumber}`,
        reference: paymentReference,
        customer: {
          id: invoice.Client.id,
          firstName: invoice.Client.firstName,
          lastName: invoice.Client.lastName,
          email: invoice.Client.email,
          phone: invoice.Client.phone,
          ...customerData
        },
        returnUrl,
        cancelUrl,
        paymentMethod,
        metadata: {
          invoiceId,
          clientId: invoice.clientId,
          ...metadata
        }
      };

      // Procesar usando el plugin
      const result = await gatewayClient.plugin.processPayment(
        gatewayClient.client,
        pluginPaymentData
      );

      // Crear registro de pago
      const payment = await Payment.create({
        invoiceId: invoiceId,
        clientId: invoice.clientId,
        gatewayId: gatewayId,
        paymentReference: paymentReference,
        amount: paymentAmount,
        paymentMethod: paymentMethod || 'online',
        status: result.status || 'pending',
        gatewayResponse: JSON.stringify(result.response || {}),
        paymentData: JSON.stringify({
          currency,
          customerData: pluginPaymentData.customer,
          gatewayType: gatewayClient.type,
          metadata,
          processedAt: new Date().toISOString()
        })
      });

      logger.info(`Pago ${paymentReference} procesado - Estado: ${result.status}`);

      return {
        success: true,
        data: {
          paymentId: payment.id,
          paymentReference,
          status: result.status,
          gatewayResponse: result.response,
          paymentUrl: result.paymentUrl,
          expiresAt: result.expiresAt,
          instructions: result.instructions
        },
        message: `Pago procesado exitosamente con ${gatewayClient.gateway.name}`
      };

    } catch (error) {
      logger.error(`Error procesando pago: ${error.message}`);
      throw error;
    }
  }

  /**
   * Maneja webhooks de las pasarelas de pago
   * @param {string} gatewayName - Nombre de la pasarela
   * @param {Object} webhookData - Datos del webhook
   * @param {string} signature - Firma del webhook
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async handleWebhook(gatewayName, webhookData, signature = null) {
    try {
      logger.info(`Procesando webhook de pasarela ${gatewayName}`);

      // Buscar pasarela por nombre
      const gateway = await PaymentGateway.findOne({
        where: { 
          name: gatewayName,
          active: true 
        }
      });

      if (!gateway) {
        throw new Error(`Pasarela ${gatewayName} no encontrada o inactiva`);
      }

      const gatewayClient = this.gateways.get(gateway.id);
      if (!gatewayClient) {
        throw new Error(`Pasarela ${gatewayName} no inicializada`);
      }

      // Verificar firma del webhook si está disponible
      if (signature) {
        const isValid = await this.verifyWebhookSignature(gateway.id, webhookData, signature);
        if (!isValid) {
          logger.warn(`Firma de webhook inválida para ${gatewayName}`);
          throw new Error('Firma de webhook inválida');
        }
      }

      // Procesar usando el plugin
      const paymentInfo = await gatewayClient.plugin.processWebhook(
        gatewayClient.client,
        webhookData
      );

      if (!paymentInfo || !paymentInfo.reference) {
        return {
          success: true,
          message: 'Webhook procesado pero sin acciones requeridas'
        };
      }

      // Buscar el pago en nuestra base de datos
      const payment = await Payment.findOne({
        where: {
          paymentReference: paymentInfo.reference
        },
        include: [
          {
            model: Invoice,
            include: [{ model: Client }]
          }
        ]
      });

      if (!payment) {
        logger.warn(`Pago con referencia ${paymentInfo.reference} no encontrado en BD`);
        return {
          success: true,
          message: 'Pago no encontrado en base de datos'
        };
      }

      // Actualizar estado del pago
      await payment.update({
        status: paymentInfo.status,
        paymentDate: paymentInfo.paymentDate || new Date(),
        gatewayResponse: JSON.stringify(paymentInfo.fullResponse || {}),
        processedAt: new Date()
      });

      // Si el pago fue completado, procesar automáticamente
      if (paymentInfo.status === 'completed') {
        return await this._processSuccessfulPayment(payment);
      }

      // Si el pago falló
      if (paymentInfo.status === 'failed' || paymentInfo.status === 'cancelled') {
        logger.warn(`Pago ${payment.paymentReference} falló: ${paymentInfo.status}`);
        
        return {
          success: true,
          data: {
            paymentReference: payment.paymentReference,
            status: paymentInfo.status,
            clientId: payment.clientId
          },
          message: `Pago ${paymentInfo.status}: ${payment.paymentReference}`
        };
      }

      return {
        success: true,
        data: {
          paymentReference: payment.paymentReference,
          status: paymentInfo.status,
          clientId: payment.clientId
        },
        message: `Webhook procesado - Estado: ${paymentInfo.status}`
      };

    } catch (error) {
      logger.error(`Error procesando webhook de pasarela ${gatewayName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica la firma de un webhook
   * @param {number} gatewayId - ID de la pasarela
   * @param {Object} data - Datos del webhook
   * @param {string} signature - Firma a verificar
   * @returns {Promise<boolean>} Resultado de la verificación
   */
  async verifyWebhookSignature(gatewayId, data, signature) {
    try {
      const secret = this.webhookSecrets.get(gatewayId);
      if (!secret) {
        logger.warn(`No hay secreto configurado para pasarela ${gatewayId}`);
        return true; // Permitir si no hay secreto configurado
      }

      const gatewayClient = this.gateways.get(gatewayId);
      if (!gatewayClient || !gatewayClient.plugin.verifyWebhookSignature) {
        logger.warn(`Plugin no soporta verificación de firma para pasarela ${gatewayId}`);
        return true;
      }

      return await gatewayClient.plugin.verifyWebhookSignature(data, signature, secret);

    } catch (error) {
      logger.error(`Error verificando firma de webhook: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtiene el estado de un pago
   * @param {string} paymentReference - Referencia del pago
   * @returns {Promise<Object>} Estado del pago
   */
  async getPaymentStatus(paymentReference) {
    try {
      logger.info(`Consultando estado del pago ${paymentReference}`);

      const payment = await Payment.findOne({
        where: { paymentReference: paymentReference },
        include: [
          {
            model: Invoice,
            include: [{ model: Client }]
          },
          { model: PaymentGateway }
        ]
      });

      if (!payment) {
        throw new Error(`Pago ${paymentReference} no encontrado`);
      }

      // Consultar estado actualizado en la pasarela si está pendiente
      const gatewayClient = this.gateways.get(payment.gatewayId);
      let currentStatus = payment.status;

      if (gatewayClient && payment.status === 'pending' && gatewayClient.plugin.getPaymentStatus) {
        try {
          const gatewayStatus = await gatewayClient.plugin.getPaymentStatus(
            gatewayClient.client,
            paymentReference
          );

          if (gatewayStatus && gatewayStatus !== payment.status) {
            currentStatus = gatewayStatus;
            await payment.update({ status: currentStatus });

            // Si se completó, procesar automáticamente
            if (currentStatus === 'completed') {
              await this._processSuccessfulPayment(payment);
            }
          }
        } catch (error) {
          logger.warn(`Error consultando estado en pasarela: ${error.message}`);
        }
      }

      return {
        success: true,
        data: {
          paymentReference,
          status: currentStatus,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentDate: payment.paymentDate,
          client: {
            id: payment.Invoice.Client.id,
            name: `${payment.Invoice.Client.firstName} ${payment.Invoice.Client.lastName}`
          },
          invoice: {
            id: payment.Invoice.id,
            invoiceNumber: payment.Invoice.invoiceNumber,
            status: payment.Invoice.status
          },
          gateway: payment.PaymentGateway.name
        }
      };

    } catch (error) {
      logger.error(`Error consultando estado del pago ${paymentReference}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Concilia pagos pendientes con las pasarelas
   * @param {number} gatewayId - ID de la pasarela (opcional)
   * @param {Date} date - Fecha de conciliación
   * @returns {Promise<Object>} Resultado de la conciliación
   */
  async reconcilePayments(gatewayId = null, date = new Date()) {
    try {
      logger.info(`Iniciando conciliación de pagos para ${date.toISOString().split('T')[0]}`);

      const whereClause = {
        status: ['pending', 'processing'],
        createdAt: {
          [db.Sequelize.Op.gte]: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
        }
      };

      if (gatewayId) {
        whereClause.gatewayId = gatewayId;
      }

      const pendingPayments = await Payment.findAll({
        where: whereClause,
        include: [{ model: PaymentGateway }]
      });

      let reconciled = 0;
      let updated = 0;
      let errors = [];

      for (const payment of pendingPayments) {
        try {
          const statusResult = await this.getPaymentStatus(payment.paymentReference);
          
          if (statusResult.data.status !== payment.status) {
            updated++;
          }
          
          reconciled++;
        } catch (error) {
          logger.error(`Error conciliando pago ${payment.paymentReference}: ${error.message}`);
          errors.push({
            paymentReference: payment.paymentReference,
            error: error.message
          });
        }
      }

      return {
        success: true,
        data: {
          totalPayments: pendingPayments.length,
          reconciled,
          updated,
          errors: errors.length,
          errorDetails: errors
        },
        message: `Conciliación completada: ${updated} pagos actualizados de ${reconciled} revisados`
      };

    } catch (error) {
      logger.error(`Error en conciliación de pagos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene plugins disponibles
   * @returns {Promise<Object>} Lista de plugins
   */
  async getAvailablePlugins() {
    try {
      await this._loadAvailablePlugins();

      const plugins = Array.from(this.loadedPlugins.entries()).map(([name, plugin]) => ({
        name,
        version: plugin.version || '1.0.0',
        description: plugin.description || `Plugin para ${name}`,
        countries: plugin.countries || ['unknown'],
        methods: plugin.supportedMethods || ['online'],
        loaded: true,
        initialized: this.gateways.has(name)
      }));

      return {
        success: true,
        data: plugins,
        message: `${plugins.length} plugins encontrados`
      };

    } catch (error) {
      logger.error(`Error obteniendo plugins: ${error.message}`);
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Carga plugins disponibles desde la carpeta plugins
   * @private
   */
  async _loadAvailablePlugins() {
    try {
      if (!fs.existsSync(this.pluginsPath)) {
        logger.warn(`Directorio de plugins no existe: ${this.pluginsPath}`);
        return;
      }

      const pluginFolders = fs.readdirSync(this.pluginsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const folder of pluginFolders) {
        try {
          const pluginPath = path.join(this.pluginsPath, folder, 'src', `${folder}.service.js`);
          
          if (fs.existsSync(pluginPath)) {
            const plugin = require(pluginPath);
            
            // Validar que el plugin tenga los métodos requeridos
            if (plugin.initialize && plugin.processPayment && plugin.processWebhook) {
              this.loadedPlugins.set(folder, plugin);
              logger.info(`Plugin ${folder} cargado exitosamente`);
            } else {
              logger.warn(`Plugin ${folder} no implementa todos los métodos requeridos`);
            }
          }
        } catch (error) {
          logger.error(`Error cargando plugin ${folder}: ${error.message}`);
        }
      }

      logger.info(`${this.loadedPlugins.size} plugins cargados`);

    } catch (error) {
      logger.error(`Error cargando plugins: ${error.message}`);
    }
  }

  /**
   * Procesa pago exitoso y reactiva servicio automáticamente
   * @private
   */
  async _processSuccessfulPayment(payment) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Procesando pago exitoso: ${payment.paymentReference}`);

      // Actualizar factura como pagada
      await Invoice.update({
        status: 'paid'
      }, {
        where: { id: payment.invoiceId },
        transaction
      });

      // Actualizar última fecha de pago del cliente
      await ClientBilling.update({
        lastPaymentDate: new Date(),
        clientStatus: 'active'
      }, {
        where: { clientId: payment.clientId },
        transaction
      });

      await transaction.commit();

      // Reactivar servicio automáticamente usando clientBillingService
      try {
        const reactivationResult = await clientBillingService.reactivateClientAfterPayment(
          payment.clientId,
          payment.paymentReference
        );

        logger.info(`Servicio reactivado automáticamente para cliente ${payment.clientId}`);

        return {
          success: true,
          data: {
            paymentReference: payment.paymentReference,
            clientId: payment.clientId,
            invoiceId: payment.invoiceId,
            serviceReactivated: reactivationResult.success,
            reactivationDetails: reactivationResult.data
          },
          message: '¡Pago procesado y servicio reactivado automáticamente!'
        };

      } catch (reactivationError) {
        logger.error(`Error reactivando servicio para cliente ${payment.clientId}: ${reactivationError.message}`);
        
        return {
          success: true,
          data: {
            paymentReference: payment.paymentReference,
            clientId: payment.clientId,
            invoiceId: payment.invoiceId,
            serviceReactivated: false,
            reactivationError: reactivationError.message
          },
          message: 'Pago procesado exitosamente (error en reactivación automática)'
        };
      }

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error procesando pago exitoso ${payment.paymentReference}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera referencia única de pago
   * @private
   */
  _generatePaymentReference(invoiceNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PAY-${invoiceNumber}-${timestamp}-${random}`;
  }

  /**
   * Limpia y reinicia el servicio
   * @private
   */
  async _reset() {
    this.gateways.clear();
    this.webhookSecrets.clear();
    this.loadedPlugins.clear();
    this.initialized = false;
    logger.info('Servicio de pasarelas reiniciado');
  }
}

module.exports = new PaymentGatewayService();