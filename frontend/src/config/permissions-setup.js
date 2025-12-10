const db = require("../models");
const Permission = db.Permission;

// Permisos para las nuevas funcionalidades
const tplinkPermissions = [
  {
    name: "view_network_devices",
    description: "Ver dispositivos de red",
    module: "network"
  },
  {
    name: "manageNetworkDevices",
    description: "Administrar dispositivos de red",
    module: "network"
  }
];

async function setupTPLinkPermissions() {
  try {
    console.log("Iniciando configuración de permisos para TP-Link...");
    
    for (const permission of tplinkPermissions) {
      // Verificar si el permiso ya existe
      const existingPermission = await Permission.findOne({
        where: { name: permission.name }
      });
      
      if (!existingPermission) {
        // Crear el permiso si no existe
        await Permission.create(permission);
        console.log(`Permiso creado: ${permission.name}`);
      } else {
        console.log(`Permiso ya existe: ${permission.name}`);
      }
    }
    
    console.log("Configuración de permisos TP-Link completada");
  } catch (error) {
    console.error("Error al configurar permisos TP-Link:", error);
  }
}

module.exports = {
  setupTPLinkPermissions
};