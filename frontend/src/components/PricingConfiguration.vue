<template>
  <div class="pricing-configuration">
    <!-- Base package info -->
    <div class="base-package-info">
      <h5>📊 Precio Base del Paquete</h5>
      <div class="base-price-display">
        <span class="package-name">{{ basePackage.name }}</span>
        <span class="base-price">${{ formatPrice(basePackage.price) }}/mes</span>
      </div>
      <div class="package-details">
        <span class="speed">↓{{ basePackage.downloadSpeedMbps }}Mbps ↑{{ basePackage.uploadSpeedMbps }}Mbps</span>
        <span class="billing-cycle">{{ formatBillingCycle(basePackage.billingCycle) }}</span>
      </div>
    </div>

    <!-- Custom pricing controls -->
    <div class="pricing-controls">
      <!-- Custom price override -->
      <div class="form-group">
        <label for="customPrice">
          💰 Precio Personalizado
          <span class="optional">(opcional)</span>
        </label>
        <div class="price-input-group">
          <span class="currency">$</span>
          <input
            type="number"
            id="customPrice"
            :value="modelCustomPrice"
            @input="updateCustomPrice"
            step="0.01"
            min="0"
            max="99999"
            :placeholder="basePackage.price"
          />
          <span class="per-month">/mes</span>
        </div>
        <small class="help-text">
          Dejar vacío para usar el precio del paquete (${{ formatPrice(basePackage.price) }})
        </small>
      </div>

      <!-- Promotional discount -->
      <div class="form-group">
        <label for="promoDiscount">
          🎯 Descuento Promocional
          <span class="optional">(opcional)</span>
        </label>
        <div class="discount-input-group">
          <input
            type="number"
            id="promoDiscount"
            :value="modelPromoDiscount"
            @input="updatePromoDiscount"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
          />
          <span class="percentage">%</span>
        </div>
        <small class="help-text">
          Porcentaje de descuento sobre el precio final
        </small>
      </div>

      <!-- Promotional period (if discount applied) -->
      <div class="form-group" v-if="modelPromoDiscount > 0">
        <label for="promoPeriod">⏰ Duración de la Promoción</label>
        <select id="promoPeriod" v-model="promoPeriod">
          <option value="1">1 mes</option>
          <option value="3">3 meses</option>
          <option value="6">6 meses</option>
          <option value="12">12 meses</option>
          <option value="permanent">Permanente</option>
        </select>
        <small class="help-text">
          Tiempo durante el cual aplicará el descuento
        </small>
      </div>
    </div>

    <!-- Price calculation summary -->
    <div class="price-summary">
      <h5>📋 Resumen de Precios</h5>
      
      <div class="calculation-steps">
        <!-- Base price -->
        <div class="calc-step">
          <span class="step-label">Precio base:</span>
          <span class="step-value">${{ formatPrice(effectiveBasePrice) }}</span>
        </div>

        <!-- Discount applied -->
        <div class="calc-step" v-if="discountAmount > 0">
          <span class="step-label">Descuento ({{ modelPromoDiscount }}%):</span>
          <span class="step-value discount">-${{ formatPrice(discountAmount) }}</span>
        </div>

        <!-- Final price -->
        <div class="calc-step final-price">
          <span class="step-label">Precio final:</span>
          <span class="step-value final">${{ formatPrice(finalPrice) }}/mes</span>
        </div>

        <!-- Savings indicator -->
        <div class="calc-step savings" v-if="totalSavings > 0">
          <span class="step-label">Ahorro total:</span>
          <span class="step-value savings-amount">${{ formatPrice(totalSavings) }}/mes</span>
        </div>
      </div>

      <!-- Promotional period info -->
      <div class="promo-info" v-if="modelPromoDiscount > 0 && promoPeriod !== 'permanent'">
        <div class="promo-period">
          <strong>📅 Precio promocional por {{ promoPeriod }} mes{{ promoPeriod === '1' ? '' : 'es' }}</strong>
        </div>
        <div class="after-promo">
          Después: ${{ formatPrice(effectiveBasePrice) }}/mes
        </div>
      </div>
    </div>

    <!-- Comparison with current (for changes) -->
    <div class="price-comparison" v-if="showComparison && currentPrice">
      <h5>🔄 Comparación de Precios</h5>
      
      <div class="comparison-table">
        <div class="comparison-row">
          <span class="comparison-label">Precio actual:</span>
          <span class="comparison-current">${{ formatPrice(currentPrice) }}/mes</span>
        </div>
        <div class="comparison-row">
          <span class="comparison-label">Precio nuevo:</span>
          <span class="comparison-new">${{ formatPrice(finalPrice) }}/mes</span>
        </div>
        <div class="comparison-row difference">
          <span class="comparison-label">Diferencia:</span>
          <span 
            class="comparison-diff" 
            :class="{ 
              'increase': priceDifference > 0, 
              'decrease': priceDifference < 0,
              'same': priceDifference === 0
            }"
          >
            {{ priceDifference > 0 ? '+' : '' }}${{ formatPrice(Math.abs(priceDifference)) }}/mes
            <small v-if="priceDifference !== 0">
              ({{ priceDifference > 0 ? 'aumento' : 'ahorro' }} del {{ formatPrice(Math.abs(priceChangePercentage)) }}%)
            </small>
          </span>
        </div>
      </div>
    </div>

    <!-- Validation errors -->
    <div class="pricing-errors" v-if="validationErrors.length > 0">
      <div class="error-item" v-for="error in validationErrors" :key="error.code">
        <span class="error-icon">⚠️</span>
        <span class="error-message">{{ error.message }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'

export default {
  name: 'PricingConfiguration',
  props: {
    basePackage: {
      type: Object,
      required: true
    },
    modelCustomPrice: {
      type: [Number, String],
      default: null
    },
    modelPromoDiscount: {
      type: [Number, String],
      default: 0
    },
    operationType: {
      type: String,
      required: true
    },
    currentPrice: {
      type: [Number, String],
      default: null
    },
    showComparison: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelCustomPrice', 'update:modelPromoDiscount', 'priceChanged'],
  setup(props, { emit }) {
    // ===============================
    // ESTADO LOCAL
    // ===============================
    
    const promoPeriod = ref('3')
    const validationErrors = ref([])

    // ===============================
    // COMPUTED PROPERTIES
    // ===============================
    
    const effectiveBasePrice = computed(() => {
      // Usar precio personalizado si existe, sino precio del paquete
      if (props.modelCustomPrice && parseFloat(props.modelCustomPrice) > 0) {
        return parseFloat(props.modelCustomPrice)
      }
      return parseFloat(props.basePackage.price || 0)
    })

    const discountAmount = computed(() => {
      if (!props.modelPromoDiscount || parseFloat(props.modelPromoDiscount) <= 0) {
        return 0
      }
      return (effectiveBasePrice.value * (parseFloat(props.modelPromoDiscount) / 100))
    })

    const finalPrice = computed(() => {
      return Math.max(0, effectiveBasePrice.value - discountAmount.value)
    })

    const totalSavings = computed(() => {
      const originalPrice = parseFloat(props.basePackage.price || 0)
      return Math.max(0, originalPrice - finalPrice.value)
    })

    const priceDifference = computed(() => {
      if (!props.currentPrice) return 0
      return finalPrice.value - parseFloat(props.currentPrice)
    })

    const priceChangePercentage = computed(() => {
      if (!props.currentPrice || parseFloat(props.currentPrice) === 0) return 0
      return (Math.abs(priceDifference.value) / parseFloat(props.currentPrice)) * 100
    })

    // ===============================
    // MÉTODOS
    // ===============================
    
    const updateCustomPrice = (event) => {
      const value = event.target.value
      const numericValue = value ? parseFloat(value) : null
      
      console.log('💰 Precio personalizado actualizado:', numericValue)
      
      emit('update:modelCustomPrice', numericValue)
      validateCustomPrice(numericValue)
      emitPriceChange()
    }

    const updatePromoDiscount = (event) => {
      const value = event.target.value
      const numericValue = value ? parseFloat(value) : 0
      
      console.log('🎯 Descuento promocional actualizado:', numericValue)
      
      emit('update:modelPromoDiscount', numericValue)
      validatePromoDiscount(numericValue)
      emitPriceChange()
    }

    const validateCustomPrice = (price) => {
      clearValidationError('CUSTOM_PRICE')
      
      if (price !== null && price !== undefined) {
        if (price < 0) {
          addValidationError('CUSTOM_PRICE', 'El precio personalizado no puede ser negativo')
        } else if (price > 99999) {
          addValidationError('CUSTOM_PRICE', 'El precio personalizado no puede exceder $99,999')
        } else if (price < parseFloat(props.basePackage.price) * 0.1) {
          addValidationError('CUSTOM_PRICE', 'El precio personalizado es muy bajo comparado con el precio base')
        }
      }
    }

    const validatePromoDiscount = (discount) => {
      clearValidationError('PROMO_DISCOUNT')
      
      if (discount < 0) {
        addValidationError('PROMO_DISCOUNT', 'El descuento no puede ser negativo')
      } else if (discount > 100) {
        addValidationError('PROMO_DISCOUNT', 'El descuento no puede ser mayor a 100%')
      } else if (discount >= 100) {
        addValidationError('PROMO_DISCOUNT', 'Un descuento del 100% haría el servicio gratuito')
      }
    }

    const addValidationError = (code, message) => {
      const existingIndex = validationErrors.value.findIndex(error => error.code === code)
      const error = { code, message }
      
      if (existingIndex >= 0) {
        validationErrors.value[existingIndex] = error
      } else {
        validationErrors.value.push(error)
      }
    }

    const clearValidationError = (code) => {
      const index = validationErrors.value.findIndex(error => error.code === code)
      if (index >= 0) {
        validationErrors.value.splice(index, 1)
      }
    }

    const emitPriceChange = () => {
      emit('priceChanged', {
        basePrice: effectiveBasePrice.value,
        discount: discountAmount.value,
        finalPrice: finalPrice.value,
        savings: totalSavings.value,
        isValid: validationErrors.value.length === 0,
        promoPeriod: props.modelPromoDiscount > 0 ? promoPeriod.value : null
      })
    }

    const formatPrice = (price) => {
      const numPrice = parseFloat(price || 0)
      return numPrice.toFixed(2)
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
    // WATCHERS
    // ===============================
    
    watch([effectiveBasePrice, discountAmount], () => {
      emitPriceChange()
    })

    watch(() => promoPeriod.value, (newPeriod) => {
      console.log('⏰ Período promocional cambiado:', newPeriod)
      emitPriceChange()
    })

    // ===============================
    // LIFECYCLE
    // ===============================
    
    onMounted(() => {
      // Validar valores iniciales
      if (props.modelCustomPrice) {
        validateCustomPrice(parseFloat(props.modelCustomPrice))
      }
      if (props.modelPromoDiscount) {
        validatePromoDiscount(parseFloat(props.modelPromoDiscount))
      }
      
      // Emitir cambio inicial
      emitPriceChange()
    })

    return {
      // Estado
      promoPeriod,
      validationErrors,
      
      // Computed
      effectiveBasePrice,
      discountAmount,
      finalPrice,
      totalSavings,
      priceDifference,
      priceChangePercentage,
      
      // Métodos
      updateCustomPrice,
      updatePromoDiscount,
      formatPrice,
      formatBillingCycle
    }
  }
}
</script>

<style scoped>
.pricing-configuration {
  width: 100%;
}

/* Base package info */
.base-package-info {
  background-color: #f0f4f8;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
  border-left: 4px solid #2196f3;
}

.base-package-info h5 {
  margin: 0 0 8px 0;
  color: #1976d2;
}

.base-price-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.package-name {
  font-weight: bold;
  color: #333;
}

.base-price {
  font-size: 1.2em;
  font-weight: bold;
  color: #2196f3;
}

.package-details {
  display: flex;
  gap: 16px;
  font-size: 0.9em;
  color: #666;
}

/* Pricing controls */
.pricing-controls {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  color: #555;
}

.optional {
  font-weight: normal;
  color: #999;
  font-size: 0.9em;
}

.price-input-group {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.currency {
  background-color: #f5f5f5;
  padding: 10px 12px;
  border-right: 1px solid #ddd;
  font-weight: bold;
  color: #666;
}

.price-input-group input {
  flex: 1;
  border: none;
  padding: 10px;
  font-size: 1em;
  outline: none;
}

.per-month {
  background-color: #f5f5f5;
  padding: 10px 12px;
  border-left: 1px solid #ddd;
  color: #666;
  font-size: 0.9em;
}

.discount-input-group {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}
.pricing-configuration {
  width: 100%;
}

/* Base package info */
.base-package-info {
  background-color: #f0f4f8;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
  border-left: 4px solid #2196f3;
}

.base-package-info h5 {
  margin: 0 0 8px 0;
  color: #1976d2;
  display: flex;
  align-items: center;
  gap: 8px;
}

.base-price-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.package-name {
  font-weight: bold;
  color: #333;
}

.base-price {
  font-size: 1.2em;
  font-weight: bold;
  color: #2196f3;
}

.package-details {
  display: flex;
  gap: 16px;
  font-size: 0.9em;
  color: #666;
}

/* Pricing controls */
.pricing-controls {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  color: #555;
}

.optional {
  font-weight: normal;
  color: #999;
  font-size: 0.9em;
}

.price-input-group {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.currency {
  background-color: #f5f5f5;
  padding: 10px 12px;
  border-right: 1px solid #ddd;
  font-weight: bold;
  color: #666;
}

.price-input-group input {
  flex: 1;
  border: none;
  padding: 10px;
  font-size: 1em;
  outline: none;
}

.price-input-group input:focus {
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.per-month {
  background-color: #f5f5f5;
  padding: 10px 12px;
  border-left: 1px solid #ddd;
  color: #666;
  font-size: 0.9em;
}

.discount-input-group {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  max-width: 200px;
}

.discount-input-group input {
  flex: 1;
  border: none;
  padding: 10px;
  font-size: 1em;
  outline: none;
}

.discount-input-group input:focus {
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.percentage {
  background-color: #f5f5f5;
  padding: 10px 12px;
  border-left: 1px solid #ddd;
  color: #666;
  font-size: 0.9em;
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 0.8em;
  color: #666;
  font-style: italic;
}

/* Price summary */
.price-summary {
  background-color: #e8f5e9;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
  border-left: 4px solid #4caf50;
}

.price-summary h5 {
  margin: 0 0 12px 0;
  color: #2e7d32;
  display: flex;
  align-items: center;
  gap: 8px;
}

.calculation-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calc-step {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
}

.step-label {
  color: #666;
  font-weight: bold;
}

.step-value {
  color: #333;
}

.step-value.discount {
  color: #e91e63;
}

.step-value.final {
  font-weight: bold;
  color: #2e7d32;
  font-size: 1.1em;
}

.savings {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #ddd;
}

.savings-amount {
  color: #4caf50;
  font-weight: bold;
}

.promo-info {
  margin-top: 12px;
  padding: 12px;
  background-color: #f0f4f8;
  border-radius: 4px;
  font-size: 0.9em;
}

.promo-period strong {
  color: #1976d2;
}

.after-promo {
  color: #666;
}

/* Price comparison */
.price-comparison {
  background-color: #fff3e0;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
  border-left: 4px solid #ff9800;
}

.price-comparison h5 {
  margin: 0 0 12px 0;
  color: #f57c00;
  display: flex;
  align-items: center;
  gap: 8px;
}

.comparison-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comparison-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
}

.comparison-label {
  color: #666;
  font-weight: bold;
}

.comparison-current {
  color: #333;
}

.comparison-new {
  color: #2196f3;
  font-weight: bold;
}

.comparison-diff.increase {
  color: #e91e63;
}

.comparison-diff.decrease {
  color: #4caf50;
}

.comparison-diff.same {
  color: #666;
}

/* Validation errors */
.pricing-errors {
  margin-top: 16px;
}

.error-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #ffebee;
  border: 1px solid #f44336;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 0.9em;
}

.error-icon {
  flex-shrink: 0;
}

.error-message {
  color: #c62828;
}

/* Form controls styling */
input, select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

input:focus, select:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

input:disabled, select:disabled {
  background-color: #f5f5f5;
  color: #666;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .pricing-controls {
    margin-bottom: 16px;
  }

  .calc-step, .comparison-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .price-input-group, .discount-input-group {
    flex-wrap: wrap;
  }

  .currency, .per-month, .percentage {
    min-width: 44px;
  }
}

</style>  
