<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">
          <v-icon large class="mr-2">mdi-puzzle</v-icon>
          Gestión de Plugins
        </h1>
      </v-col>
    </v-row>

    <!-- Estadísticas -->
    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption">Total Plugins</div>
            <div class="text-h4">{{ stats.total }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="success">
          <v-card-text class="text-white">
            <div class="text-caption">Activos</div>
            <div class="text-h4">{{ stats.active }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="grey">
          <v-card-text class="text-white">
            <div class="text-caption">Inactivos</div>
            <div class="text-h4">{{ stats.inactive }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary">
          <v-card-text class="text-white">
            <div class="text-caption">Marketplace</div>
            <v-btn
              color="white"
              variant="text"
              @click="goToMarketplace"
              class="mt-2"
            >
              Explorar
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filtros y acciones -->
    <v-row class="my-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="filters.search"
          prepend-inner-icon="mdi-magnify"
          label="Buscar plugins"
          variant="outlined"
          density="compact"
          hide-details
          clearable
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filters.category"
          :items="categories"
          label="Categoría"
          variant="outlined"
          density="compact"
          hide-details
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filters.status"
          :items="statusOptions"
          label="Estado"
          variant="outlined"
          density="compact"
          hide-details
        ></v-select>
      </v-col>
    </v-row>

    <!-- Lista de plugins -->
    <v-row>
      <v-col
        v-for="plugin in filteredPlugins"
        :key="plugin.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <PluginCard
          :plugin="plugin"
          :is-installed="true"
          @activate="handleActivate"
          @deactivate="handleDeactivate"
          @configure="handleConfigure"
          @reload="handleReload"
          @view-details="handleViewDetails"
          @uninstall="handleUninstall"
        />
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate size="64"></v-progress-circular>
      </v-col>
    </v-row>

    <!-- Empty state -->
    <v-row v-if="!loading && filteredPlugins.length === 0">
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-text class="text-center py-12">
            <v-icon size="64" color="grey">mdi-puzzle-outline</v-icon>
            <div class="text-h6 mt-4">No hay plugins instalados</div>
            <div class="text-body-2 text-medium-emphasis">
              Explora el marketplace para instalar nuevos plugins
            </div>
            <v-btn color="primary" class="mt-4" @click="goToMarketplace">
              <v-icon start>mdi-store</v-icon>
              Ir al Marketplace
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

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
import PluginCard from '@/components/plugins/PluginCard.vue';

export default {
  name: 'PluginManagementView',
  components: {
    PluginCard
  },
  data() {
    return {
      filters: {
        search: '',
        category: 'all',
        status: 'all'
      },
      statusOptions: [
        { title: 'Todos', value: 'all' },
        { title: 'Activos', value: 'active' },
        { title: 'Inactivos', value: 'inactive' }
      ],
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      }
    };
  },
  computed: {
    ...mapGetters('plugins', [
      'getInstalledPlugins',
      'getFilteredInstalledPlugins',
      'getStats',
      'isLoading'
    ]),
    plugins() {
      return this.getInstalledPlugins;
    },
    filteredPlugins() {
      let filtered = [...this.plugins];

      // Filtrar por categoría
      if (this.filters.category !== 'all') {
        filtered = filtered.filter(p => p.category === this.filters.category);
      }

      // Filtrar por estado
      if (this.filters.status === 'active') {
        filtered = filtered.filter(p => p.active === true);
      } else if (this.filters.status === 'inactive') {
        filtered = filtered.filter(p => p.active === false);
      }

      // Filtrar por búsqueda
      if (this.filters.search) {
        const search = this.filters.search.toLowerCase();
        filtered = filtered.filter(
          p =>
            p.name.toLowerCase().includes(search) ||
            p.description?.toLowerCase().includes(search)
        );
      }

      return filtered;
    },
    stats() {
      return this.getStats;
    },
    loading() {
      return this.isLoading('installed');
    },
    categories() {
      return [
        { title: 'Todas las categorías', value: 'all' },
        { title: 'Pagos', value: 'payment' },
        { title: 'Comunicación', value: 'communication' },
        { title: 'Integraciones', value: 'integration' },
        { title: 'Reportes', value: 'reporting' },
        { title: 'Seguridad', value: 'security' },
        { title: 'Productividad', value: 'productivity' },
        { title: 'Marketing', value: 'marketing' },
        { title: 'Análisis', value: 'analytics' },
        { title: 'Automatización', value: 'automation' },
        { title: 'Otros', value: 'other' }
      ];
    }
  },
  async mounted() {
    await this.loadPlugins();
  },
  methods: {
    async loadPlugins() {
      try {
        await this.$store.dispatch('plugins/fetchInstalledPlugins');
        await this.$store.dispatch('plugins/updateStats');
      } catch (error) {
        console.error('Error loading plugins:', error);
        this.showSnackbar('Error al cargar plugins', 'error');
      }
    },
    async handleActivate(plugin) {
      try {
        await this.$store.dispatch('plugins/activatePlugin', plugin.id);
        this.showSnackbar(`Plugin "${plugin.name}" activado`, 'success');
      } catch (error) {
        this.showSnackbar('Error al activar plugin', 'error');
      }
    },
    async handleDeactivate(plugin) {
      try {
        await this.$store.dispatch('plugins/deactivatePlugin', plugin.id);
        this.showSnackbar(`Plugin "${plugin.name}" desactivado`, 'success');
      } catch (error) {
        this.showSnackbar('Error al desactivar plugin', 'error');
      }
    },
    handleConfigure(plugin) {
      this.$router.push(`/plugins/${plugin.id}/configure`);
    },
    async handleReload(plugin) {
      try {
        await this.$store.dispatch('plugins/reloadPlugin', plugin.id);
        this.showSnackbar(`Plugin "${plugin.name}" recargado`, 'success');
      } catch (error) {
        this.showSnackbar('Error al recargar plugin', 'error');
      }
    },
    handleViewDetails(plugin) {
      this.$router.push(`/plugins/${plugin.id}`);
    },
    async handleUninstall(plugin) {
      if (confirm(`¿Estás seguro de desinstalar "${plugin.name}"?`)) {
        try {
          await this.$store.dispatch('plugins/deletePlugin', plugin.id);
          this.showSnackbar(`Plugin "${plugin.name}" desinstalado`, 'success');
        } catch (error) {
          this.showSnackbar('Error al desinstalar plugin', 'error');
        }
      }
    },
    goToMarketplace() {
      this.$router.push('/plugins/marketplace');
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
