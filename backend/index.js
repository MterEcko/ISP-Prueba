# Crear archivo index.js básico
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

require('dotenv').config();



const app = express();
const PORT = process.env.PORT || 3000;


// Servir archivos estáticos (documentos de clientes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rutas
app.get('/', (req, res) => {
  res.json({ message: 'API del Sistema ISP funcionando correctamente' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(\`Servidor ejecutándose en el puerto \${PORT}\`);
});" > src/index.js

# Actualizar package.json para scripts
# (tendrás que editar manualmente o usar un editor como VS Code)