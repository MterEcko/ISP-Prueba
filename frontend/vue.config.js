const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: [], // Debe ser un array para Vue CLI 5
  
  // Configuración para Vuetify 3
  pluginOptions: {
    vuetify: {
      // Vuetify 3 no tiene opciones específicas en el loader como tenía Vuetify 2
    }
  },
  
  // Configuración del servidor de desarrollo
  devServer: {
    port: 8080,
    host: '0.0.0.0', // Escuchar en todas las interfaces
    allowedHosts: 'all', // Permitir cualquier host (Cloudflare, IPs, etc)
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws'
    },
    proxy: {
      '/api': {
        target: process.env.VUE_APP_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Configuración de CSS/Sass si usas variables globales
  css: {
    loaderOptions: {
      sass: {
        additionalData: `@import "@/assets/styles/variables.scss";`
      }
    }
  }
})