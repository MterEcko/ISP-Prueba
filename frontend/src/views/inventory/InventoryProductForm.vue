<template>
  <div class="inventory-form">
    <div class="page-header">
      <div class="header-content">
        <h2>
          <i :class="isEdit ? 'fas fa-edit' : 'fas fa-plus-circle'"></i>
          {{ isEdit ? 'Editar Producto del Catálogo' : 'Nuevo Producto del Catálogo' }}
        </h2>
      </div>
    </div>

    <form @submit.prevent="submitForm">
      
      <div class="form-section">
        <h3>1. Clasificación</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="typeId">Tipo de Inventario *</label>
            <select id="typeId" v-model="product.typeId" required class="form-control">
              <option :value="null" disabled>Seleccione un tipo...</option>
              <option v-for="type in types" :key="type.id" :value="type.id">
                {{ type.name }} (Categoría: {{ type.category ? type.category.name : 'N/A' }})
              </option>
            </select>
            <small class="help-text">Define si es un Equipo, Consumible, Herramienta, etc.</small>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>2. Identificación del Producto</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="brand">Marca *</label>
            <input 
              type="text"
              id="brand"
              v-model="product.brand"
              required
              class="form-control"
              placeholder="Ej: Ubiquiti, Mikrotik, TP-Link"
            />
          </div>
          
          <div class="form-group">
            <label for="model">Modelo *</label>
            <input 
              type="text"
              id="model"
              v-model="product.model"
              required
              class="form-control"
              placeholder="Ej: LiteBeam AC, RB951, Cable UTP Cat 6"
            />
          </div>
          
          <div class="form-group">
            <label for="partNumber">Número de Parte (Opcional)</label>
            <input 
              type="text"
              id="partNumber"
              v-model="product.partNumber"
              class="form-control"
            />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>3. Información de Compra y Venta</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="purchasePrice">Precio de Compra (Promedio)</label>
            <input 
              type="number"
              id="purchasePrice"
              v-model.number="product.purchasePrice"
              step="0.01"
              min="0"
              class="form-control"
            />
          </div>
          
          <div class="form-group">
            <label for="salePrice">Precio de Venta (Instalación)</label>
            <input 
              type="number"
              id="salePrice"
              v-model.number="product.salePrice"
              step="0.01"
              min="0"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="warrantyMonths">Garantía (Meses)</label>
            <input 
              type="number"
              id="warrantyMonths"
              v-model.number="product.warrantyMonths"
              min="0"
              class="form-control"
            />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>4. Detalles Adicionales</h3>
        
        <div class="form-group full-width">
          <label for="description">Descripción</label>
          <textarea 
            id="description"
            v-model="product.description"
            rows="3"
            class="form-control"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="product.active" />
            Producto Activo (visible en los formularios)
          </label>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="cancel" class="btn-secondary">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="loading">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          {{ loading ? 'Guardando...' : 'Guardar Producto' }}
        </button>
      </div>
    </form>
    
    <div v-if="errorMessage" class="alert alert-warning" style="margin-top: 20px;">
      <i class="fas fa-exclamation-triangle"></i>
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import InventoryService from '../../services/inventory.service';

export default {
  name: 'InventoryProductForm',
  data() {
    return {
      product: {
        typeId: null,
        brand: '',
        model: '',
        partNumber: '',
        description: '',
        purchasePrice: null,
        salePrice: null,
        warrantyMonths: 12,
        specifications: {},
        active: true
      },
      types: [], // Para el dropdown de "Tipo de Inventario"
      isEdit: false,
      loading: false,
      errorMessage: ''
    };
  },
  created() {
    this.loadTypes();
    const productId = this.$route.params.id; // Asume que la ruta es /inventory/product/:id
    if (productId && productId !== 'new') {
      this.isEdit = true;
      this.loadProduct(productId);
    }
  },
  methods: {
    /**
     * Carga los Tipos de Inventario (Equipo, Consumible, etc.) para el dropdown.
     * ¡NECESITAS CREAR ESTE MÉTODO EN EL SERVICIO!
     */
    async loadTypes() {
      try {
        // Asume que el servicio puede traer los tipos y sus categorías anidadas
        const response = await InventoryService.getAllTypes({ includeCategory: true });
        this.types = response.data.data || response.data || [];
        
        // Si no hay tipos, mostrar un error
        if (this.types.length === 0) {
          this.errorMessage = 'No se encontraron "Tipos de Inventario". Por favor, cree un tipo primero.';
        }

      } catch (error) {
        console.error('Error cargando tipos de inventario:', error);
        this.errorMessage = 'Error al cargar los tipos de inventario.';
      }
    },

    /**
     * Carga los datos de un producto existente para editarlo.
     * ¡NECESITAS CREAR ESTE MÉTODO EN EL SERVICIO!
     */
    async loadProduct(id) {
      this.loading = true;
      try {
        const response = await InventoryService.getProduct(id);
        this.product = response.data;
      } catch (error) {
        console.error('Error cargando producto:', error);
        this.errorMessage = 'No se pudo cargar el producto para editar.';
      } finally {
        this.loading = false;
      }
    },

    async submitForm() {
      this.loading = true;
      this.errorMessage = '';
      
      try {
        // Validaciones
        if (!this.product.typeId || !this.product.brand || !this.product.model) {
          this.errorMessage = 'Tipo, Marca y Modelo son campos obligatorios.';
          this.loading = false;
          return;
        }

        const productData = { ...this.product };

        if (this.isEdit) {
          // ¡NECESITAS CREAR ESTE MÉTODO EN EL SERVICIO!
          await InventoryService.updateProduct(this.product.id, productData);
        } else {
          // ¡NECESITAS CREAR ESTE MÉTODO EN EL SERVICIO!
          await InventoryService.createProduct(productData);
        }
        
        // Asumimos que hay una lista de productos, si no, redirigir a /inventory
        this.$router.push('/inventory'); 
      } catch (error) {
        console.error('Error guardando producto:', error);
        this.errorMessage = error.response?.data?.message || 'Error al guardar el producto.';
      } finally {
        this.loading = false;
      }
    },

    cancel() {
      this.$router.push('/inventory'); // O a la lista de productos
    }
  }
};
</script>

<style scoped>
/* (Copia y pega los estilos de InventoryForm.vue aquí) */
.inventory-form {
  --primary-color: #667eea;
  --primary-hover: #5a67d8;
  --error-color: #f56565;
  --bg-primary: #ffffff;
  --bg-secondary: #f7fafc;
  --text-primary: #2d3748;
  --text-secondary: #4a5568;
  --border-color: #e2e8f0;
  --radius-md: 8px;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

.inventory-form {
  padding: var(--spacing-md);
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
}

.header-content h2 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  color: var(--text-primary);
}

.header-content h2 i {
  margin-right: var(--spacing-md);
  color: var(--primary-color);
}

.form-section {
  background-color: var(--bg-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
}

.form-section h3 {
  margin-top: 0;
  margin-bottom: var(--spacing-lg);
  color: var(--text-primary);
  font-size: 1.25em;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: var(--spacing-sm);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.full-width {
  width: 100%;
}

label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.form-control,
input[type="text"],
input[type="date"],
input[type="number"],
select,
textarea {
  width: 100%;
  padding: var(--spacing-md);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;
  background-color: white;
}

.form-control:focus,
input[type="text"]:focus,
input[type="date"]:focus,
input[type="number"]:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-control:disabled {
  background-color: var(--bg-secondary);
  color: var(--text-muted);
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.help-text {
  color: var(--text-muted);
  font-size: 0.875em;
  margin-top: var(--spacing-sm);
  display: block;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.btn-primary, .btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1em;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
.btn-secondary:hover {
  background: var(--border-color);
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}
.btn-primary:hover {
  background-color: var(--primary-hover);
}

.btn-primary:disabled, .btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.alert-warning {
  background: #fef5e7;
  color: #744210;
  border: 1px solid #f6e05e;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--text-primary);
}
.checkbox-label input[type="checkbox"] {
  width: auto;
}


@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
}
</style>
