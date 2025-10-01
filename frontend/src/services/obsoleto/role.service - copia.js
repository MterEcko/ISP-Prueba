import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:3000/api/';

class RoleService {
  getAllRoles() {
    return axios.get(API_URL + 'roles', { headers: authHeader() });
  }

  getRole(id) {
    return axios.get(API_URL + 'roles/' + id, { headers: authHeader() });
  }

  createRole(role) {
    return axios.post(API_URL + 'roles', role, { headers: authHeader() });
  }

  updateRole(id, role) {
    return axios.put(API_URL + 'roles/' + id, role, { headers: authHeader() });
  }

  deleteRole(id) {
    return axios.delete(API_URL + 'roles/' + id, { headers: authHeader() });
  }

  // Permisos
  getAllPermissions() {
    return axios.get(API_URL + 'permissions', { headers: authHeader() });
  }

  // Asignación de permisos a roles
  getRolePermissions(roleId) {
    return axios.get(API_URL + 'roles/' + roleId + '/permissions', { headers: authHeader() });
  }

  updateRolePermissions(roleId, permissionIds) {
    return axios.post(API_URL + 'roles/' + roleId + '/permissions', { permissionIds }, { headers: authHeader() });
  }
}

export default new RoleService();