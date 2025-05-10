const db = require('../models');
const Node = db.Node;
const Sector = db.Sector;
const Client = db.Client;
const Op = db.Sequelize.Op;

// NODOS
// -----

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
      active: req.body.active !== undefined ? req.body.active : true
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
    if (name) condition.name = { [Op.iLike]: `%${name}%` };
    if (active !== undefined) condition.active = active === 'true';

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

    return res.status(200).json(nodes);
  } catch (error) {
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

// Obtener todos los sectores
exports.findAllSectors = async (req, res) => {
  try {
    const { name, nodeId, active } = req.query;
    
    // Construir condiciones de filtrado
    const condition = {};
    if (name) condition.name = { [Op.iLike]: `%${name}%` };
    if (nodeId) condition.nodeId = nodeId;
    if (active !== undefined) condition.active = active === 'true';

    const sectors = await Sector.findAll({
      where: condition,
      include: [
        {
          model: Node,
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']]
    });

    return res.status(200).json(sectors);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener sector por ID
exports.findSectorById = async (req, res) => {
  try {
    const id = req.params.id;
    
    const sector = await Sector.findByPk(id, {
      include: [
        {
          model: Node,
          attributes: ['id', 'name']
        },
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'active']
        }
      ]
    });

    if (!sector) {
      return res.status(404).json({ message: `Sector con ID ${id} no encontrado` });
    }

    return res.status(200).json(sector);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar sector
exports.updateSector = async (req, res) => {
  try {
    const id = req.params.id;
    
    const [updated] = await Sector.update(req.body, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({ message: `Sector con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Sector actualizado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
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
        message: "No se puede eliminar el sector porque tiene clientes asociados"
      });
    }
    
    const deleted = await Sector.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: `Sector con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Sector eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};