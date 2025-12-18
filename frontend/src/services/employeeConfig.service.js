// frontend/src/services/employeeConfig.service.js
import axios from 'axios';
import authHeader from './auth-header';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api';

class EmployeeConfigService {
  /**
   * Obtener configuración de un empleado
   */
  async getEmployeeConfig(employeeId) {
    return axios.get(`${API_URL}/employee-config/${employeeId}`, {
      headers: authHeader()
    });
  }

  /**
   * Obtener todas las configuraciones
   */
  async getAllEmployeeConfigs(activeOnly = false) {
    return axios.get(`${API_URL}/employee-config`, {
      params: { active: activeOnly || undefined },
      headers: authHeader()
    });
  }

  /**
   * Crear o actualizar configuración de empleado
   */
  async upsertEmployeeConfig(employeeId, configData) {
    return axios.put(`${API_URL}/employee-config/${employeeId}`, configData, {
      headers: authHeader()
    });
  }

  /**
   * Eliminar configuración de empleado
   */
  async deleteEmployeeConfig(employeeId) {
    return axios.delete(`${API_URL}/employee-config/${employeeId}`, {
      headers: authHeader()
    });
  }

  /**
   * Calcular salario para un período específico
   */
  async calculateSalary(employeeId, paymentType) {
    return axios.get(`${API_URL}/employee-config/${employeeId}/calculate`, {
      params: { paymentType },
      headers: authHeader()
    });
  }
}

export default new EmployeeConfigService();
