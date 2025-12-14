const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Customer = sequelize.define('Customer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Información del cliente
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre completo o nombre de la empresa'
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      },
      comment: 'Email del cliente (único)'
    },

    phone: {
      type: DataTypes.STRING,
      comment: 'Teléfono de contacto'
    },

    companyName: {
      type: DataTypes.STRING,
      comment: 'Nombre de la empresa (si aplica)'
    },

    // Relación con paquete
    servicePackageId: {
      type: DataTypes.UUID,
      references: {
        model: 'ServicePackages',
        key: 'id'
      },
      comment: 'Paquete asignado al cliente'
    },

    // Licencia asignada
    licenseKey: {
      type: DataTypes.STRING,
      unique: true,
      comment: 'Clave de licencia generada para el cliente'
    },

    licenseId: {
      type: DataTypes.UUID,
      references: {
        model: 'Licenses',
        key: 'id'
      },
      comment: 'ID de la licencia en la tabla Licenses'
    },

    // Estado
    status: {
      type: DataTypes.ENUM('pending', 'active', 'suspended', 'cancelled'),
      defaultValue: 'pending',
      comment: 'Estado de la cuenta del cliente'
    },

    // Fechas importantes
    registeredAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha de registro'
    },

    licenseSentAt: {
      type: DataTypes.DATE,
      comment: 'Fecha en que se envió la licencia por email'
    },

    lastPaymentAt: {
      type: DataTypes.DATE,
      comment: 'Fecha del último pago'
    },

    nextBillingDate: {
      type: DataTypes.DATE,
      comment: 'Próxima fecha de facturación'
    },

    // Notas y metadata
    notes: {
      type: DataTypes.TEXT,
      comment: 'Notas internas sobre el cliente'
    },

    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Datos adicionales del cliente'
    }
  }, {
    tableName: 'Customers',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['email'] },
      { unique: true, fields: ['licenseKey'], where: { licenseKey: { [sequelize.Sequelize.Op.ne]: null } } },
      { fields: ['status'] },
      { fields: ['servicePackageId'] }
    ]
  });

  Customer.associate = (models) => {
    // Un cliente pertenece a un paquete
    Customer.belongsTo(models.ServicePackage, {
      foreignKey: 'servicePackageId',
      as: 'package'
    });

    // Un cliente tiene una licencia
    Customer.belongsTo(models.License, {
      foreignKey: 'licenseId',
      as: 'license'
    });
  };

  return Customer;
};
