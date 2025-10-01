// frontend_apiConfig.js
// Este archivo centraliza la configuración de la URL base de la API para el frontend.

const API_BASE_URL = process.env.VUE_APP_API_URL || "http://localhost:3000/api/";

export default API_BASE_URL;

// Instrucciones de uso:
// 1. Importar en los archivos de servicio:
//    import API_BASE_URL from "./frontend_apiConfig"; // Ajustar la ruta según la ubicación del archivo
//
// 2. Usar al construir las URLs de las peticiones:
//    const response = await fetch(`${API_BASE_URL}usuarios`);
//
// Para configuración en producción o diferentes entornos:
// Se recomienda utilizar variables de entorno (como VUE_APP_API_URL para proyectos Vue.js).
// El archivo `.env` en la raíz del proyecto Vue podría contener:
// VUE_APP_API_URL=https://tu-dominio-de-produccion.com/api/
//
// Si la variable de entorno no está definida, se usará "http://localhost:3000/api/" por defecto.

