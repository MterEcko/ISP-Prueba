// backend/src/services/inventory.service.js
const db = require('../models');
const Inventory = db.Inventory;
const InventoryLocation = db.InventoryLocation;
const InventoryMovement = db.InventoryMovement;
const Client = db.Client;
const User = db.User;
const Op = db.Sequelize.Op;

class InventoryService {
  
  /**
   * Generar código QR para un item del inventario
   * @param {number} itemId - ID del item
   * @returns {Object} - Datos del código QR
   */
  async generateQRCode(itemId) {
    try {
      const item = await Inventory.findByPk(itemId);
      if (!item) {
        throw new Error(`Item con ID ${itemId} no encontrado`);
      }

      // Datos para el código QR
      const qrData = {
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        type: 'inventory_item',
        url: `${process.env.FRONTEND_URL}/inventory/${item.id}`,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        qrData: JSON.stringify(qrData),
        displayText: `${item.name} - S/N: ${item.serialNumber || 'N/A'}`
      };
    } catch (error) {
      console.error('Error generando código QR:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener items con stock crítico
   * @param {number} threshold - Umbral para considerar stock crítico
   * @returns {Array} - Items con stock crítico
   */
  async getCriticalStock(threshold = 5) {
    try {
      // Agrupar items por nombre y marca para contar stock
      const stockAnalysis = await Inventory.findAll({
        attributes: [
          'name',
          'brand',
          'model',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
          [db.sequelize.fn('SUM', 
            db.sequelize.literal("CASE WHEN status = 'available' THEN 1 ELSE 0 END")
          ), 'available']
        ],
        group: ['name', 'brand', 'model'],
        having: db.sequelize.literal(`COUNT(*) <= ${threshold} OR SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) <= ${Math.floor(threshold / 2)}`),
        raw: true
      });

      return stockAnalysis;
    } catch (error) {
      console.error('Error obteniendo stock crítico:', error);
      throw error;
    }
  }

  /**
   * Generar reporte de inventario por ubicación
   * @param {number} locationId - ID de ubicación (opcional)
   * @returns {Object} - Reporte detallado
   */
  async generateLocationReport(locationId = null) {
    try {
      const whereClause = locationId ? { locationId: locationId } : {};
      
      const report = await InventoryLocation.findAll({
        where: locationId ? { id: locationId } : {},
        include: [
          {
            model: Inventory,
            as: 'items',
            where: whereClause,
            required: false,
            attributes: [
              'id', 'name', 'brand', 'model', 'status', 'cost',
              [db.sequelize.literal("CASE WHEN status = 'available' THEN 1 ELSE 0 END"), 'is_available']
            ]
          }
        ],
        attributes: [
          'id', 'name', 'type', 'description',
          [db.sequelize.fn('COUNT', db.sequelize.col('items.id')), 'total_items'],
          [db.sequelize.fn('SUM', 
            db.sequelize.literal("CASE WHEN items.status = 'available' THEN 1 ELSE 0 END")
          ), 'available_items'],
          [db.sequelize.fn('SUM', 
            db.sequelize.literal("CASE WHEN items.status = 'inUse' THEN 1 ELSE 0 END")
          ), 'in_use_items'],
          [db.sequelize.fn('SUM', 
            db.sequelize.literal("CASE WHEN items.status = 'defective' THEN 1 ELSE 0 END")
          ), 'defective_items'],
          [db.sequelize.fn('SUM', 
            db.sequelize.literal("COALESCE(items.cost, 0)")
          ), 'total_value']
        ],
        group: ['InventoryLocation.id'],
        order: [['name', 'ASC']]
      });

      return report;
    } catch (error) {
      console.error('Error generando reporte de ubicación:', error);
      throw error;
    }
  }

  /**
   * Generar reporte de movimientos por período
   * @param {Date} startDate - Fecha inicial
   * @param {Date} endDate - Fecha final
   * @returns {Object} - Reporte de movimientos
   */
  async generateMovementReport(startDate, endDate) {
    try {
      const movements = await InventoryMovement.findAll({
        where: {
          movementDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [
          {
            model: Inventory,
            as: 'item',
            attributes: ['id', 'name', 'brand', 'model']
          },
          {
            model: InventoryLocation,
            as: 'fromLocation',
            attributes: ['id', 'name']
          },
          {
            model: InventoryLocation,
            as: 'toLocation',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'movedBy',
            attributes: ['id', 'username', 'fullName']
          }
        ],
        order: [['movementDate', 'DESC']]
      });

      // Agrupar por tipo de movimiento
      const summary = movements.reduce((acc, movement) => {
        const type = movement.type;
        if (!acc[type]) {
          acc[type] = { count: 0, items: [] };
        }
        acc[type].count++;
        acc[type].items.push(movement);
        return acc;
      }, {});

      return {
        total: movements.length,
        period: { start: startDate, end: endDate },
        summary,
        movements
      };
    } catch (error) {
      console.error('Error generando reporte de movimientos:', error);
      throw error;
    }
  }

  /**
   * Obtener items próximos a vencer o que requieren mantenimiento
   * @param {number} daysAhead - Días de anticipación
   * @returns {Array} - Items que requieren atención
   */
  async getMaintenanceAlerts(daysAhead = 30) {
    try {
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + daysAhead);

      // Buscar items que pueden necesitar mantenimiento basado en fecha de compra
      const items = await Inventory.findAll({
        where: {
          [Op.or]: [
            { status: 'in_repair' },
            { status: 'defective' },
            // Items antiguos (más de 2 años) que están en uso
            {
              [Op.and]: [
                { status: 'inUse' },
                { purchaseDate: { [Op.lt]: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000) } }
              ]
            }
          ]
        },
        include: [
          {
            model: InventoryLocation,
            as: 'location',
            attributes: ['id', 'name']
          },
          {
            model: Client,
            as: 'assignedClient',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['purchaseDate', 'ASC']]
      });

      return items.map(item => ({
        ...item.toJSON(),
        alertType: this._getAlertType(item),
        priority: this._getAlertPriority(item)
      }));
    } catch (error) {
      console.error('Error obteniendo alertas de mantenimiento:', error);
      throw error;
    }
  }

  /**
   * Realizar transferencia masiva de items
   * @param {Array} itemIds - IDs de items a transferir
   * @param {number} fromLocationId - ID ubicación origen
   * @param {number} toLocationId - ID ubicación destino
   * @param {number} userId - ID del usuario que realiza la transferencia
   * @param {string} reason - Motivo de la transferencia
   * @returns {Object} - Resultado de la transferencia
   */
  async bulkTransfer(itemIds, fromLocationId, toLocationId, userId, reason = 'Transferencia masiva') {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Validar ubicaciones
      const fromLocation = await InventoryLocation.findByPk(fromLocationId);
      const toLocation = await InventoryLocation.findByPk(toLocationId);
      
      if (!fromLocation || !toLocation) {
        throw new Error('Ubicación origen o destino no encontrada');
      }

      const results = {
        successful: [],
        failed: [],
        total: itemIds.length
      };

      for (const itemId of itemIds) {
        try {
          // Verificar que el item esté en la ubicación origen
          const item = await Inventory.findOne({
            where: { 
              id: itemId,
              locationId: fromLocationId
            },
            transaction
          });

          if (!item) {
            results.failed.push({
              itemId,
              error: 'Item no encontrado en ubicación origen'
            });
            continue;
          }

          // Actualizar ubicación del item
          await item.update({ locationId: toLocationId }, { transaction });

          // Crear movimiento
          await InventoryMovement.create({
            inventoryId: itemId,
            type: 'transfer',
            quantity: 1,
            reason,
            fromLocationId: fromLocationId,
            toLocationId: toLocationId,
            movedById: userId
          }, { transaction });

          results.successful.push({
            itemId,
            itemName: item.name
          });
        } catch (itemError) {
          results.failed.push({
            itemId,
            error: itemError.message
          });
        }
      }

      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      console.error('Error en transferencia masiva:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas generales del inventario
   * @returns {Object} - Estadísticas generales
   */
  async getInventoryStats() {
    try {
      const stats = await Inventory.findAll({
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_items'],
          [db.sequelize.fn('SUM', 
            db.sequelize.literal("CASE WHEN status = 'available' THEN 1 ELSE 0 END")
          ), 'available_items'],
          [db.sequelize.fn('SUM', 
            db.sequelize.literal("CASE WHEN status = 'inUse' THEN 1 ELSE 0 END")
          ), 'in_use_items'],
          [db.sequelize.fn('SUM', 
            db.sequelize.literal("CASE WHEN status = 'defective' THEN 1 ELSE 0 END")
          ), 'defective_items'],
          [db.sequelize.fn('SUM', 
            db.sequelize.literal("CASE WHEN status = 'in_repair' THEN 1 ELSE 0 END")
          ), 'in_repair_items'],
          [db.sequelize.fn('SUM', 
            db.sequelize.literal("COALESCE(cost, 0)")
          ), 'total_value'],
          [db.sequelize.fn('AVG', 
            db.sequelize.literal("COALESCE(cost, 0)")
          ), 'average_cost']
        ],
        raw: true
      });

      // Obtener conteo de ubicaciones
      const locationCount = await InventoryLocation.count({
        where: { active: true }
      });

      // Obtener movimientos del último mes
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const recentMovements = await InventoryMovement.count({
        where: {
          movementDate: { [Op.gte]: lastMonth }
        }
      });

      return {
        ...stats[0],
        active_locations: locationCount,
        recent_movements: recentMovements,
        utilization_rate: stats[0].total_items > 0 
          ? (stats[0].in_use_items / stats[0].total_items * 100).toFixed(2)
          : 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Buscar items por múltiples criterios
   * @param {Object} searchCriteria - Criterios de búsqueda
   * @returns {Array} - Items encontrados
   */
  async advancedSearch(searchCriteria) {
    try {
      const {
        text,
        status,
        location,
        brand,
        model,
        serialNumber,
        assignedClient,
        dateFrom,
        dateTo,
        costMin,
        costMax
      } = searchCriteria;

      let whereClause = {};
      let include = [
        {
          model: InventoryLocation,
          as: 'location',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Client,
          as: 'assignedClient',
          attributes: ['id', 'firstName', 'lastName']
        }
      ];

      // Búsqueda por texto (nombre, marca, modelo)
      if (text) {
        whereClause[Op.or] = [
          { name: { [Op.Like]: `%${text}%` } },
          { brand: { [Op.Like]: `%${text}%` } },
          { model: { [Op.Like]: `%${text}%` } },
          { serialNumber: { [Op.Like]: `%${text}%` } }
        ];
      }

      // Filtros específicos
      if (status) whereClause.status = status;
      if (brand) whereClause.brand = { [Op.Like]: `%${brand}%` };
      if (model) whereClause.model = { [Op.Like]: `%${model}%` };
      if (serialNumber) whereClause.serialNumber = { [Op.Like]: `%${serialNumber}%` };
      if (location) whereClause.locationId = location;
      if (assignedClient) whereClause.clientId = assignedClient;

      // Filtros por fecha de compra
      if (dateFrom || dateTo) {
        whereClause.purchaseDate = {};
        if (dateFrom) whereClause.purchaseDate[Op.gte] = dateFrom;
        if (dateTo) whereClause.purchaseDate[Op.lte] = dateTo;
      }

      // Filtros por costo
      if (costMin || costMax) {
        whereClause.cost = {};
        if (costMin) whereClause.cost[Op.gte] = costMin;
        if (costMax) whereClause.cost[Op.lte] = costMax;
      }

      const items = await Inventory.findAll({
        where: whereClause,
        include,
        order: [['createdAt', 'DESC']]
      });

      return items;
    } catch (error) {
      console.error('Error en búsqueda avanzada:', error);
      throw error;
    }
  }

  /**
   * Obtener tipo de alerta para un item
   * @private
   */
  _getAlertType(item) {
    if (item.status === 'defective') return 'DEFECTIVE';
    if (item.status === 'in_repair') return 'IN_REPAIR';
    
    const purchaseDate = new Date(item.purchaseDate);
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
    
    if (purchaseDate < twoYearsAgo && item.status === 'inUse') {
      return 'OLD_EQUIPMENT';
    }
    
    return 'OTHER';
  }

  /**
   * Obtener prioridad de alerta para un item
   * @private
   */
  _getAlertPriority(item) {
    if (item.status === 'defective') return 'HIGH';
    if (item.status === 'in_repair') return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calcular valor depreciado de un item
   * @param {Object} item - Item del inventario
   * @param {number} deprecationRate - Tasa de depreciación anual (default: 0.15)
   * @returns {number} - Valor depreciado
   */
  calculateDepreciatedValue(item, deprecationRate = 0.15) {
    if (!item.cost || !item.purchaseDate) return 0;
    
    const purchaseDate = new Date(item.purchaseDate);
    const currentDate = new Date();
    const yearsElapsed = (currentDate - purchaseDate) / (365 * 24 * 60 * 60 * 1000);
    
    const depreciatedValue = item.cost * Math.pow((1 - deprecationRate), yearsElapsed);
    return Math.max(depreciatedValue, item.cost * 0.1); // Valor mínimo del 10%
  }

  /**
   * Obtener sugerencias de restock basadas en uso histórico
   * @returns {Array} - Sugerencias de restock
   */
  async getRestockSuggestions() {
    try {
      // Analizar movimientos de salida en los últimos 3 meses
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const outgoingMovements = await InventoryMovement.findAll({
        where: {
          type: 'out',
          movementDate: { [Op.gte]: threeMonthsAgo }
        },
        include: [
          {
            model: Inventory,
            as: 'item',
            attributes: ['id', 'name', 'brand', 'model']
          }
        ]
      });

      // Agrupar por item y calcular frecuencia de uso
      const usageStats = {};
      outgoingMovements.forEach(movement => {
        const key = `${movement.item.name}-${movement.item.brand}-${movement.item.model}`;
        if (!usageStats[key]) {
          usageStats[key] = {
            name: movement.item.name,
            brand: movement.item.brand,
            model: movement.item.model,
            usageCount: 0,
            lastUsed: movement.movementDate
          };
        }
        usageStats[key].usageCount++;
        if (movement.movementDate > usageStats[key].lastUsed) {
          usageStats[key].lastUsed = movement.movementDate;
        }
      });

      // Obtener stock actual
      const suggestions = [];
      for (const key in usageStats) {
        const stat = usageStats[key];
        
        const currentStock = await Inventory.count({
          where: {
            name: { [Op.Like]: `%${stat.name}%` },
            brand: { [Op.Like]: `%${stat.brand}%` },
            model: { [Op.Like]: `%${stat.model}%` },
            status: 'available'
          }
        });

        // Calcular sugerencia basada en uso promedio mensual
        const monthlyUsage = stat.usageCount / 3;
        const suggestedMinimum = Math.ceil(monthlyUsage * 1.5); // 1.5 meses de stock

        if (currentStock < suggestedMinimum) {
          suggestions.push({
            ...stat,
            currentStock,
            suggestedMinimum,
            suggestedOrder: suggestedMinimum - currentStock,
            priority: currentStock === 0 ? 'CRITICAL' : 
                     currentStock < monthlyUsage ? 'HIGH' : 'MEDIUM'
          });
        }
      }

      return suggestions.sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    } catch (error) {
      console.error('Error obteniendo sugerencias de restock:', error);
      throw error;
    }
  }
}

module.exports = new InventoryService();