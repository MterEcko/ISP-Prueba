const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pluginUploadController = require('../controllers/pluginUpload.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Configurar multer para upload de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/temp'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'plugin-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: function (req, file, cb) {
    // Solo aceptar archivos ZIP
    if (path.extname(file.originalname).toLowerCase() !== '.zip') {
      return cb(new Error('Solo se permiten archivos .zip'));
    }
    cb(null, true);
  }
});

// Todas las rutas requieren autenticación
router.use(authenticate);

// Upload plugin
router.post('/upload', upload.single('plugin'), pluginUploadController.uploadPlugin);

// Get all plugins
router.get('/', pluginUploadController.getAllPluginUploads);

// Get plugin by ID
router.get('/:id', pluginUploadController.getPluginUpload);

// Update plugin status
router.put('/:id/status', pluginUploadController.updatePluginStatus);

// Delete plugin
router.delete('/:id', pluginUploadController.deletePluginUpload);

// Validate manifest
router.post('/validate-manifest', pluginUploadController.validateManifest);

module.exports = router;
