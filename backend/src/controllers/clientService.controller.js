// backend/src/controllers/clientService.controller.js
const db = require('../models');
const ClientService = db.ClientService; // La Super Tabla
const Subscription = db.Subscription;   // El Internet del Core
const eventBus = require('../services/eventBus.service');
const logger = require('../utils/logger');

// Obtener TODOS los servicios de un cliente (Unificando Core + Plugins)
exports.getAllServices = async (req, res) => {
  try {
    const { clientId } = req.params;

    // 1. Obtener Servicios del Core (Suscripciones de Internet)
    const coreSubscriptions = await Subscription.findAll({
      where: { clientId, status: ['active', 'suspended'] },
      include: [{ model: db.ServicePackage, as: 'ServicePackage' }]
    });

    // Formatear el Core para que se vea igual que un Plugin
    const coreServices = coreSubscriptions.map(sub => ({
      id: `core-${sub.id}`,     // ID único virtual
      isCore: true,             // Bandera para el frontend
      pluginName: 'system-core',
      type: 'internet',         // Categoría estándar
      name: sub.ServicePackage?.name || 'Internet',
      status: sub.status,
      // Datos visuales unificados
      metadata: {
        icon: '📡',
        price: sub.monthlyFee,
        detail: sub.assignedIpAddress || 'Sin IP'
      }
    }));

    // 2. Obtener Servicios de Plugins (Desde la Super Tabla)
    const pluginServicesRaw = await ClientService.findAll({
      where: { clientId }
    });

    const pluginServices = pluginServicesRaw.map(svc => ({
      id: svc.id,               // ID real de la Super Tabla
      isCore: false,
      pluginName: svc.pluginName,
      type: svc.serviceType,    // ej: 'entertainment', 'security'
      name: svc.metadata?.label || 'Servicio Externo',
      status: svc.status,
      referenceId: svc.referenceId, // ID interno del plugin (útil para acciones)
      metadata: svc.metadata || {}  // Iconos, precios, info extra guardada por el plugin
    }));

    // 3. Unificar listas
    const allServices = [...coreServices, ...pluginServices];

    return res.json({
      success: true,
      data: allServices,
      summary: {
        total: allServices.length,
        internet: coreServices.length,
        extras: pluginServices.length
      }
    });

  } catch (error) {
    logger.error(`Error obteniendo servicios unificados: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener un servicio específico
exports.getClientService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await ClientService.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Servicio no encontrado"
      });
    }

    return res.json({
      success: true,
      data: service
    });

  } catch (error) {
    logger.error(`Error obteniendo servicio: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Crear nuevo servicio para un cliente
exports.createClientService = async (req, res) => {
  try {
    const {
      clientId,
      pluginName,
      serviceName,
      description,
      serviceType,
      referenceId,
      serviceConfig,
      monthlyFee,
      setupFee,
      billingCycle,
      metadata,
      notes
    } = req.body;

    // Validaciones básicas
    if (!clientId || !pluginName || !serviceName) {
      return res.status(400).json({
        success: false,
        message: 'clientId, pluginName y serviceName son requeridos'
      });
    }

    // Crear el servicio
    const newService = await ClientService.create({
      clientId,
      pluginName,
      serviceName,
      description,
      serviceType: serviceType || 'other',
      referenceId,
      status: 'pending',
      serviceConfig: serviceConfig || {},
      monthlyFee,
      setupFee: setupFee || 0,
      billingCycle: billingCycle || 'monthly',
      metadata: metadata || {},
      notes
    });

    // Emitir evento para que el plugin pueda reaccionar
    eventBus.emit('SERVICE_CREATED', {
      serviceId: newService.id,
      pluginName: newService.pluginName,
      clientId: newService.clientId,
      serviceConfig: newService.serviceConfig
    });

    logger.info(`Nuevo servicio creado: ${serviceName} para cliente ${clientId}`);

    return res.status(201).json({
      success: true,
      data: newService,
      message: 'Servicio creado exitosamente'
    });

  } catch (error) {
    logger.error(`Error creando servicio: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar servicio existente
exports.updateClientService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serviceName,
      description,
      serviceConfig,
      monthlyFee,
      setupFee,
      metadata,
      notes
    } = req.body;

    const service = await ClientService.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Actualizar campos permitidos
    const updateData = {};
    if (serviceName !== undefined) updateData.serviceName = serviceName;
    if (description !== undefined) updateData.description = description;
    if (serviceConfig !== undefined) updateData.serviceConfig = serviceConfig;
    if (monthlyFee !== undefined) updateData.monthlyFee = monthlyFee;
    if (setupFee !== undefined) updateData.setupFee = setupFee;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (notes !== undefined) updateData.notes = notes;

    await service.update(updateData);

    // Emitir evento para que el plugin pueda reaccionar
    eventBus.emit('SERVICE_UPDATED', {
      serviceId: service.id,
      pluginName: service.pluginName,
      clientId: service.clientId,
      changes: updateData
    });

    logger.info(`Servicio actualizado: ${service.serviceName} (ID: ${id})`);

    return res.json({
      success: true,
      data: service,
      message: 'Servicio actualizado exitosamente'
    });

  } catch (error) {
    logger.error(`Error actualizando servicio: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Cambiar estado del servicio (activar, suspender, cancelar)
exports.updateServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'suspended', 'cancelled', 'pending'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`
      });
    }

    const service = await ClientService.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    const oldStatus = service.status;

    // Actualizar estado
    await service.update({
      status,
      activatedAt: status === 'active' && !service.activatedAt ? new Date() : service.activatedAt
    });

    // Emitir evento para que el plugin pueda reaccionar
    eventBus.emit('SERVICE_STATUS_CHANGED', {
      serviceId: service.id,
      pluginName: service.pluginName,
      clientId: service.clientId,
      referenceId: service.referenceId,
      oldStatus,
      newStatus: status
    });

    logger.info(`Estado de servicio cambiado: ${service.serviceName} de ${oldStatus} a ${status}`);

    return res.json({
      success: true,
      data: service,
      message: `Servicio ${status === 'active' ? 'activado' : status === 'suspended' ? 'suspendido' : 'cancelado'} exitosamente`
    });

  } catch (error) {
    logger.error(`Error cambiando estado del servicio: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar/Desvincular un servicio de plugin
exports.removeService = async (req, res) => {
  try {
    const { id } = req.params; // ID de la Super Tabla

    const service = await ClientService.findByPk(id);

    if (!service) {
      return res.status(404).json({ message: "Servicio no encontrado" });
    }

    // 1. Avisar al ecosistema que se va a borrar
    // Esto permite que el plugin escuche y borre la cuenta en Jellyfin/IoT/VoIP
    eventBus.emit('SERVICE_REMOVED', {
      pluginName: service.pluginName,
      referenceId: service.referenceId,
      clientId: service.clientId,
      serviceType: service.serviceType
    });

    // 2. Borrar de la Super Tabla
    await service.destroy();

    logger.info(`Servicio externo eliminado: ${service.pluginName} (Ref: ${service.referenceId})`);

    return res.json({ success: true, message: "Servicio desvinculado correctamente" });

  } catch (error) {
    logger.error(`Error eliminando servicio externo: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};