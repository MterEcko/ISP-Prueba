<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">
          <v-icon large class="mr-2">mdi-key-chain</v-icon>
          Gestión de Licencias
        </h-icon>
        </h1>
      </v-col>
    </v-row>

    <!-- Estado actual de licencia -->
    <v-row v-if="currentLicense">
      <v-col cols="12">
        <v-alert
          :type="licenseAlertType"
          variant="tonal"
          prominent
        >
          <template v-slot:prepend>
            <v-icon :icon="licenseStatusIcon"></v-icon>
          </template>
          <v-alert-title>{{ licenseStatusTitle }}</v-alert-title>
          <div>{{ licenseStatusMessage }}</div>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Botones de acción -->
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex gap-2">
        <v-btn color="primary" @click="showActivationDialog = true">
          <v-icon start>mdi-key-plus</v-icon>
          Activar Nueva Licencia
        </v-btn>
        <v-btn variant="outlined" @click="refreshLicenses">
          <v-icon start>mdi-refresh</v-icon>
          Actualizar
        </v-btn>
      </v-col>
    </v-row>

    <!-- Licencia actual -->
    <v-row v-if="currentLicense">
      <v-col cols="12" md="8">
        <LicenseCard
          :license="currentLicense"
          @deactivate="handleDeactivate"
          @view-details="showLicenseDetails"
          @renew="handleRenew"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Estadísticas de Uso</v-card-title>
          <v-card-text>
            <div class="mb-3">
              <div class="text-caption">Clientes Actuales</div>
              <div class="text-h5">{{ usageStats.clients || 0 }}</div>
            </div>
            <v-divider class="my-3"></v-divider>
            <div>
              <div class="text-caption">Límite de Plan</div>
              <div class="text-h5">
                {{ currentLicense.clientLimit === null ? '∞' : currentLicense.clientLimit }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo de activación -->
    <v-dialog v-model="showActivationDialog" max-width="600">
      <LicenseActivationForm
        @success="handleActivationSuccess"
        @cancel="showActivationDialog = false"
      />
    </v-dialog>

    <!-- Loading -->
    <v-overlay :model-value="loading" contained class="align-center justify-center">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import { mapGetters } from 'vuex';
import LicenseCard from '@/components/license/LicenseCard.vue';
import LicenseActivationForm from '@/components/license/LicenseActivationForm.vue';

export default {
  name: 'LicenseManagementView',
  components: {
    LicenseCard,
    LicenseActivationForm
  },
  data() {
    return {
      showActivationDialog: false,
      usageStats: {},
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      }
    };
  },
  computed: {
    ...mapGetters('license', [
      'getCurrentLicense',
      'getLicenseStatus',
      'isLoading'
    ]),
    currentLicense() {
      return this.getCurrentLicense;
    },
    loading() {
      return this.isLoading('current');
    },
    licenseAlertType() {
      const status = this.getLicenseStatus.status;
      if (status === 'master') return 'info';
      if (status === 'active') return 'success';
      if (status === 'expiring_soon') return 'warning';
      if (status === 'expired') return 'error';
      return 'info';
    },
    licenseStatusIcon() {
      if (this.currentLicense?.isMasterLicense) return 'mdi-shield-crown';
      const status = this.getLicenseStatus.status;
      if (status === 'active') return 'mdi-check-circle';
      if (status === 'expiring_soon') return 'mdi-alert';
      if (status === 'expired') return 'mdi-close-circle';
      return 'mdi-information';
    },
    licenseStatusTitle() {
      if (this.currentLicense?.isMasterLicense) return 'Licencia Maestra Activa';
      return this.getLicenseStatus.message || 'Estado de Licencia';
    },
    licenseStatusMessage() {
      const days = this.getLicenseStatus.daysRemaining;
      if (this.currentLicense?.isMasterLicense) {
        return 'Tienes acceso completo a todas las funcionalidades sin restricciones.';
      }
      if (days !== null && days > 0) {
        return `Tu licencia expirará en ${days} días. Renuévala antes de que expire.`;
      }
      return '';
    }
  },
  async mounted() {
    await this.loadLicenseData();
  },
  methods: {
    async loadLicenseData() {
      try {
        await this.$store.dispatch('license/fetchCurrentLicense');
        await this.$store.dispatch('license/checkLicenseStatus');
      } catch (error) {
        console.error('Error loading license:', error);
      }
    },
    async refreshLicenses() {
      await this.loadLicenseData();
      this.showSnackbar('Licencias actualizadas', 'success');
    },
    // eslint-disable-next-line no-unused-vars
    async handleActivationSuccess(license) {
      this.showActivationDialog = false;
      this.showSnackbar('Licencia activada exitosamente', 'success');
      await this.refreshLicenses();
    },
    async handleDeactivate(license) {
      if (confirm('¿Estás seguro de desactivar esta licencia?')) {
        try {
          await this.$store.dispatch('license/deactivateLicense', license.id);
          this.showSnackbar('Licencia desactivada', 'success');
          await this.refreshLicenses();
        } catch (error) {
          this.showSnackbar('Error al desactivar licencia', 'error');
        }
      }
    },
    // eslint-disable-next-line no-unused-vars
    handleRenew(license) {
      // Implementar renovación
      alert('Renovación de licencia - Próximamente');
    },
    // eslint-disable-next-line no-unused-vars
    showLicenseDetails(license) {
      // Mostrar detalles
      alert('Detalles de licencia - Próximamente');
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
