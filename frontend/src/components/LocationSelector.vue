<template>
  <div class="location-selector">
    <!-- Selector de Zona -->
    <div class="form-group" v-if="showZoneSelector">
      <label for="zoneSelect">{{ zoneLabel }} *</label>
      <select 
        id="zoneSelect"
        :value="zoneId" 
        @change="onZoneChange"
        :disabled="loading || disabled"
        required
      >
        <option value="">{{ zoneId ? 'Cambiar zona...' : 'Seleccionar zona...' }}</option>
        <option 
          v-for="zone in availableZones" 
          :key="zone.id" 
          :value="zone.id"
          :disabled="zone.id === currentZoneId"
        >
          {{ zone.name }}
          <span v-if="zone.id === currentZoneId"> (Actual)</span>
          <span v-if="zone.description"> - {{ zone.description }}</span>
        </option>
      </select>
      <small class="form-help" v-if="currentZone && operationType === 'CHANGE_ZONE'">
        Zona actual: <strong>{{ currentZone.name }}</strong>
      </small>
    </div>

    <!-- Selector de Nodo -->
    <div class="form-group" v-if="showNodeSelector">
      <label for="nodeSelect">{{ nodeLabel }} *</label>
      <select 
        id="nodeSelect"
        :value="nodeId" 
        @change="onNodeChange"
        :disabled="loading || disabled || !targetZoneId"
        required
      >
        <option value="">{{ nodeId ? 'Cambiar nodo/torre...' : 'Seleccionar nodo/torre...' }}</option>
        <option 
          v-for="node in availableNodes" 
          :key="node.id" 
          :value="node.id"
          :disabled="node.id === currentNodeId"
        >
          {{ node.name }}
          <span v-if="node.id === currentNodeId"> (Actual)</span>
          <span v-if="node.location"> - {{ node.location }}</span>
        </option>
      </select>
      <small class="form-help" v-if="currentNode && ['CHANGE_NODE', 'CHANGE_ZONE'].includes(operationType)">
        Nodo actual: <strong>{{ currentNode.name }}</strong>
      </small>
      <small class="form-help" v-if="!targetZoneId && showNodeSelector">
        Primero seleccione una zona para cargar los nodos disponibles
      </small>
    </div>

    <!-- Información de cambio -->
    <div class="change-info" v-if="showChangeInfo">
      <div class="change-summary">
        <h5>🔄 Resumen del Cambio</h5>
        <div class="change-item" v-if="isZoneChanging">
          <span class="change-label">Zona:</span>
          <span class="change-from">{{ getCurrentZoneName() }}</span>
          <span class="change-arrow">→</span>
          <span class="change-to">{{ getNewZoneName() }}</span>
        </div>
        <div class="change-item" v-if="isNodeChanging">
          <span class="change-label">Nodo:</span>
          <span class="change-from">{{ getCurrentNodeName() }}</span>
          <span class="change-arrow">→</span>
          <span class="change-to">{{ getNewNodeName() }}</span>
        </div>
      </div>
      
      <!-- Advertencias -->
      <div class="change-warnings" v-if="hasWarnings">
        <div class="warning-item" v-for="warning in warnings" :key="warning.code">
          <span class="warning-icon">⚠️</span>
          <span class="warning-message">{{ warning.message }}</span>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div class="loading-state" v-if="loading">
      <div class="loading-spinner"></div>
      <span>{{ loadingMessage }}</span>
    </div>

    <!-- Error state -->
    <div class="error-state" v-if="error">
      <span class="error-icon">❌</span>
      <span class="error-message">{{ error }}</span>
      <button @click="retry" class="retry-btn">Reintentar</button>
    </div>
  </div>
</template>

<script>
import ClientService from '@/services/client.service'
import NetworkService from '@/services/network.service'

export default {
  name: 'LocationSelector',
  props: {
    zoneId: {
      type: [Number, String],
      default: null
    },
    nodeId: {
      type: [Number, String],
      default: null
    },
    currentZoneId: {
      type: [Number, String],
      default: null
    },
    currentNodeId: {
      type: [Number, String],
      default: null
    },
    operationType: {
      type: String,
      required: true
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:zoneId', 'update:nodeId', 'zoneChanged', 'nodeChanged', 'error', 'warning'],
  
  data() {
    return {
      loading: false,
      loadingMessage: '',
      error: null,
      availableZones: [],
      availableNodes: [],
      currentZone: null,
      currentNode: null,
      warnings: []
    }
  },

  computed: {
    showZoneSelector() {
      return ['CHANGE_ZONE'].includes(this.operationType)
    },

    showNodeSelector() {
      return ['CHANGE_NODE', 'CHANGE_ZONE', 'CREATE_NEW'].includes(this.operationType)
    },

    showChangeInfo() {
      return this.isZoneChanging || this.isNodeChanging
    },

    zoneLabel() {
      const labels = {
        'CHANGE_ZONE': 'Nueva Zona',
        'CHANGE_NODE': 'Zona',
        'CREATE_NEW': 'Zona'
      }
      return labels[this.operationType] || 'Zona'
    },

    nodeLabel() {
      const labels = {
        'CHANGE_NODE': 'Nuevo Nodo/Torre',
        'CHANGE_ZONE': 'Nuevo Nodo/Torre',
        'CREATE_NEW': 'Nodo/Torre'
      }
      return labels[this.operationType] || 'Nodo/Torre'
    },

    targetZoneId() {
      return this.zoneId || this.currentZoneId
    },

    isZoneChanging() {
      return this.zoneId && this.zoneId !== this.currentZoneId
    },

    isNodeChanging() {
      return this.nodeId && this.nodeId !== this.currentNodeId
    },

    hasWarnings() {
      return this.warnings.length > 0
    }
  },

  watch: {
    zoneId: {
      handler(newZoneId) {
        if (newZoneId && newZoneId !== this.currentZoneId) {
          this.loadNodesForZone(newZoneId)
          this.validateZoneChange(newZoneId)
        }
      },
      immediate: true
    },

    nodeId: {
      handler(newNodeId) {
        if (newNodeId && newNodeId !== this.currentNodeId) {
          this.validateNodeChange(newNodeId)
        }
      }
    }
  },

  async created() {
    await this.initializeData()
  },

  methods: {
    async initializeData() {
      try {
        this.loading = true
        this.loadingMessage = 'Cargando ubicaciones disponibles...'

        // Cargar zonas si es necesario
        if (this.showZoneSelector) {
          await this.loadAvailableZones()
        }

        // Cargar nodos para la zona actual/seleccionada
        if (this.targetZoneId) {
          await this.loadNodesForZone(this.targetZoneId)
        }

        // Cargar información actual
        await this.loadCurrentLocationInfo()

      } catch (error) {
        console.error('❌ Error inicializando LocationSelector:', error)
        this.error = 'Error cargando datos de ubicación'
        this.$emit('error', error)
      } finally {
        this.loading = false
      }
    },

    async loadAvailableZones() {
      try {
        console.log('🌍 Cargando zonas disponibles')
        const response = await ClientService.getAvailableZones()
        this.availableZones = response.data || []
        console.log('✅ Zonas cargadas:', this.availableZones.length)
      } catch (error) {
        console.error('❌ Error cargando zonas:', error)
        throw error
      }
    },

    async loadNodesForZone(zoneId) {
      if (!zoneId) return

      try {
        console.log('🗼 Cargando nodos para zona:', zoneId)
        this.loadingMessage = 'Cargando nodos/torres...'
        
        const response = await NetworkService.getNodesByZone(zoneId)
        this.availableNodes = response.data || []
        
        console.log('✅ Nodos cargados:', this.availableNodes.length)
        
        // Si el nodo actual no está en la nueva zona, limpiar selección
        if (this.nodeId && !this.availableNodes.some(node => node.id == this.nodeId)) {
          console.log('⚠️ Nodo actual no disponible en nueva zona, limpiando')
          this.$emit('update:nodeId', null)
        }

      } catch (error) {
        console.error('❌ Error cargando nodos:', error)
        this.availableNodes = []
        throw error
      }
    },

    async loadCurrentLocationInfo() {
      try {
        // Cargar información de zona actual
        if (this.currentZoneId) {
          const zoneResponse = await NetworkService.getZone(this.currentZoneId)
          this.currentZone = zoneResponse.data
        }

        // Cargar información de nodo actual
        if (this.currentNodeId) {
          const nodeResponse = await NetworkService.getNode(this.currentNodeId)
          this.currentNode = nodeResponse.data
        }

      } catch (error) {
        console.warn('⚠️ Error cargando información actual (no crítico):', error)
      }
    },

    onZoneChange(event) {
      const newZoneId = event.target.value ? parseInt(event.target.value) : null
      console.log('🔄 Cambio de zona detectado:', newZoneId)
      
      this.$emit('update:zoneId', newZoneId)
      this.$emit('zoneChanged', {
        from: this.currentZoneId,
        to: newZoneId,
        zone: this.availableZones.find(z => z.id === newZoneId)
      })

      // Limpiar selección de nodo al cambiar zona
      if (this.nodeId && newZoneId !== this.currentZoneId) {
        this.$emit('update:nodeId', null)
      }
    },

    onNodeChange(event) {
      const newNodeId = event.target.value ? parseInt(event.target.value) : null
      console.log('🔄 Cambio de nodo detectado:', newNodeId)
      
      this.$emit('update:nodeId', newNodeId)
      this.$emit('nodeChanged', {
        from: this.currentNodeId,
        to: newNodeId,
        node: this.availableNodes.find(n => n.id === newNodeId)
      })
    },

    async validateZoneChange(newZoneId) {
      this.warnings = []

      if (!newZoneId || newZoneId === this.currentZoneId) return

      try {
        // Validar que la zona existe y está activa
        const zone = this.availableZones.find(z => z.id === newZoneId)
        if (!zone) {
          this.addWarning('ZONE_NOT_FOUND', 'La zona seleccionada no fue encontrada')
          return
        }

        if (!zone.active) {
          this.addWarning('ZONE_INACTIVE', 'La zona seleccionada está inactiva')
        }

        // Validar que hay nodos disponibles en la zona
        if (this.availableNodes.length === 0) {
          this.addWarning('NO_NODES_IN_ZONE', 'No hay nodos disponibles en esta zona')
        }

        console.log('✅ Validación de zona completada')

      } catch (error) {
        console.error('❌ Error validando zona:', error)
        this.addWarning('VALIDATION_ERROR', 'Error validando la zona seleccionada')
      }
    },

    async validateNodeChange(newNodeId) {
      if (!newNodeId || newNodeId === this.currentNodeId) return

      try {
        // Validar que el nodo existe y está activo
        const node = this.availableNodes.find(n => n.id === newNodeId)
        if (!node) {
          this.addWarning('NODE_NOT_FOUND', 'El nodo seleccionado no fue encontrado')
          return
        }

        if (!node.active) {
          this.addWarning('NODE_INACTIVE', 'El nodo seleccionado está inactivo')
        }

        console.log('✅ Validación de nodo completada')

      } catch (error) {
        console.error('❌ Error validando nodo:', error)
        this.addWarning('NODE_VALIDATION_ERROR', 'Error validando el nodo seleccionado')
      }
    },

    addWarning(code, message) {
      this.warnings.push({ code, message })
      this.$emit('warning', { code, message })
    },

    getCurrentZoneName() {
      return this.currentZone?.name || 'Zona actual'
    },

    getNewZoneName() {
      const zone = this.availableZones.find(z => z.id === this.zoneId)
      return zone?.name || 'Nueva zona'
    },

    getCurrentNodeName() {
      return this.currentNode?.name || 'Nodo actual'
    },

    getNewNodeName() {
      const node = this.availableNodes.find(n => n.id === this.nodeId)
      return node?.name || 'Nuevo nodo'
    },

    retry() {
      this.error = null
      this.initializeData()
    }
  }
}
</script>

<style scoped>
.location-selector {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
  border-left: 4px solid #17a2b8;
}

.form-group {
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  color: #495057;
}

select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
  transition: border-color 0.2s;
}

select:focus {
  outline: none;
  border-color: #17a2b8;
  box-shadow: 0 0 0 2px rgba(23, 162, 184, 0.25);
}

select:disabled {
  background-color: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

.form-help {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6c757d;
}

.change-info {
  margin-top: 16px;
  padding: 12px;
  background-color: #e3f2fd;
  border-radius: 4px;
  border-left: 3px solid #2196f3;
}

.change-summary h5 {
  margin: 0 0 8px 0;
  color: #1976d2;
  font-size: 14px;
}

.change-item {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  font-size: 13px;
}

.change-label {
  font-weight: bold;
  margin-right: 8px;
  min-width: 60px;
}

.change-from {
  color: #dc3545;
  background-color: #f8d7da;
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 8px;
}

.change-arrow {
  margin: 0 8px;
  color: #6c757d;
}

.change-to {
  color: #28a745;
  background-color: #d4edda;
  padding: 2px 6px;
  border-radius: 3px;
}

.change-warnings {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #2196f3;
}

.warning-item {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: #856404;
}

.warning-icon {
  margin-right: 6px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #6c757d;
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #17a2b8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
  font-size: 14px;
}

.error-icon {
  margin-right: 8px;
}

.error-message {
  flex: 1;
}

.retry-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 8px;
}

.retry-btn:hover {
  background-color: #c82333;
}
</style>