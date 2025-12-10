const express = require('express');
const fs = require('fs');
const path = require('path');

const pluginsPath = path.join(__dirname, '../plugins');

module.exports = (app) => {
  console.log('\n=== REGISTRANDO RUTAS DE PLUGINS ===');

  const pluginFolders = fs.readdirSync(pluginsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const pluginName of pluginFolders) {
    try {
      const pluginIndexPath = path.join(pluginsPath, pluginName, 'src', 'index.js');
      const pluginRoutesPath = path.join(pluginsPath, pluginName, 'src', 'routes.js');
      const pluginControllerPath = path.join(pluginsPath, pluginName, 'src', 'controller.js');

      if (fs.existsSync(pluginIndexPath) &&
          fs.existsSync(pluginRoutesPath) &&
          fs.existsSync(pluginControllerPath)) {

        const PluginClass = require(pluginIndexPath);
        const plugin = new PluginClass();

        const router = express.Router();
        const registeredRouter = plugin.registerRoutes(router);

        app.use(`/api/plugins/${pluginName}`, registeredRouter);

        console.log(`✅ Plugin ${pluginName}: rutas registradas en /api/plugins/${pluginName}`);
      }
    } catch (error) {
      console.error(`❌ Error registrando rutas del plugin ${pluginName}:`, error.message);
    }
  }

  console.log('=== FIN REGISTRO DE RUTAS DE PLUGINS ===\n');
};
