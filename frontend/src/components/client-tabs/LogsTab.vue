<template>
  <div class="logs-tab">
    <div class="logs-header">
      <h3>Registro de Actividad</h3>
      <div class="logs-filters">
        <select v-model="filterType" @change="loadLogs" class="filter-select">
          <option value="">Todos los tipos</option>
          <option value="subscription">Suscripciones</option>
          <option value="payment">Pagos</option>
          <option value="ticket">Tickets</option>
          <option value="communication">Comunicaciones</option>
          <option value="device">Dispositivos</option>
          <option value="system">Sistema</option>
        </select>
        
        <select v-model="filterPeriod" @change="loadLogs" class="filter-select">
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 3 meses</option>
          <option value="365">Último año</option>
          <option value="">Todo el historial</option>
        </select>
        
        <button @click="refreshLogs" class="refresh-btn" title="Actualizar">
          🔄
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando registro de actividad...</p>
    </div>

    <div v-else-if="logs.length === 0" class="no-logs">
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <h4>Sin actividad registrada</h4>
        <p>No hay actividad para mostrar con los filtros seleccionados</p>
      </div>
    </div>

    <div v-else class="logs-timeline">
      <div 
        v-for="(dayGroup, date) in groupedLogs" 
        :key="date" 
        class="logs-day-group"
      >
        <div class="day-header">
          <h4>{{ formatDate(date) }}</h4>
          <span class="day-count">{{ dayGroup.length }} eventos</span>
        </div>
        
        <div class="logs-list">
          <div 
            v-for="log in dayGroup" 
            :key="log.id"
            :class="['log-item', `log-${log.type}`, { 'log-important': log.important }]"
          >
            <div class="log-icon">
              {{ getLogIcon(log.type) }}
            </div>
            
            <div class="log-content">
              <div class="log-header">
                <span class="log-title">{{ log.title }}</span>
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              </div>
              
              <div class="log-description">
                {{ log.description }}
              </div>
              
              <div v-if="log.details" class="log-details">
                <button @click="toggleDetails(log.id)" class="details-toggle">
                  {{ showDetails[log.id] ? 'Ocultar' : 'Ver' }} detalles
                </button>
                
                <div v-if="showDetails[log.id]" class="log-details-content">
                  <pre>{{ JSON.stringify(log.details, null, 2) }}</pre>
                </div>
              </div>
              
              <div v-if="log.user" class="log-user">
                Realizado por: {{ log.user }}
              </div>
            </div>
            
            <div v-if="log.important" class="log-badge">
              ⚠️
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        @click="changePage(currentPage - 1)" 
        :disabled="currentPage === 1"
        class="page-btn"
      >
        ‹ Anterior
      </button>
      
      <span class="page-info">
        Página {{ currentPage }} de {{ totalPages }}
      </span>
      
      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        Siguiente ›
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LogsTab',
  props: {
    clientId: {
      type: [Number, String],
      required: true
    }
  },
  data() {
    return {
      logs: [],
      loading: true,
      filterType: '',
      filterPeriod: '30',
      currentPage: 1,
      totalPages: 1,
      pageSize: 20,
      showDetails: {}
    };
  },
  computed: {
    groupedLogs() {
      const grouped = {};
      
      this.logs.forEach(log => {
        const date = new Date(log.timestamp).toDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(log);
      });
      
      // Ordenar por fecha descendente
      const sortedEntries = Object.entries(grouped).sort((a, b) => 
        new Date(b[0]) - new Date(a[0])
      );
      
      return Object.fromEntries(sortedEntries);
    }
  },
  methods: {
    async loadLogs() {
      this.loading = true;
      
      try {
        // Simular carga de logs (reemplazar con API real)
        await this.simulateApiCall();
        
        // En implementación real, usar algo como:
        // const response = await LogService.getClientLogs(this.clientId, {
        //   type: this.filterType,
        //   period: this.filterPeriod,
        //   page: this.currentPage,
        //   size: this.pageSize
        // });
        // this.logs = response.data.logs;
        
      } catch (error) {
        console.error('Error cargando logs:', error);
        this.logs = [];
      } finally {
        this.loading = false;
      }
    },

    async simulateApiCall() {
      // Simular datos de ejemplo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.logs = [
        {
          id: 1,
          type: 'subscription',
          title: 'Plan de servicio actualizado',
          description: 'Plan cambiado de "Básico 10MB" a "Premium 20MB"',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas
          user: 'Admin Usuario',
          important: true,
          details: { oldPlan: 'Básico 10MB', newPlan: 'Premium 20MB', reason: 'Upgrade solicitado' }
        },
        {
          id: 2,
          type: 'payment',
          title: 'Pago registrado',
          description: 'Pago de $500.00 registrado correctamente',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 día
          user: 'Sistema de Pagos',
          details: { amount: 500, method: 'Transferencia', reference: 'TRF123456' }
        },
        {
          id: 3,
          type: 'communication',
          title: 'Email enviado',
          description: 'Recordatorio de pago enviado por correo electrónico',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días
          user: 'Sistema Automático'
        },
        {
          id: 4,
          type: 'ticket',
          title: 'Ticket creado',
          description: 'Ticket #1234 - Problema de conectividad reportado',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 días
          user: 'Cliente',
          details: { ticketId: 1234, priority: 'Alta', category: 'Conectividad' }
        },
        {
          id: 5,
          type: 'system',
          title: 'Cliente registrado',
          description: 'Cuenta de cliente creada en el sistema',
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días
          user: 'Admin Usuario',
          important: true
        }
      ];
      
      // Filtrar por tipo si está seleccionado
      if (this.filterType) {
        this.logs = this.logs.filter(log => log.type === this.filterType);
      }
      
      // Filtrar por período
      if (this.filterPeriod) {
        const periodMs = parseInt(this.filterPeriod) * 24 * 60 * 60 * 1000;
        const cutoff = new Date(Date.now() - periodMs);
        this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoff);
      }
    },

    refreshLogs() {
      this.currentPage = 1;
      this.loadLogs();
    },

    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadLogs();
      }
    },

    toggleDetails(logId) {
      this.$set(this.showDetails, logId, !this.showDetails[logId]);
    },

    getLogIcon(type) {
      const icons = {
        subscription: '📡',
        payment: '💰',
        ticket: '🎫',
        communication: '📧',
        device: '📱',
        system: '⚙️'
      };
      return icons[type] || '📝';
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Hoy';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ayer';
      } else {
        return date.toLocaleDateString('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  },

  created() {
    this.loadLogs();
  }
};
</script>

<style scoped>
.logs-tab {
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
}

/* ===============================
   HEADER Y FILTROS
   =============================== */

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}

.logs-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.3rem;
  font-weight: 600;
}

.logs-filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-select {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
}

.refresh-btn {
  padding: 8px 12px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

.refresh-btn:hover {
  background: #e0e0e0;
}

/* ===============================
   TIMELINE DE LOGS
   =============================== */

.logs-timeline {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  overflow: hidden;
}

.logs-day-group {
  border-bottom: 1px solid #f0f0f0;
}

.logs-day-group:last-child {
  border-bottom: none;
}

.day-header {
  background: #f8f9fa;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e9ecef;
}

.day-header h4 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
}

.day-count {
  color: #666;
  font-size: 0.9rem;
}

.logs-list {
  padding: 0;
}

/* ===============================
   ITEMS DE LOG
   =============================== */

.log-item {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s ease;
  position: relative;
}

.log-item:hover {
  background-color: #fafbfc;
}

.log-item:last-child {
  border-bottom: none;
}

.log-item.log-important {
  background: linear-gradient(90deg, #fff8e1 0%, #ffffff 20%);
  border-left: 4px solid #ff9800;
}

.log-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.log-title {
  font-weight: 600;
  color: #333;
  font-size: 1rem;
}

.log-time {
  color: #666;
  font-size: 0.85rem;
  flex-shrink: 0;
  margin-left: 12px;
}

.log-description {
  color: #555;
  font-size: 0.95rem;
  line-height: 1.4;
  margin-bottom: 8px;
}

.log-details {
  margin-top: 12px;
}

.details-toggle {
  background: none;
  border: 1px solid #ddd;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #666;
  transition: all 0.2s ease;
}

.details-toggle:hover {
  background: #f5f5f5;
  color: #333;
}

.log-details-content {
  margin-top: 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
}

.log-details-content pre {
  margin: 0;
  font-size: 0.8rem;
  color: #555;
  white-space: pre-wrap;
}

.log-user {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #666;
  font-style: italic;
}

.log-badge {
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 1.2rem;
}

/* Colores por tipo de log */
.log-subscription .log-icon {
  background: #e3f2fd;
  color: #1565c0;
}

.log-payment .log-icon {
  background: #e8f5e9;
  color: #2e7d32;
}

.log-ticket .log-icon {
  background: #fff3e0;
  color: #f57c00;
}

.log-communication .log-icon {
  background: #f3e5f5;
  color: #7b1fa2;
}

.log-device .log-icon {
  background: #e0f2f1;
  color: #00695c;
}

.log-system .log-icon {
  background: #fce4ec;
  color: #c2185b;
}

/* ===============================
   ESTADOS
   =============================== */

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-logs {
  background: white;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.6;
}

.empty-state h4 {
  margin: 0;
  color: #666;
  font-size: 1.2rem;
}

.empty-state p {
  margin: 0;
  color: #999;
  font-size: 0.95rem;
}

/* ===============================
   PAGINACIÓN
   =============================== */

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
}

.page-btn {
  padding: 10px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: #5a67d8;
}

.page-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.page-info {
  color: #666;
  font-size: 0.9rem;
}

/* ===============================
   RESPONSIVE
   =============================== */

@media (max-width: 768px) {
  .logs-tab {
    padding: 15px;
  }
  
  .logs-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .logs-filters {
    justify-content: space-between;
  }
  
  .log-item {
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px;
  }
  
  .log-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .day-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .pagination {
    flex-direction: column;
    gap: 12px;
  }
}
</style>