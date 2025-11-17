const Expense = require('../models/expense.model');
const ExpenseCategory = require('../models/expenseCategory.model');
const User = require('../models/user.model');
const { Op } = require('sequelize');

// Crear gasto
exports.createExpense = async (req, res) => {
  try {
    const {
      categoryId,
      amount,
      description,
      expenseDate,
      recurring,
      recurringPeriod,
      supplier,
      invoiceNumber,
      paymentMethod,
      paymentReference,
      notes,
      isAsset,
      depreciationYears,
      assetSerialNumber
    } = req.body;

    // Validar categoría existe
    const category = await ExpenseCategory.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const expense = await Expense.create({
      categoryId,
      amount,
      description,
      expenseDate,
      recurring: recurring || false,
      recurringPeriod,
      supplier,
      invoiceNumber,
      paymentMethod,
      paymentReference,
      notes,
      createdBy: req.userId,
      isAsset: isAsset || false,
      depreciationYears,
      assetSerialNumber
    });

    const expenseWithDetails = await Expense.findByPk(expense.id, {
      include: [
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'type', 'icon']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'username']
        }
      ]
    });

    res.status(201).json({
      message: 'Gasto registrado exitosamente',
      expense: expenseWithDetails
    });
  } catch (error) {
    console.error('Error al crear gasto:', error);
    res.status(500).json({ error: 'Error al crear gasto' });
  }
};

// Listar gastos
exports.getExpenses = async (req, res) => {
  try {
    const {
      categoryId,
      startDate,
      endDate,
      recurring,
      isAsset,
      page = 1,
      limit = 50,
      sortBy = 'expenseDate',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (startDate && endDate) {
      where.expenseDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.expenseDate = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      where.expenseDate = {
        [Op.lte]: endDate
      };
    }

    if (recurring !== undefined) {
      where.recurring = recurring === 'true';
    }

    if (isAsset !== undefined) {
      where.isAsset = isAsset === 'true';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: expenses } = await Expense.findAndCountAll({
      where,
      include: [
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'type', 'icon']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'username']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      expenses,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
};

// Obtener gasto por ID
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByPk(id, {
      include: [
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'type', 'icon', 'description']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'username']
        }
      ]
    });

    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Error al obtener gasto:', error);
    res.status(500).json({ error: 'Error al obtener gasto' });
  }
};

// Actualizar gasto
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    // Si cambia la categoría, validar que existe
    if (updateData.categoryId && updateData.categoryId !== expense.categoryId) {
      const category = await ExpenseCategory.findByPk(updateData.categoryId);
      if (!category) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }
    }

    await expense.update(updateData);

    const updatedExpense = await Expense.findByPk(id, {
      include: [
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'type', 'icon']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'username']
        }
      ]
    });

    res.json({
      message: 'Gasto actualizado exitosamente',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({ error: 'Error al actualizar gasto' });
  }
};

// Eliminar gasto
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    await expense.destroy();

    res.json({ message: 'Gasto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
};

// Obtener gastos recurrentes
exports.getRecurringExpenses = async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      where: {
        recurring: true
      },
      include: [
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'type', 'icon']
        }
      ],
      order: [['expenseDate', 'DESC']]
    });

    res.json(expenses);
  } catch (error) {
    console.error('Error al obtener gastos recurrentes:', error);
    res.status(500).json({ error: 'Error al obtener gastos recurrentes' });
  }
};

// Obtener gastos por categoría
exports.getExpensesByCategory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};

    if (startDate && endDate) {
      where.expenseDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const expenses = await Expense.findAll({
      where,
      attributes: [
        'categoryId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      include: [
        {
          model: ExpenseCategory,
          as: 'category',
          attributes: ['id', 'name', 'type', 'icon']
        }
      ],
      group: ['categoryId', 'category.id'],
      order: [[sequelize.literal('total'), 'DESC']]
    });

    res.json(expenses);
  } catch (error) {
    console.error('Error al obtener gastos por categoría:', error);
    res.status(500).json({ error: 'Error al obtener gastos por categoría' });
  }
};

// ========== CATEGORÍAS ==========

// Crear categoría
exports.createCategory = async (req, res) => {
  try {
    const { name, type, icon, description } = req.body;

    const category = await ExpenseCategory.create({
      name,
      type,
      icon,
      description
    });

    res.status(201).json({
      message: 'Categoría creada exitosamente',
      category
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear categoría' });
  }
};

// Listar categorías
exports.getCategories = async (req, res) => {
  try {
    const { type, active } = req.query;

    const where = {};

    if (type) {
      where.type = type;
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    const categories = await ExpenseCategory.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json(categories);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

// Actualizar categoría
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const category = await ExpenseCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    await category.update(updateData);

    res.json({
      message: 'Categoría actualizada exitosamente',
      category
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
};

// Eliminar categoría
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ExpenseCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Verificar si hay gastos asociados
    const expenseCount = await Expense.count({
      where: { categoryId: id }
    });

    if (expenseCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar la categoría porque tiene ${expenseCount} gastos asociados`
      });
    }

    await category.destroy();

    res.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
};

// Inicializar categorías predefinidas
exports.initializeCategories = async (req, res) => {
  try {
    const defaultCategories = [
      { name: 'Nómina', type: 'fixed', icon: '💰', description: 'Pagos a empleados' },
      { name: 'Servicios', type: 'fixed', icon: '💡', description: 'Luz, agua, internet, teléfono' },
      { name: 'Renta', type: 'fixed', icon: '🏢', description: 'Alquiler de oficina o local' },
      { name: 'Equipos', type: 'variable', icon: '💻', description: 'Compra de hardware y equipos' },
      { name: 'Mantenimiento', type: 'variable', icon: '🔧', description: 'Reparaciones y mantenimiento' },
      { name: 'Combustible', type: 'variable', icon: '⛽', description: 'Gasolina para vehículos' },
      { name: 'Marketing', type: 'variable', icon: '📢', description: 'Publicidad y promoción' },
      { name: 'Legal/Contable', type: 'variable', icon: '📋', description: 'Servicios profesionales' },
      { name: 'Impuestos', type: 'fixed', icon: '🏛️', description: 'Pagos al SAT y otros impuestos' },
      { name: 'Otros', type: 'variable', icon: '📦', description: 'Gastos varios' }
    ];

    const created = [];
    for (const cat of defaultCategories) {
      const [category, isNew] = await ExpenseCategory.findOrCreate({
        where: { name: cat.name },
        defaults: cat
      });
      if (isNew) {
        created.push(category);
      }
    }

    res.json({
      message: `${created.length} categorías inicializadas`,
      categories: created
    });
  } catch (error) {
    console.error('Error al inicializar categorías:', error);
    res.status(500).json({ error: 'Error al inicializar categorías' });
  }
};
