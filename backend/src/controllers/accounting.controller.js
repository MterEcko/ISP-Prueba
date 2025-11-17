const Payroll = require('../models/payroll.model');
const Expense = require('../models/expense.model');
const ExpenseCategory = require('../models/expenseCategory.model');
const Payment = require('../models/payment.model');
const Client = require('../models/client.model');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Dashboard financiero general
exports.getDashboard = async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.query;

    let dateFilter = {};

    if (month && year) {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      const startOfMonth = `${period}-01`;
      const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
      dateFilter = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
    } else if (startDate && endDate) {
      dateFilter = {
        [Op.between]: [startDate, endDate]
      };
    } else {
      // Por defecto, mes actual
      const now = new Date();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentYear = now.getFullYear();
      const startOfMonth = `${currentYear}-${currentMonth}-01`;
      const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0).toISOString().split('T')[0];
      dateFilter = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
    }

    // INGRESOS - De pagos de clientes
    const payments = await Payment.findAll({
      where: {
        paymentDate: dateFilter,
        status: 'completed'
      }
    });

    const totalIncome = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // GASTOS
    const expenses = await Expense.findAll({
      where: {
        expenseDate: dateFilter
      },
      include: [
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'type', 'icon']
        }
      ]
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Gastos por categoría
    const expensesByCategory = {};
    expenses.forEach(expense => {
      const catName = expense.category.name;
      if (!expensesByCategory[catName]) {
        expensesByCategory[catName] = {
          category: expense.category,
          total: 0,
          count: 0
        };
      }
      expensesByCategory[catName].total += parseFloat(expense.amount);
      expensesByCategory[catName].count++;
    });

    // NÓMINA
    let payrollFilter = {};
    if (month && year) {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      payrollFilter = { period };
    }

    const payrolls = await Payroll.findAll({
      where: payrollFilter
    });

    const totalPayroll = payrolls.reduce((sum, p) => sum + parseFloat(p.netSalary), 0);
    const payrollPaid = payrolls
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.netSalary), 0);
    const payrollPending = payrolls
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.netSalary), 0);

    // MÉTRICAS
    const profit = totalIncome - totalExpenses - totalPayroll;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

    // Top gastos
    const topExpenses = Object.values(expensesByCategory)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(item => ({
        category: item.category.name,
        icon: item.category.icon,
        amount: item.total,
        count: item.count
      }));

    res.json({
      period: {
        month,
        year,
        startDate: startDate || dateFilter[Op.between]?.[0],
        endDate: endDate || dateFilter[Op.between]?.[1]
      },
      income: {
        total: totalIncome,
        fromClients: totalIncome,
        paymentsCount: payments.length
      },
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
        count: expenses.length
      },
      payroll: {
        total: totalPayroll,
        paid: payrollPaid,
        pending: payrollPending,
        employeesCount: payrolls.length
      },
      profit: {
        amount: profit,
        margin: profitMargin.toFixed(2)
      },
      topExpenses
    });
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
};

// Flujo de efectivo (cash flow)
exports.getCashFlow = async (req, res) => {
  try {
    const { startDate, endDate, interval = 'daily' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate y endDate son requeridos' });
    }

    // Obtener pagos (ingresos)
    const payments = await Payment.findAll({
      where: {
        paymentDate: {
          [Op.between]: [startDate, endDate]
        },
        status: 'completed'
      },
      attributes: ['paymentDate', 'amount'],
      order: [['paymentDate', 'ASC']]
    });

    // Obtener gastos
    const expenses = await Expense.findAll({
      where: {
        expenseDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['expenseDate', 'amount'],
      order: [['expenseDate', 'ASC']]
    });

    // Obtener nóminas pagadas
    const payrolls = await Payroll.findAll({
      where: {
        paymentDate: {
          [Op.between]: [startDate, endDate]
        },
        status: 'paid'
      },
      attributes: ['paymentDate', 'netSalary'],
      order: [['paymentDate', 'ASC']]
    });

    // Agrupar por fecha
    const cashFlowData = {};

    payments.forEach(p => {
      const date = p.paymentDate;
      if (!cashFlowData[date]) {
        cashFlowData[date] = { date, income: 0, expenses: 0, payroll: 0, net: 0 };
      }
      cashFlowData[date].income += parseFloat(p.amount);
    });

    expenses.forEach(e => {
      const date = e.expenseDate;
      if (!cashFlowData[date]) {
        cashFlowData[date] = { date, income: 0, expenses: 0, payroll: 0, net: 0 };
      }
      cashFlowData[date].expenses += parseFloat(e.amount);
    });

    payrolls.forEach(p => {
      const date = p.paymentDate;
      if (!cashFlowData[date]) {
        cashFlowData[date] = { date, income: 0, expenses: 0, payroll: 0, net: 0 };
      }
      cashFlowData[date].payroll += parseFloat(p.netSalary);
    });

    // Calcular flujo neto y balance acumulado
    let balance = 0;
    const flowArray = Object.values(cashFlowData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(item => {
        item.net = item.income - item.expenses - item.payroll;
        balance += item.net;
        item.balance = balance;
        return item;
      });

    res.json({
      startDate,
      endDate,
      interval,
      cashFlow: flowArray,
      summary: {
        totalIncome: flowArray.reduce((sum, f) => sum + f.income, 0),
        totalExpenses: flowArray.reduce((sum, f) => sum + f.expenses, 0),
        totalPayroll: flowArray.reduce((sum, f) => sum + f.payroll, 0),
        netCashFlow: flowArray.reduce((sum, f) => sum + f.net, 0),
        finalBalance: balance
      }
    });
  } catch (error) {
    console.error('Error al obtener flujo de efectivo:', error);
    res.status(500).json({ error: 'Error al obtener flujo de efectivo' });
  }
};

// Estado de resultados (profit & loss)
exports.getProfitLoss = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Mes y año son requeridos' });
    }

    const period = `${year}-${String(month).padStart(2, '0')}`;
    const startOfMonth = `${period}-01`;
    const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

    // INGRESOS
    const payments = await Payment.findAll({
      where: {
        paymentDate: {
          [Op.between]: [startOfMonth, endOfMonth]
        },
        status: 'completed'
      }
    });

    const totalIncome = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // GASTOS OPERATIVOS
    const expenses = await Expense.findAll({
      where: {
        expenseDate: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      },
      include: [
        {
          model: ExpenseCategory,
          as: 'category'
        }
      ]
    });

    const expensesByType = {
      fixed: 0,
      variable: 0
    };

    expenses.forEach(e => {
      const type = e.category.type;
      expensesByType[type] += parseFloat(e.amount);
    });

    // NÓMINA
    const payrolls = await Payroll.findAll({
      where: { period }
    });

    const payrollCost = payrolls.reduce((sum, p) => sum + parseFloat(p.netSalary), 0);

    // TOTALES
    const totalOperatingExpenses = expensesByType.fixed + expensesByType.variable;
    const totalExpenses = totalOperatingExpenses + payrollCost;
    const grossProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

    res.json({
      period: {
        month,
        year,
        startDate: startOfMonth,
        endDate: endOfMonth
      },
      revenue: {
        total: totalIncome,
        breakdown: {
          services: totalIncome
        }
      },
      expenses: {
        operatingExpenses: {
          fixed: expensesByType.fixed,
          variable: expensesByType.variable,
          total: totalOperatingExpenses
        },
        payroll: payrollCost,
        total: totalExpenses
      },
      profit: {
        gross: grossProfit,
        margin: profitMargin.toFixed(2),
        status: grossProfit >= 0 ? 'profit' : 'loss'
      }
    });
  } catch (error) {
    console.error('Error al obtener estado de resultados:', error);
    res.status(500).json({ error: 'Error al obtener estado de resultados' });
  }
};

// Balance general (balance sheet)
exports.getBalanceSheet = async (req, res) => {
  try {
    const { date } = req.query;
    const cutoffDate = date || new Date().toISOString().split('T')[0];

    // ACTIVOS
    // - Efectivo (suma de todos los pagos recibidos menos gastos)
    const allPayments = await Payment.findAll({
      where: {
        paymentDate: {
          [Op.lte]: cutoffDate
        },
        status: 'completed'
      }
    });

    const totalPayments = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const allExpenses = await Expense.findAll({
      where: {
        expenseDate: {
          [Op.lte]: cutoffDate
        }
      }
    });

    const totalExpenses = allExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const allPayrolls = await Payroll.findAll({
      where: {
        paymentDate: {
          [Op.lte]: cutoffDate
        },
        status: 'paid'
      }
    });

    const totalPayrolls = allPayrolls.reduce((sum, p) => sum + parseFloat(p.netSalary), 0);

    const cash = totalPayments - totalExpenses - totalPayrolls;

    // - Activos fijos (equipos)
    const assets = await Expense.findAll({
      where: {
        isAsset: true,
        expenseDate: {
          [Op.lte]: cutoffDate
        }
      }
    });

    const fixedAssets = assets.reduce((sum, a) => sum + parseFloat(a.amount), 0);

    // - Cuentas por cobrar (facturas pendientes de clientes)
    const receivables = 0; // TODO: Implementar cuando haya facturas

    const totalAssets = cash + fixedAssets + receivables;

    // PASIVOS
    // - Nómina por pagar
    const pendingPayrolls = await Payroll.findAll({
      where: {
        status: 'pending'
      }
    });

    const payrollLiabilities = pendingPayrolls.reduce((sum, p) => sum + parseFloat(p.netSalary), 0);

    // - Otras deudas
    const otherLiabilities = 0; // TODO: Implementar cuando haya módulo de deudas

    const totalLiabilities = payrollLiabilities + otherLiabilities;

    // PATRIMONIO
    const equity = totalAssets - totalLiabilities;

    res.json({
      date: cutoffDate,
      assets: {
        current: {
          cash,
          receivables,
          total: cash + receivables
        },
        fixed: {
          equipment: fixedAssets,
          total: fixedAssets
        },
        total: totalAssets
      },
      liabilities: {
        current: {
          payroll: payrollLiabilities,
          other: otherLiabilities,
          total: totalLiabilities
        },
        total: totalLiabilities
      },
      equity: {
        total: equity
      },
      verification: {
        assetsMinusLiabilities: totalAssets - totalLiabilities,
        equity: equity,
        balanced: Math.abs((totalAssets - totalLiabilities) - equity) < 0.01
      }
    });
  } catch (error) {
    console.error('Error al obtener balance general:', error);
    res.status(500).json({ error: 'Error al obtener balance general' });
  }
};

// Resumen mensual comparativo
exports.getMonthlySummary = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ error: 'Año es requerido' });
    }

    const monthlySummary = [];

    for (let month = 1; month <= 12; month++) {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      const startOfMonth = `${period}-01`;
      const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

      // Ingresos
      const payments = await Payment.findAll({
        where: {
          paymentDate: {
            [Op.between]: [startOfMonth, endOfMonth]
          },
          status: 'completed'
        }
      });

      const income = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // Gastos
      const expenses = await Expense.findAll({
        where: {
          expenseDate: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        }
      });

      const expensesTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      // Nómina
      const payrolls = await Payroll.findAll({
        where: { period }
      });

      const payrollTotal = payrolls.reduce((sum, p) => sum + parseFloat(p.netSalary), 0);

      const profit = income - expensesTotal - payrollTotal;

      monthlySummary.push({
        month,
        period,
        income,
        expenses: expensesTotal,
        payroll: payrollTotal,
        totalExpenses: expensesTotal + payrollTotal,
        profit,
        profitMargin: income > 0 ? ((profit / income) * 100).toFixed(2) : 0
      });
    }

    const yearTotal = {
      income: monthlySummary.reduce((sum, m) => sum + m.income, 0),
      expenses: monthlySummary.reduce((sum, m) => sum + m.expenses, 0),
      payroll: monthlySummary.reduce((sum, m) => sum + m.payroll, 0),
      totalExpenses: monthlySummary.reduce((sum, m) => sum + m.totalExpenses, 0),
      profit: monthlySummary.reduce((sum, m) => sum + m.profit, 0)
    };

    yearTotal.profitMargin = yearTotal.income > 0
      ? ((yearTotal.profit / yearTotal.income) * 100).toFixed(2)
      : 0;

    res.json({
      year,
      monthly: monthlySummary,
      yearTotal
    });
  } catch (error) {
    console.error('Error al obtener resumen mensual:', error);
    res.status(500).json({ error: 'Error al obtener resumen mensual' });
  }
};
