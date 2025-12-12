<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">
          <v-icon large class="mr-2">mdi-credit-card-outline</v-icon>
          Configuracion Openpay
        </h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Credenciales de Openpay</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="config.merchantId"
                label="Merchant ID"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                hint="ID de comercio de Openpay"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.privateKey"
                label="Private Key"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                type="password"
                hint="Llave privada de Openpay"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.publicKey"
                label="Public Key"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                hint="Llave publica de Openpay"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-switch
                v-model="config.sandboxMode"
                label="Modo Sandbox (Pruebas)"
                color="primary"
                hint="Habilitar para usar ambiente de pruebas"
                persistent-hint
                class="mb-4"
              ></v-switch>

              <v-divider class="my-4"></v-divider>

              <h3 class="text-h6 mb-4">Configuracion de Cobros</h3>

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
                v-model="config.enableCards"
                label="Habilitar pagos con tarjeta"
                color="primary"
                class="mb-4"
              ></v-switch>

              <v-switch
                v-model="config.enableStores"
                label="Habilitar pago en tiendas"
                color="primary"
                class="mb-4"
              ></v-switch>

              <v-switch
                v-model="config.enableBanks"
                label="Habilitar transferencia bancaria"
                color="primary"
                class="mb-4"
              ></v-switch>

              <v-text-field
                v-model.number="config.expirationDays"
                label="Dias de expiracion"
                variant="outlined"
                density="compact"
                type="number"
                hint="Dias antes de que expire un cargo"
                persistent-hint
                class="mb-4"
              ></v-text-field>

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
              Verifica que tus credenciales de Openpay sean correctas.
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
            <v-list v-if="status.merchantInfo" class="mt-4">
              <v-list-item>
                <v-list-item-title>Comercio</v-list-item-title>
                <v-list-item-subtitle>{{ status.merchantInfo.name }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Email</v-list-item-title>
                <v-list-item-subtitle>{{ status.merchantInfo.email }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Informacion</v-card-title>
          <v-card-text>
            <v-alert type="info" variant="tonal">
              Openpay permite cobrar con tarjetas, en tiendas de conveniencia y transferencias bancarias en Mexico.
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Ayuda</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                href="https://www.openpay.mx/docs/"
                target="_blank"
              >
                <v-icon start>mdi-book-open-variant</v-icon>
                Documentacion de Openpay
              </v-list-item>
              <v-list-item
                href="https://sandbox-dashboard.openpay.mx/"
                target="_blank"
              >
                <v-icon start>mdi-cog</v-icon>
                Dashboard Sandbox
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
  name: 'OpenpayConfigView',
  data() {
    return {
      valid: false,
      saving: false,
      testing: false,
      config: {
        merchantId: '',
        privateKey: '',
        publicKey: '',
        sandboxMode: false,
        country: 'MX',
        enableCards: true,
        enableStores: true,
        enableBanks: true,
        expirationDays: 7,
        webhookUrl: ''
      },
      countries: [
        { title: 'Mexico', value: 'MX' },
        { title: 'Colombia', value: 'CO' },
        { title: 'Peru', value: 'PE' }
      ],
      status: { initialized: false, merchantInfo: null },
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
        const response = await api.get('/plugins/openpay/config');
        if (response.data.config) this.config = { ...this.config, ...response.data.config };
      } catch (error) {
        console.error(error);
      }
    },
    async loadStatus() {
      try {
        const response = await api.get('/plugins/openpay/status');
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
        await api.post('/plugins/openpay/config', this.config);
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
        const response = await api.post('/plugins/openpay/test');
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
