// inventory.service.js - VERSIÓN CORREGIDA SIN ERRORES
import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class InventoryService {
  // ================== INVENTORY ITEMS ==================

  getAllInventory(params = {}) {
    const queryParams = new URLSearchParams();
    
    // Añadir parámetros a la consulta
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.name) queryParams.append('name', params.name);
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.model) queryParams.append('model', params.model);
    if (params.status) queryParams.append('status', params.status);
    if (params.serialNumber) queryParams.append('serialNumber', params.serialNumber);
    if (params.macAddress) queryParams.append('macAddress', params.macAddress);
    if (params.locationId) queryParams.append('locationId', params.locationId);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.assignedOnly !== undefined) queryParams.append('assignedOnly', params.assignedOnly);

    return axios.get(`${API_URL}inventory?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  getInventory(id) {
    return axios.get(`${API_URL}inventory/${id}`, { 
      headers: authHeader() 
    });
  }
  
  // ✅ BÚSQUEDAS ESPECÍFICAS (rutas que SÍ existen en el backend)
  searchInventoryBySerial(serialNumber) {
    const queryParams = new URLSearchParams({
      page: '1',
      size: '10',
      serialNumber: serialNumber
    });

    return axios.get(`${API_URL}search-by-serial?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }
  
  searchInventoryByMac(macAddress) {
    const queryParams = new URLSearchParams({
      page: '1',
      size: '10',
      macAddress: macAddress
    });

    return axios.get(`${API_URL}search-by-mac?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // ✅ BÚSQUEDA UNIFICADA (usando solo rutas que existen)
  async searchInventory(searchTerm, type = 'all') {
    try {
      const results = [];
      
      if (!searchTerm || searchTerm.trim() === '') {
        return results;
      }

      const cleanSearchTerm = searchTerm.trim();
      
      // Primero intentar buscar por serial
      try {
        const serialResponse = await this.searchInventoryBySerial(cleanSearchTerm);
        if (serialResponse.data && serialResponse.data.items && Array.isArray(serialResponse.data.items)) {
          results.push(...serialResponse.data.items);
        }
      } catch (error) {
        console.warn('No se encontraron resultados por serial:', error.response?.data?.message || error.message);
      }
      
      // Luego intentar buscar por MAC
      try {
        const macResponse = await this.searchInventoryByMac(cleanSearchTerm);
        if (macResponse.data && macResponse.data.items && Array.isArray(macResponse.data.items)) {
          // Evitar duplicados
          const existingIds = results.map(item => item.id);
          const newItems = macResponse.data.items.filter(item => !existingIds.includes(item.id));
          results.push(...newItems);
        }
      } catch (error) {
        console.warn('No se encontraron resultados por MAC:', error.response?.data?.message || error.message);
      }
      
      // Si no hay resultados específicos, buscar por nombre
      if (results.length === 0) {
        try {
          const nameResponse = await this.getAllInventory({
            name: cleanSearchTerm,
            page: 1,
            size: 20
          });
          if (nameResponse.data && nameResponse.data.items && Array.isArray(nameResponse.data.items)) {
            results.push(...nameResponse.data.items);
          }
        } catch (error) {
          console.warn('No se encontraron resultados por nombre:', error.response?.data?.message || error.message);
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Error en búsqueda de inventario:', error);
      throw new Error('Error al buscar en el inventario');
    }
  }

  createInventory(item) {
    const data = {
      ...item,
      macAddress: item.macAddress || null
    };

    return axios.post(`${API_URL}inventory`, data, { 
      headers: authHeader() 
    });
  }

  updateInventory(id, item) {
    const data = {
      ...item,
      macAddress: item.macAddress || null
    };

    return axios.put(`${API_URL}inventory/${id}`, data, { 
      headers: authHeader() 
    });
  }

  changeStatus(id, status, reason = '', notes = '') {
    return axios.patch(`${API_URL}inventory/${id}/status`, { 
      status, 
      reason, 
      notes 
    }, { 
      headers: authHeader() 
    });
  }

  assignToClient(id, clientId, reason = '', notes = '') {
    return axios.patch(`${API_URL}inventory/${id}/assign`, { 
      clientId, 
      reason, 
      notes 
    }, { 
      headers: authHeader() 
    });
  }

  deleteInventory(id) {
    return axios.delete(`${API_URL}inventory/${id}`, { 
      headers: authHeader() 
    });
  }

  // ================== FUNCIONES AVANZADAS (rutas que SÍ existen) ==================

  // 🔥 AUTOCOMPLETADO POR SERIAL (ruta real: /api/inventory/serial/:serial)
  getProductBySerial(serial) {
    return axios.get(`${API_URL}inventory/serial/${encodeURIComponent(serial)}`, { 
      headers: authHeader() 
    });
  }

  // 🔥 PLANTILLAS DE PRODUCTOS (ruta real: /api/inventory/templates)
  getProductTemplates() {
    return axios.get(`${API_URL}inventory/templates`, { 
      headers: authHeader() 
    });
  }

  // 🔥 CONSUMO DE MATERIALES CON SCRAP AUTOMÁTICO (ruta real: /api/inventory/consume)
  consumeMaterial(data) {
    const requestData = {
      inventoryId: data.inventoryId,
      quantityToUse: data.quantityToUse,
      technicianId: data.technicianId || null,
      ticketId: data.ticketId || null,
      notes: data.notes || '',
      scrapThreshold: data.scrapThreshold || 5
    };

    return axios.post(`${API_URL}inventory/consume`, requestData, { 
      headers: authHeader() 
    });
  }

  // 🔥 DASHBOARD DE EFICIENCIA (ruta real: /api/inventory/efficiency)
  getEfficiencyDashboard(period = '30d') {
    const queryParams = new URLSearchParams({ period });
    
    return axios.get(`${API_URL}inventory/efficiency?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // 🔥 REPORTE DE SCRAP (ruta real: /api/inventory/scrap/report)
  getScrapReport(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.period) queryParams.append('period', params.period);
    if (params.technicianId) queryParams.append('technicianId', params.technicianId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    return axios.get(`${API_URL}inventory/scrap/report?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // ================== INVENTORY LOCATIONS ==================

  getAllLocations(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.name) queryParams.append('name', params.name);
    if (params.type) queryParams.append('type', params.type);
    if (params.active !== undefined) queryParams.append('active', params.active);
    if (params.parentId) queryParams.append('parentId', params.parentId);

    return axios.get(`${API_URL}inventory/locations?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  getLocation(id) {
    return axios.get(`${API_URL}inventory/locations/${id}`, { 
      headers: authHeader() 
    });
  }

  createLocation(location) {
    return axios.post(`${API_URL}inventory/locations`, location, { 
      headers: authHeader() 
    });
  }

  updateLocation(id, location) {
    return axios.put(`${API_URL}inventory/locations/${id}`, location, { 
      headers: authHeader() 
    });
  }

  deleteLocation(id) {
    return axios.delete(`${API_URL}inventory/locations/${id}`, { 
      headers: authHeader() 
    });
  }

  // ================== INVENTORY MOVEMENTS ==================

  getAllMovements(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.type) queryParams.append('type', params.type);
    if (params.inventoryId) queryParams.append('inventoryId', params.inventoryId);
    if (params.fromLocationId) queryParams.append('fromLocationId', params.fromLocationId);
    if (params.toLocationId) queryParams.append('toLocationId', params.toLocationId);
    if (params.movedById) queryParams.append('movedById', params.movedById);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    return axios.get(`${API_URL}inventory/movements?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  getMovement(id) {
    return axios.get(`${API_URL}inventory/movements/${id}`, { 
      headers: authHeader() 
    });
  }

  getMovementsByItem(itemId) {
    return axios.get(`${API_URL}inventory/movements/item/${itemId}`, { 
      headers: authHeader() 
    });
  }

  createMovement(movement) {
    return axios.post(`${API_URL}inventory/movements`, movement, { 
      headers: authHeader() 
    });
  }

  deleteMovement(id) {
    return axios.delete(`${API_URL}inventory/movements/${id}`, { 
      headers: authHeader() 
    });
  }

  // ================== UTILIDADES HELPER ==================


// En inventory.service.js
getInventoryStats(params = {}) {
  let queryParams = new URLSearchParams();
  
  // Aplicar los mismos filtros que la vista actual
  if (params.locationId) queryParams.append('locationId', params.locationId);
  if (params.brand) queryParams.append('brand', params.brand);
  if (params.assignedOnly !== undefined) queryParams.append('assignedOnly', params.assignedOnly);

  return axios.get(`${API_URL}inventory/stats?${queryParams.toString()}`, { 
    headers: authHeader() 
  });
}
  
  // Formatear número con unidades
  formatQuantity(quantity, unitType = 'piece') {
    const units = {
      'piece': 'pzs',
      'meters': 'm',
      'grams': 'g',
      'box': 'cajas',
      'liters': 'l'
    };
    
    if (quantity === null || quantity === undefined) {
      return '0 ' + (units[unitType] || unitType);
    }
    
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity)) {
      return '0 ' + (units[unitType] || unitType);
    }
    
    const formattedQuantity = numQuantity.toFixed(unitType === 'piece' ? 0 : 2);
    return `${formattedQuantity} ${units[unitType] || unitType}`;
  }

  // Calcular valor de depreciación
  calculateDepreciatedValue(item, depreciationRate = 0.15) {
    if (!item || !item.cost || !item.purchaseDate) {
      return 0;
    }
    
    const cost = parseFloat(item.cost);
    if (isNaN(cost) || cost <= 0) {
      return 0;
    }
    
    try {
      const purchaseDate = new Date(item.purchaseDate);
      const currentDate = new Date();
      
      if (isNaN(purchaseDate.getTime())) {
        return cost;
      }
      
      const yearsElapsed = (currentDate - purchaseDate) / (365 * 24 * 60 * 60 * 1000);
      
      if (yearsElapsed < 0) {
        return cost;
      }
      
      const depreciatedValue = cost * Math.pow((1 - depreciationRate), yearsElapsed);
      const minimumValue = cost * 0.1; // Valor mínimo del 10%
      
      return Math.max(depreciatedValue, minimumValue);
    } catch (error) {
      console.error('Error calculando valor depreciado:', error);
      return cost;
    }
  }

  // Obtener color del estado
  getStatusColor(status) {
    const colors = {
      'available': '#4CAF50',
      'inUse': '#FF9800',
      'defective': '#F44336',
      'inRepair': '#2196F3',
      'retired': '#9E9E9E'
    };
    return colors[status] || '#9E9E9E';
  }

  // Obtener texto del estado
  getStatusText(status) {
    const texts = {
      'available': 'Disponible',
      'inUse': 'En Uso',
      'defective': 'Defectuoso',
      'inRepair': 'En Reparación',
      'retired': 'Retirado'
    };
    return texts[status] || status;
  }

  // Validar dirección MAC
  isValidMacAddress(mac) {
    if (!mac || mac.trim() === '') {
      return true; // MAC es opcional
    }
    
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
    return macRegex.test(mac.trim());
  }

  // Formatear dirección MAC
  formatMacAddress(mac) {
    if (!mac) return '';
    
    // Remover todos los caracteres que no sean hexadecimales
    const cleanMac = mac.replace(/[^0-9A-Fa-f]/g, '');
    
    if (cleanMac.length !== 12) {
      return mac; // Retornar original si no tiene 12 caracteres
    }
    
    // Formatear con dos puntos
    return cleanMac.match(/.{2}/g).join(':').toUpperCase();
  }

  // Generar número de serie aleatorio (para testing)
  generateRandomSerial(prefix = 'INV') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  // Validar datos de inventario
  validateInventoryItem(item) {
    const errors = [];
    
    if (!item.name || item.name.trim() === '') {
      errors.push('El nombre es obligatorio');
    }
    
    if (item.macAddress && !this.isValidMacAddress(item.macAddress)) {
      errors.push('La dirección MAC no tiene un formato válido');
    }
    
    if (item.cost && (isNaN(parseFloat(item.cost)) || parseFloat(item.cost) < 0)) {
      errors.push('El costo debe ser un número válido mayor o igual a 0');
    }
    
    if (item.quantity && (isNaN(parseInt(item.quantity)) || parseInt(item.quantity) < 1)) {
      errors.push('La cantidad debe ser un número entero mayor a 0');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Formatear fecha para mostrar
  formatDate(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return '';
    }
  }

  // Calcular eficiencia de uso
  calculateEfficiency(quantityUsed, scrapGenerated) {
    if (!quantityUsed || quantityUsed <= 0) return 100;
    
    const used = parseFloat(quantityUsed);
    const scrap = parseFloat(scrapGenerated) || 0;
    
    if (isNaN(used) || isNaN(scrap)) return 100;
    
    const efficiency = ((used - scrap) / used) * 100;
    return Math.max(0, Math.min(100, efficiency));
  }
}

export default new InventoryService();