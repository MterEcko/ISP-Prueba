const express = require('express');
const router = express.Router();
const cloudflareController = require('../controllers/cloudflare.controller');

// Gestión de subdominios
router.post('/subdomain', cloudflareController.createSubdomain);
router.get('/subdomain/check/:subdomain', cloudflareController.checkSubdomainAvailability);

module.exports = router;
