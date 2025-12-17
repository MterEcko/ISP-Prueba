<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">
          <v-icon large class="mr-2">mdi-whatsapp</v-icon>
          Configuracion WhatsApp Twilio
        </h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Credenciales de Twilio</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="config.accountSid"
                label="Account SID"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                type="password"
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.authToken"
                label="Auth Token"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                type="password"
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.phoneNumber"
                label="Numero de WhatsApp"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                hint="Ejemplo: +14155238886"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-switch
                v-model="config.enableAutoResponse"
                label="Habilitar respuestas automaticas"
                color="primary"
                class="mb-4"
              ></v-switch>

              <v-textarea
                v-if="config.enableAutoResponse"
                v-model="config.autoResponseMessage"
                label="Mensaje de respuesta automatica"
                variant="outlined"
                rows="3"
              ></v-textarea>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="resetForm">Cancelar</v-btn>
            <v-btn color="primary" :disabled="!valid" :loading="saving" @click="saveConfig">
              Guardar Configuracion
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Estado</v-card-title>
          <v-card-text>
            <v-chip :color="status.initialized ? 'success' : 'error'" size="small">
              {{ status.initialized ? 'Activo' : 'Inactivo' }}
            </v-chip>
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
  name: 'WhatsAppTwilioConfigView',
  data() {
    return {
      valid: false,
      saving: false,
      config: {
        accountSid: '',
        authToken: '',
        phoneNumber: '',
        enableAutoResponse: false,
        autoResponseMessage: 'Gracias por contactarnos. Un agente te respondera pronto.'
      },
      status: { initialized: false },
      rules: { required: value => !!value || 'Campo requerido' },
      snackbar: { show: false, message: '', color: 'success' }
    };
  },
  mounted() {
    this.loadConfig();
    this.loadStatus();
  },
  methods: {
    async loadConfig() {
      try {
        const response = await api.get('/api/plugins/whatsapp-twilio/config');
        if (response.data.config) this.config = { ...this.config, ...response.data.config };
      } catch (error) {
        console.error(error);
      }
    },
    async loadStatus() {
      try {
        const response = await api.get('/api/plugins/whatsapp-twilio/status');
        this.status = response.data;
      } catch (error) {
        console.error(error);
      }
    },
    async saveConfig() {
      const { valid } = await this.$refs.form.validate();
      if (!valid) return;

      this.saving = true;
      try {
        await api.post('/api/plugins/whatsapp-twilio/config', this.config);
        this.snackbar = { show: true, message: 'Configuracion guardada', color: 'success' };
        await this.loadStatus();
      } catch (error) {
        this.snackbar = { show: true, message: 'Error guardando configuracion', color: 'error' };
      } finally {
        this.saving = false;
      }
    },
    resetForm() {
      this.$refs.form.reset();
    }
  }
};
</script>
