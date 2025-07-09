const db = require('../models');
const Role = db.Role;
const Permission = db.Permission;
const Op = db.Sequelize.Op;

// Obtener todos los roles
exports.findAll = async (req, res) => {
  try {
    const roles = await Role.findAll({
      order: [['level', 'DESC']]
    });
    return res.status(200).json(roles);
  } catch (error) {
    console.error("Error en findAll de roles:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener rol por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ message: `Rol con ID ${id} no encontrado` });
    }
    
    return res.status(200).json(role);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Crear nuevo rol
exports.create = async (req, res) => {
  try {
    // Validar request
    if (!req.body.name || !req.body.description) {
      return res.status(400).json({ message: "El nombre y la descripción son obligatorios" });
    }
    
    // Verificar si ya existe un rol con el mismo nombre
    const existingRole = await Role.findOne({
      where: { name: req.body.name }
    });
    
    if (existingRole) {
      return res.status(400).json({ message: "Ya existe un rol con este nombre" });
    }
    
    // Crear rol
    const role = await Role.create({
      name: req.body.name,
      description: req.body.description,
      level: req.body.level || 1,
      category: req.body.category || 'general'
    });
    
    return res.status(201).json({ message: "Rol creado exitosamente", role });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar rol
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Validar que no estemos intentando modificar el rol de admin
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ message: `Rol con ID ${id} no encontrado` });
    }
    
    if (role.name === 'admin' && req.body.name !== 'admin') {
      return res.status(403).json({ message: "No se puede modificar el nombre del rol admin" });
    }
    
    const [updated] = await Role.update(req.body, {
      where: { id: id }
    });
    
    if (updated === 0) {
      return res.status(404).json({ message: `Rol con ID ${id} no encontrado` });
    }
    
    return res.status(200).json({ message: "Rol actualizado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Eliminar rol
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar que no estemos intentando eliminar el rol de admin
    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ message: `Rol con ID ${id} no encontrado` });
    }
    
    if (role.name === 'admin') {
      return res.status(403).json({ message: "No se puede eliminar el rol de administrador" });
    }
    
    const deleted = await Role.destroy({
      where: { id: id }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ message: `Rol con ID ${id} no encontrado` });
    }
    
    return res.status(200).json({ message: "Rol eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener permisos asociados a un rol
exports.getPermissions = async (req, res) => {
  try {
    const roleId = req.params.id;
    
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ message: `Rol con ID ${roleId} no encontrado` });
    }
    
    const permissions = await role.getPermissions();
    return res.status(200).json(permissions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar permisos de un rol
exports.updatePermissions = async (req, res) => {
  try {
    const roleId = req.params.id;
    const { permissionIds } = req.body;
    
    // Validar el formato del cuerpo de la solicitud
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ message: "El formato de la solicitud es incorrecto. Se esperaba un array de IDs de permisos." });
    }
    
    // Verificar que el rol exista
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ message: `Rol con ID ${roleId} no encontrado` });
    }
    
    // No permitir modificar los permisos del rol admin
    if (role.name === 'admin') {
      return res.status(403).json({ message: "No se pueden modificar los permisos del rol de administrador" });
    }
    
    // Verificar que todos los permisos existan
    const permissions = await Permission.findAll({
      where: {
        id: { [Op.in]: permissionIds }
      }
    });
    
    if (permissions.length !== permissionIds.length) {
      return res.status(400).json({ message: "Uno o más permisos no existen" });
    }
    
    // Actualizar permisos
    await role.setPermissions(permissions);
    
    return res.status(200).json({ message: "Permisos actualizados exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};