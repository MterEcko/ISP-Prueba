<template>
  <div class="client-list">
    <!-- Header con título y acciones principales -->
    <div class="header">
      <h2>Gestión de Clientes</h2>
      <div class="header-actions">
        <button class="btn-new-client" @click="openNewClientForm">
          + Nuevo Cliente
        </button>
      </div>
    </div>

    <!-- Barra de búsqueda global y filtros principales -->
    <div class="search-filters-section">
      <div class="global-search">
        <input 
          type="text" 
          v-model="globalSearch" 
          placeholder="Búsqueda global (nombre, dirección, teléfono, email...)"
          @keyup.enter="loadClients"
          class="global-search-input"
        />
        <button @click="loadClients" class="search-btn">🔍</button>
      </div>
      
      <div class="main-filters">
        <select v-model="selectedZone" @change="onZoneChange" class="filter-select">
          <option value="">📍 Todas las zonas</option>
          <option v-for="zone in zones" :key="zone.id" :value="zone.id">
            {{ zone.name }}
          </option>
        </select>
        
        <select v-model="selectedNode" @change="onNodeChange" class="filter-select">
          <option value="">🏗️ Todos los nodos</option>
          <option v-for="node in availableNodes" :key="node.id" :value="node.id">
            {{ node.name }}
          </option>
        </select>
        
        <select v-model="selectedSector" @change="loadClients" class="filter-select">
          <option value="">📡 Todos los sectores</option>
          <option v-for="sector in availableSectors" :key="sector.id" :value="sector.id">
            {{ sector.name }}
          </option>
        </select>
        
        <select v-model="selectedStatus" @change="loadClients" class="filter-select">
          <option value="">🔄 Todos los estados</option>
          <option value="active">✅ Activos</option>
          <option value="suspended">⏸️ Suspendidos</option>
          <option value="cancelled">❌ Cancelados</option>
          <option value="inactive">🚫 Inactivos</option>
        </select>
      </div>
    </div>

    <!-- Acciones masivas para clientes seleccionados -->
    <div v-if="selectedClientIds.length > 0" class="bulk-actions">
      <div class="selection-info">
        <span>{{ selectedClientIds.length }} cliente(s) seleccionado(s)</span>
        <button @click="clearSelection" class="btn-clear">Limpiar selección</button>
      </div>
      <div class="bulk-buttons">
        <button @click="bulkEmail" class="btn-bulk btn-email">
          ✉️ Email masivo
        </button>
        <button @click="bulkWhatsApp" class="btn-bulk btn-whatsapp">
          📱 WhatsApp masivo
        </button>
        <button @click="bulkSuspend" class="btn-bulk btn-suspend">
          ⏸️ Suspender servicios
        </button>
        <button @click="bulkChangeStatus" class="btn-bulk btn-status">
          🔄 Cambiar estado
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando clientes...</p>
    </div>

    <!-- Tabla de clientes -->
    <div v-else-if="clients.length === 0" class="empty-state">
      <div class="empty-icon">👥</div>
      <h3>No se encontraron clientes</h3>
      <p>Intenta ajustar los filtros o crear un nuevo cliente</p>
    </div>

    <div v-else class="table-container">
      <table class="clients-table">
        <thead>
          <tr>
            <th class="checkbox-col">
              <input 
                type="checkbox" 
                :checked="selectAllChecked"
                @change="toggleSelectAll"
                :indeterminate="selectAllIndeterminate"
              />
            </th>
            <th class="sortable" @click="sortBy('id')">
              ID
              <span v-if="sortField === 'id'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th class="filterable">
              <div class="column-header">
                <span>Nombre</span>
                <input 
                  type="text" 
                  v-model="columnFilters.name" 
                  placeholder="Filtrar nombre..."
                  @input="debouncedFilter"
                  class="column-filter"
                />
              </div>
            </th>
            <th class="filterable">
              <div class="column-header">
                <span>Dirección</span>
                <input 
                  type="text" 
                  v-model="columnFilters.address" 
                  placeholder="Filtrar dirección..."
                  @input="debouncedFilter"
                  class="column-filter"
                />
              </div>
            </th>
            <th class="filterable">
              <div class="column-header">
                <span>Contacto</span>
                <input 
                  type="text" 
                  v-model="columnFilters.contact" 
                  placeholder="Email o teléfono..."
                  @input="debouncedFilter"
                  class="column-filter"
                />
              </div>
            </th>
            <th>IP de Servicio</th>
            <th>Fecha Inicio</th>
            <th class="filterable">
              <div class="column-header">
                <span>Día Pago</span>
                <select v-model="columnFilters.billingDay" @change="loadClients" class="column-filter-select">
                  <option value="">Todos</option>
                  <option v-for="day in billingDays" :key="day" :value="day">{{ day }}</option>
                </select>
              </div>
            </th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="client in clients" 
            :key="client.id"
            :class="getRowClass(client)"
          >
            <td class="checkbox-col">
              <input 
                type="checkbox" 
                :value="client.id"
                v-model="selectedClientIds"
              />
            </td>
            <td class="client-id">
              <span class="id-badge">{{ client.id }}</span>
            </td>
            <td class="client-name">
              <div class="name-section">
                <span class="full-name">{{ client.firstName }} {{ client.lastName }}</span>
                <span v-if="client.contractNumber" class="contract-number">
                  #{{ client.contractNumber }}
                </span>
              </div>
            </td>
            <td class="client-address">
              <div class="address-section">
                <span v-if="client.address">{{ client.address }}</span>
                <span v-else class="no-data">Sin dirección</span>
                <div v-if="client.Zone || client.Node || client.Sector" class="location-hierarchy">
                  <span v-if="client.Zone" class="zone-tag">{{ client.Zone.name }}</span>
                </div>
              </div>
            </td>
            <td class="client-contact">
              <div class="contact-section">
                <div v-if="client.email" class="contact-item">
                  <span class="contact-icon">✉️</span>
                  <span class="contact-value">{{ client.email }}</span>
                </div>
                <div v-if="client.phone" class="contact-item">
                  <span class="contact-icon">📞</span>
                  <span class="contact-value">{{ client.phone }}</span>
                </div>
                <div v-if="client.whatsapp" class="contact-item">
                  <span class="contact-icon">📱</span>
                  <a :href="'https://wa.me/' + formatWhatsApp(client.whatsapp)" target="_blank" class="whatsapp-link">
                    {{ client.whatsapp }}
                  </a>
                </div>
              </div>
            </td>
            <td class="service-ip">
              <div v-if="client.Subscriptions && client.Subscriptions.length > 0">
                <div v-for="subscription in client.Subscriptions" :key="subscription.id" class="ip-item">
                  <span class="ip-address">{{ subscription.assignedIpAddress || 'Sin IP' }}</span>
                  <span class="service-type">{{ subscription.ServicePackage?.name || 'Sin paquete' }}</span>
                </div>
              </div>
              <span v-else class="no-service">Sin servicio</span>
            </td>
            <td class="service-start-date">
              <div v-if="client.Subscriptions && client.Subscriptions.length > 0">
                <div v-for="subscription in client.Subscriptions" :key="subscription.id" class="date-item">
                  {{ subscription.startDate ? formatDate(subscription.startDate) : '-' }}
                </div>
              </div>
              <span v-else class="no-date">-</span>
            </td>
            <td class="billing-day">
              <div v-if="client.ClientBilling">
                <span class="day-number">{{ ClientBilling.billingDay || '-d' }}</span>
                <span class="next-due" v-if="client.ClientBilling.nextDueDate">
                  {{ formatDate(ClientBilling.nextDueDate) }}
                </span>
                <span v-else-if="client.ClientBilling.lastPaymentDate" class="last-payment">
                  Último: {{ formatDate(client.ClientBilling.lastPaymentDate) }}
                </span>
              </div>
              <div v-else-if="client.Subscriptions && client.Subscriptions.length > 0">
                <!-- Si tiene suscripciones pero no billing, tomar de la suscripción -->
                <span class="day-number">{{ getSubscriptionBillingDay(client.Subscriptions) }}</span>
              </div>
              <span v-else class="no-billing">Sin configurar</span>
            </td>
            <td class="client-status">
              <div class="status-indicators">
                <div v-if="client.Subscriptions && client.Subscriptions.length > 0" class="service-status">
                  <span 
                    v-for="subscription in client.Subscriptions" 
                    :key="subscription.id"
                    :class="['service-badge', getServiceStatusClass(subscription)]"
                  >
                    {{ subscription.status }}
                  </span>
                </div>
              </div>
            </td>
            <td class="actions-column">
              <div class="action-buttons">
                <button @click="viewClient(client.id)" class="btn-action btn-view" title="Ver detalles">
                  👁️
                </button>
                <button @click="editClient(client.id)" class="btn-action btn-edit" title="Editar">
                  ✏️
                </button>
                <button @click="sendWhatsApp(client)" class="btn-action btn-whatsapp" title="WhatsApp">
                  📱
                </button>
                <button @click="createTicket(client.id)" class="btn-action btn-ticket" title="Crear ticket">
                  🎫
                </button>
                <div class="dropdown">
                  <button @click="toggleDropdown(client.id)" class="btn-action btn-more" title="Más opciones">
                    ⋯
                  </button>
                  <div v-if="activeDropdown === client.id" class="dropdown-menu">
                    <button @click="suspendClient(client)" class="dropdown-item">
                      ⏸️ Suspender
                    </button>
                    <button @click="reactivateClient(client)" class="dropdown-item">
                      ▶️ Reactivar
                    </button>
                    <button @click="manageServices(client.id)" class="dropdown-item">
                      ⚙️ Servicios
                    </button>
                    <button @click="viewBilling(client.id)" class="dropdown-item">
                      💰 Facturación
                    </button>
                    <button @click="deleteClient(client)" class="dropdown-item danger">
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    <div v-if="clients.length > 0" class="pagination-section">
      <div class="pagination-info">
        Mostrando {{ (currentPage - 1) * pageSize + 1 }} - 
        {{ Math.min(currentPage * pageSize, totalItems) }} de {{ totalItems }} clientes
      </div>
      <div class="pagination-controls">
        <button 
          @click="changePage(1)" 
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          ⏮️
        </button>
        <button 
          @click="changePage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          ◀️
        </button>
        
        <div class="page-numbers">
          <button 
            v-for="page in visiblePages" 
            :key="page"
            @click="changePage(page)"
            :class="['page-btn', { active: page === currentPage }]"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          @click="changePage(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          ▶️
        </button>
        <button 
          @click="changePage(totalPages)" 
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          ⏭️
        </button>
      </div>
      <div class="page-size-selector">
        <label>Mostrar:</label>
        <select v-model="pageSize" @change="loadClients">
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>

    <!-- Modales -->
    <!-- Modal de confirmación para acciones masivas -->
    <div v-if="showBulkModal" class="modal-overlay" @click="closeBulkModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ bulkAction.title }}</h3>
          <button @click="closeBulkModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <p>{{ bulkAction.message }}</p>
          <p><strong>{{ selectedClientIds.length }}</strong> cliente(s) serán afectados:</p>
          <div class="affected-clients">
            <div v-for="client in getSelectedClients()" :key="client.id" class="client-chip">
              {{ client.firstName }} {{ client.lastName }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeBulkModal" class="btn-secondary">Cancelar</button>
          <button @click="executeBulkAction" class="btn-primary">{{ bulkAction.confirmText }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ClientService from '../services/client.service';
import NetworkService from '../services/network.service';
export default {
  name: 'EnhancedClientList',
  data() {
    return {
      // Datos principales
      clients: [],
      zones: [],
      nodes: [],
      sectors: [],
      
      // Estado de carga
      loading: false,
      
      // Filtros y búsqueda
      globalSearch: '',
      selectedZone: '',
      selectedNode: '',
      selectedSector: '',
      selectedStatus: '',
      
      columnFilters: {
        name: '',
        address: '',
        contact: '',
        billingDay: ''
      },
      
      // Ordenamiento
      sortField: 'id',
      sortDirection: 'desc',
      
      // Paginación
      currentPage: 1,
      pageSize: 25,
      totalItems: 0,
      totalPages: 0,
      
      // Selección múltiple
      selectedClientIds: [],
      
      // Modales y acciones
      showBulkModal: false,
      bulkAction: {},
      activeDropdown: null,
      
      // Debounce timer
      filterDebounceTimer: null,
      
      // Datos auxiliares
      billingDays: Array.from({length: 31}, (_, i) => i + 1)
    };
  },
  
  computed: {
  
    availableNodes() {
      if (!this.selectedZone) return this.nodes;
      return this.nodes.filter(node => node.zoneId == this.selectedZone);
    },
    
    availableSectors() {
      if (!this.selectedNode) return this.sectors;
      return this.sectors.filter(sector => sector.nodeId == this.selectedNode);
    },
    
    selectAllChecked() {
      return this.clients.length > 0 && this.selectedClientIds.length === this.clients.length;
    },
    
    selectAllIndeterminate() {
      return this.selectedClientIds.length > 0 && this.selectedClientIds.length < this.clients.length;
    },
    
    visiblePages() {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];
      
      for (let i = Math.max(2, this.currentPage - delta); 
           i <= Math.min(this.totalPages - 1, this.currentPage + delta); 
           i++) {
        range.push(i);
      }
      
      if (this.currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }
      
      rangeWithDots.push(...range);
      
      if (this.currentPage + delta < this.totalPages - 1) {
        rangeWithDots.push('...', this.totalPages);
      } else if (this.totalPages > 1) {
        rangeWithDots.push(this.totalPages);
      }
      
      return rangeWithDots.filter((v, i, arr) => arr.indexOf(v) === i);
    }
  },
  
  created() {
    this.loadInitialData();
  },
  
  methods: {
    async loadInitialData() {
      await Promise.all([
        this.loadZones(),
        this.loadNodes(),
        this.loadSectors(),
        this.loadClients()
      ]);
    },
    
    async loadZones() {
      try {
        const response = await NetworkService.getAllZones({ active: true });
        this.zones = response.data;
      } catch (error) {
        console.error('Error cargando zonas:', error);
        this.errorMessage = 'Error cargando zonas disponibles.';
      }
    },
    
    async loadNodes() {
      try {
        const response = await NetworkService.getAllNodes({ active: true });
        this.nodes = response.data;
      } catch (error) {
        console.error('Error cargando nodos:', error);
        this.errorMessage = 'Error cargando nodos disponibles.';
      }
    },
    
    async loadSectors() {
      try {
        const response = await NetworkService.getAllSectors({ active: true });
        this.sectors = response.data;
      } catch (error) {
        console.error('Error cargando sectores:', error);
        this.errorMessage = 'Error cargando sectores disponibles.';
      }
    },
    
    async loadClients() {
      this.loading = true;
      try {
        const params = this.buildQueryParams();
        const response = await ClientService.getAllClients(params);
        
        this.clients = response.data.clients;
        this.totalItems = response.data.totalItems;
        this.totalPages = response.data.totalPages;
        this.currentPage = response.data.currentPage;
        
      } catch (error) {
        console.error('Error cargando clientes:', error);
        // Mostrar notificación de error
      } finally {
        this.loading = false;
      }
    },
    
    buildQueryParams() {
      const params = {
        page: this.currentPage,
        size: this.pageSize,
        sortField: this.sortField,
        sortDirection: this.sortDirection
      };
      
      // Filtros principales
      if (this.globalSearch) params.globalSearch = this.globalSearch;
      if (this.selectedZone) params.zoneId = this.selectedZone;
      if (this.selectedNode) params.nodeId = this.selectedNode;
      if (this.selectedSector) params.sectorId = this.selectedSector;
      if (this.selectedStatus) params.status = this.selectedStatus;
      
      // Filtros por columna
      if (this.columnFilters.name) params.name = this.columnFilters.name;
      if (this.columnFilters.address) params.address = this.columnFilters.address;
      if (this.columnFilters.contact) params.contact = this.columnFilters.contact;
      if (this.columnFilters.billingDay) params.billingDay = this.columnFilters.billingDay;
      
      return params;
    },
    
    debouncedFilter() {
      clearTimeout(this.filterDebounceTimer);
      this.filterDebounceTimer = setTimeout(() => {
        this.currentPage = 1;
        this.loadClients();
      }, 500);
    },
    
    onZoneChange() {
      this.selectedNode = '';
      this.selectedSector = '';
      this.loadClients();
    },
    
    onNodeChange() {
      this.selectedSector = '';
      this.loadClients();
    },
    
    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'asc';
      }
      this.loadClients();
    },
    
    changePage(page) {
      if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadClients();
      }
    },
    
    // Selección múltiple
    toggleSelectAll() {
      if (this.selectAllChecked) {
        this.selectedClientIds = [];
      } else {
        this.selectedClientIds = this.clients.map(client => client.id);
      }
    },
    
    clearSelection() {
      this.selectedClientIds = [];
    },
    
    getSelectedClients() {
      return this.clients.filter(client => this.selectedClientIds.includes(client.id));
    },
    
    // Acciones masivas
    bulkEmail() {
      this.bulkAction = {
        type: 'email',
        title: 'Enviar Email Masivo',
        message: '¿Deseas enviar un email a los clientes seleccionados?',
        confirmText: 'Enviar Emails'
      };
      this.showBulkModal = true;
    },
    
    bulkWhatsApp() {
      this.bulkAction = {
        type: 'whatsapp',
        title: 'Enviar WhatsApp Masivo',
        message: '¿Deseas enviar un mensaje de WhatsApp a los clientes seleccionados?',
        confirmText: 'Enviar WhatsApp'
      };
      this.showBulkModal = true;
    },
    
    bulkSuspend() {
      this.bulkAction = {
        type: 'suspend',
        title: 'Suspender Servicios',
        message: '¿Deseas suspender los servicios de los clientes seleccionados?',
        confirmText: 'Suspender Servicios'
      };
      this.showBulkModal = true;
    },
    
    bulkChangeStatus() {
      this.bulkAction = {
        type: 'changeStatus',
        title: 'Cambiar Estado',
        message: '¿Deseas cambiar el estado de los clientes seleccionados?',
        confirmText: 'Cambiar Estado'
      };
      this.showBulkModal = true;
    },
    
    async executeBulkAction() {
      try {
        const selectedClients = this.getSelectedClients();
        
        switch (this.bulkAction.type) {
          case 'email':
            // Implementar envío de email masivo
            await this.sendBulkEmail(selectedClients);
            break;
          case 'whatsapp':
            // Implementar envío de WhatsApp masivo
            await this.sendBulkWhatsApp(selectedClients);
            break;
          case 'suspend':
            // Implementar suspensión masiva
            await this.suspendBulkServices(selectedClients);
            break;
          case 'changeStatus':
            // Implementar cambio de estado masivo
            await this.changeBulkStatus(selectedClients);
            break;
        }
        
        this.closeBulkModal();
        this.clearSelection();
        this.loadClients();
        
      } catch (error) {
        console.error('Error ejecutando acción masiva:', error);
      }
    },
    
    closeBulkModal() {
      this.showBulkModal = false;
      this.bulkAction = {};
    },
    
    // Acciones individuales
    viewClient(id) {
      this.$router.push(`/clients/${id}`);
    },
    
    editClient(id) {
      this.$router.push(`/clients/${id}/edit`);
    },
    
    sendWhatsApp(client) {
      if (client.whatsapp) {
        const phone = this.formatWhatsApp(client.whatsapp);
        window.open(`https://wa.me/${phone}`, '_blank');
      }
    },
    
    createTicket(clientId) {
      this.$router.push(`/tickets/new?clientId=${clientId}`);
    },
    
    toggleDropdown(clientId) {
      this.activeDropdown = this.activeDropdown === clientId ? null : clientId;
    },
    
    // Métodos auxiliares
    formatWhatsApp(number) {
      return number.replace(/\D/g, '');
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    
    getRowClass(client) {
      const classes = ['client-row'];
      
      if (!client.active) classes.push('inactive');
      if (client.Subscriptions?.some(s => s.status === 'suspended')) classes.push('suspended');
      if (client.Subscriptions?.some(s => s.status === 'cancelled')) classes.push('cancelled');
      
      return classes;
    },
    
    getClientStatusClass(client) {
      if (!client.active) return 'status-inactive';
      return 'status-active';
    },
    
    getClientStatusText(client) {
      return client.active ? 'Activo' : 'Inactivo';
    },
    
    getServiceStatusClass(subscription) {
      switch (subscription.status) {
        case 'active': return 'status-active';
        case 'suspended': return 'status-suspended';
        case 'cancelled': return 'status-cancelled';
        default: return 'status-unknown';
      }
    },
    
    getSubscriptionBillingDay(subscriptions) {
      // Buscar día de facturación en las suscripciones
      if (!subscriptions || subscriptions.length === 0) return '-';
      
      // Tomar el día de la primera suscripción activa, o la primera disponible
      const activeSubscription = subscriptions.find(sub => sub.status === 'active');
      const subscription = activeSubscription || subscriptions[0];
      
      // Aquí puedes agregar lógica adicional según cómo manejes el día de facturación
      // Por ejemplo, si está en la suscripción o calculas basado en startDate
      if (subscription.nextDueDate) {
        return new Date(subscription.nextDueDate).getDate();
      }
      
      return '-';
    },
    
    openNewClientForm() {
      this.$router.push('/clients/new');
    }
  }
};
</script>

<style scoped>
.client-list {
  padding: 20px;
  background: #f8fafc;
  min-height: 100vh;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h2 {
  color: #1e293b;
  font-size: 1.8rem;
  font-weight: 600;
}

.btn-new-client {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-new-client:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Búsqueda y filtros */
.search-filters-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.global-search {
  display: flex;
  margin-bottom: 16px;
}

.global-search-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px 0 0 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.global-search-input:focus {
  border-color: #3b82f6;
}

.search-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  font-size: 1.2rem;
}

.main-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.filter-select {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
}

.filter-select:focus {
  border-color: #3b82f6;
}

/* Acciones masivas */
.bulk-actions {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: #92400e;
}

.btn-clear {
  background: transparent;
  border: 1px solid #f59e0b;
  color: #92400e;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.bulk-buttons {
  display: flex;
  gap: 8px;
}

.btn-bulk {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-email {
  background: #dc2626;
  color: white;
}

.btn-whatsapp {
  background: #16a34a;
  color: white;
}

.btn-suspend {
  background: #ea580c;
  color: white;
}

.btn-status {
  background: #7c3aed;
  color: white;
}

.btn-bulk:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Estados de carga */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin-bottom: 8px;
  color: #374151;
}

/* Tabla */
.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.clients-table {
  width: 100%;
  border-collapse: collapse;
}

.clients-table th {
  background: #f8fafc;
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.clients-table td {
  padding: 16px 12px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

.checkbox-col {
  width: 40px;
  text-align: center;
}

.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.sortable:hover {
  background: #f1f5f9;
}

.sort-indicator {
  margin-left: 4px;
  font-size: 0.8rem;
}

.column-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-filter {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8rem;
  outline: none;
}

.column-filter:focus {
  border-color: #3b82f6;
}

.column-filter-select {
  padding: 4px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8rem;
  background: white;
}

/* Celdas específicas */
.client-id {
  width: 80px;
}

.id-badge {
  background: #e0e7ff;
  color: #3730a3;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.8rem;
}

.client-name {
  min-width: 180px;
}

.name-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.full-name {
  font-weight: 600;
  color: #1e293b;
}

.contract-number {
  font-size: 0.8rem;
  color: #64748b;
  font-family: monospace;
}

.client-address {
  min-width: 200px;
}

.address-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.location-hierarchy {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.zone-tag, .node-tag, .sector-tag {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 500;
}

.zone-tag {
  background: #dbeafe;
  color: #1e40af;
}

.node-tag {
  background: #dcfce7;
  color: #166534;
}

.sector-tag {
  background: #fef3c7;
  color: #92400e;
}

.client-contact {
  min-width: 200px;
}

.contact-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
}

.contact-icon {
  font-size: 0.8rem;
}

.whatsapp-link {
  color: #16a34a;
  text-decoration: none;
}

.whatsapp-link:hover {
  text-decoration: underline;
}

.service-ip {
  min-width: 150px;
}

.ip-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.ip-address {
  font-family: monospace;
  font-weight: 600;
  color: #1e293b;
}

.service-type {
  font-size: 0.8rem;
  color: #64748b;
}

.pppoe-user {
  font-size: 0.7rem;
  color: #9ca3af;
  font-family: monospace;
}

.last-payment {
  display: block;
  font-size: 0.8rem;
  color: #f59e0b;
  margin-top: 4px;
}

.billing-day {
  min-width: 120px;
  text-align: center;
}

.day-number {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
}

.next-due {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 4px;
}

.client-status {
  min-width: 120px;
}

.status-indicators {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}

.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-inactive {
  background: #fecaca;
  color: #dc2626;
}

.status-suspended {
  background: #fed7aa;
  color: #ea580c;
}

.status-cancelled {
  background: #e5e7eb;
  color: #6b7280;
}

.service-status {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.service-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 500;
}

.actions-column {
  width: 160px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
  position: relative;
}

.btn-action {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-action:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.btn-view:hover {
  background: #dbeafe;
  border-color: #3b82f6;
}

.btn-edit:hover {
  background: #fef3c7;
  border-color: #f59e0b;
}

.btn-whatsapp:hover {
  background: #dcfce7;
  border-color: #16a34a;
}

.btn-ticket:hover {
  background: #fce7f3;
  border-color: #ec4899;
}

.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 160px;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f8fafc;
}

.dropdown-item.danger {
  color: #dc2626;
}

.dropdown-item.danger:hover {
  background: #fef2f2;
}

/* Estados de fila */
.client-row.inactive {
  opacity: 0.6;
}

.client-row.suspended {
  background: #fefbf3;
}

.client-row.cancelled {
  background: #f9fafb;
}

/* Paginación */
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.pagination-info {
  color: #64748b;
  font-size: 0.9rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-btn {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-btn {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 40px;
  text-align: center;
}

.page-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.page-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 0.9rem;
}

.page-size-selector select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
}

/* Modales */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  color: #1e293b;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
}

.modal-body {
  padding: 20px;
}

.affected-clients {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.client-chip {
  background: #f1f5f9;
  color: #475569;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e2e8f0;
}

.btn-secondary {
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #e2e8f0;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover {
  background: #2563eb;
}

.no-data {
  color: #9ca3af;
  font-style: italic;
}

.no-service, .no-billing {
  color: #9ca3af;
  font-style: italic;
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 1200px) {
  .main-filters {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .client-list {
    padding: 12px;
  }
  
  .header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .main-filters {
    grid-template-columns: 1fr;
  }
  
  .bulk-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .bulk-buttons {
    justify-content: stretch;
  }
  
  .btn-bulk {
    flex: 1;
  }
  
  .pagination-section {
    flex-direction: column;
    gap: 12px;
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .clients-table {
    min-width: 800px;
  }
}
</style>