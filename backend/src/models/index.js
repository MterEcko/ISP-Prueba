// backend/src/models/index.js - VERSIÓN ACTUALIZADA CON COMUNICACIONES
const { Sequelize } = require('sequelize');
const path = require('path');

// Obtener la configuración basada en el entorno
const env = process.env.NODE_ENV || 'development';
const config = require('../config/db.config')[env];

// Crear instancia Sequelize con configuración
let sequelize;

if (config.storage) {
  // Configuración para SQLite (desarrollo)
  sequelize = new Sequelize({
    dialect: config.dialect,
    storage: config.storage,
    pool: config.pool,
    logging: config.logging || false,
  });
} else {
  // Configuración para PostgreSQL (producción)
  sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    pool: config.pool,
    logging: config.logging || false,
  });
}

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// ======================================
// Modelos: Existentes Core (Sin cambios)
// ======================================

// Autenticación y permisos
db.User = require('./user.model.js')(sequelize, Sequelize);
db.Role = require('./role.model.js')(sequelize, Sequelize);
db.Permission = require('./permission.model.js')(sequelize, Sequelize);

// Estructura de red
db.Node = require('./node.model.js')(sequelize, Sequelize);
db.Sector = require('./sector.model.js')(sequelize, Sequelize);

// Gestión de clientes
db.Client = require('./client.model.js')(sequelize, Sequelize);
db.ClientDocument = require('./clientDocument.model.js')(sequelize, Sequelize);
db.ClientNetwork = require('./client.network.model.js')(sequelize, Sequelize);

// Servicios
db.Subscription = require('./subscription.model.js')(sequelize, Sequelize);

// Tickets
db.Ticket = require('./ticket.model.js')(sequelize, Sequelize);
db.TicketComment = require('./ticketComment.model.js')(sequelize, Sequelize);

// Sistema de dispositivos unificado
db.Device = require('./device.model.js')(sequelize, Sequelize);
db.DeviceCredential = require('./deviceCredential.model.js')(sequelize, Sequelize);
db.DeviceMetric = require('./deviceMetric.model.js')(sequelize, Sequelize);
db.CommandHistory = require('./commandHistory.model.js')(sequelize, Sequelize);
db.DeviceCommand = require('./deviceCommand.model.js')(sequelize, Sequelize);

// Sistema de comandos por marca/familia
db.DeviceBrand = require('./deviceBrand.model.js')(sequelize, Sequelize);
db.DeviceFamily = require('./deviceFamily.model.js')(sequelize, Sequelize);
db.CommonCommand = require('./commonCommand.model.js')(sequelize, Sequelize);
db.CommandImplementation = require('./commandImplementation.model.js')(sequelize, Sequelize);
db.CommandParameter = require('./commandParameter.model.js')(sequelize, Sequelize);
db.SnmpOid = require('./snmpOid.model.js')(sequelize, Sequelize);

// Inventario
db.Inventory = require('./inventory.model.js')(sequelize, Sequelize);
db.InventoryLocation = require('./inventoryLocation.model.js')(sequelize, Sequelize);
db.InventoryMovement = require('./inventoryMovement.model.js')(sequelize, Sequelize);
db.InventoryScrap = require('./inventoryScrap.model.js')(sequelize, Sequelize);

// Sistema de licencias y configuración
db.SystemConfiguration = require('./systemConfiguration.model.js')(sequelize, Sequelize);
db.SystemLicense = require('./systemLicense.model.js')(sequelize, Sequelize);
db.SystemPlugin = require('./systemPlugin.model.js')(sequelize, Sequelize);

// Estructura de red mejorada
db.Zone = require('./zone.model.js')(sequelize, Sequelize);
db.MikrotikRouter = require('./mikrotikRouter.model.js')(sequelize, Sequelize);
db.IpPool = require('./ipPool.model.js')(sequelize, Sequelize);

// Mikrotik PPPoE y relacionados
db.MikrotikPPPOE = require('./mikrotikPPPOE.model.js')(sequelize, Sequelize);
db.MikrotikIp = require('./mikrotikIp.model.js')(sequelize, Sequelize);
db.ServicePackage = require('./servicePackage.model.js')(sequelize, Sequelize);
db.MikrotikProfile = require('./mikrotikProfile.model.js')(sequelize, Sequelize);

// Clientes - nuevas tablas
db.ClientBilling = require('./clientBilling.model.js')(sequelize, Sequelize);
db.ClientNetworkConfig = require('./clientNetworkConfig.model.js')(sequelize, Sequelize);
db.ClientInstallation = require('./clientInstallation.model.js')(sequelize, Sequelize);
db.ClientSupport = require('./clientSupport.model.js')(sequelize, Sequelize);

// Inventario mejorado con scrap
db.InventoryCategory = require('./inventoryCategory.model.js')(sequelize, Sequelize);
db.InventoryType = require('./inventoryType.model.js')(sequelize, Sequelize);
db.InventoryProduct = require('./inventoryProduct.model.js')(sequelize, Sequelize);
db.InstallationMaterial = require('./installationMaterial.model.js')(sequelize, Sequelize);

// Sistema de pagos completo
db.PaymentGateway = require('./paymentGateway.model.js')(sequelize, Sequelize);
db.Invoice = require('./invoice.model.js')(sequelize, Sequelize);
db.Payment = require('./payment.model.js')(sequelize, Sequelize);
db.PaymentReminder = require('./paymentReminder.model.js')(sequelize, Sequelize);

// Tickets mejorados
db.TicketType = require('./ticketType.model.js')(sequelize, Sequelize);
db.TicketAttachment = require('./ticketAttachment.model.js')(sequelize, Sequelize);

// ======================================
// NUEVOS MODELOS: SISTEMA DE COMUNICACIONES
// ======================================

// Comunicaciones multicanal
db.CommunicationChannel = require('./communicationChannel.model.js')(sequelize, Sequelize);
db.MessageTemplate = require('./messageTemplate.model.js')(sequelize, Sequelize);
db.CommunicationLog = require('./communicationLog.model.js')(sequelize, Sequelize);

// Notificaciones y reglas
db.NotificationRule = require('./notificationRule.model.js')(sequelize, Sequelize);
db.NotificationQueue = require('./notificationQueue.model.js')(sequelize, Sequelize);
db.CommunicationContact = require('./communicationContact.model.js')(sequelize, Sequelize);
db.CommunicationEvent = require('./communicationEvent.model.js')(sequelize, Sequelize);


// Modelo de Firmas
db.DocumentSignature = require('./documentSignature.model.js')(sequelize, Sequelize);

// Modelo de Exportaciones
db.TemplateExport = require('./templateExport.model.js')(sequelize, Sequelize);

db.GeneratedDocumentHistory = require('./generatedDocumentHistory.model.js')(sequelize, Sequelize);

db.DocumentTemplate  = require('./documentTemplate.model.js')(sequelize, Sequelize);


db.InventoryBatch = require('./inventoryBatch.model.js')(sequelize, Sequelize);

db.TechnicianInventoryReconciliation = require('./technicianInventoryReconciliation.model.js')(sequelize, Sequelize);

// Calendario
db.CalendarEvent = require('./calendarEvent.model.js')(sequelize, Sequelize);
db.CalendarIntegration = require('./calendarIntegration.model.js')(sequelize, Sequelize);

// Chat
db.ChatConversation = require('./chatConversation.model.js')(sequelize, Sequelize);
db.ChatMessage = require('./chatMessage.model.js')(sequelize, Sequelize);

// Store (Marketplace de Plugins)
db.StoreCustomer = require('./storeCustomer.model.js')(sequelize, Sequelize);
db.StoreOrder = require('./storeOrder.model.js')(sequelize, Sequelize);
db.StoreOrderItem = require('./storeOrderItem.model.js')(sequelize, Sequelize);

// ======================================
// Relaciones: Existentes Core (Sin cambios)
// ======================================

// Usuarios y permisos
db.Role.belongsToMany(db.Permission, {
  through: 'RolePermissions',
  foreignKey: 'roleId',
  otherKey: 'permissionId',
});



db.Permission.belongsToMany(db.Role, {
  through: 'RolePermissions',
  foreignKey: 'permissionId',
  otherKey: 'roleId',
});

db.User.belongsTo(db.Role, {
  foreignKey: 'roleId',
});

db.Role.hasMany(db.User, {
  foreignKey: 'roleId',
});

// Estructura de red
db.Node.hasMany(db.Sector, {
  foreignKey: 'nodeId',
});

db.Sector.belongsTo(db.Node, {
  foreignKey: 'nodeId',
});

// Clientes
db.Sector.hasMany(db.Client, {
  foreignKey: 'sectorId',
});

db.Client.belongsTo(db.Sector, {
  foreignKey: 'sectorId',
});

// Zone -> Client (Cliente pertenece a una zona)
db.Zone.hasMany(db.Client, {
  foreignKey: 'zoneId',
  as: 'clients'
});

db.Client.belongsTo(db.Zone, {
  foreignKey: 'zoneId',
  as: 'Zone'  // ← ClientList espera client.Zone.name
});

// Node -> Client (Cliente pertenece a un nodo) 
db.Node.hasMany(db.Client, {
  foreignKey: 'nodeId',
  as: 'clients'
});

db.Client.belongsTo(db.Node, {
  foreignKey: 'nodeId',
  as: 'Node'  // ← ClientList espera client.Node.name
});

db.Client.hasMany(db.ClientDocument, {
  foreignKey: 'clientId',
});

db.ClientDocument.belongsTo(db.Client, {
  foreignKey: 'clientId',
});

// Dispositivos unificados
db.Client.hasMany(db.Device, {
  foreignKey: 'clientId',
});

db.Device.belongsTo(db.Client, {
  foreignKey: 'clientId',
});



db.Node.hasMany(db.Device, {
  foreignKey: 'nodeId',
});

db.Device.belongsTo(db.Node, {
  foreignKey: 'nodeId',
});

db.Sector.hasMany(db.Device, {
  foreignKey: 'sectorId',
});

db.Device.belongsTo(db.Sector, {
  foreignKey: 'sectorId',
});

// Credenciales y métricas de dispositivos
db.Device.hasOne(db.DeviceCredential, {
  foreignKey: 'deviceId',
  as: 'credentials',
});

db.DeviceCredential.belongsTo(db.Device, {
  foreignKey: 'deviceId',
  as: 'device',
});

db.Device.hasMany(db.DeviceMetric, {
  foreignKey: 'deviceId',
  as: 'metrics',
});

db.DeviceMetric.belongsTo(db.Device, {
  foreignKey: 'deviceId',
  as: 'device',
});

db.Device.hasMany(db.CommandHistory, {
  foreignKey: 'deviceId',
  as: 'commandHistory',
});

db.CommandHistory.belongsTo(db.Device, {
  foreignKey: 'deviceId',
  as: 'device',
});

db.User.hasMany(db.CommandHistory, {
  foreignKey: 'userId',
  as: 'commandsExecuted',
});

db.CommandHistory.belongsTo(db.User, {
  foreignKey: 'userId',
  as: 'user',
});

// Servicios y suscripciones
db.Client.hasMany(db.Subscription, {
  foreignKey: 'clientId',
  as: 'Subscriptions'
});

db.Subscription.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'client'
});

db.ServicePackage.hasMany(db.Subscription, {
  foreignKey: 'servicePackageId',
  as: 'subscriptions'
});

db.Subscription.belongsTo(db.ServicePackage, {
  foreignKey: 'servicePackageId',
  as: 'ServicePackage'
});

// Tickets
db.Client.hasMany(db.Ticket, {
  foreignKey: 'clientId',
});

db.Ticket.belongsTo(db.Client, {
  foreignKey: 'clientId',
});

db.User.hasMany(db.Ticket, {
  foreignKey: 'assignedToId',
});

db.Ticket.belongsTo(db.User, {
  foreignKey: 'assignedToId',
  as: 'assignedTo',
});

db.User.hasMany(db.Ticket, {
  foreignKey: 'createdById',
});

db.Ticket.belongsTo(db.User, {
  foreignKey: 'createdById',
  as: 'createdBy',
});

db.Ticket.hasMany(db.TicketComment, {
  foreignKey: 'ticketId',
});

db.TicketComment.belongsTo(db.Ticket, {
  foreignKey: 'ticketId',
});

db.User.hasMany(db.TicketComment, {
  foreignKey: 'userId',
});

db.TicketComment.belongsTo(db.User, {
  foreignKey: 'userId',
});

// ClientNetwork
db.Client.hasMany(db.ClientNetwork, {
  foreignKey: 'clientId',
});

db.ClientNetwork.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'client',
});

db.Device.hasMany(db.ClientNetwork, {
  foreignKey: 'deviceId',
});

db.ClientNetwork.belongsTo(db.Device, {
  foreignKey: 'deviceId',
  as: 'device',
});

// Sistema de comandos
db.DeviceBrand.hasMany(db.DeviceFamily, {
  foreignKey: 'brandId',
  as: 'families',
});

db.DeviceFamily.belongsTo(db.DeviceBrand, {
  foreignKey: 'brandId',
  as: 'brand',
});

db.CommonCommand.hasMany(db.CommandImplementation, {
  foreignKey: 'commonCommandId',
  as: 'implementations',
});

db.CommandImplementation.belongsTo(db.CommonCommand, {
  foreignKey: 'commonCommandId',
  as: 'command',
});

db.DeviceBrand.hasMany(db.CommandImplementation, {
  foreignKey: 'brandId',
  as: 'commandImplementations',
});

db.CommandImplementation.belongsTo(db.DeviceBrand, {
  foreignKey: 'brandId',
  as: 'brand',
});

db.DeviceFamily.hasMany(db.CommandImplementation, {
  foreignKey: 'familyId',
  as: 'commandImplementations',
});

db.CommandImplementation.belongsTo(db.DeviceFamily, {
  foreignKey: 'familyId',
  as: 'family',
});

db.CommandImplementation.hasMany(db.CommandParameter, {
  foreignKey: 'implementationId',
  as: 'parameters',
});

db.CommandParameter.belongsTo(db.CommandImplementation, {
  foreignKey: 'implementationId',
  as: 'implementation',
});

db.DeviceBrand.hasMany(db.SnmpOid, {
  foreignKey: 'brandId',
  as: 'snmpOids',
});

db.SnmpOid.belongsTo(db.DeviceBrand, {
  foreignKey: 'brandId',
  as: 'brand',
});

db.DeviceFamily.hasMany(db.SnmpOid, {
  foreignKey: 'familyId',
  as: 'snmpOids',
});

db.SnmpOid.belongsTo(db.DeviceFamily, {
  foreignKey: 'familyId',
  as: 'family',
});

// Inventario
db.InventoryLocation.hasMany(db.Inventory, {
  foreignKey: 'locationId',
  as: 'items',
});

db.Inventory.belongsTo(db.InventoryLocation, {
  foreignKey: 'locationId',
  as: 'location',
});

db.Client.hasMany(db.Inventory, {
  foreignKey: 'clientId',
  as: 'assignedItems',
});

db.Inventory.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'assignedClient',
});

db.InventoryLocation.belongsTo(db.InventoryLocation, {
  foreignKey: 'parent_id',
  as: 'parent',
});

db.InventoryLocation.hasMany(db.InventoryLocation, {
  foreignKey: 'parent_id',
  as: 'children',
});

db.Inventory.hasMany(db.InventoryMovement, {
  foreignKey: 'inventoryId',
  as: 'movements',
});

db.InventoryMovement.belongsTo(db.Inventory, {
  foreignKey: 'inventoryId',
  as: 'item',
});

db.InventoryLocation.hasMany(db.InventoryMovement, {
  foreignKey: 'fromLocationId',
  as: 'outgoingMovements',
});

db.InventoryMovement.belongsTo(db.InventoryLocation, {
  foreignKey: 'fromLocationId',
  as: 'fromLocation',
});

db.InventoryLocation.hasMany(db.InventoryMovement, {
  foreignKey: 'toLocationId',
  as: 'incomingMovements',
});

db.InventoryMovement.belongsTo(db.InventoryLocation, {
  foreignKey: 'toLocationId',
  as: 'toLocation',
});

db.User.hasMany(db.InventoryMovement, {
  foreignKey: 'movedById',
  as: 'movementsMade',
});

db.InventoryMovement.belongsTo(db.User, {
  foreignKey: 'movedById',
  as: 'movedBy',
});


// ==========================================
// NUEVAS RELACIONES - InventoryBatch
// ==========================================

// InventoryBatch -> User (receivedBy)
db.InventoryBatch.belongsTo(db.User, {
  foreignKey: 'receivedByUserId',
  as: 'receivedBy'
});

// InventoryBatch -> InventoryLocation
db.InventoryBatch.belongsTo(db.InventoryLocation, {
  foreignKey: 'locationId',
  as: 'location'
});

// InventoryBatch -> Inventory (items del lote)
db.InventoryBatch.hasMany(db.Inventory, {
  foreignKey: 'batchId',
  as: 'items'
});

// ==========================================
// NUEVAS RELACIONES - Inventory
// ==========================================

// Inventory -> InventoryBatch
db.Inventory.belongsTo(db.InventoryBatch, {
  foreignKey: 'batchId',
  as: 'batch'
});

// Inventory -> InventoryProduct
db.Inventory.belongsTo(db.InventoryProduct, {
  foreignKey: 'productId',
  as: 'product'
});

// Inventory -> User (técnico asignado)
db.Inventory.belongsTo(db.User, {
  foreignKey: 'assignedToTechnicianId',
  as: 'assignedTechnician'
});

// Inventory -> Inventory (padre para splits)
db.Inventory.belongsTo(db.Inventory, {
  foreignKey: 'parentInventoryId',
  as: 'parentItem'
});

db.Inventory.hasMany(db.Inventory, {
  foreignKey: 'parentInventoryId',
  as: 'childItems'
});

// ==========================================
// NUEVAS RELACIONES - TechnicianInventoryReconciliation
// ==========================================

// TechnicianInventoryReconciliation -> User (técnico)
db.TechnicianInventoryReconciliation.belongsTo(db.User, {
  foreignKey: 'technicianId',
  as: 'technician'
});

// TechnicianInventoryReconciliation -> User (createdBy)
db.TechnicianInventoryReconciliation.belongsTo(db.User, {
  foreignKey: 'createdByUserId',
  as: 'createdBy'
});

// TechnicianInventoryReconciliation -> User (approvedBy)
db.TechnicianInventoryReconciliation.belongsTo(db.User, {
  foreignKey: 'approvedByUserId',
  as: 'approvedBy'
});

// User -> TechnicianInventoryReconciliation
db.User.hasMany(db.TechnicianInventoryReconciliation, {
  foreignKey: 'technicianId',
  as: 'reconciliations'
});

// ==========================================
// RELACIONES EXISTENTES PARA InventoryProduct
// ==========================================

// InventoryProduct -> Inventory
db.InventoryProduct.hasMany(db.Inventory, {
  foreignKey: 'productId',
  as: 'inventoryItems'
});

// User -> Inventory (items asignados a técnico)
db.User.hasMany(db.Inventory, {
  foreignKey: 'assignedToTechnicianId',
  as: 'assignedInventory'
});

// Relaciones de IP Pool y suscripciones
db.IpPool.hasMany(db.Subscription, {
  foreignKey: 'currentIpPoolId',
  as: 'assignedClients'
});

db.Subscription.belongsTo(db.IpPool, {
  foreignKey: 'currentIpPoolId',
  as: 'currentPool'
});

// Mikrotik PPPoE relaciones
db.MikrotikRouter.hasMany(db.MikrotikPPPOE, {
  foreignKey: 'mikrotikRouterId'
});

db.MikrotikPPPOE.belongsTo(db.MikrotikRouter, {
  foreignKey: 'mikrotikRouterId'
});

db.Client.hasMany(db.MikrotikPPPOE, {
  foreignKey: 'clientId'
});

db.MikrotikPPPOE.belongsTo(db.Client, {
  foreignKey: 'clientId'
});

db.Subscription.hasMany(db.MikrotikPPPOE, {
  foreignKey: 'subscriptionId'
});

db.MikrotikPPPOE.belongsTo(db.Subscription, {
  foreignKey: 'subscriptionId'
});

// MikrotikIp relaciones
db.IpPool.hasMany(db.MikrotikIp, {
  foreignKey: 'ipPoolId'
});

db.MikrotikIp.belongsTo(db.IpPool, {
  foreignKey: 'ipPoolId'
});

db.Client.hasMany(db.MikrotikIp, {
  foreignKey: 'clientId'
});

db.MikrotikIp.belongsTo(db.Client, {
  foreignKey: 'clientId'
});

db.MikrotikPPPOE.hasOne(db.MikrotikIp, {
  foreignKey: 'mikrotikPPPOEId'
});

db.MikrotikIp.belongsTo(db.MikrotikPPPOE, {
  foreignKey: 'mikrotikPPPOEId'
});

// Zone relaciones
db.Zone.hasMany(db.IpPool, {
  foreignKey: 'zoneId'
});



db.IpPool.belongsTo(db.Zone, {
  foreignKey: 'zoneId'
});

db.Zone.hasMany(db.ServicePackage, {
  foreignKey: 'zoneId'
});

db.ServicePackage.belongsTo(db.Zone, {
  foreignKey: 'zoneId'
});

db.Zone.hasMany(db.Node, {
  foreignKey: 'zoneId',
});

db.Node.belongsTo(db.Zone, {
  foreignKey: 'zoneId',
});

db.Device.hasOne(db.MikrotikRouter, {
  foreignKey: 'deviceId',
  as: 'mikrotikRouter',
});

db.MikrotikRouter.belongsTo(db.Device, {
  foreignKey: 'deviceId',
  as: 'device',
});

db.Node.hasMany(db.MikrotikRouter, {
  foreignKey: 'nodeId',
});

db.MikrotikRouter.belongsTo(db.Node, {
  foreignKey: 'nodeId',
});

db.MikrotikRouter.hasMany(db.IpPool, {
  foreignKey: 'mikrotikRouterId',
});

db.IpPool.belongsTo(db.MikrotikRouter, {
  foreignKey: 'mikrotikRouterId',
});

db.MikrotikRouter.hasMany(db.MikrotikProfile, {
  foreignKey: 'mikrotikRouterId',
});

db.MikrotikProfile.belongsTo(db.MikrotikRouter, {
  foreignKey: 'mikrotikRouterId',
});

db.ServicePackage.hasMany(db.MikrotikProfile, {
  foreignKey: 'servicePackageId',
});

db.MikrotikProfile.belongsTo(db.ServicePackage, {
  foreignKey: 'servicePackageId',
  
});

// Clientes - nuevas relaciones
db.Client.hasOne(db.ClientBilling, {
  foreignKey: 'clientId',
  as: 'clientBilling'  // Agregar alias
});

db.ClientBilling.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'client'  // ✅ ESTE ES EL ALIAS QUE USAS EN EL CONTROLADOR
});

db.ServicePackage.hasMany(db.ClientBilling, {
  foreignKey: 'servicePackageId',
  as: 'clientBillings'  // ← Minúscula
});

db.ClientBilling.belongsTo(db.ServicePackage, {
  foreignKey: 'servicePackageId',
  as: 'ServicePackage' 
});

db.IpPool.hasMany(db.ClientBilling, {
  foreignKey: 'currentIpPoolId',
});

db.ClientBilling.belongsTo(db.IpPool, {
  foreignKey: 'currentIpPoolId',
});

db.Client.hasOne(db.ClientNetworkConfig, {
  foreignKey: 'clientId',
});

db.ClientNetworkConfig.belongsTo(db.Client, {
  foreignKey: 'clientId',
});

db.MikrotikRouter.hasMany(db.ClientNetworkConfig, {
  foreignKey: 'mikrotikRouterId',
});

db.ClientNetworkConfig.belongsTo(db.MikrotikRouter, {
  foreignKey: 'mikrotikRouterId',
});

db.Client.hasMany(db.ClientInstallation, {
  foreignKey: 'clientId',
});

db.ClientInstallation.belongsTo(db.Client, {
  foreignKey: 'clientId',
});

db.Ticket.hasMany(db.ClientInstallation, {
  foreignKey: 'ticketId',
});

db.ClientInstallation.belongsTo(db.Ticket, {
  foreignKey: 'ticketId',
});

db.Client.hasMany(db.ClientSupport, {
  foreignKey: 'clientId',
});

db.ClientSupport.belongsTo(db.Client, {
  foreignKey: 'clientId',
});

db.Ticket.hasMany(db.ClientSupport, {
  foreignKey: 'ticketId',
});

db.ClientSupport.belongsTo(db.Ticket, {
  foreignKey: 'ticketId',
});

// Inventario mejorado con scrap
db.InventoryCategory.hasMany(db.InventoryType, {
  foreignKey: 'categoryId',
});

db.InventoryType.belongsTo(db.InventoryCategory, {
  foreignKey: 'categoryId',
});

db.InventoryType.hasMany(db.InventoryProduct, {
  foreignKey: 'typeId',
});

db.InventoryProduct.belongsTo(db.InventoryType, {
  foreignKey: 'typeId',
});

db.InventoryProduct.hasMany(db.Inventory, {
  foreignKey: 'productId',
});

db.Inventory.belongsTo(db.InventoryProduct, {
  foreignKey: 'productId',
});

db.Ticket.hasMany(db.InstallationMaterial, {
  foreignKey: 'ticketId',
});

db.InstallationMaterial.belongsTo(db.Ticket, {
  foreignKey: 'ticketId',
});

db.Inventory.hasMany(db.InstallationMaterial, {
  foreignKey: 'itemId',
});

db.InstallationMaterial.belongsTo(db.Inventory, {
  foreignKey: 'itemId',
});

// Sistema de pagos
db.Client.hasMany(db.Invoice, {
  foreignKey: 'clientId',
});

db.Invoice.belongsTo(db.Client, {
  foreignKey: 'clientId',
});


// ========== AGREGAR ESTAS RELACIONES FALTANTES ==========
db.Subscription.hasMany(db.Invoice, {
  foreignKey: 'subscriptionId',
  as: 'invoices'
});

db.Invoice.belongsTo(db.Subscription, {
  foreignKey: 'subscriptionId',
  as: 'subscription'
});


db.Invoice.hasMany(db.Payment, {
  foreignKey: 'invoiceId',
});

db.Payment.belongsTo(db.Invoice, {
  foreignKey: 'invoiceId',
});

db.Client.hasMany(db.Payment, {
  foreignKey: 'clientId',
});

db.Payment.belongsTo(db.Client, {
  foreignKey: 'clientId',
});

db.PaymentGateway.hasMany(db.Payment, {
  foreignKey: 'gatewayId',
});

db.Payment.belongsTo(db.PaymentGateway, {
  foreignKey: 'gatewayId',
});

db.Client.hasMany(db.PaymentReminder, {
  foreignKey: 'clientId',
});

db.PaymentReminder.belongsTo(db.Client, {
  foreignKey: 'clientId',
});

db.Invoice.hasMany(db.PaymentReminder, {
  foreignKey: 'invoiceId',
});

db.PaymentReminder.belongsTo(db.Invoice, {
  foreignKey: 'invoiceId',
});

// Tickets mejorados
db.TicketType.hasMany(db.Ticket, {
  foreignKey: 'ticketTypeId',
});

db.Ticket.belongsTo(db.TicketType, {
  foreignKey: 'ticketTypeId',
});

db.Ticket.hasMany(db.TicketAttachment, {
  foreignKey: 'ticketId',
});

db.TicketAttachment.belongsTo(db.Ticket, {
  foreignKey: 'ticketId',
});

// Relación entre Inventory y InventoryScrap
db.Inventory.hasMany(db.InventoryScrap, {
  foreignKey: 'inventoryId',
  as: 'scrapHistory'
});

db.InventoryScrap.belongsTo(db.Inventory, {
  foreignKey: 'inventoryId',
  as: 'item'
});

db.User.hasMany(db.InventoryScrap, {
  foreignKey: 'technicianId',
  as: 'scrapGenerated'
});

db.InventoryScrap.belongsTo(db.User, {
  foreignKey: 'technicianId',
  as: 'technician'
});

db.Ticket.hasMany(db.InventoryScrap, {
  foreignKey: 'ticketId',
  as: 'materialsScrap'
});

db.InventoryScrap.belongsTo(db.Ticket, {
  foreignKey: 'ticketId',
  as: 'ticket'
});

// ======================================
// NUEVAS RELACIONES: SISTEMA DE COMUNICACIONES
// ======================================

// Canales de comunicación con plantillas
db.CommunicationChannel.hasMany(db.MessageTemplate, {
  foreignKey: 'channelId',
  as: 'templates'
});

db.MessageTemplate.belongsTo(db.CommunicationChannel, {
  foreignKey: 'channelId',
  as: 'channel'
});

// Logs de comunicación
db.Client.hasMany(db.CommunicationLog, {
  foreignKey: 'clientId',
  as: 'communicationLogs'
});

db.CommunicationLog.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'client'
});

db.CommunicationChannel.hasMany(db.CommunicationLog, {
  foreignKey: 'channelId',
  as: 'logs'
});

db.CommunicationLog.belongsTo(db.CommunicationChannel, {
  foreignKey: 'channelId',
  as: 'channel'
});

db.MessageTemplate.hasMany(db.CommunicationLog, {
  foreignKey: 'templateId',
  as: 'usageLogs'
});

db.CommunicationLog.belongsTo(db.MessageTemplate, {
  foreignKey: 'templateId',
  as: 'template'
});

// Reglas de notificación con plantillas
db.MessageTemplate.hasMany(db.NotificationRule, {
  foreignKey: 'templateId',
  as: 'notificationRules'
});

db.NotificationRule.belongsTo(db.MessageTemplate, {
  foreignKey: 'templateId',
  as: 'template'
});

// Cola de notificaciones
db.Client.hasMany(db.NotificationQueue, {
  foreignKey: 'clientId',
  as: 'queuedNotifications'
});

db.NotificationQueue.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'client'
});

db.CommunicationChannel.hasMany(db.NotificationQueue, {
  foreignKey: 'channelId',
  as: 'queuedMessages'
});

db.NotificationQueue.belongsTo(db.CommunicationChannel, {
  foreignKey: 'channelId',
  as: 'channel'
});

db.MessageTemplate.hasMany(db.NotificationQueue, {
  foreignKey: 'templateId',
  as: 'scheduledMessages'
});

db.NotificationQueue.belongsTo(db.MessageTemplate, {
  foreignKey: 'templateId',
  as: 'template'
});

db.NotificationRule.hasMany(db.NotificationQueue, {
  foreignKey: 'ruleId',
  as: 'triggeredMessages'
});

db.NotificationQueue.belongsTo(db.NotificationRule, {
  foreignKey: 'ruleId',
  as: 'rule'
});

// Contactos de comunicación
db.Client.hasMany(db.CommunicationContact, {
  foreignKey: 'clientId',
  as: 'communicationContacts'
});

db.CommunicationContact.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'client'
});

// Eventos de comunicación
db.Client.hasMany(db.CommunicationEvent, {
  foreignKey: 'clientId',
  as: 'communicationEvents'
});

db.CommunicationEvent.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'client'
});


// ======================================
// RELACIONES: SISTEMA DE DOCUMENTOS
// ======================================

// DocumentTemplate - GeneratedDocumentHistory
db.DocumentTemplate.hasMany(db.GeneratedDocumentHistory, {
  foreignKey: 'templateId',
  as: 'generatedDocuments'
});

db.GeneratedDocumentHistory.belongsTo(db.DocumentTemplate, {
  foreignKey: 'templateId',
  as: 'template'
});

// Client - GeneratedDocumentHistory
db.Client.hasMany(db.GeneratedDocumentHistory, {
  foreignKey: 'clientId',
  as: 'generatedDocuments'
});

db.GeneratedDocumentHistory.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'client'
});

// GeneratedDocumentHistory - ClientDocument
db.GeneratedDocumentHistory.belongsTo(db.ClientDocument, {
  foreignKey: 'clientDocumentId',
  as: 'savedDocument'
});

db.ClientDocument.hasOne(db.GeneratedDocumentHistory, {
  foreignKey: 'clientDocumentId',
  as: 'generatedFrom'
});

// User relationships con DocumentTemplate
db.User.hasMany(db.DocumentTemplate, {
  foreignKey: 'createdBy',
  as: 'templatesCreated'
});

db.DocumentTemplate.belongsTo(db.User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

db.User.hasMany(db.DocumentTemplate, {
  foreignKey: 'updatedBy',
  as: 'templatesUpdated'
});

db.DocumentTemplate.belongsTo(db.User, {
  foreignKey: 'updatedBy',
  as: 'updater'
});

// User - GeneratedDocumentHistory
db.User.hasMany(db.GeneratedDocumentHistory, {
  foreignKey: 'generatedBy',
  as: 'generatedDocuments'
});

db.GeneratedDocumentHistory.belongsTo(db.User, {
  foreignKey: 'generatedBy',
  as: 'generator'
});




// Relaciones de DocumentSignature
db.GeneratedDocumentHistory.hasMany(db.DocumentSignature, {
  foreignKey: 'generatedDocumentId',
  as: 'signatures'
});

db.DocumentSignature.belongsTo(db.GeneratedDocumentHistory, {
  foreignKey: 'generatedDocumentId',
  as: 'document'
});

db.Client.hasMany(db.DocumentSignature, {
  foreignKey: 'clientId',
  as: 'signatures'
});

db.DocumentSignature.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'client'
});

// Relaciones de TemplateExport
db.DocumentTemplate.hasMany(db.TemplateExport, {
  foreignKey: 'templateId',
  as: 'exports'
});

db.TemplateExport.belongsTo(db.DocumentTemplate, {
  foreignKey: 'templateId',
  as: 'template'
});

db.User.hasMany(db.TemplateExport, {
  foreignKey: 'exportedBy',
  as: 'templateExports'
});

db.TemplateExport.belongsTo(db.User, {
  foreignKey: 'exportedBy',
  as: 'exporter'
});

// Relación de versionamiento (auto-referencia)
db.DocumentTemplate.hasMany(db.DocumentTemplate, {
  foreignKey: 'parentTemplateId',
  as: 'versions'
});

db.DocumentTemplate.belongsTo(db.DocumentTemplate, {
  foreignKey: 'parentTemplateId',
  as: 'parentTemplate'
});

// ======================================
// RELACIONES: SISTEMA DE STORE (Marketplace)
// ======================================

// StoreCustomer - StoreOrder
db.StoreCustomer.hasMany(db.StoreOrder, {
  foreignKey: 'customerId',
  as: 'orders'
});

db.StoreOrder.belongsTo(db.StoreCustomer, {
  foreignKey: 'customerId',
  as: 'customer'
});

// StoreOrder - StoreOrderItem
db.StoreOrder.hasMany(db.StoreOrderItem, {
  foreignKey: 'orderId',
  as: 'items'
});

db.StoreOrderItem.belongsTo(db.StoreOrder, {
  foreignKey: 'orderId',
  as: 'order'
});

// Exportar el objeto db
module.exports = db;