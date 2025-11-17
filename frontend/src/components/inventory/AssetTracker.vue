<template>
  <div class="asset-tracker">
    <div class="tracker-header">
      <div class="header-title">
        <h2>Seguimiento de Activos</h2>
        <p>Monitoreo en tiempo real de ubicación y estado de equipos</p>
      </div>
      <div class="header-actions">
        <button 
          class="btn-refresh" 
          @click="refreshData" 
          :disabled="loading" 
          title="Actualizar datos"
        >
          <i class="icon-refresh" :class="{ 'spin': loading }"></i>
          <span>Actualizar</span>
        </button>
        <button 
          class="btn-view" 
          @click="toggleView" 
          title="Cambiar vista"
        >
          <i :class="viewMode === 'map' ? 'icon-list' : 'icon-map'"></i>
          <span>{{ viewMode === 'map' ? 'Vista de lista' : 'Vista de mapa' }}</span>
        </button>
      </div>
    </div>

    <!-- Filtros y búsqueda -->
    <div class="tracker-filters">
      <div class="search-container">
        <div class="search-input">
          <i class="icon-search"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Buscar equipo por nombre, serial o ID..." 
            @input="applyFilters"
          />
          <button 
            v-if="searchQuery" 
            class="btn-clear-search" 
            @click="clearSearch" 
            title="Limpiar búsqueda"
          >
            <i class="icon-x"></i>
          </button>
        </div>
      </div>

      <div class="filter-container">
        <div class="filter-group">
          <label>Tipo:</label>
          <select v-model="filters.category" @change="applyFilters">
            <option value="">Todos los tipos</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Ubicación:</label>
          <select v-model="filters.location" @change="applyFilters">
            <option value="">Todas las ubicaciones</option>
            <option v-for="location in locations" :key="location.id" :value="location.id">
              {{ location.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Estado:</label>
          <select v-model="filters.status" @change="applyFilters">
            <option value="">Todos los estados</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">
              {{ status.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Asignado a:</label>
          <select v-model="filters.assignedTo" @change="applyFilters">
            <option value="">Cualquiera</option>
            <option value="unassigned">Sin asignar</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.name }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="hasActiveFilters" class="active-filters">
        <div class="active-filters-label">Filtros activos:</div>
        <div class="filter-tags">
          <div v-if="filters.category" class="filter-tag">
            {{ getCategoryName(filters.category) }}
            <button @click="removeFilter('category')" class="btn-remove-filter">
              <i class="icon-x"></i>
            </button>
          </div>
          
          <div v-if="filters.location" class="filter-tag">
            {{ getLocationName(filters.location) }}
            <button @click="removeFilter('location')" class="btn-remove-filter">
              <i class="icon-x"></i>
            </button>
          </div>
          
          <div v-if="filters.status" class="filter-tag">
            {{ getStatusName(filters.status) }}
            <button @click="removeFilter('status')" class="btn-remove-filter">
              <i class="icon-x"></i>
            </button>
          </div>
          
          <div v-if="filters.assignedTo" class="filter-tag">
            {{ filters.assignedTo === 'unassigned' ? 'Sin asignar' : getUserName(filters.assignedTo) }}
            <button @click="removeFilter('assignedTo')" class="btn-remove-filter">
              <i class="icon-x"></i>
            </button>
          </div>
        </div>
        
        <button class="btn-clear-filters" @click="clearAllFilters">
          <i class="icon-trash-2"></i> Limpiar todos
        </button>
      </div>
    </div>

    <!-- Vista de mapa -->
    <div v-if="viewMode === 'map'" class="tracker-map-view">
      <!-- Estado de carga -->
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Cargando datos de activos...</p>
      </div>
      
      <!-- Estado vacío -->
      <div v-else-if="filteredAssets.length === 0" class="empty-container">
        <div class="empty-icon">
          <i class="icon-alert-circle"></i>
        </div>
        <h3 class="empty-title">No se encontraron activos</h3>
        <p class="empty-message">
          No hay activos que coincidan con los criterios de búsqueda.
          {{ hasActiveFilters ? 'Intenta con diferentes filtros.' : '' }}
        </p>
        <button 
          v-if="hasActiveFilters" 
          class="btn-secondary" 
          @click="clearAllFilters"
        >
          Limpiar filtros
        </button>
      </div>
      
      <!-- Mapa de activos -->
      <div v-else class="map-container">
        <div class="map-wrapper">
          <!-- Aquí iría la implementación real del mapa -->
          <div class="map-placeholder">
            <div class="map-overlay">
              <div class="map-controls">
                <button class="btn-map-control" title="Acercar">
                  <i class="icon-plus"></i>
                </button>
                <button class="btn-map-control" title="Alejar">
                  <i class="icon-minus"></i>
                </button>
                <button class="btn-map-control" title="Centrar mapa">
                  <i class="icon-maximize"></i>
                </button>
              </div>
              
              <div class="map-legend">
                <div class="legend-title">Estado de equipos</div>
                <div class="legend-items">
                  <div class="legend-item">
                    <div class="status-dot status-active"></div>
                    <span>Activo</span>
                  </div>
                  <div class="legend-item">
                    <div class="status-dot status-maintenance"></div>
                    <span>En mantenimiento</span>
                  </div>
                  <div class="legend-item">
                    <div class="status-dot status-inactive"></div>
                    <span>Inactivo</span>
                  </div>
                  <div class="legend-item">
                    <div class="status-dot status-alert"></div>
                    <span>Alerta</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Marcadores de activos en el mapa -->
            <div class="map-markers">
              <div 
                v-for="asset in filteredAssets" 
                :key="asset.id"
                class="map-marker"
                :class="getAssetStatusClass(asset.status)"
                :style="{ left: `${getAssetPosition(asset).x}%`, top: `${getAssetPosition(asset).y}%` }"
                @click="showAssetDetails(asset)"
              >
                <i :class="getAssetTypeIcon(asset.category)"></i>
                <div class="marker-tooltip">
                  <div class="marker-name">{{ asset.name }}</div>
                  <div class="marker-serial">{{ asset.serialNumber }}</div>
                  <div class="marker-location">{{ getLocationName(asset.location) }}</div>
                  <div class="marker-status">{{ getStatusName(asset.status) }}</div>
                </div>
              </div>
            </div>
            
            <div class="map-locations">
              <div 
                v-for="location in usedLocations" 
                :key="location.id"
                class="location-marker"
                :style="{ left: `${getLocationPosition(location).x}%`, top: `${getLocationPosition(location).y}%` }"
              >
                <div class="location-marker-icon">
                  <i :class="getLocationTypeIcon(location.type)"></i>
                </div>
                <div class="location-name">{{ location.name }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="map-info-panel" v-if="selectedAsset">
          <div class="info-panel-header">
            <h3 class="info-panel-title">{{ selectedAsset.name }}</h3>
            <button @click="selectedAsset = null" class="btn-close" title="Cerrar">
              <i class="icon-x"></i>
            </button>
          </div>
          
          <div class="info-panel-content">
            <div class="info-panel-section">
              <div class="asset-header">
                <div class="asset-icon">
                  <i :class="getAssetTypeIcon(selectedAsset.category)"></i>
                </div>
                
                <div class="asset-info">
                  <div class="asset-id">ID: {{ selectedAsset.id }}</div>
                  <div class="asset-serial">S/N: {{ selectedAsset.serialNumber }}</div>
                  <div :class="['asset-status', getAssetStatusClass(selectedAsset.status)]">
                    {{ getStatusName(selectedAsset.status) }}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="info-panel-section">
              <h4>Ubicación</h4>
              <div class="asset-location">
                <i class="icon-map-pin"></i>
                <span>{{ getLocationName(selectedAsset.location) }}</span>
              </div>
              <div v-if="selectedAsset.coordinates" class="asset-coordinates">
                <div>Lat: {{ selectedAsset.coordinates.latitude }}</div>
                <div>Lng: {{ selectedAsset.coordinates.longitude }}</div>
              </div>
            </div>
            
            <div class="info-panel-section">
              <h4>Detalles</h4>
              <div class="asset-detail-grid">
                <div class="detail-item">
                  <div class="detail-label">Categoría:</div>
                  <div class="detail-value">{{ getCategoryName(selectedAsset.category) }}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">Marca:</div>
                  <div class="detail-value">{{ selectedAsset.brand || 'N/A' }}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">Modelo:</div>
                  <div class="detail-value">{{ selectedAsset.model || 'N/A' }}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">MAC:</div>
                  <div class="detail-value">{{ selectedAsset.macAddress || 'N/A' }}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">IP:</div>
                  <div class="detail-value">{{ selectedAsset.ipAddress || 'N/A' }}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">Asignado a:</div>
                  <div class="detail-value">
                    {{ selectedAsset.assignedTo ? getUserName(selectedAsset.assignedTo) : 'Sin asignar' }}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="info-panel-section" v-if="selectedAsset.lastCheckin">
              <h4>Último registro</h4>
              <div class="last-checkin">
                <div class="checkin-date">{{ formatDateTime(selectedAsset.lastCheckin.timestamp) }}</div>
                <div class="checkin-details">
                  <div class="detail-item">
                    <div class="detail-label">Estado:</div>
                    <div class="detail-value">{{ selectedAsset.lastCheckin.status }}</div>
                  </div>
                  
                  <div class="detail-item" v-if="selectedAsset.lastCheckin.batteryLevel">
                    <div class="detail-label">Batería:</div>
                    <div class="detail-value">{{ selectedAsset.lastCheckin.batteryLevel }}%</div>
                  </div>
                  
                  <div class="detail-item" v-if="selectedAsset.lastCheckin.temperature">
                    <div class="detail-label">Temperatura:</div>
                    <div class="detail-value">{{ selectedAsset.lastCheckin.temperature }}°C</div>
                  </div>
                  
                  <div class="detail-item" v-if="selectedAsset.lastCheckin.signalStrength">
                    <div class="detail-label">Señal:</div>
                    <div class="detail-value">{{ selectedAsset.lastCheckin.signalStrength }} dBm</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="info-panel-actions">
            <button class="btn-outline" @click="viewAssetHistory(selectedAsset)">
              <i class="icon-clock"></i> Historial
            </button>
            <button class="btn-outline" @click="viewAssetDetail(selectedAsset)">
              <i class="icon-external-link"></i> Ver detalles completos
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista de lista -->
    <div v-else class="tracker-list-view">
      <!-- Estado de carga -->
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Cargando datos de activos...</p>
      </div>
      
      <!-- Estado vacío -->
      <div v-else-if="filteredAssets.length === 0" class="empty-container">
        <div class="empty-icon">
          <i class="icon-alert-circle"></i>
        </div>
        <h3 class="empty-title">No se encontraron activos</h3>
        <p class="empty-message">
          No hay activos que coincidan con los criterios de búsqueda.
          {{ hasActiveFilters ? 'Intenta con diferentes filtros.' : '' }}
        </p>
        <button 
          v-if="hasActiveFilters" 
          class="btn-secondary" 
          @click="clearAllFilters"
        >
          Limpiar filtros
        </button>
      </div>
      
      <!-- Tabla de activos -->
      <div v-else class="assets-table-container">
        <table class="assets-table">
          <thead>
            <tr>
              <th @click="sortBy('name')" :class="{ 'sorted': sortField === 'name' }">
                Nombre 
                <i v-if="sortField === 'name'" :class="getSortIcon()"></i>
              </th>
              <th @click="sortBy('serialNumber')" :class="{ 'sorted': sortField === 'serialNumber' }">
                Número de Serie
                <i v-if="sortField === 'serialNumber'" :class="getSortIcon()"></i>
              </th>
              <th @click="sortBy('category')" :class="{ 'sorted': sortField === 'category' }">
                Categoría
                <i v-if="sortField === 'category'" :class="getSortIcon()"></i>
              </th>
              <th @click="sortBy('location')" :class="{ 'sorted': sortField === 'location' }">
                Ubicación
                <i v-if="sortField === 'location'" :class="getSortIcon()"></i>
              </th>
              <th @click="sortBy('status')" :class="{ 'sorted': sortField === 'status' }">
                Estado
                <i v-if="sortField === 'status'" :class="getSortIcon()"></i>
              </th>
              <th @click="sortBy('lastActivity')" :class="{ 'sorted': sortField === 'lastActivity' }">
                Última Actividad
                <i v-if="sortField === 'lastActivity'" :class="getSortIcon()"></i>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          
          <tbody>
            <tr v-for="asset in sortedAssets" :key="asset.id" @click="toggleAssetSelection(asset)">
              <td>
                <div class="asset-name-cell">
                  <i :class="getAssetTypeIcon(asset.category)"></i>
                  <span>{{ asset.name }}</span>
                </div>
              </td>
              <td>{{ asset.serialNumber }}</td>
              <td>{{ getCategoryName(asset.category) }}</td>
              <td>{{ getLocationName(asset.location) }}</td>
              <td>
                <div :class="['status-badge', getAssetStatusClass(asset.status)]">
                  {{ getStatusName(asset.status) }}
                </div>
              </td>
              <td>
                <div class="last-activity" :title="getActivityTooltip(asset)">
                  {{ formatLastActivity(asset.lastActivity) }}
                </div>
              </td>
              <td>
                <div class="actions-cell">
                  <button class="btn-icon" @click.stop="showAssetDetails(asset)" title="Ver detalles rápidos">
                    <i class="icon-eye"></i>
                  </button>
                  <button class="btn-icon" @click.stop="viewAssetHistory(asset)" title="Ver historial">
                    <i class="icon-clock"></i>
                  </button>
                  <button class="btn-icon" @click.stop="viewAssetDetail(asset)" title="Ver detalles completos">
                    <i class="icon-external-link"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- Paginación -->
        <div v-if="totalPages > 1" class="pagination">
          <button 
            class="btn-page" 
            @click="prevPage" 
            :disabled="currentPage === 1"
            title="Página anterior"
          >
            <i class="icon-chevron-left"></i>
          </button>
          
          <div class="page-indicator">
            Página {{ currentPage }} de {{ totalPages }}
          </div>
          
          <button 
            class="btn-page" 
            @click="nextPage" 
            :disabled="currentPage === totalPages"
            title="Página siguiente"
          >
            <i class="icon-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de detalles rápidos del activo -->
    <div v-if="quickViewAsset" class="asset-quickview-overlay" @click.self="quickViewAsset = null">
      <div class="asset-quickview-container">
        <div class="quickview-header">
          <h3>{{ quickViewAsset.name }}</h3>
          <button @click="quickViewAsset = null" class="btn-close" title="Cerrar">
            <i class="icon-x"></i>
          </button>
        </div>
        
        <div class="quickview-content">
          <div class="quickview-section">
            <div class="asset-header">
              <div class="asset-icon">
                <i :class="getAssetTypeIcon(quickViewAsset.category)"></i>
              </div>
              
              <div class="asset-info">
                <div class="asset-id">ID: {{ quickViewAsset.id }}</div>
                <div class="asset-serial">S/N: {{ quickViewAsset.serialNumber }}</div>
                <div :class="['asset-status', getAssetStatusClass(quickViewAsset.status)]">
                  {{ getStatusName(quickViewAsset.status) }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="quickview-section">
            <div class="detail-grid">
              <div class="detail-group">
                <h4>Información Básica</h4>
                <div class="detail-item">
                  <div class="detail-label">Categoría:</div>
                  <div class="detail-value">{{ getCategoryName(quickViewAsset.category) }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Marca/Modelo:</div>
                  <div class="detail-value">
                    {{ quickViewAsset.brand }} {{ quickViewAsset.model ? '/ ' + quickViewAsset.model : '' }}
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Ubicación:</div>
                  <div class="detail-value">{{ getLocationName(quickViewAsset.location) }}</div>
                </div>
              </div>
              
              <div class="detail-group">
                <h4>Información Técnica</h4>
                <div class="detail-item">
                  <div class="detail-label">MAC:</div>
                  <div class="detail-value">{{ quickViewAsset.macAddress || 'N/A' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">IP:</div>
                  <div class="detail-value">{{ quickViewAsset.ipAddress || 'N/A' }}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Asignado a:</div>
                  <div class="detail-value">
                    {{ quickViewAsset.assignedTo ? getUserName(quickViewAsset.assignedTo) : 'Sin asignar' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="quickview-section" v-if="quickViewAsset.lastActivity">
            <h4>Última Actividad</h4>
            <div class="activity-details">
              <div class="activity-time">
                {{ formatDateTime(quickViewAsset.lastActivity) }}
              </div>
              <div class="activity-info" v-if="quickViewAsset.lastCheckin">
                <div class="detail-item">
                  <div class="detail-label">Estado:</div>
                  <div class="detail-value">{{ quickViewAsset.lastCheckin.status }}</div>
                </div>
                
                <div class="detail-item" v-if="quickViewAsset.lastCheckin.batteryLevel !== undefined">
                  <div class="detail-label">Batería:</div>
                  <div class="detail-value">{{ quickViewAsset.lastCheckin.batteryLevel }}%</div>
                </div>
                
                <div class="detail-item" v-if="quickViewAsset.lastCheckin.temperature !== undefined">
                  <div class="detail-label">Temperatura:</div>
                  <div class="detail-value">{{ quickViewAsset.lastCheckin.temperature }}°C</div>
                </div>
                
                <div class="detail-item" v-if="quickViewAsset.lastCheckin.signalStrength !== undefined">
                  <div class="detail-label">Señal:</div>
                  <div class="detail-value">{{ quickViewAsset.lastCheckin.signalStrength }} dBm</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="quickview-footer">
          <button class="btn-outline" @click="viewAssetHistory(quickViewAsset)">
            <i class="icon-clock"></i> Ver historial
          </button>
          <button class="btn-primary" @click="viewAssetDetail(quickViewAsset)">
            <i class="icon-external-link"></i> Ver detalles completos
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { format, formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';

export default {
  name: 'AssetTracker',
  props: {
    /**
     * ID del proyecto o grupo de activos a mostrar
     * Si no se especifica, se mostrarán todos los activos
     */
    projectId: {
      type: [String, Number],
      default: null
    },
    /**
     * Si es true, solo mostrará activos con capacidad de rastreo
     */
    trackableOnly: {
      type: Boolean,
      default: false
    },
    /**
     * Número de elementos por página
     */
    itemsPerPage: {
      type: Number,
      default: 10
    }
  },
  data() {
    return {
      loading: false,
      viewMode: 'map',
      searchQuery: '',
      filters: {
        category: '',
        location: '',
        status: '',
        assignedTo: ''
      },
      sortField: 'name',
      sortDirection: 'asc',
      currentPage: 1,
      selectedAsset: null,
      quickViewAsset: null
    };
  },
  computed: {
    ...mapState('inventory', [
      'assets',
      'categories',
      'locations',
      'statuses',
      'users'
    ]),
    
    /**
     * Determina si hay filtros activos
     */
    hasActiveFilters() {
      return this.searchQuery.trim() !== '' || 
        Object.values(this.filters).some(value => value !== '');
    },
    
    /**
     * Filtra los activos según los criterios
     */
    filteredAssets() {
      let result = [...this.assets];
      
      // Filtrar por proyecto si se especifica
      if (this.projectId) {
        result = result.filter(asset => asset.projectId === this.projectId);
      }
      
      // Filtrar solo activos rastreables si se solicita
      if (this.trackableOnly) {
        result = result.filter(asset => asset.isTrackable);
      }
      
      // Filtrar por término de búsqueda
      const query = this.searchQuery.toLowerCase().trim();
      if (query) {
        result = result.filter(asset => 
          (asset.name && asset.name.toLowerCase().includes(query)) ||
          (asset.id && asset.id.toLowerCase().includes(query)) ||
          (asset.serialNumber && asset.serialNumber.toLowerCase().includes(query)) ||
          (asset.macAddress && asset.macAddress.toLowerCase().includes(query)) ||
          (asset.ipAddress && asset.ipAddress.toLowerCase().includes(query))
        );
      }
      
      // Aplicar filtros
      if (this.filters.category) {
        result = result.filter(asset => asset.category === this.filters.category);
      }
      
      if (this.filters.location) {
        result = result.filter(asset => asset.location === this.filters.location);
      }
      
      if (this.filters.status) {
        result = result.filter(asset => asset.status === this.filters.status);
      }
      
      if (this.filters.assignedTo) {
        if (this.filters.assignedTo === 'unassigned') {
          result = result.filter(asset => !asset.assignedTo);
        } else {
          result = result.filter(asset => asset.assignedTo === this.filters.assignedTo);
        }
      }
      
      return result;
    },
    
    /**
     * Ordena los activos según el campo y dirección
     */
    sortedAssets() {
      const assets = [...this.filteredAssets];
      const direction = this.sortDirection === 'asc' ? 1 : -1;
      
      return assets.sort((a, b) => {
        let valueA = a[this.sortField];
        let valueB = b[this.sortField];
        
        // Manejo especial para campos relacionados
        if (this.sortField === 'category') {
          const categoryA = this.categories.find(c => c.id === valueA);
          const categoryB = this.categories.find(c => c.id === valueB);
          valueA = categoryA ? categoryA.name : '';
          valueB = categoryB ? categoryB.name : '';
        }
        else if (this.sortField === 'location') {
          const locationA = this.locations.find(l => l.id === valueA);
          const locationB = this.locations.find(l => l.id === valueB);
          valueA = locationA ? locationA.name : '';
          valueB = locationB ? locationB.name : '';
        }
        else if (this.sortField === 'status') {
          const statusA = this.statuses.find(s => s.id === valueA);
          const statusB = this.statuses.find(s => s.id === valueB);
          valueA = statusA ? statusA.name : '';
          valueB = statusB ? statusB.name : '';
        }
        
        // Para fechas
        if (this.sortField === 'lastActivity') {
          valueA = valueA ? new Date(valueA) : new Date(0);
          valueB = valueB ? new Date(valueB) : new Date(0);
          return direction * (valueA - valueB);
        }
        
        // Ordenamiento por string
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return direction * valueA.localeCompare(valueB);
        }
        
        // Ordenamiento numérico o valor por defecto
        return direction * ((valueA > valueB) ? 1 : (valueA < valueB) ? -1 : 0);
      });
    },
    
    /**
     * Activos paginados para mostrar en la vista de lista
     */
    paginatedAssets() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.sortedAssets.slice(start, end);
    },
    
    /**
     * Número total de páginas para la paginación
     */
    totalPages() {
      return Math.ceil(this.sortedAssets.length / this.itemsPerPage);
    },
    
    /**
     * Ubicaciones que tienen activos asignados
     */
    usedLocations() {
      const locationIds = [...new Set(this.filteredAssets.map(asset => asset.location))];
      return this.locations.filter(location => locationIds.includes(location.id));
    }
  },
  mounted() {
    this.refreshData();
  },
  methods: {
    ...mapActions('inventory', [
      'fetchAssets',
      'fetchCategories',
      'fetchLocations',
      'fetchStatuses',
      'fetchUsers'
    ]),
    
    /**
     * Actualiza los datos desde el servidor
     */
    async refreshData() {
      this.loading = true;
      
      try {
        // Cargar datos necesarios
        await this.fetchAssets();
        await this.fetchCategories();
        await this.fetchLocations();
        await this.fetchStatuses();
        await this.fetchUsers();
      } catch (error) {
        console.error('Error al cargar datos:', error);
        // Aquí se podría mostrar una notificación de error
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Cambiar entre vista de mapa y lista
     */
    toggleView() {
      this.viewMode = this.viewMode === 'map' ? 'list' : 'map';
      // Resetear activo seleccionado al cambiar de vista
      this.selectedAsset = null;
    },
    
    /**
     * Aplicar filtros a los activos
     */
    applyFilters() {
      this.currentPage = 1; // Resetear a la primera página
    },
    
    /**
     * Limpiar término de búsqueda
     */
    clearSearch() {
      this.searchQuery = '';
      this.applyFilters();
    },
    
    /**
     * Eliminar un filtro específico
     */
    removeFilter(filter) {
      this.filters[filter] = '';
      this.applyFilters();
    },
    
    /**
     * Limpiar todos los filtros
     */
    clearAllFilters() {
      this.searchQuery = '';
      Object.keys(this.filters).forEach(key => {
        this.filters[key] = '';
      });
      this.applyFilters();
    },
    
    /**
     * Ordenar por un campo específico
     */
    sortBy(field) {
      // Si hacemos clic en el mismo campo, invertir dirección
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'asc';
      }
    },
    
    /**
     * Obtener icono de ordenamiento según dirección
     */
    getSortIcon() {
      return this.sortDirection === 'asc' ? 'icon-chevron-up' : 'icon-chevron-down';
    },
    
    /**
     * Ir a la página anterior
     */
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
      }
    },
    
    /**
     * Ir a la página siguiente
     */
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
      }
    },
    
    /**
     * Mostrar detalles rápidos de un activo
     */
    showAssetDetails(asset) {
      if (this.viewMode === 'map') {
        this.selectedAsset = asset;
      } else {
        this.quickViewAsset = asset;
      }
    },
    
    /**
     * Alternar selección de un activo en la vista de lista
     */
    toggleAssetSelection(asset) {
      this.quickViewAsset = asset;
    },
    
    /**
     * Ver historial de un activo
     */
    viewAssetHistory(asset) {
      // Cerrar modales abiertos
      this.quickViewAsset = null;
      this.selectedAsset = null;
      
      // Emitir evento para mostrar historial
      this.$emit('view-history', asset);
      
      // Navegar a la página de historial (alternativa)
      // this.$router.push({ name: 'asset-history', params: { id: asset.id } });
    },
    
    /**
     * Ver detalles completos de un activo
     */
    viewAssetDetail(asset) {
      // Cerrar modales abiertos
      this.quickViewAsset = null;
      this.selectedAsset = null;
      
      // Emitir evento para mostrar detalles
      this.$emit('view-details', asset);
      
      // Navegar a la página de detalles (alternativa)
      // this.$router.push({ name: 'asset-details', params: { id: asset.id } });
    },
    
    /**
     * Obtener nombre de categoría a partir de su ID
     */
    getCategoryName(categoryId) {
      const category = this.categories.find(c => c.id === categoryId);
      return category ? category.name : categoryId;
    },
    
    /**
     * Obtener nombre de ubicación a partir de su ID
     */
    getLocationName(locationId) {
      const location = this.locations.find(l => l.id === locationId);
      return location ? location.name : locationId;
    },
    
    /**
     * Obtener nombre de estado a partir de su ID
     */
    getStatusName(statusId) {
      const status = this.statuses.find(s => s.id === statusId);
      return status ? status.name : statusId;
    },
    
    /**
     * Obtener nombre de usuario a partir de su ID
     */
    getUserName(userId) {
      const user = this.users.find(u => u.id === userId);
      return user ? user.name : userId;
    },
    
    /**
     * Obtener clase CSS para el estado de un activo
     */
    getAssetStatusClass(statusId) {
      const statusMap = {
        'active': 'status-active',
        'inactive': 'status-inactive',
        'maintenance': 'status-maintenance',
        'alert': 'status-alert',
        'broken': 'status-broken'
      };
      
      return statusMap[statusId] || 'status-unknown';
    },
    
    /**
     * Obtener icono para el tipo de activo
     */
    getAssetTypeIcon(categoryId) {
      const iconMap = {
        'network': 'icon-wifi',
        'server': 'icon-server',
        'computer': 'icon-monitor',
        'mobile': 'icon-smartphone',
        'peripheral': 'icon-printer',
        'tool': 'icon-tool',
        'accessory': 'icon-package'
      };
      
      return iconMap[categoryId] || 'icon-box';
    },
    
    /**
     * Obtener icono para el tipo de ubicación
     */
    getLocationTypeIcon(locationType) {
      const iconMap = {
        'office': 'icon-briefcase',
        'warehouse': 'icon-archive',
        'tower': 'icon-radio',
        'server': 'icon-server',
        'client': 'icon-user'
      };
      
      return iconMap[locationType] || 'icon-map-pin';
    },
    
    /**
     * Formato de fecha para la última actividad
     */
    formatLastActivity(timestamp) {
      if (!timestamp) return 'Sin actividad';
      
      try {
        return formatDistance(new Date(timestamp), new Date(), {
          addSuffix: true,
          locale: es
        });
      } catch (error) {
        return 'Fecha inválida';
      }
    },
    
    /**
     * Formato de fecha y hora completo
     */
    formatDateTime(timestamp) {
      if (!timestamp) return 'Sin fecha';
      
      try {
        return format(new Date(timestamp), 'dd/MM/yyyy HH:mm');
      } catch (error) {
        return 'Fecha inválida';
      }
    },
    
    /**
     * Obtener tooltip con información de la última actividad
     */
    getActivityTooltip(asset) {
      if (!asset.lastActivity) return 'Sin actividad registrada';
      
      let tooltip = `Último reporte: ${this.formatDateTime(asset.lastActivity)}`;
      
      if (asset.lastCheckin) {
        if (asset.lastCheckin.status) {
          tooltip += `\nEstado: ${asset.lastCheckin.status}`;
        }
        if (asset.lastCheckin.batteryLevel !== undefined) {
          tooltip += `\nBatería: ${asset.lastCheckin.batteryLevel}%`;
        }
        if (asset.lastCheckin.temperature !== undefined) {
          tooltip += `\nTemperatura: ${asset.lastCheckin.temperature}°C`;
        }
        if (asset.lastCheckin.signalStrength !== undefined) {
          tooltip += `\nSeñal: ${asset.lastCheckin.signalStrength} dBm`;
        }
      }
      
      return tooltip;
    },
    
    /**
     * Obtener posición para un activo en el mapa
     * Nota: En una implementación real, esto usaría coordenadas geográficas reales
     */
    getAssetPosition(asset) {
      // Posición basada en ubicación
      const locationPosition = this.getLocationPosition(
        this.locations.find(l => l.id === asset.location) || {}
      );
      
      // Añadir pequeña variación aleatoria para evitar superposición
      return {
        x: locationPosition.x + (Math.random() * 10 - 5),
        y: locationPosition.y + (Math.random() * 10 - 5)
      };
    },
    
    /**
     * Obtener posición para una ubicación en el mapa
     * Nota: En una implementación real, esto usaría coordenadas geográficas reales
     */
    getLocationPosition(location) {
      // Simulación de posiciones para demostración
      // En una implementación real, se usarían coordenadas geográficas reales
      if (location.coordinates) {
        // Usar coordenadas reales si están disponibles
        // Aquí se convertiría lat/lng a posición en el mapa
        return { 
          x: 10 + (Math.random() * 80), 
          y: 10 + (Math.random() * 80)
        };
      }
      
      // Distribuir ubicaciones de forma semi-aleatoria pero consistente
      const locationTypeMap = {
        'office': { x: 50, y: 50 },
        'warehouse': { x: 30, y: 70 },
        'tower': { x: 70, y: 30 },
        'server': { x: 20, y: 40 },
        'client': { x: 60, y: 60 }
      };
      
      const basePosition = locationTypeMap[location.type] || { x: 50, y: 50 };
      
      // Usar el ID de la ubicación para generar una variación consistente
      const idHash = location.id ? location.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
      const xOffset = (idHash % 20) - 10;
      const yOffset = ((idHash * 13) % 20) - 10;
      
      return {
        x: basePosition.x + xOffset,
        y: basePosition.y + yOffset
      };
    }
  }
};
</script>

<style scoped>
.asset-tracker {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Header */
.tracker-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background-color: var(--bg-primary, white);
}

.header-title h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.header-title p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-refresh, .btn-view {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid var(--border-color, #e0e0e0);
  transition: all 0.2s ease;
}

.btn-refresh {
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-secondary, #666);
}

.btn-refresh:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.btn-view {
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
  border-color: var(--primary-light, #64b5f6);
}

.btn-view:hover {
  background-color: var(--primary-lighter, #bbdefb);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Filters */
.tracker-filters {
  padding: 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.search-container {
  margin-bottom: 16px;
}

.search-input {
  position: relative;
}

.search-input i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #666);
}

.search-input input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--bg-primary, white);
}

.search-input input:focus {
  outline: none;
  border-color: var(--primary-color, #1976d2);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.btn-clear-search {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.filter-container {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--bg-primary, white);
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.active-filters-label {
  font-size: 13px;
  color: var(--text-secondary, #666);
  white-space: nowrap;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
  border-radius: 16px;
  padding: 4px 10px 4px 14px;
  font-size: 13px;
}

.btn-remove-filter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background-color: var(--primary-lighter, #bbdefb);
  border: none;
  border-radius: 50%;
  color: var(--primary-color, #1976d2);
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}

.btn-clear-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--text-secondary, #666);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-clear-filters:hover {
  color: var(--text-primary, #333);
  text-decoration: underline;
}

/* Loading and empty states */
.loading-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  height: 100%;
  min-height: 300px;
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

.empty-icon {
  font-size: 48px;
  color: var(--text-secondary, #666);
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.empty-message {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.btn-secondary {
  padding: 8px 16px;
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary, #333);
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

/* Map view */
.tracker-map-view {
  flex: 1;
  display: flex;
  min-height: 0;
}

.map-container {
  display: flex;
  width: 100%;
  height: 100%;
}

.map-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  min-height: 400px;
  background-color: #f1f5f9;
  position: relative;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMS41IDYwVjEuNUg2MFY2MEgxLjVaIiBzdHJva2U9IiNFMkU4RjAiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==');
  background-size: 40px 40px;
}

.map-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  z-index: 2;
}

.map-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-self: flex-end;
  pointer-events: auto;
}

.btn-map-control {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background-color: white;
  border: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-secondary, #666);
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.btn-map-control:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.map-legend {
  align-self: flex-start;
  background-color: white;
  border-radius: 6px;
  padding: 12px;
  min-width: 200px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
}

.legend-title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 8px;
  color: var(--text-primary, #333);
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.status-active {
  background-color: #4caf50;
}

.status-dot.status-maintenance {
  background-color: #ff9800;
}

.status-dot.status-inactive {
  background-color: #9e9e9e;
}

.status-dot.status-alert {
  background-color: #f44336;
}

.map-markers {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.map-marker {
  position: absolute;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: all 0.2s ease;
  z-index: 10;
}

.map-marker::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
  z-index: -1;
}

.map-marker:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.map-marker.status-active {
  border: 2px solid #4caf50;
}

.map-marker.status-maintenance {
  border: 2px solid #ff9800;
}

.map-marker.status-inactive {
  border: 2px solid #9e9e9e;
  opacity: 0.7;
}

.map-marker.status-alert {
  border: 2px solid #f44336;
  animation: pulse 1.5s infinite;
}

.map-marker.status-broken {
  border: 2px solid #f44336;
  opacity: 0.7;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
  }
}

.marker-tooltip {
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%) translateY(-100%);
  background-color: white;
  border-radius: 6px;
  padding: 8px 12px;
  min-width: 150px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s ease;
  z-index: 3;
}

.marker-tooltip::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

.map-marker:hover .marker-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(-110%);
}

.marker-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary, #333);
  margin-bottom: 4px;
}

.marker-serial,
.marker-location,
.marker-status {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.map-locations {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.location-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 5;
}

.location-marker-icon {
  width: 48px;
  height: 48px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.location-marker-icon i {
  font-size: 24px;
  color: var(--primary-color, #1976d2);
}

.location-name {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #333);
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.map-info-panel {
  width: 320px;
  background-color: white;
  border-left: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.info-panel-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.info-panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
}

.btn-close:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.info-panel-content {
  flex: 1;
  overflow-y: auto;
}

.info-panel-section {
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.info-panel-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: var(--text-primary, #333);
}

.asset-header {
  display: flex;
  gap: 12px;
}

.asset-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  color: var(--primary-color, #1976d2);
  font-size: 24px;
}

.asset-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.asset-id, .asset-serial {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.asset-status {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
  align-self: flex-start;
}

.asset-status.status-active {
  background-color: rgba(76, 175, 80, 0.1);
  color: #2e7d32;
}

.asset-status.status-maintenance {
  background-color: rgba(255, 152, 0, 0.1);
  color: #ef6c00;
}

.asset-status.status-inactive {
  background-color: rgba(158, 158, 158, 0.1);
  color: #616161;
}

.asset-status.status-alert {
  background-color: rgba(244, 67, 54, 0.1);
  color: #c62828;
}

.asset-status.status-broken {
  background-color: rgba(244, 67, 54, 0.1);
  color: #c62828;
}

.asset-location {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary, #333);
  margin-bottom: 8px;
}

.asset-coordinates {
  font-size: 13px;
  color: var(--text-secondary, #666);
  display: flex;
  gap: 12px;
}

.asset-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary, #333);
}

.last-checkin {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkin-date {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.checkin-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-panel-actions {
  display: flex;
  gap: 10px;
  padding: 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.btn-outline {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: transparent;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-secondary, #666);
  cursor: pointer;
}

.btn-outline:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

/* List view */
.tracker-list-view {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.assets-table-container {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.assets-table {
  width: 100%;
  border-collapse: collapse;
}

.assets-table th, 
.assets-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.assets-table th {
  background-color: var(--bg-secondary, #f5f5f5);
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #333);
  cursor: pointer;
  user-select: none;
  position: sticky;
  top: 0;
  z-index: 1;
}

.assets-table th.sorted {
  color: var(--primary-color, #1976d2);
}

.assets-table th i {
  margin-left: 4px;
}

.assets-table tbody tr {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.assets-table tbody tr:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.asset-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.asset-name-cell i {
  font-size: 18px;
  color: var(--primary-color, #1976d2);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.status-active {
  background-color: rgba(76, 175, 80, 0.1);
  color: #2e7d32;
}

.status-badge.status-maintenance {
  background-color: rgba(255, 152, 0, 0.1);
  color: #ef6c00;
}

.status-badge.status-inactive {
  background-color: rgba(158, 158, 158, 0.1);
  color: #616161;
}

.status-badge.status-alert {
  background-color: rgba(244, 67, 54, 0.1);
  color: #c62828;
}

.status-badge.status-broken {
  background-color: rgba(244, 67, 54, 0.1);
  color: #c62828;
}

.last-activity {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.actions-cell .btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  color: var(--text-secondary, #666);
  cursor: pointer;
}

.actions-cell .btn-icon:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  background-color: var(--bg-primary, white);
}

.btn-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-secondary, #666);
  cursor: pointer;
}

.btn-page:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

/* Quick view modal */
.asset-quickview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.asset-quickview-container {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.quickview-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.quickview-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.quickview-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.quickview-section {
  margin-bottom: 24px;
}

.quickview-section:last-child {
  margin-bottom: 0;
}

.quickview-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: var(--text-primary, #333);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  padding-bottom: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-time {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.activity-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: var(--bg-secondary, #f5f5f5);
  padding: 12px;
  border-radius: 8px;
}

.quickview-footer {
  display: flex;
  gap: 10px;
  padding: 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: var(--primary-color, #1976d2);
  border: none;
  border-radius: 6px;
  font-size: 14px;
  color: white;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: var(--primary-dark, #1565c0);
}

/* Responsive */
@media (max-width: 768px) {
  .tracker-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .filter-container {
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .map-container {
    flex-direction: column;
  }
  
  .map-info-panel {
    width: 100%;
    height: 300px;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .assets-table th:nth-child(4),
  .assets-table td:nth-child(4),
  .assets-table th:nth-child(5),
  .assets-table td:nth-child(5) {
    display: none;
  }
}
</style>
