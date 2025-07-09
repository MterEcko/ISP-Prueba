// backend/src/utils/initialData.js
const db = require('../models');

async function createInitialData() {
  try {
    // Verificar si existen nodos
    const nodeCount = await db.Node.count();
    if (nodeCount === 0) {
      // Crear nodos
      const nodes = await db.Node.bulkCreate([
        { name: 'Nodo Principal', location: 'Centro', latitude: 19.4326, longitude: -99.1332, active: true },
        { name: 'Nodo Norte', location: 'Zona Norte', latitude: 19.4526, longitude: -99.1232, active: true }
      ]);
      console.log('Nodos creados');
      
      // Crear sectores para los nodos
      await db.Sector.bulkCreate([
        { name: 'Sector 1', nodeId: nodes[0].id, active: true },
        { name: 'Sector 2', nodeId: nodes[0].id, active: true },
        { name: 'Sector Norte 1', nodeId: nodes[1].id, active: true }
      ]);
      console.log('Sectores creados');
    }
    
    // Verificar si existen servicios
    const serviceCount = await db.Service.count();
    if (serviceCount === 0) {
      // Crear servicios
      await db.Service.bulkCreate([
        { name: 'Plan Básico', downloadSpeed: 10, uploadSpeed: 2, price: 299.99, description: 'Servicio básico de internet', hasJellyfin: false, active: true },
        { name: 'Plan Estándar', downloadSpeed: 20, uploadSpeed: 5, price: 399.99, description: 'Servicio estándar de internet', hasJellyfin: false, active: true },
        { name: 'Plan Premium', downloadSpeed: 50, uploadSpeed: 10, price: 599.99, description: 'Servicio premium de internet', hasJellyfin: true, active: true }
      ]);
      console.log('Servicios creados');
    }
    
    // Verificar si existen clientes
    const clientCount = await db.Client.count();
    if (clientCount === 0) {
      // Obtener sectores para asignar a clientes
      const sectors = await db.Sector.findAll();
      
      if (sectors.length > 0) {
        // Crear clientes
        const clients = await db.Client.bulkCreate([
          { firstName: 'Juan', lastName: 'Pérez', email: 'juan@example.com', phone: '555-1234', sectorId: sectors[0].id, active: true },
          { firstName: 'María', lastName: 'González', email: 'maria@example.com', phone: '555-5678', sectorId: sectors[0].id, active: true },
          { firstName: 'Carlos', lastName: 'Rodríguez', email: 'carlos@example.com', phone: '555-9012', sectorId: sectors[1].id, active: true }
        ]);
        console.log('Clientes creados');
        
        // Crear tickets para los clientes
        const users = await db.User.findAll();
        if (users.length > 0) {
          await db.Ticket.bulkCreate([
            { 
              title: 'Sin conexión a internet', 
              description: 'Cliente reporta que no tiene acceso a internet desde hace 2 horas.', 
              clientId: clients[0].id, 
              status: 'open', 
              priority: 'high', 
              createdById: users[0].id 
            },
            { 
              title: 'Velocidad lenta', 
              description: 'Cliente reporta velocidad de internet muy lenta, especialmente en horas pico.', 
              clientId: clients[1].id, 
              status: 'inProgress', 
              priority: 'medium', 
              createdById: users[0].id 
            }
          ]);
          console.log('Tickets creados');
        }
      }
    }
    
    console.log('Datos iniciales creados exitosamente');
    return { success: true, message: 'Datos iniciales creados exitosamente' };
  } catch (error) {
    console.error('Error al crear datos iniciales:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { createInitialData };