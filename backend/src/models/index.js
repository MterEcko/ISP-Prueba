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
    logging: false // Deshabilitar logging en desarrollo, opcional
  });
} else {
  // Configuración para PostgreSQL (producción)
  sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    pool: config.pool,
    logging: false // Deshabilitar logging en producción, opcional
  });
}

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Importar modelos
db.User = require('./user.model.js')(sequelize, Sequelize);
db.Role = require('./role.model.js')(sequelize, Sequelize);
db.Permission = require('./permission.model.js')(sequelize, Sequelize);
db.Node = require('./node.model.js')(sequelize, Sequelize);
db.Sector = require('./sector.model.js')(sequelize, Sequelize);
db.Client = require('./client.model.js')(sequelize, Sequelize);
db.ClientDocument = require('./clientDocument.model.js')(sequelize, Sequelize);
db.Service = require('./service.model.js')(sequelize, Sequelize);
db.Subscription = require('./subscription.model.js')(sequelize, Sequelize);
db.Ticket = require('./ticket.model.js')(sequelize, Sequelize);
db.TicketComment = require('./ticketComment.model.js')(sequelize, Sequelize);
db.Device = require('./device.model.js')(sequelize, Sequelize);

// Importar el nuevo modelo
db.ClientNetwork = require('./client.network.model.js')(sequelize, Sequelize);

// Definir relaciones

// Relaciones de usuarios y permisos
db.Role.belongsToMany(db.Permission, {
  through: 'RolePermissions',
  foreignKey: 'roleId',
  otherKey: 'permissionId'
});

db.Permission.belongsToMany(db.Role, {
  through: 'RolePermissions',
  foreignKey: 'permissionId',
  otherKey: 'roleId'
});

db.User.belongsTo(db.Role, {
  foreignKey: 'roleId'
});

db.Role.hasMany(db.User, {
  foreignKey: 'roleId'
});

// Relaciones de red
db.Node.hasMany(db.Sector, {
  foreignKey: 'nodeId'
});

db.Sector.belongsTo(db.Node, {
  foreignKey: 'nodeId'
});

// Relaciones de clientes
db.Sector.hasMany(db.Client, {
  foreignKey: 'sectorId'
});

db.Client.belongsTo(db.Sector, {
  foreignKey: 'sectorId'
});

db.Client.hasMany(db.ClientDocument, {
  foreignKey: 'clientId'
});

db.ClientDocument.belongsTo(db.Client, {
  foreignKey: 'clientId'
});

// Relaciones de dispositivos
db.Client.hasMany(db.Device, {
  foreignKey: 'clientId'
});

db.Device.belongsTo(db.Client, {
  foreignKey: 'clientId'
});

db.Node.hasMany(db.Device, {
  foreignKey: 'nodeId'
});

db.Device.belongsTo(db.Node, {
  foreignKey: 'nodeId'
});

db.Sector.hasMany(db.Device, {
  foreignKey: 'sectorId'
});

db.Device.belongsTo(db.Sector, {
  foreignKey: 'sectorId'
});

// Relaciones de servicios y suscripciones
db.Client.belongsToMany(db.Service, {
  through: db.Subscription,
  foreignKey: 'clientId',
  otherKey: 'serviceId'
});

db.Service.belongsToMany(db.Client, {
  through: db.Subscription,
  foreignKey: 'serviceId',
  otherKey: 'clientId'
});

// Relaciones de tickets
db.Client.hasMany(db.Ticket, {
  foreignKey: 'clientId'
});

db.Ticket.belongsTo(db.Client, {
  foreignKey: 'clientId'
});

db.User.hasMany(db.Ticket, {
  foreignKey: 'assignedToId'
});

db.Ticket.belongsTo(db.User, {
  foreignKey: 'assignedToId',
  as: 'assignedTo'
});

db.User.hasMany(db.Ticket, {
  foreignKey: 'createdById'
});

db.Ticket.belongsTo(db.User, {
  foreignKey: 'createdById',
  as: 'createdBy'
});

db.Ticket.hasMany(db.TicketComment, {
  foreignKey: 'ticketId'
});

db.TicketComment.belongsTo(db.Ticket, {
  foreignKey: 'ticketId'
});

db.User.hasMany(db.TicketComment, {
  foreignKey: 'userId'
});

db.TicketComment.belongsTo(db.User, {
  foreignKey: 'userId'
});

// Nuevas relaciones para ClientNetwork
db.Client.hasMany(db.ClientNetwork, {
  foreignKey: 'clientId'
});

db.ClientNetwork.belongsTo(db.Client, {
  foreignKey: 'clientId',
  as: 'client'
});

db.Device.hasMany(db.ClientNetwork, {
  foreignKey: 'deviceId'
});

db.ClientNetwork.belongsTo(db.Device, {
  foreignKey: 'deviceId',
  as: 'device'
});

module.exports = db;