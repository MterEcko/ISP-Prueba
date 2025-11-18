// backend/src/models/employeeEmail.model.js
// Modelo para cuentas de correo de empleados

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EmployeeEmail = sequelize.define('EmployeeEmail', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Usuario asociado'
    },
    emailUsername: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Usuario del correo (juan.perez)'
    },
    emailAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Correo completo (juan.perez@nombreisp.net)'
    },
    emailPassword: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Contraseña del correo (encriptada)'
    },
    domain: {
      type: DataTypes.STRING(100),
      defaultValue: 'serviciosqbit.net',
      comment: 'Dominio del correo'
    },
    quotaMB: {
      type: DataTypes.INTEGER,
      defaultValue: 1024,
      comment: 'Cuota de almacenamiento en MB (1GB por defecto)'
    },
    usedMB: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Almacenamiento usado en MB'
    },
    forwardTo: {
      type: DataTypes.STRING(255),
      comment: 'Reenviar correos a otra dirección'
    },
    autoReply: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Respuesta automática habilitada'
    },
    autoReplyMessage: {
      type: DataTypes.TEXT,
      comment: 'Mensaje de respuesta automática'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Cuenta activa'
    },
    lastLogin: {
      type: DataTypes.DATE,
      comment: 'Último acceso al correo'
    },
    serverType: {
      type: DataTypes.ENUM('external', 'local'),
      defaultValue: 'external'
      // Nota: Tipo de servidor (externo contratado o local)
    },
    webmailUrl: {
      type: DataTypes.STRING(255),
      comment: 'URL del webmail'
    }
  }, {
    tableName: 'EmployeeEmails',
    timestamps: true
  });

  return EmployeeEmail;
};
