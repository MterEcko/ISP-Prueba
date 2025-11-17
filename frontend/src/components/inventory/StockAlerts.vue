<template>
  <div class="stock-alerts">
    <div class="alerts-header">
      <div class="header-title">
        <h2>Alertas de Inventario</h2>
        <p>Monitoreo de stock, equipos, garantías y mantenimientos</p>
      </div>
      <div class="header-actions">
        <button class="btn-refresh" @click="refreshAlerts" :disabled="loading" title="Actualizar alertas">
          <i class="icon-refresh" :class="{ 'spin': loading }"></i>
          <span>Actualizar</span>
        </button>
        <button class="btn-configure" @click="showConfigPanel = !showConfigPanel" title="Configurar alertas">
          <i class="icon-settings"></i>
          <span>Configurar</span>
        </button>
      </div>
    </div>
    
    <!-- Panel de configuración de alertas -->
    <div v-if="showConfigPanel" class="alerts-config-panel">
      <div class="panel-header">
        <h3>Configuración de Alertas</h3>
        <button class="btn-close" @click="showConfigPanel = false">
          <i class="icon-x"></i>
        </button>
      </div>
      
      <div class="panel-body">
        <div class="config-section">
          <h4>Umbrales y Preferencias</h4>
          
          <div class="config-grid">
            <div class="config-item">
              <label>
                Alerta de stock bajo cuando quedan menos de
                <input 
                  type="number" 
                  v-model="alertsConfig.lowStockThreshold" 
                  min="1" 
                  max="100"
                  class="number-input"
                /> unidades
              </label>
            </div>
            
            <div class="config-item">
              <label>
                Alerta de garantía cuando faltan menos de
                <input 
                  type="number" 
                  v-model="alertsConfig.warrantyThresholdDays" 
                  min="1" 
                  max="365"
                  class="number-input"
                /> días para vencer
              </label>
            </div>
            
            <div class="config-item">
              <label>
                Alerta de mantenimiento cuando faltan menos de
                <input 
                  type="number" 
                  v-model="alertsConfig.maintenanceThresholdDays" 
                  min="1" 
                  max="365"
                  class="number-input"
                /> días para la próxima revisión
              </label>
            </div>
            
            <div class="config-item">
              <label>
                <input type="checkbox" v-model="alertsConfig.showResolvedAlerts" />
                Mostrar alertas resueltas (hasta 7 días)
              </label>
            </div>
          </div>
        </div>
        
        <div class="config-section">
          <h4>Notificaciones</h4>
          
          <div class="config-grid">
            <div class="config-item">
              <label>
                <input type="checkbox" v-model="alertsConfig.emailNotifications" />
                Enviar notificaciones por correo
              </label>
            </div>
            
            <div class="config-item">
              <label>
                <input type="checkbox" v-model="alertsConfig.telegramNotifications" />
                Enviar notificaciones por Telegram
              </label>
            </div>
            
            <div class="config-item">
              <label>Frecuencia de resumen:</label>
              <select v-model="alertsConfig.digestFrequency">
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="never">No enviar</option>
              </select>
            </div>
            
            <div class="config-item">
              <label>
                <input type="checkbox" v-model="alertsConfig.criticalAlertsOnly" />
                Solo notificar alertas críticas
              </label>
            </div>
          </div>
        </div>
        
        <div class="config-section">
          <h4>Destinatarios de Notificaciones</h4>
          
          <div class="recipients-list">
            <div 
              v-for="(recipient, index) in alertsConfig.recipients" 
              :key="index"
              class="recipient-item"
            >
              <div class="recipient-info">
                <span class="recipient-name">{{ recipient.name }}</span>
                <span class="recipient-email">{{ recipient.email }}</span>
                <span :class="['recipient-type', recipient.active ? 'active' : 'inactive']">
                  {{ recipient.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
              <div class="recipient-actions">
                <button 
                  class="btn-icon" 
                  @click="toggleRecipientStatus(index)"
                  :title="recipient.active ? 'Desactivar' : 'Activar'"
                >
                  <i :class="recipient.active ? 'icon-toggle-right' : 'icon-toggle-left'"></i>
                </button>
                <button class="btn-icon" @click="removeRecipient(index)" title="Eliminar">
                  <i class="icon-trash-2"></i>
                </button>
              </div>
            </div>
            
            <!-- Formulario para agregar destinatario -->
            <div class="add-recipient-form" v-if="showAddRecipientForm">
              <div class="form-group">
                <label>Nombre:</label>
                <input type="text" v-model="newRecipient.name" placeholder="Nombre" />
              </div>
              <div class="form-group">
                <label>Correo electrónico:</label>
                <input type="email" v-model="newRecipient.email" placeholder="correo@ejemplo.com" />
              </div>
              <div class="form-actions">
                <button class="btn-outline" @click="cancelAddRecipient">Cancelar</button>
                <button class="btn-primary" @click="addRecipient" :disabled="!isValidRecipient">Agregar</button>
              </div>
            </div>
            
            <!-- Botón para mostrar formulario -->
            <button v-if="!showAddRecipientForm" class="btn-add-recipient" @click="showAddRecipientForm = true">
              <i class="icon-plus"></i> Agregar destinatario
            </button>
          </div>
        </div>
        
        <div class="config-actions">
          <button class="btn-outline" @click="resetConfig">
            Restaurar valores predeterminados
          </button>
          <button class="btn-primary" @click="saveConfig">
            Guardar configuración
          </button>
        </div>
      </div>
    </div>
    
    <!-- Filtros de alertas -->
    <div class="alerts-filters">
      <div class="filter-group">
        <label>Nivel:</label>
        <div class="filter-buttons">
          <button
            class="filter-button"
            :class="{ active: activeFilters.level === 'all' }"
            @click="setLevelFilter('all')"
          >
            Todas
          </button>
          <button
            class="filter-button critical"
            :class="{ active: activeFilters.level === 'critical' }"
            @click="setLevelFilter('critical')"
          >
            Críticas
          </button>
          <button
            class="filter-button warning"
            :class="{ active: activeFilters.level === 'warning' }"
            @click="setLevelFilter('warning')"
          >
            Advertencias
          </button>
          <button
            class="filter-button info"
            :class="{ active: activeFilters.level === 'info' }"
            @click="setLevelFilter('info')"
          >
            Información
          </button>
        </div>
      </div>
      
      <div class="filter-group">
        <label>Tipo:</label>
        <select v-model="activeFilters.type" @change="applyFilters">
          <option value="all">Todos los tipos</option>
          <option value="stock">Stock bajo</option>
          <option value="warranty">Garantía</option>
          <option value="maintenance">Mantenimiento</option>
          <option value="equipment">Equipos</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>Estado:</label>
        <select v-model="activeFilters.status" @change="applyFilters">
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="resolved">Resueltas</option>
          <option value="acknowledged">Confirmadas</option>
        </select>
      </div>
      
      <button 
        v-if="hasActiveFilters" 
        class="btn-clear-filters" 
        @click="clearFilters"
      >
        <i class="icon-x"></i> Limpiar filtros
      </button>
    </div>
    
    <!-- Lista de alertas -->
    <div v-if="loading" class="alerts-loading">
      <div class="spinner"></div>
      <p>Cargando alertas...</p>
    </div>
    
    <div v-else-if="filteredAlerts.length === 0" class="alerts-empty">
      <div class="empty-icon">
        <i class="icon-check-circle"></i>
      </div>
      <h3>No hay alertas {{ hasActiveFilters ? 'que coincidan con los filtros' : 'activas' }}</h3>
      <p>{{ hasActiveFilters ? 'Intenta cambiar los filtros o' : 'Todo está funcionando correctamente.' }}</p>
      <button v-if="hasActiveFilters" class="btn-secondary" @click="clearFilters">
        Limpiar filtros
      </button>
    </div>
    
    <div v-else class="alerts-list">
      <div 
        v-for="(alert, index) in filteredAlerts" 
        :key="alert.id"
        class="alert-card"
        :class="[
          getAlertLevelClass(alert.level),
          { 'resolved': alert.status === 'resolved' }
        ]"
      >
        <div class="alert-icon">
          <i :class="getAlertTypeIcon(alert.type)"></i>
        </div>
        
        <div class="alert-content">
          <div class="alert-header">
            <div class="alert-title-wrapper">
              <h3 class="alert-title">{{ alert.title }}</h3>
              <span :class="['alert-badge', getAlertLevelClass(alert.level)]">
                {{ getAlertLevelLabel(alert.level) }}
              </span>
              <span v-if="alert.status === 'resolved'" class="status-badge resolved">
                Resuelta
              </span>
              <span v-else-if="alert.status === 'acknowledged'" class="status-badge acknowledged">
                Confirmada
              </span>
            </div>
            <div class="alert-date">{{ formatDate(alert.date) }}</div>
          </div>
          
          <div class="alert-body">
            <p class="alert-message">{{ alert.message }}</p>
            
            <div v-if="alert.item" class="alert-item-details">
              <div class="item-detail">
                <i class="icon-box"></i>
                <span>{{ alert.item.name }}</span>
              </div>
              <div class="item-detail" v-if="alert.item.serialNumber">
                <i class="icon-hash"></i>
                <span>{{ alert.item.serialNumber }}</span>
              </div>
              <div class="item-detail" v-if="alert.item.location">
                <i class="icon-map-pin"></i>
                <span>{{ getLocationName(alert.item.location) }}</span>
              </div>
            </div>
            
            <div v-if="alert.actionRequired" class="alert-action-required">
              <i class="icon-alert-circle"></i>
              <span>Acción requerida: {{ alert.actionRequired }}</span>
            </div>
          </div>
          
          <div class="alert-footer">
            <div class="alert-metadata">
              <span class="alert-type">{{ getAlertTypeLabel(alert.type) }}</span>
              <span v-if="alert.assignedTo" class="alert-assigned">
                Asignada a: {{ getUserName(alert.assignedTo) }}
              </span>
            </div>
            
            <div class="alert-actions">
              <button 
                v-if="alert.status === 'active'"
                class="btn-outline btn-sm" 
                @click="acknowledgeAlert(alert, index)"
              >
                <i class="icon-check"></i> Confirmar
              </button>
              <button 
                v-if="['active', 'acknowledged'].includes(alert.status)"
                class="btn-primary btn-sm" 
                @click="resolveAlert(alert, index)"
              >
                <i class="icon-check-circle"></i> Resolver
              </button>
              <button
                v-if="alert.item"
                class="btn-outline btn-sm" 
                @click="viewItem(alert.item)"
              >
                <i class="icon-eye"></i> Ver elemento
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Paginación -->
      <div v-if="totalPages > 1" class="alerts-pagination">
        <button 
          class="btn-page" 
          :disabled="currentPage === 1" 
          @click="prevPage"
        >
          <i class="icon-chevron-left"></i> Anterior
        </button>
        
        <div class="page-indicator">
          Página {{ currentPage }} de {{ totalPages }}
        </div>
        
        <button 
          class="btn-page" 
          :disabled="currentPage === totalPages" 
          @click="nextPage"
        >
          Siguiente <i class="icon-chevron-right"></i>
        </button>
      </div>
    </div>
    
    <!-- Resumen de alertas -->
    <div class="alerts-summary">
      <div class="summary-title">Resumen</div>
      <div class="summary-items">
        <div class="summary-item critical">
          <div class="summary-count">{{ alertCounts.critical }}</div>
          <div class="summary-label">Críticas</div>
        </div>
        
        <div class="summary-item warning">
          <div class="summary-count">{{ alertCounts.warning }}</div>
          <div class="summary-label">Advertencias</div>
        </div>
        
        <div class="summary-item info">
          <div class="summary-count">{{ alertCounts.info }}</div>
          <div class="summary-label">Información</div>
        </div>
        
        <div class="summary-item total">
          <div class="summary-count">{{ alertCounts.total }}</div>
          <div class="summary-label">Total</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted } from 'vue';

export default {
  name: 'StockAlerts',
  props: {
    /**
     * Lista de ubicaciones disponibles
     */
    locations: {
      type: Array,
      default: () => [
        { id: 'headquarters', name: 'Oficina Central' },
        { id: 'warehouse', name: 'Almacén Principal' },
        { id: 'north-tower', name: 'Torre Norte' },
        { id: 'south-tower', name: 'Torre Sur' },
        { id: 'client-site', name: 'Sitio Cliente' }
      ]
    },
    /**
     * Lista de usuarios para asignación
     */
    users: {
      type: Array,
      default: () => [
        { id: 'user1', name: 'Carlos Mendez' },
        { id: 'user2', name: 'María López' },
        { id: 'user3', name: 'Jorge Suárez' },
        { id: 'user4', name: 'Ana Castro' },
        { id: 'user5', name: 'Roberto Díaz' }
      ]
    }
  },
  emits: ['view-item', 'refresh-inventory', 'alert-status-changed'],
  setup(props, { emit }) {
    // Estado del componente
    const loading = ref(false);
    const alerts = ref([]);
    const filteredAlerts = ref([]);
    const currentPage = ref(1);
    const itemsPerPage = ref(10);
    const showConfigPanel = ref(false);
    const showAddRecipientForm = ref(false);
    
    // Configuración de alertas
    const alertsConfig = reactive({
      lowStockThreshold: 5,
      warrantyThresholdDays: 30,
      maintenanceThresholdDays: 14,
      showResolvedAlerts: true,
      emailNotifications: true,
      telegramNotifications: false,
      digestFrequency: 'weekly',
      criticalAlertsOnly: false,
      recipients: [
        { name: 'Administrador', email: 'admin@empresa.com', active: true },
        { name: 'Soporte Técnico', email: 'soporte@empresa.com', active: true }
      ]
    });
    
    // Nuevo destinatario
    const newRecipient = reactive({
      name: '',
      email: '',
      active: true
    });
    
    // Filtros activos
    const activeFilters = reactive({
      level: 'all',
      type: 'all',
      status: 'active'
    });
    
    // Contadores de alertas
    const alertCounts = reactive({
      critical: 0,
      warning: 0,
      info: 0,
      total: 0
    });
    
    // Computed properties
    const totalPages = computed(() => {
      return Math.ceil(filteredAlerts.value.length / itemsPerPage.value);
    });
    
    const paginatedAlerts = computed(() => {
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;
      return filteredAlerts.value.slice(startIndex, endIndex);
    });
    
    const hasActiveFilters = computed(() => {
      return activeFilters.level !== 'all' || 
             activeFilters.type !== 'all' || 
             activeFilters.status !== 'all';
    });
    
    const isValidRecipient = computed(() => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return newRecipient.name.trim() !== '' && 
             emailRegex.test(newRecipient.email.trim());
    });
    
    // Métodos
    function refreshAlerts() {
      loading.value = true;
      
      // Simular llamada a API
      setTimeout(() => {
        alerts.value = getMockAlerts();
        applyFilters();
        updateAlertCounts();
        loading.value = false;
      }, 1000);
    }
    
    function applyFilters() {
      // Aplicar filtros a las alertas
      filteredAlerts.value = alerts.value.filter(alert => {
        // Filtro por nivel
        if (activeFilters.level !== 'all' && alert.level !== activeFilters.level) {
          return false;
        }
        
        // Filtro por tipo
        if (activeFilters.type !== 'all' && alert.type !== activeFilters.type) {
          return false;
        }
        
        // Filtro por estado
        if (activeFilters.status !== 'all' && alert.status !== activeFilters.status) {
          return false;
        }
        
        return true;
      });
      
      // Restablecer paginación
      currentPage.value = 1;
    }
    
    function setLevelFilter(level) {
      activeFilters.level = level;
      applyFilters();
    }
    
    function clearFilters() {
      activeFilters.level = 'all';
      activeFilters.type = 'all';
      activeFilters.status = 'all';
      applyFilters();
    }
    
    function updateAlertCounts() {
      // Contar alertas por nivel
      alertCounts.critical = alerts.value.filter(a => a.level === 'critical' && a.status !== 'resolved').length;
      alertCounts.warning = alerts.value.filter(a => a.level === 'warning' && a.status !== 'resolved').length;
      alertCounts.info = alerts.value.filter(a => a.level === 'info' && a.status !== 'resolved').length;
      alertCounts.total = alertCounts.critical + alertCounts.warning + alertCounts.info;
    }
    
    function acknowledgeAlert(alert, index) {
      // Actualizar estado de la alerta
      alert.status = 'acknowledged';
      
      // Emitir evento de cambio de estado
      emit('alert-status-changed', {
        alertId: alert.id,
        status: 'acknowledged',
        prevStatus: 'active'
      });
      
      // En una implementación real, aquí se llamaría a la API
    }
    
    function resolveAlert(alert, index) {
      // Actualizar estado de la alerta
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      
      // Emitir evento de cambio de estado
      emit('alert-status-changed', {
        alertId: alert.id,
        status: 'resolved',
        prevStatus: alert.status
      });
      
      // Actualizar contadores
      updateAlertCounts();
      
      // En una implementación real, aquí se llamaría a la API
    }
    
    function viewItem(item) {
      // Emitir evento para ver detalles del elemento
      emit('view-item', item);
    }
    
    function prevPage() {
      if (currentPage.value > 1) {
        currentPage.value--;
      }
    }
    
    function nextPage() {
      if (currentPage.value < totalPages.value) {
        currentPage.value++;
      }
    }
    
    function getAlertLevelClass(level) {
      const classes = {
        'critical': 'level-critical',
        'warning': 'level-warning',
        'info': 'level-info'
      };
      
      return classes[level] || '';
    }
    
    function getAlertLevelLabel(level) {
      const labels = {
        'critical': 'Crítica',
        'warning': 'Advertencia',
        'info': 'Información'
      };
      
      return labels[level] || level;
    }
    
    function getAlertTypeIcon(type) {
      const icons = {
        'stock': 'icon-box',
        'warranty': 'icon-shield',
        'maintenance': 'icon-tool',
        'equipment': 'icon-cpu'
      };
      
      return icons[type] || 'icon-alert-triangle';
    }
    
    function getAlertTypeLabel(type) {
      const labels = {
        'stock': 'Stock Bajo',
        'warranty': 'Garantía',
        'maintenance': 'Mantenimiento',
        'equipment': 'Equipos'
      };
      
      return labels[type] || type;
    }
    
    function getLocationName(locationId) {
      const location = props.locations.find(l => l.id === locationId);
      return location ? location.name : locationId;
    }
    
    function getUserName(userId) {
      const user = props.users.find(u => u.id === userId);
      return user ? user.name : userId;
    }
    
    function formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // Gestión de destinatarios
    function addRecipient() {
      if (isValidRecipient.value) {
        alertsConfig.recipients.push({ ...newRecipient });
        cancelAddRecipient();
      }
    }
    
    function removeRecipient(index) {
      alertsConfig.recipients.splice(index, 1);
    }
    
    function toggleRecipientStatus(index) {
      alertsConfig.recipients[index].active = !alertsConfig.recipients[index].active;
    }
    
    function cancelAddRecipient() {
      newRecipient.name = '';
      newRecipient.email = '';
      newRecipient.active = true;
      showAddRecipientForm.value = false;
    }
    
    // Gestión de la configuración
    function saveConfig() {
      // Guardar configuración en localStorage
      localStorage.setItem('alertsConfig', JSON.stringify(alertsConfig));
      showConfigPanel.value = false;
      
      // En una implementación real, aquí se llamaría a la API
      // Refrescar alertas con la nueva configuración
      refreshAlerts();
    }
    
    function resetConfig() {
      // Restablecer valores predeterminados
      alertsConfig.lowStockThreshold = 5;
      alertsConfig.warrantyThresholdDays = 30;
      alertsConfig.maintenanceThresholdDays = 14;
      alertsConfig.showResolvedAlerts = true;
      alertsConfig.emailNotifications = true;
      alertsConfig.telegramNotifications = false;
      alertsConfig.digestFrequency = 'weekly';
      alertsConfig.criticalAlertsOnly = false;
      alertsConfig.recipients = [
        { name: 'Administrador', email: 'admin@empresa.com', active: true },
        { name: 'Soporte Técnico', email: 'soporte@empresa.com', active: true }
      ];
    }
    
    function loadConfig() {
      // Cargar configuración desde localStorage
      const savedConfig = localStorage.getItem('alertsConfig');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          
          // Asignar propiedades una a una para evitar problemas si la estructura cambió
          alertsConfig.lowStockThreshold = config.lowStockThreshold || 5;
          alertsConfig.warrantyThresholdDays = config.warrantyThresholdDays || 30;
          alertsConfig.maintenanceThresholdDays = config.maintenanceThresholdDays || 14;
          alertsConfig.showResolvedAlerts = config.showResolvedAlerts !== undefined ? config.showResolvedAlerts : true;
          alertsConfig.emailNotifications = config.emailNotifications !== undefined ? config.emailNotifications : true;
          alertsConfig.telegramNotifications = config.telegramNotifications || false;
          alertsConfig.digestFrequency = config.digestFrequency || 'weekly';
          alertsConfig.criticalAlertsOnly = config.criticalAlertsOnly || false;
          
          // Restaurar receptores si existen
          if (Array.isArray(config.recipients) && config.recipients.length > 0) {
            alertsConfig.recipients = config.recipients;
          }
        } catch (error) {
          console.error('Error al cargar configuración:', error);
        }
      }
    }
    
    // Datos de prueba
    function getMockAlerts() {
      return [
        {
          id: 1,
          title: 'Stock crítico de Router Mikrotik',
          message: 'Quedan solo 2 unidades de este producto en el almacén principal.',
          level: 'critical',
          type: 'stock',
          status: 'active',
          date: '2025-10-27T08:30:00',
          actionRequired: 'Realizar pedido a proveedor',
          assignedTo: 'user1',
          item: {
            id: 'INV-001',
            name: 'Router Mikrotik hAP ac³',
            serialNumber: null,
            category: 'network',
            location: 'warehouse'
          }
        },
        {
          id: 2,
          title: 'Garantía por vencer',
          message: 'La garantía del Switch Cisco SG350-28 vence en 24 días.',
          level: 'warning',
          type: 'warranty',
          status: 'active',
          date: '2025-10-26T15:45:00',
          actionRequired: 'Evaluar renovación de garantía',
          assignedTo: 'user3',
          item: {
            id: 'INV-002',
            name: 'Switch Cisco SG350-28',
            serialNumber: 'CSC-92837465',
            category: 'network',
            location: 'headquarters'
          }
        },
        {
          id: 3,
          title: 'Mantenimiento programado',
          message: 'Mantenimiento preventivo de Router Mikrotik debe realizarse en 10 días.',
          level: 'info',
          type: 'maintenance',
          status: 'acknowledged',
          date: '2025-10-25T09:15:00',
          actionRequired: 'Programar visita técnica',
          assignedTo: 'user2',
          item: {
            id: 'INV-005',
            name: 'Router Mikrotik RB2011UiAS-2HnD',
            serialNumber: 'MTK-65748392',
            category: 'network',
            location: 'south-tower'
          }
        },
        {
          id: 4,
          title: 'Equipo reportado como defectuoso',
          message: 'Teléfono IP Yealink T54W ha sido marcado como defectuoso.',
          level: 'critical',
          type: 'equipment',
          status: 'resolved',
          date: '2025-10-23T11:20:00',
          resolvedAt: '2025-10-25T16:45:00',
          actionRequired: 'Evaluar reparación o reemplazo',
          assignedTo: 'user4',
          item: {
            id: 'INV-008',
            name: 'Teléfono IP Yealink T54W',
            serialNumber: 'YLK-45678912',
            category: 'telecom',
            location: 'warehouse'
          }
        },
        {
          id: 5,
          title: 'Stock bajo de conectores RJ45',
          message: 'Quedan solo 8 unidades de conectores RJ45 CAT6 en inventario.',
          level: 'warning',
          type: 'stock',
          status: 'active',
          date: '2025-10-22T14:10:00',
          actionRequired: 'Reordenar inventario',
          assignedTo: 'user1',
          item: {
            id: 'SUP-023',
            name: 'Conector RJ45 CAT6',
            serialNumber: null,
            category: 'supplies',
            location: 'warehouse'
          }
        },
        {
          id: 6,
          title: 'Garantía vencida',
          message: 'La garantía de la impresora HP LaserJet ha vencido hoy.',
          level: 'critical',
          type: 'warranty',
          status: 'active',
          date: '2025-10-20T10:00:00',
          actionRequired: 'Renovar garantía inmediatamente',
          assignedTo: 'user5',
          item: {
            id: 'INV-006',
            name: 'Impresora HP LaserJet Pro M404dn',
            serialNumber: 'HPL-87654321',
            category: 'office',
            location: 'headquarters'
          }
        },
        {
          id: 7,
          title: 'Mantenimiento realizado',
          message: 'Mantenimiento preventivo de Antena Ubiquiti completado satisfactoriamente.',
          level: 'info',
          type: 'maintenance',
          status: 'resolved',
          date: '2025-10-18T16:30:00',
          resolvedAt: '2025-10-18T16:30:00',
          actionRequired: null,
          assignedTo: 'user2',
          item: {
            id: 'INV-003',
            name: 'Antena Ubiquiti LiteBeam 5AC',
            serialNumber: 'UBQ-12345678',
            category: 'network',
            location: 'warehouse'
          }
        },
        {
          id: 8,
          title: 'Equipo retirado',
          message: 'Switch Cisco Catalyst 2960 ha sido retirado del servicio por obsolescencia.',
          level: 'info',
          type: 'equipment',
          status: 'resolved',
          date: '2025-10-15T13:45:00',
          resolvedAt: '2025-10-15T15:20:00',
          actionRequired: 'Actualizar inventario',
          assignedTo: 'user3',
          item: {
            id: 'INV-010',
            name: 'Switch Cisco Catalyst 2960',
            serialNumber: 'CSC-43219876',
            category: 'network',
            location: 'headquarters'
          }
        },
        {
          id: 9,
          title: 'Stock agotado de SFP+',
          message: 'Módulos SFP+ 10G agotados en inventario.',
          level: 'critical',
          type: 'stock',
          status: 'acknowledged',
          date: '2025-10-12T09:50:00',
          actionRequired: 'Comprar urgente',
          assignedTo: 'user1',
          item: {
            id: 'SUP-045',
            name: 'Módulo SFP+ 10G',
            serialNumber: null,
            category: 'supplies',
            location: 'warehouse'
          }
        },
        {
          id: 10,
          title: 'Garantía por renovar',
          message: 'Renovación de garantía del servidor HP ProLiant pendiente.',
          level: 'warning',
          type: 'warranty',
          status: 'active',
          date: '2025-10-10T11:25:00',
          actionRequired: 'Contactar representante HP',
          assignedTo: 'user5',
          item: {
            id: 'INV-015',
            name: 'Servidor HP ProLiant DL380 Gen10',
            serialNumber: 'HPL-56781234',
            category: 'server',
            location: 'headquarters'
          }
        },
        {
          id: 11,
          title: 'Próximo mantenimiento UPS',
          message: 'UPS APC Smart-UPS requiere mantenimiento programado.',
          level: 'info',
          type: 'maintenance',
          status: 'active',
          date: '2025-10-05T14:30:00',
          actionRequired: 'Programar servicio técnico APC',
          assignedTo: 'user4',
          item: {
            id: 'INV-020',
            name: 'UPS APC Smart-UPS 3000VA',
            serialNumber: 'APC-98765432',
            category: 'power',
            location: 'headquarters'
          }
        },
        {
          id: 12,
          title: 'Equipo sin respuesta',
          message: 'Router en Torre Norte no responde a ping desde hace 4 horas.',
          level: 'critical',
          type: 'equipment',
          status: 'resolved',
          date: '2025-10-01T07:15:00',
          resolvedAt: '2025-10-01T10:40:00',
          actionRequired: 'Revisar conexión física y reiniciar equipo',
          assignedTo: 'user2',
          item: {
            id: 'INV-001',
            name: 'Router Mikrotik hAP ac³',
            serialNumber: 'MTK-83726554',
            category: 'network',
            location: 'north-tower'
          }
        }
      ];
    }
    
    // Ciclo de vida del componente
    onMounted(() => {
      loadConfig();
      refreshAlerts();
    });
    
    return {
      // Estado
      loading,
      alerts,
      filteredAlerts,
      currentPage,
      itemsPerPage,
      totalPages,
      showConfigPanel,
      alertsConfig,
      activeFilters,
      alertCounts,
      showAddRecipientForm,
      newRecipient,
      
      // Computed
      paginatedAlerts,
      hasActiveFilters,
      isValidRecipient,
      
      // Métodos
      refreshAlerts,
      applyFilters,
      setLevelFilter,
      clearFilters,
      acknowledgeAlert,
      resolveAlert,
      viewItem,
      prevPage,
      nextPage,
      getAlertLevelClass,
      getAlertLevelLabel,
      getAlertTypeIcon,
      getAlertTypeLabel,
      getLocationName,
      getUserName,
      formatDate,
      
      // Destinatarios
      addRecipient,
      removeRecipient,
      toggleRecipientStatus,
      cancelAddRecipient,
      
      // Configuración
      saveConfig,
      resetConfig,
      loadConfig
    };
  }
};
</script>

<style scoped>
.stock-alerts {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  overflow: hidden;
}

/* Header */
.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.header-title h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: var(--text-primary, #333);
}

.header-title p {
  margin: 0;
  color: var(--text-secondary, #666);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-refresh, .btn-configure {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color, #e0e0e0);
}

.btn-refresh {
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-secondary, #666);
}

.btn-refresh:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.btn-configure {
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
  border-color: var(--primary-light, #64b5f6);
}

.btn-configure:hover {
  background-color: var(--primary-lighter, #bbdefb);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Panel de configuración */
.alerts-config-panel {
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  margin: 0 20px 20px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
}

.btn-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.panel-body {
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
}

/* Secciones de configuración */
.config-section {
  margin-bottom: 24px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  padding: 16px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-primary, #333);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  padding-bottom: 8px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.config-item {
  display: flex;
  flex-direction: column;
}

.config-item label {
  font-size: 14px;
  color: var(--text-secondary, #666);
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-item input[type="checkbox"] {
  margin: 0;
  width: 16px;
  height: 16px;
}

.config-item select {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--bg-primary, white);
}

.number-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  margin: 0 6px;
}

/* Destinatarios */
.recipients-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recipient-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-primary, white);
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.recipient-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.recipient-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary, #333);
}

.recipient-email {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.recipient-type {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 12px;
}

.recipient-type.active {
  background-color: rgba(76, 175, 80, 0.1);
  color: #2e7d32;
}

.recipient-type.inactive {
  background-color: rgba(158, 158, 158, 0.1);
  color: #616161;
}

.recipient-actions {
  display: flex;
  gap: 8px;
}

.recipient-actions .btn-icon {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.recipient-actions .btn-icon:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.btn-add-recipient {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background-color: var(--bg-primary, white);
  border: 1px dashed var(--border-color, #e0e0e0);
  border-radius: 6px;
  color: var(--primary-color, #1976d2);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  margin-top: 8px;
}

.btn-add-recipient:hover {
  background-color: var(--primary-lightest, #e3f2fd);
  border-color: var(--primary-light, #64b5f6);
}

/* Formulario de destinatario */
.add-recipient-form {
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  padding: 16px;
  margin-top: 8px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

/* Botones de configuración */
.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-outline {
  padding: 8px 16px;
  background-color: transparent;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  color: var(--text-secondary, #666);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-outline:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.btn-primary {
  padding: 8px 16px;
  background-color: var(--primary-color, #1976d2);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background-color: var(--primary-dark, #1565c0);
}

.btn-primary:disabled,
.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Filtros */
.alerts-filters {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  color: var(--text-secondary, #666);
  white-space: nowrap;
}

.filter-buttons {
  display: flex;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  overflow: hidden;
}

.filter-button {
  padding: 6px 12px;
  background-color: var(--bg-primary, white);
  border: none;
  color: var(--text-secondary, #666);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.filter-button:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 20%;
  right: 0;
  height: 60%;
  width: 1px;
  background-color: var(--border-color, #e0e0e0);
}

.filter-button:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.filter-button.active {
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
}

.filter-button.critical.active {
  background-color: rgba(244, 67, 54, 0.1);
  color: #c62828;
}

.filter-button.warning.active {
  background-color: rgba(255, 152, 0, 0.1);
  color: #ef6c00;
}

.filter-button.info.active {
  background-color: rgba(33, 150, 243, 0.1);
  color: #1565c0;
}

.filter-group select {
  padding: 6px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 13px;
  background-color: var(--bg-primary, white);
}

.btn-clear-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: transparent;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  margin-left: auto;
  transition: all 0.2s ease;
}

.btn-clear-filters:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

/* Estado de carga */
.alerts-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top: 3px solid var(--primary-color, #1976d2);
  border-radius: 50%;
  margin-bottom: 16px;
  animation: spin 1s linear infinite;
}

/* Estado vacío */
.alerts-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background-color: rgba(76, 175, 80, 0.1);
  color: #2e7d32;
  border-radius: 50%;
  font-size: 32px;
  margin-bottom: 16px;
}

.alerts-empty h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.alerts-empty p {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.btn-secondary {
  padding: 8px 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

/* Lista de alertas */
.alerts-list {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.alert-card {
  display: flex;
  gap: 16px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-left: 4px solid transparent;
}

.alert-card.level-critical {
  border-left-color: #f44336;
}

.alert-card.level-warning {
  border-left-color: #ff9800;
}

.alert-card.level-info {
  border-left-color: #2196f3;
}

.alert-card.resolved {
  background-color: var(--bg-secondary, #f5f5f5);
  border-left-color: #4caf50;
  opacity: 0.8;
}

.alert-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 50%;
  color: var(--text-secondary, #666);
  font-size: 24px;
}

.level-critical .alert-icon {
  background-color: rgba(244, 67, 54, 0.1);
  color: #c62828;
}

.level-warning .alert-icon {
  background-color: rgba(255, 152, 0, 0.1);
  color: #ef6c00;
}

.level-info .alert-icon {
  background-color: rgba(33, 150, 243, 0.1);
  color: #1565c0;
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.alert-title-wrapper {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.alert-title {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary, #333);
  font-weight: 600;
}

.alert-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.alert-badge.level-critical {
  background-color: rgba(244, 67, 54, 0.1);
  color: #c62828;
}

.alert-badge.level-warning {
  background-color: rgba(255, 152, 0, 0.1);
  color: #ef6c00;
}

.alert-badge.level-info {
  background-color: rgba(33, 150, 243, 0.1);
  color: #1565c0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.resolved {
  background-color: rgba(76, 175, 80, 0.1);
  color: #2e7d32;
}

.status-badge.acknowledged {
  background-color: rgba(33, 150, 243, 0.1);
  color: #1565c0;
}

.alert-date {
  font-size: 12px;
  color: var(--text-secondary, #666);
  white-space: nowrap;
}

.alert-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-message {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
  line-height: 1.5;
}

.alert-item-details {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  padding: 12px;
}

.item-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-primary, #333);
}

.alert-action-required {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--error-color, #f44336);
  font-weight: 500;
}

.alert-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.alert-metadata {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}

.alert-type {
  color: var(--text-secondary, #666);
}

.alert-assigned {
  color: var(--primary-color, #1976d2);
}

.alert-actions {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 10px;
  font-size: 12px;
}

/* Paginación */
.alerts-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  margin-top: 8px;
}

.btn-page {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-page:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.btn-page:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

/* Resumen de alertas */
.alerts-summary {
  background-color: var(--bg-secondary, #f5f5f5);
  padding: 16px 20px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin-bottom: 12px;
}

.summary-items {
  display: flex;
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color, #e0e0e0);
}

.summary-item.critical {
  border-top: 3px solid #f44336;
}

.summary-item.warning {
  border-top: 3px solid #ff9800;
}

.summary-item.info {
  border-top: 3px solid #2196f3;
}

.summary-item.total {
  border-top: 3px solid var(--primary-color, #1976d2);
}

.summary-count {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.summary-label {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

/* Responsive */
@media (max-width: 768px) {
  .alerts-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .config-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-buttons {
    flex-wrap: wrap;
  }
  
  .alerts-filters {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filter-group {
    width: 100%;
    justify-content: space-between;
  }
  
  .filter-group select {
    flex: 1;
  }
  
  .btn-clear-filters {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }
  
  .alert-card {
    flex-direction: column;
    gap: 12px;
  }
  
  .alert-icon {
    align-self: flex-start;
  }
  
  .alert-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .alert-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .alert-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .summary-items {
    overflow-x: auto;
    padding-bottom: 12px;
  }
}
</style>
