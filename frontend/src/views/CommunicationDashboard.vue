<template>
  <div class="communication-dashboard">
    <div class="header">
      <h2>Centro de Comunicaciones</h2>
      <div class="header-actions">
        <button @click="showNewMessageModal = true" class="primary-button">
          Nuevo Mensaje
        </button>
        <button @click="showMassMessageModal = true" class="secondary-button">
          Envío Masivo
        </button>
        <button @click="showTemplateModal = true" class="secondary-button">
          Nueva Plantilla
        </button>
      </div>
    </div>

    <!-- Dashboard Cards -->
    <div class="dashboard-cards">
      <div class="stat-card">
        <h3>Mensajes Enviados Hoy</h3>
        <div class="stat-number">{{ statistics.todayCount || 0 }}</div>
        <div class="stat-change" :class="{ positive: statistics.todayGrowth > 0 }">
          {{ statistics.todayGrowth > 0 ? '+' : '' }}{{ statistics.todayGrowth }}%
        </div>
      </div>

      <div class="stat-card">
        <h3>Tasa de Entrega</h3>
        <div class="stat-number">{{ statistics.deliveryRate || 0 }}%</div>
        <div class="stat-description">Últimos 7 días</div>
      </div>

      <div class="stat-card">
        <h3>Mensajes Programados</h3>
        <div class="stat-number">{{ scheduledCount }}</div>
        <button @click="loadScheduledMessages" class="link-button">Ver todos</button>
      </div>

      <div class="stat-card">
        <h3>Canales Activos</h3>
        <div class="stat-number">{{ activeChannelsCount }}</div>
        <button @click="showChannelManagement = true" class="link-button">Configurar</button>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <h3>Acciones Rápidas</h3>
      <div class="actions-grid">
        <button @click="sendPaymentReminders" class="action-button">
          💰 Recordatorios de Pago
        </button>
        <button @click="sendMaintenanceNotice" class="action-button">
          🔧 Aviso de Mantenimiento
        </button>
        <button @click="sendServiceUpdate" class="action-button">
          📢 Actualización de Servicio
        </button>
        <button @click="showBroadcastModal = true" class="action-button">
          📡 Mensaje General
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="content-tabs">
      <div class="tab-nav">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="{ active: activeTab === tab.id }"
          class="tab-button"
        >
          {{ tab.name }}
        </button>
      </div>

      <!-- Historial de Comunicaciones -->
      <div v-if="activeTab === 'history'" class="tab-content">
        <CommunicationHistory 
          :history="communicationHistory"
          :loading="historyLoading"
          @refresh="loadCommunicationHistory"
          @filter="filterHistory"
        />
      </div>

      <!-- Plantillas -->
      <div v-if="activeTab === 'templates'" class="tab-content">
        <TemplateManager 
          :templates="templates"
          :channels="channels"
          @create="showTemplateModal = true"
          @edit="editTemplate"
          @delete="deleteTemplate"
        />
      </div>

      <!-- Mensajes Programados -->
      <div v-if="activeTab === 'scheduled'" class="tab-content">
        <ScheduledMessages 
          :messages="scheduledMessages"
          @cancel="cancelScheduledMessage"
          @reschedule="rescheduleMessage"
        />
      </div>

      <!-- Configuración de Canales -->
      <div v-if="activeTab === 'channels'" class="tab-content">
        <ChannelConfiguration 
          :channels="channels"
          @configure="configureChannel"
          @activate="toggleChannelStatus"
          @test="testChannel"
        />
      </div>
    </div>

    <!-- Modales -->
    <NewMessageModal 
      v-if="showNewMessageModal"
      :channels="activeChannels"
      :templates="templates"
      @close="showNewMessageModal = false"
      @send="sendMessage"
    />

    <MassMessageModal 
      v-if="showMassMessageModal"
      :channels="activeChannels"
      :templates="templates"
      @close="showMassMessageModal = false"
      @send="sendMassMessage"
    />

    <TemplateModal 
      v-if="showTemplateModal"
      :channels="channels"
      :template="editingTemplate"
      @close="closeTemplateModal"
      @save="saveTemplate"
    />
  </div>
</template>

<script>
import CommunicationService from '../services/communication.service';
import CommunicationHistory from '../components/CommunicationHistory.vue';
import TemplateManager from '../components/TemplateManager.vue';
import ScheduledMessages from '../components/ScheduledMessages.vue';
import ChannelConfiguration from '../components/ChannelConfiguration.vue';
import NewMessageModal from '../components/NewMessageModal.vue';
import MassMessageModal from '../components/MassMessageModal.vue';
import TemplateModal from '../components/TemplateModal.vue';

export default {
  name: 'CommunicationDashboard',
  components: {
    CommunicationHistory,
    TemplateManager,
    ScheduledMessages,
    ChannelConfiguration,
    NewMessageModal,
    MassMessageModal,
    TemplateModal
  },
  data() {
    return {
      activeTab: 'history',
      statistics: {},
      channels: [],
      templates: [],
      communicationHistory: [],
      scheduledMessages: [],
      historyLoading: false,
      scheduledCount: 0,
      activeChannelsCount: 0,
      
      // Modales
      showNewMessageModal: false,
      showMassMessageModal: false,
      showTemplateModal: false,
      showChannelManagement: false,
      showBroadcastModal: false,
      
      // Edición
      editingTemplate: null,
      
      tabs: [
        { id: 'history', name: 'Historial' },
        { id: 'templates', name: 'Plantillas' },
        { id: 'scheduled', name: 'Programados' },
        { id: 'channels', name: 'Canales' }
      ]
    };
  },
  computed: {
    activeChannels() {
      return this.channels.filter(channel => channel.active);
    }
  },
  async created() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      try {
        await Promise.all([
          this.loadStatistics(),
          this.loadChannels(),
          this.loadTemplates(),
          this.loadCommunicationHistory(),
          this.loadScheduledMessages()
        ]);
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    },

    async loadStatistics() {
      try {
        const response = await CommunicationService.getCommunicationStatistics();
        this.statistics = response.data;
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      }
    },

    async loadChannels() {
      try {
        const response = await CommunicationService.getAllChannels();
        this.channels = response.data.data || response.data;
        this.activeChannelsCount = this.channels.filter(c => c.active).length;
      } catch (error) {
        console.error('Error cargando canales:', error);
      }
    },

    async loadTemplates() {
      try {
        const response = await CommunicationService.getAllTemplates();
        this.templates = response.data.data || response.data;
      } catch (error) {
        console.error('Error cargando plantillas:', error);
      }
    },

    async loadCommunicationHistory() {
      this.historyLoading = true;
      try {
        const response = await CommunicationService.getCommunicationHistory({ 
          page: 1, 
          size: 50 
        });
        this.communicationHistory = response.data.logs || [];
      } catch (error) {
        console.error('Error cargando historial:', error);
      } finally {
        this.historyLoading = false;
      }
    },

    async loadScheduledMessages() {
      try {
        const response = await CommunicationService.getScheduledMessages({ 
          status: 'pending' 
        });
        this.scheduledMessages = response.data;
        this.scheduledCount = this.scheduledMessages.length;
      } catch (error) {
        console.error('Error cargando mensajes programados:', error);
      }
    },

    async sendMessage(messageData) {
      try {
        await CommunicationService.sendMessage(messageData);
        this.showNewMessageModal = false;
        this.loadCommunicationHistory();
        this.$toast.success('Mensaje enviado exitosamente');
      } catch (error) {
        console.error('Error enviando mensaje:', error);
        this.$toast.error('Error enviando mensaje');
      }
    },

    async sendMassMessage(massData) {
      try {
        await CommunicationService.sendMassMessage(massData);
        this.showMassMessageModal = false;
        this.loadCommunicationHistory();
        this.$toast.success('Envío masivo iniciado');
      } catch (error) {
        console.error('Error en envío masivo:', error);
        this.$toast.error('Error en envío masivo');
      }
    },

    async saveTemplate(templateData) {
      try {
        if (this.editingTemplate) {
          await CommunicationService.updateTemplate(this.editingTemplate.id, templateData);
          this.$toast.success('Plantilla actualizada');
        } else {
          await CommunicationService.createTemplate(templateData);
          this.$toast.success('Plantilla creada');
        }
        
        this.closeTemplateModal();
        this.loadTemplates();
      } catch (error) {
        console.error('Error guardando plantilla:', error);
        this.$toast.error('Error guardando plantilla');
      }
    },

    editTemplate(template) {
      this.editingTemplate = template;
      this.showTemplateModal = true;
    },

    async deleteTemplate(templateId) {
      if (!confirm('¿Está seguro de eliminar esta plantilla?')) return;
      
      try {
        await CommunicationService.deleteTemplate(templateId);
        this.loadTemplates();
        this.$toast.success('Plantilla eliminada');
      } catch (error) {
        console.error('Error eliminando plantilla:', error);
        this.$toast.error('Error eliminando plantilla');
      }
    },

    closeTemplateModal() {
      this.showTemplateModal = false;
      this.editingTemplate = null;
    },

    async cancelScheduledMessage(messageId) {
      try {
        await CommunicationService.cancelScheduledMessage(messageId);
        this.loadScheduledMessages();
        this.$toast.success('Mensaje cancelado');
      } catch (error) {
        console.error('Error cancelando mensaje:', error);
        this.$toast.error('Error cancelando mensaje');
      }
    },

    async sendPaymentReminders() {
      // Implementar lógica para enviar recordatorios de pago
      this.$toast.info('Función en desarrollo');
    },

    async sendMaintenanceNotice() {
      // Implementar lógica para avisos de mantenimiento
      this.$toast.info('Función en desarrollo');
    },

    async sendServiceUpdate() {
      // Implementar lógica para actualizaciones de servicio
      this.$toast.info('Función en desarrollo');
    },

    filterHistory(filters) {
      this.loadCommunicationHistory(filters);
    }
  }
};
</script>

<style scoped>
.communication-dashboard {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h2 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.primary-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.secondary-button {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-card h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-change {
  font-size: 14px;
  color: #dc3545;
}

.stat-change.positive {
  color: #28a745;
}

.stat-description {
  font-size: 12px;
  color: #999;
}

.link-button {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 12px;
  text-decoration: underline;
}

.quick-actions {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.quick-actions h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.action-button {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  padding: 15px;
  border-radius: 5px;
  cursor: pointer;
  text-align: center;
  transition: background-color 0.2s;
}

.action-button:hover {
  background: #e9ecef;
}

.content-tabs {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tab-nav {
  display: flex;
  border-bottom: 1px solid #e9ecef;
}

.tab-button {
  background: none;
  border: none;
  padding: 15px 20px;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tab-button.active {
  border-bottom-color: #007bff;
  color: #007bff;
  font-weight: 500;
}

.tab-content {
  padding: 20px;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 15px;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .dashboard-cards {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .tab-nav {
    flex-wrap: wrap;
  }

  .tab-button {
    flex: 1;
    min-width: 120px;
  }
}
</style>