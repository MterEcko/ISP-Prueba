const db = require('../models');
const n8nService = require('../services/n8n.service');

/**
 * Webhook endpoint - Recibe llamadas desde n8n
 */
exports.webhook = async (req, res) => {
  try {
    const { event, action, data } = req.body;

    // Log del webhook
    console.log('n8n webhook received:', { event, action, data });

    // Ejecutar acción según el tipo
    let result;

    switch (action) {
      case 'create_client':
        result = await handleCreateClient(data);
        break;

      case 'update_client':
        result = await handleUpdateClient(data);
        break;

      case 'create_ticket':
        result = await handleCreateTicket(data);
        break;

      case 'update_ticket':
        result = await handleUpdateTicket(data);
        break;

      case 'create_invoice':
        result = await handleCreateInvoice(data);
        break;

      case 'send_notification':
        result = await handleSendNotification(data);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Unknown action: ${action}`
        });
    }

    res.json({
      success: true,
      data: result,
      message: `Action ${action} executed successfully`
    });
  } catch (error) {
    console.error('Error processing n8n webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
};

/**
 * Get all workflows
 */
exports.getWorkflows = async (req, res) => {
  try {
    const workflows = await db.N8nWorkflow.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    console.error('Error getting workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener workflows',
      error: error.message
    });
  }
};

/**
 * Create workflow
 */
exports.createWorkflow = async (req, res) => {
  try {
    const workflow = await db.N8nWorkflow.create(req.body);

    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow creado correctamente'
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(400).json({
      success: false,
      message: 'Error al crear workflow',
      error: error.message
    });
  }
};

/**
 * Update workflow
 */
exports.updateWorkflow = async (req, res) => {
  try {
    const workflow = await db.N8nWorkflow.findByPk(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow no encontrado'
      });
    }

    await workflow.update(req.body);

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow actualizado correctamente'
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(400).json({
      success: false,
      message: 'Error al actualizar workflow',
      error: error.message
    });
  }
};

/**
 * Delete workflow
 */
exports.deleteWorkflow = async (req, res) => {
  try {
    const workflow = await db.N8nWorkflow.findByPk(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow no encontrado'
      });
    }

    await workflow.destroy();

    res.json({
      success: true,
      message: 'Workflow eliminado correctamente'
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar workflow',
      error: error.message
    });
  }
};

/**
 * Test connection to n8n
 */
exports.testConnection = async (req, res) => {
  try {
    const result = await n8nService.testConnection();

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error testing n8n connection:', error);
    res.status(500).json({
      success: false,
      message: 'Error al probar conexión con n8n',
      error: error.message
    });
  }
};

/**
 * Trigger workflow manually
 */
exports.triggerWorkflow = async (req, res) => {
  try {
    const { workflowId, data } = req.body;

    const workflow = await db.N8nWorkflow.findByPk(workflowId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow no encontrado'
      });
    }

    const result = await n8nService.executeWebhook(workflow.webhookUrl, data);

    res.json({
      success: true,
      data: result,
      message: 'Workflow ejecutado correctamente'
    });
  } catch (error) {
    console.error('Error triggering workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Error al ejecutar workflow',
      error: error.message
    });
  }
};

// ===== Action Handlers =====

async function handleCreateClient(data) {
  const client = await db.Client.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    postalCode: data.postalCode
  });

  return {
    clientId: client.id,
    message: 'Cliente creado correctamente'
  };
}

async function handleUpdateClient(data) {
  const client = await db.Client.findByPk(data.clientId);

  if (!client) {
    throw new Error('Cliente no encontrado');
  }

  await client.update(data.updates);

  return {
    clientId: client.id,
    message: 'Cliente actualizado correctamente'
  };
}

async function handleCreateTicket(data) {
  const ticket = await db.Ticket.create({
    title: data.title,
    description: data.description,
    priority: data.priority || 'medium',
    status: data.status || 'open',
    clientId: data.clientId,
    assignedToId: data.assignedToId,
    ticketTypeId: data.ticketTypeId
  });

  return {
    ticketId: ticket.id,
    message: 'Ticket creado correctamente'
  };
}

async function handleUpdateTicket(data) {
  const ticket = await db.Ticket.findByPk(data.ticketId);

  if (!ticket) {
    throw new Error('Ticket no encontrado');
  }

  await ticket.update(data.updates);

  return {
    ticketId: ticket.id,
    message: 'Ticket actualizado correctamente'
  };
}

async function handleCreateInvoice(data) {
  const invoice = await db.Invoice.create({
    clientId: data.clientId,
    totalAmount: data.totalAmount,
    dueDate: data.dueDate,
    status: data.status || 'pending',
    description: data.description
  });

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    message: 'Factura creada correctamente'
  };
}

async function handleSendNotification(data) {
  // Aquí se integraría con el sistema de notificaciones
  // Por ahora solo retorna success
  console.log('Sending notification:', data);

  return {
    message: 'Notificación enviada correctamente'
  };
}
