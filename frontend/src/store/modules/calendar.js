import calendarService from '@/services/calendar.service';

const state = {
  events: [],
  currentEvent: null,
  integrations: [],
  loading: false,
  error: null,
  filters: {
    startDate: null,
    endDate: null,
    eventType: null,
    status: null
  },
  viewMode: 'month', // month, week, day
  selectedDate: new Date(),
  syncStatus: {
    syncing: false,
    lastSync: null,
    error: null
  }
};

const getters = {
  // Obtener todos los eventos
  allEvents: (state) => state.events,

  // Eventos filtrados por fecha
  eventsInRange: (state) => (startDate, endDate) => {
    return state.events.filter(event => {
      const eventStart = new Date(event.startDate);
      return eventStart >= startDate && eventStart <= endDate;
    });
  },

  // Eventos por tipo
  eventsByType: (state) => (type) => {
    return state.events.filter(event => event.eventType === type);
  },

  // Eventos pendientes
  pendingEvents: (state) => {
    return state.events.filter(event => event.status === 'pending');
  },

  // Eventos del día
  eventsToday: (state) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return state.events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate >= today && eventDate < tomorrow;
    });
  },

  // Próximos eventos
  upcomingEvents: (state) => {
    const now = new Date();
    return state.events
      .filter(event => new Date(event.startDate) > now)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 5);
  },

  // Integraciones activas
  activeIntegrations: (state) => {
    return state.integrations.filter(int => int.isActive);
  },

  // Verificar si tiene integración con Google
  hasGoogleIntegration: (state) => {
    return state.integrations.some(int => int.provider === 'google' && int.isActive);
  },

  // Verificar si tiene integración con Microsoft
  hasMicrosoftIntegration: (state) => {
    return state.integrations.some(int => int.provider === 'microsoft' && int.isActive);
  },

  // Modo de vista actual
  currentViewMode: (state) => state.viewMode,

  // Fecha seleccionada
  selectedDate: (state) => state.selectedDate
};

const mutations = {
  SET_EVENTS(state, events) {
    state.events = events;
  },

  SET_CURRENT_EVENT(state, event) {
    state.currentEvent = event;
  },

  ADD_EVENT(state, event) {
    state.events.push(event);
  },

  UPDATE_EVENT(state, updatedEvent) {
    const index = state.events.findIndex(e => e.id === updatedEvent.id);
    if (index !== -1) {
      state.events.splice(index, 1, updatedEvent);
    }
  },

  REMOVE_EVENT(state, eventId) {
    state.events = state.events.filter(e => e.id !== eventId);
  },

  SET_INTEGRATIONS(state, integrations) {
    state.integrations = integrations;
  },

  REMOVE_INTEGRATION(state, integrationId) {
    state.integrations = state.integrations.filter(int => int.id !== integrationId);
  },

  SET_LOADING(state, loading) {
    state.loading = loading;
  },

  SET_ERROR(state, error) {
    state.error = error;
  },

  SET_FILTERS(state, filters) {
    state.filters = { ...state.filters, ...filters };
  },

  SET_VIEW_MODE(state, mode) {
    state.viewMode = mode;
  },

  SET_SELECTED_DATE(state, date) {
    state.selectedDate = date;
  },

  SET_SYNC_STATUS(state, status) {
    state.syncStatus = { ...state.syncStatus, ...status };
  }
};

const actions = {
  /**
   * Cargar eventos
   */
  async fetchEvents({ commit, state }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await calendarService.getEvents(state.filters);
      if (response.success) {
        commit('SET_EVENTS', response.data);
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error fetching events:', error);
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Obtener evento por ID
   */
  async fetchEventById({ commit }, eventId) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await calendarService.getEventById(eventId);
      if (response.success) {
        commit('SET_CURRENT_EVENT', response.data);
        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error fetching event:', error);
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Crear evento
   */
  // eslint-disable-next-line no-unused-vars
  async createEvent({ commit, dispatch }, eventData) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await calendarService.createEvent(eventData);
      if (response.success) {
        commit('ADD_EVENT', response.data);
        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error creating event:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Actualizar evento
   */
  async updateEvent({ commit }, { id, eventData }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await calendarService.updateEvent(id, eventData);
      if (response.success) {
        commit('UPDATE_EVENT', response.data);
        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error updating event:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Eliminar evento
   */
  async deleteEvent({ commit }, eventId) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await calendarService.deleteEvent(eventId);
      if (response.success) {
        commit('REMOVE_EVENT', eventId);
        return true;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error deleting event:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Cargar integraciones
   */
  async fetchIntegrations({ commit }) {
    try {
      const response = await calendarService.getIntegrations();
      if (response.success) {
        commit('SET_INTEGRATIONS', response.data);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  },

  /**
   * Desconectar integración
   */
  async disconnectIntegration({ commit }, integrationId) {
    try {
      const response = await calendarService.disconnectIntegration(integrationId);
      if (response.success) {
        commit('REMOVE_INTEGRATION', integrationId);
        return true;
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      throw error;
    }
  },

  /**
   * Conectar con Google Calendar
   */
  connectGoogle() {
    calendarService.connectGoogle();
  },

  /**
   * Conectar con Microsoft Calendar
   */
  connectMicrosoft() {
    calendarService.connectMicrosoft();
  },

  /**
   * Sincronizar desde calendarios externos
   */
  async syncFromExternal({ commit, dispatch }, { startDate, endDate }) {
    commit('SET_SYNC_STATUS', { syncing: true, error: null });

    try {
      const response = await calendarService.syncFromExternal(startDate, endDate);
      if (response.success) {
        commit('SET_SYNC_STATUS', {
          syncing: false,
          lastSync: new Date(),
          error: null
        });

        // Recargar eventos
        await dispatch('fetchEvents');

        return response.data;
      }
    } catch (error) {
      commit('SET_SYNC_STATUS', {
        syncing: false,
        error: error.message
      });
      console.error('Error syncing from external:', error);
      throw error;
    }
  },

  /**
   * Cambiar modo de vista
   */
  setViewMode({ commit }, mode) {
    commit('SET_VIEW_MODE', mode);
  },

  /**
   * Cambiar fecha seleccionada
   */
  setSelectedDate({ commit }, date) {
    commit('SET_SELECTED_DATE', date);
  },

  /**
   * Aplicar filtros
   */
  setFilters({ commit, dispatch }, filters) {
    commit('SET_FILTERS', filters);
    dispatch('fetchEvents');
  },

  /**
   * Limpiar filtros
   */
  clearFilters({ commit, dispatch }) {
    commit('SET_FILTERS', {
      startDate: null,
      endDate: null,
      eventType: null,
      status: null
    });
    dispatch('fetchEvents');
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
