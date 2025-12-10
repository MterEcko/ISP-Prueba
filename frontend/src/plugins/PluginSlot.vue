<template>
  <div class="plugin-slot-container">
    <div v-if="loading && showLoading" class="slot-loading">
      <span class="spinner"></span> Cargando extensiones...
    </div>

    <template v-else>
      <div
        v-for="(widget, index) in widgets"
        :key="widget.name + index"
        class="plugin-widget-wrapper"
        :class="wrapperClass"
      >
        <component
          :is="widget.name"
          v-bind="{ ...contextData, ...widget.props }"
          @action="handlePluginAction"
        />
      </div>
    </template>
  </div>
</template>

<script>
import PluginLoader from '@/services/PluginLoader';

export default {
  name: 'PluginSlot',
  props: {
    // El nombre de la zona (ej: 'client_details_tab', 'dashboard_top', 'payment_options')
    zone: {
      type: String,
      required: true
    },
    // Datos del contexto actual para que el plugin los use
    // Ej: Si estás en Cliente, pasas { clientId: 50, planId: 2 }
    contextData: {
      type: Object,
      default: () => ({})
    },
    // Clases CSS extra para el contenedor de cada widget
    wrapperClass: {
      type: String,
      default: ''
    },
    // Mostrar spinner o ser silencioso
    showLoading: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: false,
      widgets: [] // Lista de componentes cargados: [{ name: 'StreamingCard', props: {} }]
    };
  },
  async mounted() {
    await this.loadPlugins();
  },
  watch: {
    // Si cambia la zona (raro) o el contexto, recargamos
    zone: 'loadPlugins'
  },
  methods: {
    async loadPlugins() {
      this.loading = true;
      try {
        // 1. Delegar al servicio Loader la magia de descargar los JS
        this.widgets = await PluginLoader.loadWidgets(this.zone);
        
        if (this.widgets.length > 0) {
          console.log(`[PluginSlot] Zona '${this.zone}' renderizó ${this.widgets.length} widgets.`);
        }
      } catch (error) {
        console.error(`Error cargando zona ${this.zone}:`, error);
      } finally {
        this.loading = false;
      }
    },
    
    // Permite que un plugin emita eventos hacia arriba
    handlePluginAction(payload) {
      this.$emit('plugin-action', payload);
    }
  }
};
</script>

<style scoped>
.plugin-slot-container {
  width: 100%;
}

.plugin-widget-wrapper {
  margin-bottom: 15px;
  transition: all 0.3s ease;
}

/* Spinner simple para no depender de librerías externas */
.slot-loading {
  font-size: 0.85em;
  color: #64748b;
  padding: 10px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #cbd5e1;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>