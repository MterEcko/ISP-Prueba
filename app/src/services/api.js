import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de la API
const API_URL = __DEV__
  ? 'http://localhost:3001/api/' // Desarrollo
  : 'https://tu-dominio.com/api/'; // Producción

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers['x-access-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Token expirado o inválido
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Aquí podrías redirigir al login
    }
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  login: async (email, password) => {
    const response = await api.post('auth/signin', { email, password });
    if (response.data.accessToken) {
      await AsyncStorage.setItem('token', response.data.accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Servicios del portal del cliente
export const clientPortalService = {
  getDashboard: () => api.get('client-portal/dashboard'),

  getInvoices: (filters = {}) =>
    api.get('client-portal/invoices', { params: filters }),

  getInvoiceDetail: (id) => api.get(`client-portal/invoices/${id}`),

  getTickets: (filters = {}) =>
    api.get('client-portal/tickets', { params: filters }),

  createTicket: (data) => api.post('client-portal/tickets', data),

  addTicketComment: (ticketId, message) =>
    api.post(`client-portal/tickets/${ticketId}/comments`, { message }),

  getUsageStats: (period = 'week') =>
    api.get('client-portal/usage', { params: { period } }),

  updateProfile: (data) => api.put('client-portal/profile', data),

  changePassword: (data) => api.put('client-portal/change-password', data),
};

export default api;
