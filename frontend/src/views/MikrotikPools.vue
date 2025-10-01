<template>
  <div class="ip-pools-management">
    <div class="header">
      <h2>Gestión de IP Pools</h2>
      <div class="header-actions">
        <select v-model="selectedRouter" @change="filterByRouter" class="router-filter">
          <option value="">Todos los routers</option>
          <option v-for="router in routers" :key="router.id" :value="router.id">
            {{ router.name }} ({{ router.ipAddress }})
          </option>
        </select>
        
        <select v-model="selectedType" @change="filterByType" class="type-filter">
          <option value="">Todos los tipos</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
          <option value="cutService">Cortados</option>
        </select>
        
        <button @click="openSyncModal" class="sync-button">
          <span class="icon">🔄</span>
          Sincronizar Pools
        </button>
        
        <button @click="openCreateModal" class="create-button">
          <span class="icon">➕</span>
          Nuevo Pool
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      Cargando pools...
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      <span class="icon">⚠️</span>
      {{ error }}
    </div>

    <!-- Pools Grid -->
    <div v-if="!loading && filteredPools.length > 0" class="pools-grid">
      <div 
        v-for="pool in filteredPools" 
        :key="pool.id" 
        class="pool-card"
        :class="{ 'inactive': !pool.active }"
      >
        <div class="pool-header">
          <div class="pool-name">
            <h3>{{ getPoolDisplayName(pool.poolName) }}</h3>
            <span class="original-name" v-if="pool.mikrotikPoolName !== pool.poolName">
              ({{ pool.mikrotikPoolName }})
            </span>
          </div>
          <div class="pool-type" :style="{ backgroundColor: getPoolTypeColor(pool.poolType) }">
            {{ getPoolTypeLabel(pool.poolType) }}
          </div>
        </div>

        <div class="pool-info">
          <div class="info-row">
            <span class="label">Router:</span>
            <span class="value">{{ pool.MikrotikRouter?.name }}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Red:</span>
            <span class="value">{{ pool.networkAddress }}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Rango:</span>
            <span class="value">{{ pool.startIp }} - {{ pool.endIp }}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Gateway:</span>
            <span class="value">{{ pool.gateway }}</span>
          </div>
          
          <div class="info-row">
            <span class="label">DNS:</span>
            <span class="value">{{ pool.dnsPrimary }}, {{ pool.dnsSecondary }}</span>
          </div>
          
          <div class="info-row">
            <span class="label">Última sync:</span>
            <span class="value">{{ formatDate(pool.lastSyncWithMikrotik) }}</span>
          </div>
        </div>

        <div class="pool-actions">
          <button @click="editPool(pool)" class="edit-btn" title="Editar">
            <span class="icon">✏️</span>
          </button>
          
          <button @click="renamePool(pool)" class="rename-btn" title="Renombrar">
            <span class="icon">🏷️</span>
          </button>
          
          <button @click="viewClients(pool)" class="clients-btn" title="Ver clientes">
            <span class="icon">👥</span>
          </button>
          
          <button @click="syncPool(pool)" class="sync-btn" title="Sincronizar">
            <span class="icon">🔄</span>
          </button>
          
          <button 
            @click="togglePoolStatus(pool)" 
            :class="pool.active ? 'deactivate-btn' : 'activate-btn'"
            :title="pool.active ? 'Desactivar' : 'Activar'"
          >
            <span class="icon">{{ pool.active ? '❌' : '✅' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && filteredPools.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>No hay pools disponibles</h3>
      <p>Sincroniza pools desde un router Mikrotik o crea uno nuevo</p>
      <button @click="openSyncModal" class="sync-button">
        Sincronizar Pools
      </button>
    </div>

    <!-- Modal de Sincronización -->
    <div v-if="showSyncModal" class="modal-overlay" @click="closeSyncModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Sincronizar Pools desde Mikrotik</h3>
          <button @click="closeSyncModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Seleccionar Router:</label>
            <select v-model="syncRouterId" class="form-select">
              <option value="">Seleccionar router...</option>
              <option v-for="router in routers" :key="router.id" :value="router.id">
                {{ router.name }} ({{ router.ipAddress }})
              </option>
            </select>
          </div>
          
          <div v-if="syncResult" class="sync-result">
            <h4>Resultado de la sincronización:</h4>
            <div class="result-summary">
              <span class="created">✅ Creados: {{ syncResult.summary?.created || 0 }}</span>
              <span class="updated">🔄 Actualizados: {{ syncResult.summary?.updated || 0 }}</span>
              <span class="errors">❌ Errores: {{ syncResult.summary?.errors || 0 }}</span>
            </div>
            
            <div v-if="syncResult.syncResults" class="result-details">
              <div 
                v-for="result in syncResult.syncResults" 
                :key="result.poolName" 
                class="result-item"
                :class="result.status"
              >
                <span class="pool-name">{{ result.poolName }}</span>
                <span class="status">{{ result.status }}</span>
                <span v-if="result.error" class="error">{{ result.error }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeSyncModal" class="cancel-btn">Cancelar</button>
          <button 
            @click="performSync" 
            :disabled="!syncRouterId || syncing"
            class="sync-btn"
          >
            {{ syncing ? 'Sincronizando...' : 'Sincronizar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Renombrar -->
    <div v-if="showRenameModal" class="modal-overlay" @click="closeRenameModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Renombrar Pool</h3>
          <button @click="closeRenameModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Pool actual:</label>
            <input type="text" :value="poolToRename?.poolName" readonly class="form-input readonly">
          </div>
          
          <div class="form-group">
            <label>Nuevo nombre:</label>
            <input 
              type="text" 
              v-model="newPoolName" 
              placeholder="Ej: morosos, suspendidos, cortados"
              class="form-input"
              @keyup.enter="performRename"
            >
          </div>
          
          <div class="form-group">
            <label>Tipo de pool:</label>
            <select v-model="newPoolType" class="form-select">
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
              <option value="cutService">Cortados</option>
            </select>
          </div>
          
          <div class="suggestions">
            <label>Sugerencias:</label>
            <div class="suggestion-chips">
              <button 
                v-for="suggestion in getPoolNameSuggestions(newPoolType)" 
                :key="suggestion"
                @click="newPoolName = suggestion"
                class="suggestion-chip"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeRenameModal" class="cancel-btn">Cancelar</button>
          <button 
            @click="performRename" 
            :disabled="!newPoolName.trim() || renaming"
            class="save-btn"
          >
            {{ renaming ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Crear Pool -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Crear Nuevo Pool</h3>
          <button @click="closeCreateModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Nombre del Pool:</label>
              <input 
                type="text" 
                v-model="newPool.poolName" 
                placeholder="Ej: clientesActivos"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label>Router Mikrotik:</label>
              <select v-model="newPool.mikrotikRouterId" class="form-select">
                <option value="">Seleccionar router...</option>
                <option v-for="router in routers" :key="router.id" :value="router.id">
                  {{ router.name }} ({{ router.ipAddress }})
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Dirección de Red:</label>
              <input 
                type="text" 
                v-model="newPool.networkAddress" 
                placeholder="192.168.1.0/24"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label>Tipo de Pool:</label>
              <select v-model="newPool.poolType" class="form-select">
                <option value="active">Activos</option>
                <option value="suspended">Suspendidos</option>
                <option value="cutService">Cortados</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>IP Inicial:</label>
              <input 
                type="text" 
                v-model="newPool.startIp" 
                placeholder="192.168.1.10"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label>IP Final:</label>
              <input 
                type="text" 
                v-model="newPool.endIp" 
                placeholder="192.168.1.100"
                class="form-input"
              >
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Gateway:</label>
              <input 
                type="text" 
                v-model="newPool.gateway" 
                placeholder="192.168.1.1"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label>DNS Primario:</label>
              <input 
                type="text" 
                v-model="newPool.dnsPrimary" 
                placeholder="8.8.8.8"
                class="form-input"
              >
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeCreateModal" class="cancel-btn">Cancelar</button>
          <button 
            @click="createPool" 
            :disabled="!isValidPool || creating"
            class="save-btn"
          >
            {{ creating ? 'Creando...' : 'Crear Pool' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>



<script>
import IpPoolService from '../services/ipPool.service';
import MikrotikRouterService from '../services/mikrotikRouter.service';
import NetworkService from '../services/network.service';

export default {
  name: 'MikrotikPools',
  data() {
    return {
      // Datos jerárquicos
      zones: [],
      nodes: [],
      routers: [],
      pools: [],
      
      // Estados de carga
      loading: false,
      loadingPools: false,
      error: null,
      
      // Filtros jerárquicos
      selectedZone: '',
      selectedNode: '',
      selectedRouter: '',
      selectedType: '',
      
      // Modales
      showSyncModal: false,
      showRenameModal: false,
      showEditModal: false,
      
      // Sincronización
      syncType: 'router',
      syncRouterId: '',
      syncing: false,
      syncResult: null,
      
      // Renombrar
      poolToRename: null,
      newPoolName: '',
      newPoolType: 'active',
      renaming: false,
      
      // Editar
      poolToEdit: null,
      editingPool: false,
      
      // Expansión de tarjetas por zona
      expandedZones: new Set(),
      expandedNodes: new Set()
    };
  },
  
  computed: {
    // Filtrar nodos por zona seleccionada
    filteredNodes() {
      if (!this.selectedZone) return this.nodes;
      return this.nodes.filter(node => node.zoneId == this.selectedZone);
    },
    
    // Filtrar routers por nodo seleccionado
    filteredRouters() {
      if (!this.selectedNode) return this.routers;
      return this.routers.filter(router => router.nodeId == this.selectedNode);
    },
    
    // Pools organizados jerárquicamente
    poolsByHierarchy() {
      const hierarchy = {};
      
      this.zones.forEach(zone => {
        if (!hierarchy[zone.id]) {
          hierarchy[zone.id] = {
            zone: zone,
            nodes: {}
          };
        }
      });
      
      this.nodes.forEach(node => {
        if (hierarchy[node.zoneId]) {
          hierarchy[node.zoneId].nodes[node.id] = {
            node: node,
            routers: {}
          };
        }
      });
      
      this.routers.forEach(router => {
        const node = this.nodes.find(n => n.id === router.nodeId);
        const zoneId = node ? node.zoneId : null;
        
        if (zoneId && hierarchy[zoneId] && hierarchy[zoneId].nodes[router.nodeId]) {
          hierarchy[zoneId].nodes[router.nodeId].routers[router.id] = {
            router: router,
            pools: []
          };
        }
      });
      
      // Filtrar y asignar pools
      this.filteredPools.forEach(pool => {
        const router = this.routers.find(r => r.id === pool.mikrotikRouterId);
        if (router) {
          const node = this.nodes.find(n => n.id === router.nodeId);
          const zoneId = node ? node.zoneId : null;
          
          if (zoneId && hierarchy[zoneId] && 
              hierarchy[zoneId].nodes[router.nodeId] &&
              hierarchy[zoneId].nodes[router.nodeId].routers[router.id]) {
            hierarchy[zoneId].nodes[router.nodeId].routers[router.id].pools.push(pool);
          }
        }
      });
      
      return hierarchy;
    },
    
    // Pools filtrados
    filteredPools() {
      let filtered = this.pools;
      
      if (this.selectedZone) {
        const zoneRouters = this.routers.filter(r => {
          const node = this.nodes.find(n => n.id === r.nodeId);
          return node && node.zoneId == this.selectedZone;
        });
        const routerIds = zoneRouters.map(r => r.id);
        filtered = filtered.filter(pool => routerIds.includes(pool.mikrotikRouterId));
      }
      
      if (this.selectedNode) {
        const nodeRouters = this.routers.filter(r => r.nodeId == this.selectedNode);
        const routerIds = nodeRouters.map(r => r.id);
        filtered = filtered.filter(pool => routerIds.includes(pool.mikrotikRouterId));
      }
      
      if (this.selectedRouter) {
        filtered = filtered.filter(pool => pool.mikrotikRouterId == this.selectedRouter);
      }
      
      if (this.selectedType) {
        filtered = filtered.filter(pool => pool.poolType === this.selectedType);
      }
      
      return filtered;
    },
    
    // Estadísticas por tipo
    poolStatistics() {
      const stats = {
        active: 0,
        suspended: 0,
        cutService: 0,
        total: 0
      };
      
      this.filteredPools.forEach(pool => {
        if (pool.active) {
          stats[pool.poolType] = (stats[pool.poolType] || 0) + 1;
          stats.total++;
        }
      });
      
      return stats;
    },
    
    // Routers para sincronización
    routersForSync() {
      if (this.selectedZone) {
        const zoneRouters = this.routers.filter(r => {
          const node = this.nodes.find(n => n.id === r.nodeId);
          return node && node.zoneId == this.selectedZone;
        });
        return zoneRouters;
      }
      if (this.selectedNode) {
        return this.routers.filter(r => r.nodeId == this.selectedNode);
      }
      return this.routers;
    }
  },
  
  async created() {
    await this.loadInitialData();
  },
  
  methods: {
    // ===== CARGA DE DATOS =====
    async loadInitialData() {
      this.loading = true;
      this.error = null;
      
      try {
        // Cargar jerarquía de red
        const [zonesResponse, nodesResponse, routersResponse] = await Promise.all([
          NetworkService.getAllZones({ status: 'active' }),
          NetworkService.getAllNodes({ active: true }),
          MikrotikRouterService.getAllMikrotikRouters({ active: true })
        ]);
        
        this.zones = zonesResponse.data.data?.zones || zonesResponse.data || [];
        this.nodes = nodesResponse.data.data?.nodes || nodesResponse.data || [];
        this.routers = routersResponse.data.data?.routers || routersResponse.data || [];
        
        // Cargar pools
        await this.loadPools();
        
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        this.error = 'Error cargando la estructura de red. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    
    async loadPools() {
      this.loadingPools = true;
      try {
        const response = await IpPoolService.getAllIpPools();
        this.pools = response.data.data || response.data || [];
      } catch (error) {
        console.error('Error cargando pools:', error);
        this.error = 'Error cargando pools. Por favor, intente nuevamente.';
      } finally {
        this.loadingPools = false;
      }
    },
    
    // ===== FILTROS JERÁRQUICOS =====
    onZoneChange() {
      this.selectedNode = '';
      this.selectedRouter = '';
      this.expandedZones.clear();
      if (this.selectedZone) {
        this.expandedZones.add(parseInt(this.selectedZone));
      }
    },
    
    onNodeChange() {
      this.selectedRouter = '';
      this.expandedNodes.clear();
      if (this.selectedNode) {
        this.expandedNodes.add(parseInt(this.selectedNode));
      }
    },
    
    // ===== SINCRONIZACIÓN =====
    openSyncModal() {
      this.showSyncModal = true;
      this.syncResult = null;
      this.syncRouterId = '';
      this.syncType = 'router';
    },
    
    closeSyncModal() {
      this.showSyncModal = false;
      this.syncResult = null;
    },
    
    async performSync() {
      this.syncing = true;
      this.syncResult = null;
      
      try {
        let response;
        
        if (this.syncType === 'global') {
          // Sincronización global usando la ruta correcta
          response = await fetch('http://localhost:3000/api/mikrotik/sync/ip-pools', {
            method: 'POST',
            headers: this.getAuthHeaders()
          });
          
          if (!response.ok) throw new Error('Error en sincronización global');
          response = { data: await response.json() };
          
        } else if (this.syncRouterId) {
          // Sincronización específica de un router
          response = await IpPoolService.syncPoolsFromMikrotik(this.syncRouterId);
        } else {
          throw new Error('Debe seleccionar un router o sincronización global');
        }
        
        this.syncResult = response.data;
        await this.loadPools(); // Recargar pools después de sincronizar
        
      } catch (error) {
        console.error('Error sincronizando:', error);
        this.error = 'Error en la sincronización. Verifique la conexión con los routers.';
      } finally {
        this.syncing = false;
      }
    },
    
	// ===== ACCIONES DE POOL =====
async syncPool(pool) {
  try {
    await IpPoolService.syncPoolWithRouter(pool.id);
    await this.loadPools();
  } catch (error) {
    console.error('Error sincronizando pool específico:', error);
    this.error = `Error sincronizando el pool ${pool.poolName}.`;
  }
},

    async syncSpecificPool(pool) {
      try {
        await IpPoolService.syncPoolWithRouter(pool.id);
        await this.loadPools();
      } catch (error) {
        console.error('Error sincronizando pool específico:', error);
        this.error = `Error sincronizando el pool ${pool.poolName}.`;
      }
    },
	
	
    
    // ===== EDITAR POOL (NUEVA FUNCIÓN) =====
    editPool(pool) {
      this.poolToEdit = { ...pool }; // Clonar para evitar mutaciones
      this.showEditModal = true;
    },
    
    closeEditModal() {
      this.showEditModal = false;
      this.poolToEdit = null;
    },
    
    async saveEditedPool() {
      if (!this.poolToEdit) return;
      
      this.editingPool = true;
      try {
        // Actualizar usando la ruta PUT del backend
        await IpPoolService.updateIpPool(this.poolToEdit.id, {
          poolName: this.poolToEdit.poolName,
          poolType: this.poolToEdit.poolType,
          networkAddress: this.poolToEdit.networkAddress,
          startIp: this.poolToEdit.startIp,
          endIp: this.poolToEdit.endIp,
          gateway: this.poolToEdit.gateway,
          dnsPrimary: this.poolToEdit.dnsPrimary,
          dnsSecondary: this.poolToEdit.dnsSecondary,
          active: this.poolToEdit.active
          // NO enviamos mikrotikPoolId porque ese es inmutable
        });
        
        // Actualizar en la lista local
        const poolIndex = this.pools.findIndex(p => p.id === this.poolToEdit.id);
        if (poolIndex !== -1) {
          this.pools[poolIndex] = { ...this.poolToEdit };
        }
        
        this.closeEditModal();
        
      } catch (error) {
        console.error('Error editando pool:', error);
        this.error = 'Error editando el pool. Por favor, intente nuevamente.';
      } finally {
        this.editingPool = false;
      }
    },
    
    // ===== RENOMBRAR (CORREGIDO) =====
    renamePool(pool) {
      this.poolToRename = pool;
      this.newPoolName = pool.poolName;
      this.newPoolType = pool.poolType;
      this.showRenameModal = true;
    },
    
    closeRenameModal() {
      this.showRenameModal = false;
      this.poolToRename = null;
      this.newPoolName = '';
    },
    
    async performRename() {
      if (!this.newPoolName.trim()) return;
      
      this.renaming = true;
      try {
        // Solo actualizar nombre y tipo en la DB, mantener todo lo demás igual
        await IpPoolService.updateIpPool(this.poolToRename.id, {
          poolName: this.newPoolName,
          poolType: this.newPoolType,
          // Mantener todos los demás datos iguales
          networkAddress: this.poolToRename.networkAddress,
          startIp: this.poolToRename.startIp,
          endIp: this.poolToRename.endIp,
          gateway: this.poolToRename.gateway,
          dnsPrimary: this.poolToRename.dnsPrimary,
          dnsSecondary: this.poolToRename.dnsSecondary,
          mikrotikRouterId: this.poolToRename.mikrotikRouterId,
          active: this.poolToRename.active
        });
        
        // Actualizar en la lista local
        const pool = this.pools.find(p => p.id === this.poolToRename.id);
        if (pool) {
          pool.poolName = this.newPoolName;
          pool.poolType = this.newPoolType;
        }
        
        this.closeRenameModal();
        
      } catch (error) {
        console.error('Error renombrando pool:', error);
        this.error = 'Error renombrando el pool. Por favor, intente nuevamente.';
      } finally {
        this.renaming = false;
      }
    },
    
    // ===== ACCIONES DE POOL =====
async viewClients(pool) {
  try {
    const response = await IpPoolService.getPoolClients(pool.id);
    console.log('Clientes del pool:', response.data);
    
    // Temporal: mostrar alert con info
    const clientCount = response.data.data?.length || response.data.length || 0;
    alert(`Pool: ${pool.poolName}\nClientes encontrados: ${clientCount}`);
    
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    
    if (error.response?.status === 404) {
      this.error = 'La función de ver clientes del pool no está disponible.';
    } else {
      this.error = 'Error obteniendo clientes del pool.';
    }
  }
},
    
async viewPoolDetails(pool) {
  try {
    const response = await IpPoolService.getPoolAvailableIPs(pool.id);
    console.log('Detalles del pool:', response.data);
    
    // Temporal: mostrar info en alert
    const availableIPs = response.data.data?.length || response.data.length || 0;
    alert(`Pool: ${pool.poolName}\nIPs disponibles: ${availableIPs}`);
    
  } catch (error) {
    console.error('Error obteniendo detalles del pool:', error);
    this.error = 'Error obteniendo detalles del pool.';
  }
},

async togglePoolStatus(pool) {
  try {
    await IpPoolService.togglePoolStatus(pool.id, !pool.active);
    pool.active = !pool.active;
  } catch (error) {
    console.error('Error cambiando estado del pool:', error);
    this.error = 'Error cambiando el estado del pool.';
  }
},
    
    // ===== EXPANSIÓN DE TARJETAS =====
    toggleZoneExpansion(zoneId) {
      if (this.expandedZones.has(zoneId)) {
        this.expandedZones.delete(zoneId);
      } else {
        this.expandedZones.add(zoneId);
      }
    },
    
    toggleNodeExpansion(nodeId) {
      if (this.expandedNodes.has(nodeId)) {
        this.expandedNodes.delete(nodeId);
      } else {
        this.expandedNodes.add(nodeId);
      }
    },
    
    isZoneExpanded(zoneId) {
      return this.expandedZones.has(zoneId);
    },
    
    isNodeExpanded(nodeId) {
      return this.expandedNodes.has(nodeId);
    },
    
    // ===== UTILIDADES =====
    getPoolDisplayName(poolName) {
      return IpPoolService.getPoolDisplayName(poolName);
    },
    
    getPoolTypeLabel(poolType) {
      return IpPoolService.getPoolTypeLabel(poolType);
    },
    
    getPoolTypeColor(poolType) {
      return IpPoolService.getPoolTypeColor(poolType);
    },
    
    getPoolNameSuggestions(poolType) {
      return IpPoolService.getPoolNameSuggestions(poolType);
    },
    
    getZoneName(zoneId) {
      const zone = this.zones.find(z => z.id === zoneId);
      return zone ? zone.name : 'Zona desconocida';
    },
    
    getNodeName(nodeId) {
      const node = this.nodes.find(n => n.id === nodeId);
      return node ? node.name : 'Nodo desconocido';
    },
    
    getRouterName(routerId) {
      const router = this.routers.find(r => r.id === routerId);
      return router ? router.name : 'Router desconocido';
    },
    
    getAuthHeaders() {
      const user = JSON.parse(localStorage.getItem('user'));
      return user && user.accessToken ? { 
        'x-access-token': user.accessToken,
        'Content-Type': 'application/json'
      } : { 
        'Content-Type': 'application/json' 
      };
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Nunca';
      
      return new Date(dateString).toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    // ===== NAVEGACIÓN =====
    goToRouter(routerId) {
      this.$router.push(`/routers/${routerId}`);
    },
    
    goToNode(nodeId) {
      this.$router.push(`/nodes/${nodeId}`);
    },
    
    goToZone(zoneId) {
      this.$router.push(`/zones/${zoneId}`);
    }
  }
};
</script>

<style scoped>
.ip-pools-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* =============== HEADER =============== */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 28px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

/* =============== FILTROS =============== */
.router-filter,
.type-filter {
  padding: 10px 15px;
  border: 2px solid #bdc3c7;
  border-radius: 8px;
  background-color: white;
  font-size: 14px;
  min-width: 180px;
  transition: all 0.3s ease;
}

.router-filter:focus,
.type-filter:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

/* =============== BOTONES =============== */
.sync-button,
.create-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.sync-button {
  background-color: #f39c12;
  color: white;
}

.sync-button:hover {
  background-color: #e67e22;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);
}

.create-button {
  background-color: #27ae60;
  color: white;
}

.create-button:hover {
  background-color: #229954;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
}

/* =============== LOADING Y ERRORES =============== */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #7f8c8d;
  font-size: 18px;
  gap: 15px;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #ecf0f1;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px 20px;
  border-radius: 8px;
  border-left: 4px solid #f44336;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* =============== GRID DE POOLS =============== */
.pools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 25px;
  margin-top: 20px;
}

/* =============== TARJETAS DE POOL =============== */
.pool-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid #ecf0f1;
  transition: all 0.3s ease;
  position: relative;
}

.pool-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.pool-card.inactive {
  opacity: 0.6;
  background-color: #f8f9fa;
}

.pool-card.inactive::before {
  content: "INACTIVO";
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: #e74c3c;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

/* =============== HEADER DE POOL =============== */
.pool-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ecf0f1;
}

.pool-name h3 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
}

.original-name {
  font-size: 12px;
  color: #7f8c8d;
  font-style: italic;
}

.pool-type {
  padding: 6px 12px;
  border-radius: 20px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* =============== INFORMACIÓN DEL POOL =============== */
.pool-info {
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f8f9fa;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  font-weight: 600;
  color: #34495e;
  font-size: 13px;
  min-width: 100px;
}

.info-row .value {
  color: #2c3e50;
  font-size: 13px;
  text-align: right;
  flex: 1;
  margin-left: 10px;
  word-break: break-all;
}

/* =============== ACCIONES DEL POOL =============== */
.pool-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.pool-actions button {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.edit-btn {
  background-color: #3498db;
  color: white;
}

.edit-btn:hover {
  background-color: #2980b9;
}

.rename-btn {
  background-color: #9b59b6;
  color: white;
}

.rename-btn:hover {
  background-color: #8e44ad;
}

.clients-btn {
  background-color: #1abc9c;
  color: white;
}

.clients-btn:hover {
  background-color: #16a085;
}

.sync-btn {
  background-color: #f39c12;
  color: white;
}

.sync-btn:hover {
  background-color: #e67e22;
}

.activate-btn {
  background-color: #27ae60;
  color: white;
}

.activate-btn:hover {
  background-color: #229954;
}

.deactivate-btn {
  background-color: #e74c3c;
  color: white;
}

.deactivate-btn:hover {
  background-color: #c0392b;
}

/* =============== ESTADO VACÍO =============== */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 10px 0;
  color: #34495e;
  font-size: 24px;
}

.empty-state p {
  margin: 0 0 30px 0;
  font-size: 16px;
  color: #7f8c8d;
}

/* =============== MODALES =============== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 12px;
  min-width: 500px;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 30px;
  border-bottom: 1px solid #ecf0f1;
  background-color: #f8f9fa;
  border-radius: 12px 12px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #7f8c8d;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: #e74c3c;
  color: white;
}

.modal-body {
  padding: 30px;
}

.modal-footer {
  padding: 20px 30px;
  border-top: 1px solid #ecf0f1;
  background-color: #f8f9fa;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  border-radius: 0 0 12px 12px;
}

/* =============== FORMULARIOS =============== */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #34495e;
  font-weight: 600;
  font-size: 14px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #bdc3c7;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.form-input.readonly {
  background-color: #f8f9fa;
  color: #7f8c8d;
  cursor: not-allowed;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

/* =============== RESULTADOS DE SINCRONIZACIÓN =============== */
.sync-result {
  margin-top: 25px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.sync-result h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
}

.result-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.result-summary span {
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.result-summary .created {
  background-color: #d4edda;
  color: #155724;
}

.result-summary .updated {
  background-color: #fff3cd;
  color: #856404;
}

.result-summary .errors {
  background-color: #f8d7da;
  color: #721c24;
}

.result-details {
  max-height: 200px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  margin-bottom: 8px;
  border-radius: 6px;
  background-color: white;
  border: 1px solid #e9ecef;
}

.result-item.success {
  border-left: 4px solid #28a745;
}

.result-item.error {
  border-left: 4px solid #dc3545;
}

.result-item .pool-name {
  font-weight: 600;
  color: #2c3e50;
}

.result-item .status {
  font-size: 12px;
  text-transform: uppercase;
  font-weight: 600;
}

.result-item .error {
  color: #dc3545;
  font-size: 12px;
}

/* =============== SUGERENCIAS =============== */
.suggestions {
  margin-top: 20px;
}

.suggestions label {
  display: block;
  margin-bottom: 10px;
  color: #34495e;
  font-weight: 600;
  font-size: 14px;
}

.suggestion-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.suggestion-chip {
  padding: 6px 12px;
  background-color: #ecf0f1;
  border: 1px solid #bdc3c7;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #2c3e50;
}

.suggestion-chip:hover {
  background-color: #3498db;
  color: white;
  border-color: #3498db;
}

/* =============== BOTONES DE MODAL =============== */
.cancel-btn,
.save-btn,
.sync-btn {
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background-color: #95a5a6;
  color: white;
}

.cancel-btn:hover {
  background-color: #7f8c8d;
}

.save-btn {
  background-color: #27ae60;
  color: white;
}

.save-btn:hover {
  background-color: #229954;
}

.save-btn:disabled,
.sync-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.6;
}

/* =============== RESPONSIVE =============== */
@media (max-width: 768px) {
  .ip-pools-management {
    padding: 15px;
  }
  
  .header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .pools-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .pool-card {
    padding: 20px;
  }
  
  .pool-actions {
    justify-content: center;
  }
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .modal {
    min-width: 90%;
    margin: 20px;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .result-summary {
    flex-direction: column;
    gap: 10px;
  }
  
  .suggestion-chips {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .pool-actions {
    flex-direction: column;
  }
  
  .pool-actions button {
    width: 100%;
    justify-content: center;
  }
}

/* =============== ICONOS =============== */
.icon {
  font-size: 14px;
}

/* =============== ANIMACIONES ADICIONALES =============== */
.pool-card {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =============== UTILIDADES =============== */
.text-center {
  text-align: center;
}

.text-muted {
  color: #7f8c8d;
}

.mt-20 {
  margin-top: 20px;
}

.mb-20 {
  margin-bottom: 20px;
}
</style>