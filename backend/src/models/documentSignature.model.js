// backend/src/models/documentSignature.model.js
// NUEVO MODELO PARA FIRMAS

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DocumentSignature = sequelize.define('DocumentSignature', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Relación con documento generado
    generatedDocumentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'GeneratedDocumentHistories',
        key: 'id'
      }
    },
    
    // Relación con cliente
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    
    // Tipo de firmante
    signerType: {
      type: DataTypes.ENUM('client', 'provider', 'witness', 'technician'),
      allowNull: false,
      defaultValue: 'client'
    },
    
    // Nombre del firmante
    signerName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    
    // Datos de la firma
    signatureData: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Base64 de la imagen de la firma'
    },
    
    // Hash para verificación
    signatureHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hash SHA-256 de la firma para verificación'
    },
    
    // Metadata de la firma
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    geolocation: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Coordenadas GPS si están disponibles'
    },
    
    // Timestamp de firma
    signedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    
    // Estado de la firma
    status: {
      type: DataTypes.ENUM('valid', 'revoked', 'expired'),
      defaultValue: 'valid'
    },
    
    // Notas adicionales
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'DocumentSignatures',
    timestamps: true
  });

  return DocumentSignature;
};