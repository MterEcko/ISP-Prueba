const db = require('../models');
const Client = db.Client;
const ClientDocument = db.ClientDocument;
const Sector = db.Sector;
const Service = db.Service;
const Subscription = db.Subscription;
const Op = db.Sequelize.Op;

// Crear un nuevo cliente
exports.create = async (req, res) => {
  try {
    // Validar request
    if (!req.body.firstName || !req.body.lastName) {
      return res.status(400).json({ message: "El nombre y apellido son obligatorios" });
    }

    // Crear cliente
    const client = await Client.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      whatsapp: req.body.whatsapp,
      address: req.body.address,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      birthDate: req.body.birthDate,
      startDate: req.body.startDate || new Date(),
      active: req.body.active !== undefined ? req.body.active : true,
      notes: req.body.notes,
      sectorId: req.body.sectorId
    });

    return res.status(201).json({ message: "Cliente creado exitosamente", client });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener todos los clientes con paginación y filtros
exports.findAll = async (req, res) => {
  try {
    const { page = 1, size = 10, name, email, phone, active, sectorId } = req.query;
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    // Construir condiciones de filtrado
    const condition = {};
    if (name) {
      condition[Op.or] = [
        { firstName: { [Op.iLike]: `%${name}%` } },
        { lastName: { [Op.iLike]: `%${name}%` } }
      ];
    }
    if (email) condition.email = { [Op.iLike]: `%${email}%` };
    if (phone) condition.phone = { [Op.iLike]: `%${phone}%` };
    if (active !== undefined) condition.active = active === 'true';
    if (sectorId) condition.sectorId = sectorId;

    // Obtener clientes
    const { count, rows: clients } = await Client.findAndCountAll({
      where: condition,
      limit,
      offset,
      include: [
        {
          model: Sector,
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      totalItems: count,
      clients,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Obtener cliente por ID
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const client = await Client.findByPk(id, {
      include: [
        {
          model: Sector,
          attributes: ['id', 'name']
        },
        {
          model: ClientDocument,
          attributes: ['id', 'type', 'filename', 'uploadDate', 'description']
        },
        {
          model: Service,
          through: { 
            model: Subscription,
            attributes: ['id', 'startDate', 'endDate', 'status', 'ipAddress', 'username']
          }
        }
      ]
    });

    if (!client) {
      return res.status(404).json({ message: `Cliente con ID ${id} no encontrado` });
    }

    return res.status(200).json(client);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Actualizar cliente
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    const [updated] = await Client.update(req.body, {
      where: { id: id }
    });

    if (updated === 0) {
      return res.status(404).json({ message: `Cliente con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Cliente actualizado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Cambiar estado de cliente (activar/desactivar)
exports.changeStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { active } = req.body;
    
    if (active === undefined) {
      return res.status(400).json({ message: "El estado 'active' es requerido" });
    }
    
    const [updated] = await Client.update(
      { active: active },
      { where: { id: id } }
    );

    if (updated === 0) {
      return res.status(404).json({ message: `Cliente con ID ${id} no encontrado` });
    }

    const message = active ? "Cliente activado exitosamente" : "Cliente desactivado exitosamente";
    return res.status(200).json({ message });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Eliminar cliente
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    const deleted = await Client.destroy({
      where: { id: id }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: `Cliente con ID ${id} no encontrado` });
    }

    return res.status(200).json({ message: "Cliente eliminado exitosamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};