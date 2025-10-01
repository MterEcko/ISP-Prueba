<template>
  <div class="subscription-form">
    <div class="form-header">
      <h3>{{ isEdit ? 'Editar Suscripción' : 'Nueva Suscripción' }}</h3>
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
            <span class="value">{{ getZoneName() }}</span>
          </div>
          <div class="client-detail">
            <span class="label">Nodo:</span>
            <span class="value">{{ getNodeName() }}</span>
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
            <button type="button" @click="loadExistingSubscriptionData" class="btn-load">
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
          <p>No hay paquetes de servicio disponibles para la zona "{{ getZoneName() }}".</p>
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
import DeviceService from '../services/device.service';

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
    if (!this.formData.servicePackageId || !Array.isArray(this.availablePackages)) {
      return null;
    }
    return this.availablePackages.find(pkg => pkg.id == this.formData.servicePackageId) || null;
  },
  basePrice() {
    if (this.formData.customPrice && parseFloat(this.formData.customPrice) > 0) {
      return parseFloat(this.formData.customPrice);
    }
    
    // Asegurar que selectedPackage existe y tiene precio
    if (!this.selectedPackage || !this.selectedPackage.price) {
      return 0;
    }
    
    return parseFloat(this.selectedPackage.price) || 0;
  },
  discountAmount() {
    if (!this.formData.promoDiscount || this.formData.promoDiscount <= 0) return 0;
    return (this.basePrice * (parseFloat(this.formData.promoDiscount) / 100)).toFixed(2);
  },
  finalPrice() {
    if (!this.selectedPackage && !this.formData.customPrice) return null;
    return (this.basePrice - parseFloat(this.discountAmount || 0)).toFixed(2);
  },
  isFormValid() {
    return this.formData.clientId && 
           this.formData.servicePackageId && 
           this.formData.primaryRouterId &&
           this.validationErrors.length === 0;
  },
  suggestedPPPoEUsername() {
    if (!this.clientInfo.firstName || !this.clientInfo.lastName) return '';
    
    const firstName = this.clientInfo.firstName.toLowerCase().replace(/[^a-z]/g, '');
    const lastName = this.clientInfo.lastName.toLowerCase().replace(/[^a-z]/g, '');
    
    return `${firstName}${lastName.substring(0, 3)}`;
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
        
        console.log('🔄 Inicializando formulario para cliente ID:', this.clientId);
        
        // Cargar información del cliente
        await this.loadClientInfo();
        
        // Cargar suscripción existente si hay
        await this.loadExistingSubscription();
        
        // Si estamos editando una suscripción específica, cargar sus datos
        if (this.subscription) {
          this.loadSubscriptionData();
        } else if (this.existingSubscription && this.$route.name === 'EditServiceClient') {
          // Si estamos en modo edición pero no tenemos suscripción específica, usar la existente
          this.loadExistingSubscriptionData();
        }
        
        // Cargar paquetes de la zona del cliente
        await this.loadServicePackages();
        
        // Cargar routers
        await this.loadRouters();
		

        
      } catch (error) {
        console.error('❌ Error inicializando formulario:', error);
        this.validationErrors.push('Error cargando datos del formulario');
      } finally {
        this.initialLoading = false;
      }
    },

        getCurrentRouterName() {
          if (!this.existingSubscription?.primaryRouterId) return 'No asignado';

           const router = this.availableRouters.find(r => r.id == this.existingSubscription.primaryRouterId);
           return router ? `${router.name} (${router.ipAddress})` : 'Router no encontrado';
        },
    
    async loadClientInfo() {
      try {
        console.log('🔄 Cargando información del cliente...');
        const response = await ClientService.getClient(this.clientId);
        this.clientInfo = response.data;
        
        console.log('✅ Cliente cargado:', {
          name: `${this.clientInfo.firstName} ${this.clientInfo.lastName}`,
          zoneId: this.clientInfo.zoneId,
          zoneName: this.clientInfo.Zone?.name,
          nodeId: this.clientInfo.nodeId,
          nodeName: this.clientInfo.Node?.name,
          subscriptions: this.clientInfo.subscriptions?.length || 0
        });
        
        // Verificar que el cliente tenga zona y nodo asignados
        if (!this.clientInfo.zoneId) {
          this.validationErrors.push('El cliente debe tener una zona asignada para crear suscripciones');
        }
        if (!this.clientInfo.nodeId) {
          this.validationErrors.push('El cliente debe tener un nodo asignado para crear suscripciones');
        }
      } catch (error) {
        console.error('❌ Error cargando información del cliente:', error);
        this.validationErrors.push('Error cargando información del cliente');
      }
    },
    
async loadExistingSubscription() {
  try {
    console.log('🔄 Buscando suscripciones existentes...');
    const response = await SubscriptionService.getClientSubscriptions(this.clientId, true);
    
    console.log('📋 Respuesta completa de suscripciones:', response);
    
    // Manejar diferentes estructuras de respuesta del backend
    let subscriptions = [];
    
    if (response.data) {
      if (Array.isArray(response.data)) {
        subscriptions = response.data;
      } else if (response.data.subscriptions && Array.isArray(response.data.subscriptions)) {
        subscriptions = response.data.subscriptions;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        subscriptions = response.data.data;
      }
    }
    
    console.log('📋 Suscripciones procesadas:', subscriptions);
    
    if (subscriptions && subscriptions.length > 0) {
      // Buscar suscripción activa primero, luego suspendida, luego cualquiera
      this.existingSubscription = subscriptions.find(sub => sub.status === 'active') || 
                                 subscriptions.find(sub => sub.status === 'suspended') ||
                                 subscriptions[0];
      
      console.log('✅ Suscripción existente seleccionada:', {
        id: this.existingSubscription?.id,
        status: this.existingSubscription?.status,
        packageName: this.existingSubscription?.ServicePackage?.name
      });
    } else {
      this.existingSubscription = null;
      console.log('ℹ️ No se encontraron suscripciones para el cliente');
    }
    
  } catch (error) {
    console.error('❌ Error cargando suscripción existente:', error);
    this.existingSubscription = null;
    // No es un error crítico, el cliente puede no tener suscripciones
  }
},

    
loadSubscriptionData() {
  if (!this.subscription) return;
  
  console.log('🔄 Cargando datos de suscripción para edición:', this.subscription);
  
  this.formData = {
    clientId: this.subscription.clientId,
    servicePackageId: this.subscription.servicePackageId,
    
    // ✅ MANTENER EL ROUTER ACTUAL en modo edición
    primaryRouterId: this.subscription.primaryRouterId || 
                    this.subscription.mikrotikRouterId || // Por si viene con otro nombre
                    null,
                    
    customPrice: this.subscription.monthlyFee !== this.subscription.ServicePackage?.price ? 
                 this.subscription.monthlyFee : null,
    promoDiscount: 0,
    billingDay: this.subscription.billingDay || 1,
    notes: this.subscription.notes || '',
    autoCreateBilling: true,
    pppoeConfig: {
      username: this.subscription.pppoeUsername || '',
      password: '' // No cargar la contraseña por seguridad
    }
  };
  
  console.log('✅ Modo edición: Router actual mantenido:', this.formData.primaryRouterId);
},

  
loadExistingSubscriptionData() {
  if (!this.existingSubscription) {
    console.log('⚠️ No hay suscripción existente para cargar');
    return;
  }
  
  console.log('🔄 Cargando datos de suscripción existente:', this.existingSubscription);
  
  // Cargar datos de la suscripción existente al formulario
  this.formData.servicePackageId = this.existingSubscription.servicePackageId;
  
  // ✅ MANTENER EL ROUTER ACTUAL cuando se cambia de plan
  this.formData.primaryRouterId = this.existingSubscription.primaryRouterId || null;
  
  // Manejar precio personalizado de forma segura
  const monthlyFee = parseFloat(this.existingSubscription.monthlyFee || 0);
  const packagePrice = parseFloat(this.existingSubscription.ServicePackage?.price || 0);
  
  if (monthlyFee > 0 && monthlyFee !== packagePrice) {
    this.formData.customPrice = monthlyFee;
  } else {
    this.formData.customPrice = null;
  }
  
  this.formData.billingDay = this.existingSubscription.billingDay || 1;
  this.formData.notes = this.existingSubscription.notes || '';
  this.formData.pppoeConfig.username = this.existingSubscription.pppoeUsername || '';
  
  console.log('✅ Datos cargados al formulario (manteniendo router actual):', {
    servicePackageId: this.formData.servicePackageId,
    primaryRouterId: this.formData.primaryRouterId, // ✅ Router se mantiene
    customPrice: this.formData.customPrice,
    billingDay: this.formData.billingDay,
    pppoeUsername: this.formData.pppoeConfig.username
  });
  
  // Trigger el cambio de paquete para cargar datos relacionados
  this.$nextTick(() => {
    this.onPackageChange();
  });
},
    
async loadServicePackages() {
  try {
    this.loadingPackages = true;
    console.log('🔄 Cargando paquetes de servicio...');
    
    const params = { active: true };
    
    // Si el cliente tiene zona asignada, filtrar por zona
    if (this.clientInfo.zoneId) {
      params.zoneId = this.clientInfo.zoneId;
      console.log('🔍 Filtrando por zona ID:', this.clientInfo.zoneId);
    }
    
    const response = await ServicePackageService.getAllServicePackages(params);
    
    // ✅ VALIDACIÓN: Asegurar que siempre sea un array
    this.availablePackages = Array.isArray(response.data) ? response.data : 
                           Array.isArray(response.data.packages) ? response.data.packages :
                           Array.isArray(response.data.data) ? response.data.data :
                           [];
    
    console.log('✅ Paquetes cargados:', {
      zona: this.getZoneName(),
      cantidad: this.availablePackages.length,
      paquetes: this.availablePackages.map(p => p.name)
    });
    
  } catch (error) {
    console.error('❌ Error cargando paquetes de servicio:', error);
    this.availablePackages = []; // ✅ Asegurar array vacío en caso de error
    this.validationErrors.push('Error cargando paquetes de servicio');
  } finally {
    this.loadingPackages = false;
  }
},
    
    async loadAllPackages() {
      try {
        this.loadingPackages = true;
        console.log('🔄 Cargando TODOS los paquetes...');
        
        const response = await ServicePackageService.getAllServicePackages({ active: true });
        this.availablePackages = response.data || [];
        
        console.log('✅ Todos los paquetes cargados:', this.availablePackages.length);
        
      } catch (error) {
        console.error('❌ Error cargando todos los paquetes:', error);
      } finally {
        this.loadingPackages = false;
      }
    },
    
async loadRouters() {
  try {
    console.log('🔄 Cargando routers Mikrotik disponibles...');
    
    // Obtener dispositivos Mikrotik activos
    const response = await DeviceService.getMikrotikDevices();
    const devices = Array.isArray(response.data) ? response.data :
                   Array.isArray(response.data.devices) ? response.data.devices :
                   Array.isArray(response.data.data) ? response.data.data :
                   [];
    
    // Filtrar solo routers activos
    this.availableRouters = devices
      .filter(device => 
        (device.status === 'online' || device.status === 'active') &&
        device.type === 'router'
      )
      .map(device => ({
        id: device.id,
        name: device.name,
        ipAddress: device.ipAddress,
        deviceId: device.id,
        nodeId: device.nodeId
      }));
    
    console.log('✅ Routers cargados:', {
      total: this.availableRouters.length,
      routers: this.availableRouters.map(r => `${r.name} (${r.ipAddress})`)
    });
    
    // ✅ SI YA HAY UN ROUTER SELECCIONADO (modo edición/cambio de plan), mantenerlo
    if (this.formData.primaryRouterId) {
      const currentRouter = this.availableRouters.find(r => r.id == this.formData.primaryRouterId);
      if (currentRouter) {
        console.log('✅ Router actual encontrado y mantenido:', currentRouter.name);
      } else {
        console.warn('⚠️ Router actual no encontrado en la lista, reseteando selección');
        this.formData.primaryRouterId = null;
      }
    }
    
    // Si NO hay router seleccionado Y el cliente tiene nodo asignado, sugerir routers del nodo
    if (!this.formData.primaryRouterId && this.clientInfo.nodeId) {
      const nodeRouters = this.availableRouters.filter(router => 
        router.nodeId === this.clientInfo.nodeId
      );
      
      if (nodeRouters.length > 0) {
        // Reordenar para que los routers del nodo aparezcan primero
        this.availableRouters = [
          ...nodeRouters,
          ...this.availableRouters.filter(router => router.nodeId !== this.clientInfo.nodeId)
        ];
        
        console.log('📍 Priorizados routers del nodo del cliente:', nodeRouters.length);
      }
    }
    
  } catch (error) {
    console.error('❌ Error cargando routers:', error);
    this.availableRouters = []; // ✅ Asegurar array vacío en caso de error
    this.validationErrors.push('Error cargando routers disponibles');
  }
},

    // Métodos auxiliares para obtener nombres
    getZoneName() {
      return this.clientInfo.Zone?.name || 'No asignada';
    },
    
    getNodeName() {
      return this.clientInfo.Node?.name || 'No asignado';
    },
    
onPackageChange() {
  console.log('🔄 Cambio de paquete detectado. Paquete ID:', this.formData.servicePackageId);
  
  // Limpiar precio personalizado cuando cambia el paquete (excepto en carga inicial)
  if (!this.initialLoading) {
    this.formData.customPrice = null;
  }
  
  this.clearValidationErrors();
  
  // Auto-completar datos basados en el paquete
  if (this.selectedPackage) {
    console.log('✅ Paquete seleccionado:', {
      id: this.selectedPackage.id,
      name: this.selectedPackage.name,
      price: this.selectedPackage.price,
      speeds: `${this.selectedPackage.downloadSpeedMbps}↓/${this.selectedPackage.uploadSpeedMbps}↑`
    });
  } else {
    console.log('⚠️ No se encontró el paquete seleccionado en availablePackages');
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
        console.log('🔄 Enviando datos de suscripción:', this.formData);
        
        const subscriptionData = SubscriptionService.normalizeSubscriptionData(this.formData);
        
        if (this.isEdit) {
          console.warn('⚠️ La edición de suscripciones no está implementada completamente');
          this.$emit('updated', subscriptionData);
        } else {
          const response = await SubscriptionService.createSubscription(subscriptionData);
          console.log('✅ Suscripción creada:', response.data);
          this.$emit('created', response.data);
        }
        
        this.$emit('success', {
          action: this.isEdit ? 'updated' : 'created',
          subscription: subscriptionData
        });
        
      } catch (error) {
        console.error('❌ Error guardando suscripción:', error);
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
  max-width: 900px;
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

/* Loading states */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #666;
  font-style: italic;
  padding: 16px;
  text-align: center;
}

/* Cliente info display */
.client-info-display {
  background-color: #f0f4f8;
  border-radius: 6px;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.client-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.client-detail .label {
  font-size: 0.8em;
  color: #666;
  font-weight: bold;
}

.client-detail .value {
  color: #333;
  font-weight: 500;
}

/* Suscripción actual */
.current-subscription {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 16px;
  background-color: #fafafa;
}

.subscription-actions {
  margin-top: 12px;
  text-align: center;
}

.btn-load {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.btn-load:hover {
  background-color: #1976D2;
}

/* No packages */
.no-packages {
  text-align: center;
  padding: 24px;
  background-color: #fff3e0;
  border-radius: 6px;
  border: 1px dashed #ff9800;
}

.btn-secondary {
  background-color: #ff9800;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 12px;
}

.btn-secondary:hover {
  background-color: #f57c00;
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

/* Vista previa del paquete mejorada */
.package-preview {
  margin-top: 16px;
  background-color: #e8f5e9;
  border-radius: 6px;
  border-left: 4px solid #4CAF50;
  overflow: hidden;
}

.preview-header {
  background-color: #4CAF50;
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-header h5 {
  margin: 0;
  font-size: 1.1em;
}

.package-price {
  font-size: 1.2em;
  font-weight: bold;
}

.preview-details {
  padding: 16px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 4px 0;
}

.preview-item:last-child {
  margin-bottom: 0;
}

.preview-label {
  color: #555;
  font-size: 0.9em;
  font-weight: 500;
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
  
  .client-info-display {
    grid-template-columns: 1fr;
  }
  
  .preview-header {
    flex-direction: column;
    align-items: flex-start;
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