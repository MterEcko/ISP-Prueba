const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currency.controller');
const { verifyToken, isAdmin, isAdminOrManager } = require('../middleware/authJwt');

// ========== MONEDAS ==========

// Inicializar monedas predefinidas
router.post('/initialize',
  [verifyToken, isAdmin],
  currencyController.initializeCurrencies
);

// Crear moneda
router.post('/',
  [verifyToken, isAdmin],
  currencyController.createCurrency
);

// Listar monedas
router.get('/',
  [verifyToken],
  currencyController.getCurrencies
);

// Obtener moneda por ID
router.get('/:id',
  [verifyToken],
  currencyController.getCurrencyById
);

// Actualizar moneda
router.put('/:id',
  [verifyToken, isAdmin],
  currencyController.updateCurrency
);

// Eliminar moneda
router.delete('/:id',
  [verifyToken, isAdmin],
  currencyController.deleteCurrency
);

// Establecer moneda base
router.post('/:id/set-base',
  [verifyToken, isAdmin],
  currencyController.setBaseCurrency
);

// ========== TASAS DE CAMBIO ==========

// Obtener tasas de cambio
router.get('/exchange-rates/all',
  [verifyToken],
  currencyController.getExchangeRates
);

// Crear/actualizar tasa de cambio manualmente
router.post('/exchange-rates',
  [verifyToken, isAdminOrManager],
  currencyController.setExchangeRate
);

// Obtener tasa de cambio actual entre dos monedas
router.get('/rate/:fromCode/:toCode',
  [verifyToken],
  currencyController.getCurrentRate
);

// Convertir monto entre monedas
router.get('/convert',
  [verifyToken],
  currencyController.convertCurrency
);

// Actualizar tasas desde API externa
router.post('/exchange-rates/update-from-api',
  [verifyToken, isAdmin],
  currencyController.updateExchangeRatesFromAPI
);

module.exports = router;
