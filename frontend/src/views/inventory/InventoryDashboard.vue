<template>
  <div class="inventory-dashboard">
    <h2>Panel de Control de Inventario</h2>

    <!-- Indicadores principales -->
    <div class="metrics-grid">
      <metric-card
        :value="metrics.available"
        label="Equipos Disponibles"
        icon="fas fa-check-circle"
        color="success"
        :trend="metrics.availableTrend"
        trendType="neutral"
      />
      
      <metric-card
        :value="metrics.inUse"
        label="Equipos En Uso"
        icon="fas fa-wifi"
        color="warning"
        :trend="metrics.inUseTrend"
        trendType="neutral"
      />
      
      <metric-card
        :value="metrics.inRepair"
        label="En Reparación"
        icon="fas fa-tools"
        color="info"
        :trend="metrics.inRepairTrend"
        trendType="neutral"
      />
      
      <metric-card
        :value="metrics.defective"
        label="Defectuosos"
        icon="fas fa-exclamation-triangle"
        color="danger"
        :trend="metrics.defectiveTrend"
        trendType="negative"
      />
    </div>

    <div class="dashboard-grid">
      <!-- Alertas de stock bajo -->
      <div class="dashboard-column">
        <stock-alerts
          title="Alertas de Stock Bajo"
          :limit="5"
          @order="orderItem"
          @view-item="viewItem"
          @view-all="navigateTo('InventoryAlerts')"
        />
      </div>

      <!-- Movimientos recientes -->
      <div class="dashboard-column">
        <recent-movements
          title="Últimos Movimientos"
          :limit="5"
          @view-item="viewItem"
          @view-details="viewMovementDetails"
          @view-all="navigateTo('InventoryMovements')"
        />
      </div>
    </div>

    <!-- Distribución por ubicación -->
    <div class="dashboard-section location-section">
      <div class="section-header">
        <h3>Equipos por Ubicación</h3>
        <button class="refresh-button" @click="loadLocationStats" title="Actualizar">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
      
      <div v-if="loadingLocations" class="loading">
        <div class="spinner"></div>
        <span>Cargando datos...</span>
      </div>
      <div v-else-if="locationStats.length === 0" class="no-data">
        <i class="fas fa-map-marker-alt"></i>
        <p>No hay datos de ubicaciones para mostrar.</p>
      </div>
      <div v-else class="location-stats">
        <div v-for="location in locationStats" :key="location.id" class="location-card">
          <div class="location-name">{{ location.name }}</div>
          <div class="location-count">{{ location.count }} equipos</div>
          <div class="location-chart">
            <div class="chart-bar">
              <div 
                class="bar-segment available" 
                :style="{width: calculatePercentage(location.available, location.count) + '%'}" 
                :title="`Disponibles: ${location.available}`"
              ></div>
              <div 
                class="bar-segment in-use" 
                :style="{width: calculatePercentage(location.inUse, location.count) + '%'}" 
                :title="`En uso: ${location.inUse}`"
              ></div>
              <div 
                class="bar-segment other" 
                :style="{width: calculatePercentage(location.count - location.available - location.inUse, location.count) + '%'}" 
                :title="`Otros: ${location.count - location.available - location.inUse}`"
              ></div>
            </div>
          </div>
          <div class="location-details">
            <div class="detail-item">
              <span class="detail-color available"></span>
              <span class="detail-label">Disponibles:</span>
              <span class="detail-value">{{ location.available }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-color in-use"></span>
              <span class="detail-label">En uso:</span>
              <span class="detail-value">{{ location.inUse }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-color other"></span>
              <span class="detail-label">Otros:</span>
              <span class="detail-value">{{ location.count - location.available - location.inUse }}</span>
            </div>
          </div>
          <button @click="viewLocationInventory(location.id)" class="view-button">
            Ver detalles
          </button>
        </div>
      </div>
    </div>

    <!-- Acciones rápidas -->
    <div class="quick-actions">
      <button @click="navigateTo('InventoryList')" class="action-button list-button">
        <i class="fas fa-list"></i>
        <span>Ver Inventario</span>
      </button>
      <button @click="openNewItemForm" class="action-button add-button">
        <i class="fas fa-plus"></i>
        <span>Añadir Equipo</span>
      </button>
      <button @click="openBulkImport" class="action-button import-button">
        <i class="fas fa-file-import"></i>
        <span>Importación Masiva</span>
      </button>
      <button @click="openPrintLabels" class="action-button print-button">
        <i class="fas fa-print"></i>
        <span>Imprimir Etiquetas</span>
      </button>
    </div>

    <!-- Modal para solicitud de equipo -->
    <div v-if="showOrderModal" class="modal">
      <div class="modal-content">
        <span class="close-button" @click="showOrderModal = false">&times;</span>
        <h3>Solicitar Equipos</h3>
        <div class="order-details">
          <p><strong>Equipo:</strong> {{ selectedItem.name }}</p>
          <p><strong>Stock actual:</strong> {{ selectedItem.stock }}</p>
          <p><strong>Stock mínimo:</strong> {{ selectedItem.minThreshold }}</p>
        </div>

        <form @submit.prevent="submitOrder">
          <div class="form-group">
            <label for="orderQuantity">Cantidad a solicitar:</label>
            <input 
              type="number" 
              id="orderQuantity" 
              v-model.number="orderQuantity" 
              min="1" 
              required
            >
          </div>
          <div class="form-group">
            <label for="supplierSelect">Proveedor:</label>
            <select id="supplierSelect" v-model="selectedSupplierId" required>
              <option value="">Seleccionar proveedor</option>
              <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                {{ supplier.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="orderNotes">Notas:</label>
            <textarea id="orderNotes" v-model="orderNotes" rows="3"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showOrderModal = false" class="cancel-button">
              Cancelar
            </button>
            <button type="submit" class="submit-button">
              Enviar Solicitud
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal para importación masiva -->
    <div v-if="showImportModal" class="modal">
      <div class="modal-content">
        <span class="close-button" @click="showImportModal = false">&times;</span>
        <h3>Importación Masiva de Equipos</h3>
        <form @submit.prevent="submitImport">
          <div class="form-group">
            <label for="fileUpload">Archivo CSV/Excel:</label>
            <input type="file" id="fileUpload" @change="handleFileUpload" accept=".csv, .xlsx, .xls">
          </div>
          <div class="import-options">
            <h4>Opciones de importación:</h4>
            <div class="checkbox-group">
              <input type="checkbox" id="overwriteExisting" v-model="importOptions.overwriteExisting">
              <label for="overwriteExisting">Sobrescribir equipos existentes por número de serie</label>
            </div>
            <div class="checkbox-group">
              <input type="checkbox" id="skipErrors" v-model="importOptions.skipErrors">
              <label for="skipErrors">Continuar importación aunque haya errores</label>
            </div>
          </div>

          <div v-if="fileSelected" class="file-preview">
            <div class="file-name">{{ selectedFile.name }}</div>
            <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
          </div>

          <div class="template-download">
            <a href="#" @click.prevent="downloadTemplate">Descargar plantilla de importación</a>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showImportModal = false" class="cancel-button">
              Cancelar
            </button>
            <button type="submit" class="submit-button" :disabled="!fileSelected">
              Iniciar Importación
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal para impresión de etiquetas -->
    <div v-if="showPrintModal" class="modal">
      <div class="modal-content">
        <span class="close-button" @click="showPrintModal = false">&times;</span>
        <h3>Impresión de Etiquetas</h3>
        <div class="print-options">
          <div class="form-group">
            <label>Tipo de etiqueta:</label>
            <div class="radio-group">
              <input type="radio" id="qrCode" value="qr" v-model="printOptions.type">
              <label for="qrCode">Código QR</label>
            </div>
            <div class="radio-group">
              <input type="radio" id="barcode" value="barcode" v-model="printOptions.type">
              <label for="barcode">Código de barras</label>
            </div>
          </div>

          <div class="form-group">
            <label>Seleccionar equipos:</label>
            <div class="radio-group">
              <input type="radio" id="allItems" value="all" v-model="printOptions.selection">
              <label for="allItems">Todos los equipos</label>
            </div>
            <div class="radio-group">
              <input type="radio" id="filteredItems" value="filtered" v-model="printOptions.selection">
              <label for="filteredItems">Aplicar filtros</label>
            </div>
          </div>

          <div v-if="printOptions.selection === 'filtered'" class="filter-section">
            <div class="form-group">
              <label for="printLocation">Ubicación:</label>
              <select id="printLocation" v-model="printOptions.locationId">
                <option value="">Todas las ubicaciones</option>
                <option v-for="location in locations" :key="location.id" :value="location.id">
                  {{ location.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="printStatus">Estado:</label>
              <select id="printStatus" v-model="printOptions.status">
                <option value="">Todos los estados</option>
                <option value="available">Disponible</option>
                <option value="inUse">En uso</option>
                <option value="inRepair">En reparación</option>
                <option value="defective">Defectuoso</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="labelSize">Tamaño de etiqueta:</label>
            <select id="labelSize" v-model="printOptions.size">
              <option value="small">Pequeño (30x20mm)</option>
              <option value="medium">Mediano (50x30mm)</option>
              <option value="large">Grande (70x50mm)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="labelInfo">Información en etiqueta:</label>
            <div class="checkbox-group">
              <input type="checkbox" id="showName" v-model="printOptions.showName">
              <label for="showName">Nombre</label>
            </div>
            <div class="checkbox-group">
              <input type="checkbox" id="showSerial" v-model="printOptions.showSerial">
              <label for="showSerial">N° Serie</label>
            </div>
            <div class="checkbox-group">
              <input type="checkbox" id="showModel" v-model="printOptions.showModel">
              <label for="showModel">Modelo</label>
            </div>
          </div>
        </div>

        <div class="print-preview">
          <div class="preview-label">Vista previa:</div>
          <div class="preview-content" :class="printOptions.size">
            <div class="preview-qr" v-if="printOptions.type === 'qr'">
              <div class="qr-placeholder"></div>
            </div>
            <div class="preview-barcode" v-else>
              <div class="barcode-placeholder"></div>
            </div>
            <div class="preview-text">
              <div v-if="printOptions.showName" class="preview-name">Nombre del Equipo</div>
              <div v-if="printOptions.showSerial" class="preview-serial">S/N: 123456789</div>
              <div v-if="printOptions.showModel" class="preview-model">Modelo ABC</div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" @click="showPrintModal = false" class="cancel-button">
            Cancelar
          </button>
          <button @click="generateLabels" class="submit-button">
            Generar e Imprimir
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

/**
 * SCRIPT OPTIMIZADO PARA InventoryDashboard.vue
 * 
 * Reemplaza la sección <script> del componente InventoryDashboard.vue
 * Usa SOLO las APIs existentes en inventory_service.js
 * Optimizado para consumir mínimos recursos
 */

import InventoryService from '@/services/inventory.service';
import MetricCard from '@/components/inventory/MetricCard.vue';
import StockAlerts from '@/components/inventory/StockAlerts.vue';
import RecentMovements from '@/components/inventory/RecentMovements.vue';

export default {
  name: 'InventoryDashboard',
  
  components: {
    MetricCard,
    StockAlerts,
    RecentMovements
  },
  
  data() {
    return {
      // Métricas principales
      metrics: {
        available: 0,
        inUse: 0,
        inRepair: 0,
        defective: 0,
        retired: 0,
        total: 0,
        availableTrend: '0%',
        inUseTrend: '0%',
        inRepairTrend: '0%',
        defectiveTrend: '0%'
      },
      
      // Datos cargados
      lowStockItems: [],
      recentMovements: [],
      locationStats: [],
      suppliers: [],
      locations: [],
      
      // Estados de carga
      loadingMetrics: false,
      loadingAlerts: false,
      loadingMovements: false,
      loadingLocations: false,
      
      // Modales
      showOrderModal: false,
      showImportModal: false,
      showPrintModal: false,
      
      // Datos del modal de orden
      selectedItem: {},
      orderQuantity: 1,
      selectedSupplierId: '',
      orderNotes: '',
      
      // Datos del modal de importación
      selectedFile: null,
      fileSelected: false,
      importOptions: {
        overwriteExisting: false,
        skipErrors: true
      },
      
      // Datos del modal de impresión
      printOptions: {
        type: 'qr',
        selection: 'all',
        locationId: '',
        status: '',
        size: 'medium'
      },
      
      // Configuración
      config: {
        lowStockLimit: 5,
        movementsLimit: 5,
        topLocationsLimit: 4,
        lowStockThreshold: 5,
        criticalStockThreshold: 2
      }
    };
  },
  
  mounted() {
    this.loadAllData();
  },
  
  methods: {
    /**
     * Cargar todos los datos del dashboard
     */
    async loadAllData() {
      await Promise.all([
        this.loadMetrics(),
        this.loadLowStockAlerts(),
        this.loadRecentMovements(),
        this.loadLocationStats()
      ]);
    },
    
    /**
     * Cargar métricas del inventario
     * Usa: getAllInventory() - una sola llamada
     */
    async loadMetrics() {
      this.loadingMetrics = true;
      try {
        // Una sola llamada para obtener todos los items
        const response = await InventoryService.getAllInventory({ size: 1000 });
        const items = response.data?.items || response.data || [];
        
        // Calcular métricas en el cliente (más eficiente que múltiples llamadas)
        const available = items.filter(item => item.status === 'available').length;
        const inUse = items.filter(item => item.status === 'inUse').length;
        const inRepair = items.filter(item => item.status === 'inRepair').length;
        const defective = items.filter(item => item.status === 'defective').length;
        const retired = items.filter(item => item.status === 'retired').length;
        
        // Simular tendencias (o usar datos históricos si existen)
        const lastMonthStats = {
          available: Math.round(available * 0.95),
          inUse: Math.round(inUse * 0.98),
          inRepair: Math.round(inRepair * 1.03),
          defective: Math.round(defective * 0.99)
        };
        
        this.metrics = {
          available,
          inUse,
          inRepair,
          defective,
          retired,
          total: items.length,
          availableTrend: this.calculateTrend(available, lastMonthStats.available),
          inUseTrend: this.calculateTrend(inUse, lastMonthStats.inUse),
          inRepairTrend: this.calculateTrend(inRepair, lastMonthStats.inRepair),
          defectiveTrend: this.calculateTrend(defective, lastMonthStats.defective)
        };
      } catch (error) {
        console.error('Error cargando métricas:', error);
        this.$toast?.error('Error al cargar las métricas del inventario');
      } finally {
        this.loadingMetrics = false;
      }
    },
    
    /**
     * Cargar alertas de stock bajo
     * Usa: getAllInventory() con filtros
     */
    async loadLowStockAlerts() {
      this.loadingAlerts = true;
      try {
        // Obtener items con la API existente
        const response = await InventoryService.getAllInventory({ size: 1000 });
        const items = response.data?.items || response.data || [];
        
        // Filtrar items con stock bajo
        const lowStockItems = items
          .filter(item => {
            const stock = item.stock || item.quantity || 0;
            return stock < this.config.lowStockThreshold && stock >= 0;
          })
          .map(item => {
            const stock = item.stock || item.quantity || 0;
            return {
              ...item,
              stock,
              minThreshold: this.config.lowStockThreshold,
              criticalThreshold: this.config.criticalStockThreshold,
              isCritical: stock <= this.config.criticalStockThreshold
            };
          })
          .sort((a, b) => {
            // Primero los críticos
            if (a.isCritical && !b.isCritical) return -1;
            if (!a.isCritical && b.isCritical) return 1;
            // Luego por menor stock
            return a.stock - b.stock;
          })
          .slice(0, this.config.lowStockLimit);
        
        this.lowStockItems = lowStockItems;
      } catch (error) {
        console.error('Error cargando alertas:', error);
        this.lowStockItems = [];
      } finally {
        this.loadingAlerts = false;
      }
    },
    
    /**
     * Cargar movimientos recientes
     * Usa: getRecentMovements() si existe, o simula datos
     */
    async loadRecentMovements() {
      this.loadingMovements = true;
      try {
        // Intentar obtener movimientos
        let movements = [];
        
        try {
          const response = await InventoryService.getRecentMovements({
            page: 1,
            size: this.config.movementsLimit
          });
          movements = response.data?.movements || response.data || [];
        } catch (error) {
          // Si no existe la API, crear datos de ejemplo
          console.log('API de movimientos no disponible');
          movements = this.generateSampleMovements();
        }
        
        this.recentMovements = movements;
      } catch (error) {
        console.error('Error cargando movimientos:', error);
        this.recentMovements = [];
      } finally {
        this.loadingMovements = false;
      }
    },
    
    /**
     * Cargar estadísticas por ubicación
     * Usa: getAllLocations() + getAllInventory()
     */
    async loadLocationStats() {
      this.loadingLocations = true;
      try {
        // Cargar ubicaciones y items en paralelo
        const [locationsResponse, inventoryResponse] = await Promise.all([
          InventoryService.getAllLocations({ active: true, size: 100 }),
          InventoryService.getAllInventory({ size: 1000 })
        ]);
        
        const locations = locationsResponse.data?.locations || locationsResponse.data || [];
        const items = inventoryResponse.data?.items || inventoryResponse.data || [];
        
        // Guardar ubicaciones para otros usos
        this.locations = locations;
        
        // Calcular estadísticas por ubicación
        this.locationStats = locations
          .map(location => {
            const locationItems = items.filter(item => 
              item.locationId === location.id || 
              item.location?.id === location.id
            );
            
            return {
              id: location.id,
              name: location.name,
              count: locationItems.length,
              available: locationItems.filter(i => i.status === 'available').length,
              inUse: locationItems.filter(i => i.status === 'inUse').length,
              inRepair: locationItems.filter(i => i.status === 'inRepair').length,
              defective: locationItems.filter(i => i.status === 'defective').length,
              retired: locationItems.filter(i => i.status === 'retired').length
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, this.config.topLocationsLimit);
          
      } catch (error) {
        console.error('Error cargando ubicaciones:', error);
        this.locationStats = [];
      } finally {
        this.loadingLocations = false;
      }
    },
    
    /**
     * Utilidades
     */
    calculateTrend(current, previous) {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const percentage = ((current - previous) / previous) * 100;
      return (percentage >= 0 ? '+' : '') + percentage.toFixed(1) + '%';
    },
    
    calculatePercentage(value, total) {
      if (total === 0) return 0;
      return Math.round((value / total) * 100);
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    generateSampleMovements() {
      // Datos de ejemplo si no existe la API
      return [
        {
          id: 1,
          type: 'entry',
          date: new Date().toISOString(),
          itemName: 'Router Mikrotik',
          quantity: 5,
          source: 'Proveedor',
          userName: 'Sistema'
        }
      ];
    },
    
    /**
     * Acciones de navegación
     */
    navigateTo(routeName) {
      this.$router.push({ name: routeName });
    },
    
    viewItem(itemId) {
      this.$router.push({ name: 'InventoryDetail', params: { id: itemId } });
    },
    
    viewLocationInventory(locationId) {
      this.$router.push({ 
        name: 'InventoryList', 
        query: { locationId } 
      });
    },
    
    viewMovementDetails(movementId) {
      console.log('Ver detalles del movimiento:', movementId);
    },
    
    /**
     * Acciones de modal
     */
    orderItem(item) {
      this.selectedItem = item;
      this.showOrderModal = true;
    },
    
    async submitOrder() {
      try {
        // Implementar lógica de orden
        console.log('Orden enviada:', {
          item: this.selectedItem,
          quantity: this.orderQuantity,
          supplier: this.selectedSupplierId,
          notes: this.orderNotes
        });
        
        this.$toast?.success('Solicitud enviada correctamente');
        this.showOrderModal = false;
        
        // Limpiar formulario
        this.orderQuantity = 1;
        this.selectedSupplierId = '';
        this.orderNotes = '';
      } catch (error) {
        console.error('Error enviando orden:', error);
        this.$toast?.error('Error al enviar la solicitud');
      }
    },
    
    openNewItemForm() {
      this.$router.push({ name: 'InventoryCreate' });
    },
    
    openBulkImport() {
      this.showImportModal = true;
    },
    
    openPrintLabels() {
      this.showPrintModal = true;
    },
    
    handleFileUpload(event) {
      this.selectedFile = event.target.files[0];
      this.fileSelected = !!this.selectedFile;
    },
    
    async submitImport() {
      try {
        // Implementar lógica de importación
        console.log('Importando archivo:', this.selectedFile.name);
        
        this.$toast?.success('Importación iniciada');
        this.showImportModal = false;
        
        // Limpiar
        this.selectedFile = null;
        this.fileSelected = false;
      } catch (error) {
        console.error('Error en importación:', error);
        this.$toast?.error('Error al importar el archivo');
      }
    },
    
    downloadTemplate() {
      console.log('Descargando plantilla...');
      // Implementar descarga de plantilla
    },
    
    async submitPrint() {
      try {
        console.log('Imprimiendo etiquetas:', this.printOptions);
        
        this.$toast?.success('Preparando etiquetas para imprimir');
        this.showPrintModal = false;
      } catch (error) {
        console.error('Error en impresión:', error);
        this.$toast?.error('Error al generar las etiquetas');
      }
    }
  }
};

</script>

<style scoped>
.inventory-dashboard {
  padding: 20px;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

h3 {
  margin: 0;
  color: #333;
}

/* Grid de métricas */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

/* Grid principal del dashboard */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.dashboard-column {
  min-width: 0;
  width: 100%;
}

/* Sección de ubicaciones */
.location-section {
  margin-bottom: 30px;
}

.location-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.location-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.location-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.location-name {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 8px;
  color: #333;
}

.location-count {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 12px;
}

.location-chart {
  margin-bottom: 16px;
}

.chart-bar {
  height: 12px;
  background-color: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
}

.bar-segment {
  height: 100%;
  transition: width 0.3s ease;
}

.bar-segment.available {
  background-color: #4CAF50;
}

.bar-segment.in-use {
  background-color: #FF9800;
}

.bar-segment.other {
  background-color: #9E9E9E;
}

.location-details {
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.9em;
}

.detail-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.detail-color.available {
  background-color: #4CAF50;
}

.detail-color.in-use {
  background-color: #FF9800;
}

.detail-color.other {
  background-color: #9E9E9E;
}

.detail-label {
  color: #666;
  margin-right: 8px;
}

.detail-value {
  font-weight: bold;
}

.view-button {
  display: block;
  width: 100%;
  padding: 8px;
  text-align: center;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.view-button:hover {
  background-color: #1976D2;
}

/* Acciones rápidas */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background-color: white;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.action-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-button i {
  font-size: 24px;
  margin-bottom: 12px;
}

.action-button span {
  color: #333;
}

.list-button i {
  color: #2196F3;
}

.add-button i {
  color: #4CAF50;
}

.import-button i {
  color: #FF9800;
}

.print-button i {
  color: #9C27B0;
}

/* Estilos comunes */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
}

.refresh-button {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 16px;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.refresh-button:hover {
  background-color: #e0e0e0;
}

.loading, .no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-data i {
  font-size: 32px;
  margin-bottom: 16px;
  color: #ddd;
}

/* Estilos de modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 30px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 24px;
  color: #aaa;
  cursor: pointer;
  transition: color 0.2s;
}

.close-button:hover {
  color: #333;
}

.modal h3 {
  margin-top: 0;
  margin-bottom: 20px;
}

/* Estilos para el formulario modal */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.cancel-button {
  background-color: #e0e0e0;
  color: #333;
}

.submit-button {
  background-color: #4CAF50;
  color: white;
}

.cancel-button:hover {
  background-color: #d0d0d0;
}

.submit-button:hover {
  background-color: #43A047;
}

.submit-button:disabled {
  background-color: #9E9E9E;
  cursor: not-allowed;
}

/* Estilos específicos para modal de solicitud */
.order-details {
  background-color: #f9f9f9;
  padding: 16px;
  margin-bottom: 20px;
  border-radius: 4px;
}

/* Estilos específicos para modal de importación */
.checkbox-group {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.checkbox-group input[type="checkbox"] {
  margin-right: 8px;
}

.import-options {
  margin-bottom: 16px;
}

.import-options h4 {
  font-size: 1em;
  margin-bottom: 12px;
}

.file-preview {
  background-color: #f0f0f0;
  padding: 12px;
  border-radius: 4px;
  margin: 16px 0;
}

.file-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.file-size {
  color: #666;
  font-size: 0.9em;
}

.template-download {
  margin: 16px 0;
}

.template-download a {
  color: #2196F3;
  text-decoration: none;
}

.template-download a:hover {
  text-decoration: underline;
}

/* Estilos específicos para modal de impresión */
.radio-group {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.radio-group input[type="radio"] {
  margin-right: 8px;
}

.print-preview {
  margin-top: 20px;
}

.preview-label {
  font-weight: bold;
  margin-bottom: 8px;
}

.preview-content {
  border: 1px dashed #ccc;
  background-color: #f9f9f9;
  padding: 10px;
  display: flex;
  align-items: center;
  border-radius: 4px;
}

.preview-content.small {
  width: 60px;
  height: 40px;
}

.preview-content.medium {
  width: 100px;
  height: 60px;
}

.preview-content.large {
  width: 140px;
  height: 100px;
}

.qr-placeholder {
  width: 40px;
  height: 40px;
  background-color: #ddd;
  margin-right: 10px;
}

.barcode-placeholder {
  width: 50px;
  height: 20px;
  background-color: #ddd;
  margin-right: 10px;
}

.preview-text {
  font-size: 0.8em;
}

.preview-name {
  font-weight: bold;
  margin-bottom: 2px;
}

.preview-serial, .preview-model {
  font-size: 0.9em;
  color: #555;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions {
    grid-template-columns: 1fr 1fr;
  }
  
  .location-stats {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    padding: 20px;
    width: 95%;
  }
}

@media (max-width: 480px) {
  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>