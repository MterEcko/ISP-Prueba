<template>
  <div class="role-permissions">
    <h2>Permisos del Rol: {{ role.name }}</h2>
    
    <div v-if="loading" class="loading">
      Cargando permisos...
    </div>
    
    <div v-else>
      <div class="info-section">
        <div class="info-item">
          <span class="label">Descripción:</span>
          <span>{{ role.description }}</span>
        </div>
        <div class="info-item">
          <span class="label">Categoría:</span>
          <span>{{ role.category }}</span>
        </div>
        <div class="info-item">
          <span class="label">Nivel:</span>
          <span>{{ role.level }}</span>
        </div>
      </div>
      
      <div class="permissions-container">
        <div class="module-section" v-for="(modulePermissions, module) in groupedPermissions" :key="module">
          <h3>{{ formatModuleName(module) }}</h3>
          
          <table class="permissions-table">
            <tbody>
              <tr v-for="permission in modulePermissions" :key="permission.id" class="permission-row">
                <td class="checkbox-cell">
                  <input 
                    type="checkbox" 
                    :id="'permission-' + permission.id"
                    v-model="selectedPermissions"
                    :value="permission.id"
                    :disabled="role.name === 'admin'"
                  />
                </td>
                <td class="permission-info-cell">
                  <label :for="'permission-' + permission.id" class="permission-label">
                    <div class="permission-info">
                      <span class="permission-name">{{ formatPermissionName(permission.name) }}</span>
                      <span class="permission-description">{{ permission.description }}</span>
                    </div>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="goBack" class="cancel-button">Volver</button>
        <button 
          type="button" 
          @click="savePermissions" 
          class="save-button"
          :disabled="role.name === 'admin' || saving"
        >
          {{ saving ? 'Guardando...' : 'Guardar Permisos' }}
        </button>
      </div>
    </div>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
  </div>
</template>

<script>
import RoleService from '../services/role.service';

export default {
  name: 'RolePermissions',
  data() {
    return {
      role: {},
      permissions: [],
      selectedPermissions: [],
      loading: true,
      saving: false,
      errorMessage: '',
      successMessage: ''
    };
  },
  computed: {
    groupedPermissions() {
      const grouped = {};
      
      this.permissions.forEach(permission => {
        if (!grouped[permission.module]) {
          grouped[permission.module] = [];
        }
        grouped[permission.module].push(permission);
      });
      
      return grouped;
    }
  },
  created() {
    this.loadRoleAndPermissions();
  },
  methods: {
    async loadRoleAndPermissions() {
      this.loading = true;
      const roleId = this.$route.params.id;
      
      try {
        // Cargar información del rol
        const roleResponse = await RoleService.getRole(roleId);
        this.role = roleResponse.data;
        
        // Cargar todos los permisos disponibles
        const permissionsResponse = await RoleService.getAllPermissions();
        this.permissions = permissionsResponse.data;
        
        // Cargar permisos asignados al rol
        const rolePermissionsResponse = await RoleService.getRolePermissions(roleId);
        
        // Marcar los permisos que ya están asignados
        this.selectedPermissions = rolePermissionsResponse.data.map(permission => permission.id);
        
      } catch (error) {
        console.error('Error cargando datos:', error);
        this.errorMessage = 'Error cargando datos. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    formatModuleName(module) {
      // Convertir snake_case a palabras con espacios y primera letra mayúscula
      const words = module.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      );
      return words.join(' ');
    },
    formatPermissionName(name) {
      // Convertir nombres como "manage_clients" a "Gestionar Clientes"
      const words = name.split('_').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
      });
      
      // Traducir verbos comunes
      const verbTranslations = {
        'Manage': 'Gestionar',
        'View': 'Ver',
        'Create': 'Crear',
        'Edit': 'Editar',
        'Delete': 'Eliminar'
      };
      
      if (words.length > 0 && verbTranslations[words[0]]) {
        words[0] = verbTranslations[words[0]];
      }
      
      return words.join(' ');
    },
    async savePermissions() {
      if (this.role.name === 'admin') {
        return; // El rol admin siempre tiene todos los permisos
      }
      
      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      try {
        await RoleService.updateRolePermissions(this.role.id, this.selectedPermissions);
        this.successMessage = 'Permisos guardados exitosamente';
        
        // Recargar permisos después de guardar
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        
      } catch (error) {
        console.error('Error guardando permisos:', error);
        this.errorMessage = 'Error guardando permisos. Por favor, intente nuevamente.';
      } finally {
        this.saving = false;
      }
    },
    goBack() {
      this.$router.push('/roles');
    }
  }
};
</script>

<style scoped>
.role-permissions {
  padding: 20px;
  max-width: 95%;
  margin: 0 auto;
}

h2 {
  margin-bottom: 24px;
  color: #333;
  font-size: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.info-section {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid #ddd;
}

.info-item {
  margin-bottom: 10px;
}

.label {
  font-weight: bold;
  margin-right: 10px;
  color: #555;
}

.permissions-container {
  margin-bottom: 30px;
}

.module-section {
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
}

.module-section h3 {
  background-color: #f5f5f5;
  margin: 0;
  padding: 15px;
  border-bottom: 1px solid #ddd;
  font-size: 16px;
  font-weight: 600;
}

.permissions-table {
  width: 100%;
  border-collapse: collapse;
}

.permission-row {
  border-bottom: 1px solid #eee;
}

.permission-row:last-child {
  border-bottom: none;
}

.checkbox-cell {
  width: 40px;
  padding: 12px 5px 12px 15px;
  text-align: center;
  vertical-align: top;
}

.permission-info-cell {
  padding: 12px 15px 12px 0;
  vertical-align: middle;
}

.permission-label {
  cursor: pointer;
  display: block;
}

.permission-info {
  display: flex;
  flex-direction: column;
}

.permission-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.permission-description {
  font-size: 0.9em;
  color: #666;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-button {
  padding: 8px 16px;
  background-color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.save-button {
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.form-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #f44336;
  margin-top: 16px;
  text-align: center;
  padding: 10px;
  background-color: #ffebee;
  border-radius: 4px;
}

.success-message {
  color: #4CAF50;
  margin-top: 16px;
  text-align: center;
  padding: 10px;
  background-color: #e8f5e9;
  border-radius: 4px;
}

input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style>