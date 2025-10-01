<template>
  <div class="client-info-display">
    <div class="client-header">
      <div class="client-avatar">
        {{ getClientInitials() }}
      </div>
      <div class="client-basic-info">
        <h4 class="client-name">{{ getFullName() }}</h4>
        <div class="client-status" :class="getStatusClass()">
          <span class="status-indicator"></span>
          {{ getStatusText() }}
        </div>
      </div>
      <div class="client-actions" v-if="showActions">
        <button @click="$emit('editClient')" class="btn-edit" title="Editar Cliente">
          ✏️
        </button>
        <button @click="$emit('viewProfile')" class="btn-view" title="Ver Perfil">
          👁️
        </button>
      </div>
    </div>

    <div class="client-details">
      <!-- Información de Contacto -->
      <div class="detail-section">
        <h5>📞 Contacto</h5>
        <div class="detail-grid">
          <div class="detail-item" v-if="client.email">
            <span class="detail-label">Email:</span>
            <span class="detail-value">
              <a :href="'mailto:' + client.email" class="contact-link">
                {{ client.email }}
              </a>
            </span>
          </div>
          
          <div class="detail-item" v-if="client.phone">
            <span class="detail-label">Teléfono:</span>
            <span class="detail-value">
              <a :href="'tel:' + client.phone" class="contact-link">
                {{ client.phone }}
              </a>
            </span>
          </div>
          
          <div class="detail-item" v-if="client.whatsapp">
            <span class="detail-label">WhatsApp:</span>
            <span class="detail-value">
              <a :href="getWhatsAppUrl()" target="_blank" class="contact-link whatsapp">
                {{ client.whatsapp }}
              </a>
            </span>
          </div>
        </div>
      </div>

      <!-- Información de Ubicación -->
      <div class="detail-section">
        <h5>📍 Ubicación</h5>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Zona:</span>
            <span class="detail-value" :class="{ 'not-assigned': !getZoneName() }">
              {{ getZoneName() || 'No asignada' }}
            </span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">Nodo:</span>
            <span class="detail-value" :class="{ 'not-assigned': !getNodeName() }">
              {{ getNodeName() || 'No asignado' }}
            </span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">Sector:</span>
            <span class="detail-value" :class="{ 'not-assigned': !getSectorName() }">
              {{ getSectorName() || 'No asignado' }}
            </span>
          </div>
          
          <div class="detail-item" v-if="client.address">
            <span class="detail-label">Dirección:</span>
            <span class="detail-value">{{ client.address }}</span>
          </div>
          
          <div class="detail-item" v-if="hasCoordinates()">
            <span class="detail-label">Coordenadas:</span>
            <span class="detail-value">
              <a :href="getGoogleMapsUrl()" target="_blank" class="map-link">
                {{ client.latitude }}, {{ client.longitude }}
                <span class="map-icon">🗺️</span>
              </a>
            </span>
          </div>
        </div>
      </div>

      <!-- Información del Servicio -->
      <div class="detail-section" v-if="currentSubscription">
        <h5>📦 Servicio Actual</h5>
        <div class="service-info">
          <div class="service-main">
            <div class="service-name">{{ getCurrentPackageName() }}</div>
            <div class="service-speed">{{ getCurrentSpeedSummary() }}</div>
            <div class="service-price">${{ getCurrentPrice() }}/mes</div>
          </div>
          
          <div class="service-status" :class="getSubscriptionStatusClass()">
            {{ getSubscriptionStatusText() }}
          </div>
        </div>
        
        <div class="service-details">
          <div class="service-detail" v-if="currentSubscription.pppoeUsername">
            <span class="service-label">Usuario PPPoE:</span>
            <span class="service-value">{{ currentSubscription.pppoeUsername }}</span>
          </div>
          
          <div class="service-detail" v-if="currentSubscription.assignedIpAddress">
            <span class="service-label">IP Asignada:</span>
            <span class="service-value">{{ currentSubscription.assignedIpAddress }}</span>
          </div>
          
          <div class="service-detail" v-if="currentSubscription.billingDay">
            <span class="service-label">Día de Facturación:</span>
            <span class="service-value">{{ currentSubscription.billingDay }}</span>
          </div>
          
          <div class="service-detail" v-if="currentSubscription.nextDueDate">
            <span class="service-label">Próximo Pago:</span>
            <span class="service-value" :class="{ 'overdue': isPaymentOverdue() }">
              {{ formatDate(currentSubscription.nextDueDate) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Información de Fechas -->
      <div class="detail-section">
        <h5>📅 Fechas Importantes</h5>
        <div class="detail-grid">
          <div class="detail-item" v-if="client.startDate">
            <span class="detail-label">Cliente desde:</span>
            <span class="detail-value">{{ formatDate(client.startDate) }}</span>
          </div>
          
          <div class="detail-item" v-if="client.birthDate">
            <span class="detail-label">Fecha de Nacimiento:</span>
            <span class="detail-value">{{ formatDate(client.birthDate) }}</span>
          </div>
          
          <div class="detail-item" v-if="currentSubscription?.lastPaymentDate">
            <span class="detail-label">Último Pago:</span>
            <span class="detail-value">{{ formatDate(currentSubscription.lastPaymentDate) }}</span>
          </div>
        </div>
      </div>

      <!-- Advertencias y Alertas -->
      <div class="detail-section" v-if="hasWarnings()">
        <h5>⚠️ Advertencias</h5>
        <div class="warnings-list">
          <div class="warning-item" v-for="warning in getWarnings()" :key="warning.code" :class="warning.severity">
            <span class="warning-icon">{{ getWarningIcon(warning.severity) }}</span>
            <span class="warning-message">{{ warning.message }}</span>
          </div>
        </div>
      </div>

      <!-- Operación Actual -->
      <div class="detail-section operation-context" v-if="showOperationContext">
        <h5>🔧 {{ getOperationTitle() }}</h5>
        <div class="operation-info">
          <div class="operation-description">
            {{ getOperationDescription() }}
          </div>
          
          <div class="operation-requirements" v-if="getOperationRequirements().length > 0">
            <h6>Requisitos:</h6>
            <ul class="requirements-list">
              <li v-for="req in getOperationRequirements()" :key="req" :class="{ 'met': isRequirementMet(req) }">
                <span class="req-status">{{ isRequirementMet(req) ? '✅' : '❌' }}</span>
                {{ req }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Notas del Cliente -->
      <div class="detail-section" v-if="client.notes">
        <h5>📝 Notas</h5>
        <div class="client-notes">
          {{ client.notes }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ClientInfoDisplay',
  props: {
    client: {
      type: Object,
      required: true
    },
    currentSubscription: {
      type: Object,
      default: null
    },
    operationType: {
      type: String,
      default: null
    },
    showActions: {
      type: Boolean,
      default: false
    },
    showOperationContext: {
      type: Boolean,
      default: true
    }
  },
  emits: ['editClient', 'viewProfile'],
  computed: {
    hasCoordinates() {
      return this.client.latitude && this.client.longitude
    }
  },
  methods: {
    getFullName() {
      return `${this.client.firstName || ''} ${this.client.lastName || ''}`.trim() || 'Cliente'
    },
    
    getClientInitials() {
      const firstName = this.client.firstName || ''
      const lastName = this.client.lastName || ''
      
      if (firstName && lastName) {
        return (firstName[0] + lastName[0]).toUpperCase()
      } else if (firstName) {
        return firstName.substring(0, 2).toUpperCase()
      } else {
        return 'CL'
      }
    },
    
    getStatusClass() {
      return this.client.active ? 'status-active' : 'status-inactive'
    },
    
    getStatusText() {
      return this.client.active ? 'Cliente Activo' : 'Cliente Inactivo'
    },
    
    getZoneName() {
      return this.client.Zone?.name || null
    },
    
    getNodeName() {
      return this.client.Node?.name || null
    },
    
    getSectorName() {
      return this.client.Sector?.name || null
    },
    
    getCurrentPackageName() {
      return this.currentSubscription?.ServicePackage?.name || 'Sin paquete'
    },
    
    getCurrentSpeedSummary() {
      const pkg = this.currentSubscription?.ServicePackage
      if (!pkg) return 'N/A'
      return `${pkg.downloadSpeedMbps}↓/${pkg.uploadSpeedMbps}↑ Mbps`
    },
    
    getCurrentPrice() {
      const price = this.currentSubscription?.monthlyFee || 
                   this.currentSubscription?.ServicePackage?.price || 
                   0
      return parseFloat(price).toFixed(2)
    },
    
    getSubscriptionStatusClass() {
      if (!this.currentSubscription) return 'status-none'
      
      const status = this.currentSubscription.status
      return `status-${status}`
    },
    
    getSubscriptionStatusText() {
      if (!this.currentSubscription) return 'Sin suscripción'
      
      const statusLabels = {
        'active': 'Activo',
        'suspended': 'Suspendido',
        'cancelled': 'Cancelado',
        'pending': 'Pendiente',
        'cutService': 'Servicio Cortado'
      }
      
      return statusLabels[this.currentSubscription.status] || this.currentSubscription.status
    },
    
    isPaymentOverdue() {
      if (!this.currentSubscription?.nextDueDate) return false
      return new Date(this.currentSubscription.nextDueDate) < new Date()
    },
    
    formatDate(dateString) {
      if (!dateString) return 'No especificada'
      
      const date = new Date(dateString)
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    },
    
    getWhatsAppUrl() {
      if (!this.client.whatsapp) return '#'
      const number = this.client.whatsapp.replace(/\D/g, '')
      return `https://wa.me/${number}`
    },
    
    getGoogleMapsUrl() {
      if (!this.hasCoordinates()) return '#'
      return `https://www.google.com/maps?q=${this.client.latitude},${this.client.longitude}`
    },
    
    hasWarnings() {
      return this.getWarnings().length > 0
    },
    
    getWarnings() {
      const warnings = []
      
      // Cliente inactivo
      if (!this.client.active) {
        warnings.push({
          code: 'CLIENT_INACTIVE',
          severity: 'high',
          message: 'El cliente está inactivo'
        })
      }
      
      // Sin zona asignada
      if (!this.client.zoneId) {
        warnings.push({
          code: 'NO_ZONE',
          severity: 'medium',
          message: 'No tiene zona asignada'
        })
      }
      
      // Sin nodo asignado
      if (!this.client.nodeId) {
        warnings.push({
          code: 'NO_NODE',
          severity: 'high',
          message: 'No tiene nodo asignado'
        })
      }
      
      // Pago vencido
      if (this.isPaymentOverdue()) {
        warnings.push({
          code: 'PAYMENT_OVERDUE',
          severity: 'high',
          message: 'Tiene pagos vencidos'
        })
      }
      
      // Sin información de contacto
      if (!this.client.email && !this.client.phone) {
        warnings.push({
          code: 'NO_CONTACT',
          severity: 'medium',
          message: 'Sin información de contacto'
        })
      }
      
      // Suscripción suspendida
      if (this.currentSubscription?.status === 'suspended') {
        warnings.push({
          code: 'SERVICE_SUSPENDED',
          severity: 'medium',
          message: 'Servicio suspendido'
        })
      }
      
      return warnings
    },
    
    getWarningIcon(severity) {
      const icons = {
        'low': '💡',
        'medium': '⚠️',
        'high': '🚨',
        'critical': '🔴'
      }
      return icons[severity] || '⚠️'
    },
    
    getOperationTitle() {
      const titles = {
        'CREATE_NEW': 'Nueva Suscripción',
        'CHANGE_PLAN': 'Cambio de Plan',
        'CHANGE_ADDRESS': 'Cambio de Domicilio',
        'CHANGE_NODE': 'Cambio de Torre/Nodo',
        'CHANGE_ZONE': 'Cambio de Zona'
      }
      return titles[this.operationType] || 'Operación'
    },
    
    getOperationDescription() {
      const descriptions = {
        'CREATE_NEW': 'Se creará una nueva suscripción para este cliente con configuración completa de red.',
        'CHANGE_PLAN': 'Se modificará el plan actual manteniendo la configuración de red existente.',
        'CHANGE_ADDRESS': 'Se actualizará únicamente la dirección física del cliente.',
        'CHANGE_NODE': 'Se moverá el servicio a una nueva torre. Esto requiere recrear la configuración PPPoE.',
        'CHANGE_ZONE': 'Se cambiará la zona del cliente. Puede afectar disponibilidad de paquetes y precios.'
      }
      return descriptions[this.operationType] || 'Operación del sistema.'
    },
    
    getOperationRequirements() {
      const requirements = {
        'CREATE_NEW': [
          'Cliente activo',
          'Zona asignada',
          'Nodo asignado',
          'Paquete de servicio seleccionado',
          'Router disponible'
        ],
        'CHANGE_PLAN': [
          'Suscripción activa o suspendida',
          'Nuevo paquete seleccionado'
        ],
        'CHANGE_ADDRESS': [
          'Nueva dirección especificada',
          'Razón del cambio'
        ],
        'CHANGE_NODE': [
          'Nuevo nodo seleccionado',
          'Router disponible en nuevo nodo',
          'Razón del cambio',
          'Confirmar interrupción temporal'
        ],
        'CHANGE_ZONE': [
          'Nueva zona seleccionada',
          'Nuevo nodo seleccionado',
          'Paquete disponible en nueva zona',
          'Razón del cambio',
          'Confirmar recreación completa'
        ]
      }
      
      return requirements[this.operationType] || []
    },
    
    isRequirementMet(requirement) {
      // Lógica para verificar si cada requisito está cumplido
      switch (requirement) {
        case 'Cliente activo':
          return this.client.active
        case 'Zona asignada':
          return !!this.client.zoneId
        case 'Nodo asignado':
          return !!this.client.nodeId
        case 'Suscripción activa o suspendida':
          return this.currentSubscription && 
                 ['active', 'suspended'].includes(this.currentSubscription.status)
        // Otros requisitos requerirían props adicionales del formulario
        default:
          return false
      }
    }
  }
}
</script>

<style scoped>
.client-info-display {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.client-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e9ecef;
}

.client-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5em;
  font-weight: bold;
  flex-shrink: 0;
}

.client-basic-info {
  flex: 1;
}

.client-name {
  margin: 0 0 8px 0;
  color: #212529;
  font-size: 1.3em;
}

.client-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  font-weight: 500;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-active .status-indicator {
  background: #28a745;
}

.status-inactive .status-indicator {
  background: #dc3545;
}

.client-actions {
  display: flex;
  gap: 8px;
}

.btn-edit, .btn-view {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  background: #f8f9fa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.btn-edit:hover, .btn-view:hover {
  background: #e9ecef;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h5 {
  margin: 0 0 12px 0;
  color: #495057;
  font-size: 1em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.detail-label {
  font-weight: 500;
  color: #6c757d;
}

.detail-value {
  font-weight: 600;
  color: #212529;
}

.detail-value.not-assigned {
  color: #dc3545;
  font-style: italic;
}

.contact-link {
  color: #007bff;
  text-decoration: none;
}

.contact-link:hover {
  text-decoration: underline;
}

.contact-link.whatsapp {
  color: #25d366;
}

.map-link {
  color: #007bff;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.map-icon {
  font-size: 0.9em;
}

.service-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 12px;
}

.service-main {
  flex: 1;
}

.service-name {
  font-weight: bold;
  font-size: 1.1em;
  color: #212529;
  margin-bottom: 4px;
}

.service-speed {
  color: #6c757d;
  font-size: 0.9em;
  margin-bottom: 2px;
}

.service-price {
  color: #28a745;
  font-weight: bold;
  font-size: 1.1em;
}

.service-status {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: bold;
  text-transform: uppercase;
}

.service-status.status-active {
  background: #d4edda;
  color: #155724;
}

.service-status.status-suspended {
  background: #fff3cd;
  color: #856404;
}

.service-status.status-cancelled {
  background: #f8d7da;
  color: #721c24;
}

.service-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.service-detail {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  font-size: 0.9em;
}

.service-label {
  color: #6c757d;
  font-weight: 500;
}

.service-value {
  font-weight: 600;
  color: #212529;
}

.service-value.overdue {
  color: #dc3545;
  font-weight: bold;
}

.warnings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9em;
}

.warning-item.low {
  background: #d1ecf1;
  color: #0c5460;
}

.warning-item.medium {
  background: #fff3cd;
  color: #856404;
}

.warning-item.high {
  background: #f8d7da;
  color: #721c24;
}

.warning-item.critical {
  background: #f5c6cb;
  color: #721c24;
  font-weight: bold;
}

.operation-context {
  background: #e3f2fd;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #bbdefb;
}

.operation-info {
  color: #1565c0;
}

.operation-description {
  margin-bottom: 12px;
  font-size: 0.9em;
}

.operation-requirements h6 {
  margin: 0 0 8px 0;
  color: #1565c0;
  font-size: 0.9em;
}

.requirements-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.requirements-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 0.85em;
}

.requirements-list li.met {
  color: #155724;
}

.req-status {
  font-size: 0.9em;
}

.client-notes {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #007bff;
  font-style: italic;
  color: #495057;
}

@media (max-width: 768px) {
  .client-header {
    flex-direction: column;
    text-align: center;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .service-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .service-details {
    grid-template-columns: 1fr;
  }
}
</style>