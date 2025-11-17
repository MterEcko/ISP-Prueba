// backend/src/config/db.config.js
const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: false, // Cambiar a console.log para habilitar logging
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    }
  },
  test: {
    username: 'postgres',
    password: 'Supermetroid1.',
    database: 'isp_system_test',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    pool: {
      max: 5,
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
  },
  production: {
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'Supermetroid1.',
    database: process.env.DB_NAME || 'isp_system_prod',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
};