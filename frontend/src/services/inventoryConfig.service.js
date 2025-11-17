/**
 * Servicio para gestionar la configuración del inventario
 * Este servicio carga y proporciona acceso a la configuración del módulo de inventario
 */

import axios from 'axios';

// URL del archivo de configuración JSON
const CONFIG_URL = '/config/inventory-config.json';

class InventoryConfigService {
  constructor() {
    this.config = null;
    this.loadPromise = null;
    this.isLoading = false;
  }

  /**
   * Carga el archivo de configuración
   * @returns {Promise} - Promise con la configuración cargada
   */
  async load() {
    if (this.config) {
      return this.config;
    }

    if (this.isLoading) {
      return this.loadPromise;
    }

    this.isLoading = true;
    
    this.loadPromise = axios.get(CONFIG_URL)
      .then(response => {
        this.config = response.data;
        return this.config;
      })
      .catch(error => {
        console.error('Error cargando configuración de inventario:', error);
        // Valores por defecto en caso de error
        this.config = {
          inventory: {
            thresholds: {
              stock: {
                low: 10,
                critical: 5,
                byCategory: {}
              }
            },
            status: {
              options: [
                {id: "available", name: "Disponible", color: "#4CAF50"},
                {id: "inUse", name: "En uso", color: "#FF9800"},
                {id: "inRepair", name: "En reparación", color: "#2196F3"},
                {id: "defective", name: "Defectuoso", color: "#F44336"},
                {id: "retired", name: "Retirado", color: "#9E9E9E"}
              ],
              default: "available"
            }
          },
          dashboard: {
            limits: {
              lowStockAlerts: 5,
              recentMovements: 5,
              topLocations: 4
            }
          }
        };
        return this.config;
      })
      .finally(() => {
        this.isLoading = false;
      });

    return this.loadPromise;
  }

  /**
   * Obtiene el valor de un parámetro de configuración
   * @param {String} path - Ruta del parámetro (e.g., "inventory.thresholds.stock.low")
   * @param {any} defaultValue - Valor por defecto si no existe el parámetro
   * @returns {any} - Valor del parámetro
   */
  async get(path, defaultValue = null) {
    await this.load();
    
    const parts = path.split('.');
    let current = this.config;
    
    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
  }
  
  /**
   * Obtiene el umbral de stock bajo para una categoría
   * @param {String} category - ID de la categoría
   * @returns {Number} - Umbral de stock bajo
   */
  async getLowStockThreshold(category) {
    const byCategory = await this.get('inventory.thresholds.stock.byCategory', {});
    const defaultThreshold = await this.get('inventory.thresholds.stock.low', 10);
    
    return category && byCategory[category] 
      ? byCategory[category].low || defaultThreshold 
      : defaultThreshold;
  }
  
  /**
   * Obtiene el umbral de stock crítico para una categoría
   * @param {String} category - ID de la categoría
   * @returns {Number} - Umbral de stock crítico
   */
  async getCriticalStockThreshold(category) {
    const byCategory = await this.get('inventory.thresholds.stock.byCategory', {});
    const defaultThreshold = await this.get('inventory.thresholds.stock.critical', 5);
    
    return category && byCategory[category] 
      ? byCategory[category].critical || defaultThreshold 
      : defaultThreshold;
  }
  
  /**
   * Verifica si un ítem tiene stock bajo según su categoría
   * @param {Object} item - Ítem a verificar
   * @returns {Promise<Boolean>} - True si tiene stock bajo
   */
  async hasLowStock(item) {
    if (!item || !item.stock) return false;
    
    const threshold = await this.getLowStockThreshold(item.category);
    return item.stock < threshold;
  }
  
  /**
   * Verifica si un ítem tiene stock crítico según su categoría
   * @param {Object} item - Ítem a verificar
   * @returns {Promise<Boolean>} - True si tiene stock crítico
   */
  async hasCriticalStock(item) {
    if (!item || !item.stock) return false;
    
    const threshold = await this.getCriticalStockThreshold(item.category);
    return item.stock < threshold;
  }
  
  /**
   * Obtiene el límite de alertas de stock bajo para el dashboard
   * @returns {Number} - Límite de alertas
   */
  async getLowStockAlertsLimit() {
    return this.get('dashboard.limits.lowStockAlerts', 5);
  }
  
  /**
   * Obtiene el límite de movimientos recientes para el dashboard
   * @returns {Number} - Límite de movimientos
   */
  async getRecentMovementsLimit() {
    return this.get('dashboard.limits.recentMovements', 5);
  }
  
  /**
   * Obtiene la lista de estados de inventario disponibles
   * @returns {Array} - Estados disponibles
   */
  async getStatusOptions() {
    return this.get('inventory.status.options', []);
  }
}

// Instancia única del servicio
const inventoryConfigService = new InventoryConfigService();

export default inventoryConfigService;