import axios from 'axios';
import authHeader from './auth-header';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api/';

class SectorService {
  // Obtener todos los sectores
  getAllSectors(params = {}) {
    let queryParams = new URLSearchParams();
    if (params.name) queryParams.append('name', params.name);
    if (params.nodeId) queryParams.append('nodeId', params.nodeId);
    if (params.active !== undefined) queryParams.append('active', params.active);
    
    return axios.get(API_URL + 'network/sectors?' + queryParams.toString(), { headers: authHeader() });
  }

  // Obtener un sector por ID
  getSector(id) {
    return axios.get(API_URL + 'network/sectors/' + id, { headers: authHeader() });
  }

  // Crear un nuevo sector
  createSector(sector) {
    return axios.post(API_URL + 'network/sectors', sector, { headers: authHeader() });
  }

  // Actualizar un sector
  updateSector(id, sector) {
    return axios.put(API_URL + 'network/sectors/' + id, sector, { headers: authHeader() });
  }

  // Eliminar un sector
  deleteSector(id) {
    return axios.delete(API_URL + 'network/sectors/' + id, { headers: authHeader() });
  }

  // Obtener sectores de un nodo específico
  getSectorsByNode(nodeId) {
    return axios.get(API_URL + 'network/sectors?nodeId=' + nodeId, { headers: authHeader() });
  }
}

export default new SectorService();