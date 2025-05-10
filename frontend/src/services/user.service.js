import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:3000/api/';

class UserService {
  // Obtener todos los usuarios
  getAllUsers() {
    return axios.get(API_URL + 'users', { headers: authHeader() });
  }
  
  // Obtener un usuario por ID
  getUser(id) {
    return axios.get(API_URL + 'users/' + id, { headers: authHeader() });
  }
  
  // Obtener solo usuarios técnicos
  getTechnicians() {
    return axios.get(API_URL + 'users?role=tecnico', { headers: authHeader() });
  }
  
  // Crear usuario (solo admin)
  createUser(user) {
    return axios.post(API_URL + 'users', user, { headers: authHeader() });
  }
  
  // Actualizar usuario
  updateUser(id, user) {
    return axios.put(API_URL + 'users/' + id, user, { headers: authHeader() });
  }
  
  // Eliminar usuario (solo admin)
  deleteUser(id) {
    return axios.delete(API_URL + 'users/' + id, { headers: authHeader() });
  }
  
  // Cambiar contraseña
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