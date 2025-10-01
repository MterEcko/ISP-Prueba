// backend/src/routes/device.routes.js
const { authJwt } = require("../middleware");
const deviceController = require("../controllers/device.controller");
const commandExecutionController = require("../controllers/commandExecution.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });



  // Rutas para dispositivos R
  app.get(
    "/api/devices",
    //[authJwt.verifyToken],
    deviceController.findAll
  );

  // Rutas para dispositivos R
  app.post(
    "/api/devices",
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    deviceController.create
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




  // Ruta para obtener historial de comandos (LA QUE FALTA)
// Agregar ruta para historial (ya comentada en tu código)
  app.get(
    "/api/devices/:id/command-history",
    //[authJwt.verifyToken],
    commandExecutionController.getCommandHistory
  );


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
    //[authJwt.verifyToken, authJwt.checkPermission("manageNetwork")],
    commandExecutionController.executeCommand
  );
};