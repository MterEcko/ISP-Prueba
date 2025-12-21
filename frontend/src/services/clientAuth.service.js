// frontend/src/services/clientAuth.service.js
import axios from 'axios';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api/';

class ClientAuthService {
  /**
   * Login de cliente
   */
  async login(clientNumber, password) {
    try {
      const response = await axios.post(`${API_URL}client-auth/login`, {
        clientNumber,
        password
      });

      if (response.data.success && response.data.token) {
        // Guardar token y datos del cliente en localStorage
        localStorage.setItem('client', JSON.stringify(response.data.client));
        localStorage.setItem('clientToken', response.data.token);
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Error en el login' };
    }
  }

  /**
   * Logout de cliente
   */
  logout() {
    localStorage.removeItem('client');
    localStorage.removeItem('clientToken');
  }

  /**
   * Obtener cliente actual
   */
  getCurrentClient() {
    const clientData = localStorage.getItem('client');
    return clientData ? JSON.parse(clientData) : null;
  }

  /**
   * Verificar si hay un cliente logueado
   */
  isClientLoggedIn() {
    return !!localStorage.getItem('clientToken');
  }

  /**
   * Obtener token del cliente
   */
  getClientToken() {
    return localStorage.getItem('clientToken');
  }

  /**
   * Cambiar contraseña del cliente
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await axios.put(
        `${API_URL}client-auth/change-password`,
        {
          currentPassword,
          newPassword
        },
        {
          headers: {
            'x-access-token': this.getClientToken()
          }
        }
      );

      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Error al cambiar contraseña' };
    }
  }

  /**
   * Obtener perfil del cliente
   */
  async getProfile() {
    try {
      const response = await axios.get(`${API_URL}client-auth/profile`, {
        headers: {
          'x-access-token': this.getClientToken()
        }
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Error al obtener perfil' };
    }
  }

  /**
   * Actualizar perfil del cliente
   */
  async updateProfile(profileData) {
    try {
      const response = await axios.put(
        `${API_URL}client-auth/profile`,
        profileData,
        {
          headers: {
            'x-access-token': this.getClientToken()
          }
        }
      );

      // Actualizar datos del cliente en localStorage
      if (response.data.success && response.data.client) {
        const currentClient = this.getCurrentClient();
        const updatedClient = { ...currentClient, ...response.data.client };
        localStorage.setItem('client', JSON.stringify(updatedClient));
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Error al actualizar perfil' };
    }
  }
}

export default new ClientAuthService();
