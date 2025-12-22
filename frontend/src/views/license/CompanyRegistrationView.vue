<template>
  <v-container fluid class="company-registration">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">
          <v-icon large class="mr-2">mdi-office-building</v-icon>
          Registro de Empresa y Licencia
        </h1>
        <p class="text-subtitle-1 mb-6">
          Complete la información de su empresa para activar y registrar su licencia en el Store
        </p>
      </v-col>
    </v-row>

    <!-- Wizard Steps -->
    <v-row>
      <v-col cols="12">
        <v-stepper v-model="step" alt-labels>
          <v-stepper-header>
            <v-stepper-item
              :complete="step > 1"
              :value="1"
              title="Datos de Empresa"
              icon="mdi-office-building"
            ></v-stepper-item>

            <v-divider></v-divider>

            <v-stepper-item
              :complete="step > 2"
              :value="2"
              title="Licencia"
              icon="mdi-key"
            ></v-stepper-item>

            <v-divider></v-divider>

            <v-stepper-item
              :complete="step > 3"
              :value="3"
              title="Subdominio (Opcional)"
              icon="mdi-web"
            ></v-stepper-item>

            <v-divider></v-divider>

            <v-stepper-item
              :value="4"
              title="Confirmación"
              icon="mdi-check-circle"
            ></v-stepper-item>
          </v-stepper-header>

          <v-stepper-window>
            <!-- Step 1: Datos de Empresa -->
            <v-stepper-window-item :value="1">
              <v-card flat>
                <v-card-title>Información de la Empresa</v-card-title>
                <v-card-text>
                  <v-form ref="companyForm" v-model="companyFormValid">
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="company.name"
                          label="Nombre de la Empresa *"
                          :rules="[rules.required]"
                          variant="outlined"
                          density="comfortable"
                          prepend-inner-icon="mdi-office-building"
                        ></v-text-field>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="company.rfc"
                          label="RFC / Tax ID *"
                          :rules="[rules.required]"
                          variant="outlined"
                          density="comfortable"
                          prepend-inner-icon="mdi-card-account-details"
                        ></v-text-field>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="company.email"
                          label="Email de Contacto *"
                          :rules="[rules.required, rules.email]"
                          variant="outlined"
                          density="comfortable"
                          prepend-inner-icon="mdi-email"
                          type="email"
                        ></v-text-field>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="company.phone"
                          label="Teléfono *"
                          :rules="[rules.required]"
                          variant="outlined"
                          density="comfortable"
                          prepend-inner-icon="mdi-phone"
                        ></v-text-field>
                      </v-col>

                      <v-col cols="12">
                        <v-textarea
                          v-model="company.address"
                          label="Dirección Completa *"
                          :rules="[rules.required]"
                          variant="outlined"
                          density="comfortable"
                          prepend-inner-icon="mdi-map-marker"
                          rows="3"
                        ></v-textarea>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="company.contactName"
                          label="Nombre del Contacto Principal *"
                          :rules="[rules.required]"
                          variant="outlined"
                          density="comfortable"
                          prepend-inner-icon="mdi-account"
                        ></v-text-field>
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-stepper-window-item>

            <!-- Step 2: Licencia -->
            <v-stepper-window-item :value="2">
              <v-card flat>
                <v-card-title>Información de Licencia</v-card-title>
                <v-card-text>
                  <v-form ref="licenseForm" v-model="licenseFormValid">
                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          v-model="license.key"
                          label="Clave de Licencia *"
                          :rules="[rules.required]"
                          variant="outlined"
                          density="comfortable"
                          prepend-inner-icon="mdi-key"
                          hint="Ingrese la clave de licencia que recibió al realizar su compra"
                          persistent-hint
                        ></v-text-field>
                      </v-col>

                      <v-col cols="12" v-if="licenseInfo">
                        <v-alert type="success" variant="tonal">
                          <v-row align="center">
                            <v-col cols="12" md="6">
                              <strong>Plan:</strong> {{ licenseInfo.planType }}<br>
                              <strong>Límite de Clientes:</strong> {{ licenseInfo.clientLimit === -1 ? 'Ilimitados' : licenseInfo.clientLimit }}<br>
                              <strong>Límite de Usuarios:</strong> {{ licenseInfo.userLimit === -1 ? 'Ilimitados' : licenseInfo.userLimit }}
                            </v-col>
                            <v-col cols="12" md="6">
                              <strong>Límite de Plugins:</strong> {{ licenseInfo.pluginLimit === -1 ? 'Ilimitados' : licenseInfo.pluginLimit }}<br>
                              <strong>Expira:</strong> {{ licenseInfo.expiresAt || 'Sin expiración' }}
                            </v-col>
                          </v-row>
                        </v-alert>
                      </v-col>

                      <v-col cols="12">
                        <v-btn
                          color="primary"
                          :loading="validatingLicense"
                          @click="validateLicenseKey"
                          :disabled="!license.key"
                        >
                          <v-icon start>mdi-check-circle</v-icon>
                          Validar Licencia
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-stepper-window-item>

            <!-- Step 3: Subdominio -->
            <v-stepper-window-item :value="3">
              <v-card flat>
                <v-card-title>Configuración de Subdominio (Opcional)</v-card-title>
                <v-card-text>
                  <v-alert type="info" variant="tonal" class="mb-4">
                    <strong>Disponible para planes Premium y Enterprise</strong><br>
                    Configure un subdominio personalizado para acceder a su sistema
                  </v-alert>

                  <v-form ref="subdomainForm" v-model="subdomainFormValid">
                    <v-row>
                      <v-col cols="12" v-if="canConfigureSubdomain">
                        <v-text-field
                          v-model="subdomain.name"
                          label="Nombre del Subdominio"
                          :rules="subdomainRules"
                          variant="outlined"
                          density="comfortable"
                          prepend-inner-icon="mdi-web"
                          suffix=".tudominio.com"
                          hint="Solo letras minúsculas, números y guiones. Ejemplo: mi-empresa"
                          persistent-hint
                        ></v-text-field>

                        <v-alert type="success" variant="tonal" class="mt-4" v-if="subdomain.name">
                          <strong>Tu URL será:</strong><br>
                          <code>https://{{ subdomain.name }}.tudominio.com</code>
                        </v-alert>
                      </v-col>

                      <v-col cols="12" v-else>
                        <v-alert type="warning" variant="tonal">
                          La configuración de subdominios está disponible solo para planes Premium y Enterprise.
                          Tu plan actual: <strong>{{ licenseInfo?.planType || 'No detectado' }}</strong>
                        </v-alert>
                      </v-col>

                      <v-col cols="12">
                        <v-switch
                          v-model="subdomain.enabled"
                          label="Configurar subdominio ahora"
                          color="primary"
                          :disabled="!canConfigureSubdomain"
                        ></v-switch>
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-stepper-window-item>

            <!-- Step 4: Confirmación -->
            <v-stepper-window-item :value="4">
              <v-card flat>
                <v-card-title>Confirmar Registro</v-card-title>
                <v-card-text>
                  <v-alert type="info" variant="tonal" class="mb-4">
                    Por favor revise la información antes de confirmar el registro
                  </v-alert>

                  <v-row>
                    <v-col cols="12" md="6">
                      <v-card variant="outlined">
                        <v-card-title class="text-subtitle-1">Datos de Empresa</v-card-title>
                        <v-card-text>
                          <strong>Nombre:</strong> {{ company.name }}<br>
                          <strong>RFC:</strong> {{ company.rfc }}<br>
                          <strong>Email:</strong> {{ company.email }}<br>
                          <strong>Teléfono:</strong> {{ company.phone }}<br>
                          <strong>Contacto:</strong> {{ company.contactName }}
                        </v-card-text>
                      </v-card>
                    </v-col>

                    <v-col cols="12" md="6">
                      <v-card variant="outlined">
                        <v-card-title class="text-subtitle-1">Licencia</v-card-title>
                        <v-card-text>
                          <strong>Clave:</strong> {{ maskLicenseKey(license.key) }}<br>
                          <strong>Plan:</strong> {{ licenseInfo?.planType || 'N/A' }}<br>
                          <strong>Subdominio:</strong> {{ subdomain.enabled && subdomain.name ? subdomain.name + '.tudominio.com' : 'No configurado' }}
                        </v-card-text>
                      </v-card>
                    </v-col>

                    <v-col cols="12">
                      <v-card variant="outlined">
                        <v-card-title class="text-subtitle-1">Hardware Detectado</v-card-title>
                        <v-card-text>
                          <v-row>
                            <v-col cols="12" md="6">
                              <strong>Hardware ID:</strong> {{ hardwareInfo.hardwareId }}<br>
                              <strong>Hostname:</strong> {{ hardwareInfo.hostname }}<br>
                              <strong>Sistema:</strong> {{ hardwareInfo.platform }} {{ hardwareInfo.architecture }}
                            </v-col>
                            <v-col cols="12" md="6">
                              <strong>CPU:</strong> {{ hardwareInfo.cpu?.cores }} cores<br>
                              <strong>Memoria:</strong> {{ hardwareInfo.memory?.totalGB }} GB<br>
                              <strong>Ubicación:</strong> {{ location ? `${location.city}, ${location.country}` : 'Detectando...' }}
                            </v-col>
                          </v-row>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-stepper-window-item>
          </v-stepper-window>

          <v-stepper-actions
            @click:prev="step--"
            @click:next="handleNext"
            :disabled="registering"
          >
            <template v-slot:next>
              <v-btn
                v-if="step < 4"
                color="primary"
                :disabled="!canProceed"
                @click="handleNext"
              >
                Siguiente
              </v-btn>
              <v-btn
                v-else
                color="success"
                :loading="registering"
                @click="submitRegistration"
              >
                <v-icon start>mdi-check</v-icon>
                Registrar Empresa y Activar Licencia
              </v-btn>
            </template>
          </v-stepper-actions>
        </v-stepper>
      </v-col>
    </v-row>

    <!-- Success Dialog -->
    <v-dialog v-model="successDialog" persistent max-width="600">
      <v-card>
        <v-card-title class="text-h5 bg-success text-white">
          <v-icon large class="mr-2">mdi-check-circle</v-icon>
          ¡Registro Exitoso!
        </v-card-title>
        <v-card-text class="pt-6">
          <v-alert type="success" variant="tonal" class="mb-4">
            Su empresa ha sido registrada exitosamente y la licencia ha sido activada.
          </v-alert>

          <div v-if="registrationResult">
            <p><strong>Empresa ID:</strong> {{ registrationResult.companyId }}</p>
            <p><strong>Licencia:</strong> Activada correctamente</p>
            <p v-if="registrationResult.subdomain">
              <strong>Subdominio configurado:</strong><br>
              <code>{{ registrationResult.subdomain }}</code>
            </p>
          </div>

          <p class="mt-4">
            La información de su instalación ha sido enviada al Store y su sistema está listo para usar.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="success" @click="finishRegistration">
            Ir al Dashboard
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import api from '@/services/api';

export default {
  name: 'CompanyRegistrationView',
  data() {
    return {
      step: 1,
      companyFormValid: false,
      licenseFormValid: false,
      subdomainFormValid: false,
      validatingLicense: false,
      registering: false,
      successDialog: false,

      company: {
        name: '',
        rfc: '',
        email: '',
        phone: '',
        address: '',
        contactName: ''
      },

      license: {
        key: ''
      },

      subdomain: {
        enabled: false,
        name: ''
      },

      licenseInfo: null,
      hardwareInfo: {},
      location: null,
      registrationResult: null,

      rules: {
        required: value => !!value || 'Campo requerido',
        email: value => {
          const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return pattern.test(value) || 'Email inválido';
        }
      },

      subdomainRules: [
        v => {
          if (!this.subdomain.enabled) return true;
          return !!v || 'Subdominio requerido';
        },
        v => {
          if (!this.subdomain.enabled) return true;
          const pattern = /^[a-z0-9-]+$/;
          return pattern.test(v) || 'Solo letras minúsculas, números y guiones';
        },
        v => {
          if (!this.subdomain.enabled) return true;
          return (v && v.length >= 3) || 'Mínimo 3 caracteres';
        },
        v => {
          if (!this.subdomain.enabled) return true;
          return (v && v.length <= 50) || 'Máximo 50 caracteres';
        }
      ],

      snackbar: {
        show: false,
        message: '',
        color: 'success'
      }
    };
  },

  computed: {
    canProceed() {
      if (this.step === 1) return this.companyFormValid;
      if (this.step === 2) return this.licenseFormValid && this.licenseInfo !== null;
      if (this.step === 3) return !this.subdomain.enabled || this.subdomainFormValid;
      return true;
    },

    canConfigureSubdomain() {
      return this.licenseInfo && ['premium', 'enterprise', 'full_access'].includes(this.licenseInfo.planType);
    }
  },

  async mounted() {
    await this.loadHardwareInfo();
  },

  methods: {
    async loadHardwareInfo() {
      try {
        const response = await api.get('/system/hardware-info');
        this.hardwareInfo = response.data.hardware;
        this.location = response.data.location;
      } catch (error) {
        console.error('Error cargando info de hardware:', error);
        this.showSnackbar('Error cargando información del sistema', 'error');
      }
    },

    async validateLicenseKey() {
      this.validatingLicense = true;
      try {
        const response = await api.post('/system-licenses/validate-key', {
          licenseKey: this.license.key
        });

        if (response.data.valid) {
          this.licenseInfo = response.data.license;
          this.showSnackbar('Licencia válida', 'success');
        } else {
          this.showSnackbar('Licencia inválida o expirada', 'error');
          this.licenseInfo = null;
        }
      } catch (error) {
        this.showSnackbar(error.response?.data?.message || 'Error validando licencia', 'error');
        this.licenseInfo = null;
      } finally {
        this.validatingLicense = false;
      }
    },

    async handleNext() {
      if (this.step === 1) {
        const { valid } = await this.$refs.companyForm.validate();
        if (valid) this.step++;
      } else if (this.step === 2) {
        const { valid } = await this.$refs.licenseForm.validate();
        if (valid && this.licenseInfo) this.step++;
      } else if (this.step === 3) {
        const { valid } = await this.$refs.subdomainForm.validate();
        if (valid) this.step++;
      }
    },

    async submitRegistration() {
      this.registering = true;
      try {
        const payload = {
          company: this.company,
          license: {
            key: this.license.key
          },
          subdomain: this.subdomain.enabled ? this.subdomain.name : null,
          hardware: this.hardwareInfo,
          location: this.location
        };

        const response = await api.post('/system-licenses/register-company', payload);

        if (response.data.success) {
          this.registrationResult = response.data.data;

          // Actualizar el Vuex store con la licencia activada
          await this.$store.dispatch('license/fetchCurrentLicense');
          await this.$store.dispatch('license/checkLicenseStatus');

          this.successDialog = true;
        } else {
          this.showSnackbar(response.data.message || 'Error en el registro', 'error');
        }
      } catch (error) {
        this.showSnackbar(
          error.response?.data?.message || 'Error registrando empresa',
          'error'
        );
      } finally {
        this.registering = false;
      }
    },

    async finishRegistration() {
      this.successDialog = false;

      // Asegurar que el estado de licencia esté actualizado antes de redirigir
      try {
        await this.$store.dispatch('license/fetchCurrentLicense');
        await this.$store.dispatch('license/checkLicenseStatus');
      } catch (error) {
        console.error('Error actualizando estado de licencia:', error);
      }

      this.$router.push('/dashboard');
    },

    maskLicenseKey(key) {
      if (!key) return '';
      const parts = key.split('-');
      return parts.map((part, i) => i === 0 ? part : '****').join('-');
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
.company-registration {
  max-width: 1200px;
  margin: 0 auto;
}

code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}
</style>
