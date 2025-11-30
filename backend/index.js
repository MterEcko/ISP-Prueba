// backend/index.js
const express = require('express');
const cors = require('cors');
const morgan = require("morgan");
const helmet = require('helmet');
const dotenv = require("dotenv");
const http = require('http');
const { Server } = require('socket.io');

const sequelize = require("./src/config/database");
// Las rutas se importan individualmente más abajo (no se usa un índice de rutas)

const path = require('path');
dotenv.config();

const app = express();
const server = http.createServer(app);

// ==================== CORS DINAMICO DESDE BASE DE DATOS ====================
let allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000'
];

// Funcion para cargar origenes permitidos desde DB
async function loadAllowedOrigins() {
  try {
    const db = require('./src/models');

    // Reiniciar allowedOrigins a valores por defecto
    allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000'
    ];

    // Obtener dominio principal configurado
    const mainDomain = await db.SystemConfiguration.findOne({
      where: { configKey: 'system_domain' }
    });

    // Obtener dominios adicionales configurados
    const additionalDomains = await db.SystemConfiguration.findOne({
      where: { configKey: 'allowed_origins' }
    });

    if (mainDomain && mainDomain.configValue) {
      const domain = mainDomain.configValue.trim();
      if (domain) {
        allowedOrigins.push(`https://${domain}`);
        allowedOrigins.push(`http://${domain}`);
        allowedOrigins.push(`https://www.${domain}`);
        allowedOrigins.push(`http://www.${domain}`);
      }
    }

    if (additionalDomains && additionalDomains.configValue) {
      try {
        const domains = JSON.parse(additionalDomains.configValue);
        domains.forEach(domain => {
          // Normalizar: quitar barras finales y espacios
          const normalizedDomain = domain.trim().replace(/\/+$/, '');
          if (normalizedDomain && !allowedOrigins.includes(normalizedDomain)) {
            allowedOrigins.push(normalizedDomain);
          }
        });
      } catch (e) {
        console.log('Error parsing additional domains:', e.message);
      }
    }

    // Eliminar duplicados
    allowedOrigins = [...new Set(allowedOrigins)];

    console.log('[CORS] Allowed origins:', allowedOrigins);
  } catch (error) {
    console.log('[CORS] Using default origins (DB not ready):', error.message);
  }
}

// CORS dinamico - verifica contra la lista actualizada
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (Postman, mobile apps, etc)
    if (!origin) return callback(null, true);

    // Verificar si el origin esta en la lista
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-access-token', 'Authorization', 'Origin', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Middleware

app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet()); // Ayuda a securizar la app estableciendo varios headers HTTP
app.use(morgan("dev")); // Logger de peticiones HTTP para desarrollo
app.use(express.json()); // Para parsear application/json
app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded
app.use(helmet());


// Servir archivos estáticos (documentos de clientes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== SERVIR FRONTEND (SIN NGINX) ====================
// En producción, el backend sirve el frontend buildeado
const frontendPath = path.join(__dirname, '../frontend/dist');

// Servir archivos estáticos del frontend (JS, CSS, imágenes)
app.use(express.static(frontendPath));

// Nota: Las rutas de la API se importan individualmente más abajo
// La ruta '/' sirve automáticamente index.html desde frontendPath

// Base de datos
const db = require('./src/models');

// WebSocket - Almacenar usuarios conectados
const connectedUsers = new Map();

// Socket.io - Manejo de señalización WebRTC
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Registrar usuario
  socket.on('register-user', (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`Usuario ${userId} registrado con socket ${socket.id}`);
  });

  // Oferta de llamada
  socket.on('call-offer', ({ userId, offer, callType }) => {
    const targetSocketId = connectedUsers.get(userId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', {
        callerId: Array.from(connectedUsers.entries()).find(([_, socketId]) => socketId === socket.id)?.[0],
        offer,
        callType
      });
      console.log(`Llamada enviada de ${socket.id} a ${targetSocketId}`);
    } else {
      socket.emit('call-error', { message: 'Usuario no disponible' });
    }
  });

  // Respuesta a llamada
  socket.on('call-answer', ({ userId, answer }) => {
    const targetSocketId = connectedUsers.get(userId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-answered', { answer });
      console.log(`Respuesta enviada de ${socket.id} a ${targetSocketId}`);
    }
  });

  // ICE Candidate
  socket.on('ice-candidate', ({ userId, candidate }) => {
    const targetSocketId = connectedUsers.get(userId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', { candidate });
    }
  });

  // Rechazar llamada
  socket.on('call-reject', ({ userId }) => {
    const targetSocketId = connectedUsers.get(userId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-rejected');
      console.log(`Llamada rechazada por ${socket.id}`);
    }
  });

  // Terminar llamada
  socket.on('call-end', ({ userId }) => {
    const targetSocketId = connectedUsers.get(userId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended');
      console.log(`Llamada terminada por ${socket.id}`);
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    // Remover usuario de la lista
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`Usuario ${userId} desconectado`);
        break;
      }
    }
  });
});

// Sincronizar con la base de datos y arrancar el servidor
sequelize.sync({ force: process.env.DB_FORCE_SYNC === "true" })
  .then(async () => {
    console.log("Conexión a la base de datos establecida y modelos sincronizados desde src/index.");

    // Cargar origenes permitidos desde DB
    await loadAllowedOrigins();

    server.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT} desde src/index`);
      console.log('Socket.io iniciado para llamadas WebRTC');
    });
  })
  .catch(err => {
    console.error("No se pudo conectar a la base de datos desde src/index:", err);
  });



// Incluir rutas
require('./src/routes/auth.routes')(app);
require('./src/routes/user.routes')(app);
require('./src/routes/client.routes')(app);
require('./src/routes/network.routes')(app);
require('./src/routes/device.routes')(app);
require('./src/routes/ticket.routes')(app);
// Nuevas rutas para Mikrotik
require('./src/routes/mikrotik.routes')(app);
require('./src/routes/client.mikrotik.routes')(app);
// require('./src/routes/equiposFibraOptica.routes')(app); // Comentado - verificar si existe
//require('./src/routes/dispositivosRed.routes')(app);

// Rutas del inventario
require('./src/routes/inventory.routes')(app);
require('./src/routes/inventoryLocation.routes')(app);
require('./src/routes/inventoryMovement.routes')(app);

// Rutas del calendario
app.use('/api/calendar', require('./src/routes/calendar.routes'));

// Rutas del chat
require('./src/routes/chat.routes')(app);

// Rutas de WhatsApp
require('./src/routes/whatsapp.routes')(app);

// Rutas de SMS
require('./src/routes/sms.routes')(app);

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

// ==================== RUTA CATCH-ALL PARA SPA (Vue Router) ====================
// IMPORTANTE: Esto debe ir DESPUES de todas las rutas de API
// Usar middleware en lugar de app.get('/*') para evitar PathError en Express 5.x
app.use((req, res, next) => {
  // Si la ruta no es de API, uploads o socket.io, servir el index.html del frontend
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error sirviendo index.html:', err);
        res.status(500).send('Error al cargar la aplicación');
      }
    });
  } else {
    // Para rutas de API que no existen, pasar al siguiente middleware (404)
    next();
  }
});

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

// ==================== EXPORTAR FUNCIONES PARA CONFIGURACION DINAMICA ====================

module.exports.reloadAllowedOrigins = loadAllowedOrigins;