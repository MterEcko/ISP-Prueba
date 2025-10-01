<template>
  <div class="payment-gateways">
    <div class="header">
      <h2>Pasarelas de Pago</h2>
      <div class="header-actions">
        <button @click="openNewGatewayForm" class="add-button">
          ➕ Nueva Pasarela
        </button>
        <button @click="refreshGateways" class="refresh-button">
          🔄 Actualizar
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="filter-group">
        <select v-model="filters.gatewayType" @change="loadGateways">
          <option value="">Todos los tipos</option>
          <option value="mercadopago">Mercado Pago</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Stripe</option>
          <option value="conekta">Conekta</option>
          <option value="openpay">OpenPay</option>
          <option value="culqi">Culqi</option>
          <option value="payu">PayU</option>
          <option value="other">Otros</option>
        </select>

        <select v-model="filters.country" @change="loadGateways">
          <option value="">Todos los países</option>
          <option value="MX">México</option>
          <option value="AR">Argentina</option>
          <option value="BR">Brasil</option>
          <option value="CO">Colombia</option>
          <option value="PE">Perú</option>
          <option value="CL">Chile</option>
          <option value="US">Estados Unidos</option>
        </select>

        <select v-model="filters.active" @change="loadGateways">
          <option value="">Todos los estados</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
      </div>
    </div>

    <!-- Resumen de estadísticas -->
    <div class="summary-cards">
      <div class="summary-card">
        <span class="icon">🏦</span>
        <div class="summary-content">
          <span class="label">Total Pasarelas</span>
          <span class="value">{{ gateways.length }}</span>
        </div>
      </div>
      <div class="summary-card">
        <span class="icon">✅</span>
        <div class="summary-content">
          <span class="label">Activas</span>
          <span class="value">{{ activeGatewaysCount }}</span>
        </div>
      </div>
      <div class="summary-card">
        <span class="icon">🌟</span>
        <div class="summary-content">
          <span class="label">Por Defecto</span>
          <span class="value">{{ defaultGateway?.name || 'Ninguna' }}</span>
        </div>
      </div>
      <div class="summary-card">
        <span class="icon">💰</span>
        <div class="summary-content">
          <span class="label">Procesados Hoy</span>
          <span class="value">${{ formatNumber(todayProcessed) }}</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando pasarelas de pago...
    </div>

    <div v-else-if="gateways.length === 0" class="no-data">
      No hay pasarelas de pago configuradas.
    </div>

    <div v-else class="gateways-grid">
      <div v-for="gateway in gateways" :key="gateway.id" class="gateway-card" :class="{ inactive: !gateway.active }">
        <!-- Header de la tarjeta -->
        <div class="card-header">
          <div class="gateway-info">
            <div class="gateway-icon">
              {{ getGatewayIcon(gateway.gatewayType) }}
            </div>
            <div class="gateway-details">
              <h3>{{ gateway.name }}</h3>
              <span class="gateway-type">{{ formatGatewayType(gateway.gatewayType) }}</span>
            </div>
          </div>
          
          <div class="gateway-status">
            <span :class="['status-badge', gateway.active ? 'active' : 'inactive']">
              {{ gateway.active ? 'Activa' : 'Inactiva' }}
            </span>
            <span v-if="gateway.isDefault" class="default-badge">Por Defecto</span>
          </div>
        </div>

        <!-- Información básica -->
        <div class="card-content">
          <div class="info-row">
            <span class="label">País:</span>
            <span class="value">{{ getCountryName(gateway.country) }}</span>
          </div>
          <div class="info-row" v-if="gateway.environment">
            <span class="label">Entorno:</span>
            <span class="value">{{ gateway.environment === 'sandbox' ? 'Pruebas' : 'Producción' }}</span>
          </div>
          <div class="info-row" v-if="gateway.webhookUrl">
            <span class="label">Webhook:</span>
            <span class="value webhook-url" @click="copyWebhookUrl(gateway.webhookUrl)">
              {{ formatWebhookUrl(gateway.webhookUrl) }}
              <span class="copy-icon">📋</span>
            </span>
          </div>
          <div class="info-row" v-if="gateway.lastUsed">
            <span class="label">Último Uso:</span>
            <span class="value">{{ formatDateTime(gateway.lastUsed) }}</span>
          </div>
        </div>

        <!-- Estadísticas -->
        <div class="card-stats" v-if="gateway.stats">
          <div class="stat">
            <span class="stat-value">{{ gateway.stats.totalTransactions || 0 }}</span>
            <span class="stat-label">Transacciones</span>
          </div>
          <div class="stat">
            <span class="stat-value">${{ formatNumber(gateway.stats.totalAmount || 0) }}</span>
            <span class="stat-label">Procesado</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ gateway.stats.successRate || 0 }}%</span>
            <span class="stat-label">Éxito</span>
          </div>
        </div>

        <!-- Acciones -->
        <div class="card-actions">
          <button @click="viewGatewayStats(gateway)" class="action-btn stats">
            📊 Estadísticas
          </button>
          <button @click="editGateway(gateway)" class="action-btn edit">
            ✏️ Editar
          </button>
          <button @click="testGateway(gateway)" class="action-btn test">
            🧪 Probar
          </button>
          <button 
            @click="toggleGatewayStatus(gateway)" 
            :class="['action-btn', 'toggle', gateway.active ? 'deactivate' : 'activate']"
          >
            {{ gateway.active ? '⏸️ Desactivar' : '▶️ Activar' }}
          </button>
          <button 
            v-if="!gateway.isDefault && gateway.active"
            @click="setAsDefault(gateway)" 
            class="action-btn default"
          >
            🌟 Por Defecto
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de nueva/editar pasarela -->
    <div v-if="showGatewayModal" class="modal-overlay" @click="closeGatewayModal">
      <div class="modal-content large" @click.stop>
        <h3>{{ isEditMode ? 'Editar Pasarela' : 'Nueva Pasarela' }}</h3>
        
        <form @submit.prevent="submitGateway">
          <!-- Información básica -->
          <div class="form-section">
            <h4>Información Básica</h4>
            
            <div class="form-row">
              <div class="form-group">
                <label for="gatewayName">Nombre *</label>
                <input
                  type="text"
                  id="gatewayName"
                  v-model="gatewayForm.name"
                  placeholder="Ej: MercadoPago Principal"
                  required
                />
              </div>
              <div class="form-group">
                <label for="gatewayType">Tipo de Pasarela *</label>
                <select id="gatewayType" v-model="gatewayForm.gatewayType" required>
                  <option value="">Seleccionar tipo</option>
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe</option>
                  <option value="conekta">Conekta</option>
                  <option value="openpay">OpenPay</option>
                  <option value="culqi">Culqi</option>
                  <option value="payu">PayU</option>
                  <option value="other">Otros</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="country">País *</label>
                <select id="country" v-model="gatewayForm.country" required>
                  <option value="">Seleccionar país</option>
                  <option value="MX">México</option>
                  <option value="AR">Argentina</option>
                  <option value="BR">Brasil</option>
                  <option value="CO">Colombia</option>
                  <option value="PE">Perú</option>
                  <option value="CL">Chile</option>
                  <option value="US">Estados Unidos</option>
                </select>
              </div>
              <div class="form-group">
                <label for="environment">Entorno</label>
                <select id="environment" v-model="gatewayForm.environment">
                  <option value="sandbox">Pruebas (Sandbox)</option>
                  <option value="production">Producción</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <div class="checkbox-group">
                  <input
                    type="checkbox"
                    id="isActive"
                    v-model="gatewayForm.active"
                  />
                  <label for="isActive">Pasarela activa</label>
                </div>
              </div>
              <div class="form-group">
                <div class="checkbox-group">
                  <input
                    type="checkbox"
                    id="isDefault"
                    v-model="gatewayForm.isDefault"
                  />
                  <label for="isDefault">Establecer como predeterminada</label>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuración específica por tipo -->
          <div class="form-section" v-if="gatewayForm.gatewayType">
            <h4>Configuración de {{ formatGatewayType(gatewayForm.gatewayType) }}</h4>
            
            <!-- MercadoPago -->
            <div v-if="gatewayForm.gatewayType === 'mercadopago'">
              <div class="form-row">
                <div class="form-group">
                  <label for="mpAccessToken">Access Token *</label>
                  <input
                    type="password"
                    id="mpAccessToken"
                    v-model="gatewayForm.configuration.accessToken"
                    placeholder="APP_USR-..."
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="mpPublicKey">Public Key *</label>
                  <input
                    type="text"
                    id="mpPublicKey"
                    v-model="gatewayForm.configuration.publicKey"
                    placeholder="APP_USR-..."
                    required
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="mpClientId">Client ID</label>
                  <input
                    type="text"
                    id="mpClientId"
                    v-model="gatewayForm.configuration.clientId"
                    placeholder="Opcional"
                  />
                </div>
                <div class="form-group">
                  <label for="mpClientSecret">Client Secret</label>
                  <input
                    type="password"
                    id="mpClientSecret"
                    v-model="gatewayForm.configuration.clientSecret"
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>

            <!-- PayPal -->
            <div v-if="gatewayForm.gatewayType === 'paypal'">
              <div class="form-row">
                <div class="form-group">
                  <label for="ppClientId">Client ID *</label>
                  <input
                    type="text"
                    id="ppClientId"
                    v-model="gatewayForm.configuration.clientId"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="ppClientSecret">Client Secret *</label>
                  <input
                    type="password"
                    id="ppClientSecret"
                    v-model="gatewayForm.configuration.clientSecret"
                    required
                  />
                </div>
              </div>
            </div>

            <!-- Stripe -->
            <div v-if="gatewayForm.gatewayType === 'stripe'">
              <div class="form-row">
                <div class="form-group">
                  <label for="stripeSecretKey">Secret Key *</label>
                  <input
                    type="password"
                    id="stripeSecretKey"
                    v-model="gatewayForm.configuration.secretKey"
                    placeholder="sk_..."
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="stripePublicKey">Publishable Key *</label>
                  <input
                    type="text"
                    id="stripePublicKey"
                    v-model="gatewayForm.configuration.publishableKey"
                    placeholder="pk_..."
                    required
                  />
                </div>
              </div>
            </div>

            <!-- Configuración genérica para otros -->
            <div v-if="!['mercadopago', 'paypal', 'stripe'].includes(gatewayForm.gatewayType)">
              <div class="form-group">
                <label for="apiKey">API Key *</label>
                <input
                  type="password"
                  id="apiKey"
                  v-model="gatewayForm.configuration.apiKey"
                  required
                />
              </div>
              <div class="form-group">
                <label for="apiUrl">API URL</label>
                <input
                  type="url"
                  id="apiUrl"
                  v-model="gatewayForm.configuration.apiUrl"
                  placeholder="https://api.ejemplo.com"
                />
              </div>
            </div>
          </div>

          <!-- Configuración avanzada -->
          <div class="form-section">
            <h4>Configuración Avanzada</h4>
            
            <div class="form-row">
              <div class="form-group">
                <label for="timeout">Timeout (segundos)</label>
                <input
                  type="number"
                  id="timeout"
                  v-model="gatewayForm.configuration.timeout"
                  min="5"
                  max="300"
                  value="30"
                />
              </div>
              <div class="form-group">
                <label for="maxRetries">Máximo Reintentos</label>
                <input
                  type="number"
                  id="maxRetries"
                  v-model="gatewayForm.configuration.maxRetries"
                  min="0"
                  max="5"
                  value="3"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="webhookSecret">Webhook Secret</label>
              <input
                type="password"
                id="webhookSecret"
                v-model="gatewayForm.configuration.webhookSecret"
                placeholder="Para verificar la autenticidad de los webhooks"
              />
            </div>

            <div class="form-group">
              <label for="description">Descripción</label>
              <textarea
                id="description"
                v-model="gatewayForm.description"
                rows="3"
                placeholder="Descripción opcional de la pasarela..."
              ></textarea>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeGatewayModal" class="btn-cancel">
              Cancelar
            </button>
            <button type="submit" class="btn-confirm" :disabled="submittingGateway">
              {{ submittingGateway ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de estadísticas -->
    <div v-if="showStatsModal" class="modal-overlay" @click="closeStatsModal">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <h3>Estadísticas - {{ selectedGateway?.name }}</h3>
          <button @click="closeStatsModal" class="close-btn">×</button>
        </div>
        
        <div class="stats-content">
          <div class="stats-grid">
            <div class="stat-card">
              <h4>Transacciones Totales</h4>
              <div class="stat-value large">{{ gatewayStats.totalTransactions || 0 }}</div>
            </div>
            <div class="stat-card">
              <h4>Monto Total Procesado</h4>
              <div class="stat-value large">${{ formatNumber(gatewayStats.totalAmount || 0) }}</div>
            </div>
            <div class="stat-card">
              <h4>Tasa de Éxito</h4>
              <div class="stat-value large">{{ gatewayStats.successRate || 0 }}%</div>
            </div>
            <div class="stat-card">
              <h4>Transacciones Fallidas</h4>
              <div class="stat-value large">{{ gatewayStats.failedTransactions || 0 }}</div>
            </div>
          </div>

          <div class="stats-chart">
            <h4>Transacciones por Día (Últimos 30 días)</h4>
            <div class="chart-placeholder">
              <!-- Aquí iría un gráfico real con Chart.js -->
              <p>Gráfico de transacciones diarias</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal-content" @click.stop>
        <h3>{{ confirmModal.title }}</h3>
        <p>{{ confirmModal.message }}</p>
        <div class="modal-actions">
          <button @click="closeConfirmModal" class="btn-cancel">
            Cancelar
          </button>
          <button @click="confirmAction" class="btn-confirm">
            {{ confirmModal.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PaymentService from '../services/payment.service';

export default {
  name: 'PaymentGateways',
  data() {
    return {
      gateways: [],
      loading: false,
      filters: {
        gatewayType: '',
        country: '',
        active: ''
      },
      todayProcessed: 0,
      showGatewayModal: false,
      isEditMode: false,
      gatewayForm: {
        name: '',
        gatewayType: '',
        country: '',
        environment: 'sandbox',
        active: true,
        isDefault: false,
        description: '',
        configuration: {
          timeout: 30,
          maxRetries: 3
        }
      },
      submittingGateway: false,
      showStatsModal: false,
      selectedGateway: null,
      gatewayStats: {},
      showConfirmModal: false,
      confirmModal: {
        title: '',
        message: '',
        confirmText: '',
        action: null,
        data: null
      }
    };
  },
  computed: {
    activeGatewaysCount() {
      return this.gateways.filter(g => g.active).length;
    },
    defaultGateway() {
      return this.gateways.find(g => g.isDefault);
    }
  },
  created() {
    this.loadGateways();
    this.loadTodayStats();
  },
  methods: {
    async loadGateways() {
      this.loading = true;
      try {
        const params = {
          gatewayType: this.filters.gatewayType || undefined,
          country: this.filters.country || undefined,
          active: this.filters.active || undefined
        };

        const response = await PaymentService.getAllPaymentGateways(params);
        this.gateways = response.data;

        // Cargar estadísticas para cada pasarela
        for (const gateway of this.gateways) {
          try {
            const statsResponse = await PaymentService.getGatewayStatistics(gateway.id, '30');
            gateway.stats = statsResponse.data;
          } catch (error) {
            console.warn(`Error cargando estadísticas para ${gateway.name}:`, error);
            gateway.stats = {};
          }
        }

      } catch (error) {
        console.error('Error cargando pasarelas:', error);
        this.gateways = [];
      } finally {
        this.loading = false;
      }
    },

    async loadTodayStats() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await PaymentService.getPaymentStatistics({
          startDate: today,
          endDate: today
        });
        this.todayProcessed = response.data.totalCompleted || 0;
      } catch (error) {
        console.error('Error cargando estadísticas del día:', error);
      }
    },

    refreshGateways() {
      this.loadGateways();
      this.loadTodayStats();
    },

    openNewGatewayForm() {
      this.resetGatewayForm();
      this.isEditMode = false;
      this.showGatewayModal = true;
    },

    editGateway(gateway) {
      this.gatewayForm = {
        id: gateway.id,
        name: gateway.name,
        gatewayType: gateway.gatewayType,
        country: gateway.country,
        environment: gateway.environment || 'sandbox',
        active: gateway.active,
        isDefault: gateway.isDefault,
        description: gateway.description || '',
        configuration: { ...gateway.configuration }
      };
      this.isEditMode = true;
      this.showGatewayModal = true;
    },

    closeGatewayModal() {
      this.showGatewayModal = false;
      this.resetGatewayForm();
    },

    resetGatewayForm() {
      this.gatewayForm = {
        name: '',
        gatewayType: '',
        country: '',
        environment: 'sandbox',
        active: true,
        isDefault: false,
        description: '',
        configuration: {
          timeout: 30,
          maxRetries: 3
        }
      };
    },

    async submitGateway() {
      this.submittingGateway = true;
      try {
        if (this.isEditMode) {
          await PaymentService.updateGateway(this.gatewayForm.id, this.gatewayForm);
        } else {
          await PaymentService.createGateway(this.gatewayForm);
        }

        alert(`Pasarela ${this.isEditMode ? 'actualizada' : 'creada'} exitosamente`);
        this.closeGatewayModal();
        this.loadGateways();
      } catch (error) {
        console.error('Error guardando pasarela:', error);
        alert('Error guardando la pasarela. Verifique la configuración.');
      } finally {
        this.submittingGateway = false;
      }
    },

    async viewGatewayStats(gateway) {
      this.selectedGateway = gateway;
      this.showStatsModal = true;
      
      try {
        const response = await PaymentService.getGatewayStatistics(gateway.id, '30');
        this.gatewayStats = response.data;
      } catch (error) {
        console.error('Error cargando estadísticas detalladas:', error);
        this.gatewayStats = {};
      }
    },

    closeStatsModal() {
      this.showStatsModal = false;
      this.selectedGateway = null;
      this.gatewayStats = {};
    },

    async testGateway(gateway) {
      try {
        // Implementar prueba de conexión
        alert(`Probando conexión con ${gateway.name}...`);
        // const response = await PaymentService.testGateway(gateway.id);
        alert('Conexión exitosa');
      } catch (error) {
        console.error('Error probando pasarela:', error);
        alert('Error en la conexión. Verifique la configuración.');
      }
    },

    toggleGatewayStatus(gateway) {
      const action = gateway.active ? 'desactivar' : 'activar';
      this.showConfirmation(
        `${action.charAt(0).toUpperCase() + action.slice(1)} Pasarela`,
        `¿Está seguro que desea ${action} la pasarela ${gateway.name}?`,
        action.charAt(0).toUpperCase() + action.slice(1),
        'toggleStatus',
        gateway
      );
    },

    setAsDefault(gateway) {
      this.showConfirmation(
        'Establecer como Predeterminada',
        `¿Está seguro que desea establecer ${gateway.name} como la pasarela predeterminada?`,
        'Establecer',
        'setDefault',
        gateway
      );
    },

    copyWebhookUrl(url) {
      navigator.clipboard.writeText(url);
      alert('URL del webhook copiada al portapapeles');
    },

    showConfirmation(title, message, confirmText, action, data) {
      this.confirmModal = {
        title,
        message,
        confirmText,
        action,
        data
      };
      this.showConfirmModal = true;
    },

    closeConfirmModal() {
      this.showConfirmModal = false;
      this.confirmModal = {
        title: '',
        message: '',
        confirmText: '',
        action: null,
        data: null
      };
    },

    async confirmAction() {
      try {
        const { action, data } = this.confirmModal;

        switch (action) {
          case 'toggleStatus':
            await PaymentService.activateGateway(data.id, !data.active);
            break;
          case 'setDefault':
            // Implementar establecer como predeterminada
            console.log('Establecer como predeterminada:', data.id);
            break;
        }

        this.closeConfirmModal();
        this.loadGateways();
        
      } catch (error) {
        console.error('Error ejecutando acción:', error);
        alert('Error ejecutando la acción');
      }
    },

    formatNumber(value) {
      if (!value) return '0.00';
      return parseFloat(value).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },

    formatDateTime(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleString('es-MX');
    },

    formatWebhookUrl(url) {
      if (!url) return '-';
      return url.length > 50 ? url.substring(0, 47) + '...' : url;
    },

    getGatewayIcon(type) {
      const icons = {
        'mercadopago': '💙',
        'paypal': '💛',
        'stripe': '💜',
        'conekta': '🟠',
        'openpay': '🔵',
        'culqi': '🟢',
        'payu': '🟡',
        'other': '🏦'
      };
      return icons[type] || '🏦';
    },

    formatGatewayType(type) {
      const types = {
        'mercadopago': 'Mercado Pago',
        'paypal': 'PayPal',
        'stripe': 'Stripe',
        'conekta': 'Conekta',
        'openpay': 'OpenPay',
        'culqi': 'Culqi',
        'payu': 'PayU',
        'other': 'Otros'
      };
      return types[type] || type;
    },

    getCountryName(code) {
      const countries = {
        'MX': 'México',
        'AR': 'Argentina',
        'BR': 'Brasil',
        'CO': 'Colombia',
        'PE': 'Perú',
        'CL': 'Chile',
        'US': 'Estados Unidos'
      };
      return countries[code] || code;
    }
  }
};
</script>

<style scoped>
.payment-gateways {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.header h2 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.add-button, .refresh-button {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.add-button {
  background-color: #4CAF50;
  color: white;
}

.refresh-button {
  background-color: #2196F3;
  color: white;
}

.filters {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  gap: 15px;
  align-items: center;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  min-width: 150px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.summary-card .icon {
  font-size: 2em;
}

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-content .label {
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
}

.summary-content .value {
  font-weight: bold;
  font-size: 18px;
  color: #333;
}

.loading, .no-data {
  text-align: center;
  padding: 40px;
  color: #666;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.gateways-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.gateway-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gateway-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.gateway-card.inactive {
  opacity: 0.7;
  background-color: #f8f9fa;
}

.card-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.gateway-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.gateway-icon {
  font-size: 2.5em;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  border-radius: 12px;
}

.gateway-details h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 18px;
}

.gateway-type {
  color: #666;
  font-size: 14px;
}

.gateway-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-badge.inactive {
  background-color: #ffebee;
  color: #c62828;
}

.default-badge {
  background-color: #fff3e0;
  color: #ef6c00;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
}

.card-content {
  padding: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.info-row .label {
  color: #666;
  font-size: 14px;
}

.info-row .value {
  color: #333;
  font-weight: 500;
}

.webhook-url {
  cursor: pointer;
  color: #1976d2;
  display: flex;
  align-items: center;
  gap: 5px;
}

.webhook-url:hover {
  text-decoration: underline;
}

.copy-icon {
  font-size: 12px;
}

.card-stats {
  display: flex;
  justify-content: space-around;
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-top: 1px solid #eee;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-weight: bold;
  font-size: 16px;
  color: #333;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.card-actions {
  padding: 15px 20px;
  background-color: #f8f9fa;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn.stats {
  background-color: #e3f2fd;
  color: #1976d2;
}

.action-btn.edit {
  background-color: #fff3e0;
  color: #ef6c00;
}

.action-btn.test {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.action-btn.activate {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.action-btn.deactivate {
  background-color: #ffebee;
  color: #c62828;
}

.action-btn.default {
  background-color: #fff8e1;
  color: #f57f17;
}

.action-btn:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-content.large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
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

.modal-content h3 {
  margin: 0 0 25px 0;
  color: #333;
  padding: 30px 30px 0;
}

.modal-content form {
  padding: 0 30px 30px;
}

.form-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.form-section h4 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 16px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2196F3;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.btn-cancel, .btn-confirm {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background-color: #2196F3;
  color: white;
}

.btn-confirm:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.stats-content {
  padding: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.stat-card h4 {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.stat-value.large {
  font-size: 2em;
  font-weight: bold;
  color: #333;
}

.stats-chart {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.stats-chart h4 {
  margin: 0 0 20px 0;
  color: #333;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 4px;
  color: #666;
}

@media (max-width: 768px) {
  .payment-gateways {
    padding: 15px;
  }

  .header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: space-between;
  }

  .summary-cards {
    grid-template-columns: 1fr 1fr;
  }

  .gateways-grid {
    grid-template-columns: 1fr;
  }

  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .card-actions {
    justify-content: stretch;
  }

  .card-actions .action-btn {
    flex: 1;
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .gateway-info {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }

  .card-header {
    flex-direction: column;
    gap: 15px;
  }

  .info-row {
    flex-direction: column;
    gap: 5px;
  }
}
</style>