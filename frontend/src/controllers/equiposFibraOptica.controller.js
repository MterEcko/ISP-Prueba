// backend/src/controllers/equiposFibraOpticaController.js
const EquipoFibraOptica = require("../models/equipoFibraOptica.model");
//const DispositivoRed = require("../models/dispositivoRed");

exports.getAllEquiposFibra = async (req, res) => {
  try {
    const { dispositivoId } = req.query; // Filtrar por dispositivo opcionalmente
    const queryOptions = {
      include: [{ model: DispositivoRed, as: "dispositivo", attributes: ["id", "nombre", "ip"] }],
    };
    if (dispositivoId) {
      queryOptions.where = { dispositivo_id: dispositivoId };
    }
    const equipos = await EquipoFibraOptica.findAll(queryOptions);
    res.status(200).json(equipos);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener equipos de fibra óptica", error: error.message });
  }
};

exports.getEquipoFibraById = async (req, res) => {
  try {
    const equipo = await EquipoFibraOptica.findByPk(req.params.id, {
      include: [{ model: DispositivoRed, as: "dispositivo" }]
    });
    if (!equipo) {
      return res.status(404).json({ message: "Equipo de fibra óptica no encontrado" });
    }
    res.status(200).json(equipo);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener equipo de fibra óptica", error: error.message });
  }
};

exports.createEquipoFibra = async (req, res) => {
  try {
    const { dispositivo_id, ...fibraData } = req.body;
    if (!dispositivo_id) {
        return res.status(400).json({ message: "El campo dispositivo_id es obligatorio." });
    }
    const dispositivo = await DispositivoRed.findByPk(dispositivo_id);
    if (!dispositivo) {
      return res.status(404).json({ message: `Dispositivo de red con id ${dispositivo_id} no encontrado.` });
    }
    // Marcar el dispositivo como de fibra óptica si aún no lo está
    if (!dispositivo.es_fibra_optica) {
        await dispositivo.update({ es_fibra_optica: true });
    }

    const nuevoEquipo = await EquipoFibraOptica.create({ dispositivo_id, ...fibraData });
    res.status(201).json(nuevoEquipo);
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError" || error.name === "SequelizeValidationError") {
      return res.status(400).json({ message: "Error de validación o unicidad", errors: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: "Error al crear equipo de fibra óptica", error: error.message });
  }
};

exports.updateEquipoFibra = async (req, res) => {
  try {
    const equipo = await EquipoFibraOptica.findByPk(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "Equipo de fibra óptica no encontrado" });
    }
    // No permitir cambiar el dispositivo_id asociado directamente aquí
    const { dispositivo_id, ...fibraData } = req.body;
    if (dispositivo_id && dispositivo_id !== equipo.dispositivo_id) {
        return res.status(400).json({ message: "No se puede cambiar el dispositivo_id de un equipo de fibra existente. Elimine y cree uno nuevo si es necesario." });
    }

    await equipo.update(fibraData);
    res.status(200).json(equipo);
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ message: "Error de validación al actualizar", errors: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: "Error al actualizar equipo de fibra óptica", error: error.message });
  }
};

exports.deleteEquipoFibra = async (req, res) => {
  try {
    const equipo = await EquipoFibraOptica.findByPk(req.params.id);
    if (!equipo) {
      return res.status(404).json({ message: "Equipo de fibra óptica no encontrado" });
    }
    // Opcional: al eliminar el equipo de fibra, podríamos desmarcar el dispositivo como de fibra si no tiene otros equipos asociados
    // const dispositivo = await DispositivoRed.findByPk(equipo.dispositivo_id);
    // if (dispositivo) {
    //    const otrosEquiposFibra = await EquipoFibraOptica.count({ where: { dispositivo_id: equipo.dispositivo_id, id: { [Op.ne]: equipo.id } } });
    //    if (otrosEquiposFibra === 0) {
    //        await dispositivo.update({ es_fibra_optica: false });
    //    }
    // }
    await equipo.destroy();
    res.status(200).json({ message: "Equipo de fibra óptica eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar equipo de fibra óptica", error: error.message });
  }
};

