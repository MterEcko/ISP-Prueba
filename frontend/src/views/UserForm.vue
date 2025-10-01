<template>
  <div class="user-form">
    <h2>{{ isEdit ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
    
    <form @submit.prevent="submitForm">
      <div class="form-section">
        <h3>Información de Cuenta</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="username">Nombre de Usuario *</label>
            <input 
              type="text"
              id="username"
              v-model="user.username"
              required
              :disabled="isEdit"
            />
          </div>
          
          <div class="form-group">
            <label for="email">Email *</label>
            <input 
              type="email"
              id="email"
              v-model="user.email"
              required
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="password">Contraseña {{ isEdit ? '' : '*' }}</label>
            <input 
              type="password"
              id="password"
              v-model="user.password"
              :required="!isEdit"
            />
            <small v-if="isEdit">Dejar en blanco para mantener la contraseña actual</small>
          </div>
          
          <div class="form-group">
            <label for="confirmPassword">Confirmar Contraseña {{ isEdit ? '' : '*' }}</label>
            <input 
              type="password"
              id="confirmPassword"
              v-model="confirmPassword"
              :required="!isEdit"
            />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Información Personal</h3>
        
        <div class="form-group">
          <label for="fullName">Nombre Completo *</label>
          <input 
            type="text"
            id="fullName"
            v-model="user.fullName"
            required
          />
        </div>
      </div>
      
      <div class="form-section">
        <h3>Rol y Permisos</h3>
        
        <div class="form-group">
          <label for="roleId">Rol *</label>
          <select 
            id="roleId"
            v-model="user.roleId"
            required
          >
            <option value="">Seleccionar Rol</option>
            <option v-for="role in roles" :key="role.id" :value="role.id">
              {{ role.name }} - {{ role.description }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Estado</label>
          <div class="toggle-switch">
            <input 
              type="checkbox"
              id="active"
              v-model="user.active"
            />
            <label for="active">{{ user.active ? 'Activo' : 'Inactivo' }}</label>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="cancel">Cancelar</button>
        <button type="submit" class="save" :disabled="!isFormValid">Guardar</button>
      </div>
    </form>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import UserService from '../services/user.service';
import RoleService from '../services/role.service';

export default {
  name: 'UserForm',
  data() {
    return {
      user: {
        username: '',
        email: '',
        password: '',
        fullName: '',
        roleId: '',
        active: true
      },
      confirmPassword: '',
      roles: [],
      isEdit: false,
      loading: false,
      errorMessage: ''
    };
  },
  computed: {
    isFormValid() {
      // Validar que las contraseñas coincidan
      if (this.user.password !== this.confirmPassword) {
        return false;
      }
      
      // En modo edición, si no se proporciona contraseña, no validar
      if (this.isEdit && !this.user.password) {
        return true;
      }
      
      return true;
    }
  },
  created() {
    this.loadRoles();
    
    const userId = this.$route.params.id;
    if (userId && userId !== 'new') {
      this.isEdit = true;
      this.loadUser(userId);
    }
  },
  methods: {
    async loadRoles() {
      try {
        const response = await RoleService.getAllRoles();
        this.roles = response.data;
      } catch (error) {
        console.error('Error cargando roles:', error);
        this.errorMessage = 'Error cargando roles. Por favor, intente nuevamente.';
      }
    },
    async loadUser(id) {
      this.loading = true;
      try {
        const response = await UserService.getUser(id);
        
        // No incluir la contraseña en el objeto de usuario al editar
        const user = response.data;
        user.password = '';
        
        this.user = user;
        this.confirmPassword = '';
      } catch (error) {
        console.error('Error cargando usuario:', error);
        this.errorMessage = 'Error cargando datos del usuario. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    async submitForm() {
      if (!this.isFormValid) {
        this.errorMessage = 'Por favor, corrija los errores del formulario.';
        return;
      }
      
      // Validar que las contraseñas coincidan
      if (this.user.password && this.user.password !== this.confirmPassword) {
        this.errorMessage = 'Las contraseñas no coinciden.';
        return;
      }
      
      this.loading = true;
      this.errorMessage = '';
      
      try {
        // Si es edición y no se proporciona contraseña, eliminarla del objeto antes de enviar
        const userData = { ...this.user };
        if (this.isEdit && !userData.password) {
          delete userData.password;
        }
        
        if (this.isEdit) {
          await UserService.updateUser(this.user.id, userData);
        } else {
          await UserService.createUser(userData);
        }
        
        // Redirigir a la lista de usuarios
        this.$router.push('/users');
      } catch (error) {
        console.error('Error guardando usuario:', error);
        this.errorMessage = 'Error guardando datos del usuario. Por favor, verifique los campos e intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    cancel() {
      this.$router.push('/users');
    }
  }
};
</script>

<style scoped>
.user-form {
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

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #555;
  font-size: 1.2em;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
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

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.toggle-switch input:checked + label {
  background-color: #4CAF50;
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

.form-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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