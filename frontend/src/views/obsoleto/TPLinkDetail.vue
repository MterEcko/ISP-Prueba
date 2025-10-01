<template>
  <div class="tplink-detail">
    <div class="card mb-4">
      <h3>TP-Link {{ deviceType === 'pharos' ? 'Pharos' : 'Omada' }} - Funciones Específicas</h3>
      
      <div class="tabs">
        <div 
          class="tab" 
          :class="{ active: activeTab === 'clients' }"
          @click="activeTab = 'clients'"
        >
          Clientes Conectados
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'wireless' }"
          @click="activeTab = 'wireless'"
        >
          Configuración Inalámbrica
        </div>
        <div 
          v-if="deviceType === 'pharos'" 
          class="tab" 
          :class="{ active: activeTab === 'acl' }"
          @click="activeTab = 'acl'"
        >
          Control de Acceso
        </div>
        <div 
          v-if="deviceType === 'omada'" 
          class="tab" 
          :class="{ active: activeTab === 'sites' }"
          @click="activeTab = 'sites'"
        >
          Sitios
        </div>
        <div 
          v-if="deviceType === 'omada'" 
          class="tab" 
          :class="{ active: activeTab === 'ssids' }"
          @click="activeTab = 'ssids'"
        >
          SSIDs
        </div>
      </div>
      
      <div class="tab-content">
        <!-- Clientes Conectados -->
        <div v-if="activeTab === 'clients'" class="tab-pane">
          <div class="tab-header">
            <h4>Clientes Conectados</h4>
            <button class="btn" @click="loadConnectedClients" :disabled="loadingClients">
              {{ loadingClients ? 'Cargando...' : 'Actualizar' }}
            </button>
          </div>
          
          <div v-if="loadingClients" class="loading-spinner">
            Cargando clientes conectados...
          </div>
          
          <table v-else-if="connectedClients.length" class="data-table">
            <thead>
              <tr>
                <th>ID/MAC</th>
                <th>Nombre</th>
                <th>IP</th>
                <th>Señal</th>
                <th>Velocidad</th>
                <th>Tiempo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in connectedClients" :key="client.id || client.mac">
                <td>{{ client.mac }}</td>
                <td>{{ client.name || 'Desconocido' }}</td>
                <td>{{ client.ip || '-' }}</td>
                <td>{{ client.signalStrength }} dBm</td>
                <td>{{ client.dataRate }} Mbps</td>
                <td>{{ client.uptime || '-' }}</td>
                <td class="actions">
                  <button class="btn-icon" @click="showQoSModal(client)" title="Configurar QoS">
                    ⚙️
                  </button>
                  <button class="btn-icon" @click="showClientDetails(client)" title="Detalles">
                    👁️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-else class="empty-state">
            <p>No hay clientes conectados actualmente.</p>
          </div>
        </div>
        
        <!-- Configuración Inalámbrica -->
        <div v-if="activeTab === 'wireless'" class="tab-pane">
          <div class="tab-header">
            <h4>Configuración Inalámbrica</h4>
            <button class="btn" @click="loadWirelessConfig" :disabled="loadingWireless">
              {{ loadingWireless ? 'Cargando...' : 'Actualizar' }}
            </button>
          </div>
          
          <div v-if="loadingWireless" class="loading-spinner">
            Cargando configuración inalámbrica...
          </div>
          
          <div v-else-if="wirelessConfig" class="wireless-config">
            <div class="config-grid">
              <div class="config-item">
                <div class="info-label">Modo</div>
                <div class="info-value">{{ wirelessConfig.wirelessMode || 'No disponible' }}</div>
              </div>
              
              <div class="config-item">
                <div class="info-label">Canal</div>
                <div class="info-value">{{ wirelessConfig.channel || 'No disponible' }}</div>
              </div>
              
              <div class="config-item">
                <div class="info-label">Ancho de Canal</div>
                <div class="info-value">{{ wirelessConfig.channelWidth || 'No disponible' }} MHz</div>
              </div>
              
              <div class="config-item">
                <div class="info-label">Frecuencia</div>
                <div class="info-value">{{ wirelessConfig.frequency || 'No disponible' }} GHz</div>
              </div>
              
              <div class="config-item">
                <div class="info-label">SSID</div>
                <div class="info-value">{{ wirelessConfig.ssid || 'No disponible' }}</div>
              </div>
              
              <div class="config-item">
                <div class="info-label">Seguridad</div>
                <div class="info-value">{{ wirelessConfig.security || 'No disponible' }}</div>
              </div>
              
              <div class="config-item">
                <div class="info-label">Potencia de Transmisión</div>
                <div class="info-value">{{ wirelessConfig.txPower || 'No disponible' }} dBm</div>
              </div>
              
              <div class="config-item">
                <div class="info-label">Distancia</div>
                <div class="info-value">{{ wirelessConfig.distance || 'No disponible' }} km</div>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <p>No se pudo obtener la configuración inalámbrica.</p>
          </div>
        </div>
        
        <!-- Control de Acceso (ACL) - Solo para Pharos -->
        <div v-if="activeTab === 'acl' && deviceType === 'pharos'" class="tab-pane">
          <div class="tab-header">
            <h4>Control de Acceso (ACL)</h4>
            <div>
              <button class="btn" @click="showAddACLModal" title="Agregar regla ACL">
                + Agregar Regla
              </button>
              <button class="btn ml-2" @click="loadACLRules" :disabled="loadingACL">
                {{ loadingACL ? 'Cargando...' : 'Actualizar' }}
              </button>
            </div>
          </div>
          
          <div v-if="loadingACL" class="loading-spinner">
            Cargando reglas ACL...
          </div>
          
          <table v-else-if="aclRules.length" class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>MAC</th>
                <th>Descripción</th>
                <th>Acción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rule in aclRules" :key="rule.id">
                <td>{{ rule.id }}</td>
                <td>{{ rule.mac }}</td>
                <td>{{ rule.description || '-' }}</td>
                <td>
                  <span 
                    :class="{ 
                      'status-success': rule.action === 'allow',
                      'status-danger': rule.action === 'deny'
                    }"
                  >
                    {{ rule.action === 'allow' ? 'Permitir' : 'Denegar' }}
                  </span>
                </td>
                <td class="actions">
                  <button class="btn-icon" @click="deleteACLRule(rule)" title="Eliminar">
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-else class="empty-state">
            <p>No hay reglas ACL configuradas.</p>
          </div>
        </div>
        
        <!-- Sitios - Solo para Omada -->
        <div v-if="activeTab === 'sites' && deviceType === 'omada'" class="tab-pane">
          <div class="tab-header">
            <h4>Sitios</h4>
            <button class="btn" @click="loadSites" :disabled="loadingSites">
              {{ loadingSites ? 'Cargando...' : 'Actualizar' }}
            </button>
          </div>
          
          <div v-if="loadingSites" class="loading-spinner">
            Cargando sitios...
          </div>
          
          <table v-else-if="sites.length" class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Dispositivos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="site in sites" :key="site.id">
                <td>{{ site.id }}</td>
                <td>{{ site.name }}</td>
                <td>{{ site.deviceCount || 0 }}</td>
                <td>
                  <span 
                    :class="{ 
                      'status-success': site.active,
                      'status-inactive': !site.active
                    }"
                  >
                    {{ site.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="actions">
                  <button 
                    class="btn-icon" 
                    @click="changeSite(site.id)" 
                    title="Cambiar a este sitio"
                    :disabled="site.active"
                  >
                    ✓
                  </button>
                  <button class="btn-icon" @click="viewSiteDetails(site)" title="Ver detalles">
                    👁️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-else class="empty-state">
            <p>No hay sitios configurados.</p>
          </div>
        </div>
        
        <!-- SSIDs - Solo para Omada -->
        <div v-if="activeTab === 'ssids' && deviceType === 'omada'" class="tab-pane">
          <div class="tab-header">
            <h4>Redes WiFi (SSIDs)</h4>
            <button class="btn" @click="loadSSIDs" :disabled="loadingSSIDs">
              {{ loadingSSIDs ? 'Cargando...' : 'Actualizar' }}
            </button>
          </div>
          
          <div v-if="loadingSSIDs" class="loading-spinner">
            Cargando SSIDs...
          </div>
          
          <table v-else-if="ssids.length" class="data-table">
            <thead>
              <tr>
                <th>SSID</th>
                <th>Seguridad</th>
                <th>Banda</th>
                <th>Estado</th>
                <th>VLAN</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ssid in ssids" :key="ssid.id">
                <td>{{ ssid.name }}</td>
                <td>{{ ssid.security }}</td>
                <td>{{ ssid.band }}</td>
                <td>
                  <span 
                    :class="{ 
                      'status-success': ssid.enabled,
                      'status-inactive': !ssid.enabled
                    }"
                  >
                    {{ ssid.enabled ? 'Habilitado' : 'Deshabilitado' }}
                  </span>
                </td>
                <td>{{ ssid.vlanId || 'Ninguno' }}</td>
                <td class="actions">
                  <button class="btn-icon" @click="viewSSIDDetails(ssid)" title="Ver detalles">
                    👁️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-else class="empty-state">
            <p>No hay SSIDs configurados.</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para configurar QoS -->
    <div v-if="showQoSModalFlag" class="modal">
      <div class="modal-content">
        <h3>Configurar Límites de Ancho de Banda</h3>
        <p>Cliente: <strong>{{ selectedClient.name || selectedClient.mac }}</strong></p>
        
        <div class="form-group">
          <label for="downloadLimit">Límite de Descarga (Mbps)</label>
          <input 
            type="number" 
            id="downloadLimit" 
            v-model="qosConfig.downloadLimit" 
            min="0" 
            step="1"
          />
        </div>
        
        <div class="form-group">
          <label for="uploadLimit">Límite de Subida (Mbps)</label>
          <input 
            type="number" 
            id="uploadLimit" 
            v-model="qosConfig.uploadLimit" 
            min="0" 
            step="1"
          />
        </div>
        
        <p class="text-muted">* Usar 0 para sin límite</p>
        
        <div class="modal-actions">
          <button class="btn" @click="showQoSModalFlag = false">Cancelar</button>
          <button 
            class="btn btn-primary" 
            @click="applyQoS" 
            :disabled="applyingQoS"
          >
            {{ applyingQoS ? 'Aplicando...' : 'Aplicar' }}
          </button>
          <button 
            v-if="selectedClient.hasQoS"
            class="btn btn-danger" 
            @click="removeQoS" 
            :disabled="applyingQoS"
          >
            {{ applyingQoS ? 'Eliminando...' : 'Eliminar Límites' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modal para agregar regla ACL (solo para Pharos) -->
    <div v-if="showACLModalFlag" class="modal">
      <div class="modal-content">
        <h3>Agregar Regla de Control de Acceso</h3>
        
        <div class="form-group">
          <label for="aclMac">Dirección MAC *</label>
          <input 
            type="text" 
            id="aclMac" 
            v-model="newACLRule.mac" 
            placeholder="00:11:22:33:44:55"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="aclDesc">Descripción</label>
          <input 
            type="text" 
            id="aclDesc" 
            v-model="newACLRule.description" 
            placeholder="Ej: Dispositivo de cliente Juan"
          />
        </div>
        
        <div class="form-group">
          <label>Acción</label>
          <div class="radio-group">
            <label>
              <input type="radio" v-model="newACLRule.action" value="allow">
              Permitir
            </label>
            <label>
              <input type="radio" v-model="newACLRule.action" value="deny">
              Denegar
            </label>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn" @click="showACLModalFlag = false">Cancelar</button>
          <button 
            class="btn btn-primary" 
            @click="addACLRule" 
            :disabled="addingACLRule || !newACLRule.mac"
          >
            {{ addingACLRule ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modal de detalles de cliente -->
    <div v-if="showClientDetailsModalFlag" class="modal">
      <div class="modal-content">
        <h3>Detalles del Cliente</h3>
        
        <div v-if="selectedClient" class="client-details">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="info-label">MAC</div>
              <div class="info-value">{{ selectedClient.mac }}</div>
            </div>
            
            <div class="detail-item">
              <div class="info-label">Nombre</div>
              <div class="info-value">{{ selectedClient.name || 'Desconocido' }}</div>
            </div>
            
            <div class="detail-item">
              <div class="info-label">IP</div>
              <div class="info-value">{{ selectedClient.ip || 'N/A' }}</div>
            </div>
            
            <div class="detail-item">
              <div class="info-label">Intensidad de Señal</div>
              <div class="info-value">{{ selectedClient.signalStrength }} dBm</div>
            </div>
            
            <div class="detail-item">
              <div class="info-label">Velocidad de Datos</div>
              <div class="info-value">{{ selectedClient.dataRate }} Mbps</div>
            </div>
            
            <div class="detail-item">
              <div class="info-label">Tiempo de Conexión</div>
              <div class="info-value">{{ selectedClient.uptime || 'N/A' }}</div>
            </div>
            
            <div class="detail-item">
              <div class="info-label">SSID</div>
              <div class="info-value">{{ selectedClient.ssid || 'N/A' }}</div>
            </div>
            
            <div class="detail-item">
              <div class="info-label">Canal</div>
              <div class="info-value">{{ selectedClient.channel || 'N/A' }}</div>
            </div>
          </div>
          
          <!-- Si hay más detalles disponibles, mostrarlos -->
          <div v-if="Object.keys(selectedClient.rawData || {}).length > 0" class="advanced-details">
            <details>
              <summary>Información Avanzada</summary>
              <pre>{{ JSON.stringify(selectedClient.rawData, null, 2) }}</pre>
            </details>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn" @click="showClientDetailsModalFlag = false">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TPLinkService from '../services/tplink.service';

export default {
  name: 'TPLinkDetail',
  props: {
    deviceId: {
      type: [Number, String],
      required: true
    },
    deviceType: {
      type: String,
      default: 'pharos', // 'pharos' o 'omada'
      validator: value => ['pharos', 'omada'].includes(value)
    }
  },
  data() {
    return {
      activeTab: 'clients',
      
      // Clientes conectados
      connectedClients: [],
      loadingClients: false,
      
      // Configuración inalámbrica
      wirelessConfig: null,
      loadingWireless: false,
      
      // Para Pharos - ACL
      aclRules: [],
      loadingACL: false,
      showACLModalFlag: false,
      addingACLRule: false,
      newACLRule: {
        mac: '',
        description: '',
        action: 'allow'
      },
      
      // Para Omada - Sites
      sites: [],
      loadingSites: false,
      
      // Para Omada - SSIDs
      ssids: [],
      loadingSSIDs: false,
      
      // Modales
      showQoSModalFlag: false,
      applyingQoS: false,
      selectedClient: {},
      qosConfig: {
        downloadLimit: 0,
        uploadLimit: 0
      },
      
      showClientDetailsModalFlag: false
    };
  },
  created() {
    // Cargar datos iniciales según la pestaña activa
    this.loadTabData();
  },
  methods: {
    // Cargar datos según la pestaña activa
    loadTabData() {
      switch (this.activeTab) {
        case 'clients':
          this.loadConnectedClients();
          break;
        case 'wireless':
          this.loadWirelessConfig();
          break;
        case 'acl':
          if (this.deviceType === 'pharos') {
            this.loadACLRules();
          }
          break;
        case 'sites':
          if (this.deviceType === 'omada') {
            this.loadSites();
          }
          break;
        case 'ssids':
          if (this.deviceType === 'omada') {
            this.loadSSIDs();
          }
          break;
      }
    },
    
    // Cargar clientes conectados
    async loadConnectedClients() {
      this.loadingClients = true;
      
      try {
        const response = await TPLinkService.getConnectedClients(this.deviceId);
        this.connectedClients = response.data.clients;
      } catch (error) {
        console.error('Error al cargar clientes conectados:', error);
      } finally {
        this.loadingClients = false;
      }
    },
    
    // Cargar configuración inalámbrica
    async loadWirelessConfig() {
      this.loadingWireless = true;
      
      try {
        let response;
        
        if (this.deviceType === 'pharos') {
          // Usar comando específico para Pharos
          response = await TPLinkService.executeCommand(this.deviceId, 'get-wireless-config');
        } else {
          // Para Omada, podría ser diferente
          response = await TPLinkService.executeCommand(this.deviceId, 'get-wireless-config');
        }
        
        this.wirelessConfig = response.data.result;
      } catch (error) {
        console.error('Error al cargar configuración inalámbrica:', error);
      } finally {
        this.loadingWireless = false;
      }
    },
    
    // Cargar reglas ACL (solo para Pharos)
    async loadACLRules() {
      if (this.deviceType !== 'pharos') return;
      
      this.loadingACL = true;
      
      try {
        const response = await TPLinkService.getAccessControlList(this.deviceId);
        this.aclRules = response.data.rules;
      } catch (error) {
        console.error('Error al cargar reglas ACL:', error);
      } finally {
        this.loadingACL = false;
      }
    },
    
    // Agregar regla ACL (solo para Pharos)
    async addACLRule() {
      if (this.deviceType !== 'pharos' || !this.newACLRule.mac) return;
      
      this.addingACLRule = true;
      
      try {
        await TPLinkService.addAccessControlRule(this.deviceId, this.newACLRule);
        
        // Limpiar y cerrar modal
        this.newACLRule = {
          mac: '',
          description: '',
          action: 'allow'
        };
        this.showACLModalFlag = false;
        
        // Recargar reglas
        this.loadACLRules();
      } catch (error) {
        console.error('Error al agregar regla ACL:', error);
        alert('Error al agregar regla ACL: ' + error.message);
      } finally {
        this.addingACLRule = false;
      }
    },
    
    // Eliminar regla ACL (solo para Pharos)
    async deleteACLRule(rule) {
      if (this.deviceType !== 'pharos') return;
      
      if (!confirm(`¿Está seguro que desea eliminar la regla ACL para ${rule.mac}?`)) {
        return;
      }
      
      try {
        await TPLinkService.executeCommand(this.deviceId, 'delete-acl-rule', { ruleId: rule.id });
        
        // Recargar reglas
        this.loadACLRules();
      } catch (error) {
        console.error('Error al eliminar regla ACL:', error);
        alert('Error al eliminar regla ACL: ' + error.message);
      }
    },
    
    // Cargar sitios (solo para Omada)
    async loadSites() {
      if (this.deviceType !== 'omada') return;
      
      this.loadingSites = true;
      
      try {
        const response = await TPLinkService.getSites(this.deviceId);
        this.sites = response.data.sites;
      } catch (error) {
        console.error('Error al cargar sitios:', error);
      } finally {
        this.loadingSites = false;
      }
    },
    
    // Cambiar sitio activo (solo para Omada)
    async changeSite(siteId) {
      if (this.deviceType !== 'omada') return;
      
      if (!confirm('¿Está seguro que desea cambiar al sitio seleccionado?')) {
        return;
      }
      
      try {
        await TPLinkService.changeSite(this.deviceId, siteId);
        
        // Recargar sitios
        this.loadSites();
      } catch (error) {
        console.error('Error al cambiar sitio:', error);
        alert('Error al cambiar sitio: ' + error.message);
      }
    },
    
    // Ver detalles del sitio (solo para Omada)
    viewSiteDetails(site) {
      // Implementación para ver detalles del sitio
      alert(`Detalles del sitio ${site.name} (ID: ${site.id})`);
      // En una implementación real, podría abrir un modal con detalles completos
    },
    
    // Cargar SSIDs (solo para Omada)
    async loadSSIDs() {
      if (this.deviceType !== 'omada') return;
      
      this.loadingSSIDs = true;
      
      try {
        const response = await TPLinkService.getSSIDs(this.deviceId);
        this.ssids = response.data.ssids;
      } catch (error) {
        console.error('Error al cargar SSIDs:', error);
      } finally {
        this.loadingSSIDs = false;
      }
    },
    
    // Ver detalles del SSID (solo para Omada)
    viewSSIDDetails(ssid) {
      // Implementación para ver detalles del SSID
      alert(`Detalles del SSID ${ssid.name}`);
      // En una implementación real, podría abrir un modal con detalles completos
    },
    
    // Mostrar modal para configurar QoS
    showQoSModal(client) {
      this.selectedClient = client;
      
      // Inicializar configuración QoS
      this.qosConfig = {
        downloadLimit: client.downloadLimit || 0,
        uploadLimit: client.uploadLimit || 0
      };
      
      this.showQoSModalFlag = true;
    },
    
    // Aplicar configuración QoS
    async applyQoS() {
      this.applyingQoS = true;
      
      try {
        const qosData = {
          mac: this.selectedClient.mac,
          downloadLimit: this.qosConfig.downloadLimit,
          uploadLimit: this.qosConfig.uploadLimit
        };
        
        await TPLinkService.configureQoS(this.deviceId, qosData);
        
        // Cerrar modal
        this.showQoSModalFlag = false;
        
        // Recargar clientes para mostrar cambios
        this.loadConnectedClients();
      } catch (error) {
        console.error('Error al aplicar QoS:', error);
        alert('Error al aplicar configuración QoS: ' + error.message);
      } finally {
        this.applyingQoS = false;
      }
    },
    
    // Eliminar configuración QoS
    async removeQoS() {
      if (!confirm('¿Está seguro que desea eliminar los límites de ancho de banda para este cliente?')) {
        return;
      }
      
      this.applyingQoS = true;
      
      try {
        await TPLinkService.removeQoS(this.deviceId, this.selectedClient.id || this.selectedClient.mac);
        
        // Cerrar modal
        this.showQoSModalFlag = false;
        
        // Recargar clientes para mostrar cambios
        this.loadConnectedClients();
      } catch (error) {
        console.error('Error al eliminar QoS:', error);
        alert('Error al eliminar configuración QoS: ' + error.message);
      } finally {
        this.applyingQoS = false;
      }
    },
    
    // Mostrar modal para agregar regla ACL
    showAddACLModal() {
      this.newACLRule = {
        mac: '',
        description: '',
        action: 'allow'
      };
      
      this.showACLModalFlag = true;
    },
    
    // Mostrar detalles de cliente
    showClientDetails(client) {
      this.selectedClient = client;
      this.showClientDetailsModalFlag = true;
    }
  },
  watch: {
    activeTab() {
      // Cargar datos cuando cambia la pestaña
      this.loadTabData();
    }
  }
};
</script>

<style scoped>
.tplink-detail {
  margin-top: 20px;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
}

.tab {
  padding: 10px 15px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  border-bottom-color: var(--primary);
  color: var(--primary);
  font-weight: bold;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.tab-header h4 {
  margin: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.data-table th,
.data-table td {
  border: 1px solid var(--border-color);
  padding: 8px 12px;
  text-align: left;
}

.data-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.data-table tr:nth-child(even) {
  background-color: #fbfbfb;
}

.actions {
  display: flex;
  gap: 5px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px;
  border-radius: 4px;
}

.btn-icon:hover {
  background-color: #f0f0f0;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner, .empty-state {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
}

.config-grid, .detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.config-item, .detail-item {
  margin-bottom: 15px;
}

.info-label {
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.advanced-details details {
  margin-top: 15px;
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
}

.advanced-details summary {
  cursor: pointer;
  font-weight: bold;
  margin-bottom: 10px;
}

.advanced-details pre {
  white-space: pre-wrap;
  font-size: 0.8rem;
  max-height: 300px;
  overflow-y: auto;
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
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 500px;
  max-width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.radio-group {
  display: flex;
  gap: 15px;
}

.radio-group label {
  display: flex;
  align-items: center;
  font-weight: normal;
}

.radio-group input {
  margin-right: 5px;
}

.text-muted {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 10px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.ml-2 {
  margin-left: 0.5rem;
}

@media (max-width: 768px) {
  .tabs {
    flex-wrap: wrap;
  }
  
  .config-grid, .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>