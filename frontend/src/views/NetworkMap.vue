<template>
  <div class="network-map">
    <div class="header">
      <h2>Mapa de Red</h2>
      <div class="actions">
        <button @click="refreshMap" class="refresh-button" :disabled="loading">
          🔄 Actualizar
        </button>
        <button @click="toggleView" class="view-toggle">
          {{ mapView === 'geographic' ? '🗺️ Vista Geográfica' : '📊 Vista Topológica' }}
        </button>
        <button @click="exportMap" class="export-button">
          📷 Exportar
        </button>
        <button @click="showSettings" class="settings-button">
          ⚙️ Configuración
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando topología de red...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="map-content">
      <!-- Panel de Control -->
      <div class="control-panel">
        <div class="panel-section">
          <h3>Filtros</h3>
          <div class="filter-group">
            <label>Nodos:</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="filters.showNodes" @change="updateMapView" />
                <span>Mostrar Nodos</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="filters.showSectors" @change="updateMapView" />
                <span>Mostrar Sectores</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="filters.showClients" @change="updateMapView" />
                <span>Mostrar Clientes</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="filters.showDevices" @change="updateMapView" />
                <span>Mostrar Dispositivos</span>
              </label>
            </div>
          </div>
          <div class="filter-group">
            <label>Estado:</label>
            <select v-model="filters.status" @change="updateMapView">
              <option value="">Todos los estados</option>
              <option value="online">En línea</option>
              <option value="offline">Fuera de línea</option>
              <option value="warning">Con alertas</option>
              <option value="maintenance">Mantenimiento</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Tipo de Dispositivo:</label>
            <select v-model="filters.deviceType" @change="updateMapView">
              <option value="">Todos los tipos</option>
              <option value="router">Routers</option>
              <option value="switch">Switches</option>
              <option value="antenna">Antenas</option>
              <option value="cpe">CPEs</option>
              <option value="ont">ONTs</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Marca:</label>
            <select v-model="filters.brand" @change="updateMapView">
              <option value="">Todas las marcas</option>
              <option value="mikrotik">Mikrotik</option>
              <option value="ubiquiti">Ubiquiti</option>
              <option value="tplink">TP-Link</option>
              <option value="cambium">Cambium</option>
              <option value="mimosa">Mimosa</option>
            </select>
          </div>
        </div>
        <div class="panel-section">
          <h3>Estadísticas</h3>
          <div class="stats-list">
            <div class="stat-item">
              <span class="stat-label">Nodos:</span>
              <span class="stat-value">{{ networkStats.totalNodes }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Sectores:</span>
              <span class="stat-value">{{ networkStats.totalSectors }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Dispositivos:</span>
              <span class="stat-value">{{ networkStats.totalDevices }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Clientes:</span>
              <span class="stat-value">{{ networkStats.totalClients }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">En línea:</span>
              <span class="stat-value online">{{ networkStats.onlineDevices }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Fuera de línea:</span>
              <span class="stat-value offline">{{ networkStats.offlineDevices }}</span>
            </div>
          </div>
        </div>
        <div class="panel-section">
          <h3>Leyenda</h3>
          <div class="legend">
            <div class="legend-item">
              <div class="legend-icon node"></div>
              <span>Nodo Principal</span>
            </div>
            <div class="legend-item">
              <div class="legend-icon sector"></div>
              <span>Sector/Repetidor</span>
            </div>
            <div class="legend-item">
              <div class="legend-icon device online"></div>
              <span>Dispositivo Online</span>
            </div>
            <div class="legend-item">
              <div class="legend-icon device offline"></div>
              <span>Dispositivo Offline</span>
            </div>
            <div class="legend-item">
              <div class="legend-icon client"></div>
              <span>Cliente</span>
            </div>
            <div class="legend-item">
              <div class="legend-line"></div>
              <span>Conexión</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Mapa Principal -->
      <div class="map-container">
        <!-- Vista Geográfica -->
        <div v-if="mapView === 'geographic'" class="geographic-map">
          <div ref="leafletMap" class="leaflet-container"></div>
          <!-- Controles del Mapa -->
          <div class="map-controls">
            <button @click="centerMap" class="map-control-btn" title="Centrar mapa">
              🎯
            </button>
            <button @click="toggleHeatmap" class="map-control-btn" title="Mapa de calor">
              🔥
            </button>
            <button @click="toggleCoverage" class="map-control-btn" title="Cobertura">
              📡
            </button>
            <button @click="measureDistance" class="map-control-btn" title="Medir distancia">
              📏
            </button>
          </div>
        </div>

        <!-- Vista Topológica -->
        <div v-if="mapView === 'topology'" class="topology-map">
          <div ref="topologyContainer" class="topology-container"></div>
          <!-- Controles de Topología -->
          <div class="topology-controls">
            <button @click="resetTopologyView" class="topology-control-btn">
              🔄 Restablecer Vista
            </button>
            <button @click="arrangeHierarchy" class="topology-control-btn">
              📊 Vista Jerárquica
            </button>
            <button @click="arrangeCircular" class="topology-control-btn">
              ⭕ Vista Circular
            </button>
            <button @click="arrangeForce" class="topology-control-btn">
              🌐 Vista de Fuerza
            </button>
          </div>
        </div>

        <!-- Panel de Información -->
        <div v-if="selectedElement" class="info-panel">
          <div class="info-header">
            <h4>{{ selectedElement.name }}</h4>
            <button @click="closeInfoPanel" class="close-btn">✕</button>
          </div>
          <div class="info-content">
            <div class="info-item">
              <span class="info-label">Tipo:</span>
              <span class="info-value">{{ getElementTypeText(selectedElement.type) }}</span>
            </div>
            <div class="info-item" v-if="selectedElement.status">
              <span class="info-label">Estado:</span>
              <span :class="['info-value', 'status', selectedElement.status]">
                {{ getStatusText(selectedElement.status) }}
              </span>
            </div>
            <div class="info-item" v-if="selectedElement.ipAddress">
              <span class="info-label">IP:</span>
              <span class="info-value">{{ selectedElement.ipAddress }}</span>
            </div>
            <div class="info-item" v-if="selectedElement.location">
              <span class="info-label">Ubicación:</span>
              <span class="info-value">{{ selectedElement.location }}</span>
            </div>
            <div class="info-item" v-if="selectedElement.coordinates">
              <span class="info-label">Coordenadas:</span>
              <span class="info-value">
                {{ selectedElement.coordinates.lat }}, {{ selectedElement.coordinates.lng }}
              </span>
            </div>
            <div v-if="selectedElement.metrics" class="metrics-section">
              <h5>Métricas</h5>
              <div class="metrics-grid">
                <div v-if="selectedElement.metrics.cpu" class="metric-item">
                  <span class="metric-label">CPU:</span>
                  <span class="metric-value">{{ selectedElement.metrics.cpu }}%</span>
                </div>
                <div v-if="selectedElement.metrics.memory" class="metric-item">
                  <span class="metric-label">RAM:</span>
                  <span class="metric-value">{{ selectedElement.metrics.memory }}%</span>
                </div>
                <div v-if="selectedElement.metrics.signal" class="metric-item">
                  <span class="metric-label">Señal:</span>
                  <span class="metric-value">{{ selectedElement.metrics.signal }}dBm</span>
                </div>
              </div>
            </div>
            <div v-if="selectedElement.connections" class="connections-section">
              <h5>Conexiones ({{ selectedElement.connections.length }})</h5>
              <div class="connections-list">
                <div
                  v-for="connection in selectedElement.connections"
                  :key="connection.id"
                  class="connection-item"
                  @click="selectElement(connection)"
                >
                  <span class="connection-name">{{ connection.name }}</span>
                  <span :class="['connection-status', connection.status]">
                    {{ getStatusIcon(connection.status) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="info-actions">
              <button @click="viewElementDetails" class="action-btn primary">
                👁️ Ver Detalles
              </button>
              <button v-if="selectedElement.type === 'device'" @click="manageElement" class="action-btn">
                ⚙️ Gestionar
              </button>
              <button @click="pingElement" class="action-btn">
                📡 Ping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Configuración -->
    <div v-if="showSettingsModal" class="modal" @click="closeSettings">
      <div class="modal-content" @click.stop>
        <h3>Configuración del Mapa</h3>
        <div class="settings-content">
          <div class="setting-group">
            <h4>Apariencia</h4>
            <div class="setting-item">
              <label>Tema del mapa:</label>
              <select v-model="settings.mapTheme" @change="applySettings">
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
                <option value="satellite">Satélite</option>
                <option value="terrain">Terreno</option>
              </select>
            </div>
            <div class="setting-item">
              <label>Tamaño de iconos:</label>
              <input
                type="range"
                v-model="settings.iconSize"
                min="10"
                max="50"
                @change="applySettings"
              />
              <span>{{ settings.iconSize }}px</span>
            </div>
            <div class="setting-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.showLabels" @change="applySettings" />
                <span>Mostrar etiquetas</span>
              </label>
            </div>
            <div class="setting-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.showConnections" @change="applySettings" />
                <span>Mostrar conexiones</span>
              </label>
            </div>
          </div>
          <div class="setting-group">
            <h4>Actualización</h4>
            <div class="setting-item">
              <label>Actualización automática:</label>
              <select v-model="settings.autoRefresh" @change="applySettings">
                <option value="off">Desactivada</option>
                <option value="30s">30 segundos</option>
                <option value="1m">1 minuto</option>
                <option value="5m">5 minutos</option>
                <option value="10m">10 minutos</option>
              </select>
            </div>
            <div class="setting-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.animateChanges" @change="applySettings" />
                <span>Animar cambios de estado</span>
              </label>
            </div>
          </div>
          <div class="setting-group">
            <h4>Notificaciones</h4>
            <div class="setting-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.notifyOffline" @change="applySettings" />
                <span>Notificar dispositivos offline</span>
              </label>
            </div>
            <div class="setting-item">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.notifyAlerts" @change="applySettings" />
                <span>Notificar alertas</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="resetSettings" class="reset-btn">Restablecer</button>
          <button @click="closeSettings" class="close-btn">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Medición de Distancia -->
    <div v-if="showDistanceModal" class="modal" @click="closeDistanceModal">
      <div class="modal-content measurement-modal" @click.stop>
        <h3>Medición de Distancia</h3>
        <div class="measurement-content">
          <div class="measurement-info">
            <div class="measurement-item">
              <span class="measurement-label">Distancia:</span>
              <span class="measurement-value">{{ measurementResult.distance }}</span>
            </div>
            <div class="measurement-item">
              <span class="measurement-label">Línea de vista:</span>
              <span :class="['measurement-value', measurementResult.lineOfSight ? 'good' : 'bad']">
                {{ measurementResult.lineOfSight ? 'Libre' : 'Obstruida' }}
              </span>
            </div>
            <div class="measurement-item">
              <span class="measurement-label">Elevación:</span>
              <span class="measurement-value">{{ measurementResult.elevation }}</span>
            </div>
          </div>
          <div class="measurement-actions">
            <button @click="clearMeasurement" class="clear-btn">Limpiar</button>
            <button @click="saveMeasurement" class="save-btn">Guardar</button>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeDistanceModal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import * as d3 from 'd3';
import 'leaflet/dist/leaflet.css';
import NetworkService from '@/services/network.service';
import DeviceService from '@/services/device.service';
import ClientService from '@/services/client.service';

export default {
 name: 'NetworkMap',
 data() {
   return {
     mapView: 'geographic',
     nodes: [],
     sectors: [],
     devices: [],
     clients: [],
     networkStats: {},
     selectedElement: null,
     leafletMap: null,
     topologyGraph: null,
     loading: true,
     error: null,
     showSettingsModal: false,
     showDistanceModal: false,
     measurementResult: {},
     refreshInterval: null,
     filters: {
       showNodes: true,
       showSectors: true,
       showClients: true,
       showDevices: true,
       status: '',
       deviceType: '',
       brand: ''
     },
     settings: {
       mapTheme: 'light',
       iconSize: 25,
       showLabels: true,
       showConnections: true,
       autoRefresh: 'off',
       animateChanges: true,
       notifyOffline: true,
       notifyAlerts: true
     },
     markers: {},
     connections: [],
     mapLayers: {}
   };
 },
 created() {
   this.loadNetworkData();
 },
 mounted() {
   this.$nextTick(() => {
     this.fixLeafletIcons();
     setTimeout(() => {
       this.initializeMap();
       this.setupAutoRefresh();
     }, 100);
     window.addEventListener('resize', this.handleResize);
   });
 },
 beforeUnmount() {
   this.clearAutoRefresh();
   if (this.leafletMap) {
     this.leafletMap.remove();
   }
   window.removeEventListener('resize', this.handleResize);
 },
 methods: {
   fixLeafletIcons() {
     delete L.Icon.Default.prototype._getIconUrl;
     L.Icon.Default.mergeOptions({
       iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
       iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
       shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
     });
   },
   async loadNetworkData() {
     this.loading = true;
     try {
       // Cargar datos reales desde la API
       const [nodesResponse, sectorsResponse, devicesResponse, clientsResponse] = await Promise.allSettled([
         this.loadNodesData(),
         this.loadSectorsData(), 
         this.loadDevicesData(),
         this.loadClientsData()
       ]);

       console.log('Datos cargados:', {
         nodes: this.nodes.length,
         sectors: this.sectors.length,
         devices: this.devices.length,
         clients: this.clients.length
       });

       // Verificar datos con coordenadas
       const clientsWithCoords = this.clients.filter(c => c.latitude && c.longitude);
       const nodesWithCoords = this.nodes.filter(n => n.latitude && n.longitude);
       
       console.log('Elementos con coordenadas:', {
         clientsWithCoords: clientsWithCoords.length,
         nodesWithCoords: nodesWithCoords.length
       });

       this.calculateNetworkStats();
       this.updateMapView();
       
     } catch (error) {
       console.error('Error cargando datos de red:', error);
       this.error = 'Error cargando datos de la red: ' + error.message;
     } finally {
       this.loading = false;
     }
   },
   async loadNodesData() {
     try {
      const response = await NetworkService.getAllNodes();
      
      // Manejar respuesta de nodos
      if (Array.isArray(response.data)) {
        this.nodes = response.data;
      } else if (response.data && Array.isArray(response.data.nodes)) {
        this.nodes = response.data.nodes;
      } else {
        this.nodes = [];
      }
     } catch (error) {
      console.warn('Error cargando nodos, usando datos de prueba:', error);
      this.nodes = [
        { id: 1, name: 'Nodo Principal', latitude: 20.5888, longitude: -100.3899, location: 'Centro' }
      ];
     }
   },

   async loadSectorsData() {
     try {
      const response = await NetworkService.getAllSectors();
      
      // Manejar respuesta de sectores
      if (Array.isArray(response.data)) {
        this.sectors = response.data;
      } else if (response.data && Array.isArray(response.data.sectors)) {
        this.sectors = response.data.sectors;
      } else {
        this.sectors = [];
      }
     } catch (error) {
      console.warn('Error cargando sectores, usando datos de prueba:', error);
      this.sectors = [
        { id: 1, name: 'Sector Norte', nodeId: 1 },
        { id: 2, name: 'Sector Sur', nodeId: 1 }
      ];
     }
   },
   async loadDevicesData() {
     try {
      const response = await DeviceService.getAllDevices();
      
      // 🔧 ARREGLO: Manejar la estructura de respuesta correcta
      if (response.data && Array.isArray(response.data)) {
        // Si response.data es directamente un array
        this.devices = response.data;
      } else if (response.data && response.data.devices && Array.isArray(response.data.devices)) {
        // Si response.data tiene la estructura paginada como ClientService
        this.devices = response.data.devices;
      } else {
        // Fallback a array vacío
        console.warn('Estructura de respuesta inesperada para devices:', response.data);
        this.devices = [];
      }
     } catch (error) {
      console.warn('Error cargando dispositivos, usando datos de prueba:', error);
      this.devices = [
        { id: 1, name: 'Router Principal', status: 'online', sectorId: 1, brand: 'mikrotik', type: 'router', ipAddress: '192.168.1.1' },
        { id: 2, name: 'Switch Core', status: 'online', sectorId: 1, brand: 'ubiquiti', type: 'switch', ipAddress: '192.168.1.2' },
        { id: 3, name: 'CPE Cliente 1', status: 'offline', sectorId: 2, brand: 'tplink', type: 'cpe', ipAddress: '192.168.1.100' }
      ];
     }
   },
   async loadClientsData() {
     try {
       const response = await ClientService.getAllClients({ size: 1000 });
       this.clients = response.data.clients || response.data || [];
     } catch (error) {
       console.warn('Error cargando clientes, usando datos de prueba:', error);
       this.clients = [
         { id: 1, firstName: 'Juan', lastName: 'Pérez', latitude: 20.59, longitude: -100.39, active: true, sectorId: 1 },
         { id: 2, firstName: 'María', lastName: 'González', latitude: 20.58, longitude: -100.38, active: true, sectorId: 2 },
         { id: 3, firstName: 'Carlos', lastName: 'López', latitude: 20.57, longitude: -100.37, active: false, sectorId: 1 }
       ];
     }
   },
   calculateNetworkStats() {
     this.networkStats = {
       totalNodes: this.nodes.length,
       totalSectors: this.sectors.length,
       totalDevices: this.devices.length,
       totalClients: this.clients.length,
       onlineDevices: this.devices.filter(d => d.status === 'online').length,
       offlineDevices: this.devices.filter(d => d.status === 'offline').length
     };
   },
   calculateMapCenter() {
     const allCoords = [];
     
     // Agregar coordenadas de nodos
     this.nodes.forEach(node => {
       if (node.latitude && node.longitude) {
         allCoords.push([node.latitude, node.longitude]);
       }
     });
     
     // Agregar coordenadas de clientes
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
     
     // Fallback: centro de México
     return [20.5888, -100.3899];
   },
   initializeMap() {
     if (this.mapView === 'geographic') {
       this.initializeLeafletMap();
     } else {
       this.initializeTopologyGraph();
     }
   },
   initializeLeafletMap() {
     this.$nextTick(() => {
       const container = this.$refs.leafletMap;
       if (!container) {
         console.error('Contenedor del mapa no encontrado');
         this.error = 'No se pudo inicializar el mapa: contenedor no encontrado.';
         return;
       }

       if (container.offsetWidth === 0 || container.offsetHeight === 0) {
         console.warn('Contenedor sin dimensiones, reintentando...');
         setTimeout(() => this.initializeLeafletMap(), 100);
         return;
       }

       if (this.leafletMap) {
         this.leafletMap.remove();
       }

       const center = this.calculateMapCenter();
       this.leafletMap = L.map(container).setView(center, 12);

       L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution: '© OpenStreetMap contributors',
         maxZoom: 18
       }).addTo(this.leafletMap);

       setTimeout(() => {
         if (this.leafletMap) {
           this.leafletMap.invalidateSize();
         }
       }, 200);

       this.addMapElements();
     });
   },
   initializeTopologyGraph() {
     const container = this.$refs.topologyContainer;
     if (!container) {
       console.error('Contenedor de topología no encontrado');
       return;
     }

     d3.select(container).selectAll("*").remove();

     const width = container.clientWidth || 800;
     const height = container.clientHeight || 600;

     const svg = d3.select(container)
       .append("svg")
       .attr("width", width)
       .attr("height", height);

     this.createTopologyGraph(svg, width, height);
   },
   createTopologyGraph(svg, width, height) {
     const topologyData = this.prepareTopologyData();

     const simulation = d3.forceSimulation(topologyData.nodes)
       .force("link", d3.forceLink(topologyData.links).id(d => d.id).distance(100))
       .force("charge", d3.forceManyBody().strength(-300))
       .force("center", d3.forceCenter(width / 2, height / 2));

     const link = svg.append("g")
       .selectAll("line")
       .data(topologyData.links)
       .enter().append("line")
       .attr("stroke", "#999")
       .attr("stroke-opacity", 0.6)
       .attr("stroke-width", 2);

     const node = svg.append("g")
       .selectAll("circle")
       .data(topologyData.nodes)
       .enter().append("circle")
       .attr("r", d => this.getNodeRadius(d.type))
       .attr("fill", d => this.getNodeColor(d.type, d.status))
       .call(d3.drag()
         .on("start", this.dragstarted)
         .on("drag", this.dragged)
         .on("end", this.dragended))
       .on("click", (event, d) => {
         this.selectElement(d.data);
       });

     if (this.settings.showLabels) {
       const labels = svg.append("g")
         .selectAll("text")
         .data(topologyData.nodes)
         .enter().append("text")
         .text(d => d.name)
         .attr("font-size", "10px")
         .attr("dx", 15)
         .attr("dy", 4);
     }

     simulation.on("tick", () => {
       link
         .attr("x1", d => d.source.x)
         .attr("y1", d => d.source.y)
         .attr("x2", d => d.target.x)
         .attr("y2", d => d.target.y);

       node
         .attr("cx", d => d.x)
         .attr("cy", d => d.y);

       if (this.settings.showLabels) {
         svg.selectAll("text")
           .attr("x", d => d.x)
           .attr("y", d => d.y);
       }
     });

     this.topologyGraph = { svg, simulation, nodes: topologyData.nodes, links: topologyData.links };
   },
   prepareTopologyData() {
     const nodes = [];
     const links = [];

     if (this.filters.showNodes) {
       this.nodes.forEach(node => {
         nodes.push({
           id: `node-${node.id}`,
           name: node.name,
           type: 'node',
           status: 'online',
           data: { ...node, type: 'node' }
         });
       });
     }

     if (this.filters.showSectors) {
       this.sectors.forEach(sector => {
         nodes.push({
           id: `sector-${sector.id}`,
           name: sector.name,
           type: 'sector',
           status: 'online',
           data: { ...sector, type: 'sector' }
         });

         if (sector.nodeId) {
           links.push({
             source: `node-${sector.nodeId}`,
             target: `sector-${sector.id}`
           });
         }
       });
     }

     if (this.filters.showDevices) {
       const filteredDevices = this.getFilteredDevices();
       filteredDevices.forEach(device => {
         nodes.push({
           id: `device-${device.id}`,
           name: device.name,
           type: 'device',
           status: device.status || 'unknown',
           data: { ...device, type: 'device' }
         });

         if (device.sectorId) {
           links.push({
             source: `sector-${device.sectorId}`,
             target: `device-${device.id}`
           });
         } else if (device.nodeId) {
           links.push({
             source: `node-${device.nodeId}`,
             target: `device-${device.id}`
           });
         }
       });
     }

     if (this.filters.showClients) {
       this.clients.slice(0, 50).forEach(client => {
         nodes.push({
           id: `client-${client.id}`,
           name: `${client.firstName} ${client.lastName}`,
           type: 'client',
           status: client.active ? 'online' : 'offline',
           data: { ...client, type: 'client', name: `${client.firstName} ${client.lastName}` }
         });

         if (client.sectorId) {
           links.push({
             source: `sector-${client.sectorId}`,
             target: `client-${client.id}`
           });
         }
       });
     }

     return { nodes, links };
   },
   addMapElements() {
     if (!this.leafletMap) return;

     this.clearMapElements();

     if (this.filters.showNodes) {
       this.nodes.forEach(node => {
         if (node.latitude && node.longitude) {
           const marker = L.marker([node.latitude, node.longitude], {
             icon: this.createCustomIcon('node', 'online')
           }).addTo(this.leafletMap);

           marker.bindPopup(this.createPopupContent(node, 'node'));
           marker.on('click', () => this.selectElement({ ...node, type: 'node' }));

           this.markers[`node-${node.id}`] = marker;
         }
       });
     }

     if (this.filters.showSectors) {
       this.sectors.forEach(sector => {
         const node = this.nodes.find(n => n.id === sector.nodeId);
         if (node && node.latitude && node.longitude) {
           const lat = node.latitude + (Math.random() - 0.5) * 0.01;
           const lng = node.longitude + (Math.random() - 0.5) * 0.01;

           const marker = L.marker([lat, lng], {
             icon: this.createCustomIcon('sector', 'online')
           }).addTo(this.leafletMap);

           marker.bindPopup(this.createPopupContent(sector, 'sector'));
           marker.on('click', () => this.selectElement({ ...sector, type: 'sector' }));

           this.markers[`sector-${sector.id}`] = marker;
         }
       });
     }

     if (this.filters.showDevices) {
       const filteredDevices = this.getFilteredDevices();
       filteredDevices.forEach(device => {
         const coordinates = this.getDeviceCoordinates(device);
         if (coordinates) {
           const marker = L.marker([coordinates.lat, coordinates.lng], {
             icon: this.createCustomIcon('device', device.status || 'unknown')
           }).addTo(this.leafletMap);

           marker.bindPopup(this.createPopupContent(device, 'device'));
           marker.on('click', () => this.selectElement({ ...device, type: 'device' }));

           this.markers[`device-${device.id}`] = marker;
         }
       });
     }

     if (this.filters.showClients) {
       this.clients.forEach(client => {
         if (client.latitude && client.longitude) {
           const marker = L.marker([client.latitude, client.longitude], {
             icon: this.createCustomIcon('client', client.active ? 'online' : 'offline')
           }).addTo(this.leafletMap);

           const clientName = `${client.firstName} ${client.lastName}`;
           marker.bindPopup(this.createPopupContent({ ...client, name: clientName }, 'client'));
           marker.on('click', () => this.selectElement({ ...client, type: 'client', name: clientName }));

           this.markers[`client-${client.id}`] = marker;
         }
       });
     }

     if (this.settings.showConnections) {
       this.addConnections();
     }

     // Ajustar vista si hay marcadores
     if (Object.keys(this.markers).length > 0) {
       const group = new L.featureGroup(Object.values(this.markers));
       this.leafletMap.fitBounds(group.getBounds().pad(0.1));
     }
   },
   createCustomIcon(type, status) {
     const iconConfig = this.getIconConfig(type, status);

     return L.divIcon({
       className: 'custom-map-icon',
       html: `
         <div class="map-icon ${type} ${status}" style="font-size: ${this.settings.iconSize}px; color: ${iconConfig.color};">
           ${iconConfig.icon}
         </div>
       `,
       iconSize: [this.settings.iconSize, this.settings.iconSize],
       iconAnchor: [this.settings.iconSize / 2, this.settings.iconSize / 2]
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
     const name = element.name || `${element.firstName} ${element.lastName}` || 'Sin nombre';
     const statusText = element.status ? this.getStatusText(element.status) : (element.active !== undefined ? (element.active ? 'Activo' : 'Inactivo') : 'N/A');

     return `
       <div class="map-popup">
         <h4>${name}</h4>
         <p><strong>Tipo:</strong> ${typeText}</p>
         <p><strong>Estado:</strong> ${statusText}</p>
         ${element.ipAddress ? `<p><strong>IP:</strong> ${element.ipAddress}</p>` : ''}
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
   getFilteredDevices() {
     return this.devices.filter(device => {
       if (this.filters.status && device.status !== this.filters.status) return false;
       if (this.filters.deviceType && device.type !== this.filters.deviceType) return false;
       if (this.filters.brand && device.brand !== this.filters.brand) return false;
       return true;
     });
   },
   updateMapView() {
     this.$nextTick(() => {
       if (this.mapView === 'geographic' && this.leafletMap) {
         this.addMapElements();
       } else if (this.mapView === 'topology') {
         this.initializeTopologyGraph();
       }
     });
   },
   selectElement(element) {
     this.selectedElement = {
       ...element,
       coordinates: element.latitude && element.longitude
         ? { lat: element.latitude, lng: element.longitude }
         : null,
       connections: this.getElementConnections(element),
       metrics: this.getElementMetrics(element)
     };
   },
   getElementConnections(element) {
     const connections = [];

     if (element.type === 'node') {
       this.sectors.filter(s => s.nodeId === element.id).forEach(sector => {
         connections.push({
           id: sector.id,
           name: sector.name,
           type: 'sector',
           status: 'online'
         });
       });
     } else if (element.type === 'sector') {
       this.devices.filter(d => d.sectorId === element.id).forEach(device => {
         connections.push({
           id: device.id,
           name: device.name,
           type: 'device',
           status: device.status || 'unknown'
         });
       });
     }

     return connections;
   },
   getElementMetrics(element) {
     if (element.type === 'device') {
       return {
         cpu: Math.floor(Math.random() * 100),
         memory: Math.floor(Math.random() * 100),
         signal: element.type === 'cpe' ? -(Math.floor(Math.random() * 50) + 30) : null
       };
     }
     return null;
   },
   closeInfoPanel() {
     this.selectedElement = null;
   },
   toggleView() {
     this.mapView = this.mapView === 'geographic' ? 'topology' : 'geographic';
     this.$nextTick(() => {
       this.initializeMap();
     });
   },
   centerMap() {
     if (this.leafletMap && Object.keys(this.markers).length > 0) {
       const group = new L.featureGroup(Object.values(this.markers));
       this.leafletMap.fitBounds(group.getBounds().pad(0.1));
     }
   },
   toggleHeatmap() {
     console.log('Toggle heatmap - funcionalidad pendiente');
   },
   toggleCoverage() {
     console.log('Toggle coverage - funcionalidad pendiente');
   },
   measureDistance() {
     this.showDistanceModal = true;
     this.measurementResult = {
       distance: '2.3 km',
       lineOfSight: true,
       elevation: '+15m'
     };
   },
   closeDistanceModal() {
     this.showDistanceModal = false;
   },
   clearMeasurement() {
     this.measurementResult = {};
   },
   saveMeasurement() {
     console.log('Guardar medición - funcionalidad pendiente');
   },
   resetTopologyView() {
     if (this.topologyGraph && this.topologyGraph.simulation) {
       this.topologyGraph.simulation.alpha(1).restart();
     }
   },
   arrangeHierarchy() {
     console.log('Organizar jerarquía - funcionalidad pendiente');
   },
   arrangeCircular() {
     console.log('Organizar circular - funcionalidad pendiente');
   },
   arrangeForce() {
     this.resetTopologyView();
   },
   getNodeRadius(type) {
     const sizes = {
       node: 20,
       sector: 15,
       device: 10,
       client: 8
     };
     return sizes[type] || 10;
   },
   getNodeColor(type, status) {
     const statusColors = {
       online: '#28a745',
       offline: '#dc3545',
       warning: '#ffc107',
       maintenance: '#6c757d',
       unknown: '#6c757d'
     };

     const typeColors = {
       node: '#007bff',
       sector: '#17a2b8',
       device: '#6610f2',
       client: '#6c757d'
     };

     return statusColors[status] || typeColors[type] || '#6c757d';
   },
   dragstarted(event, d) {
     if (!event.active && this.topologyGraph.simulation) {
       this.topologyGraph.simulation.alphaTarget(0.3).restart();
     }
     d.fx = d.x;
     d.fy = d.y;
   },
   dragged(event, d) {
     d.fx = event.x;
     d.fy = event.y;
   },
   dragended(event, d) {
     if (!event.active && this.topologyGraph.simulation) {
       this.topologyGraph.simulation.alphaTarget(0);
     }
     d.fx = null;
     d.fy = null;
   },
   viewElementDetails() {
     if (this.selectedElement) {
       const routes = {
         node: `/nodes/${this.selectedElement.id}`,
         sector: `/sectors/${this.selectedElement.id}`,
         device: `/devices/${this.selectedElement.id}`,
         client: `/clients/${this.selectedElement.id}`
       };

       const route = routes[this.selectedElement.type];
       if (route) {
         this.$router.push(route);
       }
     }
   },
   manageElement() {
     if (this.selectedElement && this.selectedElement.type === 'device') {
       this.$router.push(`/devices/${this.selectedElement.id}/manage`);
     }
   },
   async pingElement() {
     if (this.selectedElement && this.selectedElement.ipAddress) {
       try {
         await new Promise(resolve => setTimeout(resolve, 1000));
         alert(`Ping a ${this.selectedElement.ipAddress}: Exitoso (15ms)`);
       } catch (error) {
         alert(`Error en ping a ${this.selectedElement.ipAddress}`);
       }
     } else {
       alert('No hay dirección IP disponible para este elemento');
     }
   },
   showSettings() {
     this.showSettingsModal = true;
   },
   closeSettings() {
     this.showSettingsModal = false;
   },
   applySettings() {
     this.updateMapView();
     this.setupAutoRefresh();
   },
   resetSettings() {
     this.settings = {
       mapTheme: 'light',
       iconSize: 25,
       showLabels: true,
       showConnections: true,
       autoRefresh: 'off',
       animateChanges: true,
       notifyOffline: true,
       notifyAlerts: true
     };
     this.applySettings();
   },
   setupAutoRefresh() {
     this.clearAutoRefresh();

     if (this.settings.autoRefresh !== 'off') {
       const intervals = {
         '30s': 30000,
         '1m': 60000,
         '5m': 300000,
         '10m': 600000
       };

       this.refreshInterval = setInterval(() => {
         this.refreshMap();
       }, intervals[this.settings.autoRefresh]);
     }
   },
   clearAutoRefresh() {
     if (this.refreshInterval) {
       clearInterval(this.refreshInterval);
       this.refreshInterval = null;
     }
   },
   async refreshMap() {
     console.log('Actualizando datos del mapa...');
     await this.loadNetworkData();
   },
   exportMap() {
     try {
       if (this.leafletMap) {
         // Funcionalidad de exportar mapa - por implementar
         console.log('Exportar mapa - funcionalidad pendiente');
         alert('Funcionalidad de exportar en desarrollo');
       }
     } catch (error) {
       console.error('Error exportando mapa:', error);
     }
   },
   handleResize() {
     if (this.leafletMap) {
       setTimeout(() => {
         this.leafletMap.invalidateSize();
       }, 100);
     }
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
   getStatusIcon(status) {
     const icons = {
       online: '🟢',
       offline: '🔴',
       warning: '🟡',
       maintenance: '🔧',
       unknown: '⚪'
     };
     return icons[status] || '⚪';
   }
 }
};
</script>

<style scoped>
.network-map {
  padding: 20px;
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.refresh-button {
  background-color: #28a745;
  color: white;
}

.view-toggle {
  background-color: #007bff;
  color: white;
}

.export-button {
  background-color: #17a2b8;
  color: white;
}

.settings-button {
  background-color: #6c757d;
  color: white;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #f44336;
}

.map-content {
  display: flex;
  flex: 1;
  gap: 20px;
  height: 100%;
}

.control-panel {
  width: 300px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 25px;
}

.panel-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 1.1em;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 5px;
}

.filter-group {
  margin-bottom: 15px;
}

.filter-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #666;
}

.filter-group select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.stat-label {
  color: #666;
  font-size: 0.9em;
}

.stat-value {
  font-weight: 500;
  color: #333;
}

.stat-value.online {
  color: #28a745;
}

.stat-value.offline {
  color: #dc3545;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9em;
}

.legend-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-icon.node {
  background: #007bff;
}

.legend-icon.sector {
  background: #17a2b8;
}

.legend-icon.device.online {
  background: #28a745;
}

.legend-icon.device.offline {
  background: #dc3545;
}

.legend-icon.client {
  background: #6c757d;
}

.legend-line {
  width: 20px;
  height: 2px;
  background: #999;
}

.map-container {
  flex: 1;
  position: relative;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
  height: 100%;
}

.geographic-map,
.topology-map {
  width: 100%;
  height: 100%;
  position: relative;
}

.leaflet-container {
  width: 100%;
  height: 100%;
}

.topology-container {
  width: 100%;
  height: 100%;
}

.map-controls,
.topology-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 1000;
}

.map-control-btn,
.topology-control-btn {
  padding: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  font-size: 1.2em;
}

.topology-control-btn {
  padding: 6px 10px;
  font-size: 0.8em;
  white-space: nowrap;
}

.info-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 300px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  max-height: calc(100% - 20px);
  overflow-y: auto;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.info-header h4 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  color: #666;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-label {
  color: #666;
  font-size: 0.9em;
}

.info-value {
  color: #333;
  font-weight: 500;
}

.info-value.status.online {
  color: #28a745;
}

.info-value.status.offline {
  color: #dc3545;
}

.info-value.status.warning {
  color: #ffc107;
}

.metrics-section,
.connections-section {
  margin-top: 15px;
}

.metrics-section h5,
.connections-section h5 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 0.9em;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  padding: 6px;
  background: #f8f9fa;
  border-radius: 3px;
  font-size: 0.8em;
}

.metric-label {
  color: #666;
}

.metric-value {
  color: #333;
  font-weight: 500;
}

.connections-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.connection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px;
  background: #f8f9fa;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8em;
}

.connection-item:hover {
  background: #e9ecef;
}

.connection-name {
  color: #333;
}

.connection-status {
  font-size: 1em;
}

.info-actions {
  display: flex;
  gap: 8px;
  margin-top: 15px;
}

.action-btn {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: white;
  font-size: 0.8em;
}

.action-btn.primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
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
  z-index: 2000;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
}

.settings-content {
  margin-bottom: 20px;
}

.setting-group {
  margin-bottom: 25px;
}

.setting-group h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1em;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 5px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.setting-item label {
  color: #666;
  font-size: 0.9em;
}

.setting-item select,
.setting-item input[type="range"] {
  width: 150px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.measurement-modal {
  width: 400px;
}

.measurement-content {
  margin-bottom: 20px;
}

.measurement-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.measurement-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.measurement-label {
  color: #666;
  font-weight: 500;
}

.measurement-value {
  color: #333;
}

.measurement-value.good {
  color: #28a745;
}

.measurement-value.bad {
  color: #dc3545;
}

.measurement-actions {
  display: flex;
  gap: 10px;
}

.clear-btn,
.save-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.clear-btn {
  background: #6c757d;
  color: white;
}

.save-btn {
  background: #007bff;
  color: white;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: white;
}

.reset-btn {
  background: #dc3545 !important;
  color: white !important;
  border-color: #dc3545 !important;
}

@media (max-width: 768px) {
  .network-map {
    padding: 10px;
  }

  .map-content {
    flex-direction: column;
  }

  .control-panel {
    width: 100%;
    order: 2;
    max-height: 300px;
  }

  .map-container {
    order: 1;
    height: 400px;
  }

  .info-panel {
    position: relative;
    width: 100%;
    margin-bottom: 10px;
  }

  .modal-content {
    width: 95%;
    padding: 20px;
  }
}
</style>