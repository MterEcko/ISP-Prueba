const path = require('path');

// Configuración para desarrollo con SQLite
const devConfig = {
  dialect: "sqlite",
  storage: path.join(__dirname, '../../database.sqlite'),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// Configuración para producción con PostgreSQL
const prodConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  dialect: "postgres",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

const env = process.env.NODE_ENV || 'development';

// Exportar en formato compatible con Sequelize CLI
module.exports = {
  development: devConfig,
  test: devConfig, // Usar la misma configuración para test
  production: prodConfig
};