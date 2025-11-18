<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Nuevo Mensaje</h3>
        <button @click="closeModal" class="close-button">&times;</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="sendMessage">
          <!-- Canal de comunicaci�n -->
          <div class="form-group">
            <label for="channel">Canal de comunicaci�n *</label>
            <select 
              id="channel" 
              v-model="message.channelId" 
              @change="onChannelChange"
              required
            >
              <option value="">Seleccionar canal</option>
              <option 
                v-for="channel in channels" 
                :key="channel.id" 
                :value="channel.id"
              >
                {{ getChannelIcon(channel.channelType) }} {{ channel.name }}
              </option>
            </select>
          </div>

          <!-- Destinatario -->
          <div class="form-group">
            <label for="recipientType">Destinatario *</label>
            <div class="radio-group">
              <label class="radio-option">
                <input 
                  type="radio" 
                  v-model="recipientType" 
                  value="client"
                  @change="onRecipientTypeChange"
                />
                Cliente espec�fico
              </label>
              <label class="radio-option">
                <input 
                  type="radio" 
                  v-model="recipientType" 
                  value="manual"
                  @change="onRecipientTypeChange"
                />
                Destinatario manual
              </label>
            </div>
          </div>

          <!-- Selecci�n de cliente -->
          <div v-if="recipientType === 'client'" class="form-group">
            <label for="client">Cliente *</label>
            <ClientSelector
              v-model="message.clientId"
              @select="onClientSelect"
              :placeholder="'Buscar cliente...'"
            />
          </div>

          <!-- Destinatario manual -->
          <div v-if="recipientType === 'manual'" class="form-group">
            <label for="recipient">{{ getRecipientLabel() }} *</label>
            <input 
              type="text" 
              id="recipient"
              v-model="message.recipient"
              :placeholder="getRecipientPlaceholder()"
              required
            />
          </div>

          <!-- Plantilla -->
          <div class="form-group">
            <label for="template">Plantilla (opcional)</label>
            <select 
              id="template" 
              v-model="selectedTemplateId"
              @change="onTemplateSelect"
            >
              <option value="">Mensaje personalizado</option>
              <option 
                v-for="template in availableTemplates" 
                :key="template.id" 
                :value="template.id"
              >
                {{ template.name }}
              </option>
            </select>
            
            <button 
              v-if="selectedTemplateId" 
              type="button" 
              @click="previewTemplate"
              class="preview-button"
            >
              Vista previa
            </button>
          </div>

          <!-- Asunto (solo para email) -->
          <div v-if="selectedChannel?.channelType === 'email'" class="form-group">
            <label for="subject">Asunto *</label>
            <input 
              type="text" 
              id="subject"
              v-model="message.subject"
              placeholder="Asunto del correo"
              required
            />
          </div>

          <!-- Mensaje -->
          <div class="form-group">
            <label for="message">Mensaje *</label>
            <textarea 
              id="message"
              v-model="message.messageBody"
              :placeholder="getMessagePlaceholder()"
              rows="6"
              required
            ></textarea>
            
            <div class="message-info">
              <span class="char-count">
                {{ message.messageBody.length }} caracteres
              </span>
              <span v-if="getCharacterLimit()" class="char-limit">
                / {{ getCharacterLimit() }} m�ximo
              </span>
            </div>
          </div>

          <!-- Variables disponibles -->
          <div v-if="availableVariables.length > 0" class="form-group">
            <label>Variables disponibles:</label>
            <div class="variables-list">
              <button 
                v-for="variable in availableVariables" 
                :key="variable.name"
                type="button"
                @click="insertVariable(variable)"
                class="variable-button"
                :title="variable.description"
              >
                {{ variable.name }}
              </button>
            </div>
          </div>

          <!-- Programar env�o -->
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="scheduleMessage"
              />
              Programar env�o
            </label>
          </div>

          <div v-if="scheduleMessage" class="form-row">
            <div class="form-group">
              <label for="scheduleDate">Fecha *</label>
              <input 
                type="date" 
                id="scheduleDate"
                v-model="message.scheduleDate"
                :min="today"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="scheduleTime">Hora *</label>
              <input 
                type="time" 
                id="scheduleTime"
                v-model="message.scheduleTime"
                required
              />
            </div>
          </div>

          <!-- Vista previa del mensaje -->
          <div v-if="messagePreview" class="message-preview">
            <h4>Vista previa:</h4>
            <div class="preview-content" v-html="messagePreview"></div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" @click="closeModal" class="cancel-button">
          Cancelar
        </button>
        <button 
          type="submit" 
          @click="sendMessage"
          :disabled="!canSend || sending"
          class="send-button"
        >
          {{ sending ? 'Enviando...' : (scheduleMessage ? 'Programar' : 'Enviar') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import CommunicationService from '../services/communication.service';
// import ClientService from '../services/client.service'; // Comentado: no utilizado actualmente
import ClientSelector from './ClientSelector.vue';

export default {
  name: 'NewMessageModal',
  components: {
    ClientSelector
  },
  props: {
    channels: {
      type: Array,
      default: () => []
    },
    templates: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      message: {
        channelId: '',
        clientId: null,
        recipient: '',
        subject: '',
        messageBody: '',
        scheduleDate: '',
        scheduleTime: ''
      },
      recipientType: 'client',
      selectedTemplateId: '',
      scheduleMessage: false,
      sending: false,
      messagePreview: '',
      selectedClient: null,
      availableVariables: [
        { name: '{nombre}', description: 'Nombre del cliente' },
        { name: '{apellido}', description: 'Apellido del cliente' },
        { name: '{email}', description: 'Email del cliente' },
        { name: '{telefono}', description: 'Tel�fono del cliente' },
        { name: '{plan}', description: 'Plan contratado' },
        { name: '{fecha}', description: 'Fecha actual' },
        { name: '{empresa}', description: 'Nombre de la empresa' }
      ]
    };
  },
  computed: {
    today() {
      return new Date().toISOString().split('T')[0];
    },
    
    selectedChannel() {
      return this.channels.find(c => c.id == this.message.channelId);
    },
    
    availableTemplates() {
      if (!this.selectedChannel) return [];
      return this.templates.filter(t => t.channelId == this.message.channelId);
    },
    
    canSend() {
      return this.message.channelId && 
             this.message.messageBody.trim() &&
             (this.recipientType === 'manual' ? this.message.recipient : this.message.clientId) &&
             (!this.scheduleMessage || (this.message.scheduleDate && this.message.scheduleTime)) &&
             (!this.selectedChannel?.channelType === 'email' || this.message.subject);
    }
  },
  methods: {
    closeModal() {
      this.$emit('close');
    },

    onChannelChange() {
      // Limpiar campos espec�ficos del canal anterior
      this.message.subject = '';
      this.selectedTemplateId = '';
      this.messagePreview = '';
    },

    onRecipientTypeChange() {
      this.message.clientId = null;
      this.message.recipient = '';
      this.selectedClient = null;
    },

    onClientSelect(client) {
      this.selectedClient = client;
      this.message.clientId = client.id;
      
      // Auto-completar destinatario seg�n el canal
      if (this.selectedChannel) {
        switch (this.selectedChannel.channelType) {
          case 'email':
            this.message.recipient = client.email;
            break;
          case 'whatsapp':
            this.message.recipient = client.whatsapp || client.phone;
            break;
          case 'sms':
            this.message.recipient = client.phone;
            break;
          default:
            this.message.recipient = client.email || client.phone;
        }
      }
    },

    async onTemplateSelect() {
      if (!this.selectedTemplateId) {
        this.message.subject = '';
        this.message.messageBody = '';
        this.messagePreview = '';
        return;
      }

      try {
        const template = this.templates.find(t => t.id == this.selectedTemplateId);
        if (template) {
          this.message.subject = template.subject || '';
          this.message.messageBody = template.messageBody || '';
          
          // Si hay un cliente seleccionado, generar vista previa
          if (this.selectedClient) {
            this.previewTemplate();
          }
        }
      } catch (error) {
        console.error('Error cargando plantilla:', error);
      }
    },

    async previewTemplate() {
      if (!this.selectedTemplateId || !this.selectedClient) return;

      try {
        const variables = {
          nombre: this.selectedClient.firstName,
          apellido: this.selectedClient.lastName,
          email: this.selectedClient.email,
          telefono: this.selectedClient.phone,
          plan: this.selectedClient.plan?.name || 'N/A',
          fecha: new Date().toLocaleDateString('es-MX'),
          empresa: 'Mi ISP' // Esto deber�a venir de configuraci�n
        };

        const response = await CommunicationService.previewTemplate(
          this.selectedTemplateId, 
          variables
        );
        
        this.messagePreview = response.data.preview;
      } catch (error) {
        console.error('Error generando vista previa:', error);
        this.$toast.error('Error generando vista previa');
      }
    },

    insertVariable(variable) {
      const textarea = document.getElementById('message');
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      this.message.messageBody = 
        this.message.messageBody.substring(0, start) + 
        variable.name + 
        this.message.messageBody.substring(end);
      
      // Reposicionar cursor
      this.$nextTick(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.name.length, start + variable.name.length);
      });
    },

    async sendMessage() {
      if (!this.canSend || this.sending) return;

      this.sending = true;
      
      try {
        const messageData = {
          channelId: this.message.channelId,
          recipient: this.message.recipient,
          message: this.message.messageBody,
          clientId: this.message.clientId
        };

        // Agregar asunto si es email
        if (this.selectedChannel?.channelType === 'email') {
          messageData.subject = this.message.subject;
        }

        // Agregar programaci�n si est� habilitada
        if (this.scheduleMessage) {
          messageData.scheduledFor = `${this.message.scheduleDate}T${this.message.scheduleTime}:00`;
        }

        if (this.scheduleMessage) {
          await CommunicationService.scheduleMessage(messageData);
          this.$toast.success('Mensaje programado exitosamente');
        } else {
          await CommunicationService.sendMessage(messageData);
          this.$toast.success('Mensaje enviado exitosamente');
        }

        this.$emit('send', messageData);
        this.closeModal();
      } catch (error) {
        console.error('Error enviando mensaje:', error);
        this.$toast.error('Error enviando mensaje: ' + (error.response?.data?.message || error.message));
      } finally {
        this.sending = false;
      }
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

    getRecipientLabel() {
      if (!this.selectedChannel) return 'Destinatario';
      
      const labels = {
        'email': 'Correo electr�nico',
        'whatsapp': 'N�mero de WhatsApp',
        'telegram': 'Usuario de Telegram',
        'sms': 'N�mero de tel�fono'
      };
      
      return labels[this.selectedChannel.channelType] || 'Destinatario';
    },

    getRecipientPlaceholder() {
      if (!this.selectedChannel) return 'Ingrese el destinatario';
      
      const placeholders = {
        'email': 'ejemplo@correo.com',
        'whatsapp': '+52 55 1234 5678',
        'telegram': '@usuario',
        'sms': '+52 55 1234 5678'
      };
      
      return placeholders[this.selectedChannel.channelType] || 'Ingrese el destinatario';
    },

    getMessagePlaceholder() {
      if (!this.selectedChannel) return 'Escriba su mensaje aqu�...';
      
      const placeholders = {
        'email': 'Escriba el contenido del correo...',
        'whatsapp': 'Escriba el mensaje de WhatsApp...',
        'telegram': 'Escriba el mensaje de Telegram...',
        'sms': 'Escriba el mensaje SMS...'
      };
      
      return placeholders[this.selectedChannel.channelType] || 'Escriba su mensaje aqu�...';
    },

    getCharacterLimit() {
      if (!this.selectedChannel) return null;
      
      const limits = {
        'sms': 160,
        'whatsapp': 4096,
        'telegram': 4096
      };
      
      return limits[this.selectedChannel.channelType];
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
  max-width: 600px;
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
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  width: auto;
  margin: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.preview-button {
  margin-top: 8px;
  padding: 6px 12px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.message-info {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

.char-count {
  color: #666;
}

.char-limit {
  color: #999;
}

.variables-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.variable-button {
  background: #e9ecef;
  border: 1px solid #ddd;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #495057;
}

.variable-button:hover {
  background: #dee2e6;
}

.message-preview {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
}

.message-preview h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
}

.preview-content {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.cancel-button {
  padding: 10px 20px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.send-button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .radio-group {
    flex-direction: column;
    gap: 10px;
  }
  
  .variables-list {
    justify-content: center;
  }
}
</style> 