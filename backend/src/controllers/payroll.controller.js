const Payroll = require('../models/payroll.model');
const PayrollPayment = require('../models/payrollPayment.model');
const User = require('../models/user.model');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Crear nómina
exports.createPayroll = async (req, res) => {
  try {
    const {
      userId,
      period,
      paymentType,
      baseSalary,
      overtimeHours,
      overtimeAmount,
      bonus,
      taxDeduction,
      socialSecurityDeduction,
      otherDeductions,
      deductionNotes,
      notes
    } = req.body;

    // Validar que el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si ya existe nómina para este periodo
    const existingPayroll = await Payroll.findOne({
      where: {
        userId,
        period,
        paymentType
      }
    });

    if (existingPayroll) {
      return res.status(400).json({
        error: `Ya existe una nómina ${paymentType} para ${user.fullName} en el periodo ${period}`
      });
    }

    // Calcular totales
    const totalDeductions = (parseFloat(taxDeduction) || 0) +
                           (parseFloat(socialSecurityDeduction) || 0) +
                           (parseFloat(otherDeductions) || 0);

    const netSalary = (parseFloat(baseSalary) || 0) +
                     (parseFloat(overtimeAmount) || 0) +
                     (parseFloat(bonus) || 0) -
                     totalDeductions;

    const payroll = await Payroll.create({
      userId,
      period,
      paymentType,
      baseSalary,
      overtimeHours: overtimeHours || 0,
      overtimeAmount: overtimeAmount || 0,
      bonus: bonus || 0,
      taxDeduction: taxDeduction || 0,
      socialSecurityDeduction: socialSecurityDeduction || 0,
      otherDeductions: otherDeductions || 0,
      deductionNotes,
      totalDeductions,
      netSalary,
      status: 'pending',
      notes,
      createdBy: req.userId
    });

    const payrollWithDetails = await Payroll.findByPk(payroll.id, {
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'fullName', 'username', 'position']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'username']
        }
      ]
    });

    res.status(201).json({
      message: 'Nómina creada exitosamente',
      payroll: payrollWithDetails
    });
  } catch (error) {
    console.error('Error al crear nómina:', error);
    res.status(500).json({ error: 'Error al crear nómina' });
  }
};

// Listar nóminas
exports.getPayrolls = async (req, res) => {
  try {
    const {
      userId,
      period,
      status,
      paymentType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};

    if (userId) {
      where.userId = userId;
    }

    if (period) {
      where.period = period;
    }

    if (status) {
      where.status = status;
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    if (startDate && endDate) {
      where.paymentDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: payrolls } = await Payroll.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'fullName', 'username', 'position']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'username']
        },
        {
          model: User,
          as: 'payer',
          attributes: ['id', 'fullName', 'username']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      payrolls,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener nóminas:', error);
    res.status(500).json({ error: 'Error al obtener nóminas' });
  }
};

// Obtener nómina por ID
exports.getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await Payroll.findByPk(id, {
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'fullName', 'username', 'position', 'email', 'phone']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'username']
        },
        {
          model: User,
          as: 'payer',
          attributes: ['id', 'fullName', 'username']
        },
        {
          model: PayrollPayment,
          as: 'payments'
        }
      ]
    });

    if (!payroll) {
      return res.status(404).json({ error: 'Nómina no encontrada' });
    }

    res.json(payroll);
  } catch (error) {
    console.error('Error al obtener nómina:', error);
    res.status(500).json({ error: 'Error al obtener nómina' });
  }
};

// Registrar pago de nómina
exports.payPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference, notes } = req.body;

    const payroll = await Payroll.findByPk(id);
    if (!payroll) {
      return res.status(404).json({ error: 'Nómina no encontrada' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ error: 'Esta nómina ya ha sido pagada' });
    }

    if (payroll.status === 'cancelled') {
      return res.status(400).json({ error: 'Esta nómina ha sido cancelada' });
    }

    // Registrar el pago
    const payment = await PayrollPayment.create({
      payrollId: payroll.id,
      amount: payroll.netSalary,
      paymentDate: new Date(),
      paymentMethod,
      paymentReference,
      notes,
      createdBy: req.userId
    });

    // Actualizar estado de la nómina
    await payroll.update({
      status: 'paid',
      paymentDate: new Date(),
      paymentMethod,
      paymentReference,
      paidBy: req.userId
    });

    const updatedPayroll = await Payroll.findByPk(id, {
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'fullName', 'username', 'position']
        },
        {
          model: PayrollPayment,
          as: 'payments'
        }
      ]
    });

    res.json({
      message: 'Pago registrado exitosamente',
      payroll: updatedPayroll,
      payment
    });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
};

// Cancelar nómina
exports.cancelPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payroll = await Payroll.findByPk(id);
    if (!payroll) {
      return res.status(404).json({ error: 'Nómina no encontrada' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ error: 'No se puede cancelar una nómina ya pagada' });
    }

    await payroll.update({
      status: 'cancelled',
      notes: payroll.notes ? `${payroll.notes}\n\nCANCELADO: ${reason}` : `CANCELADO: ${reason}`
    });

    res.json({
      message: 'Nómina cancelada exitosamente',
      payroll
    });
  } catch (error) {
    console.error('Error al cancelar nómina:', error);
    res.status(500).json({ error: 'Error al cancelar nómina' });
  }
};

// Obtener nóminas de un empleado
exports.getEmployeePayrolls = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, status } = req.query;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const where = { userId };

    if (year) {
      where.period = {
        [Op.like]: `${year}%`
      };
    }

    if (status) {
      where.status = status;
    }

    const payrolls = await Payroll.findAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'username']
        },
        {
          model: PayrollPayment,
          as: 'payments'
        }
      ],
      order: [['period', 'DESC']]
    });

    const summary = {
      total: payrolls.length,
      paid: payrolls.filter(p => p.status === 'paid').length,
      pending: payrolls.filter(p => p.status === 'pending').length,
      cancelled: payrolls.filter(p => p.status === 'cancelled').length,
      totalPaid: payrolls
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.netSalary), 0),
      totalPending: payrolls
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + parseFloat(p.netSalary), 0)
    };

    res.json({
      employee: {
        id: user.id,
        fullName: user.fullName,
        position: user.position
      },
      payrolls,
      summary
    });
  } catch (error) {
    console.error('Error al obtener nóminas de empleado:', error);
    res.status(500).json({ error: 'Error al obtener nóminas de empleado' });
  }
};

// Generar nóminas mensuales automáticamente
exports.generateMonthlyPayrolls = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Mes y año son requeridos' });
    }

    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Obtener todos los empleados activos con salario
    const employees = await User.findAll({
      where: {
        active: true,
        role: {
          [Op.in]: ['employee', 'admin', 'technician']
        }
      }
    });

    const created = [];
    const skipped = [];

    for (const employee of employees) {
      // Verificar si ya tiene nómina para este periodo
      const existing = await Payroll.findOne({
        where: {
          userId: employee.id,
          period,
          paymentType: 'monthly'
        }
      });

      if (existing) {
        skipped.push({
          employee: employee.fullName,
          reason: 'Ya existe nómina para este periodo'
        });
        continue;
      }

      // Si el empleado no tiene salario configurado, saltar
      if (!employee.salary || employee.salary <= 0) {
        skipped.push({
          employee: employee.fullName,
          reason: 'No tiene salario configurado'
        });
        continue;
      }

      // Calcular deducciones básicas (ejemplo: 16% ISR, 3% IMSS)
      const baseSalary = parseFloat(employee.salary);
      const taxDeduction = baseSalary * 0.16; // 16% ISR
      const socialSecurityDeduction = baseSalary * 0.03; // 3% IMSS
      const totalDeductions = taxDeduction + socialSecurityDeduction;
      const netSalary = baseSalary - totalDeductions;

      const payroll = await Payroll.create({
        userId: employee.id,
        period,
        paymentType: 'monthly',
        baseSalary,
        overtimeHours: 0,
        overtimeAmount: 0,
        bonus: 0,
        taxDeduction,
        socialSecurityDeduction,
        otherDeductions: 0,
        totalDeductions,
        netSalary,
        status: 'pending',
        createdBy: req.userId,
        notes: 'Nómina generada automáticamente'
      });

      created.push({
        employee: employee.fullName,
        payrollId: payroll.id,
        netSalary
      });
    }

    res.json({
      message: `Generación de nóminas completada para ${period}`,
      created: created.length,
      skipped: skipped.length,
      details: {
        created,
        skipped
      }
    });
  } catch (error) {
    console.error('Error al generar nóminas mensuales:', error);
    res.status(500).json({ error: 'Error al generar nóminas mensuales' });
  }
};

// Obtener resumen de nómina (totales)
exports.getPayrollSummary = async (req, res) => {
  try {
    const { period, year } = req.query;

    const where = {};

    if (period) {
      where.period = period;
    } else if (year) {
      where.period = {
        [Op.like]: `${year}%`
      };
    }

    const payrolls = await Payroll.findAll({
      where,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'fullName', 'position']
        }
      ]
    });

    const summary = {
      total: payrolls.length,
      byStatus: {
        pending: payrolls.filter(p => p.status === 'pending').length,
        paid: payrolls.filter(p => p.status === 'paid').length,
        cancelled: payrolls.filter(p => p.status === 'cancelled').length
      },
      amounts: {
        totalGross: payrolls.reduce((sum, p) => sum + parseFloat(p.baseSalary), 0),
        totalDeductions: payrolls.reduce((sum, p) => sum + parseFloat(p.totalDeductions), 0),
        totalNet: payrolls.reduce((sum, p) => sum + parseFloat(p.netSalary), 0),
        totalPaid: payrolls
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + parseFloat(p.netSalary), 0),
        totalPending: payrolls
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + parseFloat(p.netSalary), 0)
      },
      byEmployee: {}
    };

    // Agrupar por empleado
    payrolls.forEach(payroll => {
      const empId = payroll.userId;
      if (!summary.byEmployee[empId]) {
        summary.byEmployee[empId] = {
          employee: payroll.employee,
          count: 0,
          totalPaid: 0,
          totalPending: 0
        };
      }
      summary.byEmployee[empId].count++;
      if (payroll.status === 'paid') {
        summary.byEmployee[empId].totalPaid += parseFloat(payroll.netSalary);
      } else if (payroll.status === 'pending') {
        summary.byEmployee[empId].totalPending += parseFloat(payroll.netSalary);
      }
    });

    res.json(summary);
  } catch (error) {
    console.error('Error al obtener resumen de nómina:', error);
    res.status(500).json({ error: 'Error al obtener resumen de nómina' });
  }
};
