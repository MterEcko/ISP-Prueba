<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Editar Programaci�n</h3>
        <button @click="closeModal" class="close-button">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Informaci�n del mensaje actual -->
        <div class="message-info">
          <h4>Informaci�n del Mensaje</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Destinatario:</span>
              <span class="value">{{ message.recipient }}</span>
            </div>
            <div class="info-item" v-if="message.clientName">
              <span class="label">Cliente:</span>
              <span class="value">{{ message.clientName }}</span>
            </div>
            <div class="info-item">
              <span class="label">Canal:</span>
              <span class="value">
                {{ getChannelIcon(message.channelType) }} {{ message.channelName }}
              </span>
            </div>
            <div class="info-item">
              <span class="label">Estado:</span>
              <span class="value" :class="message.status">{{ getStatusText(message.status) }}</span>
            </div>
          </div>
          
          <div v-if="message.subject" class="message-subject">
            <span class="label">Asunto:</span>
            <span class="value">{{ message.subject }}</span>
          </div>
          
          <div class="message-preview">
            <span class="label">Mensaje:</span>
            <div class="preview-content">{{ truncateText(message.messageData, 200) }}</div>
          </div>
        </div>

        <!-- Programaci�n actual -->
        <div class="current-schedule">
          <h4>Programaci�n Actual</h4>
          <div class="schedule-info">
            <div class="schedule-item">
              <span class="schedule-label">Programado para:</span>
              <span class="schedule-value" :class="{ 'overdue': isOverdue() }">
                {{ formatDateTime(message.scheduledFor) }}
              </span>
            </div>
            <div v-if="message.attempts > 0" class="schedule-item">
              <span class="schedule-label">Intentos realizados:</span>
              <span class="schedule-value">{{ message.attempts }}/{{ message.maxAttempts }}</span>
            </div>
            <div v-if="isOverdue()" class="overdue-warning">
              ?? Este mensaje est� vencido y deber�a ejecutarse inmediatamente
            </div>
          </div>
        </div>

        <!-- Nueva programaci�n -->
        <form @submit.prevent="saveSchedule">
          <div class="new-schedule">
            <h4>Nueva Programaci�n</h4>
            
            <div class="schedule-options">
              <div class="option-group">
                <label class="radio-option">
                  <input 
                    type="radio" 
                    v-model="scheduleType" 
                    value="immediate"
                  />
                  <span class="option-text">
                    <strong>Enviar inmediatamente</strong>
                    <small>El mensaje se enviar� en cuanto se procese</small>
                  </span>
                </label>
              </div>

              <div class="option-group">
                <label class="radio-option">
                  <input 
                    type="radio" 
                    v-model="scheduleType" 
                    value="datetime"
                  />
                  <span class="option-text">
                    <strong>Programar para fecha espec�fica</strong>
                    <small>Selecciona una nueva fecha y hora</small>
                  </span>
                </label>
              </div>

              <div class="option-group">
                <label class="radio-option">
                  <input 
                    type="radio" 
                    v-model="scheduleType" 
                    value="delay"
                  />
                  <span class="option-text">
                    <strong>Retrasar por un per�odo</strong>
                    <small>A�adir tiempo a la programaci�n actual</small>
                  </span>
                </label>
              </div>
            </div>

            <!-- Selecci�n de fecha y hora -->
            <div v-if="scheduleType === 'datetime'" class="datetime-selector">
              <div class="datetime-row">
                <div class="form-group">
                  <label for="newDate">Nueva fecha *</label>
                  <input 
                    type="date" 
                    id="newDate"
                    v-model="newSchedule.date"
                    :min="today"
                    required
                  />
                </div>
                
                <div class="form-group">
                  <label for="newTime">Nueva hora *</label>
                  <input 
                    type="time" 
                    id="newTime"
                    v-model="newSchedule.time"
                    required
                  />
                </div>
              </div>
              
              <div class="preview-datetime">
                <span class="preview-label">Se enviar�:</span>
                <span class="preview-value">{{ previewDateTime }}</span>
              </div>
            </div>

            <!-- Selector de retraso -->
            <div v-if="scheduleType === 'delay'" class="delay-selector">
              <div class="delay-row">
                <div class="form-group">
                  <label for="delayAmount">Cantidad</label>
                  <input 
                    type="number" 
                    id="delayAmount"
                    v-model="delayAmount"
                    min="1"
                    max="999"
                    required
                  />
                </div>
                
                <div class="form-group">
                  <label for="delayUnit">Unidad</label>
                  <select id="delayUnit" v-model="delayUnit" required>
                    <option value="minutes">Minutos</option>
                    <option value="hours">Horas</option>
                    <option value="days">D�as</option>
                    <option value="weeks">Semanas</option>
                  </select>
                </div>
              </div>
              
              <div class="preview-delay">
                <span class="preview-label">Se enviar�:</span>
                <span class="preview-value">{{ previewDelayDateTime }}</span>
              </div>
            </div>

            <!-- Opciones avanzadas -->
            <div class="advanced-options">
              <div class="form-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="resetAttempts"
                  />
                  Reiniciar contador de intentos
                </label>
                <small class="help-text">
                  �til si el mensaje hab�a fallado anteriormente
                </small>
              </div>

              <div v-if="message.status === 'failed'" class="form-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="increasePriority"
                  />
                  Aumentar prioridad del mensaje
                </label>
                <small class="help-text">
                  El mensaje se procesar� antes que otros pendientes
                </small>
              </div>
            </div>

            <!-- Raz�n del cambio -->
            <div class="form-group">
              <label for="reason">Raz�n del cambio (opcional)</label>
              <textarea 
                id="reason"
                v-model="changeReason"
                placeholder="Explica por qu� se reprograma este mensaje..."
                rows="3"
              ></textarea>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" @click="closeModal" class="cancel-button">
          Cancelar
        </button>
        <button 
          type="submit" 
          @click="saveSchedule"
          :disabled="!canSave || saving"
          class="save-button"
        >
          {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EditScheduleModal',
  props: {
    message: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'save'],
  data() {
    return {
      scheduleType: 'datetime',
      newSchedule: {
        date: '',
        time: ''
      },
      delayAmount: 1,
      delayUnit: 'hours',
      resetAttempts: false,
      increasePriority: false,
      changeReason: '',
      saving: false
    };
  },
  computed: {
    today() {
      return new Date().toISOString().split('T')[0];
    },
    
    currentTime() {
      const now = new Date();
      return now.toTimeString().slice(0, 5);
    },
    
    previewDateTime() {
      if (!this.newSchedule.date || !this.newSchedule.time) {
        return 'Selecciona fecha y hora';
      }
      
      const date = new Date(`${this.newSchedule.date}T${this.newSchedule.time}`);
      return this.formatDateTime(date.toISOString());
    },
    
    previewDelayDateTime() {
      if (!this.delayAmount || !this.delayUnit) {
        return 'Selecciona cantidad y unidad';
      }
      
      const currentSchedule = new Date(this.message.scheduledFor);
      const delayMs = this.getDelayInMilliseconds();
      const newDate = new Date(currentSchedule.getTime() + delayMs);
      
      return this.formatDateTime(newDate.toISOString());
    },
    
    canSave() {
      if (this.scheduleType === 'immediate') return true;
      if (this.scheduleType === 'datetime') {
        return this.newSchedule.date && this.newSchedule.time;
      }
      if (this.scheduleType === 'delay') {
        return this.delayAmount > 0 && this.delayUnit;
      }
      return false;
    }
  },
  mounted() {
    // Inicializar con valores por defecto
    this.initializeDefaults();
  },
  methods: {
    initializeDefaults() {
      // Si el mensaje est� vencido, sugerir env�o inmediato
      if (this.isOverdue()) {
        this.scheduleType = 'immediate';
      } else {
        // Inicializar con la fecha/hora actual del mensaje
        const currentDate = new Date(this.message.scheduledFor);
        this.newSchedule.date = currentDate.toISOString().split('T')[0];
        this.newSchedule.time = currentDate.toTimeString().slice(0, 5);
      }
      
      // Si el mensaje ha fallado, sugerir reiniciar intentos
      if (this.message.status === 'failed') {
        this.resetAttempts = true;
        this.increasePriority = true;
      }
    },
    
    closeModal() {
      this.$emit('close');
    },
    
    async saveSchedule() {
      if (!this.canSave || this.saving) return;
      
      this.saving = true;
      
      try {
        const newScheduleData = this.buildScheduleData();
        await this.$emit('save', this.message.id, newScheduleData);
      } catch (error) {
        console.error('Error saving schedule:', error);
      } finally {
        this.saving = false;
      }
    },
    
    buildScheduleData() {
      let scheduledFor;
      
      switch (this.scheduleType) {
        case 'immediate':
          scheduledFor = new Date().toISOString();
          break;
        case 'datetime':
          scheduledFor = new Date(`${this.newSchedule.date}T${this.newSchedule.time}`).toISOString();
          break;
        case 'delay': {
          const currentSchedule = new Date(this.message.scheduledFor);
          const delayMs = this.getDelayInMilliseconds();
          scheduledFor = new Date(currentSchedule.getTime() + delayMs).toISOString();
          break;
        }
      }
      
      return {
        scheduledFor,
        resetAttempts: this.resetAttempts,
        increasePriority: this.increasePriority,
        changeReason: this.changeReason,
        scheduleType: this.scheduleType,
        originalSchedule: this.message.scheduledFor
      };
    },
    
    getDelayInMilliseconds() {
      const multipliers = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
        weeks: 7 * 24 * 60 * 60 * 1000
      };
      
      return this.delayAmount * multipliers[this.delayUnit];
    },
    
    isOverdue() {
      return new Date(this.message.scheduledFor) < new Date();
    },
    
    getChannelIcon(channelType) {
      const icons = {
        'email': '??',
        'whatsapp': '??',
        'telegram': '??',
        'sms': '??'
      };
      return icons[channelType] || '??';
    },
    
    getStatusText(status) {
      const statusTexts = {
        'pending': 'Pendiente',
        'processing': 'Procesando',
        'sent': 'Enviado',
        'failed': 'Fallido',
        'cancelled': 'Cancelado'
      };
      return statusTexts[status] || status;
    },
    
    formatDateTime(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      
      // Si es hoy
      if (date.toDateString() === now.toDateString()) {
        return `Hoy a las ${date.toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      }
      
      // Si es ma�ana
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (date.toDateString() === tomorrow.toDateString()) {
        return `Ma�ana a las ${date.toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      }
      
      // Fecha completa
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    truncateText(text, length) {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-button:hover {
  background: #e9ecef;
}

.modal-body {
  padding: 20px;
}

.message-info,
.current-schedule,
.new-schedule {
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.message-info h4,
.current-schedule h4,
.new-schedule h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  margin-bottom: 2px;
}

.value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.value.pending {
  color: #856404;
}

.value.failed {
  color: #dc3545;
}

.value.sent {
  color: #198754;
}

.message-subject,
.message-preview {
  margin-bottom: 10px;
}

.message-subject:last-child,
.message-preview:last-child {
  margin-bottom: 0;
}

.preview-content {
  background: white;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  font-size: 13px;
  line-height: 1.4;
  color: #495057;
  margin-top: 5px;
}

.schedule-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.schedule-value {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.schedule-value.overdue {
  color: #dc3545;
}

.overdue-warning {
  background: #fff3cd;
  color: #856404;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  border: 1px solid #ffeaa7;
}

.schedule-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.option-group {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 15px;
  background: white;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  margin-top: 2px;
}

.option-text {
  display: flex;
  flex-direction: column;
}

.option-text strong {
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
}

.option-text small {
  font-size: 12px;
  color: #666;
}

.datetime-selector,
.delay-selector {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.datetime-row,
.delay-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 5px;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.help-text {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  display: block;
}

.preview-datetime,
.preview-delay {
  background: #e8f5e9;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #c3e6cb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-label {
  font-size: 13px;
  color: #155724;
  font-weight: 500;
}

.preview-value {
  font-size: 13px;
  color: #155724;
  font-weight: 600;
}

.advanced-options {
  border-top: 1px solid #e9ecef;
  padding-top: 15px;
  margin-top: 15px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.cancel-button,
.save-button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
}

.cancel-button {
  background: #6c757d;
  color: white;
}

.cancel-button:hover {
  background: #5a6268;
}

.save-button {
  background: #007bff;
  color: white;
}

.save-button:hover {
  background: #0056b3;
}

.save-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .datetime-row,
  .delay-row {
    grid-template-columns: 1fr;
  }
  
  .schedule-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .modal-footer {
    flex-wrap: wrap;
  }
  
  .cancel-button,
  .save-button {
    flex: 1;
    min-width: 120px;
  }
}
</style>