<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">
          <v-icon large class="mr-2">mdi-key-variant</v-icon>
          Gestión de Licencia
        </h1>
      </v-col>
    </v-row>

    <!-- Licencia Actual -->
    <v-row v-if="currentLicense">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title class="bg-primary">
            <v-icon class="mr-2">mdi-certificate</v-icon>
            Licencia Activa
          </v-card-title>
          <v-card-text class="pa-6">
            <v-row>
              <v-col cols="12" md="6">
                <div class="mb-4">
                  <div class="text-caption text-medium-emphasis">Tipo de Plan</div>
                  <div class="text-h5 text-capitalize">
                    <v-chip :color="getLicenseColor(currentLicense.planType)" size="large">
                      {{ currentLicense.planType }}
                    </v-chip>
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="mb-4">
                  <div class="text-caption text-medium-emphasis">Estado</div>
                  <div class="text-h6">
                    <v-chip :color="currentLicense.status === 'active' ? 'success' : 'error'">
                      {{ currentLicense.status === 'active' ? 'Activa' : 'Inactiva' }}
                    </v-chip>
                  </div>
                </div>
              </v-col>
              <v-col cols="12">
                <div class="mb-4">
                  <div class="text-caption text-medium-emphasis">Clave de Licencia</div>
                  <v-text-field
                    :model-value="currentLicense.licenseKey"
                    readonly
                    variant="outlined"
                    density="compact"
                    append-inner-icon="mdi-content-copy"
                    @click:append-inner="copyLicenseKey"
                  ></v-text-field>
                </div>
              </v-col>
              <v-col cols="12" md="6" v-if="currentLicense.companyName">
                <div class="mb-2">
                  <div class="text-caption text-medium-emphasis">Empresa</div>
                  <div class="text-body-1">{{ currentLicense.companyName }}</div>
                </div>
              </v-col>
              <v-col cols="12" md="6" v-if="currentLicense.expiresAt">
                <div class="mb-2">
                  <div class="text-caption text-medium-emphasis">Válida Hasta</div>
                  <div class="text-body-1">{{ formatDate(currentLicense.expiresAt) }}</div>
                </div>
              </v-col>
            </v-row>

            <v-alert type="info" variant="tonal" class="mt-4" v-if="currentLicense.planType === 'enterprise'">
              <strong>Licencia Enterprise:</strong> Acceso completo a todos los plugins y funcionalidades del marketplace.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Activar Nueva Licencia -->
    <v-row class="mt-6">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title class="bg-secondary">
            <v-icon class="mr-2">mdi-key-plus</v-icon>
            Activar Nueva Licencia
          </v-card-title>
          <v-card-text class="pa-6">
            <v-form @submit.prevent="activateLicense">
              <v-text-field
                v-model="licenseForm.licenseKey"
                label="Clave de Licencia"
                placeholder="0113-F8D3-9CDD-A5F2-9BB7-6475-7DF8-0BFB"
                variant="outlined"
                :rules="[v => !!v || 'La clave de licencia es requerida']"
                required
              ></v-text-field>

              <v-text-field
                v-model="licenseForm.installationKey"
                label="Clave de Instalación (opcional)"
                placeholder="INSTALL-xxxxx"
                variant="outlined"
                hint="Deja en blanco para generar automáticamente"
                persistent-hint
              ></v-text-field>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                class="mt-4"
                :loading="activating"
                :disabled="!licenseForm.licenseKey"
              >
                <v-icon class="mr-2">mdi-check</v-icon>
                Activar Licencia
              </v-btn>
            </v-form>

            <!-- Licencias de Prueba -->
            <v-divider class="my-6"></v-divider>
            <div class="text-h6 mb-4">Licencias de Prueba</div>
            <v-alert type="warning" variant="tonal" class="mb-4">
              Estas son licencias de prueba para desarrollo y testing.
            </v-alert>

            <v-list density="compact">
              <v-list-item
                v-for="testLicense in testLicenses"
                :key="testLicense.key"
                @click="useLicense(testLicense.key)"
                class="cursor-pointer"
              >
                <template v-slot:prepend>
                  <v-icon :color="testLicense.color">{{ testLicense.icon }}</v-icon>
                </template>
                <v-list-item-title>{{ testLicense.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ testLicense.key }}</v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn size="small" variant="text" @click.stop="useLicense(testLicense.key)">
                    Usar
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
export default {
  name: 'LicenseActivationView',
  data() {
    return {
      currentLicense: null,
      licenseForm: {
        licenseKey: '',
        installationKey: ''
      },
      activating: false,
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      },
      testLicenses: [
        {
          name: 'Enterprise Master (Ilimitado)',
          key: '0113-F8D3-9CDD-A5F2-9BB7-6475-7DF8-0BFB',
          icon: 'mdi-crown',
          color: 'amber'
        },
        {
          name: 'Enterprise Test',
          key: 'TEST-ENTERPRISE-6ba6b0aa',
          icon: 'mdi-star',
          color: 'purple'
        },
        {
          name: 'Advanced Test',
          key: 'TEST-ADVANCED-3fd8e2fd',
          icon: 'mdi-rocket',
          color: 'orange'
        },
        {
          name: 'Medium Test',
          key: 'TEST-MEDIUM-6a940e8d',
          icon: 'mdi-chart-line',
          color: 'blue'
        },
        {
          name: 'Basic Test',
          key: 'TEST-BASIC-23d7abc7',
          icon: 'mdi-package',
          color: 'green'
        }
      ]
    };
  },
  mounted() {
    this.loadCurrentLicense();
  },
  methods: {
    loadCurrentLicense() {
      const licenseKey = localStorage.getItem('licenseKey');
      const installationKey = localStorage.getItem('installationKey');

      if (licenseKey) {
        this.currentLicense = {
          licenseKey,
          installationKey,
          planType: this.detectPlanType(licenseKey),
          status: 'active',
          companyName: localStorage.getItem('companyName') || 'Mi Empresa ISP',
          expiresAt: null // Enterprise nunca expira
        };
      }
    },
    detectPlanType(licenseKey) {
      if (licenseKey.includes('BASIC')) return 'basic';
      if (licenseKey.includes('MEDIUM')) return 'medium';
      if (licenseKey.includes('ADVANCED')) return 'advanced';
      if (licenseKey.includes('ENTERPRISE') || licenseKey.startsWith('0113')) return 'enterprise';
      return 'basic';
    },
    getLicenseColor(planType) {
      const colors = {
        basic: 'green',
        medium: 'blue',
        advanced: 'orange',
        enterprise: 'purple'
      };
      return colors[planType] || 'grey';
    },
    formatDate(dateString) {
      if (!dateString) return 'Nunca';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    copyLicenseKey() {
      if (this.currentLicense?.licenseKey) {
        navigator.clipboard.writeText(this.currentLicense.licenseKey);
        this.showSnackbar('Clave copiada al portapapeles', 'success');
      }
    },
    useLicense(licenseKey) {
      this.licenseForm.licenseKey = licenseKey;
      this.licenseForm.installationKey = 'INSTALL-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    },
    async activateLicense() {
      this.activating = true;

      try {
        // Guardar en localStorage
        localStorage.setItem('licenseKey', this.licenseForm.licenseKey);

        const installKey = this.licenseForm.installationKey ||
          'INSTALL-' + Math.random().toString(36).substring(2, 10).toUpperCase();

        localStorage.setItem('installationKey', installKey);

        // Detectar tipo de licencia
        const planType = this.detectPlanType(this.licenseForm.licenseKey);
        localStorage.setItem('planType', planType);

        this.showSnackbar('✅ Licencia activada exitosamente', 'success');

        // Recargar licencia actual
        this.loadCurrentLicense();

        // Limpiar formulario
        this.licenseForm = {
          licenseKey: '',
          installationKey: ''
        };

        // Opcional: Redirigir al marketplace
        setTimeout(() => {
          this.$router.push('/plugins/marketplace');
        }, 2000);

      } catch (error) {
        console.error('Error activating license:', error);
        this.showSnackbar('Error al activar la licencia', 'error');
      } finally {
        this.activating = false;
      }
    },
    showSnackbar(message, color = 'success') {
      this.snackbar = {
        show: true,
        message,
        color
      };
    }
  }
};
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
