// backend/src/controllers/ticketType.controller.js
const db = require("../models");
const TicketType = db.TicketType;

// Obtener todos los tipos de ticket
exports.getAllTypes = async (req, res) => {
  try {
    const { category, active } = req.query;

    const where = {};
    if (category) where.category = category;
    if (active !== undefined) where.active = active === 'true';

    const types = await TicketType.findAll({
      where,
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error("Error obteniendo tipos de ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener tipos de ticket",
      error: error.message
    });
  }
};

// Obtener tipo de ticket por ID
exports.getTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const type = await TicketType.findByPk(id);

    if (!type) {
      return res.status(404).json({
        success: false,
        message: `Tipo de ticket con ID ${id} no encontrado`
      });
    }

    return res.status(200).json({
      success: true,
      data: type
    });
  } catch (error) {
    console.error("Error obteniendo tipo de ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener tipo de ticket",
      error: error.message
    });
  }
};

// Crear nuevo tipo de ticket
exports.createType = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      estimatedDurationHours,
      requiresMaterials,
      active
    } = req.body;

    // Validaciones
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "El nombre y la categoría son obligatorios"
      });
    }

    // Verificar categoría válida
    const validCategories = ['installation', 'support', 'maintenance'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}`
      });
    }

    const type = await TicketType.create({
      name,
      description,
      category,
      estimatedDurationHours: estimatedDurationHours || 2,
      requiresMaterials: requiresMaterials !== undefined ? requiresMaterials : false,
      active: active !== undefined ? active : true
    });

    return res.status(201).json({
      success: true,
      message: "Tipo de ticket creado exitosamente",
      data: type
    });
  } catch (error) {
    console.error("Error creando tipo de ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear tipo de ticket",
      error: error.message
    });
  }
};

// Actualizar tipo de ticket
exports.updateType = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      estimatedDurationHours,
      requiresMaterials,
      active
    } = req.body;

    const type = await TicketType.findByPk(id);

    if (!type) {
      return res.status(404).json({
        success: false,
        message: `Tipo de ticket con ID ${id} no encontrado`
      });
    }

    // Validar categoría si se proporciona
    if (category) {
      const validCategories = ['installation', 'support', 'maintenance'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}`
        });
      }
    }

    await type.update({
      name: name || type.name,
      description: description !== undefined ? description : type.description,
      category: category || type.category,
      estimatedDurationHours: estimatedDurationHours !== undefined ? estimatedDurationHours : type.estimatedDurationHours,
      requiresMaterials: requiresMaterials !== undefined ? requiresMaterials : type.requiresMaterials,
      active: active !== undefined ? active : type.active
    });

    return res.status(200).json({
      success: true,
      message: "Tipo de ticket actualizado exitosamente",
      data: type
    });
  } catch (error) {
    console.error("Error actualizando tipo de ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar tipo de ticket",
      error: error.message
    });
  }
};

// Eliminar tipo de ticket
exports.deleteType = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;

    const type = await TicketType.findByPk(id);

    if (!type) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Tipo de ticket con ID ${id} no encontrado`
      });
    }

    // Verificar si hay tickets usando este tipo
    const ticketsCount = await db.Ticket.count({
      where: { typeId: id }
    });

    if (ticketsCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el tipo porque tiene ${ticketsCount} ticket(s) asociado(s). Considere desactivarlo en su lugar.`
      });
    }

    await type.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Tipo de ticket eliminado exitosamente"
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error eliminando tipo de ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar tipo de ticket",
      error: error.message
    });
  }
};
