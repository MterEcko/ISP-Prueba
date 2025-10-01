import axios from 'axios';
import authHeader from './auth-header';

const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api/';

class NodeService {
  // Obtener todos los nodos
  getAllNodes(params = {}) {
    let queryParams = new URLSearchParams();
    if (params.name) queryParams.append('name', params.name);
    if (params.active !== undefined) queryParams.append('active', params.active);
    
    return axios.get(API_URL + 'network/nodes?' + queryParams.toString(), { headers: authHeader() });
  }

  // Obtener un nodo por ID
  getNode(id) {
    return axios.get(API_URL + 'network/nodes/' + id, { headers: authHeader() });
  }

  // Crear un nuevo nodo
  createNode(node) {
    return axios.post(API_URL + 'network/nodes', node, { headers: authHeader() });
  }

  // Actualizar un nodo
  updateNode(id, node) {
    return axios.put(API_URL + 'network/nodes/' + id, node, { headers: authHeader() });
  }

  // Eliminar un nodo
  deleteNode(id) {
    return axios.delete(API_URL + 'network/nodes/' + id, { headers: authHeader() });
  }
}

export default new NodeService();