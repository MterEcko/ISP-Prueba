<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">
          <v-icon large class="mr-2">mdi-telegram</v-icon>
          Configuracion Telegram Bot
        </h1>
        <p class="text-body-1 text-medium-emphasis">
          Configura tu bot de Telegram para chat y notificaciones
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Configuracion del Bot</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="config.botToken"
                label="Bot Token"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                type="password"
                hint="Token del bot obtenido de @BotFather"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.botUsername"
                label="Bot Username"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                hint="Nombre de usuario del bot (sin @)"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="config.adminChatId"
                label="Chat ID de Admin (opcional)"
                variant="outlined"
                density="compact"
                hint="Tu Chat ID para recibir notificaciones"
                persistent-hint
                class="mb-4"
              ></v-text-field>

              <v-divider class="my-4"></v-divider>

              <h3 class="text-h6 mb-4">Configuracion Adicional</h3>

              <v-switch
                v-model="config.enableCommands"
                label="Habilitar comandos del bot"
                color="primary"
                class="mb-4"
              ></v-switch>

              <v-textarea
                v-model="config.welcomeMessage"
                label="Mensaje de bienvenida"
                variant="outlined"
                rows="4"
                hint="Mensaje que vera el usuario al enviar /start"
                persistent-hint
              ></v-textarea>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="resetForm">
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              :disabled="!valid"
              :loading="saving"
              @click="saveConfig"
            >
              Guardar Configuracion
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Comandos Disponibles</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>/start</v-list-item-title>
                <v-list-item-subtitle>Iniciar conversacion con el bot</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>/link EMAIL</v-list-item-title>
                <v-list-item-subtitle>Vincular cuenta de usuario</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>/unlink</v-list-item-title>
                <v-list-item-subtitle>Desvincular cuenta</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>/status</v-list-item-title>
                <v-list-item-subtitle>Ver estado de vinculacion</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>/help</v-list-item-title>
                <v-list-item-subtitle>Mostrar ayuda</v-list-item-subtitle>
              </v-list-item>
            </v-list>
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
                  <v-chip :color="status.initialized ? 'success' : 'error'" size="small">
                    {{ status.initialized ? 'Activo' : 'Inactivo' }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="status.botUsername">
                <v-list-item-title>Bot Username</v-list-item-title>
                <v-list-item-subtitle>@{{ status.botUsername }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="statistics">
                <v-list-item-title>Usuarios vinculados</v-list-item-title>
                <v-list-item-subtitle>{{ statistics.linkedUsers || 0 }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="statistics">
                <v-list-item-title>Total de mensajes</v-list-item-title>
                <v-list-item-subtitle>{{ statistics.totalMessages || 0 }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-btn
              color="info"
              variant="outlined"
              block
              class="mt-4"
              @click="loadStatistics"
              :loading="loadingStats"
            >
              <v-icon start>mdi-refresh</v-icon>
              Actualizar Estadisticas
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Como Crear un Bot</v-card-title>
          <v-card-text>
            <ol class="text-body-2">
              <li>Abre Telegram y busca @BotFather</li>
              <li>Envia el comando /newbot</li>
              <li>Sigue las instrucciones para nombrar tu bot</li>
              <li>Copia el token que te proporciona</li>
              <li>Pega el token en el campo Bot Token</li>
            </ol>

            <v-alert type="info" variant="tonal" class="mt-4">
              Guarda el token de forma segura. Es como una contrasena para tu bot.
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Enlaces Utiles</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item href="https://core.telegram.org/bots" target="_blank">
                <v-icon start>mdi-book-open-variant</v-icon>
                Documentacion de Telegram Bots
              </v-list-item>
              <v-list-item href="https://t.me/BotFather" target="_blank">
                <v-icon start>mdi-robot</v-icon>
                Abrir BotFather
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
  name: 'TelegramConfigView',
  data() {
    return {
      valid: false,
      saving: false,
      loadingStats: false,
      config: {
        botToken: '',
        botUsername: '',
        adminChatId: '',
        enableCommands: true,
        welcomeMessage: 'Bienvenido al chat de ISP-Prueba\n\nPara vincular tu cuenta usa /link TU_EMAIL'
      },
      status: {
        initialized: false,
        botUsername: null
      },
      statistics: null,
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
  mounted() {
    this.loadConfig();
    this.loadStatus();
    this.loadStatistics();
  },
  methods: {
    async loadConfig() {
      try {
        const response = await api.get('/plugins/telegram/config');
        if (response.data.config) {
          this.config = { ...this.config, ...response.data.config };
        }
      } catch (error) {
        console.error('Error cargando configuracion:', error);
      }
    },
    async loadStatus() {
      try {
        const response = await api.get('/plugins/telegram/status');
        this.status = response.data;
      } catch (error) {
        console.error('Error cargando estado:', error);
      }
    },
    async loadStatistics() {
      this.loadingStats = true;
      try {
        const response = await api.get('/plugins/telegram/statistics');
        this.statistics = response.data.statistics;
      } catch (error) {
        console.error('Error cargando estadisticas:', error);
      } finally {
        this.loadingStats = false;
      }
    },
    async saveConfig() {
      const { valid } = await this.$refs.form.validate();
      if (!valid) return;

      this.saving = true;
      try {
        await api.post('/plugins/telegram/config', this.config);

        this.showSnackbar('Configuracion guardada correctamente', 'success');
        await this.loadStatus();
      } catch (error) {
        console.error('Error guardando configuracion:', error);
        this.showSnackbar(error.response?.data?.message || 'Error guardando configuracion', 'error');
      } finally {
        this.saving = false;
      }
    },
    resetForm() {
      this.$refs.form.reset();
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
