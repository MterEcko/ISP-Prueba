// backend/src/controllers/employeeConfig.controller.js
const db = require('../models');
const { EmployeeConfig, User } = db;

/**
 * Obtener configuración de un empleado
 */
exports.getEmployeeConfig = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const config = await EmployeeConfig.findOne({
      where: { employeeId },
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'username', 'email', 'firstName', 'lastName']
        }
      ]
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración para este empleado'
      });
    }

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error obteniendo configuración de empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo configuración de empleado',
      error: error.message
    });
  }
};

/**
 * Obtener todas las configuraciones de empleados
 */
exports.getAllEmployeeConfigs = async (req, res) => {
  try {
    const { active } = req.query;

    const where = {};
    if (active !== undefined) {
      where.active = active === 'true';
    }

    const configs = await EmployeeConfig.findAll({
      where,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'username', 'email', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Error obteniendo configuraciones de empleados:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo configuraciones de empleados',
      error: error.message
    });
  }
};

/**
 * Crear o actualizar configuración de empleado
 */
exports.upsertEmployeeConfig = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const {
      dailySalary,
      defaultPaymentType,
      position,
      department,
      hireDate,
      active,
      notes
    } = req.body;

    // Validar que el empleado existe
    const employee = await User.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    // Validar salario diario
    if (!dailySalary || dailySalary <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El salario diario debe ser mayor a 0'
      });
    }

    // Buscar configuración existente
    let config = await EmployeeConfig.findOne({ where: { employeeId } });

    if (config) {
      // Actualizar existente
      await config.update({
        dailySalary,
        defaultPaymentType: defaultPaymentType || config.defaultPaymentType,
        position: position !== undefined ? position : config.position,
        department: department !== undefined ? department : config.department,
        hireDate: hireDate !== undefined ? hireDate : config.hireDate,
        active: active !== undefined ? active : config.active,
        notes: notes !== undefined ? notes : config.notes
      });
    } else {
      // Crear nueva
      config = await EmployeeConfig.create({
        employeeId,
        dailySalary,
        defaultPaymentType: defaultPaymentType || 'monthly',
        position,
        department,
        hireDate,
        active: active !== undefined ? active : true,
        notes
      });
    }

    // Recargar con datos del empleado
    await config.reload({
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'username', 'email', 'firstName', 'lastName']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: config.createdAt === config.updatedAt
        ? 'Configuración de empleado creada exitosamente'
        : 'Configuración de empleado actualizada exitosamente',
      data: config
    });
  } catch (error) {
    console.error('Error creando/actualizando configuración de empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando/actualizando configuración de empleado',
      error: error.message
    });
  }
};

/**
 * Eliminar configuración de empleado
 */
exports.deleteEmployeeConfig = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const config = await EmployeeConfig.findOne({ where: { employeeId } });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración para este empleado'
      });
    }

    await config.destroy();

    res.status(200).json({
      success: true,
      message: 'Configuración de empleado eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando configuración de empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando configuración de empleado',
      error: error.message
    });
  }
};

/**
 * Calcular salario para un período
 */
exports.calculateSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { paymentType } = req.query;

    const config = await EmployeeConfig.findOne({ where: { employeeId } });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración de salario para este empleado'
      });
    }

    // Mapeo de días por tipo de pago
    const daysMapping = {
      'weekly': 7,
      'biweekly': 14,
      'catorcenal': 14,
      'quincenal': 15,
      'monthly': 30,
      'cada10dias': 10
    };

    const paymentTypeToUse = paymentType || config.defaultPaymentType;
    const days = daysMapping[paymentTypeToUse] || 30;
    const calculatedSalary = parseFloat(config.dailySalary) * days;

    res.status(200).json({
      success: true,
      data: {
        employeeId: config.employeeId,
        dailySalary: config.dailySalary,
        paymentType: paymentTypeToUse,
        days,
        calculatedSalary: calculatedSalary.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error calculando salario:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculando salario',
      error: error.message
    });
  }
};
