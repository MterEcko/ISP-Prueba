/**
 * Rutas para la gestión de IPs
 */
module.exports = function(app) {
  const ipAssignmentController = require('../controllers/ip.assignment.controller');
  const { authJwt } = require('../middleware');
  
  // Obtener IPs por pool
  app.get(
    '/api/ip-pools/:poolId/ips',
    //[authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ipAssignmentController.getIpsByPool
  );
  
  // Asignar IP a usuario PPPoE
  app.post(
    '/api/pppoe-users/:mikrotikPPPOEId/assign-ip',
    [authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ipAssignmentController.assignIpToUser
  );
  
  // Liberar IP de usuario PPPoE
  app.post(
    '/api/pppoe-users/:mikrotikPPPOEId/release-ip',
    [authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ipAssignmentController.releaseIpFromUser
  );
  
  // Importar IPs desde CIDR
  app.post(
    '/api/ip-pools/:poolId/import-cidr',
    //[authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ipAssignmentController.importIpsFromCidr
  );
  
  // Obtener estadísticas de pool
  app.get(
    '/api/ip-pools/:poolId/stats',
    [authJwt.verifyToken, authJwt.checkPermission('view_network')],
    ipAssignmentController.getPoolStats
  );
  
  // Sincronizar IPs con router
  app.post(
    '/api/mikrotik-routers/:routerId/sync-ips',
    [authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ipAssignmentController.syncIpsWithRouter
  );
  
  // Verificar asignaciones de IPs
  app.post(
    '/api/ip-assignments/verify',
    [authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ipAssignmentController.verifyIpAssignments
  );
  
  // Actualizar IP específica
  app.put(
    '/api/ips/:ipId',
    [authJwt.verifyToken, authJwt.checkPermission('manage_network')],
    ipAssignmentController.updateIp
  );
};
