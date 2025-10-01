<template>
  <div class="client-service-container">
    <div class="card">
      <div class="card-header">
        <h3>Agregar Servicio al Cliente</h3>
      </div>

      <div class="card-body">
        <form @submit.prevent="saveService">
          <!-- Información del Cliente -->
          <div class="client-info mb-4">
            <h4>Información del Cliente</h4>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Nombre</label>
                  <input type="text" class="form-control" :value="client.name" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Identificación</label>
                  <input type="text" class="form-control" :value="client.identification" disabled>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Teléfono</label>
                  <input type="text" class="form-control" :value="client.phone" disabled>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Email</label>
                  <input type="text" class="form-control" :value="client.email" disabled>
                </div>
              </div>
            </div>
          </div>

          <!-- Selección de Paquete de Servicio -->
          <div class="service-package-selection mb-4">
            <h4>Paquete de Servicio</h4>
            <div class="row">
              <div class="col-md-12">
                <div class="form-group">
                  <label>Paquete</label>
                  <select v-model="serviceData.servicePackageId" class="form-control" @change="onServicePackageChange">
                    <option v-for="pkg in servicePackages" :key="pkg.id" :value="pkg.id">
                      {{ pkg.name }} - {{ formatCurrency(pkg.price) }} - {{ pkg.description }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
            <div class="row" v-if="selectedPackage">
              <div class="col-md-3">
                <div class="form-group">
                  <label>Velocidad de Descarga</label>
                  <div class="input-group">
                    <input type="text" class="form-control" :value="selectedPackage.downloadSpeed" disabled>
                    <div class="input-group-append">
                      <span class="input-group-text">Mbps</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Velocidad de Subida</label>
                  <div class="input-group">
                    <input type="text" class="form-control" :value="selectedPackage.uploadSpeed" disabled>
                    <div class="input-group-append">
                      <span class="input-group-text">Mbps</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Precio</label>
                  <div class="input-group">
                    <div class="input-group-prepend">
                      <span class="input-group-text">$</span>
                    </div>
                    <input type="text" class="form-control" :value="selectedPackage.price" disabled>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Ciclo de Facturación</label>
                  <input type="text" class="form-control" :value="getBillingCycleText(selectedPackage.billingCycle)" disabled>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuración de PPPoE -->
          <div class="pppoe-configuration mb-4">
            <h4>Configuración de PPPoE</h4>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Router Mikrotik</label>
                  <select v-model="serviceData.mikrotikRouterId" class="form-control" @change="onRouterChange">
                    <option v-for="router in mikrotikRouters" :key="router.id" :value="router.id">
                      {{ router.name }} - {{ router.ipAddress }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Perfil de Servicio</label>
                  <select v-model="serviceData.serviceProfileId" class="form-control">
                    <option v-for="profile in serviceProfiles" :key="profile.id" :value="profile.id">
                      {{ profile.name }} - {{ profile.downloadSpeed }}Mbps/{{ profile.uploadSpeed }}Mbps
                    </option>
                  </select>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Nombre de Usuario PPPoE</label>
                  <div class="input-group">
                    <input type="text" class="form-control" v-model="serviceData.pppoeUsername" placeholder="Nombre de usuario">
                    <div class="input-group-append">
                      <button class="btn btn-outline-secondary" type="button" @click="generateUsername">Generar</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Contraseña PPPoE</label>
                  <div class="input-group">
                    <input type="text" class="form-control" v-model="serviceData.pppoePassword" placeholder="Contraseña">
                    <div class="input-group-append">
                      <button class="btn btn-outline-secondary" type="button" @click="generatePassword">Generar</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Asignación de IP -->
          <div class="ip-assignment mb-4">
            <h4>Asignación de IP</h4>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Pool de IPs</label>
                  <select v-model="serviceData.ipPoolId" class="form-control" @change="loadAvailableIps">
                    <option v-for="pool in ipPools" :key="pool.id" :value="pool.id">
                      {{ pool.name }} - {{ pool.network }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>IP Estática</label>
                  <select v-model="serviceData.specificIp" class="form-control">
                    <option value="">Asignar automáticamente</option>
                    <option v-for="ip in availableIps" :key="ip.id" :value="ip.ipAddress">
                      {{ ip.ipAddress }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuración de Facturación -->
          <div class="billing-configuration mb-4">
            <h4>Configuración de Facturación</h4>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Método de Pago</label>
                  <select v-model="serviceData.paymentGatewayId" class="form-control">
                    <option v-for="gateway in paymentGateways" :key="gateway.id" :value="gateway.id">
                      {{ gateway.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Fecha de Inicio</label>
                  <input type="date" class="form-control" v-model="serviceData.startDate">
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Día de Facturación</label>
                  <select v-model="serviceData.billingDay" class="form-control">
                    <option v-for="day in 28" :key="day" :value="day">
                      {{ day }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-check mt-4">
                  <input type="checkbox" class="form-check-input" id="generateInvoice" v-model="serviceData.generateInvoice">
                  <label class="form-check-label" for="generateInvoice">Generar factura inmediatamente</label>
                </div>
              </div>
            </div>
          </div>

          <!-- Notas Adicionales -->
          <div class="additional-notes mb-4">
            <h4>Notas Adicionales</h4>
            <div class="form-group">
              <textarea class="form-control" v-model="serviceData.notes" rows="3" placeholder="Notas adicionales sobre el servicio..."></textarea>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="action-buttons">
            <button type="button" class="btn btn-secondary mr-2" @click="cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">Guardar Servicio</button>
          </div>
        </form>
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
import ipAssignmentService from '@/services/ip.assignment.service';

export default {
  name: 'ClientServiceForm',
  props: {
    clientId: {
      type: [Number, String],
      required: true
    }
  },
  data() {
    return {
      client: {},
      servicePackages: [],
      mikrotikRouters: [],
      serviceProfiles: [],
      ipPools: [],
      availableIps: [],
      paymentGateways: [],
      selectedPackage: null,
      loading: false,
      serviceData: {
        clientId: null,
        servicePackageId: null,
        mikrotikRouterId: null,
        serviceProfileId: null,
        pppoeUsername: '',
        pppoePassword: '',
        ipPoolId: null,
        specificIp: '',
        paymentGatewayId: null,
        startDate: new Date().toISOString().split('T')[0],
        billingDay: new Date().getDate(),
        generateInvoice: true,
        notes: ''
      }
    };
  },
  created() {
    this.serviceData.clientId = this.clientId;
    this.loadClient();
    this.loadServicePackages();
    this.loadMikrotikRouters();
    this.loadPaymentGateways();
  },
  methods: {
    formatDate,
    formatCurrency,
    async loadClient() {
      try {
        this.loading = true;
        const response = await axios.get(`${API_URL}/clients/${this.clientId}`, { headers: authHeader() });
        this.client = response.data;
      } catch (error) {
        console.error('Error al cargar cliente:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar información del cliente'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadServicePackages() {
      try {
        this.loading = true;
        const response = await axios.get(`${API_URL}/service-packages`, { headers: authHeader() });
        this.servicePackages = response.data;
      } catch (error) {
        console.error('Error al cargar paquetes de servicio:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar paquetes de servicio'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadMikrotikRouters() {
      try {
        this.loading = true;
        const response = await axios.get(`${API_URL}/mikrotik-routers`, { headers: authHeader() });
        this.mikrotikRouters = response.data;
        
        if (this.mikrotikRouters.length > 0) {
          this.serviceData.mikrotikRouterId = this.mikrotikRouters[0].id;
          this.onRouterChange();
        }
      } catch (error) {
        console.error('Error al cargar routers Mikrotik:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar routers Mikrotik'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadServiceProfiles() {
      if (!this.serviceData.mikrotikRouterId) return;
      
      try {
        this.loading = true;
        const response = await axios.get(
          `${API_URL}/mikrotik-routers/${this.serviceData.mikrotikRouterId}/profiles`,
          { headers: authHeader() }
        );
        this.serviceProfiles = response.data;
        
        if (this.serviceProfiles.length > 0) {
          // Intentar encontrar un perfil que coincida con el paquete seleccionado
          if (this.selectedPackage) {
            const matchingProfile = this.serviceProfiles.find(profile => 
              profile.downloadSpeed === this.selectedPackage.downloadSpeed && 
              profile.uploadSpeed === this.selectedPackage.uploadSpeed
            );
            
            if (matchingProfile) {
              this.serviceData.serviceProfileId = matchingProfile.id;
            } else {
              this.serviceData.serviceProfileId = this.serviceProfiles[0].id;
            }
          } else {
            this.serviceData.serviceProfileId = this.serviceProfiles[0].id;
          }
        }
      } catch (error) {
        console.error('Error al cargar perfiles de servicio:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar perfiles de servicio'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadIpPools() {
      if (!this.serviceData.mikrotikRouterId) return;
      
      try {
        this.loading = true;
        const response = await axios.get(
          `${API_URL}/mikrotik-routers/${this.serviceData.mikrotikRouterId}/ip-pools`,
          { headers: authHeader() }
        );
        this.ipPools = response.data;
        
        if (this.ipPools.length > 0) {
          this.serviceData.ipPoolId = this.ipPools[0].id;
          this.loadAvailableIps();
        }
      } catch (error) {
        console.error('Error al cargar pools de IPs:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar pools de IPs'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadAvailableIps() {
      if (!this.serviceData.ipPoolId) return;
      
      try {
        this.loading = true;
        const response = await ipAssignmentService.getAvailableIps(this.serviceData.ipPoolId);
        this.availableIps = response.data.items;
      } catch (error) {
        console.error('Error al cargar IPs disponibles:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar IPs disponibles'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadPaymentGateways() {
      try {
        this.loading = true;
        const response = await axios.get(`${API_URL}/payment-gateways`, { headers: authHeader() });
        this.paymentGateways = response.data;
        
        if (this.paymentGateways.length > 0) {
          this.serviceData.paymentGatewayId = this.paymentGateways[0].id;
        }
      } catch (error) {
        console.error('Error al cargar pasarelas de pago:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar pasarelas de pago'
        });
      } finally {
        this.loading = false;
      }
    },
    onServicePackageChange() {
      this.selectedPackage = this.servicePackages.find(pkg => pkg.id === this.serviceData.servicePackageId);
      
      // Si ya hay un router seleccionado, intentar encontrar un perfil que coincida
      if (this.serviceData.mikrotikRouterId && this.selectedPackage) {
        this.loadServiceProfiles();
      }
    },
    onRouterChange() {
      this.loadServiceProfiles();
      this.loadIpPools();
    },
    generateUsername() {
      // Generar nombre de usuario basado en el nombre del cliente y un número aleatorio
      if (this.client.name) {
        const baseName = this.client.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        this.serviceData.pppoeUsername = `${baseName}${randomNum}`;
      }
    },
    generatePassword() {
      // Generar contraseña aleatoria
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      this.serviceData.pppoePassword = password;
    },
    getBillingCycleText(cycle) {
      const cycleMap = {
        monthly: 'Mensual',
        quarterly: 'Trimestral',
        semiannual: 'Semestral',
        annual: 'Anual'
      };
      return cycleMap[cycle] || cycle;
    },
    async saveService() {
      // Validar campos requeridos
      if (!this.serviceData.servicePackageId) {
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Debe seleccionar un paquete de servicio'
        });
        return;
      }
      
      if (!this.serviceData.mikrotikRouterId) {
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Debe seleccionar un router Mikrotik'
        });
        return;
      }
      
      if (!this.serviceData.serviceProfileId) {
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Debe seleccionar un perfil de servicio'
        });
        return;
      }
      
      if (!this.serviceData.pppoeUsername) {
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Debe ingresar un nombre de usuario PPPoE'
        });
        return;
      }
      
      if (!this.serviceData.pppoePassword) {
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Debe ingresar una contraseña PPPoE'
        });
        return;
      }
      
      try {
        this.loading = true;
        const response = await axios.post(
          `${API_URL}/clients/${this.clientId}/services`,
          this.serviceData,
          { headers: authHeader() }
        );
        
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: 'Servicio agregado correctamente'
        });
        
        // Redirigir a la página de configuración del cliente
        this.$router.push({
          name: 'ClientDetail',
          params: { id: this.clientId },
          query: { tab: 'services', newServiceId: response.data.id }
        });
      } catch (error) {
        console.error('Error al guardar servicio:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Error al guardar servicio'
        });
      } finally {
        this.loading = false;
      }
    },
    cancel() {
      this.$router.push({
        name: 'ClientDetail',
        params: { id: this.clientId }
      });
    }
  }
};
</script>

<style scoped>
.client-service-container {
  padding: 20px;
}

h4 {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
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
</style>
