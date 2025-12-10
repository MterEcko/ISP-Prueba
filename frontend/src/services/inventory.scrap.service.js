const db = require('../models');
const logger = require('../utils/logger');
const moment = require('moment');

// Modelos necesarios
const Inventory = db.Inventory;
const InventoryProduct = db.InventoryProduct;
const InventoryType = db.InventoryType;
const InventoryCategory = db.InventoryCategory;
const InventoryLocation = db.InventoryLocation;
const InventoryMovement = db.InventoryMovement;
const InstallationMaterial = db.InstallationMaterial;
const Ticket = db.Ticket;
const TicketType = db.TicketType;
const User = db.User;
const Client = db.Client;

class InventoryScrapService {
  constructor() {
    this.scrapCache = new Map();
    this.alertThresholds = {
      lowStock: 10, // Porcentaje
      highScrap: 15, // Porcentaje
      almostEmpty: 5 // Porcentaje
    };
  }

  /**
   * Calcula scrap automáticamente en una instalación
   * @param {number} itemId - ID del item de inventario
   * @param {number} quantityUsed - Cantidad utilizada en la instalación
   * @param {Object} installationData - Datos adicionales de la instalación
   * @returns {Promise<Object>} Resultado del cálculo de scrap
   */
  async calculateScrapOnInstallation(itemId, quantityUsed, installationData = {}) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Calculando scrap para item ${itemId}, cantidad usada: ${quantityUsed}`);

      // Obtener item con sus relaciones
      const item = await Inventory.findByPk(itemId, {
        include: [
          {
            model: InventoryProduct,
            include: [
              {
                model: InventoryType,
                include: [{ model: InventoryCategory }]
              }
            ]
          },
          { model: InventoryLocation }
        ],
        transaction
      });

      if (!item) {
        throw new Error(`Item ${itemId} no encontrado`);
      }

      // Validar cantidad disponible
      if (item.remainingQuantity < quantityUsed) {
        throw new Error(`Cantidad insuficiente. Disponible: ${item.remainingQuantity}, solicitado: ${quantityUsed}`);
      }

      // Obtener porcentaje de scrap del tipo de producto
      const scrapPercentage = item.InventoryProduct.InventoryType.defaultScrapPercentage || 0;
      
      // Calcular scrap generado
      let scrapGenerated = 0;
      if (scrapPercentage > 0) {
        scrapGenerated = (quantityUsed * scrapPercentage) / 100;
      }

      // Aplicar factores de ajuste según tipo de instalación
      const adjustmentFactor = this._getScrapAdjustmentFactor(
        item.InventoryProduct.InventoryType.name,
        installationData.installationType || 'standard',
        installationData.technicianExperience || 'normal'
      );

      scrapGenerated *= adjustmentFactor;

      // Redondear scrap según unidad
      scrapGenerated = this._roundScrapByUnit(
        scrapGenerated,
        item.InventoryProduct.InventoryType.unitType
      );

      // Calcular nueva cantidad restante
      const totalConsumed = quantityUsed + scrapGenerated;
      const newRemainingQuantity = item.remainingQuantity - totalConsumed;

      // Actualizar item en inventario
      await item.update({
        remainingQuantity: Math.max(0, newRemainingQuantity),
        scrapQuantity: item.scrapQuantity + scrapGenerated
      }, { transaction });

      // Crear movimiento de inventario
      await InventoryMovement.create({
        inventoryId: itemId,
        fromLocationId: item.locationId,
        toLocationId: null, // Consumido
        movedByUserId: installationData.technicianId || null,
        clientId: installationData.clientId || null,
        movementType: 'consumption',
        quantityMoved: quantityUsed,
        scrapGenerated: scrapGenerated,
        reason: installationData.reason || 'Instalación',
        notes: `Scrap auto-calculado: ${scrapPercentage}% + ajuste ${((adjustmentFactor - 1) * 100).toFixed(1)}%`,
        reference: installationData.ticketId ? `TICKET-${installationData.ticketId}` : null
      }, { transaction });

      await transaction.commit();

      // Verificar alertas
      await this._checkScrapAlerts(itemId, scrapGenerated, quantityUsed);

      const result = {
        itemId,
        itemName: item.InventoryProduct.model,
        quantityUsed,
        scrapGenerated: parseFloat(scrapGenerated.toFixed(3)),
        scrapPercentage: parseFloat((scrapPercentage * adjustmentFactor).toFixed(2)),
        remainingQuantity: parseFloat(newRemainingQuantity.toFixed(3)),
        totalScrap: parseFloat((item.scrapQuantity + scrapGenerated).toFixed(3)),
        adjustmentFactor: parseFloat(adjustmentFactor.toFixed(2)),
        unitType: item.InventoryProduct.InventoryType.unitType,
        efficiency: this._calculateEfficiency(quantityUsed, scrapGenerated)
      };

      logger.info(`Scrap calculado para ${item.InventoryProduct.model}: ${scrapGenerated} ${item.InventoryProduct.InventoryType.unitType}`);

      return {
        success: true,
        data: result,
        message: `Scrap calculado exitosamente: ${scrapGenerated.toFixed(3)} ${item.InventoryProduct.InventoryType.unitType}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error calculando scrap para item ${itemId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualiza cantidad restante después del consumo
   * @param {number} itemId - ID del item
   * @param {number} consumed - Cantidad consumida
   * @param {number} scrapGenerated - Scrap generado
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateRemainingQuantity(itemId, consumed, scrapGenerated) {
    try {
      logger.info(`Actualizando cantidad restante para item ${itemId}`);

      const item = await Inventory.findByPk(itemId, {
        include: [
          {
            model: InventoryProduct,
            include: [{ model: InventoryType }]
          }
        ]
      });

      if (!item) {
        throw new Error(`Item ${itemId} no encontrado`);
      }

      const totalReduction = consumed + scrapGenerated;
      const newRemainingQuantity = Math.max(0, item.remainingQuantity - totalReduction);
      const newTotalScrap = item.scrapQuantity + scrapGenerated;

      await item.update({
        remainingQuantity: newRemainingQuantity,
        scrapQuantity: newTotalScrap
      });

      // Verificar si el item está casi vacío
      const isAlmostEmpty = this._isItemAlmostEmpty(newRemainingQuantity, item.usableQuantity);

      return {
        success: true,
        data: {
          itemId,
          consumed,
          scrapGenerated,
          previousQuantity: item.remainingQuantity + totalReduction,
          newRemainingQuantity,
          totalScrap: newTotalScrap,
          isAlmostEmpty,
          efficiency: this._calculateEfficiency(consumed, scrapGenerated)
        }
      };

    } catch (error) {
      logger.error(`Error actualizando cantidad restante para item ${itemId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera reporte de scrap por período
   * @param {string} period - Período ('7d', '30d', '90d')
   * @param {number} locationId - ID de ubicación (opcional)
   * @returns {Promise<Object>} Reporte de scrap
   */
  async getScrapReport(period = '30d', locationId = null) {
    try {
      logger.info(`Generando reporte de scrap para período ${period}`);

      const startDate = this._getStartDateForPeriod(period);
      
      const whereCondition = {
        movementDate: {
          [db.Sequelize.Op.gte]: startDate
        },
        movementType: 'consumption',
        scrapGenerated: {
          [db.Sequelize.Op.gt]: 0
        }
      };

      if (locationId) {
        whereCondition.fromLocationId = locationId;
      }

      // Obtener movimientos con scrap
      const movements = await InventoryMovement.findAll({
        where: whereCondition,
        include: [
          {
            model: Inventory,
            include: [
              {
                model: InventoryProduct,
                include: [
                  {
                    model: InventoryType,
                    include: [{ model: InventoryCategory }]
                  }
                ]
              }
            ]
          },
          {
            model: User,
            as: 'movedBy',
            attributes: ['id', 'fullName'],
            required: false
          },
          {
            model: Client,
            attributes: ['id', 'firstName', 'lastName'],
            required: false
          }
        ],
        order: [['movementDate', 'DESC']]
      });

      // Agrupar datos para el reporte
      const scrapByCategory = {};
      const scrapByTechnician = {};
      const scrapByProduct = {};
      const scrapTimeline = {};

      let totalScrapValue = 0;
      let totalQuantityUsed = 0;
      let totalScrapGenerated = 0;

      movements.forEach(movement => {
        const category = movement.Inventory.InventoryProduct.InventoryType.InventoryCategory.name;
        const product = movement.Inventory.InventoryProduct.model;
        const technician = movement.movedBy ? movement.movedBy.fullName : 'Sin asignar';
        const date = moment(movement.movementDate).format('YYYY-MM-DD');
        
        const scrapValue = movement.scrapGenerated * (movement.Inventory.InventoryProduct.purchasePrice || 0);

        // Por categoría
        if (!scrapByCategory[category]) {
          scrapByCategory[category] = {
            quantity: 0,
            value: 0,
            items: []
          };
        }
        scrapByCategory[category].quantity += movement.scrapGenerated;
        scrapByCategory[category].value += scrapValue;
        scrapByCategory[category].items.push({
          product,
          quantity: movement.scrapGenerated,
          date: movement.movementDate
        });

        // Por técnico
        if (!scrapByTechnician[technician]) {
          scrapByTechnician[technician] = {
            quantity: 0,
            value: 0,
            installations: 0
          };
        }
        scrapByTechnician[technician].quantity += movement.scrapGenerated;
        scrapByTechnician[technician].value += scrapValue;
        scrapByTechnician[technician].installations++;

        // Por producto
        if (!scrapByProduct[product]) {
          scrapByProduct[product] = {
            quantity: 0,
            value: 0,
            occurrences: 0
          };
        }
        scrapByProduct[product].quantity += movement.scrapGenerated;
        scrapByProduct[product].value += scrapValue;
        scrapByProduct[product].occurrences++;

        // Timeline
        if (!scrapTimeline[date]) {
          scrapTimeline[date] = {
            quantity: 0,
            value: 0,
            installations: 0
          };
        }
        scrapTimeline[date].quantity += movement.scrapGenerated;
        scrapTimeline[date].value += scrapValue;
        scrapTimeline[date].installations++;

        // Totales
        totalScrapValue += scrapValue;
        totalQuantityUsed += movement.quantityMoved;
        totalScrapGenerated += movement.scrapGenerated;
      });

      // Calcular eficiencia global
      const globalEfficiency = this._calculateEfficiency(totalQuantityUsed, totalScrapGenerated);

      // Top items con mayor scrap
      const topScrapProducts = Object.entries(scrapByProduct)
        .sort(([,a], [,b]) => b.value - a.value)
        .slice(0, 10)
        .map(([product, data]) => ({
          product,
          scrapQuantity: parseFloat(data.quantity.toFixed(3)),
          scrapValue: parseFloat(data.value.toFixed(2)),
          occurrences: data.occurrences,
          averageScrapPerInstallation: parseFloat((data.quantity / data.occurrences).toFixed(3))
        }));

      // Técnicos con mayor scrap
      const technicianPerformance = Object.entries(scrapByTechnician)
        .sort(([,a], [,b]) => b.value - a.value)
        .map(([technician, data]) => ({
          technician,
          scrapQuantity: parseFloat(data.quantity.toFixed(3)),
          scrapValue: parseFloat(data.value.toFixed(2)),
          installations: data.installations,
          averageScrapPerInstallation: parseFloat((data.quantity / data.installations).toFixed(3)),
          efficiency: this._calculateEfficiency(data.installations * 100, data.quantity) // Estimación
        }));

      return {
        success: true,
        data: {
          period,
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          },
          summary: {
            totalMovements: movements.length,
            totalQuantityUsed: parseFloat(totalQuantityUsed.toFixed(3)),
            totalScrapGenerated: parseFloat(totalScrapGenerated.toFixed(3)),
            totalScrapValue: parseFloat(totalScrapValue.toFixed(2)),
            globalEfficiency: parseFloat(globalEfficiency.toFixed(2)),
            averageScrapPerInstallation: movements.length > 0 
              ? parseFloat((totalScrapGenerated / movements.length).toFixed(3)) 
              : 0
          },
          scrapByCategory: Object.entries(scrapByCategory).map(([category, data]) => ({
            category,
            scrapQuantity: parseFloat(data.quantity.toFixed(3)),
            scrapValue: parseFloat(data.value.toFixed(2)),
            itemCount: data.items.length
          })),
          topScrapProducts,
          technicianPerformance,
          timeline: Object.entries(scrapTimeline)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({
              date,
              scrapQuantity: parseFloat(data.quantity.toFixed(3)),
              scrapValue: parseFloat(data.value.toFixed(2)),
              installations: data.installations
            }))
        }
      };

    } catch (error) {
      logger.error(`Error generando reporte de scrap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene alertas de inventario (stock bajo, alto scrap, etc.)
   * @returns {Promise<Object>} Alertas del inventario
   */
  async getInventoryAlerts() {
    try {
      logger.info('Obteniendo alertas de inventario');

      const alerts = {
        lowStock: [],
        highScrap: [],
        almostEmpty: [],
        zeroStock: [],
        maintenanceRequired: []
      };

      // Obtener todos los items activos
      const items = await Inventory.findAll({
        where: {
          remainingQuantity: {
            [db.Sequelize.Op.gte]: 0
          }
        },
        include: [
          {
            model: InventoryProduct,
            include: [
              {
                model: InventoryType,
                include: [{ model: InventoryCategory }]
              }
            ]
          },
          { model: InventoryLocation }
        ]
      });

      for (const item of items) {
        const utilizationPercentage = this._calculateUtilization(item.remainingQuantity, item.totalQuantity);
        const scrapPercentage = this._calculateScrapPercentage(item.scrapQuantity, item.totalQuantity);

        // Stock bajo
        if (utilizationPercentage <= this.alertThresholds.lowStock && item.remainingQuantity > 0) {
          alerts.lowStock.push({
            itemId: item.id,
            product: item.InventoryProduct.model,
            category: item.InventoryProduct.InventoryType.InventoryCategory.name,
            location: item.InventoryLocation.name,
            remainingQuantity: item.remainingQuantity,
            totalQuantity: item.totalQuantity,
            utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
            severity: utilizationPercentage <= 5 ? 'critical' : 'warning'
          });
        }

        // Alto scrap
        if (scrapPercentage >= this.alertThresholds.highScrap) {
          alerts.highScrap.push({
            itemId: item.id,
            product: item.InventoryProduct.model,
            category: item.InventoryProduct.InventoryType.InventoryCategory.name,
            scrapQuantity: item.scrapQuantity,
            totalQuantity: item.totalQuantity,
            scrapPercentage: parseFloat(scrapPercentage.toFixed(2)),
            expectedScrap: item.InventoryProduct.InventoryType.defaultScrapPercentage,
            severity: scrapPercentage >= 25 ? 'critical' : 'warning'
          });
        }

        // Casi vacío
        if (this._isItemAlmostEmpty(item.remainingQuantity, item.usableQuantity)) {
          alerts.almostEmpty.push({
            itemId: item.id,
            product: item.InventoryProduct.model,
            category: item.InventoryProduct.InventoryType.InventoryCategory.name,
            remainingQuantity: item.remainingQuantity,
            usableQuantity: item.usableQuantity,
            severity: 'warning'
          });
        }

        // Stock cero
        if (item.remainingQuantity === 0) {
          alerts.zeroStock.push({
            itemId: item.id,
            product: item.InventoryProduct.model,
            category: item.InventoryProduct.InventoryType.InventoryCategory.name,
            location: item.InventoryLocation.name,
            lastMovement: await this._getLastMovementDate(item.id),
            severity: 'critical'
          });
        }

        // Mantenimiento requerido (items viejos sin movimiento)
        const daysSinceLastMovement = await this._getDaysSinceLastMovement(item.id);
        if (daysSinceLastMovement > 180 && item.remainingQuantity > 0) {
          alerts.maintenanceRequired.push({
            itemId: item.id,
            product: item.InventoryProduct.model,
            location: item.InventoryLocation.name,
            daysSinceLastMovement,
            remainingQuantity: item.remainingQuantity,
            severity: daysSinceLastMovement > 365 ? 'critical' : 'warning'
          });
        }
      }

      // Contar alertas por severidad
      const alertCounts = {
        critical: 0,
        warning: 0,
        total: 0
      };

      Object.values(alerts).forEach(alertArray => {
        alertArray.forEach(alert => {
          alertCounts[alert.severity]++;
          alertCounts.total++;
        });
      });

      return {
        success: true,
        data: {
          alerts,
          summary: alertCounts,
          lastUpdated: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo alertas de inventario: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene items con stock bajo
   * @param {number} threshold - Umbral de porcentaje (por defecto 10%)
   * @returns {Promise<Object>} Items con stock bajo
   */
  async getLowStockItems(threshold = 10) {
    try {
      logger.info(`Obteniendo items con stock bajo (${threshold}%)`);

      const items = await Inventory.findAll({
        include: [
          {
            model: InventoryProduct,
            include: [
              {
                model: InventoryType,
                include: [{ model: InventoryCategory }]
              }
            ]
          },
          { model: InventoryLocation }
        ],
        where: {
          remainingQuantity: {
            [db.Sequelize.Op.gt]: 0
          }
        }
      });

      const lowStockItems = items.filter(item => {
        const utilizationPercentage = this._calculateUtilization(item.remainingQuantity, item.totalQuantity);
        return utilizationPercentage <= threshold;
      });

      const itemsWithDetails = lowStockItems.map(item => {
        const utilizationPercentage = this._calculateUtilization(item.remainingQuantity, item.totalQuantity);
        const suggestedOrderQuantity = this._calculateSuggestedOrderQuantity(item);

        return {
          itemId: item.id,
          product: item.InventoryProduct.model,
          brand: item.InventoryProduct.brand,
          category: item.InventoryProduct.InventoryType.InventoryCategory.name,
          location: item.InventoryLocation.name,
          remainingQuantity: item.remainingQuantity,
          totalQuantity: item.totalQuantity,
          utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
          unitType: item.InventoryProduct.InventoryType.unitType,
          purchasePrice: item.InventoryProduct.purchasePrice,
          suggestedOrderQuantity,
          estimatedCost: suggestedOrderQuantity * (item.InventoryProduct.purchasePrice || 0),
          priority: utilizationPercentage <= 5 ? 'high' : 'medium'
        };
      });

      // Ordenar por prioridad y luego por porcentaje de utilización
      itemsWithDetails.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority === 'high' ? -1 : 1;
        }
        return a.utilizationPercentage - b.utilizationPercentage;
      });

      const totalEstimatedCost = itemsWithDetails.reduce((sum, item) => sum + item.estimatedCost, 0);

      return {
        success: true,
        data: {
          threshold,
          itemCount: itemsWithDetails.length,
          items: itemsWithDetails,
          summary: {
            totalEstimatedCost: parseFloat(totalEstimatedCost.toFixed(2)),
            highPriorityItems: itemsWithDetails.filter(item => item.priority === 'high').length,
            mediumPriorityItems: itemsWithDetails.filter(item => item.priority === 'medium').length
          }
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo items con stock bajo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene items con alto scrap
   * @param {number} threshold - Umbral de porcentaje de scrap (por defecto 15%)
   * @returns {Promise<Object>} Items con alto scrap
   */
  async getHighScrapItems(threshold = 15) {
    try {
      logger.info(`Obteniendo items con alto scrap (${threshold}%)`);

      const items = await Inventory.findAll({
        where: {
          scrapQuantity: {
            [db.Sequelize.Op.gt]: 0
          }
        },
        include: [
          {
            model: InventoryProduct,
            include: [
              {
                model: InventoryType,
                include: [{ model: InventoryCategory }]
              }
            ]
          },
          { model: InventoryLocation }
        ]
      });

      const highScrapItems = items.filter(item => {
        const scrapPercentage = this._calculateScrapPercentage(item.scrapQuantity, item.totalQuantity);
        return scrapPercentage >= threshold;
      });

      const itemsWithAnalysis = await Promise.all(
        highScrapItems.map(async item => {
          const scrapPercentage = this._calculateScrapPercentage(item.scrapQuantity, item.totalQuantity);
          const expectedScrap = item.InventoryProduct.InventoryType.defaultScrapPercentage;
          const excessScrap = scrapPercentage - expectedScrap;
          const recentMovements = await this._getRecentScrapMovements(item.id, 30);

          return {
            itemId: item.id,
            product: item.InventoryProduct.model,
            brand: item.InventoryProduct.brand,
            category: item.InventoryProduct.InventoryType.InventoryCategory.name,
            location: item.InventoryLocation.name,
            totalQuantity: item.totalQuantity,
            scrapQuantity: item.scrapQuantity,
            scrapPercentage: parseFloat(scrapPercentage.toFixed(2)),
            expectedScrapPercentage: expectedScrap,
            excessScrapPercentage: parseFloat(excessScrap.toFixed(2)),
            scrapValue: item.scrapQuantity * (item.InventoryProduct.purchasePrice || 0),
            recentInstallations: recentMovements.length,
            averageScrapPerInstallation: recentMovements.length > 0 
              ? parseFloat((recentMovements.reduce((sum, m) => sum + m.scrapGenerated, 0) / recentMovements.length).toFixed(3))
              : 0,
            recommendations: this._generateScrapRecommendations(item, scrapPercentage, expectedScrap)
          };
        })
      );

      // Ordenar por exceso de scrap
      itemsWithAnalysis.sort((a, b) => b.excessScrapPercentage - a.excessScrapPercentage);

      const totalScrapValue = itemsWithAnalysis.reduce((sum, item) => sum + item.scrapValue, 0);

      return {
        success: true,
        data: {
          threshold,
          itemCount: itemsWithAnalysis.length,
          items: itemsWithAnalysis,
          summary: {
            totalScrapValue: parseFloat(totalScrapValue.toFixed(2)),
            averageExcessScrap: itemsWithAnalysis.length > 0
              ? parseFloat((itemsWithAnalysis.reduce((sum, item) => sum + item.excessScrapPercentage, 0) / itemsWithAnalysis.length).toFixed(2))
              : 0
          }
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo items con alto scrap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sugiere optimizaciones de materiales
   * @returns {Promise<Object>} Sugerencias de optimización
   */
  async suggestMaterialOptimization() {
    try {
      logger.info('Generando sugerencias de optimización de materiales');

      const suggestions = {
        procurement: [],
        usage: [],
        training: [],
        process: []
      };

      // Análisis de compras
      const lowStockItems = await this.getLowStockItems(15);
      if (lowStockItems.data.itemCount > 0) {
        suggestions.procurement.push({
          type: 'restock_needed',
          priority: 'high',
          description: `${lowStockItems.data.itemCount} items necesitan restock`,
          action: 'Generar orden de compra',
          estimatedCost: lowStockItems.data.summary.totalEstimatedCost,
          items: lowStockItems.data.items.filter(item => item.priority === 'high').slice(0, 5)
        });
      }

      // Análisis de uso excesivo de scrap
      const highScrapItems = await this.getHighScrapItems(12);
      if (highScrapItems.data.itemCount > 0) {
        const criticalItems = highScrapItems.data.items.filter(item => item.excessScrapPercentage > 10);
        
        if (criticalItems.length > 0) {
          suggestions.usage.push({
            type: 'excessive_scrap',
            priority: 'high',
            description: `${criticalItems.length} items con scrap excesivo`,
            action: 'Revisar técnicas de instalación',
            potentialSavings: criticalItems.reduce((sum, item) => sum + item.scrapValue, 0),
            items: criticalItems.slice(0, 3)
          });
        }
      }

      // Análisis de técnicos con alto scrap
      const technicianAnalysis = await this._analyzeTechnicianScrapPerformance();
      if (technicianAnalysis.lowPerformers.length > 0) {
        suggestions.training.push({
          type: 'technician_training',
          priority: 'medium',
          description: `${technicianAnalysis.lowPerformers.length} técnicos con eficiencia baja`,
          action: 'Programa de capacitación en instalación eficiente',
          technicians: technicianAnalysis.lowPerformers.slice(0, 3),
          potentialImprovement: `Reducir scrap promedio en ${processAnalysis.potentialImprovement}%`
        });
      }

      // Consolidar sugerencias por prioridad
      const prioritizedSuggestions = [
        ...suggestions.procurement.filter(s => s.priority === 'high'),
        ...suggestions.usage.filter(s => s.priority === 'high'),
        ...suggestions.training.filter(s => s.priority === 'medium'),
        ...suggestions.process.filter(s => s.priority === 'medium')
      ];

      return {
        success: true,
        data: {
          suggestions,
          prioritizedSuggestions,
          summary: {
            totalSuggestions: Object.values(suggestions).reduce((sum, arr) => sum + arr.length, 0),
            highPriorityCount: prioritizedSuggestions.filter(s => s.priority === 'high').length,
            mediumPriorityCount: prioritizedSuggestions.filter(s => s.priority === 'medium').length,
            potentialSavings: this._calculateTotalPotentialSavings(suggestions)
          }
        }
      };

    } catch (error) {
      logger.error(`Error generando sugerencias de optimización: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rastrea uso de materiales por técnico
   * @param {number} technicianId - ID del técnico
   * @param {string} period - Período ('30d', '90d', '6m')
   * @returns {Promise<Object>} Análisis de uso por técnico
   */
  async trackMaterialUsageByTechnician(technicianId, period = '30d') {
    try {
      logger.info(`Rastreando uso de materiales para técnico ${technicianId}, período: ${period}`);

      const startDate = this._getStartDateForPeriod(period);
      
      const movements = await InventoryMovement.findAll({
        where: {
          movedByUserId: technicianId,
          movementType: 'consumption',
          movementDate: {
            [db.Sequelize.Op.gte]: startDate
          }
        },
        include: [
          {
            model: Inventory,
            include: [
              {
                model: InventoryProduct,
                include: [
                  {
                    model: InventoryType,
                    include: [{ model: InventoryCategory }]
                  }
                ]
              }
            ]
          },
          {
            model: Client,
            attributes: ['id', 'firstName', 'lastName'],
            required: false
          }
        ],
        order: [['movementDate', 'DESC']]
      });

      const technician = await User.findByPk(technicianId, {
        attributes: ['id', 'fullName']
      });

      if (!technician) {
        throw new Error(`Técnico ${technicianId} no encontrado`);
      }

      // Análisis por categoría
      const usageByCategory = {};
      const usageByProduct = {};
      const installationHistory = [];

      let totalValue = 0;
      let totalScrap = 0;
      let totalQuantityUsed = 0;

      movements.forEach(movement => {
        const category = movement.Inventory.InventoryProduct.InventoryType.InventoryCategory.name;
        const product = movement.Inventory.InventoryProduct.model;
        const value = movement.quantityMoved * (movement.Inventory.InventoryProduct.purchasePrice || 0);
        const scrapValue = movement.scrapGenerated * (movement.Inventory.InventoryProduct.purchasePrice || 0);

        // Por categoría
        if (!usageByCategory[category]) {
          usageByCategory[category] = {
            quantityUsed: 0,
            scrapGenerated: 0,
            value: 0,
            scrapValue: 0,
            installations: 0
          };
        }
        usageByCategory[category].quantityUsed += movement.quantityMoved;
        usageByCategory[category].scrapGenerated += movement.scrapGenerated;
        usageByCategory[category].value += value;
        usageByCategory[category].scrapValue += scrapValue;
        usageByCategory[category].installations++;

        // Por producto
        if (!usageByProduct[product]) {
          usageByProduct[product] = {
            quantityUsed: 0,
            scrapGenerated: 0,
            value: 0,
            occurrences: 0,
            category: category
          };
        }
        usageByProduct[product].quantityUsed += movement.quantityMoved;
        usageByProduct[product].scrapGenerated += movement.scrapGenerated;
        usageByProduct[product].value += value;
        usageByProduct[product].occurrences++;

        // Historial de instalaciones
        installationHistory.push({
          date: movement.movementDate,
          client: movement.Client ? `${movement.Client.firstName} ${movement.Client.lastName}` : 'Sin cliente',
          product,
          quantityUsed: movement.quantityMoved,
          scrapGenerated: movement.scrapGenerated,
          efficiency: this._calculateEfficiency(movement.quantityMoved, movement.scrapGenerated),
          value,
          reference: movement.reference
        });

        // Totales
        totalValue += value;
        totalScrap += movement.scrapGenerated;
        totalQuantityUsed += movement.quantityMoved;
      });

      const globalEfficiency = this._calculateEfficiency(totalQuantityUsed, totalScrap);

      // Top productos más utilizados
      const topProducts = Object.entries(usageByProduct)
        .sort(([,a], [,b]) => b.value - a.value)
        .slice(0, 10)
        .map(([product, data]) => ({
          product,
          category: data.category,
          quantityUsed: parseFloat(data.quantityUsed.toFixed(3)),
          scrapGenerated: parseFloat(data.scrapGenerated.toFixed(3)),
          value: parseFloat(data.value.toFixed(2)),
          occurrences: data.occurrences,
          efficiency: this._calculateEfficiency(data.quantityUsed, data.scrapGenerated)
        }));

      // Análisis de eficiencia
      const efficiencyAnalysis = this._analyzeTechnicianEfficiency(movements);

      return {
        success: true,
        data: {
          technician: {
            id: technician.id,
            name: technician.fullName
          },
          period,
          summary: {
            totalInstallations: movements.length,
            totalQuantityUsed: parseFloat(totalQuantityUsed.toFixed(3)),
            totalScrap: parseFloat(totalScrap.toFixed(3)),
            totalValue: parseFloat(totalValue.toFixed(2)),
            globalEfficiency: parseFloat(globalEfficiency.toFixed(2)),
            averageInstallationValue: movements.length > 0 ? parseFloat((totalValue / movements.length).toFixed(2)) : 0
          },
          usageByCategory: Object.entries(usageByCategory).map(([category, data]) => ({
            category,
            quantityUsed: parseFloat(data.quantityUsed.toFixed(3)),
            scrapGenerated: parseFloat(data.scrapGenerated.toFixed(3)),
            value: parseFloat(data.value.toFixed(2)),
            scrapValue: parseFloat(data.scrapValue.toFixed(2)),
            installations: data.installations,
            efficiency: this._calculateEfficiency(data.quantityUsed, data.scrapGenerated)
          })),
          topProducts,
          efficiencyAnalysis,
          installationHistory: installationHistory.slice(0, 20), // Últimas 20 instalaciones
          recommendations: this._generateTechnicianRecommendations(efficiencyAnalysis, usageByCategory)
        }
      };

    } catch (error) {
      logger.error(`Error rastreando uso de materiales para técnico ${technicianId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene reporte de desperdicio por período
   * @param {string} period - Período ('30d', '90d', '6m')
   * @returns {Promise<Object>} Reporte de desperdicio
   */
  async getWastageReport(period = '30d') {
    try {
      logger.info(`Generando reporte de desperdicio para período ${period}`);

      const startDate = this._getStartDateForPeriod(period);
      
      // Obtener movimientos con scrap
      const movements = await InventoryMovement.findAll({
        where: {
          movementType: 'consumption',
          scrapGenerated: {
            [db.Sequelize.Op.gt]: 0
          },
          movementDate: {
            [db.Sequelize.Op.gte]: startDate
          }
        },
        include: [
          {
            model: Inventory,
            include: [
              {
                model: InventoryProduct,
                include: [
                  {
                    model: InventoryType,
                    include: [{ model: InventoryCategory }]
                  }
                ]
              }
            ]
          },
          {
            model: User,
            as: 'movedBy',
            attributes: ['id', 'fullName'],
            required: false
          }
        ]
      });

      // Análisis de desperdicio
      const wastageByCategory = {};
      const wastageByTechnician = {};
      const wastageTimeline = {};
      
      let totalWastageValue = 0;
      let totalQuantityUsed = 0;
      let totalScrapGenerated = 0;

      movements.forEach(movement => {
        const category = movement.Inventory.InventoryProduct.InventoryType.InventoryCategory.name;
        const technician = movement.movedBy ? movement.movedBy.fullName : 'Sin asignar';
        const date = moment(movement.movementDate).format('YYYY-MM-DD');
        const scrapValue = movement.scrapGenerated * (movement.Inventory.InventoryProduct.purchasePrice || 0);
        const expectedScrap = (movement.quantityMoved * movement.Inventory.InventoryProduct.InventoryType.defaultScrapPercentage) / 100;
        const excessScrap = Math.max(0, movement.scrapGenerated - expectedScrap);
        const excessScrapValue = excessScrap * (movement.Inventory.InventoryProduct.purchasePrice || 0);

        // Por categoría
        if (!wastageByCategory[category]) {
          wastageByCategory[category] = {
            totalScrap: 0,
            excessScrap: 0,
            value: 0,
            excessValue: 0,
            installations: 0
          };
        }
        wastageByCategory[category].totalScrap += movement.scrapGenerated;
        wastageByCategory[category].excessScrap += excessScrap;
        wastageByCategory[category].value += scrapValue;
        wastageByCategory[category].excessValue += excessScrapValue;
        wastageByCategory[category].installations++;

        // Por técnico
        if (!wastageByTechnician[technician]) {
          wastageByTechnician[technician] = {
            totalScrap: 0,
            excessScrap: 0,
            value: 0,
            installations: 0
          };
        }
        wastageByTechnician[technician].totalScrap += movement.scrapGenerated;
        wastageByTechnician[technician].excessScrap += excessScrap;
        wastageByTechnician[technician].value += scrapValue;
        wastageByTechnician[technician].installations++;

        // Timeline
        if (!wastageTimeline[date]) {
          wastageTimeline[date] = {
            totalScrap: 0,
            excessScrap: 0,
            value: 0,
            installations: 0
          };
        }
        wastageTimeline[date].totalScrap += movement.scrapGenerated;
        wastageTimeline[date].excessScrap += excessScrap;
        wastageTimeline[date].value += scrapValue;
        wastageTimeline[date].installations++;

        // Totales
        totalWastageValue += scrapValue;
        totalQuantityUsed += movement.quantityMoved;
        totalScrapGenerated += movement.scrapGenerated;
      });

      // Técnicos con mayor desperdicio
      const technicianWastage = Object.entries(wastageByTechnician)
        .sort(([,a], [,b]) => b.value - a.value)
        .map(([technician, data]) => ({
          technician,
          totalScrap: parseFloat(data.totalScrap.toFixed(3)),
          excessScrap: parseFloat(data.excessScrap.toFixed(3)),
          value: parseFloat(data.value.toFixed(2)),
          installations: data.installations,
          averageScrapPerInstallation: parseFloat((data.totalScrap / data.installations).toFixed(3)),
          efficiency: this._calculateEfficiency(data.installations * 100, data.totalScrap)
        }));

      // Identificar tendencias
      const trends = this._identifyWastageTrends(wastageTimeline);

      return {
        success: true,
        data: {
          period,
          summary: {
            totalInstallations: movements.length,
            totalQuantityUsed: parseFloat(totalQuantityUsed.toFixed(3)),
            totalScrapGenerated: parseFloat(totalScrapGenerated.toFixed(3)),
            totalWastageValue: parseFloat(totalWastageValue.toFixed(2)),
            averageWastagePerInstallation: movements.length > 0 
              ? parseFloat((totalScrapGenerated / movements.length).toFixed(3)) 
              : 0,
            wastageRate: totalQuantityUsed > 0 
              ? parseFloat(((totalScrapGenerated / totalQuantityUsed) * 100).toFixed(2))
              : 0
          },
          wastageByCategory: Object.entries(wastageByCategory).map(([category, data]) => ({
            category,
            totalScrap: parseFloat(data.totalScrap.toFixed(3)),
            excessScrap: parseFloat(data.excessScrap.toFixed(3)),
            value: parseFloat(data.value.toFixed(2)),
            excessValue: parseFloat(data.excessValue.toFixed(2)),
            installations: data.installations
          })),
          technicianWastage,
          trends,
          timeline: Object.entries(wastageTimeline)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({
              date,
              totalScrap: parseFloat(data.totalScrap.toFixed(3)),
              excessScrap: parseFloat(data.excessScrap.toFixed(3)),
              value: parseFloat(data.value.toFixed(2)),
              installations: data.installations
            })),
          recommendations: this._generateWastageRecommendations(wastageByCategory, technicianWastage)
        }
      };

    } catch (error) {
      logger.error(`Error generando reporte de desperdicio: ${error.message}`);
      throw error;
    }
  }

  /**
   * Registra materiales utilizados en una instalación
   * @param {number} ticketId - ID del ticket de instalación
   * @param {Array} materials - Lista de materiales utilizados
   * @returns {Promise<Object>} Resultado del registro
   */
  async recordInstallationMaterials(ticketId, materials) {
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Registrando materiales para ticket ${ticketId}`);

      // Validar ticket
      const ticket = await Ticket.findByPk(ticketId, {
        include: [
          { model: Client },
          { model: User, as: 'assignedTo' }
        ],
        transaction
      });

      if (!ticket) {
        throw new Error(`Ticket ${ticketId} no encontrado`);
      }

      const results = [];
      let totalCost = 0;

      for (const material of materials) {
        const { itemId, quantityUsed, notes } = material;

        // Calcular scrap automáticamente
        const scrapResult = await this.calculateScrapOnInstallation(itemId, quantityUsed, {
          ticketId,
          clientId: ticket.clientId,
          technicianId: ticket.assignedToId,
          installationType: material.installationType || 'standard',
          technicianExperience: material.technicianExperience || 'normal',
          reason: `Instalación - Ticket ${ticketId}`
        });

        // Registrar en InstallationMaterial
        await InstallationMaterial.create({
          ticketId,
          itemId,
          quantityUsed,
          scrapGenerated: scrapResult.data.scrapGenerated,
          usageType: 'installation',
          notes: notes || `Auto-registro para ticket ${ticketId}`
        }, { transaction });

        // Calcular costo
        const item = await Inventory.findByPk(itemId, {
          include: [{ model: InventoryProduct }],
          transaction
        });

        const materialCost = quantityUsed * (item.InventoryProduct.purchasePrice || 0);
        totalCost += materialCost;

        results.push({
          itemId,
          itemName: item.InventoryProduct.model,
          quantityUsed,
          scrapGenerated: scrapResult.data.scrapGenerated,
          efficiency: scrapResult.data.efficiency,
          cost: parseFloat(materialCost.toFixed(2))
        });
      }

      await transaction.commit();

      logger.info(`Materiales registrados para ticket ${ticketId}: ${materials.length} items, costo total: ${totalCost.toFixed(2)}`);

      return {
        success: true,
        data: {
          ticketId,
          materialsCount: materials.length,
          totalCost: parseFloat(totalCost.toFixed(2)),
          results,
          client: `${ticket.Client.firstName} ${ticket.Client.lastName}`,
          technician: ticket.assignedTo ? ticket.assignedTo.fullName : 'Sin asignar'
        },
        message: `${materials.length} materiales registrados exitosamente para ticket ${ticketId}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error registrando materiales para ticket ${ticketId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene materiales recomendados para un tipo de instalación
   * @param {number} ticketTypeId - ID del tipo de ticket
   * @returns {Promise<Object>} Materiales recomendados
   */
  async getMaterialsForInstallation(ticketTypeId) {
    try {
      logger.info(`Obteniendo materiales recomendados para tipo de ticket ${ticketTypeId}`);

      const ticketType = await TicketType.findByPk(ticketTypeId);
      if (!ticketType) {
        throw new Error(`Tipo de ticket ${ticketTypeId} no encontrado`);
      }

      // Obtener historial de materiales utilizados para este tipo de instalación
      const historicalMaterials = await InstallationMaterial.findAll({
        include: [
          {
            model: Ticket,
            where: { ticketTypeId },
            include: [{ model: TicketType }]
          },
          {
            model: Inventory,
            include: [
              {
                model: InventoryProduct,
                include: [
                  {
                    model: InventoryType,
                    include: [{ model: InventoryCategory }]
                  }
                ]
              }
            ]
          }
        ],
        where: {
          usageType: 'installation'
        }
      });

      // Agrupar y analizar materiales
      const materialUsage = {};
      
      historicalMaterials.forEach(material => {
        const productId = material.Inventory.InventoryProduct.id;
        const productName = material.Inventory.InventoryProduct.model;
        
        if (!materialUsage[productId]) {
          materialUsage[productId] = {
            product: material.Inventory.InventoryProduct,
            totalUsed: 0,
            totalScrap: 0,
            installations: 0,
            averageUsage: 0,
            averageScrap: 0
          };
        }
        
        materialUsage[productId].totalUsed += material.quantityUsed;
        materialUsage[productId].totalScrap += material.scrapGenerated;
        materialUsage[productId].installations++;
      });

      // Calcular promedios y generar recomendaciones
      const recommendations = Object.values(materialUsage)
        .map(usage => {
          usage.averageUsage = usage.totalUsed / usage.installations;
          usage.averageScrap = usage.totalScrap / usage.installations;
          
          return {
            productId: usage.product.id,
            productName: usage.product.model,
            brand: usage.product.brand,
            category: usage.product.InventoryType.InventoryCategory.name,
            unitType: usage.product.InventoryType.unitType,
            recommendedQuantity: Math.ceil(usage.averageUsage * 1.1), // 10% extra de seguridad
            averageUsage: parseFloat(usage.averageUsage.toFixed(3)),
            expectedScrap: parseFloat(usage.averageScrap.toFixed(3)),
            installations: usage.installations,
            confidence: this._calculateConfidenceLevel(usage.installations),
            estimatedCost: Math.ceil(usage.averageUsage * 1.1) * (usage.product.purchasePrice || 0)
          };
        })
        .filter(rec => rec.confidence >= 0.6) // Solo recomendaciones con confianza >= 60%
        .sort((a, b) => b.confidence - a.confidence);

      // Verificar disponibilidad en inventario
      const recommendationsWithStock = await Promise.all(
        recommendations.map(async rec => {
          const stockInfo = await this._getStockInfo(rec.productId);
          return {
            ...rec,
            stockInfo
          };
        })
      );

      const totalEstimatedCost = recommendationsWithStock.reduce((sum, rec) => sum + rec.estimatedCost, 0);

      return {
        success: true,
        data: {
          ticketType: {
            id: ticketType.id,
            name: ticketType.name,
            category: ticketType.category
          },
          recommendations: recommendationsWithStock,
          summary: {
            totalProducts: recommendationsWithStock.length,
            totalEstimatedCost: parseFloat(totalEstimatedCost.toFixed(2)),
            highConfidenceItems: recommendationsWithStock.filter(r => r.confidence >= 0.8).length,
            outOfStockItems: recommendationsWithStock.filter(r => !r.stockInfo.available).length
          },
          basedOnInstallations: historicalMaterials.length
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo materiales para instalación ${ticketTypeId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene análisis de costo de instalación por período
   * @param {string} period - Período ('30d', '90d', '6m')
   * @returns {Promise<Object>} Análisis de costos
   */
  async getInstallationCostAnalysis(period = '30d') {
    try {
      logger.info(`Generando análisis de costos de instalación para período ${period}`);

      const startDate = this._getStartDateForPeriod(period);
      
      const installationMaterials = await InstallationMaterial.findAll({
        where: {
          usedAt: {
            [db.Sequelize.Op.gte]: startDate
          }
        },
        include: [
          {
            model: Ticket,
            include: [
              { model: TicketType },
              { model: Client, attributes: ['id', 'firstName', 'lastName'] },
              { model: User, as: 'assignedTo', attributes: ['id', 'fullName'] }
            ]
          },
          {
            model: Inventory,
            include: [
              {
                model: InventoryProduct,
                include: [
                  {
                    model: InventoryType,
                    include: [{ model: InventoryCategory }]
                  }
                ]
              }
            ]
          }
        ]
      });

      // Análisis por tipo de instalación
      const costByTicketType = {};
      const costByTechnician = {};
      const costByCategory = {};
      const costTimeline = {};

      let totalCost = 0;
      let totalScrapCost = 0;
      let totalInstallations = new Set();

      installationMaterials.forEach(material => {
        const ticketType = material.Ticket.TicketType.name;
        const technician = material.Ticket.assignedTo ? material.Ticket.assignedTo.fullName : 'Sin asignar';
        const category = material.Inventory.InventoryProduct.InventoryType.InventoryCategory.name;
        const date = moment(material.usedAt).format('YYYY-MM-DD');
        
        const materialCost = material.quantityUsed * (material.Inventory.InventoryProduct.purchasePrice || 0);
        const scrapCost = material.scrapGenerated * (material.Inventory.InventoryProduct.purchasePrice || 0);

        totalInstallations.add(material.ticketId);

        // Por tipo de ticket
        if (!costByTicketType[ticketType]) {
          costByTicketType[ticketType] = {
            totalCost: 0,
            scrapCost: 0,
            installations: new Set(),
            materials: 0
          };
        }
        costByTicketType[ticketType].totalCost += materialCost;
        costByTicketType[ticketType].scrapCost += scrapCost;
        costByTicketType[ticketType].installations.add(material.ticketId);
        costByTicketType[ticketType].materials++;

        // Por técnico
        if (!costByTechnician[technician]) {
          costByTechnician[technician] = {
            totalCost: 0,
            scrapCost: 0,
            installations: new Set(),
            materials: 0
          };
        }
        costByTechnician[technician].totalCost += materialCost;
        costByTechnician[technician].scrapCost += scrapCost;
        costByTechnician[technician].installations.add(material.ticketId);
        costByTechnician[technician].materials++;

        // Por categoría
        if (!costByCategory[category]) {
          costByCategory[category] = {
            totalCost: 0,
            scrapCost: 0,
            materials: 0
          };
        }
        costByCategory[category].totalCost += materialCost;
        costByCategory[category].scrapCost += scrapCost;
        costByCategory[category].materials++;

        // Timeline
        if (!costTimeline[date]) {
          costTimeline[date] = {
            totalCost: 0,
            scrapCost: 0,
            installations: new Set(),
            materials: 0
          };
        }
        costTimeline[date].totalCost += materialCost;
        costTimeline[date].scrapCost += scrapCost;
        costTimeline[date].installations.add(material.ticketId);
        costTimeline[date].materials++;

        totalCost += materialCost;
        totalScrapCost += scrapCost;
      });

      // Convertir Sets a números para el análisis final
      Object.keys(costByTicketType).forEach(key => {
        costByTicketType[key].installations = costByTicketType[key].installations.size;
      });

      Object.keys(costByTechnician).forEach(key => {
        costByTechnician[key].installations = costByTechnician[key].installations.size;
      });

      Object.keys(costTimeline).forEach(key => {
        costTimeline[key].installations = costTimeline[key].installations.size;
      });

      // Análisis de eficiencia por técnico
      const technicianEfficiency = Object.entries(costByTechnician)
        .map(([technician, data]) => ({
          technician,
          totalCost: parseFloat(data.totalCost.toFixed(2)),
          scrapCost: parseFloat(data.scrapCost.toFixed(2)),
          installations: data.installations,
          materials: data.materials,
          averageCostPerInstallation: data.installations > 0 ? parseFloat((data.totalCost / data.installations).toFixed(2)) : 0,
          scrapRate: data.totalCost > 0 ? parseFloat(((data.scrapCost / data.totalCost) * 100).toFixed(2)) : 0,
          efficiency: data.totalCost > 0 ? parseFloat((((data.totalCost - data.scrapCost) / data.totalCost) * 100).toFixed(2)) : 0
        }))
        .sort((a, b) => a.averageCostPerInstallation - b.averageCostPerInstallation);

      return {
        success: true,
        data: {
          period,
          summary: {
            totalInstallations: totalInstallations.size,
            totalMaterials: installationMaterials.length,
            totalCost: parseFloat(totalCost.toFixed(2)),
            totalScrapCost: parseFloat(totalScrapCost.toFixed(2)),
            averageCostPerInstallation: totalInstallations.size > 0 ? parseFloat((totalCost / totalInstallations.size).toFixed(2)) : 0,
            scrapRate: totalCost > 0 ? parseFloat(((totalScrapCost / totalCost) * 100).toFixed(2)) : 0
          },
          costByTicketType: Object.entries(costByTicketType).map(([type, data]) => ({
            ticketType: type,
            totalCost: parseFloat(data.totalCost.toFixed(2)),
            scrapCost: parseFloat(data.scrapCost.toFixed(2)),
            installations: data.installations,
            materials: data.materials,
            averageCostPerInstallation: data.installations > 0 ? parseFloat((data.totalCost / data.installations).toFixed(2)) : 0
          })),
          costByCategory: Object.entries(costByCategory).map(([category, data]) => ({
            category,
            totalCost: parseFloat(data.totalCost.toFixed(2)),
            scrapCost: parseFloat(data.scrapCost.toFixed(2)),
            materials: data.materials
          })),
          technicianEfficiency,
          timeline: Object.entries(costTimeline)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({
              date,
              totalCost: parseFloat(data.totalCost.toFixed(2)),
              scrapCost: parseFloat(data.scrapCost.toFixed(2)),
              installations: data.installations,
              materials: data.materials
            }))
        }
      };

    } catch (error) {
      logger.error(`Error generando análisis de costos de instalación: ${error.message}`);
      throw error;
    }
  }

  // ===================================
  // FUNCIONES AUXILIARES PRIVADAS
  // ===================================

  /**
   * Obtiene factor de ajuste de scrap según condiciones
   * @private
   */
  _getScrapAdjustmentFactor(materialType, installationType, technicianExperience) {
    let factor = 1.0;

    // Ajuste por tipo de material
    const materialFactors = {
      'Cable': 1.2, // Cables tienden a generar más scrap
      'Conectores': 0.8, // Conectores menos desperdicio
      'Antenas': 0.9, // Equipos menos desperdicio
      'Herramientas': 0.5 // Herramientas muy poco desperdicio
    };

    // Ajuste por tipo de instalación
    const installationFactors = {
      'standard': 1.0,
      'complex': 1.3, // Instalaciones complejas generan más scrap
      'emergency': 1.5, // Emergencias generan mucho más scrap
      'maintenance': 0.8 // Mantenimiento genera menos scrap
    };

    // Ajuste por experiencia del técnico
    const experienceFactors = {
      'junior': 1.4, // Técnicos junior generan más scrap
      'normal': 1.0,
      'senior': 0.8, // Técnicos senior generan menos scrap
      'expert': 0.6 // Expertos minimizan el scrap
    };

    factor *= materialFactors[materialType] || 1.0;
    factor *= installationFactors[installationType] || 1.0;
    factor *= experienceFactors[technicianExperience] || 1.0;

    return Math.max(0.1, Math.min(3.0, factor)); // Limitar entre 0.1 y 3.0
  }

  /**
   * Redondea scrap según el tipo de unidad
   * @private
   */
  _roundScrapByUnit(scrapValue, unitType) {
    switch (unitType) {
      case 'piece':
        return Math.ceil(scrapValue); // Redondear hacia arriba para piezas
      case 'meters':
        return Math.round(scrapValue * 100) / 100; // 2 decimales para metros
      case 'grams':
        return Math.round(scrapValue); // Entero para gramos
      case 'box':
        return Math.ceil(scrapValue); // Redondear hacia arriba para cajas
      default:
        return Math.round(scrapValue * 1000) / 1000; // 3 decimales por defecto
    }
  }

  /**
   * Verifica y dispara alertas de scrap
   * @private
   */
  async _checkScrapAlerts(itemId, scrapGenerated, quantityUsed) {
    try {
      const scrapPercentage = (scrapGenerated / quantityUsed) * 100;
      
      // Alerta si el scrap excede el 25%
      if (scrapPercentage > 25) {
        logger.warn(`Alerta: Scrap excesivo en item ${itemId}: ${scrapPercentage.toFixed(2)}%`);
      }

      // Alerta si el scrap excede el 50% (crítico)
      if (scrapPercentage > 50) {
        logger.error(`Alerta crítica: Scrap muy alto en item ${itemId}: ${scrapPercentage.toFixed(2)}%`);
      }
    } catch (error) {
      logger.error(`Error verificando alertas de scrap: ${error.message}`);
    }
  }

  /**
   * Calcula eficiencia basada en cantidad usada vs scrap
   * @private
   */
  _calculateEfficiency(quantityUsed, scrapGenerated) {
    if (quantityUsed === 0) return 100;
    const efficiency = ((quantityUsed - scrapGenerated) / quantityUsed) * 100;
    return Math.max(0, Math.min(100, efficiency));
  }

  /**
   * Obtiene fecha de inicio para un período
   * @private
   */
  _getStartDateForPeriod(period) {
    const now = new Date();
    
    switch (period) {
      case '7d':
        return moment(now).subtract(7, 'days').toDate();
      case '30d':
        return moment(now).subtract(30, 'days').toDate();
      case '90d':
        return moment(now).subtract(90, 'days').toDate();
      case '6m':
        return moment(now).subtract(6, 'months').toDate();
      case '1y':
        return moment(now).subtract(1, 'year').toDate();
      default:
        return moment(now).subtract(30, 'days').toDate();
    }
  }

  /**
   * Verifica si un item está casi vacío
   * @private
   */
  _isItemAlmostEmpty(remainingQuantity, usableQuantity) {
    if (!usableQuantity || usableQuantity === 0) return false;
    const percentage = (remainingQuantity / usableQuantity) * 100;
    return percentage <= this.alertThresholds.almostEmpty;
  }

  /**
   * Calcula porcentaje de utilización
   * @private
   */
  _calculateUtilization(remainingQuantity, totalQuantity) {
    if (!totalQuantity || totalQuantity === 0) return 0;
    return (remainingQuantity / totalQuantity) * 100;
  }

  /**
   * Calcula porcentaje de scrap
   * @private
   */
  _calculateScrapPercentage(scrapQuantity, totalQuantity) {
    if (!totalQuantity || totalQuantity === 0) return 0;
    return (scrapQuantity / totalQuantity) * 100;
  }

  /**
   * Obtiene fecha del último movimiento
   * @private
   */
  async _getLastMovementDate(itemId) {
    try {
      const lastMovement = await InventoryMovement.findOne({
        where: { inventoryId: itemId },
        order: [['movementDate', 'DESC']]
      });
      
      return lastMovement ? lastMovement.movementDate : null;
    } catch (error) {
      logger.error(`Error obteniendo último movimiento para item ${itemId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtiene días desde el último movimiento
   * @private
   */
  async _getDaysSinceLastMovement(itemId) {
    try {
      const lastMovementDate = await this._getLastMovementDate(itemId);
      if (!lastMovementDate) return 0;
      
      return moment().diff(moment(lastMovementDate), 'days');
    } catch (error) {
      logger.error(`Error calculando días desde último movimiento: ${error.message}`);
      return 0;
    }
  }

  /**
   * Calcula cantidad sugerida para reorder
   * @private
   */
  _calculateSuggestedOrderQuantity(item) {
    // Análisis básico: 3 meses de uso promedio
    const monthlyUsage = item.totalQuantity * 0.1; // Estimación: 10% mensual
    const suggestedQuantity = monthlyUsage * 3;
    
    return Math.max(item.totalQuantity * 0.2, suggestedQuantity); // Mínimo 20% del total
  }

  /**
   * Obtiene movimientos recientes con scrap
   * @private
   */
  async _getRecentScrapMovements(itemId, days = 30) {
    try {
      const startDate = moment().subtract(days, 'days').toDate();
      
      return await InventoryMovement.findAll({
        where: {
          inventoryId: itemId,
          movementType: 'consumption',
          scrapGenerated: {
            [db.Sequelize.Op.gt]: 0
          },
          movementDate: {
            [db.Sequelize.Op.gte]: startDate
          }
        },
        order: [['movementDate', 'DESC']]
      });
    } catch (error) {
      logger.error(`Error obteniendo movimientos recientes: ${error.message}`);
      return [];
    }
  }

  /**
   * Genera recomendaciones para reducir scrap
   * @private
   */
  _generateScrapRecommendations(item, scrapPercentage, expectedScrap) {
    const recommendations = [];
    
    if (scrapPercentage > expectedScrap * 2) {
      recommendations.push('Revisar técnicas de instalación para este material');
      recommendations.push('Capacitar técnicos en manejo eficiente');
    }
    
    if (scrapPercentage > 20) {
      recommendations.push('Evaluar calidad del material');
      recommendations.push('Considerar proveedor alternativo');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Monitorear tendencia de scrap');
    }
    
    return recommendations;
  }

  /**
   * Analiza rendimiento de técnicos con scrap
   * @private
   */
  async _analyzeTechnicianScrapPerformance() {
    try {
      const movements = await InventoryMovement.findAll({
        where: {
          movementType: 'consumption',
          scrapGenerated: {
            [db.Sequelize.Op.gt]: 0
          },
          movementDate: {
            [db.Sequelize.Op.gte]: moment().subtract(90, 'days').toDate()
          }
        },
        include: [
          {
            model: User,
            as: 'movedBy',
            attributes: ['id', 'fullName'],
            required: true
          }
        ]
      });

      const technicianStats = {};
      
      movements.forEach(movement => {
        const technicianId = movement.movedByUserId;
        const technicianName = movement.movedBy.fullName;
        
        if (!technicianStats[technicianId]) {
          technicianStats[technicianId] = {
            name: technicianName,
            totalQuantityUsed: 0,
            totalScrap: 0,
            installations: 0
          };
        }
        
        technicianStats[technicianId].totalQuantityUsed += movement.quantityMoved;
        technicianStats[technicianId].totalScrap += movement.scrapGenerated;
        technicianStats[technicianId].installations++;
      });

      const averageScrapRate = Object.values(technicianStats).reduce((sum, tech) => {
        return sum + (tech.totalScrap / tech.totalQuantityUsed);
      }, 0) / Object.keys(technicianStats).length;

      const lowPerformers = Object.values(technicianStats)
        .filter(tech => (tech.totalScrap / tech.totalQuantityUsed) > averageScrapRate * 1.2)
        .map(tech => ({
          name: tech.name,
          scrapRate: parseFloat(((tech.totalScrap / tech.totalQuantityUsed) * 100).toFixed(2)),
          installations: tech.installations
        }));

      return {
        lowPerformers,
        averageExcessScrap: averageScrapRate * 100
      };
    } catch (error) {
      logger.error(`Error analizando rendimiento de técnicos: ${error.message}`);
      return { lowPerformers: [], averageExcessScrap: 0 };
    }
  }

  /**
   * Analiza procesos de instalación ineficientes
   * @private
   */
  async _analyzeInstallationProcesses() {
    try {
      // Análisis simplificado de procesos
      const processes = [
        {
          name: 'Instalación estándar',
          averageScrap: 8.5,
          expectedScrap: 5.0,
          improvement: 3.5
        }
      ];

      const inefficientProcesses = processes.filter(p => p.averageScrap > p.expectedScrap * 1.5);

      return {
        inefficientProcesses,
        potentialImprovement: inefficientProcesses.length > 0 
          ? inefficientProcesses[0].improvement 
          : 0
      };
    } catch (error) {
      logger.error(`Error analizando procesos de instalación: ${error.message}`);
      return { inefficientProcesses: [], potentialImprovement: 0 };
    }
  }

  /**
   * Calcula ahorros totales potenciales
   * @private
   */
  _calculateTotalPotentialSavings(suggestions) {
    let totalSavings = 0;
    
    Object.values(suggestions).forEach(suggestionArray => {
      suggestionArray.forEach(suggestion => {
        if (suggestion.potentialSavings) {
          totalSavings += suggestion.potentialSavings;
        }
      });
    });
    
    return parseFloat(totalSavings.toFixed(2));
  }

  /**
   * Analiza eficiencia de técnico basado en movimientos
   * @private
   */
  _analyzeTechnicianEfficiency(movements) {
    if (movements.length === 0) {
      return {
        averageEfficiency: 0,
        trend: 'stable',
        bestCategory: null,
        worstCategory: null
      };
    }

    const efficiencies = movements.map(m => this._calculateEfficiency(m.quantityMoved, m.scrapGenerated));
    const averageEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
    
    // Análisis de tendencia simple
    const recentEfficiencies = efficiencies.slice(0, Math.min(10, efficiencies.length));
    const olderEfficiencies = efficiencies.slice(Math.min(10, efficiencies.length));
    
    let trend = 'stable';
    if (recentEfficiencies.length > 0 && olderEfficiencies.length > 0) {
      const recentAvg = recentEfficiencies.reduce((sum, eff) => sum + eff, 0) / recentEfficiencies.length;
      const olderAvg = olderEfficiencies.reduce((sum, eff) => sum + eff, 0) / olderEfficiencies.length;
      
      if (recentAvg > olderAvg + 2) trend = 'improving';
      else if (recentAvg < olderAvg - 2) trend = 'declining';
    }

    return {
      averageEfficiency: parseFloat(averageEfficiency.toFixed(2)),
      trend,
      totalInstallations: movements.length,
      bestEfficiency: Math.max(...efficiencies),
      worstEfficiency: Math.min(...efficiencies)
    };
  }

  /**
   * Genera recomendaciones para técnico
   * @private
   */
  _generateTechnicianRecommendations(efficiencyAnalysis, usageByCategory) {
    const recommendations = [];
    
    if (efficiencyAnalysis.averageEfficiency < 85) {
      recommendations.push('Considerar capacitación adicional en técnicas de instalación eficiente');
    }
    
    if (efficiencyAnalysis.trend === 'declining') {
      recommendations.push('Revisar procedimientos recientes - tendencia de eficiencia a la baja');
    }
    
    // Analizar categorías con mayor scrap
    const categoryScrapRates = Object.entries(usageByCategory)
      .map(([category, data]) => ({
        category,
        scrapRate: (data.scrapGenerated / data.quantityUsed) * 100
      }))
      .sort((a, b) => b.scrapRate - a.scrapRate);
    
    if (categoryScrapRates.length > 0 && categoryScrapRates[0].scrapRate > 15) {
      recommendations.push(`Enfocarse en reducir desperdicio en categoría: ${categoryScrapRates[0].category}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Mantener buen rendimiento actual');
    }
    
    return recommendations;
  }

  /**
   * Identifica tendencias en desperdicio
   * @private
   */
  _identifyWastageTrends(wastageTimeline) {
    const dates = Object.keys(wastageTimeline).sort();
    
    if (dates.length < 7) {
      return { trend: 'insufficient_data', message: 'Datos insuficientes para análisis de tendencia' };
    }
    
    // Análisis de tendencia simple
    const recentValues = dates.slice(-7).map(date => wastageTimeline[date].value);
    const olderValues = dates.slice(0, 7).map(date => wastageTimeline[date].value);
    
    const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const olderAvg = olderValues.reduce((sum, val) => sum + val, 0) / olderValues.length;
    
    let trend = 'stable';
    let change = 0;
    
    if (recentAvg > olderAvg * 1.1) {
      trend = 'increasing';
      change = ((recentAvg - olderAvg) / olderAvg) * 100;
    } else if (recentAvg < olderAvg * 0.9) {
      trend = 'decreasing';
      change = ((olderAvg - recentAvg) / olderAvg) * 100;
    }
    
    return {
      trend,
      change: parseFloat(change.toFixed(2)),
      recentAverage: parseFloat(recentAvg.toFixed(2)),
      historicalAverage: parseFloat(olderAvg.toFixed(2))
    };
  }

  /**
   * Genera recomendaciones para reducir desperdicio
   * @private
   */
  _generateWastageRecommendations(wastageByCategory, technicianWastage) {
    const recommendations = [];
    
    // Top categoría con más desperdicio
    const topCategory = Object.entries(wastageByCategory)
      .sort(([,a], [,b]) => b.value - a.value)[0];
    
    if (topCategory && topCategory[1].value > 0) {
      recommendations.push({
        type: 'category_focus',
        description: `Enfocar esfuerzos en reducir desperdicio en: ${topCategory[0]}`,
        priority: 'high',
        savings: topCategory[1].excessValue
      });
    }
    
    // Top técnico con más desperdicio
    const topTechnician = technicianWastage[0];
    if (topTechnician && topTechnician.value > 0) {
      recommendations.push({
        type: 'technician_training',
        description: `Capacitación específica para: ${topTechnician.technician}`,
        priority: 'medium',
        savings: topTechnician.value * 0.3 // Estimación: 30% de reducción
      });
    }
    
    return recommendations;
  }

  /**
   * Obtiene información de stock para un producto
   * @private
   */
  async _getStockInfo(productId) {
    try {
      const items = await Inventory.findAll({
        include: [
          {
            model: InventoryProduct,
            where: { id: productId }
          }
        ]
      });
      
      const totalRemaining = items.reduce((sum, item) => sum + item.remainingQuantity, 0);
      const available = totalRemaining > 0;
      
      return {
        available,
        totalRemaining,
        locations: items.length,
        lowStock: totalRemaining < 10 // Threshold simple
      };
    } catch (error) {
      logger.error(`Error obteniendo info de stock: ${error.message}`);
      return {
        available: false,
        totalRemaining: 0,
        locations: 0,
        lowStock: true
      };
    }
  }

  /**
   * Calcula nivel de confianza basado en número de instalaciones
   * @private
   */
  _calculateConfidenceLevel(installations) {
    if (installations >= 20) return 0.95;
    if (installations >= 10) return 0.85;
    if (installations >= 5) return 0.75;
    if (installations >= 3) return 0.65;
    return 0.5;
  }
}

module.exports = new InventoryScrapService();Reducir scrap en ${technicianAnalysis.averageExcessScrap.toFixed(1)}%`
        });
      }

      // Análisis de procesos
      const processAnalysis = await this._analyzeInstallationProcesses();
      if (processAnalysis.inefficientProcesses.length > 0) {
        suggestions.process.push({
          type: 'process_improvement',
          priority: 'medium',
          description: 'Procesos de instalación ineficientes detectados',
          action: 'Optimizar procedimientos de instalación',
          processes: processAnalysis.inefficientProcesses,
          potentialImprovement: `