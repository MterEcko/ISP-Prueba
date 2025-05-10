const db = require('../models');
const TicketComment = db.TicketComment;
const Ticket = db.Ticket;
const User = db.User;

// Agregar un comentario a un ticket
exports.addComment = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const { content, isInternal } = req.body;
    
    // Verificar si existe el ticket
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) {
      return res.status(404).json({
        message: `Ticket con ID ${ticketId} no encontrado`
      });
    }
    
    // Verificar que se proporcionó el contenido
    if (!content) {
      return res.status(400).json({
        message: "El contenido del comentario es obligatorio"
      });
    }
    
    // Crear comentario
    const comment = await TicketComment.create({
      content,
      isInternal: isInternal || false,
      ticketId,
      userId: req.userId // Usuario autenticado que crea el comentario
    });
    
    // Obtener comentario con información del usuario
    const commentWithUser = await TicketComment.findByPk(comment.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'fullName']
      }]
    });
    
    return res.status(201).json({
      message: "Comentario agregado exitosamente",
      comment: commentWithUser
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al agregar el comentario",
      error: error.message
    });
  }
};

// Obtener todos los comentarios de un ticket
exports.getComments = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    
    // Verificar si existe el ticket
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) {
      return res.status(404).json({
        message: `Ticket con ID ${ticketId} no encontrado`
      });
    }
    
    // Obtener comentarios
    const comments = await TicketComment.findAll({
      where: { ticketId },
      include: [{
        model: User,
        attributes: ['id', 'username', 'fullName']
      }],
      order: [['createdAt', 'ASC']]
    });
    
    return res.json(comments);
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener los comentarios",
      error: error.message
    });
  }
};

// Actualizar un comentario
exports.updateComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const { content, isInternal } = req.body;
    
    // Verificar si existe el comentario
    const comment = await TicketComment.findByPk(commentId);
    
    if (!comment) {
      return res.status(404).json({
        message: `Comentario con ID ${commentId} no encontrado`
      });
    }
    
    // Verificar si el usuario es el propietario del comentario
    if (comment.userId !== req.userId) {
      return res.status(403).json({
        message: "No está autorizado para modificar este comentario"
      });
    }
    
    // Actualizar comentario
    const updateData = {};
    if (content) updateData.content = content;
    if (isInternal !== undefined) updateData.isInternal = isInternal;
    
    await comment.update(updateData);
    
    // Obtener comentario actualizado con información del usuario
    const updatedComment = await TicketComment.findByPk(commentId, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'fullName']
      }]
    });
    
    return res.json({
      message: "Comentario actualizado exitosamente",
      comment: updatedComment
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al actualizar el comentario",
      error: error.message
    });
  }
};

// Eliminar un comentario
exports.deleteComment = async (req, res) => {
  try {
    const commentId = req.params.commentId;
    
    // Verificar si existe el comentario
    const comment = await TicketComment.findByPk(commentId);
    
    if (!comment) {
      return res.status(404).json({
        message: `Comentario con ID ${commentId} no encontrado`
      });
    }
    
    // Verificar si el usuario es el propietario del comentario
    if (comment.userId !== req.userId) {
      return res.status(403).json({
        message: "No está autorizado para eliminar este comentario"
      });
    }
    
    // Eliminar comentario
    await comment.destroy();
    
    return res.json({
      message: "Comentario eliminado exitosamente"
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al eliminar el comentario",
      error: error.message
    });
  }
};