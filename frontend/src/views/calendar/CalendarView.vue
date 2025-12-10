<template>
  <div class="calendar-view">
    <!-- Header con controles -->
    <div class="calendar-header">
      <div class="calendar-nav">
        <button @click="previousPeriod" class="btn-nav">‹</button>
        <h2>{{ currentPeriodTitle }}</h2>
        <button @click="nextPeriod" class="btn-nav">›</button>
        <button @click="goToToday" class="btn-today">Hoy</button>
      </div>

      <div class="calendar-actions">
        <div class="view-switcher">
          <button
            v-for="mode in viewModes"
            :key="mode.value"
            @click="changeViewMode(mode.value)"
            :class="['btn-view', { active: viewMode === mode.value }]"
          >
            {{ mode.label }}
          </button>
        </div>

        <button @click="showEventDialog = true" class="btn-primary">
          ➕ Nuevo Evento
        </button>

        <button @click="showIntegrationsDialog = true" class="btn-secondary">
          🔗 Integraciones
        </button>

        <button @click="syncCalendars" class="btn-sync" :disabled="syncStatus.syncing">
          {{ syncStatus.syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar' }}
        </button>
      </div>
    </div>

    <!-- Vista del calendario -->
    <div class="calendar-content">
      <!-- Vista mensual -->
      <div v-if="viewMode === 'month'" class="month-view">
        <div class="weekdays">
          <div v-for="day in weekdays" :key="day" class="weekday">{{ day }}</div>
        </div>

        <div class="days-grid">
          <div
            v-for="day in calendarDays"
            :key="day.date"
            :class="['day-cell', {
              'other-month': !day.currentMonth,
              'today': day.isToday,
              'selected': isSelectedDate(day.date)
            }]"
            @click="selectDate(day.date)"
          >
            <div class="day-number">{{ day.day }}</div>
            <div class="day-events">
              <div
                v-for="event in day.events.slice(0, 3)"
                :key="event.id"
                :style="{ backgroundColor: event.color }"
                class="event-badge"
                @click.stop="openEvent(event)"
              >
                {{ event.title }}
              </div>
              <div v-if="day.events.length > 3" class="more-events">
                +{{ day.events.length - 3 }} más
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista semanal -->
      <div v-else-if="viewMode === 'week'" class="week-view">
        <div class="week-header">
          <div v-for="day in weekDays" :key="day.date" class="week-day-header">
            <div class="week-day-name">{{ day.dayName }}</div>
            <div class="week-day-number" :class="{ 'is-today': day.isToday }">
              {{ day.dayNumber }}
            </div>
          </div>
        </div>

        <div class="week-body">
          <div class="time-column">
            <div v-for="hour in hours" :key="hour" class="hour-slot">
              {{ hour }}:00
            </div>
          </div>

          <div class="week-days-grid">
            <div v-for="day in weekDays" :key="day.date" class="week-day-column">
              <div
                v-for="event in day.events"
                :key="event.id"
                :style="getEventStyle(event)"
                class="week-event"
                @click="openEvent(event)"
              >
                <strong>{{ event.title }}</strong>
                <div>{{ formatTime(event.startDate) }} - {{ formatTime(event.endDate) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista diaria -->
      <div v-else-if="viewMode === 'day'" class="day-view">
        <div class="day-header">
          <h3>{{ formatSelectedDate }}</h3>
        </div>

        <div class="day-timeline">
          <div class="time-column">
            <div v-for="hour in hours" :key="hour" class="hour-slot">
              {{ hour }}:00
            </div>
          </div>

          <div class="day-events-column">
            <div
              v-for="event in selectedDayEvents"
              :key="event.id"
              :style="getEventStyle(event)"
              class="day-event"
              @click="openEvent(event)"
            >
              <div class="event-time">{{ formatTime(event.startDate) }} - {{ formatTime(event.endDate) }}</div>
              <div class="event-title">{{ event.title }}</div>
              <div class="event-location" v-if="event.location">📍 {{ event.location }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Próximos eventos (sidebar) -->
    <div class="upcoming-events">
      <h3>Próximos Eventos</h3>
      <div v-if="upcomingEvents.length === 0" class="no-events">
        No hay eventos próximos
      </div>
      <div v-else>
        <div
          v-for="event in upcomingEvents"
          :key="event.id"
          class="upcoming-event-card"
          @click="openEvent(event)"
        >
          <div class="event-dot" :style="{ backgroundColor: event.color }"></div>
          <div class="event-info">
            <div class="event-title">{{ event.title }}</div>
            <div class="event-date">{{ formatEventDate(event.startDate) }}</div>
            <div class="event-type">{{ getEventTypeLabel(event.eventType) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog de evento -->
    <CalendarEventDialog
      v-if="showEventDialog"
      :event="selectedEvent"
      @close="closeEventDialog"
      @save="saveEvent"
      @delete="deleteEvent"
    />

    <!-- Dialog de integraciones -->
    <CalendarIntegrationsDialog
      v-if="showIntegrationsDialog"
      @close="showIntegrationsDialog = false"
    />
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import CalendarEventDialog from '@/components/calendar/CalendarEventDialog.vue';
import CalendarIntegrationsDialog from '@/components/calendar/CalendarIntegrationsDialog.vue';
import calendarService from '@/services/calendar.service';

export default {
  name: 'CalendarView',
  components: {
    CalendarEventDialog,
    CalendarIntegrationsDialog
  },

  data() {
    return {
      showEventDialog: false,
      showIntegrationsDialog: false,
      selectedEvent: null,
      weekdays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      viewModes: [
        { value: 'month', label: 'Mes' },
        { value: 'week', label: 'Semana' },
        { value: 'day', label: 'Día' }
      ],
      hours: Array.from({ length: 24 }, (_, i) => i)
    };
  },

  computed: {
    ...mapState('calendar', ['events', 'viewMode', 'selectedDate', 'syncStatus']),
    ...mapGetters('calendar', ['upcomingEvents', 'eventsInRange']),

    currentPeriodTitle() {
      const date = new Date(this.selectedDate);
      if (this.viewMode === 'month') {
        return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      } else if (this.viewMode === 'week') {
        const start = this.getWeekStart(date);
        const end = this.getWeekEnd(date);
        return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
      } else {
        return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    },

    calendarDays() {
      const date = new Date(this.selectedDate);
      const year = date.getFullYear();
      const month = date.getMonth();

      const firstDay = new Date(year, month, 1);
      // eslint-disable-next-line no-unused-vars
      const lastDay = new Date(year, month + 1, 0);

      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - startDate.getDay());

      const days = [];
      const currentDate = new Date(startDate);

      for (let i = 0; i < 42; i++) {
        const dayEvents = this.events.filter(event => {
          const eventDate = new Date(event.startDate);
          return eventDate.getFullYear() === currentDate.getFullYear() &&
                 eventDate.getMonth() === currentDate.getMonth() &&
                 eventDate.getDate() === currentDate.getDate();
        });

        days.push({
          date: new Date(currentDate),
          day: currentDate.getDate(),
          currentMonth: currentDate.getMonth() === month,
          isToday: this.isToday(currentDate),
          events: dayEvents.map(e => ({ ...e, color: calendarService.getEventColor(e.eventType) }))
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return days;
    },

    weekDays() {
      const date = new Date(this.selectedDate);
      const start = this.getWeekStart(date);
      const days = [];

      for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);

        const dayEvents = this.events.filter(event => {
          const eventDate = new Date(event.startDate);
          return eventDate.getFullYear() === day.getFullYear() &&
                 eventDate.getMonth() === day.getMonth() &&
                 eventDate.getDate() === day.getDate();
        });

        days.push({
          date: new Date(day),
          dayName: this.weekdays[day.getDay()],
          dayNumber: day.getDate(),
          isToday: this.isToday(day),
          events: dayEvents.map(e => ({ ...e, color: calendarService.getEventColor(e.eventType) }))
        });
      }

      return days;
    },

    selectedDayEvents() {
      const date = new Date(this.selectedDate);
      return this.events.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate.getFullYear() === date.getFullYear() &&
               eventDate.getMonth() === date.getMonth() &&
               eventDate.getDate() === date.getDate();
      }).map(e => ({ ...e, color: calendarService.getEventColor(e.eventType) }));
    },

    formatSelectedDate() {
      return new Date(this.selectedDate).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  },

  mounted() {
    this.fetchEvents();
    this.fetchIntegrations();

    // Verificar si viene de callback de OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      this.showNotification({ type: 'success', message: '✅ Google Calendar conectado exitosamente' });
      this.fetchIntegrations();
    } else if (params.get('microsoft') === 'connected') {
      this.showNotification({ type: 'success', message: '✅ Microsoft Calendar conectado exitosamente' });
      this.fetchIntegrations();
    }
  },

  methods: {
    ...mapActions('calendar', [
      'fetchEvents',
      'fetchIntegrations',
      'deleteEvent',
      'setViewMode',
      'setSelectedDate',
      'syncFromExternal'
    ]),

    showNotification(type, message) {
      // Verifica si la función $notify existe antes de llamarla
      if (typeof this.$notify === 'function') {
        this.$notify({ type: type, message: message });
      } else {
        // Fallback: Si no existe, al menos muestra en consola.
        console.warn(`[NOTIFICACIÓN UI FALLIDA - ${type.toUpperCase()}]: ${message}`);
      }
    },

    changeViewMode(mode) {
      this.setViewMode(mode);
    },

    previousPeriod() {
      const date = new Date(this.selectedDate);
      if (this.viewMode === 'month') {
        date.setMonth(date.getMonth() - 1);
      } else if (this.viewMode === 'week') {
        date.setDate(date.getDate() - 7);
      } else {
        date.setDate(date.getDate() - 1);
      }
      this.setSelectedDate(date);
    },

    nextPeriod() {
      const date = new Date(this.selectedDate);
      if (this.viewMode === 'month') {
        date.setMonth(date.getMonth() + 1);
      } else if (this.viewMode === 'week') {
        date.setDate(date.getDate() + 7);
      } else {
        date.setDate(date.getDate() + 1);
      }
      this.setSelectedDate(date);
    },

    goToToday() {
      this.setSelectedDate(new Date());
    },

    selectDate(date) {
      this.setSelectedDate(date);
      if (this.viewMode === 'month') {
        this.setViewMode('day');
      }
    },

    isSelectedDate(date) {
      const selected = new Date(this.selectedDate);
      const check = new Date(date);
      return selected.toDateString() === check.toDateString();
    },

    isToday(date) {
      const today = new Date();
      const check = new Date(date);
      return today.toDateString() === check.toDateString();
    },

    getWeekStart(date) {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      return new Date(d.setDate(diff));
    },

    getWeekEnd(date) {
      const start = this.getWeekStart(date);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return end;
    },

    openEvent(event) {
      this.selectedEvent = event;
      this.showEventDialog = true;
    },

    closeEventDialog() {
      this.showEventDialog = false;
      this.selectedEvent = null;
    },

    async saveEvent(eventData) {
      try {
        if (this.selectedEvent) {
          await this.$store.dispatch('calendar/updateEvent', {
            id: this.selectedEvent.id,
            eventData
          });
          this.showNotification({ type: 'success', message: '✅ Evento actualizado' });
        } else {
          await this.$store.dispatch('calendar/createEvent', eventData);
          this.showNotification({ type: 'success', message: '✅ Evento creado' });
        }
        this.closeEventDialog();
      } catch (error) {
        this.showNotification({ type: 'error', message: '❌ Error al guardar evento' });
      }
    },

    async deleteEvent(eventId) {
      if (confirm('¿Estás seguro de eliminar este evento?')) {
        try {
          await this.$store.dispatch('calendar/deleteEvent', eventId);
          this.showNotification({ type: 'success', message: '✅ Evento eliminado' });
          this.closeEventDialog();
        } catch (error) {
          this.showNotification({ type: 'error', message: '❌ Error al eliminar evento' });
        }
      }
    },

    async syncCalendars() {
      try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 2);

        await this.syncFromExternal({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

        this.showNotification({ type: 'success', message: '✅ Calendarios sincronizados' });
      } catch (error) {
        this.showNotification({ type: 'error', message: '❌ Error al sincronizar calendarios' });
      }
    },

    getEventStyle(event) {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const duration = (end - start) / (1000 * 60 * 60);
      const top = start.getHours() * 60 + start.getMinutes();

      return {
        top: `${top}px`,
        height: `${duration * 60}px`,
        backgroundColor: event.color
      };
    },

    formatTime(dateString) {
      return new Date(dateString).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    formatEventDate(dateString) {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    getEventTypeLabel(type) {
      return calendarService.getEventTypeLabel(type);
    }
  }
};
</script>

<style scoped>
.calendar-view {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  height: calc(100vh - 100px);
  padding: 20px;
}

.calendar-header {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 15px;
}

.calendar-nav h2 {
  margin: 0;
  min-width: 250px;
  text-align: center;
}

.btn-nav {
  padding: 8px 15px;
  font-size: 20px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
}

.btn-today {
  padding: 8px 15px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
}

.calendar-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.view-switcher {
  display: flex;
  gap: 5px;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 6px;
}

.btn-view {
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-view.active {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.btn-primary {
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-secondary {
  padding: 8px 16px;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-sync {
  padding: 8px 16px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-sync:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.calendar-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  overflow: auto;
  padding: 20px;
}

/* Vista mensual */
.month-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #ecf0f1;
  margin-bottom: 1px;
}

.weekday {
  padding: 10px;
  text-align: center;
  font-weight: 600;
  background: white;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  gap: 1px;
  background: #ecf0f1;
  flex: 1;
}

.day-cell {
  background: white;
  padding: 8px;
  min-height: 100px;
  cursor: pointer;
  position: relative;
}

.day-cell.other-month {
  background: #f8f9fa;
  color: #999;
}

.day-cell.today {
  background: #e3f2fd;
}

.day-cell.selected {
  box-shadow: inset 0 0 0 2px #3498db;
}

.day-number {
  font-weight: 600;
  margin-bottom: 5px;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.more-events {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

/* Vista semanal */
.week-view, .day-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #ecf0f1;
  margin-bottom: 10px;
}

.week-day-header {
  background: white;
  padding: 10px;
  text-align: center;
}

.week-day-name {
  font-size: 12px;
  color: #666;
}

.week-day-number {
  font-size: 20px;
  font-weight: 600;
}

.week-day-number.is-today {
  color: #3498db;
}

.week-body {
  flex: 1;
  display: grid;
  grid-template-columns: 60px 1fr;
  overflow: auto;
}

.time-column {
  border-right: 1px solid #ecf0f1;
}

.hour-slot {
  height: 60px;
  border-bottom: 1px solid #ecf0f1;
  padding: 5px;
  font-size: 12px;
  color: #666;
}

.week-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #ecf0f1;
  position: relative;
}

.week-day-column {
  background: white;
  position: relative;
}

.week-event {
  position: absolute;
  left: 2px;
  right: 2px;
  padding: 4px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  overflow: hidden;
}

/* Sidebar de próximos eventos */
.upcoming-events {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 20px;
  overflow: auto;
}

.upcoming-events h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.no-events {
  text-align: center;
  color: #999;
  padding: 40px 20px;
}

.upcoming-event-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 10px;
  cursor: pointer;
  background: #f8f9fa;
  transition: all 0.2s;
}

.upcoming-event-card:hover {
  background: #ecf0f1;
  transform: translateX(5px);
}

.event-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.event-info {
  flex: 1;
}

.event-info .event-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.event-info .event-date {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.event-info .event-type {
  font-size: 11px;
  color: #999;
}
</style>
