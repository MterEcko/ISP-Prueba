<template>
  <div class="mikrotik-profiles">
    <div class="header">
      <h2>Perfiles PPPoE</h2>
      <div class="header-actions">
        <select v-model="selectedZone" @change="onZoneChange" class="zone-filter">
          <option value="">Todas las zonas</option>
          <option v-for="zone in zones" :key="zone.id" :value="zone.id">
            {{ zone.name }}
          </option>
        </select>
        
        <select v-model="selectedNode" @change="onNodeChange" class="node-filter">
          <option value="">Todos los nodos</option>
          <option v-for="node in filteredNodes" :key="node.id" :value="node.id">
            {{ node.name }}
          </option>
        </select>
        
        <select v-model="selectedRouter" @change="filterByRouter" class="router-filter">
          <option value="">Todos los routers</option>
          <option v-for="router in filteredRouters" :key="router.id" :value="router.id">
            {{ router.name }} ({{ router.ipAddress }})
          </option>
        </select>
        
        <button @click="openSyncModal" class="sync-button">
          <span class="icon">🔄</span>
          Sincronizar Perfiles
        </button>
        
        <button @click="refreshProfiles" class="refresh-button" :disabled="loading">
          <span class="icon">↻</span>
          Actualizar
        </button>
      </div>
    </div>

    <!-- Estadísticas -->
    <div class="statistics-bar" v-if="profileStatistics.total > 0">
      <div class="stat-item">
        <span class="stat-label">Total Perfiles:</span>
        <span class="stat-value">{{ profileStatistics.total }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Routers:</span>
        <span class="stat-value">{{ profileStatistics.routers }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Última actualización:</span>
        <span class="stat-value">{{ formatDate(lastUpdated) }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      Cargando perfiles PPPoE...
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      <span class="icon">⚠️</span>
      {{ error }}
      <button @click="refreshProfiles" class="retry-button">Reintentar</button>
    </div>

    <!-- Vista Jerárquica -->
    <div v-if="!loading && Object.keys(profilesByHierarchy).length > 0" class="hierarchy-view">
      <!-- Por cada zona -->
      <div 
        v-for="(zoneData, zoneId) in profilesByHierarchy" 
        :key="`zone-${zoneId}`"
        class="zone-section"
      >
        <div 
          class="zone-header" 
          @click="toggleZoneExpansion(parseInt(zoneId))"
          :class="{ expanded: isZoneExpanded(parseInt(zoneId)) }"
        >
          <span class="expand-icon">
            {{ isZoneExpanded(parseInt(zoneId)) ? '▼' : '▶' }}
          </span>
          <span class="zone-name">{{ zoneData.zone.name }}</span>
          <span class="zone-stats">
            {{ getZoneProfileCount(zoneData) }} perfiles en {{ Object.keys(zoneData.nodes).length }} nodos
          </span>
        </div>

        <!-- Nodos de la zona -->
        <div v-if="isZoneExpanded(parseInt(zoneId))" class="nodes-container">
          <div 
            v-for="(nodeData, nodeId) in zoneData.nodes" 
            :key="`node-${nodeId}`"
            class="node-section"
          >
            <div 
              class="node-header"
              @click="toggleNodeExpansion(parseInt(nodeId))"
              :class="{ expanded: isNodeExpanded(parseInt(nodeId)) }"
            >
              <span class="expand-icon">
                {{ isNodeExpanded(parseInt(nodeId)) ? '▼' : '▶' }}
              </span>
              <span class="node-name">{{ nodeData.node.name }}</span>
              <span class="node-stats">
                {{ getNodeProfileCount(nodeData) }} perfiles en {{ Object.keys(nodeData.routers).length }} routers
              </span>
            </div>

            <!-- Routers del nodo -->
            <div v-if="isNodeExpanded(parseInt(nodeId))" class="routers-container">
              <div 
                v-for="(routerData, routerId) in nodeData.routers" 
                :key="`router-${routerId}`"
                class="router-section"
              >
                <div class="router-header">
                  <span class="router-name">
                    <span class="icon">🔧</span>
                    {{ routerData.router.name }}
                  </span>
                  <span class="router-ip">{{ routerData.router.ipAddress }}</span>
                  <span class="profile-count">{{ routerData.profiles.length }} perfiles</span>
                  <button 
                    @click="syncRouterProfiles(routerData.router.id)" 
                    class="sync-router-btn"
                    :disabled="syncingRouters.has(routerData.router.id)"
                  >
                    <span class="icon">🔄</span>
                    {{ syncingRouters.has(routerData.router.id) ? 'Sincronizando...' : 'Sincronizar' }}
                  </button>
                </div>

                <!-- Perfiles del router -->
                <div class="profiles-grid">
                  <div 
                    v-for="profile in routerData.profiles" 
                    :key="`profile-${profile.id}`"
                    class="profile-card"
                  >
                    <div class="profile-header">
                      <h4 class="profile-name">{{ profile.name }}</h4>
                      <div class="profile-id">ID: {{ profile.id }}</div>
                    </div>

                    <div class="profile-details">
                      <div class="detail-row">
                        <span class="label">Rate Limit:</span>
                        <span class="value rate-limit">{{ profile.rateLimit || 'Sin límite' }}</span>
                      </div>
                      
                      <div v-if="profile.burstLimit" class="detail-row">
                        <span class="label">Burst Limit:</span>
                        <span class="value">{{ profile.burstLimit }}</span>
                      </div>
                      
                      <div v-if="profile.burstThreshold" class="detail-row">
                        <span class="label">Burst Threshold:</span>
                        <span class="value">{{ profile.burstThreshold }}</span>
                      </div>
                      
                      <div v-if="profile.burstTime" class="detail-row">
                        <span class="label">Burst Time:</span>
                        <span class="value">{{ profile.burstTime }}</span>
                      </div>
                      
                      <div v-if="profile.priority" class="detail-row">
                        <span class="label">Prioridad:</span>
                        <span class="value priority">{{ profile.priority }}</span>
                      </div>
                      
                      <div v-if="profile.queue" class="detail-row">
                        <span class="label">Queue Type:</span>
                        <span class="value">{{ profile.queue }}</span>
                      </div>
                      
                      <div v-if="profile.pool" class="detail-row">
                        <span class="label">Pool Local:</span>
                        <span class="value">{{ profile.pool }}</span>
                      </div>
                      
                      <div v-if="profile.remoteAddress" class="detail-row">
                        <span class="label">Remote Address:</span>
                        <span class="value">{{ profile.remoteAddress }}</span>
                      </div>

                      <div v-if="profile.remoteAddress" class="detail-row">
                        <span class="label">local-address:</span>
                        <span class="value">{{ profile.localAddress }}</span>
                      </div>
                      
                      <div v-if="profile.remoteAddress" class="detail-row">
                        <span class="label">Bridge:</span>
                        <span class="value">{{ profile.bridge }}</span>
                      </div>

                      <div v-if="profile.remoteAddress" class="detail-row">
                        <span class="label">DNS Server:</span>
                        <span class="value">{{ profile.dnsServer }}</span>
                      </div>
                    </div>

                    <div class="profile-actions">
                      <button @click="viewProfileDetails(profile)" class="details-btn" title="Ver detalles">
                        <span class="icon">👁️</span>
                      </button>
                      
                      <button @click="copyProfileConfig(profile)" class="copy-btn" title="Copiar configuración">
                        <span class="icon">📋</span>
                      </button>
                      
                      <button @click="exportProfile(profile)" class="export-btn" title="Exportar">
                        <span class="icon">📤</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && Object.keys(profilesByHierarchy).length === 0" class="empty-state">
      <div class="empty-icon">⚙️</div>
      <h3>No hay perfiles PPPoE disponibles</h3>
      <p>Sincroniza perfiles desde los routers Mikrotik para verlos aquí</p>
      <button @click="openSyncModal" class="sync-button">
        Sincronizar Perfiles
      </button>
    </div>

    <!-- Modal de Sincronización -->
    <div v-if="showSyncModal" class="modal-overlay" @click="closeSyncModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Sincronizar Perfiles PPPoE</h3>
          <button @click="closeSyncModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="sync-options">
            <label class="sync-option">
              <input type="radio" v-model="syncType" value="global">
              <span>Sincronización global (todos los routers)</span>
            </label>
            
            <label class="sync-option">
              <input type="radio" v-model="syncType" value="router">
              <span>Sincronizar router específico</span>
            </label>
          </div>
          
          <div v-if="syncType === 'router'" class="form-group">
            <label>Seleccionar Router:</label>
            <select v-model="syncRouterId" class="form-select">
              <option value="">Seleccionar router...</option>
              <option v-for="router in routersForSync" :key="router.id" :value="router.id">
                {{ router.name }} ({{ router.ipAddress }}) - {{ getZoneName(router.zoneId) }} / {{ getNodeName(router.nodeId) }}
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
            
            <div v-if="syncResult.details" class="result-details">
              <div 
                v-for="detail in syncResult.details" 
                :key="detail.routerId" 
                class="result-item"
              >
                <span class="router-name">{{ detail.routerName }}</span>
                <span class="profiles-count">{{ detail.profilesCount }} perfiles</span>
                <span v-if="detail.error" class="error">{{ detail.error }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeSyncModal" class="cancel-btn">Cancelar</button>
          <button 
            @click="performSync" 
            :disabled="(syncType === 'router' && !syncRouterId) || syncing"
            class="sync-btn"
          >
            {{ syncing ? 'Sincronizando...' : 'Sincronizar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Detalles -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
      <div class="modal large" @click.stop>
        <div class="modal-header">
          <h3>Detalles del Perfil: {{ selectedProfile?.name }}</h3>
          <button @click="closeDetailsModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div v-if="selectedProfile" class="profile-details-full">
            <div class="detail-section">
              <h4>Información General</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Nombre:</label>
                  <span>{{ selectedProfile.name }}</span>
                </div>
                <div class="detail-item">
                  <label>ID Mikrotik:</label>
                  <span>{{ selectedProfile.id }}</span>
                </div>
                <div class="detail-item">
                  <label>Router:</label>
                  <span>{{ getRouterName(selectedProfile.routerId) }}</span>
                </div>
              </div>
            </div>
            
            <div class="detail-section">
              <h4>Configuración de Velocidad</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Rate Limit:</label>
                  <span class="rate-display">{{ selectedProfile.rateLimit || 'Sin límite' }}</span>
                </div>
                <div class="detail-item">
                  <label>Burst Limit:</label>
                  <span>{{ selectedProfile.burstLimit || 'No configurado' }}</span>
                </div>
                <div class="detail-item">
                  <label>Burst Threshold:</label>
                  <span>{{ selectedProfile.burstThreshold || 'No configurado' }}</span>
                </div>
                <div class="detail-item">
                  <label>Burst Time:</label>
                  <span>{{ selectedProfile.burstTime || 'No configurado' }}</span>
                </div>
              </div>
            </div>
            
            <div class="detail-section" v-if="selectedProfile.additionalSettings">
              <h4>Configuración Adicional</h4>
              <div class="additional-settings">
                <pre>{{ JSON.stringify(selectedProfile.additionalSettings, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeDetailsModal" class="close-btn">Cerrar</button>
          <button @click="exportProfile(selectedProfile)" class="export-btn">
            <span class="icon">📤</span>
            Exportar Configuración
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MikrotikService from '../services/mikrotik.service';
import NetworkService from '../services/network.service';
import MikrotikRouterService from '../services/mikrotikRouter.service';

export default {
 name: 'MikrotikProfiles',
 data() {
   return {
   
     viewMode: 'grid', // 'grid' o 'table'
     // Datos jerárquicos
     zones: [],
     nodes: [],
     routers: [],
     profiles: [],
     
     // Estados de carga
     loading: false,
     error: null,
     lastUpdated: null,
     
     // Filtros jerárquicos
     selectedZone: '',
     selectedNode: '',
     selectedRouter: '',
     
     // Modales
     showSyncModal: false,
     showDetailsModal: false,
     
     // Sincronización
     syncType: 'router',
     syncRouterId: '',
     syncing: false,
     syncResult: null,
     syncingRouters: new Set(),
     
     // Detalles
     selectedProfile: null,
     
     // Expansión de tarjetas
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
   
   // Perfiles organizados jerárquicamente
   profilesByHierarchy() {
     const hierarchy = {};
     
     console.log('=== DEBUG HIERARCHY ===');
     console.log('Zones:', this.zones);
     console.log('Nodes:', this.nodes); 
     console.log('Routers:', this.routers);
     console.log('Profiles count:', this.profiles.length);
     
     // Inicializar estructura jerárquica
     this.zones.forEach(zone => {
       hierarchy[zone.id] = {
         zone: zone,
         nodes: {}
       };
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
       // Obtener zoneId desde el nodo del router
       const node = this.nodes.find(n => n.id === router.nodeId);
       const zoneId = node ? node.zoneId : null;
       
       console.log(`Router ${router.name}: nodeId=${router.nodeId}, zoneId=${zoneId}`);
       
       if (zoneId && hierarchy[zoneId] && hierarchy[zoneId].nodes[router.nodeId]) {
         hierarchy[zoneId].nodes[router.nodeId].routers[router.id] = {
           router: router,
           profiles: []
         };
       }
     });
     
     // Asignar perfiles filtrados
     this.filteredProfiles.forEach(profile => {
       const router = this.routers.find(r => r.id === profile.routerId);
       if (router) {
         const node = this.nodes.find(n => n.id === router.nodeId);
         const zoneId = node ? node.zoneId : null;
         
         if (zoneId && hierarchy[zoneId] && 
             hierarchy[zoneId].nodes[router.nodeId] &&
             hierarchy[zoneId].nodes[router.nodeId].routers[router.id]) {
           hierarchy[zoneId].nodes[router.nodeId].routers[router.id].profiles.push(profile);
         }
       }
     });
     
     console.log('Hierarchy final:', hierarchy);
     
     // Filtrar zonas vacías
     Object.keys(hierarchy).forEach(zoneId => {
       const zone = hierarchy[zoneId];
       let hasProfiles = false;
       
       Object.keys(zone.nodes).forEach(nodeId => {
         const node = zone.nodes[nodeId];
         const nodeHasProfiles = Object.values(node.routers).some(router => router.profiles.length > 0);
         
         if (!nodeHasProfiles) {
           delete zone.nodes[nodeId];
         } else {
           hasProfiles = true;
         }
       });
       
       if (!hasProfiles) {
         delete hierarchy[zoneId];
       }
     });
     
     return hierarchy;
   },
   
   // Perfiles filtrados
   filteredProfiles() {
     let filtered = this.profiles;
     
     if (this.selectedZone) {
       const zoneRouters = this.routers.filter(r => {
         const node = this.nodes.find(n => n.id === r.nodeId);
         return node && node.zoneId == this.selectedZone;
       });
       const routerIds = zoneRouters.map(r => r.id);
       filtered = filtered.filter(profile => routerIds.includes(profile.routerId));
     }
     
     if (this.selectedNode) {
       const nodeRouters = this.routers.filter(r => r.nodeId == this.selectedNode);
       const routerIds = nodeRouters.map(r => r.id);
       filtered = filtered.filter(profile => routerIds.includes(profile.routerId));
     }
     
     if (this.selectedRouter) {
       filtered = filtered.filter(profile => profile.routerId == this.selectedRouter);
     }
     
     return filtered;
   },
   
   // Estadísticas de perfiles
   profileStatistics() {
     const stats = {
       total: this.filteredProfiles.length,
       routers: new Set(this.filteredProfiles.map(p => p.routerId)).size
     };
     
     return stats;
   },
   
   // Routers para sincronización
   routersForSync() {
     if (this.selectedZone) {
       return this.routers.filter(r => {
         const node = this.nodes.find(n => n.id === r.nodeId);
         return node && node.zoneId == this.selectedZone;
       });
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
     // Agregar método para toggle de vista
    toggleView() {
      this.viewMode = this.viewMode === 'grid' ? 'table' : 'grid';
    },
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
       
       console.log('Datos cargados:');
       console.log('Zones:', this.zones);
       console.log('Nodes:', this.nodes);
       console.log('Routers:', this.routers);
       
       // Cargar perfiles de todos los routers
       await this.loadAllProfiles();
       
       // Expansión automática para mostrar los perfiles
       this.zones.forEach(zone => {
         this.expandedZones.add(zone.id);
       });
       
       this.nodes.forEach(node => {
         this.expandedNodes.add(node.id);
       });
       
     } catch (error) {
       console.error('Error cargando datos iniciales:', error);
       this.error = 'Error cargando la estructura de red. Por favor, intente nuevamente.';
     } finally {
       this.loading = false;
     }
   },
   
   async loadAllProfiles() {
     this.profiles = [];
     console.log('Iniciando carga de perfiles para', this.routers.length, 'routers');
     
     const profilePromises = this.routers.map(async (router) => {
       try {
         console.log(`Cargando perfiles para router:`, router);
         
         // Verificar que el router tenga deviceId
         if (!router.deviceId) {
           console.warn(`Router ${router.name} no tiene deviceId configurado`);
           return [];
         }
         
         // USAR deviceId como lo espera el backend
         const response = await MikrotikService.getPPPoEProfiles(router.deviceId);
         console.log(`Respuesta para router ${router.name}:`, response.data);
         
         // El backend devuelve {success: true, count: 10, data: Array(10)}
         const routerProfiles = response.data.data || [];
         
         console.log(`Perfiles encontrados para ${router.name}:`, routerProfiles.length);
         
         // Verificar que routerProfiles sea un array
         if (!Array.isArray(routerProfiles)) {
           console.warn(`Los perfiles del router ${router.name} no son un array:`, routerProfiles);
           return [];
         }
         
         // Agregar información del router a cada perfil
         return routerProfiles.map(profile => ({
           ...profile,
           routerId: router.id,
           routerName: router.name,
           routerIp: router.ipAddress,
           zoneId: router.zoneId,
           nodeId: router.nodeId
         }));
       } catch (error) {
         console.error(`Error cargando perfiles del router ${router.name}:`, error);
         return [];
       }
     });
     
     const allProfiles = await Promise.all(profilePromises);
     this.profiles = allProfiles.flat();
     this.lastUpdated = new Date();
     
     console.log('Perfiles cargados total:', this.profiles.length);
     console.log('Perfiles:', this.profiles);
   },
   
   async refreshProfiles() {
     await this.loadAllProfiles();
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
   
   filterByRouter() {
     // Los filtros se aplican automáticamente por computed
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
         response = await MikrotikService.syncAllProfiles();
         
       } else if (this.syncRouterId) {
         // Sincronización específica de un router
         const router = this.routers.find(r => r.id == this.syncRouterId);
         if (!router) throw new Error('Router no encontrado');
         if (!router.deviceId) throw new Error('Router no tiene deviceId configurado');
         
         response = await MikrotikService.getPPPoEProfiles(router.deviceId);
       } else {
         throw new Error('Debe seleccionar un router o sincronización global');
       }
       
       this.syncResult = {
         summary: {
           created: response.data.created || 0,
           updated: response.data.updated || 0,
           errors: response.data.errors || 0
         },
         details: response.data.details || []
       };
       
       // Recargar perfiles después de sincronizar
       await this.loadAllProfiles();
       
     } catch (error) {
       console.error('Error sincronizando:', error);
       this.error = 'Error en la sincronización. Verifique la conexión con los routers.';
     } finally {
       this.syncing = false;
     }
   },
   
   async syncRouterProfiles(routerId) {
     this.syncingRouters.add(routerId);
     
     try {
       const router = this.routers.find(r => r.id === routerId);
       if (!router) throw new Error('Router no encontrado');
       if (!router.deviceId) throw new Error('Router no tiene deviceId configurado');
       
       await MikrotikService.getPPPoEProfiles(router.deviceId);
       await this.loadAllProfiles();
       
     } catch (error) {
       console.error('Error sincronizando router:', error);
       this.error = `Error sincronizando perfiles del router ${this.getRouterName(routerId)}.`;
     } finally {
       this.syncingRouters.delete(routerId);
     }
   },
   
   // ===== ACCIONES DE PERFIL =====
   viewProfileDetails(profile) {
     this.selectedProfile = profile;
     this.showDetailsModal = true;
   },
   
   closeDetailsModal() {
     this.showDetailsModal = false;
     this.selectedProfile = null;
   },
   
   async copyProfileConfig(profile) {
     try {
       const config = this.generateProfileConfig(profile);
       await navigator.clipboard.writeText(config);
       
       // Mostrar notificación de éxito
       this.$emit('profile-copied', profile);
       
     } catch (error) {
       console.error('Error copiando configuración:', error);
       this.error = 'Error copiando la configuración del perfil.';
     }
   },
   
   exportProfile(profile) {
     const config = this.generateProfileConfig(profile);
     const blob = new Blob([config], { type: 'text/plain' });
     const url = URL.createObjectURL(blob);
     
     const a = document.createElement('a');
     a.href = url;
     a.download = `profile-${profile.name}.txt`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
   },
   
   generateProfileConfig(profile) {
     let config = `/ppp profile\n`;
     config += `add name="${profile.name}"`;
     
     if (profile.rateLimit) config += ` rate-limit="${profile.rateLimit}"`;
     if (profile.burstLimit) config += ` burst-limit="${profile.burstLimit}"`;
     if (profile.burstThreshold) config += ` burst-threshold="${profile.burstThreshold}"`;
     if (profile.burstTime) config += ` burst-time="${profile.burstTime}"`;
     if (profile.priority) config += ` priority=${profile.priority}`;
     if (profile.queue) config += ` queue="${profile.queue}"`;
     if (profile.pool) config += ` local-address="${profile.pool}"`;
     if (profile.remoteAddress) config += ` remote-address="${profile.remoteAddress}"`;
     
     return config;
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
   
   // ===== CONTADORES =====
   getZoneProfileCount(zoneData) {
     let count = 0;
     Object.values(zoneData.nodes).forEach(nodeData => {
       Object.values(nodeData.routers).forEach(routerData => {
         count += routerData.profiles.length;
       });
     });
     return count;
   },
   
   getNodeProfileCount(nodeData) {
     let count = 0;
     Object.values(nodeData.routers).forEach(routerData => {
       count += routerData.profiles.length;
     });
     return count;
   },
   
   // ===== UTILIDADES =====
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
   
   formatDate(date) {
     if (!date) return 'Nunca';
     
     return new Date(date).toLocaleString('es-MX', {
       day: '2-digit',
       month: '2-digit',
       year: 'numeric',
       hour: '2-digit',
       minute: '2-digit'
     });
   }
 }
};
</script>


<style scoped>
.mikrotik-profiles {
 padding: 20px;
 background-color: #f5f5f5;
 min-height: 100vh;
}

.header {
 display: flex;
 justify-content: space-between;
 align-items: center;
 margin-bottom: 20px;
 background: white;
 padding: 20px;
 border-radius: 8px;
 box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header h2 {
 margin: 0;
 color: #2c3e50;
}

.header-actions {
 display: flex;
 gap: 10px;
 align-items: center;
}

.zone-filter, .node-filter, .router-filter {
 padding: 8px 12px;
 border: 1px solid #ddd;
 border-radius: 4px;
 background: white;
 min-width: 150px;
}

.sync-button, .refresh-button {
 display: flex;
 align-items: center;
 gap: 8px;
 padding: 8px 16px;
 background-color: #3498db;
 color: white;
 border: none;
 border-radius: 4px;
 cursor: pointer;
 transition: background-color 0.2s;
}

.sync-button:hover, .refresh-button:hover {
 background-color: #2980b9;
}

.refresh-button:disabled {
 background-color: #bdc3c7;
 cursor: not-allowed;
}

.statistics-bar {
 display: flex;
 gap: 20px;
 background: white;
 padding: 15px 20px;
 border-radius: 8px;
 margin-bottom: 20px;
 box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-item {
 display: flex;
 flex-direction: column;
 align-items: center;
}

.stat-label {
 font-size: 0.9em;
 color: #7f8c8d;
 margin-bottom: 4px;
}

.stat-value {
 font-size: 1.2em;
 font-weight: bold;
 color: #2c3e50;
}

.loading {
 display: flex;
 flex-direction: column;
 align-items: center;
 padding: 40px;
 background: white;
 border-radius: 8px;
 margin: 20px 0;
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

.error-message {
 display: flex;
 align-items: center;
 gap: 10px;
 padding: 15px;
 background-color: #ffebee;
 color: #c62828;
 border-radius: 4px;
 margin-bottom: 20px;
}

.retry-button {
 padding: 4px 8px;
 background-color: #f44336;
 color: white;
 border: none;
 border-radius: 4px;
 cursor: pointer;
 margin-left: auto;
}

.hierarchy-view {
 display: flex;
 flex-direction: column;
 gap: 20px;
}

.zone-section {
 background: white;
 border-radius: 8px;
 box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
 overflow: hidden;
}

.zone-header {
 display: flex;
 align-items: center;
 gap: 10px;
 padding: 15px 20px;
 background-color: #34495e;
 color: white;
 cursor: pointer;
 transition: background-color 0.2s;
}

.zone-header:hover {
 background-color: #2c3e50;
}

.zone-header.expanded {
 background-color: #2c3e50;
}

.expand-icon {
 font-size: 0.9em;
 transition: transform 0.2s;
}

.zone-name {
 font-size: 1.1em;
 font-weight: bold;
}

.zone-stats {
 margin-left: auto;
 font-size: 0.9em;
 opacity: 0.8;
}

.nodes-container {
 padding: 0;
}

.node-section {
 border-top: 1px solid #ecf0f1;
}

.node-header {
 display: flex;
 align-items: center;
 gap: 10px;
 padding: 12px 20px;
 background-color: #ecf0f1;
 cursor: pointer;
 transition: background-color 0.2s;
}

.node-header:hover {
 background-color: #d5dbdb;
}

.node-header.expanded {
 background-color: #d5dbdb;
}

.node-name {
 font-weight: 500;
 color: #2c3e50;
}

.node-stats {
 margin-left: auto;
 font-size: 0.9em;
 color: #7f8c8d;
}

.routers-container {
 padding: 0;
}

.router-section {
 border-top: 1px solid #bdc3c7;
}

.router-header {
 display: flex;
 align-items: center;
 gap: 15px;
 padding: 15px 20px;
 background-color: #f8f9fa;
 border-bottom: 1px solid #e9ecef;
}

.router-name {
 display: flex;
 align-items: center;
 gap: 8px;
 font-weight: 500;
 color: #2c3e50;
}

.router-ip {
 color: #7f8c8d;
 font-family: 'Courier New', monospace;
}

.profile-count {
 margin-left: auto;
 color: #7f8c8d;
 font-size: 0.9em;
}

.sync-router-btn {
 display: flex;
 align-items: center;
 gap: 6px;
 padding: 6px 12px;
 background-color: #27ae60;
 color: white;
 border: none;
 border-radius: 4px;
 cursor: pointer;
 font-size: 0.9em;
 transition: background-color 0.2s;
}

.sync-router-btn:hover:not(:disabled) {
 background-color: #229954;
}

.sync-router-btn:disabled {
 background-color: #bdc3c7;
 cursor: not-allowed;
}

.profiles-grid {
 display: grid;
 grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
 gap: 20px;
 padding: 20px;
 background-color: #f8f9fa;
}

.profile-card {
 background: white;
 border-radius: 8px;
 box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
 overflow: hidden;
 transition: transform 0.2s, box-shadow 0.2s;
}

.profile-card:hover {
 transform: translateY(-2px);
 box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.profile-header {
 padding: 15px;
 background-color: #3498db;
 color: white;
}

.profile-name {
 margin: 0 0 5px 0;
 font-size: 1.1em;
}

.profile-id {
 font-size: 0.9em;
 opacity: 0.8;
 font-family: 'Courier New', monospace;
}

.profile-details {
 padding: 15px;
}

.detail-row {
 display: flex;
 justify-content: space-between;
 align-items: center;
 margin-bottom: 8px;
 padding: 4px 0;
}

.detail-row:last-child {
 margin-bottom: 0;
}

.label {
 font-weight: 500;
 color: #7f8c8d;
 font-size: 0.9em;
}

.value {
 color: #2c3e50;
 font-weight: 500;
}

.rate-limit {
 font-family: 'Courier New', monospace;
 background-color: #e8f5e9;
 padding: 2px 6px;
 border-radius: 4px;
 color: #2e7d32;
}

.priority {
 background-color: #fff3e0;
 padding: 2px 6px;
 border-radius: 4px;
 color: #ef6c00;
}

.profile-actions {
 display: flex;
 justify-content: center;
 gap: 10px;
 padding: 15px;
 background-color: #f8f9fa;
 border-top: 1px solid #e9ecef;
}

.details-btn, .copy-btn, .export-btn {
 display: flex;
 align-items: center;
 justify-content: center;
 width: 36px;
 height: 36px;
 border: none;
 border-radius: 6px;
 cursor: pointer;
 transition: all 0.2s;
 font-size: 1.1em;
}

.details-btn {
 background-color: #e3f2fd;
 color: #1976d2;
}

.details-btn:hover {
 background-color: #bbdefb;
}

.copy-btn {
 background-color: #f3e5f5;
 color: #7b1fa2;
}

.copy-btn:hover {
 background-color: #e1bee7;
}

.export-btn {
 background-color: #e8f5e9;
 color: #388e3c;
}

.export-btn:hover {
 background-color: #c8e6c9;
}

.empty-state {
 display: flex;
 flex-direction: column;
 align-items: center;
 padding: 60px 20px;
 background: white;
 border-radius: 8px;
 text-align: center;
}

.empty-icon {
 font-size: 4em;
 margin-bottom: 20px;
 opacity: 0.5;
}

.empty-state h3 {
 margin: 0 0 10px 0;
 color: #2c3e50;
}

.empty-state p {
 margin: 0 0 20px 0;
 color: #7f8c8d;
 max-width: 400px;
}

.modal-overlay {
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

.modal {
 background: white;
 border-radius: 8px;
 box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
 width: 90%;
 max-width: 600px;
 max-height: 90vh;
 overflow-y: auto;
}

.modal.large {
 max-width: 800px;
}

.modal-header {
 display: flex;
 justify-content: space-between;
 align-items: center;
 padding: 20px;
 border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
 margin: 0;
 color: #2c3e50;
}

.close-btn {
 background: none;
 border: none;
 font-size: 1.5em;
 cursor: pointer;
 color: #7f8c8d;
 padding: 0;
 width: 30px;
 height: 30px;
 display: flex;
 align-items: center;
 justify-content: center;
}

.close-btn:hover {
 color: #2c3e50;
}

.modal-body {
 padding: 20px;
}

.sync-options {
 margin-bottom: 20px;
}

.sync-option {
 display: flex;
 align-items: center;
 gap: 10px;
 margin-bottom: 10px;
 cursor: pointer;
}

.sync-option input[type="radio"] {
 margin: 0;
}

.form-group {
 margin-bottom: 20px;
}

.form-group label {
 display: block;
 margin-bottom: 8px;
 font-weight: 500;
 color: #2c3e50;
}

.form-select {
 width: 100%;
 padding: 10px;
 border: 1px solid #ddd;
 border-radius: 4px;
 background: white;
}

.sync-result {
 margin-top: 20px;
 padding: 15px;
 background-color: #f8f9fa;
 border-radius: 4px;
}

.result-summary {
 display: flex;
 gap: 20px;
 margin-bottom: 15px;
}

.result-summary span {
 font-size: 0.9em;
 font-weight: 500;
}

.created {
 color: #27ae60;
}

.updated {
 color: #f39c12;
}

.errors {
 color: #e74c3c;
}

.result-details {
 max-height: 200px;
 overflow-y: auto;
}

.result-item {
 display: flex;
 justify-content: space-between;
 align-items: center;
 padding: 8px;
 margin-bottom: 5px;
 background: white;
 border-radius: 4px;
 font-size: 0.9em;
}

.modal-footer {
 display: flex;
 justify-content: flex-end;
 gap: 10px;
 padding: 20px;
 border-top: 1px solid #e9ecef;
 background-color: #f8f9fa;
}

.cancel-btn, .sync-btn, .save-btn {
 padding: 10px 20px;
 border: none;
 border-radius: 4px;
 cursor: pointer;
 font-weight: 500;
 transition: background-color 0.2s;
}

.cancel-btn {
 background-color: #e9ecef;
 color: #6c757d;
}

.cancel-btn:hover {
 background-color: #dee2e6;
}

.sync-btn, .save-btn {
 background-color: #3498db;
 color: white;
}

.sync-btn:hover, .save-btn:hover {
 background-color: #2980b9;
}

.sync-btn:disabled, .save-btn:disabled {
 background-color: #bdc3c7;
 cursor: not-allowed;
}

.profile-details-full {
 display: flex;
 flex-direction: column;
 gap: 25px;
}

.detail-section {
 border: 1px solid #e9ecef;
 border-radius: 6px;
 overflow: hidden;
}

.detail-section h4 {
 margin: 0;
 padding: 12px 15px;
 background-color: #f8f9fa;
 color: #2c3e50;
 border-bottom: 1px solid #e9ecef;
 font-size: 1em;
}

.detail-grid {
 display: grid;
 grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
 gap: 15px;
 padding: 15px;
}

.detail-item {
 display: flex;
 flex-direction: column;
 gap: 4px;
}

.detail-item label {
 font-size: 0.9em;
 color: #7f8c8d;
 font-weight: 500;
 margin: 0;
}

.detail-item span {
 color: #2c3e50;
 font-weight: 500;
}

.rate-display {
 font-family: 'Courier New', monospace;
 background-color: #e8f5e9;
 padding: 4px 8px;
 border-radius: 4px;
 color: #2e7d32;
 display: inline-block;
}

.additional-settings {
 padding: 15px;
}

.additional-settings pre {
 background-color: #f8f9fa;
 padding: 15px;
 border-radius: 4px;
 font-size: 0.9em;
 color: #2c3e50;
 overflow-x: auto;
 margin: 0;
 border: 1px solid #e9ecef;
}

.export-btn {
 display: flex;
 align-items: center;
 gap: 8px;
}

/* Responsive */
@media (max-width: 768px) {
 .mikrotik-profiles {
   padding: 10px;
 }
 
 .header {
   flex-direction: column;
   gap: 15px;
   align-items: stretch;
 }
 
 .header-actions {
   flex-direction: column;
   gap: 10px;
 }
 
 .zone-filter, .node-filter, .router-filter {
   min-width: unset;
   width: 100%;
 }
 
 .statistics-bar {
   flex-direction: column;
   gap: 10px;
 }
 
 .stat-item {
   flex-direction: row;
   justify-content: space-between;
 }
 
 .profiles-grid {
   grid-template-columns: 1fr;
   padding: 15px;
   gap: 15px;
 }
 
 .zone-header, .node-header, .router-header {
   flex-wrap: wrap;
   gap: 8px;
 }
 
 .zone-stats, .node-stats {
   margin-left: 0;
   width: 100%;
   text-align: center;
 }
 
 .router-header {
   flex-direction: column;
   align-items: stretch;
 }
 
 .profile-count {
   margin-left: 0;
   text-align: center;
 }
 
 .modal {
   width: 95%;
   margin: 20px;
 }
 
 .detail-grid {
   grid-template-columns: 1fr;
 }
 
 .result-summary {
   flex-direction: column;
   gap: 8px;
 }
}

@media (max-width: 480px) {
 .mikrotik-profiles {
   padding: 5px;
 }
 
 .header {
   padding: 15px;
 }
 
 .profiles-grid {
   padding: 10px;
   gap: 10px;
 }
 
 .profile-card {
   box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
 }
 
 .profile-actions {
   gap: 8px;
 }
 
 .details-btn, .copy-btn, .export-btn {
   width: 32px;
   height: 32px;
   font-size: 1em;
 }
}

/* Animaciones */
@keyframes fadeIn {
 from {
   opacity: 0;
   transform: translateY(10px);
 }
 to {
   opacity: 1;
   transform: translateY(0);
 }
}

.profile-card {
 animation: fadeIn 0.3s ease-out;
}

.nodes-container, .routers-container {
 animation: fadeIn 0.2s ease-out;
}

/* Estados de carga específicos */
.sync-router-btn.loading {
 position: relative;
 color: transparent;
}

.sync-router-btn.loading::after {
 content: "";
 position: absolute;
 width: 16px;
 height: 16px;
 top: 50%;
 left: 50%;
 margin-left: -8px;
 margin-top: -8px;
 border: 2px solid #ffffff;
 border-radius: 50%;
 border-top-color: transparent;
 animation: spin 1s linear infinite;
}

/* Estilos para tooltips */
[title] {
 position: relative;
}

/* Mejoras visuales para rate limits */
.rate-limit {
 position: relative;
 cursor: help;
}

.rate-limit:hover::after {
 content: "Upload/Download speed limit";
 position: absolute;
 bottom: 100%;
 left: 50%;
 transform: translateX(-50%);
 background-color: #2c3e50;
 color: white;
 padding: 4px 8px;
 border-radius: 4px;
 font-size: 0.8em;
 white-space: nowrap;
 z-index: 1000;
}

/* Estilos para estados específicos */
.profile-card.inactive {
 opacity: 0.6;
 filter: grayscale(0.3);
}

.router-section.offline .router-header {
 background-color: #ffebee;
}

.router-section.offline .router-name {
 color: #c62828;
}

/* Mejoras de accesibilidad */
.sync-button:focus,
.refresh-button:focus,
.details-btn:focus,
.copy-btn:focus,
.export-btn:focus {
 outline: 2px solid #3498db;
 outline-offset: 2px;
}

.zone-header:focus,
.node-header:focus {
 outline: 2px solid #3498db;
 outline-offset: -2px;
}

/* Estilos para scroll personalizado */
.modal::-webkit-scrollbar,
.result-details::-webkit-scrollbar,
.additional-settings pre::-webkit-scrollbar {
 width: 6px;
}

.modal::-webkit-scrollbar-track,
.result-details::-webkit-scrollbar-track,
.additional-settings pre::-webkit-scrollbar-track {
 background: #f1f1f1;
 border-radius: 3px;
}

.modal::-webkit-scrollbar-thumb,
.result-details::-webkit-scrollbar-thumb,
.additional-settings pre::-webkit-scrollbar-thumb {
 background: #c1c1c1;
 border-radius: 3px;
}

.modal::-webkit-scrollbar-thumb:hover,
.result-details::-webkit-scrollbar-thumb:hover,
.additional-settings pre::-webkit-scrollbar-thumb:hover {
 background: #a8a8a8;
}
</style>