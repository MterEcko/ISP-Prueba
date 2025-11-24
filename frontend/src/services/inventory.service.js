// inventory.service.js 
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
    // eslint-disable-next-line no-unused-vars
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

  // ================== QR CODES ==================
  
  /**
   * Genera códigos QR para uno o varios elementos de inventario
   * @param {Array|Number} itemIds - ID o array de IDs de elementos
   * @returns {Promise} - Promesa con los códigos QR generados
   */
  generateQRCodes(itemIds) {
    // Asegurarse de que itemIds sea un array
    const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
    
    // Hacer una petición por cada ID según la documentación: POST /api/inventory/:id/qr
    const promises = ids.map(id => 
      axios.post(`${API_URL}inventory/${id}/qr`, {}, { 
        headers: authHeader() 
      })
    );
    
    return Promise.all(promises);
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

  // ================== INVENTORY BATCHES ==================

  getAllBatches(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.status) queryParams.append('status', params.status);
    if (params.supplier) queryParams.append('supplier', params.supplier);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    return axios.get(`${API_URL}inventory/batches?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  getBatch(id) {
    return axios.get(`${API_URL}inventory/batches/${id}`, { 
      headers: authHeader() 
    });
  }

  createBatch(batch) {
    return axios.post(`${API_URL}inventory/batches`, batch, { 
      headers: authHeader() 
    });
  }

  addItemsToBatch(batchId, items) {
    return axios.post(`${API_URL}inventory/batches/${batchId}/add-items`, items, { 
      headers: authHeader() 
    });
  }

  completeBatch(batchId) {
    return axios.post(`${API_URL}inventory/batches/${batchId}/complete`, {}, { 
      headers: authHeader() 
    });
  }

  cancelBatch(batchId, reason) {
    return axios.post(`${API_URL}inventory/batches/${batchId}/cancel`, { reason }, { 
      headers: authHeader() 
    });
  }

  // ================== TECHNICIAN INVENTORY ==================

  assignToTechnician(data) {
    return axios.post(`${API_URL}inventory/assign-to-technician`, data, { 
      headers: authHeader() 
    });
  }

  getTechnicianInventory(technicianId) {
    return axios.get(`${API_URL}inventory/technician/${technicianId}/inventory`, { 
      headers: authHeader() 
    });
  }

  consumeMaterialByTechnician(data) {
    return axios.post(`${API_URL}inventory/consume-material`, data, { 
      headers: authHeader() 
    });
  }

  returnToWarehouse(inventoryId, data) {
    return axios.post(`${API_URL}inventory/${inventoryId}/return-to-warehouse`, data, { 
      headers: authHeader() 
    });
  }

  reportMissing(inventoryId, data) {
    return axios.post(`${API_URL}inventory/${inventoryId}/report-missing`, data, { 
      headers: authHeader() 
    });
  }

  // ================== RECONCILIATION ==================

  generateReconciliation(data) {
    return axios.post(`${API_URL}inventory/reconciliations/generate`, data, { 
      headers: authHeader() 
    });
  }

  getAllReconciliations(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.technicianId) queryParams.append('technicianId', params.technicianId);
    if (params.period) queryParams.append('period', params.period);
    if (params.status) queryParams.append('status', params.status);

    return axios.get(`${API_URL}inventory/reconciliations?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  getTechnicianReconciliations(technicianId, params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.status) queryParams.append('status', params.status);

    return axios.get(`${API_URL}inventory/reconciliations/technician/${technicianId}?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  approveReconciliation(id, data) {
    return axios.put(`${API_URL}inventory/reconciliations/${id}/approve`, data, { 
      headers: authHeader() 
    });
  }

  getTechnicianBalance(technicianId, period) {
    const queryParams = new URLSearchParams();
    if (period) queryParams.append('period', period);

    return axios.get(`${API_URL}inventory/technician/${technicianId}/balance?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  getUnregisteredReport(daysThreshold = 30) {
    const queryParams = new URLSearchParams({ daysThreshold });

    return axios.get(`${API_URL}inventory/unregistered-report?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  closeUnregistered(inventoryId, data) {
    return axios.post(`${API_URL}inventory/${inventoryId}/close-unregistered`, data, { 
      headers: authHeader() 
    });
  }
  
// =============================================
  // === ¡TODOS ESTOS MÉTODOS SON NUEVOS! ===
  // =============================================





  // --- Métodos para TYPES (Tipos de Inventario) ---

  getAllTypes(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.includeCategory) queryParams.append('includeCategory', params.includeCategory);

    return axios.get(`${API_URL}inventory-types?${queryParams.toString()}`, {
      headers: authHeader()
    });
  }

  createType(data) {
    return axios.post(`${API_URL}inventory-types`, data, {
      headers: authHeader()
    });
  }

  updateType(id, data) {
    return axios.put(`${API_URL}inventory-types/${id}`, data, {
      headers: authHeader()
    });
  }

  deleteType(id) {
    return axios.delete(`${API_URL}inventory-types/${id}`, {
      headers: authHeader()
    });
  }

  // --- Métodos para CATEGORIES (Categorías de Inventario) ---

  getAllCategories(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.includeTypes) queryParams.append('includeTypes', params.includeTypes);
    if (params.activeOnly) queryParams.append('activeOnly', params.activeOnly);

    return axios.get(`${API_URL}inventory-categories?${queryParams.toString()}`, {
      headers: authHeader()
    });
  }

  createCategory(data) {
    return axios.post(`${API_URL}inventory-categories`, data, {
      headers: authHeader()
    });
  }

  updateCategory(id, data) {
    return axios.put(`${API_URL}inventory-categories/${id}`, data, {
      headers: authHeader()
    });
  }

  deleteCategory(id) {
    return axios.delete(`${API_URL}inventory-categories/${id}`, {
      headers: authHeader()
    });
  }

  // --- Métodos para PRODUCTS (Catálogo) ---

  getAllProducts(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);

    // ⬇️ ¡ASEGÚRATE DE QUE ESTA RUTA SEA CORRECTA EN TU BACKEND!
    return axios.get(`${API_URL}inventory-products?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  getProduct(id) {
    return axios.get(`${API_URL}inventory-products/${id}`, { 
      headers: authHeader() 
    });
  }

  createProduct(data) {
    return axios.post(`${API_URL}inventory-products`, data, { 
      headers: authHeader() 
    });
  }

  updateProduct(id, data) {
    return axios.put(`${API_URL}inventory-products/${id}`, data, { 
      headers: authHeader() 
    });
  }


  
  // --- Métodos para IMPORT/EXPORT ---
  
  bulkImport(formData, options = {}) {
    // ⬇️ ¡ASEGÚRATE DE QUE ESTA RUTA SEA CORRECTA EN TU BACKEND!
    return axios.post(`${API_URL}inventory/import`, formData, {
      headers: {
        ...authHeader(),
        // No pongas 'Content-Type': 'multipart/form-data', 
        // axios lo hace automáticamente con FormData
      },
      signal: options.signal,
      onUploadProgress: options.onUploadProgress
    });
  }

  exportInventory(params, options = {}) {
    // ⬇️ ¡ASEGÚRATE DE QUE ESTA RUTA SEA CORRECTA EN TU BACKEND!
    return axios.post(`${API_URL}inventory/export`, params, {
      headers: authHeader(),
      responseType: 'blob',
      signal: options.signal
    });
  }
}

export default new InventoryService();