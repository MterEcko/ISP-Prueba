<template>
  <v-card class="license-activation-form">
    <v-card-title>
      <v-icon color="primary" class="mr-2">mdi-key</v-icon>
      Activar Licencia
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text>
      <v-form ref="form" v-model="valid" @submit.prevent="handleActivate">
        <!-- Clave de licencia -->
        <v-text-field
          v-model="licenseKey"
          label="Clave de Licencia"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          :rules="licenseKeyRules"
          required
          variant="outlined"
          prepend-inner-icon="mdi-key-variant"
          counter
          hint="Ingrese la clave de licencia de 16-64 caracteres"
          persistent-hint
          class="mb-4"
        >
          <template v-slot:append>
            <v-btn
              icon
              size="small"
              @click="pasteFromClipboard"
              title="Pegar desde portapapeles"
            >
              <v-icon>mdi-content-paste</v-icon>
            </v-btn>
          </template>
        </v-text-field>

        <!-- Hardware ID (opcional) -->
        <v-text-field
          v-model="hardwareId"
          label="ID de Hardware (Opcional)"
          placeholder="Generado automáticamente"
          variant="outlined"
          prepend-inner-icon="mdi-chip"
          :readonly="autoDetectHardware"
          hint="Se generará automáticamente si se deja vacío"
          persistent-hint
          class="mb-2"
        >
          <template v-slot:append>
            <v-btn
              icon
              size="small"
              @click="generateHardwareId"
              title="Generar ID de hardware"
            >
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </template>
        </v-text-field>

        <!-- Auto-detect hardware -->
        <v-checkbox
          v-model="autoDetectHardware"
          label="Detectar hardware automáticamente"
          density="compact"
          hide-details
          class="mb-4"
        ></v-checkbox>

        <!-- Mensaje de error -->
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          closable
          @click:close="error = null"
          class="mb-4"
        >
          {{ error }}
        </v-alert>

        <!-- Mensaje de éxito -->
        <v-alert
          v-if="success"
          type="success"
          variant="tonal"
          closable
          @click:close="success = null"
          class="mb-4"
        >
          {{ success }}
        </v-alert>

        <!-- Información adicional -->
        <v-expansion-panels v-if="showHelp" class="mb-4">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-help-circle</v-icon>
              ¿Cómo activar mi licencia?
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ol class="text-body-2">
                <li>Ingresa la clave de licencia que recibiste por correo</li>
                <li>La clave debe tener el formato: XXXX-XXXX-XXXX-XXXX</li>
                <li>El ID de hardware se generará automáticamente</li>
                <li>Haz clic en "Activar Licencia"</li>
                <li>Tu licencia estará activa inmediatamente</li>
              </ol>
              <div class="mt-3">
                <v-alert type="info" density="compact" variant="tonal">
                  <strong>¿No tienes una licencia?</strong><br>
                  Contacta con el equipo de ventas para obtener tu licencia.
                </v-alert>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Licencia de prueba / Maestra -->
          <v-expansion-panel v-if="showMasterLicenseHint">
            <v-expansion-panel-title>
              <v-icon class="mr-2" color="purple">mdi-shield-crown</v-icon>
              Licencia de Desarrollo
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-alert type="info" density="compact" variant="tonal">
                Si eres desarrollador, puedes usar la licencia maestra para pruebas.
                Esta licencia ofrece acceso completo sin restricciones.
              </v-alert>
              <v-btn
                variant="outlined"
                size="small"
                color="purple"
                class="mt-2"
                @click="fillMasterLicense"
              >
                <v-icon start>mdi-auto-fix</v-icon>
                Usar Licencia de Desarrollo
              </v-btn>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-form>
    </v-card-text>

    <v-divider></v-divider>

    <v-card-actions>
      <v-btn
        variant="text"
        @click="$emit('cancel')"
        :disabled="loading"
      >
        Cancelar
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        variant="flat"
        @click="handleActivate"
        :loading="loading"
        :disabled="!valid || loading"
      >
        <v-icon start>mdi-check-circle</v-icon>
        Activar Licencia
      </v-btn>
    </v-card-actions>

    <!-- Verificación en progreso -->
    <v-overlay :model-value="verifying" contained class="align-center justify-center">
      <div class="text-center">
        <v-progress-circular
          indeterminate
          size="64"
          color="primary"
        ></v-progress-circular>
        <div class="text-h6 mt-4">Verificando licencia...</div>
        <div class="text-body-2 text-medium-emphasis">
          Por favor espera mientras validamos tu licencia
        </div>
      </div>
    </v-overlay>
  </v-card>
</template>

<script>
export default {
  name: 'LicenseActivationForm',
  props: {
    showHelp: {
      type: Boolean,
      default: true
    },
    showMasterLicenseHint: {
      type: Boolean,
      default: process.env.NODE_ENV === 'development'
    }
  },
  emits: ['success', 'cancel'],
  data() {
    return {
      valid: false,
      licenseKey: '',
      hardwareId: '',
      autoDetectHardware: true,
      loading: false,
      verifying: false,
      error: null,
      success: null,
      licenseKeyRules: [
        v => !!v || 'La clave de licencia es requerida',
        v => (v && v.length >= 16) || 'La clave debe tener al menos 16 caracteres',
        v => (v && v.length <= 64) || 'La clave no puede tener más de 64 caracteres'
      ]
    };
  },
  mounted() {
    if (this.autoDetectHardware) {
      this.generateHardwareId();
    }
  },
  methods: {
    async handleActivate() {
      // Validar formulario
      const { valid } = await this.$refs.form.validate();
      if (!valid) {
        this.error = 'Por favor completa todos los campos requeridos';
        return;
      }

      this.loading = true;
      this.verifying = true;
      this.error = null;
      this.success = null;

      try {
        // Primero verificar la licencia
        const verifyResponse = await this.$store.dispatch('license/verifyLicense', {
          licenseKey: this.licenseKey.trim(),
          hardwareId: this.autoDetectHardware ? this.hardwareId : null
        });

        if (!verifyResponse.verification.isValid) {
          throw new Error('La licencia no es válida o ha expirado');
        }

        // Si es válida, activarla
        const activateResponse = await this.$store.dispatch('license/activateLicense', {
          licenseKey: this.licenseKey.trim(),
          hardwareId: this.autoDetectHardware ? this.hardwareId : null
        });

        this.success = '¡Licencia activada exitosamente!';

        // Emitir evento de éxito
        setTimeout(() => {
          this.$emit('success', activateResponse);
        }, 1500);
      } catch (error) {
        console.error('Error activating license:', error);
        this.error = error.response?.data?.message || error.message || 'Error al activar la licencia';
      } finally {
        this.loading = false;
        this.verifying = false;
      }
    },
    generateHardwareId() {
      // Generar un ID de hardware único basado en información del navegador
      const navigatorInfo = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset()
      ].join('|');

      // Crear un hash simple
      let hash = 0;
      for (let i = 0; i < navigatorInfo.length; i++) {
        const char = navigatorInfo.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }

      this.hardwareId = Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
    },
    async pasteFromClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        this.licenseKey = text.trim();
      } catch (error) {
        console.error('Error reading clipboard:', error);
        this.error = 'No se pudo leer del portapapeles. Por favor pega manualmente.';
      }
    },
    fillMasterLicense() {
      // Esta es la clave de licencia maestra generada en el backend
      // En producción, esto NO debería estar expuesto
      if (process.env.NODE_ENV === 'development') {
        this.licenseKey = '7A8E1F4C-6B9D-2A3E-5F8C-1D4E7B9A6C3F';
        this.$refs.form.validate();
      }
    }
  }
};
</script>

<style scoped>
.license-activation-form {
  max-width: 600px;
}
</style>
