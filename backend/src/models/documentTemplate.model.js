const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DocumentTemplate = sequelize.define('DocumentTemplate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // INFORMACIÓN BÁSICA
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre descriptivo de la plantilla'
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del propósito del documento'
    },
    
    templateType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'templateType',
      comment: 'Tipo de documento: contract, installation, receipt, report'
    },
    
    icon: {
      type: DataTypes.STRING(10),
      defaultValue: '📋',
      comment: 'Emoji o icono para UI'
    },
    
    // CONFIGURACIÓN DE ARCHIVO
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'filePath',
      comment: 'Ruta al archivo HTML de la plantilla'
    },
    
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si la plantilla está activa y visible para la generación'
    },
    
    // CONFIGURACIÓN AVANZADA
    availableVariables: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Lista de variables disponibles para esta plantilla'
    },
    
    config: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Configuración de PDF, márgenes, etc.'
    },
    
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Categoría para agrupación en la UI'
    },

    requiresSignature: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el documento generado requiere una firma'
    },

    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Orden en el que se muestra en la UI'
    },

    // VERSIONAMIENTO
    parentTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'DocumentTemplates',
        key: 'id'
      },
      comment: 'Referencia a la plantilla padre para versionamiento'
    },
    
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'Número de versión de la plantilla'
    },
    
    isActiveVersion: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Indica si esta es la versión activa para generación'
    },
    
    versionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas sobre los cambios en esta versión'
    },
    
    // METADATA
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Datos adicionales de configuración o auditoría'
    },

    // AUDITORÍA
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      field: 'createdBy'
    },
    
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      field: 'updatedBy'
    },

    // ESTADÍSTICAS (CAMPOS AÑADIDOS PARA CORREGIR EL ERROR)
    usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Número de veces que se ha generado un documento con esta plantilla'
    },
    
    lastUsed: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de la última vez que se usó la plantilla'
    }

  }, {
    tableName: 'DocumentTemplates',
    timestamps: true,
    // Se asume la configuración por defecto de Sequelize para timestamps (createdAt, updatedAt)
    // que funciona con CamelCase y resuelve el problema inicial de 'created_at'.
    
    indexes: [
      {
        fields: ['parentTemplateId']
      },
      {
        fields: ['isActiveVersion'],
        where: {
          isActiveVersion: true
        }
      },
      {
        fields: ['templateType', 'enabled']
      }
    ]
  });

  // ASOCIACIONES
  DocumentTemplate.associate = function(models) {
    DocumentTemplate.hasMany(models.DocumentTemplate, {
      as: 'versions',
      foreignKey: 'parentTemplateId'
    });
    
    DocumentTemplate.belongsTo(models.DocumentTemplate, {
      as: 'parentTemplate',
      foreignKey: 'parentTemplateId'
    });

    DocumentTemplate.belongsTo(models.User, {
      as: 'creator',
      foreignKey: 'createdBy'
    });

    DocumentTemplate.belongsTo(models.User, {
      as: 'updater',
      foreignKey: 'updatedBy'
    });
  };
  
  // MÉTODOS DE BÚSQUEDA PERSONALIZADOS
  
  /**
   * Obtiene la versión activa por tipo
   */
  DocumentTemplate.getByType = async function(templateType) {
    return await this.findOne({
      where: { 
        templateType,
        enabled: true,
        isActiveVersion: true 
      },
      order: [['displayOrder', 'ASC']]
    });
  };

  /**
   * Obtiene plantillas por categoría
   */
  DocumentTemplate.getByCategory = async function(category) {
    return await this.findAll({
      where: { 
        category,
        enabled: true,
        isActiveVersion: true 
      },
      order: [['displayOrder', 'ASC'], ['name', 'ASC']]
    });
  };

  /**
   * Busca plantillas con filtros avanzados
   */
  DocumentTemplate.searchTemplates = async function(filters = {}) {
    const where = { isActiveVersion: true };
    
    if (filters.enabled !== undefined) {
      where.enabled = filters.enabled;
    }
    
    if (filters.templateType) {
      where.templateType = filters.templateType;
    }
    
    if (filters.category) {
      where.category = filters.category;
    }
    
    if (filters.requiresSignature !== undefined) {
      where.requiresSignature = filters.requiresSignature;
    }
    
    if (filters.search) {
      where[sequelize.Sequelize.Op.or] = [
        { name: { [sequelize.Sequelize.Op.iLike]: `%${filters.search}%` } },
        { description: { [sequelize.Sequelize.Op.iLike]: `%${filters.search}%` } }
      ];
    }
    
    return await this.findAll({
      where,
      order: filters.sortBy ? [[filters.sortBy, filters.sortOrder || 'ASC']] : [['displayOrder', 'ASC'], ['name', 'ASC']]
    });
  };


  return DocumentTemplate;
};