<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Categorías de Inventario</h1>
      </v-col>
    </v-row>

    <!-- Botón para abrir diálogo de nueva categoría -->
    <v-row>
      <v-col cols="12">
        <v-btn
          color="primary"
          @click="openCreateDialog"
          prepend-icon="mdi-plus"
        >
          Nueva Categoría
        </v-btn>
      </v-col>
    </v-row>

    <!-- Tabla de categorías -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-text-field
              v-model="search"
              append-inner-icon="mdi-magnify"
              label="Buscar"
              single-line
              hide-details
              clearable
            ></v-text-field>
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="categories"
            :loading="loading"
            :search="search"
            class="elevation-1"
          >
            <!-- Estado Activo -->
            <template v-slot:item.active="{ item }">
              <v-chip
                :color="item.active ? 'success' : 'error'"
                small
              >
                {{ item.active ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </template>

            <!-- Cantidad de Tipos -->
            <template v-slot:item.typesCount="{ item }">
              <v-chip color="primary" small>
                {{ item.types ? item.types.length : 0 }}
              </v-chip>
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
                    :disabled="item.types && item.types.length > 0"
                  >
                    <v-icon small>mdi-delete</v-icon>
                  </v-btn>
                </template>
                <span>{{ item.types && item.types.length > 0 ? 'No se puede eliminar (tiene tipos asociados)' : 'Eliminar' }}</span>
              </v-tooltip>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo para crear/editar categoría -->
    <v-dialog v-model="dialog" max-width="700px" persistent>
      <InventoryCategoryForm
        :category="selectedCategory"
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
          ¿Está seguro que desea eliminar la categoría "<strong>{{ categoryToDelete?.name }}</strong>"?
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
            @click="deleteCategory"
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
import InventoryCategoryForm from '@/components/inventory/InventoryCategoryForm.vue';

export default {
  name: 'InventoryCategoriesView',

  components: {
    InventoryCategoryForm
  },

  data() {
    return {
      loading: false,
      dialog: false,
      deleteDialog: false,
      deleting: false,
      search: '',
      snackbar: false,
      snackbarMessage: '',
      snackbarColor: 'success',

      categories: [],
      selectedCategory: null,
      categoryToDelete: null,

      headers: [
        { title: 'Nombre', key: 'name', sortable: true },
        { title: 'Descripción', key: 'description', sortable: false },
        { title: 'Estado', key: 'active', sortable: true },
        { title: 'Cantidad de Tipos', key: 'typesCount', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false, align: 'center' }
      ]
    };
  },

  mounted() {
    this.loadCategories();
  },

  methods: {
    async loadCategories() {
      this.loading = true;
      try {
        const response = await InventoryService.getAllCategories({ includeTypes: true });
        this.categories = response.data.data || [];
      } catch (error) {
        console.error('Error cargando categorías:', error);
        this.showSnackbar('Error al cargar las categorías', 'error');
      } finally {
        this.loading = false;
      }
    },

    openCreateDialog() {
      this.selectedCategory = null;
      this.dialog = true;
    },

    openEditDialog(category) {
      this.selectedCategory = { ...category };
      this.dialog = true;
    },

    closeDialog() {
      this.dialog = false;
      this.selectedCategory = null;
    },

    handleSaved() {
      this.closeDialog();
      this.loadCategories();
    },

    confirmDelete(category) {
      this.categoryToDelete = category;
      this.deleteDialog = true;
    },

    async deleteCategory() {
      if (!this.categoryToDelete) return;

      this.deleting = true;
      try {
        await InventoryService.deleteCategory(this.categoryToDelete.id);
        this.showSnackbar('Categoría eliminada exitosamente', 'success');
        this.deleteDialog = false;
        this.loadCategories();
      } catch (error) {
        console.error('Error eliminando categoría:', error);
        this.showSnackbar(
          error.response?.data?.message || 'Error al eliminar la categoría',
          'error'
        );
      } finally {
        this.deleting = false;
      }
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
