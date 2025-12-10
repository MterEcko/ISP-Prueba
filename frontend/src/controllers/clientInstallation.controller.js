// backend/src/controllers/clientInstallation.controller.js
// Controlador para gestionar instalaciones de clientes

const db = require('../models');

exports.createInstallation = async (req, res) => {
  try {
    const {
      clientId,
      scheduledDate,
      technicianId,
      installationType,
      equipment,
      notes
    } = req.body;

    if (!clientId || !scheduledDate) {
      return res.status(400).json({
        message: 'clientId y scheduledDate son requeridos'
      });
    }

    const installation = await db.ClientInstallation.create({
      clientId,
      scheduledDate,
      technicianId,
      installationType: installationType || 'new',
      status: 'scheduled',
      equipment: equipment ? JSON.stringify(equipment) : null,
      notes
    });

    return res.status(201).json({
      message: 'Instalación programada correctamente',
      installation
    });

  } catch (error) {
    console.error('Error creating installation:', error);
    return res.status(500).json({
      message: 'Error creando instalación',
      error: error.message
    });
  }
};

exports.getAllInstallations = async (req, res) => {
  try {
    const { status, technicianId, startDate, endDate } = req.query;

    let where = {};

    if (status) {
      where.status = status;
    }

    if (technicianId) {
      where.technicianId = technicianId;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) {
        where.scheduledDate[db.Sequelize.Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.scheduledDate[db.Sequelize.Op.lte] = new Date(endDate);
      }
    }

    const installations = await db.ClientInstallation.findAll({
      where,
      include: [
        {
          model: db.Client,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'address']
        },
        {
          model: db.User,
          as: 'technician',
          attributes: ['id', 'fullName', 'email']
        }
      ],
      order: [['scheduledDate', 'ASC']]
    });

    return res.status(200).json({
      installations,
      count: installations.length
    });

  } catch (error) {
    console.error('Error fetching installations:', error);
    return res.status(500).json({
      message: 'Error obteniendo instalaciones',
      error: error.message
    });
  }
};

exports.getInstallationById = async (req, res) => {
  try {
    const { id } = req.params;

    const installation = await db.ClientInstallation.findByPk(id, {
      include: [
        {
          model: db.Client,
          as: 'client'
        },
        {
          model: db.User,
          as: 'technician'
        }
      ]
    });

    if (!installation) {
      return res.status(404).json({
        message: 'Instalación no encontrada'
      });
    }

    return res.status(200).json(installation);

  } catch (error) {
    console.error('Error fetching installation:', error);
    return res.status(500).json({
      message: 'Error obteniendo instalación',
      error: error.message
    });
  }
};

exports.updateInstallation = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const installation = await db.ClientInstallation.findByPk(id);

    if (!installation) {
      return res.status(404).json({
        message: 'Instalación no encontrada'
      });
    }

    // Si se completa la instalación, actualizar fecha
    if (updates.status === 'completed' && !installation.completedDate) {
      updates.completedDate = new Date();
    }

    await installation.update(updates);

    return res.status(200).json({
      message: 'Instalación actualizada correctamente',
      installation
    });

  } catch (error) {
    console.error('Error updating installation:', error);
    return res.status(500).json({
      message: 'Error actualizando instalación',
      error: error.message
    });
  }
};

exports.deleteInstallation = async (req, res) => {
  try {
    const { id } = req.params;

    const installation = await db.ClientInstallation.findByPk(id);

    if (!installation) {
      return res.status(404).json({
        message: 'Instalación no encontrada'
      });
    }

    await installation.destroy();

    return res.status(200).json({
      message: 'Instalación eliminada correctamente'
    });

  } catch (error) {
    console.error('Error deleting installation:', error);
    return res.status(500).json({
      message: 'Error eliminando instalación',
      error: error.message
    });
  }
};

exports.completeInstallation = async (req, res) => {
  try {
    const { id } = req.params;
    const { signalStrength, equipment, photoUrl, notes } = req.body;

    const installation = await db.ClientInstallation.findByPk(id);

    if (!installation) {
      return res.status(404).json({
        message: 'Instalación no encontrada'
      });
    }

    if (installation.status === 'completed') {
      return res.status(400).json({
        message: 'La instalación ya está completada'
      });
    }

    await installation.update({
      status: 'completed',
      completedDate: new Date(),
      signalStrength,
      equipment: equipment ? JSON.stringify(equipment) : installation.equipment,
      photoUrl,
      completionNotes: notes
    });

    return res.status(200).json({
      message: 'Instalación completada correctamente',
      installation
    });

  } catch (error) {
    console.error('Error completing installation:', error);
    return res.status(500).json({
      message: 'Error completando instalación',
      error: error.message
    });
  }
};
