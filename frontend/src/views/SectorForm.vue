<template>
  <div class="sector-form">
    <h1 class="page-title">{{ isEdit ? 'Editar Sector' : 'Nuevo Sector' }}</h1>
    
    <div class="card">
      <form @submit.prevent="submitForm">
        <div class="form-group">
          <label for="name">Nombre *</label>
          <input 
            type="text" 
            id="name" 
            v-model="sector.name" 
            required
            placeholder="Ingrese nombre del sector"
          />
        </div>
        
        <div class="form-group">
          <label for="nodeId">Nodo *</label>
          <select 
            id="nodeId" 
            v-model="sector.nodeId" 
            required
          >
            <option value="">Seleccione un nodo</option>
            <option v-for="node in nodes" :key="node.id" :value="node.id">
              {{ node.name }}
            </option>
          </select>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="frequency">Frecuencia</label>
            <input 
              type="text" 
              id="frequency" 
              v-model="sector.frequency" 
              placeholder="Ej: 5.8 GHz"
            />
          </div>
          
          <div class="form-group">
            <label for="azimuth">Azimut (°)</label>
            <input 
              type="number" 
              id="azimuth" 
              v-model="sector.azimuth" 
              min="0"
              max="359"
              placeholder="Ej: 180"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="polarization">Polarización</label>
          <select id="polarization" v-model="sector.polarization">
            <option value="">Seleccione polarización</option>
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
            <option value="dual">Dual</option>
            <option value="circular">Circular</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="description">Descripción</label>
          <textarea 
            id="description" 
            v-model="sector.description" 
            rows="3" 
            placeholder="Descripción o notas sobre este sector"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="sector.active" />
            Activo
          </label>
        </div>
        
        <div class="error-message" v-if="errorMessage">
          {{ errorMessage }}
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn" @click="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import NetworkService from '../services/network.service';

export default {
  name: 'SectorForm',
  data() {
    return {
      sector: {
        name: '',
        nodeId: '',
        frequency: '',
        azimuth: null,
        polarization: '',
        description: '',
        active: true
      },
      nodes: [],
      loading: false,
      loadingNodes: false,
      errorMessage: '',
      isEdit: false
    };
  },
  created() {
    // Cargar lista de nodos
    this.loadNodes();
    
    // Verificar si estamos en modo edición
    const sectorId = this.$route.params.id;
    this.isEdit = sectorId && sectorId !== 'new';
    
    if (this.isEdit) {
      this.loadSector(sectorId);
    } else {
      // Si hay un nodeId en la query, preseleccionarlo
      const queryNodeId = this.$route.query.nodeId;
      if (queryNodeId) {
        this.sector.nodeId = queryNodeId;
      }
    }
  },
  methods: {
    async loadNodes() {
      this.loadingNodes = true;
      try {
        const response = await NetworkService.getAllNodes();
        this.nodes = response.data;
      } catch (error) {
        console.error('Error cargando nodos:', error);
        this.errorMessage = 'Error al cargar la lista de nodos.';
      } finally {
        this.loadingNodes = false;
      }
    },
    
    async loadSector(id) {
      this.loading = true;
      try {
        const response = await NetworkService.getSector(id);
        const sector = response.data;
        
        // Asignar datos al formulario
        this.sector = {
          name: sector.name,
          nodeId: sector.nodeId,
          frequency: sector.frequency || '',
          azimuth: sector.azimuth,
          polarization: sector.polarization || '',
          description: sector.description || '',
          active: sector.active
        };
      } catch (error) {
        console.error('Error cargando sector:', error);
        this.errorMessage = 'Error al cargar los datos del sector.';
      } finally {
        this.loading = false;
      }
    },
    
    async submitForm() {
      // Validación básica
      if (!this.sector.name || !this.sector.nodeId) {
        this.errorMessage = 'El nombre del sector y el nodo son obligatorios.';
        return;
      }
      
      this.loading = true;
      this.errorMessage = '';
      
      try {
        if (this.isEdit) {
          // Actualizar sector existente
          await NetworkService.updateSector(this.$route.params.id, this.sector);
          this.$router.push(`/sectors/${this.$route.params.id}`);
        } else {
          // Crear nuevo sector
          const response = await NetworkService.createSector(this.sector);
          this.$router.push(`/sectors/${response.data.id}`);
        }
      } catch (error) {
        console.error('Error guardando sector:', error);
        this.errorMessage = 'Error al guardar el sector. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    
    cancel() {
      if (this.isEdit) {
        this.$router.push(`/sectors/${this.$route.params.id}`);
      } else if (this.sector.nodeId) {
        this.$router.push(`/nodes/${this.sector.nodeId}`);
      } else {
        this.$router.push('/network');
      }
    }
  }
};
</script>

<style scoped>
.sector-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-label input {
  width: auto;
}

input[type="text"],
input[type="number"],
textarea,
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #3498db;
  outline: none;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>