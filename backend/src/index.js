// backend/src/index.js
const express = require('express');
const cors = require('cors');
const morgan = require("morgan");
const helmet = require('helmet');
const dotenv = require("dotenv");

const path = require('path');

const { setupTPLinkPermissions } = require("./config/permissions-setup");

dotenv.config();

console.log('=== DEBUG CONFIGURACIÓN ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_DIALECT:', process.env.DB_DIALECT);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('============================');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Para desarrollo - cambia esto a tu dominio en producción
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-access-token', 'Origin']
}));
app.use(express.json());
app.use(helmet()); // Ayuda a securizar la app estableciendo varios headers HTTP
app.use(morgan("dev")); // Logger de peticiones HTTP para desarrollo
app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded

// Servir archivos estáticos (documentos de clientes)
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Rutas
app.get('/', (req, res) => {
  res.json({ message: 'API del Sistema ISP funcionando correctamente desde src/index' });
});

// Base de datos - IMPORTAR LA INSTANCIA CORRECTA
const db = require('./models');

// Función para sincronizar modelos en orden
async function synchronizeDatabase() {
  try {
    // Sincronizar modelos en orden de dependencias
    await db.Zone.sync({ force: false }); // Primero, porque ServicePackage depende de Zone
    await db.MikrotikRouter.sync({ force: false }); // Luego, porque MikrotikProfile depende de MikrotikRouter
    await db.ServicePackage.sync({ force: false }); // Luego, porque MikrotikProfile depende de ServicePackage
    await db.MikrotikProfile.sync({ force: false }); // Finalmente, porque depende de ServicePackage y MikrotikRouter

    // Sincronizar otros modelos para asegurar que todas las tablas se creen
    await db.Role.sync({ force: false });
    await db.Permission.sync({ force: false });
    await db.User.sync({ force: false });
    await db.Node.sync({ force: false });
    await db.Sector.sync({ force: false });
    await db.Client.sync({ force: false });
    await db.ClientDocument.sync({ force: false });
    await db.ClientNetwork.sync({ force: false });
    await db.Subscription.sync({ force: false });
    await db.Ticket.sync({ force: false });
    await db.TicketComment.sync({ force: false });
    await db.Device.sync({ force: false });
    await db.DeviceCredential.sync({ force: false });
    await db.DeviceMetric.sync({ force: false });
    await db.CommandHistory.sync({ force: false });
    await db.DeviceCommand.sync({ force: false });
    await db.DeviceBrand.sync({ force: false });
    await db.DeviceFamily.sync({ force: false });
    await db.CommonCommand.sync({ force: false });
    await db.CommandImplementation.sync({ force: false });
    await db.CommandParameter.sync({ force: false });
    await db.SnmpOid.sync({ force: false });
    await db.Inventory.sync({ force: false });
    await db.InventoryLocation.sync({ force: false });
    await db.InventoryMovement.sync({ force: false });
    await db.InventoryScrap.sync({ force: false });
    await db.SystemConfiguration.sync({ force: false });
    await db.SystemLicense.sync({ force: false });
    await db.SystemPlugin.sync({ force: false });
    await db.IpPool.sync({ force: false });
    await db.MikrotikPPPOE.sync({ force: false });
    await db.MikrotikIp.sync({ force: false });
    await db.ClientBilling.sync({ force: false });
    await db.ClientNetworkConfig.sync({ force: false });
    await db.ClientInstallation.sync({ force: false });
    await db.ClientSupport.sync({ force: false });
    await db.InventoryCategory.sync({ force: false });
    await db.InventoryType.sync({ force: false });
    await db.InventoryProduct.sync({ force: false });
    await db.InstallationMaterial.sync({ force: false });
    await db.PaymentGateway.sync({ force: false });
    await db.Invoice.sync({ force: false });
    await db.Payment.sync({ force: false });
    await db.PaymentReminder.sync({ force: false });
    await db.CommunicationChannel.sync({ force: false });
    await db.MessageTemplate.sync({ force: false });
    await db.CommunicationLog.sync({ force: false });
    await db.TicketType.sync({ force: false });
    await db.TicketAttachment.sync({ force: false });

    // Sincronizar nuevos modelos de comunicación
    await db.NotificationRule.sync({ force: false });
    await db.NotificationQueue.sync({ force: false });
    await db.CommunicationContact.sync({ force: false });
    await db.CommunicationEvent.sync({ force: false });

    console.log("Conexión a la base de datos establecida y modelos sincronizados desde src/index.");
    await initial(); // Llamar a la función para datos iniciales
  } catch (error) {
    console.error("No se pudo conectar a la base de datos desde src/index:", error);
    process.exit(1);
  }
}

// Sincronizar con la base de datos y arrancar el servidor
synchronizeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT} desde src/index`);
  });
});

// Inicializar sistema de facturación automática
const BillingJob = require('./jobs/billing-job');

// Solo en producción o si quieres probarlo
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_BILLING_JOBS === 'true') {
  BillingJob.initializeJobs();
  console.log('✅ Sistema de facturación automática activado');
} else {
  console.log('⚠️ Sistema de facturación en modo manual');
}

// Registrar rutas
// IMPORTANTE: El orden de registro de rutas es crítico
// Las rutas más específicas deben registrarse antes que las más generales
// para evitar conflictos de coincidencia de patrones

console.log('\n=== REGISTRANDO RUTAS ===');

// Rutas de autenticación y usuarios
try {
  console.log('Registrando auth.routes...');
  require('./routes/auth.routes')(app);
  console.log('✅ auth.routes registradas');
} catch (error) {
  console.error('❌ Error en auth.routes:', error.message);
}

try {
  console.log('Registrando user.routes...');
  require('./routes/user.routes')(app);
  console.log('✅ user.routes registradas');
} catch (error) {
  console.error('❌ Error en user.routes:', error.message);
}

try {
  console.log('Registrando role.routes...');
  require('./routes/role.routes')(app);
  console.log('✅ role.routes registradas');
} catch (error) {
  console.error('❌ Error en role.routes:', error.message);
}

try {
  console.log('Registrando permission.routes...');
  require('./routes/permission.routes')(app);
  console.log('✅ permission.routes registradas');
} catch (error) {
  console.error('❌ Error en permission.routes:', error.message);
}


try {
  console.log('Registrando backup.routes...');
  require('./routes/backup.routes')(app);
  console.log('✅ backup.routes registradas');
} catch (error) {
  console.error('❌ Error en backup.routes:', error.message);
}

try {
  console.log('Registrando notification.routes...');
  require('./routes/notification.routes')(app);
  console.log('✅ notification.routes registradas');
} catch (error) {
  console.error('❌ Error en notification.routes:', error.message);
}

try {
  console.log('Registrando commandHistory.routes...');
  require('./routes/commandHistory.routes')(app);
  console.log('✅ commandHistory.routes registradas');
} catch (error) {
  console.error('❌ Error en commandHistory.routes:', error.message);
}

try {
  console.log('Registrando commandImplementation.routes...');
  require('./routes/commandImplementation.routes')(app);
  console.log('✅ commandImplementation.routes registradas');
} catch (error) {
  console.error('❌ Error en commandImplementation.routes:', error.message);
}

try {
  console.log('Registrando commonCommand.routes...');
  require('./routes/commonCommand.routes')(app);
  console.log('✅ commonCommand.routes registradas');
} catch (error) {
  console.error('❌ Error en commonCommand.routes:', error.message);
}

// Rutas de sistema y configuración
try {
  console.log('Registrando systemLicense.routes...');
  require('./routes/systemLicense.routes')(app);
  console.log('✅ systemLicense.routes registradas');
} catch (error) {
  console.error('❌ Error en systemLicense.routes:', error.message);
}

try {
  console.log('Registrando systemPlugin.routes...');
  require('./routes/systemPlugin.routes')(app);
  console.log('✅ systemPlugin.routes registradas');
} catch (error) {
  console.error('❌ Error en systemPlugin.routes:', error.message);
}

// Rutas de red y Mikrotik
// Primero las rutas específicas
try {
  console.log('Registrando client.mikrotik.routes...');
  require('./routes/client.mikrotik.routes')(app);
  console.log('✅ client.mikrotik.routes registradas');
} catch (error) {
  console.error('❌ Error en client.mikrotik.routes:', error.message);
}

try {
  console.log('Registrando ip.pool.routes...');
  require('./routes/ip.pool.routes')(app);
  console.log('✅ ip.pool.routes registradas');
} catch (error) {
  console.error('❌ Error en ip.pool.routes:', error.message);
}

try {
  console.log('Registrando ip.assignment.routes...');
  require('./routes/ip.assignment.routes')(app);
  console.log('✅ ip.assignment.routes registradas');
} catch (error) {
  console.error('❌ Error en ip.assignment.routes:', error.message);
}

// Luego las rutas generales de red
try {
  console.log('Registrando network.routes...');
  require('./routes/network.routes')(app);
  console.log('✅ network.routes registradas');
} catch (error) {
  console.error('❌ Error en network.routes:', error.message);
}

try {
  console.log('Registrando mikrotik.routes...');
  require('./routes/mikrotik.routes')(app);
  console.log('✅ mikrotik.routes registradas');
} catch (error) {
  console.error('❌ Error en mikrotik.routes:', error.message);
}

// Rutas de clientes y servicios
// Primero las rutas específicas
try {
  console.log('Registrando client.billing.routes...');
  require('./routes/client.billing.routes')(app);
  console.log('✅ client.billing.routes registradas');
} catch (error) {
  console.error('❌ Error en client.billing.routes:', error.message);
}

try {
  console.log('Registrando payment.routes...');
  require('./routes/payment.routes')(app);
  console.log('✅ payment.routes registradas');
} catch (error) {
  console.error('❌ Error en payment.routes:', error.message);
}

/*
try {
  console.log('Registrando client-networks.routes...');
  require('./routes/client-network.routes')(app);
  console.log('✅ client-networks.routes registradas');
} catch (error) {
  console.error('❌ Error en client-networks.routes:', error.message);
}
*/
try {
  console.log('Registrando client.billing.routes...');
  require('./routes/invoice.routes')(app);
  console.log('✅ client.billing.routes registradas');
} catch (error) {
  console.error('❌ Error en client.billing.routes:', error.message);
}

try {
  console.log('Registrando subscription.routes...');
  require('./routes/subscription.routes')(app);
  console.log('✅ subscription.routes registradas');
} catch (error) {
  console.error('❌ Error en subscription.routes:', error.message);
}

try {
  console.log('Registrando service.package.routes...');
  require('./routes/service.package.routes')(app);
  console.log('✅ service.package.routes registradas');
} catch (error) {
  console.error('❌ Error en service.package.routes:', error.message);
}

// Luego las rutas generales
try {
  console.log('Registrando client.routes...');
  require('./routes/client.routes')(app);
  console.log('✅ client.routes registradas');
} catch (error) {
  console.error('❌ Error en client.routes:', error.message);
}

// Rutas de inventario
// Primero las rutas específicas
try {
  console.log('Registrando inventoryLocation.routes...');
  require('./routes/inventoryLocation.routes')(app);
  console.log('✅ inventoryLocation.routes registradas');
} catch (error) {
  console.error('❌ Error en inventoryLocation.routes:', error.message);
}

try {
  console.log('Registrando inventoryMovement.routes...');
  require('./routes/inventoryMovement.routes')(app);
  console.log('✅ inventoryMovement.routes registradas');
} catch (error) {
  console.error('❌ Error en inventoryMovement.routes:', error.message);
}

// Luego las rutas generales
try {
  console.log('Registrando inventory.routes...');
  require('./routes/inventory.routes')(app);
  console.log('✅ inventory.routes registradas');
} catch (error) {
  console.error('❌ Error en inventory.routes:', error.message);
}

// Rutas de tickets y soporte
try {
  console.log('Registrando ticket.routes...');
  require('./routes/ticket.routes')(app);
  console.log('✅ ticket.routes registradas');
} catch (error) {
  console.error('❌ Error en ticket.routes:', error.message);
}

try {
  console.log('Registrando mikrotikRouter.routes...');
  require('./routes/mikrotikRouter.routes')(app);
  console.log('✅ mikrotikRouter.routes registradas');
} catch (error) {
  console.error('❌ Error en mikrotikRouter.routes:', error.message);
}

try {
  console.log('Registrando device.routes...');
  require('./routes/device.routes')(app);
  console.log('✅ device.routes registradas');
} catch (error) {
  console.error('❌ Error en device.routes:', error.message);
}

try {
  console.log('Registrando snmpOid.routes...');
  require('./routes/snmpOid.routes')(app);
  console.log('✅ snmpOid.routes.routes registradas');
} catch (error) {
  console.error('❌ Error en snmpOid.routes:', error.message);
}

try {
  console.log('Registrando deviceMetric.routes...');
  require('./routes/deviceMetric.routes')(app);
  console.log('✅ deviceMetric.routes.routes registradas');
} catch (error) {
  console.error('❌ Error en deviceMetric.routes:', error.message);
}

try {
  console.log('Registrando deviceCommand.routes...');
  require('./routes/deviceCommand.routes')(app);
  console.log('✅ deviceCommand.routes.routes registradas');
} catch (error) {
  console.error('❌ Error en deviceCommand.routes:', error.message);
}

try {
  console.log('Registrando deviceCredential.routes...');
  require('./routes/deviceCredential.routes')(app);
  console.log('✅ deviceCredential.routes registradas');
} catch (error) {
  console.error('❌ Error en deviceCredential.routes:', error.message);
}

try {
  console.log('Registrando deviceFamily.routes...');
  require('./routes/deviceFamily.routes')(app);
  console.log('✅ deviceFamily.routes registradas');
} catch (error) {
  console.error('❌ Error en deviceFamily.routes.routes:', error.message);
}

try {
  console.log('Registrando deviceBrand.routes...');
  require('./routes/deviceBrand.routes')(app);
  console.log('✅ deviceBrand.routes registradas');
} catch (error) {
  console.error('❌ Error en deviceBrand.routes:', error.message);
}

// ==================== NUEVAS RUTAS DE COMUNICACIÓN ====================
try {
  console.log('Registrando communicationPlugin.routes...');
  require('./routes/communicationPlugin.routes')(app);
  console.log('✅ communicationPlugin.routes registradas');
} catch (error) {
  console.error('❌ Error en communicationPlugin.routes:', error.message);
  console.error('Stack completo:', error.stack);
}
try {
  console.log('Registrando template.routes...');
  require('./routes/template.routes')(app);
  console.log('✅ template.routes registradas');
} catch (error) {
  console.error('❌ Error en template.routes:', error.message);
  console.error('Stack completo:', error.stack);
}

console.log('\n=== FIN REGISTRO DE RUTAS ===');
console.log("Todas las rutas han sido procesadas");

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
      // Crear permisos básicos INCLUYENDO INVENTARIO Y COMUNICACIONES
      await Permission.bulkCreate([
        { name: "view_dashboard", description: "Ver dashboard", module: "dashboard" },
        { name: "manage_clients", description: "Gestionar clientes", module: "clients" },
        { name: "view_network", description: "Ver estado de red", module: "network" },
        { name: "manageNetwork", description: "Gestionar red", module: "network" },
        { name: "view_billing", description: "Ver facturación", module: "billing" },
        { name: "manage_billing", description: "Gestionar facturación", module: "billing" },
        { name: "view_tickets", description: "Ver tickets", module: "tickets" },
        { name: "manage_tickets", description: "Gestionar tickets", module: "tickets" },
        { name: "view_inventory", description: "Ver inventario", module: "inventory" },
        { name: "manage_inventory", description: "Gestionar inventario", module: "inventory" },
		{ name: "manage_device", description: "Gestionar dispositivos", module: "device" },
        
        // Nuevos permisos para usuarios y roles
        { name: "view_users", description: "Ver usuarios", module: "users" },
        { name: "manage_users", description: "Gestionar usuarios", module: "users" },
        { name: "view_roles", description: "Ver roles", module: "roles" },
        { name: "manage_roles", description: "Gestionar roles", module: "roles" },
        { name: "manage_permissions", description: "Gestionar permisos", module: "permissions" },
        
        // ==================== NUEVOS PERMISOS DE COMUNICACIÓN ====================
        { name: "manage_communication", description: "Gestionar canales de comunicación", module: "communication" },
        { name: "send_messages", description: "Enviar mensajes individuales", module: "communication" },
        { name: "send_mass_messages", description: "Enviar mensajes masivos", module: "communication" },
        { name: "schedule_messages", description: "Programar mensajes", module: "communication" },
        { name: "send_payment_reminders", description: "Enviar recordatorios de pago", module: "communication" },
        { name: "send_service_notifications", description: "Enviar notificaciones de servicio", module: "communication" },
        { name: "manage_templates", description: "Gestionar plantillas de mensajes", module: "communication" },
        { name: "view_communication_history", description: "Ver historial de comunicaciones", module: "communication" }
      ]);
      console.log("Permisos creados (incluyendo comunicaciones)");
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

    // Crear ubicaciones de inventario por defecto
    const InventoryLocation = db.InventoryLocation;
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
          type: "repairShop",
          description: "Área de reparación de equipos defectuosos",
          active: true
        },
        {
          name: "Cliente",
          type: "clientSite",
          description: "Asignado a cliente",
          active: true
        }
      ]);
      console.log("Ubicaciones de inventario creadas");
    }

    // ==================== CREAR CANALES DE COMUNICACIÓN POR DEFECTO ====================
    
    const CommunicationChannel = db.CommunicationChannel;
    const channelCount = await CommunicationChannel.count();
    
    if (channelCount === 0) {
      await CommunicationChannel.bulkCreate([
        {
          name: "Email Principal",
          channelType: "email",
          active: false, // Inactivo hasta configurar
          configuration: {
            provider: "smtp",
            from: {
              name: "Mi ISP",
              email: "noreply@miisp.com"
            },
            smtp: {
              host: "smtp.gmail.com",
              port: 587,
              secure: false,
              auth: {
                user: "",
                pass: ""
              }
            }
          }
        },
        {
          name: "WhatsApp Business",
          channelType: "whatsapp",
          active: false,
          configuration: {
            provider: "whatsapp-web",
            webhook: {
              url: "",
              secret: ""
            }
          }
        },
        {
          name: "Telegram Bot",
          channelType: "telegram",
          active: false,
          configuration: {
            botToken: "",
            webhook: {
              url: "",
              secret: ""
            }
          }
        },
        {
          name: "SMS Twilio",
          channelType: "sms",
          active: false,
          configuration: {
            provider: "twilio",
            accountSid: "",
            authToken: "",
            fromNumber: ""
          }
        }
      ]);
      console.log("Canales de comunicación por defecto creados");
    }

    // ==================== CREAR PLANTILLAS POR DEFECTO ====================
    
    const MessageTemplate = db.MessageTemplate;
    const templateCount = await MessageTemplate.count();
    
    if (templateCount === 0) {
      await MessageTemplate.bulkCreate([
        {
          name: "Recordatorio de Pago",
          templateType: "paymentReminder",
          subject: "Recordatorio de Pago - {firstName}",
          messageBody: `Estimado/a {firstName},

Le recordamos que tiene un pago pendiente:
- Monto: {amount}
- Días de atraso: {daysOverdue}

Por favor realice su pago lo antes posible para evitar suspensión del servicio.

Gracias por su preferencia.`,
          variables: ["firstName", "lastName", "amount", "daysOverdue", "dueDate"],
          active: true
        },
        {
          name: "Bienvenida Nuevo Cliente",
          templateType: "welcome",
          subject: "¡Bienvenido a nuestros servicios!",
          messageBody: `¡Hola {firstName}!

¡Bienvenido/a a nuestra familia de clientes!

Nos complace confirmar que su servicio de internet ha sido activado exitosamente.

Si tiene alguna pregunta, no dude en contactarnos.

¡Gracias por confiar en nosotros!`,
          variables: ["firstName", "lastName"],
          active: true
        },
        {
          name: "Suspensión de Servicio",
          templateType: "suspension",
          subject: "Suspensión de Servicio - {firstName}",
          messageBody: `Estimado/a {firstName},

Lamentamos informarle que su servicio ha sido suspendido por: {reason}

Fecha de suspensión: {suspensionDate}

Para reactivar su servicio, por favor póngase en contacto con nosotros.

Atentamente,
Equipo de Soporte`,
          variables: ["firstName", "reason", "suspensionDate"],
          active: true
        },
        {
          name: "Reactivación de Servicio",
          templateType: "reactivation",
          subject: "¡Servicio Reactivado! - {firstName}",
          messageBody: `¡Estimado/a {firstName}!

Nos complace informarle que su servicio ha sido reactivado exitosamente.

Fecha de reactivación: {reactivationDate}

Gracias por su pago y por continuar confiando en nuestros servicios.

¡Bienvenido/a de vuelta!`,
          variables: ["firstName", "reactivationDate"],
          active: true
        }
      ]);
      console.log("Plantillas de mensaje por defecto creadas");
    }
    
  } catch (error) {
    console.error("Error al crear datos iniciales desde src/index:", error);
  }
  
}

// Manejo graceful de cierre del servidor
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

module.exports = app;