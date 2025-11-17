// backend/src/routes/setup.routes.js
// Rutas para el wizard de configuración inicial

const setupController = require('../controllers/setup.controller');
const multer = require('multer');
const path = require('path');

// Configuración de multer para subir logo
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/logo/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'logo-' + Date.now() + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, svg)'));
    }
  }
});

module.exports = function(app) {
  // Obtener estado de configuración
  app.get('/api/setup/status', setupController.getSetupStatus);

  // Paso 1: Información de la empresa
  app.post('/api/setup/company', setupController.saveCompanyInfo);

  // Paso 2: Logo
  app.post('/api/setup/logo', upload.single('logo'), setupController.uploadLogo);

  // Paso 3: Segmentación de clientes
  app.post('/api/setup/segmentation', setupController.configureSegmentation);

  // Paso 4: Webhooks
  app.post('/api/setup/webhooks', setupController.configureWebhooks);

  // Paso 5: Pasarelas de pago
  app.post('/api/setup/payment-gateways', setupController.configurePaymentGateways);

  // Paso 6: MikroTik
  app.post('/api/setup/mikrotik', setupController.configureMikrotik);

  // Completar setup
  app.post('/api/setup/complete', setupController.completeSetup);

  // Resetear setup (solo desarrollo)
  app.post('/api/setup/reset', setupController.resetSetup);
};
