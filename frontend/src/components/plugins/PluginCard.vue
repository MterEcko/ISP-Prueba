<template>
  <v-card class="plugin-card" :class="pluginClass" elevation="2">
    <!-- Banner de imagen si existe -->
    <v-img
      v-if="plugin.banner || plugin.image"
      :src="plugin.banner || plugin.image"
      height="150"
      cover
      gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)"
    >
      <v-card-title class="text-white d-flex align-end" style="height: 100%">
        {{ plugin.name }}
      </v-card-title>
    </v-img>

    <v-card-title v-else class="d-flex align-center">
      <v-avatar :color="categoryColor" size="40" class="mr-3">
        <v-icon color="white">{{ categoryIcon }}</v-icon>
      </v-avatar>
      <div class="flex-grow-1">
        <div>{{ plugin.name }}</div>
        <div class="text-caption text-medium-emphasis">
          v{{ plugin.version }} por {{ plugin.author || 'Desconocido' }}
        </div>
      </div>
      <v-chip
        v-if="plugin.active"
        color="success"
        size="small"
        variant="flat"
      >
        <v-icon start size="small">mdi-check-circle</v-icon>
        Activo
      </v-chip>
      <v-chip
        v-else
        color="grey"
        size="small"
        variant="outlined"
      >
        Inactivo
      </v-chip>
    </v-card-title>

    <v-card-text>
      <!-- Descripción -->
      <p class="text-body-2 mb-3">
        {{ truncatedDescription }}
      </p>

      <!-- Categoría y metadata -->
      <div class="d-flex flex-wrap gap-2 mb-3">
        <v-chip size="small" variant="outlined" prepend-icon="mdi-tag">
          {{ categoryLabel }}
        </v-chip>
        <v-chip
          v-if="plugin.downloads"
          size="small"
          variant="outlined"
          prepend-icon="mdi-download"
        >
          {{ formatNumber(plugin.downloads) }}
        </v-chip>
        <v-chip
          v-if="plugin.rating"
          size="small"
          variant="outlined"
          prepend-icon="mdi-star"
        >
          {{ plugin.rating.toFixed(1) }}
        </v-chip>
        <!-- Indicador de licencia requerida -->
        <v-chip
          v-if="plugin.requiresUpgrade"
          size="small"
          color="warning"
          variant="flat"
          prepend-icon="mdi-lock"
        >
          Requiere {{ licenseLabel(plugin.requirements?.requiredLicense) }}
        </v-chip>
      </div>

      <!-- Alert si requiere upgrade -->
      <v-alert
        v-if="plugin.requiresUpgrade && !isInstalled"
        type="warning"
        density="compact"
        variant="tonal"
        class="mb-3"
      >
        <div class="text-caption">
          <strong>🔒 Licencia insuficiente</strong><br>
          Tu licencia: <strong>{{ licenseLabel(plugin.userLicenseType) }}</strong><br>
          Se requiere: <strong>{{ licenseLabel(plugin.requirements?.requiredLicense) }}</strong>
        </div>
      </v-alert>

      <!-- Características del plugin -->
      <div v-if="plugin.features && plugin.features.length > 0" class="mb-2">
        <div class="text-caption text-medium-emphasis mb-1">Características:</div>
        <ul class="text-caption pl-4">
          <li v-for="(feature, index) in plugin.features.slice(0, 3)" :key="index">
            {{ feature }}
          </li>
        </ul>
      </div>

      <!-- Requisitos -->
      <div v-if="showRequirements" class="text-caption text-medium-emphasis">
        <v-icon size="small">mdi-information</v-icon>
        Requiere: {{ requirementsText }}
      </div>
    </v-card-text>

    <v-divider></v-divider>

    <v-card-actions>
      <!-- Para plugins instalados -->
      <template v-if="isInstalled">
        <v-btn
          v-if="!plugin.active"
          color="primary"
          variant="text"
          size="small"
          @click="$emit('activate', plugin)"
        >
          <v-icon start>mdi-play</v-icon>
          Activar
        </v-btn>
        <v-btn
          v-else
          color="warning"
          variant="text"
          size="small"
          @click="$emit('deactivate', plugin)"
        >
          <v-icon start>mdi-pause</v-icon>
          Desactivar
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          @click="$emit('configure', plugin)"
        >
          <v-icon start>mdi-cog</v-icon>
          Configurar
        </v-btn>
        <v-spacer></v-spacer>
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props"></v-btn>
          </template>
          <v-list density="compact">
            <v-list-item @click="$emit('reload', plugin)">
              <template v-slot:prepend>
                <v-icon>mdi-refresh</v-icon>
              </template>
              <v-list-item-title>Recargar</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('view-details', plugin)">
              <template v-slot:prepend>
                <v-icon>mdi-information</v-icon>
              </template>
              <v-list-item-title>Detalles</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="$emit('uninstall', plugin)" class="text-error">
              <template v-slot:prepend>
                <v-icon color="error">mdi-delete</v-icon>
              </template>
              <v-list-item-title>Desinstalar</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>

      <!-- Para plugins del marketplace -->
      <template v-else>
        <!-- Botón de instalar o upgrade -->
        <v-btn
          v-if="plugin.requiresUpgrade"
          color="warning"
          variant="flat"
          size="small"
          @click="$emit('install', plugin)"
          :loading="installing"
        >
          <v-icon start>mdi-lock-open-variant</v-icon>
          Actualizar Licencia
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="flat"
          size="small"
          @click="$emit('install', plugin)"
          :loading="installing"
        >
          <v-icon start>mdi-download</v-icon>
          Instalar
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          @click="$emit('view-details', plugin)"
        >
          Más Info
        </v-btn>
        <v-spacer></v-spacer>
        <span class="text-h6 text-primary" v-if="plugin.price && plugin.price > 0">
          ${{ plugin.price }}
        </span>
        <v-chip v-else color="success" size="small" variant="flat">
          Gratis
        </v-chip>
      </template>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'PluginCard',
  props: {
    plugin: {
      type: Object,
      required: true
    },
    isInstalled: {
      type: Boolean,
      default: false
    },
    installing: {
      type: Boolean,
      default: false
    },
    showRequirements: {
      type: Boolean,
      default: false
    },
    maxDescriptionLength: {
      type: Number,
      default: 120
    }
  },
  emits: ['activate', 'deactivate', 'configure', 'reload', 'view-details', 'uninstall', 'install'],
  computed: {
    pluginClass() {
      return {
        'plugin-active': this.plugin.active,
        'plugin-inactive': !this.plugin.active && this.isInstalled
      };
    },
    categoryColor() {
      const colors = {
        payment: 'green',
        communication: 'blue',
        integration: 'purple',
        reporting: 'orange',
        security: 'red',
        productivity: 'teal',
        marketing: 'pink',
        analytics: 'indigo',
        automation: 'cyan',
        other: 'grey'
      };
      return colors[this.plugin.category] || 'grey';
    },
    categoryIcon() {
      const icons = {
        payment: 'mdi-credit-card',
        communication: 'mdi-message',
        integration: 'mdi-link-variant',
        reporting: 'mdi-chart-bar',
        security: 'mdi-shield',
        productivity: 'mdi-lightning-bolt',
        marketing: 'mdi-bullhorn',
        analytics: 'mdi-chart-line',
        automation: 'mdi-robot',
        other: 'mdi-puzzle'
      };
      return icons[this.plugin.category] || 'mdi-puzzle';
    },
    categoryLabel() {
      const labels = {
        payment: 'Pagos',
        communication: 'Comunicación',
        integration: 'Integración',
        reporting: 'Reportes',
        security: 'Seguridad',
        productivity: 'Productividad',
        marketing: 'Marketing',
        analytics: 'Análisis',
        automation: 'Automatización',
        other: 'Otros'
      };
      return labels[this.plugin.category] || this.plugin.category;
    },
    truncatedDescription() {
      const desc = this.plugin.description || 'Sin descripción';
      if (desc.length <= this.maxDescriptionLength) return desc;
      return desc.substring(0, this.maxDescriptionLength) + '...';
    },
    requirementsText() {
      const reqs = [];
      if (this.plugin.minVersion) reqs.push(`v${this.plugin.minVersion}+`);
      if (this.plugin.license) reqs.push(`Licencia ${this.plugin.license}`);
      return reqs.join(', ') || 'Ninguno';
    }
  },
  methods: {
    formatNumber(num) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    },
    licenseLabel(licenseType) {
      const labels = {
        basic: 'Básica',
        medium: 'Media',
        advanced: 'Avanzada',
        enterprise: 'Empresarial'
      };
      return labels[licenseType] || licenseType || 'Básica';
    }
  }
};
</script>

<style scoped>
.plugin-card {
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.plugin-card:hover {
  transform: translateY(-4px);
}

.plugin-active {
  border-left: 4px solid #4CAF50;
}

.plugin-inactive {
  opacity: 0.8;
}

.v-card-text {
  flex-grow: 1;
}
</style>
