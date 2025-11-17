const { Sequelize } = require('sequelize');
const logger = require('../config/logger');
const path = require('path');

// Configuración de la base de datos
const dbDialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dbDialect === 'sqlite') {
  // Configuración para SQLite (desarrollo/testing)
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../database.sqlite');

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? msg => logger.debug(msg) : false,
    define: {
      timestamps: true,
      underscored: false
    }
  });

  logger.info(`📦 Usando SQLite: ${dbPath}`);
} else {
  // Configuración para PostgreSQL (producción)
  sequelize = new Sequelize(
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

  logger.info(`🐘 Usando PostgreSQL: ${process.env.DB_NAME || 'isp_store'}`);
}

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
