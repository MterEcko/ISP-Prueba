<template>
  <div class="role-form">
    <h2>{{ isEdit ? 'Editar Rol' : 'Nuevo Rol' }}</h2>
    
    <form @submit.prevent="submitForm">
      <div class="form-section">
        <div class="form-group">
          <label for="name">Nombre del Rol *</label>
          <input 
            type="text"
            id="name"
            v-model="role.name"
            required
            :disabled="role.name === 'admin' && isEdit"
          />
        </div>
        
        <div class="form-group">
          <label for="description">Descripción *</label>
          <input 
            type="text"
            id="description"
            v-model="role.description"
            required
          />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="level">Nivel *</label>
            <input 
              type="number"
              id="level"
              v-model="role.level"
              min="1"
              max="10"
              required
            />
            <small>Nivel de acceso (1-10). Mayor número = más privilegios</small>
          </div>
          
          <div class="form-group">
            <label for="category">Categoría *</label>
            <select 
              id="category"
              v-model="role.category"
              required
            >
              <option value="">Seleccionar Categoría</option>
              <option value="admin">Administración</option>
              <option value="tecnico">Técnico</option>
              <option value="ventas">Ventas</option>
              <option value="soporte">Soporte</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="cancel">Cancelar</button>
        <button type="submit" class="save">Guardar</button>
      </div>
    </form>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import RoleService from '../services/role.service';

export default {
  name: 'RoleForm',
  data() {
    return {
      role: {
        name: '',
        description: '',
        level: 1,
        category: ''
      },
      isEdit: false,
      loading: false,
      errorMessage: ''
    };
  },
  created() {
    const roleId = this.$route.params.id;
    if (roleId && roleId !== 'new') {
      this.isEdit = true;
      this.loadRole(roleId);
    }
  },
  methods: {
    async loadRole(id) {
      this.loading = true;
      try {
        const response = await RoleService.getRole(id);
        this.role = response.data;
      } catch (error) {
        console.error('Error cargando rol:', error);
        this.errorMessage = 'Error cargando datos del rol. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    async submitForm() {
      this.loading = true;
      this.errorMessage = '';
      
      try {
        if (this.isEdit) {
          await RoleService.updateRole(this.role.id, this.role);
        } else {
          await RoleService.createRole(this.role);
        }
        
        // Redirigir a la lista de roles
        this.$router.push('/roles');
      } catch (error) {
        console.error('Error guardando rol:', error);
        this.errorMessage = 'Error guardando datos del rol. Por favor, verifique los campos e intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    cancel() {
      this.$router.push('/roles');
    }
  }
};
</script>

<style scoped>
.role-form {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.form-section {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

input, select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

small {
  display: block;
  margin-top: 4px;
  color: #666;
  font-size: 0.8em;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.form-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.form-actions button:first-child {
  background-color: #e0e0e0;
}

.form-actions button.save {
  background-color: #4CAF50;
  color: white;
}

.error-message {
  color: #f44336;
  margin-top: 16px;
  text-align: center;
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>