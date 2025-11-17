<template>
  <div class="client-portal-profile">
    <div class="header">
      <h1>Mi Perfil</h1>
      <button @click="goBack" class="btn-back">← Volver</button>
    </div>

    <div v-if="loading" class="loading">
      <p>Cargando perfil...</p>
    </div>

    <div v-else-if="profile" class="profile-container">
      <!-- Información personal -->
      <div class="profile-section">
        <div class="section-header">
          <h2>Información Personal</h2>
          <button
            v-if="!editingPersonal"
            @click="editingPersonal = true"
            class="btn-edit"
          >
            ✏️ Editar
          </button>
        </div>

        <div v-if="!editingPersonal" class="info-display">
          <div class="info-row">
            <span class="icon">👤</span>
            <div class="info-content">
              <span class="label">Nombre Completo</span>
              <span class="value">{{ profile.name }}</span>
            </div>
          </div>

          <div class="info-row">
            <span class="icon">📧</span>
            <div class="info-content">
              <span class="label">Correo Electrónico</span>
              <span class="value">{{ profile.email }}</span>
            </div>
          </div>

          <div class="info-row">
            <span class="icon">📱</span>
            <div class="info-content">
              <span class="label">Teléfono</span>
              <span class="value">{{ profile.phone || 'No especificado' }}</span>
            </div>
          </div>

          <div class="info-row">
            <span class="icon">📍</span>
            <div class="info-content">
              <span class="label">Dirección</span>
              <span class="value">{{ profile.address || 'No especificado' }}</span>
            </div>
          </div>
        </div>

        <div v-else class="info-edit">
          <form @submit.prevent="savePersonalInfo">
            <div class="form-group">
              <label>Nombre Completo *</label>
              <input
                type="text"
                v-model="editForm.name"
                required
              />
            </div>

            <div class="form-group">
              <label>Correo Electrónico *</label>
              <input
                type="email"
                v-model="editForm.email"
                required
              />
            </div>

            <div class="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                v-model="editForm.phone"
                placeholder="10 dígitos"
              />
            </div>

            <div class="form-group">
              <label>Dirección</label>
              <textarea
                v-model="editForm.address"
                rows="3"
                placeholder="Calle, número, colonia, ciudad..."
              ></textarea>
            </div>

            <div class="form-actions">
              <button type="button" @click="cancelEdit" class="btn-cancel">
                Cancelar
              </button>
              <button type="submit" class="btn-save">
                💾 Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Información de cuenta -->
      <div class="profile-section">
        <div class="section-header">
          <h2>Información de Cuenta</h2>
        </div>

        <div class="info-display">
          <div class="info-row">
            <span class="icon">🆔</span>
            <div class="info-content">
              <span class="label">ID de Cliente</span>
              <span class="value">{{ profile.clientId }}</span>
            </div>
          </div>

          <div class="info-row">
            <span class="icon">📅</span>
            <div class="info-content">
              <span class="label">Fecha de Registro</span>
              <span class="value">{{ formatDate(profile.createdAt) }}</span>
            </div>
          </div>

          <div class="info-row">
            <span class="icon">📦</span>
            <div class="info-content">
              <span class="label">Plan Actual</span>
              <span class="value">{{ profile.subscriptionPlan || 'Sin plan activo' }}</span>
            </div>
          </div>

          <div class="info-row">
            <span class="icon">✅</span>
            <div class="info-content">
              <span class="label">Estado de Cuenta</span>
              <span class="value" :class="'status-' + profile.status">
                {{ getStatusText(profile.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Cambiar contraseña -->
      <div class="profile-section">
        <div class="section-header">
          <h2>Seguridad</h2>
          <button
            v-if="!editingPassword"
            @click="editingPassword = true"
            class="btn-edit"
          >
            🔒 Cambiar Contraseña
          </button>
        </div>

        <div v-if="editingPassword" class="info-edit">
          <form @submit.prevent="changePassword">
            <div class="form-group">
              <label>Contraseña Actual *</label>
              <input
                type="password"
                v-model="passwordForm.currentPassword"
                required
              />
            </div>

            <div class="form-group">
              <label>Nueva Contraseña *</label>
              <input
                type="password"
                v-model="passwordForm.newPassword"
                required
                minlength="6"
              />
              <small>Mínimo 6 caracteres</small>
            </div>

            <div class="form-group">
              <label>Confirmar Nueva Contraseña *</label>
              <input
                type="password"
                v-model="passwordForm.confirmPassword"
                required
                minlength="6"
              />
            </div>

            <div class="form-actions">
              <button type="button" @click="cancelPasswordEdit" class="btn-cancel">
                Cancelar
              </button>
              <button type="submit" class="btn-save">
                🔒 Cambiar Contraseña
              </button>
            </div>
          </form>
        </div>

        <div v-else class="password-info">
          <p>• Última actualización: {{ formatDate(profile.passwordUpdatedAt || profile.updatedAt) }}</p>
          <p>• Mantén tu contraseña segura y cámbiala regularmente</p>
        </div>
      </div>

      <!-- Preferencias de notificaciones -->
      <div class="profile-section">
        <div class="section-header">
          <h2>Preferencias de Notificaciones</h2>
        </div>

        <div class="preferences">
          <div class="preference-item">
            <div class="preference-info">
              <span class="icon">📧</span>
              <div class="preference-text">
                <strong>Notificaciones por Email</strong>
                <small>Recibir actualizaciones y alertas por correo</small>
              </div>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                v-model="preferences.emailNotifications"
                @change="savePreferences"
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="preference-item">
            <div class="preference-info">
              <span class="icon">📱</span>
              <div class="preference-text">
                <strong>Notificaciones SMS</strong>
                <small>Alertas importantes por mensaje de texto</small>
              </div>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                v-model="preferences.smsNotifications"
                @change="savePreferences"
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="preference-item">
            <div class="preference-info">
              <span class="icon">💰</span>
              <div class="preference-text">
                <strong>Recordatorios de Pago</strong>
                <small>Recibir recordatorios antes del vencimiento</small>
              </div>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                v-model="preferences.paymentReminders"
                @change="savePreferences"
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="preference-item">
            <div class="preference-info">
              <span class="icon">📊</span>
              <div class="preference-text">
                <strong>Resumen Mensual</strong>
                <small>Recibir reporte de consumo mensual</small>
              </div>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                v-model="preferences.monthlySummary"
                @change="savePreferences"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="error">
      <p>Error al cargar el perfil</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '../../services/frontend_apiConfig';

export default {
  name: 'ClientPortalProfile',
  data() {
    return {
      loading: false,
      profile: null,
      editingPersonal: false,
      editingPassword: false,
      editForm: {
        name: '',
        email: '',
        phone: '',
        address: ''
      },
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        paymentReminders: true,
        monthlySummary: true
      }
    };
  },
  mounted() {
    this.loadProfile();
  },
  methods: {
    async loadProfile() {
      this.loading = true;
      try {
        // Obtener perfil del usuario actual
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        this.profile = {
          ...user,
          clientId: user.id,
          subscriptionPlan: 'Plan Premium 100 Mbps', // TODO: Obtener del backend
          status: 'active',
          passwordUpdatedAt: null
        };

        // Copiar al formulario de edición
        this.editForm = {
          name: this.profile.name || '',
          email: this.profile.email || '',
          phone: this.profile.phone || '',
          address: this.profile.address || ''
        };

        // TODO: Cargar preferencias reales del backend
        // Por ahora usar valores por defecto
      } catch (error) {
        console.error('Error al cargar perfil:', error);
        this.$toast?.error('Error al cargar el perfil');
      } finally {
        this.loading = false;
      }
    },
    async savePersonalInfo() {
      try {
        await axios.put(
          `${API_URL}client-portal/profile`,
          this.editForm,
          {
            headers: {
              'x-access-token': localStorage.getItem('token')
            }
          }
        );

        // Actualizar perfil local
        this.profile = { ...this.profile, ...this.editForm };

        // Actualizar localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...user, ...this.editForm }));

        this.$toast?.success('Perfil actualizado exitosamente');
        this.editingPersonal = false;
      } catch (error) {
        console.error('Error al actualizar perfil:', error);
        this.$toast?.error('Error al actualizar el perfil');
      }
    },
    cancelEdit() {
      this.editForm = {
        name: this.profile.name || '',
        email: this.profile.email || '',
        phone: this.profile.phone || '',
        address: this.profile.address || ''
      };
      this.editingPersonal = false;
    },
    async changePassword() {
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        this.$toast?.error('Las contraseñas no coinciden');
        return;
      }

      try {
        await axios.put(
          `${API_URL}client-portal/change-password`,
          {
            currentPassword: this.passwordForm.currentPassword,
            newPassword: this.passwordForm.newPassword
          },
          {
            headers: {
              'x-access-token': localStorage.getItem('token')
            }
          }
        );

        this.$toast?.success('Contraseña cambiada exitosamente');
        this.cancelPasswordEdit();
      } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        this.$toast?.error(error.response?.data?.message || 'Error al cambiar la contraseña');
      }
    },
    cancelPasswordEdit() {
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
      this.editingPassword = false;
    },
    async savePreferences() {
      try {
        // TODO: Implementar guardado de preferencias en el backend
        this.$toast?.success('Preferencias actualizadas');
      } catch (error) {
        console.error('Error al guardar preferencias:', error);
        this.$toast?.error('Error al guardar las preferencias');
      }
    },
    getStatusText(status) {
      const statusMap = {
        active: 'Activo',
        suspended: 'Suspendido',
        pending: 'Pendiente',
        cancelled: 'Cancelado'
      };
      return statusMap[status] || status;
    },
    formatDate(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    goBack() {
      this.$router.push('/client-portal/dashboard');
    }
  }
};
</script>

<style scoped>
.client-portal-profile {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 28px;
  color: #2c3e50;
}

.btn-back {
  padding: 10px 20px;
  background: #ecf0f1;
  color: #2c3e50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-back:hover {
  background: #bdc3c7;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.profile-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-section {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #ecf0f1;
}

.section-header h2 {
  font-size: 20px;
  color: #2c3e50;
  margin: 0;
}

.btn-edit {
  padding: 8px 15px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-edit:hover {
  background: #2980b9;
}

.info-display {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.info-row .icon {
  font-size: 24px;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.info-content .label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-content .value {
  font-size: 16px;
  color: #2c3e50;
  font-weight: 500;
}

.info-content .value.status-active {
  color: #27ae60;
}

.info-content .value.status-suspended {
  color: #e74c3c;
}

.info-content .value.status-pending {
  color: #f39c12;
}

.info-edit {
  padding-top: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
}

.form-group small {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-cancel {
  padding: 10px 20px;
  background: #ecf0f1;
  color: #2c3e50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel:hover {
  background: #bdc3c7;
}

.btn-save {
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-save:hover {
  background: #229954;
}

.password-info {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.password-info p {
  margin: 8px 0;
  color: #666;
  font-size: 14px;
}

.preferences {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.preference-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.preference-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.preference-info .icon {
  font-size: 24px;
}

.preference-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preference-text strong {
  color: #2c3e50;
  font-size: 14px;
}

.preference-text small {
  color: #666;
  font-size: 12px;
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #27ae60;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.error {
  text-align: center;
  padding: 40px;
  color: #e74c3c;
}
</style>
