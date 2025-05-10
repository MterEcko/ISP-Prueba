const path = require('path');

// Obtener configuración del entorno
const env = process.env.NODE_ENV || 'development';

// Configuración para desarrollo con SQLite
const devConfig = {
  dialect: "sqlite",
  storage: path.join(__dirname, '../database.sqlite'),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// Configuración para producción con PostgreSQL
const prodConfig = {
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
  DB: process.env.DB_NAME,
  dialect: "postgres",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

module.exports = env === 'production' ? prodConfig : devConfig;