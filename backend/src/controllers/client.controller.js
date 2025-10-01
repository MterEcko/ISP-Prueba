const db = require('../models');
const Client = db.Client;
const ClientDocument = db.ClientDocument;
const Zone = db.Zone;
const Node = db.Node;
const Sector = db.Sector;
const ServicePackage = db.ServicePackage;
const Subscription = db.Subscription;
const ClientBilling = db.ClientBilling;
const Op = db.Sequelize.Op;

// Crear un nuevo cliente
exports.create = async (req, res) => {
  try {
    // Validar request
    if (!req.body.firstName || !req.body.lastName) {
      return res.status(400).json({ message: "El nombre y apellido son obligatorios" });
    }

    // Crear cliente
    const client = await Client.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      whatsapp: req.body.whatsapp,
      address: req.body.address,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      birthDate: req.body.birthDate,
      startDate: req.body.startDate || new Date(),
      active: req.body.active !== undefined ? req.body.active : true,
      notes: req.body.notes,
      zoneId: req.body.zoneId,
      nodeId: req.body.nodeId,
      sectorId: req.body.sectorId,
      contractNumber: req.body.contractNumber,
      serviceType: req.body.serviceType || 'residential'
    });

    return res.status(201).json({ message: "Cliente creado exitosamente", client });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener todos los clientes con filtros avanzados y paginación
exports.findAll = async (req, res) => {
  try {
    const {
      page = 1,
      size = 25,
      sortField = 'id',
      sortDirection = 'DESC',
      globalSearch,
      zoneId,
      nodeId,
      sectorId,
      status,
      active,
      name,
      address,
      contact,
      email,
      phone,
      billingDay,
      servicePackageId,
      ipAddress
    } = req.query;

    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    // Construir condiciones WHERE para Cliente
    const clientConditions = {};
    const billingConditions = {};
    const subscriptionConditions = {};

    // Filtros de ubicación jerárquica
    if (zoneId) clientConditions.zoneId = zoneId;
    if (nodeId) clientConditions.nodeId = nodeId;
    if (sectorId) clientConditions.sectorId = sectorId;

    // Filtros de estado
    if (active !== undefined) clientConditions.active = active === 'true';

    // Filtros por nombre
    if (name) {
      clientConditions[Op.or] = [
        { firstName: { [Op.iLike]: `%${name}%` } },
        { lastName: { [Op.iLike]: `%${name}%` } }
      ];
    }

    // Filtros por dirección
    if (address) {
      clientConditions.address = { [Op.iLike]: `%${address}%` };
    }

    // Filtros de contacto
    if (contact) {
      clientConditions[Op.or] = [
        { email: { [Op.iLike]: `%${contact}%` } },
        { phone: { [Op.iLike]: `%${contact}%` } },
        { whatsapp: { [Op.iLike]: `%${contact}%` } }
      ];
    }

    if (email) clientConditions.email = { [Op.iLike]: `%${email}%` };
    if (phone) {
      clientConditions[Op.or] = [
        { phone: { [Op.iLike]: `%${phone}%` } },
        { whatsapp: { [Op.iLike]: `%${phone}%` } }
      ];
    }

    // Filtros de facturación y servicios
    if (billingDay) billingConditions.billingDay = billingDay;
    if (servicePackageId) subscriptionConditions.servicePackageId = servicePackageId;
    if (ipAddress) subscriptionConditions.assignedIpAddress = { [Op.iLike]: `%${ipAddress}%` };

    // Búsqueda global
    if (globalSearch) {
      const globalConditions = [
        { firstName: { [Op.iLike]: `%${globalSearch}%` } },
        { lastName: { [Op.iLike]: `%${globalSearch}%` } },
        { email: { [Op.iLike]: `%${globalSearch}%` } },
        { phone: { [Op.iLike]: `%${globalSearch}%` } },
        { address: { [Op.iLike]: `%${globalSearch}%` } },
        { contractNumber: { [Op.iLike]: `%${globalSearch}%` } }
      ];
      
      if (clientConditions[Op.or]) {
        clientConditions[Op.and] = [
          { [Op.or]: clientConditions[Op.or] },
          { [Op.or]: globalConditions }
        ];
        delete clientConditions[Op.or];
      } else {
        clientConditions[Op.or] = globalConditions;
      }
    }

    // ✅ INCLUDES CORREGIDOS CON ALIAS
    const includes = [
      {
        model: Zone,
        as: 'Zone',  // ✅ ALIAS AGREGADO
        attributes: ['id', 'name'],
        required: false
      },
      {
        model: Node,
        as: 'Node',  // ✅ ALIAS AGREGADO
        attributes: ['id', 'name'],
        required: false
      },
      {
        model: Sector,
        as: 'Sector',  // ✅ ALIAS AGREGADO
        attributes: ['id', 'name'],
        required: false
      },
      {
        model: Subscription,
        as: 'Subscriptions', // ✅ ALIAS CORRECTO
        where: Object.keys(subscriptionConditions).length > 0 ? subscriptionConditions : undefined,
        required: false,
        include: [
          {
            model: ServicePackage,
            as: 'ServicePackage',
            attributes: ['id', 'name', 'downloadSpeedMbps', 'uploadSpeedMbps', 'price', 'billingCycle']
          }
        ],
        attributes: [
          'id', 
          'status', 
          'assignedIpAddress',  // 🔥 IP del servicio
          'pppoeUsername', 
          'monthlyFee', 
          'nextDueDate',
          'servicePackageId',
          'startDate',
          'endDate'
        ]
      },
      {
        model: ClientBilling,
        as: 'clientBilling',  // ✅ ALIAS AGREGADO
        where: Object.keys(billingConditions).length > 0 ? billingConditions : undefined,
        required: false,
        attributes: [
          'id', 
          'billingDay',        // 🔥 DÍA DE PAGO
          'nextDueDate', 
          'monthlyFee', 
          'clientStatus',
          'paymentMethod',
          'lastPaymentDate'
        ]
      }
	  
    ];

    // Configurar ordenamiento
    let order;
    const validSortFields = ['id', 'firstName', 'lastName', 'email', 'phone', 'startDate', 'createdAt'];
    
    if (validSortFields.includes(sortField)) {
      order = [[sortField, sortDirection.toUpperCase()]];
    } else {
      order = [['id', 'DESC']];
    }

    // Ejecutar consulta
    const { count, rows: clients } = await Client.findAndCountAll({
      where: clientConditions,
      include: includes,
      limit,
      offset,
      order,
      distinct: true,
      subQuery: false
    });

    // Formatear respuesta
    const formattedClients = clients.map(client => {
      const clientData = client.toJSON();
      
      // Calcular estado general del cliente
      let overallStatus = 'active';
      if (!clientData.active) {
        overallStatus = 'inactive';
      } else if (clientData.Subscriptions && clientData.Subscriptions.length > 0) {
        const hasActiveServices = clientData.Subscriptions.some(sub => sub.status === 'active');
        const hasSuspendedServices = clientData.Subscriptions.some(sub => sub.status === 'suspended');
        const hasOnlyCancelledServices = clientData.Subscriptions.every(sub => sub.status === 'cancelled');
        
        if (hasOnlyCancelledServices) {
          overallStatus = 'cancelled';
        } else if (hasSuspendedServices && !hasActiveServices) {
          overallStatus = 'suspended';
        }
      }
      
      clientData.overallStatus = overallStatus;
      
      return clientData;
    });

    // Log para debugging
    console.log(`📊 Clientes encontrados: ${count}`);
    if (formattedClients.length > 0) {
      console.log('📊 Ejemplo de cliente:', {
        id: formattedClients[0].id,
        name: `${formattedClients[0].firstName} ${formattedClients[0].lastName}`,
        subscriptions: formattedClients[0].Subscriptions?.length || 0,
        billing: formattedClients[0].ClientBilling ? 'Sí' : 'No',
        zone: formattedClients[0].Zone?.name || 'Sin zona',
        node: formattedClients[0].Node?.name || 'Sin nodo',
        sector: formattedClients[0].Sector?.name || 'Sin sector'
      });
    }

    return res.status(200).json({
      success: true,
      totalItems: count,
      clients: formattedClients,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      pageSize: limit
    });

  } catch (error) {
    console.error("Error en findAll de clientes:", error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Obtener cliente por ID con información completa
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const client = await Client.findByPk(id, {
      include: [
        {
          model: Zone,
          as: 'Zone',  // ✅ ALIAS AGREGADO
          attributes: ['id', 'name']
        },
        {
          model: Node,
          as: 'Node',  // ✅ ALIAS AGREGADO
          attributes: ['id', 'name']
        },
        {
          model: Sector,
          as: 'Sector',  // ✅ ALIAS AGREGADO
          attributes: ['id', 'name']
        },
        {
          model: ClientDocument,
          attributes: ['id', 'type', 'filename', 'uploadDate', 'description']
        },
        {
          model: Subscription,
          as: 'Subscriptions',
          include: [
            {
              model: ServicePackage,
              as: 'ServicePackage',
              attributes: ['id', 'name', 'downloadSpeedMbps', 'uploadSpeedMbps', 'price', 'billingCycle']
            }
          ]
        },
        {
          model: ClientBilling,
          as: 'clientBilling',  // ✅ ALIAS AGREGADO
          attributes: ['id', 'billingDay', 'nextDueDate', 'monthlyFee', 'clientStatus', 'paymentMethod', 'graceDays']
        }
      ]
    });

    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: `Cliente con ID ${id} no encontrado` 
      });
    }

    return res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Actualizar cliente
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    const [updated] = await Client.update(req.body, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({ 
        success: false,
        message: `Cliente con ID ${id} no encontrado` 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: "Cliente actualizado exitosamente" 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Cambiar estado de cliente (activar/desactivar)
exports.changeStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { active } = req.body;
    
    if (active === undefined) {
      return res.status(400).json({ 
        success: false,
        message: "El estado 'active' es requerido" 
      });
    }
    
    const [updated] = await Client.update(
      { active: active },
      { where: { id: id } }
    );

    if (updated === 0) {
      return res.status(404).json({ 
        success: false,
        message: `Cliente con ID ${id} no encontrado` 
      });
    }

    const message = active ? "Cliente activado exitosamente" : "Cliente desactivado exitosamente";
    return res.status(200).json({ 
      success: true,
      message 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Eliminar cliente
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar si tiene servicios activos
    const activeSubscriptions = await Subscription.count({
      where: { 
        clientId: id,
        status: ['active', 'suspended']
      }
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar el cliente porque tiene servicios activos. Cancele primero todos los servicios."
      });
    }
    
    const deleted = await Client.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ 
        success: false,
        message: `Cliente con ID ${id} no encontrado` 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: "Cliente eliminado exitosamente" 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Acciones masivas
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { clientIds, status } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se requiere un array de IDs de clientes"
      });
    }

    const updateData = {};
    if (status === 'active' || status === 'inactive') {
      updateData.active = status === 'active';
    }

    const [updated] = await Client.update(updateData, {
      where: { id: { [Op.in]: clientIds } }
    });

    return res.status(200).json({
      success: true,
      message: `${updated} cliente(s) actualizado(s) exitosamente`,
      data: { updated, clientIds }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.bulkSuspendServices = async (req, res) => {
  try {
    const { clientIds, reason } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se requiere un array de IDs de clientes"
      });
    }

    // Suspender todas las suscripciones activas de los clientes seleccionados
    const [updated] = await Subscription.update(
      { 
        status: 'suspended',
        lastStatusChange: new Date(),
        notes: reason || 'Suspensión masiva'
      },
      {
        where: { 
          clientId: { [Op.in]: clientIds },
          status: 'active'
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: `${updated} servicio(s) suspendido(s) exitosamente`,
      data: { updated, clientIds, reason }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.bulkReactivateServices = async (req, res) => {
  try {
    const { clientIds } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se requiere un array de IDs de clientes"
      });
    }

    // Reactivar todas las suscripciones suspendidas de los clientes seleccionados
    const [updated] = await Subscription.update(
      { 
        status: 'active',
        lastStatusChange: new Date()
      },
      {
        where: { 
          clientId: { [Op.in]: clientIds },
          status: 'suspended'
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: `${updated} servicio(s) reactivado(s) exitosamente`,
      data: { updated, clientIds }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Estadísticas de clientes
exports.getStatistics = async (req, res) => {
  try {
    const { zoneId, nodeId, sectorId, period } = req.query;

    const whereClause = {};
    if (zoneId) whereClause.zoneId = zoneId;
    if (nodeId) whereClause.nodeId = nodeId;
    if (sectorId) whereClause.sectorId = sectorId;

    const [
      totalClients,
      activeClients,
      inactiveClients,
      clientsWithActiveServices,
      clientsWithSuspendedServices,
      clientsWithCancelledServices
    ] = await Promise.all([
      Client.count({ where: whereClause }),
      Client.count({ where: { ...whereClause, active: true } }),
      Client.count({ where: { ...whereClause, active: false } }),
      Client.count({
        where: whereClause,
        include: [{
          model: Subscription,
          as: 'Subscriptions',
          where: { status: 'active' },
          required: true
        }]
      }),
      Client.count({
        where: whereClause,
        include: [{
          model: Subscription,
          as: 'Subscriptions',
          where: { status: 'suspended' },
          required: true
        }]
      }),
      Client.count({
        where: whereClause,
        include: [{
          model: Subscription,
          as: 'Subscriptions',
          where: { status: 'cancelled' },
          required: true
        }]
      })
    ]);

    const statistics = {
      total: totalClients,
      byClientStatus: {
        active: activeClients,
        inactive: inactiveClients
      },
      byServiceStatus: {
        withActiveServices: clientsWithActiveServices,
        withSuspendedServices: clientsWithSuspendedServices,
        withCancelledServices: clientsWithCancelledServices,
        withoutServices: totalClients - (clientsWithActiveServices + clientsWithSuspendedServices + clientsWithCancelledServices)
      },
      healthScore: totalClients > 0 ? ((clientsWithActiveServices / totalClients) * 100).toFixed(2) : 0
    };

    return res.status(200).json({
      success: true,
      data: statistics,
      message: 'Estadísticas de clientes obtenidas exitosamente'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Verificar duplicados
exports.checkDuplicate = async (req, res) => {
  try {
    const { email, phone, contractNumber } = req.query;

    const conditions = [];
    if (email) conditions.push({ email });
    if (phone) conditions.push({ [Op.or]: [{ phone }, { whatsapp: phone }] });
    if (contractNumber) conditions.push({ contractNumber });

    if (conditions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se requiere al menos un parámetro para verificar duplicados"
      });
    }

    const duplicates = await Client.findAll({
      where: { [Op.or]: conditions },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'whatsapp', 'contractNumber']
    });

    return res.status(200).json({
      success: true,
      data: {
        hasDuplicates: duplicates.length > 0,
        duplicates,
        count: duplicates.length
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};