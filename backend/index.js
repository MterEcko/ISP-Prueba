// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (documentos de clientes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Base de datos
const db = require('./models');

// Sincronizar base de datos
db.sequelize.sync().then(() => {
  console.log('Base de datos sincronizada');
  initial(); // Cargar datos iniciales mínimos
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

// Función para crear datos iniciales mínimos si no existen
async function initial() {
  try {
    // Importar modelos
    const Role = db.Role;
    const Permission = db.Permission;
    const User = db.User;
    
    // Verificar si ya existen roles
    const roleCount = await Role.count();
    if (roleCount === 0) {
      // Crear roles
      await Role.bulkCreate([
        { name: "cliente", description: "Usuario cliente", level: 1, category: "cliente" },
        { name: "tecnico", description: "Técnico de campo", level: 2, category: "tecnico" },
        { name: "admin", description: "Administrador", level: 5, category: "admin" }
      ]);
      console.log("Roles creados");
    }

    // Verificar si ya existen permisos
    const permissionCount = await Permission.count();
    if (permissionCount === 0) {
      // Crear permisos básicos
      await Permission.bulkCreate([
        { name: "view_dashboard", description: "Ver dashboard", module: "dashboard" },
        { name: "manage_clients", description: "Gestionar clientes", module: "clients" },
        { name: "view_network", description: "Ver estado de red", module: "network" },
        { name: "manage_network", description: "Gestionar red", module: "network" },
        { name: "view_billing", description: "Ver facturación", module: "billing" },
        { name: "manage_billing", description: "Gestionar facturación", module: "billing" },
        { name: "view_tickets", description: "Ver tickets", module: "tickets" },
        { name: "manage_tickets", description: "Gestionar tickets", module: "tickets" }
      ]);
      console.log("Permisos creados");
    }

    // Asignar permisos a roles si no se ha hecho
    const adminRole = await Role.findOne({ where: { name: "admin" } });
    const permissions = await Permission.findAll();
    
    // Verificar si ya existen relaciones entre roles y permisos
    const rolePermissions = await adminRole.getPermissions();
    if (rolePermissions.length === 0) {
      await adminRole.addPermissions(permissions);
      console.log("Permisos asignados al rol de administrador");
    }

    // Verificar si ya existe el usuario administrador
    const adminExists = await User.findOne({ where: { username: "admin" } });
    if (!adminExists) {
      // Crear usuario admin
      await User.create({
        username: "admin",
        email: "admin@example.com",
        password: "admin123", // En producción usar contraseña segura
        fullName: "Administrador",
        roleId: adminRole.id
      });
      console.log("Usuario administrador creado");
    }

  } catch (error) {
    console.error("Error al crear datos iniciales:", error);
  }
}