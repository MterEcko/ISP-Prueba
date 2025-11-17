<template>
  <div class="inventory-form">
    <div class="page-header">
      <div class="header-content">
        <h2>
          <i :class="isEdit ? 'fas fa-edit' : 'fas fa-plus-circle'"></i>
          {{ isEdit ? 'Editar Lote de Compra' : 'Nuevo Lote de Compra' }}
        </h2>
      </div>
    </div>

    <form @submit.prevent="submitForm">
      
      <div class="form-section">
        <h3>1. Información del Lote</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="batchNumber">Número de Lote</label>
            <input 
              type="text"
              id="batchNumber"
              v-model="batch.batchNumber"
              class="form-control"
              placeholder="Auto-generado si se deja vacío"
            />
            <small class="help-text">Se genera automáticamente al guardar si se deja en blanco.</small>
          </div>
          <div class="form-group">
            <label for="status">Estado *</label>
            <select id="status" v-model="batch.status" required class="form-control">
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>2. Detalles de la Compra</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="supplier">Proveedor</label>
            <input 
              type="text"
              id="supplier"
              v-model="batch.supplier"
              class="form-control"
              placeholder="Ej: Proveedor XYZ S.A. de C.V."
            />
          </div>
          
          <div class="form-group">
            <label for="invoiceNumber">Número de Factura</label>
            <input 
              type="text"
              id="invoiceNumber"
              v-model="batch.invoiceNumber"
              class="form-control"
              placeholder="Ej: F-12345"
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="purchaseDate">Fecha de Compra *</label>
            <input 
              type="date"
              id="purchaseDate"
              v-model="batch.purchaseDate"
              required
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="totalCost">Costo Total del Lote</label>
            <input 
              type="number"
              id="totalCost"
              v-model.number="batch.totalCost"
              step="0.01"
              min="0"
              class="form-control"
            />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>3. Recepción</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="receivedByUserId">Recibido por</label>
            <select id="receivedByUserId" v-model="batch.receivedByUserId" class="form-control">
              <option :value="null">Seleccionar usuario...</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.firstName }} {{ user.lastName }} ({{ user.username }})
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="locationId">Ubicación de Recepción</label>
            <select id="locationId" v-model="batch.locationId" class="form-control">
              <option :value="null">Seleccionar ubicación...</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-group full-width">
          <label for="notes">Notas</label>
          <textarea 
            id="notes"
            v-model="batch.notes"
            rows="3"
            class="form-control"
            placeholder="Notas adicionales sobre la compra o recepción del lote..."
          ></textarea>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="cancel" class="btn-secondary">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="loading">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          {{ loading ? 'Guardando...' : 'Guardar Lote' }}
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
// Usamos los servicios que SÍ existen
import InventoryService from '../../services/inventory.service';
import UserService from '../../services/user.service'; 

export default {
  name: 'InventoryBatchForm',
  data() {
    return {
      batch: {
        batchNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        supplier: '',
        invoiceNumber: '',
        totalCost: null,
        receivedByUserId: null,
        locationId: null,
        status: 'pending',
        notes: ''
      },
      locations: [],
      users: [], // Para el dropdown "Recibido por"
      isEdit: false,
      loading: false,
      errorMessage: ''
    };
  },
  created() {
    this.loadInitialData();
    const batchId = this.$route.params.id; // Asume ruta /inventory/batch/:id
    if (batchId && batchId !== 'new') {
      this.isEdit = true;
      this.loadBatch(batchId);
    }
  },
  methods: {
    async loadInitialData() {
      this.loading = true;
      try {
        // Llama a los métodos que SÍ existen en tus archivos de servicio
        await Promise.all([
          this.loadLocations(),
          this.loadUsers()
        ]);
      } catch (error) {
        this.errorMessage = 'Error al cargar datos iniciales. ' + error.message;
      } finally {
        if (!this.isEdit) {
          this.loading = false;
        }
      }
    },

    async loadLocations() {
      try {
        // Llama a getAllLocations, filtrando por almacenes
        const response = await InventoryService.getAllLocations({ active: true, type: 'warehouse' });
        this.locations = response.data.locations || response.data || [];
      } catch (error) {
        console.error('Error cargando ubicaciones:', error);
      }
    },

    async loadUsers() {
      try {
        // Llama a getAllUsers de tu UserService
        const response = await UserService.getAllUsers({ active: true });
        this.users = response.data.users || response.data; // Ajusta según la respuesta de tu API
      } catch (error) {
        console.error('Error cargando usuarios:', error);
      }
    },

    async loadBatch(id) {
      this.loading = true;
      try {
        // Llama a getBatch, que SÍ existe
        const response = await InventoryService.getBatch(id);
        this.batch = response.data;
        if (this.batch.purchaseDate) {
          this.batch.purchaseDate = new Date(this.batch.purchaseDate).toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('Error cargando lote:', error);
        this.errorMessage = 'No se pudo cargar el lote para editar.';
      } finally {
        this.loading = false;
      }
    },

    async submitForm() {
      this.loading = true;
      this.errorMessage = '';
      
      try {
        const batchData = { ...this.batch };
        Object.keys(batchData).forEach(key => {
          if (batchData[key] === '') {
            batchData[key] = null;
          }
        });

        if (this.isEdit) {
          // NOTA: Tu servicio no tiene "updateBatch". 
          // ¡Necesitas añadirlo en inventory.service.js!
          // Ej: updateBatch(id, data) { return axios.put(API_URL + `inventory/batches/${id}`, data, ...); }
          // await InventoryService.updateBatch(this.batch.id, batchData);
          
          // Por ahora, lanzará un error:
          throw new Error("La función 'updateBatch' no existe en InventoryService. Debes añadirla.");

        } else {
          // Llama a createBatch, que SÍ existe
          await InventoryService.createBatch(batchData);
        }
        
        this.$router.push('/inventory'); // O a la lista de lotes
      } catch (error) {
        console.error('Error guardando lote:', error);
        this.errorMessage = error.response?.data?.message || error.message;
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
</style>
