const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../models');

// Servir archivos estáticos del dashboard
router.use('/static', express.static(path.join(__dirname, '../../dashboard/public')));

// Página principal del dashboard
router.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/views/index.html'));
});

// Instalaciones
router.get('/installations', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/views/installations.html'));
});

// Licencias
router.get('/licenses', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/views/licenses.html'));
});

// Plugins
router.get('/plugins', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/views/plugins.html'));
});

// Mapa
router.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/views/map.html'));
});

module.exports = router;
