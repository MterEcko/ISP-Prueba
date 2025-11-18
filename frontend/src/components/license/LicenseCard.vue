<template>
  <v-card class="license-card" :class="licenseClass" elevation="2">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon :color="statusColor" size="large" class="mr-2">
          {{ statusIcon }}
        </v-icon>
        <div>
          <div class="text-h6">{{ planTitle }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ license.licenseKey }}
          </div>
        </div>
      </div>
      <v-chip :color="statusColor" variant="flat" size="small">
        {{ statusText }}
      </v-chip>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text>
      <v-row dense>
        <!-- Límite de clientes -->
        <v-col cols="12" md="6">
          <div class="info-item">
            <v-icon size="small" class="mr-2">mdi-account-group</v-icon>
            <span class="text-body-2">
              <strong>Clientes:</strong>
              {{ license.clientLimit === null ? 'Ilimitados' : license.clientLimit }}
            </span>
          </div>
        </v-col>

        <!-- Fecha de expiración -->
        <v-col cols="12" md="6">
          <div class="info-item">
            <v-icon size="small" class="mr-2">mdi-calendar-clock</v-icon>
            <span class="text-body-2">
              <strong>Expira:</strong>
              {{ expirationText }}
            </span>
          </div>
        </v-col>

        <!-- Características habilitadas -->
        <v-col cols="12" v-if="enabledFeatures.length > 0">
          <div class="mt-2">
            <div class="text-body-2 font-weight-bold mb-2">Características:</div>
            <div class="features-container">
              <v-chip
                v-for="feature in enabledFeatures.slice(0, showAllFeatures ? undefined : 5)"
                :key="feature.key"
                size="small"
                variant="outlined"
                class="ma-1"
              >
                <v-icon start size="small">{{ feature.icon }}</v-icon>
                {{ feature.label }}
              </v-chip>
              <v-btn
                v-if="enabledFeatures.length > 5"
                variant="text"
                size="small"
                @click="showAllFeatures = !showAllFeatures"
              >
                {{ showAllFeatures ? 'Ver menos' : `+${enabledFeatures.length - 5} más` }}
              </v-btn>
            </div>
          </div>
        </v-col>

        <!-- Licencia Maestra Badge -->
        <v-col cols="12" v-if="license.isMasterLicense">
          <v-alert type="info" variant="tonal" density="compact" class="mt-2">
            <v-icon start>mdi-shield-crown</v-icon>
            Licencia Maestra - Acceso Completo
          </v-alert>
        </v-col>
      </v-row>
    </v-card-text>

    <v-divider></v-divider>

    <v-card-actions>
      <v-btn
        v-if="!license.active"
        color="primary"
        variant="text"
        @click="$emit('activate', license)"
      >
        <v-icon start>mdi-check-circle</v-icon>
        Activar
      </v-btn>
      <v-btn
        v-if="license.active"
        color="warning"
        variant="text"
        @click="$emit('deactivate', license)"
      >
        <v-icon start>mdi-cancel</v-icon>
        Desactivar
      </v-btn>
      <v-btn variant="text" @click="$emit('view-details', license)">
        <v-icon start>mdi-information</v-icon>
        Detalles
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
        v-if="canRenew"
        color="success"
        variant="text"
        @click="$emit('renew', license)"
      >
        <v-icon start>mdi-refresh</v-icon>
        Renovar
      </v-btn>
      <v-btn
        icon
        variant="text"
        @click="$emit('delete', license)"
        v-if="!license.isMasterLicense"
      >
        <v-icon>mdi-delete</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'LicenseCard',
  props: {
    license: {
      type: Object,
      required: true
    }
  },
  emits: ['activate', 'deactivate', 'view-details', 'renew', 'delete'],
  data() {
    return {
      showAllFeatures: false
    };
  },
  computed: {
    planTitle() {
      const plans = {
        freemium: 'Freemium',
        basic: 'Básico',
        premium: 'Premium',
        enterprise: 'Enterprise'
      };
      return plans[this.license.planType] || this.license.planType;
    },
    statusColor() {
      if (this.license.isMasterLicense) return 'purple';
      if (!this.license.active) return 'grey';
      if (this.isExpired) return 'error';
      if (this.isExpiringSoon) return 'warning';
      return 'success';
    },
    statusIcon() {
      if (this.license.isMasterLicense) return 'mdi-shield-crown';
      if (!this.license.active) return 'mdi-pause-circle';
      if (this.isExpired) return 'mdi-alert-circle';
      if (this.isExpiringSoon) return 'mdi-alert';
      return 'mdi-check-circle';
    },
    statusText() {
      if (this.license.isMasterLicense) return 'MAESTRA';
      if (!this.license.active) return 'Inactiva';
      if (this.isExpired) return 'Expirada';
      if (this.isExpiringSoon) return 'Por vencer';
      return 'Activa';
    },
    licenseClass() {
      return {
        'license-master': this.license.isMasterLicense,
        'license-active': this.license.active && !this.isExpired,
        'license-expired': this.isExpired,
        'license-inactive': !this.license.active
      };
    },
    expirationText() {
      if (!this.license.expiresAt) return 'Sin expiración';

      const expirationDate = new Date(this.license.expiresAt);
      const today = new Date();
      const diffTime = expirationDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'Expirada';
      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Mañana';
      if (diffDays <= 30) return `${diffDays} días`;

      return expirationDate.toLocaleDateString();
    },
    isExpired() {
      if (!this.license.expiresAt) return false;
      return new Date(this.license.expiresAt) < new Date();
    },
    isExpiringSoon() {
      if (!this.license.expiresAt) return false;
      const expirationDate = new Date(this.license.expiresAt);
      const today = new Date();
      const diffDays = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays > 0;
    },
    canRenew() {
      return this.isExpired || this.isExpiringSoon;
    },
    enabledFeatures() {
      if (!this.license.featuresEnabled) return [];

      const featureLabels = {
        unlimited_clients: { label: 'Clientes Ilimitados', icon: 'mdi-account-multiple' },
        unlimited_users: { label: 'Usuarios Ilimitados', icon: 'mdi-account-group' },
        unlimited_plugins: { label: 'Plugins Ilimitados', icon: 'mdi-puzzle' },
        plugin_marketplace: { label: 'Marketplace', icon: 'mdi-store' },
        advanced_inventory: { label: 'Inventario Avanzado', icon: 'mdi-package-variant' },
        advanced_billing: { label: 'Facturación Avanzada', icon: 'mdi-receipt' },
        advanced_reports: { label: 'Reportes Avanzados', icon: 'mdi-chart-bar' },
        api_access: { label: 'Acceso API', icon: 'mdi-api' },
        white_label: { label: 'White Label', icon: 'mdi-label' },
        priority_support: { label: 'Soporte Prioritario', icon: 'mdi-headset' },
        custom_integrations: { label: 'Integraciones Custom', icon: 'mdi-link-variant' },
        multi_branch: { label: 'Multi-sucursal', icon: 'mdi-office-building' },
        advanced_security: { label: 'Seguridad Avanzada', icon: 'mdi-shield-check' },
        backup_restore: { label: 'Backup y Restauración', icon: 'mdi-backup-restore' },
        audit_logs: { label: 'Logs de Auditoría', icon: 'mdi-file-document' }
      };

      return Object.entries(this.license.featuresEnabled)
      // eslint-disable-next-line no-unused-vars
        .filter(([key, value]) => value === true)
        .map(([key]) => ({
          key,
          label: featureLabels[key]?.label || key,
          icon: featureLabels[key]?.icon || 'mdi-check'
        }));
    }
  }
};
</script>

<style scoped>
.license-card {
  transition: all 0.3s ease;
}

.license-card:hover {
  transform: translateY(-2px);
}

.license-master {
  border: 2px solid #9C27B0;
}

.license-active {
  border-left: 4px solid #4CAF50;
}

.license-expired {
  border-left: 4px solid #F44336;
  opacity: 0.8;
}

.license-inactive {
  opacity: 0.7;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.features-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
