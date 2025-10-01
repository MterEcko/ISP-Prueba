import axios from 'axios';
import authHeader from './auth-header';

import { API_URL } from './frontend_apiConfig';

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



  // Asignación de permisos a roles
  getRolePermissions(roleId) {
    return axios.get(API_URL + 'roles/' + roleId + '/permissions', { headers: authHeader() });
  }

  updateRolePermissions(roleId, permissionIds) {
    return axios.post(API_URL + 'roles/' + roleId + '/permissions', { permissionIds }, { headers: authHeader() });
  }

    // Permisos
  getAllPermissions() {
    return axios.get(API_URL + 'permissions', { headers: authHeader() });
  }

  getPermission(permissionId){
    return axios.get(API_URL + 'permissions/' + permissionId, { headers: authHeader() })
  }

  createPermission(){
    return axios.post(API_URL + 'permissions/', { headers: authHeader() } )
  }

  updatePermission(permissionId){
    return axios.put(API_URL + 'permissions/' + permissionId, { headers: authHeader() })
  }
  deletePermission(permissionId) {
    return axios.delete(API_URL +  'permissions/' + permissionId, { headers: authHeader() })
  }
}

export default new RoleService();