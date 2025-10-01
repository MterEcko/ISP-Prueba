import axios from 'axios';
import authHeader from './auth-header';

import { API_URL } from './frontend_apiConfig';

class NetworkService {
  // Nodos
  getAllNodes(params = {}) {
    console.log('NetworkService: Solicitando nodos con params:', params);
    let queryParams = new URLSearchParams();
    
    if (params.name) queryParams.append('name', params.name);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'nodes?' + queryParams.toString(), { headers: authHeader() })
      .then(response => {
        console.log('NetworkService: Nodos recibidos:', response);
        return response;
      })
      .catch(error => {
        console.error('NetworkService: Error al obtener nodos:', error);
        throw error;
      });
  }

  getNode(id) {
    return axios.get(API_URL + 'nodes/' + id, { headers: authHeader() });
  }

  createNode(node) {
    return axios.post(API_URL + 'nodes', node, { headers: authHeader() });
  }

  updateNode(id, node) {
    return axios.put(API_URL + 'nodes/' + id, node, { headers: authHeader() });
  }

  deleteNode(id) {
    return axios.delete(API_URL + 'nodes/' + id, { headers: authHeader() });
  }

  // Sectores
  getAllSectors(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.name) queryParams.append('name', params.name);
    if (params.nodeId) queryParams.append('nodeId', params.nodeId);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'sectors/' , { headers: authHeader() });
  }

  getSector(id) {
    return axios.get(API_URL + 'sectors/' + id, { headers: authHeader() });
  }

  createSector(sector) {
    return axios.post(API_URL + 'sectors', sector, { headers: authHeader() });
  }

  updateSector(id, sector) {
    return axios.put(API_URL + 'sectors/' + id, sector, { headers: authHeader() });
  }

  deleteSector(id) {
    return axios.delete(API_URL + 'sectors/' + id, { headers: authHeader() });
  }
  
  // =====================
  // GESTIÓN DE ZONAS
  // =====================

  /**
   * Obtener todas las zonas con filtros opcionales
   */
  getAllZones(params = {}) {
    console.log('NetworkService: Solicitando zonas con params:', params);
    let queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.status !== undefined && params.status !== '') queryParams.append('status', params.status);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);

    const queryString = queryParams.toString();
    const url = queryString ? `${API_URL}zones?${queryString}` : `${API_URL}zones`;
    
    return axios.get(url, { headers: authHeader() })
    .then(response => {
      console.log('NetworkService: Zonas recibidas:', response);
      return response;
    })
    .catch(error => {
      console.error('NetworkService: Error al obtener zonas:', error);
      throw error;
    });
  }

  /**
   * Obtener una zona por ID
   */
  getZone(id) {
    console.log('NetworkService: Solicitando zona con ID:', id);
    return axios.get(`${API_URL}zones/${id}`, { headers: authHeader() })
    .then(response => {
      console.log('NetworkService: Zona recibida:', response);
      return response;
    })
    .catch(error => {
      console.error('NetworkService: Error al obtener zona:', error);
      throw error;
    });
  }

  /**
   * Crear nueva zona
   */
  createZone(zoneData) {
    console.log('NetworkService: Creando zona:', zoneData);
    return axios.post(`${API_URL}zones`, zoneData, { headers: authHeader() })
    .then(response => {
      console.log('NetworkService: Zona creada:', response);
      return response;
    })
    .catch(error => {
      console.error('NetworkService: Error al crear zona:', error);
      throw error;
    });
    
  }

  /**
   * Actualizar zona existente
   */
  updateZone(id, zoneData) {
    console.log('NetworkService: Actualizando zona:', id, zoneData);
    return axios.put(`${API_URL}zones/${id}`, zoneData, { headers: authHeader() })
    .then(response => {
      console.log('NetworkService: Zona actualizada:', response);
      return response;
    })
    .catch(error => {
      console.error('NetworkService: Error al actualizar zona:', error);
      throw error;
    });
  }

  /**
   * Eliminar zona
   */
  deleteZone(id) {
    console.log('NetworkService: Eliminando zona:', id);
    return axios.delete(`${API_URL}zones/${id}`, { headers: authHeader() })
    .then(response => {
      console.log('NetworkService: Zona eliminada:', response);
      return response;
    })
    .catch(error => {
      console.error('NetworkService: Error al eliminar zona:', error);
      throw error;
    });
  }

  /**
   * Obtener nodos de una zona específica
   */
  getNodesByZone(zoneId) {
    console.log('NetworkService: Solicitando nodos de zona:', zoneId);
    return axios.get(`${API_URL}zones/${zoneId}/nodes`, { headers: authHeader() })
    .then(response => {
      console.log('NetworkService: Nodos de zona recibidos:', response);
      return response;
    })
    .catch(error => {
      console.error('NetworkService: Error al obtener nodos de zona:', error);
      throw error;
    });
  }
  
  

  /**
   * Cambiar estado de zona (activar/desactivar)
   */
  toggleZoneStatus(id, active) {
    console.log('NetworkService: Cambiando estado de zona:', id, active);
    return axios.patch(`${API_URL}network/zones/${id}/status`, { active }, { headers: authHeader() })
    .then(response => {
      console.log('NetworkService: Estado de zona cambiado:', response);
      return response;
    })
    .catch(error => {
      console.error('NetworkService: Error al cambiar estado de zona:', error);
      throw error;
    });
  }
}

export default new NetworkService();