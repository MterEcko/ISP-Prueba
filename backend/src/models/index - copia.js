const { Sequelize } = require('sequelize');
const config = require('../config/db.config');

const sequelize = new Sequelize(
  config.DB, 
  config.USER, 
  config.PASSWORD, 
  {
    host: config.HOST,
    dialect: config.dialect,
    pool: {
      max: config.pool.max,
      min: config.pool.min,
      acquire: config.pool.acquire,
      idle: config.pool.idle
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Importar modelos de autenticación
db.User = require('./user.model.js')(sequelize);
db.Role = require('./role.model.js')(sequelize);
db.Permission = require('./permission.model.js')(sequelize);

// Importar modelos de clientes
db.Node = require('./node.model.js')(sequelize);
db.Sector = require('./sector.model.js')(sequelize);
db.Client = require('./client.model.js')(sequelize);
db.ClientDocument = require('./clientDocument.model.js')(sequelize);
db.Service = require('./service.model.js')(sequelize);
db.Subscription = require('./subscription.model.js')(sequelize);

// Definir relaciones de autenticación
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

// Definir relaciones para clientes y nodos/sectores
db.Node.hasMany(db.Sector, {
  foreignKey: 'nodeId'
});

db.Sector.belongsTo(db.Node, {
  foreignKey: 'nodeId'
});

db.Client.belongsTo(db.Sector, {
  foreignKey: 'sectorId'
});

db.Sector.hasMany(db.Client, {
  foreignKey: 'sectorId'
});

db.Client.hasMany(db.ClientDocument, {
  foreignKey: 'clientId'
});

db.ClientDocument.belongsTo(db.Client, {
  foreignKey: 'clientId'
});

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

module.exports = db;