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
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
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