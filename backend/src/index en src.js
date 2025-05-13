const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Para desarrollo - cambia esto a tu dominio en producción
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-access-token', 'Origin']
}));
app.use(express.json());

// Servir archivos estáticos (documentos de clientes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Base de datos
const db = require('./models');

// Sincronizar base de datos (solo una vez)
db.sequelize.sync({ force: false }).then(async () => {
  console.log('Base de datos sincronizada');
  
}).catch(err => {
  console.error('Error al sincronizar la base de datos:', err);
});

// Rutas
app.get('/', (req, res) => {
  res.json({ message: 'API del Sistema ISP funcionando correctamente' });
});

// Incluir rutas
require('./routes/auth.routes')(app);
require('./routes/client.routes')(app);
require('./routes/network.routes')(app);
require('./routes/device.routes')(app);
require('./routes/ticket.routes')(app);
// Nuevas rutas para Mikrotik
require('./routes/mikrotik.routes')(app);
require('./routes/client.mikrotik.routes')(app);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});