<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Tipos de Materiales (Bulk)</h1>
      </v-col>
    </v-row>

    <!-- Botón para abrir diálogo de nuevo tipo -->
    <v-row>
      <v-col cols="12">
        <v-btn
          color="primary"
          @click="openCreateDialog"
          prepend-icon="mdi-plus"
        >
          Nuevo Tipo de Material
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-row class="mt-2">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="search"
          append-inner-icon="mdi-magnify"
          label="Buscar"
          single-line
          hide-details
          clearable
          outlined
          dense
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="categoryFilter"
          :items="filterCategories"
          item-value="id"
          item-title="name"
          label="Filtrar por categoría"
          clearable
          outlined
          dense
          hide-details
        ></v-select>
      </v-col>
    </v-row>

    <!-- Tabla de tipos -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-data-table
            :headers="headers"
            :items="filteredTypes"
            :loading="loading"
            :search="search"
            class="elevation-1"
          >
            <!-- Categoría -->
            <template v-slot:item.category="{ item }">
              <v-chip color="info" small>
                {{ item.category?.name || 'Sin categoría' }}
              </v-chip>
            </template>

            <!-- Tipo de Unidad -->
            <template v-slot:item.unitType="{ item }">
              {{ getUnitTypeText(item.unitType) }}
            </template>

            <!-- Tiene Serial -->
            <template v-slot:item.hasSerial="{ item }">
              <v-icon :color="item.hasSerial ? 'success' : 'grey'">
                {{ item.hasSerial ? 'mdi-check-circle' : 'mdi-close-circle' }}
              </v-icon>
            </template>

            <!-- Tiene MAC -->
            <template v-slot:item.hasMac="{ item }">
              <v-icon :color="item.hasMac ? 'success' : 'grey'">
                {{ item.hasMac ? 'mdi-check-circle' : 'mdi-close-circle' }}
              </v-icon>
            </template>

            <!-- Rastreable -->
            <template v-slot:item.trackableIndividually="{ item }">
              <v-icon :color="item.trackableIndividually ? 'success' : 'grey'">
                {{ item.trackableIndividually ? 'mdi-check-circle' : 'mdi-close-circle' }}
              </v-icon>
            </template>

            <!-- % Scrap -->
            <template v-slot:item.defaultScrapPercentage="{ item }">
              {{ item.defaultScrapPercentage }}%
            </template>

            <!-- Acciones -->
            <template v-slot:item.actions="{ item }">
              <v-tooltip bottom>
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon
                    small
                    v-bind="props"
                    @click="openEditDialog(item)"
                  >
                    <v-icon small>mdi-pencil</v-icon>
                  </v-btn>
                </template>
                <span>Editar</span>
              </v-tooltip>

              <v-tooltip bottom>
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon
                    small
                    v-bind="props"
                    @click="confirmDelete(item)"
                  >
                    <v-icon small>mdi-delete</v-icon>
                  </v-btn>
                </template>
                <span>Eliminar</span>
              </v-tooltip>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo para crear/editar tipo -->
    <v-dialog v-model="dialog" max-width="900px" persistent>
      <InventoryTypeForm
        :type="selectedType"
        @saved="handleSaved"
        @cancel="closeDialog"
      />
    </v-dialog>

    <!-- Diálogo de confirmación de eliminación -->
    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h5">
          Confirmar Eliminación
        </v-card-title>
        <v-card-text>
          ¿Está seguro que desea eliminar el tipo "<strong>{{ typeToDelete?.name }}</strong>"?
          Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            text
            @click="deleteDialog = false"
            :disabled="deleting"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            @click="deleteType"
            :loading="deleting"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar para notificaciones -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
      top
    >
      {{ snackbarMessage }}
      <template v-slot:action="{ attrs }">
        <v-btn
          text
          v-bind="attrs"
          @click="snackbar = false"
        >
          Cerrar
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import InventoryService from '@/services/inventory.service';
import InventoryTypeForm from '@/components/inventory/InventoryTypeForm.vue';

export default {
  name: 'InventoryTypesView',

  components: {
    InventoryTypeForm
  },

  data() {
    return {
      loading: false,
      dialog: false,
      deleteDialog: false,
      deleting: false,
      search: '',
      categoryFilter: null,
      snackbar: false,
      snackbarMessage: '',
      snackbarColor: 'success',

      types: [],
      categories: [],
      selectedType: null,
      typeToDelete: null,

      headers: [
        { title: 'Nombre', key: 'name', sortable: true },
        { title: 'Categoría', key: 'category', sortable: false },
        { title: 'Unidad', key: 'unitType', sortable: true },
        { title: 'Serial', key: 'hasSerial', sortable: false, align: 'center' },
        { title: 'MAC', key: 'hasMac', sortable: false, align: 'center' },
        { title: 'Rastreable', key: 'trackableIndividually', sortable: false, align: 'center' },
        { title: '% Scrap', key: 'defaultScrapPercentage', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false, align: 'center' }
      ]
    };
  },

  computed: {
    filterCategories() {
      return [{ id: null, name: 'Todas las categorías' }, ...this.categories];
    },

    filteredTypes() {
      if (!this.categoryFilter) {
        return this.types;
      }
      return this.types.filter(type => type.categoryId === this.categoryFilter);
    }
  },

  mounted() {
    this.loadTypes();
    this.loadCategories();
  },

  methods: {
    async loadTypes() {
      this.loading = true;
      try {
        const response = await InventoryService.getAllTypes({ includeCategory: true });
        this.types = response.data.data || [];
      } catch (error) {
        console.error('Error cargando tipos:', error);
        this.showSnackbar('Error al cargar los tipos de materiales', 'error');
      } finally {
        this.loading = false;
      }
    },

    async loadCategories() {
      try {
        const response = await InventoryService.getAllCategories({ activeOnly: true });
        this.categories = response.data.data || [];
      } catch (error) {
        console.error('Error cargando categorías:', error);
      }
    },

    openCreateDialog() {
      this.selectedType = null;
      this.dialog = true;
    },

    openEditDialog(type) {
      this.selectedType = { ...type };
      this.dialog = true;
    },

    closeDialog() {
      this.dialog = false;
      this.selectedType = null;
    },

    handleSaved() {
      this.closeDialog();
      this.loadTypes();
    },

    confirmDelete(type) {
      this.typeToDelete = type;
      this.deleteDialog = true;
    },

    async deleteType() {
      if (!this.typeToDelete) return;

      this.deleting = true;
      try {
        await InventoryService.deleteType(this.typeToDelete.id);
        this.showSnackbar('Tipo eliminado exitosamente', 'success');
        this.deleteDialog = false;
        this.loadTypes();
      } catch (error) {
        console.error('Error eliminando tipo:', error);
        this.showSnackbar(
          error.response?.data?.message || 'Error al eliminar el tipo',
          'error'
        );
      } finally {
        this.deleting = false;
      }
    },

    getUnitTypeText(unitType) {
      const units = {
        'piece': 'Pieza',
        'meters': 'Metros',
        'grams': 'Gramos',
        'box': 'Caja'
      };
      return units[unitType] || unitType;
    },

    showSnackbar(message, color) {
      this.snackbarMessage = message;
      this.snackbarColor = color;
      this.snackbar = true;
    }
  }
};
</script>

<style scoped>
.v-data-table {
  background-color: white;
}
</style>
