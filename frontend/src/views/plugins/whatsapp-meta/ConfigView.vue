<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">
          <v-icon large class="mr-2">mdi-whatsapp</v-icon>
          Configuración WhatsApp Meta
        </h-1>
        <p class="text-body-1 text-medium-emphasis">
          Configura tu integración con WhatsApp Business API oficial de Meta
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Credenciales de Meta</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="config.apiToken"
                label="Access Token"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                type="password"
                hint="Token de acceso de WhatsApp Business"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.phoneNumberId"
                label="Phone Number ID"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                hint="ID del número de WhatsApp Business"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.webhookVerifyToken"
                label="Webhook Verify Token"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                type="password"
                hint="Token para verificación de webhooks"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.businessAccountId"
                label="Business Account ID (opcional)"
                variant="outlined"
                density="compact"
                hint="ID de la cuenta de negocio"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-divider class="my-4"></v-divider>

              <h3 class="text-h6 mb-4">Respuestas Automáticas</h3>

              <v-switch
                v-model="config.enableAutoResponse"
                label="Habilitar respuestas automáticas"
                color="primary"
                class="mb-4"
              ></v-switch>

              <v-textarea
                v-if="config.enableAutoResponse"
                v-model="config.autoResponseMessage"
                label="Mensaje de respuesta automática"
                variant="outlined"
                rows="3"
                hint="Este mensaje se enviará automáticamente cuando recibas un mensaje"
                persistent-hint
              ></v-textarea>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              variant="text"
              @click="resetForm"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              :disabled="!valid"
              :loading="saving"
              @click="saveConfig"
            >
              Guardar Configuración
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Probar Conexión</v-card-title>
          <v-card-text>
            <p class="text-body-2 mb-4">
              Verifica que tu configuración sea correcta probando la conexión con Meta.
            </p>
            <v-btn
              color="success"
              :loading="testing"
              @click="testConnection"
            >
              <v-icon start>mdi-connection</v-icon>
              Probar Conexión
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Estado del Plugin</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <v-list-item-title>Estado</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip
                    :color="status.initialized ? 'success' : 'error'"
                    size="small"
                  >
                    {{ status.initialized ? 'Activo' : 'Inactivo' }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="status.phoneNumberId">
                <v-list-item-title>Phone Number ID</v-list-item-title>
                <v-list-item-subtitle>{{ status.phoneNumberId }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Información del Webhook</v-card-title>
          <v-card-text>
            <p class="text-caption mb-2">URL de Webhook:</p>
            <v-text-field
              :model-value="webhookUrl"
              variant="outlined"
              density="compact"
              readonly
              append-icon="mdi-content-copy"
              @click:append="copyWebhookUrl"
            ></v-text-field>

            <p class="text-caption mb-2">Verify Token:</p>
            <v-text-field
              :model-value="config.webhookVerifyToken"
              variant="outlined"
              density="compact"
              readonly
              type="password"
            ></v-text-field>

            <v-alert type="info" variant="tonal" class="mt-4">
              Configura estos valores en tu panel de Meta Business
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Ayuda</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                href="https://developers.facebook.com/docs/whatsapp"
                target="_blank"
              >
                <v-icon start>mdi-book-open-variant</v-icon>
                Documentación de Meta
              </v-list-item>
              <v-list-item
                href="https://business.facebook.com/wa/manage/home"
                target="_blank"
              >
                <v-icon start>mdi-cog</v-icon>
                WhatsApp Manager
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

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
  name: 'WhatsAppMetaConfigView',
  data() {
    return {
      valid: false,
      saving: false,
      testing: false,
      config: {
        apiToken: '',
        phoneNumberId: '',
        webhookVerifyToken: '',
        businessAccountId: '',
        enableAutoResponse: false,
        autoResponseMessage: 'Gracias por contactarnos. Un agente te responderá pronto.'
      },
      status: {
        initialized: false,
        phoneNumberId: null
      },
      rules: {
        required: value => !!value || 'Campo requerido'
      },
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      }
    };
  },
  computed: {
    webhookUrl() {
      return `${window.location.origin}/api/plugins/whatsapp-meta/webhook`;
    }
  },
  mounted() {
    this.loadConfig();
    this.loadStatus();
  },
  methods: {
    async loadConfig() {
      try {
        const response = await api.get('/api/plugins/whatsapp-meta/config');
        if (response.data.config) {
          this.config = { ...this.config, ...response.data.config };
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
      }
    },
    async loadStatus() {
      try {
        const response = await api.get('/api/plugins/whatsapp-meta/status');
        this.status = response.data;
      } catch (error) {
        console.error('Error cargando estado:', error);
      }
    },
    async saveConfig() {
      const { valid } = await this.$refs.form.validate();
      if (!valid) return;

      this.saving = true;
      try {
        await api.post('/api/plugins/whatsapp-meta/config', this.config);

        this.showSnackbar('Configuración guardada correctamente', 'success');
        await this.loadStatus();
      } catch (error) {
        console.error('Error guardando configuración:', error);
        this.showSnackbar(error.response?.data?.message || 'Error guardando configuración', 'error');
      } finally {
        this.saving = false;
      }
    },
    async testConnection() {
      this.testing = true;
      try {
        const response = await api.post('/api/plugins/whatsapp-meta/test');

        if (response.data.success) {
          this.showSnackbar(`Conexión exitosa: ${response.data.verifiedName}`, 'success');
        } else {
          this.showSnackbar('Error en la conexión', 'error');
        }
      } catch (error) {
        console.error('Error probando conexión:', error);
        this.showSnackbar(error.response?.data?.message || 'Error probando conexión', 'error');
      } finally {
        this.testing = false;
      }
    },
    resetForm() {
      this.$refs.form.reset();
    },
    copyWebhookUrl() {
      navigator.clipboard.writeText(this.webhookUrl);
      this.showSnackbar('URL copiada al portapapeles', 'info');
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
