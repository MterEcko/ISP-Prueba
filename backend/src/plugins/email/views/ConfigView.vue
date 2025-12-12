<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">
          <v-icon large class="mr-2">mdi-email</v-icon>
          Configuracion Email
        </h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Configuracion de Email</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-select
                v-model="config.provider"
                :items="providers"
                label="Proveedor de Email"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                class="mb-4"
              ></v-select>

              <v-divider class="my-4"></v-divider>

              <h3 class="text-h6 mb-4">Datos del Remitente</h3>

              <v-text-field
                v-model="config.fromName"
                label="Nombre del Remitente"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.fromEmail"
                label="Email del Remitente"
                :rules="[rules.required, rules.email]"
                variant="outlined"
                density="compact"
                type="email"
                class="mb-4"
              ></v-text-field>

              <v-divider class="my-4"></v-divider>

              <div v-if="config.provider === 'smtp'">
                <h3 class="text-h6 mb-4">Configuracion SMTP</h3>

                <v-text-field
                  v-model="config.smtpHost"
                  label="Servidor SMTP"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                  hint="Ejemplo: smtp.gmail.com"
                  persistent-hint
                  class="mb-4"
                ></v-text-field>

                <v-text-field
                  v-model.number="config.smtpPort"
                  label="Puerto SMTP"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                  type="number"
                  hint="Ejemplo: 587"
                  persistent-hint
                  class="mb-4"
                ></v-text-field>

                <v-text-field
                  v-model="config.smtpUser"
                  label="Usuario SMTP"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                  class="mb-4"
                ></v-text-field>

                <v-text-field
                  v-model="config.smtpPassword"
                  label="Contraseña SMTP"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                  type="password"
                  class="mb-4"
                ></v-text-field>

                <v-switch
                  v-model="config.smtpSecure"
                  label="Conexion segura (SSL/TLS)"
                  color="primary"
                  class="mb-4"
                ></v-switch>
              </div>

              <div v-if="config.provider === 'sendgrid'">
                <h3 class="text-h6 mb-4">Configuracion SendGrid</h3>

                <v-text-field
                  v-model="config.sendgridApiKey"
                  label="API Key de SendGrid"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                  type="password"
                  hint="Obten tu API Key en el panel de SendGrid"
                  persistent-hint
                  class="mb-4"
                ></v-text-field>
              </div>

              <div v-if="config.provider === 'mailgun'">
                <h3 class="text-h6 mb-4">Configuracion Mailgun</h3>

                <v-text-field
                  v-model="config.mailgunApiKey"
                  label="API Key de Mailgun"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                  type="password"
                  class="mb-4"
                ></v-text-field>

                <v-text-field
                  v-model="config.mailgunDomain"
                  label="Dominio de Mailgun"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                  hint="Ejemplo: mg.tudominio.com"
                  persistent-hint
                  class="mb-4"
                ></v-text-field>
              </div>
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

        <v-card class="mt-4">
          <v-card-title>Probar Conexion</v-card-title>
          <v-card-text>
            <p class="text-body-2 mb-4">
              Envia un correo de prueba para verificar la configuracion.
            </p>
            <v-btn color="success" :loading="testing" @click="testConnection">
              <v-icon start>mdi-email-send</v-icon>
              Enviar Email de Prueba
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Estado</v-card-title>
          <v-card-text>
            <v-chip :color="status.initialized ? 'success' : 'error'" size="small">
              {{ status.initialized ? 'Activo' : 'Inactivo' }}
            </v-chip>
            <v-list v-if="status.provider" class="mt-4">
              <v-list-item>
                <v-list-item-title>Proveedor</v-list-item-title>
                <v-list-item-subtitle>{{ status.provider }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="status.statistics">
                <v-list-item-title>Emails Enviados</v-list-item-title>
                <v-list-item-subtitle>{{ status.statistics.sent }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="status.statistics">
                <v-list-item-title>Fallos</v-list-item-title>
                <v-list-item-subtitle>{{ status.statistics.failed }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Proveedores Soportados</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-icon start>mdi-email</v-icon>
                SMTP Generico
              </v-list-item>
              <v-list-item>
                <v-icon start>mdi-email-fast</v-icon>
                SendGrid
              </v-list-item>
              <v-list-item>
                <v-icon start>mdi-email-multiple</v-icon>
                Mailgun
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Informacion</v-card-title>
          <v-card-text>
            <v-alert type="info" variant="tonal">
              Configura tu servidor de email para enviar notificaciones automaticas a tus clientes.
            </v-alert>
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
  name: 'EmailConfigView',
  data() {
    return {
      valid: false,
      saving: false,
      testing: false,
      config: {
        provider: 'smtp',
        fromName: '',
        fromEmail: '',
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpSecure: false,
        sendgridApiKey: '',
        mailgunApiKey: '',
        mailgunDomain: ''
      },
      providers: [
        { title: 'SMTP Generico', value: 'smtp' },
        { title: 'SendGrid', value: 'sendgrid' },
        { title: 'Mailgun', value: 'mailgun' }
      ],
      status: { initialized: false, provider: null, statistics: null },
      rules: {
        required: value => !!value || 'Campo requerido',
        email: value => /.+@.+\..+/.test(value) || 'Email invalido'
      },
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
        const response = await api.get('/api/plugins/email/config');
        if (response.data.config) this.config = { ...this.config, ...response.data.config };
      } catch (error) {
        console.error(error);
      }
    },
    async loadStatus() {
      try {
        const response = await api.get('/api/plugins/email/status');
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
        await api.post('/api/plugins/email/config', this.config);
        this.snackbar = { show: true, message: 'Configuracion guardada', color: 'success' };
        await this.loadStatus();
      } catch (error) {
        this.snackbar = { show: true, message: 'Error guardando configuracion', color: 'error' };
      } finally {
        this.saving = false;
      }
    },
    async testConnection() {
      this.testing = true;
      try {
        const response = await api.post('/api/plugins/email/test');
        if (response.data.success) {
          this.snackbar = { show: true, message: 'Email de prueba enviado correctamente', color: 'success' };
        } else {
          this.snackbar = { show: true, message: 'Error en la prueba de email', color: 'error' };
        }
      } catch (error) {
        this.snackbar = { show: true, message: error.response?.data?.message || 'Error probando conexion', color: 'error' };
      } finally {
        this.testing = false;
      }
    },
    resetForm() {
      this.$refs.form.reset();
    }
  }
};
</script>
