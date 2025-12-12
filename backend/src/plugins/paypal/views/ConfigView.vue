<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">
          <v-icon large class="mr-2">mdi-paypal</v-icon>
          Configuracion PayPal
        </h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Credenciales de PayPal</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="config.clientId"
                label="Client ID"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                hint="Client ID de tu aplicacion PayPal"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.clientSecret"
                label="Client Secret"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                type="password"
                hint="Secret de tu aplicacion PayPal"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-switch
                v-model="config.testMode"
                label="Modo de Pruebas (Sandbox)"
                color="primary"
                hint="Habilitar para usar ambiente de pruebas"
                persistent-hint
                class="mb-4"
              ></v-switch>

              <v-divider class="my-4"></v-divider>

              <h3 class="text-h6 mb-4">Configuracion de Pagos</h3>

              <v-select
                v-model="config.currency"
                :items="currencies"
                label="Moneda"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                class="mb-4"
              ></v-select>

              <v-text-field
                v-model="config.returnUrl"
                label="URL de Retorno"
                variant="outlined"
                density="compact"
                hint="URL donde se redirige despues de pago exitoso"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.cancelUrl"
                label="URL de Cancelacion"
                variant="outlined"
                density="compact"
                hint="URL donde se redirige si se cancela el pago"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.webhookId"
                label="Webhook ID (opcional)"
                variant="outlined"
                density="compact"
                hint="ID del webhook configurado en PayPal"
                persistent-hint
                class="mb-4"
              ></v-text-field>
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
              Verifica que tus credenciales de PayPal sean correctas.
            </p>
            <v-btn color="success" :loading="testing" @click="testConnection">
              <v-icon start>mdi-connection</v-icon>
              Probar Conexion
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
            <v-list v-if="status.mode" class="mt-4">
              <v-list-item>
                <v-list-item-title>Modo</v-list-item-title>
                <v-list-item-subtitle>{{ status.mode }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Informacion</v-card-title>
          <v-card-text>
            <v-alert type="info" variant="tonal">
              PayPal permite recibir pagos internacionales de forma segura.
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Ayuda</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                href="https://developer.paypal.com/docs/"
                target="_blank"
              >
                <v-icon start>mdi-book-open-variant</v-icon>
                Documentacion de PayPal
              </v-list-item>
              <v-list-item
                href="https://developer.paypal.com/developer/applications"
                target="_blank"
              >
                <v-icon start>mdi-cog</v-icon>
                Mis Aplicaciones
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
  name: 'PayPalConfigView',
  data() {
    return {
      valid: false,
      saving: false,
      testing: false,
      config: {
        clientId: '',
        clientSecret: '',
        testMode: false,
        currency: 'USD',
        returnUrl: '',
        cancelUrl: '',
        webhookId: ''
      },
      currencies: [
        { title: 'USD - Dolar Estadounidense', value: 'USD' },
        { title: 'EUR - Euro', value: 'EUR' },
        { title: 'MXN - Peso Mexicano', value: 'MXN' },
        { title: 'GBP - Libra Esterlina', value: 'GBP' },
        { title: 'CAD - Dolar Canadiense', value: 'CAD' },
        { title: 'AUD - Dolar Australiano', value: 'AUD' },
        { title: 'BRL - Real Brasileno', value: 'BRL' }
      ],
      status: { initialized: false, mode: null },
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
        const response = await api.get('/plugins/paypal/config');
        if (response.data.config) this.config = { ...this.config, ...response.data.config };
      } catch (error) {
        console.error(error);
      }
    },
    async loadStatus() {
      try {
        const response = await api.get('/plugins/paypal/status');
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
        await api.post('/plugins/paypal/config', this.config);
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
        const response = await api.post('/plugins/paypal/test');
        if (response.data.success) {
          this.snackbar = { show: true, message: 'Conexion exitosa', color: 'success' };
        } else {
          this.snackbar = { show: true, message: 'Error en la conexion', color: 'error' };
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
