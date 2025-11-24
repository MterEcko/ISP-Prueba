<template>
  <v-card>
    <v-card-title>
      <span class="text-h5">{{ isEditing ? 'Editar Categoría' : 'Nueva Categoría' }}</span>
    </v-card-title>

    <v-card-text>
      <v-form ref="form" v-model="valid">
        <v-container>
          <v-row>
            <!-- Nombre -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.name"
                label="Nombre *"
                :rules="[rules.required]"
                outlined
                dense
                hint="Ej: Equipos, Consumibles, Herramientas"
                persistent-hint
              ></v-text-field>
            </v-col>

            <!-- Estado Activo -->
            <v-col cols="12" md="6">
              <v-switch
                v-model="formData.active"
                label="Activo"
                color="primary"
                inset
              ></v-switch>
            </v-col>

            <!-- Descripción -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Descripción"
                outlined
                dense
                rows="3"
                hint="Descripción detallada de la categoría"
                persistent-hint
              ></v-textarea>
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
  name: 'InventoryCategoryForm',

  props: {
    category: {
      type: Object,
      default: null
    }
  },

  data() {
    return {
      valid: false,
      loading: false,
      snackbar: false,
      snackbarMessage: '',
      snackbarColor: 'success',

      formData: {
        name: '',
        description: '',
        active: true
      },

      rules: {
        required: value => !!value || 'Campo obligatorio'
      }
    };
  },

  computed: {
    isEditing() {
      return this.category && this.category.id;
    }
  },

  watch: {
    category: {
      handler(newVal) {
        if (newVal) {
          this.formData = {
            name: newVal.name || '',
            description: newVal.description || '',
            active: newVal.active !== undefined ? newVal.active : true
          };
        }
      },
      immediate: true
    }
  },

  methods: {
    async save() {
      if (!this.$refs.form.validate()) {
        return;
      }

      this.loading = true;

      try {
        let response;

        if (this.isEditing) {
          response = await InventoryService.updateCategory(this.category.id, this.formData);
        } else {
          response = await InventoryService.createCategory(this.formData);
        }

        this.showSnackbar(
          response.data.message || (this.isEditing ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente'),
          'success'
        );

        this.$emit('saved', response.data.data);

        if (!this.isEditing) {
          this.resetForm();
        }

      } catch (error) {
        console.error('Error guardando categoría:', error);
        this.showSnackbar(
          error.response?.data?.message || 'Error al guardar la categoría',
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
        name: '',
        description: '',
        active: true
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
