<template>
  <div class="payment-plugins-container">
    <div class="card">
      <div class="card-header">
        <h3>Plugins de Pago</h3>
        <div class="actions">
          <button class="btn btn-primary" @click="refreshData">
            <i class="fas fa-sync-alt"></i> Actualizar
          </button>
        </div>
      </div>

      <div class="card-body">
        <!-- Tabs para los diferentes plugins -->
        <ul class="nav nav-tabs" id="paymentPluginsTabs" role="tablist">
          <li class="nav-item" role="presentation" v-for="plugin in paymentPlugins" :key="plugin.name">
            <button class="nav-link" :class="{ active: activeTab === plugin.name }" 
                    :id="`${plugin.name}-tab`" 
                    data-toggle="tab" 
                    :data-target="`#${plugin.name}`" 
                    type="button" 
                    role="tab" 
                    :aria-controls="plugin.name" 
                    :aria-selected="activeTab === plugin.name"
                    @click="activeTab = plugin.name">
              {{ plugin.displayName }}
              <span class="badge" :class="getStatusBadgeClass(plugin.status)">{{ plugin.status }}</span>
            </button>
          </li>
        </ul>

        <!-- Contenido de los tabs -->
        <div class="tab-content" id="paymentPluginsTabsContent">
          <!-- MercadoPago -->
          <div class="tab-pane fade" :class="{ 'show active': activeTab === 'mercadopago' }" id="mercadopago" role="tabpanel" aria-labelledby="mercadopago-tab">
            <div class="plugin-config mt-4" v-if="configs.mercadopago">
              <h4>Configuración de MercadoPago</h4>
              <form @submit.prevent="saveConfig('mercadopago')">
                <div class="form-group">
                  <label>Access Token</label>
                  <input type="password" class="form-control" v-model="configs.mercadopago.accessToken" placeholder="TEST-0000000000000000-000000-00000000000000000000000000000000-000000000">
                  <small class="form-text text-muted">Token de acceso de MercadoPago</small>
                </div>
                <div class="form-group">
                  <label>País</label>
                  <select class="form-control" v-model="configs.mercadopago.country">
                    <option value="AR">Argentina</option>
                    <option value="BR">Brasil</option>
                    <option value="CL">Chile</option>
                    <option value="CO">Colombia</option>
                    <option value="MX">México</option>
                    <option value="PE">Perú</option>
                    <option value="UY">Uruguay</option>
                  </select>
                  <small class="form-text text-muted">País donde opera MercadoPago</small>
                </div>
                <div class="form-group">
                  <label>Días de Expiración</label>
                  <input type="number" class="form-control" v-model.number="configs.mercadopago.expirationDays" min="1" max="30">
                  <small class="form-text text-muted">Días antes de que expire un link de pago</small>
                </div>
                <div class="form-check mb-3">
                  <input type="checkbox" class="form-check-input" id="mpNotifyCustomer" v-model="configs.mercadopago.notifyCustomer">
                  <label class="form-check-label" for="mpNotifyCustomer">Notificar al cliente</label>
                </div>
                <div class="form-group">
                  <label>URL de Webhook (opcional)</label>
                  <input type="text" class="form-control" v-model="configs.mercadopago.webhookUrl" :placeholder="`${baseUrl}/api/plugins/mercadopago/webhook`">
                  <small class="form-text text-muted">URL para recibir notificaciones de pago</small>
                </div>
                <div class="form-check mb-3">
                  <input type="checkbox" class="form-check-input" id="mpSandbox" v-model="configs.mercadopago.sandbox">
                  <label class="form-check-label" for="mpSandbox">Modo Sandbox (Pruebas)</label>
                </div>
                <button type="submit" class="btn btn-primary" :disabled="loading">Guardar Configuración</button>
              </form>
            </div>
          </div>

          <!-- OpenPay -->
          <div class="tab-pane fade" :class="{ 'show active': activeTab === 'openpay' }" id="openpay" role="tabpanel" aria-labelledby="openpay-tab">
            <div class="plugin-config mt-4" v-if="configs.openpay">
              <h4>Configuración de Openpay</h4>
              <form @submit.prevent="saveConfig('openpay')">
                <div class="form-group">
                  <label>Merchant ID</label>
                  <input type="text" class="form-control" v-model="configs.openpay.merchantId" placeholder="mxxxxxxxxxxxxxxxxxx">
                  <small class="form-text text-muted">ID de comercio de Openpay</small>
                </div>
                <div class="form-group">
                  <label>Private Key</label>
                  <input type="password" class="form-control" v-model="configs.openpay.privateKey" placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                  <small class="form-text text-muted">Llave privada de Openpay</small>
                </div>
                <div class="form-group">
                  <label>Public Key</label>
                  <input type="text" class="form-control" v-model="configs.openpay.publicKey" placeholder="pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                  <small class="form-text text-muted">Llave pública de Openpay</small>
                </div>
                <div class="form-check mb-3">
                  <input type="checkbox" class="form-check-input" id="opSandboxMode" v-model="configs.openpay.sandboxMode">
                  <label class="form-check-label" for="opSandboxMode">Modo Sandbox (Pruebas)</label>
                </div>
                <div class="form-group">
                  <label>País</label>
                  <select class="form-control" v-model="configs.openpay.country">
                    <option value="MX">México</option>
                    <option value="CO">Colombia</option>
                    <option value="PE">Perú</option>
                  </select>
                  <small class="form-text text-muted">País donde opera Openpay</small>
                </div>
                <div class="form-check mb-3">
                  <input type="checkbox" class="form-check-input" id="opEnableCards" v-model="configs.openpay.enableCards">
                  <label class="form-check-label" for="opEnableCards">Habilitar pagos con tarjeta</label>
                </div>
                <div class="form-check mb-3">
                  <input type="checkbox" class="form-check-input" id="opEnableStores" v-model="configs.openpay.enableStores">
                  <label class="form-check-label" for="opEnableStores">Habilitar pago en tiendas</label>
                </div>
                <div class="form-check mb-3">
                  <input type="checkbox" class="form-check-input" id="opEnableBanks" v-model="configs.openpay.enableBanks">
                  <label class="form-check-label" for="opEnableBanks">Habilitar transferencia bancaria</label>
                </div>
                <div class="form-group">
                  <label>Días de Expiración</label>
                  <input type="number" class="form-control" v-model.number="configs.openpay.expirationDays" min="1" max="30">
                  <small class="form-text text-muted">Días antes de que expire un cargo</small>
                </div>
                <div class="form-group">
                  <label>URL de Webhook (opcional)</label>
                  <input type="text" class="form-control" v-model="configs.openpay.webhookUrl" :placeholder="`${baseUrl}/api/plugins/openpay/webhook`">
                  <small class="form-text text-muted">URL para recibir notificaciones de pago</small>
                </div>
                <button type="submit" class="btn btn-primary" :disabled="loading">Guardar Configuración</button>
              </form>
            </div>
          </div>

          <!-- PayPal -->
          <div class="tab-pane fade" :class="{ 'show active': activeTab === 'paypal' }" id="paypal" role="tabpanel" aria-labelledby="paypal-tab">
            <div class="plugin-config mt-4" v-if="configs.paypal">
              <h4>Configuración de PayPal</h4>
              <form @submit.prevent="saveConfig('paypal')">
                <div class="form-group">
                  <label>Client ID</label>
                  <input type="text" class="form-control" v-model="configs.paypal.clientId" placeholder="AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                  <small class="form-text text-muted">Client ID de PayPal</small>
                </div>
                <div class="form-group">
                  <label>Client Secret</label>
                  <input type="text" class="form-control" v-model="configs.paypal.clientSecret" placeholder="EBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                  <small class="form-text text-muted">Client Secret de PayPal</small>
                </div>
                <div class="form-group">
                  <label>Moneda</label>
                  <select class="form-control" v-model="configs.paypal.currency">
                    <option value="USD">USD - Dólar Estadounidense</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="GBP">GBP - Libra Esterlina</option>
                    <option value="CAD">CAD - Dólar Canadiense</option>
                    <option value="AUD">AUD - Dólar Australiano</option>
                    <option value="BRL">BRL - Real Brasileño</option>
                  </select>
                  <small class="form-text text-muted">Moneda para transacciones</small>
                </div>
                <div class="form-group">
                  <label>URL de Retorno (Éxito)</label>
                  <input type="text" class="form-control" v-model="configs.paypal.returnUrl" :placeholder="`${baseUrl}/payment/success`">
                  <small class="form-text text-muted">URL a la que se redirige después de un pago exitoso</small>
                </div>
                <div class="form-group">
                  <label>URL de Retorno (Cancelación)</label>
                  <input type="text" class="form-control" v-model="configs.paypal.cancelUrl" :placeholder="`${baseUrl}/payment/cancel`">
                  <small class="form-text text-muted">URL a la que se redirige después de cancelar un pago</small>
                </div>
                <div class="form-group">
                  <label>Webhook ID (opcional)</label>
                  <input type="text" class="form-control" v-model="configs.paypal.webhookId">
                  <small class="form-text text-muted">ID del webhook configurado en PayPal</small>
                </div>
                <div class="form-check mb-3">
                  <input type="checkbox" class="form-check-input" id="ppTestMode" v-model="configs.paypal.testMode">
                  <label class="form-check-label" for="ppTestMode">Modo de Prueba (Sandbox)</label>
                </div>
                <button type="submit" class="btn btn-primary" :disabled="loading">Guardar Configuración</button>
              </form>
            </div>
          </div>

          <!-- Stripe -->
          <div class="tab-pane fade" :class="{ 'show active': activeTab === 'stripe' }" id="stripe" role="tabpanel" aria-labelledby="stripe-tab">
            <div class="plugin-config mt-4" v-if="configs.stripe">
              <h4>Configuración de Stripe</h4>
              <form @submit.prevent="saveConfig('stripe')">
                <div class="form-group">
                  <label>Publishable Key</label>
                  <input type="text" class="form-control" v-model="configs.stripe.publishableKey" placeholder="pk_...">
                  <small class="form-text text-muted">Clave pública de Stripe</small>
                </div>
                <div class="form-group">
                  <label>Secret Key</label>
                  <input type="password" class="form-control" v-model="configs.stripe.secretKey" placeholder="sk_...">
                  <small class="form-text text-muted">Clave secreta de Stripe</small>
                </div>
                <div class="form-group">
                  <label>Moneda</label>
                  <select class="form-control" v-model="configs.stripe.currency">
                    <option value="USD">USD - Dólar Estadounidense</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="GBP">GBP - Libra Esterlina</option>
                    <option value="CAD">CAD - Dólar Canadiense</option>
                    <option value="AUD">AUD - Dólar Australiano</option>
                    <option value="BRL">BRL - Real Brasileño</option>
                    <option value="JPY">JPY - Yen Japonés</option>
                    <option value="CNY">CNY - Yuan Chino</option>
                  </select>
                  <small class="form-text text-muted">Moneda para transacciones</small>
                </div>
                <div class="form-group">
                  <label>Nombre de la Empresa</label>
                  <input type="text" class="form-control" v-model="configs.stripe.companyName">
                  <small class="form-text text-muted">Aparecerá en los recibos de Stripe</small>
                </div>
                <div class="form-check mb-3">
                  <input type="checkbox" class="form-check-input" id="stripeCapturePayments" v-model="configs.stripe.capturePayments">
                  <label class="form-check-label" for="stripeCapturePayments">Capturar pagos automáticamente</label>
                </div>
                <div class="form-group">
                  <label>Webhook Secret (opcional)</label>
                  <input type="password" class="form-control" v-model="configs.stripe.webhookSecret" placeholder="whsec_...">
                  <small class="form-text text-muted">Secret del webhook para verificar eventos</small>
                </div>
                <div class="form-group">
                  <label>URL de Webhook (informativa)</label>
                  <input type="text" class="form-control" :value="`${baseUrl}/api/plugins/stripe/webhook`" readonly>
                  <small class="form-text text-muted">Configura esta URL en tu dashboard de Stripe</small>
                </div>
                <div class="form-check mb-3">
                  <input type="checkbox" class="form-check-input" id="stripeTestMode" v-model="configs.stripe.testMode">
                  <label class="form-check-label" for="stripeTestMode">Modo de Pruebas</label>
                </div>
                <button type="submit" class="btn btn-primary" :disabled="loading">Guardar Configuración</button>
              </form>
            </div>
          </div>
        </div>

        <!-- Sección de Suscripciones -->
        <div class="subscriptions-section mt-5">
          <h4>Suscripciones Activas</h4>
          <div class="table-responsive">
            <table class="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Paquete</th>
                  <th>Inicio</th>
                  <th>Próxima Renovación</th>
                  <th>Estado</th>
                  <th>Pasarela</th>
                  <th>Precio</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="subscription in subscriptions" :key="subscription.id">
                  <td>
                    <router-link :to="{ name: 'ClientDetail', params: { id: subscription.clientId } }">
                      {{ subscription.Client ? subscription.Client.name : `Cliente #${subscription.clientId}` }}
                    </router-link>
                  </td>
                  <td>{{ subscription.ServicePackage ? subscription.ServicePackage.name : `Paquete #${subscription.servicePackageId}` }}</td>
                  <td>{{ formatDate(subscription.startDate) }}</td>
                  <td>{{ formatDate(subscription.renewalDate) }}</td>
                  <td>
                    <span :class="getSubscriptionStatusBadgeClass(subscription.status)">
                      {{ getSubscriptionStatusText(subscription.status) }}
                    </span>
                  </td>
                  <td>{{ subscription.PaymentGateway ? subscription.PaymentGateway.name : `Pasarela #${subscription.gatewayId}` }}</td>
                  <td>{{ formatCurrency(subscription.price) }}</td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-sm btn-info" @click="checkSubscriptionStatus(subscription)">
                        <i class="fas fa-sync-alt"></i>
                      </button>
                      <button v-if="subscription.status === 'active'" class="btn btn-sm btn-warning" @click="suspendSubscription(subscription)">
                        <i class="fas fa-pause"></i>
                      </button>
                      <button v-if="subscription.status === 'suspended'" class="btn btn-sm btn-success" @click="activateSubscription(subscription)">
                        <i class="fas fa-play"></i>
                      </button>
                      <button class="btn btn-sm btn-danger" @click="cancelSubscription(subscription)">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="subscriptions.length === 0">
                  <td colspan="8" class="text-center">No hay suscripciones activas</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para cancelar suscripción -->
    <div class="modal" :class="{ 'show d-block': showCancelModal }" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cancelar Suscripción</h5>
            <button type="button" class="close" @click="showCancelModal = false">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body" v-if="selectedSubscription">
            <p>¿Está seguro de cancelar la suscripción del cliente <strong>{{ selectedSubscription.Client ? selectedSubscription.Client.name : `#${selectedSubscription.clientId}` }}</strong> al paquete <strong>{{ selectedSubscription.ServicePackage ? selectedSubscription.ServicePackage.name : `#${selectedSubscription.servicePackageId}` }}</strong>?</p>
            <div class="form-group">
              <label>Motivo de cancelación</label>
              <textarea v-model="cancelReason" class="form-control" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCancelModal = false">Cancelar</button>
            <button type="button" class="btn btn-danger" @click="confirmCancelSubscription" :disabled="loading">Confirmar Cancelación</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para suspender suscripción -->
    <div class="modal" :class="{ 'show d-block': showSuspendModal }" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Suspender Suscripción</h5>
            <button type="button" class="close" @click="showSuspendModal = false">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body" v-if="selectedSubscription">
            <p>¿Está seguro de suspender la suscripción del cliente <strong>{{ selectedSubscription.Client ? selectedSubscription.Client.name : `#${selectedSubscription.clientId}` }}</strong> al paquete <strong>{{ selectedSubscription.ServicePackage ? selectedSubscription.ServicePackage.name : `#${selectedSubscription.servicePackageId}` }}</strong>?</p>
            <div class="form-group">
              <label>Motivo de suspensión</label>
              <textarea v-model="suspendReason" class="form-control" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showSuspendModal = false">Cancelar</button>
            <button type="button" class="btn btn-warning" @click="confirmSuspendSubscription" :disabled="loading">Confirmar Suspensión</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay para operaciones -->
    <div class="loading-overlay" v-if="loading">
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only">Cargando...</span>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import authHeader from '@/services/auth-header';
import { API_URL } from '@/services/frontend_apiConfig';
import { formatDate, formatCurrency } from '@/utils/formatters';

export default {
  name: 'PaymentPluginsView',
  data() {
    return {
      activeTab: 'mercadopago',
      paymentPlugins: [],
      subscriptions: [],
      configs: {
        mercadopago: {
          accessToken: '',
          country: 'MX',
          expirationDays: 7,
          notifyCustomer: true,
          webhookUrl: '',
          sandbox: false
        },
        openpay: {
          merchantId: '',
          privateKey: '',
          publicKey: '',
          sandboxMode: false,
          country: 'MX',
          enableCards: true,
          enableStores: true,
          enableBanks: true,
          expirationDays: 7,
          webhookUrl: ''
        },
        paypal: {
          clientId: '',
          clientSecret: '',
          currency: 'USD',
          returnUrl: '',
          cancelUrl: '',
          webhookId: '',
          testMode: false
        },
        stripe: {
          publishableKey: '',
          secretKey: '',
          currency: 'USD',
          companyName: '',
          capturePayments: true,
          webhookSecret: '',
          webhookUrl: '',
          testMode: false
        }
      },
      loading: false,
      baseUrl: window.location.origin,
      showCancelModal: false,
      showSuspendModal: false,
      selectedSubscription: null,
      cancelReason: '',
      suspendReason: ''
    };
  },
  created() {
    this.loadPlugins();
    this.loadSubscriptions();
  },
  methods: {
    formatDate,
    formatCurrency,
    async loadPlugins() {
      try {
        this.loading = true;
        const response = await axios.get(`${API_URL}/system-plugins?type=payment`, { headers: authHeader() });
        this.paymentPlugins = response.data;
        
        // Cargar configuraciones de cada plugin
        for (const plugin of this.paymentPlugins) {
          await this.loadPluginConfig(plugin.name);
        }
        
        // Establecer el primer plugin como activo si no hay ninguno seleccionado
        if (this.paymentPlugins.length > 0 && !this.activeTab) {
          this.activeTab = this.paymentPlugins[0].name;
        }
      } catch (error) {
        console.error('Error al cargar plugins de pago:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar plugins de pago'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadPluginConfig(pluginName) {
      try {
        const response = await axios.get(`${API_URL}/payment/${pluginName}/config`, { headers: authHeader() });
        this.configs[pluginName] = response.data;
      } catch (error) {
        console.error(`Error al cargar configuración de ${pluginName}:`, error);
        // No mostrar notificación, ya que es posible que el plugin no esté configurado
      }
    },
    async saveConfig(pluginName) {
      try {
        this.loading = true;
        await axios.post(
          `${API_URL}/payment/${pluginName}/config`,
          this.configs[pluginName],
          { headers: authHeader() }
        );
        
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: `Configuración de ${this.getPluginDisplayName(pluginName)} guardada correctamente`
        });
        
        // Recargar plugins para actualizar estado
        await this.loadPlugins();
      } catch (error) {
        console.error(`Error al guardar configuración de ${pluginName}:`, error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: `Error al guardar configuración de ${this.getPluginDisplayName(pluginName)}`
        });
      } finally {
        this.loading = false;
      }
    },
    getPluginDisplayName(pluginName) {
      const plugin = this.paymentPlugins.find(p => p.name === pluginName);
      return plugin ? plugin.displayName : pluginName;
    },
    getStatusBadgeClass(status) {
      const classMap = {
        active: 'badge-success',
        inactive: 'badge-secondary',
        error: 'badge-danger'
      };
      return `badge ${classMap[status] || 'badge-secondary'}`;
    },
    async loadSubscriptions() {
      try {
        this.loading = true;
        const response = await axios.get(`${API_URL}/subscriptions`, { headers: authHeader() });
        this.subscriptions = response.data;
      } catch (error) {
        console.error('Error al cargar suscripciones:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar suscripciones'
        });
      } finally {
        this.loading = false;
      }
    },
    getSubscriptionStatusText(status) {
      const statusMap = {
        active: 'Activa',
        pending: 'Pendiente',
        suspended: 'Suspendida',
        cancelled: 'Cancelada',
        expired: 'Expirada'
      };
      return statusMap[status] || status;
    },
    getSubscriptionStatusBadgeClass(status) {
      const classMap = {
        active: 'badge badge-success',
        pending: 'badge badge-warning',
        suspended: 'badge badge-info',
        cancelled: 'badge badge-danger',
        expired: 'badge badge-secondary'
      };
      return classMap[status] || 'badge badge-secondary';
    },
    async checkSubscriptionStatus(subscription) {
      try {
        this.loading = true;
        const response = await axios.get(
          `${API_URL}/payment/${subscription.PaymentGateway.pluginName}/subscriptions/${subscription.id}/status`,
          { headers: authHeader() }
        );
        
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Estado de Suscripción',
          text: `Estado: ${this.getSubscriptionStatusText(response.data.status)}`
        });
        
        // Recargar suscripciones para actualizar estado
        await this.loadSubscriptions();
      } catch (error) {
        console.error('Error al verificar estado de suscripción:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al verificar estado de suscripción'
        });
      } finally {
        this.loading = false;
      }
    },
    cancelSubscription(subscription) {
      this.selectedSubscription = subscription;
      this.cancelReason = '';
      this.showCancelModal = true;
    },
    async confirmCancelSubscription() {
      try {
        this.loading = true;
        await axios.post(
          `${API_URL}/payment/${this.selectedSubscription.PaymentGateway.pluginName}/subscriptions/${this.selectedSubscription.id}/cancel`,
          { reason: this.cancelReason },
          { headers: authHeader() }
        );
        
        this.showCancelModal = false;
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: 'Suscripción cancelada correctamente'
        });
        
        // Recargar suscripciones
        await this.loadSubscriptions();
      } catch (error) {
        console.error('Error al cancelar suscripción:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cancelar suscripción'
        });
      } finally {
        this.loading = false;
      }
    },
    suspendSubscription(subscription) {
      this.selectedSubscription = subscription;
      this.suspendReason = '';
      this.showSuspendModal = true;
    },
    async confirmSuspendSubscription() {
      try {
        this.loading = true;
        await axios.post(
          `${API_URL}/payment/${this.selectedSubscription.PaymentGateway.pluginName}/subscriptions/${this.selectedSubscription.id}/suspend`,
          { reason: this.suspendReason },
          { headers: authHeader() }
        );
        
        this.showSuspendModal = false;
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: 'Suscripción suspendida correctamente'
        });
        
        // Recargar suscripciones
        await this.loadSubscriptions();
      } catch (error) {
        console.error('Error al suspender suscripción:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al suspender suscripción'
        });
      } finally {
        this.loading = false;
      }
    },
    async activateSubscription(subscription) {
      try {
        this.loading = true;
        await axios.post(
          `${API_URL}/payment/${subscription.PaymentGateway.pluginName}/subscriptions/${subscription.id}/activate`,
          {},
          { headers: authHeader() }
        );
        
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: 'Suscripción activada correctamente'
        });
        
        // Recargar suscripciones
        await this.loadSubscriptions();
      } catch (error) {
        console.error('Error al activar suscripción:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al activar suscripción'
        });
      } finally {
        this.loading = false;
      }
    },
    refreshData() {
      this.loadPlugins();
      this.loadSubscriptions();
    }
  }
};
</script>

<style scoped>
.payment-plugins-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions {
  display: flex;
  gap: 10px;
}

.plugin-config {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal.show {
  display: block;
}

.nav-link .badge {
  margin-left: 5px;
}
</style>
