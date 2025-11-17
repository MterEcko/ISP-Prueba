<template>
  <div class="inventory-form">
    <div class="page-header">
      <div class="header-content">
        <h2>
          <i class="fas fa-boxes"></i>
          Registro Rápido por Lote
        </h2>
      </div>
    </div>

    <div class="form-section">
      <h3>1. Seleccionar Lote y Producto</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="batchId">Lote de Compra *</label>
          <select id="batchId" v-model="selectedBatchId" @change="onBatchSelect" class="form-control" :disabled="loading">
            <option :value="null" disabled>Seleccione un lote...</option>
            <option v-for="b in batches" :key="b.id" :value="b.id">
              {{ b.batchNumber }} ({{ b.supplier || 'N/A' }}) - {{ b.status }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="productId">Producto del Catálogo *</label>
          <select id="productId" v-model="selectedProductId" @change="onProductSelect" class="form-control" :disabled="loading || !selectedBatchId">
            <option :value="null" disabled>Seleccione un producto...</option>
            <option v-for="p in products" :key="p.id" :value="p.id">
              {{ p.brand }} {{ p.model }} ({{ p.InventoryType ? p.InventoryType.name : 'Sin Tipo' }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Cargando...</p>
      </div>
    </div>

    <form @submit.prevent="registerItems" v-if="batch.id && product.id">
      
      <div class="form-section">
        <h3>2. Resumen</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Lote</label>
            <input type="text" :value="batch.batchNumber" class="form-control" disabled />
          </div>
          <div class="form-group">
            <label>Producto</label>
            <input type="text" :value="product.brand + ' ' + product.model" class="form-control" disabled />
          </div>
          <div class="form-group">
            <label>Tipo</label>
            <input type="text" :value="product.InventoryType.name" class="form-control" disabled />
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>3. Registrar Items</h3>
        
        <template v-if="product.InventoryType.trackableIndividually">
          <p>Añada los números de serie y MAC (si aplica) para cada item.</p>
          
          <div v-for="(item, index) in itemsToRegister" :key="index" class="form-row item-entry">
            <div class="form-group">
              <label :for="'serial-' + index">Número de Serie *</label>
              <input 
                :id="'serial-' + index"
                type="text" 
                v-model.trim="item.serialNumber" 
                class="form-control"
                required
                ref="serialInputs"
                @keydown.enter.prevent="focusNextOrAdd(index)"
              />
            </div>
            <div class="form-group" v-if="product.InventoryType.hasMac">
              <label :for="'mac-' + index">Dirección MAC</label>
              <input 
                :id="'mac-' + index"
                type="text" 
                v-model.trim="item.macAddress" 
                class="form-control"
                @keydown.enter.prevent="focusNextOrAdd(index)"
              />
            </div>
            <div class="form-group action-group">
              <button type="button" @click="removeItem(index)" class="btn-danger-outline" title="Eliminar Fila">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          
          <button type="button" @click="addItemRow" class="btn-secondary">
            <i class="fas fa-plus"></i> Añadir Fila
          </button>
          
        </template>
        
        <template v-else>
          <p>Especifique la cantidad total de este producto que ingresa con este lote.</p>
          <div class="form-row">
            <div class="form-group">
              <label for="quantity">Cantidad Total *</label>
              <input 
                type="number" 
                id="quantity" 
                v-model.number="itemsToRegister[0].quantity" 
                required 
                min="1" 
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Unidad de Medida</label>
              <input type="text" :value="formatUnitType(product.InventoryType.unitType)" class="form-control" disabled />
            </div>
          </div>
        </template>
      </div>

      <div class="form-actions">
        <button type="button" @click="cancel" class="btn-secondary">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="itemsToRegister.length === 0 || loading">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          {{ loading ? 'Registrando...' : 'Registrar ' + totalItemsToRegister + ' Item(s)' }}
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
  name: 'BatchRegisterForm',
  data() {
    return {
      loading: false,
      errorMessage: '',
      batches: [],
      products: [],
      selectedBatchId: null,
      selectedProductId: null,
      batch: {},
      product: {},
      itemsToRegister: []
    };
  },
  computed: {
    totalItemsToRegister() {
      if (!this.product.InventoryType) return 0;
      
      if (this.product.InventoryType.trackableIndividually) {
        // Contar solo las filas que tienen un número de serie
        return this.itemsToRegister.filter(item => item.serialNumber && item.serialNumber.trim() !== '').length;
      } else {
        return this.itemsToRegister[0]?.quantity || 0;
      }
    }
  },
  created() {
    this.loadInitialData();
  },
  methods: {
    async loadInitialData() {
      this.loading = true;
      try {
        // Cargar lotes pendientes o en progreso
        const [batchResponse, productResponse] = await Promise.all([
          InventoryService.getAllBatches({ status: 'in_progress' }), // O 'in_progress'
          InventoryService.getProductTemplates() // Usamos la ruta que SÍ existe
        ]);

        this.batches = batchResponse.data.batches || batchResponse.data || [];
        this.products = productResponse.data;
        
      } catch (error) {
        this.errorMessage = 'Error al cargar lotes o productos.';
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    
    async onBatchSelect() {
      if (!this.selectedBatchId) return;
      this.loading = true;
      try {
        const response = await InventoryService.getBatch(this.selectedBatchId);
        this.batch = response.data;
        
        // Si el producto ya está seleccionado, recargar items
        if (this.selectedProductId) {
          this.onProductSelect();
        }
      } catch (e) {
        this.errorMessage = "Error al cargar datos del lote.";
      }
      this.loading = false;
    },

    onProductSelect() {
      if (!this.selectedProductId) return;
      
      const product = this.products.find(p => p.id === this.selectedProductId);
      if (!product) {
        this.errorMessage = "Producto no encontrado.";
        return;
      }
      
      this.product = product;
      
      if (!this.product.InventoryType) {
        this.errorMessage = `El producto ${product.model} no tiene un 'Tipo' (InventoryType) definido en la API. No se pueden registrar items.`;
        return;
      }

      // Inicializar el formulario
      this.resetItems();
    },
    
    resetItems() {
      this.itemsToRegister = [];
      if (this.product.InventoryType.trackableIndividually) {
        // Añadir una fila por defecto
        this.addItemRow();
      } else {
        // Añadir un objeto para cantidad
        this.itemsToRegister.push({
          productId: this.product.id,
          batchId: this.batch.id,
          name: this.product.model,
          brand: this.product.brand,
          model: this.product.model,
          status: 'available',
          locationId: this.batch.locationId,
          purchaseDate: this.formatDateForInput(this.batch.purchaseDate),
          cost: this.product.purchasePrice,
          warrantyUntil: this.calculateWarranty(this.batch.purchaseDate, this.product.warrantyMonths),
          inventoryCategory: 'bulk', // (De 'inventory.model.js')
          unitType: this.product.InventoryType.unitType,
          quantity: 1 // Cantidad por defecto
        });
      }
    },

    addItemRow() {
      this.itemsToRegister.push({
        productId: this.product.id,
        batchId: this.batch.id,
        name: this.product.model, // El nombre base
        brand: this.product.brand,
        model: this.product.model,
        serialNumber: '',
        macAddress: '',
        status: 'available',
        locationId: this.batch.locationId,
        purchaseDate: this.formatDateForInput(this.batch.purchaseDate),
        cost: this.product.purchasePrice,
        warrantyUntil: this.calculateWarranty(this.batch.purchaseDate, this.product.warrantyMonths),
        inventoryCategory: 'equipment', // (De 'inventory.model.js')
        unitType: 'piece',
        quantity: 1
      });

      // Enfocar el nuevo input
      this.$nextTick(() => {
        const inputs = this.$refs.serialInputs;
        if (inputs && inputs.length > 0) {
          inputs[inputs.length - 1].focus();
        }
      });
    },

    removeItem(index) {
      this.itemsToRegister.splice(index, 1);
    },

    focusNextOrAdd(index) {
      // Si es la última fila, añade una nueva
      if (index === this.itemsToRegister.length - 1) {
        this.addItemRow();
      } else {
        // Si no, enfoca el siguiente input de serial
        this.$nextTick(() => {
          const inputs = this.$refs.serialInputs;
          if (inputs[index + 1]) {
            inputs[index + 1].focus();
          }
        });
      }
    },

    async registerItems() {
      this.loading = true;
      this.errorMessage = '';
      
      try {
        let itemsData;
        
        if (this.product.InventoryType.trackableIndividually) {
          // Filtrar filas vacías
          itemsData = this.itemsToRegister
            .filter(item => item.serialNumber && item.serialNumber.trim() !== '')
            .map(item => ({
              ...item,
              macAddress: item.macAddress ? InventoryService.formatMacAddress(item.macAddress) : null
            }));
        } else {
          // Es un item 'bulk'
          itemsData = this.itemsToRegister;
        }

        if (itemsData.length === 0) {
          this.errorMessage = "No hay items para registrar. Añade un número de serie o una cantidad.";
          this.loading = false;
          return;
        }

        // Usar la ruta que SÍ existe: /api/inventory/batches/:id/add-items
        const response = await InventoryService.addItemsToBatch(this.batch.id, {
          items: itemsData
        });

        this.showNotification('success', `¡${response.data.createdCount || itemsData.length} items registrados exitosamente!`);
        
        // Preguntar si quiere completar el lote
        if (confirm("Items registrados. ¿Desea marcar este lote como 'Completado'?")) {
          // Este método SÍ existe
          await InventoryService.completeBatch(this.batch.id);
          this.showNotification('success', `Lote ${this.batch.batchNumber} marcado como completado.`);
        }
        
        this.$router.push('/inventory');
        
      } catch (error) {
        console.error('Error al registrar items:', error);
        this.errorMessage = error.response?.data?.message || 'Ocurrió un error al guardar los items.';
      } finally {
        this.loading = false;
      }
    },

    cancel() {
      this.$router.push('/inventory'); // O a la lista de lotes
    },
    
    // --- Helpers ---
    formatDateForInput(dateStr) {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      try {
        return new Date(dateStr).toISOString().split('T')[0];
      } catch (e) {
        return new Date().toISOString().split('T')[0];
      }
    },
    calculateWarranty(purchaseDateStr, months) {
      if (!purchaseDateStr || !months) return null;
      try {
        const date = new Date(purchaseDateStr);
        date.setMonth(date.getMonth() + months);
        return date.toISOString().split('T')[0];
      } catch (e) {
        return null;
      }
    },
    formatUnitType(type) {
      const typeMap = {
        'piece': 'Pieza(s)', 'meters': 'Metros', 'grams': 'Gramos',
        'box': 'Caja(s)', 'liters': 'Litros', 'kilograms': 'Kilogramos'
      };
      return typeMap[type] || type;
    },
    showNotification(type, message) {
      // (Asumiendo que tienes un sistema de notificación global)
      console.log(`[${type}]: ${message}`);
      alert(message);
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
  --text-muted: #718096;
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
.item-entry {
  grid-template-columns: 1fr 1fr auto;
  align-items: flex-end;
}
.action-group {
  margin-bottom: 0;
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
.btn-primary, .btn-secondary, .btn-danger-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
.btn-danger-outline {
  background-color: transparent;
  color: var(--error-color);
  border: 1px solid var(--error-color);
  padding: var(--spacing-md); /* Hacerlo más cuadrado */
}
.btn-danger-outline:hover {
  background-color: rgba(245, 101, 101, 0.1);
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
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
.loading-spinner {
  text-align: center;
  color: var(--text-muted);
}
.loading-spinner i {
  font-size: 2rem;
  margin-bottom: var(--spacing-md);
  color: var(--primary-color);
}
@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  .item-entry {
    grid-template-columns: 1fr; /* Apilar todo en móvil */
  }
  .action-group {
    margin-top: var(--spacing-sm);
  }
  .btn-danger-outline {
    width: 100%; /* Botón de eliminar ocupa todo el ancho */
  }
}
</style>

