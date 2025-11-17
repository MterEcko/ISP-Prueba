// backend/src/jobs/segmentation.job.js
// Job automático para mover clientes a segmentos según su estado de pago

const cron = require('node-cron');
const ClientSegmentationService = require('../services/client.segmentation.service');
const logger = require('../config/logger');

// Ejecutar todos los días a las 2:00 AM
const scheduleSegmentationJob = () => {
  cron.schedule('0 2 * * *', async () => {
    logger.info('⏰ Iniciando job de segmentación automática...');

    try {
      const result = await ClientSegmentationService.processAutoSegmentation();

      logger.info(`✅ Job de segmentación completado: ${result.moved} clientes movidos de ${result.processed} procesados`);

    } catch (error) {
      logger.error('❌ Error en job de segmentación:', error);
    }
  });

  logger.info('✅ Job de segmentación automática programado (diario a las 2:00 AM)');
};

module.exports = { scheduleSegmentationJob };
