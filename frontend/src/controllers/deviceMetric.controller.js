// backend/src/controllers/deviceMetric.controller.js

const db = require('../models');
const DeviceMetric = db.DeviceMetric;
const Device = db.Device;
const Op = db.Sequelize.Op;
const moment = require('moment');

// Obtener todas las métricas con filtros
exports.findAll = async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      deviceId, 
      status,
      startDate,
      endDate
    } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    const condition = {};
    
    // Filtros
    if (deviceId) condition.deviceId = deviceId;
    if (status) condition.status = status;
    
    // Filtro por rango de fechas
    if (startDate || endDate) {
      condition.recordedAt = {};
      if (startDate) condition.recordedAt[Op.gte] = new Date(startDate);
      if (endDate) condition.recordedAt[Op.lte] = new Date(endDate);
    }
    
    // Obtener métricas
    const { count, rows: metrics } = await DeviceMetric.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'name', 'ipAddress', 'brand', 'type']
        }
      ],
      order: [['recordedAt', 'DESC']]
    });
    
    return res.json({
      totalItems: count,
      metrics,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener métricas",
      error: error.message
    });
  }
};

// Obtener métricas de un dispositivo específico
exports.findByDevice = async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const { 
      page = 1, 
      size = 10,
      period = '24h'
    } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    // Verificar que el dispositivo existe
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    // Calcular fecha de inicio según el período
    let startDate = new Date();
    switch (period) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setHours(startDate.getHours() - 24);
    }
    
    const condition = {
      deviceId: deviceId,
      recordedAt: { [Op.gte]: startDate }
    };
    
    const { count, rows: metrics } = await DeviceMetric.findAndCountAll({
      where: condition,
      limit,
      offset,
      order: [['recordedAt', 'DESC']]
    });
    
    return res.json({
      deviceId,
      deviceName: device.name,
      period,
      totalItems: count,
      metrics,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener métricas del dispositivo",
      error: error.message
    });
  }
};

// Crear nueva métrica (principalmente para testing)
exports.create = async (req, res) => {
  try {
    const {
      deviceId,
      cpuUsage,
      memoryUsage,
      diskUsage,
      uptime,
      interfaceTraffic,
      connectionQuality,
      latency,
      packetLoss,
      bandwidth,
      collectionMethod = 'manual',
      status = 'online'
    } = req.body;
    
    // Verificar que el dispositivo existe
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        message: `Dispositivo con ID ${deviceId} no encontrado`
      });
    }
    
    // Crear la métrica
    const metric = await DeviceMetric.create({
      deviceId,
      cpuUsage,
      memoryUsage,
      diskUsage,
      uptime,
      interfaceTraffic,
      connectionQuality,
      latency,
      packetLoss,
      bandwidth,
      collectionMethod,
      status,
      recordedAt: new Date()
    });
    
    // Actualizar estado del dispositivo
    await device.update({
      status: status,
      lastSeen: new Date()
    });
    
    return res.status(201).json({
      message: "Métrica creada exitosamente",
      metric
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al crear métrica",
      error: error.message
    });
  }
};

// Obtener una métrica por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const metric = await DeviceMetric.findByPk(id, {
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'name', 'ipAddress', 'brand', 'type']
        }
      ]
    });
    
    if (!metric) {
      return res.status(404).json({
        message: `Métrica con ID ${id} no encontrada`
      });
    }
    
    return res.json(metric);
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al obtener métrica",
      error: error.message
    });
  }
};

// Eliminar una métrica
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    const deleted = await DeviceMetric.destroy({
      where: { id: id }
    });
    
    if (deleted === 0) {
      return res.status(404).json({
        message: `Métrica con ID ${id} no encontrada`
      });
    }
    
    return res.json({
      message: "Métrica eliminada exitosamente"
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al eliminar métrica",
      error: error.message
    });
  }
};

// Método de exportación de métricas (el que ya tienes)
exports.exportMetrics = async (req, res) => {
  try {
    const { 
      deviceId, 
      startDate, 
      endDate,
      format = 'csv' 
    } = req.query;
    
    const condition = {};
    
    // Filtros
    if (deviceId) condition.deviceId = deviceId;
    
    // Filtro por rango de fechas
    if (startDate || endDate) {
      condition.recordedAt = {};
      if (startDate) condition.recordedAt[Op.gte] = new Date(startDate);
      if (endDate) condition.recordedAt[Op.lte] = new Date(endDate);
    }
    
    // Obtener métricas
    const metrics = await DeviceMetric.findAll({
      where: condition,
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'name', 'ipAddress', 'brand']
        }
      ],
      order: [['recordedAt', 'ASC']]
    });
    
    // Exportar según formato
    switch (format.toLowerCase()) {
      case 'csv':
        return exportToCSV(res, metrics);
      case 'json':
        return exportToJSON(res, metrics);
      case 'xlsx':
        return exportToXLSX(res, metrics);
      default:
        return res.status(400).json({
          message: "Formato de exportación no soportado. Use csv, json o xlsx"
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al exportar métricas",
      error: error.message
    });
  }
};

// Función para exportar a CSV
function exportToCSV(res, metrics) {
  const { Parser } = require('json2csv');
  
  try {
    const fields = [
      'id', 
      'deviceId', 
      'device.name', 
      'cpuUsage', 
      'memoryUsage', 
      'diskUsage', 
      'status', 
      'recordedAt'
    ];
    
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(metrics);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=device-metrics.csv');
    return res.send(csv);
  } catch (error) {
    console.error('CSV Export Error:', error);
    return res.status(500).json({
      message: "Error al exportar a CSV",
      error: error.message
    });
  }
}

// Función para exportar a JSON
function exportToJSON(res, metrics) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=device-metrics.json');
  return res.json(metrics);
}

// Función para exportar a XLSX
function exportToXLSX(res, metrics) {
  const XLSX = require('xlsx');
  
  try {
    // Convertir métricas a formato de hoja de cálculo
    const worksheet = XLSX.utils.json_to_sheet(metrics.map(metric => ({
      ID: metric.id,
      'Dispositivo ID': metric.deviceId,
      'Nombre de Dispositivo': metric.device?.name || 'N/A',
      'Uso de CPU (%)': metric.cpuUsage,
      'Uso de Memoria (%)': metric.memoryUsage,
      'Uso de Disco (%)': metric.diskUsage,
      'Estado': metric.status,
      'Fecha de Registro': metric.recordedAt
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Métricas de Dispositivos');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=device-metrics.xlsx');
    return res.send(buffer);
  } catch (error) {
    console.error('XLSX Export Error:', error);
    return res.status(500).json({
      message: "Error al exportar a XLSX",
      error: error.message
    });
  }
}

// Funciones auxiliares para cálculos matemáticos
function calculateAverage(metrics, field) {
  const values = metrics.map(m => m[field]).filter(v => v !== null && v !== undefined);
  return values.length > 0 
    ? values.reduce((a, b) => a + b, 0) / values.length 
    : null;
}

function calculateMin(metrics, field) {
  const values = metrics.map(m => m[field]).filter(v => v !== null && v !== undefined);
  return values.length > 0 ? Math.min(...values) : null;
}

function calculateMax(metrics, field) {
  const values = metrics.map(m => m[field]).filter(v => v !== null && v !== undefined);
  return values.length > 0 ? Math.max(...values) : null;
}

function calculateStatusCounts(metrics) {
  return metrics.reduce((counts, metric) => {
    counts[metric.status] = (counts[metric.status] || 0) + 1;
    return counts;
  }, {});
}