import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:3000/api/';

class ClientService {
  getAllClients(params = {}) {
    let queryParams = new URLSearchParams();
    
    // Añadir parámetros a la consulta
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.name) queryParams.append('name', params.name);
    if (params.email) queryParams.append('email', params.email);
    if (params.phone) queryParams.append('phone', params.phone);
    if (params.active !== undefined) queryParams.append('active', params.active);
    if (params.sectorId) queryParams.append('sectorId', params.sectorId);

    return axios.get(API_URL + 'clients?' + queryParams.toString(), { headers: authHeader() });
  }

  getClient(id) {
    return axios.get(API_URL + 'clients/' + id, { headers: authHeader() });
  }

  createClient(client) {
    return axios.post(API_URL + 'clients', client, { headers: authHeader() });
  }

  updateClient(id, client) {
    return axios.put(API_URL + 'clients/' + id, client, { headers: authHeader() });
  }

  changeClientStatus(id, active) {
    return axios.patch(API_URL + 'clients/' + id + '/status', { active }, { headers: authHeader() });
  }

  deleteClient(id) {
    return axios.delete(API_URL + 'clients/' + id, { headers: authHeader() });
  }

  // Documentos de cliente
  getClientDocuments(clientId) {
    return axios.get(API_URL + 'clients/' + clientId + '/documents', { headers: authHeader() });
  }

  uploadDocument(clientId, formData) {
    return axios.post(API_URL + 'clients/' + clientId + '/documents', formData, {
      headers: {
        ...authHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  downloadDocument(id) {
    return axios.get(API_URL + 'documents/' + id + '/download', {
      headers: authHeader(),
      responseType: 'blob'
    });
  }

  deleteDocument(id) {
    return axios.delete(API_URL + 'documents/' + id, { headers: authHeader() });
  }
}

export default new ClientService();