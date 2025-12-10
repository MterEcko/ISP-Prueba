// frontend/src/services/api.js
import axios from "axios";
import { API_URL } from "./frontend_apiConfig"; // ✅ Usamos tu configuración dinámica de URL

// Crear la instancia de Axios
const instance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// =================================================================
// INTERCEPTOR 1: Inyectar el Token (Reemplaza el uso manual de auth-header)
// =================================================================
instance.interceptors.request.use(
  (config) => {
    // Leemos el usuario del localStorage (igual que en tu auth-header.js)
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user && user.accessToken) {
      // Inyectamos el header que tu backend espera
      config.headers["x-access-token"] = user.accessToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =================================================================
// INTERCEPTOR 2: Manejo de Errores (Token vencido)
// =================================================================
instance.interceptors.response.use(
  (res) => {
    return res;
  },
  async (err) => {
    const originalConfig = err.config;

    // Si la URL no es login y recibimos un 401 (No autorizado)
    if (originalConfig.url !== "auth/signin" && err.response) {
      if (err.response.status === 401 && !originalConfig._retry) {
        originalConfig._retry = true;
        
        console.warn("Sesión expirada o token inválido. Redirigiendo a login...");
        
        // Limpiamos sesión y forzamos logout
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default instance;