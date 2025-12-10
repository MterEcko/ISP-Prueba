// backend/src/controllers/clientSupport.controller.js
// Controlador para historial de soporte a clientes

const db = require('../models');

exports.createSupportRecord = async (req, res) => {
  try {
    const {
      clientId,
      ticketId,
      supportType,
      category,
      description,
      handledBy,
      resolution
    } = req.body;

    if (!clientId || !supportType) {
      return res.status(400).json({
        message: 'clientId y supportType son requeridos'
      });
    }

    const supportRecord = await db.ClientSupport.create({
      clientId,
      ticketId,
      supportType,
      category: category || 'general',
      description,
      handledBy,
      resolution,
      status: 'open'
    });

    return res.status(201).json({
      message: 'Registro de soporte creado correctamente',
      supportRecord
    });

  } catch (error) {
    console.error('Error creating support record:', error);
    return res.status(500).json({
      message: 'Error creando registro de soporte',
      error: error.message
    });
  }
};

exports.getAllSupportRecords = async (req, res) => {
  try {
    const { clientId, status, category, supportType } = req.query;

    let where = {};

    if (clientId) {
      where.clientId = clientId;
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (supportType) {
      where.supportType = supportType;
    }

    const supportRecords = await db.ClientSupport.findAll({
      where,
      include: [
        {
          model: db.Client,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: db.Ticket,
          as: 'ticket',
          attributes: ['id', 'title', 'status', 'priority']
        },
        {
          model: db.User,
          as: 'handler',
          attributes: ['id', 'fullName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      supportRecords,
      count: supportRecords.length
    });

  } catch (error) {
    console.error('Error fetching support records:', error);
    return res.status(500).json({
      message: 'Error obteniendo registros de soporte',
      error: error.message
    });
  }
};

exports.getSupportById = async (req, res) => {
  try {
    const { id } = req.params;

    const supportRecord = await db.ClientSupport.findByPk(id, {
      include: [
        {
          model: db.Client,
          as: 'client'
        },
        {
          model: db.Ticket,
          as: 'ticket'
        },
        {
          model: db.User,
          as: 'handler'
        }
      ]
    });

    if (!supportRecord) {
      return res.status(404).json({
        message: 'Registro de soporte no encontrado'
      });
    }

    return res.status(200).json(supportRecord);

  } catch (error) {
    console.error('Error fetching support record:', error);
    return res.status(500).json({
      message: 'Error obteniendo registro de soporte',
      error: error.message
    });
  }
};

exports.updateSupportRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const supportRecord = await db.ClientSupport.findByPk(id);

    if (!supportRecord) {
      return res.status(404).json({
        message: 'Registro de soporte no encontrado'
      });
    }

    // Si se resuelve, actualizar fecha de resolución
    if (updates.status === 'resolved' && !supportRecord.resolvedDate) {
      updates.resolvedDate = new Date();
    }

    await supportRecord.update(updates);

    return res.status(200).json({
      message: 'Registro de soporte actualizado correctamente',
      supportRecord
    });

  } catch (error) {
    console.error('Error updating support record:', error);
    return res.status(500).json({
      message: 'Error actualizando registro de soporte',
      error: error.message
    });
  }
};

exports.deleteSupportRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const supportRecord = await db.ClientSupport.findByPk(id);

    if (!supportRecord) {
      return res.status(404).json({
        message: 'Registro de soporte no encontrado'
      });
    }

    await supportRecord.destroy();

    return res.status(200).json({
      message: 'Registro de soporte eliminado correctamente'
    });

  } catch (error) {
    console.error('Error deleting support record:', error);
    return res.status(500).json({
      message: 'Error eliminando registro de soporte',
      error: error.message
    });
  }
};

exports.getClientSupportHistory = async (req, res) => {
  try {
    const { clientId } = req.params;

    const supportHistory = await db.ClientSupport.findAll({
      where: { clientId },
      include: [
        {
          model: db.Ticket,
          as: 'ticket'
        },
        {
          model: db.User,
          as: 'handler'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Estadísticas
    const stats = {
      total: supportHistory.length,
      byType: {},
      byCategory: {},
      byStatus: {}
    };

    supportHistory.forEach(record => {
      // Por tipo
      stats.byType[record.supportType] = (stats.byType[record.supportType] || 0) + 1;

      // Por categoría
      stats.byCategory[record.category] = (stats.byCategory[record.category] || 0) + 1;

      // Por estado
      stats.byStatus[record.status] = (stats.byStatus[record.status] || 0) + 1;
    });

    return res.status(200).json({
      supportHistory,
      stats
    });

  } catch (error) {
    console.error('Error fetching client support history:', error);
    return res.status(500).json({
      message: 'Error obteniendo historial de soporte',
      error: error.message
    });
  }
};

exports.resolveSupportRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, resolvedBy } = req.body;

    const supportRecord = await db.ClientSupport.findByPk(id);

    if (!supportRecord) {
      return res.status(404).json({
        message: 'Registro de soporte no encontrado'
      });
    }

    if (supportRecord.status === 'resolved') {
      return res.status(400).json({
        message: 'El registro ya está resuelto'
      });
    }

    await supportRecord.update({
      status: 'resolved',
      resolution,
      resolvedDate: new Date(),
      resolvedBy
    });

    return res.status(200).json({
      message: 'Registro de soporte resuelto correctamente',
      supportRecord
    });

  } catch (error) {
    console.error('Error resolving support record:', error);
    return res.status(500).json({
      message: 'Error resolviendo registro de soporte',
      error: error.message
    });
  }
};
