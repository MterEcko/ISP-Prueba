<template>
  <div class="inventario-management">
    <h2>Gestión de Inventario</h2>

    <!-- Filtros -->
    <div class="filters">
      <input type="text" v-model="filtros.name" placeholder="Nombre del equipo">
      <input type="text" v-model="filtros.serialNumber" placeholder="Número de serie">
      <input type="text" v-model="filtros.macAddress" placeholder="Dirección MAC">
      <select v-model="filtros.status">
        <option value="">Todos los estados</option>
        <option value="available">Disponible</option>
        <option value="in_use">En uso</option>
        <option value="in_repair">En reparación</option>
        <option value="defective">Defectuoso</option>
        <option value="retired">Retirado</option>
      </select>
      <button @click="aplicarFiltros">Filtrar</button>
      <button @click="limpiarFiltros">Limpiar Filtros</button>
    </div>

    <div v-if="isLoading" class="loading">Cargando inventario...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    
    <div v-if="!isLoading && !error && inventario.length === 0 && !filtrosAplicados" class="no-data">
      No hay ítems en el inventario para mostrar.
    </div>
    <div v-if="!isLoading && !error && inventario.length === 0 && filtrosAplicados" class="no-data">
      No se encontraron ítems con los filtros aplicados.
    </div>

    <table v-if="!isLoading && !error && inventario.length > 0" class="inventario-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Número de Serie</th>
          <th>MAC</th>
          <th>Estado</th>
          <th>Ubicación</th>
          <th>Fecha Compra</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in inventario" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ item.serialNumber }}</td>
          <td>{{ item.macAddress || '-' }}</td>
          <td>{{ formatStatus(item.status) }}</td>
          <td>{{ item.locationId ? item.Location?.name || `ID: ${item.locationId}` : 'N/A' }}</td>
          <td>{{ formatDate(item.purchaseDate) }}</td>
          <td>
            <button @click="verItem(item.id)">Ver</button>
            <button @click="editarItem(item.id)">Editar</button>
            <button @click="eliminarItem(item.id)" class="delete-button">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <button @click="abrirModalNuevoItem()" class="add-button">Añadir Nuevo Ítem</button>

    <!-- Modal para añadir/editar ítem -->
    <div v-if="mostrarModal" class="modal">
      <div class="modal-content">
        <span class="close-button" @click="cerrarModal">&times;</span>
        <h3>{{ esEdicion ? 'Editar Ítem' : 'Añadir Nuevo Ítem' }}</h3>
        <form @submit.prevent="guardarItem">
          <div>
            <label for="name">Nombre:</label>
            <input type="text" id="name" v-model="itemActual.name" required>
          </div>
          <div>
            <label for="serialNumber">Número de Serie:</label>
            <input type="text" id="serialNumber" v-model="itemActual.serialNumber">
          </div>
          <div>
            <label for="macAddress">Dirección MAC:</label>
            <input type="text" id="macAddress" v-model="macAddressInput" @input="formatMacAddress" placeholder="XX:XX:XX:XX:XX:XX">
          </div>
          <div>
            <label for="status">Estado:</label>
            <select id="status" v-model="itemActual.status">
              <option value="available">Disponible</option>
              <option value="in_use">En uso</option>
              <option value="in_repair">En reparación</option>
              <option value="defective">Defectuoso</option>
              <option value="retired">Retirado</option>
            </select>
          </div>
          <div>
            <label for="locationId">ID Ubicación (Opcional):</label>
            <input type="number" id="locationId" v-model.number="itemActual.locationId">
          </div>
          <div>
            <label for="purchaseDate">Fecha de Compra:</label>
            <input type="date" id="purchaseDate" v-model="itemActual.purchaseDate">
          </div>
          <div>
            <label for="cost">Costo:</label>
            <input type="number" step="0.01" id="cost" v-model.number="itemActual.cost">
          </div>
          <button type="submit">{{ esEdicion ? 'Actualizar' : 'Guardar' }}</button>
          <button type="button" @click="cerrarModal">Cancelar</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import InventoryService from '../services/inventory.service';

export default {
  name: 'InventoryManagement',
  data() {
    return {
      inventario: [],
      isLoading: false,
      error: null,
      mostrarModal: false,
      esEdicion: false,
      itemActual: {
        id: null,
        name: '',
        serialNumber: '',
        macAddress: '',
        status: 'available',
        locationId: null,
        purchaseDate: null,
        cost: null
      },
      macAddressInput: '',
      filtros: {
        name: '',
        serialNumber: '',
        macAddress: '',
        status: ''
      },
      filtrosAplicados: false
    };
  },
  async created() {
    await this.cargarInventario();
  },
  methods: {
    async cargarInventario(params = {}) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await InventoryService.getAllInventory(params);
        this.inventario = response.data.items || [];
      } catch (err) {
        this.error = 'Error al cargar el inventario. Por favor, inténtelo más tarde.';
        console.error('[InventoryManagement.vue] Error en cargarInventario:', err);
        this.inventario = [];
      } finally {
        this.isLoading = false;
      }
    },
    aplicarFiltros() {
      this.filtrosAplicados = true;
      const activeFilters = {};
      for (const key in this.filtros) {
        if (this.filtros[key] !== '' && this.filtros[key] !== null) {
          activeFilters[key] = this.filtros[key];
        }
      }
      this.cargarInventario(activeFilters);
    },
    limpiarFiltros() {
      this.filtros = {
        name: '',
        serialNumber: '',
        macAddress: '',
        status: ''
      };
      this.filtrosAplicados = false;
      this.cargarInventario();
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      return date.toLocaleDateString(undefined, options);
    },
    formatStatus(status) {
      const statusMap = {
        available: 'Disponible',
        in_use: 'En uso',
        in_repair: 'En reparación',
        defective: 'Defectuoso',
        retired: 'Retirado'
      };
      return statusMap[status] || status;
    },
    formatMacAddress(event) {
      let value = event.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      let formatted = '';
      for (let i = 0; i < value.length && i < 12; i += 2) {
        formatted += value.slice(i, i + 2);
        if (i < 10) formatted += ':';
      }
      this.macAddressInput = formatted;
      this.itemActual.macAddress = formatted;
    },
    abrirModalNuevoItem() {
      this.esEdicion = false;
      this.itemActual = {
        id: null,
        name: '',
        serialNumber: '',
        macAddress: '',
        status: 'available',
        locationId: null,
        purchaseDate: new Date().toISOString().split('T')[0],
        cost: null
      };
      this.macAddressInput = '';
      this.mostrarModal = true;
    },
    editarItem(id) {
      const item = this.inventario.find(i => i.id === id);
      if (item) {
        this.esEdicion = true;
        this.itemActual = { ...item };
        this.macAddressInput = item.macAddress || '';
        if (this.itemActual.purchaseDate) {
          this.itemActual.purchaseDate = new Date(this.itemActual.purchaseDate).toISOString().split('T')[0];
        }
        this.mostrarModal = true;
      }
    },
    verItem(id) {
      const item = this.inventario.find(i => i.id === id);
      if (item) alert(JSON.stringify(item, null, 2));
    },
    cerrarModal() {
      this.mostrarModal = false;
    },
    async guardarItem() {
      this.isLoading = true;
      try {
        // Validar formato de MAC
        if (this.itemActual.macAddress && !/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(this.itemActual.macAddress)) {
          throw new Error('Formato de dirección MAC inválido');
        }
        // Convertir valores vacíos a null
        const itemData = {
          ...this.itemActual,
          locationId: this.itemActual.locationId || null,
          cost: this.itemActual.cost || null,
          macAddress: this.itemActual.macAddress || null
        };
        let response;
        if (this.esEdicion) {
          response = await InventoryService.updateInventory(this.itemActual.id, itemData);
        } else {
          response = await InventoryService.createInventory(itemData);
        }
        if (response.data.id) {
          alert(`Ítem ${this.esEdicion ? 'actualizado' : 'guardado'} exitosamente.`);
          this.cerrarModal();
          await this.cargarInventario(this.filtrosAplicados ? this.filtros : {});
        } else {
          throw new Error('No se recibió ID del ítem');
        }
      } catch (err) {
        alert(`Error al ${this.esEdicion ? 'actualizar' : 'guardar'} el ítem: ${err.message}`);
      } finally {
        this.isLoading = false;
      }
    },
    async eliminarItem(id) {
      if (confirm('¿Está seguro de que desea eliminar este ítem del inventario?')) {
        this.isLoading = true;
        try {
          await InventoryService.deleteInventory(id);
          alert('Ítem eliminado exitosamente.');
          await this.cargarInventario(this.filtrosAplicados ? this.filtros : {});
        } catch (err) {
          alert('Error al eliminar el ítem: ' + err.message);
        } finally {
          this.isLoading = false;
        }
      }
    }
  }
};
</script>
<style scoped>
.inventario-management {
  font-family: Arial, sans-serif;
  padding: 20px;
  max-width: 1000px;
  margin: auto;
}

.loading,
.no-data {
  text-align: center;
  padding: 20px;
  font-style: italic;
  color: #555;
}

.error-message {
  color: red;
  background-color: #ffe0e0;
  border: 1px solid red;
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
  text-align: center;
}

.filters {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f0f0f0;
  border-radius: 8px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filters input[type="text"],
.filters select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.filters button {
  padding: 8px 15px;
}

.inventario-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.inventario-table th,
.inventario-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

.inventario-table th {
  background-color: #f2f2f2;
  color: #333;
}

.inventario-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.inventario-table button {
  margin-right: 5px;
  padding: 5px 8px;
  font-size: 0.9em;
}

.delete-button {
  background-color: #dc3545;
}
.delete-button:hover {
  background-color: #c82333;
}

.add-button {
  display: block;
  margin: 20px auto;
  padding: 10px 20px;
  font-size: 1.1em;
}

/* Modal Styles */
.modal {
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: #fefefe;
  padding: 25px;
  border: 1px solid #888;
  width: 80%;
  max-width: 500px;
  border-radius: 8px;
  position: relative;
}

.close-button {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  position: absolute;
  top: 10px;
  right: 15px;
}

.close-button:hover,
.close-button:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}

.modal-content form div {
  margin-bottom: 15px;
}

.modal-content label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.modal-content input[type="text"],
.modal-content input[type="number"],
.modal-content input[type="date"],
.modal-content select {
  width: calc(100% - 22px); /* Account for padding and border */
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.modal-content button[type="submit"] {
  background-color: #28a745;
}
.modal-content button[type="submit"]:hover {
  background-color: #218838;
}
.modal-content button[type="button"] {
  background-color: #6c757d;
}
.modal-content button[type="button"]:hover {
  background-color: #5a6268;
}

button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
}

button:hover {
  background-color: #0056b3;
}
</style>

