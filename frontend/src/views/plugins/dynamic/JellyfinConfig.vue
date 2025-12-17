<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">
          <v-icon large class="mr-2">mdi-multimedia</v-icon>
          Configuracion Jellyfin Media Server
        </h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Configuracion del Servidor</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="config.serverUrl"
                label="URL del Servidor"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                hint="Ejemplo: https://jellyfin.tudominio.com"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.apiKey"
                label="API Key"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                type="password"
                class="mb-4"
              ></v-text-field>

              <v-divider class="my-4"></v-divider>

              <h3 class="text-h6 mb-4">Aprovisionamiento Automatico</h3>

              <v-switch
                v-model="config.autoProvision"
                label="Habilitar aprovisionamiento automatico"
                color="primary"
                hint="Crear usuarios automaticamente cuando se crea un cliente"
                persistent-hint
                class="mb-4"
              ></v-switch>

              <v-text-field
                v-if="config.autoProvision"
                v-model="config.defaultLibraries"
                label="Bibliotecas por defecto"
                variant="outlined"
                density="compact"
                hint="IDs de bibliotecas separados por coma"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-switch
                v-if="config.autoProvision"
                v-model="config.sendCredentials"
                label="Enviar credenciales por correo"
                color="primary"
                class="mb-4"
              ></v-switch>

              <v-divider class="my-4"></v-divider>

              <h3 class="text-h6 mb-4">Politicas de Usuario</h3>

              <v-switch
                v-model="config.enableDownloads"
                label="Permitir descargas"
                color="primary"
                class="mb-4"
              ></v-switch>

              <v-switch
                v-model="config.enableLiveTV"
                label="Habilitar TV en vivo"
                color="primary"
                class="mb-4"
              ></v-switch>

              <v-text-field
                v-model.number="config.maxStreamBitrate"
                label="Bitrate maximo (kbps)"
                variant="outlined"
                density="compact"
                type="number"
                hint="0 = sin limite"
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
              Verifica que tu servidor Jellyfin sea accesible y la API Key sea correcta.
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
            <v-list v-if="status.serverInfo" class="mt-4">
              <v-list-item>
                <v-list-item-title>Servidor</v-list-item-title>
                <v-list-item-subtitle>{{ status.serverInfo.name }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Version</v-list-item-title>
                <v-list-item-subtitle>{{ status.serverInfo.version }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Informacion</v-card-title>
          <v-card-text>
            <v-alert type="info" variant="tonal">
              Los usuarios seran creados automaticamente cuando se active un nuevo cliente.
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
  name: 'JellyfinConfigView',
  data() {
    return {
      valid: false,
      saving: false,
      testing: false,
      config: {
        serverUrl: '',
        apiKey: '',
        autoProvision: false,
        defaultLibraries: '',
        sendCredentials: true,
        enableDownloads: true,
        enableLiveTV: false,
        maxStreamBitrate: 0
      },
      status: { initialized: false, serverInfo: null },
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
        const response = await api.get('/plugins/jellyfin/config');
        if (response.data.config) this.config = { ...this.config, ...response.data.config };
      } catch (error) {
        console.error(error);
      }
    },
    async loadStatus() {
      try {
        const response = await api.get('/plugins/jellyfin/status');
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
        await api.post('/plugins/jellyfin/config', this.config);
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
        const response = await api.post('/plugins/jellyfin/test');
        if (response.data.success) {
          this.snackbar = { show: true, message: `Conexion exitosa: ${response.data.serverName}`, color: 'success' };
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
