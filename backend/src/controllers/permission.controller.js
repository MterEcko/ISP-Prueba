const db = require('../models');
const Permission = db.Permission;

// Obtener todos los permisos
exports.findAll = async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      order: [['module', 'ASC'], ['name', 'ASC']]
    });
    return res.status(200).json(permissions);
  } catch (error) {
    console.error("Error en findAll de permisos:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener permiso por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const permission = await Permission.findByPk(id);
    if (!permission) {
      return res.status(404).json({ message: `Permiso con ID ${id} no encontrado` });
    }
    
    return res.status(200).json(permission);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Crear nuevo permiso
exports.create = async (req, res) => {
  try {
    // Validar request
    if (!req.body.name || !req.body.module) {
      return res.status(400).json({ message: "El nombre y el módulo son obligatorios" });
    }
    
    // Verificar si ya existe un permiso con el mismo nombre
    const existingPermission = await Permission.findOne({
      where: { name: req.body.name }
    });
    
    if (existingPermission) {
      return res.status(400).json({ message: "Ya existe un permiso con este nombre" });
    }
    
    // Crear permiso
    const permission = await Permission.create({
      name: req.body.name,
      description: req.body.description || req.body.name,
      module: req.body.module
    });
    
    return res.status(201).json({ message: "Permiso creado exitosamente", permission });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar permiso
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    const [updated] = await Permission.update(req.body, {
      where: { id: id }
    });
    
    if (updated === 0) {
      return res.status(404).json({ message: `Permiso con ID ${id} no encontrado` });
    }
    
    return res.status(200).json({ message: "Permiso actualizado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Eliminar permiso
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    const deleted = await Permission.destroy({
      where: { id: id }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: `Permiso con ID ${id} no encontrado` });
    }
    
    return res.status(200).json({ message: "Permiso eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};