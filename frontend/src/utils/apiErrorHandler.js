// frontend/src/utils/apiErrorHandler.js
// Crea este archivo para manejar errores de API

import router from '../router';

export const handleApiError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || 'Error desconocido';
    
    switch (status) {
      case 401:
        // Error de autenticación
        console.warn('Error 401: Sin autorización');
        
        // Si es error de autenticación del sistema, redirigir al login
        if (error.config.url.includes('/api/auth/')) {
          localStorage.removeItem('user');
          router.push('/login');
          return {
            error: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
            shouldRedirect: true
          };
        }
        
        // Si es error de Mikrotik, mostrar mensaje específico
        if (error.config.url.includes('/mikrotik/')) {
          return {
            error: 'Error de autenticación con el router Mikrotik. Verifique las credenciales.',
            shouldRedirect: false,
            mikrotikError: true
          };
        }
        
        return {
          error: 'No tiene permisos para realizar esta acción.',
          shouldRedirect: false
        };
        
      case 403:
        return {
          error: 'Acceso denegado. No tiene permisos suficientes.',
          shouldRedirect: false
        };
        
      case 404:
        return {
          error: 'Recurso no encontrado.',
          shouldRedirect: false
        };
        
      case 500:
        return {
          error: 'Error interno del servidor. Intente nuevamente.',
          shouldRedirect: false
        };
        
      default:
        return {
          error: `Error ${status}: ${message}`,
          shouldRedirect: false
        };
    }
  } else if (error.request) {
    // Error de red
    return {
      error: 'Error de conexión. Verifique su conexión a internet.',
      shouldRedirect: false,
      networkError: true
    };
  } else {
    // Error de configuración
    return {
      error: 'Error en la configuración de la solicitud.',
      shouldRedirect: false
    };
  }
};

// Interceptor global para axios
export const setupGlobalErrorHandler = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    response => response,
    error => {
      const errorInfo = handleApiError(error);
      
      // Solo mostrar notificación si no es un error de Mikrotik
      if (!errorInfo.mikrotikError) {
        // Aquí puedes integrar tu sistema de notificaciones
        console.error('Global Error:', errorInfo.error);
      }
      
      return Promise.reject(error);
    }
  );
};