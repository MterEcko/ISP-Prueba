const axios = require('axios');
const db = require('../models');

const n8nService = {
  // Configuración de n8n
  n8nUrl: process.env.N8N_URL || 'http://localhost:5678',
  n8nApiKey: process.env.N8N_API_KEY || '',

  /**
   * Trigger workflow en n8n
   */
  async triggerWorkflow(triggerType, data) {
    try {
      // Buscar workflows activos para este trigger
      const workflows = await db.N8nWorkflow.findAll({
        where: {
          triggerType,
          isActive: true
        }
      });

      const results = [];

      for (const workflow of workflows) {
        try {
          // Verificar si cumple condiciones del trigger
          if (!this.matchesTriggerConditions(workflow.triggerConfig, data)) {
            continue;
          }

          // Enviar a n8n
          const result = await this.executeWebhook(workflow.webhookUrl, data);

          // Actualizar estadísticas
          await workflow.update({
            executionCount: workflow.executionCount + 1,
            lastExecutedAt: new Date(),
            lastError: null
          });

          results.push({
            workflowId: workflow.id,
            success: true,
            result
          });
        } catch (error) {
          // Guardar error
          await workflow.update({
            lastError: error.message
          });

          results.push({
            workflowId: workflow.id,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error triggering n8n workflows:', error);
      throw error;
    }
  },

  /**
   * Ejecutar webhook de n8n
   */
  async executeWebhook(webhookUrl, data) {
    if (!webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    try {
      const response = await axios.post(webhookUrl, data, {
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.n8nApiKey
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('Error executing webhook:', error);
      throw error;
    }
  },

  /**
   * Verificar si los datos cumplen las condiciones del trigger
   */
  matchesTriggerConditions(config, data) {
    if (!config || Object.keys(config).length === 0) {
      return true; // Sin condiciones, siempre ejecutar
    }

    // Filtros básicos
    if (config.filters) {
      for (const [key, value] of Object.entries(config.filters)) {
        if (data[key] !== value) {
          return false;
        }
      }
    }

    return true;
  },

  /**
   * Test connection to n8n
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.n8nUrl}/healthz`, {
        timeout: 5000
      });

      return {
        success: true,
        status: response.status,
        message: 'Connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  },

  /**
   * Get n8n workflow by ID
   */
  async getN8nWorkflow(workflowId) {
    try {
      const response = await axios.get(
        `${this.n8nUrl}/api/v1/workflows/${workflowId}`,
        {
          headers: {
            'X-N8N-API-KEY': this.n8nApiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting n8n workflow:', error);
      throw error;
    }
  },

  /**
   * Triggers específicos para eventos del sistema
   */

  async onClientCreated(client) {
    return await this.triggerWorkflow('client_created', {
      event: 'client_created',
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        createdAt: client.createdAt
      },
      timestamp: new Date().toISOString()
    });
  },

  async onClientUpdated(client, changes) {
    return await this.triggerWorkflow('client_updated', {
      event: 'client_updated',
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email
      },
      changes,
      timestamp: new Date().toISOString()
    });
  },

  async onTicketCreated(ticket) {
    return await this.triggerWorkflow('ticket_created', {
      event: 'ticket_created',
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        clientId: ticket.clientId,
        assignedToId: ticket.assignedToId,
        createdAt: ticket.createdAt
      },
      timestamp: new Date().toISOString()
    });
  },

  async onTicketUpdated(ticket, changes) {
    return await this.triggerWorkflow('ticket_updated', {
      event: 'ticket_updated',
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority
      },
      changes,
      timestamp: new Date().toISOString()
    });
  },

  async onInvoiceCreated(invoice) {
    return await this.triggerWorkflow('invoice_created', {
      event: 'invoice_created',
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId,
        totalAmount: invoice.totalAmount,
        dueDate: invoice.dueDate,
        status: invoice.status,
        createdAt: invoice.createdAt
      },
      timestamp: new Date().toISOString()
    });
  },

  async onInvoiceOverdue(invoice) {
    return await this.triggerWorkflow('invoice_overdue', {
      event: 'invoice_overdue',
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId,
        totalAmount: invoice.totalAmount,
        dueDate: invoice.dueDate,
        daysPastDue: Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))
      },
      timestamp: new Date().toISOString()
    });
  },

  async onPaymentReceived(payment) {
    return await this.triggerWorkflow('payment_received', {
      event: 'payment_received',
      payment: {
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        clientId: payment.clientId,
        invoiceId: payment.invoiceId,
        createdAt: payment.createdAt
      },
      timestamp: new Date().toISOString()
    });
  },

  async onServiceActivated(subscription) {
    return await this.triggerWorkflow('service_activated', {
      event: 'service_activated',
      subscription: {
        id: subscription.id,
        clientId: subscription.clientId,
        servicePackageId: subscription.servicePackageId,
        status: subscription.status,
        activatedAt: new Date()
      },
      timestamp: new Date().toISOString()
    });
  },

  async onServiceSuspended(subscription, reason) {
    return await this.triggerWorkflow('service_suspended', {
      event: 'service_suspended',
      subscription: {
        id: subscription.id,
        clientId: subscription.clientId,
        servicePackageId: subscription.servicePackageId,
        status: subscription.status,
        reason
      },
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = n8nService;
