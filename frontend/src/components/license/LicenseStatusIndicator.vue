<template>
  <v-menu offset-y>
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        :color="statusColor"
        variant="outlined"
        size="small"
        class="license-status-btn"
      >
        <v-icon start>{{ statusIcon }}</v-icon>
        <span class="d-none d-sm-inline">{{ statusText }}</span>
        <v-badge
          v-if="showBadge"
          color="error"
          dot
          overlap
          class="ml-2"
        ></v-badge>
      </v-btn>
    </template>

    <v-card min-width="300" max-width="400">
      <v-card-title class="d-flex align-center">
        <v-icon :color="statusColor" class="mr-2">{{ statusIcon }}</v-icon>
        <span>Estado de Licencia</span>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text>
        <template v-if="hasLicense">
          <!-- Plan actual -->
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Plan Actual</div>
            <div class="text-h6">{{ planTitle }}</div>
          </div>

          <!-- Licencia Maestra -->
          <v-alert
            v-if="isMasterLicense"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            <v-icon start>mdi-shield-crown</v-icon>
            Licencia Maestra Activa
          </v-alert>

          <!-- Información de expiración -->
          <div v-if="!isMasterLicense" class="mb-3">
            <div class="text-caption text-medium-emphasis">Expiración</div>
            <div class="text-body-1">
              <v-icon :color="expirationColor" size="small" class="mr-1">
                {{ expirationIcon }}
              </v-icon>
              {{ expirationText }}
            </div>
          </div>

          <!-- Progreso de días -->
          <div v-if="showProgress" class="mb-3">
            <div class="text-caption text-medium-emphasis mb-1">
              Días restantes: {{ daysRemaining }}
            </div>
            <v-progress-linear
              :model-value="expirationProgress"
              :color="progressColor"
              height="6"
              rounded
            ></v-progress-linear>
          </div>

          <!-- Límite de clientes -->
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Límite de Clientes</div>
            <div class="text-body-1">
              <v-icon size="small" class="mr-1">mdi-account-group</v-icon>
              {{ clientLimitText }}
            </div>
          </div>

          <!-- Características destacadas -->
          <div v-if="topFeatures.length > 0">
            <div class="text-caption text-medium-emphasis mb-1">
              Características Destacadas
            </div>
            <v-chip
              v-for="feature in topFeatures"
              :key="feature.key"
              size="x-small"
              variant="outlined"
              class="mr-1 mb-1"
            >
              <v-icon start size="x-small">{{ feature.icon }}</v-icon>
              {{ feature.label }}
            </v-chip>
          </div>
        </template>

        <template v-else>
          <v-alert type="warning" variant="tonal">
            <div class="text-body-2">No hay licencia activa</div>
            <div class="text-caption mt-1">
              Actualmente estás usando el plan Freemium con funcionalidades limitadas.
            </div>
          </v-alert>
        </template>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-btn
          v-if="!hasLicense"
          color="primary"
          variant="flat"
          block
          @click="goToActivation"
        >
          <v-icon start>mdi-key</v-icon>
          Activar Licencia
        </v-btn>
        <template v-else>
          <v-btn
            variant="text"
            size="small"
            @click="goToLicenseManagement"
          >
            <v-icon start>mdi-cog</v-icon>
            Gestionar
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            v-if="canUpgrade"
            color="primary"
            variant="tonal"
            size="small"
            @click="goToUpgrade"
          >
            <v-icon start>mdi-arrow-up-circle</v-icon>
            Mejorar
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'LicenseStatusIndicator',
  computed: {
    ...mapGetters('license', [
      'getLicenseStatus',
      'hasActiveLicense',
      'isMasterLicense',
      'getCurrentPlan',
      'getDaysRemaining',
      'isExpiringSoon',
      'isExpired',
      'getClientLimit',
      'isUnlimitedPlan',
      'getEnabledFeatures'
    ]),
    hasLicense() {
      return this.getLicenseStatus.hasLicense;
    },
    statusColor() {
      if (this.isMasterLicense) return 'purple';
      if (!this.hasLicense) return 'grey';
      if (this.isExpired) return 'error';
      if (this.isExpiringSoon) return 'warning';
      return 'success';
    },
    statusIcon() {
      if (this.isMasterLicense) return 'mdi-shield-crown';
      if (!this.hasLicense) return 'mdi-alert-circle-outline';
      if (this.isExpired) return 'mdi-close-circle';
      if (this.isExpiringSoon) return 'mdi-alert';
      return 'mdi-check-circle';
    },
    statusText() {
      if (this.isMasterLicense) return 'Maestra';
      if (!this.hasLicense) return 'Sin licencia';
      if (this.isExpired) return 'Expirada';
      if (this.isExpiringSoon) return 'Por vencer';
      return this.planTitle;
    },
    planTitle() {
      const plans = {
        freemium: 'Freemium',
        basic: 'Básico',
        premium: 'Premium',
        enterprise: 'Enterprise'
      };
      return plans[this.getCurrentPlan] || this.getCurrentPlan;
    },
    showBadge() {
      return this.isExpired || (this.isExpiringSoon && this.getDaysRemaining <= 7);
    },
    daysRemaining() {
      return this.getDaysRemaining;
    },
    expirationText() {
      if (this.isMasterLicense) return 'Sin expiración';
      if (!this.daysRemaining && this.daysRemaining !== 0) return 'Sin expiración';
      if (this.daysRemaining === 0) return 'Expira hoy';
      if (this.daysRemaining < 0) return 'Expirada';
      if (this.daysRemaining === 1) return 'Expira mañana';
      if (this.daysRemaining <= 30) return `Expira en ${this.daysRemaining} días`;
      return `${this.daysRemaining} días restantes`;
    },
    expirationColor() {
      if (this.isMasterLicense) return 'purple';
      if (!this.daysRemaining && this.daysRemaining !== 0) return 'success';
      if (this.daysRemaining <= 0) return 'error';
      if (this.daysRemaining <= 7) return 'error';
      if (this.daysRemaining <= 30) return 'warning';
      return 'success';
    },
    expirationIcon() {
      if (this.isMasterLicense) return 'mdi-infinity';
      if (!this.daysRemaining && this.daysRemaining !== 0) return 'mdi-check';
      if (this.daysRemaining <= 0) return 'mdi-close-circle';
      if (this.daysRemaining <= 7) return 'mdi-alert-circle';
      return 'mdi-calendar-check';
    },
    showProgress() {
      return !this.isMasterLicense && this.daysRemaining !== null && this.daysRemaining > 0;
    },
    expirationProgress() {
      if (!this.showProgress) return 0;
      // Asumiendo 365 días como total
      const totalDays = 365;
      return Math.min((this.daysRemaining / totalDays) * 100, 100);
    },
    progressColor() {
      if (this.daysRemaining <= 7) return 'error';
      if (this.daysRemaining <= 30) return 'warning';
      return 'success';
    },
    clientLimitText() {
      if (this.isUnlimitedPlan) return 'Ilimitados';
      return `Hasta ${this.getClientLimit}`;
    },
    canUpgrade() {
      return !this.isMasterLicense && this.getCurrentPlan !== 'enterprise';
    },
    topFeatures() {
      const features = this.getEnabledFeatures;
      const featureLabels = {
        unlimited_clients: { label: 'Clientes Ilimitados', icon: 'mdi-account-multiple' },
        plugin_marketplace: { label: 'Marketplace', icon: 'mdi-store' },
        advanced_inventory: { label: 'Inventario Avanzado', icon: 'mdi-package-variant' },
        api_access: { label: 'API', icon: 'mdi-api' },
        priority_support: { label: 'Soporte 24/7', icon: 'mdi-headset' }
      };

      return Object.entries(features)
        .filter(([key, value]) => value === true && featureLabels[key])
        .map(([key]) => ({
          key,
          label: featureLabels[key].label,
          icon: featureLabels[key].icon
        }))
        .slice(0, 3);
    }
  },
  mounted() {
    // Verificar estado de licencia al montar
    this.$store.dispatch('license/checkLicenseStatus');
  },
  methods: {
    goToActivation() {
      this.$router.push('/license/activate');
    },
    goToLicenseManagement() {
      this.$router.push('/license/management');
    },
    goToUpgrade() {
      this.$router.push('/license/upgrade');
    }
  }
};
</script>

<style scoped>
.license-status-btn {
  text-transform: none;
}
</style>
