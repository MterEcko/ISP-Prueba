const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { verifyToken, isAdmin, isAdminOrManager } = require('../middleware/authJwt');

// ========== GASTOS ==========

// Crear gasto
router.post('/',
  [verifyToken, isAdminOrManager],
  expenseController.createExpense
);

// Listar gastos con filtros
router.get('/',
  [verifyToken],
  expenseController.getExpenses
);

// Obtener gasto por ID
router.get('/:id',
  [verifyToken],
  expenseController.getExpenseById
);

// Actualizar gasto
router.put('/:id',
  [verifyToken, isAdminOrManager],
  expenseController.updateExpense
);

// Eliminar gasto
router.delete('/:id',
  [verifyToken, isAdmin],
  expenseController.deleteExpense
);

// Obtener gastos recurrentes
router.get('/recurring/all',
  [verifyToken],
  expenseController.getRecurringExpenses
);

// Obtener gastos por categoría
router.get('/by-category/summary',
  [verifyToken],
  expenseController.getExpensesByCategory
);

// ========== CATEGORÍAS ==========

// Inicializar categorías predefinidas
router.post('/categories/initialize',
  [verifyToken, isAdmin],
  expenseController.initializeCategories
);

// Crear categoría
router.post('/categories',
  [verifyToken, isAdmin],
  expenseController.createCategory
);

// Listar categorías
router.get('/categories/all',
  [verifyToken],
  expenseController.getCategories
);

// Actualizar categoría
router.put('/categories/:id',
  [verifyToken, isAdmin],
  expenseController.updateCategory
);

// Eliminar categoría
router.delete('/categories/:id',
  [verifyToken, isAdmin],
  expenseController.deleteCategory
);

module.exports = router;
