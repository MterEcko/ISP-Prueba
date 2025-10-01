<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Envío Masivo de Mensajes</h3>
        <button @click="closeModal" class="close-button">&times;</button>
      </div>

      <div class="modal-body">
        <div class="step-indicator">
          <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
            <span class="step-number">1</span>
            <span class="step-label">Configuración</span>
          </div>
          <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
            <span class="step-number">2</span>
            <span class="step-label">Destinatarios</span>
          </div>
          <div class="step" :class="{ active: currentStep >= 3, completed: currentStep > 3 }">
            <span class="step-number">3</span>
            <span class="step-label">Mensaje</span>
          </div>
          <div class="step" :class="{ active: currentStep >= 4 }">
            <span class="step-number">4</span>
            <span class="step-label">Confirmar</span>
          </div>
        </div>

        <!-- Paso 1: Configuración básica -->
        <div v-if="currentStep === 1" class="step-content">
          <h4>Configuración del Envío</h4>
          
          <div class="form-group">
            <label for="channel">Canal de comunicación *</label>
            <select 
              id="channel" 
              v-model="massMessage.channelId" 
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
          </div>

          <div class="form-group">
            <label for="campaignName">Nombre de la campaña *</label>
            <input 
              type="text" 
              id="campaignName"
              v-model="massMessage.campaignName"
              placeholder="Ej: Recordatorio de pago marzo 2024"
              required
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="massMessage.scheduleMessage"
              />
              Programar envío
            </label>
          </div>

          <div v-if="massMessage.scheduleMessage" class="form-row">
            <div class="form-group">
              <label for="scheduleDate">Fecha *</label>
              <input 
                type="date" 
                id="scheduleDate"
                v-model="massMessage.scheduleDate"
                :min="today"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="scheduleTime">Hora *</label>
              <input 
                type="time" 
                id="scheduleTime"
                v-model="massMessage.scheduleTime"
                required
              />
            </div>
          </div>
        </div>

        <!-- Paso 2: Selección de destinatarios -->
        <div v-if="currentStep === 2" class="step-content">
          <h4>Selección de Destinatarios</h4>
          
          <div class="recipient-options">
            <div class="option-card" :class="{ selected: recipientType === 'all' }">
              <label class="option-label">
                <input 
                  type="radio" 
                  v-model="recipientType" 
                  value="all"
                  @change="onRecipientTypeChange"
                />
                <div class="option-content">
                  <h5>Todos los clientes activos</h5>
                  <p>Enviar a todos los clientes con estado activo</p>
                  <span class="client-count">{{ allActiveClients.length }} clientes</span>
                </div>
              </label>
            </div>

            <div class="option-card" :class="{ selected: recipientType === 'zone' }">
              <label class="option-label">
                <input 
                  type="radio" 
                  v-model="recipientType" 
                  value="zone"
                  @change="onRecipientTypeChange"
                />
                <div class="option-content">
                  <h5>Por zona/sector</h5>
                  <p>Seleccionar clientes por ubicación geográfica</p>
                </div>
              </label>
            </div>

            <div class="option-card" :class="{ selected: recipientType === 'plan' }">
              <label class="option-label">
                <input 
                  type="radio" 
                  v-model="recipientType" 
                  value="plan"
                  @change="onRecipientTypeChange"
                />
                <div class="option-content">
                  <h5>Por plan de servicio</h5>
                  <p>Filtrar por tipo de plan contratado</p>
                </div>
              </label>
            </div>

            <div class="option-card" :class="{ selected: recipientType === 'overdue' }">
              <label class="option-label">
                <input 
                  type="radio" 
                  v-model="recipientType" 
                  value="overdue"
                  @change="onRecipientTypeChange"
                />
                <div class="option-content">
                  <h5>Clientes con pagos vencidos</h5>
                  <p>Solo clientes con facturas pendientes</p>
                  <span class="client-count">{{ overdueClients.length }} clientes</span>
                </div>
              </label>
            </div>

            <div class="option-card" :class="{ selected: recipientType === 'custom' }">
              <label class="option-label">
                <input 
                  type="radio" 
                  v-model="recipientType" 
                  value="custom"
                  @change="onRecipientTypeChange"
                />
                <div class="option-content">
                  <h5>Selección personalizada</h5>
                  <p>Elegir clientes específicos manualmente</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Filtros específicos según el tipo -->
          <div v-if="recipientType === 'zone'" class="filters-section">
            <h5>Filtrar por ubicación</h5>
            <div class="form-row">
              <div class="form-group">
                <label>Zona:</label>
                <select v-model="filters.zoneId" @change="loadSectorsByZone">
                  <option value="">Todas las zonas</option>
                  <option v-for="zone in zones" :key="zone.id" :value="zone.id">
                    {{ zone.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Sector:</label>
                <select v-model="filters.sectorId">
                  <option value="">Todos los sectores</option>
                  <option v-for="sector in filteredSectors" :key="sector.id" :value="sector.id">
                    {{ sector.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div v-if="recipientType === 'plan'" class="filters-section">
            <h5>Filtrar por plan</h5>
            <div class="plan-checkboxes">
              <label v-for="plan in servicePlans" :key="plan.id" class="checkbox-label">
                <input 
                  type="checkbox" 
                  :value="plan.id"
                  v-model="filters.planIds"
                />
                {{ plan.name }} ({{ plan.price }}/mes)
              </label>
            </div>
          </div>

          <div v-if="recipientType === 'custom'" class="custom-selection">
            <h5>Seleccionar clientes</h5>
            <div class="search-clients">
              <input 
                type="text" 
                v-model="clientSearch" 
                @input="searchClients"
                placeholder="Buscar clientes por nombre..."
                class="search-input"
              />
            </div>
            
            <div class="selected-clients" v-if="selectedClients.length > 0">
              <h6>Clientes seleccionados ({{ selectedClients.length }})</h6>
              <div class="selected-list">
                <div 
                  v-for="client in selectedClients" 
                  :key="client.id"
                  class="selected-client"
                >
                  <span>{{ client.firstName }} {{ client.lastName }}</span>
                  <button @click="removeSelectedClient(client.id)" class="remove-btn">×</button>
                </div>
              </div>
            </div>

            <div class="available-clients" v-if="availableClients.length > 0">
              <h6>Clientes disponibles</h6>
              <div class="client-list">
                <div 
                  v-for="client in availableClients.slice(0, 10)" 
                  :key="client.id"
                  class="client-item"
                  @click="addSelectedClient(client)"
                >
                  <div class="client-info">
                    <span class="client-name">{{ client.firstName }} {{ client.lastName }}</span>
                    <span class="client-contact">{{ getClientContact(client) }}</span>
                  </div>
                  <button class="add-btn">+</button>
                </div>
              </div>
            </div>
          </div>

          <div class="recipient-summary">
            <div class="summary-card">
              <h5>Resumen de destinatarios</h5>
              <div class="summary-stat">
                <span class="stat-label">Total de destinatarios:</span>
                <span class="stat-value">{{ finalRecipientCount }}</span>
              </div>
              <div class="summary-stat">
                <span class="stat-label">Canal seleccionado:</span>
                <span class="stat-value">{{ selectedChannel?.name || 'No seleccionado' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Paso 3: Contenido del mensaje -->
        <div v-if="currentStep === 3" class="step-content">
          <h4>Contenido del Mensaje</h4>

          <div v-if="selectedChannel?.channelType === 'email'" class="form-group">
            <label for="subject">Asunto *</label>
            <input 
              type="text" 
              id="subject"
              v-model="massMessage.subject"
              placeholder="Asunto del correo masivo"
              required
            />
          </div>

          <div class="form-group">
            <label for="message">Mensaje *</label>
            <textarea 
              id="message"
              v-model="massMessage.messageBody"
              :placeholder="getMessagePlaceholder()"
              rows="8"
              required
            ></textarea>
            
            <div class="message-info">
              <span class="char-count">
                {{ massMessage.messageBody.length }} caracteres
              </span>
              <span v-if="getCharacterLimit()" class="char-limit">
                / {{ getCharacterLimit() }} máximo
              </span>
            </div>
          </div>

          <div class="variables-section">
            <h5>Variables disponibles</h5>
            <p class="variables-help">
              Haz clic en una variable para insertarla en el mensaje
            </p>
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

          <div class="preview-section">
            <h5>Vista previa</h5>
            <div class="message-preview">
              <div class="preview-header">
                <span class="preview-channel">{{ selectedChannel?.name }}</span>
                <span v-if="massMessage.subject" class="preview-subject">{{ massMessage.subject }}</span>
              </div>
              <div class="preview-content">
                {{ getPreviewMessage() }}
              </div>
            </div>
          </div>
        </div>

        <!-- Paso 4: Confirmación -->
        <div v-if="currentStep === 4" class="step-content">
          <h4>Confirmar Envío Masivo</h4>
          
          <div class="confirmation-summary">
            <div class="summary-section">
              <h5>?? Configuración del envío</h5>
              <div class="summary-item">
                <span class="label">Campaña:</span>
                <span class="value">{{ massMessage.campaignName }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Canal:</span>
                <span class="value">{{ selectedChannel?.name }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Programado:</span>
                <span class="value">
                  {{ massMessage.scheduleMessage 
                      ? `${massMessage.scheduleDate} a las ${massMessage.scheduleTime}` 
                      : 'Envío inmediato' }}
                </span>
              </div>
            </div>

            <div class="summary-section">
              <h5>?? Destinatarios</h5>
              <div class="summary-item">
                <span class="label">Tipo de selección:</span>
                <span class="value">{{ getRecipientTypeLabel() }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Total de destinatarios:</span>
                <span class="value highlight">{{ finalRecipientCount }}</span>
              </div>
            </div>

            <div class="summary-section">
              <h5>?? Mensaje</h5>
              <div v-if="massMessage.subject" class="summary-item">
                <span class="label">Asunto:</span>
                <span class="value">{{ massMessage.subject }}</span>
              </div>
              <div class="message-preview-final">
                {{ truncateText(massMessage.messageBody, 200) }}
              </div>
            </div>
          </div>

          <div class="warning-box">
            <h5>?? Importante</h5>
            <ul>
              <li>Este envío se realizará a <strong>{{ finalRecipientCount }} destinatarios</strong></li>
              <li v-if="!massMessage.scheduleMessage">El envío comenzará <strong>inmediatamente</strong> después de confirmar</li>
              <li v-else>El envío está programado para <strong>{{ massMessage.scheduleDate }} a las {{ massMessage.scheduleTime }}</strong></li>
              <li>Una vez iniciado, el proceso no se puede cancelar</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button 
          v-if="currentStep > 1" 
          @click="previousStep" 
          class="back-button"
        >
          ? Anterior
        </button>
        
        <button @click="closeModal" class="cancel-button">
          Cancelar
        </button>
        
        <button 
          v-if="currentStep < 4"
          @click="nextStep" 
          :disabled="!canProceedToNextStep"
          class="next-button"
        >
          Siguiente ?
        </button>
        
        <button 
          v-if="currentStep === 4"
          @click="confirmSend"
          :disabled="!canSend || sending"
          class="send-button"
        >
          {{ sending ? 'Enviando...' : (massMessage.scheduleMessage ? 'Programar Envío' : 'Enviar Ahora') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import CommunicationService from '../services/communication.service';
import ClientService from '../services/client.service';

export default {
  name: 'MassMessageModal',
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
  emits: ['close', 'send'],
  data() {
    return {
      currentStep: 1,
      sending: false,
      massMessage: {
        channelId: '',
        campaignName: '',
        subject: '',
        messageBody: '',
        scheduleMessage: false,
        scheduleDate: '',
        scheduleTime: ''
      },
      selectedTemplateId: '',
      recipientType: '',
      selectedClients: [],
      availableClients: [],
      allActiveClients: [],
      overdueClients: [],
      zones: [],
      servicePlans: [],
      filteredSectors: [],
      clientSearch: '',
      filters: {
        zoneId: '',
        sectorId: '',
        planIds: []
      },
      availableVariables: [
        { name: '{nombre}', description: 'Nombre del cliente' },
        { name: '{apellido}', description: 'Apellido del cliente' },
        { name: '{email}', description: 'Email del cliente' },
        { name: '{telefono}', description: 'Teléfono del cliente' },
        { name: '{plan}', description: 'Plan contratado' },
        { name: '{fecha}', description: 'Fecha actual' },
        { name: '{empresa}', description: 'Nombre de la empresa' },
        { name: '{monto_vencido}', description: 'Monto de deuda vencida' },
        { name: '{dias_vencido}', description: 'Días de atraso en pago' }
      ]
    };
  },
  computed: {
    today() {
      return new Date().toISOString().split('T')[0];
    },
    
    selectedChannel() {
      return this.channels.find(c => c.id == this.massMessage.channelId);
    },
    
    availableTemplates() {
      if (!this.selectedChannel) return [];
      return this.templates.filter(t => t.channelId == this.massMessage.channelId && t.active);
    },

    finalRecipientCount() {
      switch (this.recipientType) {
        case 'all':
          return this.allActiveClients.length;
        case 'overdue':
          return this.overdueClients.length;
        case 'custom':
          return this.selectedClients.length;
        case 'zone':
        case 'plan':
          return this.getFilteredClientsCount();
        default:
          return 0;
      }
    },

    canProceedToNextStep() {
      switch (this.currentStep) {
        case 1:
          return this.massMessage.channelId && this.massMessage.campaignName.trim() &&
                 (!this.massMessage.scheduleMessage || (this.massMessage.scheduleDate && this.massMessage.scheduleTime));
        case 2:
          return this.recipientType && this.finalRecipientCount > 0;
        case 3:
          return this.massMessage.messageBody.trim() &&
                 (!this.selectedChannel?.channelType === 'email' || this.massMessage.subject.trim());
        default:
          return false;
      }
    },

    canSend() {
      return this.canProceedToNextStep && this.finalRecipientCount > 0;
    }
  },
  async created() {
    await this.loadInitialData();
  },
  methods: {
    async loadInitialData() {
      try {
        // Cargar clientes activos
        const clientsResponse = await ClientService.getAllClients({ active: true, size: 1000 });
        this.allActiveClients = clientsResponse.data.clients || [];

        // Cargar clientes con pagos vencidos (simulado - implementar según tu lógica)
        this.overdueClients = this.allActiveClients.filter(client => client.hasOverduePayments);

        // Cargar zonas, sectores y planes (implementar según tu API)
        // this.loadZones();
        // this.loadServicePlans();
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
      }
    },

    closeModal() {
      this.$emit('close');
    },

    nextStep() {
      if (this.canProceedToNextStep && this.currentStep < 4) {
        this.currentStep++;
      }
    },

    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep--;
      }
    },

    onChannelChange() {
      this.massMessage.subject = '';
      this.selectedTemplateId = '';
    },

    onRecipientTypeChange() {
      this.selectedClients = [];
      this.filters = {
        zoneId: '',
        sectorId: '',
        planIds: []
      };
    },

    async onTemplateSelect() {
      if (!this.selectedTemplateId) {
        this.massMessage.subject = '';
        this.massMessage.messageBody = '';
        return;
      }

      try {
        const template = this.templates.find(t => t.id == this.selectedTemplateId);
        if (template) {
          this.massMessage.subject = template.subject || '';
          this.massMessage.messageBody = template.messageBody || '';
        }
      } catch (error) {
        console.error('Error cargando plantilla:', error);
      }
    },

    async searchClients() {
      if (this.clientSearch.length < 2) {
        this.availableClients = [];
        return;
      }

      try {
        const response = await ClientService.getAllClients({
          name: this.clientSearch,
          active: true,
          size: 20
        });
        
        this.availableClients = (response.data.clients || [])
          .filter(client => !this.selectedClients.find(sc => sc.id === client.id));
      } catch (error) {
        console.error('Error buscando clientes:', error);
      }
    },

    addSelectedClient(client) {
      if (!this.selectedClients.find(sc => sc.id === client.id)) {
        this.selectedClients.push(client);
        this.availableClients = this.availableClients.filter(ac => ac.id !== client.id);
      }
    },

    removeSelectedClient(clientId) {
      this.selectedClients = this.selectedClients.filter(sc => sc.id !== clientId);
    },

    getFilteredClientsCount() {
      // Implementar lógica de filtrado según zona/plan
      // Por ahora retorna un número simulado
      return Math.floor(Math.random() * 50) + 10;
    },

    insertVariable(variable) {
      const textarea = document.getElementById('message');
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        this.massMessage.messageBody = 
          this.massMessage.messageBody.substring(0, start) + 
          variable.name + 
          this.massMessage.messageBody.substring(end);
        
        this.$nextTick(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.name.length, start + variable.name.length);
        });
      }
    },

    getPreviewMessage() {
      if (!this.massMessage.messageBody) return 'Escribe tu mensaje aquí...';
      
      // Reemplazar variables con valores de ejemplo
      let preview = this.massMessage.messageBody;
      preview = preview.replace(/{nombre}/g, 'Juan');
      preview = preview.replace(/{apellido}/g, 'Pérez');
      preview = preview.replace(/{email}/g, 'juan@email.com');
      preview = preview.replace(/{telefono}/g, '555-1234');
      preview = preview.replace(/{plan}/g, 'Plan Básico 20 Mbps');
      preview = preview.replace(/{fecha}/g, new Date().toLocaleDateString('es-MX'));
      preview = preview.replace(/{empresa}/g, 'Mi ISP');
      preview = preview.replace(/{monto_vencido}/g, '$500');
      preview = preview.replace(/{dias_vencido}/g, '5');
      
      return preview;
    },

    async confirmSend() {
      if (!this.canSend || this.sending) return;

      this.sending = true;
      
      try {
        const massMessageData = {
          ...this.massMessage,
          recipientType: this.recipientType,
          filters: this.filters,
          selectedClientIds: this.selectedClients.map(c => c.id),
          estimatedRecipients: this.finalRecipientCount
        };

        // Agregar programación si está habilitada
        if (this.massMessage.scheduleMessage) {
          massMessageData.scheduledFor = `${this.massMessage.scheduleDate}T${this.massMessage.scheduleTime}:00`;
        }

        await CommunicationService.sendMassMessage(massMessageData);
        
        this.$toast?.success(
          this.massMessage.scheduleMessage 
            ? 'Envío masivo programado exitosamente' 
            : 'Envío masivo iniciado exitosamente'
        );

        this.$emit('send', massMessageData);
        this.closeModal();
      } catch (error) {
        console.error('Error en envío masivo:', error);
        this.$toast?.error('Error en envío masivo: ' + (error.response?.data?.message || error.message));
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

    getMessagePlaceholder() {
      if (!this.selectedChannel) return 'Escriba su mensaje aquí...';
      
      const placeholders = {
        'email': 'Escriba el contenido del correo masivo...',
        'whatsapp': 'Escriba el mensaje de WhatsApp...',
        'telegram': 'Escriba el mensaje de Telegram...',
        'sms': 'Escriba el mensaje SMS...'
      };
      
      return placeholders[this.selectedChannel.channelType] || 'Escriba su mensaje aquí...';
    },

    getCharacterLimit() {
      if (!this.selectedChannel) return null;
      
      const limits = {
        'sms': 160,
        'whatsapp': 4096,
        'telegram': 4096
      };
      
      return limits[this.selectedChannel.channelType];
    },

    getClientContact(client) {
      return client.email || client.phone || client.whatsapp || 'Sin contacto';
    },

    getRecipientTypeLabel() {
      const labels = {
        'all': 'Todos los clientes activos',
        'zone': 'Por zona/sector',
        'plan': 'Por plan de servicio',
        'overdue': 'Clientes con pagos vencidos',
        'custom': 'Selección personalizada'
      };
      return labels[this.recipientType] || 'No seleccionado';
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
  width: 95%;
  max-width: 900px;
  max-height: 95vh;
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

.step-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
  position: relative;
}

</style>