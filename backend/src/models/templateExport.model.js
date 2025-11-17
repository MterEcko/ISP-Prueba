// backend/src/models/templateExport.model.js
// NUEVO MODELO PARA EXPORTACIONES

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TemplateExport = sequelize.define('TemplateExport', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    templateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'DocumentTemplates',
        key: 'id'
      }
    },
    
    exportedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    exportFormat: {
      type: DataTypes.ENUM('json', 'zip', 'html'),
      defaultValue: 'json'
    },
    
    exportData: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Datos completos de la plantilla exportada'
    },
    
    fileHash: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hash SHA-256 del archivo exportado'
    },
    
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de expiración del enlace de descarga'
    }
  }, {
    tableName: 'TemplateExports',
    timestamps: true
  });

  return TemplateExport;
};