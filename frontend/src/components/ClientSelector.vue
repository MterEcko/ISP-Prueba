<template>
  <div class="client-selector">
    <div class="search-container">
      <input 
        type="text"
        v-model="searchTerm"
        @input="searchClients"
        @focus="showDropdown = true"
        :placeholder="placeholder"
        class="search-input"
        ref="searchInput"
      />
      
      <div v-if="showDropdown && (filteredClients.length > 0 || loading)" class="dropdown">
        <div v-if="loading" class="loading-item">
          Buscando clientes...
        </div>
        
        <div 
          v-for="client in filteredClients" 
          :key="client.id"
          @click="selectClient(client)"
          class="client-item"
          :class="{ selected: selectedClient?.id === client.id }"
        >
          <div class="client-info">
            <div class="client-name">
              {{ client.firstName }} {{ client.lastName }}
            </div>
            <div class="client-details">
              <span v-if="client.email" class="client-email">{{ client.email }}</span>
              <span v-if="client.phone" class="client-phone">{{ client.phone }}</span>
            </div>
          </div>
          
          <div class="client-status" :class="{ active: client.active }">
            {{ client.active ? 'Activo' : 'Inactivo' }}
          </div>
        </div>
        
        <div v-if="!loading && filteredClients.length === 0 && searchTerm" class="no-results">
          No se encontraron clientes
        </div>
      </div>
    </div>
    
    <div v-if="selectedClient" class="selected-client">
      <div class="selected-info">
        <strong>{{ selectedClient.firstName }} {{ selectedClient.lastName }}</strong>
        <span class="selected-email">{{ selectedClient.email }}</span>
      </div>
      <button @click="clearSelection" class="clear-button">×</button>
    </div>
  </div>
</template>

<script>
import ClientService from '../services/client.service';

export default {
  name: 'ClientSelector',
  props: {
    modelValue: {
      type: [Number, String],
      default: null
    },
    placeholder: {
      type: String,
      default: 'Buscar cliente...'
    }
  },
  emits: ['update:modelValue', 'select'],
  data() {
    return {
      searchTerm: '',
      filteredClients: [],
      selectedClient: null,
      showDropdown: false,
      loading: false,
      searchTimeout: null
    };
  },
  mounted() {
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', this.handleClickOutside);
    
    // Si hay un valor inicial, cargar el cliente
    if (this.modelValue) {
      this.loadInitialClient();
    }
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    async searchClients() {
      if (this.searchTerm.length < 2) {
        this.filteredClients = [];
        return;
      }
      
      this.loading = true;
      
      try {
        const response = await ClientService.getAllClients({
          name: this.searchTerm,
          size: 10
        });
        
        this.filteredClients = response.data.clients || [];
      } catch (error) {
        console.error('Error buscando clientes:', error);
        this.filteredClients = [];
      } finally {
        this.loading = false;
      }
    },
    
    selectClient(client) {
      this.selectedClient = client;
      this.searchTerm = '';
      this.showDropdown = false;
      this.filteredClients = [];
      
      this.$emit('update:modelValue', client.id);
      this.$emit('select', client);
    },
    
    clearSelection() {
      this.selectedClient = null;
      this.searchTerm = '';
      this.showDropdown = false;
      this.filteredClients = [];
      
      this.$emit('update:modelValue', null);
      this.$emit('select', null);
    },
    
    async loadInitialClient() {
      try {
        const response = await ClientService.getClient(this.modelValue);
        this.selectedClient = response.data;
      } catch (error) {
        console.error('Error cargando cliente inicial:', error);
      }
    },
    
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.showDropdown = false;
      }
    }
  }
};
</script>

<style scoped>
.client-selector {
  position: relative;
  width: 100%;
}

.search-container {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 5px 5px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.loading-item,
.no-results {
  padding: 15px;
  text-align: center;
  color: #666;
  font-style: italic;
}

.client-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.client-item:hover {
  background-color: #f8f9fa;
}

.client-item.selected {
  background-color: #e3f2fd;
}

.client-item:last-child {
  border-bottom: none;
}

.client-info {
  flex: 1;
}

.client-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.client-details {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #666;
}

.client-email:before {
  content: "?? ";
}

.client-phone:before {
  content: "?? ";
}

.client-status {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  background-color: #ffebee;
  color: #c62828;
}

.client-status.active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.selected-client {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 5px;
  border: 1px solid #e9ecef;
}

.selected-info {
  display: flex;
  flex-direction: column;
}

.selected-email {
  font-size: 12px;
  color: #666;
}

.clear-button {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
}

.clear-button:hover {
  background: #c82333;
}
</style>