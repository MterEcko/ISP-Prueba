<template>
  <div class="subscription-form-intelligent">
    <!-- Header -->
    <div class="form-header">
      <h3>{{ getFormTitle() }}</h3>
      <div class="operation-badge" :class="operationType?.toLowerCase() || 'create_new'">
        {{ getOperationLabel() }}
      </div>
      <button class="close-btn" @click="$emit('close')" v-if="showCloseButton">✕</button>
    </div>

    <!-- DEBUG INFO (temporal) -->
    <!-- En el template, después del debug existente -->
<div class="debug-info" style="background: #f0f0f0; padding: 16px; margin: 16px 0; border-radius: 4px;">
  <h4>🔍 Debug Detallado:</h4>
  <p><strong>Operation Type:</strong> "{{ operationType }}"</p>
  <p><strong>Show Package Selector:</strong> {{ showPackageSelector }}</p>
  <p><strong>Available Packages:</strong> {{ availablePackages ? availablePackages.length : 'undefined' }}</p>
  <p><strong>Available Packages Array:</strong> {{ JSON.stringify(availablePackages, null, 2) }}</p>
  <p><strong>Target Zone ID:</strong> {{ getTargetZoneId() }}</p>
  <p><strong>Client Zone ID:</strong> {{ clientInfo?.zoneId }}</p>
  <p><strong>Loading Message:</strong> {{ loadingMessage }}</p>
  <p><strong>Initial Loading:</strong> {{ initialLoading }}</p>
</div>

<!-- Botón temporal en el template -->
<button @click="forceLoadPackages" type="button" style="background: red; color: white; padding: 10px;">
  🔄 FORZAR CARGA DE PAQUETES
</button>
    <!-- Loading state -->
    <div v-if="initialLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <form @submit.prevent="handleSubmit" v-else>
      
      <!-- SECCIÓN 1: INFO DEL CLIENTE -->
      <div class="form-section">
        <h4>📋 Información del Cliente</h4>
        <div class="client-info">
          <p><strong>Nombre:</strong> {{ clientInfo?.firstName }} {{ clientInfo?.lastName }}</p>
          <p><strong>Zona:</strong> {{ clientInfo?.Zone?.name || 'No asignada' }}</p>
          <p><strong>Nodo:</strong> {{ clientInfo?.Node?.name || 'No asignado' }}</p>
        </div>
      </div>

      <!-- SECCIÓN 2: SUSCRIPCIÓN ACTUAL -->
      <div class="form-section" v-if="existingSubscription && operationType !== 'CREATE_NEW'">
        <h4>📦 Configuración Actual</h4>
        <div class="current-config">
          <p><strong>Paquete Actual:</strong> {{ existingSubscription.ServicePackage?.name }}</p>
          <p><strong>Precio Actual:</strong> ${{ existingSubscription.monthlyFee }}</p>
          <p><strong>Estado:</strong> {{ existingSubscription.status }}</p>
          <p><strong>Usuario PPPoE:</strong> {{ existingSubscription.pppoeUsername }}</p>
        </div>
      </div>

      <!-- SECCIÓN 3: SELECCIÓN DE PAQUETE -->
      <div class="form-section" v-if="showPackageSelector">
        <h4>📊 {{ getPackageSelectorTitle() }}</h4>
        
        <div class="form-group">
          <label for="servicePackage">Paquete de Servicio *</label>
          <select 
            id="servicePackage"
            v-model="formData.servicePackageId" 
            @change="onPackageSelected"
            required
          >
            <option value="">Seleccionar paquete...</option>
            <option 
              v-for="package_ in availablePackages" 
              :key="package_.id" 
              :value="package_.id"
              :disabled="package_.id === existingSubscription?.servicePackageId"
            >
              {{ package_.name }} - ${{ package_.price }} 
              ({{ package_.downloadSpeedMbps }}↓/{{ package_.uploadSpeedMbps }}↑ Mbps)
              <span v-if="package_.id === existingSubscription?.servicePackageId"> - ACTUAL</span>
            </option>
          </select>
        </div>

        <!-- Info del paquete seleccionado -->
        <div v-if="selectedPackage" class="package-info">
          <h5>📋 Detalles del Paquete Seleccionado:</h5>
          <div class="package-details">
            <div class="detail-item">
              <span class="label">Nombre:</span>
              <span class="value">{{ selectedPackage.name }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Velocidad:</span>
              <span class="value">{{ selectedPackage.downloadSpeedMbps }}↓ / {{ selectedPackage.uploadSpeedMbps }}↑ Mbps</span>
            </div>
            <div class="detail-item">
              <span class="label">Precio Base:</span>
              <span class="value">${{ selectedPackage.price }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Ciclo:</span>
              <span class="value">{{ selectedPackage.billingCycle }}</span>
            </div>
          </div>
        </div>
      </div>

<!-- SECCIÓN: CONFIGURACIÓN DE RED -->
<div class="form-section" v-if="showNetworkConfig">
  <h4>🌐 Configuración de Red</h4>
  
  <div class="form-group">
    <label for="primaryRouter">Router/Nodo Principal *</label>
    <select 
      id="primaryRouter"
      v-model="formData.primaryRouterId" 
      required
    >
      <option value="">Seleccionar router...</option>
      <option 
        v-for="router in availableRouters" 
        :key="router.id" 
        :value="router.id"
      >
        {{ router.name }} - {{ router.ipAddress }}
        <span v-if="router.nodeId === clientInfo?.nodeId"> (Recomendado)</span>
      </option>
    </select>
  </div>
</div>

      <!-- SECCIÓN 4: CONFIGURACIÓN DE PRECIOS -->
      <div class="form-section" v-if="showPricingConfig && selectedPackage">
        <h4>💰 Configuración de Precios</h4>
        
        <div class="form-group">
          <label for="customPrice">Precio Personalizado (opcional)</label>
          <input 
            type="number" 
            id="customPrice"
            v-model="formData.customPrice" 
            step="0.01"
            min="0"
            placeholder="Dejar vacío para usar precio del paquete"
          />
        </div>

        <div class="form-group">
          <label for="promoDiscount">Descuento Promocional (%)</label>
          <input 
            type="number" 
            id="promoDiscount"
            v-model="formData.promoDiscount" 
            step="0.01"
            min="0"
            max="100"
          />
        </div>

        <!-- Resumen de precios -->
        <div class="price-summary">
          <div class="price-line">
            <span>Precio Base:</span>
            <span>${{ getBasePrice() }}</span>
          </div>
          <div class="price-line" v-if="formData.promoDiscount > 0">
            <span>Descuento ({{ formData.promoDiscount }}%):</span>
            <span>-${{ getDiscountAmount() }}</span>
          </div>
          <div class="price-line total">
            <span><strong>Precio Final:</strong></span>
            <span><strong>${{ getFinalPrice() }}</strong></span>
          </div>
        </div>
      </div>

      <!-- SECCIÓN 5: CONFIGURACIÓN DE FACTURACIÓN -->
      <div class="form-section" v-if="showBillingConfig">
        <h4>📅 Configuración de Facturación</h4>
        
        <div class="form-group">
          <label for="billingDay">Día de Facturación</label>
          <select id="billingDay" v-model="formData.billingDay">
            <option v-for="day in 31" :key="day" :value="day">
              Día {{ day }} de cada mes
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="formData.autoCreateBilling"
            />
            Crear facturación automática
          </label>
        </div>
      </div>

      <!-- SECCIÓN 6: NOTAS -->
      <div class="form-section">
        <h4>📝 Notas y Observaciones</h4>
        
        <div class="form-group">
          <label for="notes">Notas adicionales</label>
          <textarea 
            id="notes"
            v-model="formData.notes" 
            rows="3"
            placeholder="Agregar observaciones..."
          ></textarea>
        </div>

        <div class="form-group" v-if="requiresChangeReason">
          <label for="changeReason">Razón del Cambio *</label>
          <input 
            type="text"
            id="changeReason"
            v-model="formData.changeReason" 
            placeholder="Especificar motivo del cambio..."
            required
          />
        </div>
      </div>

      <!-- Errores de validación -->
      <div class="form-errors" v-if="validationErrors.length > 0">
        <div class="error-list">
          <div class="error-item" v-for="error in validationErrors" :key="error.code">
            <strong>{{ error.code }}:</strong> {{ error.message }}
          </div>
        </div>
      </div>

      <!-- Botones de acción -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn-cancel">
          Cancelar
        </button>
        <button 
          type="submit" 
          class="btn-submit" 
          :disabled="loading || !isFormValid"
          :class="{ 'danger': isDangerousOperation }"
        >
          {{ getSubmitButtonText() }}
        </button>
      </div>
    </form>
  </div>
</template>



<script>
import { computed, watch, onMounted, toRefs } from 'vue'
import { useSubscriptionForm } from '@/composables/useSubscriptionForm'
import { useTransactionManager } from '@/composables/useTransactionManager'
import { useDebugLogger } from '@/composables/useDebugLogger'

export default {
 name: 'SubscriptionFormIntelligent',
 props: {
   subscription: {
     type: Object,
     default: null
   },
   clientId: {
     type: [Number, String],
     required: true
   },
   subscriptionId: {
     type: [Number, String],
     default: null
   },
   operationHint: {
     type: String,
     default: null
   }
 },
 emits: ['close', 'cancel', 'success', 'error'],
 
 setup(props, { emit }) {
 
 const forceLoadPackages = async () => {
  console.log('🔄 FORZANDO CARGA DE PAQUETES...')
  console.log('Cliente info:', clientInfo?.value)
  console.log('Target Zone ID:', getTargetZoneId())
  
  try {
    if (loadServicePackages) {
      await loadServicePackages()
      console.log('✅ Paquetes después de forzar carga:', availablePackages?.value)
    }
  } catch (error) {
    console.error('❌ Error forzando carga:', error)
  }
}
   // ===============================
   // HACER PROPS REACTIVAS
   // ===============================
   const { clientId, subscription, subscriptionId, operationHint } = toRefs(props)
   
   // ESTABLECER HINT DE FORMA REACTIVA
   watch(operationHint, (newHint) => {
     if (newHint) {
       window.currentOperationHint = newHint
       console.log('🔧 Operation hint establecido:', newHint)
     }
   }, { immediate: true })

   // ===============================
   // 1. COMPOSABLES
   // ===============================
   const {
     loading,
     initialLoading,
     formData,
     clientInfo,
     currentSubscription: existingSubscription,
     currentNetworkConfig,
     currentMikrotikData,
     availablePackages,
     availableRouters,
     availableIpPools,
     availableZones,
     availableNodes,
     validationErrors,
     formWarnings,
     loadingMessage,
     operationType,
     targetZoneId,
     targetNodeId,
     suggestedPPPoEUsername,
     initializeForm,
     loadServicePackages,
     submitSubscriptionChange
   } = useSubscriptionForm(clientId.value, subscription.value, subscriptionId.value)

   const {
     transactionSteps,
     currentTransactionStep,
     transactionErrors,
     showTransactionProgress,
     cancelTransaction
   } = useTransactionManager()

   const {
     debugMode,
     consoleLogs,
     debugInfo,
     toggleDebugMode,
     logInfo,
     logError
   } = useDebugLogger()

   // ===============================
   // 2. COMPUTED PROPERTIES SEGUROS
   // ===============================
   
   const showCloseButton = computed(() => true)

   const showLocationSelector = computed(() => {
     const opType = operationType?.value || operationType || 'CREATE_NEW'
     return ['CHANGE_ADDRESS', 'CHANGE_ZONE', 'CHANGE_NODE'].includes(opType)
   })

   const showPackageSelector = computed(() => {
     const opType = operationType?.value || operationType || 'CREATE_NEW'
     return ['CREATE_NEW', 'CHANGE_PLAN', 'CHANGE_ZONE'].includes(opType)
   })

   const showPricingConfig = computed(() => {
     const opType = operationType?.value || operationType || 'CREATE_NEW'
     return ['CREATE_NEW', 'CHANGE_PLAN'].includes(opType)
   })

   const showNetworkConfig = computed(() => {
     const opType = operationType?.value || operationType || 'CREATE_NEW'
     return opType === 'CREATE_NEW'
   })

   const showBillingConfig = computed(() => {
     const opType = operationType?.value || operationType || 'CREATE_NEW'
     return ['CREATE_NEW', 'CHANGE_PLAN'].includes(opType)
   })

   const isDangerousOperation = computed(() => {
     const opType = operationType?.value || operationType || 'CREATE_NEW'
     return ['CHANGE_NODE', 'CHANGE_ZONE'].includes(opType)
   })

   const selectedPackage = computed(() => {
     if (!formData?.servicePackageId || !availablePackages?.value) return null
     return availablePackages.value.find(pkg => pkg.id == formData.servicePackageId) || null
   })

   const isFormValid = computed(() => {
     return !!(
       formData?.clientId && 
       formData?.servicePackageId && 
       validationErrors?.value?.length === 0
     )
   })

   const estimatedChanges = computed(() => {
     return {
       hasChanges: !!(formData?.servicePackageId),
       operationType: operationType?.value || operationType || 'CREATE_NEW',
       timestamp: Date.now()
     }
   })

   const requiresChangeReason = computed(() => {
     const opType = operationType?.value || operationType || 'CREATE_NEW'
     return ['CHANGE_NODE', 'CHANGE_ZONE', 'CHANGE_ADDRESS'].includes(opType)
   })

   // ===============================
   // 3. MÉTODOS DE PRECIOS
   // ===============================
   
   const getBasePrice = () => {
     if (formData?.customPrice && parseFloat(formData.customPrice) > 0) {
       return parseFloat(formData.customPrice).toFixed(2)
     }
     return selectedPackage?.value?.price ? parseFloat(selectedPackage.value.price).toFixed(2) : '0.00'
   }

   const getDiscountAmount = () => {
     if (!formData?.promoDiscount || formData.promoDiscount <= 0) return '0.00'
     const basePrice = parseFloat(getBasePrice())
     return (basePrice * (parseFloat(formData.promoDiscount) / 100)).toFixed(2)
   }

   const getFinalPrice = () => {
     const basePrice = parseFloat(getBasePrice())
     const discount = parseFloat(getDiscountAmount())
     return (basePrice - discount).toFixed(2)
   }

   // ===============================
   // 4. MÉTODOS PRINCIPALES
   // ===============================
   
// En SubscriptionFormIntelligent.vue, modifica handleSubmit:
const handleSubmit = async () => {
  const currentOpType = operationType?.value || operationType || 'CREATE_NEW'
  logInfo('🚀 Iniciando proceso de envío', { operationType: currentOpType })
  
  const isValid = await validateBeforeSubmit()
  if (!isValid) {
    logError('❌ Validación fallida antes del envío')
    return
  }

  try {
    loading.value = true
    
    // ✅ USAR EL MÉTODO DEL COMPOSABLE EN LUGAR DE executeTransaction
    const result = await submitSubscriptionChange(formData, currentOpType)
    
    logInfo('✅ Cambio completado exitosamente', result)
    emit('success', {
      operationType: currentOpType,
      result,
      changes: estimatedChanges.value
    })
    
  } catch (error) {
    logError('❌ Error en el cambio', error)
    
    // Agregar el error a validationErrors para mostrar en la UI
    if (validationErrors?.value) {
      validationErrors.value.push({
        code: 'SUBMIT_ERROR',
        message: error.response?.data?.message || error.message || 'Error procesando el cambio'
      })
    }
    
    emit('error', {
      operationType: currentOpType,
      error,
      formData: formData
    })
  } finally {
    loading.value = false
  }
}


   const validateBeforeSubmit = async () => {
     logInfo('🔍 Iniciando validación pre-envío')
     
     if (validationErrors?.value) {
       validationErrors.value = []
     }
     
     const errors = []
     
     if (!formData?.clientId) {
       errors.push({ code: 'CLIENT_REQUIRED', message: 'Cliente es requerido', field: 'clientId' })
     }
     
     if (!formData?.servicePackageId) {
       errors.push({ code: 'PACKAGE_REQUIRED', message: 'Paquete es requerido', field: 'servicePackageId' })
     }

     // Validación específica para operaciones que requieren razón
     if (requiresChangeReason.value && !formData?.changeReason?.trim()) {
       errors.push({ 
         code: 'CHANGE_REASON_REQUIRED', 
         message: 'Debe especificar la razón del cambio', 
         field: 'changeReason' 
       })
     }
     
     if (validationErrors?.value) {
       validationErrors.value = errors
     }
     
     const isValid = errors.length === 0
     logInfo(`📋 Validación completada. Válido: ${isValid}`)
     
     return isValid
   }

   // Removed unused methods: setupTransactionSteps, getTransactionPlan, handleRollback
   // These were defined but never called in the component

   // ===============================
   // 5. MÉTODOS AUXILIARES
   // ===============================
   
   const getFormTitle = () => {
     const currentOpType = operationType?.value || operationType || 'CREATE_NEW'
     const titles = {
       'CREATE_NEW': 'Nueva Suscripción',
       'CHANGE_PLAN': 'Cambio de Plan',
       'CHANGE_ADDRESS': 'Cambio de Domicilio',
       'CHANGE_NODE': 'Cambio de Nodo/Torre',
       'CHANGE_ZONE': 'Cambio de Zona'
     }
     return titles[currentOpType] || 'Gestión de Suscripción'
   }

   const getOperationLabel = () => {
     const currentOpType = operationType?.value || operationType || 'CREATE_NEW'
     const labels = {
       'CREATE_NEW': 'Nuevo Servicio',
       'CHANGE_PLAN': 'Cambio de Plan',
       'CHANGE_ADDRESS': 'Cambio de Domicilio', 
       'CHANGE_NODE': 'Cambio de Torre',
       'CHANGE_ZONE': 'Cambio de Zona'
     }
     return labels[currentOpType] || 'Operación'
   }

   const getSubmitButtonText = () => {
     if (loading?.value) return 'Procesando...'
     
     const currentOpType = operationType?.value || operationType || 'CREATE_NEW'
     const texts = {
       'CREATE_NEW': 'Crear Suscripción',
       'CHANGE_PLAN': 'Aplicar Cambio de Plan',
       'CHANGE_ADDRESS': 'Confirmar Cambio de Domicilio',
       'CHANGE_NODE': '⚠️ Confirmar Cambio de Torre',
       'CHANGE_ZONE': '⚠️ Confirmar Cambio de Zona'
     }
     return texts[currentOpType] || 'Guardar Cambios'
   }

   const getLocationSelectorTitle = () => {
     const currentOpType = operationType?.value || operationType || 'CREATE_NEW'
     const titles = {
       'CHANGE_ADDRESS': 'Nueva Ubicación',
       'CHANGE_NODE': 'Seleccionar Nuevo Nodo',
       'CHANGE_ZONE': 'Seleccionar Nueva Zona'
     }
     return titles[currentOpType] || 'Ubicación'
   }

   const getPackageSelectorTitle = () => {
     const currentOpType = operationType?.value || operationType || 'CREATE_NEW'
     const titles = {
       'CREATE_NEW': 'Seleccionar Paquete de Servicio',
       'CHANGE_PLAN': 'Nuevo Paquete de Servicio',
       'CHANGE_ZONE': 'Paquete para Nueva Zona'
     }
     return titles[currentOpType] || 'Paquete de Servicio'
   }

   const getTargetZoneId = () => {
     return formData?.newZoneId || clientInfo?.value?.zoneId
   }

   const getTargetNodeId = () => {
     return formData?.newNodeId || clientInfo?.value?.nodeId
   }

   const onZoneChanged = (newZoneId) => {
     logInfo('🌍 Zona cambiada', { newZoneId })
     if (formData) {
       formData.newZoneId = newZoneId
     }
   }

   const onNodeChanged = (newNodeId) => {
     logInfo('🗼 Nodo cambiado', { newNodeId })
     if (formData) {
       formData.newNodeId = newNodeId
     }
   }

   const onPackageSelected = () => {
     console.log('📦 Paquete seleccionado:', formData.servicePackageId)
     // Limpiar precio personalizado al cambiar paquete
     if (!initialLoading.value) {
       formData.customPrice = null
     }
     
     // Limpiar errores de validación
     if (validationErrors?.value) {
       validationErrors.value = validationErrors.value.filter(error => 
         error.field !== 'servicePackageId'
       )
     }
   }

   const getCurrentData = () => {
     return {
       currentSubscription: existingSubscription?.value,
       currentClient: clientInfo?.value
     }
   }

   const formatBillingCycle = (cycle) => {
     const cycles = {
       'monthly': 'Mensual',
       'yearly': 'Anual',
       'quarterly': 'Trimestral'
     }
     return cycles[cycle] || cycle
   }

   // ===============================
   // 6. WATCHERS SEGUROS
   // ===============================
   
   watch(() => clientId.value, (newClientId) => {
     if (newClientId && initializeForm) {
       logInfo('🔄 Cliente cambiado, reinicializando formulario', { clientId: newClientId })
       initializeForm()
     }
   })

   watch(() => operationType?.value || operationType, (newType) => {
     logInfo('🔄 Tipo de operación detectado', { operationType: newType })
   })

   // ===============================
   // 7. LIFECYCLE
   // ===============================
   
   onMounted(async () => {
     logInfo('🚀 Iniciando SubscriptionFormIntelligent', { 
       clientId: clientId.value, 
       subscription: subscription.value,
       subscriptionId: subscriptionId.value,
       operationHint: operationHint.value 
     })
     
     if (initializeForm) {
       await initializeForm()
     }
   })

   // ===============================
   // 8. DEBUG DESPUÉS DE INICIALIZACIÓN
   // ===============================
   
   setTimeout(() => {
     console.log('🔍 Composable values después de init:', {
       operationType: operationType?.value || operationType,
       detectOperationType: typeof detectOperationType,
       clientInfo: clientInfo?.value,
       existingSubscription: existingSubscription?.value,
       formData: formData,
       availablePackages: availablePackages?.value?.length || 0,
       selectedPackage: selectedPackage?.value
     })
   }, 1000)

   // ===============================
   // 9. RETURN COMPLETO Y SEGURO
   // ===============================
   
   return {
     // Estados principales
     loading,
     initialLoading,
     formData,
     clientInfo,
     existingSubscription,
     currentNetworkConfig,
     currentMikrotikData,
     availablePackages,
     availableRouters,
     availableIpPools,
     availableZones,
     availableNodes,
     validationErrors,
     formWarnings,
     loadingMessage,
     
     // Estados de transacción
     transactionSteps,
     currentTransactionStep,
     transactionErrors,
     showTransactionProgress,
     
     // Estados de debug
     debugMode,
     consoleLogs,
     debugInfo,
     
     // Computed seguros
     operationType,
     showCloseButton,
     showLocationSelector,
     showPackageSelector,
     showPricingConfig,
     showNetworkConfig,
     showBillingConfig,
     isDangerousOperation,
     selectedPackage,
     isFormValid,
     estimatedChanges,
     targetZoneId,
     targetNodeId,
     suggestedPPPoEUsername,
     requiresChangeReason,
     
     // Métodos de precios
     getBasePrice,
     getDiscountAmount,
     getFinalPrice,
     
     // Métodos principales
     handleSubmit,
     validateBeforeSubmit,
     toggleDebugMode,
     cancelTransaction,
     getFormTitle,
     getOperationLabel,
     getSubmitButtonText,
     getCurrentData,
     getLocationSelectorTitle,
     getPackageSelectorTitle,
     getTargetZoneId,
     getTargetNodeId,
     onZoneChanged,
     onNodeChanged,
     onPackageSelected,
     formatBillingCycle,
     forceLoadPackages
   }
 }
}
</script>

<style scoped>
.subscription-form-intelligent {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 1000px;
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

.operation-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: bold;
  text-transform: uppercase;
}

.operation-badge.create_new { background: #e3f2fd; color: #1565c0; }
.operation-badge.change_plan { background: #f3e5f5; color: #7b1fa2; }
.operation-badge.change_address { background: #fff3e0; color: #ef6c00; }
.operation-badge.change_node { background: #ffebee; color: #c62828; }
.operation-badge.change_zone { background: #ffebee; color: #c62828; }

.debug-panel {
  background: #263238;
  color: #4fc3f7;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-family: 'Courier New', monospace;
  font-size: 0.8em;
}

.debug-panel h4 {
  color: #81c784;
  margin: 0 0 8px 0;
}

.debug-panel pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
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

.form-section {
  margin-bottom: 24px;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  border-left: 4px solid #4CAF50;
}

.form-section h4 {
  margin: 0 0 16px 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-errors {
  background: #ffebee;
  border: 1px solid #f44336;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.error-list .error-item {
  color: #c62828;
  margin-bottom: 8px;
  font-size: 0.9em;
}

.console-log {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.console-log h4 {
  color: #81c784;
  margin: 0 0 12px 0;
}

.log-entry {
  margin-bottom: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.8em;
  padding: 4px 8px;
  border-radius: 3px;
}

.log-entry.info { background: rgba(33, 150, 243, 0.1); color: #2196f3; }
.log-entry.warn { background: rgba(255, 152, 0, 0.1); color: #ff9800; }
.log-entry.error { background: rgba(244, 67, 54, 0.1); color: #f44336; }
.log-entry.debug { background: rgba(156, 39, 176, 0.1); color: #9c27b0; }

.log-timestamp {
  color: #666;
  margin-right: 8px;
}

.log-level {
  font-weight: bold;
  margin-right: 8px;
}

.log-data {
  margin: 4px 0 0 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  font-size: 0.9em;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.btn-debug {
  background: #9c27b0;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.btn-cancel, .btn-validate, .btn-submit {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: all 0.2s;
}

.btn-cancel {
  background: #e0e0e0;
  color: #333;
}

.btn-validate {
  background: #2196f3;
  color: white;
}

.btn-submit {
  background: #4CAF50;
  color: white;
}

.btn-submit.danger {
  background: #f44336;
  animation: pulse-danger 2s infinite;
}

.btn-submit:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

@keyframes pulse-danger {
  0% { background-color: #f44336; }
  50% { background-color: #d32f2f; }
  100% { background-color: #f44336; }
}

/* Responsive */
@media (max-width: 768px) {
  .subscription-form-intelligent {
    padding: 16px;
  }
  
  .form-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .btn-cancel, .btn-validate, .btn-submit, .btn-debug {
    width: 100%;
  }
}
</style>