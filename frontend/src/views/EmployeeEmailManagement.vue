<template>
  <div class="email-management">
    <div class="page-header">
      <h1>📧 Gestión de Correos Corporativos</h1>
      <button @click="showCreateModal = true" class="btn-primary">+ Crear Cuenta de Correo</button>
    </div>

    <!-- Estadísticas -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📬</div>
        <div class="stat-info">
          <h3>{{ emails.length }}</h3>
          <p>Cuentas Totales</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <h3>{{ activeEmails }}</h3>
          <p>Cuentas Activas</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💾</div>
        <div class="stat-info">
          <h3>{{ totalUsageGB }} GB</h3>
          <p>Almacenamiento Usado</p>
        </div>
      </div>
    </div>

    <!-- Tabla de correos -->
    <div class="emails-table">
      <table>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Correo Electrónico</th>
            <th>Empleado</th>
            <th>Almacenamiento</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="email in emails" :key="email.id">
            <td>{{ email.emailUsername }}</td>
            <td>
              <span class="email-address">{{ email.emailAddress }}</span>
            </td>
            <td>{{ email.user?.fullName || 'N/A' }}</td>
            <td>
              <div class="storage-bar">
                <div class="storage-usage" :style="{ width: getStoragePercentage(email) + '%' }"></div>
              </div>
              <span class="storage-text">{{ email.usedMB }}MB / {{ email.quotaMB }}MB</span>
            </td>
            <td>
              <span :class="['badge', email.active ? 'badge-success' : 'badge-danger']">
                {{ email.active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="actions">
              <button @click="openWebmail(email)" class="btn-icon" title="Abrir Webmail">
                📧
              </button>
              <button @click="editEmail(email)" class="btn-icon" title="Editar">
                ✏️
              </button>
              <button @click="deleteEmail(email)" class="btn-icon btn-danger" title="Eliminar">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Crear/Editar -->
    <div v-if="showCreateModal" class="modal" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingEmail ? 'Editar' : 'Crear' }} Cuenta de Correo</h2>
          <button @click="showCreateModal = false" class="btn-close">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Empleado *</label>
            <select v-model="formData.userId" required :disabled="editingEmail">
              <option value="">Seleccionar empleado...</option>
              <option v-for="user in availableUsers" :key="user.id" :value="user.id">
                {{ user.fullName }} ({{ user.username }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Nombre de usuario del correo *</label>
            <input
              v-model="formData.emailUsername"
              type="text"
              placeholder="juan.perez"
              :disabled="editingEmail"
              @input="updateEmailPreview"
            />
            <small>Solo letras, números, puntos y guiones. Ejemplo: juan.perez</small>
          </div>

          <div class="email-preview">
            <strong>Correo final:</strong>
            <span>{{ formData.emailUsername || 'usuario' }}@{{ domain }}</span>
          </div>

          <div class="form-group">
            <label>Contraseña {{ editingEmail ? '(dejar vacío para mantener actual)' : '*' }}</label>
            <div class="password-input">
              <input
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                :required="!editingEmail"
                :placeholder="editingEmail ? 'Nueva contraseña (opcional)' : 'Contraseña segura'"
              />
              <button @click="showPassword = !showPassword" type="button" class="btn-toggle-password">
                {{ showPassword ? '👁️' : '🔒' }}
              </button>
              <button @click="generatePassword" type="button" class="btn-generate">
                🎲 Generar
              </button>
            </div>
            <small v-if="formData.password">Fuerza: <span :class="passwordStrengthClass">{{ passwordStrength }}</span></small>
          </div>

          <div class="form-group">
            <label>Cuota de almacenamiento (MB)</label>
            <input
              v-model.number="formData.quotaMB"
              type="number"
              min="100"
              step="100"
            />
            <small>{{ (formData.quotaMB / 1024).toFixed(2) }} GB</small>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" v-model="formData.active" />
              Cuenta activa
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showCreateModal = false" class="btn-secondary">Cancelar</button>
          <button @click="saveEmail" class="btn-primary" :disabled="saving">
            {{ saving ? 'Guardando...' : (editingEmail ? 'Actualizar' : 'Crear Cuenta') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '@/services/frontend_apiConfig';

export default {
  name: 'EmployeeEmailManagement',
  data() {
    return {
      emails: [],
      availableUsers: [],
      showCreateModal: false,
      editingEmail: null,
      saving: false,
      showPassword: false,
      domain: 'serviciosqbit.net',
      formData: {
        userId: '',
        emailUsername: '',
        password: '',
        quotaMB: 1024,
        active: true
      }
    };
  },

  computed: {
    activeEmails() {
      return this.emails.filter(e => e.active).length;
    },

    totalUsageGB() {
      const totalMB = this.emails.reduce((sum, e) => sum + (e.usedMB || 0), 0);
      return (totalMB / 1024).toFixed(2);
    },

    passwordStrength() {
      const pwd = this.formData.password;
      if (!pwd) return '';
      if (pwd.length < 8) return 'Débil';
      if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) {
        return 'Muy Fuerte';
      }
      if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
        return 'Fuerte';
      }
      return 'Media';
    },

    passwordStrengthClass() {
      const strength = this.passwordStrength;
      if (strength === 'Muy Fuerte') return 'strength-excellent';
      if (strength === 'Fuerte') return 'strength-good';
      if (strength === 'Media') return 'strength-medium';
      return 'strength-weak';
    }
  },

  async mounted() {
    await this.loadEmails();
    await this.loadUsers();
    await this.loadDomain();
  },

  methods: {
    async loadEmails() {
      try {
        const response = await axios.get(`${API_URL}employee-emails`);
        this.emails = response.data.emails || [];
      } catch (error) {
        console.error('Error cargando correos:', error);
        alert('Error cargando las cuentas de correo');
      }
    },

    async loadUsers() {
      try {
        const response = await axios.get(`${API_URL}users`);
        // Filtrar solo usuarios que no tienen correo asignado
        const usersWithEmail = this.emails.map(e => e.userId);
        this.availableUsers = response.data.filter(u => !usersWithEmail.includes(u.id));
      } catch (error) {
        console.error('Error cargando usuarios:', error);
      }
    },

    async loadDomain() {
      try {
        const response = await axios.get(`${API_URL}settings`);
        const mailDomain = response.data.find(s => s.configKey === 'mail_domain');
        if (mailDomain) {
          this.domain = mailDomain.configValue;
        }
      } catch (error) {
        console.error('Error cargando dominio:', error);
      }
    },

    updateEmailPreview() {
      // Auto-formatear usuario (quitar espacios, convertir a minúsculas, etc.)
      this.formData.emailUsername = this.formData.emailUsername
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.-]/g, '');
    },

    generatePassword() {
      const length = 16;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      this.formData.password = password;
      this.showPassword = true;
    },

    getStoragePercentage(email) {
      if (!email.quotaMB) return 0;
      return Math.min((email.usedMB / email.quotaMB) * 100, 100);
    },

    async openWebmail(email) {
      try {
        const response = await axios.get(`${API_URL}employee-emails/${email.id}/webmail`);
        // Abrir en nueva pestaña
        window.open(response.data.ssoUrl || response.data.webmailUrl, '_blank');
      } catch (error) {
        console.error('Error abriendo webmail:', error);
        // Fallback: abrir URL genérica
        if (email.webmailUrl) {
          window.open(email.webmailUrl, '_blank');
        } else {
          alert('No se pudo abrir el webmail');
        }
      }
    },

    editEmail(email) {
      this.editingEmail = email;
      this.formData = {
        userId: email.userId,
        emailUsername: email.emailUsername,
        password: '',
        quotaMB: email.quotaMB,
        active: email.active
      };
      this.showCreateModal = true;
    },

    async saveEmail() {
      try {
        this.saving = true;

        if (this.editingEmail) {
          // Actualizar
          await axios.put(`${API_URL}employee-emails/${this.editingEmail.id}`, this.formData);
          alert('Cuenta actualizada exitosamente');
        } else {
          // Crear nueva
          const response = await axios.post(`${API_URL}employee-emails`, this.formData);
          alert(`Cuenta creada exitosamente\nCorreo: ${response.data.email.emailAddress}\nContraseña temporal: ${response.data.temporaryPassword}\n\n⚠️ Guarda esta contraseña, no se mostrará de nuevo.`);
        }

        this.showCreateModal = false;
        this.resetForm();
        await this.loadEmails();
        await this.loadUsers();

      } catch (error) {
        console.error('Error guardando correo:', error);
        alert(error.response?.data?.message || 'Error guardando la cuenta de correo');
      } finally {
        this.saving = false;
      }
    },

    async deleteEmail(email) {
      if (!confirm(`¿Eliminar la cuenta ${email.emailAddress}?\n\nEsto eliminará permanentemente el correo del servidor.`)) {
        return;
      }

      try {
        await axios.delete(`${API_URL}employee-emails/${email.id}`);
        alert('Cuenta eliminada exitosamente');
        await this.loadEmails();
        await this.loadUsers();
      } catch (error) {
        console.error('Error eliminando correo:', error);
        alert('Error eliminando la cuenta de correo');
      }
    },

    resetForm() {
      this.editingEmail = null;
      this.formData = {
        userId: '',
        emailUsername: '',
        password: '',
        quotaMB: 1024,
        active: true
      };
      this.showPassword = false;
    }
  }
};
</script>

<style scoped>
.email-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0;
  color: #333;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  font-size: 32px;
}

.stat-info h3 {
  margin: 0 0 5px 0;
  font-size: 24px;
  color: #333;
}

.stat-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.emails-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.email-address {
  font-family: monospace;
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.storage-bar {
  width: 100px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.storage-usage {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #FF9800);
  transition: width 0.3s;
}

.storage-text {
  font-size: 12px;
  color: #666;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background: #d4edda;
  color: #155724;
}

.badge-danger {
  background: #f8d7da;
  color: #721c24;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  transition: transform 0.2s;
}

.btn-icon:hover {
  transform: scale(1.2);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="number"],
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group small {
  display: block;
  margin-top: 4px;
  color: #666;
  font-size: 12px;
}

.email-preview {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  text-align: center;
}

.email-preview span {
  font-family: monospace;
  font-size: 16px;
  color: #2196F3;
  font-weight: bold;
}

.password-input {
  display: flex;
  gap: 8px;
}

.password-input input {
  flex: 1;
}

.btn-toggle-password,
.btn-generate {
  padding: 10px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-toggle-password:hover,
.btn-generate:hover {
  background: #f5f5f5;
}

.strength-excellent { color: #4CAF50; font-weight: bold; }
.strength-good { color: #2196F3; font-weight: bold; }
.strength-medium { color: #FF9800; }
.strength-weak { color: #f44336; }

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-primary:hover {
  background: #1976D2;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background: #d0d0d0;
}
</style>
