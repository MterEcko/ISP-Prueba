<template>
  <div class="currency-config">
    <div class="config-header">
      <h3>Configuración Regional</h3>
      <p>Selecciona el país para configurar la divisa y formato de números</p>
    </div>

    <div class="config-form">
      <div class="form-group">
        <label for="country-select">País / Región:</label>
        <select 
          id="country-select"
          v-model="selectedConfig"
          @change="updatePreview"
          class="form-control"
        >
          <option value="">Seleccionar país...</option>
          <option 
            v-for="config in availableConfigs" 
            :key="config.locale"
            :value="config"
          >
            {{ config.country }} ({{ config.currency }})
          </option>
        </select>
      </div>

      <div class="preview-section" v-if="selectedConfig">
        <h4>Vista previa de formato:</h4>
        <div class="preview-examples">
          <div class="preview-item">
            <span class="preview-label">Precio:</span>
            <span class="preview-value">{{ formatPreviewCurrency(1234.56) }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">Número:</span>
            <span class="preview-value">{{ formatPreviewNumber(9876.54) }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">Entero:</span>
            <span class="preview-value">{{ formatPreviewNumber(15000, { decimals: 0 }) }}</span>
          </div>
        </div>
      </div>

      <div class="current-config" v-if="currentConfig">
        <h4>Configuración actual:</h4>
        <div class="config-details">
          <div class="config-item">
            <span class="config-label">País:</span>
            <span class="config-value">{{ getCurrentCountryName() }}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Divisa:</span>
            <span class="config-value">{{ currentConfig.currency }} ({{ currentConfig.symbol }})</span>
          </div>
          <div class="config-item">
            <span class="config-label">Formato:</span>
            <span class="config-value">{{ currentConfig.locale }}</span>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button 
          @click="saveConfiguration"
          :disabled="!selectedConfig || saving"
          class="btn btn-primary"
        >
          {{ saving ? 'Guardando...' : 'Guardar Configuración' }}
        </button>
        
        <button 
          @click="resetToDetected"
          class="btn btn-secondary"
        >
          Detectar Automáticamente
        </button>
      </div>

      <div class="help-section">
        <h4>💡 Información:</h4>
        <ul>
          <li>La configuración se aplica automáticamente en todo el sistema</li>
          <li>Los formatos de fecha y hora también se ajustarán al país seleccionado</li>
          <li>La detección automática usa la zona horaria de tu navegador</li>
          <li>Puedes cambiar esta configuración en cualquier momento</li>
        </ul>
      </div>
    </div>

    <!-- Notificación -->
    <div v-if="notification.show" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script>
import DashboardService from '../services/dashboard.service.js';

export default {
  name: 'CurrencyConfig',
  data() {
    return {
      selectedConfig: null,
      currentConfig: null,
      availableConfigs: [],
      saving: false,
      notification: {
        show: false,
        type: 'success',
        message: ''
      }
    };
  },
  mounted() {
    this.loadConfigurations();
    this.loadCurrentConfig();
  },
  methods: {
    loadConfigurations() {
      this.availableConfigs = DashboardService.getAvailableConfigurations();
    },

    loadCurrentConfig() {
      this.currentConfig = DashboardService.getSystemConfig();
    },

    updatePreview() {
      // La vista previa se actualiza automáticamente por el reactive binding
    },

    formatPreviewCurrency(amount) {
      if (!this.selectedConfig) return '';
      
      return new Intl.NumberFormat(this.selectedConfig.locale, {
        style: 'currency',
        currency: this.selectedConfig.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    },

    formatPreviewNumber(number, options = {}) {
      if (!this.selectedConfig) return '';
      
      return new Intl.NumberFormat(this.selectedConfig.locale, {
        minimumFractionDigits: options.decimals || 2,
        maximumFractionDigits: options.decimals || 2
      }).format(number);
    },

    getCurrentCountryName() {
      const config = this.availableConfigs.find(c => 
        c.locale === this.currentConfig.locale && 
        c.currency === this.currentConfig.currency
      );
      return config ? config.country : 'Configuración personalizada';
    },

    async saveConfiguration() {
      if (!this.selectedConfig) return;
      
      this.saving = true;
      
      try {
        const success = DashboardService.updateSystemConfig(this.selectedConfig);
        
        if (success) {
          this.currentConfig = { ...this.selectedConfig };
          this.showNotification('success', '✅ Configuración guardada correctamente');
          
          // Emitir evento para que otros componentes se actualicen
          this.$emit('config-updated', this.selectedConfig);
          
          // Opcional: recargar la página para aplicar cambios inmediatamente
          setTimeout(() => {
            if (confirm('¿Deseas recargar la página para aplicar los cambios inmediatamente?')) {
              window.location.reload();
            }
          }, 1500);
        } else {
          this.showNotification('error', '❌ Error al guardar la configuración');
        }
      } catch (error) {
        console.error('Error saving configuration:', error);
        this.showNotification('error', '❌ Error inesperado al guardar');
      } finally {
        this.saving = false;
      }
    },

    resetToDetected() {
      const detectedConfig = DashboardService.getDefaultConfigByTimezone();
      this.selectedConfig = this.availableConfigs.find(c => 
        c.locale === detectedConfig.locale && 
        c.currency === detectedConfig.currency
      ) || this.availableConfigs[0];
      
      this.showNotification('info', '🔍 Configuración detectada automáticamente');
    },

    showNotification(type, message) {
      this.notification = {
        show: true,
        type,
        message
      };
      
      setTimeout(() => {
        this.notification.show = false;
      }, 3000);
    }
  }
};
</script>

<style scoped>
.currency-config {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.config-header {
  text-align: center;
  margin-bottom: 30px;
}

.config-header h3 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.config-header p {
  color: #7f8c8d;
  font-size: 0.9rem;
}

.config-form {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #34495e;
}

.form-control {
  width: 100%;
  padding: 10px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: #3498db;
}

.preview-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  margin: 20px 0;
}

.preview-section h4 {
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.preview-examples {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-label {
  font-weight: 500;
  color: #7f8c8d;
}

.preview-value {
  font-weight: 600;
  color: #2c3e50;
  font-family: 'Courier New', monospace;
}

.current-config {
  background: #e8f5e9;
  padding: 15px;
  border-radius: 6px;
  margin: 20px 0;
}

.current-config h4 {
  color: #2e7d32;
  margin-bottom: 10px;
  font-size: 1rem;
}

.config-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  justify-content: space-between;
}

.config-label {
  font-weight: 500;
  color: #4caf50;
}

.config-value {
  font-weight: 600;
  color: #2e7d32;
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-primary:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background-color: #7f8c8d;
}

.help-section {
  background: #fff3cd;
  padding: 15px;
  border-radius: 6px;
  margin-top: 20px;
}

.help-section h4 {
  color: #856404;
  margin-bottom: 10px;
  font-size: 1rem;
}

.help-section ul {
  margin: 0;
  padding-left: 20px;
}

.help-section li {
  color: #856404;
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

.notification.success {
  background-color: #27ae60;
}

.notification.error {
  background-color: #e74c3c;
}

.notification.info {
  background-color: #3498db;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 600px) {
  .currency-config {
    padding: 10px;
  }
  
  .config-form {
    padding: 20px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .preview-item,
  .config-item {
    flex-direction: column;
    gap: 5px;
  }
}
</style>