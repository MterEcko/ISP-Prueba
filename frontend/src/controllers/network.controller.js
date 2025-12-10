const db = require('../models');
const Zone = db.Zone;
const Node = db.Node;
const Sector = db.Sector;
const Client = db.Client;
const Device = db.Device; // [IMPORT] Añade el modelo Device
const Op = db.Sequelize.Op;

// ZONAS
// -----

// Crear zona
exports.createZone = async (req, res) => {
  try {
    // Validar request
    if (!req.body.name) {
      return res.status(400).json({ message: "El nombre de la zona es obligatorio" });
    }

    // Crear zona
    const zone = await Zone.create({
      name: req.body.name,
      description: req.body.description,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      active: req.body.active !== undefined ? req.body.active : true
    });

    return res.status(201).json({ message: "Zona creada exitosamente", data: zone });


  } catch (error) {
    console.error("Error al crear zona:", error);
    return res.status(500).json({ message: error.message });

  }
};

// Obtener todas las zonas
exports.findAllZones = async (req, res) => {
  try {
    const { name, active } = req.query;
    
    // Construir condiciones de filtrado
    const condition = {};
    if (name) condition.name = { [Op.Like]: `%${name}%` };
    if (active !== undefined) condition.active = active === 'true';

    console.log("Buscando zones con condición:", condition);

    const zones = await Zone.findAll({
      where: condition,
      include: [
        {
          model: Node,
          attributes: ['id', 'name'],
          include: [
            {
               model: Sector,
               attributes: ['id', 'name'],
               include: [
                {
                  model: Client,
                  attributes: ['id', 'firstName', 'lastName']
                }
               ]
            }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });

    console.log(`Se encontraron ${zones.length} zones`);

    return res.status(200).json(zones);
  } catch (error) {
    console.error("Error al obtener zonas:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener zona por ID
exports.findZoneById = async (req, res) => {
  try {
    const id = req.params.id;
    
    const zone = await Zone.findByPk(id, {
      include: [
        {
          model: Node,
          include: [
            {
              model: Sector,
              attributes: ['id', 'name', 'active']
            }
          ]
        }
      ]
    });

    if (!zone) {
      return res.status(404).json({ message: `Zona con ID ${id} no encontrada`});
    }

    return res.status(200).json(zone);
  } catch (error) {
    
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar zona
exports.updateZone = async (req, res) => {
  try {
    const id = req.params.id;
    
    const [updated] = await Zone.update(req.body, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({ 
        success: false,
        message: `Zona con ID ${id} no encontrada` 
      });
    }

    return res.status(200).json({ 
      message: "Zona actualizada exitosamente" 
    });
  } catch (error) {
    console.error(`Error al actualizar zona con ID ${req.params.id}:`, error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Eliminar zona
exports.deleteZone = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar si tiene nodos asociados
    const nodeCount = await Node.count({ where: { zoneId: id } });
    if (nodeCount > 0) {
      return res.status(400).json({ 
        message: "No se puede eliminar la zona porque tiene nodos asociados"
      });
    }
    
    const deleted = await Zone.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: `Zona con ID ${id} no encontrada` });
    }

    return res.status(200).json({ message: "Zona eliminada exitosamente" });
  } catch (error) {
    //console.error(`Error al eliminar zona con ID ${req.params.id}:`, error);
    return res.status(500).json({ message: error.message });
  }
};

// NODOS
// -----
// Obtener nodo por zonas

exports.findNodesByZone = async (req, res) => {
  try {
    const zoneId = req.params.id;
    
    // [VERIFICAR ZONA] Asegura que la zona existe
    const zone = await Zone.findByPk(zoneId);
    if (!zone) {
      return res.status(404).json({ 
        success: false,
        message: `Zona con ID ${zoneId} no encontrada` 
      });
    }
    
    // [OBTENER NODOS] Busca todos los nodos de la zona
    const nodes = await Node.findAll({
      where: { zoneId: zoneId },
      order: [['name', 'ASC']]
    });

    // [CALCULAR ESTADÍSTICAS] Añade sectors_count, clients_count, devices_count
    const formattedNodes = await Promise.all(nodes.map(async (node) => {
      // Contar sectores del nodo
      const sectorsCount = await Sector.count({
        where: { nodeId: node.id }
      });
      // Obtener IDs de sectores
      const sectors = await Sector.findAll({
        where: { nodeId: node.id },
        attributes: ['id']
      });
      const sectorIds = sectors.map(sector => sector.id);
      // Contar clientes de los sectores
      const clientsCount = sectorIds.length > 0 ? await Client.count({
        where: { sectorId: { [Op.in]: sectorIds } }
      }) : 0;
      // Contar dispositivos por nodeId y sectorId
      const devicesCountByNode = await Device.count({
        where: { nodeId: node.id }
      });
      const devicesCountBySector = sectorIds.length > 0 ? await Device.count({
        where: { sectorId: { [Op.in]: sectorIds } }
      }) : 0;
      
      return {
        id: node.id,
        zoneId: node.zoneId,
        name: node.name,
        location: node.location,
        latitude: node.latitude,
        longitude: node.longitude,
        description: node.description,
        node_type: node.node_type || 'Principal', // [FALLBACK] Valor por defecto si null
        active: node.active,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        sectors_count: sectorsCount, // [ESTADÍSTICA] Número de sectores
        clients_count: clientsCount, // [ESTADÍSTICA] Número de clientes
        devices_count: devicesCountByNode + devicesCountBySector // [ESTADÍSTICA] Número de dispositivos
      };
    }));

    return res.status(200).json({
      success: true,
      data: formattedNodes
    });
  } catch (error) {
    console.error(`Error al obtener nodos de la zona con ID ${req.params.id}:`, error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Crear nodo
exports.createNode = async (req, res) => {
  try {
    // Validar request
    if (!req.body.name) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    // Crear nodo
    const node = await Node.create({
      name: req.body.name,
      location: req.body.location,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      description: req.body.description,
      active: req.body.active !== undefined ? req.body.active : true,
	  zoneId: req.body.zoneId
    });

    return res.status(201).json({ message: "Nodo creado exitosamente", node });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener todos los nodos
exports.findAllNodes = async (req, res) => {
  try {
    const { name, active } = req.query;
    
    // Construir condiciones de filtrado
    const condition = {};
    if (name) condition.name = { [Op.Like]: `%${name}%` };
    if (active !== undefined) condition.active = active === 'true';
	
	console.log("Buscando nodos con condición:", condition);

    const nodes = await Node.findAll({
      where: condition,
      include: [
        {
          model: Sector,
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']]
    });
	
	console.log(`Se encontraron ${nodes.length} nodos`);

    return res.status(200).json(nodes);
  } catch (error) {
	console.error("Error en findAllNodes:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener nodo por ID
exports.findNodeById = async (req, res) => {
  try {
    const id = req.params.id;
    
    const node = await Node.findByPk(id, {
      include: [
        {
          model: Sector,
          include: [
            {
              model: Client,
              attributes: ['id', 'firstName', 'lastName', 'active']
            }
          ]
        }
      ]
    });

    if (!node) {
      return res.status(404).json({ message: `Nodo con ID ${id} no encontrado` });
    }

    return res.status(200).json(node);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar nodo
exports.updateNode = async (req, res) => {
  try {
    const id = req.params.id;
    
    const [updated] = await Node.update(req.body, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({ message: `Nodo con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Nodo actualizado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Eliminar nodo
exports.deleteNode = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar si tiene sectores asociados
    const sectorCount = await Sector.count({ where: { nodeId: id } });
    if (sectorCount > 0) {
      return res.status(400).json({ 
        message: "No se puede eliminar el nodo porque tiene sectores asociados"
      });
    }
    
    const deleted = await Node.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: `Nodo con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Nodo eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// SECTORES
// --------
// Obtener sectores por nodo
exports.findSectorsByNode = async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    
    // Verificar que el nodo existe
    const node = await Node.findByPk(nodeId);
    if (!node) {
      return res.status(404).json({ 
        success: false,
        message: `Nodo con ID ${nodeId} no encontrado` 
      });
    }
    
    const sectors = await Sector.findAll({
      where: { nodeId: nodeId },
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'active']
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: sectors
    });
  } catch (error) {
    console.error(`Error al obtener sectores del nodo con ID ${req.params.nodeId}:`, error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Crear sector
exports.createSector = async (req, res) => {
  try {
    // Validar request
    if (!req.body.name || !req.body.nodeId) {
      return res.status(400).json({ message: "El nombre y el ID del nodo son obligatorios" });
    }

    // Verificar que el nodo existe
    const node = await Node.findByPk(req.body.nodeId);
    if (!node) {
      return res.status(404).json({ message: `Nodo con ID ${req.body.nodeId} no encontrado` });
    }

    // Crear sector
    const sector = await Sector.create({
      name: req.body.name,
      description: req.body.description,
      frequency: req.body.frequency,
      azimuth: req.body.azimuth,
      polarization: req.body.polarization,
      active: req.body.active !== undefined ? req.body.active : true,
      nodeId: req.body.nodeId
    });

    return res.status(201).json({ message: "Sector creado exitosamente", sector });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener todos los nodos
exports.findAllSector = async (req, res) => {
  try {
    const { name, active } = req.query;
    
    // Construir condiciones de filtrado
    const condition = {};
    if (name) condition.name = { [Op.Like]: `%${name}%` };
    if (active !== undefined) condition.active = active === 'true';
	
	console.log("Buscando nodos con condición:", condition);

    const sector = await Sector.findAll({
      where: condition,
      order: [['name', 'ASC']]
    });
	
	console.log(`Se encontraron ${sector.length} nodos`);

    return res.status(200).json(sector);
  } catch (error) {
	console.error("Error en findAllNodes:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar sector
exports.updateSector = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar que el nodo existe si se proporciona nodeId
    if (req.body.nodeId) {
      const node = await Node.findByPk(req.body.nodeId);
      if (!node) {
        return res.status(404).json({ 
          success: false,
          message: `Nodo con ID ${req.body.nodeId} no encontrado` 
        });
      }
    }
    
    const [updated] = await Sector.update(req.body, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({ 
        success: false,
        message: `Sector con ID ${id} no encontrado` 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: "Sector actualizado exitosamente" 
    });
  } catch (error) {
    console.error(`Error al actualizar sector con ID ${req.params.id}:`, error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Eliminar sector
exports.deleteSector = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar si tiene clientes asociados
    const clientCount = await Client.count({ where: { sectorId: id } });
    if (clientCount > 0) {
      return res.status(400).json({ 
        success: false,
        message: "No se puede eliminar el sector porque tiene clientes asociados"
      });
    }
    
    const deleted = await Sector.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ 
        success: false,
        message: `Sector con ID ${id} no encontrado` 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: "Sector eliminado exitosamente" 
    });
  } catch (error) {
    console.error(`Error al eliminar sector con ID ${req.params.id}:`, error);
    return res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};


