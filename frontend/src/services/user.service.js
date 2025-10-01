import axios from 'axios';
import authHeader from './auth-header';

import { API_URL } from './frontend_apiConfig';

class UserService {
  // Obtener todos los usuarios con paginación y filtros
  getAllUsers(params = {}) {
    let queryParams = new URLSearchParams();
    
    // Añadir parámetros a la consulta
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.username) queryParams.append('username', params.username);
    if (params.email) queryParams.append('email', params.email);
    if (params.active !== undefined) queryParams.append('active', params.active);
    if (params.roleId) queryParams.append('roleId', params.roleId);
    if (params.role) queryParams.append('role', params.role);

    return axios.get(API_URL + 'users?' + queryParams.toString(), { headers: authHeader() });
  }
  
  // Obtener un usuario por ID
  getUser(id) {
    return axios.get(API_URL + 'users/' + id, { headers: authHeader() });
  }
  
  // Obtener solo usuarios técnicos (mantener método existente)
  getTechnicians() {
    return axios.get(API_URL + 'users?role=tecnico', { headers: authHeader() });
  }
  
  // Crear usuario
  // Crear usuario
  createUser(user) {
    return axios.post(API_URL + 'users', user, { headers: authHeader() });
  }
  
  // Actualizar usuario
  updateUser(id, user) {
    return axios.put(API_URL + 'users/' + id, user, { headers: authHeader() });
  }
  
  // Cambiar estado de usuario (activar/desactivar)
  changeUserStatus(id, active) {
    return axios.patch(API_URL + 'users/' + id + '/status', { active }, { headers: authHeader() });
  }
  
  // Cambiar rol de usuario (método nuevo)
  changeUserRole(id, roleId) {
    return axios.patch(API_URL + 'users/' + id + '/role', { roleId }, { headers: authHeader() });
  }
  
  // Eliminar usuario
  deleteUser(id) {
    return axios.delete(API_URL + 'users/' + id, { headers: authHeader() });
  }
  
  // Cambiar contraseña (mantener método existente)
  changePassword(id, oldPassword, newPassword) {
    return axios.post(API_URL + 'users/' + id + '/change-password', {
      oldPassword,
      newPassword
    }, { headers: authHeader() });
  }
  
  // Obtener perfil del usuario actual
  getCurrentUserProfile() {
    return axios.get(API_URL + 'users/profile', { headers: authHeader() });
  }
}

export default new UserService();