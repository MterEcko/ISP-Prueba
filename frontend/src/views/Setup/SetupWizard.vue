<template>
  <div class="setup-wizard">
    <div class="setup-container">
      <div class="setup-header">
        <h1>🚀 Configuración Inicial del Sistema ISP</h1>
        <p>Complete los siguientes pasos para configurar su sistema</p>
        <div class="progress-bar">
          <div class="progress" :style="{ width: progress + '%' }"></div>
        </div>
        <p class="progress-text">{{ progress }}% completado</p>
      </div>

      <div class="setup-steps">
        <!-- Step 1: Company Info -->
        <div v-show="currentStep === 1" class="step">
          <h2>📋 Información de la Empresa</h2>
          <form @submit.prevent="saveCompanyInfo">
            <div class="form-group">
              <label>Nombre de la Empresa *</label>
              <input v-model="companyData.companyName" type="text" required />
            </div>
            <div class="form-group">
              <label>Email *</label>
              <input v-model="companyData.companyEmail" type="email" required />
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input v-model="companyData.companyPhone" type="tel" />
            </div>
            <div class="form-group">
              <label>Dirección</label>
              <textarea v-model="companyData.companyAddress" rows="3"></textarea>
            </div>

            <div class="step-actions">
              <button type="submit" class="btn-primary">Siguiente →</button>
            </div>
          </form>
        </div>

        <!-- Step 2: Logo -->
        <div v-show="currentStep === 2" class="step">
          <h2>🎨 Logo de la Empresa</h2>
          <div class="logo-upload">
            <div v-if="logoPreview" class="logo-preview">
              <img :src="logoPreview" alt="Logo" />
            </div>
            <input type="file" @change="handleLogoUpload" accept="image/*" />
            <p class="help-text">Formatos: PNG, JPG, SVG (máx. 5MB)</p>
          </div>

          <div class="step-actions">
            <button @click="currentStep--" class="btn-secondary">← Atrás</button>
            <button @click="uploadLogo" class="btn-primary">Siguiente →</button>
          </div>
        </div>

        <!-- Step 3: Client Segmentation -->
        <div v-show="currentStep === 3" class="step">
          <h2>📊 Segmentación de Clientes</h2>
          <p>Configure cómo desea organizar a sus clientes</p>

          <div class="form-group">
            <label>
              <input type="checkbox" v-model="segmentationData.enabled" />
              Habilitar segmentación automática
            </label>
          </div>

          <div v-if="segmentationData.enabled" class="segments-config">
            <h3>Segmentos</h3>
            <div v-for="(segment, index) in segmentationData.segments" :key="index" class="segment-item">
              <input v-model="segment.name" placeholder="Nombre del segmento" />
              <input v-model="segment.color" type="color" />
              <label>
                <input type="checkbox" v-model="segment.autoMove" />
                Mover automáticamente
              </label>
              <input
                v-if="segment.autoMove"
                v-model.number="segment.daysOverdue"
                type="number"
                placeholder="Días de retraso"
              />
              <button @click="removeSegment(index)" class="btn-danger">×</button>
            </div>
            <button @click="addSegment" class="btn-secondary">+ Agregar Segmento</button>
          </div>

          <div class="step-actions">
            <button @click="currentStep--" class="btn-secondary">← Atrás</button>
            <button @click="saveSegmentation" class="btn-primary">Siguiente →</button>
          </div>
        </div>

        <!-- Step 4: Webhooks -->
        <div v-show="currentStep === 4" class="step">
          <h2>🔗 Configuración de Webhooks</h2>
          <p>Integre con n8n para automatizar procesos</p>

          <div class="form-group">
            <label>
              <input type="checkbox" v-model="webhooksData.enabled" />
              Habilitar webhooks
            </label>
          </div>

          <div v-if="webhooksData.enabled">
            <div class="form-group">
              <label>URL de n8n</label>
              <input v-model="webhooksData.n8nUrl" type="url" placeholder="https://n8n.example.com/webhook" />
            </div>

            <div class="form-group">
              <label>Eventos que disparan webhooks:</label>
              <div class="checkbox-group">
                <label><input type="checkbox" value="client_created" v-model="webhooksData.triggers" /> Cliente creado</label>
                <label><input type="checkbox" value="payment_received" v-model="webhooksData.triggers" /> Pago recibido</label>
                <label><input type="checkbox" value="service_suspended" v-model="webhooksData.triggers" /> Servicio suspendido</label>
                <label><input type="checkbox" value="ticket_created" v-model="webhooksData.triggers" /> Ticket creado</label>
                <label><input type="checkbox" value="invoice_generated" v-model="webhooksData.triggers" /> Factura generada</label>
              </div>
            </div>
          </div>

          <div class="step-actions">
            <button @click="currentStep--" class="btn-secondary">← Atrás</button>
            <button @click="saveWebhooks" class="btn-primary">Siguiente →</button>
          </div>
        </div>

        <!-- Step 5: Payment Gateways -->
        <div v-show="currentStep === 5" class="step">
          <h2>💳 Pasarelas de Pago</h2>
          <p>Configure los métodos de pago que aceptará</p>

          <div v-for="(gateway, index) in paymentData.gateways" :key="index" class="gateway-config">
            <h3>{{ gateway.name }}</h3>
            <label>
              <input type="checkbox" v-model="gateway.enabled" />
              Habilitar {{ gateway.name }}
            </label>
            <div v-if="gateway.enabled" class="credentials">
              <input v-model="gateway.credentials.clientId" placeholder="Client ID / API Key" />
              <input v-model="gateway.credentials.secret" type="password" placeholder="Secret / API Secret" />
            </div>
          </div>

          <div class="step-actions">
            <button @click="currentStep--" class="btn-secondary">← Atrás</button>
            <button @click="savePaymentGateways" class="btn-primary">Siguiente →</button>
          </div>
        </div>

        <!-- Step 6: MikroTik -->
        <div v-show="currentStep === 6" class="step">
          <h2>📡 Configuración de MikroTik</h2>

          <div class="form-group">
            <label>
              <input type="checkbox" v-model="mikrotikData.mockMode" />
              Usar modo de simulación (sin hardware)
            </label>
            <p class="help-text">Útil para pruebas sin acceso a routers reales</p>
          </div>

          <div v-if="!mikrotikData.mockMode">
            <h3>Routers</h3>
            <div v-for="(router, index) in mikrotikData.routers" :key="index" class="router-config">
              <input v-model="router.name" placeholder="Nombre del router" />
              <input v-model="router.ipAddress" placeholder="IP Address" />
              <input v-model.number="router.apiPort" placeholder="Puerto API (8728)" type="number" />
              <input v-model="router.username" placeholder="Usuario" />
              <input v-model="router.password" type="password" placeholder="Contraseña" />
              <button @click="removeRouter(index)" class="btn-danger">×</button>
            </div>
            <button @click="addRouter" class="btn-secondary">+ Agregar Router</button>
          </div>

          <div class="step-actions">
            <button @click="currentStep--" class="btn-secondary">← Atrás</button>
            <button @click="saveMikrotik" class="btn-primary">Siguiente →</button>
          </div>
        </div>

        <!-- Step 7: Complete -->
        <div v-show="currentStep === 7" class="step">
          <div class="setup-complete">
            <h2>✅ Configuración Completada</h2>
            <p>Su sistema está listo para usar</p>
            <ul class="completion-summary">
              <li v-if="setupStatus.company?.completed">✓ Información de empresa configurada</li>
              <li v-if="setupStatus.logo?.completed">✓ Logo subido</li>
              <li v-if="setupStatus.segmentation?.completed">✓ Segmentación de clientes configurada</li>
              <li v-if="setupStatus.webhooks?.completed">✓ Webhooks configurados</li>
              <li v-if="setupStatus.payment?.completed">✓ Pasarelas de pago configuradas</li>
              <li v-if="setupStatus.mikrotik?.completed">✓ MikroTik configurado</li>
            </ul>
            <button @click="completeSetup" class="btn-success">Ir al Dashboard →</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/';

export default {
  name: 'SetupWizard',
  data() {
    return {
      currentStep: 1,
      progress: 0,
      setupStatus: {},

      companyData: {
        companyName: '',
        companyEmail: '',
        companyPhone: '',
        companyAddress: '',
      },

      logoFile: null,
      logoPreview: null,

      segmentationData: {
        enabled: true,
        segments: [
          { name: 'Activo', color: '#4CAF50', autoMove: false, description: 'Clientes al día' },
          { name: 'Moroso', color: '#f44336', autoMove: true, daysOverdue: 5 },
          { name: 'Suspendido', color: '#FF9800', autoMove: true, daysOverdue: 15 },
        ]
      },

      webhooksData: {
        enabled: false,
        n8nUrl: '',
        triggers: []
      },

      paymentData: {
        gateways: [
          { name: 'PayPal', enabled: false, credentials: { clientId: '', secret: '' } },
          { name: 'Stripe', enabled: false, credentials: { clientId: '', secret: '' } },
          { name: 'MercadoPago', enabled: false, credentials: { clientId: '', secret: '' } },
        ]
      },

      mikrotikData: {
        mockMode: true,
        routers: []
      }
    };
  },

  async mounted() {
    await this.checkSetupStatus();
  },

  methods: {
    async checkSetupStatus() {
      try {
        const response = await axios.get(API_URL + 'setup/status');
        this.setupStatus = response.data.steps || {};
        this.progress = response.data.progress || 0;

        // Si ya está completado, redirigir
        if (response.data.setupCompleted) {
          this.$router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
      }
    },

    async saveCompanyInfo() {
      try {
        await axios.post(API_URL + 'setup/company', this.companyData);
        this.currentStep++;
        await this.checkSetupStatus();
      } catch (error) {
        alert('Error guardando información: ' + error.message);
      }
    },

    handleLogoUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.logoFile = file;
        this.logoPreview = URL.createObjectURL(file);
      }
    },

    async uploadLogo() {
      if (this.logoFile) {
        try {
          const formData = new FormData();
          formData.append('logo', this.logoFile);

          await axios.post(API_URL + 'setup/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (error) {
          console.error('Error uploading logo:', error);
        }
      }

      this.currentStep++;
      await this.checkSetupStatus();
    },

    addSegment() {
      this.segmentationData.segments.push({
        name: '',
        color: '#000000',
        autoMove: false,
        daysOverdue: 0
      });
    },

    removeSegment(index) {
      this.segmentationData.segments.splice(index, 1);
    },

    async saveSegmentation() {
      try {
        await axios.post(API_URL + 'setup/segmentation', this.segmentationData);
        this.currentStep++;
        await this.checkSetupStatus();
      } catch (error) {
        alert('Error guardando segmentación: ' + error.message);
      }
    },

    async saveWebhooks() {
      try {
        await axios.post(API_URL + 'setup/webhooks', this.webhooksData);
        this.currentStep++;
        await this.checkSetupStatus();
      } catch (error) {
        alert('Error guardando webhooks: ' + error.message);
      }
    },

    async savePaymentGateways() {
      try {
        await axios.post(API_URL + 'setup/payment-gateways', this.paymentData);
        this.currentStep++;
        await this.checkSetupStatus();
      } catch (error) {
        alert('Error guardando pasarelas: ' + error.message);
      }
    },

    addRouter() {
      this.mikrotikData.routers.push({
        name: '',
        ipAddress: '',
        apiPort: 8728,
        username: '',
        password: ''
      });
    },

    removeRouter(index) {
      this.mikrotikData.routers.splice(index, 1);
    },

    async saveMikrotik() {
      try {
        await axios.post(API_URL + 'setup/mikrotik', this.mikrotikData);
        this.currentStep++;
        await this.checkSetupStatus();
      } catch (error) {
        alert('Error guardando MikroTik: ' + error.message);
      }
    },

    async completeSetup() {
      try {
        await axios.post(API_URL + 'setup/complete');
        this.$router.push('/dashboard');
      } catch (error) {
        alert('Error completando setup: ' + error.message);
      }
    }
  }
};
</script>

<style scoped>
.setup-wizard {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.setup-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  max-width: 800px;
  width: 100%;
  padding: 40px;
}

.setup-header {
  text-align: center;
  margin-bottom: 40px;
}

.setup-header h1 {
  color: #333;
  margin-bottom: 10px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
  margin: 20px 0;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.progress-text {
  color: #666;
  font-size: 14px;
}

.step {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="tel"],
.form-group input[type="url"],
.form-group input[type="number"],
.form-group input[type="password"],
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
}

.step-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
}

.btn-primary, .btn-secondary, .btn-danger, .btn-success {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-danger {
  background: #f44336;
  color: white;
  padding: 6px 12px;
}

.btn-success {
  background: #4CAF50;
  color: white;
  padding: 16px 32px;
  font-size: 16px;
}

.logo-upload {
  text-align: center;
  padding: 40px;
  border: 2px dashed #ddd;
  border-radius: 8px;
}

.logo-preview img {
  max-width: 200px;
  margin-bottom: 20px;
}

.help-text {
  color: #666;
  font-size: 12px;
  margin-top: 8px;
}

.segment-item, .router-config, .gateway-config {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.segment-item input, .router-config input {
  flex: 1;
  min-width: 120px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setup-complete {
  text-align: center;
}

.completion-summary {
  list-style: none;
  padding: 0;
  margin: 30px 0;
}

.completion-summary li {
  padding: 10px;
  background: #f5f5f5;
  margin-bottom: 8px;
  border-radius: 6px;
}
</style>
