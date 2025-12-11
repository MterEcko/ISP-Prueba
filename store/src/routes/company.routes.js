const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');

// Registro de empresas
router.post('/register', companyController.registerCompany);
router.get('/:companyId', companyController.getCompany);

module.exports = router;
