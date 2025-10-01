<template>
  <div class="notes-section">
    <!-- Notas generales -->
    <div class="notes-group">
      <label for="generalNotes">📝 Notas Generales</label>
      <textarea 
        id="generalNotes"
        :value="notes"
        @input="updateNotes($event.target.value)"
        rows="4"
        class="notes-textarea"
        placeholder="Comentarios adicionales, condiciones especiales, observaciones..."
      ></textarea>
      <div class="textarea-info">
        <span class="char-count">{{ notesCharCount }}/500</span>
      </div>
    </div>

    <!-- Razón del cambio (para operaciones de cambio) -->
    <div class="notes-group" v-if="showChangeReason">
      <label for="changeReason">🔄 Razón del Cambio *</label>
      <textarea 
        id="changeReason"
        :value="changeReason"
        @input="updateChangeReason($event.target.value)"
        rows="3"
        class="notes-textarea required"
        :placeholder="getChangeReasonPlaceholder()"
        required
      ></textarea>
      <div class="textarea-info">
        <span class="char-count">{{ changeReasonCharCount }}/300</span>
        <span class="required-indicator">* Campo requerido</span>
      </div>
    </div>

    <!-- Notas técnicas (para técnicos) -->
    <div class="notes-group" v-if="showTechnicalNotes">
      <label for="technicalNotes">🔧 Notas Técnicas</label>
      <textarea 
        id="technicalNotes"
        :value="technicalNotes"
        @input="updateTechnicalNotes($event.target.value)"
        rows="3"
        class="notes-textarea technical"
        placeholder="Configuraciones especiales, IPs estáticas, puertos, etc..."
      ></textarea>
      <div class="textarea-info">
        <span class="char-count">{{ technicalNotesCharCount }}/400</span>
        <span class="help-text">Solo visible para técnicos y administradores</span>
      </div>
    </div>

    <!-- Recordatorios -->
    <div class="notes-group" v-if="showReminders">
      <label for="reminders">⏰ Recordatorios</label>
      <div class="reminders-container">
        <div class="reminder-item" v-for="(reminder, index) in reminders" :key="index">
          <input 
            type="text" 
            :value="reminder.text"
            @input="updateReminder(index, 'text', $event.target.value)"
            placeholder="Recordatorio..."
            class="reminder-input"
          />
          <input 
            type="date" 
            :value="reminder.date"
            @input="updateReminder(index, 'date', $event.target.value)"
            class="reminder-date"
          />
          <button 
            type="button" 
            @click="removeReminder(index)"
            class="remove-reminder"
            title="Eliminar recordatorio"
          >
            ✕
          </button>
        </div>
        <button 
          type="button" 
          @click="addReminder"
          class="add-reminder"
        >
          + Agregar Recordatorio
        </button>
      </div>
    </div>

    <!-- Templates rápidos -->
    <div class="quick-templates" v-if="showTemplates">
      <h4>📋 Plantillas Rápidas</h4>
      <div class="template-buttons">
        <button 
          type="button"
          v-for="template in availableTemplates" 
          :key="template.id"
          @click="applyTemplate(template)"
          class="template-btn"
          :title="template.description"
        >
          {{ template.name }}
        </button>
      </div>
    </div>

    <!-- Historial de notas (para edición) -->
    <div class="notes-history" v-if="showHistory && notesHistory.length > 0">
      <h4>📚 Historial de Notas</h4>
      <div class="history-container">
        <div 
          class="history-item" 
          v-for="(item, index) in notesHistory" 
          :key="index"
        >
          <div class="history-header">
            <span class="history-date">{{ formatDate(item.date) }}</span>
            <span class="history-user">{{ item.user }}</span>
            <span class="history-type" :class="item.type">{{ getHistoryTypeLabel(item.type) }}</span>
          </div>
          <div class="history-content">{{ item.content }}</div>
        </div>
      </div>
    </div>

    <!-- Validaciones y warnings -->
    <div class="notes-validations" v-if="validationMessages.length > 0">
      <div 
        class="validation-message" 
        v-for="(message, index) in validationMessages" 
        :key="index"
        :class="message.type"
      >
        <span class="validation-icon">{{ getValidationIcon(message.type) }}</span>
        <span class="validation-text">{{ message.text }}</span>
      </div>
    </div>

    <!-- Preview de tags detectados -->
    <div class="detected-tags" v-if="detectedTags.length > 0">
      <h5>🏷️ Tags Detectados</h5>
      <div class="tags-container">
        <span 
          class="tag" 
          v-for="tag in detectedTags" 
          :key="tag"
          :class="getTagClass(tag)"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotesSection',
  props: {
    notes: {
      type: String,
      default: ''
    },
    changeReason: {
      type: String,
      default: ''
    },
    technicalNotes: {
      type: String,
      default: ''
    },
    reminders: {
      type: Array,
      default: () => []
    },
    operationType: {
      type: String,
      default: 'CREATE_NEW'
    },
    userRole: {
      type: String,
      default: 'admin'
    },
    showTemplates: {
      type: Boolean,
      default: true
    },
    showHistory: {
      type: Boolean,
      default: false
    },
    notesHistory: {
      type: Array,
      default: () => []
    },
    maxNotesLength: {
      type: Number,
      default: 500
    },
    maxChangeReasonLength: {
      type: Number,
      default: 300
    },
    maxTechnicalNotesLength: {
      type: Number,
      default: 400
    }
  },
  emits: [
    'update:notes',
    'update:changeReason', 
    'update:technicalNotes',
    'update:reminders'
  ],
  computed: {
    showChangeReason() {
      return ['CHANGE_PLAN', 'CHANGE_NODE', 'CHANGE_ZONE', 'CHANGE_ADDRESS'].includes(this.operationType)
    },
    
    showTechnicalNotes() {
      return ['admin', 'tecnico'].includes(this.userRole)
    },
    
    showReminders() {
      return this.operationType !== 'CREATE_NEW'
    },
    
    notesCharCount() {
      return this.notes.length
    },
    
    changeReasonCharCount() {
      return this.changeReason.length
    },
    
    technicalNotesCharCount() {
      return this.technicalNotes.length
    },
    
    validationMessages() {
      const messages = []
      
      // Validar longitud de notas
      if (this.notesCharCount > this.maxNotesLength) {
        messages.push({
          type: 'error',
          text: `Las notas generales exceden el límite de ${this.maxNotesLength} caracteres`
        })
      }
      
      // Validar razón del cambio requerida
      if (this.showChangeReason && !this.changeReason.trim()) {
        messages.push({
          type: 'warning',
          text: 'La razón del cambio es requerida para este tipo de operación'
        })
      }
      
      if (this.changeReasonCharCount > this.maxChangeReasonLength) {
        messages.push({
          type: 'error',
          text: `La razón del cambio excede el límite de ${this.maxChangeReasonLength} caracteres`
        })
      }
      
      if (this.technicalNotesCharCount > this.maxTechnicalNotesLength) {
        messages.push({
          type: 'error',
          text: `Las notas técnicas exceden el límite de ${this.maxTechnicalNotesLength} caracteres`
        })
      }
      
      return messages
    },
    
    detectedTags() {
      const allText = `${this.notes} ${this.changeReason} ${this.technicalNotes}`.toLowerCase()
      const tags = []
      
      // Detectar tags importantes
      if (allText.includes('urgente') || allText.includes('critico')) tags.push('urgente')
      if (allText.includes('ip estatica') || allText.includes('ip fija')) tags.push('ip-estatica')
      if (allText.includes('puerto') || allText.includes('port')) tags.push('configuracion-puerto')
      if (allText.includes('velocidad') || allText.includes('mbps')) tags.push('velocidad')
      if (allText.includes('problema') || allText.includes('falla')) tags.push('problema')
      if (allText.includes('instalacion') || allText.includes('instalar')) tags.push('instalacion')
      if (allText.includes('mantenimiento')) tags.push('mantenimiento')
      if (allText.includes('facturacion') || allText.includes('pago')) tags.push('facturacion')
      
      return [...new Set(tags)]
    },
    
    availableTemplates() {
      const baseTemplates = [
        {
          id: 'cliente_solicita',
          name: 'Cliente Solicita',
          description: 'El cliente solicita este cambio',
          content: 'Cambio solicitado por el cliente.',
          type: 'change_reason'
        },
        {
          id: 'mudanza',
          name: 'Mudanza',
          description: 'Cambio por mudanza',
          content: 'Cliente se mudó a nueva dirección.',
          type: 'change_reason'
        },
        {
          id: 'problema_tecnico',
          name: 'Problema Técnico',
          description: 'Cambio por problema técnico',
          content: 'Cambio necesario por problemas técnicos en la ubicación actual.',
          type: 'change_reason'
        },
        {
          id: 'mejora_servicio',
          name: 'Mejora de Servicio',
          description: 'Cambio para mejorar el servicio',
          content: 'Cambio realizado para mejorar la calidad del servicio.',
          type: 'change_reason'
        }
      ]
      
      const technicalTemplates = [
        {
          id: 'ip_estatica',
          name: 'IP Estática',
          description: 'Cliente requiere IP estática',
          content: 'Cliente requiere IP estática para servicios especiales (servidor, cámaras, etc.).',
          type: 'technical'
        },
        {
          id: 'puerto_especial',
          name: 'Puerto Especial',
          description: 'Configuración de puertos específicos',
          content: 'Requiere apertura de puertos específicos: ',
          type: 'technical'
        },
        {
          id: 'equipo_especial',
          name: 'Equipo Especial',
          description: 'Requiere equipo específico',
          content: 'Cliente requiere equipo específico por compatibilidad/distancia.',
          type: 'technical'
        }
      ]
      
      // Filtrar templates según el tipo de operación y rol
      let templates = [...baseTemplates]
      
      if (this.showTechnicalNotes) {
        templates = [...templates, ...technicalTemplates]
      }
      
      return templates.filter(template => {
        if (this.showChangeReason && template.type === 'change_reason') return true
        if (this.showTechnicalNotes && template.type === 'technical') return true
        if (template.type === 'general') return true
        return false
      })
    }
  },
  methods: {
    updateNotes(value) {
      if (value.length <= this.maxNotesLength) {
        this.$emit('update:notes', value)
      }
    },
    
    updateChangeReason(value) {
      if (value.length <= this.maxChangeReasonLength) {
        this.$emit('update:changeReason', value)
      }
    },
    
    updateTechnicalNotes(value) {
      if (value.length <= this.maxTechnicalNotesLength) {
        this.$emit('update:technicalNotes', value)
      }
    },
    
    updateReminder(index, field, value) {
      const updatedReminders = [...this.reminders]
      updatedReminders[index] = {
        ...updatedReminders[index],
        [field]: value
      }
      this.$emit('update:reminders', updatedReminders)
    },
    
    addReminder() {
      const newReminder = {
        text: '',
        date: '',
        id: Date.now()
      }
      this.$emit('update:reminders', [...this.reminders, newReminder])
    },
    
    removeReminder(index) {
      const updatedReminders = this.reminders.filter((_, i) => i !== index)
      this.$emit('update:reminders', updatedReminders)
    },
    
    applyTemplate(template) {
      switch (template.type) {
        case 'change_reason':
          this.updateChangeReason(template.content)
          break
        case 'technical':
          this.updateTechnicalNotes(template.content)
          break
        case 'general':
        default:
          this.updateNotes(template.content)
          break
      }
    },
    
    getChangeReasonPlaceholder() {
      const placeholders = {
        'CHANGE_PLAN': 'Ej: Cliente solicita mayor velocidad, Cliente solicita plan más económico...',
        'CHANGE_NODE': 'Ej: Mudanza, Problema de señal en nodo actual, Mejora de cobertura...',
        'CHANGE_ZONE': 'Ej: Mudanza a otra zona, Cambio de ciudad, Mejor cobertura...',
        'CHANGE_ADDRESS': 'Ej: Mudanza dentro de la misma zona, Cambio de local comercial...'
      }
      return placeholders[this.operationType] || 'Especifique la razón del cambio...'
    },
    
    getValidationIcon(type) {
      const icons = {
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️',
        'success': '✅'
      }
      return icons[type] || 'ℹ️'
    },
    
    getHistoryTypeLabel(type) {
      const labels = {
        'creation': 'Creación',
        'change_plan': 'Cambio Plan',
        'change_node': 'Cambio Nodo',
        'change_zone': 'Cambio Zona',
        'suspension': 'Suspensión',
        'reactivation': 'Reactivación',
        'technical': 'Nota Técnica',
        'general': 'Nota General'
      }
      return labels[type] || type
    },
    
    getTagClass(tag) {
      const classes = {
        'urgente': 'tag-urgent',
        'ip-estatica': 'tag-technical',
        'configuracion-puerto': 'tag-technical',
        'velocidad': 'tag-service',
        'problema': 'tag-warning',
        'instalacion': 'tag-info',
        'mantenimiento': 'tag-info',
        'facturacion': 'tag-billing'
      }
      return classes[tag] || 'tag-default'
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.notes-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.notes-group {
  margin-bottom: 20px;
}

.notes-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
  font-size: 1em;
}

.notes-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.95em;
  line-height: 1.4;
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.notes-textarea:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.notes-textarea.required {
  border-color: #ff9800;
}

.notes-textarea.technical {
  background-color: #f8f9fa;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.textarea-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  font-size: 0.8em;
}

.char-count {
  color: #666;
}

.required-indicator {
  color: #ff9800;
  font-weight: bold;
}

.help-text {
  color: #666;
  font-style: italic;
}

/* Recordatorios */
.reminders-container {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
}

.reminder-item {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.reminder-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
}

.reminder-date {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
  width: 140px;
}

.remove-reminder {
  background: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
}

.add-reminder {
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.9em;
}

/* Templates */
.quick-templates {
  background: #e3f2fd;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.quick-templates h4 {
  margin: 0 0 12px 0;
  color: #1565c0;
  font-size: 1em;
}

.template-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-btn {
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background-color 0.2s;
}

.template-btn:hover {
  background: #1976d2;
}

/* Historial */
.notes-history {
  background: #f5f5f5;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.notes-history h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 1em;
}

.history-container {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  background: white;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 8px;
  border-left: 3px solid #ddd;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.8em;
}

.history-date {
  color: #666;
}

.history-user {
  color: #333;
  font-weight: bold;
}

.history-type {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75em;
  font-weight: bold;
  text-transform: uppercase;
}

.history-type.creation { background: #e8f5e9; color: #2e7d32; }
.history-type.change_plan { background: #f3e5f5; color: #7b1fa2; }
.history-type.technical { background: #e3f2fd; color: #1565c0; }

.history-content {
  color: #555;
  font-size: 0.9em;
  line-height: 1.3;
}

/* Validaciones */
.notes-validations {
  margin-bottom: 16px;
}

.validation-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 0.9em;
}

.validation-message.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
}

.validation-message.warning {
  background: #fff3e0;
  color: #ef6c00;
  border: 1px solid #ffcc02;
}

.validation-message.info {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

/* Tags */
.detected-tags {
  background: #f9f9f9;
  border-radius: 6px;
  padding: 12px;
}

.detected-tags h5 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 0.9em;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.75em;
  font-weight: bold;
  text-transform: uppercase;
}

.tag-urgent { background: #ffebee; color: #c62828; }
.tag-technical { background: #e3f2fd; color: #1565c0; }
.tag-service { background: #f3e5f5; color: #7b1fa2; }
.tag-warning { background: #fff3e0; color: #ef6c00; }
.tag-info { background: #e8f5e9; color: #2e7d32; }
.tag-billing { background: #fce4ec; color: #ad1457; }
.tag-default { background: #f5f5f5; color: #666; }

/* Responsive */
@media (max-width: 768px) {
  .reminder-item {
    flex-direction: column;
    align-items: stretch;
  }
  
  .reminder-date {
    width: 100%;
  }
  
  .template-buttons {
    flex-direction: column;
  }
  
  .template-btn {
    width: 100%;
  }
  
  .history-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .textarea-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>