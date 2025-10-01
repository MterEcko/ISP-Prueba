<template>
  <div class="subscription-form">
    <div class="form-header">
      <h3>{{ isEdit ? 'Editar Suscripción' : 'Nueva Suscripción PRUEBA' }}</h3>
      <button class="close-btn" @click="$emit('close')" v-if="showCloseButton">✕</button>
    </div>

    <!-- Loading state -->
    <div v-if="initialLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando información del cliente...</p>
    </div>

    <form @submit.prevent="handleSubmit" v-else>
      <!-- Información del Cliente (Solo lectura) -->
      <div class="form-section">
        <h4>Información del Cliente</h4>
        <div class="client-info-display">
          <div class="client-detail">
            <span class="label">Cliente:</span>
            <span class="value">{{ clientInfo.firstName }} {{ clientInfo.lastName }}</span>
          </div>
          <div class="client-detail">
            <span class="label">Email:</span>
            <span class="value">{{ clientInfo.email || 'No especificado' }}</span>
          </div>
          <div class="client-detail">
            <span class="label">Zona:</span>
            <span class="value">{{ clientInfo.Zone?.name || 'No asignada' }}</span>
          </div>
          <div class="client-detail">
            <span class="label">Nodo:</span>
            <span class="value">{{ clientInfo.Node?.name || 'No asignado' }}</span>
          </div>
        </div>
      </div>

      <!-- Suscripción Actual (si existe) -->
      <div class="form-section" v-if="existingSubscription">
        <h4>Suscripción Actual</h4>
        <div class="current-subscription">
          <SubscriptionCard 
            :subscription="existingSubscription" 
            :showActions="false"
            :compact="true"
          />
          <div class="subscription-actions">
            <button type="button" @click="loadExistingSubscription" class="btn-load">
              Cargar datos de suscripción actual
            </button>
          </div>
        </div>
      </div>

      <!-- Sección: Paquete de Servicio -->
      <div class="form-section">
        <h4>Paquete de Servicio</h4>
        
        <!-- Loading de paquetes -->
        <div v-if="loadingPackages" class="loading-text">
          Cargando paquetes disponibles para la zona...
        </div>
        
        <!-- No hay paquetes disponibles -->
        <div v-else-if="availablePackages.length === 0" class="no-packages">
          <p>No hay paquetes de servicio disponibles para la zona "{{ clientInfo.Zone?.name }}".</p>
          <button type="button" @click="loadAllPackages" class="btn-secondary">
            Cargar todos los paquetes
          </button>
        </div>
        
        <!-- Selector de paquetes -->
        <div v-else>
          <div class="form-row">
            <div class="form-group">
              <label for="servicePackageId">Paquete *</label>
              <select 
                id="servicePackageId" 
                v-model="formData.servicePackageId" 
                required
                @change="onPackageChange"
              >
                <option value="">Seleccionar paquete</option>
                <option 
                  v-for="pkg in availablePackages" 
                  :key="pkg.id" 
                  :value="pkg.id"
                >
                  {{ pkg.name }} - {{ pkg.downloadSpeedMbps }}↓/{{ pkg.uploadSpeedMbps }}↑ Mbps - ${{ pkg.price }}
                </option>
              </select>
            </div>
          </div>

          <!-- Vista previa del paquete seleccionado -->
          <div class="package-preview" v-if="selectedPackage">
            <div class="preview-header">
              <h5>{{ selectedPackage.name }}</h5>
              <span class="package-price">${{ selectedPackage.price }}/mes</span>
            </div>
            <div class="preview-details">
              <div class="preview-item">
                <span class="preview-label">Velocidad:</span>
                <span class="preview-value">
                  ↓{{ selectedPackage.downloadSpeedMbps }}Mbps / ↑{{ selectedPackage.uploadSpeedMbps }}Mbps
                </span>
              </div>
              <div class="preview-item" v-if="selectedPackage.dataLimitGb">
                <span class="preview-label">Límite de datos:</span>
                <span class="preview-value">{{ selectedPackage.dataLimitGb }}GB</span>
              </div>
              <div class="preview-item">
                <span class="preview-label">Facturación:</span>
                <span class="preview-value">{{ formatBillingCycle(selectedPackage.billingCycle) }}</span>
              </div>
              <div class="preview-item" v-if="selectedPackage.description">
                <span class="preview-label">Descripción:</span>
                <span class="preview-value">{{ selectedPackage.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección: Router -->
      <div class="form-section" v-if="formData.servicePackageId">
        <h4>Configuración de Red</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="primaryRouterId">Router Principal *</label>
            <select 
              id="primaryRouterId" 
              v-model="formData.primaryRouterId" 
              required
            >
              <option value="">Seleccionar router</option>
              <option 
                v-for="router in availableRouters" 
                :key="router.id" 
                :value="router.id"
              >
                {{ router.name }} - {{ router.ipAddress }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Sección: Configuración de Precios -->
      <div class="form-section" v-if="selectedPackage">
        <h4>Configuración de Precios</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="customPrice">Precio Personalizado</label>
            <input 
              type="number" 
              id="customPrice" 
              v-model="formData.customPrice" 
              step="0.01" 
              min="0"
              :placeholder="`Precio del paquete: $${selectedPackage.price}`"
            />
            <small class="form-help">Solo si es diferente al precio del paquete (${{ selectedPackage.price }})</small>
          </div>
          
          <div class="form-group">
            <label for="promoDiscount">Descuento Promocional (%)</label>
            <input 
              type="number" 
              id="promoDiscount" 
              v-model="formData.promoDiscount" 
              min="0" 
              max="100"
              placeholder="0"
            />
          </div>
        </div>

        <div class="price-summary">
          <div class="price-calculation">
            <div class="calc-line">
              <span>Precio base:</span>
              <span>${{ basePrice }}</span>
            </div>
            <div class="calc-line" v-if="formData.promoDiscount > 0">
              <span>Descuento ({{ formData.promoDiscount }}%):</span>
              <span>-${{ discountAmount }}</span>
            </div>
            <div class="calc-line final">
              <span>Precio final:</span>
              <span class="final-price">${{ finalPrice }}/mes</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección: Configuración de Facturación -->
      <div class="form-section" v-if="selectedPackage">
        <h4>Configuración de Facturación</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="billingDay">Día de Facturación</label>
            <select id="billingDay" v-model="formData.billingDay">
              <option v-for="day in 31" :key="day" :value="day">
                Día {{ day }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <div class="checkbox-group">
              <input 
                type="checkbox" 
                id="autoCreateBilling" 
                v-model="formData.autoCreateBilling"
              />
              <label for="autoCreateBilling">Crear facturación automática</label>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección: Configuración PPPoE (Opcional) -->
      <div class="form-section" v-if="formData.primaryRouterId">
        <h4>Configuración PPPoE (Opcional)</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="pppoeUsername">Usuario PPPoE</label>
            <input 
              type="text" 
              id="pppoeUsername" 
              v-model="formData.pppoeConfig.username"
              :placeholder="suggestedPPPoEUsername"
            />
            <small class="form-help">Se generará automáticamente si se deja vacío</small>
          </div>
          
          <div class="form-group">
            <label for="pppoePassword">Contraseña PPPoE</label>
            <input 
              type="text" 
              id="pppoePassword" 
              v-model="formData.pppoeConfig.password"
              placeholder="Se generará automáticamente si se deja vacío"
            />
          </div>
        </div>
      </div>

      <!-- Sección: Notas -->
      <div class="form-section">
        <h4>Notas</h4>
        <div class="form-group full-width">
          <label for="notes">Notas adicionales</label>
          <textarea 
            id="notes" 
            v-model="formData.notes" 
            rows="3"
            placeholder="Comentarios, condiciones especiales, etc."
          ></textarea>
        </div>
      </div>

      <!-- Errores de validación -->
      <div class="form-errors" v-if="validationErrors.length > 0">
        <div class="error-list">
          <div class="error-item" v-for="error in validationErrors" :key="error">
            {{ error }}
          </div>
        </div>
      </div>

      <!-- Botones de acción -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn-cancel">
          Cancelar
        </button>
        <button type="submit" class="btn-submit" :disabled="loading || !isFormValid">
          {{ loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Suscripción') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import SubscriptionService from '../services/subscription.service';
import ServicePackageService from '../services/servicePackage.service';
import ClientService from '../services/client.service';
import SubscriptionCard from './SubscriptionCard.vue';

export default {
  name: 'SubscriptionForm',
  components: {
    SubscriptionCard
  },
  props: {
    subscription: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'cancel', 'created', 'updated', 'success'],
  data() {
    return {
      initialLoading: true,
      loading: false,
      loadingPackages: false,
      clientId: null,
      clientInfo: {},
      existingSubscription: null,
      formData: {
        clientId: null,
        servicePackageId: null,
        primaryRouterId: null,
        customPrice: null,
        promoDiscount: 0,
        billingDay: 1,
        notes: '',
        autoCreateBilling: true,
        pppoeConfig: {
          username: '',
          password: ''
        }
      },
      availablePackages: [],
      availableRouters: [],
      validationErrors: []
    };
  },
  computed: {
    isEdit() {
      return this.subscription !== null;
    },
    selectedPackage() {
      if (!this.formData.servicePackageId) return null;
      return this.availablePackages.find(pkg => pkg.id == this.formData.servicePackageId);
    },
    basePrice() {
      if (this.formData.customPrice && parseFloat(this.formData.customPrice) > 0) {
        return parseFloat(this.formData.customPrice);
      }
      return this.selectedPackage?.price || 0;
    },
    discountAmount() {
      if (!this.formData.promoDiscount || this.formData.promoDiscount <= 0) return 0;
      return (this.basePrice * (parseFloat(this.formData.promoDiscount) / 100)).toFixed(2);
    },
    finalPrice() {
      if (!this.selectedPackage && !this.formData.customPrice) return null;
      return (this.basePrice - parseFloat(this.discountAmount)).toFixed(2);
    },
    isFormValid() {
      return this.formData.clientId && 
             this.formData.servicePackageId && 
             this.formData.primaryRouterId &&
             this.validationErrors.length === 0;
    },
    suggestedPPPoEUsername() {
      if (!this.clientInfo.firstName || !this.clientInfo.lastName) return '';
      return `${this.clientInfo.firstName.toLowerCase()}.${this.clientInfo.lastName.toLowerCase()}`;
    }
  },
  async created() {
    await this.initializeForm();
  },
  methods: {
    async initializeForm() {
      try {
        this.initialLoading = true;
        
        // Obtener ID del cliente desde la ruta
        this.clientId = parseInt(this.$route.params.id);
        this.formData.clientId = this.clientId;
        
        // Cargar información del cliente
        await this.loadClientInfo();
        
        // Cargar suscripción existente si hay
        await this.loadExistingSubscription();
        
        // Si estamos editando, cargar datos de la suscripción
        if (this.subscription) {
          this.loadSubscriptionData();
        }
        
        // Cargar paquetes de la zona del cliente
        await this.loadServicePackages();
        
        // Cargar routers
        await this.loadRouters();
        
      } catch (error) {
        console.error('Error inicializando formulario:', error);
        this.validationErrors.push('Error cargando datos del formulario');
      } finally {
        this.initialLoading = false;
      }
    },
    
    async loadClientInfo() {
      try {
        const response = await ClientService.getClient(this.clientId);
        this.clientInfo = response.data;
        console.log('Información del cliente cargada:', this.clientInfo);
      } catch (error) {
        console.error('Error cargando información del cliente:', error);
        this.validationErrors.push('Error cargando información del cliente');
      }
    },
    
    async loadExistingSubscription() {
      try {
        const response = await SubscriptionService.getClientSubscriptions(this.clientId, false);
        const subscriptions = response.data.data || response.data.subscriptions || [];
        
        // Buscar suscripción activa
        this.existingSubscription = subscriptions.find(sub => sub.status === 'active') || 
                                   subscriptions.find(sub => sub.status === 'suspended') ||
                                   subscriptions[0] || null;
        
        console.log('Suscripción existente:', this.existingSubscription);
      } catch (error) {
        console.error('Error cargando suscripción existente:', error);
        // No es un error crítico, el cliente puede no tener suscripciones
      }
    },
    
    loadSubscriptionData() {
      if (!this.subscription) return;
      
      this.formData = {
        clientId: this.subscription.clientId,
        servicePackageId: this.subscription.servicePackageId,
        primaryRouterId: this.subscription.primaryRouterId || null,
        customPrice: this.subscription.monthlyFee !== this.subscription.ServicePackage?.price ? 
                     this.subscription.monthlyFee : null,
        promoDiscount: 0,
        billingDay: this.subscription.billingDay || 1,
        notes: this.subscription.notes || '',
        autoCreateBilling: true,
        pppoeConfig: {
          username: this.subscription.pppoeUsername || '',
          password: ''
        }
      };
    },
    
    loadExistingSubscriptionData() {
      if (!this.existingSubscription) return;
      
      // Cargar datos de la suscripción existente al formulario
      this.formData.servicePackageId = this.existingSubscription.servicePackageId;
      this.formData.customPrice = this.existingSubscription.monthlyFee !== this.existingSubscription.ServicePackage?.price ? 
                                 this.existingSubscription.monthlyFee : null;
      this.formData.billingDay = this.existingSubscription.billingDay || 1;
      this.formData.notes = this.existingSubscription.notes || '';
      this.formData.pppoeConfig.username = this.existingSubscription.pppoeUsername || '';
      
      // Trigger el cambio de paquete para cargar datos
      this.onPackageChange();
    },
    
    async loadServicePackages() {
      try {
        this.loadingPackages = true;
        
        const params = { active: true };
        
        // Si el cliente tiene zona asignada, filtrar por zona
        if (this.clientInfo.zoneId) {
          params.zoneId = this.clientInfo.zoneId;
        }
        
        const response = await ServicePackageService.getAllServicePackages(params);
        this.availablePackages = response.data || [];
        
        console.log(`Paquetes cargados para zona ${this.clientInfo.Zone?.name}:`, this.availablePackages);
        
      } catch (error) {
        console.error('Error cargando paquetes de servicio:', error);
        this.validationErrors.push('Error cargando paquetes de servicio');
      } finally {
        this.loadingPackages = false;
      }
    },
    
    async loadAllPackages() {
      try {
        this.loadingPackages = true;
        
        const response = await ServicePackageService.getAllServicePackages({ active: true });
        this.availablePackages = response.data || [];
        
        console.log('Todos los paquetes cargados:', this.availablePackages);
        
      } catch (error) {
        console.error('Error cargando todos los paquetes:', error);
      } finally {
        this.loadingPackages = false;
      }
    },
    
    async loadRouters() {
      try {
        // Aquí necesitarías un servicio para obtener routers de la zona del cliente
        // Por ahora simulo algunos datos basados en la zona
        this.availableRouters = [
          { id: 1, name: `Router ${this.clientInfo.Zone?.name || 'Principal'}`, ipAddress: '192.168.1.1' },
          { id: 2, name: 'Router Secundario', ipAddress: '192.168.2.1' },
          { id: 3, name: 'Router Respaldo', ipAddress: '192.168.3.1' }
        ];
      } catch (error) {
        console.error('Error cargando routers:', error);
      }
    },
    
    onPackageChange() {
      // Limpiar precio personalizado cuando cambia el paquete
      this.formData.customPrice = null;
      this.clearValidationErrors();
      
      // Auto-completar datos basados en el paquete
      if (this.selectedPackage) {
        console.log('Paquete seleccionado:', this.selectedPackage);
      }
    },
    
    formatBillingCycle(cycle) {
      const cycles = {
        'monthly': 'Mensual',
        'yearly': 'Anual',
        'quarterly': 'Trimestral'
      };
      return cycles[cycle] || cycle;
    },
    
    validateForm() {
      this.validationErrors = SubscriptionService.validateSubscriptionData(this.formData);
      return this.validationErrors.length === 0;
    },
    
    clearValidationErrors() {
      this.validationErrors = [];
    },
    
    async handleSubmit() {
      if (!this.validateForm()) {
        return;
      }

      try {
        this.loading = true;
        
        const subscriptionData = SubscriptionService.normalizeSubscriptionData(this.formData);
        
        if (this.isEdit) {
          console.warn('La edición de suscripciones no está implementada completamente');
          this.$emit('updated', subscriptionData);
        } else {
          const response = await SubscriptionService.createSubscription(subscriptionData);
          this.$emit('created', response.data);
        }
        
        this.$emit('success', {
          action: this.isEdit ? 'updated' : 'created',
          subscription: subscriptionData
        });
        
      } catch (error) {
        console.error('Error guardando suscripción:', error);
        this.validationErrors.push(
          error.response?.data?.message || 'Error guardando la suscripción'
        );
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>


<style scoped>
.subscription-form {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.form-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #666;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background-color: #f5f5f5;
}

.form-section {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 6px;
}

.form-section h4 {
  margin: 0 0 16px 0;
  color: #555;
  font-size: 1.1em;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
}

.full-width {
  width: 100%;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  color: #555;
  font-size: 0.9em;
}

input, select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.form-help {
  display: block;
  margin-top: 4px;
  font-size: 0.8em;
  color: #666;
  font-style: italic;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.checkbox-group label {
  margin: 0;
  font-weight: normal;
  cursor: pointer;
}

/* Vista previa del paquete */
.package-preview {
  margin-top: 12px;
  padding: 12px;
  background-color: #e8f5e9;
  border-radius: 4px;
  border-left: 4px solid #4CAF50;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.preview-item:last-child {
  margin-bottom: 0;
}

.preview-label {
  color: #555;
  font-size: 0.9em;
}

.preview-value {
  font-weight: bold;
  color: #2e7d32;
}

/* Resumen de precios */
.price-summary {
  margin-top: 16px;
  padding: 16px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.price-calculation {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calc-line {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.calc-line.final {
  border-top: 1px solid #ddd;
  padding-top: 8px;
  margin-top: 4px;
  font-weight: bold;
}

.final-price {
  color: #4CAF50;
  font-size: 1.2em;
}

/* Errores de validación */
.form-errors {
  margin-bottom: 20px;
}

.error-list {
  background-color: #ffebee;
  border: 1px solid #f44336;
  border-radius: 4px;
  padding: 12px;
}

.error-item {
  color: #c62828;
  font-size: 0.9em;
  margin-bottom: 4px;
}

.error-item:last-child {
  margin-bottom: 0;
}

/* Botones de acción */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.btn-cancel, .btn-submit {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s;
}

.btn-cancel {
  background-color: #e0e0e0;
  color: #333;
}

.btn-cancel:hover {
  background-color: #bdbdbd;
}

.btn-submit {
  background-color: #4CAF50;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background-color: #45a049;
}

.btn-submit:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .subscription-form {
    padding: 16px;
  }
  
  .form-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .btn-cancel, .btn-submit {
    width: 100%;
  }
}
</style>