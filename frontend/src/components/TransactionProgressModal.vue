<template>
  <div class="transaction-modal-overlay" @click.self="handleOverlayClick">
    <div class="transaction-modal">
      <div class="modal-header">
        <h3>{{ getModalTitle() }}</h3>
        <div class="progress-indicator">
          <span class="step-counter">{{ currentStep + 1 }} / {{ steps.length }}</span>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progressPercentage + '%' }"
              :class="{ 'error': hasErrors, 'warning': hasWarnings }"
            ></div>
          </div>
        </div>
      </div>

      <div class="modal-body">
        <!-- Lista de pasos -->
        <div class="steps-container">
          <div 
            class="step-item" 
            v-for="(step, index) in steps" 
            :key="step.id"
            :class="getStepClass(step, index)"
          >
            <div class="step-indicator">
              <div class="step-number" v-if="step.status === 'pending'">
                {{ index + 1 }}
              </div>
              <div class="step-icon" v-else>
                {{ getStepIcon(step.status) }}
              </div>
            </div>
            
            <div class="step-content">
              <div class="step-name">{{ step.name }}</div>
              <div class="step-message" v-if="step.message">
                {{ step.message }}
              </div>
              <div class="step-details" v-if="step.details">
                <div class="details-toggle" @click="toggleStepDetails(step.id)">
                  {{ expandedSteps.includes(step.id) ? '▼' : '▶' }} Ver detalles
                </div>
                <div class="details-content" v-if="expandedSteps.includes(step.id)">
                  <pre>{{ JSON.stringify(step.details, null, 2) }}</pre>
                </div>
              </div>
              <div class="step-duration" v-if="step.duration">
                <small>{{ formatDuration(step.duration) }}</small>
              </div>
            </div>
            
            <!-- Spinner para paso en progreso -->
            <div class="step-spinner" v-if="step.status === 'running'">
              <div class="spinner"></div>
            </div>
          </div>
        </div>

        <!-- Errores detallados -->
        <div class="error-section" v-if="errors.length > 0">
          <h4>❌ Errores Encontrados</h4>
          <div class="error-list">
            <div 
              class="error-item" 
              v-for="(error, index) in errors" 
              :key="index"
              :class="error.severity || 'error'"
            >
              <div class="error-header">
                <span class="error-code">{{ error.code || 'ERROR' }}</span>
                <span class="error-step" v-if="error.stepId">
                  (Paso: {{ getStepName(error.stepId) }})
                </span>
              </div>
              <div class="error-message">{{ error.message }}</div>
              <div class="error-details" v-if="error.details">
                <div class="details-toggle" @click="toggleErrorDetails(index)">
                  {{ expandedErrors.includes(index) ? '▼' : '▶' }} Detalles técnicos
                </div>
                <div class="details-content" v-if="expandedErrors.includes(index)">
                  <pre>{{ JSON.stringify(error.details, null, 2) }}</pre>
                </div>
              </div>
              <div class="error-timestamp" v-if="error.timestamp">
                <small>{{ formatTimestamp(error.timestamp) }}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Información de rollback -->
        <div class="rollback-section" v-if="showRollbackInfo">
          <h4>⏪ Información de Rollback</h4>
          <div class="rollback-info">
            <p>Algunos cambios pueden necesitar ser revertidos debido a errores.</p>
            <p>Los siguientes pasos serán ejecutados automáticamente:</p>
            <ul class="rollback-list">
              <li v-for="rollbackStep in getRollbackSteps()" :key="rollbackStep.id">
                {{ rollbackStep.description }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Estadísticas de la transacción -->
        <div class="stats-section" v-if="showStats">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Tiempo Total:</span>
              <span class="stat-value">{{ formatDuration(totalDuration) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Pasos Completados:</span>
              <span class="stat-value">{{ completedSteps }} / {{ steps.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Estado:</span>
              <span class="stat-value" :class="getOverallStatusClass()">
                {{ getOverallStatus() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <!-- Botones según el estado -->
        <div class="action-buttons">
          <!-- Durante ejecución -->
          <template v-if="isRunning">
            <button 
              class="btn-cancel" 
              @click="$emit('cancel')"
              :disabled="!canCancel"
            >
              {{ canCancel ? 'Cancelar Operación' : 'No se puede cancelar' }}
            </button>
            <button class="btn-info" @click="toggleAdvancedView">
              {{ showAdvanced ? 'Vista Simple' : 'Vista Avanzada' }}
            </button>
          </template>

          <!-- Completado con éxito -->
          <template v-else-if="isCompleted">
            <button class="btn-success" @click="$emit('close')">
              ✅ Transacción Completada
            </button>
            <button class="btn-secondary" @click="downloadReport">
              📄 Descargar Reporte
            </button>
          </template>

          <!-- Error o falló -->
          <template v-else-if="hasErrors">
            <button class="btn-retry" @click="$emit('retry')" v-if="canRetry">
              🔄 Reintentar
            </button>
            <button class="btn-rollback" @click="$emit('rollback')" v-if="canRollback">
              ⏪ Ejecutar Rollback
            </button>
            <button class="btn-close" @click="$emit('close')">
              Cerrar
            </button>
            <button class="btn-support" @click="contactSupport">
              📞 Contactar Soporte
            </button>
          </template>

          <!-- Estado desconocido -->
          <template v-else>
            <button class="btn-close" @click="$emit('close')">
              Cerrar
            </button>
          </template>
        </div>

        <!-- Información adicional -->
        <div class="footer-info" v-if="showAdvanced">
          <div class="transaction-id">
            <small>ID de Transacción: {{ transactionId }}</small>
          </div>
          <div class="debug-info" v-if="debugMode">
            <button class="btn-debug" @click="openDebugConsole">
              🔍 Abrir Debug Console
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TransactionProgressModal',
  props: {
    steps: {
      type: Array,
      required: true,
      default: () => []
    },
    currentStep: {
      type: Number,
      default: 0
    },
    errors: {
      type: Array,
      default: () => []
    },
    transactionId: {
      type: String,
      default: null
    },
    canCancel: {
      type: Boolean,
      default: true
    },
    canRetry: {
      type: Boolean,
      default: false
    },
    canRollback: {
      type: Boolean,
      default: false
    },
    debugMode: {
      type: Boolean,
      default: false
    },
    operationType: {
      type: String,
      default: 'unknown'
    }
  },
  emits: ['cancel', 'close', 'retry', 'rollback'],
  
  data() {
    return {
      expandedSteps: [],
      expandedErrors: [],
      showAdvanced: false,
      startTime: null,
      lastUpdateTime: null
    }
  },
  
  computed: {
    progressPercentage() {
      if (this.steps.length === 0) return 0
      
      const completedCount = this.steps.filter(step => 
        step.status === 'completed' || step.status === 'failed'
      ).length
      
      return Math.round((completedCount / this.steps.length) * 100)
    },
    
    completedSteps() {
      return this.steps.filter(step => step.status === 'completed').length
    },
    
    hasErrors() {
      return this.errors.length > 0 || 
             this.steps.some(step => step.status === 'failed')
    },
    
    hasWarnings() {
      return this.steps.some(step => step.status === 'warning') ||
             this.errors.some(error => error.severity === 'warning')
    },
    
    isRunning() {
      return this.steps.some(step => step.status === 'running')
    },
    
    isCompleted() {
      return this.steps.length > 0 && 
             this.steps.every(step => step.status === 'completed') &&
             !this.hasErrors
    },
    
    showRollbackInfo() {
      return this.hasErrors && this.canRollback
    },
    
    showStats() {
      return this.steps.length > 0 && (this.isCompleted || this.hasErrors)
    },
    
    totalDuration() {
      if (!this.startTime) return 0
      
      const endTime = this.lastUpdateTime || new Date()
      return endTime - this.startTime
    }
  },
  
  mounted() {
    this.startTime = new Date()
    this.lastUpdateTime = new Date()
  },
  
  watch: {
    currentStep() {
      this.lastUpdateTime = new Date()
    },
    
    steps: {
      handler() {
        this.lastUpdateTime = new Date()
      },
      deep: true
    }
  },
  
  methods: {
    getModalTitle() {
      const titles = {
        'CREATE_NEW': 'Creando Nueva Suscripción',
        'CHANGE_PLAN': 'Cambiando Plan de Servicio',
        'CHANGE_NODE': 'Cambiando Nodo/Torre',
        'CHANGE_ZONE': 'Cambiando Zona de Servicio',
        'CHANGE_ADDRESS': 'Actualizando Dirección'
      }
      
      return titles[this.operationType] || 'Procesando Transacción'
    },
    
    getStepClass(step, index) {
      const classes = ['step-item']
      
      classes.push(`step-${step.status}`)
      
      if (index === this.currentStep) {
        classes.push('current-step')
      }
      
      if (index < this.currentStep) {
        classes.push('past-step')
      }
      
      return classes.join(' ')
    },
    
    getStepIcon(status) {
      const icons = {
        'completed': '✅',
        'failed': '❌',
        'warning': '⚠️',
        'running': '⏳',
        'skipped': '⏭️'
      }
      return icons[status] || '❓'
    },
    
    getOverallStatus() {
      if (this.isRunning) return 'En Progreso'
      if (this.isCompleted) return 'Completado'
      if (this.hasErrors) return 'Error'
      return 'Pendiente'
    },
    
    getOverallStatusClass() {
      if (this.isRunning) return 'status-running'
      if (this.isCompleted) return 'status-completed'
      if (this.hasErrors) return 'status-error'
      return 'status-pending'
    },
    
    getStepName(stepId) {
      const step = this.steps.find(s => s.id === stepId)
      return step ? step.name : stepId
    },
    
    getRollbackSteps() {
      // Retornar pasos de rollback basados en los pasos completados
      const completedSteps = this.steps.filter(step => step.status === 'completed')
      
      return completedSteps.reverse().map(step => ({
        id: `rollback_${step.id}`,
        description: `Revertir: ${step.name}`
      }))
    },
    
    formatDuration(duration) {
      if (!duration || duration === 0) return '0s'
      
      const seconds = Math.floor(duration / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`
      } else {
        return `${seconds}s`
      }
    },
    
    formatTimestamp(timestamp) {
      if (!timestamp) return ''
      
      const date = new Date(timestamp)
      return date.toLocaleString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    
    toggleStepDetails(stepId) {
      const index = this.expandedSteps.indexOf(stepId)
      if (index > -1) {
        this.expandedSteps.splice(index, 1)
      } else {
        this.expandedSteps.push(stepId)
      }
    },
    
    toggleErrorDetails(errorIndex) {
      const index = this.expandedErrors.indexOf(errorIndex)
      if (index > -1) {
        this.expandedErrors.splice(index, 1)
      } else {
        this.expandedErrors.push(errorIndex)
      }
    },
    
    toggleAdvancedView() {
      this.showAdvanced = !this.showAdvanced
    },
    
    handleOverlayClick() {
      // Solo permitir cerrar si no está ejecutándose
      if (!this.isRunning) {
        this.$emit('close')
      }
    },
    
    downloadReport() {
      const report = {
        transactionId: this.transactionId,
        operationType: this.operationType,
        startTime: this.startTime,
        endTime: this.lastUpdateTime,
        duration: this.totalDuration,
        steps: this.steps,
        errors: this.errors,
        stats: {
          totalSteps: this.steps.length,
          completedSteps: this.completedSteps,
          failedSteps: this.steps.filter(s => s.status === 'failed').length,
          successRate: Math.round((this.completedSteps / this.steps.length) * 100)
        }
      }
      
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transaction_report_${this.transactionId || Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    
    contactSupport() {
      // Preparar información para soporte
      const supportInfo = {
        transactionId: this.transactionId,
        operationType: this.operationType,
        errors: this.errors,
        steps: this.steps,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
      
      // Copiar al portapapeles
      navigator.clipboard.writeText(JSON.stringify(supportInfo, null, 2))
        .then(() => {
          alert('Información copiada al portapapeles. Pégala en tu mensaje de soporte.')
        })
        .catch(() => {
          console.log('No se pudo copiar automáticamente. Información de soporte:', supportInfo)
        })
      
      // Abrir sistema de soporte (ajustar según tu implementación)
      // window.open('/support?transaction=' + this.transactionId, '_blank')
    },
    
    openDebugConsole() {
      // Emitir evento para abrir debug console
      this.$emit('open-debug', {
        transactionId: this.transactionId,
        steps: this.steps,
        errors: this.errors
      })
    }
  }
}
</script>

<style scoped>
.transaction-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.transaction-modal {
  background: white;
  border-radius: 12px;
  width: 90vw;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
}

.modal-header h3 {
  margin: 0 0 12px 0;
  font-size: 1.3em;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-counter {
  font-size: 0.9em;
  opacity: 0.9;
  min-width: 60px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-fill.error {
  background: #F44336;
}

.progress-fill.warning {
  background: #FF9800;
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.steps-container {
  margin-bottom: 20px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-left: 2px solid transparent;
  padding-left: 12px;
  transition: all 0.3s ease;
}

.step-item.current-step {
  border-left-color: #2196F3;
  background: #f3f8ff;
}

.step-item.step-completed {
  border-left-color: #4CAF50;
}

.step-item.step-failed {
  border-left-color: #F44336;
  background: #fff5f5;
}

.step-item.step-warning {
  border-left-color: #FF9800;
  background: #fffbf0;
}

.step-indicator {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0e0e0;
  color: #666;
  font-weight: bold;
  font-size: 0.9em;
}

.step-item.step-completed .step-indicator {
  background: #4CAF50;
  color: white;
}

.step-item.step-failed .step-indicator {
  background: #F44336;
  color: white;
}

.step-item.step-running .step-indicator {
  background: #2196F3;
  color: white;
}

.step-content {
  flex: 1;
}

.step-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.step-message {
  color: #666;
  font-size: 0.9em;
  margin-bottom: 4px;
}

.step-duration {
  color: #999;
  font-size: 0.8em;
}

.step-spinner {
  flex-shrink: 0;
  margin-top: 4px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.details-toggle {
  color: #2196F3;
  cursor: pointer;
  font-size: 0.8em;
  margin-top: 4px;
  user-select: none;
}

.details-toggle:hover {
  text-decoration: underline;
}

.details-content {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 8px;
  margin-top: 4px;
  font-size: 0.8em;
  max-height: 150px;
  overflow-y: auto;
}

.details-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-section, .rollback-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.error-section h4, .rollback-section h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-item {
  background: #fff5f5;
  border-left: 4px solid #F44336;
  border-radius: 4px;
  padding: 12px;
}

.error-item.warning {
  background: #fffbf0;
  border-left-color: #FF9800;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.error-code {
  font-weight: bold;
  color: #F44336;
  font-size: 0.9em;
}

.error-step {
  color: #666;
  font-size: 0.8em;
}

.error-message {
  color: #333;
  margin-bottom: 8px;
}

.error-timestamp {
  color: #999;
  font-size: 0.8em;
}

.rollback-info {
  background: #fff8e1;
  border-radius: 4px;
  padding: 12px;
}

.rollback-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.rollback-list li {
  margin-bottom: 4px;
  color: #666;
}

.stats-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.stat-label {
  display: block;
  font-size: 0.8em;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-weight: bold;
  font-size: 1.1em;
}

.stat-value.status-running { color: #2196F3; }
.stat-value.status-completed { color: #4CAF50; }
.stat-value.status-error { color: #F44336; }
.stat-value.status-pending { color: #666; }

.modal-footer {
  background: #f8f9fa;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.action-buttons button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
}

.btn-cancel {
  background: #F44336;
  color: white;
}

.btn-cancel:hover:not(:disabled) {
  background: #d32f2f;
}

.btn-success {
  background: #4CAF50;
  color: white;
}

.btn-success:hover {
  background: #45a049;
}

.btn-retry {
  background: #2196F3;
  color: white;
}

.btn-retry:hover {
  background: #1976d2;
}

.btn-rollback {
  background: #FF9800;
  color: white;
}

.btn-rollback:hover {
  background: #f57c00;
}

.btn-close, .btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-close:hover, .btn-secondary:hover {
  background: #bdbdbd;
}

.btn-support {
  background: #9C27B0;
  color: white;
}

.btn-support:hover {
  background: #7b1fa2;
}

.btn-info, .btn-debug {
  background: #17a2b8;
  color: white;
}

.btn-info:hover, .btn-debug:hover {
  background: #138496;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.footer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8em;
  color: #666;
}

.transaction-id {
  font-family: monospace;
}

/* Responsive */
@media (max-width: 768px) {
  .transaction-modal {
    width: 95vw;
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 16px;
  }
  
  .modal-body {
    padding: 16px;
  }
  
  .progress-indicator {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons button {
    width: 100%;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .footer-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>