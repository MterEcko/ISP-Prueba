const pluginUploadController = require('../controllers/pluginUpload.controller');
const authJwt = require('../middleware/auth.jwt');
const multer = require('multer');
const path = require('path');

// Configure multer for plugin uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/plugins/'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  }
});

module.exports = function(app) {
  // === PLUGIN UPLOAD ===
  app.post('/api/plugin-upload/upload', [authJwt.verifyToken, upload.single('plugin')], pluginUploadController.uploadPlugin);
  app.get('/api/plugin-upload', [authJwt.verifyToken], pluginUploadController.getAllPluginUploads);
  app.get('/api/plugin-upload/:id', [authJwt.verifyToken], pluginUploadController.getPluginUpload);
  app.put('/api/plugin-upload/:id/status', [authJwt.verifyToken], pluginUploadController.updatePluginStatus);
  app.delete('/api/plugin-upload/:id', [authJwt.verifyToken], pluginUploadController.deletePluginUpload);
  app.post('/api/plugin-upload/validate-manifest', [authJwt.verifyToken], pluginUploadController.validateManifest);
};
