const db = require('../models');
const Ticket = db.Ticket;
const TicketComment = db.TicketComment;
const User = db.User;
const Client = db.Client;
const Op = db.Sequelize.Op;

// Crear un nuevo ticket
exports.create = async (req, res) => {
  try {
    const { title, description, clientId, priority, category } = req.body;
    
    if (!title || !description || !clientId) {
      return res.status(400).json({
        message: "Los campos título, descripción y cliente son obligatorios"
      });
    }
    
    // El ticket es creado por el usuario actual
    const createdById = req.userId;
    
    // Crear ticket
    const ticket = await Ticket.create({
      title,
      description,
      priority,
      category,
      clientId,
      createdById,
      status: 'open'
    });
    
    // Obtener ticket con información relacionada
    const ticketWithDetails = await Ticket.findByPk(ticket.id, {
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });
    
    return res.status(201).json({
      message: "Ticket creado exitosamente",
      ticket: ticketWithDetails
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al crear el ticket",
      error: error.message
    });
  }
};

// Obtener todos los tickets con filtros
exports.findAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      status, 
      priority, 
      category, 
      clientId, 
      assignedToId,
      search
    } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    const condition = {};
    
    // Aplicar filtros si existen
    if (status) condition.status = status;
    if (priority) condition.priority = priority;
    if (category) condition.category = category;
    if (clientId) condition.clientId = clientId;
    if (assignedToId) condition.assignedToId = assignedToId;
    
    // Búsqueda en título o descripción
    if (search) {
      condition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Obtener tickets
    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'username', 'fullName']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'fullName']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });
    
    return res.json({
      totalItems: count,
      tickets,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener los tickets",
      error: error.message
    });
  }
};

// Obtener un ticket por ID
exports.findOne = async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'username', 'fullName']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'fullName']
        },
        {
          model: TicketComment,
          include: [{
            model: User,
            attributes: ['id', 'username', 'fullName']
          }]
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({
        message: `Ticket con ID ${ticketId} no encontrado`
      });
    }
    
    return res.json(ticket);
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener el ticket",
      error: error.message
    });
  }
};

// Actualizar un ticket
exports.update = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { title, description, status, priority, category, assignedToId } = req.body;
    
    // Verificar si el ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) {
      return res.status(404).json({
        message: `Ticket con ID ${ticketId} no encontrado`
      });
    }
    
    // Actualizar campos
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (category) updateData.category = category;
    if (assignedToId) updateData.assignedToId = assignedToId;
    
    // Actualizar estado y registrar fechas de resolución/cierre
    if (status) {
      updateData.status = status;
      
      if (status === 'resolved' && ticket.status !== 'resolved') {
        updateData.resolvedAt = new Date();
      }
      
      if (status === 'closed' && ticket.status !== 'closed') {
        updateData.closedAt = new Date();
      }
    }
    
    // Actualizar ticket
    await ticket.update(updateData);
    
    // Obtener ticket actualizado con información relacionada
    const updatedTicket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });
    
    return res.json({
      message: "Ticket actualizado exitosamente",
      ticket: updatedTicket
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al actualizar el ticket",
      error: error.message
    });
  }
};

// Eliminar un ticket
exports.delete = async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    // Verificar si el ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) {
      return res.status(404).json({
        message: `Ticket con ID ${ticketId} no encontrado`
      });
    }
    
    // Eliminar ticket
    await ticket.destroy();
    
    return res.json({
      message: "Ticket eliminado exitosamente"
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al eliminar el ticket",
      error: error.message
    });
  }
};