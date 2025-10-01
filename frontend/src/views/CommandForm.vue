<template>
  <div class="command-form">
    <div class="page-header">
      <h1>{{ isEdit ? 'Editar Comando' : 'Nuevo Comando Común' }}</h1>
      <button @click="goBack" class="btn-secondary">
        ← Volver
      </button>
    </div>

    <form @submit.prevent="saveCommand" class="form-container">
      <!-- Información Básica -->
      <div class="form-section">
        <h3>Información Básica</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="name">Nombre del Comando *</label>
            <input 
              type="text"
              id="name"
              v-model="command.name"
              required
              placeholder="ej: restart, get_device_info, backup_config"
              pattern="[a-z_]+"
              @input="validateName"
            />
            <span class="field-help">Solo letras minúsculas y guiones bajos. Ej: get_device_info</span>
            <span v-if="nameError" class="field-error">{{ nameError }}</span>
          </div>
          
          <div class="form-group">
            <label for="displayName">Nombre para Mostrar *</label>
            <input 
              type="text"
              id="displayName"
              v-model="command.displayName"
              required
              placeholder="ej: Reiniciar Dispositivo, Información del Sistema"
            />
            <span class="field-help">Nombre legible para mostrar en la interfaz</span>
          </div>
        </div>

        <div class="form-group full-width">
          <label for="description">Descripción *</label>
          <textarea 
            id="description"
            v-model="command.description"
            required
            rows="3"
            placeholder="Descripción detallada de lo que hace este comando..."
          ></textarea>
        </div>
      </div>

      <!-- Categorización -->
      <div class="form-section">
        <h3>Categorización</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="category">Categoría *</label>
            <select 
              id="category"
              v-model="command.category"
              required
            >
              <option value="">Seleccionar categoría</option>
              <option 
                v-for="cat in availableCategories" 
                :key="cat.value" 
                :value="cat.value"
              >
                {{ cat.label }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="permissionLevel">Nivel de Permiso *</label>
            <select 
              id="permissionLevel"
              v-model="command.permissionLevel"
              required
            >
              <option value="">Seleccionar nivel</option>
              <option 
                v-for="level in availablePermissionLevels" 
                :key="level.value" 
                :value="level.value"
              >
                {{ level.label }}
              </option>
            </select>
            <span class="field-help">Nivel mínimo de usuario requerido para ejecutar este comando</span>
          </div>
        </div>
      </div>

      <!-- Configuración de Seguridad -->
      <div class="form-section">
        <h3>Configuración de Seguridad</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox"
                v-model="command.requiresConfirmation"
              />
              <span class="checkmark"></span>
              Requiere Confirmación
            </label>
            <span class="field-help">El usuario debe confirmar antes de ejecutar</span>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox"
                v-model="command.affectsService"
              />
              <span class="checkmark"></span>
              Afecta el Servicio
            </label>
            <span class="field-help">Marca si el comando puede interrumpir el servicio</span>
          </div>
        </div>
      </div>

      <!-- Estado -->
      <div class="form-section">
        <h3>Estado del Comando</h3>
        
        <div class="form-group">
          <label class="toggle-label">
            <input 
              type="checkbox"
              v-model="command.active"
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">{{ command.active ? 'Activo' : 'Inactivo' }}</span>
          </label>
          <span class="field-help">Los comandos inactivos no aparecerán en las listas de comandos disponibles</span>
        </div>
      </div>

      <!-- Implementaciones Existentes (solo en modo edición) -->
      <div v-if="isEdit && implementations.length > 0" class="form-section">
        <h3>Implementaciones Existentes</h3>
        
        <div class="implementations-list">
          <div 
            v-for="impl in implementations" 
            :key="impl.id"
            class="implementation-item"
          >
            <div class="impl-info">
              <div class="impl-brand">
                <span :class="['brand-tag', impl.DeviceBrand?.name?.toLowerCase()]">
                  {{ impl.DeviceBrand?.displayName || impl.DeviceBrand?.name }}
                </span>
                <span v-if="impl.DeviceFamily" class="family-tag">
                  {{ impl.DeviceFamily?.displayName || impl.DeviceFamily?.name }}
                </span>
              </div>
              
              <div class="impl-details">
                <span class="connection-type">{{ getConnectionTypeDisplayName(impl.connectionType) }}</span>
                <span :class="['status-badge', impl.active ? 'active' : 'inactive']">
                  {{ impl.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
            
            <div class="impl-actions">
              <router-link 
                :to="`/command-implementations/${impl.id}/edit`"
                class="btn-small btn-secondary"
              >
                Editar
              </router-link>
            </div>
          </div>
        </div>
        
        <div class="add-implementation">
          <router-link 
            :to="`/command-implementations/new?commandId=${command.id}`"
            class="btn-primary"
          >
            + Agregar Nueva Implementación
          </router-link>
        </div>
      </div>

      <!-- Botones de Acción -->
      <div class="form-actions">
        <button type="button" @click="goBack" class="btn-secondary">
          Cancelar
        </button>
        <button 
          type="submit" 
          class="btn-primary" 
          :disabled="saving || !isFormValid"
        >
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }} Comando
        </button>
      </div>
    </form>

    <!-- Mensaje de Error -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <!-- Mensaje de Éxito -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
  </div>
</template>

<script>
import CommandService from '../services/command.service';

export default {
  name: 'CommandForm',
  data() {
    return {
      command: {
        name: '',
        displayName: '',
        description: '',
        category: '',
        permissionLevel: null,
        requiresConfirmation: false,
        affectsService: false,
        active: true
      },
      implementations: [],
      isEdit: false,
      saving: false,
      loading: false,
      errorMessage: '',
      successMessage: '',
      nameError: ''
    };
  },
  computed: {
    availableCategories() {
      return CommandService.getAvailableCategories();
    },
    availablePermissionLevels() {
      return CommandService.getAvailablePermissionLevels();
    },
    isFormValid() {
      return this.command.name && 
             this.command.displayName && 
             this.command.description && 
             this.command.category && 
             this.command.permissionLevel !== null &&
             !this.nameError;
    }
  },
  created() {
    const commandId = this.$route.params.id;
    if (commandId && commandId !== 'new') {
      this.isEdit = true;
      this.loadCommand(commandId);
    }
  },
  methods: {
    async loadCommand(id) {
      this.loading = true;
      try {
        const response = await CommandService.getCommand(id);
        this.command = response.data.command || response.data;
        
        // Cargar implementaciones si es modo edición
        if (this.isEdit) {
          const implResponse = await CommandService.getCommandImplementations(id);
          this.implementations = implResponse.data.implementations || implResponse.data || [];
        }
      } catch (error) {
        console.error('Error cargando comando:', error);
        this.errorMessage = 'Error al cargar los datos del comando';
      } finally {
        this.loading = false;
      }
    },

    validateName() {
      if (!this.command.name) {
        this.nameError = '';
        return;
      }

      // Validar formato: solo letras minúsculas, números y guiones bajos
      const namePattern = /^[a-z][a-z0-9_]*$/;
      if (!namePattern.test(this.command.name)) {
        this.nameError = 'Solo se permiten letras minúsculas, números y guiones bajos. Debe empezar con letra.';
        return;
      }

      // Validar longitud
      if (this.command.name.length < 3) {
        this.nameError = 'El nombre debe tener al menos 3 caracteres';
        return;
      }

      if (this.command.name.length > 50) {
        this.nameError = 'El nombre no puede exceder 50 caracteres';
        return;
      }

      this.nameError = '';
    },

    async saveCommand() {
      // Validar datos antes de enviar
      const validationErrors = CommandService.validateCommandData(this.command);
      if (validationErrors.length > 0) {
        this.errorMessage = validationErrors.join(', ');
        return;
      }

      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        if (this.isEdit) {
          await CommandService.updateCommand(this.command.id, this.command);
          this.successMessage = 'Comando actualizado correctamente';
        } else {
          const response = await CommandService.createCommand(this.command);
          this.successMessage = 'Comando creado correctamente';
          
          // Si se creó exitosamente, redirigir a edición para agregar implementaciones
          if (response.data.id || response.data.command?.id) {
            const commandId = response.data.id || response.data.command.id;
            setTimeout(() => {
              this.$router.push(`/commands/${commandId}/edit`);
            }, 1500);
            return;
          }
        }

        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);

      } catch (error) {
        console.error('Error guardando comando:', error);
        this.errorMessage = error.response?.data?.message || 'Error al guardar el comando';
      } finally {
        this.saving = false;
      }
    },

    getConnectionTypeDisplayName(type) {
      return CommandService.getConnectionTypeDisplayName(type);
    },

    goBack() {
      this.$router.push('/commands');
    }
  }
};
</script>

<style scoped>
.command-form {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: #2c3e50;
  margin: 0;
}

.form-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.form-section {
  padding: 25px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  color: #34495e;
  margin: 0 0 20px 0;
  font-size: 1.2em;
  font-weight: 600;
  border-bottom: 2px solid #3498db;
  padding-bottom: 8px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  flex: 1;
}

.full-width {
  width: 100%;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 500;
  font-size: 14px;
}

input, select, textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: #fafafa;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #3498db;
  background: white;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.field-help {
  display: block;
  color: #7f8c8d;
  font-size: 12px;
  margin-top: 5px;
  font-style: italic;
}

.field-error {
  display: block;
  color: #e74c3c;
  font-size: 12px;
  margin-top: 5px;
  font-weight: 500;
}

/* Checkbox personalizado */
.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 10px;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin-right: 12px;
  transform: scale(1.2);
}

.checkmark {
  margin-left: 8px;
}

/* Toggle Switch */
.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.toggle-label input[type="checkbox"] {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 50px;
  height: 24px;
  background: #ccc;
  border-radius: 12px;
  transition: background 0.3s;
  margin-right: 12px;
}

.toggle-slider:before {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
}

.toggle-label input:checked + .toggle-slider {
  background: #3498db;
}

.toggle-label input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.toggle-text {
  font-weight: 500;
  color: #2c3e50;
}

/* Implementaciones */
.implementations-list {
  space-y: 15px;
}

.implementation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #3498db;
  margin-bottom: 15px;
}

.impl-info {
  flex: 1;
}

.impl-brand {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}

.brand-tag {
  background: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.brand-tag.mikrotik { background: #e74c3c; }
.brand-tag.ubiquiti { background: #2ecc71; }
.brand-tag.tplink { background: #f39c12; }

.family-tag {
  background: #95a5a6;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.impl-details {
  display: flex;
  gap: 15px;
  align-items: center;
}

.connection-type {
  color: #7f8c8d;
  font-size: 13px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.active {
  background: #d5f4e6;
  color: #27ae60;
}

.status-badge.inactive {
  background: #fadbd8;
  color: #e74c3c;
}

.add-implementation {
  text-align: center;
  padding: 20px;
  border: 2px dashed #bdc3c7;
  border-radius: 8px;
  margin-top: 20px;
}

/* Botones */
.btn-primary, .btn-secondary, .btn-small {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 25px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

/* Mensajes */
.error-message, .success-message {
  margin-top: 20px;
  padding: 15px;
  border-radius: 6px;
  font-weight: 500;
}

.error-message {
  background: #fadbd8;
  color: #c0392b;
  border: 1px solid #f1948a;
}

.success-message {
  background: #d5f4e6;
  color: #27ae60;
  border: 1px solid #82e5aa;
}

/* Responsive */
@media (max-width: 768px) {
  .command-form {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .implementation-item {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
}
</style>