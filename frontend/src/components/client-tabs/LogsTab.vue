<template>
  <div class="logs-tab">
    <!-- Sección Superior: Estadísticas -->
    <div class="stats-section" v-if="!loading && logs.length > 0">
      <h4>Resumen Últimos 7 Días</h4>
      <div class="stats-grid">
        <div class="stat-card" v-for="stat in statistics" :key="stat.type">
          <div class="stat-icon">{{ stat.icon }}</div>
          <div class="stat-info">
            <div class="stat-number">{{ stat.count }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
      <div class="activity-chart">
        <span class="chart-label">Actividad:</span>
        <div class="chart-bars">
          <div 
            v-for="(day, index) in activityChart" 
            :key="index" 
            class="chart-bar"
            :style="{ height: day.height }"
            :title="`${day.date}: ${day.count} eventos`"
          ></div>
        </div>
      </div>
    </div>

    <!-- Controles y Filtros -->
    <div class="controls-section">
      <div class="filter-row">
        <div class="filter-group">
          <label>Filtros:</label>
          <div class="filter-chips">
            <button 
              class="filter-chip" 
              :class="{ active: filterType === '' }"
              @click="setFilter('')"
            >
              Todos
            </button>
            <button 
              v-for="filter in availableFilters" 
              :key="filter.value"
              class="filter-chip" 
              :class="{ active: filterType === filter.value }"
              @click="setFilter(filter.value)"
            >
              {{ filter.icon }} {{ filter.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="control-row">
        <div class="view-toggle">
          <span class="toggle-label">Vista:</span>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'timeline' }"
            @click="viewMode = 'timeline'"
            title="Vista Timeline"
          >
            📋 Timeline
          </button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'cards' }"
            @click="viewMode = 'cards'"
            title="Vista Cards"
          >
            📇 Cards
          </button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'calendar' }"
            @click="viewMode = 'calendar'"
            title="Vista Calendario"
          >
            📅 Calendario
          </button>
        </div>

        <div class="action-buttons">
          <label class="important-toggle">
            <input type="checkbox" v-model="showOnlyImportant" @change="applyFilters">
            Solo importantes
          </label>
          <button @click="loadLogs" class="btn-icon" :disabled="loading" title="Recargar">
            {{ loading ? '⏳' : '🔄' }}
          </button>
          <button @click="exportLogs" class="btn-icon" title="Exportar">
            📥
          </button>
        </div>
      </div>

      <!-- Búsqueda -->
      <div class="search-row">
        <input 
          type="text" 
          v-model="searchQuery" 
          @input="applyFilters"
          placeholder="🔍 Buscar en actividad..."
          class="search-input"
        >
      </div>
    </div>

    <!-- Contenido Principal -->
    <div class="main-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>Cargando registro de actividad...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMessage" class="error-state">
        <div class="error-icon">⚠️</div>
        <h4>Error al cargar datos</h4>
        <p>{{ errorMessage }}</p>
        <button @click="loadLogs" class="btn btn-primary">Reintentar</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="!filteredLogs || filteredLogs.length === 0" class="empty-state">
        <div class="empty-icon">🗃️</div>
        <h4>Sin Actividad Registrada</h4>
        <p>No se encontraron eventos{{ filterType ? ' para este filtro' : '' }}.</p>
        <button v-if="filterType || searchQuery || showOnlyImportant" @click="clearFilters" class="btn btn-secondary">
          Limpiar filtros
        </button>
      </div>

      <!-- Vista Timeline -->
      <div v-else-if="viewMode === 'timeline'" class="timeline-view">
        <div v-for="(dayGroup, date) in groupedFilteredLogs" :key="date" class="day-group">
          <div class="day-header">
            <h4>{{ formatDateForGrouping(date) }}</h4>
            <span class="event-count">{{ dayGroup.length }} eventos</span>
          </div>
          
          <div class="timeline-container">
            <div 
              v-for="log in dayGroup" 
              :key="log.id" 
              class="timeline-item"
              :class="{ 
                'important': log.important,
                [`type-${log.type}`]: true
              }"
              @click="openLogDetail(log)"
            >
              <div class="timeline-time">
                {{ formatTime(log.timestamp) }}
              </div>
              
              <div class="timeline-marker">
                <div class="marker-dot"></div>
                <div class="marker-line"></div>
              </div>

              <div class="timeline-card">
                <div class="card-header">
                  <div class="card-icon">{{ getLogIcon(log.type) }}</div>
                  <div class="card-title-section">
                    <h5 class="card-title">{{ log.title }}</h5>
                    <div class="card-badges">
                      <span v-if="log.important" class="badge badge-important">⭐ Importante</span>
                      <span class="badge badge-type">{{ getTypeBadge(log.type) }}</span>
                    </div>
                  </div>
                </div>

                <p class="card-description">{{ log.description }}</p>

                <div class="card-footer">
                  <span v-if="log.user" class="card-user">
                    👤 {{ log.user }}
                  </span>
                  <div class="card-actions">
                    <a 
                      v-if="log.link" 
                      :href="log.link" 
                      @click.stop.prevent="navigateToLink(log.link)" 
                      class="action-link"
                    >
                      Ver Detalle →
                    </a>
                    <button @click.stop="shareLog(log)" class="action-btn" title="Compartir">
                      📤
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista Cards -->
      <div v-else-if="viewMode === 'cards'" class="cards-view">
        <div v-for="(dayGroup, date) in groupedFilteredLogs" :key="date" class="cards-day-group">
          <div class="day-header">
            <h4>{{ formatDateForGrouping(date) }}</h4>
            <span class="event-count">{{ dayGroup.length }} eventos</span>
          </div>
          
          <div class="cards-grid">
            <div 
              v-for="log in dayGroup" 
              :key="log.id" 
              class="event-card"
              :class="{ 
                'important': log.important,
                [`type-${log.type}`]: true
              }"
              @click="openLogDetail(log)"
            >
              <div class="event-card-header">
                <div class="event-icon">{{ getLogIcon(log.type) }}</div>
                <div class="event-time">{{ formatTime(log.timestamp) }}</div>
                <div class="event-badges">
                  <span v-if="log.important" class="mini-badge">⭐</span>
                </div>
              </div>

              <div class="event-card-body">
                <h5 class="event-title">{{ log.title }}</h5>
                <div class="event-divider"></div>
                <p class="event-desc">{{ truncateText(log.description, 80) }}</p>
              </div>

              <div class="event-card-footer">
                <span class="event-status">{{ getStatusIcon(log) }}</span>
                <span class="event-user">{{ log.user || 'Sistema' }}</span>
              </div>

              <div class="event-card-actions">
                <button 
                  v-if="log.link" 
                  @click.stop="navigateToLink(log.link)" 
                  class="card-action-btn"
                >
                  Ver →
                </button>
                <button @click.stop="shareLog(log)" class="card-action-btn">
                  📤
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista Calendario -->
      <div v-else-if="viewMode === 'calendar'" class="calendar-view">
        <div class="calendar-header">
          <button @click="previousMonth" class="calendar-nav">← {{ previousMonthName }}</button>
          <h3>{{ currentMonthName }} {{ currentYear }}</h3>
          <button @click="nextMonth" class="calendar-nav">{{ nextMonthName }} →</button>
        </div>

        <div class="calendar-grid">
          <div class="calendar-weekday" v-for="day in weekdays" :key="day">
            {{ day }}
          </div>
          
          <div 
            v-for="(day, index) in calendarDays" 
            :key="index"
            class="calendar-day"
            :class="{ 
              'other-month': !day.isCurrentMonth,
              'today': day.isToday,
              'has-events': day.eventCount > 0,
              'selected': selectedCalendarDay === day.date
            }"
            @click="selectCalendarDay(day)"
          >
            <div class="day-number">{{ day.day }}</div>
            <div v-if="day.eventCount > 0" class="day-events">
              <div class="event-indicators">
                <span v-for="icon in day.eventIcons.slice(0, 3)" :key="icon" class="event-dot">
                  {{ icon }}
                </span>
                <span v-if="day.eventCount > 3" class="more-events">+{{ day.eventCount - 3 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Eventos del día seleccionado -->
        <div v-if="selectedDayEvents.length > 0" class="selected-day-events">
          <h4>Eventos del {{ formatDateForGrouping(selectedCalendarDay) }}</h4>
          <div class="timeline-container">
            <div 
              v-for="log in selectedDayEvents" 
              :key="log.id" 
              class="timeline-item mini"
              @click="openLogDetail(log)"
            >
              <div class="timeline-time">{{ formatTime(log.timestamp) }}</div>
              <div class="timeline-marker">
                <div class="marker-dot small"></div>
              </div>
              <div class="timeline-card compact">
                <div class="card-header">
                  <div class="card-icon small">{{ getLogIcon(log.type) }}</div>
                  <h5 class="card-title small">{{ log.title }}</h5>
                </div>
                <p class="card-description small">{{ truncateText(log.description, 100) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Detalle (opcional) -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedLog.title }}</h3>
          <button @click="closeDetailModal" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <strong>Fecha y hora:</strong>
            <span>{{ formatFullDateTime(selectedLog.timestamp) }}</span>
          </div>
          <div class="detail-row">
            <strong>Tipo:</strong>
            <span>{{ getLogIcon(selectedLog.type) }} {{ getTypeBadge(selectedLog.type) }}</span>
          </div>
          <div class="detail-row">
            <strong>Descripción:</strong>
            <p>{{ selectedLog.description }}</p>
          </div>
          <div v-if="selectedLog.user" class="detail-row">
            <strong>Usuario:</strong>
            <span>{{ selectedLog.user }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="selectedLog.link" @click="navigateToLink(selectedLog.link)" class="btn btn-primary">
            Ver Detalle Completo →
          </button>
          <button @click="closeDetailModal" class="btn btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ReportsService from '../../services/reports.service';

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
      filteredLogs: [],
      loading: true,
      filterType: '',
      searchQuery: '',
      showOnlyImportant: false,
      viewMode: 'timeline', // timeline, cards, calendar
      currentPage: 1,
      totalPages: 1,
      pageSize: 200,
      errorMessage: '',
      showDetailModal: false,
      selectedLog: null,
      
      // Calendario
      currentMonth: new Date().getMonth(),
      currentYear: new Date().getFullYear(),
      selectedCalendarDay: null,
      
      // Filtros disponibles
      availableFilters: [
        { value: 'payment', label: 'Pagos', icon: '💰' },
        { value: 'subscription', label: 'Suscripciones', icon: '📡' },
        { value: 'ticket', label: 'Tickets', icon: '🎫' },
        { value: 'communication', label: 'Comunicaciones', icon: '📧' },
        { value: 'device', label: 'Dispositivos', icon: '🔌' },
        { value: 'system', label: 'Sistema', icon: '⚙️' },
        { value: 'installation', label: 'Instalaciones', icon: '🔧' },
        { value: 'network', label: 'Red', icon: '🌐' },
        { value: 'inventory', label: 'Inventario', icon: '📦' }
      ],
      
      weekdays: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    };
  },
  
  computed: {
    groupedFilteredLogs() {
      if (!this.filteredLogs || this.filteredLogs.length === 0) return {};
      const grouped = {};
      this.filteredLogs.forEach(log => {
        const date = new Date(log.timestamp).toDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(log);
      });
      const sortedEntries = Object.entries(grouped).sort((a, b) => new Date(b[0]) - new Date(a[0]));
      return Object.fromEntries(sortedEntries);
    },
    
    statistics() {
      const stats = {};
      this.logs.forEach(log => {
        if (!stats[log.type]) {
          stats[log.type] = 0;
        }
        stats[log.type]++;
      });
      
      return this.availableFilters.map(filter => ({
        type: filter.value,
        label: filter.label,
        icon: filter.icon,
        count: stats[filter.value] || 0
      })).filter(stat => stat.count > 0);
    },
    
    activityChart() {
      const days = [];
      const now = new Date();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        
        const count = this.logs.filter(log => {
          return new Date(log.timestamp).toDateString() === dateStr;
        }).length;
        
        days.push({
          date: date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
          count,
          height: count > 0 ? `${Math.min(100, (count / Math.max(...days.map(d => d.count), 1)) * 100)}%` : '5%'
        });
      }
      
      return days;
    },
    
    calendarDays() {
      const days = [];
      const firstDay = new Date(this.currentYear, this.currentMonth, 1);
      const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
      
      // Días del mes anterior
      const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
      for (let i = firstDayOfWeek; i > 0; i--) {
        const date = new Date(this.currentYear, this.currentMonth, -i + 1);
        days.push(this.createCalendarDay(date, false));
      }
      
      // Días del mes actual
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const date = new Date(this.currentYear, this.currentMonth, i);
        days.push(this.createCalendarDay(date, true));
      }
      
      // Días del próximo mes
      const remainingDays = 35 - days.length;
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(this.currentYear, this.currentMonth + 1, i);
        days.push(this.createCalendarDay(date, false));
      }
      
      return days;
    },
    
    currentMonthName() {
      return new Date(this.currentYear, this.currentMonth).toLocaleDateString('es-MX', { month: 'long' });
    },
    
    previousMonthName() {
      return new Date(this.currentYear, this.currentMonth - 1).toLocaleDateString('es-MX', { month: 'long' });
    },
    
    nextMonthName() {
      return new Date(this.currentYear, this.currentMonth + 1).toLocaleDateString('es-MX', { month: 'long' });
    },
    
    selectedDayEvents() {
      if (!this.selectedCalendarDay) return [];
      return this.filteredLogs.filter(log => {
        return new Date(log.timestamp).toDateString() === this.selectedCalendarDay;
      }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
  },
  
  methods: {
    async loadLogs() {
      this.loading = true;
      this.errorMessage = '';
      
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize
        };
        
        if (this.filterType && this.filterType !== '') {
          params.action = this.filterType;
        }
        
        const response = await ReportsService.getClientActivityLog(this.clientId, params);
        
        if (response.data && response.data.success) {
          const data = response.data.data;
          this.logs = data.logs || [];
          this.totalPages = data.pagination?.totalPages || 1;
          this.applyFilters();
        } else {
          this.errorMessage = response.data?.message || 'Error desconocido al cargar logs';
        }
      } catch (error) {
        if (error.response) {
          this.errorMessage = `Error ${error.response.status}: ${error.response.data?.message || 'Error del servidor'}`;
        } else if (error.request) {
          this.errorMessage = 'No se pudo conectar con el servidor.';
        } else {
          this.errorMessage = error.message;
        }
        
        this.logs = [];
        this.filteredLogs = [];
      } finally {
        this.loading = false;
      }
    },
    
    setFilter(filterValue) {
      this.filterType = filterValue;
      this.loadLogs();
    },
    
    applyFilters() {
      let filtered = [...this.logs];
      
      // Filtro de búsqueda
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(log => {
          return log.title.toLowerCase().includes(query) ||
                 log.description.toLowerCase().includes(query) ||
                 (log.user && log.user.toLowerCase().includes(query));
        });
      }
      
      // Filtro de importantes
      if (this.showOnlyImportant) {
        filtered = filtered.filter(log => log.important);
      }
      
      this.filteredLogs = filtered;
    },
    
    clearFilters() {
      this.filterType = '';
      this.searchQuery = '';
      this.showOnlyImportant = false;
      this.loadLogs();
    },
    
    getLogIcon(type) {
      const icons = {
        subscription: '📡',
        payment: '💰',
        ticket: '🎫',
        communication: '📧',
        device: '🔌',
        system: '⚙️',
        installation: '🔧',
        network: '🌐',
        inventory: '📦'
      };
      return icons[type] || '📝';
    },
    
    getTypeBadge(type) {
      const badges = {
        subscription: 'Suscripción',
        payment: 'Pago',
        ticket: 'Ticket',
        communication: 'Comunicación',
        device: 'Dispositivo',
        system: 'Sistema',
        installation: 'Instalación',
        network: 'Red',
        inventory: 'Inventario'
      };
      return badges[type] || type;
    },
    
    getStatusIcon(log) {
      if (log.title.includes('Completado') || log.title.includes('Pagado')) return '✓';
      if (log.title.includes('Pendiente')) return '⏳';
      if (log.title.includes('Cerrado')) return '✓';
      if (log.title.includes('Enviado')) return '✓';
      if (log.title.includes('Online') || log.title.includes('Activo')) return '●';
      return '•';
    },
    
    formatDateForGrouping(dateString) {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) return 'Hoy';
      if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
      
      return date.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    },
    
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    formatFullDateTime(timestamp) {
      return new Date(timestamp).toLocaleString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    truncateText(text, maxLength) {
      if (!text || text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    },
    
    navigateToLink(link) {
      if (link.startsWith('http')) {
        window.open(link, '_blank');
      } else {
        this.$router.push(link);
      }
    },
    
    openLogDetail(log) {
      this.selectedLog = log;
      this.showDetailModal = true;
    },
    
    closeDetailModal() {
      this.showDetailModal = false;
      this.selectedLog = null;
    },
    
    shareLog(log) {
      const text = `${log.title}\n${log.description}\n${this.formatFullDateTime(log.timestamp)}`;
      
      if (navigator.share) {
        navigator.share({
          title: log.title,
          text: text
        }).catch(err => console.log('Error sharing:', err));
      } else {
        // Fallback: copiar al portapapeles
        navigator.clipboard.writeText(text).then(() => {
          alert('Información copiada al portapapeles');
        });
      }
    },
    
    exportLogs() {
      // Implementar exportación
      const dataStr = JSON.stringify(this.filteredLogs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs-cliente-${this.clientId}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
    
    // Métodos de calendario
    createCalendarDay(date, isCurrentMonth) {
      const dateStr = date.toDateString();
      const eventsForDay = this.filteredLogs.filter(log => {
        return new Date(log.timestamp).toDateString() === dateStr;
      });
      
      const eventIcons = [...new Set(eventsForDay.map(log => this.getLogIcon(log.type)))];
      
      return {
        day: date.getDate(),
        date: dateStr,
        isCurrentMonth,
        isToday: dateStr === new Date().toDateString(),
        eventCount: eventsForDay.length,
        eventIcons
      };
    },
    
    previousMonth() {
      if (this.currentMonth === 0) {
        this.currentMonth = 11;
        this.currentYear--;
      } else {
        this.currentMonth--;
      }
    },
    
    nextMonth() {
      if (this.currentMonth === 11) {
        this.currentMonth = 0;
        this.currentYear++;
      } else {
        this.currentMonth++;
      }
    },
    
    selectCalendarDay(day) {
      if (day.eventCount > 0) {
        this.selectedCalendarDay = day.date;
      }
    }
  },
  
  created() {
    this.loadLogs();
  }
};
</script>

<style scoped>
.logs-tab {
  padding: 0;
  background: #f8f9fa;
  min-height: 100vh;
}

/* === ESTADÍSTICAS === */
.stats-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.stats-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  color: white;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card:nth-child(1) { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); }
.stat-card:nth-child(2) { background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); }
.stat-card:nth-child(3) { background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); }
.stat-card:nth-child(4) { background: linear-gradient(135deg, #fd7e14 0%, #dc3545 100%); }
.stat-card:nth-child(5) { background: linear-gradient(135deg, #17a2b8 0%, #007bff 100%); }

.stat-icon {
  font-size: 32px;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  opacity: 0.9;
  margin-top: 4px;
}

.activity-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.chart-label {
  font-size: 13px;
  font-weight: 500;
  color: #666;
  margin-right: 8px;
}
.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 60px;
  flex: 1;
}

.chart-bar {
  flex: 1;
  background: linear-gradient(to top, #667eea, #764ba2);
  border-radius: 4px 4px 0 0;
  min-height: 3px;
  transition: all 0.3s;
  cursor: pointer;
}

.chart-bar:hover {
  opacity: 0.8;
  transform: scaleY(1.1);
}

/* === CONTROLES === */
.controls-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.filter-row {
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  padding: 8px 16px;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-chip:hover {
  border-color: #667eea;
  background: #f0f2ff;
}

.filter-chip.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
  font-weight: 600;
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.view-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  padding: 4px;
  border-radius: 8px;
}

.toggle-label {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  padding: 0 8px;
}

.toggle-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.toggle-btn:hover {
  background: #e9ecef;
}

.toggle-btn.active {
  background: white;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.important-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.important-toggle input[type="checkbox"] {
  cursor: pointer;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #667eea;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-row {
  margin-top: 16px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* === ESTADOS === */
.main-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  min-height: 400px;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #666;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.error-state h4,
.empty-state h4 {
  margin: 16px 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.error-state p,
.empty-state p {
  margin: 0 0 24px;
  color: #666;
  font-size: 14px;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

/* === VISTA TIMELINE === */
.timeline-view {
  max-width: 900px;
  margin: 0 auto;
}

.day-group {
  margin-bottom: 48px;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 3px solid #e0e0e0;
}

.day-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #333;
  text-transform: capitalize;
}

.event-count {
  font-size: 13px;
  color: #999;
  font-weight: 500;
}

.timeline-container {
  position: relative;
}

.timeline-item {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  position: relative;
  cursor: pointer;
}

.timeline-time {
  flex-shrink: 0;
  width: 60px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  padding-top: 4px;
}

.timeline-marker {
  flex-shrink: 0;
  width: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.marker-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  border: 3px solid white;
  box-shadow: 0 0 0 2px #667eea;
  flex-shrink: 0;
  z-index: 2;
  transition: all 0.3s;
}

.timeline-item:hover .marker-dot {
  transform: scale(1.3);
  box-shadow: 0 0 0 4px #667eea;
}

.timeline-item.important .marker-dot {
  background: #ffc107;
  box-shadow: 0 0 0 2px #ffc107, 0 0 12px rgba(255, 193, 7, 0.4);
}

.marker-dot.small {
  width: 12px;
  height: 12px;
}

.marker-line {
  width: 2px;
  flex: 1;
  background: linear-gradient(to bottom, #667eea, transparent);
  margin-top: 4px;
}

.timeline-card {
  flex: 1;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid #e0e0e0;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.timeline-item:hover .timeline-card {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-left-color: #667eea;
}

.timeline-item.important .timeline-card {
  background: #fffbf0;
  border-left-color: #ffc107;
}

.timeline-item.type-payment .timeline-card { border-left-color: #28a745; }
.timeline-item.type-subscription .timeline-card { border-left-color: #17a2b8; }
.timeline-item.type-ticket .timeline-card { border-left-color: #ffc107; }
.timeline-item.type-communication .timeline-card { border-left-color: #6f42c1; }
.timeline-item.type-device .timeline-card { border-left-color: #fd7e14; }
.timeline-item.type-system .timeline-card { border-left-color: #6c757d; }
.timeline-item.type-installation .timeline-card { border-left-color: #e83e8c; }
.timeline-item.type-network .timeline-card { border-left-color: #20c997; }
.timeline-item.type-inventory .timeline-card { border-left-color: #007bff; }

.timeline-card.compact {
  padding: 12px 16px;
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.card-icon.small {
  font-size: 20px;
}

.card-title-section {
  flex: 1;
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
}

.card-title.small {
  font-size: 14px;
  margin-bottom: 4px;
}

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-important {
  background: #fff3cd;
  color: #856404;
}

.badge-type {
  background: #e7f3ff;
  color: #004085;
}

.card-description {
  margin: 0 0 16px 0;
  color: #555;
  font-size: 14px;
  line-height: 1.6;
}

.card-description.small {
  font-size: 13px;
  margin-bottom: 0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.card-user {
  font-size: 13px;
  color: #999;
  font-style: italic;
}

.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-link {
  color: #667eea;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

.action-link:hover {
  color: #5568d3;
  text-decoration: underline;
}

.action-btn {
  padding: 4px 8px;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f8f9fa;
  border-color: #667eea;
}

/* === VISTA CARDS === */
.cards-view {
  max-width: 1200px;
  margin: 0 auto;
}

.cards-day-group {
  margin-bottom: 48px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.event-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  border-top: 4px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  position: relative;
  overflow: hidden;
}

.event-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.12);
}

.event-card.important {
  background: #fffbf0;
  border-top-color: #ffc107;
}

.event-card.type-payment { border-top-color: #28a745; }
.event-card.type-subscription { border-top-color: #17a2b8; }
.event-card.type-ticket { border-top-color: #ffc107; }
.event-card.type-communication { border-top-color: #6f42c1; }
.event-card.type-device { border-top-color: #fd7e14; }
.event-card.type-system { border-top-color: #6c757d; }
.event-card.type-installation { border-top-color: #e83e8c; }
.event-card.type-network { border-top-color: #20c997; }
.event-card.type-inventory { border-top-color: #007bff; }

.event-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.event-icon {
  font-size: 32px;
}

.event-time {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.event-badges {
  display: flex;
  gap: 4px;
}

.mini-badge {
  font-size: 14px;
}

.event-card-body {
  margin-bottom: 16px;
}

.event-title {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.event-divider {
  height: 2px;
  background: linear-gradient(to right, currentColor, transparent);
  margin-bottom: 12px;
  opacity: 0.2;
}

.event-desc {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.event-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.event-status {
  font-weight: 600;
}

.event-card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(0,0,0,0.05);
}

.card-action-btn {
  flex: 1;
  padding: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.card-action-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* === VISTA CALENDARIO === */
.calendar-view {
  max-width: 900px;
  margin: 0 auto;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
}

.calendar-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #333;
  text-transform: capitalize;
}

.calendar-nav {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.calendar-nav:hover {
  background: #5568d3;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 32px;
}

.calendar-weekday {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.calendar-day {
  aspect-ratio: 1;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.calendar-day:hover {
  background: #e9ecef;
  transform: scale(1.05);
}

.calendar-day.other-month {
  opacity: 0.3;
}

.calendar-day.today {
  background: #e7f3ff;
  border: 2px solid #667eea;
}

.calendar-day.has-events {
  background: #fff;
  border: 2px solid #ddd;
}

.calendar-day.selected {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.day-number {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.day-events {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.event-indicators {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  justify-content: center;
}

.event-dot {
  font-size: 14px;
}

.more-events {
  font-size: 10px;
  font-weight: 600;
  color: #667eea;
}

.selected-day-events {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid #e0e0e0;
}

.selected-day-events h4 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.timeline-item.mini {
  margin-bottom: 16px;
}

/* === MODAL === */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f8f9fa;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #e9ecef;
  transform: rotate(90deg);
}

.modal-body {
  padding: 24px;
}

.detail-row {
  margin-bottom: 20px;
}

.detail-row strong {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-row span,
.detail-row p {
  margin: 0;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e0e0e0;
}

/* === RESPONSIVE === */
@media (max-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .control-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .view-toggle {
    justify-content: center;
  }
  
  .action-buttons {
    justify-content: space-between;
  }
  
  .filter-chips {
    justify-content: center;
  }
  
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .timeline-item {
    flex-direction: column;
    gap: 12px;
  }
  
  .timeline-time {
    width: auto;
    text-align: left;
  }
  
  .timeline-marker {
    flex-direction: row;
    width: 100%;
    height: auto;
  }
  
  .marker-line {
    height: 2px;
    width: 100%;
    margin-top: 0;
    margin-left: 4px;
    background: linear-gradient(to right, #667eea, transparent);
  }
  
  .calendar-grid {
    gap: 4px;
  }
  
  .calendar-weekday {
    padding: 8px 4px;
    font-size: 10px;
  }
  
  .calendar-day {
    padding: 4px;
  }
  
  .day-number {
    font-size: 12px;
  }
  
  .event-dot {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .logs-tab,
  .stats-section,
  .controls-section,
  .main-content {
    border-radius: 0;
  }
  
  .chart-bars {
    height: 40px;
  }
  
  .modal-content {
    max-height: 90vh;
    margin: 10px;
  }
}
</style>