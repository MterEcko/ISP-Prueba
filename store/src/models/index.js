const { Sequelize } = require('sequelize');
const logger = require('../config/logger');

// Configuración de la base de datos
const sequelize = new Sequelize(
  process.env.DB_NAME || 'isp_store',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? msg => logger.debug(msg) : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false
    }
  }
);

const db = {};

// Importar modelos
db.Installation = require('./installation.model')(sequelize);
db.License = require('./license.model')(sequelize);
db.Plugin = require('./plugin.model')(sequelize);
db.PluginDownload = require('./pluginDownload.model')(sequelize);
db.TelemetryData = require('./telemetryData.model')(sequelize);
db.InstallationMetrics = require('./installationMetrics.model')(sequelize);
db.InstallationLocation = require('./installationLocation.model')(sequelize);
db.RemoteCommand = require('./remoteCommand.model')(sequelize);
db.SystemAlert = require('./systemAlert.model')(sequelize);

// Definir relaciones
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
