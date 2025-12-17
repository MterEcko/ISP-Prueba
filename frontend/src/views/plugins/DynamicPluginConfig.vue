<template>
  <div class="dynamic-plugin-config">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando configuración del plugin...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <h3>Error cargando plugin</h3>
      <p>{{ error }}</p>
      <button @click="loadPlugin" class="btn-retry">Reintentar</button>
    </div>

    <div v-else-if="pluginData" class="plugin-config-container">
      <div class="plugin-header">
        <h2>{{ pluginData.name || pluginName }}</h2>
        <p class="plugin-description">{{ pluginData.description }}</p>
      </div>

      <form @submit.prevent="saveConfiguration" class="config-form">
        <div
          v-for="(fieldConfig, fieldKey) in pluginData.configuration"
          :key="fieldKey"
          class="form-group"
        >
          <label :for="fieldKey">
            {{ fieldConfig.label }}
            <span v-if="fieldConfig.required" class="required">*</span>
          </label>

          <p v-if="fieldConfig.description" class="field-description">
            {{ fieldConfig.description }}
          </p>

          <!-- Input según tipo -->
          <input
            v-if="fieldConfig.type === 'string' && !fieldConfig.secret"
            :id="fieldKey"
            v-model="formData[fieldKey]"
            type="text"
            :required="fieldConfig.required"
            :placeholder="fieldConfig.label"
          />

          <input
            v-else-if="fieldConfig.type === 'string' && fieldConfig.secret"
            :id="fieldKey"
            v-model="formData[fieldKey]"
            type="password"
            :required="fieldConfig.required"
            :placeholder="fieldConfig.label"
          />

          <input
            v-else-if="fieldConfig.type === 'number'"
            :id="fieldKey"
            v-model.number="formData[fieldKey]"
            type="number"
            :required="fieldConfig.required"
            :min="fieldConfig.min"
            :max="fieldConfig.max"
            :placeholder="fieldConfig.label"
          />

          <div v-else-if="fieldConfig.type === 'boolean'" class="checkbox-wrapper">
            <input
              :id="fieldKey"
              v-model="formData[fieldKey]"
              type="checkbox"
            />
            <span>{{ fieldConfig.label }}</span>
          </div>

          <textarea
            v-else-if="fieldConfig.type === 'text'"
            :id="fieldKey"
            v-model="formData[fieldKey]"
            :required="fieldConfig.required"
            :placeholder="fieldConfig.label"
            rows="4"
          ></textarea>

          <select
            v-else-if="fieldConfig.type === 'select'"
            :id="fieldKey"
            v-model="formData[fieldKey]"
            :required="fieldConfig.required"
          >
            <option value="">Seleccionar...</option>
            <option
              v-for="option in fieldConfig.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <!-- Array type (simplificado como textarea JSON) -->
          <textarea
            v-else-if="fieldConfig.type === 'array'"
            :id="fieldKey"
            v-model="formData[fieldKey]"
            :required="fieldConfig.required"
            placeholder='["item1", "item2"]'
            rows="3"
          ></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-save" :disabled="saving">
            {{ saving ? 'Guardando...' : 'Guardar Configuración' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import api from '@/services/api';

export default {
  name: 'DynamicPluginConfig',
  data() {
    return {
      loading: true,
      error: null,
      pluginData: null,
      pluginName: null,
      formData: {},
      saving: false
    };
  },
  created() {
    this.pluginName = this.$route.meta.pluginName;
    this.loadPlugin();
  },
  watch: {
    '$route.meta.pluginName'(newName) {
      if (newName !== this.pluginName) {
        this.pluginName = newName;
        this.loadPlugin();
      }
    }
  },
  methods: {
    async loadPlugin() {
      this.loading = true;
      this.error = null;
      this.pluginData = null;

      try {
        console.log(`Loading plugin config for: ${this.pluginName}`);

        // Obtener el plugin y su configuración
        const response = await api.get(`/system-plugins/name/${this.pluginName}`);

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error cargando configuración');
        }

        const plugin = response.data.data;
        this.pluginData = plugin;

        // Inicializar formData con valores actuales o defaults
        this.formData = {};
        if (plugin.configuration) {
          Object.keys(plugin.configuration).forEach(key => {
            const fieldConfig = plugin.configuration[key];
            // Usar valor guardado o default
            this.formData[key] = plugin.config?.[key] ?? fieldConfig.default ?? '';
          });
        }

        this.loading = false;

      } catch (error) {
        console.error('Error loading plugin config:', error);
        this.error = error.response?.data?.message || error.message || 'Error desconocido';
        this.loading = false;
      }
    },

    async saveConfiguration() {
      this.saving = true;
      try {
        // Procesar arrays (convertir string JSON a array)
        const processedData = {};
        Object.keys(this.formData).forEach(key => {
          const fieldConfig = this.pluginData.configuration[key];
          if (fieldConfig.type === 'array' && typeof this.formData[key] === 'string') {
            try {
              processedData[key] = JSON.parse(this.formData[key]);
            } catch {
              processedData[key] = [];
            }
          } else {
            processedData[key] = this.formData[key];
          }
        });

        const response = await api.put(`/system-plugins/${this.pluginData.id}/config`, {
          configuration: processedData
        });

        if (response.data.success) {
          alert('✅ Configuración guardada correctamente');
          // Recargar configuración para reflejar cambios
          await this.loadPluginData();
        }

      } catch (error) {
        console.error('Error saving configuration:', error);
        alert('❌ Error: ' + (error.response?.data?.message || 'Error guardando configuración'));
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.dynamic-plugin-config {
  width: 100%;
  min-height: 500px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  color: #e74c3c;
}

.error-container h3 {
  margin: 0;
  font-size: 1.5em;
}

.btn-retry {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.btn-retry:hover {
  background-color: #2980b9;
}

.plugin-config-container {
  width: 100%;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.plugin-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.plugin-header h2 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1.8em;
}

.plugin-description {
  margin: 0;
  color: #7f8c8d;
  font-size: 1em;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95em;
}

.required {
  color: #e74c3c;
  margin-left: 4px;
}

.field-description {
  margin: 0;
  font-size: 0.85em;
  color: #95a5a6;
  font-style: italic;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="number"],
.form-group textarea,
.form-group select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95em;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #3498db;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.checkbox-wrapper input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-wrapper span {
  font-size: 0.95em;
  color: #2c3e50;
}

.form-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}

.btn-save {
  padding: 12px 30px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: background-color 0.2s;
}

.btn-save:hover:not(:disabled) {
  background-color: #229954;
}

.btn-save:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}
</style>
