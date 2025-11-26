// backend/src/controllers/ticketAttachment.controller.js
const db = require("../models");
const TicketAttachment = db.TicketAttachment;
const Ticket = db.Ticket;
const fs = require('fs').promises;
const path = require('path');

// Obtener todos los adjuntos de un ticket
exports.getTicketAttachments = async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Verificar que el ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: `Ticket con ID ${ticketId} no encontrado`
      });
    }

    const attachments = await TicketAttachment.findAll({
      where: { ticketId },
      order: [['uploadedAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: attachments
    });
  } catch (error) {
    console.error("Error obteniendo adjuntos del ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener adjuntos del ticket",
      error: error.message
    });
  }
};

// Obtener adjunto por ID
exports.getAttachmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await TicketAttachment.findByPk(id, {
      include: [
        {
          model: Ticket,
          as: 'ticket',
          attributes: ['id', 'title', 'status']
        }
      ]
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: `Adjunto con ID ${id} no encontrado`
      });
    }

    return res.status(200).json({
      success: true,
      data: attachment
    });
  } catch (error) {
    console.error("Error obteniendo adjunto:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener adjunto",
      error: error.message
    });
  }
};

// Crear nuevo adjunto (upload de archivo)
exports.createAttachment = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { description, attachmentType } = req.body;

    // Verificar que el ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: `Ticket con ID ${ticketId} no encontrado`
      });
    }

    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No se ha proporcionado ningún archivo"
      });
    }

    // Validar tipo de adjunto
    const validTypes = ['photo', 'document', 'video'];
    if (attachmentType && !validTypes.includes(attachmentType)) {
      return res.status(400).json({
        success: false,
        message: `Tipo de adjunto inválido. Debe ser uno de: ${validTypes.join(', ')}`
      });
    }

    // Determinar tipo de adjunto si no se proporciona
    let type = attachmentType;
    if (!type) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        type = 'photo';
      } else if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) {
        type = 'video';
      } else {
        type = 'document';
      }
    }

    const attachment = await TicketAttachment.create({
      ticketId,
      filename: req.file.originalname,
      filePath: req.file.path,
      attachmentType: type,
      description: description || null
    });

    return res.status(201).json({
      success: true,
      message: "Adjunto creado exitosamente",
      data: attachment
    });
  } catch (error) {
    console.error("Error creando adjunto:", error);
    // Si hay error, intentar eliminar el archivo subido
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Error eliminando archivo:", unlinkError);
      }
    }
    return res.status(500).json({
      success: false,
      message: "Error al crear adjunto",
      error: error.message
    });
  }
};

// Actualizar descripción de adjunto
exports.updateAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    const attachment = await TicketAttachment.findByPk(id);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: `Adjunto con ID ${id} no encontrado`
      });
    }

    await attachment.update({
      description: description !== undefined ? description : attachment.description
    });

    return res.status(200).json({
      success: true,
      message: "Adjunto actualizado exitosamente",
      data: attachment
    });
  } catch (error) {
    console.error("Error actualizando adjunto:", error);
    return res.status(500).json({
      success: false,
      message: "Error al actualizar adjunto",
      error: error.message
    });
  }
};

// Eliminar adjunto
exports.deleteAttachment = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;

    const attachment = await TicketAttachment.findByPk(id);

    if (!attachment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Adjunto con ID ${id} no encontrado`
      });
    }

    // Guardar la ruta del archivo antes de eliminar el registro
    const filePath = attachment.filePath;

    // Eliminar registro de la base de datos
    await attachment.destroy({ transaction });

    await transaction.commit();

    // Intentar eliminar el archivo físico
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      console.error("Error eliminando archivo físico:", unlinkError);
      // No fallar la operación si no se puede eliminar el archivo
    }

    return res.status(200).json({
      success: true,
      message: "Adjunto eliminado exitosamente"
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error eliminando adjunto:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar adjunto",
      error: error.message
    });
  }
};

// Descargar adjunto
exports.downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await TicketAttachment.findByPk(id);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: `Adjunto con ID ${id} no encontrado`
      });
    }

    // Verificar que el archivo existe
    try {
      await fs.access(attachment.filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: "El archivo no existe en el servidor"
      });
    }

    // Enviar archivo
    return res.download(attachment.filePath, attachment.filename, (err) => {
      if (err) {
        console.error("Error descargando archivo:", err);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: "Error al descargar archivo"
          });
        }
      }
    });
  } catch (error) {
    console.error("Error en downloadAttachment:", error);
    return res.status(500).json({
      success: false,
      message: "Error al descargar adjunto",
      error: error.message
    });
  }
};
