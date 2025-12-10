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

    <div v-else-if="component" class="plugin-config-container">
      <component :is="component" />
    </div>
  </div>
</template>

<script>
import api from '@/services/api';
import Vue from 'vue';

export default {
  name: 'DynamicPluginConfig',
  data() {
    return {
      loading: true,
      error: null,
      component: null,
      pluginName: null
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
      this.component = null;

      try {
        console.log(`Loading plugin config for: ${this.pluginName}`);

        // Obtener el contenido del archivo Vue desde el backend
        const response = await api.get(`/system-plugins/${this.pluginName}/config-view`);

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error cargando configuración');
        }

        const vueContent = response.data.data.content;

        // Compilar el componente Vue en tiempo de ejecución
        const compiledComponent = this.compileVueComponent(vueContent);

        this.component = compiledComponent;
        this.loading = false;

      } catch (error) {
        console.error('Error loading plugin config:', error);
        this.error = error.response?.data?.message || error.message || 'Error desconocido';
        this.loading = false;
      }
    },

    compileVueComponent(vueContent) {
      try {
        // Extraer template, script y style del contenido Vue
        const templateMatch = vueContent.match(/<template>([\s\S]*?)<\/template>/);
        const scriptMatch = vueContent.match(/<script>([\s\S]*?)<\/script>/);
        const styleMatch = vueContent.match(/<style[^>]*>([\s\S]*?)<\/style>/);

        if (!templateMatch) {
          throw new Error('No se encontró template en el componente');
        }

        const template = templateMatch[1];
        let componentOptions = {};

        if (scriptMatch) {
          // Ejecutar el script para obtener las opciones del componente
          const scriptContent = scriptMatch[1];

          // Crear función que retorna las opciones del componente
          const scriptFunction = new Function('return ' + scriptContent.replace(/export default/, ''));
          componentOptions = scriptFunction();
        }

        // Agregar el template compilado
        const compiledTemplate = Vue.compile(template);
        componentOptions.render = compiledTemplate.render;
        componentOptions.staticRenderFns = compiledTemplate.staticRenderFns;

        // Agregar estilos si existen
        if (styleMatch) {
          const style = document.createElement('style');
          style.textContent = styleMatch[1];
          document.head.appendChild(style);
        }

        return componentOptions;

      } catch (error) {
        console.error('Error compilando componente Vue:', error);
        throw new Error(`Error compilando componente: ${error.message}`);
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
}
</style>
