<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">
          <v-icon large class="mr-2">mdi-cash-multiple</v-icon>
          Configuracion MercadoPago
        </h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Credenciales de MercadoPago</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="config.accessToken"
                label="Access Token"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                type="password"
                hint="Token de acceso de MercadoPago"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-select
                v-model="config.country"
                :items="countries"
                label="Pais"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                class="mb-4"
              ></v-select>

              <v-switch
                v-model="config.sandbox"
                label="Modo Sandbox (Pruebas)"
                color="primary"
                hint="Habilitar para usar ambiente de pruebas"
                persistent-hint
                class="mb-4"
              ></v-switch>

              <v-divider class="my-4"></v-divider>

              <h3 class="text-h6 mb-4">Configuracion de Pagos</h3>

              <v-text-field
                v-model.number="config.expirationDays"
                label="Dias de expiracion"
                variant="outlined"
                density="compact"
                type="number"
                hint="Dias antes de que expire un link de pago"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-switch
                v-model="config.notifyCustomer"
                label="Notificar al cliente"
                color="primary"
                hint="Enviar notificaciones de pago al cliente"
                persistent-hint
                class="mb-4"
              ></v-switch>

              <v-text-field
                v-model="config.webhookUrl"
                label="URL de Webhook (opcional)"
                variant="outlined"
                density="compact"
                hint="URL para recibir notificaciones de pago"
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
              Verifica que tus credenciales de MercadoPago sean correctas.
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
            <v-list v-if="status.accountInfo" class="mt-4">
              <v-list-item>
                <v-list-item-title>Email</v-list-item-title>
                <v-list-item-subtitle>{{ status.accountInfo.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Usuario</v-list-item-title>
                <v-list-item-subtitle>{{ status.accountInfo.nickname }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Informacion</v-card-title>
          <v-card-text>
            <v-alert type="info" variant="tonal">
              MercadoPago permite generar links de pago y cobrar a clientes de forma automatica.
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
  name: 'MercadoPagoConfigView',
  data() {
    return {
      valid: false,
      saving: false,
      testing: false,
      config: {
        accessToken: '',
        country: 'MX',
        sandbox: false,
        expirationDays: 7,
        notifyCustomer: true,
        webhookUrl: ''
      },
      countries: [
        { title: 'Argentina', value: 'AR' },
        { title: 'Brasil', value: 'BR' },
        { title: 'Chile', value: 'CL' },
        { title: 'Colombia', value: 'CO' },
        { title: 'Mexico', value: 'MX' },
        { title: 'Peru', value: 'PE' },
        { title: 'Uruguay', value: 'UY' }
      ],
      status: { initialized: false, accountInfo: null },
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
        const response = await api.get('/plugins/mercadopago/config');
        if (response.data.config) this.config = { ...this.config, ...response.data.config };
      } catch (error) {
        console.error(error);
      }
    },
    async loadStatus() {
      try {
        const response = await api.get('/plugins/mercadopago/status');
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
        await api.post('/plugins/mercadopago/config', this.config);
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
        const response = await api.post('/plugins/mercadopago/test');
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
