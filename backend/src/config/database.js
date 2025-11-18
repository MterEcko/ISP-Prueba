// backend/src/config/database.js
const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

dotenv.config(); // Carga variables de entorno desde .env

const DB_DIALECT = process.env.DB_DIALECT || 'sqlite';

console.log(`Inicializando conexión a ${DB_DIALECT.toUpperCase()}...`);

let sequelizeConfig;

if (DB_DIALECT === 'sqlite') {
  sequelizeConfig = {
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    }
  };
} else {
  sequelizeConfig = {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'Supermetroid1.',
    database: process.env.DB_NAME || 'isp_system_dev',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    },
    // Opciones específicas para PostgreSQL
    dialectOptions: {
      ssl: process.env.DB_SSL === "true" ? {
        require: true,
        rejectUnauthorized: false
      } : false,
    },
  };
}

const sequelize = new Sequelize(sequelizeConfig);

// Función para probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ Conexión a ${DB_DIALECT.toUpperCase()} establecida correctamente.`);

    // Mostrar información de la base de datos
    if (DB_DIALECT === 'sqlite') {
      console.log(`📊 Base de datos: ${sequelize.config.storage}`);
    } else {
      console.log(`📊 Base de datos: ${sequelize.config.database}`);
      console.log(`🏠 Host: ${sequelize.config.host}:${sequelize.config.port}`);
      console.log(`👤 Usuario: ${sequelize.config.username}`);
    }

  } catch (error) {
    console.error(`❌ No se pudo conectar a ${DB_DIALECT.toUpperCase()}:`, error.message);
    console.error('💡 Verifica la configuración de la base de datos');
    process.exit(1);
  }
};

// Probar la conexión inmediatamente
testConnection();

module.exports = sequelize;