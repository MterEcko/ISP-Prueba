<template>
  <div class="inventory-form">
    <div class="page-header">
      <div class="header-content">
        <h2>
          <i :class="isEdit ? 'fas fa-edit' : 'fas fa-plus-circle'"></i>
          {{ isEdit ? 'Editar Item de Inventario' : 'Registrar Nuevo Item' }}
        </h2>
      </div>
    </div>

    <form @submit.prevent="submitForm">
      
      <div class="form-section">
        <h3>1. Definición del Producto</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="productId">Producto (del Catálogo) *</label>
            <div class="select-with-action">
              <select id="productId" v-model="item.productId" @change="onProductSelect" required class="form-control">
                <option :value="null" disabled>Seleccione un producto del catálogo</option>
                <option v-for="product in products" :key="product.id" :value="product.id">
                  {{ product.brand }} {{ product.model }} ({{ product.InventoryType.name }})
                </option>
              </select>
              <button type="button" @click="createNewProduct" class="btn-quick-add" title="Crear nuevo producto">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <small class="help-text">Define qué es este item. Esto cargará valores por defecto.</small>
          </div>

          <div class="form-group">
            <label for="batchId">Lote de Compra (Opcional)</label>
            <div class="select-with-action">
              <select id="batchId" v-model="item.batchId" @change="onBatchSelect" class="form-control">
                <option :value="null">Ninguno / Desconocido</option>
                <option v-for="batch in batches" :key="batch.id" :value="batch.id">
                  {{ batch.batchNumber }} ({{ batch.supplier || 'Sin proveedor' }})
                </option>
              </select>
              <button type="button" @click="createNewBatch" class="btn-quick-add" title="Crear nuevo lote">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <small class="help-text">Asocia este item a un lote de compra si lo compraste en un lote.</small>
          </div>
        </div>
      </div>
      
      <div class="form-section" v-if="selectedProductType">
        <h3>2. Detalles del Item</h3>
        
        <template v-if="selectedProductType.trackableIndividually">
          <div class="form-row">
            <div class="form-group">
              <label for="serialNumber">Número de Serie</label>
              <input 
                type="text"
                id="serialNumber"
                v-model="item.serialNumber"
                :required="selectedProductType.hasSerial"
                class="form-control"
              />
              <small v-if="!selectedProductType.hasSerial" class="help-text">Este producto no requiere serial.</small>
            </div>
            
            <div class="form-group" v-if="selectedProductType.hasMac">
              <label for="macAddress">Dirección MAC</label>
              <input 
                type="text"
                id="macAddress"
                v-model="item.macAddress"
                placeholder="00:00:00:00:00:00"
                class="form-control"
              />
            </div>
            <input type="hidden" v-model.number="item.quantity" />
          </div>
        </template>
        
        <template v-else>
           <div class="form-row">
              <div class="form-group">
                <label for="quantity">Cantidad *</label>
                <input 
                  type="number" 
                  id="quantity" 
                  v-model.number="item.quantity" 
                  required 
                  min="0" 
                  step="0.01"
                  class="form-control"
                />
              </div>
              <div class="form-group">
                <label for="packages">Paquetes (Opcional)</label>
                <input 
                  type="number" 
                  id="packages" 
                  v-model.number="item.packages" 
                  min="0" 
                  class="form-control"
                />
              </div>
              <div class="form-group">
                <label>Unidad</label>
                <input type="text" :value="formatUnitType(selectedProductType.unitType)" class="form-control" disabled />
              </div>
           </div>
           <small class="help-text">Ej: Cantidad=100, Paquetes=1, Unidad=Caja (1 caja de 100) / Cantidad=300, Paquetes=3, Unidad=Metros (3 rollos de 100m)</small>
        </template>
        
        <div class="form-row">
          <div class="form-group">
            <label for="name">Nombre (Alias) *</label>
            <input 
              type="text"
              id="name"
              v-model="item.name"
              required
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="brand">Marca</label>
            <input 
              type="text"
              id="brand"
              v-model="item.brand"
              class="form-control"
              disabled 
            />
          </div>
          <div class="form-group">
            <label for="model">Modelo</label>
            <input 
              type="text"
              id="model"
              v-model="item.model"
              class="form-control"
              disabled
            />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>3. Información de Compra</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="purchaseDate">Fecha de Compra</label>
            <input 
              type="date"
              id="purchaseDate"
              v-model="item.purchaseDate"
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="cost">Costo (Unitario)</label>
            <input 
              type="number"
              id="cost"
              v-model.number="item.cost"
              step="0.01"
              min="0"
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="warrantyUntil">Garantía Vence</label>
            <input 
              type="date"
              id="warrantyUntil"
              v-model="item.warrantyUntil"
              class="form-control"
            />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>4. Estado y Asignación</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="status">Estado *</label>
            <select 
              id="status"
              v-model="item.status"
              required
              class="form-control"
            >
              <option v-for="status in statusOptions" :key="status.id" :value="status.id">
                {{ status.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="locationId">Ubicación Actual *</label>
            <select 
              id="locationId"
              v-model="item.locationId"
              required
              class="form-control"
            >
              <option :value="null">Sin ubicación asignada</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }} ({{ formatLocationType(location.type) }})
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="clientId">Asignado a Cliente</label>
            <select 
              id="clientId"
              v-model="item.clientId"
              class="form-control"
            >
              <option :value="null">Sin asignar</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.firstName }} {{ client.lastName }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="technicianId">Asignado a Técnico</label>
            <select 
              id="technicianId" 
              v-model="item.assignedToTechnicianId" 
              class="form-control"
            >
              <option :value="null">Sin asignar</option>
              <option v-for="tech in technicians" :key="tech.id" :value="tech.id">
                {{ tech.firstName }} {{ tech.lastName }}
              </option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>5. Descripción y Notas</h3>
        <div class="form-group full-width">
          <label for="description">Descripción (Pública)</label>
          <textarea 
            id="description"
            v-model="item.description"
            rows="3"
            class="form-control"
          ></textarea>
        </div>
        
        <div class="form-group full-width">
          <label for="notes">Notas (Uso interno)</label>
          <textarea 
            id="notes"
            v-model="item.notes"
            rows="4"
            class="form-control"
          ></textarea>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="cancel" class="btn-secondary">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="loading">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          {{ loading ? 'Guardando...' : 'Guardar' }}
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
import ClientService from '../../services/client.service';
// Asumimos que tienes un UserService para cargar técnicos
// import UserService from '../../services/user.service'; 

export default {
  name: 'InventoryForm',
  data() {
    return {
      item: {
        name: '',
        brand: '',
        model: '',
        serialNumber: '',
        macAddress: '',
        status: 'available',
        quantity: 1,
        description: '',
        purchaseDate: null,
        cost: null,
        warrantyUntil: null,
        notes: '',
        locationId: null,
        clientId: null,
        // --- Campos Nuevos ---
        batchId: null,
        productId: null,
        inventoryCategory: 'equipment',
        assignedToTechnicianId: null,
        packages: null,
        unitsPerPackage: null,
        unitType: 'piece',
        parentInventoryId: null
      },
      // --- Listas para Dropdowns ---
      locations: [],
      clients: [],
      products: [],
      batches: [],
      technicians: [], // (Cargar desde UserService)
      
      selectedProductType: null, // Almacena el tipo de producto seleccionado
      
      isEdit: false,
      loading: false,
      errorMessage: '',
      
      // --- Opciones de Estado (del nuevo modelo) ---
      statusOptions: [
        { id: 'available', name: 'Disponible' },
        { id: 'inUse', name: 'En uso' },
        { id: 'installed', name: 'Instalado' },
        { id: 'inRepair', name: 'En reparación' },
        { id: 'defective', name: 'Defectuoso' },
        { id: 'missing', name: 'Extraviado' },
        { id: 'retired', name: 'Retirado' },
        { id: 'returned', name: 'Devuelto (Almacén)' },
        { id: 'pending_register', name: 'Pendiente (Lote)' }
      ]
    };
  },
  created() {
    // Cargar todos los datos necesarios para los dropdowns
    this.loadInitialData();
    
    const itemId = this.$route.params.id;
    if (itemId && itemId !== 'new') {
      this.isEdit = true;
      this.loadItem(itemId);
    } else {
      // Poner fecha de compra por defecto al crear
      this.item.purchaseDate = new Date().toISOString().split('T')[0];
    }
  },
  methods: {
    async loadInitialData() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadLocations(),
          this.loadClients(),
          this.loadProducts(),
          this.loadBatches(),
          this.loadTechnicians()
        ]);
      } catch (error) {
        this.errorMessage = 'Error al cargar datos iniciales. ' + error.message;
      } finally {
        // 'loading' se quitará en loadItem o se quedará en false si es nuevo
        if (!this.isEdit) {
          this.loading = false;
        }
      }
    },
    
    async loadLocations() {
        try {
            // Tu lógica de carga de ubicaciones que ya funciona
            const response = await InventoryService.getAllLocations({ active: true });
            if (response.data?.locations) {
                this.locations = response.data.locations;
            } else if (response.data?.data) {
                this.locations = response.data.data;
            } else if (Array.isArray(response.data)) {
                this.locations = response.data;
            } else {
                this.locations = [];
            }
        } catch (error) {
            console.error('Error cargando ubicaciones:', error);
        }
    },
    async loadClients() {
      try {
        const response = await ClientService.getAllClients({ active: true, size: 500 }); // Aumentar size
        this.clients = response.data.clients || [];
      } catch (error) {
        console.error('Error cargando clientes:', error);
      }
    },
    async loadProducts() {
      try {
        // ¡NECESITAS CREAR ESTE MÉTODO EN InventoryService!
        const response = await InventoryService.getAllProducts(); 
        this.products = response.data;
      } catch (error) {
        console.error('Error cargando productos:', error);
      }
    },
    async loadBatches() {
      try {
        // ¡NECESITAS CREAR ESTE MÉTODO EN InventoryService!
        const response = await InventoryService.getAllBatches({ status: 'completed' });
        this.batches = response.data;
      } catch (error) {
        console.error('Error cargando lotes:', error);
      }
    },
    async loadTechnicians() {
      try {
        // ¡NECESITAS CREAR ESTE MÉTODO EN UserService!
        // const response = await UserService.getAllUsers({ role: 'technician' });
        // this.technicians = response.data;
        
        // --- Simulación mientras creas el servicio ---
        this.technicians = [
          { id: 1, firstName: 'Juan', lastName: 'Perez' },
          { id: 2, firstName: 'Ana', lastName: 'García' }
        ];
        // --- Fin de simulación ---

      } catch (error) {
        console.error('Error cargando técnicos:', error);
      }
    },

    async loadItem(id) {
      this.loading = true;
      try {
        const response = await InventoryService.getInventory(id);
        const item = response.data;
        
        // Formatear fechas para input[type=date]
        item.purchaseDate = this.formatDateForInput(item.purchaseDate);
        item.warrantyUntil = this.formatDateForInput(item.warrantyUntil);
        
        this.item = item;

        // Cargar la info del producto seleccionado (para la lógica de UI)
        if (item.productId) {
          const product = this.products.find(p => p.id === item.productId);
          if (product) {
            this.selectedProductType = product.InventoryType;
          } else {
            // Si el producto no está en la lista, cargarlo individualmente
            const productResponse = await InventoryService.getProduct(item.productId);
            this.selectedProductType = productResponse.data.InventoryType;
          }
        }
        
      } catch (error) {
        console.error('Error cargando item:', error);
        this.errorMessage = 'Error cargando datos del item.';
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * ¡NUEVO! Se activa al seleccionar un producto del catálogo.
     */
    onProductSelect() {
      const productId = this.item.productId;
      const product = this.products.find(p => p.id === productId);
      
      if (!product) return;

      this.selectedProductType = product.InventoryType;

      // Auto-rellenar campos
      this.item.name = product.model;
      this.item.brand = product.brand;
      this.item.model = product.model;
      this.item.description = product.description;
      
      // Auto-rellenar campos de compra (si no están ya en el item)
      if (!this.item.cost) {
        this.item.cost = product.purchasePrice;
      }
      if (!this.item.warrantyUntil && product.warrantyMonths > 0) {
        this.item.warrantyUntil = this.calculateWarranty(this.item.purchaseDate, product.warrantyMonths);
      }

      // Configurar campos de tipo de inventario
      if (product.InventoryType.trackableIndividually) {
        this.item.inventoryCategory = 'equipment';
        this.item.quantity = 1;
        this.item.unitType = 'piece';
        this.item.packages = null;
        this.item.unitsPerPackage = null;
      } else {
        this.item.inventoryCategory = 'bulk';
        this.item.quantity = 0; // Pedir al usuario que ingrese la cantidad
        this.item.unitType = product.InventoryType.unitType;
        this.item.serialNumber = null; // Los items "bulk" no tienen serial
        this.item.macAddress = null;
      }
    },

    /**
     * ¡NUEVO! Se activa al seleccionar un lote.
     */
    onBatchSelect() {
      const batchId = this.item.batchId;
      const batch = this.batches.find(b => b.id === batchId);

      if (!batch) {
        // Si quita el lote, no hacemos nada
        return;
      }

      // Auto-rellenar campos de compra con los datos del lote
      if (batch.purchaseDate) {
         this.item.purchaseDate = this.formatDateForInput(batch.purchaseDate);
      }
      if (batch.locationId) {
        this.item.locationId = batch.locationId;
      }
      // (Podrías auto-rellenar el costo unitario si el lote lo tuviera)
    },

    async submitForm() {
      this.loading = true;
      this.errorMessage = '';
      
      try {
        // Validar campos requeridos
        if (!this.item.productId) {
          this.errorMessage = 'Debe seleccionar un producto del catálogo.';
          return;
        }

        // Preparar datos para enviar
        const itemData = { ...this.item };
        
        // Limpiar valores nulos
        Object.keys(itemData).forEach(key => {
          if (itemData[key] === '' || itemData[key] === null) {
            itemData[key] = null;
          }
        });

        // Lógica de estado y asignación
        if (itemData.clientId && itemData.status === 'available') {
          itemData.status = 'inUse';
        }
        if (itemData.assignedToTechnicianId && itemData.status === 'available') {
          itemData.status = 'inUse'; // O un estado 'assigned'
          itemData.assignedAt = new Date();
        }
        
        if (this.isEdit) {
          await InventoryService.updateInventory(this.item.id, itemData);
        } else {
          await InventoryService.createInventory(itemData);
        }
        
        this.$router.push('/inventory');
      } catch (error) {
        console.error('Error guardando item:', error);
        const apiError = error.response?.data?.message || error.message;
        this.errorMessage = `Error: ${apiError}. Por favor, verifique los campos.`;
      } finally {
        this.loading = false;
      }
    },

    cancel() {
      this.$router.push('/inventory');
    },

    createNewProduct() {
      this.$router.push('/inventory/newproduct');
    },

    createNewBatch() {
      this.$router.push('/inventory/batch/add');
    },

    // --- Helpers ---
    formatDateForInput(dateStr) {
      if (!dateStr) return null;
      try {
        return new Date(dateStr).toISOString().split('T')[0];
      } catch (e) {
        return null;
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

    formatLocationType(type) {
      const typeMap = {
        'warehouse': 'Almacén',
        'vehicle': 'Vehículo',
        'clientSite': 'Sitio Cliente', // (Ajustado a tu modelo)
        'repairShop': 'Taller', // (Ajustado a tu modelo)
        'other': 'Otro'
      };
      return typeMap[type] || type;
    },

    formatUnitType(type) {
      const typeMap = {
        'piece': 'Pieza(s)',
        'meters': 'Metros',
        'grams': 'Gramos',
        'box': 'Caja(s)',
        'liters': 'Litros',
        'kilograms': 'Kilogramos'
      };
      return typeMap[type] || type;
    }
  }
};
</script>


<style scoped>
/* Usar variables globales si están definidas */
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

/* --- Header --- */
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

/* Aplicar .form-control a inputs, selects, textareas */
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

/* Botones */
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

.select-with-action {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.select-with-action select {
  flex: 1;
}

.btn-quick-add {
  padding: 0 15px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.btn-quick-add:hover {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(76, 175, 80, 0.3);
}

.btn-quick-add:active {
  transform: translateY(0);
}

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr; /* Apilar en móvil */
    gap: var(--spacing-md);
  }
}
</style>


