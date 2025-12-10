const db = require('../models');
const mikrotikEnhancedService = require('../services/mikrotik.enhanced.service');
const logger = require('../utils/logger');

// Obtener datos de gráficas de tráfico por cliente
exports.getClientTrafficGraphs = async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const period = req.query.period || '24h';
    
    // Validar período
    const validPeriods = ['1h', '6h', '24h', '7d', '30d'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Período inválido. Debe ser uno de: ${validPeriods.join(', ')}`
      });
    }
    
    const service = new mikrotikEnhancedService();
    const result = await service.getClientTrafficGraphs(clientId, period);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error en getClientTrafficGraphs: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener métricas de calidad para un cliente
exports.getClientQualityMetrics = async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    const service = new mikrotikEnhancedService();
    const result = await service.getClientQualityMetrics(clientId);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error en getClientQualityMetrics: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener datos de topología de red para un nodo
exports.getNetworkTopologyData = async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    
    const service = new mikrotikEnhancedService();
    const result = await service.getNetworkTopologyData(nodeId);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error en getNetworkTopologyData: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener utilización de ancho de banda para un router
exports.getBandwidthUtilization = async (req, res) => {
  try {
    const routerId = req.params.routerId;
    
    const service = new mikrotikEnhancedService();
    const result = await service.getBandwidthUtilization(routerId);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error en getBandwidthUtilization: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener interfaces de un router
exports.getRouterInterfaces = async (req, res) => {
  try {
    const routerId = req.params.routerId;
    
    const router = await db.MikrotikRouter.findByPk(routerId);
    if (!router) {
      return res.status(404).json({
        success: false,
        message: `Router con ID ${routerId} no encontrado`
      });
    }
    
    const service = new mikrotikEnhancedService();
    const interfaces = await service.getRouterInterfaces(routerId);
    
    return res.status(200).json({
      success: true,
      data: interfaces
    });
  } catch (error) {
    logger.error(`Error en getRouterInterfaces: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener reglas de firewall de un router
exports.getFirewallRules = async (req, res) => {
  try {
    const routerId = req.params.routerId;
    
    const router = await db.MikrotikRouter.findByPk(routerId);
    if (!router) {
      return res.status(404).json({
        success: false,
        message: `Router con ID ${routerId} no encontrado`
      });
    }
    
    const service = new mikrotikEnhancedService();
    const rules = await service.getFirewallRules(routerId);
    
    return res.status(200).json({
      success: true,
      data: rules
    });
  } catch (error) {
    logger.error(`Error en getFirewallRules: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Crear backup de un router
exports.createRouterBackup = async (req, res) => {
  try {
    const routerId = req.params.routerId;
    
    const router = await db.MikrotikRouter.findByPk(routerId);
    if (!router) {
      return res.status(404).json({
        success: false,
        message: `Router con ID ${routerId} no encontrado`
      });
    }
    
    const service = new mikrotikEnhancedService();
    const result = await service.createRouterBackup(routerId);
    
    return res.status(200).json({
      success: true,
      data: result,
      message: "Backup creado exitosamente"
    });
  } catch (error) {
    logger.error(`Error en createRouterBackup: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reiniciar router
exports.rebootRouter = async (req, res) => {
  try {
    const routerId = req.params.routerId;
    
    const router = await db.MikrotikRouter.findByPk(routerId);
    if (!router) {
      return res.status(404).json({
        success: false,
        message: `Router con ID ${routerId} no encontrado`
      });
    }
    
    const service = new mikrotikEnhancedService();
    await service.rebootRouter(routerId);
    
    return res.status(200).json({
      success: true,
      message: "Router reiniciado exitosamente"
    });
  } catch (error) {
    logger.error(`Error en rebootRouter: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Ejecutar comando en router
exports.executeCommand = async (req, res) => {
  try {
    const routerId = req.params.routerId;
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        message: "El comando es requerido"
      });
    }
    
    const router = await db.MikrotikRouter.findByPk(routerId);
    if (!router) {
      return res.status(404).json({
        success: false,
        message: `Router con ID ${routerId} no encontrado`
      });
    }
    
    const service = new mikrotikEnhancedService();
    const result = await service.executeCommand(routerId, command);
    
    return res.status(200).json({
      success: true,
      data: result,
      message: "Comando ejecutado exitosamente"
    });
  } catch (error) {
    logger.error(`Error en executeCommand: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener logs del router
exports.getRouterLogs = async (req, res) => {
  try {
    const routerId = req.params.routerId;
    const limit = parseInt(req.query.limit) || 100;
    
    const router = await db.MikrotikRouter.findByPk(routerId);
    if (!router) {
      return res.status(404).json({
        success: false,
        message: `Router con ID ${routerId} no encontrado`
      });
    }
    
    const service = new mikrotikEnhancedService();
    const logs = await service.getRouterLogs(routerId, limit);
    
    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error(`Error en getRouterLogs: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener recursos del router (CPU, memoria, etc.)
exports.getRouterResources = async (req, res) => {
  try {
    const routerId = req.params.routerId;
    
    const router = await db.MikrotikRouter.findByPk(routerId);
    if (!router) {
      return res.status(404).json({
        success: false,
        message: `Router con ID ${routerId} no encontrado`
      });
    }
    
    const service = new mikrotikEnhancedService();
    const resources = await service.getRouterResources(routerId);
    
    return res.status(200).json({
      success: true,
      data: resources
    });
  } catch (error) {
    logger.error(`Error en getRouterResources: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
