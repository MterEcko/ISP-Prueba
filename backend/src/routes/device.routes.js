// backend/src/routes/device.routes.js
const { authJwt } = require("../middleware");
const deviceController = require("../controllers/device.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Rutas para dispositivos
  app.post(
    "/api/devices",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceController.create
  );

  app.get(
    "/api/devices",
    //[authJwt.verifyToken],
    deviceController.findAll
  );
  
  app.post(
    "/api/devices/test-connection",
    //[authJwt.verifyToken],
    deviceController.testConnectionWithCredentials
  );

  app.get(
    "/api/devices/:id",
    //[authJwt.verifyToken],
    deviceController.findOne
  );

  app.put(
    "/api/devices/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceController.update
  );

  app.delete(
    "/api/devices/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceController.delete
  );

  // Rutas para operaciones específicas de dispositivos
  app.get(
    "/api/devices/:id/status",
    //[authJwt.verifyToken],
    deviceController.checkStatus
  );

  app.get(
    "/api/devices/:id/info",
    //[authJwt.verifyToken],
    deviceController.getDeviceInfo
  );

  app.get(
    "/api/devices/:id/metrics",
    //[authJwt.verifyToken],
    deviceController.getMetrics
  );

  app.post(
    "/api/devices/:id/actions",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceController.executeAction
  );



  // Ruta para probar conexión con credenciales
  app.post(
    "/api/devices/:id/test-connection",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    async (req, res) => {
      try {
        const deviceId = req.params.id;
        const Device = require('../models').Device;
        const DeviceCredential = require('../models').DeviceCredential;

        // Obtener dispositivo
        const device = await Device.findByPk(deviceId);
        if (!device) {
          return res.status(404).json({
            message: `Dispositivo con ID ${deviceId} no encontrado`
          });
        }

        // Obtener credenciales
        const credentials = await DeviceCredential.findOne({
          where: { deviceId }
        });

        if (!credentials) {
          return res.status(404).json({
            message: "No se encontraron credenciales para este dispositivo"
          });
        }

        // Seleccionar servicio de conexión
        const CONNECTION_SERVICES = {
          mikrotik: require('../services/mikrotik.service'),
          ubiquiti: require('../services/ubiquiti.service')
        };

        const connectionService = CONNECTION_SERVICES[device.brand.toLowerCase()];
        if (!connectionService) {
          return res.status(400).json({
            message: `No hay soporte para dispositivos de marca ${device.brand}`
          });
        }

        // Probar conexión
        const connectionResult = await connectionService.testConnection(
          device.ipAddress, 
          credentials.username, 
          credentials.password
        );

        return res.json({
          success: connectionResult,
          message: connectionResult 
            ? 'Conexión establecida exitosamente' 
            : 'No se pudo establecer conexión'
        });
      } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Error al probar la conexión del dispositivo",
          error: error.message
        });
      }
    }
  );
  // Agregar estas rutas a tu archivo backend/src/routes/device.routes.js existente
// Después de las rutas existentes, antes del cierre de module.exports

  // Ruta para obtener historial de comandos (LA QUE FALTA)
  app.get(
    "/api/devices/:id/command-history",
    //[authJwt.verifyToken],
    async (req, res) => {
      try {
        const deviceId = req.params.id;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const CommandHistory = require('../models').CommandHistory;
        const User = require('../models').User;

        const { count, rows: history } = await CommandHistory.findAndCountAll({
          where: { deviceId },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'fullName']
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: parseInt(limit),
          offset: parseInt(offset)
        });

        return res.json({
          success: true,
          data: {
            history,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: count,
              pages: Math.ceil(count / limit)
            }
          }
        });
      } catch (error) {
        console.error('Error al obtener historial de comandos:', error);
        return res.status(500).json({
          success: false,
          message: "Error al obtener historial de comandos",
          error: error.message
        });
      }
    }
  );

  // Ruta para obtener credenciales (mejorada)
/*  app.get(
    "/api/devices/:id/credentials",
    [authJwt.verifyToken],
    async (req, res) => {
      try {
        const deviceId = req.params.id;
        const DeviceCredential = require('../models').DeviceCredential;

        const credentials = await DeviceCredential.findAll({
          where: { 
            deviceId: deviceId,
            isActive: true 
          },
          attributes: [
            'id', 'connectionType', 'username', 'port', 
            'isActive', 'lastUsed', 'rotationDate', 'createdAt', 'updatedAt'
          ], // Excluir passwords por seguridad
          order: [
            ['isActive', 'DESC'],
            ['createdAt', 'DESC']
          ]
        });

        return res.json({
          success: true,
          data: credentials
        });
      } catch (error) {
        console.error('Error al obtener credenciales:', error);
        return res.status(500).json({
          success: false,
          message: "Error al obtener credenciales",
          error: error.message
        });
      }
    }
  );
*/
  // Ruta para obtener comandos disponibles
  app.get(
    "/api/devices/:id/available-commands",
    //[authJwt.verifyToken],
    async (req, res) => {
      try {
        const deviceId = req.params.id;
        const Device = require('../models').Device;
        const DeviceCommand = require('../models').DeviceCommand;

        // Obtener dispositivo
        const device = await Device.findByPk(deviceId);
        if (!device) {
          return res.status(404).json({
            success: false,
            message: 'Dispositivo no encontrado'
          });
        }

        // Buscar comandos disponibles para la marca/tipo del dispositivo
        const commands = await DeviceCommand.findAll({
          where: {
            brand: device.brand,
            deviceType: device.type,
            active: true
          },
          attributes: [
            'id', 'commandName', 'description', 'category', 
            'requiresConfirmation', 'affectsService', 'permissionLevel'
          ],
          order: [['category', 'ASC'], ['commandName', 'ASC']]
        });

        return res.json({
          success: true,
          data: commands
        });
      } catch (error) {
        console.error('Error al obtener comandos:', error);
        return res.status(500).json({
          success: false,
          message: "Error al obtener comandos disponibles",
          error: error.message
        });
      }
    }
  );

  // Ruta para ejecutar comandos
  app.post(
    "/api/devices/:id/execute-command",
    [authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    async (req, res) => {
      try {
        const { commandId, parameters = {} } = req.body;
        const deviceId = req.params.id;
        const userId = req.userId; // Del middleware de auth

        const Device = require('../models').Device;
        const DeviceCommand = require('../models').DeviceCommand;
        const CommandHistory = require('../models').CommandHistory;

        // Verificar dispositivo
        const device = await Device.findByPk(deviceId);
        if (!device) {
          return res.status(404).json({
            success: false,
            message: 'Dispositivo no encontrado'
          });
        }

        // Verificar comando
        const command = await DeviceCommand.findByPk(commandId);
        if (!command) {
          return res.status(404).json({
            success: false,
            message: 'Comando no encontrado'
          });
        }

        // TODO: Aquí iría la lógica de ejecución del comando real
        // Por ahora, simular ejecución exitosa
        const executionResult = {
          success: true,
          output: `Comando ${command.commandName} ejecutado en ${device.name}`,
          executionTime: Math.random() * 1000,
          timestamp: new Date()
        };

        // Registrar en historial
        await CommandHistory.create({
          deviceId: deviceId,
          userId: userId,
          command: command.commandName,
          parameters: parameters,
          result: executionResult,
          success: executionResult.success,
          executionTime: executionResult.executionTime,
          connectionType: command.commandType
        });

        return res.json({
          success: true,
          message: 'Comando ejecutado exitosamente',
          data: executionResult
        });

      } catch (error) {
        console.error('Error al ejecutar comando:', error);
        return res.status(500).json({
          success: false,
          message: 'Error al ejecutar comando',
          error: error.message
        });
      }
    }
  );
  
};