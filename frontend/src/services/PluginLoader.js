// frontend/src/services/PluginLoader.js
import axios from 'axios';
import { API_URL } from '../config/apiConfig'; // Ajusta esto a tu archivo de configuración real (ej: app-config.js o env)
import authHeader from './auth-header'; // Tu helper de headers actual

class PluginLoader {
  constructor() {
    this.loadedScripts = new Set(); // Evita cargar el mismo script dos veces
    this.registeredComponents = new Set(); // Rastrea qué componentes ya están listos
  }

  /**
   * 1. Consulta al Backend qué widgets deben aparecer en una zona
   * @param {string} zone - Ej: 'dashboard', 'client_details', 'sidebar'
   * @returns {Promise<Array>} Lista de widgets { componentName, scriptUrl, props }
   */
  async getWidgetsForZone(zone) {
    try {
      // Nota: Necesitaremos crear este endpoint en el backend más adelante
      // GET /api/system-plugins/ui-components?zone=dashboard
      const response = await axios.get(`${API_URL}/system-plugins/ui-components`, {
        params: { zone },
        headers: authHeader()
      });
      
      return response.data.data || [];
    } catch (error) {
      console.error(`[PluginLoader] Error cargando widgets para zona ${zone}:`, error);
      return [];
    }
  }

  /**
   * 2. Carga dinámicamente el archivo .js (UMD) del plugin en el navegador
   * @param {string} pluginName - ID único del plugin
   * @param {string} scriptUrl - URL donde está el archivo .js compilado
   */
  async loadPluginScript(pluginName, scriptUrl) {
    return new Promise((resolve, reject) => {
      // Si ya lo cargamos, no hacer nada
      if (this.loadedScripts.has(pluginName)) {
        return resolve();
      }

      // Si ya existe en el DOM (por si acaso)
      if (document.getElementById(`plugin-script-${pluginName}`)) {
        this.loadedScripts.add(pluginName);
        return resolve();
      }

      console.log(`[PluginLoader] 📥 Descargando componente: ${pluginName}`);

      const script = document.createElement('script');
      script.src = scriptUrl; // El backend debe servir esto estáticamente
      script.id = `plugin-script-${pluginName}`;
      script.async = true;

      script.onload = () => {
        console.log(`[PluginLoader] ✅ Componente cargado: ${pluginName}`);
        this.loadedScripts.add(pluginName);
        resolve();
      };

      script.onerror = () => {
        console.error(`[PluginLoader] ❌ Error descargando script de ${pluginName}`);
        reject(new Error(`Fallo al cargar script del plugin ${pluginName}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * 3. Método maestro: Obtiene, Descarga y Prepara
   * @param {string} zone 
   * @returns {Promise<Array>} Lista de nombres de componentes listos para usar en <component :is="">
   */
  async loadWidgets(zone) {
    // A. Obtener la lista del backend
    const widgets = await this.getWidgetsForZone(zone);
    
    // B. Descargar los scripts de cada widget en paralelo
    const loadPromises = widgets.map(async (widget) => {
      try {
        await this.loadPluginScript(widget.pluginName, widget.scriptUrl);
        return {
          name: widget.componentName, // El nombre con el que se registró globalmente en Vue (ej: 'streaming-widget')
          props: widget.props || {}   // Configuración extra
        };
      } catch (e) {
        console.warn(`Omitiendo widget fallido: ${widget.pluginName}`);
        return null;
      }
    });

    const results = await Promise.all(loadPromises);
    
    // Filtrar los nulos (fallidos)
    return results.filter(w => w !== null);
  }
}

export default new PluginLoader();