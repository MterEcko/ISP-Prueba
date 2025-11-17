// backend/src/controllers/setup.controller.js
// Controlador para el wizard de configuración inicial del sistema

const db = require('../models');
const fs = require('fs').promises;
const path = require('path');

exports.getSetupStatus = async (req, res) => {
  try {
    // Verificar si el sistema ya ha sido configurado
    const setupComplete = await db.SystemConfiguration.findOne({
      where: { configKey: 'setup_completed' }
    });

    if (setupComplete && setupComplete.value === 'true') {
      return res.status(200).json({
        setupCompleted: true,
        message: 'El sistema ya ha sido configurado'
      });
    }

    // Verificar qué pasos faltan
    const configurations = await db.SystemConfiguration.findAll();
    const configMap = {};
    configurations.forEach(config => {
      configMap[config.configKey] = config.configValue;
    });

    const setupSteps = {
      company: {
        completed: !!(configMap['company_name'] && configMap['company_email']),
        data: {
          company_name: configMap['company_name'] || null,
          company_email: configMap['company_email'] || null,
          company_phone: configMap['company_phone'] || null,
          company_address: configMap['company_address'] || null
        }
      },
      logo: {
        completed: !!configMap['company_logo'],
        data: {
          logo_url: configMap['company_logo'] || null
        }
      },
      segmentation: {
        completed: !!configMap['client_segmentation_enabled'],
        data: {
          enabled: configMap['client_segmentation_enabled'] === 'true',
          segments: configMap['client_segments'] ? JSON.parse(configMap['client_segments']) : []
        }
      },
      webhooks: {
        completed: !!configMap['webhooks_configured'],
        data: {
          n8n_url: configMap['n8n_webhook_url'] || null,
          enabled: configMap['webhooks_enabled'] === 'true'
        }
      },
      payment: {
        completed: !!configMap['payment_gateways_configured'],
        data: {
          gateways: configMap['payment_gateways'] ? JSON.parse(configMap['payment_gateways']) : []
        }
      },
      mikrotik: {
        completed: !!configMap['mikrotik_configured'],
        data: {
          mock_mode: configMap['mikrotik_mock_mode'] === 'true',
          routers: configMap['mikrotik_routers_count'] || 0
        }
      }
    };

    return res.status(200).json({
      setupCompleted: false,
      steps: setupSteps,
      progress: calculateProgress(setupSteps)
    });

  } catch (error) {
    console.error('Error obteniendo estado de configuración:', error);
    return res.status(500).json({
      message: 'Error obteniendo estado de configuración',
      error: error.message
    });
  }
};

exports.saveCompanyInfo = async (req, res) => {
  try {
    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      fiscalInfo
    } = req.body;

    if (!companyName || !companyEmail) {
      return res.status(400).json({
        message: 'Nombre y email de la empresa son requeridos'
      });
    }

    // Guardar configuraciones
    await saveConfig('company_name', companyName);
    await saveConfig('company_email', companyEmail);
    await saveConfig('company_phone', companyPhone || '');
    await saveConfig('company_address', companyAddress || '');

    if (fiscalInfo) {
      await saveConfig('company_fiscal_info', JSON.stringify(fiscalInfo));
    }

    return res.status(200).json({
      message: 'Información de la empresa guardada correctamente',
      step: 'company',
      completed: true
    });

  } catch (error) {
    console.error('Error guardando información de empresa:', error);
    return res.status(500).json({
      message: 'Error guardando información',
      error: error.message
    });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó ningún archivo' });
    }

    const logoPath = `/uploads/logo/${req.file.filename}`;

    // Guardar ruta del logo en configuración
    await saveConfig('company_logo', logoPath);

    // Copiar también a frontend assets (opcional)
    const frontendLogoPath = path.join(__dirname, '../../../frontend/src/assets/logo.png');
    try {
      await fs.copyFile(req.file.path, frontendLogoPath);
    } catch (err) {
      console.warn('No se pudo copiar logo a frontend assets:', err.message);
    }

    return res.status(200).json({
      message: 'Logo subido correctamente',
      logoPath: logoPath,
      step: 'logo',
      completed: true
    });

  } catch (error) {
    console.error('Error subiendo logo:', error);
    return res.status(500).json({
      message: 'Error subiendo logo',
      error: error.message
    });
  }
};

exports.configureSegmentation = async (req, res) => {
  try {
    const { enabled, segments } = req.body;

    // segments es un array de objetos:
    // [{ name: 'Activo', color: '#4CAF50', autoMove: false },
    //  { name: 'Moroso', color: '#f44336', autoMove: true, daysOverdue: 5 }]

    if (!Array.isArray(segments)) {
      return res.status(400).json({
        message: 'Los segmentos deben ser un array'
      });
    }

    await saveConfig('client_segmentation_enabled', enabled ? 'true' : 'false');
    await saveConfig('client_segments', JSON.stringify(segments));

    // Si hay segmentos con autoMove, crear jobs automáticos
    const autoMoveSegments = segments.filter(s => s.autoMove);
    if (autoMoveSegments.length > 0) {
      await saveConfig('auto_move_segments', JSON.stringify(autoMoveSegments));
    }

    return res.status(200).json({
      message: 'Segmentación configurada correctamente',
      step: 'segmentation',
      completed: true,
      segments: segments
    });

  } catch (error) {
    console.error('Error configurando segmentación:', error);
    return res.status(500).json({
      message: 'Error configurando segmentación',
      error: error.message
    });
  }
};

exports.configureWebhooks = async (req, res) => {
  try {
    const { enabled, n8nUrl, triggers } = req.body;

    // triggers es un array de eventos que disparan webhooks:
    // ['client_created', 'payment_received', 'service_suspended', etc.]

    if (enabled && !n8nUrl) {
      return res.status(400).json({
        message: 'La URL de n8n es requerida si los webhooks están habilitados'
      });
    }

    await saveConfig('webhooks_enabled', enabled ? 'true' : 'false');
    await saveConfig('n8n_webhook_url', n8nUrl || '');
    await saveConfig('webhook_triggers', JSON.stringify(triggers || []));
    await saveConfig('webhooks_configured', 'true');

    return res.status(200).json({
      message: 'Webhooks configurados correctamente',
      step: 'webhooks',
      completed: true
    });

  } catch (error) {
    console.error('Error configurando webhooks:', error);
    return res.status(500).json({
      message: 'Error configurando webhooks',
      error: error.message
    });
  }
};

exports.configurePaymentGateways = async (req, res) => {
  try {
    const { gateways } = req.body;

    // gateways es un array de configuraciones:
    // [{
    //   name: 'PayPal',
    //   enabled: true,
    //   credentials: { clientId: '...', secret: '...' }
    // }]

    if (!Array.isArray(gateways)) {
      return res.status(400).json({
        message: 'Las pasarelas deben ser un array'
      });
    }

    // Guardar cada gateway en la tabla PaymentGateway
    for (const gateway of gateways) {
      if (gateway.enabled) {
        await db.PaymentGateway.findOrCreate({
          where: { name: gateway.name },
          defaults: {
            name: gateway.name,
            enabled: gateway.enabled,
            credentials: JSON.stringify(gateway.credentials || {}),
            active: true
          }
        });
      }
    }

    await saveConfig('payment_gateways', JSON.stringify(gateways));
    await saveConfig('payment_gateways_configured', 'true');

    return res.status(200).json({
      message: 'Pasarelas de pago configuradas correctamente',
      step: 'payment',
      completed: true
    });

  } catch (error) {
    console.error('Error configurando pasarelas de pago:', error);
    return res.status(500).json({
      message: 'Error configurando pasarelas de pago',
      error: error.message
    });
  }
};

exports.configureMikrotik = async (req, res) => {
  try {
    const { mockMode, routers } = req.body;

    // routers es un array de configuraciones:
    // [{ name: 'Router Principal', ipAddress: '192.168.1.1', username: 'admin', password: '...' }]

    await saveConfig('mikrotik_mock_mode', mockMode ? 'true' : 'false');

    if (!mockMode && Array.isArray(routers)) {
      // Guardar routers reales
      for (const router of routers) {
        await db.MikrotikRouter.findOrCreate({
          where: { ipAddress: router.ipAddress },
          defaults: {
            name: router.name,
            ipAddress: router.ipAddress,
            apiPort: router.apiPort || 8728,
            username: router.username,
            password: router.password,
            active: true
          }
        });
      }
      await saveConfig('mikrotik_routers_count', routers.length.toString());
    }

    await saveConfig('mikrotik_configured', 'true');

    return res.status(200).json({
      message: 'MikroTik configurado correctamente',
      step: 'mikrotik',
      completed: true,
      mockMode: mockMode
    });

  } catch (error) {
    console.error('Error configurando MikroTik:', error);
    return res.status(500).json({
      message: 'Error configurando MikroTik',
      error: error.message
    });
  }
};

exports.completeSetup = async (req, res) => {
  try {
    // Marcar setup como completado
    await saveConfig('setup_completed', 'true');
    await saveConfig('setup_completed_date', new Date().toISOString());

    // Crear usuario admin si no existe
    const adminUser = await db.User.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Admin123!', 10);

      await db.User.create({
        username: 'admin',
        email: 'admin@sistema.local',
        password: hashedPassword,
        fullName: 'Administrador',
        active: true
      });
    }

    return res.status(200).json({
      message: 'Configuración inicial completada',
      setupCompleted: true,
      redirectTo: '/dashboard'
    });

  } catch (error) {
    console.error('Error completando configuración:', error);
    return res.status(500).json({
      message: 'Error completando configuración',
      error: error.message
    });
  }
};

exports.resetSetup = async (req, res) => {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        message: 'No se puede resetear el setup en producción'
      });
    }

    await db.SystemConfiguration.update(
      { value: 'false' },
      { where: { configKey: 'setup_completed' } }
    );

    return res.status(200).json({
      message: 'Setup reseteado correctamente'
    });

  } catch (error) {
    console.error('Error reseteando setup:', error);
    return res.status(500).json({
      message: 'Error reseteando setup',
      error: error.message
    });
  }
};

// Funciones auxiliares
async function saveConfig(key, value) {
  const [config, created] = await db.SystemConfiguration.findOrCreate({
    where: { configKey: key },
    defaults: {
      configKey: key,
      configValue: value,
      module: 'setup'
    }
  });

  if (!created) {
    await config.update({ configValue: value });
  }

  return config;
}

function calculateProgress(steps) {
  const totalSteps = Object.keys(steps).length;
  const completedSteps = Object.values(steps).filter(step => step.completed).length;
  return Math.round((completedSteps / totalSteps) * 100);
}
