const db = require('../models');
const ClientBilling = db.ClientBilling;
const Client = db.Client;
const ServicePackage = db.ServicePackage;
const IpPool = db.IpPool;
const Invoice = db.Invoice;              // Agregar
const Payment = db.Payment;              // Agregar
const logger = require('../utils/logger');

// Get all client billings
exports.getAllClientBillings = async (req, res) => {
  try {
    const clientBillings = await ClientBilling.findAll({
      include: [
        { model: Client, as: 'client' },
        { model: ServicePackage, as: 'ServicePackage' },
        { model: IpPool }
      ],
      order: [['nextDueDate', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: clientBillings,
      message: 'Client billings retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving client billings: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving client billings'
    });
  }
};

// Get client billing by ID
exports.getClientBillingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Client billing ID is required'
      });
    }
    
    const clientBilling = await ClientBilling.findByPk(id, {
      include: [
        { model: Client, as: 'client' },
        { model: servicePackage, as: 'servicePackage' },
        { model: IpPool, as: 'currentPool' }
      ]
    });
    
    if (!clientBilling) {
      return res.status(404).json({
        success: false,
        message: 'Client billing not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: clientBilling,
      message: 'Client billing retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving client billing: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving client billing'
    });
  }
};

// Get client billing by client ID
exports.getClientBillingByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }
    
    const clientBilling = await ClientBilling.findOne({
      where: { clientId: clientId },
      include: [
        { model: Client, as: 'client' },
        { model: servicePackage, as: 'servicePackage' },
        { model: IpPool, as: 'currentPool' }
      ]
    });
    
    if (!clientBilling) {
      return res.status(404).json({
        success: false,
        message: 'Client billing not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: clientBilling,
      message: 'Client billing retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving client billing: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving client billing'
    });
  }
};

// Create a new client billing
exports.createClientBilling = async (req, res) => {
  try {
    const { 
      clientId, 
      servicePackageId, 
      currentIpPoolId, 
      clientStatus, 
      billingDay, 
      lastPaymentDate, 
      nextDueDate, 
      monthlyFee, 
      paymentMethod, 
      graceDays, 
      penaltyFee 
    } = req.body;
    
    if (!clientId || !servicePackageId || !currentIpPoolId || !billingDay) {
      return res.status(400).json({
        success: false,
        message: 'Client ID, service package ID, IP pool ID, and billing day are required'
      });
    }
    
    // Check if client exists
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Check if service package exists
    const servicePackage = await servicePackage.findByPk(servicePackageId);
    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        message: 'Service package not found'
      });
    }
    
    // Check if IP pool exists
    const ipPool = await IpPool.findByPk(currentIpPoolId);
    if (!ipPool) {
      return res.status(404).json({
        success: false,
        message: 'IP pool not found'
      });
    }
    
    // Check if client already has a billing record
    const existingBilling = await ClientBilling.findOne({
      where: { clientId }
    });
    
    if (existingBilling) {
      return res.status(400).json({
        success: false,
        message: 'Client already has a billing record'
      });
    }
    
    const newClientBilling = await ClientBilling.create({
      clientId,
      servicePackageId,
      currentIpPoolId,
      clientStatus: clientStatus || 'active',
      billingDay,
      lastPaymentDate: lastPaymentDate || new Date(),
      nextDueDate: nextDueDate || null,
      monthlyFee: monthlyFee || servicePackage.price,
      paymentMethod: paymentMethod || 'cash',
      graceDays: graceDays || 3,
      penaltyFee: penaltyFee || 0
    });
    
    return res.status(201).json({
      success: true,
      data: newClientBilling,
      message: 'Client billing created successfully'
    });
  } catch (error) {
    logger.error(`Error creating client billing: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error creating client billing'
    });
  }
};

// Update a client billing
exports.updateClientBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      servicePackageId, 
      currentIpPoolId, 
      clientStatus, 
      billingDay, 
      lastPaymentDate, 
      nextDueDate, 
      monthlyFee, 
      paymentMethod, 
      graceDays, 
      penaltyFee 
    } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Client billing ID is required'
      });
    }
    
    const clientBilling = await ClientBilling.findByPk(id);
    
    if (!clientBilling) {
      return res.status(404).json({
        success: false,
        message: 'Client billing not found'
      });
    }
    
    // If service package is being changed, check if it exists
    if (servicePackageId && servicePackageId !== clientBilling.servicePackageId) {
      const servicePackage = await servicePackage.findByPk(servicePackageId);
      if (!servicePackage) {
        return res.status(404).json({
          success: false,
          message: 'Service package not found'
        });
      }
    }
    
    // If IP pool is being changed, check if it exists
    if (currentIpPoolId && currentIpPoolId !== clientBilling.currentIpPoolId) {
      const ipPool = await IpPool.findByPk(currentIpPoolId);
      if (!ipPool) {
        return res.status(404).json({
          success: false,
          message: 'IP pool not found'
        });
      }
    }
    
    await clientBilling.update({
      servicePackageId: servicePackageId || clientBilling.servicePackageId,
      currentIpPoolId: currentIpPoolId || clientBilling.currentIpPoolId,
      clientStatus: clientStatus || clientBilling.clientStatus,
      billingDay: billingDay || clientBilling.billingDay,
      lastPaymentDate: lastPaymentDate || clientBilling.lastPaymentDate,
      nextDueDate: nextDueDate || clientBilling.nextDueDate,
      monthlyFee: monthlyFee || clientBilling.monthlyFee,
      paymentMethod: paymentMethod || clientBilling.paymentMethod,
      graceDays: graceDays !== undefined ? graceDays : clientBilling.graceDays,
      penaltyFee: penaltyFee !== undefined ? penaltyFee : clientBilling.penaltyFee
    });
    
    return res.status(200).json({
      success: true,
      data: clientBilling,
      message: 'Client billing updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating client billing: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating client billing'
    });
  }
};

// Delete a client billing
exports.deleteClientBilling = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Client billing ID is required'
      });
    }
    
    const clientBilling = await ClientBilling.findByPk(id);
    
    if (!clientBilling) {
      return res.status(404).json({
        success: false,
        message: 'Client billing not found'
      });
    }
    
    await clientBilling.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Client billing deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting client billing: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error deleting client billing'
    });
  }
};

// Calculate monthly billing for a client
exports.calculateMonthlyBilling = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }
    
    const clientBilling = await ClientBilling.findOne({
      where: { clientId: clientId },
      include: [
        { model: servicePackage, as: 'servicePackage' }
      ]
    });
    
    if (!clientBilling) {
      return res.status(404).json({
        success: false,
        message: 'Client billing not found'
      });
    }
    
    // Calculate billing details
    const result = {
      clientId: clientId,
      monthlyFee: clientBilling.monthlyFee,
      servicePackage: clientBilling.servicePackage.name,
      billingDay: clientBilling.billingDay,
      nextDueDate: clientBilling.nextDueDate,
      paymentMethod: clientBilling.paymentMethod,
      graceDays: clientBilling.graceDays,
      penaltyFee: clientBilling.penaltyFee,
      total_due: clientBilling.monthlyFee
    };
    
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Monthly billing calculated successfully'
    });
  } catch (error) {
    logger.error(`Error calculating monthly billing: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error calculating monthly billing'
    });
  }
};

// Process billing for all clients
exports.processAllClientsBilling = async (req, res) => {
  try {
    const { date } = req.body;
    const processDate = date ? new Date(date) : new Date();
    
    const clientBillings = await ClientBilling.findAll({
      include: [
        { model: Client, as: 'client' },
        { model: servicePackage, as: 'servicePackage' }
      ]
    });
    
    const results = [];
    
    for (const billing of clientBillings) {
      // Check if today is billing day
      if (billing.billingDay === processDate.getDate()) {
        // Calculate next due date
        const nextDueDate = new Date(processDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        
        await billing.update({
          nextDueDate: nextDueDate
        });
        
        results.push({
          clientId: billing.clientId,
          clientName: `${billing.client.firstName} ${billing.client.lastName}`,
          servicePackage: billing.servicePackage.name,
          monthlyFee: billing.monthlyFee,
          nextDueDate: nextDueDate,
          status: 'processed'
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        processedCount: results.length,
        processedClients: results
      },
      message: 'All clients billing processed successfully'
    });
  } catch (error) {
    logger.error(`Error processing all clients billing: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error processing all clients billing'
    });
  }
};

// Generate invoice for a client
exports.generateInvoice = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { period } = req.body;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }
    
    if (!period) {
      return res.status(400).json({
        success: false,
        message: 'Period is required'
      });
    }
    
    const clientBilling = await ClientBilling.findOne({
      where: { clientId: clientId },
      include: [
        { model: Client, as: 'client' },
        { model: servicePackage, as: 'servicePackage' }
      ]
    });
    
    if (!clientBilling) {
      return res.status(404).json({
        success: false,
        message: 'Client billing not found'
      });
    }
    
    // Generate invoice
    const invoice = await db.invoice.create({
      clientId: clientId,
      amount: clientBilling.monthlyFee,
      period,
      status: 'pending',
      dueDate: clientBilling.nextDueDate,
      createdAt: new Date()
    });
    
    return res.status(200).json({
      success: true,
      data: {
        invoice,
        client: clientBilling.client,
        servicePackage: clientBilling.servicePackage
      },
      message: 'Invoice generated successfully'
    });
  } catch (error) {
    logger.error(`Error generating invoice: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error generating invoice'
    });
  }
};

// Update client status
exports.updateClientStatus = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status } = req.body;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const clientBilling = await ClientBilling.findOne({
      where: { clientId: clientId }
    });
    
    if (!clientBilling) {
      return res.status(404).json({
        success: false,
        message: 'Client billing not found'
      });
    }
    
    await clientBilling.update({
      clientStatus: status
    });
    
    return res.status(200).json({
      success: true,
      data: clientBilling,
      message: 'Client status updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating client status: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating client status'
    });
  }
};

// Register payment for a client
exports.registerPayment = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { amount, paymentMethod, paymentDate, reference } = req.body;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }
    
    const clientBilling = await ClientBilling.findOne({
      where: { clientId: clientId }
    });
    
    if (!clientBilling) {
      return res.status(404).json({
        success: false,
        message: 'Client billing not found'
      });
    }
    
    // Register payment
    const payment = await db.payment.create({
      clientId: clientId,
      amount,
      paymentMethod: paymentMethod || 'cash',
      payment_date: paymentDate || new Date(),
      reference,
      status: 'completed'
    });
    
    // Update client billing
    await clientBilling.update({
      lastPaymentDate: paymentDate || new Date()
    });
    
    return res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment registered successfully'
    });
  } catch (error) {
    logger.error(`Error registering payment: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error registering payment'
    });
  }
};

// Get clients with overdue payments
exports.getOverdueClients = async (req, res) => {
  try {
    const today = new Date();
    
    const overdueClients = await ClientBilling.findAll({
      where: {
        nextDueDate: {
          [db.Sequelize.Op.lt]: today
        },
        clientStatus: 'active'
      },
      include: [
        { model: Client, as: 'client' },
        { model: servicePackage, as: 'servicePackage' }
      ]
    });
    
    return res.status(200).json({
      success: true,
      data: overdueClients,
      message: 'Overdue clients retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving overdue clients: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving overdue clients'
    });
  }
};

// Get clients with upcoming payments
exports.getUpcomingPayments = async (req, res) => {
  try {
    const { days } = req.query;
    const daysAhead = days ? parseInt(days) : 7;
    
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    
    const upcomingPayments = await ClientBilling.findAll({
      where: {
        nextDueDate: {
          [db.Sequelize.Op.between]: [today, futureDate]
        },
        clientStatus: 'active'
      },
      include: [
        { model: Client, as: 'client' },
        { model: servicePackage, as: 'servicePackage' }
      ]
    });
    
    return res.status(200).json({
      success: true,
      data: upcomingPayments,
      message: 'Upcoming payments retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving upcoming payments: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving upcoming payments'
    });
  }
};

// Apply late payment penalty
exports.applyLatePaymentPenalty = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }
    
    const clientBilling = await ClientBilling.findOne({
      where: { clientId: clientId }
    });
    
    if (!clientBilling) {
      return res.status(404).json({
        success: false,
        message: 'Client billing not found'
      });
    }
    
    // Check if payment is late
    const today = new Date();
    if (clientBilling.nextDueDate >= today) {
      return res.status(400).json({
        success: false,
        message: 'Payment is not late yet'
      });
    }
    
    // Apply penalty
    const penalty = clientBilling.penaltyFee > 0 ? 
      clientBilling.penaltyFee : 
      (clientBilling.monthlyFee * 0.05); // Default 5% penalty
    
    // Create penalty invoice
    const invoice = await db.invoice.create({
      clientId: clientId,
      amount: penalty,
      period: `Late payment penalty - ${today.toISOString().split('T')[0]}`,
      status: 'pending',
      due_date: today,
      createdAt: today
    });
    
    return res.status(200).json({
      success: true,
      data: {
        invoice,
        penalty_amount: penalty
      },
      message: 'Late payment penalty applied successfully'
    });
  } catch (error) {
    logger.error(`Error applying late payment penalty: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error applying late payment penalty'
    });
  }
};

// Get billing statistics
exports.getBillingStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get total clients
    const totalClients = await ClientBilling.count();
    
    // Get active clients
    const activeClients = await ClientBilling.count({
      where: { clientStatus: 'active' }
    });
    
    // Get suspended clients
    const suspendedClients = await ClientBilling.count({
      where: { clientStatus: 'suspended' }
    });
    
    // Get payments in period
    const payments = await db.payment.findAll({
      where: {
        payment_date: {
          [db.Sequelize.Op.between]: [start, end]
        },
        status: 'completed'
      }
    });
    
    // Calculate total revenue
    const totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    // Get invoices in period
    const invoices = await db.invoice.findAll({
      where: {
        createdAt: {
          [db.Sequelize.Op.between]: [start, end]
        }
      }
    });
    
    // Calculate total invoiced
    const totalInvoiced = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount), 0);
    
    // Calculate pending payments
    const pendingInvoices = invoices.filter(invoice => invoice.status === 'pending');
    const pendingAmount = pendingInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount), 0);
    
    return res.status(200).json({
      success: true,
      data: {
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        clients: {
          total: totalClients,
          active: activeClients,
          suspended: suspendedClients
        },
        financial: {
          total_revenue: totalRevenue,
          total_invoiced: totalInvoiced,
          pending_amount: pendingAmount,
          payment_count: payments.length,
          invoice_count: invoices.length
        }
      },
      message: 'Billing statistics retrieved successfully'
    });
  } catch (error) {
    logger.error(`Error retrieving billing statistics: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving billing statistics'
    });
  }
};
