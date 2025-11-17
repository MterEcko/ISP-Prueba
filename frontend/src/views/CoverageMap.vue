<template>
  <div class="coverage-map-container">
    <div class="map-header">
      <h2>=ú Mapa de Cobertura</h2>
      <div class="header-actions">
        <button @click="refreshMap" class="btn-refresh" :disabled="loading">
          = {{ loading ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>
    </div>

    <!-- Filters and Controls -->
    <div class="map-controls">
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="filters.showClients" @change="updateMapLayers" />
          <span class="icon">=d</span> Clientes ({{ stats.clients }})
        </label>

        <label>
          <input type="checkbox" v-model="filters.showNodes" @change="updateMapLayers" />
          <span class="icon">=á</span> Nodos ({{ stats.nodes }})
        </label>

        <label>
          <input type="checkbox" v-model="filters.showZones" @change="updateMapLayers" />
          <span class="icon"><Ø</span> Zonas ({{ stats.zones }})
        </label>

        <label>
          <input type="checkbox" v-model="filters.showCoverage" @change="updateMapLayers" />
          <span class="icon">=ö</span> Áreas de Cobertura
        </label>
      </div>

      <div class="control-group">
        <label>Estado de Cliente:</label>
        <select v-model="filters.clientStatus" @change="loadClients">
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="suspendido">Suspendidos</option>
          <option value="cortado">Cortados</option>
        </select>
      </div>

      <div class="control-group">
        <label>Zona:</label>
        <select v-model="filters.zoneId" @change="filterByZone">
          <option value="">Todas las zonas</option>
          <option v-for="zone in zones" :key="zone.id" :value="zone.id">
            {{ zone.nombre }}
          </option>
        </select>
      </div>
    </div>

    <!-- Map Container -->
    <div class="map-wrapper">
      <div id="map" ref="mapContainer" class="leaflet-map"></div>
    </div>

    <!-- Statistics Panel -->
    <div class="stats-panel">
      <div class="stat-item">
        <div class="stat-icon">=e</div>
        <div class="stat-content">
          <div class="stat-label">Total Clientes</div>
          <div class="stat-value">{{ stats.clients }}</div>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-icon">=á</div>
        <div class="stat-content">
          <div class="stat-label">Nodos Activos</div>
          <div class="stat-value">{{ stats.nodes }}</div>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-icon"><Ø</div>
        <div class="stat-content">
          <div class="stat-label">Zonas</div>
          <div class="stat-value">{{ stats.zones }}</div>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-icon">=Ê</div>
        <div class="stat-content">
          <div class="stat-label">Densidad Promedio</div>
          <div class="stat-value">{{ stats.avgDensity }} /km²</div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="map-legend">
      <h4>Leyenda</h4>
      <div class="legend-item">
        <span class="marker marker-client"></span> Cliente
      </div>
      <div class="legend-item">
        <span class="marker marker-node"></span> Nodo
      </div>
      <div class="legend-item">
        <span class="marker marker-zone"></span> Zona
      </div>
      <div class="legend-item">
        <span class="line line-coverage"></span> Área de Cobertura
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import authHeader from '../services/auth-header';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

export default {
  name: 'CoverageMap',
  data() {
    return {
      map: null,
      loading: false,

      // Filters
      filters: {
        showClients: true,
        showNodes: true,
        showZones: true,
        showCoverage: true,
        clientStatus: '',
        zoneId: ''
      },

      // Data
      clients: [],
      nodes: [],
      zones: [],
      sectors: [],

      // Map layers
      clientsLayer: null,
      nodesLayer: null,
      zonesLayer: null,
      coverageLayer: null,

      // Statistics
      stats: {
        clients: 0,
        nodes: 0,
        zones: 0,
        avgDensity: 0
      }
    };
  },

  mounted() {
    this.initMap();
    this.loadMapData();
  },

  beforeUnmount() {
    if (this.map) {
      this.map.remove();
    }
  },

  methods: {
    /**
     * Inicializa el mapa de Leaflet
     */
    initMap() {
      // Crear mapa centrado en México (puedes ajustar según tu ubicación)
      this.map = L.map(this.$refs.mapContainer).setView([20.6597, -103.3496], 12);

      // Agregar capa base de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);

      // Inicializar grupos de capas
      this.clientsLayer = L.layerGroup().addTo(this.map);
      this.nodesLayer = L.layerGroup().addTo(this.map);
      this.zonesLayer = L.layerGroup().addTo(this.map);
      this.coverageLayer = L.layerGroup().addTo(this.map);
    },

    /**
     * Carga todos los datos del mapa
     */
    async loadMapData() {
      this.loading = true;

      try {
        await Promise.all([
          this.loadClients(),
          this.loadNodes(),
          this.loadZones()
        ]);

        this.updateMapLayers();
        this.calculateStats();

      } catch (error) {
        console.error('Error cargando datos del mapa:', error);
        alert('Error cargando datos del mapa: ' + error.message);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Carga clientes con coordenadas
     */
    async loadClients() {
      try {
        const params = {};
        if (this.filters.clientStatus) {
          params.estado = this.filters.clientStatus;
        }
        if (this.filters.zoneId) {
          params.zoneId = this.filters.zoneId;
        }

        const response = await axios.get('/api/clients', {
          headers: authHeader(),
          params
        });

        // Filtrar solo clientes con coordenadas
        this.clients = response.data.data.filter(client =>
          client.latitud && client.longitud &&
          !isNaN(parseFloat(client.latitud)) &&
          !isNaN(parseFloat(client.longitud))
        );

      } catch (error) {
        console.error('Error cargando clientes:', error);
        this.clients = [];
      }
    },

    /**
     * Carga nodos con coordenadas
     */
    async loadNodes() {
      try {
        const response = await axios.get('/api/network/nodes', {
          headers: authHeader()
        });

        // Filtrar solo nodos con coordenadas
        this.nodes = response.data.filter(node =>
          node.latitud && node.longitud &&
          !isNaN(parseFloat(node.latitud)) &&
          !isNaN(parseFloat(node.longitud))
        );

      } catch (error) {
        console.error('Error cargando nodos:', error);
        this.nodes = [];
      }
    },

    /**
     * Carga zonas con coordenadas
     */
    async loadZones() {
      try {
        const response = await axios.get('/api/zones', {
          headers: authHeader()
        });

        // Filtrar solo zonas con coordenadas
        this.zones = response.data.filter(zone =>
          zone.latitud && zone.longitud &&
          !isNaN(parseFloat(zone.latitud)) &&
          !isNaN(parseFloat(zone.longitud))
        );

      } catch (error) {
        console.error('Error cargando zonas:', error);
        this.zones = [];
      }
    },

    /**
     * Actualiza las capas del mapa según los filtros
     */
    updateMapLayers() {
      // Limpiar todas las capas
      this.clientsLayer.clearLayers();
      this.nodesLayer.clearLayers();
      this.zonesLayer.clearLayers();
      this.coverageLayer.clearLayers();

      // Agregar clientes
      if (this.filters.showClients) {
        this.addClientsToMap();
      }

      // Agregar nodos
      if (this.filters.showNodes) {
        this.addNodesToMap();
      }

      // Agregar zonas
      if (this.filters.showZones) {
        this.addZonesToMap();
      }

      // Agregar áreas de cobertura
      if (this.filters.showCoverage) {
        this.addCoverageAreas();
      }

      // Ajustar vista del mapa
      this.fitMapBounds();
    },

    /**
     * Agrega marcadores de clientes al mapa
     */
    addClientsToMap() {
      const clientIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-pin marker-client-pin">=d</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      this.clients.forEach(client => {
        const lat = parseFloat(client.latitud);
        const lng = parseFloat(client.longitud);

        const marker = L.marker([lat, lng], { icon: clientIcon });

        const popupContent = `
          <div class="map-popup">
            <h4>${client.nombre}</h4>
            <p><strong>Estado:</strong> ${client.estado}</p>
            <p><strong>Plan:</strong> ${client.ServicePackage?.nombre || 'N/A'}</p>
            <p><strong>IP:</strong> ${client.ip || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${client.telefono || 'N/A'}</p>
            <a href="#/clients/${client.id}" class="popup-link">Ver Detalles</a>
          </div>
        `;

        marker.bindPopup(popupContent);
        this.clientsLayer.addLayer(marker);
      });
    },

    /**
     * Agrega marcadores de nodos al mapa
     */
    addNodesToMap() {
      const nodeIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-pin marker-node-pin">=á</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });

      this.nodes.forEach(node => {
        const lat = parseFloat(node.latitud);
        const lng = parseFloat(node.longitud);

        const marker = L.marker([lat, lng], { icon: nodeIcon });

        const popupContent = `
          <div class="map-popup">
            <h4>=á ${node.nombre}</h4>
            <p><strong>Tipo:</strong> ${node.tipo || 'N/A'}</p>
            <p><strong>Estado:</strong> ${node.estado || 'N/A'}</p>
            <p><strong>Clientes:</strong> ${node.clientCount || 0}</p>
            <p><strong>IP:</strong> ${node.ip || 'N/A'}</p>
            <a href="#/network/nodes/${node.id}" class="popup-link">Ver Detalles</a>
          </div>
        `;

        marker.bindPopup(popupContent);
        this.nodesLayer.addLayer(marker);

        // Agregar círculo de cobertura (radio de 500m)
        if (this.filters.showCoverage) {
          const circle = L.circle([lat, lng], {
            color: '#3498db',
            fillColor: '#3498db',
            fillOpacity: 0.1,
            radius: 500 // 500 metros
          });

          circle.bindPopup(`<strong>Área de cobertura:</strong> ${node.nombre}`);
          this.coverageLayer.addLayer(circle);
        }
      });
    },

    /**
     * Agrega marcadores de zonas al mapa
     */
    addZonesToMap() {
      const zoneIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-pin marker-zone-pin"><Ø</div>',
        iconSize: [35, 35],
        iconAnchor: [17.5, 35]
      });

      this.zones.forEach(zone => {
        const lat = parseFloat(zone.latitud);
        const lng = parseFloat(zone.longitud);

        const marker = L.marker([lat, lng], { icon: zoneIcon });

        const popupContent = `
          <div class="map-popup">
            <h4><Ø ${zone.nombre}</h4>
            <p><strong>Descripción:</strong> ${zone.descripcion || 'N/A'}</p>
            <p><strong>Nodos:</strong> ${zone.nodeCount || 0}</p>
            <p><strong>Clientes:</strong> ${zone.clientCount || 0}</p>
            <a href="#/zones/${zone.id}" class="popup-link">Ver Detalles</a>
          </div>
        `;

        marker.bindPopup(popupContent);
        this.zonesLayer.addLayer(marker);
      });
    },

    /**
     * Agrega áreas de cobertura al mapa
     */
    addCoverageAreas() {
      // Las áreas de cobertura ya se agregan en addNodesToMap()
      // Aquí se pueden agregar polígonos personalizados si es necesario
    },

    /**
     * Ajusta los límites del mapa para mostrar todos los marcadores
     */
    fitMapBounds() {
      const allMarkers = [];

      // Recopilar todas las coordenadas
      this.clients.forEach(client => {
        allMarkers.push([parseFloat(client.latitud), parseFloat(client.longitud)]);
      });

      this.nodes.forEach(node => {
        allMarkers.push([parseFloat(node.latitud), parseFloat(node.longitud)]);
      });

      this.zones.forEach(zone => {
        allMarkers.push([parseFloat(zone.latitud), parseFloat(zone.longitud)]);
      });

      // Ajustar vista si hay marcadores
      if (allMarkers.length > 0) {
        const bounds = L.latLngBounds(allMarkers);
        this.map.fitBounds(bounds, { padding: [50, 50] });
      }
    },

    /**
     * Calcula estadísticas del mapa
     */
    calculateStats() {
      this.stats.clients = this.clients.length;
      this.stats.nodes = this.nodes.length;
      this.stats.zones = this.zones.length;

      // Calcular densidad promedio (clientes por km²)
      // Esto es una aproximación simple
      if (this.zones.length > 0) {
        this.stats.avgDensity = (this.clients.length / this.zones.length).toFixed(1);
      } else {
        this.stats.avgDensity = 0;
      }
    },

    /**
     * Filtra elementos por zona
     */
    filterByZone() {
      this.loadClients();
      this.updateMapLayers();
    },

    /**
     * Refresca el mapa
     */
    async refreshMap() {
      await this.loadMapData();
    }
  }
};
</script>

<style scoped>
.coverage-map-container {
  width: 100%;
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 20px;
  position: relative;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.map-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.8rem;
}

.btn-refresh {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.btn-refresh:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.map-controls {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 15px;
}

.control-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  color: #34495e;
}

.control-group label input[type="checkbox"] {
  cursor: pointer;
}

.control-group .icon {
  font-size: 1.2rem;
}

.control-group select {
  padding: 8px 12px;
  border: 1px solid #dce4ec;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
}

.map-wrapper {
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.leaflet-map {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.stats-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 12px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #2c3e50;
}

.map-legend {
  position: absolute;
  bottom: 40px;
  right: 40px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.map-legend h4 {
  margin: 0 0 10px 0;
  font-size: 0.95rem;
  color: #2c3e50;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #34495e;
}

.marker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-block;
}

.marker-client {
  background: #3498db;
}

.marker-node {
  background: #e74c3c;
}

.marker-zone {
  background: #2ecc71;
}

.line {
  width: 30px;
  height: 3px;
  display: inline-block;
}

.line-coverage {
  background: #9b59b6;
}

/* Custom marker styles */
:global(.custom-marker) {
  background: none;
  border: none;
}

:global(.marker-pin) {
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

:global(.marker-client-pin) {
  border: 3px solid #3498db;
}

:global(.marker-node-pin) {
  border: 3px solid #e74c3c;
  width: 40px;
  height: 40px;
}

:global(.marker-zone-pin) {
  border: 3px solid #2ecc71;
}

/* Popup styles */
:global(.map-popup) {
  min-width: 200px;
}

:global(.map-popup h4) {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

:global(.map-popup p) {
  margin: 5px 0;
  font-size: 0.9rem;
  color: #34495e;
}

:global(.popup-link) {
  display: inline-block;
  margin-top: 10px;
  padding: 5px 10px;
  background: #3498db;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.85rem;
}

:global(.popup-link:hover) {
  background: #2980b9;
}

/* Responsive */
@media (max-width: 768px) {
  .map-controls {
    flex-direction: column;
  }

  .stats-panel {
    grid-template-columns: 1fr;
  }

  .map-legend {
    bottom: 20px;
    right: 20px;
  }
}
</style>
