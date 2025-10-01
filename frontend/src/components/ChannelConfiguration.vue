<template>
  <div class="channel-configuration">
    <div class="header">
      <div class="header-left">
        <h3>Configuración de Canales</h3>
        <p class="header-description">
          Gestiona los canales de comunicación disponibles para envío de mensajes
        </p>
      </div>
      <div class="header-actions">
        <button @click="initializeAllChannels" class="init-button" :disabled="initializing">
          {{ initializing ? 'Inicializando...' : '?? Inicializar Todos' }}
        </button>
        <button @click="addNewChannel" class="add-button">
          + Nuevo Canal
        </button>
      </div>
    </div>

    <div class="channels-stats">
      <div class="stat-card active">
        <div class="stat-number">{{ stats.active }}</div>
        <div class="stat-label">Canales Activos</div>
      </div>
      <div class="stat-card inactive">
        <div class="stat-number">{{ stats.inactive }}</div>
        <div class="stat-label">Canales Inactivos</div>
      </div>
      <div class="stat-card configured">
        <div class="stat-number">{{ stats.configured }}</div>
        <div class="stat-label">Configurados</div>
      </div>
      <div class="stat-card errors">
        <div class="stat-number">{{ stats.errors }}</div>
        <div class="stat-label">Con Errores</div>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando configuración de canales...
    </div>

    <div v-else-if="channels.length === 0" class="no-channels">
      <div class="empty-state">
        <div class="empty-icon">??</div>
        <h4>No hay canales configurados</h4>
        <p>Configura tus primeros canales de comunicación para empezar a enviar mensajes</p>
        <button @click="addNewChannel" class="create-first-button">
          Configurar Primer Canal
        </button>
      </div>
    </div>

    <div v-else class="channels-grid">
      <div 
        v-for="channel in channels" 
        :key="channel.id"
        class="channel-card"
        :class="[channel.channelType, { 
          'active': channel.active, 
          'inactive': !channel.active,
          'error': channel.lastError 
        }]"
      >
        <div class="card-header">
          <div class="channel-info">
            <div class="channel-title">
              <span class="channel-icon">{{ getChannelIcon(channel.channelType) }}</span>
              <h4 class="channel-name">{{ channel.name }}</h4>
            </div>
            <div class="channel-type">{{ getChannelTypeLabel(channel.channelType) }}</div>
          </div>
          
          <div class="channel-status">
            <div class="status-indicator" :class="getStatusClass(channel)"></div>
            <span class="status-text">{{ getStatusText(channel) }}</span>
          </div>
        </div>

        <div class="card-content">
          <div class="configuration-summary">
            <div v-if="channel.channelType === 'email'" class="config-item">
              <span class="config-label">SMTP:</span>
              <span class="config-value">{{ channel.configuration?.smtp_host || 'No configurado' }}</span>
            </div>
            
            <div v-if="channel.channelType === 'whatsapp'" class="config-item">
              <span class="config-label">Número:</span>
              <span class="config-value">{{ channel.configuration?.phone_number || 'No configurado' }}</span>
            </div>
            
            <div v-if="channel.channelType === 'telegram'" class="config-item">
              <span class="config-label">Bot Token:</span>
              <span class="config-value">{{ channel.configuration?.bot_token ? '***Configurado***' : 'No configurado' }}</span>
            </div>
            
            <div v-if="channel.channelType === 'sms'" class="config-item">
              <span class="config-label">Proveedor:</span>
              <span class="config-value">{{ channel.configuration?.provider || 'No configurado' }}</span>
            </div>
          </div>

          <div v-if="channel.lastError" class="error-message">
            <strong>?? Error:</strong> {{ channel.lastError }}
          </div>

          <div class="usage-stats">
            <div class="usage-item">
              <span class="usage-label">Mensajes enviados:</span>
              <span class="usage-value">{{ channel.messagesSent || 0 }}</span>
            </div>
            <div class="usage-item">
              <span class="usage-label">Última vez usado:</span>
              <span class="usage-value">
                {{ channel.lastUsed ? formatDate(channel.lastUsed) : 'Nunca' }}
              </span>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="channel-actions">
            <button 
              @click="testChannel(channel)" 
              class="action-btn test"
              :disabled="testing === channel.id"
              :title="'Probar conexión'"
            >
              {{ testing === channel.id ? '?' : '??' }} Test
            </button>
            
            <button 
              @click="configureChannel(channel)" 
              class="action-btn configure"
              title="Configurar canal"
            >
              ?? Configurar
            </button>
            
            <button 
              @click="toggleChannel(channel)" 
              :class="['action-btn', 'toggle', channel.active ? 'deactivate' : 'activate']"
              :title="channel.active ? 'Desactivar' : 'Activar'"
            >
              {{ channel.active ? '?? Desactivar' : '?? Activar' }}
            </button>
            
            <button 
              @click="deleteChannel(channel)" 
              class="action-btn delete"
              title="Eliminar canal"
            >
              ??? Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para agregar/configurar canal -->
    <ChannelConfigModal 
      v-if="showConfigModal"
      :channel="editingChannel"
      :availablePlugins="availablePlugins"
      @close="showConfigModal = false"
      @save="saveChannelConfig"
    />

    <!-- Modal para test de canal -->
    <ChannelTestModal 
      v-if="showTestModal"
      :channel="testingChannel"
      :testResult="testResult"
      @close="showTestModal = false"
      @retry="testChannel"
    />
  </div>
</template>

<script>
import CommunicationService from '../services/communication.service';

export default {
  name: 'ChannelConfiguration',
  props: {
    channels: {
      type: Array,
      default: () => []
    }
  },
  emits: ['configure', 'activate', 'test', 'refresh'],
  data() {
    return {
      loading: false,
      initializing: false,
      testing: null,
      showConfigModal: false,
      showTestModal: false,
      editingChannel: null,
      testingChannel: null,
      testResult: null,
      availablePlugins: [],
      stats: {
        active: 0,
        inactive: 0,
        configured: 0,
        errors: 0
      }
    };
  },
  watch: {
    channels: {
      handler() {
        this.updateStats();
      },
      immediate: true
    }
  },
  async created() {
    await this.loadAvailablePlugins();
  },
  methods: {
    updateStats() {
      this.stats = {
        active: this.channels.filter(c => c.active).length,
        inactive: this.channels.filter(c => !c.active).length,
        configured: this.channels.filter(c => this.isConfigured(c)).length,
        errors: this.channels.filter(c => c.lastError).length
      };
    },

    async loadAvailablePlugins() {
      try {
        const response = await CommunicationService.getAvailablePlugins();
        this.availablePlugins = response.data;
      } catch (error) {
        console.error('Error cargando plugins disponibles:', error);
      }
    },

    async initializeAllChannels() {
      this.initializing = true;
      try {
        await CommunicationService.initializeAllChannels();
        this.$emit('refresh');
        this.$toast?.success('Canales inicializados exitosamente');
      } catch (error) {
        console.error('Error inicializando canales:', error);
        this.$toast?.error('Error inicializando canales');
      } finally {
        this.initializing = false;
      }
    },

    addNewChannel() {
      this.editingChannel = null;
      this.showConfigModal = true;
    },

    configureChannel(channel) {
      this.editingChannel = channel;
      this.showConfigModal = true;
      this.$emit('configure', channel);
    },

    async saveChannelConfig(channelData) {
      try {
        if (this.editingChannel) {
          await CommunicationService.updateChannel(this.editingChannel.id, channelData);
          this.$toast?.success('Canal actualizado exitosamente');
        } else {
          await CommunicationService.createChannel(channelData);
          this.$toast?.success('Canal creado exitosamente');
        }
        
        this.showConfigModal = false;
        this.$emit('refresh');
      } catch (error) {
        console.error('Error guardando configuración del canal:', error);
        this.$toast?.error('Error guardando configuración');
      }
    },

    async toggleChannel(channel) {
      try {
        await CommunicationService.activateChannel(channel.id, !channel.active);
        this.$emit('activate', channel.id, !channel.active);
        this.$toast?.success(
          !channel.active ? 'Canal activado' : 'Canal desactivado'
        );
      } catch (error) {
        console.error('Error cambiando estado del canal:', error);
        this.$toast?.error('Error cambiando estado del canal');
      }
    },

    async testChannel(channel) {
      this.testing = channel.id;
      this.testingChannel = channel;
      
      try {
        const response = await CommunicationService.testChannelConnection(channel.id);
        this.testResult = response.data;
        this.showTestModal = true;
        this.$emit('test', channel);
        
        if (response.data.success) {
          this.$toast?.success('Prueba de conexión exitosa');
        } else {
          this.$toast?.warning('Prueba de conexión falló');
        }
      } catch (error) {
        console.error('Error probando canal:', error);
        this.testResult = {
          success: false,
          error: error.response?.data?.message || error.message,
          details: 'Error de conexión al probar el canal'
        };
        this.showTestModal = true;
        this.$toast?.error('Error probando conexión');
      } finally {
        this.testing = null;
      }
    },

    async deleteChannel(channel) {
      if (!confirm(`¿Está seguro de eliminar el canal "${channel.name}"?`)) {
        return;
      }

      try {
        await CommunicationService.deleteChannel(channel.id);
        this.$emit('refresh');
        this.$toast?.success('Canal eliminado exitosamente');
      } catch (error) {
        console.error('Error eliminando canal:', error);
        this.$toast?.error('Error eliminando canal');
      }
    },

    isConfigured(channel) {
      const config = channel.configuration || {};
      
      switch (channel.channelType) {
        case 'email':
          return !!(config.smtp_host && config.smtp_port && config.smtp_user);
        case 'whatsapp':
          return !!(config.phone_number && config.api_key);
        case 'telegram':
          return !!(config.bot_token);
        case 'sms':
          return !!(config.provider && config.api_key);
        default:
          return false;
      }
    },

    getStatusClass(channel) {
      if (channel.lastError) return 'error';
      if (!channel.active) return 'inactive';
      if (!this.isConfigured(channel)) return 'warning';
      return 'active';
    },

    getStatusText(channel) {
      if (channel.lastError) return 'Error';
      if (!channel.active) return 'Inactivo';
      if (!this.isConfigured(channel)) return 'Sin configurar';
      return 'Activo';
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

    getChannelTypeLabel(channelType) {
      const labels = {
        'email': 'Correo Electrónico',
        'whatsapp': 'WhatsApp',
        'telegram': 'Telegram',
        'sms': 'SMS'
      };
      return labels[channelType] || channelType;
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
.channel-configuration {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
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

.header-actions {
  display: flex;
  gap: 10px;
}

.init-button {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.init-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.add-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.channels-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.stat-card {
  background: white;
  padding: 15px;
  border-radius: 6px;
  text-align: center;
  border-left: 4px solid #dee2e6;
}

.stat-card.active {
  border-left-color: #28a745;
}

.stat-card.inactive {
  border-left-color: #6c757d;
}

.stat-card.configured {
  border-left-color: #007bff;
}

.stat-card.errors {
  border-left-color: #dc3545;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  font-weight: 500;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-channels {
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

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  padding: 20px;
}

.channel-card {
  border: 2px solid #e9ecef;
  border-radius: 8px;
  background: white;
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.channel-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.channel-card.active {
  border-color: #28a745;
}

.channel-card.inactive {
  border-color: #6c757d;
  opacity: 0.7;
}

.channel-card.error {
  border-color: #dc3545;
  background: #fff5f5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
  background: #f8f9fa;
}

.channel-info {
  flex: 1;
}

.channel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.channel-icon {
  font-size: 24px;
}

.channel-name {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.channel-type {
  color: #666;
  font-size: 12px;
  text-transform: uppercase;
  font-weight: 500;
}

.channel-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #6c757d;
}

.status-indicator.active {
  background: #28a745;
}

.status-indicator.inactive {
  background: #6c757d;
}

.status-indicator.warning {
  background: #ffc107;
}

.status-indicator.error {
  background: #dc3545;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: #666;
}

.card-content {
  padding: 15px;
}

.configuration-summary {
  margin-bottom: 15px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.config-label {
  color: #666;
  font-weight: 500;
}

.config-value {
  color: #333;
  font-family: monospace;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 15px;
}

.usage-stats {
  border-top: 1px solid #f0f0f0;
  padding-top: 10px;
}

.usage-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
}

.usage-label {
  color: #666;
}

.usage-value {
  color: #333;
  font-weight: 500;
}

.card-footer {
  padding: 12px 15px;
  background: #f8f9fa;
  border-top: 1px solid #f0f0f0;
}

.channel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.action-btn.test {
  background: #17a2b8;
  color: white;
}

.action-btn.test:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.action-btn.configure {
  background: #ffc107;
  color: #212529;
}

.action-btn.toggle.activate {
  background: #28a745;
  color: white;
}

.action-btn.toggle.deactivate {
  background: #6c757d;
  color: white;
}

.action-btn.delete {
  background: #dc3545;
  color: white;
}

.action-btn:hover:not(:disabled) {
  opacity: 0.8;
}

@media (max-width: 768px) {
  .channels-grid {
    grid-template-columns: 1fr;
  }
  
  .header {
    flex-direction: column;
    gap: 15px;
  }
  
  .channels-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .channel-actions {
    justify-content: center;
  }
}
</style>