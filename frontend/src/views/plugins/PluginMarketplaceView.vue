<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">
          <v-icon large class="mr-2">mdi-store</v-icon>
          Plugin Marketplace
        </h1>
        <p class="text-body-1 text-medium-emphasis">
          Explora e instala plugins para extender las funcionalidades de tu sistema
        </p>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-row class="my-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="search"
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
          v-model="selectedCategory"
          :items="categories"
          label="Categoría"
          variant="outlined"
          density="compact"
          hide-details
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="sortBy"
          :items="sortOptions"
          label="Ordenar por"
          variant="outlined"
          density="compact"
          hide-details
        ></v-select>
      </v-col>
    </v-row>

    <!-- Lista de plugins -->
    <v-row v-if="!loading && filteredPlugins.length > 0">
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
          :is-installed="isPluginInstalled(plugin.name)"
          :installing="installingPlugins.includes(plugin.id)"
          @install="handleInstall"
          @view-details="handleViewDetails"
        />
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-12">
        <v-progress-circular indeterminate size="64"></v-progress-circular>
        <div class="text-h6 mt-4">Cargando marketplace...</div>
      </v-col>
    </v-row>

    <!-- Empty state -->
    <v-row v-if="!loading && filteredPlugins.length === 0">
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-text class="text-center py-12">
            <v-icon size="64" color="grey">mdi-store-off</v-icon>
            <div class="text-h6 mt-4">No se encontraron plugins</div>
            <div class="text-body-2 text-medium-emphasis">
              Intenta con otros términos de búsqueda o categorías
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Paginación -->
    <v-row v-if="!loading && filteredPlugins.length > 0" class="mt-4">
      <v-col cols="12" class="d-flex justify-center">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          @update:modelValue="loadMarketplacePlugins"
        ></v-pagination>
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
  name: 'PluginMarketplaceView',
  components: {
    PluginCard
  },
  data() {
    return {
      search: '',
      selectedCategory: 'all',
      sortBy: 'popularity',
      currentPage: 1,
      installingPlugins: [],
      sortOptions: [
        { title: 'Más populares', value: 'popularity' },
        { title: 'Nombre A-Z', value: 'name' },
        { title: 'Nombre Z-A', value: 'name_desc' },
        { title: 'Más recientes', value: 'date' },
        { title: 'Mejor valorados', value: 'rating' }
      ],
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      },
      // Plugins de ejemplo para demo (en producción vendrían del marketplace)
      demoPlugins: [
        {
          id: 'demo-1',
          name: 'Plugin de Ejemplo 1',
          version: '1.0.0',
          description: 'Este es un plugin de ejemplo para demostración',
          author: 'ISP-Prueba Team',
          category: 'integration',
          price: 0,
          downloads: 1250,
          rating: 4.5,
          features: ['Característica 1', 'Característica 2', 'Característica 3']
        },
        {
          id: 'demo-2',
          name: 'Plugin de Ejemplo 2',
          version: '2.1.0',
          description: 'Otro plugin de ejemplo para el marketplace',
          author: 'Community',
          category: 'communication',
          price: 29.99,
          downloads: 890,
          rating: 4.2,
          features: ['WhatsApp Integration', 'SMS Support']
        }
      ]
    };
  },
  computed: {
    ...mapGetters('plugins', [
      'getMarketplacePlugins',
      'isPluginInstalled',
      'isLoading'
    ]),
    plugins() {
      const marketPlugins = this.getMarketplacePlugins;
      // Si no hay plugins del marketplace, usar demos
      return marketPlugins.length > 0 ? marketPlugins : this.demoPlugins;
    },
    filteredPlugins() {
      let filtered = [...this.plugins];

      // Filtrar por categoría
      if (this.selectedCategory !== 'all') {
        filtered = filtered.filter(p => p.category === this.selectedCategory);
      }

      // Filtrar por búsqueda
      if (this.search) {
        const searchLower = this.search.toLowerCase();
        filtered = filtered.filter(
          p =>
            p.name.toLowerCase().includes(searchLower) ||
            p.description?.toLowerCase().includes(searchLower) ||
            p.author?.toLowerCase().includes(searchLower)
        );
      }

      // Ordenar
      return this.sortPlugins(filtered);
    },
    loading() {
      return this.isLoading('marketplace');
    },
    totalPages() {
      return Math.ceil(this.filteredPlugins.length / 12) || 1;
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
    await this.loadMarketplacePlugins();
  },
  methods: {
    async loadMarketplacePlugins() {
      try {
        // Ensure licenseKey is in localStorage for license-based filtering
        const licenseKey = localStorage.getItem('licenseKey');
        if (!licenseKey) {
          console.warn('⚠️ No license key found. Some plugins may be restricted.');
        } else {
          console.log('✅ Loading marketplace with license:', licenseKey.substring(0, 10) + '...');
        }

        await this.$store.dispatch('plugins/fetchMarketplacePlugins', {
          page: this.currentPage,
          category: this.selectedCategory !== 'all' ? this.selectedCategory : null,
          search: this.search,
          sort: this.sortBy
        });
      } catch (error) {
        console.error('❌ Error loading marketplace:', error);
        this.showSnackbar('Error cargando plugins del marketplace', 'error');
      }
    },
    async handleInstall(plugin) {
      console.log('🔌 Attempting to activate plugin:', plugin.name);

      // Check if plugin requires license upgrade
      if (plugin.requiresUpgrade) {
        const requiredLicense = plugin.requirements?.requiredLicense || 'superior';
        const userLicense = plugin.userLicenseType || 'básica';
        this.showSnackbar(
          `Este plugin requiere licencia ${requiredLicense}. Tu licencia actual es ${userLicense}.`,
          'warning'
        );
        console.warn('⚠️ Plugin requires upgrade:', { required: requiredLicense, current: userLicense });
        return;
      }

      // Check if plugin is paid and not free
      if (plugin.price > 0 && !plugin.isFree) {
        this.showSnackbar(
          `Este plugin tiene un costo de $${plugin.price}. Funcionalidad de pago próximamente.`,
          'info'
        );
        console.info('💰 Paid plugin, payment flow not implemented yet');
        return;
      }

      this.installingPlugins.push(plugin.id);

      try {
        console.log('📥 Activating plugin in Store API...');

        // Activate plugin via Store API (which also creates it locally)
        await this.$store.dispatch('plugins/activatePlugin', {
          pluginId: plugin.id || plugin.slug,
          pluginData: {
            name: plugin.name,
            version: plugin.version,
            description: plugin.description,
            category: plugin.category
          }
        });

        this.showSnackbar(`✅ Plugin "${plugin.name}" activado exitosamente`, 'success');
        console.log('✅ Plugin activated successfully:', plugin.name);

        // Redirect to plugin management
        setTimeout(() => {
          this.$router.push('/plugins/management');
        }, 1500);
      } catch (error) {
        console.error('❌ Error activating plugin:', error);

        // Show specific error message if available
        const errorMessage = error.response?.data?.message || error.message || 'Error al activar plugin';
        this.showSnackbar(errorMessage, 'error');
      } finally {
        this.installingPlugins = this.installingPlugins.filter(id => id !== plugin.id);
      }
    },
    handleViewDetails(plugin) {
      // En producción mostraría detalles completos del plugin
      alert(`Detalles de: ${plugin.name}\n\nDescripción: ${plugin.description}\n\nAutor: ${plugin.author}\n\nPrecio: ${plugin.price === 0 ? 'Gratis' : '$' + plugin.price}`);
    },
    sortPlugins(plugins) {
      const sorted = [...plugins];

      switch (this.sortBy) {
        case 'name':
          return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'name_desc':
          return sorted.sort((a, b) => b.name.localeCompare(a.name));
        case 'popularity':
          return sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        case 'rating':
          return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        case 'date':
          return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        default:
          return sorted;
      }
    },
    showSnackbar(message, color = 'success') {
      this.snackbar = {
        show: true,
        message,
        color
      };
    }
  },
  watch: {
    selectedCategory() {
      this.currentPage = 1;
      this.loadMarketplacePlugins();
    },
    search() {
      this.currentPage = 1;
    }
  }
};
</script>
