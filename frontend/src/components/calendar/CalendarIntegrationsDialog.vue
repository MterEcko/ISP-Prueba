<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>Integraciones de Calendario</h3>
        <button @click="$emit('close')" class="btn-close">✕</button>
      </div>

      <div class="dialog-body">
        <p>Conecta tu calendario con Google Calendar o Microsoft Outlook para sincronizar tus eventos automáticamente.</p>

        <!-- Google Calendar -->
        <div class="integration-card">
          <div class="integration-header">
            <div class="integration-info">
              <h4>📅 Google Calendar</h4>
              <p>Sincroniza con tu cuenta de Google</p>
            </div>
            <div class="integration-status">
              <span v-if="googleIntegration" class="status-badge connected">✓ Conectado</span>
              <span v-else class="status-badge">No conectado</span>
            </div>
          </div>

          <div v-if="googleIntegration" class="integration-details">
            <p><strong>Cuenta:</strong> {{ googleIntegration.email }}</p>
            <p><strong>Última sincronización:</strong> {{ formatDate(googleIntegration.lastSyncedAt) }}</p>
            <button @click="syncGoogle" class="btn-sync">🔄 Sincronizar ahora</button>
            <button @click="disconnectGoogle" class="btn-disconnect">Desconectar</button>
          </div>
          <div v-else class="integration-actions">
            <button @click="connectGoogle" class="btn-connect">Conectar Google Calendar</button>
          </div>
        </div>

        <!-- Microsoft Calendar -->
        <div class="integration-card">
          <div class="integration-header">
            <div class="integration-info">
              <h4>📆 Microsoft Outlook</h4>
              <p>Sincroniza con tu cuenta de Microsoft</p>
            </div>
            <div class="integration-status">
              <span v-if="microsoftIntegration" class="status-badge connected">✓ Conectado</span>
              <span v-else class="status-badge">No conectado</span>
            </div>
          </div>

          <div v-if="microsoftIntegration" class="integration-details">
            <p><strong>Cuenta:</strong> {{ microsoftIntegration.email }}</p>
            <p><strong>Última sincronización:</strong> {{ formatDate(microsoftIntegration.lastSyncedAt) }}</p>
            <button @click="syncMicrosoft" class="btn-sync">🔄 Sincronizar ahora</button>
            <button @click="disconnectMicrosoft" class="btn-disconnect">Desconectar</button>
          </div>
          <div v-else class="integration-actions">
            <button @click="connectMicrosoft" class="btn-connect">Conectar Microsoft Outlook</button>
          </div>
        </div>

        <!-- Configuración de sincronización -->
        <div v-if="hasIntegrations" class="sync-settings">
          <h4>Configuración de Sincronización</h4>
          <label>
            <input type="checkbox" v-model="autoSync" @change="toggleAutoSync">
            Sincronizar automáticamente cada hora
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'CalendarIntegrationsDialog',

  data() {
    return {
      autoSync: true
    };
  },

  computed: {
    ...mapState('calendar', ['integrations']),
    ...mapGetters('calendar', ['hasGoogleIntegration', 'hasMicrosoftIntegration']),

    googleIntegration() {
      return this.integrations.find(int => int.provider === 'google' && int.isActive);
    },

    microsoftIntegration() {
      return this.integrations.find(int => int.provider === 'microsoft' && int.isActive);
    },

    hasIntegrations() {
      return this.hasGoogleIntegration || this.hasMicrosoftIntegration;
    }
  },

  mounted() {
    this.$store.dispatch('calendar/fetchIntegrations');
  },

  methods: {
    ...mapActions('calendar', ['connectGoogle', 'connectMicrosoft', 'disconnectIntegration', 'syncFromExternal']),

    async disconnectGoogle() {
      if (confirm('¿Estás seguro de desconectar Google Calendar?')) {
        try {
          await this.disconnectIntegration(this.googleIntegration.id);
          this.$notify({ type: 'success', message: 'Google Calendar desconectado' });
        } catch (error) {
          this.$notify({ type: 'error', message: 'Error al desconectar' });
        }
      }
    },

    async disconnectMicrosoft() {
      if (confirm('¿Estás seguro de desconectar Microsoft Outlook?')) {
        try {
          await this.disconnectIntegration(this.microsoftIntegration.id);
          this.$notify({ type: 'success', message: 'Microsoft Outlook desconectado' });
        } catch (error) {
          this.$notify({ type: 'error', message: 'Error al desconectar' });
        }
      }
    },

    async syncGoogle() {
      await this.performSync();
    },

    async syncMicrosoft() {
      await this.performSync();
    },

    async performSync() {
      try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 2);

        await this.syncFromExternal({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

        this.$notify({ type: 'success', message: '✅ Sincronización completada' });
      } catch (error) {
        this.$notify({ type: 'error', message: '❌ Error al sincronizar' });
      }
    },

    toggleAutoSync() {
      // Implementar lógica de auto-sync si es necesario
      console.log('Auto-sync:', this.autoSync);
    },

    formatDate(date) {
      if (!date) return 'Nunca';
      return new Date(date).toLocaleString('es-ES');
    }
  }
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ecf0f1;
}

.dialog-header h3 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.dialog-body {
  padding: 20px;
}

.dialog-body > p {
  color: #666;
  margin-bottom: 20px;
}

.integration-card {
  border: 1px solid #ecf0f1;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
}

.integration-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.integration-info h4 {
  margin: 0 0 5px 0;
}

.integration-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: #ecf0f1;
  color: #7f8c8d;
}

.status-badge.connected {
  background: #d4edda;
  color: #155724;
}

.integration-details p {
  margin: 8px 0;
  font-size: 14px;
}

.integration-actions,
.integration-details {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.btn-connect {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-sync {
  padding: 8px 16px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-disconnect {
  padding: 8px 16px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.sync-settings {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.sync-settings h4 {
  margin-top: 0;
}

.sync-settings label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.sync-settings input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style>
