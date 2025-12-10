const db = require('../models');
const bcrypt = require('bcrypt');

// Función para cargar datos iniciales
async function seedData() {
  try {
    console.log('Iniciando carga de datos iniciales...');
    
    // Crear roles si no existen
    const roles = [
      { name: 'admin', description: 'Administrador', level: 5, category: 'admin' },
      { name: 'tecnico', description: 'Técnico de campo', level: 2, category: 'tecnico' },
      { name: 'cliente', description: 'Usuario cliente', level: 1, category: 'cliente' }
    ];
    
    for (const role of roles) {
      const [roleObj, created] = await db.Role.findOrCreate({
        where: { name: role.name },
        defaults: role
      });
      
      if (created) {
        console.log(`Rol creado: ${role.name}`);
      }
    }
    
    // Crear permisos si no existen
    const permissions = [
      { name: 'view_dashboard', description: 'Ver dashboard', module: 'dashboard' },
      { name: 'manage_clients', description: 'Gestionar clientes', module: 'clients' },
      { name: 'view_network', description: 'Ver estado de red', module: 'network' },
      { name: 'manageNetwork', description: 'Gestionar red', module: 'network' },
      { name: 'view_billing', description: 'Ver facturación', module: 'billing' },
      { name: 'manage_billing', description: 'Gestionar facturación', module: 'billing' },
      { name: 'view_inventory', description: 'Ver inventario', module: 'inventory' },
      { name: 'manage_inventory', description: 'Gestionar inventario', module: 'inventory' },
      { name: 'view_tickets', description: 'Ver tickets', module: 'tickets' },
      { name: 'manage_tickets', description: 'Gestionar tickets', module: 'tickets' }
    ];
    
    for (const perm of permissions) {
      const [permObj, created] = await db.Permission.findOrCreate({
        where: { name: perm.name },
        defaults: perm
      });
      
      if (created) {
        console.log(`Permiso creado: ${perm.name}`);
      }
    }
    
    // Asignar permisos a roles
    const adminRole = await db.Role.findOne({ where: { name: 'admin' } });
    const tecnicoRole = await db.Role.findOne({ where: { name: 'tecnico' } });
    const clienteRole = await db.Role.findOne({ where: { name: 'cliente' } });
    
    const allPermissions = await db.Permission.findAll();
    await adminRole.setPermissions(allPermissions);
    
    const tecnicoPermissions = await db.Permission.findAll({
      where: {
        name: ['view_dashboard', 'view_network', 'view_clients', 'view_tickets', 'manage_tickets']
      }
    });
    await tecnicoRole.setPermissions(tecnicoPermissions);
    
    const clientePermissions = await db.Permission.findAll({
      where: {
        name: ['view_dashboard']
      }
    });
    await clienteRole.setPermissions(clientePermissions);
    
    // Crear usuarios por defecto
    const users = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        fullName: 'Administrador',
        roleId: adminRole.id
      },
      {
        username: 'tecnico1',
        email: 'tecnico1@example.com',
        password: 'tecnico123',
        fullName: 'Técnico Uno',
        roleId: tecnicoRole.id
      },
      {
        username: 'tecnico2',
        email: 'tecnico2@example.com',
        password: 'tecnico123',
        fullName: 'Técnico Dos',
        roleId: tecnicoRole.id
      }
    ];
    
    for (const user of users) {
      const [userObj, created] = await db.User.findOrCreate({
        where: { username: user.username },
        defaults: {
          ...user,
          password: await bcrypt.hash(user.password, 10)
        }
      });
      
      if (created) {
        console.log(`Usuario creado: ${user.username}`);
      }
    }
    
    // Crear nodos
    const nodes = [
      { name: 'Nodo Principal', location: 'Centro', latitude: 19.4326, longitude: -99.1332, active: true },
      { name: 'Nodo Norte', location: 'Zona Norte', latitude: 19.4526, longitude: -99.1232, active: true },
      { name: 'Nodo Sur', location: 'Zona Sur', latitude: 19.4126, longitude: -99.1432, active: true },
      { name: 'Nodo Este', location: 'Zona Este', latitude: 19.4426, longitude: -99.1132, active: false }
    ];
    
    for (const node of nodes) {
      const [nodeObj, created] = await db.Node.findOrCreate({
        where: { name: node.name },
        defaults: node
      });
      
      if (created) {
        console.log(`Nodo creado: ${node.name}`);
      }
    }
    
    // Crear sectores
    const nodePrincipal = await db.Node.findOne({ where: { name: 'Nodo Principal' } });
    const nodoNorte = await db.Node.findOne({ where: { name: 'Nodo Norte' } });
    const nodoSur = await db.Node.findOne({ where: { name: 'Nodo Sur' } });
    const nodoEste = await db.Node.findOne({ where: { name: 'Nodo Este' } });
    
    const sectors = [
      { name: 'Sector 1', description: 'Sector norte principal', frequency: '5.8 GHz', azimuth: 0, polarization: 'vertical', nodeId: nodePrincipal.id, active: true },
      { name: 'Sector 2', description: 'Sector este principal', frequency: '5.8 GHz', azimuth: 90, polarization: 'vertical', nodeId: nodePrincipal.id, active: true },
      { name: 'Sector 3', description: 'Sector sur principal', frequency: '5.8 GHz', azimuth: 180, polarization: 'vertical', nodeId: nodePrincipal.id, active: true },
      { name: 'Sector Norte 1', description: 'Sector principal norte', frequency: '5.8 GHz', azimuth: 0, polarization: 'vertical', nodeId: nodoNorte.id, active: true },
      { name: 'Sector Sur 1', description: 'Sector principal sur', frequency: '5.8 GHz', azimuth: 180, polarization: 'vertical', nodeId: nodoSur.id, active: true },
      { name: 'Sector Este 1', description: 'Sector principal este', frequency: '5.8 GHz', azimuth: 90, polarization: 'vertical', nodeId: nodoEste.id, active: false }
    ];
    
    for (const sector of sectors) {
      const [sectorObj, created] = await db.Sector.findOrCreate({
        where: { name: sector.name, nodeId: sector.nodeId },
        defaults: sector
      });
      
      if (created) {
        console.log(`Sector creado: ${sector.name}`);
      }
    }
    
    // Crear clientes
    const sector1 = await db.Sector.findOne({ where: { name: 'Sector 1' } });
    const sector2 = await db.Sector.findOne({ where: { name: 'Sector 2' } });
    const sector3 = await db.Sector.findOne({ where: { name: 'Sector 3' } });
    const sectorNorte1 = await db.Sector.findOne({ where: { name: 'Sector Norte 1' } });
    const sectorSur1 = await db.Sector.findOne({ where: { name: 'Sector Sur 1' } });
    
    const clients = [
      { firstName: 'Juan', lastName: 'Pérez', email: 'juan@example.com', phone: '555-1234', whatsapp: '555-1234', address: 'Calle 1 #123', latitude: 19.4320, longitude: -99.1335, sectorId: sector1.id, active: true },
      { firstName: 'María', lastName: 'González', email: 'maria@example.com', phone: '555-5678', whatsapp: '555-5678', address: 'Calle 2 #456', latitude: 19.4330, longitude: -99.1325, sectorId: sector1.id, active: true },
      { firstName: 'Carlos', lastName: 'Rodríguez', email: 'carlos@example.com', phone: '555-9012', whatsapp: '555-9012', address: 'Calle 3 #789', latitude: 19.4340, longitude: -99.1315, sectorId: sector2.id, active: true },
      { firstName: 'Ana', lastName: 'Martínez', email: 'ana@example.com', phone: '555-3456', whatsapp: '555-3456', address: 'Calle 4 #012', latitude: 19.4350, longitude: -99.1305, sectorId: sector2.id, active: true },
      { firstName: 'Luis', lastName: 'López', email: 'luis@example.com', phone: '555-7890', whatsapp: '555-7890', address: 'Calle 5 #345', latitude: 19.4360, longitude: -99.1295, sectorId: sector3.id, active: true },
      { firstName: 'Laura', lastName: 'Sánchez', email: 'laura@example.com', phone: '555-1122', whatsapp: '555-1122', address: 'Calle 6 #678', latitude: 19.4520, longitude: -99.1235, sectorId: sectorNorte1.id, active: true },
      { firstName: 'Pedro', lastName: 'Hernández', email: 'pedro@example.com', phone: '555-3344', whatsapp: '555-3344', address: 'Calle 7 #901', latitude: 19.4120, longitude: -99.1435, sectorId: sectorSur1.id, active: true },
      { firstName: 'Sofía', lastName: 'García', email: 'sofia@example.com', phone: '555-5566', whatsapp: '555-5566', address: 'Calle 8 #234', latitude: 19.4330, longitude: -99.1335, sectorId: sector1.id, active: false }
    ];
    
    for (const client of clients) {
      const [clientObj, created] = await db.Client.findOrCreate({
        where: { firstName: client.firstName, lastName: client.lastName, email: client.email },
        defaults: client
      });
      
      if (created) {
        console.log(`Cliente creado: ${client.firstName} ${client.lastName}`);
      }
    }
    
    // Crear servicios
    const services = [
      { name: 'Plan Básico', downloadSpeed: 10, uploadSpeed: 2, price: 299.99, description: 'Servicio básico de internet', hasJellyfin: false, active: true },
      { name: 'Plan Estándar', downloadSpeed: 20, uploadSpeed: 5, price: 399.99, description: 'Servicio estándar de internet', hasJellyfin: false, active: true },
      { name: 'Plan Premium', downloadSpeed: 50, uploadSpeed: 10, price: 599.99, description: 'Servicio premium de internet', hasJellyfin: true, active: true },
      { name: 'Plan Empresarial', downloadSpeed: 100, uploadSpeed: 20, price: 999.99, description: 'Servicio empresarial de internet', hasJellyfin: true, active: true }
    ];
    
    for (const service of services) {
      const [serviceObj, created] = await db.Service.findOrCreate({
        where: { name: service.name },
        defaults: service
      });
      
      if (created) {
        console.log(`Servicio creado: ${service.name}`);
      }
    }
    
    // Asignar servicios a clientes (suscripciones)
    const planBasico = await db.Service.findOne({ where: { name: 'Plan Básico' } });
    const planEstandar = await db.Service.findOne({ where: { name: 'Plan Estándar' } });
    const planPremium = await db.Service.findOne({ where: { name: 'Plan Premium' } });
    const planEmpresarial = await db.Service.findOne({ where: { name: 'Plan Empresarial' } });
    
    const client1 = await db.Client.findOne({ where: { firstName: 'Juan', lastName: 'Pérez' } });
    const client2 = await db.Client.findOne({ where: { firstName: 'María', lastName: 'González' } });
    const client3 = await db.Client.findOne({ where: { firstName: 'Carlos', lastName: 'Rodríguez' } });
    const client4 = await db.Client.findOne({ where: { firstName: 'Ana', lastName: 'Martínez' } });
    const client5 = await db.Client.findOne({ where: { firstName: 'Luis', lastName: 'López' } });
    const client6 = await db.Client.findOne({ where: { firstName: 'Laura', lastName: 'Sánchez' } });
    const client7 = await db.Client.findOne({ where: { firstName: 'Pedro', lastName: 'Hernández' } });
    const client8 = await db.Client.findOne({ where: { firstName: 'Sofía', lastName: 'García' } });
    
    const subscriptions = [
      { clientId: client1.id, serviceId: planEstandar.id, startDate: '2023-01-01', status: 'active', ipAddress: '192.168.1.101', username: 'juan_perez' },
      { clientId: client2.id, serviceId: planBasico.id, startDate: '2023-02-15', status: 'active', ipAddress: '192.168.1.102', username: 'maria_glez' },
      { clientId: client3.id, serviceId: planPremium.id, startDate: '2023-03-10', status: 'active', ipAddress: '192.168.1.103', username: 'carlos_rdz' },
      { clientId: client4.id, serviceId: planEstandar.id, startDate: '2023-04-20', status: 'active', ipAddress: '192.168.1.104', username: 'ana_mtz' },
      { clientId: client5.id, serviceId: planEmpresarial.id, startDate: '2023-05-05', status: 'active', ipAddress: '192.168.1.105', username: 'luis_lopez' },
      { clientId: client6.id, serviceId: planBasico.id, startDate: '2023-06-12', status: 'active', ipAddress: '192.168.1.106', username: 'laura_snz' },
      { clientId: client7.id, serviceId: planEstandar.id, startDate: '2023-07-18', status: 'active', ipAddress: '192.168.1.107', username: 'pedro_hdz' },
      { clientId: client8.id, serviceId: planBasico.id, startDate: '2023-08-25', status: 'suspended', ipAddress: '192.168.1.108', username: 'sofia_grz' }
    ];
    
    for (const sub of subscriptions) {
      const [subObj, created] = await db.Subscription.findOrCreate({
        where: { clientId: sub.clientId, serviceId: sub.serviceId },
        defaults: sub
      });
      
      if (created) {
        console.log(`Suscripción creada para cliente ID ${sub.clientId} y servicio ID ${sub.serviceId}`);
      }
    }
    
    // Crear dispositivos de red
    const devices = [
      { name: 'Router Principal', type: 'router', brand: 'mikrotik', model: 'CCR1036-12G-4S', ipAddress: '192.168.1.1', macAddress: '00:11:22:33:44:55', username: 'admin', password: 'password', apiPort: 8728, nodeId: nodePrincipal.id, status: 'online', lastSeen: new Date() },
      { name: 'Switch Core', type: 'switch', brand: 'mikrotik', model: 'CRS326-24G-2S+', ipAddress: '192.168.1.2', macAddress: '00:11:22:33:44:66', username: 'admin', password: 'password', apiPort: 8728, nodeId: nodePrincipal.id, status: 'online', lastSeen: new Date() },
      { name: 'AP Sector 1', type: 'antenna', brand: 'ubiquiti', model: 'Rocket M5', ipAddress: '192.168.1.10', macAddress: '00:11:22:33:44:77', username: 'admin', password: 'password', nodeId: nodePrincipal.id, sectorId: sector1.id, status: 'online', lastSeen: new Date() },
      { name: 'AP Sector 2', type: 'antenna', brand: 'ubiquiti', model: 'Rocket M5', ipAddress: '192.168.1.11', macAddress: '00:11:22:33:44:88', username: 'admin', password: 'password', nodeId: nodePrincipal.id, sectorId: sector2.id, status: 'online', lastSeen: new Date() },
      { name: 'AP Sector 3', type: 'antenna', brand: 'ubiquiti', model: 'Rocket M5', ipAddress: '192.168.1.12', macAddress: '00:11:22:33:44:99', username: 'admin', password: 'password', nodeId: nodePrincipal.id, sectorId: sector3.id, status: 'online', lastSeen: new Date() },
      { name: 'Router Norte', type: 'router', brand: 'mikrotik', model: 'RB450G', ipAddress: '192.168.2.1', macAddress: '00:11:22:33:55:55', username: 'admin', password: 'password', apiPort: 8728, nodeId: nodoNorte.id, status: 'online', lastSeen: new Date() },
      { name: 'Router Sur', type: 'router', brand: 'mikrotik', model: 'RB450G', ipAddress: '192.168.3.1', macAddress: '00:11:22:33:66:55', username: 'admin', password: 'password', apiPort: 8728, nodeId: nodoSur.id, status: 'online', lastSeen: new Date() },
      { name: 'Router Este', type: 'router', brand: 'mikrotik', model: 'RB450G', ipAddress: '192.168.4.1', macAddress: '00:11:22:33:77:55', username: 'admin', password: 'password', apiPort: 8728, nodeId: nodoEste.id, status: 'offline', lastSeen: new Date(Date.now() - 86400000) },
      { name: 'CPE Cliente 1', type: 'cpe', brand: 'ubiquiti', model: 'LiteBeam M5', ipAddress: '192.168.10.101', macAddress: 'AA:BB:CC:11:22:33', username: 'admin', password: 'password', clientId: client1.id, status: 'online', lastSeen: new Date() },
      { name: 'CPE Cliente 2', type: 'cpe', brand: 'ubiquiti', model: 'NanoStation M5', ipAddress: '192.168.10.102', macAddress: 'AA:BB:CC:11:22:44', username: 'admin', password: 'password', clientId: client2.id, status: 'online', lastSeen: new Date() },
      { name: 'CPE Cliente 3', type: 'cpe', brand: 'ubiquiti', model: 'NanoStation M5', ipAddress: '192.168.10.103', macAddress: 'AA:BB:CC:11:22:55', username: 'admin', password: 'password', clientId: client3.id, status: 'online', lastSeen: new Date() },
      { name: 'CPE Cliente 5', type: 'cpe', brand: 'mikrotik', model: 'LHG 5', ipAddress: '192.168.10.105', macAddress: 'AA:BB:CC:11:22:77', username: 'admin', password: 'password', apiPort: 8728, clientId: client5.id, status: 'online', lastSeen: new Date() }
    ];
    
    for (const device of devices) {
      const [deviceObj, created] = await db.Device.findOrCreate({
        where: { name: device.name },
        defaults: device
      });
      
      if (created) {
        console.log(`Dispositivo creado: ${device.name}`);
      }
    }
    
    // Crear tickets
    const tickets = [
      { title: 'Sin conexión a internet', description: 'Cliente reporta que no tiene acceso a internet desde hace 2 horas.', status: 'open', priority: 'high', category: 'connectivity', clientId: client1.id, createdById: 1, assignedToId: 2 },
      { title: 'Velocidad lenta', description: 'Cliente reporta velocidad de internet muy lenta, especialmente en horas pico.', status: 'inProgress', priority: 'medium', category: 'performance', clientId: client2.id, createdById: 1, assignedToId: 3 },
      { title: 'Cambio de plan', description: 'Cliente solicita cambio de plan básico a estándar.', status: 'inProgress', priority: 'low', category: 'billing', clientId: client6.id, createdById: 1, assignedToId: 2 },
      { title: 'Problemas de facturación', description: 'Cliente indica que no ha recibido la factura del mes actual.', status: 'resolved', priority: 'medium', category: 'billing', clientId: client4.id, createdById: 1, assignedToId: 3, resolvedAt: new Date(Date.now() - 86400000) },
      { title: 'Instalación de nuevo servicio', description: 'Programar visita para instalación de nuevo servicio contratado.', status: 'open', priority: 'medium', category: 'installation', clientId: client7.id, createdById: 1 },
      { title: 'Interferencia en la señal', description: 'Cliente reporta que la señal se pierde intermitentemente.', status: 'open', priority: 'high', category: 'connectivity', clientId: client3.id, createdById: 1, assignedToId: 2 },
      { title: 'Router no enciende', description: 'Cliente reporta que el router no enciende después de un corte de energía.', status: 'closed', priority: 'high', category: 'hardware', clientId: client5.id, createdById: 1, assignedToId: 3, resolvedAt: new Date(Date.now() - 259200000), closedAt: new Date(Date.now() - 172800000) }
    ];
    
    for (const ticket of tickets) {
      const [ticketObj, created] = await db.Ticket.findOrCreate({
        where: { title: ticket.title, clientId: ticket.clientId },
        defaults: ticket
      });
      
      if (created) {
        console.log(`Ticket creado: ${ticket.title}`);
      }
    }
    
    // Crear comentarios en tickets
    const ticket1 = await db.Ticket.findOne({ where: { title: 'Sin conexión a internet' } });
    const ticket2 = await db.Ticket.findOne({ where: { title: 'Velocidad lenta' } });
    const ticket4 = await db.Ticket.findOne({ where: { title: 'Problemas de facturación' } });
    const ticket7 = await db.Ticket.findOne({ where: { title: 'Router no enciende' } });
    
    const comments = [
      { content: 'Se programa visita técnica para el día de mañana a las 10:00 AM.', isInternal: false, ticketId: ticket1.id, userId: 2 },
      { content: 'Cliente no estará disponible en la mañana, reprogramar para la tarde.', isInternal: false, ticketId: ticket1.id, userId: 1 },
      { content: 'Visita reprogramada para las 4:00 PM.', isInternal: true, ticketId: ticket1.id, userId: 2 },
      { content: 'Se realizaron pruebas de velocidad y se detectó congestión en el sector.', isInternal: false, ticketId: ticket2.id, userId: 3 },
      { content: 'Se ajustaron parámetros de QoS para mejorar la velocidad.', isInternal: false, ticketId: ticket2.id, userId: 3 },
      { content: 'Factura enviada nuevamente al correo del cliente.', isInternal: false, ticketId: ticket4.id, userId: 3 },
      { content: 'Cliente confirma recepción de la factura. Se cierra el ticket.', isInternal: false, ticketId: ticket4.id, userId: 1 },
      { content: 'Se realizó visita técnica y se reemplazó el router dañado.', isInternal: false, ticketId: ticket7.id, userId: 3 },
      { content: 'Cliente confirma que el servicio funciona correctamente.', isInternal: false, ticketId: ticket7.id, userId: 1 }
    ];
    
    for (const comment of comments) {
      const [commentObj, created] = await db.TicketComment.create(comment);
      if (created) {
        console.log(`Comentario creado para ticket ID ${comment.ticketId}`);
      }
    }
    
    console.log('Carga de datos iniciales completada.');
    
  } catch (error) {
    console.error('Error en la carga de datos iniciales:', error);
  }
}

// Ejecutar la función
seedData()
  .then(() => {
    console.log('Script finalizado');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el script:', err);
    process.exit(1);
  });