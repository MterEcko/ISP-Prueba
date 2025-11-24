<template>
  <v-card>
    <v-card-title>
      <span class="text-h5">{{ isEditing ? 'Editar Tipo de Material' : 'Nuevo Tipo de Material' }}</span>
    </v-card-title>

    <v-card-text>
      <v-form ref="form" v-model="valid">
        <v-container>
          <v-row>
            <!-- Categoría -->
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.categoryId"
                :items="categories"
                item-value="id"
                item-title="name"
                label="Categoría *"
                :rules="[rules.required]"
                outlined
                dense
                :loading="loadingCategories"
                hint="Seleccione la categoría a la que pertenece"
                persistent-hint
              >
                <template v-slot:item="{ item, props }">
                  <v-list-item v-bind="props">
                    <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                    <v-list-item-subtitle v-if="item.raw.description">
                      {{ item.raw.description }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>

            <!-- Nombre -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.name"
                label="Nombre *"
                :rules="[rules.required]"
                outlined
                dense
                hint="Ej: Antenas, Cables, Conectores"
                persistent-hint
              ></v-text-field>
            </v-col>

            <!-- Tipo de Unidad -->
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.unitType"
                :items="unitTypes"
                item-value="value"
                item-title="text"
                label="Tipo de Unidad *"
                :rules="[rules.required]"
                outlined
                dense
                hint="Unidad de medida del material"
                persistent-hint
              ></v-select>
            </v-col>

            <!-- Porcentaje de Scrap por Defecto -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.defaultScrapPercentage"
                label="% Scrap por Defecto"
                type="number"
                min="0"
                max="100"
                step="0.01"
                outlined
                dense
                suffix="%"
                hint="Porcentaje de desperdicio esperado"
                persistent-hint
              ></v-text-field>
            </v-col>

            <!-- Descripción -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Descripción"
                outlined
                dense
                rows="3"
                hint="Descripción detallada del tipo de material"
                persistent-hint
              ></v-textarea>
            </v-col>

            <!-- Switches de Configuración -->
            <v-col cols="12" md="4">
              <v-switch
                v-model="formData.hasSerial"
                label="Tiene Número de Serie"
                color="primary"
                inset
                hint="Marcar si el material tiene número de serie único"
                persistent-hint
              ></v-switch>
            </v-col>

            <v-col cols="12" md="4">
              <v-switch
                v-model="formData.hasMac"
                label="Tiene Dirección MAC"
                color="primary"
                inset
                hint="Marcar si el material tiene dirección MAC"
                persistent-hint
              ></v-switch>
            </v-col>

            <v-col cols="12" md="4">
              <v-switch
                v-model="formData.trackableIndividually"
                label="Rastreable Individualmente"
                color="primary"
                inset
                hint="Marcar si cada unidad se rastrea por separado"
                persistent-hint
              ></v-switch>
            </v-col>
          </v-row>
        </v-container>
      </v-form>

      <small>* Campos obligatorios</small>
    </v-card-text>

    <v-divider></v-divider>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="grey"
        text
        @click="cancel"
        :disabled="loading"
      >
        Cancelar
      </v-btn>
      <v-btn
        color="primary"
        @click="save"
        :loading="loading"
        :disabled="!valid"
      >
        {{ isEditing ? 'Actualizar' : 'Crear' }}
      </v-btn>
    </v-card-actions>

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
  </v-card>
</template>

<script>
import InventoryService from '@/services/inventory.service';

export default {
  name: 'InventoryTypeForm',

  props: {
    type: {
      type: Object,
      default: null
    }
  },

  data() {
    return {
      valid: false,
      loading: false,
      loadingCategories: false,
      snackbar: false,
      snackbarMessage: '',
      snackbarColor: 'success',

      categories: [],

      formData: {
        categoryId: null,
        name: '',
        description: '',
        unitType: 'piece',
        hasSerial: true,
        hasMac: false,
        trackableIndividually: true,
        defaultScrapPercentage: 0
      },

      unitTypes: [
        { value: 'piece', text: 'Pieza' },
        { value: 'meters', text: 'Metros' },
        { value: 'grams', text: 'Gramos' },
        { value: 'box', text: 'Caja' }
      ],

      rules: {
        required: value => !!value || 'Campo obligatorio'
      }
    };
  },

  computed: {
    isEditing() {
      return this.type && this.type.id;
    }
  },

  watch: {
    type: {
      handler(newVal) {
        if (newVal) {
          this.formData = {
            categoryId: newVal.categoryId || newVal.category?.id || null,
            name: newVal.name || '',
            description: newVal.description || '',
            unitType: newVal.unitType || 'piece',
            hasSerial: newVal.hasSerial !== undefined ? newVal.hasSerial : true,
            hasMac: newVal.hasMac !== undefined ? newVal.hasMac : false,
            trackableIndividually: newVal.trackableIndividually !== undefined ? newVal.trackableIndividually : true,
            defaultScrapPercentage: newVal.defaultScrapPercentage || 0
          };
        }
      },
      immediate: true
    }
  },

  mounted() {
    this.loadCategories();
  },

  methods: {
    async loadCategories() {
      this.loadingCategories = true;
      try {
        const response = await InventoryService.getAllCategories({ activeOnly: true });
        this.categories = response.data.data || [];
      } catch (error) {
        console.error('Error cargando categorías:', error);
        this.showSnackbar('Error al cargar las categorías', 'error');
      } finally {
        this.loadingCategories = false;
      }
    },

    async save() {
      if (!this.$refs.form.validate()) {
        return;
      }

      this.loading = true;

      try {
        let response;

        if (this.isEditing) {
          response = await InventoryService.updateType(this.type.id, this.formData);
        } else {
          response = await InventoryService.createType(this.formData);
        }

        this.showSnackbar(
          response.data.message || (this.isEditing ? 'Tipo actualizado exitosamente' : 'Tipo creado exitosamente'),
          'success'
        );

        this.$emit('saved', response.data.data);

        if (!this.isEditing) {
          this.resetForm();
        }

      } catch (error) {
        console.error('Error guardando tipo:', error);
        this.showSnackbar(
          error.response?.data?.message || 'Error al guardar el tipo',
          'error'
        );
      } finally {
        this.loading = false;
      }
    },

    cancel() {
      this.$emit('cancel');
      this.resetForm();
    },

    resetForm() {
      this.formData = {
        categoryId: null,
        name: '',
        description: '',
        unitType: 'piece',
        hasSerial: true,
        hasMac: false,
        trackableIndividually: true,
        defaultScrapPercentage: 0
      };
      if (this.$refs.form) {
        this.$refs.form.resetValidation();
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
.v-card {
  border-radius: 8px;
}
</style>
