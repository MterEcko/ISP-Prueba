<template>
  <div class="quick-message-form">
    <div class="modal-header">
      <h3>Enviar {{ channelLabels[channel] }}</h3>
      <button @click="$emit('close')" class="close-btn">✕</button>
    </div>

    <div class="modal-body">
      <form @submit.prevent="sendMessage">
        
        <!-- Destinatario -->
        <div class="form-group">
          <label>Destinatario:</label>
          <div class="recipient-info">
            <span class="recipient-name">{{ recipientName }}</span>
            <span class="recipient-contact">{{ recipientContact }}</span>
          </div>
        </div>

        <!-- Plantillas (si hay) -->
        <div v-if="templates.length > 0" class="form-group">
          <label for="template">Plantilla:</label>
          <select 
            id="template" 
            v-model="selectedTemplate" 
            @change="loadTemplate"
            class="form-control"
          >
            <option value="">Mensaje personalizado</option>
            <option 
              v-for="template in templates" 
              :key="template.id" 
              :value="template.id"
            >
              {{ template.name }}
            </option>
          </select>
        </div>

        <!-- Asunto (solo para email) -->
        <div v-if="channel === 'email'" class="form-group">
          <label for="subject">Asunto: *</label>
          <input 
            id="subject"
            v-model="messageData.subject" 
            type="text" 
            class="form-control"
            placeholder="Asunto del correo"
            required
          />
        </div>

        <!-- Mensaje -->
        <div class="form-group">
          <label for="message">Mensaje: *</label>
          <textarea 
            id="message"
            v-model="messageData.message" 
            class="form-control message-textarea"
            :placeholder="getMessagePlaceholder()"
            :maxlength="getMaxLength()"
            rows="6"
            required
          ></textarea>
          <div class="character-count">
            {{ messageData.message.length }} / {{ getMaxLength() }} caracteres
          </div>
        </div>

        <!-- Variables disponibles -->
        <div v-if="availableVariables.length > 0" class="form-group">
          <label>Variables disponibles:</label>
          <div class="variables-list">
            <button 
              v-for="variable in availableVariables" 
              :key="variable.key"
              type="button"
              @click="insertVariable(variable)"
              class="variable-btn"
              :title="variable.description"
            >
              {{ variable.label }}
            </button>
          </div>
          <small class="help-text">
            Haz clic en una variable para insertarla en el mensaje
          </small>
        </div>

        <!-- Vista previa (si hay plantilla) -->
        <div v-if="previewMessage" class="form-group">
          <label>Vista previa:</label>
          <div class="message-preview">
            <div v-if="channel === 'email'" class="preview-subject">
              <strong>Asunto:</strong> {{ processedSubject }}
            </div>
            <div class="preview-content">
              {{ previewMessage }}
            </div>
          </div>
        </div>

        <!-- Opciones adicionales -->
        <div class="form-group">
          <div class="form-options">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="messageData.sendCopy"
              />
              <span class="checkmark"></span>
              Enviar copia a mi correo
            </label>
            
            <label v-if="channel !== 'sms'" class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="messageData.highPriority"
              />
              <span class="checkmark"></span>
              Marcar como alta prioridad
            </label>
          </div>
        </div>

        <!-- Estado del canal -->
        <div class="channel-status">
          <div :class="['status-indicator', channelStatus.status]">
            <span class="status-icon">{{ channelStatus.icon }}</span>
            <span class="status-text">{{ channelStatus.message }}</span>
          </div>
        </div>

        <!-- Acciones -->
        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="btn-cancel">
            Cancelar
          </button>
          <button 
            type="submit" 
            class="btn-send"
            :disabled="!canSend || sending"
          >
            <span v-if="sending" class="sending-spinner"></span>
            {{ sending ? 'Enviando...' : `Enviar ${channelLabels[channel]}` }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script>
import CommunicationService from '../services/communication.service';

export default {
  name: 'QuickMessageForm',
  props: {
    clientId: {
      type: [Number, String],
      required: true
    },
    channel: {
      type: String,
      required: true,
      validator: value => ['email', 'sms', 'whatsapp', 'telegram'].includes(value)
    }
  },
  data() {
    return {
      messageData: {
        subject: '',
        message: '',
        sendCopy: false,
        highPriority: false
      },
      selectedTemplate: '',
      templates: [],
      sending: false,
      
      channelLabels: {
        email: 'Email',
        sms: 'SMS',
        whatsapp: 'WhatsApp',
        telegram: 'Telegram'
      },

      availableVariables: [
        { key: '{nombre}', label: 'Nombre', description: 'Nombre completo del cliente' },
        { key: '{email}', label: 'Email', description: 'Correo electrónico' },
        { key: '{telefono}', label: 'Teléfono', description: 'Número de teléfono' },
        { key: '{plan}', label: 'Plan', description: 'Plan de servicio actual' },
        { key: '{ip}', label: 'IP', description: 'Dirección IP asignada' },
        { key: '{vencimiento}', label: 'Vencimiento', description: 'Fecha de próximo pago' },
        { key: '{empresa}', label: 'Empresa', description: 'Nombre de la empresa' }
      ],

      channelStatus: {
        status: 'active',
        icon: '✅',
        message: 'Canal disponible'
      }
    };
  },
  computed: {
    recipientName() {
      // Esto debería venir del cliente actual
      return 'Cliente'; // Placeholder
    },

    recipientContact() {
      const contactMap = {
        email: 'cliente@ejemplo.com',
        sms: '+52 123 456 7890',
        whatsapp: '+52 123 456 7890',
        telegram: '@cliente'
      };
      return contactMap[this.channel] || '';
    },

    canSend() {
      if (this.channel === 'email') {
        return this.messageData.subject.trim() && this.messageData.message.trim();
      }
      return this.messageData.message.trim();
    },

    previewMessage() {
      if (!this.selectedTemplate || !this.messageData.message) return '';
      return this.processVariables(this.messageData.message);
    },

    processedSubject() {
      if (!this.messageData.subject) return '';
      return this.processVariables(this.messageData.subject);
    }
  },
  methods: {
    async loadTemplates() {
      try {
        const response = await CommunicationService.getTemplates(this.channel);
        this.templates = response.data || [];
      } catch (error) {
        console.error('Error cargando plantillas:', error);
        this.templates = [];
      }
    },

    async loadTemplate() {
      if (!this.selectedTemplate) {
        this.messageData.message = '';
        this.messageData.subject = '';
        return;
      }

      try {
        const response = await CommunicationService.getTemplate(this.selectedTemplate);
        const template = response.data;
        
        this.messageData.message = template.messageBody || '';
        if (template.subject) {
          this.messageData.subject = template.subject;
        }
      } catch (error) {
        console.error('Error cargando plantilla:', error);
      }
    },

    insertVariable(variable) {
      const textarea = this.$el.querySelector('.message-textarea');
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const currentMessage = this.messageData.message;
      this.messageData.message = 
        currentMessage.slice(0, start) + 
        variable.key + 
        currentMessage.slice(end);
      
      // Mover cursor después de la variable insertada
      this.$nextTick(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.key.length, start + variable.key.length);
      });
    },

    processVariables(text) {
      // Simular procesamiento de variables con datos del cliente
      const variables = {
        '{nombre}': this.recipientName,
        '{email}': this.recipientContact,
        '{telefono}': '+52 123 456 7890',
        '{plan}': 'Plan Básico 20 Mbps',
        '{ip}': '192.168.1.100',
        '{vencimiento}': '15/08/2024',
        '{empresa}': 'Mi ISP'
      };

      let processedText = text;
      Object.keys(variables).forEach(key => {
        processedText = processedText.replace(new RegExp(key, 'g'), variables[key]);
      });

      return processedText;
    },

    getMessagePlaceholder() {
      const placeholders = {
        email: 'Escriba su mensaje aquí. Puede usar variables como {nombre}, {plan}, etc.',
        sms: 'Mensaje SMS (máximo 160 caracteres)',
        whatsapp: 'Mensaje de WhatsApp',
        telegram: 'Mensaje de Telegram'
      };
      return placeholders[this.channel] || 'Escriba su mensaje';
    },

    getMaxLength() {
      const limits = {
        email: 5000,
        sms: 160,
        whatsapp: 4096,
        telegram: 4096
      };
      return limits[this.channel] || 1000;
    },

    async checkChannelStatus() {
      try {
        const response = await CommunicationService.getChannelStatus();
        const channelInfo = response.data[this.channel];
        
        if (channelInfo?.active) {
          this.channelStatus = {
            status: 'active',
            icon: '✅',
            message: 'Canal disponible'
          };
        } else {
          this.channelStatus = {
            status: 'inactive',
            icon: '❌',
            message: 'Canal no disponible'
          };
        }
      } catch (error) {
        console.error('Error verificando estado del canal:', error);
        this.channelStatus = {
          status: 'warning',
          icon: '⚠️',
          message: 'No se pudo verificar el estado del canal'
        };
      }
    },

    async sendMessage() {
      if (!this.canSend) return;

      this.sending = true;
      
      try {
        const payload = {
          message: this.messageData.message,
          sendCopy: this.messageData.sendCopy,
          highPriority: this.messageData.highPriority
        };

        if (this.channel === 'email') {
          payload.subject = this.messageData.subject;
        }

        let response;
        switch (this.channel) {
          case 'email':
            response = await CommunicationService.sendEmail(this.clientId, payload);
            break;
          case 'sms':
            response = await CommunicationService.sendSMS(this.clientId, payload);
            break;
          case 'whatsapp':
            response = await CommunicationService.sendWhatsApp(this.clientId, payload);
            break;
          case 'telegram':
            response = await CommunicationService.sendTelegram(this.clientId, payload);
            break;
        }

        console.log('✅ Mensaje enviado exitosamente:', response.data);
        
        this.$emit('sent', {
          channel: this.channel,
          message: payload,
          response: response.data
        });

      } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        
        // Mostrar error específico
        let errorMessage = 'Error enviando mensaje';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        alert(errorMessage);
      } finally {
        this.sending = false;
      }
    }
  },

  async created() {
    await this.loadTemplates();
    await this.checkChannelStatus();
  }
};
</script>

<style scoped>
.quick-message-form {
  width: 100%;
  max-width: 600px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

/* ===============================
   HEADER DEL MODAL
   =============================== */

.modal-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.close-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background: rgba(255,255,255,0.3);
}

/* ===============================
   CUERPO DEL MODAL
   =============================== */

.modal-body {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

/* ===============================
   FORMULARIO
   =============================== */

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.message-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.5;
}

/* ===============================
   INFORMACIÓN DEL DESTINATARIO
   =============================== */

.recipient-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.recipient-name {
  font-weight: 600;
  color: #333;
}

.recipient-contact {
  color: #666;
  font-size: 0.9rem;
}

/* ===============================
   CONTADOR DE CARACTERES
   =============================== */

.character-count {
  text-align: right;
  font-size: 0.85rem;
  color: #666;
  margin-top: 4px;
}

/* ===============================
   VARIABLES
   =============================== */

.variables-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.variable-btn {
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 16px;
  padding: 6px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #555;
}

.variable-btn:hover {
  background: #667eea;
  border-color: #667eea;
  color: white;
  transform: translateY(-1px);
}

.help-text {
  color: #666;
  font-size: 0.8rem;
  font-style: italic;
}

/* ===============================
   VISTA PREVIA
   =============================== */

.message-preview {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  font-family: inherit;
}

.preview-subject {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #dee2e6;
}

.preview-content {
  line-height: 1.6;
  color: #333;
  white-space: pre-line;
}

/* ===============================
   OPCIONES DEL FORMULARIO
   =============================== */

.form-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: normal;
  margin: 0;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.checkmark {
  font-size: 0.9rem;
  color: #555;
}

/* ===============================
   ESTADO DEL CANAL
   =============================== */

.channel-status {
  margin: 20px 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.status-indicator.active {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.status-indicator.inactive {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

.status-indicator.warning {
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffecb3;
}

.status-icon {
  font-size: 1.1em;
}

/* ===============================
   ACCIONES DEL FORMULARIO
   =============================== */

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.btn-cancel,
.btn-send {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: center;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.btn-cancel:hover {
  background: #e9ecef;
  color: #333;
}

.btn-send {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  border: 1px solid transparent;
}

.btn-send:hover:not(:disabled) {
  background: linear-gradient(135deg, #45a049, #3d8b40);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.btn-send:disabled {
  background: #cccccc;
  color: #666;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* ===============================
   SPINNER DE ENVÍO
   =============================== */

.sending-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ===============================
   RESPONSIVE
   =============================== */

@media (max-width: 768px) {
  .quick-message-form {
    max-width: 95vw;
    margin: 10px;
  }
  
  .modal-header,
  .modal-body {
    padding: 16px 20px;
  }
  
  .variables-list {
    gap: 6px;
  }
  
  .variable-btn {
    font-size: 0.8rem;
    padding: 4px 10px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn-cancel,
  .btn-send {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .modal-header h3 {
    font-size: 1.1rem;
  }
  
  .form-control {
    padding: 10px;
    font-size: 0.95rem;
  }
  
  .message-textarea {
    min-height: 100px;
  }
}
</style>