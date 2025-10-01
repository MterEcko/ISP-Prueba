

<template>
  <div class="template-manager">
    <div class="manager-header">
      <div class="header-left">
        <h3>Plantillas de Mensajes</h3>
        <p class="header-description">
          Gestiona plantillas reutilizables para diferentes canales de comunicación
        </p>
      </div>
      <button @click="$emit('create')" class="create-button">
        + Nueva Plantilla
      </button>
    </div>

    <div class="filters">
      <div class="filter-row">
        <div class="filter-group">
          <label>Canal:</label>
          <select v-model="filters.channelId" @change="applyFilters">
            <option value="">Todos los canales</option>
            <option v-for="channel in channels" :key="channel.id" :value="channel.id">
              {{ getChannelIcon(channel.channelType) }} {{ channel.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Tipo:</label>
          <select v-model="filters.templateType" @change="applyFilters">
            <option value="">Todos los tipos</option>
            <option value="welcome">Bienvenida</option>
            <option value="payment_reminder">Recordatorio de pago</option>
            <option value="service_notification">Notificación de servicio</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="suspension">Suspensión</option>
            <option value="reactivation">Reactivación</option>
            <option value="custom">Personalizada</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Estado:</label>
          <select v-model="filters.active" @change="applyFilters">
            <option value="">Todos</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>

        <div class="filter-group">
          <input 
            type="text" 
            v-model="searchTerm" 
            @input="debouncedSearch"
            placeholder="Buscar plantillas..."
            class="search-input"
          />
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando plantillas...
    </div>

    <div v-else-if="filteredTemplates.length === 0" class="no-templates">
      <div class="empty-state">
        <div class="empty-icon">??</div>
        <h4>No hay plantillas</h4>
        <p>Crea tu primera plantilla para empezar a enviar mensajes personalizados</p>
        <button @click="$emit('create')" class="create-first-button">
          Crear Primera Plantilla
        </button>
      </div>
    </div>

    <div v-else class="templates-grid">
      <div 
        v-for="template in filteredTemplates" 
        :key="template.id"
        class="template-card"
        :class="{ 'inactive': !template.active }"
      >
        <div class="card-header">
          <div class="template-info">
            <h4 class="template-name">{{ template.name }}</h4>
            <div class="template-meta">
              <span class="channel-badge" :class="template.channel?.channelType">
                {{ getChannelIcon(template.channel?.channelType) }}
                {{ template.channel?.name }}
              </span>
              <span class="template-type" :class="template.templateType">
                {{ getTypeLabel(template.templateType) }}
              </span>
            </div>
          </div>
          
          <div class="card-actions">
            <button 
              @click="toggleTemplateStatus(template)" 
              :class="['status-toggle', template.active ? 'active' : 'inactive']"
              :title="template.active ? 'Desactivar' : 'Activar'"
            >
              {{ template.active ? '?' : '?' }}
            </button>
            
            <div class="action-menu">
              <button @click="toggleMenu(template.id)" class="menu-button">
                ?
              </button>
              <div 
                v-if="activeMenu === template.id" 
                class="menu-dropdown"
                @click.stop
              >
                <button @click="previewTemplate(template)">
                  ??? Vista previa
                </button>
                <button @click="duplicateTemplate(template)">
                  ?? Duplicar
                </button>
                <button @click="editTemplate(template)">
                  ?? Editar
                </button>
                <button @click="exportTemplate(template)">
                  ?? Exportar
                </button>
                <button @click="deleteTemplate(template)" class="delete-action">
                  ??? Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card-content">
          <div v-if="template.subject" class="template-subject">
            <strong>Asunto:</strong> {{ truncateText(template.subject, 60) }}
          </div>
          
          <div class="template-preview">
            {{ truncateText(template.messageBody, 120) }}
          </div>

          <div class="template-variables" v-if="template.variables && template.variables.length > 0">
            <span class="variables-label">Variables:</span>
            <span 
              v-for="variable in template.variables.slice(0, 3)" 
              :key="variable"
              class="variable-tag"
            >
              {{ variable }}
            </span>
            <span v-if="template.variables.length > 3" class="variable-more">
              +{{ template.variables.length - 3 }} más
            </span>
          </div>
        </div>

        <div class="card-footer">
          <div class="usage-stats">
            <span class="usage-count">
              ?? {{ template.usageCount || 0 }} usos
            </span>
            <span class="last-used">
              {{ template.lastUsed ? '• Usado ' + formatRelativeTime(template.lastUsed) : '• Nunca usado' }}
            </span>
          </div>
          
          <div class="footer-actions">
            <button @click="useTemplate(template)" class="use-button">
              Usar Plantilla
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de vista previa -->
    <TemplatePreviewModal 
      v-if="showPreviewModal"
      :template="previewingTemplate"
      @close="showPreviewModal = false"
      @edit="editTemplate"
      @use="useTemplate"
    />
  </div>
</template>

<script>
import CommunicationService from '../services/communication.service';
import TemplatePreviewModal from './TemplatePreviewModal.vue';

export default {
  name: 'TemplateManager',
  components: {
    TemplatePreviewModal
  },
  props: {
    templates: {
      type: Array,
      default: () => []
    },
    channels: {
      type: Array,
      default: () => []
    }
  },
  emits: ['create', 'edit', 'delete', 'refresh', 'use'],
  data() {
    return {
      loading: false,
      searchTerm: '',
      activeMenu: null,
      showPreviewModal: false,
      previewingTemplate: null,
      searchTimeout: null,
      filters: {
        channelId: '',
        templateType: '',
        active: ''
      }
    };
  },
  computed: {
    filteredTemplates() {
      let filtered = [...this.templates];

      // Filtro por búsqueda
      if (this.searchTerm.trim()) {
        const term = this.searchTerm.toLowerCase();
        filtered = filtered.filter(template => 
          template.name.toLowerCase().includes(term) ||
          template.messageBody.toLowerCase().includes(term) ||
          (template.subject && template.subject.toLowerCase().includes(term))
        );
      }

      // Filtros adicionales
      if (this.filters.channelId) {
        filtered = filtered.filter(t => t.channelId == this.filters.channelId);
      }
      
      if (this.filters.templateType) {
        filtered = filtered.filter(t => t.templateType === this.filters.templateType);
      }
      
      if (this.filters.active !== '') {
        const isActive = this.filters.active === 'true';
        filtered = filtered.filter(t => t.active === isActive);
      }

      // Ordenar por nombre
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
    },

    debouncedSearch() {
      return this.debounce(() => {
        // La búsqueda se hace en tiempo real a través del computed
      }, 300);
    }
  },
  mounted() {
    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', this.closeMenus);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeMenus);
  },
  methods: {
    applyFilters() {
      // Los filtros se aplican automáticamente a través del computed
    },

    toggleMenu(templateId) {
      this.activeMenu = this.activeMenu === templateId ? null : templateId;
    },

    closeMenus() {
      this.activeMenu = null;
    },

    async toggleTemplateStatus(template) {
      try {
        const updatedTemplate = {
          ...template,
          active: !template.active
        };
        
        await CommunicationService.updateTemplate(template.id, updatedTemplate);
        
        // Actualizar en la lista local
        template.active = !template.active;
        
        this.$toast?.success(
          template.active ? 'Plantilla activada' : 'Plantilla desactivada'
        );
      } catch (error) {
        console.error('Error actualizando estado de plantilla:', error);
        this.$toast?.error('Error actualizando plantilla');
      }
    },

    previewTemplate(template) {
      this.previewingTemplate = template;
      this.showPreviewModal = true;
      this.closeMenus();
    },

    editTemplate(template) {
      this.$emit('edit', template);
      this.closeMenus();
    },

    async duplicateTemplate(template) {
      try {
        const duplicatedTemplate = {
          name: `${template.name} (Copia)`,
          channelId: template.channelId,
          templateType: template.templateType,
          subject: template.subject,
          messageBody: template.messageBody,
          variables: template.variables,
          active: false // Las copias empiezan inactivas
        };
        
        await CommunicationService.createTemplate(duplicatedTemplate);
        this.$emit('refresh');
        this.$toast?.success('Plantilla duplicada exitosamente');
      } catch (error) {
        console.error('Error duplicando plantilla:', error);
        this.$toast?.error('Error duplicando plantilla');
      }
      this.closeMenus();
    },

    async deleteTemplate(template) {
      if (!confirm(`¿Está seguro de eliminar la plantilla "${template.name}"?`)) {
        return;
      }
      
      try {
        await CommunicationService.deleteTemplate(template.id);
        this.$emit('delete', template.id);
        this.$toast?.success('Plantilla eliminada');
      } catch (error) {
        console.error('Error eliminando plantilla:', error);
        this.$toast?.error('Error eliminando plantilla');
      }
      this.closeMenus();
    },

    exportTemplate(template) {
      const dataStr = JSON.stringify(template, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `plantilla_${template.name.replace(/\s+/g, '_')}.json`;
      link.click();
      
      this.$toast?.success('Plantilla exportada');
      this.closeMenus();
    },

    useTemplate(template) {
      this.$emit('use', template);
      this.closeMenus();
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
        'payment_reminder': 'Recordatorio',
        'service_notification': 'Servicio',
        'maintenance': 'Mantenimiento',
        'suspension': 'Suspensión',
        'reactivation': 'Reactivación',
        'custom': 'Personalizada'
      };
      return labels[templateType] || 'Sin tipo';
    },

    truncateText(text, length) {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    },

    formatRelativeTime(date) {
      const now = new Date();
      const past = new Date(date);
      const diffInSeconds = Math.floor((now - past) / 1000);
      
      if (diffInSeconds < 60) return 'hace menos de 1 minuto';
      if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} minutos`;
      if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} horas`;
      
      const diffInDays = Math.floor(diffInSeconds / 86400);
      if (diffInDays < 30) return `hace ${diffInDays} días`;
      if (diffInDays < 365) return `hace ${Math.floor(diffInDays / 30)} meses`;
      
      return `hace ${Math.floor(diffInDays / 365)} años`;
    },

    debounce(func, wait) {
      return (...args) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => func.apply(this, args), wait);
      };
    }
  }
};
</script>

<style scoped>
.template-manager {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.header-left h3 {
  margin: 0 0 5px 0;
  color: #333;
}

.header-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.create-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.filters {
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.filter-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.filter-group label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  font-weight: 500;
}

.filter-group select,
.search-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input {
  min-width: 200px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-templates {
  padding: 60px 20px;
}

.empty-state {
  text-align: center;
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-state h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.empty-state p {
  margin: 0 0 20px 0;
  color: #666;
}

.create-first-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  padding: 20px;
}

.template-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: white;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.template-card.inactive {
  opacity: 0.6;
  border-color: #dee2e6;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.template-info {
  flex: 1;
}

.template-name {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.template-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.channel-badge {
  background: #e9ecef;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.channel-badge.email {
  background: #cfe2ff;
  color: #0d6efd;
}

.channel-badge.whatsapp {
  background: #d1e7dd;
  color: #198754;
}

.channel-badge.telegram {
  background: #cff4fc;
  color: #0dcaf0;
}

.channel-badge.sms {
  background: #f8d7da;
  color: #dc3545;
}

.template-type {
  background: #fff3cd;
  color: #664d03;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-toggle {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-toggle.active {
  color: #28a745;
}

.status-toggle.inactive {
  color: #6c757d;
}

.action-menu {
  position: relative;
}

.menu-button {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.menu-button:hover {
  background: #f8f9fa;
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 10;
  min-width: 140px;
}

.menu-dropdown button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.menu-dropdown button:hover {
  background: #f8f9fa;
}

.menu-dropdown button:last-child {
  border-bottom: none;
}

.menu-dropdown button.delete-action {
  color: #dc3545;
}

.card-content {
  padding: 15px;
}

.template-subject {
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}

.template-preview {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 12px;
}

.template-variables {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.variables-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.variable-tag {
  background: #e9ecef;
  color: #495057;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 11px;
  font-family: monospace;
}

.variable-more {
  color: #666;
  font-size: 11px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8f9fa;
  border-top: 1px solid #f0f0f0;
}

.usage-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.usage-count,
.last-used {
  font-size: 11px;
  color: #666;
}

.use-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .templates-grid {
    grid-template-columns: 1fr;
  }
  
  .manager-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    min-width: auto;
  }
}
</style>