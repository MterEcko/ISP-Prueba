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
db.sequelize.sync({ force: true }).then(() => {
  console.log('Tablas recreadas');
  initial(); // Datos iniciales
});

// Rutas
app.get('/', (req, res) => {
  res.json({ message: 'API del Sistema ISP funcionando correctamente' });
});

// Incluir rutas
require('./routes/auth.routes')(app);
// Estas rutas deberían estar comentadas hasta que existan los archivos
// require('./routes/client.routes')(app);
// require('./routes/network.routes')(app);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

// Función para crear datos iniciales
async function initial() {
  try {
    // Importar modelos
    const Role = db.Role;
    const Permission = db.Permission;
    const User = db.User;
    
    // Crear roles
    await Role.bulkCreate([
      { name: "cliente", description: "Usuario cliente", level: 1, category: "cliente" },
      { name: "tecnico", description: "Técnico de campo", level: 1, category: "tecnico" },
      { name: "admin", description: "Administrador", level: 5, category: "admin" }
    ]);

    // Crear permisos básicos
    await Permission.bulkCreate([
      { name: "view_dashboard", description: "Ver dashboard", module: "dashboard" },
      { name: "manage_clients", description: "Gestionar clientes", module: "clients" },
      { name: "view_network", description: "Ver estado de red", module: "network" },
      { name: "manage_network", description: "Gestionar red", module: "network" },
      { name: "view_billing", description: "Ver facturación", module: "billing" },
      { name: "manage_billing", description: "Gestionar facturación", module: "billing" }
    ]);

    // Asignar permisos a roles
    const adminRole = await Role.findOne({ where: { name: "admin" } });
    const permissions = await Permission.findAll();
    await adminRole.addPermissions(permissions);

    // Crear usuario admin
    await User.create({
      username: "admin",
      email: "admin@example.com",
      password: "admin123", // En producción usar contraseña segura
      fullName: "Administrador",
      roleId: adminRole.id
    });

    console.log("Datos iniciales creados");
  } catch (error) {
    console.error("Error al crear datos iniciales:", error);
  }
}