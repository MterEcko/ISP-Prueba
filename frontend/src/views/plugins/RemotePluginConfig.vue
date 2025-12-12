<template>
  <div class="remote-plugin-config">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando configuracion del plugin...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <h3>Error cargando plugin</h3>
      <p>{{ error }}</p>
      <button @click="loadRemoteComponent" class="btn-retry">Reintentar</button>
    </div>

    <component v-else-if="remoteComponent" :is="remoteComponent"></component>
  </div>
</template>

<script>
import { defineAsyncComponent, ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';

export default {
  name: 'RemotePluginConfig',
  setup() {
    const route = useRoute();
    const loading = ref(true);
    const error = ref(null);
    const remoteComponent = ref(null);
    const pluginName = ref(route.meta.pluginName);

    const loadRemoteComponent = async () => {
      loading.value = true;
      error.value = null;
      remoteComponent.value = null;

      try {
        console.log(`Cargando componente remoto para: ${pluginName.value}`);

        const response = await api.get(`/system-plugins/${pluginName.value}/config-view`);

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error cargando componente');
        }

        const vueContent = response.data.content;

        // Crear componente dinámicamente desde el string
        const component = defineAsyncComponent(() => {
          return new Promise((resolve) => {
            // Extraer template, script y style
            const templateMatch = vueContent.match(/<template>([\s\S]*?)<\/template>/);
            const scriptMatch = vueContent.match(/<script>([\s\S]*?)<\/script>/);

            if (!templateMatch) {
              throw new Error('Template no encontrado en el componente');
            }

            const template = templateMatch[1];
            let componentOptions = {};

            if (scriptMatch) {
              // Ejecutar el script para obtener las opciones del componente
              const scriptContent = scriptMatch[1];
              // Crear función que retorne el objeto del componente
              const func = new Function('api', `
                ${scriptContent}
                return (typeof module !== 'undefined' && module.exports) || {};
              `);
              componentOptions = func(api);

              // Si es export default, usar el default
              if (componentOptions.default) {
                componentOptions = componentOptions.default;
              }
            }

            // Combinar template con opciones
            const finalComponent = {
              ...componentOptions,
              template: template
            };

            resolve(finalComponent);
          });
        });

        remoteComponent.value = component;
        loading.value = false;

      } catch (err) {
        console.error('Error loading remote component:', err);
        error.value = err.response?.data?.message || err.message || 'Error desconocido';
        loading.value = false;
      }
    };

    onMounted(() => {
      loadRemoteComponent();
    });

    watch(() => route.meta.pluginName, (newPluginName) => {
      if (newPluginName !== pluginName.value) {
        pluginName.value = newPluginName;
        loadRemoteComponent();
      }
    });

    return {
      loading,
      error,
      remoteComponent,
      loadRemoteComponent
    };
  }
};
</script>

<style scoped>
.remote-plugin-config {
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
</style>
