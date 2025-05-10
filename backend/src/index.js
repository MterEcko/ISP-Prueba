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
  
  // Verificar si ya existen datos en la tabla de nodos
  const nodeCount = await db.Node.count();
  if (nodeCount === 0) {
    // Solo crear datos si no hay nodos
    try {
      // Crear un par de nodos de ejemplo
      const node1 = await db.Node.create({
        name: "Nodo Principal",
        location: "Centro",
        latitude: 19.4326,
        longitude: -99.1332,
        active: true
      });
      
      const node2 = await db.Node.create({
        name: "Nodo Secundario",
        location: "Norte",
        latitude: 19.4526,
        longitude: -99.1232,
        active: true
      });
      
      // Crear sectores para estos nodos
      await db.Sector.create({
        name: "Sector 1",
        description: "Sector principal norte",
        frequency: "5.8 GHz",
        azimuth: 0,
        polarization: "vertical",
        active: true,
        nodeId: node1.id
      });
      
      await db.Sector.create({
        name: "Sector 2",
        description: "Sector principal este",
        frequency: "5.8 GHz",
        azimuth: 90,
        polarization: "vertical",
        active: true,
        nodeId: node1.id
      });
      
      await db.Sector.create({
        name: "Sector Norte",
        description: "Sector norte",
        frequency: "5.8 GHz",
        azimuth: 0,
        polarization: "horizontal",
        active: true,
        nodeId: node2.id
      });
      
      console.log("Datos iniciales de red creados");
    } catch (error) {
      console.error("Error al crear datos iniciales de red:", error);
    }
  }
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});