<template>
  <div class="zone-detail">
    <!-- Header con navegación -->
    <div class="detail-header">
      <div class="header-navigation">
        <button class="back-btn" @click="goBack">
          <span class="icon">←</span>
        </button>
        <div class="breadcrumb">
          <router-link to="/network" class="breadcrumb-link">Gestión de Red</router-link>
          <span class="breadcrumb-separator">›</span>
          <span class="breadcrumb-current">{{ zone?.name || 'Cargando...' }}</span>
        </div>
      </div>
      
      <div class="header-actions" v-if="zone">
        <button class="btn btn-secondary" @click="editZone">
          <span class="icon">✏️</span>
          Editar Zona
        </button>
        <button class="btn btn-primary" @click="createNode">
          <span class="icon">➕</span>
          Nuevo Nodo
        </button>
        <div class="dropdown">
          <button class="btn btn-secondary dropdown-toggle" @click="showDropdown = !showDropdown">
            <span class="icon">⋮</span>
          </button>
          <div v-if="showDropdown" class="dropdown-menu">
            <button @click="toggleZoneStatus" class="dropdown-item">
              <span class="icon">{{ zone.active ? '⏸️' : '▶️' }}</span>
              {{ zone.active ? 'Desactivar' : 'Activar' }} Zona
            </button>
            <button @click="confirmDeleteZone" class="dropdown-item danger">
              <span class="icon">🗑️</span>
              Eliminar Zona
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Estados de carga -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando información de la zona...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Error al cargar datos</h3>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="loadZone">
        <span class="icon">🔄</span>
        Reintentar
      </button>
    </div>

    <!-- Contenido principal -->
    <div v-else-if="zone" class="zone-content">
      <!-- Información general de la zona -->
      <div class="info-section">
        <div class="zone-header-info">
          <div class="zone-title">
            <h1>{{ zone.name }}</h1>
            <span :class="['status-badge', zone.active ? 'active' : 'inactive']">
              {{ zone.active ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
          
          <div class="zone-description" v-if="zone.description">
            <p>{{ zone.description }}</p>
          </div>
        </div>

        <!-- Tarjetas de estadísticas -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📡</div>
            <div class="stat-info">
              <h3>{{ nodes.length }}</h3>
              <p>Nodos/Torres</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📶</div>
            <div class="stat-info">
              <h3>{{ totalSectors }}</h3>
              <p>Sectores</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <h3>{{ totalClients }}</h3>
              <p>Clientes</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💻</div>
            <div class="stat-info">
              <h3>{{ totalDevices }}</h3>
              <p>Dispositivos</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Ubicación geográfica -->
      <div class="location-section" v-if="zone.latitude && zone.longitude">
        <div class="section-header">
          <h2>Mapa de la Zona</h2>
          <button class="btn btn-small btn-secondary" @click="openInMaps">
            <span class="icon">🗺️</span>
            Ver en Google Maps
          </button>
        </div>
        
        <div class="location-info">
          <div class="coords">
            <div class="coord-item">
              <span class="label-value">Latitud:</span>
              <span class="value-label">{{ zone.latitude.toFixed(8) }}</span>
            </div>
            <div class="coord-item">
              <span class="label-value">Longitud:</span>
              <span class="value-label">{{ zone.longitude.toFixed(2) }}</span>
            </div>
          </div>
          
          <!-- Mapa Leaflet -->
          <div class="map-content">
            <div v-if="loadingMapData" class="loading-map">
              <div class="loading-spinner small"></div>
              <span>Cargando...</span>
            </div>
            <div v-else-if="errorMap" class="error-map">
              <div class="error-icon">⚠️</div>
              <p>{{ errorMap }}</p>
            </div>
            <div v-else class="map-container">
              <div ref="leafletMap" class="leaflet-container"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección de Nodos -->
      <div class="nodes-section">
        <div class="section-header">
          <h2>Nodos de la Zona</h2>
          <div class="section-actions">
            <button class="btn btn-small btn-secondary" @click="refreshNodes">
              <span class="icon">🔄</span>
              Actualizar
            </button>
            <button class="btn btn-small btn-primary" @click="createNode">
              <span class="icon">➕</span>
              Nuevo Nodo
            </button>
          </div>
        </div>

        <div v-if="loadingNodes" class="loading-nodes">
          <div class="loading-spinner small"></div>
          <span>Cargando nodos...</span>
        </div>

        <div v-else-if="nodes.length === 0" class="empty-nodes">
          <div class="empty-icon">📡</div>
          <h3>No hay nodos configurados</h3>
          <p>Esta zona aún no tiene nodos asignados. Cree el primer nodo para comenzar.</p>
          <button class="btn btn-primary" @click="createNode">
            <span class="icon">➕</span>
            Crear Primer Nodo
          </button>
        </div>

        <div v-else class="nodes-grid">
          <div 
            v-for="node in nodes" :key="node.id"
            class="node-card"
            @click="viewNode(node.id)"
          >
            <div class="node-header">
              <h3>{{ node.name }}</h3>
              <span :class="['node-status', node.active ? 'active' : 'inactive']">
                {{ node.active ? '🟢' : '🔴' }}
              </span>
            </div>
            
            <div class="node-info">
              <div class="node-detail" v-if="node.location">
                <span class="detail-label">Ubicación:</span>
                <span class="detail-value">{{ node.location }}</span>
              </div>
              
              <div class="node-detail" v-if="node.latitude && node.longitude">
                <span class="detail-label">Coordenadas:</span>
                <span class="detail-value">{{ node.latitude.toFixed(4) }}, {{ node.longitude.toFixed(4) }}</span>
              </div>
              
              <div class="node-detail">
                <span class="detail-label">Tipo:</span>
                <span class="detail-value">{{ node.node_type || 'Principal' }}</span>
              </div>
            </div>

            <div class="node-stats">
              <div class="node-stat">
                <span class="stat-number">{{ node.sectors_count || 0 }}</span>
                <span class="stat-label">Sectores</span>
              </div>
              <div class="node-stat">
                <span class="stat-number">{{ node.clients_count || 0 }}</span>
                <span class="stat-label">Clientes</span>
              </div>
              <div class="node-stat">
                <span class="stat-number">{{ node.devices_count || 0 }}</span>
                <span class="stat-label">Dispositivos</span>
              </div>
            </div>

            <div class="node-actions" @click.stop>
              <button class="btn btn-small" @click="viewNode(node.id)" title="Ver detalles">
                👁️
              </button>
              <button class="btn btn-small btn-edit" @click="editNode(node.id)" title="Editar">
                ✏️
              </button>
              <button class="btn btn-small btn-danger" @click="confirmDeleteNode(node)" title="Eliminar">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección de Servicios/Paquetes -->
      <div class="services-section">
        <div class="section-header">
          <h2>Paquetes de Servicio Disponibles</h2>
          <button class="btn btn-small btn-secondary" @click="manageServices">
            <span class="icon">⚙️</span>
            Gestionar Servicios
          </button>
        </div>

        <div v-if="servicePackages.length === 0" class="empty-services">
          <div class="empty-icon">📦</div>
          <p>No hay paquetes de servicio configurados para esta zona</p>
        </div>

        <div v-else class="services-grid">
          <div 
            v-for="service in servicePackages" 
            :key="service.id"
            class="service-card"
          >
            <div class="service-header">
              <h4>{{ service.name }}</h4>
              <span class="service-price">${{ service.price }}/mes</span>
            </div>
            
            <div class="service-details">
              <div class="service-speed">
                <span class="speed-down">↓ {{ service.download_speed_mbps }} Mbps</span>
                <span class="speed-up">↑ {{ service.upload_speed_mbps }} Mbps</span>
              </div>
              
              <div class="service-features">
                <div v-if="service.data_limit_gb" class="feature">
                  📊 {{ service.data_limit_gb }} GB
                </div>
                <div v-else class="feature">
                  ♾️ Datos Ilimitados
                </div>
                
                <div class="feature" v-if="service.has_jellyfin">
                  📺 Streaming Incluido
                </div>
              </div>

              <div class="service-clients">
                <span class="clients-count">{{ service.clients_count || 0 }} clientes activos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección de Clientes -->
      <div class="clients-section">
        <div class="section-header">
          <h2>Clientes de la Zona</h2>
          <div class="section-actions">
            <button class="btn btn-primary" @click="createClient">
              <span class="icon">➕</span>
              Nuevo Cliente
            </button>
          </div>
        </div>

        <!-- Filtros y búsqueda -->
        <div class="filter-group">
          <div class="filter-item">
            <label for="nodeFilter">Nodo:</label>
            <select v-model="filters.nodeId" id="nodeFilter" @change="updateSectorFilter">
              <option value="">Todos</option>
              <option v-for="node in nodes" :value="node.id" :key="node.id">{{ node.name }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label for="sectorFilter">Sector:</label>
            <select v-model="filters.sectorId" id="sectorFilter">
              <option value="">Todos</option>
              <option v-for="sector in filteredSectors" :value="sector.id" :key="sector.id">{{ sector.name }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label for="statusFilter">Estado:</label>
            <select v-model="filters.status" id="statusFilter">
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
          <div class="filter-item">
            <label for="searchInput">Buscar:</label>
            <input 
              type="text" 
              id="searchInput" 
              v-model="searchQuery" 
              placeholder="Nombre o Domicilio..."
            />
          </div>
        </div>

        <!-- Tabla de clientes -->
        <div v-if="loadingClients" class="loading-clients">
          <div class="loading-spinner small"></div>
          <span>Cargando clientes...</span>
        </div>
        <div v-else-if="filteredClients.length === 0" class="empty-clients">
          <div class="empty-icon">👥</div>
          <h3>No se encontraron clientes</h3>
          <p>Prueba ajustando los filtros o crea un nuevo cliente.</p>
          <button class="btn btn-primary" @click="createClient">
            <span class="icon">➕</span>
            Nuevo Cliente
          </button>
        </div>
        <div v-else class="clients-table">
          <table>
            <thead>
              <tr>
                <th @click="sortClients('name')">
                  Nombre
                  <span class="sort-icon" :class="{ active: sortKey === 'name', desc: sortOrder === 'desc' }">
                    {{ sortKey === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
                  </span>
                </th>
                <th @click="sortClients('address')">
                  Domicilio
                  <span class="sort-icon" :class="{ active: sortKey === 'address', desc: sortOrder === 'desc' }">
                    {{ sortKey === 'address' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕' }}
                  </span>
                </th>
                <th>Sector</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in filteredClients" :key="client.id">
                <td>{{ client.name }}</td>
                <td>{{ client.address || '-' }}</td>
                <td>{{ getSectorName(client.sectorId) || '-' }}</td>
                <td>
                  <span :class="['status-badge', client.active ? 'active' : 'inactive']">
                    {{ client.active ? 'Activo' : 'Suspendido' }}
                  </span>
                </td>
                <td class="actions">
                  <button class="btn btn-small" @click="viewClient(client.id)" title="Ver">
                    👁️
                  </button>
                  <button class="btn btn-small btn-edit" @click="editClient(client)" title="Editar">
                    ✏️
                  </button>
                  <button class="btn btn-small btn-danger" @click="confirmDeleteClient(client)" title="Eliminar">
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Información del sistema -->
      <div class="system-info-section">
        <div class="section-header">
          <h2>Información del Sistema</h2>
        </div>
        
        <div class="system-info-grid">
          <div class="info-card">
            <div class="info-label">Fecha de Creación</div>
            <div class="info-value">{{ formatDate(zone.createdAt) }}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Última Actualización</div>
            <div class="info-value">{{ formatDate(zone.updatedAt) }}</div>
          </div>
          <div class="info-card">
            <div class="info-label">ID de Zona</div>
            <div class="info-value">#{{ zone.id }}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Estado Actual</div>
            <div class="info-value">
              <span :class="['status-indicator', zone.active ? 'active' : 'inactive']">
                {{ zone.active ? 'Zona Activa' : 'Zona Inactiva' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para eliminar zona -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Confirmar Eliminación de Zona</h3>
          <button class="modal-close" @click="cancelDelete">✕</button>
        </div>
        <div class="modal-body">
          <div class="warning-box">
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
              <p><strong>¡Esta acción no se puede deshacer!</strong></p>
              <p>Está a punto de eliminar la zona <strong>{{ zone?.name }}</strong></p>
              
              <div v-if="nodes.length > 0" class="danger-info">
                <p><strong>Elementos que serán eliminados:</strong></p>
                <ul>
                  <li>{{ nodes.length }} nodo(s)</li>
                  <li>{{ totalSectors }} sector(es)</li>
                  <li>Todas las configuraciones asociadas</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="confirmation-input">
            <label>Para confirmar, escriba el nombre de la zona:</label>
            <input 
              type="text" 
              v-model="deleteConfirmation" 
              :placeholder="zone?.name"
              class="confirmation-field"
            />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancelDelete">Cancelar</button>
          <button 
            class="btn btn-danger" 
            @click="confirmDelete"
            :disabled="deleteConfirmation !== zone?.name"
          >
            <span class="icon">🗑️</span>
            Eliminar Zona
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para eliminar nodo -->
    <div v-if="showDeleteNodeModal" class="modal-overlay" @click="cancelDeleteNode">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Eliminar Nodo</h3>
          <button class="modal-close" @click="cancelDeleteNode">✕</button>
        </div>
        <div class="modal-body">
          <p>¿Está seguro de que desea eliminar el nodo <strong>{{ deleteNodeItem?.name }}</strong>?</p>
          <div v-if="deleteNodeItem?.sectors_count > 0" class="warning-box">
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
              <p>Este nodo tiene {{ deleteNodeItem.sectors_count }} sector(es) que también serán eliminados.</p>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancelDeleteNode">Cancelar</button>
          <button class="btn btn-danger" @click="executeDeleteNode">
            <span class="icon">🗑️</span>
            Eliminar Nodo
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para eliminar cliente -->
    <div v-if="showDeleteClientModal" class="modal-overlay" @click="cancelDeleteClient">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Eliminar Cliente</h3>
          <button class="modal-close" @click="cancelDeleteClient">✕</button>
        </div>
        <div class="modal-body">
          <p>¿Está seguro de que desea eliminar al cliente <strong>{{ deleteClientItem?.name }}</strong>?</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancelDeleteClient">Cancelar</button>
          <button class="btn btn-danger" @click="executeDeleteClient">
            <span class="icon">🗑️</span>
            Eliminar Cliente
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import NetworkService from '@/services/network.service';
import DeviceService from '@/services/device.service';
import ClientService from '@/services/client.service';

export default {
  name: 'ZoneDetail',
  data() {
    return {
      zone: null,
      nodes: [],
      sectors: [], // Para el mapa
      devices: [], // Para el mapa
      clients: [], // Para el mapa y sección de clientes
      servicePackages: [],
      
      loading: false,
      loadingNodes: false,
      loadingMap: false, // Estado para el mapa
      loadingClients: false, // Estado para clientes
      error: null,
      errorNodes: null,
      errorMap: null, // Error para el mapa
      
      showDropdown: false,
      showDeleteModal: false,
      showDeleteNodeModal: false,
      showDeleteClientModal: false, // Modal para eliminar cliente
      deleteConfirmation: '',
      deleteNodeItem: null,
      deleteClientItem: null, // Cliente a eliminar
      
      // Estadísticas
      totalSectors: 0,
      totalClients: 0,
      totalDevices: 0,
      
      // Mapa
      leafletMap: null,
      markers: {},
      connections: [],
      
      // Filtros y ordenación de clientes
      filters: {
        nodeId: '',
        sectorId: '',
        status: ''
      },
      searchQuery: '',
      sortKey: 'name',
      sortOrder: 'asc'
    };
  },
  
  computed: {
    zoneId() {
      return this.$route.params.id;
    },
    // Filtra sectores según el nodo seleccionado
    filteredSectors() {
      if (!this.filters.nodeId) {
        return this.sectors;
      }
      return this.sectors.filter(sector => sector.nodeId === parseInt(this.filters.nodeId));
    },
    // Clientes filtrados
    filteredClients() {
      let filtered = [...this.clients];
      
      // Filtro por nodo
      if (this.filters.nodeId) {
        const nodeSectors = this.sectors
          .filter(sector => sector.nodeId === parseInt(this.filters.nodeId))
          .map(sector => sector.id);
        filtered = filtered.filter(client => 
          nodeSectors.includes(client.sectorId)
        );
      }
      
      // Filtro por sector
      if (this.filters.sectorId) {
        filtered = filtered.filter(client => 
          client.sectorId === parseInt(this.filters.sectorId)
        );
      }
      
      // Filtro por estado
      if (this.filters.status) {
        filtered = filtered.filter(client => 
          this.filters.status === 'active' ? client.active : !client.active
        );
      }
      
      // Búsqueda por nombre o domicilio
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.trim().toLowerCase();
        filtered = filtered.filter(client => 
          client.name.toLowerCase().includes(query) ||
          (client.address && client.address.toLowerCase().includes(query))
        );
      }
      
      // Ordenación
      filtered.sort((a, b) => {
        const valueA = a[this.sortKey] || '';
        const valueB = b[this.sortKey] || '';
        const direction = this.sortOrder === 'asc' ? 1 : -1;
        
        if (valueA < valueB) return -direction;
        if (valueA > valueB) return direction;
        return 0;
      });
      
      return filtered;
    }
  },
  
  async created() {
    await this.loadZone();
    await this.loadNodes();
    await this.loadServicePackages();
    await this.loadMapData(); // Carga datos para el mapa y clientes
  },
  
  mounted() {
    document.addEventListener('click', () => {
      this.showDropdown = false;
    });
    this.$nextTick(() => {
      this.fixLeafletIcons();
      setTimeout(() => this.initializeMap(), 100);
    });
  },
  
  beforeUnmount() {
    if (this.leafletMap) {
      this.leafletMap.remove();
    }
    document.removeEventListener('click', () => {
      this.showDropdown = false;
    });
  },
  
  methods: {
    // Carga de datos
    async loadZone() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await NetworkService.getZone(this.zoneId);
        if (response && response.data) {
          this.zone = response.data;
        } else {
          throw new Error('Zona no encontrada');
        }
      } catch (error) {
        console.error('Error al cargar zona:', error);
        this.error = error.response?.data?.message || 'Error al cargar la información de la zona';
      } finally {
        this.loading = false;
      }
    },
    
    async loadNodes() {
      this.loadingNodes = true;
      try {
        const response = await NetworkService.getNodesByZone(this.zoneId);
        if (response && response.data) {
          this.nodes = response.data.data;
          this.calculateStats();
        }
      } catch (error) {
        console.error('Error al cargar nodos:', error);
        this.errorNodes = error.response?.data?.message || 'Error al cargar nodos';
      } finally {
        this.loadingNodes = false;
      }
    },
    
    async loadServicePackages() {
      try {
        const response = await NetworkService.getServicePackages();
        if (response && response.data) {
          this.servicePackages = response.data.filter(pkg => pkg.active);
        }
      } catch (error) {
        console.error('Error al cargar paquetes de servicio:', error);
      }
    },
    
    async loadMapData() {
      this.loadingMap = true;
      this.loadingClients = true;
      this.errorMap = null;
      
      try {
        const [sectorsResponse, devicesResponse, clientsResponse] = await Promise.allSettled([
          NetworkService.getAllSectors(),
          DeviceService.getAllDevices(),
          ClientService.getAllClients({ size: 1000 })
        ]);
        
        // Sectores
        if (sectorsResponse.status === 'fulfilled' && sectorsResponse.value.data) {
          const sectors = Array.isArray(sectorsResponse.value.data) 
            ? sectorsResponse.value.data 
            : sectorsResponse.value.data.sectors || [];
          this.sectors = sectors.filter(sector => 
            this.nodes.some(node => node.id === sector.nodeId)
          );
        } else {
          this.sectors = [];
        }
        
        // Dispositivos
        if (devicesResponse.status === 'fulfilled' && devicesResponse.value.data) {
          const devices = Array.isArray(devicesResponse.value.data) 
            ? devicesResponse.value.data 
            : devicesResponse.value.data.devices || [];
          this.devices = devices.filter(device => 
            this.sectors.some(sector => sector.id === device.sectorId) ||
            this.nodes.some(node => node.id === device.nodeId)
          );
        } else {
          this.devices = [];
        }
        
        // Clientes
        if (clientsResponse.status === 'fulfilled' && clientsResponse.value.data) {
          const clients = clientsResponse.value.data.clients || clientsResponse.value.data || [];
          this.clients = clients
            .filter(client => 
              this.sectors.some(sector => sector.id === client.sectorId)
            )
            .map(client => ({
              ...client,
              name: `${client.firstName} ${client.lastName}`.trim()
            }));
        } else {
          this.clients = [];
        }
        
        console.log('[MAP DATA]', {
          sectors: this.sectors.length,
          devices: this.devices.length,
          clients: this.clients.length
        });
      } catch (error) {
        console.error('Error al cargar datos del mapa:', error);
        this.errorMap = 'Error al cargar el mapa';
      } finally {
        this.loadingMap = false;
        this.loadingClients = false;
      }
    },
    
    calculateStats() {
      this.totalSectors = this.nodes.reduce((sum, node) => sum + (node.sectors_count || 0), 0);
      this.totalClients = this.nodes.reduce((sum, node) => sum + (node.clients_count || 0), 0);
      this.totalDevices = this.nodes.reduce((sum, node) => sum + (node.devices_count || 0), 0);
    },
    
    // Mapa
    fixLeafletIcons() {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    },
    
    initializeMap() {
      this.$nextTick(() => {
        const container = this.$refs.leafletMap;
        if (!container) {
          console.error('Contenedor del mapa no encontrado');
          this.errorMap = 'No se pudo inicializar el mapa';
          return;
        }
        
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
          setTimeout(() => this.initializeMap(), 100);
          return;
        }
        
        if (this.leafletMap) {
          this.leafletMap.remove();
        }
        
        const center = this.calculateMapCenter();
        this.leafletMap = L.map(container, {
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          touchZoom: false,
          zoomControl: false
        }).setView(center, 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
          minZoom: 10
        }).addTo(this.leafletMap);
        
        const bounds = this.calculateMapBounds();
        if (bounds) {
          this.leafletMap.setMaxBounds(bounds.pad(0.2));
          this.leafletMap.fitBounds(bounds);
        }
        
        setTimeout(() => {
          if (this.leafletMap) {
            this.leafletMap.invalidateSize();
          }
        }, 200);
        
        this.addMapElements();
      });
    },
    
    calculateMapCenter() {
      const allCoords = [];
      
      // Nodos
      this.nodes.forEach(node => {
        if (node.latitude && node.longitude) {
          allCoords.push([node.latitude, node.longitude]);
        }
      });
      
      // Sectores
      this.sectors.forEach(sector => {
        const node = this.nodes.find(n => n.id === sector.nodeId);
        if (node && node.latitude && node.longitude) {
          const lat = node.latitude + (Math.random() - 0.5) * 0.01;
          const lng = node.longitude + (Math.random() - 0.5) * 0.01;
          allCoords.push([lat, lng]);
        }
      });
      
      // Dispositivos
      this.devices.forEach(device => {
        const coords = this.getDeviceCoordinates(device);
        if (coords) {
          allCoords.push([coords.lat, coords.lng]);
        }
      });
      
      // Clientes
      this.clients.forEach(client => {
        if (client.latitude && client.longitude) {
          allCoords.push([client.latitude, client.longitude]);
        }
      });
      
      if (allCoords.length > 0) {
        const avgLat = allCoords.reduce((sum, coord) => sum + coord[0], 0) / allCoords.length;
        const avgLng = allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length;
        return [avgLat, avgLng];
      }
      
      return this.zone?.latitude && this.zone?.longitude 
        ? [this.zone.latitude, this.zone.longitude]
        : [20.5888, -100.3899];
    },
    
    calculateMapBounds() {
      const coords = [];
      
      this.nodes.forEach(node => {
        if (node.latitude && node.longitude) {
          coords.push([node.latitude, node.longitude]);
        }
      });
      
      this.sectors.forEach(sector => {
        const node = this.nodes.find(n => n.id === sector.nodeId);
        if (node && node.latitude && node.longitude) {
          const lat = node.latitude + (Math.random() - 0.5) * 0.01;
          const lng = node.longitude + (Math.random() - 0.5) * 0.01;
          coords.push([lat, lng]);
        }
      });
      
      this.devices.forEach(device => {
        const coords = this.getDeviceCoordinates(device);
        if (coords) {
          coords.push([coords.lat, coords.lng]);
        }
      });
      
      this.clients.forEach(client => {
        if (client.latitude && client.longitude) {
          coords.push([client.latitude, client.longitude]);
        }
      });
      
      if (coords.length > 0) {
        const lats = coords.map(c => c[0]);
        const lngs = coords.map(c => c[1]);
        return L.latLngBounds(
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        );
      }
      
      return null;
    },
    
    addMapElements() {
      if (!this.leafletMap) return;
      
      this.clearMapElements();
      
      // Nodos
      this.nodes.forEach(node => {
        if (node.latitude && node.longitude) {
          const marker = L.marker([node.latitude, node.longitude], {
            icon: this.createCustomIcon('node', node.active ? 'online' : 'offline')
          }).addTo(this.leafletMap);
          
          marker.bindPopup(this.createPopupContent(node, 'node'));
          this.markers[`node-${node.id}`] = marker;
        }
      });
      
      // Sectores
      this.sectors.forEach(sector => {
        const node = this.nodes.find(n => n.id === sector.nodeId);
        if (node && node.latitude && node.longitude) {
          const lat = node.latitude + (Math.random() - 0.5) * 0.01;
          const lng = node.longitude + (Math.random() - 0.5) * 0.01;
          
          const marker = L.marker([lat, lng], {
            icon: this.createCustomIcon('sector', 'online')
          }).addTo(this.leafletMap);
          
          marker.bindPopup(this.createPopupContent(sector, 'sector'));
          this.markers[`sector-${sector.id}`] = marker;
        }
      });
      
      // Dispositivos
      this.devices.forEach(device => {
        const coordinates = this.getDeviceCoordinates(device);
        if (coordinates) {
          const marker = L.marker([coordinates.lat, coordinates.lng], {
            icon: this.createCustomIcon('device', device.status || 'unknown')
          }).addTo(this.leafletMap);
          
          marker.bindPopup(this.createPopupContent(device, 'device'));
          this.markers[`device-${device.id}`] = marker;
        }
      });
      
      // Clientes
      this.clients.forEach(client => {
        if (client.latitude && client.longitude) {
          const marker = L.marker([client.latitude, client.longitude], {
            icon: this.createCustomIcon('client', client.active ? 'online' : 'offline')
          }).addTo(this.leafletMap);
          
          marker.bindPopup(this.createPopupContent(client, 'client'));
          this.markers[`client-${client.id}`] = marker;
        }
      });
      
      // Conexiones
      this.addConnections();
      
      if (Object.keys(this.markers).length > 0) {
        const group = new L.featureGroup(Object.values(this.markers));
        this.leafletMap.fitBounds(group.getBounds().pad(0.2));
      }
    },
    
    createCustomIcon(type, status) {
      const iconConfig = this.getIconConfig(type, status);
      
      return L.divIcon({
        class: 'custom-map-icon',
        html: `
          <div class="map-icon ${type} ${status}" style="font-size: 25px; color: ${iconConfig.color};">
            ${iconConfig.icon}
          </div>
        `,
        iconSize: [25, 25],
        iconAnchor: [12.5, 12.5]
      });
    },
    
    getIconConfig(type, status) {
      const icons = {
        node: { icon: '🏢', color: '#007bff' },
        sector: { icon: '📡', color: '#28a745' },
        device: { icon: '🔌', color: '#17a2b8' },
        client: { icon: '🏠', color: '#6c757d' }
      };
      
      const statusColors = {
        online: '#28a745',
        offline: '#dc3545',
        warning: '#ffc107',
        maintenance: '#6c757d',
        unknown: '#6c757d'
      };
      
      return {
        ...icons[type],
        color: statusColors[status] || icons[type].color
      };
    },
    
    getDeviceCoordinates(device) {
      if (device.clientId) {
        const client = this.clients.find(c => c.id === device.clientId);
        if (client && client.latitude && client.longitude) {
          return { lat: client.latitude, lng: client.longitude };
        }
      }
      
      if (device.sectorId) {
        const sector = this.sectors.find(s => s.id === device.sectorId);
        if (sector && sector.nodeId) {
          const node = this.nodes.find(n => n.id === sector.nodeId);
          if (node && node.latitude && node.longitude) {
            return {
              lat: node.latitude + (Math.random() - 0.5) * 0.005,
              lng: node.longitude + (Math.random() - 0.5) * 0.005
            };
          }
        }
      }
      
      if (device.nodeId) {
        const node = this.nodes.find(n => n.id === device.nodeId);
        if (node && node.latitude && node.longitude) {
          return {
            lat: node.latitude + (Math.random() - 0.5) * 0.005,
            lng: node.longitude + (Math.random() - 0.5) * 0.005
          };
        }
      }
      
      return null;
    },
    
    createPopupContent(element, type) {
      const typeText = this.getElementTypeText(type);
      const name = element.name || 'Sin nombre';
      const statusText = element.status ? this.getStatusText(element.status) : (element.active !== undefined ? (element.active ? 'Activo' : 'Suspendido') : 'N/A');
      
      return `
        <div class="map-popup">
          <h4>${name}</h4>
          <p><strong>Tipo:</strong> ${typeText}</p>
          <p><strong>Estado:</strong> ${statusText}</p>
          ${element.address ? `<p><strong>Domicilio:</strong> ${element.address}</p>` : ''}
          ${element.location ? `<p><strong>Ubicación:</strong> ${element.location}</p>` : ''}
          ${element.brand ? `<p><strong>Marca:</strong> ${element.brand}</p>` : ''}
        </div>
      `;
    },
    
    addConnections() {
      this.sectors.forEach(sector => {
        if (sector.nodeId) {
          const nodeMarker = this.markers[`node-${sector.nodeId}`];
          const sectorMarker = this.markers[`sector-${sector.id}`];
          
          if (nodeMarker && sectorMarker) {
            const line = L.polyline([
              nodeMarker.getLatLng(),
              sectorMarker.getLatLng()
            ], {
              color: '#007bff',
              weight: 2,
              opacity: 0.7
            }).addTo(this.leafletMap);
            
            this.connections.push(line);
          }
        }
      });
    },
    
    clearMapElements() {
      Object.values(this.markers).forEach(marker => {
        if (this.leafletMap && this.leafletMap.hasLayer(marker)) {
          this.leafletMap.removeLayer(marker);
        }
      });
      this.markers = {};
      
      this.connections.forEach(connection => {
        if (this.leafletMap && this.leafletMap.hasLayer(connection)) {
          this.leafletMap.removeLayer(connection);
        }
      });
      this.connections = [];
    },
    
    getElementTypeText(type) {
      const types = {
        node: 'Nodo Principal',
        sector: 'Sector/Repetidor',
        device: 'Dispositivo',
        client: 'Cliente'
      };
      return types[type] || type;
    },
    
    getStatusText(status) {
      const texts = {
        online: 'En línea',
        offline: 'Fuera de línea',
        warning: 'Con alertas',
        maintenance: 'Mantenimiento',
        unknown: 'Desconocido'
      };
      return texts[status] || 'Desconocido';
    },
    
    // Clientes
    updateSectorFilter() {
      if (!this.filters.nodeId) {
        this.filters.sectorId = '';
      } else if (!this.filteredSectors.some(sector => sector.id === parseInt(this.filters.sectorId))) {
        this.filters.sectorId = '';
      }
    },
    
    sortClients(key) {
      if (this.sortKey === key) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortKey = key;
        this.sortOrder = 'asc';
      }
    },
    
    getSectorName(sectorId) {
      const sector = this.sectors.find(s => s.id === sectorId);
      return sector ? sector.name : null;
    },
    
    createClient() {
      this.$router.push(`/clients/new?zoneId=${this.zoneId}`);
    },
    
    viewClient(clientId) {
      this.$router.push(`/clients/${clientId}`);
    },
    
    editClient(client) {
      this.$router.push(`/clients/${client.id}/edit`);
    },
    
    confirmDeleteClient(client) {
      this.deleteClientItem = client;
      this.showDeleteClientModal = true;
    },
    
    async executeDeleteClient() {
      if (!this.deleteClientItem) return;
      
      try {
        await ClientService.deleteClient(this.deleteClientItem.id);
        await this.loadMapData();
        this.showDeleteClientModal = false;
        this.deleteClientItem = null;
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        this.error = 'Error al eliminar el cliente';
        this.showDeleteClientModal = false;
      }
    },
    
    cancelDeleteClient() {
      this.showDeleteClientModal = false;
      this.deleteClientItem = null;
    },
    
    // Otros métodos
    async refreshNodes() {
      await this.loadNodes();
      await this.loadMapData();
      this.initializeMap();
    },
    
    goBack() {
      this.$router.push('/network');
    },
    
    editZone() {
      this.$router.push(`/zones/${this.zoneId}/edit`);
    },
    
    createNode() {
      this.$router.push(`/nodes/new?zoneId=${this.zoneId}`);
    },
    
    viewNode(nodeId) {
      this.$router.push(`/nodes/${nodeId}`);
    },
    
    editNode(nodeId) {
      this.$router.push(`/nodes/${nodeId}/edit`);
    },
    
    manageServices() {
      this.$router.push('/service-packages');
    },
    
    openInMaps() {
      if (this.zone && this.zone.latitude && this.zone.longitude) {
        const url = `https://www.google.com/maps?q=${this.zone.latitude},${this.zone.longitude}`;
        window.open(url, '_blank');
      }
    },
    
    async toggleZoneStatus() {
      try {
        const newStatus = !this.zone.active;
        await NetworkService.updateZone(this.zoneId, { active: newStatus });
        this.zone.active = newStatus;
        this.showDropdown = false;
      } catch (error) {
        console.error('Error al cambiar estado de zona:', error);
        this.error = 'Error al cambiar el estado de la zona';
      }
    },
    
    confirmDeleteZone() {
      this.showDeleteModal = true;
      this.showDropdown = false;
      this.deleteConfirmation = '';
    },
    
    async confirmDelete() {
      if (this.deleteConfirmation !== this.zone.name) {
        return;
      }
      
      try {
        await NetworkService.deleteZone(this.zoneId);
        this.$router.push('/network');
      } catch (error) {
        console.error('Error al eliminar zona:', error);
        this.error = 'Error al eliminar la zona';
        this.showDeleteModal = false;
      }
    },
    
    cancelDelete() {
      this.showDeleteModal = false;
      this.deleteConfirmation = '';
    },
    
    confirmDeleteNode(node) {
      this.deleteNodeItem = node;
      this.showDeleteNodeModal = true;
    },
    
    async executeDeleteNode() {
      if (!this.deleteNodeItem) return;
      
      try {
        await NetworkService.deleteNode(this.deleteNodeItem.id);
        await this.loadNodes();
        await this.loadMapData();
        this.showDeleteNodeModal = false;
        this.deleteNodeItem = null;
      } catch (error) {
        console.error('Error al eliminar nodo:', error);
        this.error = 'Error al eliminar el nodo';
        this.showDeleteNodeModal = false;
      }
    },
    
    cancelDeleteNode() {
      this.showDeleteNodeModal = false;
      this.deleteNodeItem = null;
    },
    
    formatDate(dateString) {
      if (!dateString) return '-';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return '-';
      }
    }
  }
};
</script>

<style scoped>
.zone-detail {
  padding: 24px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

/* Header */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-navigation {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  background: #f8f9fa;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #e9ecef;
  border-color: #3498db;
}

.back-btn .icon {
  font-size: 1.2rem;
  color: #3498db;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}

.breadcrumb-link {
  color: #3498db;
  text-decoration: none;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  color: #7f8c8d;
}

.breadcrumb-current {
  color: #2c3e50;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
  position: relative;
}

.dropdown {
  position: relative;
}

.dropdown-toggle {
  width: 40px;
  padding: 10px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 100;
  margin-top: 4px;
}

.dropdown-item {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.dropdown-item.danger {
  color: #e74c3c;
}

.dropdown-item.danger:hover {
  background: #ffebee;
}

/* Estados de carga */
.loading-state, .error-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e1e5e9;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.error-state h3 {
  color: #2c3e50;
  margin-bottom: 8px;
}

.error-state p {
  color: #7f8c8d;
  margin-bottom: 24px;
}

/* Contenido principal */
.zone-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Información general */
.info-section {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.zone-header-info {
  margin-bottom: 32px;
}

.zone-title {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.zone-title h1 {
  margin: 0;
  color: #2c3e50;
  font-size: 2.5rem;
  font-weight: 700;
}

.zone-description p {
  color: #7f8c8d;
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;
}

/* Estadísticas */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2.5rem;
  opacity: 0.9;
}

.stat-info h3 {
  font-size: 2rem;
  font-weight: bold;
  margin: 0;
}

.stat-info p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

/* Secciones */
.location-section,
.nodes-section,
.services-section,
.clients-section,
.system-info-section {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f3f4;
}

.section-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
  font-weight: 600;
}

.section-actions {
  display: flex;
  gap: 8px;
}

/* Ubicación */
.location-info {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
}

.coordinates-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #3498db;
}

.coordinate-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.coordinate-item:last-child {
  margin-bottom: 0;
}

.coordinate-label {
  color: #7f8c8d;
  font-weight: 600;
}

.coordinate-value {
  color: #2c3e50;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}

.map-container {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e1e5e9;
}

.leaflet-container {
  width: 100%;
  height: 100%;
}

.loading-map,
.error-map {
  text-align: center;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #e1e5e9;
}

.loading-map {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #7f8c8d;
}

.error-map p {
  color: #e74c3c;
  margin: 8px 0 0;
}

:deep(.custom-map-icon) {
  background: none !important;
  border: none !important;
}

:deep(.map-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

:deep(.map-icon.online) {
  background: #28a745;
}

:deep(.map-icon.offline) {
  background: #dc3545;
}

:deep(.map-icon.warning) {
  background: #ffc107;
}

:deep(.map-icon.maintenance) {
  background: #6c757d;
}

:deep(.map-popup) {
  min-width: 200px;
}

:deep(.map-popup h4) {
  margin: 0 0 10px 0;
  color: #333;
}

:deep(.map-popup p) {
  margin: 5px 0;
  font-size: 0.9em;
}

/* Nodos */
.loading-nodes,
.loading-clients {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  color: #7f8c8d;
}

.empty-nodes,
.empty-clients {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.7;
}

.empty-nodes h3,
.empty-clients h3 {
  color: #2c3e50;
  margin-bottom: 8px;
}

.empty-nodes p,
.empty-clients p {
  color: #7f8c8d;
  margin-bottom: 24px;
}

.nodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.node-card {
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  cursor: pointer;
  background: white;
}

.node-card:hover {
  border-color: #3498db;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.node-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.node-status {
  font-size: 1.2rem;
}

.node-info {
  margin-bottom: 16px;
}

.node-detail {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.detail-label {
  color: #7f8c8d;
  font-weight: 600;
}

.detail-value {
  color: #2c3e50;
}

.node-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  border-top: 1px solid #f1f3f4;
  border-bottom: 1px solid #f1f3f4;
  margin-bottom: 16px;
}

.node-stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #3498db;
}

.stat-label {
  font-size: 0.8rem;
  color: #7f8c8d;
  text-transform: uppercase;
}

.node-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Clientes */
.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.filter-item {
  flex: 1;
  min-width: 200px;
}

.filter-item label {
  display: block;
  font-size: 0.85rem;
  color: #7f8c8d;
  font-weight: 600;
  margin-bottom: 8px;
}

.filter-item select,
.filter-item input {
  width: 100%;
  padding: 10px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
}

.filter-item select:focus,
.filter-item input:focus {
  outline: none;
  border-color: #3498db;
}

.clients-table {
  width: 100%;
  border-collapse: collapse;
}

.clients-table th,
.clients-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e1e5e9;
}

.clients-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
  cursor: pointer;
}

.clients-table th:hover {
  background: #e9ecef;
}

.sort-icon {
  margin-left: 8px;
  font-size: 0.8rem;
  opacity: 0.5;
}

.sort-icon.active {
  opacity: 1;
}

.sort-icon.desc {
  transform: rotate(180deg);
}

.clients-table td.actions {
  display: flex;
  gap: 8px;
}

/* Servicios */
.empty-services {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.empty-services .empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.7;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.service-card {
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  background: white;
}

.service-card:hover {
  border-color: #3498db;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.service-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.service-price {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 600;
}

.service-details {
  margin-bottom: 16px;
}

.service-speed {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.speed-down, .speed-up {
  background: #f8f9fa;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #2c3e50;
}

.service-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature {
  font-size: 0.85rem;
  color: #7f8c8d;
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-clients {
  padding-top: 12px;
  border-top: 1px solid #f1f3f4;
}

.clients-count {
  font-size: 0.85rem;
  color: #3498db;
  font-weight: 600;
}

/* Información del sistema */
.system-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #3498db;
}

.info-label {
  font-size: 0.85rem;
  color: #7f8c8d;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.info-value {
  font-size: 1rem;
  color: #2c3e50;
  font-weight: 500;
}

.status-indicator {
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-indicator.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-indicator.inactive {
  background: #ffebee;
  color: #c62828;
}

/* Estados y badges */
.status-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.inactive {
  background: #ffebee;
  color: #c62828;
}

/* Botones */
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #7f8c8d;
}

.btn-edit {
  background: #f39c12;
  color: white;
}

.btn-edit:hover:not(:disabled) {
  background: #d68910;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c0392b;
}

.btn-small {
  padding: 6px 10px;
  font-size: 0.8rem;
}

/* Modales */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
  padding: 4px;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  margin: 0 0 16px;
  color: #2c3e50;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
  margin: 16px 0;
}

.warning-icon {
  font-size: 1.25rem;
  color: #f39c12;
  flex-shrink: 0;
}

.warning-content p {
  margin: 0 0 8px;
  color: #d68910;
}

.warning-content ul {
  margin: 8px 0 0 16px;
  color: #d68910;
}

.warning-text p {
  margin: 0 0 4px;
  color: #d68910;
}

.danger-info {
  margin-top: 16px;
  padding: 12px;
  background: #ffebee;
  border-radius: 6px;
}

.confirmation-input {
  margin-top: 20px;
}

.confirmation-input label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 600;
}

.confirmation-field {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 0.95rem;
}

.confirmation-field:focus {
  outline: none;
  border-color: #3498db;
}

.modal-actions {
  padding: 0 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 768px) {
  .zone-detail {
    padding: 16px;
  }
  
  .detail-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .location-info {
    grid-template-columns: 1fr;
  }
  
  .nodes-grid {
    grid-template-columns: 1fr;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
  
  .system-info-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-group {
    flex-direction: column;
  }
  
  .filter-item {
    min-width: auto;
  }
}
</style>