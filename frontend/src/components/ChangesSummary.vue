<template>
  <div class="changes-summary">
    <div class="summary-header">
      <h4>📋 Resumen de Cambios</h4>
      <div class="operation-badge" :class="operationType.toLowerCase()">
        {{ getOperationLabel() }}
      </div>
    </div>

    <!-- Resumen por tipo de operación -->
    <div class="changes-content">
      
      <!-- NUEVA SUSCRIPCIÓN -->
      <div v-if="operationType === 'CREATE_NEW'" class="change-section">
        <h5>🆕 Nueva Suscripción</h5>
        
        <div class="change-grid">
          <div class="change-item">
            <span class="change-label">Cliente:</span>
            <span class="change-value">{{ getClientFullName() }}</span>
          </div>
          
          <div class="change-item">
            <span class="change-label">Paquete:</span>
            <span class="change-value">{{ getSelectedPackageName() }}</span>
          </div>
          
          <div class="change-item">
            <span class="change-label">Velocidad:</span>
            <span class="change-value">{{ getSpeedSummary() }}</span>
          </div>
          
          <div class="change-item">
            <span class="change-label">Precio:</span>
            <span class="change-value price">${{ getFinalPrice() }}/mes</span>
          </div>
          
          <div class="change-item">
            <span class="change-label">Router/Nodo:</span>
            <span class="change-value">{{ getSelectedRouterName() }}</span>
          </div>
          
          <div class="change-item" v-if="formData.pppoeConfig.username">
            <span class="change-label">Usuario PPPoE:</span>
            <span class="change-value">{{ formData.pppoeConfig.username }}</span>
          </div>
        </div>
        
        <div class="actions-preview">
          <h6>🔧 Acciones a Realizar:</h6>
          <ul class="action-list">
            <li>✅ Crear suscripción en base de datos</li>
            <li>✅ Crear configuración de red</li>
            <li>⚡ Crear usuario PPPoE en Mikrotik</li>
            <li>🌐 Asignar IP del pool</li>
            <li>🔄 Sincronizar datos BD ↔ Mikrotik</li>
          </ul>
        </div>
      </div>

      <!-- CAMBIO DE PLAN -->
      <div v-if="operationType === 'CHANGE_PLAN'" class="change-section">
        <h5>📊 Cambio de Plan</h5>
        
        <div class="comparison-table">
          <div class="comparison-header">
            <div class="comparison-col">Actual</div>
            <div class="comparison-col">Nuevo</div>
            <div class="comparison-col">Cambio</div>
          </div>
          
          <div class="comparison-row">
            <div class="comparison-label">Paquete</div>
            <div class="comparison-col">{{ getCurrentPackageName() }}</div>
            <div class="comparison-col">{{ getSelectedPackageName() }}</div>
            <div class="comparison-col change-indicator">{{ getPackageChangeIndicator() }}</div>
          </div>
          
          <div class="comparison-row">
            <div class="comparison-label">Velocidad</div>
            <div class="comparison-col">{{ getCurrentSpeedSummary() }}</div>
            <div class="comparison-col">{{ getSpeedSummary() }}</div>
            <div class="comparison-col change-indicator">{{ getSpeedChangeIndicator() }}</div>
          </div>
          
          <div class="comparison-row">
            <div class="comparison-label">Precio</div>
            <div class="comparison-col">${{ getCurrentPrice() }}/mes</div>
            <div class="comparison-col price">${{ getFinalPrice() }}/mes</div>
            <div class="comparison-col change-indicator">{{ getPriceChangeIndicator() }}</div>
          </div>
        </div>
        
        <div class="actions-preview">
          <h6>🔧 Acciones a Realizar:</h6>
          <ul class="action-list">
            <li>✅ Actualizar suscripción en BD</li>
            <li>⚡ Actualizar perfil en Mikrotik</li>
            <li>🔄 Verificar sincronización</li>
          </ul>
        </div>
      </div>

      <!-- CAMBIO DE NODO -->
      <div v-if="operationType === 'CHANGE_NODE'" class="change-section">
        <h5>🗼 Cambio de Nodo/Torre</h5>
        
        <div class="warning-box">
          <strong>⚠️ ATENCIÓN:</strong> Esta operación eliminará el usuario PPPoE del router actual 
          y lo creará en el nuevo router. El servicio se interrumpirá temporalmente.
        </div>
        
        <div class="comparison-table">
          <div class="comparison-header">
            <div class="comparison-col">Actual</div>
            <div class="comparison-col">Nuevo</div>
          </div>
          
          <div class="comparison-row">
            <div class="comparison-label">Nodo</div>
            <div class="comparison-col">{{ getCurrentNodeName() }}</div>
            <div class="comparison-col">{{ getNewNodeName() }}</div>
          </div>
          
          <div class="comparison-row">
            <div class="comparison-label">Router</div>
            <div class="comparison-col">{{ getCurrentRouterName() }}</div>
            <div class="comparison-col">{{ getSelectedRouterName() }}</div>
          </div>
          
          <div class="comparison-row" v-if="preservePackage">
            <div class="comparison-label">Paquete</div>
            <div class="comparison-col">{{ getCurrentPackageName() }}</div>
            <div class="comparison-col">{{ getCurrentPackageName() }} (conservado)</div>
          </div>
        </div>
        
        <div class="actions-preview danger">
          <h6>⚡ Acciones Críticas:</h6>
          <ul class="action-list">
            <li class="critical">🔄 Respaldar configuración actual</li>
            <li class="critical">❌ Eliminar usuario del router anterior</li>
            <li>✅ Actualizar suscripción en BD</li>
            <li class="critical">➕ Crear usuario en nuevo router</li>
            <li>🔍 Verificar conectividad</li>
          </ul>
        </div>
      </div>

      <!-- CAMBIO DE ZONA -->
      <div v-if="operationType === 'CHANGE_ZONE'" class="change-section">
        <h5>🌍 Cambio de Zona</h5>
        
        <div class="warning-box critical">
          <strong>⚠️ OPERACIÓN CRÍTICA:</strong> Cambio de zona puede afectar disponibilidad 
          de paquetes y precios. Se recreará completamente la configuración de red.
        </div>
        
        <div class="comparison-table">
          <div class="comparison-header">
            <div class="comparison-col">Actual</div>
            <div class="comparison-col">Nuevo</div>
          </div>
          
          <div class="comparison-row">
            <div class="comparison-label">Zona</div>
            <div class="comparison-col">{{ getCurrentZoneName() }}</div>
            <div class="comparison-col">{{ getNewZoneName() }}</div>
          </div>
          
          <div class="comparison-row">
            <div class="comparison-label">Nodo</div>
            <div class="comparison-col">{{ getCurrentNodeName() }}</div>
            <div class="comparison-col">{{ getNewNodeName() }}</div>
          </div>
          
          <div class="comparison-row">
            <div class="comparison-label">Paquete</div>
            <div class="comparison-col">{{ getCurrentPackageName() }}</div>
            <div class="comparison-col">{{ getSelectedPackageName() }}</div>
          </div>
          
          <div class="comparison-row" v-if="hasPriceChange">
            <div class="comparison-label">Precio</div>
            <div class="comparison-col">${{ getCurrentPrice() }}/mes</div>
            <div class="comparison-col price">${{ getFinalPrice() }}/mes</div>
          </div>
        </div>
        
        <div class="actions-preview danger">
          <h6>⚡ Acciones Críticas:</h6>
          <ul class="action-list">
            <li>🔍 Validar paquete en nueva zona</li>
            <li class="critical">🔄 Respaldar configuración completa</li>
            <li class="critical">❌ Eliminar de router anterior</li>
            <li>✅ Actualizar todas las configuraciones</li>
            <li class="critical">➕ Crear en nuevo router</li>
            <li>🔍 Verificar sincronización completa</li>
          </ul>
        </div>
      </div>

      <!-- CAMBIO DE DIRECCIÓN -->
      <div v-if="operationType === 'CHANGE_ADDRESS'" class="change-section">
        <h5>🏠 Cambio de Dirección</h5>
        
        <div class="info-box">
          <strong>ℹ️ INFO:</strong> Solo se actualizará la dirección física del cliente. 
          La configuración de red se mantiene sin cambios.
        </div>
        
        <div class="change-grid">
          <div class="change-item" v-if="hasAddressChange">
            <span class="change-label">Nueva dirección:</span>
            <span class="change-value">{{ formData.newAddress }}</span>
          </div>
          
          <div class="change-item" v-if="formData.changeReason">
            <span class="change-label">Razón:</span>
            <span class="change-value">{{ formData.changeReason }}</span>
          </div>
        </div>
        
        <div class="actions-preview">
          <h6>🔧 Acciones a Realizar:</h6>
          <ul class="action-list">
            <li>✅ Actualizar dirección en BD</li>
            <li>📝 Registrar cambio en historial</li>
          </ul>
        </div>
      </div>

      <!-- Información adicional común -->
      <div class="additional-info" v-if="hasAdditionalChanges">
        <h6>📝 Configuración Adicional:</h6>
        
        <div class="info-grid">
          <div class="info-item" v-if="formData.customPrice">
            <span class="info-label">Precio personalizado:</span>
            <span class="info-value">${{ formData.customPrice }}/mes</span>
          </div>
          
          <div class="info-item" v-if="formData.promoDiscount > 0">
            <span class="info-label">Descuento promocional:</span>
            <span class="info-value">{{ formData.promoDiscount }}%</span>
          </div>
          
          <div class="info-item" v-if="formData.billingDay !== currentData?.billingDay">
            <span class="info-label">Día de facturación:</span>
            <span class="info-value">Día {{ formData.billingDay }}</span>
          </div>
          
          <div class="info-item" v-if="formData.notes">
            <span class="info-label">Notas:</span>
            <span class="info-value">{{ formData.notes }}</span>
          </div>
          
          <div class="info-item" v-if="formData.changeReason">
            <span class="info-label">Razón del cambio:</span>
            <span class="info-value">{{ formData.changeReason }}</span>
          </div>
        </div>
      </div>

      <!-- Estimaciones de tiempo y riesgo -->
      <div class="estimates">
        <div class="estimate-item">
          <span class="estimate-label">⏱️ Tiempo estimado:</span>
          <span class="estimate-value">{{ getEstimatedTime() }}</span>
        </div>
        
        <div class="estimate-item">
          <span class="estimate-label">⚠️ Nivel de riesgo:</span>
          <span class="estimate-value" :class="getRiskLevelClass()">{{ getRiskLevel() }}</span>
        </div>
        
        <div class="estimate-item" v-if="hasServiceInterruption">
          <span class="estimate-label">📡 Interrupción:</span>
          <span class="estimate-value interruption">{{ getInterruptionEstimate() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChangesSummary',
  props: {
    operationType: {
      type: String,
      required: true
    },
    formData: {
      type: Object,
      required: true
    },
    currentData: {
      type: Object,
      default: null
    },
    estimatedChanges: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    hasAdditionalChanges() {
      return !!(this.formData.customPrice || 
               this.formData.promoDiscount > 0 || 
               this.formData.notes || 
               this.formData.changeReason ||
               (this.formData.billingDay !== this.currentData?.billingDay))
    },
    
    hasServiceInterruption() {
      return ['CHANGE_NODE', 'CHANGE_ZONE'].includes(this.operationType)
    },
    
    preservePackage() {
      return this.operationType === 'CHANGE_NODE' && 
             !this.formData.servicePackageId && 
             this.currentData?.ServicePackage
    },
    
    hasPriceChange() {
      const currentPrice = parseFloat(this.getCurrentPrice())
      const newPrice = parseFloat(this.getFinalPrice())
      return Math.abs(currentPrice - newPrice) > 0.01
    },
    
    hasAddressChange() {
      return !!(this.formData.newAddress && 
               this.formData.newAddress !== this.currentData?.address)
    }
  },
  methods: {
    getOperationLabel() {
      const labels = {
        'CREATE_NEW': 'Nueva Suscripción',
        'CHANGE_PLAN': 'Cambio de Plan',
        'CHANGE_ADDRESS': 'Cambio de Dirección',
        'CHANGE_NODE': 'Cambio de Torre',
        'CHANGE_ZONE': 'Cambio de Zona'
      }
      return labels[this.operationType] || 'Operación'
    },
    
    getClientFullName() {
      const client = this.currentData?.Client || this.estimatedChanges.clientInfo
      return client ? `${client.firstName} ${client.lastName}` : 'Cliente'
    },
    
    getSelectedPackageName() {
      const pkg = this.estimatedChanges.selectedPackage
      return pkg ? pkg.name : 'Paquete no seleccionado'
    },
    
    getCurrentPackageName() {
      const pkg = this.currentData?.ServicePackage
      return pkg ? pkg.name : 'Sin paquete actual'
    },
    
    getSpeedSummary() {
      const pkg = this.estimatedChanges.selectedPackage
      if (!pkg) return 'N/A'
      return `${pkg.downloadSpeedMbps}↓/${pkg.uploadSpeedMbps}↑ Mbps`
    },
    
    getCurrentSpeedSummary() {
      const pkg = this.currentData?.ServicePackage
      if (!pkg) return 'N/A'
      return `${pkg.downloadSpeedMbps}↓/${pkg.uploadSpeedMbps}↑ Mbps`
    },
    
    getFinalPrice() {
      // Calcular precio final considerando descuentos y precio personalizado
      let basePrice = 0
      
      if (this.formData.customPrice && parseFloat(this.formData.customPrice) > 0) {
        basePrice = parseFloat(this.formData.customPrice)
      } else if (this.estimatedChanges.selectedPackage?.price) {
        basePrice = parseFloat(this.estimatedChanges.selectedPackage.price)
      }
      
      if (this.formData.promoDiscount > 0) {
        const discount = basePrice * (parseFloat(this.formData.promoDiscount) / 100)
        basePrice -= discount
      }
      
      return basePrice.toFixed(2)
    },
    
    getCurrentPrice() {
      const price = this.currentData?.monthlyFee || this.currentData?.ServicePackage?.price || 0
      return parseFloat(price).toFixed(2)
    },
    
    getSelectedRouterName() {
      const router = this.estimatedChanges.selectedRouter
      return router ? `${router.name} (${router.ipAddress})` : 'Router no seleccionado'
    },
    
    getCurrentRouterName() {
      const router = this.currentData?.primaryRouter
      return router ? `${router.name} (${router.ipAddress})` : 'Router actual'
    },
    
    getCurrentNodeName() {
      return this.currentData?.Node?.name || 'Nodo actual'
    },
    
    getNewNodeName() {
      return this.estimatedChanges.newNode?.name || 'Nuevo nodo'
    },
    
    getCurrentZoneName() {
      return this.currentData?.Zone?.name || 'Zona actual'
    },
    
    getNewZoneName() {
      return this.estimatedChanges.newZone?.name || 'Nueva zona'
    },
    
    getPackageChangeIndicator() {
      const current = this.getCurrentPackageName()
      const selected = this.getSelectedPackageName()
      return current === selected ? '=' : '↗️'
    },
    
    getSpeedChangeIndicator() {
      const currentPkg = this.currentData?.ServicePackage
      const selectedPkg = this.estimatedChanges.selectedPackage
      
      if (!currentPkg || !selectedPkg) return '?'
      
      const currentSpeed = currentPkg.downloadSpeedMbps
      const newSpeed = selectedPkg.downloadSpeedMbps
      
      if (newSpeed > currentSpeed) return '⬆️'
      if (newSpeed < currentSpeed) return '⬇️'
      return '='
    },
    
    getPriceChangeIndicator() {
      const currentPrice = parseFloat(this.getCurrentPrice())
      const newPrice = parseFloat(this.getFinalPrice())
      
      if (newPrice > currentPrice) return '⬆️'
      if (newPrice < currentPrice) return '⬇️'
      return '='
    },
    
    getEstimatedTime() {
      const times = {
        'CREATE_NEW': '5-10 minutos',
        'CHANGE_PLAN': '2-3 minutos',
        'CHANGE_ADDRESS': '1-2 minutos',
        'CHANGE_NODE': '10-15 minutos',
        'CHANGE_ZONE': '15-20 minutos'
      }
      return times[this.operationType] || '5-10 minutos'
    },
    
    getRiskLevel() {
      const levels = {
        'CREATE_NEW': 'Bajo',
        'CHANGE_PLAN': 'Bajo',
        'CHANGE_ADDRESS': 'Muy Bajo',
        'CHANGE_NODE': 'Alto',
        'CHANGE_ZONE': 'Muy Alto'
      }
      return levels[this.operationType] || 'Medio'
    },
    
    getRiskLevelClass() {
      const level = this.getRiskLevel().toLowerCase().replace(' ', '-')
      return `risk-${level}`
    },
    
    getInterruptionEstimate() {
      const estimates = {
        'CHANGE_NODE': '5-10 minutos',
        'CHANGE_ZONE': '10-15 minutos'
      }
      return estimates[this.operationType] || 'Ninguna'
    }
  }
}
</script>

<style scoped>
.changes-summary {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #dee2e6;
}

.summary-header h4 {
  margin: 0;
  color: #495057;
}

.operation-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: bold;
  text-transform: uppercase;
}

.operation-badge.create_new { background: #d1ecf1; color: #0c5460; }
.operation-badge.change_plan { background: #d4edda; color: #155724; }
.operation-badge.change_address { background: #fff3cd; color: #856404; }
.operation-badge.change_node { background: #f8d7da; color: #721c24; }
.operation-badge.change_zone { background: #f5c6cb; color: #721c24; }

.change-section {
  margin-bottom: 24px;
}

.change-section h5 {
  margin: 0 0 16px 0;
  color: #343a40;
  font-size: 1.1em;
}

.warning-box, .info-box {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 0.9em;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.warning-box.critical {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.info-box {
  background: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}

.change-grid, .info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.change-item, .info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.change-label, .info-label {
  font-weight: 500;
  color: #6c757d;
}

.change-value, .info-value {
  font-weight: bold;
  color: #495057;
}

.change-value.price {
  color: #28a745;
  font-size: 1.1em;
}

.comparison-table {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid #e9ecef;
}

.comparison-header {
  display: grid;
  grid-template-columns: 150px 1fr 1fr 100px;
  background: #e9ecef;
  font-weight: bold;
  color: #495057;
}

.comparison-row {
  display: grid;
  grid-template-columns: 150px 1fr 1fr 100px;
  border-bottom: 1px solid #e9ecef;
}

.comparison-row:last-child {
  border-bottom: none;
}

.comparison-label {
  padding: 12px;
  background: #f8f9fa;
  font-weight: 500;
  color: #6c757d;
  border-right: 1px solid #e9ecef;
}

.comparison-col {
  padding: 12px;
  border-right: 1px solid #e9ecef;
}

.comparison-col:last-child {
  border-right: none;
}

.change-indicator {
  text-align: center;
  font-size: 1.2em;
}

.actions-preview {
  background: white;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #e9ecef;
}

.actions-preview.danger {
  border-color: #dc3545;
  background: #fff5f5;
}

.actions-preview h6 {
  margin: 0 0 12px 0;
  color: #495057;
}

.action-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.action-list li {
  padding: 6px 0;
  color: #495057;
}

.action-list li.critical {
  color: #dc3545;
  font-weight: 500;
}

.estimates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed #dee2e6;
}

.estimate-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.estimate-label {
  font-weight: 500;
  color: #6c757d;
}

.estimate-value {
  font-weight: bold;
}

.estimate-value.risk-muy-bajo { color: #28a745; }
.estimate-value.risk-bajo { color: #28a745; }
.estimate-value.risk-medio { color: #ffc107; }
.estimate-value.risk-alto { color: #fd7e14; }
.estimate-value.risk-muy-alto { color: #dc3545; }

.estimate-value.interruption {
  color: #dc3545;
  font-weight: bold;
}

@media (max-width: 768px) {
  .comparison-header,
  .comparison-row {
    grid-template-columns: 120px 1fr 1fr 80px;
    font-size: 0.9em;
  }
  
  .comparison-col,
  .comparison-label {
    padding: 8px;
  }
  
  .change-grid,
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .estimates {
    grid-template-columns: 1fr;
  }
}
</style>