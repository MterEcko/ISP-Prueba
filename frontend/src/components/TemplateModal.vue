<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ isEdit ? 'Editar Plantilla' : 'Nueva Plantilla' }}</h3>
        <button @click="closeModal" class="close-button">&times;</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="saveTemplate">
          <!-- Información básica -->
          <div class="form-section">
            <h4>Información Básica</h4>
            
            <div class="form-row">
              <div class="form-group">
                <label for="templateName">Nombre de la plantilla *</label>
                <input 
                  type="text"
                  id="templateName"
                  v-model="templateData.name"
                  placeholder="Ej: Recordatorio de pago mensual"
                  required
                  maxlength="100"
                />
              </div>
              
              <div class="form-group">
                <label for="templateType">Tipo de plantilla *</label>
                <select 
                  id="templateType"
                  v-model="templateData.templateType"
                  required
                  @change="onTypeChange"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="welcome">Bienvenida</option>
                  <option value="payment_reminder">Recordatorio de pago</option>
                  <option value="service_notification">Notificación de servicio</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="suspension">Suspensión</option>
                  <option value="reactivation">Reactivación</option>
                  <option value="custom">Personalizada</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="channel">Canal de comunicación *</label>
                <select 
                  id="channel"
                  v-model="templateData.channelId"
                  required
                  @change="onChannelChange"
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
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="templateData.active"
                  />
                  Plantilla activa
                </label>
                <small class="help-text">
                  Solo las plantillas activas aparecen en los selectores
                </small>
              </div>
            </div>
          </div>

          <!-- Contenido del mensaje -->
          <div class="form-section">
            <h4>Contenido del Mensaje</h4>
            
            <!-- Asunto (solo para email) -->
            <div v-if="selectedChannel?.channelType === 'email'" class="form-group">
              <label for="subject">Asunto del correo *</label>
              <input 
                type="text"
                id="subject"
                v-model="templateData.subject"
                placeholder="Asunto del correo electrónico"
                required
                maxlength="200"
              />
              <small class="help-text">
                Puedes usar variables como {nombre}, {empresa}, etc.
              </small>
            </div>

            <!-- Mensaje principal -->
            <div class="form-group">
              <label for="messageBody">Mensaje *</label>
              <textarea 
                id="messageBody"
                v-model="templateData.messageBody"
                :placeholder="getMessagePlaceholder()"
                rows="8"
                required
                :maxlength="getMaxLength()"
              ></textarea>
              
              <div class="message-info">
                <span class="char-count">
                  {{ templateData.messageBody.length }} caracteres
                </span>
                <span v-if="getMaxLength()" class="char-limit">
                  / {{ getMaxLength() }} máximo
                </span>
              </div>
              
              <small class="help-text">
                Usa variables para personalizar el mensaje. Ejemplo: Hola {nombre}, tu pago de {monto} está pendiente.
              </small>
            </div>
          </div>

          <!-- Variables disponibles -->
          <div class="form-section">
            <h4>Variables Disponibles</h4>
            <p class="section-description">
              Haz clic en una variable para insertarla en el mensaje
            </p>
            
            <div class="variables-container">
              <div class="variable-category">
                <h5>Cliente</h5>
                <div class="variables-list">
                  <button 
                    v-for="variable in clientVariables" 
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
              
              <div class="variable-category">
                <h5>Servicio</h5>
                <div class="variables-list">
                  <button 
                    v-for="variable in serviceVariables" 
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
              
              <div class="variable-category">
                <h5>Sistema</h5>
                <div class="variables-list">
                  <button 
                    v-for="variable in systemVariables" 
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
            </div>
          </div>

          <!-- Vista previa -->
          <div v-if="templateData.messageBody" class="form-section">
            <h4>Vista Previa</h4>
            <div class="preview-container">
              <div class="preview-header">
                <span class="channel-preview">
                  {{ getChannelIcon(selectedChannel?.channelType) }} 
                  {{ selectedChannel?.name || 'Canal no seleccionado' }}
                </span>
                <span class="type-preview">
                  {{ getTypeLabel(templateData.templateType) }}
                </span>
              </div>
              
              <div v-if="templateData.subject" class="preview-subject">
                <strong>Asunto:</strong> {{ processPreview(templateData.subject) }}
              </div>
              
              <div class="preview-message">
                {{ processPreview(templateData.messageBody) }}
              </div>
            </div>
          </div>

          <!-- Configuración avanzada -->
          <div class="form-section advanced-section" v-if="showAdvanced">
            <h4>Configuración Avanzada</h4>
            
            <div class="form-group">
              <label for="description">Descripción interna</label>
              <textarea 
                id="description"
                v-model="templateData.description"
                placeholder="Descripción para uso interno del equipo"
                rows="3"
                maxlength="500"
              ></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="category">Categoría</label>
                <input 
                  type="text"
                  id="category"
                  v-model="templateData.category"
                  placeholder="Ej: Pagos, Soporte, Marketing"
                  maxlength="50"
                />
              </div>
              
              <div class="form-group">
                <label for="tags">Etiquetas</label>
                <input 
                  type="text"
                  id="tags"
                  v-model="templateData.tags"
                  placeholder="Separadas por comas: urgente, automatico"
                  maxlength="200"
                />
              </div>
            </div>
          </div>

          <div class="advanced-toggle">
            <button 
              type="button" 
              @click="showAdvanced = !showAdvanced"
              class="toggle-button"
            >
              {{ showAdvanced ? '? Ocultar opciones avanzadas' : '? Mostrar opciones avanzadas' }}
            </button>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" @click="closeModal" class="cancel-button">
          Cancelar
        </button>
        <button 
          type="submit" 
          @click="saveTemplate"
          :disabled="!canSave || saving"
          class="save-button"
        >
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }} Plantilla
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TemplateModal',
  props: {
    channels: {
      type: Array,
      default: () => []
    },
    template: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'save'],
  data() {
    return {
      showAdvanced: false,
      saving: false,
      templateData: {
        name: '',
        templateType: '',
        channelId: '',
        subject: '',
        messageBody: '',
        active: true,
        description: '',
        category: '',
        tags: ''
      },
      clientVariables: [
        { name: '{nombre}', description: 'Nombre del cliente' },
        { name: '{apellido}', description: 'Apellido del cliente' },
        { name: '{nombre_completo}', description: 'Nombre y apellido' },
        { name: '{email}', description: 'Correo electrónico' },
        { name: '{telefono}', description: 'Número de teléfono' },
        { name: '{whatsapp}', description: 'Número de WhatsApp' },
        { name: '{direccion}', description: 'Dirección del cliente' }
      ],
      serviceVariables: [
        { name: '{plan}', description: 'Plan contratado' },
        { name: '{velocidad}', description: 'Velocidad del plan' },
        { name: '{precio}', description: 'Precio mensual' },
        { name: '{fecha_vencimiento}', description: 'Fecha de vencimiento' },
        { name: '{dias_vencido}', description: 'Días de atraso' },
        { name: '{monto_pendiente}', description: 'Monto adeudado' },
        { name: '{ultimo_pago}', description: 'Fecha del último pago' }
      ],
      systemVariables: [
        { name: '{empresa}', description: 'Nombre de la empresa' },
        { name: '{fecha}', description: 'Fecha actual' },
        { name: '{hora}', description: 'Hora actual' },
        { name: '{soporte_telefono}', description: 'Teléfono de soporte' },
        { name: '{soporte_email}', description: 'Email de soporte' },
        { name: '{website}', description: 'Sitio web de la empresa' }
      ]
    };
  },
  computed: {
    isEdit() {
      return !!this.template;
    },
    
    selectedChannel() {
      return this.channels.find(c => c.id == this.templateData.channelId);
    },
    
    canSave() {
      return this.templateData.name.trim() &&
             this.templateData.templateType &&
             this.templateData.channelId &&
             this.templateData.messageBody.trim() &&
             (!this.selectedChannel?.channelType === 'email' || this.templateData.subject.trim());
    }
  },
  created() {
    if (this.template) {
      this.loadTemplate();
    }
  },
  methods: {
    loadTemplate() {
      this.templateData = {
        name: this.template.name || '',
        templateType: this.template.templateType || '',
        channelId: this.template.channelId || '',
        subject: this.template.subject || '',
        messageBody: this.template.messageBody || '',
        active: this.template.active !== undefined ? this.template.active : true,
        description: this.template.description || '',
        category: this.template.category || '',
        tags: this.template.tags || ''
      };
    },

    closeModal() {
      this.$emit('close');
    },

    async saveTemplate() {
      if (!this.canSave || this.saving) return;

      this.saving = true;
      
      try {
        // Preparar datos para enviar
        const templateToSave = {
          ...this.templateData,
          variables: this.extractVariables(this.templateData.messageBody + ' ' + (this.templateData.subject || ''))
        };

        this.$emit('save', templateToSave);
      } catch (error) {
        console.error('Error guardando plantilla:', error);
      } finally {
        this.saving = false;
      }
    },

    onChannelChange() {
      // Limpiar asunto si no es email
      if (this.selectedChannel?.channelType !== 'email') {
        this.templateData.subject = '';
      }
    },

    onTypeChange() {
      // Cargar plantilla predefinida según el tipo
      this.loadTemplateByType(this.templateData.templateType);
    },

    loadTemplateByType(type) {
      const templates = {
        'welcome': {
          subject: 'Bienvenido a {empresa}',
          message: 'Hola {nombre_completo},\n\n¡Bienvenido a {empresa}! Tu servicio de internet de {velocidad} ya está activo.\n\nSi tienes alguna consulta, contáctanos al {soporte_telefono}.\n\n¡Gracias por confiar en nosotros!'
        },
        'payment_reminder': {
          subject: 'Recordatorio de pago - {empresa}',
          message: 'Estimado/a {nombre},\n\nTe recordamos que tu pago de {monto_pendiente} está pendiente desde hace {dias_vencido} días.\n\nPor favor realiza tu pago para evitar la suspensión del servicio.\n\nGracias por tu atención.'
        },
        'service_notification': {
          subject: 'Notificación de servicio - {empresa}',
          message: 'Hola {nombre},\n\nTe informamos sobre una actualización importante en tu servicio.\n\nCualquier consulta, estamos aquí para ayudarte al {soporte_telefono}.\n\nSaludos cordiales.'
        },
        'maintenance': {
          subject: 'Mantenimiento programado - {empresa}',
          message: 'Estimado/a {nombre},\n\nTe informamos que realizaremos mantenimiento en tu zona el {fecha}.\n\nEl servicio podría verse interrumpido temporalmente.\n\nDisculpa las molestias.'
        },
        'suspension': {
          subject: 'Suspensión de servicio - {empresa}',
          message: 'Estimado/a {nombre},\n\nTu servicio ha sido suspendido por falta de pago.\n\nMonto pendiente: {monto_pendiente}\nDías de atraso: {dias_vencido}\n\nContacta a soporte para reactivar: {soporte_telefono}'
        },
        'reactivation': {
          subject: 'Servicio reactivado - {empresa}',
          message: '¡Hola {nombre}!\n\nTu servicio de internet ha sido reactivado exitosamente.\n\nGracias por ponerte al día con tus pagos.\n\n¡Disfruta tu conexión!'
        }
      };

      if (templates[type] && !this.isEdit) {
        if (this.selectedChannel?.channelType === 'email') {
          this.templateData.subject = templates[type].subject;
        }
        this.templateData.messageBody = templates[type].message;
      }
    },

    insertVariable(variable) {
      const textarea = document.getElementById('messageBody');
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      this.templateData.messageBody = 
        this.templateData.messageBody.substring(0, start) + 
        variable.name + 
        this.templateData.messageBody.substring(end);
      
      // Reposicionar cursor
      this.$nextTick(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.name.length, start + variable.name.length);
      });
    },

    extractVariables(text) {
      const regex = /\{[^}]+\}/g;
      const matches = text.match(regex);
      return matches ? [...new Set(matches)] : [];
    },

    processPreview(text) {
      if (!text) return '';
      
      // Reemplazar variables con valores de ejemplo para la vista previa
      const examples = {
        '{nombre}': 'Juan',
        '{apellido}': 'Pérez',
        '{nombre_completo}': 'Juan Pérez',
        '{email}': 'juan@email.com',
        '{telefono}': '555-1234',
        '{plan}': '20 Mbps',
        '{velocidad}': '20 Mbps',
        '{precio}': '$500',
        '{empresa}': 'Mi ISP',
        '{fecha}': new Date().toLocaleDateString('es-MX'),
        '{monto_pendiente}': '$500',
        '{dias_vencido}': '5',
        '{soporte_telefono}': '555-SOPORTE'
      };
      
      let preview = text;
      Object.keys(examples).forEach(variable => {
        preview = preview.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), examples[variable]);
      });
      
      return preview;
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

    getMessagePlaceholder() {
      if (!this.selectedChannel) return 'Escriba el contenido del mensaje aquí...';
      
      const placeholders = {
        'email': 'Escriba el contenido del correo electrónico...',
        'whatsapp': 'Escriba el mensaje de WhatsApp...',
        'telegram': 'Escriba el mensaje de Telegram...',
        'sms': 'Escriba el mensaje SMS...'
      };
      
      return placeholders[this.selectedChannel.channelType] || 'Escriba el contenido del mensaje aquí...';
    },

    getMaxLength() {
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
  overflow-y: auto;
  padding: 20px 0;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  margin: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  position: sticky;
  top: 0;
  z-index: 10;
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

.form-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.form-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-description {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.help-text {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #666;
  font-style: italic;
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

.variables-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.variable-category h5 {
  margin: 0 0 10px 0;
  color: #555;
  font-size: 14px;
  font-weight: 600;
}

.variables-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.variable-button {
  background: #e9ecef;
  border: 1px solid #ddd;
  padding: 6px 10px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 12px;
  color: #495057;
  font-family: monospace;
  transition: all 0.2s;
}

.variable-button:hover {
  background: #dee2e6;
  border-color: #bbb;
  transform: translateY(-1px);
}

.preview-container {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 15px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.channel-preview {
  font-size: 12px;
  color: #666;
}

.type-preview {
  background: #fff3cd;
  color: #664d03;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.preview-subject {
  margin-bottom: 10px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
}

.preview-message {
  white-space: pre-wrap;
  line-height: 1.5;
  color: #333;
  font-size: 14px;
}

.advanced-section {
  border: 2px dashed #ddd;
  background: #f9f9f9;
}

.advanced-toggle {
  text-align: center;
  margin-bottom: 20px;
}

.toggle-button {
  background: none;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  font-size: 14px;
}

.toggle-button:hover {
  background: #f8f9fa;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  position: sticky;
  bottom: 0;
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
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .variables-container {
    grid-template-columns: 1fr;
  }
  
  .preview-header {
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
  }
}
</style>