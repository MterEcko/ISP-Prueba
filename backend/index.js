// backend/index.js
const express = require('express');
const cors = require('cors');
const morgan = require("morgan");
const helmet = require('helmet');
const dotenv = require("dotenv");

const sequelize = require("./config/database"); // Asegúrate que la ruta a tu config de DB sea correcta
const allRoutes = require("./routes"); // Importará el index.js de la carpeta routes

const path = require('path');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware

app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000', 'http://10.10.1.163:8080'], // Frontend URLs permitidas
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-access-token', 'Authorization', 'Origin', 'Accept'],
  credentials: true, // Permite cookies y headers de autenticación
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(helmet()); // Ayuda a securizar la app estableciendo varios headers HTTP
app.use(morgan("dev")); // Logger de peticiones HTTP para desarrollo
app.use(express.json()); // Para parsear application/json
app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded
app.use(helmet());


// Servir archivos estáticos (documentos de clientes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas de la API
app.use("/api", allRoutes);


// Rutas
app.get('/', (req, res) => {
  res.json({ message: 'API del Sistema ISP funcionando correctamente desde src/index' });
});

// Base de datos
const db = require('./models');

// Sincronizar con la base de datos y arrancar el servidor
sequelize.sync({ force: process.env.DB_FORCE_SYNC === "true" }) // force: true dropeará las tablas y las recreará (cuidado en producción)
  .then(() => {
    console.log("Conexión a la base de datos establecida y modelos sincronizados desde src/index.");
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT} desde src/index`);
    });
  })
  .catch(err => {
    console.error("No se pudo conectar a la base de datos desde src/index:", err);
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
require('./routes/equiposFibraOptica.routes')(app);
//require('./routes/dispositivosRed.routes')(app);

// Rutas del inventario
require('./routes/inventory.routes')(app);
require('./routes/inventoryLocation.routes')(app);
require('./routes/inventoryMovement.routes')(app);

// Rutas del calendario
app.use('/api/calendar', require('./src/routes/calendar.routes'));

// Rutas del chat
app.use('/api/chat', require('./src/routes/chat.routes'));

// Rutas del Store (Marketplace)
app.use('/api/store', require('./src/routes/storeCustomer.routes'));

// Rutas de Upload de Plugins
app.use('/api/plugin-upload', require('./src/routes/pluginUpload.routes'));

// Rutas de n8n Integration
app.use('/api/n8n', require('./src/routes/n8n.routes'));

// ==================== NUEVAS RUTAS AGREGADAS ====================

// Rutas de configuración de red de clientes
require('./src/routes/clientNetworkConfig.routes')(app);

// Rutas de tipos y adjuntos de tickets
require('./src/routes/ticketType.routes')(app);
require('./src/routes/ticketAttachment.routes')(app);

// Rutas de parámetros de comandos
require('./src/routes/commandParameter.routes')(app);

// Rutas de categorías y productos de inventario
require('./src/routes/inventoryCategory.routes')(app);
require('./src/routes/inventoryProduct.routes')(app);
require('./src/routes/inventoryScrap.routes')(app);

// Rutas de materiales de instalación
require('./src/routes/installationMaterial.routes')(app);

// Rutas de Mikrotik (PPPoE, IPs, Profiles)
require('./src/routes/mikrotikPPPOE.routes')(app);
require('./src/routes/mikrotikIp.routes')(app);
require('./src/routes/mikrotikProfile.routes')(app);

// Rutas de notificaciones
require('./src/routes/notificationRule.routes')(app);
require('./src/routes/notificationQueue.routes')(app);

// Rutas de comunicación
require('./src/routes/communicationContact.routes')(app);
require('./src/routes/communicationEvent.routes')(app);

// Rutas de pagos de nómina
require('./src/routes/payrollPayment.routes')(app);

// ==================== FIN NUEVAS RUTAS ====================


// Función para crear datos iniciales mínimos si no existen
async function initial() {
  try {
    // Importar modelos
    const Role = db.Role;
    const Permission = db.Permission;
    const User = db.User;
	const InventoryLocation = db.InventoryLocation;
    
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
        { name: "manage_tickets", description: "Gestionar tickets", module: "tickets" },
        { name: "view_inventory", description: "Ver inventario", module: "inventory" },
        { name: "manage_inventory", description: "Gestionar inventario", module: "inventory" }
      ]);
      console.log("Permisos creados");
    }

    // Asignar permisos a roles si no se ha hecho
    const adminRole = await Role.findOne({ where: { name: "admin" } });
    if (adminRole) {
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
        console.log("Usuario administrador creado - username: admin, password: admin123");
      }
	  
    }

    
        
    const locationCount = await InventoryLocation.count();
    if (locationCount === 0) {
        await InventoryLocation.bulkCreate([
            {
                name: "Almacén Principal",
                type: "warehouse",
                description: "Almacén principal de equipos",
                active: true
            },
            {
                name: "Almacén Secundario",
                type: "warehouse", 
                description: "Almacén secundario para equipos de respaldo",
                active: true
            },
            {
                name: "Vehículo Técnico 1",
                type: "vehicle",
                description: "Equipos en vehículo del técnico principal",
                active: true
            },
            {
                name: "Taller de Reparación",
                type: "repair_shop",
                description: "Área de reparación de equipos defectuosos",
                active: true
            }
        ]);
        console.log("Ubicaciones de inventario creadas");
    }
    
    console.log("Ubicaciones de inventario fuera de log");
    
  } catch (error) {
    console.error("Error al crear datos iniciales desde src/index:", error);
  }
  
  
}