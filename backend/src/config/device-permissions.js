// backend/src/config/device-permissions.js

const setupDevicePermissions = async (db) => {
  const Permission = db.Permission;
  const Role = db.Role;

  const devicePermissions = [
    { 
      name: "viewDevices", 
      description: "Ver listado de dispositivos", 
      module: "devices" 
    },
    { 
      name: "manageDevices", 
      description: "Crear, editar y eliminar dispositivos", 
      module: "devices" 
    },
    { 
      name: "testDeviceConnection", 
      description: "Probar conexión con dispositivos", 
      module: "devices" 
    },
    { 
      name: "viewDeviceMetrics", 
      description: "Ver métricas de dispositivos", 
      module: "devices" 
    },
    { 
      name: "executeDeviceActions", 
      description: "Ejecutar acciones en dispositivos", 
      module: "devices" 
    },
    { 
      name: "manageDeviceCredentials", 
      description: "Administrar credenciales de dispositivos", 
      module: "devices" 
    }
  ];

  // Verificar y crear permisos de dispositivos
  const existingPermissions = await Permission.findAll({
    where: { module: 'devices' }
  });

  const permissionsToCreate = devicePermissions.filter(
    newPerm => !existingPermissions.some(
      existPerm => existPerm.name === newPerm.name
    )
  );

  if (permissionsToCreate.length > 0) {
    await Permission.bulkCreate(permissionsToCreate);
    console.log(`Se crearon ${permissionsToCreate.length} nuevos permisos para dispositivos`);
  }

  // Asignar permisos de dispositivos al rol de administrador
  const adminRole = await Role.findOne({ where: { name: "admin" } });
  if (adminRole) {
    const devicePermissionInstances = await Permission.findAll({
      where: { module: 'devices' }
    });

    const existingRolePermissions = await adminRole.getPermissions();
    
    // Identificar permisos nuevos para este rol
    const newPermissions = devicePermissionInstances.filter(
      newPerm => !existingRolePermissions.some(
        existPerm => existPerm.name === newPerm.name
      )
    );

    if (newPermissions.length > 0) {
      await adminRole.addPermissions(newPermissions);
      console.log(`Se asignaron ${newPermissions.length} nuevos permisos de dispositivos al rol de administrador`);
    }
  }
};

module.exports = setupDevicePermissions;