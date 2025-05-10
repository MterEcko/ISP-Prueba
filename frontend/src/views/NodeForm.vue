<template>
  <div class="node-form">
    <h1 class="page-title">{{ isEdit ? 'Editar Nodo' : 'Nuevo Nodo' }}</h1>
    
    <div class="card">
      <form @submit.prevent="submitForm">
        <div class="form-group">
          <label for="name">Nombre *</label>
          <input 
            type="text" 
            id="name" 
            v-model="node.name" 
            required
            placeholder="Ingrese nombre del nodo"
          />
        </div>
        
        <div class="form-group">
          <label for="location">Ubicación</label>
          <input 
            type="text" 
            id="location" 
            v-model="node.location" 
            placeholder="Ubicación física del nodo"
          />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="latitude">Latitud</label>
            <input 
              type="number" 
              id="latitude" 
              v-model="node.latitude" 
              step="0.000001"
              placeholder="Ej: 19.432608"
            />
          </div>
          
          <div class="form-group">
            <label for="longitude">Longitud</label>
            <input 
              type="number" 
              id="longitude" 
              v-model="node.longitude" 
              step="0.000001"
              placeholder="Ej: -99.133208"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="description">Descripción</label>
          <textarea 
            id="description" 
            v-model="node.description" 
            rows="3" 
            placeholder="Descripción o notas sobre este nodo"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="node.active" />
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
  name: 'NodeForm',
  data() {
    return {
      node: {
        name: '',
        location: '',
        latitude: null,
        longitude: null,
        description: '',
        active: true
      },
      loading: false,
      errorMessage: '',
      isEdit: false
    };
  },
  created() {
    // Verificar si estamos en modo edición
    const nodeId = this.$route.params.id;
    this.isEdit = nodeId && nodeId !== 'new';
    
    if (this.isEdit) {
      this.loadNode(nodeId);
    }
  },
  methods: {
    async loadNode(id) {
      this.loading = true;
      try {
        const response = await NetworkService.getNode(id);
        const node = response.data;
        
        // Asignar datos al formulario
        this.node = {
          name: node.name,
          location: node.location || '',
          latitude: node.latitude,
          longitude: node.longitude,
          description: node.description || '',
          active: node.active
        };
      } catch (error) {
        console.error('Error cargando nodo:', error);
        this.errorMessage = 'Error al cargar los datos del nodo.';
      } finally {
        this.loading = false;
      }
    },
    
    async submitForm() {
      // Validación básica
      if (!this.node.name) {
        this.errorMessage = 'El nombre del nodo es obligatorio.';
        return;
      }
      
      this.loading = true;
      this.errorMessage = '';
      
      try {
        if (this.isEdit) {
          // Actualizar nodo existente
          await NetworkService.updateNode(this.$route.params.id, this.node);
          this.$router.push(`/nodes/${this.$route.params.id}`);
        } else {
          // Crear nuevo nodo
          const response = await NetworkService.createNode(this.node);
          console.log('Respuesta al crear nodo:', response.data);
          
          // Verificar la estructura de la respuesta
          if (response.data && response.data.node && response.data.node.id) {
          // Si la respuesta es { message: "...", node: {...} }
          this.$router.push('/network');
          } else if (response.data && response.data.id) {
            // Si la respuesta es directamente el objeto del nodo
            this.$router.push('/network');
          } else {
            // Si no podemos determinar el ID, simplemente volvemos a la vista de red
            this.$router.push('/network');
          }
        }
      } catch (error) {
        console.error('Error guardando nodo:', error);
        this.errorMessage = 'Error al guardar el nodo. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    
    cancel() {
      if (this.isEdit) {
        this.$router.push(`/nodes/${this.$route.params.id}`);
      } else {
        this.$router.push('/network');
      }
    }
  }
};
</script>

<style scoped>
.node-form {
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