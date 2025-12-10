import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class IpAssignmentService {
  /**
   * Obtiene todas las IPs de un pool específico
   * @param {number} poolId - ID del pool de IPs
   * @param {number} page - Número de página
   * @param {number} size - Tamaño de página
   * @param {string} status - Filtro por estado (opcional)
   * @returns {Promise} - Promesa con los datos de las IPs
   */
  getIpsByPool(poolId, page = 0, size = 10, status = null) {
    let url = `${API_URL}ip-pools/${poolId}/ips?page=${page}&size=${size}`;
    if (status) {
      url += `&status=${status}`;
    }
    return axios.get(url, { headers: authHeader() });
  }

  /**
   * Asigna una IP a un usuario PPPoE
   * @param {number} mikrotikPPPOEId - ID del usuario PPPoE
   * @param {number} ipPoolId - ID del pool de IPs (opcional)
   * @param {string} specificIp - IP específica a asignar (opcional)
   * @returns {Promise} - Promesa con el resultado de la asignación
   */
  assignIpToUser(mikrotikPPPOEId, ipPoolId = null, specificIp = null) {
    const data = {};
    if (ipPoolId) data.ipPoolId = ipPoolId;
    if (specificIp) data.specificIp = specificIp;
    
    return axios.post(
      `${API_URL}pppoe-users/${mikrotikPPPOEId}/assign-ip`,
      data,
      { headers: authHeader() }
    );
  }

  /**
   * Libera una IP asignada a un usuario PPPoE
   * @param {number} mikrotikPPPOEId - ID del usuario PPPoE
   * @returns {Promise} - Promesa con el resultado de la liberación
   */
  releaseIpFromUser(mikrotikPPPOEId) {
    return axios.post(
      `${API_URL}pppoe-users/${mikrotikPPPOEId}/release-ip`,
      {},
      { headers: authHeader() }
    );
  }

  /**
   * Importa IPs desde un rango CIDR a un pool
   * @param {number} poolId - ID del pool de IPs
   * @param {string} cidr - Rango CIDR (ej: 192.168.1.0/24)
   * @returns {Promise} - Promesa con el resultado de la importación
   */
  importIpsFromCidr(poolId, cidr) {
    return axios.post(
      `${API_URL}ip-pools/${poolId}/import-cidr`,
      { cidr },
      { headers: authHeader() }
    );
  }

  /**
   * Obtiene estadísticas de un pool de IPs
   * @param {number} poolId - ID del pool de IPs
   * @returns {Promise} - Promesa con las estadísticas del pool
   */
  getPoolStats(poolId) {
    return axios.get(
      `${API_URL}ip-pools/${poolId}/stats`,
      { headers: authHeader() }
    );
  }

  /**
   * Sincroniza las IPs asignadas con el router Mikrotik
   * @param {number} routerId - ID del router Mikrotik
   * @returns {Promise} - Promesa con el resultado de la sincronización
   */
  syncIpsWithRouter(routerId) {
    return axios.post(
      `${API_URL}mikrotik-routers/${routerId}/sync-ips`,
      {},
      { headers: authHeader() }
    );
  }

  /**
   * Verifica y corrige inconsistencias en las asignaciones de IPs
   * @returns {Promise} - Promesa con el resultado de la verificación
   */
  verifyIpAssignments() {
    return axios.post(
      `${API_URL}ip-assignments/verify`,
      {},
      { headers: authHeader() }
    );
  }

  /**
   * Actualiza una IP específica
   * @param {number} ipId - ID de la IP
   * @param {object} data - Datos a actualizar (status, comment)
   * @returns {Promise} - Promesa con el resultado de la actualización
   */
  updateIp(ipId, data) {
    return axios.put(
      `${API_URL}ips/${ipId}`,
      data,
      { headers: authHeader() }
    );
  }

  /**
   * Busca IPs disponibles en un pool específico
   * @param {number} poolId - ID del pool de IPs
   * @returns {Promise} - Promesa con las IPs disponibles
   */
  getAvailableIps(poolId) {
    return this.getIpsByPool(poolId, 0, 100, 'available');
  }

  /**
   * Obtiene todas las IPs asignadas a un cliente específico
   * @param {number} clientId - ID del cliente
   * @returns {Promise} - Promesa con las IPs asignadas
   */
  getClientIps(clientId) {
    return axios.get(
      `${API_URL}clients/${clientId}/ips`,
      { headers: authHeader() }
    );
  }
}

export default new IpAssignmentService();
