<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">
          <v-icon large class="mr-2">mdi-credit-card</v-icon>
          Configuracion Stripe
        </h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Credenciales de Stripe</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="config.publishableKey"
                label="Publishable Key"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                hint="Clave publica de Stripe (pk_...)"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.secretKey"
                label="Secret Key"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                type="password"
                hint="Clave secreta de Stripe (sk_...)"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-switch
                v-model="config.testMode"
                label="Modo de Pruebas"
                color="primary"
                hint="Habilitar para usar claves de prueba"
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
                v-model="config.companyName"
                label="Nombre de la Empresa"
                variant="outlined"
                density="compact"
                hint="Aparecera en los recibos de Stripe"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-switch
                v-model="config.capturePayments"
                label="Capturar pagos automaticamente"
                color="primary"
                hint="Si esta deshabilitado, los pagos deben ser capturados manualmente"
                persistent-hint
                class="mb-4"
              ></v-switch>

              <v-text-field
                v-model="config.webhookSecret"
                label="Webhook Secret (opcional)"
                variant="outlined"
                density="compact"
                type="password"
                hint="Secret del webhook para verificar eventos (whsec_...)"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.webhookUrl"
                label="URL de Webhook (informativa)"
                variant="outlined"
                density="compact"
                readonly
                hint="Configura esta URL en tu dashboard de Stripe"
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
              Verifica que tus credenciales de Stripe sean correctas.
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
            <v-list v-if="status.account" class="mt-4">
              <v-list-item>
                <v-list-item-title>Cuenta</v-list-item-title>
                <v-list-item-subtitle>{{ status.account.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>ID</v-list-item-title>
                <v-list-item-subtitle>{{ status.account.id }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Modo</v-list-item-title>
                <v-list-item-subtitle>{{ status.account.livemode ? 'Produccion' : 'Prueba' }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Informacion</v-card-title>
          <v-card-text>
            <v-alert type="info" variant="tonal">
              Stripe es una plataforma de pagos global que permite aceptar tarjetas de credito y debito de forma segura.
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Metodos de Pago</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-icon start>mdi-credit-card</v-icon>
                Tarjetas de Credito/Debito
              </v-list-item>
              <v-list-item>
                <v-icon start>mdi-bank</v-icon>
                Transferencias Bancarias
              </v-list-item>
              <v-list-item>
                <v-icon start>mdi-wallet</v-icon>
                Wallets Digitales
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Ayuda</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                href="https://stripe.com/docs"
                target="_blank"
              >
                <v-icon start>mdi-book-open-variant</v-icon>
                Documentacion de Stripe
              </v-list-item>
              <v-list-item
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
              >
                <v-icon start>mdi-key</v-icon>
                Obtener API Keys
              </v-list-item>
              <v-list-item
                href="https://dashboard.stripe.com/webhooks"
                target="_blank"
              >
                <v-icon start>mdi-webhook</v-icon>
                Configurar Webhooks
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
  name: 'StripeConfigView',
  data() {
    return {
      valid: false,
      saving: false,
      testing: false,
      config: {
        publishableKey: '',
        secretKey: '',
        testMode: false,
        currency: 'USD',
        companyName: '',
        capturePayments: true,
        webhookSecret: '',
        webhookUrl: `${window.location.origin}/plugins/stripe/webhook`
      },
      currencies: [
        { title: 'USD - Dolar Estadounidense', value: 'USD' },
        { title: 'EUR - Euro', value: 'EUR' },
        { title: 'MXN - Peso Mexicano', value: 'MXN' },
        { title: 'GBP - Libra Esterlina', value: 'GBP' },
        { title: 'CAD - Dolar Canadiense', value: 'CAD' },
        { title: 'AUD - Dolar Australiano', value: 'AUD' },
        { title: 'BRL - Real Brasileno', value: 'BRL' },
        { title: 'JPY - Yen Japones', value: 'JPY' },
        { title: 'CNY - Yuan Chino', value: 'CNY' }
      ],
      status: { initialized: false, account: null },
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
        const response = await api.get('/plugins/stripe/config');
        if (response.data.config) {
          this.config = { ...this.config, ...response.data.config };
          // Actualizar webhookUrl con el origen actual
          this.config.webhookUrl = `${window.location.origin}/plugins/stripe/webhook`;
        }
      } catch (error) {
        console.error(error);
      }
    },
    async loadStatus() {
      try {
        const response = await api.get('/plugins/stripe/status');
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
        await api.post('/plugins/stripe/config', this.config);
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
        const response = await api.post('/plugins/stripe/test');
        if (response.data.success) {
          this.snackbar = { show: true, message: 'Conexion exitosa con Stripe', color: 'success' };
          // Recargar estado para mostrar info de la cuenta
          await this.loadStatus();
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
