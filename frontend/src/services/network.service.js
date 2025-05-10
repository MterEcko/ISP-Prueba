import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:3000/api/';

class NetworkService {
  // Nodos
  getAllNodes(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.name) queryParams.append('name', params.name);
    if (params.active !== undefined) queryParams.append('active', params.active);

    return axios.get(API_URL + 'nodes?' + queryParams.toString(), { headers: authHeader() });
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

    return axios.get(API_URL + 'sectors?' + queryParams.toString(), { headers: authHeader() });
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
}

export default new NetworkService();