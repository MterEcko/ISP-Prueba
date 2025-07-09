const db = require('../models');
const User = db.User;
const Role = db.Role;
const Op = db.Sequelize.Op;

// Crear un nuevo usuario
exports.create = async (req, res) => {
  try {
    // Validar request
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ message: "El nombre de usuario y la contraseña son obligatorios" });
    }
    
    // Verificar si ya existe un usuario con el mismo nombre de usuario
    const existingUser = await User.findOne({
      where: { username: req.body.username }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: "Ya existe un usuario con este nombre de usuario" });
    }
    
    // Verificar rol
    if (req.body.roleId) {
      const role = await Role.findByPk(req.body.roleId);
      if (!role) {
        return res.status(400).json({ message: "El rol seleccionado no existe" });
      }
    }
    
    // Crear usuario (bcrypt será aplicado en el hook beforeCreate del modelo)
    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      fullName: req.body.fullName,
      roleId: req.body.roleId,
      active: req.body.active !== undefined ? req.body.active : true
    });
    
    // No devolver la contraseña en la respuesta
    const { password, ...userWithoutPassword } = user.toJSON();
    
    return res.status(201).json({ 
      message: "Usuario creado exitosamente", 
      user: userWithoutPassword 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener todos los usuarios con paginación y filtros
exports.findAll = async (req, res) => {
  try {
    const { page = 1, size = 10, username, email, active, roleId, role } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    // Construir condiciones de filtrado
    const condition = {};
    if (username) condition.username = { [Op.Like]: `%${username}%` };
    if (email) condition.email = { [Op.Like]: `%${email}%` };
    if (active !== undefined) condition.active = active === 'true';
    
    // Condiciones para rol
    const includeRole = {
      model: Role,
      attributes: ['id', 'name', 'description', 'category']
    };
    
    if (roleId) {
      condition.roleId = roleId;
    } else if (role) {
      includeRole.where = { name: role };
    }

    // Obtener usuarios
    const { count, rows: users } = await User.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [includeRole],
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] } // No incluir contraseñas en la respuesta
    });

    return res.status(200).json({
      totalItems: count,
      users,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error("Error en findAll de usuarios:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Obtener usuario por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const user = await User.findByPk(id, {
      include: [
        {
          model: Role,
          attributes: ['id', 'name', 'description', 'category']
        }
      ],
      attributes: { exclude: ['password'] } // No incluir contraseña en la respuesta
    });

    if (!user) {
      return res.status(404).json({ message: `Usuario con ID ${id} no encontrado` });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar usuario
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar que el usuario exista
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: `Usuario con ID ${id} no encontrado` });
    }
    
    // No permitir cambiar el nombre de usuario del admin
    if (user.username === 'admin' && req.body.username && req.body.username !== 'admin') {
      return res.status(403).json({ message: "No se puede cambiar el nombre de usuario del administrador" });
    }
    
    // Verificar rol
    if (req.body.roleId) {
      const role = await Role.findByPk(req.body.roleId);
      if (!role) {
        return res.status(400).json({ message: "El rol seleccionado no existe" });
      }
    }
    
    // Preparar datos para actualizar (bcrypt será aplicado en el hook beforeUpdate del modelo)
    const userData = { ...req.body };
    
    // Si la contraseña está vacía, eliminarla para no actualizarla
    if (userData.password === '') {
      delete userData.password;
    }
    
    const [updated] = await User.update(userData, {
      where: { id: id },
      individualHooks: true // Para asegurar que se ejecuten los hooks beforeUpdate
    });

    if (updated === 0) {
      return res.status(404).json({ message: `Usuario con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Usuario actualizado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Cambiar estado de usuario (activar/desactivar)
exports.changeStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { active } = req.body;
    
    if (active === undefined) {
      return res.status(400).json({ message: "El estado 'active' es requerido" });
    }
    
    // Verificar que el usuario exista
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: `Usuario con ID ${id} no encontrado` });
    }
    
    // No permitir desactivar al usuario admin
    if (user.username === 'admin' && !active) {
      return res.status(403).json({ message: "No se puede desactivar al usuario administrador" });
    }
    
    const [updated] = await User.update(
      { active: active },
      { where: { id: id } }
    );

    if (updated === 0) {
      return res.status(404).json({ message: `Usuario con ID ${id} no encontrado` });
    }

    const message = active ? "Usuario activado exitosamente" : "Usuario desactivado exitosamente";
    return res.status(200).json({ message });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Eliminar usuario
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Verificar que el usuario exista
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: `Usuario con ID ${id} no encontrado` });
    }
    
    // No permitir eliminar al usuario admin
    if (user.username === 'admin') {
      return res.status(403).json({ message: "No se puede eliminar al usuario administrador" });
    }
    
    const deleted = await User.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: `Usuario con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Cambiar rol de usuario
exports.changeRole = async (req, res) => {
  try {
    const id = req.params.id;
    const { roleId } = req.body;
    
    if (!roleId) {
      return res.status(400).json({ message: "El ID del rol es requerido" });
    }
    
    // Verificar que el usuario exista
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: `Usuario con ID ${id} no encontrado` });
    }
    
    // Verificar que el rol exista
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ message: `Rol con ID ${roleId} no encontrado` });
    }
    
    // No permitir cambiar el rol del usuario admin
    if (user.username === 'admin') {
      return res.status(403).json({ message: "No se puede cambiar el rol del usuario administrador" });
    }
    
    const [updated] = await User.update(
      { roleId: roleId },
      { where: { id: id } }
    );

    if (updated === 0) {
      return res.status(404).json({ message: `Usuario con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Rol del usuario actualizado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener perfil del usuario actual
exports.getCurrentProfile = async (req, res) => {
  try {
    const userId = req.userId; // Obtenido del token JWT
    
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          attributes: ['id', 'name', 'description', 'category']
        }
      ],
      attributes: { exclude: ['password'] } // No incluir contraseña
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Cambiar contraseña
exports.changePassword = async (req, res) => {
  try {
    const id = req.params.id;
    const { oldPassword, newPassword } = req.body;
    
    // Verificar que el usuario exista
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: `Usuario con ID ${id} no encontrado` });
    }
    
    // Verificar que el usuario sea el mismo que está autenticado
    // o que sea un administrador
    if (req.userId != id) {
      // Verificar si es administrador
      const requestingUser = await User.findByPk(req.userId, {
        include: [{ model: Role }]
      });
      
      if (!requestingUser || requestingUser.Role.name !== 'admin') {
        return res.status(403).json({ 
          message: "No tiene permisos para cambiar la contraseña de otro usuario" 
        });
      }
    }
    
    // Verificar contraseña actual usando el método del modelo
    const passwordIsValid = await user.validatePassword(oldPassword);
    if (!passwordIsValid) {
      return res.status(401).json({ message: "Contraseña actual incorrecta" });
    }
    
    // Actualizar contraseña (bcrypt será aplicado en el hook beforeUpdate)
    await User.update(
      { password: newPassword },
      { 
        where: { id: id },
        individualHooks: true
      }
    );
    
    return res.status(200).json({ message: "Contraseña actualizada exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};