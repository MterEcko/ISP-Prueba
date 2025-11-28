<template>
  <div class="inventory-type-form">
    <div class="page-header">
      <div class="header-content">
        <h2>
          <i :class="isEdit ? 'fas fa-edit' : 'fas fa-plus-circle'"></i>
          {{ isEdit ? 'Editar Tipo de Item' : 'Nuevo Tipo de Item' }}
        </h2>
      </div>
    </div>

    <form @submit.prevent="submitForm">
      <div class="form-section">
        <h3>Informacion Basica</h3>

        <div class="form-row">
          <div class="form-group">
            <label for="categoryId">Categoria *</label>
            <select id="categoryId" v-model="type.categoryId" required class="form-control">
              <option :value="null" disabled>Seleccione una categoria</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
            <small class="help-text">Equipos, Consumibles, Herramientas</small>
          </div>

          <div class="form-group">
            <label for="name">Nombre del Tipo *</label>
            <input
              type="text"
              id="name"
              v-model="type.name"
              placeholder="Ej: Antenas, Cables, Modems"
              required
              class="form-control"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="description">Descripcion</label>
          <textarea
            id="description"
            v-model="type.description"
            rows="3"
            placeholder="Descripcion opcional del tipo de item"
            class="form-control"
          ></textarea>
        </div>
      </div>

      <div class="form-section">
        <h3>Configuracion de Unidades</h3>

        <div class="form-row">
          <div class="form-group">
            <label for="unitType">Tipo de Unidad *</label>
            <select id="unitType" v-model="type.unitType" required class="form-control">
              <option value="piece">Pieza (unidades individuales)</option>
              <option value="meters">Metros (cables, fibra)</option>
              <option value="grams">Gramos (materiales a granel)</option>
              <option value="box">Caja (paquetes)</option>
            </select>
            <small class="help-text">Define como se mide este tipo de item</small>
          </div>

          <div class="form-group">
            <label for="defaultScrapPercentage">Porcentaje de Desperdicio (%)</label>
            <input
              type="number"
              id="defaultScrapPercentage"
              v-model.number="type.defaultScrapPercentage"
              min="0"
              max="100"
              step="0.01"
              placeholder="Ej: 5.0 para cables"
              class="form-control"
            />
            <small class="help-text">Desperdicio esperado al usar este tipo de item</small>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>Caracteristicas de Rastreo</h3>

        <div class="checkbox-group">
          <div class="checkbox-item">
            <input
              type="checkbox"
              id="trackableIndividually"
              v-model="type.trackableIndividually"
            />
            <label for="trackableIndividually">
              <strong>Rastreable Individualmente</strong>
              <small>Cada item se rastrea por separado (equipos). Desactivar para consumibles a granel.</small>
            </label>
          </div>

          <div class="checkbox-item" v-if="type.trackableIndividually">
            <input
              type="checkbox"
              id="hasSerial"
              v-model="type.hasSerial"
            />
            <label for="hasSerial">
              <strong>Tiene Numero de Serie</strong>
              <small>Este tipo de item requiere numero de serie (antenas, routers, modems).</small>
            </label>
          </div>

          <div class="checkbox-item" v-if="type.trackableIndividually">
            <input
              type="checkbox"
              id="hasMac"
              v-model="type.hasMac"
            />
            <label for="hasMac">
              <strong>Tiene Direccion MAC</strong>
              <small>Este tipo de item tiene direccion MAC (equipos de red).</small>
            </label>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" @click="cancel" class="btn-secondary">
          Cancelar
        </button>
        <button type="submit" class="btn-primary">
          <i class="fas fa-save"></i>
          {{ isEdit ? 'Actualizar' : 'Crear' }} Tipo
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import InventoryService from '@/services/inventory.service';

export default {
  name: 'InventoryTypeForm',
  data() {
    return {
      type: {
        categoryId: null,
        name: '',
        description: '',
        unitType: 'piece',
        hasSerial: true,
        hasMac: false,
        trackableIndividually: true,
        defaultScrapPercentage: 0.00
      },
      categories: [],
      isEdit: false,
      loading: false
    };
  },
  mounted() {
    this.loadCategories();

    if (this.$route.params.id) {
      this.isEdit = true;
      this.loadType(this.$route.params.id);
    }
  },
  methods: {
    async loadCategories() {
      try {
        const response = await InventoryService.getAllCategories();
        this.categories = response.data.categories || response.data.data || response.data || [];
      } catch (error) {
        console.error('Error loading categories:', error);
        this.$toast?.error('Error al cargar las categorias');
      }
    },

    async loadType(id) {
      try {
        this.loading = true;
        const response = await InventoryService.getAllTypes({ includeCategory: true });
        const types = response.data.types || response.data.data || response.data || [];
        const foundType = types.find(t => t.id === parseInt(id));

        if (foundType) {
          this.type = { ...foundType };
        } else {
          this.$toast?.error('Tipo no encontrado');
          this.$router.push('/inventory');
        }
      } catch (error) {
        console.error('Error loading type:', error);
        this.$toast?.error('Error al cargar el tipo');
      } finally {
        this.loading = false;
      }
    },

    async submitForm() {
      try {
        this.loading = true;

        if (this.isEdit) {
          await InventoryService.updateType(this.type.id, this.type);
          this.$toast?.success('Tipo actualizado exitosamente');
        } else {
          await InventoryService.createType(this.type);
          this.$toast?.success('Tipo creado exitosamente');
        }

        this.$router.push('/inventory');
      } catch (error) {
        console.error('Error saving type:', error);
        this.$toast?.error(error.response?.data?.message || 'Error al guardar el tipo');
      } finally {
        this.loading = false;
      }
    },

    cancel() {
      this.$router.push('/inventory');
    }
  }
};
</script>

<style scoped>
.inventory-type-form {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 15px;
}

.header-content h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #333;
  font-size: 24px;
  margin: 0;
}

.form-section {
  background: white;
  padding: 25px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #555;
  font-size: 18px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #444;
}

.form-control {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: #4CAF50;
}

.help-text {
  color: #777;
  font-size: 12px;
  margin-top: 5px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 6px;
  border-left: 3px solid #4CAF50;
}

.checkbox-item input[type="checkbox"] {
  margin-top: 3px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-item label {
  cursor: pointer;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}

.checkbox-item label strong {
  color: #333;
  font-size: 14px;
}

.checkbox-item label small {
  color: #666;
  font-size: 12px;
  font-weight: normal;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

.btn-primary,
.btn-secondary {
  padding: 12px 30px;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
}

.btn-secondary {
  background: #f0f0f0;
  color: #555;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

@media (max-width: 768px) {
  .inventory-type-form {
    padding: 15px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
