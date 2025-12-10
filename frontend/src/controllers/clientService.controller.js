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