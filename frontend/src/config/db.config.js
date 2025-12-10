// backend/src/config/db.config.js
const path = require('path');

// Función helper para generar configuración según el dialecto
function getDatabaseConfig(dialect, defaults = {}) {
  if (dialect === 'postgres' || dialect === 'postgresql') {
    // Configuración PostgreSQL - NO incluir 'storage'
    return {
      dialect: 'postgres',
      username: process.env.DB_USERNAME || defaults.username || 'postgres',
      password: process.env.DB_PASSWORD || defaults.password || 'Supermetroid1.',
      database: process.env.DB_NAME || defaults.database || 'ispdev',
      host: process.env.DB_HOST || defaults.host || 'localhost',
      port: parseInt(process.env.DB_PORT) || defaults.port || 5432,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      logging: false,
      define: {
        timestamps: true,
        underscored: false,
        freezeTableName: false
      }
    };
  } else {
    // Configuración SQLite - incluir 'storage'
    return {
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || defaults.storage || path.join(__dirname, '../../database.sqlite'),
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      logging: false,
      define: {
        timestamps: true,
        underscored: false,
        freezeTableName: false
      }
    };
  }
}

module.exports = {
  development: getDatabaseConfig(process.env.DB_DIALECT || 'sqlite'),
  test: getDatabaseConfig('postgres', {
    username: 'postgres',
    password: 'Supermetroid1.',
    database: 'isp_system_test',
    host: 'localhost',
    port: 5432
  }),
  production: getDatabaseConfig('postgres', {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'isp_system_prod',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432
  })
};
