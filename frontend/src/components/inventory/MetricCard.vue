<template>
  <div class="metric-card" :class="customClass">
    <div class="metric-icon" :class="iconClass">
      <i :class="icon"></i>
    </div>
    <div class="metric-content">
      <div class="metric-value">{{ value }}</div>
      <div class="metric-label">{{ label }}</div>
      <div v-if="trend" class="metric-trend" :class="trendClass">
        <i :class="trendIcon"></i>
        <span>{{ trend }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MetricCard',
  props: {
    /**
     * Valor principal del indicador
     */
    value: {
      type: [Number, String],
      required: true
    },
    /**
     * Etiqueta descriptiva
     */
    label: {
      type: String,
      required: true
    },
    /**
     * Clase CSS del icono
     */
    icon: {
      type: String,
      default: 'fas fa-chart-bar'
    },
    /**
     * Color del icono (theme color)
     */
    color: {
      type: String,
      default: 'primary',
      validator: value => ['primary', 'success', 'warning', 'danger', 'info', 'default'].includes(value)
    },
    /**
     * Tendencia para mostrar (ej: "+5% vs. mes pasado")
     */
    trend: {
      type: String,
      default: null
    },
    /**
     * Tipo de tendencia (positiva o negativa)
     */
    trendType: {
      type: String,
      default: 'neutral',
      validator: value => ['positive', 'negative', 'neutral'].includes(value)
    },
    /**
     * Clase CSS personalizada adicional
     */
    customClass: {
      type: String,
      default: ''
    }
  },
  computed: {
    /**
     * Clase CSS para el icono basada en el color
     */
    iconClass() {
      return `${this.color}-icon`;
    },
    /**
     * Clase CSS para la tendencia
     */
    trendClass() {
      return `trend-${this.trendType}`;
    },
    /**
     * Icono para la tendencia
     */
    trendIcon() {
      if (this.trendType === 'positive') {
        return 'fas fa-arrow-up';
      } else if (this.trendType === 'negative') {
        return 'fas fa-arrow-down';
      }
      return 'fas fa-minus';
    }
  }
};
</script>

<style scoped>
.metric-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  display: flex;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.primary-icon {
  background-color: #2196F3;
}

.success-icon {
  background-color: #4CAF50;
}

.warning-icon {
  background-color: #FF9800;
}

.danger-icon {
  background-color: #F44336;
}

.info-icon {
  background-color: #00BCD4;
}

.default-icon {
  background-color: #9E9E9E;
}

.metric-content {
  flex-grow: 1;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 4px;
  color: #333;
}

.metric-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.metric-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
}

.metric-trend i {
  margin-right: 4px;
  font-size: 10px;
}

.trend-positive {
  color: #4CAF50;
}

.trend-negative {
  color: #F44336;
}

.trend-neutral {
  color: #9E9E9E;
}
</style>