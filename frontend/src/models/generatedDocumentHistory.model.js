// backend/src/models/generatedDocumentHistory.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GeneratedDocumentHistory = sequelize.define('GeneratedDocumentHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    
    templateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'DocumentTemplates',
        key: 'id'
      }
    },
    
    clientDocumentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ClientDocuments',
        key: 'id'
      }
    },
    
    templateData: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Datos utilizados para generar el documento'
    },
    
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    
    generatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    status: {
      type: DataTypes.ENUM('generated', 'signed', 'sent', 'archived', 'error'),
      allowNull: false,
      defaultValue: 'generated'
    },
    
    ipAddress: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Metadata adicional del documento generado'
    },
    
    // Campos de firma
    signatureRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el documento requiere firma'
    },
    
    signatureCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el documento ha sido firmado'
    },
    
    signedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    signedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'GeneratedDocumentHistory',
    timestamps: true,
    freezeTableName: true, // IMPORTANTE: Evita que Sequelize pluralice
    indexes: [
      {
        fields: ['clientId']
      },
      {
        fields: ['templateId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['generatedAt']
      },
      {
        name: 'idx_gen_doc_sig_required',
        fields: ['signatureRequired'],
        where: {
          signatureRequired: true
        }
      },
      {
        name: 'idx_gen_doc_pending_sig',
        fields: ['signatureRequired', 'signatureCompleted'],
        where: {
          signatureRequired: true,
          signatureCompleted: false
        }
      }
    ]
  });

  // ================================
  // MÉTODOS DE INSTANCIA
  // ================================
  
  /**
   * Marca el documento como firmado
   */
  GeneratedDocumentHistory.prototype.markAsSigned = async function(userId, signatureHash) {
    await this.update({
      signatureCompleted: true,
      signedAt: new Date(),
      signedBy: userId,
      status: 'signed',
      metadata: {
        ...this.metadata,
        signatureHash
      }
    });
  };

  /**
   * Actualiza el metadata del documento
   */
  GeneratedDocumentHistory.prototype.updateMetadata = async function(newMetadata) {
    await this.update({
      metadata: {
        ...this.metadata,
        ...newMetadata
      }
    });
  };

  /**
   * Marca el documento como enviado
   */
  GeneratedDocumentHistory.prototype.markAsSent = async function(sentData) {
    await this.update({
      status: 'sent',
      metadata: {
        ...this.metadata,
        sentAt: new Date(),
        ...sentData
      }
    });
  };

  /**
   * Marca el documento como archivado
   */
  GeneratedDocumentHistory.prototype.archive = async function() {
    await this.update({
      status: 'archived'
    });
  };

  // ================================
  // MÉTODOS ESTÁTICOS (DE CLASE)
  // ================================
  
  /**
   * Obtiene documentos pendientes de firma
   */
  GeneratedDocumentHistory.getPendingSignatures = async function(clientId = null) {
    const where = {
      signatureRequired: true,
      signatureCompleted: false
    };
    
    if (clientId) {
      where.clientId = clientId;
    }
    
    return await this.findAll({
      where,
      include: [
        {
          model: sequelize.models.Client,
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: sequelize.models.DocumentTemplate,
          attributes: ['id', 'name', 'templateType', 'icon']
        }
      ],
      order: [['generatedAt', 'DESC']]
    });
  };

  /**
   * Obtiene el historial de documentos de un cliente
   */
  GeneratedDocumentHistory.getClientHistory = async function(clientId, options = {}) {
    const where = { clientId };
    
    if (options.status) {
      where.status = options.status;
    }
    
    if (options.templateId) {
      where.templateId = options.templateId;
    }
    
    return await this.findAll({
      where,
      include: [
        {
          model: sequelize.models.DocumentTemplate,
          attributes: ['id', 'name', 'templateType', 'icon']
        },
        {
          model: sequelize.models.User,
          as: 'generator',
          attributes: ['id', 'username', 'fullName']
        }
      ],
      order: [['generatedAt', 'DESC']],
      limit: options.limit || 50
    });
  };

  /**
   * Obtiene documentos por estado
   */
  GeneratedDocumentHistory.getByStatus = async function(status) {
    return await this.findAll({
      where: { status },
      include: [
        {
          model: sequelize.models.Client,
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: sequelize.models.DocumentTemplate,
          attributes: ['id', 'name', 'templateType']
        }
      ],
      order: [['generatedAt', 'DESC']]
    });
  };

  /**
   * Estadísticas de documentos generados
   */
  GeneratedDocumentHistory.getStatistics = async function(filters = {}) {
    const where = {};
    
    if (filters.clientId) {
      where.clientId = filters.clientId;
    }
    
    if (filters.startDate) {
      where.generatedAt = {
        [sequelize.Sequelize.Op.gte]: filters.startDate
      };
    }
    
    if (filters.endDate) {
      if (where.generatedAt) {
        where.generatedAt[sequelize.Sequelize.Op.lte] = filters.endDate;
      } else {
        where.generatedAt = {
          [sequelize.Sequelize.Op.lte]: filters.endDate
        };
      }
    }
    
    const stats = await this.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    return {
      byStatus: stats,
      total: stats.reduce((sum, stat) => sum + parseInt(stat.count), 0)
    };
  };

  return GeneratedDocumentHistory;
};