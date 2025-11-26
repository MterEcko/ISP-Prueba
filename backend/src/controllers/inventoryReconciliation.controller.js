// backend/src/controllers/inventoryReconciliation.controller.js

const db = require('../models');
const Inventory = db.Inventory;
const InventoryMovement = db.InventoryMovement;
const TechnicianInventoryReconciliation = db.TechnicianInventoryReconciliation;
const User = db.User;
const Op = db.Sequelize.Op;
const moment = require('moment');

// Generar reconciliación para un técnico y período
exports.generateReconciliation = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { technicianId, period } = req.body; // period formato: "2024-12"

    if (!technicianId || !period) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "technicianId y period son obligatorios (formato: YYYY-MM)"
      });
    }

    // Validar técnico
    const technician = await User.findByPk(technicianId);
    if (!technician) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Técnico con ID ${technicianId} no encontrado`
      });
    }

    // Validar si ya existe reconciliación para este período
    const existing = await TechnicianInventoryReconciliation.findOne({
      where: { technicianId, period }
    });

    if (existing) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Ya existe una reconciliación para ${technician.fullName} en ${period}`
      });
    }

    // Calcular fechas del período
    const startDate = moment(period, 'YYYY-MM').startOf('month').toDate();
    const endDate = moment(period, 'YYYY-MM').endOf('month').toDate();

    // 1. Total asignado en el período
    const assigned = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        assignedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('cost')), 'totalCost']
      ],
      raw: true,
      transaction
    });

    // 2. Total instalado en clientes
    const installed = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        status: 'installed',
        installedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('cost')), 'totalCost']
      ],
      raw: true,
      transaction
    });

    // 3. Total devuelto al almacén
    const returned = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        status: 'returned',
        returnedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('cost')), 'totalCost']
      ],
      raw: true,
      transaction
    });

    // 4. Total reportado como perdido
    const missing = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        status: 'missing',
        missingReportedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('cost')), 'totalCost']
      ],
      raw: true,
      transaction
    });

    // 5. Material aún con el técnico (sin registrar)
    const stillAssigned = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        inventoryCategory: 'assigned_bulk',
        status: 'inUse',
        assignedAt: {
          [Op.lte]: endDate
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('cost')), 'totalCost']
      ],
      raw: true,
      transaction
    });

    const totalAssigned = parseFloat(assigned[0].totalCost) || 0;
    const totalInstalled = parseFloat(installed[0].totalCost) || 0;
    const totalReturned = parseFloat(returned[0].totalCost) || 0;
    const totalMissing = parseFloat(missing[0].totalCost) || 0;
    const totalStillAssigned = parseFloat(stillAssigned[0].totalCost) || 0;

    // Calcular discrepancia
    const accounted = totalInstalled + totalReturned + totalMissing + totalStillAssigned;
    const discrepancy = totalAssigned - accounted;

    // Crear reconciliación
    const reconciliation = await TechnicianInventoryReconciliation.create({
      technicianId,
      period,
      totalAssigned,
      totalInstalled,
      totalReturned,
      totalMissing: totalMissing + Math.abs(discrepancy > 0 ? discrepancy : 0),
      status: discrepancy > (totalAssigned * 0.05) ? 'discrepancy' : 'completed', // >5% = discrepancia
      discrepancyDetails: discrepancy !== 0 ? {
        amount: parseFloat(discrepancy.toFixed(2)),
        percentage: parseFloat(((discrepancy / totalAssigned) * 100).toFixed(2)),
        stillAssigned: totalStillAssigned,
        message: discrepancy > 0 ? 
          `Material sin registrar: $${discrepancy.toFixed(2)}` : 
          `Sobrerregistro: $${Math.abs(discrepancy).toFixed(2)}`
      } : null,
      createdByUserId: req.userId
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Reconciliación generada exitosamente",
      data: {
        reconciliation,
        details: {
          period,
          technician: {
            id: technician.id,
            name: technician.fullName
          },
          summary: {
            totalAssigned: parseFloat(totalAssigned.toFixed(2)),
            totalInstalled: parseFloat(totalInstalled.toFixed(2)),
            totalReturned: parseFloat(totalReturned.toFixed(2)),
            totalMissing: parseFloat((totalMissing + (discrepancy > 0 ? discrepancy : 0)).toFixed(2)),
            stillAssigned: parseFloat(totalStillAssigned.toFixed(2)),
            accountabilityRate: parseFloat(reconciliation.accountabilityRate),
            discrepancy: parseFloat(discrepancy.toFixed(2))
          }
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error generando reconciliación:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener reconciliaciones de un técnico
exports.getTechnicianReconciliations = async (req, res) => {
  try {
    const technicianId = req.params.technicianId;

    const reconciliations = await TechnicianInventoryReconciliation.findAll({
      where: { technicianId },
      include: [
        {
          model: User,
          as: 'technician',
          attributes: ['id', 'fullName', 'username']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'fullName']
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'fullName']
        }
      ],
      order: [['period', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        technician: reconciliations.length > 0 ? {
          id: reconciliations[0].technician.id,
          name: reconciliations[0].technician.fullName
        } : null,
        reconciliations
      }
    });
  } catch (error) {
    console.error("Error obteniendo reconciliaciones:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener todas las reconciliaciones (con filtros)
exports.getAllReconciliations = async (req, res) => {
  try {
    const { 
      page = 1, 
      size = 10, 
      period,
      status,
      technicianId 
    } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    const condition = {};
    if (period) condition.period = period;
    if (status) condition.status = status;
    if (technicianId) condition.technicianId = technicianId;

    const { count, rows: reconciliations } = await TechnicianInventoryReconciliation.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'technician',
          attributes: ['id', 'fullName', 'username']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'fullName']
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'fullName']
        }
      ],
      order: [['reconciliationDate', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        totalItems: count,
        reconciliations,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error("Error obteniendo reconciliaciones:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Aprobar reconciliación
exports.approveReconciliation = async (req, res) => {
  try {
    const reconciliationId = req.params.id;
    const { notes } = req.body;

    const reconciliation = await TechnicianInventoryReconciliation.findByPk(reconciliationId);

    if (!reconciliation) {
      return res.status(404).json({
        success: false,
        message: `Reconciliación con ID ${reconciliationId} no encontrada`
      });
    }

    if (reconciliation.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: "La reconciliación ya está aprobada"
      });
    }

    await reconciliation.update({
      status: 'approved',
      approvedByUserId: req.userId,
      approvedAt: new Date(),
      notes: notes ? `${reconciliation.notes || ''}\n${notes}` : reconciliation.notes
    });

    return res.status(200).json({
      success: true,
      message: "Reconciliación aprobada exitosamente",
      data: reconciliation
    });
  } catch (error) {
    console.error("Error aprobando reconciliación:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Balance de técnico (resumen actual)
exports.getTechnicianBalance = async (req, res) => {
  try {
    const technicianId = req.params.technicianId;
    const { period } = req.query; // Opcional, por defecto mes actual

    const technician = await User.findByPk(technicianId, {
      attributes: ['id', 'fullName', 'username', 'email']
    });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: `Técnico con ID ${technicianId} no encontrado`
      });
    }

    // Si no se especifica período, usar mes actual
    const targetPeriod = period || moment().format('YYYY-MM');
    const startDate = moment(targetPeriod, 'YYYY-MM').startOf('month').toDate();
    const endDate = moment(targetPeriod, 'YYYY-MM').endOf('month').toDate();

    // Material actualmente asignado
    const currentlyAssigned = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        inventoryCategory: 'assigned_bulk',
        status: 'inUse'
      },
      attributes: ['id', 'name', 'quantity', 'unitType', 'cost', 'assignedAt']
    });

    // Material asignado en el período
    const assignedInPeriod = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        assignedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('cost')), 'totalCost'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      raw: true
    });

    // Material instalado en el período
    const installedInPeriod = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        status: 'installed',
        installedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('cost')), 'totalCost'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      raw: true
    });

    // Material devuelto en el período
    const returnedInPeriod = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        status: 'returned',
        returnedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('cost')), 'totalCost'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      raw: true
    });

    // Material perdido en el período
    const missingInPeriod = await Inventory.findAll({
      where: {
        assignedToTechnicianId: technicianId,
        status: 'missing',
        missingReportedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('cost')), 'totalCost'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      raw: true
    });

    // Calcular totales
    const totalAssigned = parseFloat(assignedInPeriod[0]?.totalCost) || 0;
    const totalInstalled = parseFloat(installedInPeriod[0]?.totalCost) || 0;
    const totalReturned = parseFloat(returnedInPeriod[0]?.totalCost) || 0;
    const totalMissing = parseFloat(missingInPeriod[0]?.totalCost) || 0;
    
    const currentBalance = currentlyAssigned.reduce((sum, item) => sum + parseFloat(item.cost), 0);

    // Calcular accountability rate
    const accounted = totalInstalled + totalReturned;
    const accountabilityRate = totalAssigned > 0 ? ((accounted / totalAssigned) * 100).toFixed(2) : 100;

    return res.status(200).json({
      success: true,
      data: {
        technician: {
          id: technician.id,
          name: technician.fullName,
          email: technician.email
        },
        period: targetPeriod,
        summary: {
          totalAssigned: parseFloat(totalAssigned.toFixed(2)),
          totalInstalled: parseFloat(totalInstalled.toFixed(2)),
          totalReturned: parseFloat(totalReturned.toFixed(2)),
          totalMissing: parseFloat(totalMissing.toFixed(2)),
          currentBalance: parseFloat(currentBalance.toFixed(2)),
          accountabilityRate: parseFloat(accountabilityRate)
        },
        counts: {
          assigned: parseInt(assignedInPeriod[0]?.count) || 0,
          installed: parseInt(installedInPeriod[0]?.count) || 0,
          returned: parseInt(returnedInPeriod[0]?.count) || 0,
          missing: parseInt(missingInPeriod[0]?.count) || 0,
          currentItems: currentlyAssigned.length
        },
        currentlyAssigned: currentlyAssigned.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitType: item.unitType,
          cost: parseFloat(item.cost),
          assignedAt: item.assignedAt,
          daysAssigned: moment().diff(moment(item.assignedAt), 'days')
        }))
      }
    });
  } catch (error) {
    console.error("Error obteniendo balance de técnico:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reporte de material sin registrar
exports.getUnregisteredReport = async (req, res) => {
  try {
    const { daysThreshold = 30 } = req.query;

    // Material asignado hace más de X días sin movimiento
    const thresholdDate = moment().subtract(daysThreshold, 'days').toDate();

    const unregisteredItems = await Inventory.findAll({
      where: {
        inventoryCategory: 'assigned_bulk',
        status: 'inUse',
        assignedAt: {
          [Op.lte]: thresholdDate
        },
        reconciliationStatus: 'pending'
      },
      include: [
        {
          model: User,
          as: 'assignedTechnician',
          attributes: ['id', 'fullName', 'username']
        }
      ],
      order: [['assignedAt', 'ASC']]
    });

    // Agrupar por técnico
    const byTechnician = {};
    let totalValue = 0;

    unregisteredItems.forEach(item => {
      const techId = item.assignedToTechnicianId;
      const techName = item.assignedTechnician ? item.assignedTechnician.fullName : 'Sin asignar';
      
      if (!byTechnician[techId]) {
        byTechnician[techId] = {
          technicianId: techId,
          technicianName: techName,
          items: [],
          totalValue: 0,
          oldestDays: 0
        };
      }

      const daysWithoutRegister = moment().diff(moment(item.assignedAt), 'days');
      const itemValue = parseFloat(item.cost);

      byTechnician[techId].items.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitType: item.unitType,
        value: itemValue,
        assignedAt: item.assignedAt,
        daysWithoutRegister
      });

      byTechnician[techId].totalValue += itemValue;
      totalValue += itemValue;

      if (daysWithoutRegister > byTechnician[techId].oldestDays) {
        byTechnician[techId].oldestDays = daysWithoutRegister;
      }
    });

    // Convertir a array y ordenar por valor
    const technicianReport = Object.values(byTechnician)
      .sort((a, b) => b.totalValue - a.totalValue)
      .map(tech => ({
        ...tech,
        totalValue: parseFloat(tech.totalValue.toFixed(2)),
        itemCount: tech.items.length
      }));

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUnregistered: unregisteredItems.length,
          totalValue: parseFloat(totalValue.toFixed(2)),
          techniciansAffected: technicianReport.length,
          oldestUnregistered: unregisteredItems.length > 0 ? 
            moment().diff(moment(unregisteredItems[0].assignedAt), 'days') : 0,
          daysThreshold: parseInt(daysThreshold)
        },
        byTechnician: technicianReport,
        allItems: unregisteredItems.slice(0, 50).map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitType: item.unitType,
          value: parseFloat(item.cost),
          technician: item.assignedTechnician ? item.assignedTechnician.fullName : 'Sin asignar',
          assignedAt: item.assignedAt,
          daysWithoutRegister: moment().diff(moment(item.assignedAt), 'days')
        }))
      }
    });
  } catch (error) {
    console.error("Error generando reporte de material sin registrar:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cerrar material sin registrar (administrativamente)
exports.closeUnregistered = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const inventoryId = req.params.id;
    const { action, notes } = req.body; // action: 'mark_as_consumed' o 'charge_technician'

    const item = await Inventory.findByPk(inventoryId, { transaction });

    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Item con ID ${inventoryId} no encontrado`
      });
    }

    if (item.inventoryCategory !== 'assigned_bulk') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Solo se puede cerrar material asignado a técnico"
      });
    }

    // Marcar como consumido sin detalle
    await item.update({
      status: 'missing',
      missingReportedAt: new Date(),
      reconciliationStatus: 'discrepancy',
      notes: `${item.notes || ''}\nCERRADO ADMINISTRATIVAMENTE: ${action}. ${notes || ''}`
    }, { transaction });

    // Crear movimiento de ajuste
    await InventoryMovement.create({
      inventoryId: item.id,
      type: 'adjustment',
      quantity: item.quantity,
      reason: `Cierre administrativo: ${action}`,
      movedById: req.userId,
      notes: notes || 'Material cerrado sin registro detallado'
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Material cerrado administrativamente",
      data: {
        itemId: item.id,
        action,
        quantityClosed: item.quantity,
        costImpact: parseFloat(item.cost)
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error cerrando material sin registrar:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Eliminar reconciliación
exports.deleteReconciliation = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;

    const reconciliation = await TechnicianInventoryReconciliation.findByPk(id);

    if (!reconciliation) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Reconciliación no encontrada"
      });
    }

    // No permitir eliminar reconciliaciones aprobadas
    if (reconciliation.status === 'approved') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar una reconciliación que ya ha sido aprobada"
      });
    }

    await reconciliation.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Reconciliación eliminada exitosamente"
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error eliminando reconciliación:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};