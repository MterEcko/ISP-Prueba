const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Definimos la carpeta donde se guardarán los comprobantes.
// path.join se asegura de que funcione en cualquier sistema operativo (Windows, Linux, etc.)
const receiptsPath = path.join(__dirname, '../../uploads/receipts');

// Nos aseguramos de que el directorio de destino exista. Si no, lo creamos.
if (!fs.existsSync(receiptsPath)) {
  fs.mkdirSync(receiptsPath, { recursive: true });
  console.log(`Directorio creado: ${receiptsPath}`);
}

// Configuración de almacenamiento para multer (cómo y dónde guardar los archivos)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Le decimos a multer que guarde los archivos en la carpeta que definimos.
    cb(null, receiptsPath);
  },
  filename: (req, file, cb) => {
    // Para evitar nombres de archivo duplicados, creamos un nombre único.
    // Formato: receipt-1678886400000-abcdef123.pdf
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${extension}`);
  }
});

// Filtro para aceptar solo ciertos tipos de archivos (imágenes y PDF)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'application/pdf') {
    cb(null, true); // Aceptar el archivo
  } else {
    // Rechazar el archivo con un error
    cb(new Error('Formato de archivo no válido. Solo se aceptan JPG, PNG y PDF.'), false);
  }
};

// Creamos la instancia de multer con toda la configuración
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // Límite de 5 MB por archivo
  },
  fileFilter: fileFilter
});

// Exportamos el middleware para poder usarlo en nuestras rutas
module.exports = upload;