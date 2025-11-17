const db = require('../models');
const logger = require('../config/logger');
const { RemoteCommand, Installation } = db;

exports.sendCommand = async (req, res) => {
  try {
    const { installationKey, command, parameters, issuedBy } = req.body;

    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) return res.status(404).json({ success: false, message: 'Instalación no encontrada' });

    const remoteCommand = await RemoteCommand.create({
      installationId: installation.id,
      command,
      parameters,
      issuedBy,
      status: 'pending'
    });

    logger.info(`Comando remoto enviado: ${command} para ${installationKey}`);

    res.json({ success: true, data: remoteCommand });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingCommands = async (req, res) => {
  try {
    const { installationKey } = req.params;

    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) return res.status(404).json({ success: false, message: 'Instalación no encontrada' });

    const commands = await RemoteCommand.findAll({
      where: {
        installationId: installation.id,
        status: 'pending'
      },
      order: [['createdAt', 'ASC']]
    });

    await RemoteCommand.update(
      { status: 'sent', sentAt: new Date() },
      { where: { id: commands.map(c => c.id) } }
    );

    res.json({ success: true, data: commands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCommandResponse = async (req, res) => {
  try {
    const { commandId } = req.params;
    const { success, response, error } = req.body;

    const command = await RemoteCommand.findByPk(commandId);
    if (!command) return res.status(404).json({ success: false, message: 'Comando no encontrado' });

    command.status = success ? 'executed' : 'failed';
    command.executedAt = new Date();
    command.response = response;
    command.error = error;
    await command.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
