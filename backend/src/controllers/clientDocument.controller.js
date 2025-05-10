const db = require('../models');
const ClientDocument = db.ClientDocument;
const Client = db.Client;
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configuración de multer para carga de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/clients');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const clientId = req.params.clientId;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `client-${clientId}-${uniqueSuffix}-${file.originalname}`);
  }
});

exports.upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error("Solo se permiten archivos de imagen (jpeg, jpg, png) y PDF"));
  }
}).single('document');

// Subir documento para un cliente
exports.uploadDocument = async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    // Verificar si el cliente existe
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ message: `Cliente con ID ${clientId} no encontrado` });
    }

    // Subir archivo
    exports.upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Por favor seleccione un archivo" });
      }

      // Guardar documento en la base de datos
      const document = await ClientDocument.create({
        type: req.body.type,
        filename: req.file.filename,
        path: req.file.path,
        description: req.body.description,
        clientId: clientId
      });

      return res.status(201).json({
        message: "Documento subido exitosamente",
        document: {
          id: document.id,
          type: document.type,
          filename: document.filename,
          uploadDate: document.uploadDate,
          description: document.description
        }
      });
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener todos los documentos de un cliente
exports.findAll = async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    const documents = await ClientDocument.findAll({
      where: { clientId: clientId },
      attributes: ['id', 'type', 'filename', 'uploadDate', 'description']
    });

    return res.status(200).json(documents);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Descargar documento
exports.download = async (req, res) => {
  try {
    const id = req.params.id;
    
    const document = await ClientDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({ message: `Documento con ID ${id} no encontrado` });
    }

    res.download(document.path, document.filename);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Eliminar documento
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    const document = await ClientDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({ message: `Documento con ID ${id} no encontrado` });
    }

    // Eliminar archivo
    fs.unlink(document.path, async (err) => {
      if (err) {
        console.error("Error al eliminar archivo:", err);
      }
      
      // Eliminar registro de la base de datos
      await document.destroy();
      
      return res.status(200).json({ message: "Documento eliminado exitosamente" });
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};