<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>{{ event ? 'Editar Evento' : 'Nuevo Evento' }}</h3>
        <button @click="$emit('close')" class="btn-close">✕</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Título*</label>
          <input v-model="form.title" required placeholder="Título del evento">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Fecha inicio*</label>
            <input v-model="form.startDate" type="datetime-local" required>
          </div>
          <div class="form-group">
            <label>Fecha fin*</label>
            <input v-model="form.endDate" type="datetime-local" required>
          </div>
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <textarea v-model="form.description" rows="3"></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Tipo</label>
            <select v-model="form.eventType">
              <option value="meeting">Reunión</option>
              <option value="task">Tarea</option>
              <option value="reminder">Recordatorio</option>
              <option value="installation">Instalación</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="call">Llamada</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div class="form-group">
            <label>Prioridad</label>
            <select v-model="form.priority">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Ubicación</label>
          <input v-model="form.location" placeholder="Ubicación del evento">
        </div>

        <div class="form-group">
          <label>
            <input v-model="form.allDay" type="checkbox"> Todo el día
          </label>
        </div>

        <div class="dialog-actions">
          <button v-if="event" @click="handleDelete" type="button" class="btn-danger">
            Eliminar
          </button>
          <button @click="$emit('close')" type="button" class="btn-secondary">
            Cancelar
          </button>
          <button type="submit" class="btn-primary">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CalendarEventDialog',
  props: {
    event: { type: Object, default: null }
  },

  data() {
    return {
      form: {
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        allDay: false,
        location: '',
        eventType: 'other',
        priority: 'medium',
        status: 'pending'
      }
    };
  },

  created() {
    if (this.event) {
      this.form = {
        ...this.event,
        startDate: this.formatDateTimeLocal(this.event.startDate),
        endDate: this.formatDateTimeLocal(this.event.endDate)
      };
    } else {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const later = new Date(now);
      later.setHours(later.getHours() + 1);

      this.form.startDate = this.formatDateTimeLocal(now);
      this.form.endDate = this.formatDateTimeLocal(later);
    }
  },

  methods: {
    handleSubmit() {
      this.$emit('save', {
        ...this.form,
        startDate: new Date(this.form.startDate).toISOString(),
        endDate: new Date(this.form.endDate).toISOString()
      });
    },

    handleDelete() {
      this.$emit('delete', this.event.id);
    },

    formatDateTimeLocal(date) {
      const d = new Date(date);
      const pad = (n) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ecf0f1;
}

.dialog-header h3 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

form {
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="datetime-local"],
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-danger {
  background: #e74c3c;
  color: white;
  margin-right: auto;
}
</style>
