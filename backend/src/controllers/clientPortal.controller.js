const Client = require('../models/client.model');
const Subscription = require('../models/subscription.model');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');
const Ticket = require('../models/ticket.model');
const TicketComment = require('../models/ticketComment.model');
const ServicePackage = require('../models/servicePackage.model');
const User = require('../models/user.model');
const { Op } = require('sequelize');

// Obtener información del dashboard del cliente
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.userId;

    // Buscar el cliente asociado al usuario
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Buscar el cliente
    const client = await Client.findOne({
      where: {
        [Op.or]: [
          { email: user.email },
          { userId: userId }
        ]
      },
      include: [
        {
          model: Subscription,
          as: 'Subscriptions',
          include: [
            {
              model: ServicePackage,
              as: 'ServicePackage'
            }
          ]
        }
      ]
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Obtener última factura
    const lastInvoice = await Invoice.findOne({
      where: { clientId: client.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: ServicePackage,
              as: 'ServicePackage'
            }
          ]
        }
      ]
    });

    // Obtener estado de cuenta (facturas pendientes)
    const pendingInvoices = await Invoice.findAll({
      where: {
        clientId: client.id,
        status: {
          [Op.in]: ['pending', 'overdue']
        }
      },
      order: [['dueDate', 'ASC']]
    });

    const totalPending = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

    // Obtener tickets recientes
    const recentTickets = await Ticket.findAll({
      where: { clientId: client.id },
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'fullName']
        }
      ]
    });

    // Obtener suscripción activa
    const activeSubscription = client.Subscriptions?.find(s => s.status === 'active');

    res.json({
      client: {
        id: client.id,
        fullName: client.fullName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        status: client.status,
        createdAt: client.createdAt
      },
      subscription: activeSubscription ? {
        id: activeSubscription.id,
        package: activeSubscription.ServicePackage,
        status: activeSubscription.status,
        startDate: activeSubscription.startDate,
        endDate: activeSubscription.endDate,
        monthlyFee: activeSubscription.monthlyFee
      } : null,
      accountStatus: {
        status: client.status,
        balance: totalPending,
        pendingInvoicesCount: pendingInvoices.length,
        lastPaymentDate: lastInvoice?.paidDate || null
      },
      lastInvoice: lastInvoice ? {
        id: lastInvoice.id,
        invoiceNumber: lastInvoice.invoiceNumber,
        totalAmount: lastInvoice.totalAmount,
        status: lastInvoice.status,
        dueDate: lastInvoice.dueDate,
        paidDate: lastInvoice.paidDate
      } : null,
      recentTickets: recentTickets.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        assignedTo: t.assignedTo?.fullName || null
      }))
    });
  } catch (error) {
    console.error('Error al obtener dashboard del cliente:', error);
    res.status(500).json({ error: 'Error al obtener dashboard del cliente' });
  }
};

// Obtener facturas del cliente
exports.getInvoices = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const user = await User.findByPk(userId);
    const client = await Client.findOne({
      where: {
        [Op.or]: [
          { email: user.email },
          { userId: userId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const where = { clientId: client.id };

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.issueDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where,
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: ServicePackage,
              as: 'ServicePackage'
            }
          ]
        },
        {
          model: Payment,
          as: 'payments'
        }
      ],
      order: [['issueDate', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      invoices,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
};

// Obtener detalle de una factura
exports.getInvoiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await User.findByPk(userId);
    const client = await Client.findOne({
      where: {
        [Op.or]: [
          { email: user.email },
          { userId: userId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const invoice = await Invoice.findOne({
      where: {
        id: id,
        clientId: client.id
      },
      include: [
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: ServicePackage,
              as: 'ServicePackage'
            }
          ]
        },
        {
          model: Payment,
          as: 'payments'
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error al obtener detalle de factura:', error);
    res.status(500).json({ error: 'Error al obtener detalle de factura' });
  }
};

// Crear ticket de soporte
exports.createTicket = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, priority } = req.body;

    const user = await User.findByPk(userId);
    const client = await Client.findOne({
      where: {
        [Op.or]: [
          { email: user.email },
          { userId: userId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const ticket = await Ticket.create({
      clientId: client.id,
      title,
      description,
      priority: priority || 'medium',
      status: 'open',
      createdById: userId
    });

    const ticketWithDetails = await Ticket.findByPk(ticket.id, {
      include: [
        {
          model: Client,
          attributes: ['id', 'fullName', 'email', 'phone']
        }
      ]
    });

    res.status(201).json({
      message: 'Ticket creado exitosamente',
      ticket: ticketWithDetails
    });
  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).json({ error: 'Error al crear ticket' });
  }
};

// Obtener tickets del cliente
exports.getTickets = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, page = 1, limit = 20 } = req.query;

    const user = await User.findByPk(userId);
    const client = await Client.findOne({
      where: {
        [Op.or]: [
          { email: user.email },
          { userId: userId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const where = { clientId: client.id };

    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'fullName']
        },
        {
          model: TicketComment,
          as: 'comments',
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      tickets,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
};

// Obtener detalle de un ticket
exports.getTicketDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const user = await User.findByPk(userId);
    const client = await Client.findOne({
      where: {
        [Op.or]: [
          { email: user.email },
          { userId: userId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const ticket = await Ticket.findOne({
      where: {
        id: id,
        clientId: client.id
      },
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'fullName']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'fullName']
        },
        {
          model: TicketComment,
          as: 'comments',
          include: [
            {
              model: User,
              attributes: ['id', 'fullName']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error al obtener detalle de ticket:', error);
    res.status(500).json({ error: 'Error al obtener detalle de ticket' });
  }
};

// Agregar comentario a un ticket
exports.addTicketComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.userId;

    const user = await User.findByPk(userId);
    const client = await Client.findOne({
      where: {
        [Op.or]: [
          { email: user.email },
          { userId: userId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const ticket = await Ticket.findOne({
      where: {
        id: id,
        clientId: client.id
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const ticketComment = await TicketComment.create({
      ticketId: ticket.id,
      userId: userId,
      comment
    });

    const commentWithUser = await TicketComment.findByPk(ticketComment.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'fullName']
        }
      ]
    });

    res.status(201).json({
      message: 'Comentario agregado exitosamente',
      comment: commentWithUser
    });
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({ error: 'Error al agregar comentario' });
  }
};

// Actualizar información del perfil
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { phone, address, alternativeEmail } = req.body;

    const user = await User.findByPk(userId);
    const client = await Client.findOne({
      where: {
        [Op.or]: [
          { email: user.email },
          { userId: userId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const updateData = {};
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (alternativeEmail) updateData.alternativeEmail = alternativeEmail;

    await client.update(updateData);

    res.json({
      message: 'Perfil actualizado exitosamente',
      client
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

// Obtener información de consumo/uso (simulado por ahora)
exports.getUsageStats = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findByPk(userId);
    const client = await Client.findOne({
      where: {
        [Op.or]: [
          { email: user.email },
          { userId: userId }
        ]
      },
      include: [
        {
          model: Subscription,
          as: 'Subscriptions',
          where: { status: 'active' },
          include: [
            {
              model: ServicePackage,
              as: 'ServicePackage'
            }
          ]
        }
      ]
    });

    if (!client || !client.Subscriptions || client.Subscriptions.length === 0) {
      return res.json({
        hasActiveService: false,
        message: 'No tiene servicios activos'
      });
    }

    const subscription = client.Subscriptions[0];
    const servicePackage = subscription.ServicePackage;

    // Simular datos de uso (en producción esto vendría del router Mikrotik)
    const usageData = {
      currentMonth: {
        downloadGB: Math.floor(Math.random() * 100) + 50,
        uploadGB: Math.floor(Math.random() * 30) + 10,
        totalGB: 0
      },
      packageLimit: servicePackage.downloadSpeed ? parseInt(servicePackage.downloadSpeed) * 100 : 1000, // GB estimado
      connectionStatus: client.status === 'active' ? 'connected' : 'disconnected',
      ipAddress: '10.10.x.x', // Dato real vendría del sistema
      lastConnection: new Date().toISOString(),
      averageSpeed: {
        download: servicePackage.downloadSpeed,
        upload: servicePackage.uploadSpeed
      }
    };

    usageData.currentMonth.totalGB = usageData.currentMonth.downloadGB + usageData.currentMonth.uploadGB;
    usageData.usagePercentage = ((usageData.currentMonth.totalGB / usageData.packageLimit) * 100).toFixed(2);

    res.json({
      hasActiveService: true,
      subscription: {
        id: subscription.id,
        package: servicePackage.name,
        speed: `${servicePackage.downloadSpeed}/${servicePackage.uploadSpeed} Mbps`
      },
      usage: usageData
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de uso:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de uso' });
  }
};
