import api from '@/api';

class CalendarService {
  /**
   * Obtener eventos
   */
  async getEvents(filters = {}) {
    try {
      const response = await api.get('/calendar/events', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  }

  /**
   * Obtener evento por ID
   */
  async getEventById(id) {
    try {
      const response = await api.get(`/calendar/events/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }

  /**
   * Crear evento
   */
  async createEvent(eventData) {
    try {
      const response = await api.post('/calendar/events', eventData);
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Actualizar evento
   */
  async updateEvent(id, eventData) {
    try {
      const response = await api.put(`/calendar/events/${id}`, eventData);
      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Eliminar evento
   */
  async deleteEvent(id) {
    try {
      const response = await api.delete(`/calendar/events/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // === GOOGLE CALENDAR ===

  /**
   * Obtener URL de autorización de Google
   */
  async getGoogleAuthUrl() {
    try {
      const response = await api.get('/calendar/google/auth-url');
      return response.data;
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      throw error;
    }
  }

  /**
   * Obtener calendarios de Google
   */
  async getGoogleCalendars() {
    try {
      const response = await api.get('/calendar/google/calendars');
      return response.data;
    } catch (error) {
      console.error('Error getting Google calendars:', error);
      throw error;
    }
  }

  // === MICROSOFT CALENDAR ===

  /**
   * Obtener URL de autorización de Microsoft
   */
  async getMicrosoftAuthUrl() {
    try {
      const response = await api.get('/calendar/microsoft/auth-url');
      return response.data;
    } catch (error) {
      console.error('Error getting Microsoft auth URL:', error);
      throw error;
    }
  }

  /**
   * Obtener calendarios de Microsoft
   */
  async getMicrosoftCalendars() {
    try {
      const response = await api.get('/calendar/microsoft/calendars');
      return response.data;
    } catch (error) {
      console.error('Error getting Microsoft calendars:', error);
      throw error;
    }
  }

  // === INTEGRACIONES ===

  /**
   * Obtener integraciones del usuario
   */
  async getIntegrations() {
    try {
      const response = await api.get('/calendar/integrations');
      return response.data;
    } catch (error) {
      console.error('Error getting integrations:', error);
      throw error;
    }
  }

  /**
   * Desconectar integración
   */
  async disconnectIntegration(id) {
    try {
      const response = await api.delete(`/calendar/integrations/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      throw error;
    }
  }

  /**
   * Sincronizar desde calendarios externos
   */
  async syncFromExternal(startDate, endDate) {
    try {
      const response = await api.post('/calendar/sync', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error syncing from external:', error);
      throw error;
    }
  }

  /**
   * Conectar con Google Calendar
   */
  connectGoogle() {
    this.getGoogleAuthUrl().then(response => {
      if (response.success && response.data.authUrl) {
        window.location.href = response.data.authUrl;
      }
    });
  }

  /**
   * Conectar con Microsoft Calendar
   */
  connectMicrosoft() {
    this.getMicrosoftAuthUrl().then(response => {
      if (response.success && response.data.authUrl) {
        window.location.href = response.data.authUrl;
      }
    });
  }

  /**
   * Helpers para eventos
   */
  getEventColor(eventType) {
    const colors = {
      meeting: '#3498db',
      task: '#2ecc71',
      reminder: '#f39c12',
      installation: '#9b59b6',
      maintenance: '#e74c3c',
      call: '#1abc9c',
      other: '#95a5a6'
    };
    return colors[eventType] || colors.other;
  }

  getEventTypeLabel(eventType) {
    const labels = {
      meeting: 'Reunión',
      task: 'Tarea',
      reminder: 'Recordatorio',
      installation: 'Instalación',
      maintenance: 'Mantenimiento',
      call: 'Llamada',
      other: 'Otro'
    };
    return labels[eventType] || 'Otro';
  }

  getPriorityLabel(priority) {
    const labels = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return labels[priority] || 'Media';
  }

  getStatusLabel(status) {
    const labels = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
      completed: 'Completado'
    };
    return labels[status] || 'Pendiente';
  }
}

export default new CalendarService();
