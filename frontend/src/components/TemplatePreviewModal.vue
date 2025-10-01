<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Vista Previa de Plantilla</h3>
        <button @click="closeModal" class="close-button">&times;</button>
      </div>

      <div class="modal-body">
        <div class="template-info">
          <h4>{{ template.name }}</h4>
          <div class="template-meta">
            <span class="channel-badge">
              {{ getChannelIcon(template.channelType) }} {{ template.channelName }}
            </span>
            <span class="template-type">
              {{ getTypeLabel(template.templateType) }}
            </span>
          </div>
        </div>

        <div v-if="template.subject" class="subject-section">
          <label>Asunto:</label>
          <div class="subject-content">{{ template.subject }}</div>
        </div>

        <div class="message-section">
          <label>Mensaje:</label>
          <div class="message-content" v-html="formattedMessage"></div>
        </div>

        <div v-if="template.variables && template.variables.length > 0" class="variables-section">
          <label>Variables disponibles:</label>
          <div class="variables-list">
            <span 
              v-for="variable in template.variables" 
              :key="variable"
              class="variable-tag"
            >
              {{ variable }}
            </span>
          </div>
        </div>

        <div class="usage-stats">
          <div class="stat">
            <span class="stat-label">Veces utilizada:</span>
            <span class="stat-value">{{ template.usageCount || 0 }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Última vez utilizada:</span>
            <span class="stat-value">
              {{ template.lastUsed ? formatDate(template.lastUsed) : 'Nunca' }}
            </span>
          </div>
          <div class="stat">
            <span class="stat-label">Estado:</span>
            <span class="stat-value" :class="{ active: template.active, inactive: !template.active }">
              {{ template.active ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeModal" class="cancel-button">
          Cerrar
        </button>
        <button @click="editTemplate" class="edit-button">
          Editar
        </button>
        <button @click="useTemplate" class="use-button">
          Usar Plantilla
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TemplatePreviewModal',
  props: {
    template: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'edit', 'use'],
  computed: {
    formattedMessage() {
      if (!this.template.messageBody) return '';
      
      // Convertir saltos de línea a <br>
      return this.template.messageBody
        .replace(/\n/g, '<br>')
        // Resaltar variables
        .replace(/\{[^}]+\}/g, '<span class="variable-highlight">$&</span>');
    }
  },
  methods: {
    closeModal() {
      this.$emit('close');
    },

    editTemplate() {
      this.$emit('edit', this.template);
    },

    useTemplate() {
      this.$emit('use', this.template);
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

    getTypeLabel(templateType) {
      const labels = {
        'welcome': 'Bienvenida',
        'payment_reminder': 'Recordatorio de pago',
        'service_notification': 'Notificación de servicio',
        'maintenance': 'Mantenimiento',
        'suspension': 'Suspensión',
        'reactivation': 'Reactivación',
        'custom': 'Personalizada'
      };
      return labels[templateType] || 'Sin tipo';
    },

    formatDate(dateString) {
      if (!dateString) return 'Nunca';
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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

.template-info {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e9ecef;
}

.template-info h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
}

.template-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.channel-badge {
  background: #e9ecef;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #495057;
}

.template-type {
  background: #fff3cd;
  color: #664d03;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.subject-section,
.message-section {
  margin-bottom: 20px;
}

.subject-section label,
.message-section label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.subject-content {
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  font-weight: 500;
  color: #333;
}

.message-content {
  padding: 15px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  min-height: 100px;
}

.message-content :deep(.variable-highlight) {
  background: #fff3cd;
  color: #856404;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-weight: 600;
}

.variables-section {
  margin-bottom: 20px;
}

.variables-section label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.variables-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.variable-tag {
  background: #e9ecef;
  color: #495057;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-family: monospace;
  font-weight: 500;
}

.usage-stats {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  border: 1px solid #e9ecef;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat:last-child {
  margin-bottom: 0;
}

.stat-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.stat-value {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.stat-value.active {
  color: #28a745;
}

.stat-value.inactive {
  color: #dc3545;
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
.edit-button,
.use-button {
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

.edit-button {
  background: #ffc107;
  color: #212529;
}

.edit-button:hover {
  background: #e0a800;
}

.use-button {
  background: #28a745;
  color: white;
}

.use-button:hover {
  background: #218838;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .template-meta {
    flex-direction: column;
    gap: 5px;
  }
  
  .modal-footer {
    flex-wrap: wrap;
  }
  
  .cancel-button,
  .edit-button,
  .use-button {
    flex: 1;
    min-width: 100px;
  }
}
</style>