import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:3000/api/';

class TicketService {
  // Obtener tickets con filtros
  getTickets(params = {}) {
    let queryParams = new URLSearchParams();
    
    // Añadir parámetros
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.status) queryParams.append('status', params.status);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.category) queryParams.append('category', params.category);
    if (params.assignedToId) queryParams.append('assignedToId', params.assignedToId);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.search) queryParams.append('search', params.search);
    
    return axios.get(API_URL + 'tickets?' + queryParams.toString(), {
      headers: authHeader()
    });
  }
  
  // Obtener un ticket por ID
  getTicket(id) {
    return axios.get(API_URL + 'tickets/' + id, {
      headers: authHeader()
    });
  }
  
  // Crear un nuevo ticket
  createTicket(ticket) {
    return axios.post(API_URL + 'tickets', ticket, {
      headers: authHeader()
    });
  }
  
  // Actualizar un ticket
  updateTicket(id, ticket) {
    return axios.put(API_URL + 'tickets/' + id, ticket, {
      headers: authHeader()
    });
  }
  
  // Eliminar un ticket
  deleteTicket(id) {
    return axios.delete(API_URL + 'tickets/' + id, {
      headers: authHeader()
    });
  }
  
  // Obtener comentarios de un ticket
  getTicketComments(ticketId) {
    return axios.get(API_URL + 'tickets/' + ticketId + '/comments', {
      headers: authHeader()
    });
  }
  
  // Añadir comentario a un ticket
  addComment(ticketId, comment) {
    return axios.post(API_URL + 'tickets/' + ticketId + '/comments', comment, {
      headers: authHeader()
    });
  }
  
  // Actualizar un comentario
  updateComment(commentId, comment) {
    return axios.put(API_URL + 'comments/' + commentId, comment, {
      headers: authHeader()
    });
  }
  
  // Eliminar un comentario
  deleteComment(commentId) {
    return axios.delete(API_URL + 'comments/' + commentId, {
      headers: authHeader()
    });
  }
}

export default new TicketService();