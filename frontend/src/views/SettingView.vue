<template>
  <div class="settings-page">
    <h1 class="page-title">Configuración del Sistema</h1>
    
    <div class="tabs">
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'general' }"
        @click="activeTab = 'general'"
      >
        General
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'user' }"
        @click="activeTab = 'user'"
      >
        Usuario
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'security' }"
        @click="activeTab = 'security'"
      >
        Seguridad
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'notifications' }"
        @click="activeTab = 'notifications'"
      >
        Notificaciones
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'network' }"
        @click="activeTab = 'network'"
      >
        Red
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'integrations' }"
        @click="activeTab = 'integrations'"
      >
        Integraciones
      </button>
    </div>
    
    <div class="tab-content">
      <!-- Configuración General -->
      <div v-if="activeTab === 'general'" class="tab-pane">
        <div class="card">
          <h2>Configuración General</h2>
          
          <form @submit.prevent="saveGeneralSettings">
            <div class="form-group">
              <label for="companyName">Nombre de la Empresa</label>
              <input 
                type="text" 
                id="companyName" 
                v-model="generalSettings.companyName" 
                placeholder="Nombre de su empresa"
              />
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="language">Idioma por Defecto</label>
                <select id="language" v-model="generalSettings.language">
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="timezone">Zona Horaria</label>
                <select id="timezone" v-model="generalSettings.timezone">
                  <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                  <option value="America/Monterrey">Monterrey (GMT-6)</option>
                  <option value="America/Tijuana">Tijuana (GMT-7)</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="dateFormat">Formato de Fecha</label>
              <select id="dateFormat" v-model="generalSettings.dateFormat">
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="logo">Logo de la Empresa</label>
              <div class="file-upload">
                <input type="file" id="logo" @change="handleLogoUpload" />
                <div v-if="generalSettings.logoUrl" class="current-logo">
                  <img :src="generalSettings.logoUrl" alt="Logo de la empresa" />
                  <button type="button" class="btn-text" @click="removeLogo">Eliminar</button>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="theme">Tema</label>
              <div class="theme-selector">
                <div 
                  class="theme-option" 
                  :class="{ active: generalSettings.theme === 'light' }"
                  @click="generalSettings.theme = 'light'"
                >
                  <div class="theme-preview light-theme"></div>
                  <span>Claro</span>
                </div>
                <div 
                  class="theme-option" 
                  :class="{ active: generalSettings.theme === 'dark' }"
                  @click="generalSettings.theme = 'dark'"
                >
                  <div class="theme-preview dark-theme"></div>
                  <span>Oscuro</span>
                </div>
                <div 
                  class="theme-option" 
                  :class="{ active: generalSettings.theme === 'auto' }"
                  @click="generalSettings.theme = 'auto'"
                >
                  <div class="theme-preview auto-theme"></div>
                  <span>Auto</span>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- Configuración de Usuario -->
      <div v-if="activeTab === 'user'" class="tab-pane">
        <div class="card">
          <h2>Perfil de Usuario</h2>
          
          <form @submit.prevent="saveUserProfile">
            <div class="form-row">
              <div class="form-group">
                <label for="fullName">Nombre Completo</label>
                <input 
                  type="text" 
                  id="fullName" 
                  v-model="userProfile.fullName" 
                  placeholder="Su nombre completo"
                />
              </div>
              
              <div class="form-group">
                <label for="email">Correo Electrónico</label>
                <input 
                  type="email" 
                  id="email" 
                  v-model="userProfile.email" 
                  placeholder="Su correo electrónico"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label for="avatar">Foto de Perfil</label>
              <div class="avatar-upload">
                <div class="current-avatar">
                  <div class="avatar-circle" v-if="!userProfile.avatarUrl">
                    {{ getUserInitials() }}
                  </div>
                  <img v-else :src="userProfile.avatarUrl" alt="Avatar" />
                </div>
                <input type="file" id="avatar" @change="handleAvatarUpload" />
                <button type="button" class="btn" @click="triggerAvatarUpload">
                  Cambiar Foto
                </button>
                <button 
                  type="button" 
                  class="btn-text" 
                  @click="removeAvatar" 
                  v-if="userProfile.avatarUrl"
                >
                  Eliminar
                </button>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- Configuración de Seguridad -->
      <div v-if="activeTab === 'security'" class="tab-pane">
        <div class="card">
          <h2>Cambiar Contraseña</h2>
          
          <form @submit.prevent="changePassword">
            <div class="form-group">
              <label for="currentPassword">Contraseña Actual</label>
              <input 
                type="password" 
                id="currentPassword" 
                v-model="passwordChange.currentPassword" 
                required
              />
            </div>
            
            <div class="form-group">
              <label for="newPassword">Nueva Contraseña</label>
              <input 
                type="password" 
                id="newPassword" 
                v-model="passwordChange.newPassword" 
                required
              />
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirmar Nueva Contraseña</label>
              <input 
                type="password" 
                id="confirmPassword" 
                v-model="passwordChange.confirmPassword" 
                required
              />
            </div>
            
            <div class="password-strength" v-if="passwordChange.newPassword">
              <div class="strength-label">Seguridad de la contraseña:</div>
              <div class="strength-meter">
                <div 
                  class="strength-value" 
                  :style="{ width: passwordStrength.percent + '%' }"
                  :class="passwordStrength.class"
                ></div>
              </div>
              <div class="strength-text" :class="passwordStrength.class">
                {{ passwordStrength.text }}
              </div>
            </div>
            
            <div v-if="passwordError" class="error-message">
              {{ passwordError }}
            </div>
            
            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="saving || !canChangePassword"
              >
                {{ saving ? 'Cambiando...' : 'Cambiar Contraseña' }}
              </button>
            </div>
          </form>
        </div>
        
        <div class="card mt-4">
          <h2>Autenticación de Dos Factores</h2>
          
          <div class="two-factor-status">
            <p>
              Estado actual: 
              <span :class="twoFactor.enabled ? 'status-success' : 'status-danger'">
                {{ twoFactor.enabled ? 'Activado' : 'Desactivado' }}
              </span>
            </p>
          </div>
          
          <div v-if="!twoFactor.enabled" class="two-factor-setup">
            <button class="btn btn-primary" @click="setupTwoFactor">
              Activar Autenticación de Dos Factores
            </button>
          </div>
          
          <div v-else class="two-factor-actions">
            <button class="btn btn-danger" @click="disableTwoFactor">
              Desactivar Autenticación de Dos Factores
            </button>
          </div>
        </div>
      </div>
      
      <!-- Configuración de Notificaciones -->
      <div v-if="activeTab === 'notifications'" class="tab-pane">
        <div class="card">
          <h2>Preferencias de Notificaciones</h2>
          
          <form @submit.prevent="saveNotificationSettings">
            <div class="notification-group">
              <h3>Notificaciones por Correo Electrónico</h3>
              
              <div class="form-check">
                <input 
                  type="checkbox" 
                  id="emailNewTicket" 
                  v-model="notificationSettings.email.newTicket"
                />
                <label for="emailNewTicket">Nuevo ticket creado</label>
              </div>
              
              <div class="form-check">
                <input 
                  type="checkbox" 
                  id="emailTicketUpdate" 
                  v-model="notificationSettings.email.ticketUpdate"
                />
                <label for="emailTicketUpdate">Actualización en tickets asignados</label>
              </div>
              
              <div class="form-check">
                <input 
                  type="checkbox" 
                  id="emailTicketComment" 
                  v-model="notificationSettings.email.ticketComment"
                />
                <label for="emailTicketComment">Nuevos comentarios en tickets</label>
              </div>
              
              <div class="form-check">
                <input 
                  type="checkbox" 
                  id="emailDeviceStatus" 
                  v-model="notificationSettings.email.deviceStatus"
                />
                <label for="emailDeviceStatus">Cambios de estado en dispositivos</label>
              </div>
            </div>
            
            <div class="notification-group">
              <h3>Notificaciones dentro de la Aplicación</h3>
              
              <div class="form-check">
                <input 
                  type="checkbox" 
                  id="appNewTicket" 
                  v-model="notificationSettings.app.newTicket"
                />
                <label for="appNewTicket">Nuevo ticket creado</label>
              </div>
              
              <div class="form-check">
                <input 
                  type="checkbox" 
                  id="appTicketUpdate" 
                  v-model="notificationSettings.app.ticketUpdate"
                />
                <label for="appTicketUpdate">Actualización en tickets asignados</label>
              </div>
              
              <div class="form-check">
                <input 
                  type="checkbox" 
                  id="appTicketComment" 
                  v-model="notificationSettings.app.ticketComment"
                />
                <label for="appTicketComment">Nuevos comentarios en tickets</label>
              </div>
              
              <div class="form-check">
                <input 
                  type="checkbox" 
                  id="appDeviceStatus" 
                  v-model="notificationSettings.app.deviceStatus"
                />
                <label for="appDeviceStatus">Cambios de estado en dispositivos</label>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- Configuración de Red -->
      <div v-if="activeTab === 'network'" class="tab-pane">
        <div class="card">
          <h2>Configuración de APIs de Red</h2>
          
          <form @submit.prevent="saveNetworkSettings">
            <div class="setting-group">
              <h3>Mikrotik RouterOS API</h3>
              
              <div class="form-group">
                <label for="mikrotikDefaultUser">Usuario por Defecto</label>
                <input 
                  type="text" 
                  id="mikrotikDefaultUser" 
                  v-model="networkSettings.mikrotik.defaultUser"
                  placeholder="admin"
                />
              </div>
              
              <div class="form-group">
                <label for="mikrotikDefaultPort">Puerto por Defecto</label>
                <input 
                  type="number" 
                  id="mikrotikDefaultPort" 
                  v-model="networkSettings.mikrotik.defaultPort"
                  placeholder="8728"
                />
              </div>
              
              <div class="form-group">
                <label for="mikrotikTimeout">Tiempo de Espera (ms)</label>
                <input 
                  type="number" 
                  id="mikrotikTimeout" 
                  v-model="networkSettings.mikrotik.timeout"
                  placeholder="5000"
                />
              </div>
            </div>
            
            <div class="setting-group">
              <h3>Ubiquiti UNMS/UISP API</h3>
              
              <div class="form-group">
                <label for="ubiquitiDefaultUser">Usuario por Defecto</label>
                <input 
                  type="text" 
                  id="ubiquitiDefaultUser" 
                  v-model="networkSettings.ubiquiti.defaultUser"
                  placeholder="admin"
                />
              </div>
              
              <div class="form-group">
                <label for="ubiquitiApiUrl">URL de API (si utiliza UNMS/UISP)</label>
                <input 
                  type="text" 
                  id="ubiquitiApiUrl" 
                  v-model="networkSettings.ubiquiti.apiUrl"
                  placeholder="https://unms.sudominio.com/api/v2.1"
                />
              </div>
              
              <div class="form-group">
                <label for="ubiquitiTimeout">Tiempo de Espera (ms)</label>
                <input 
                  type="number" 
                  id="ubiquitiTimeout" 
                  v-model="networkSettings.ubiquiti.timeout"
                  placeholder="5000"
                />
              </div>
            </div>
            
            <div class="setting-group">
              <h3>Configuración de Monitoreo</h3>
              
              <div class="form-group">
                <label for="monitoringInterval">Intervalo de Monitoreo (min)</label>
                <input 
                  type="number" 
                  id="monitoringInterval" 
                  v-model="networkSettings.monitoring.interval"
                  placeholder="5"
                />
              </div>
              
              <div class="form-group">
                <label for="retentionDays">Retención de Datos de Monitoreo (días)</label>
                <input 
                  type="number" 
                  id="retentionDays" 
                  v-model="networkSettings.monitoring.retentionDays"
                  placeholder="30"
                />
              </div>
              
              <div class="form-check">
                <input 
                  type="checkbox" 
                  id="monitoringEnabled" 
                  v-model="networkSettings.monitoring.enabled"
                />
                <label for="monitoringEnabled">Habilitar Monitoreo Automático</label>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- Configuración de Integraciones -->
      <div v-if="activeTab === 'integrations'" class="tab-pane">
        <div class="card">
          <h2>Integración con Jellyfin</h2>
          
          <form @submit.prevent="saveJellyfinSettings">
            <div class="form-group">
              <label for="jellyfinUrl">URL del Servidor Jellyfin</label>
              <input 
                type="text" 
                id="jellyfinUrl" 
                v-model="integrationSettings.jellyfin.url"
                placeholder="http://servidor:8096"
              />
            </div>
            
            <div class="form-group">
              <label for="jellyfinApiKey">API Key de Jellyfin</label>
              <input 
                type="text" 
                id="jellyfinApiKey" 
                v-model="integrationSettings.jellyfin.apiKey"
                placeholder="Tu API Key de Jellyfin"
              />
            </div>
            
            <div class="form-group">
              <label for="jellyfinDefaultProfile">Perfil por Defecto</label>
              <input 
                type="text" 
                id="jellyfinDefaultProfile" 
                v-model="integrationSettings.jellyfin.defaultProfile"
                placeholder="ID del perfil por defecto"
              />
            </div>
            
            <div class="test-connection-result" v-if="jellyfinConnection">
              <div class="connection-status" :class="jellyfinConnection.success ? 'success' : 'error'">
                {{ jellyfinConnection.message }}
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn" @click="testJellyfinConnection" :disabled="saving">
                Probar Conexión
              </button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
        
        <div class="card mt-4">
          <h2>Configuración de Comunicaciones</h2>
          
          <form @submit.prevent="saveCommunicationSettings">
            <div class="setting-group">
              <h3>Servidor SMTP</h3>
              
              <div class="form-group">
                <label for="smtpHost">Servidor SMTP</label>
                <input 
                  type="text" 
                  id="smtpHost" 
                  v-model="integrationSettings.smtp.host"
                  placeholder="smtp.example.com"
                />
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="smtpPort">Puerto</label>
                  <input 
                    type="number" 
                    id="smtpPort" 
                    v-model="integrationSettings.smtp.port"
                    placeholder="587"
                  />
                </div>
                
                <div class="form-group">
                  <label for="smtpSecurity">Seguridad</label>
                  <select id="smtpSecurity" v-model="integrationSettings.smtp.security">
                    <option value="none">Ninguna</option>
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                  </select>
                </div>
              </div>
              
              <div class="form-group">
                <label for="smtpUser">Usuario</label>
                <input 
                  type="text" 
                  id="smtpUser" 
                  v-model="integrationSettings.smtp.user"
                  placeholder="usuario@example.com"
                />
              </div>
              
              <div class="form-group">
                <label for="smtpPassword">Contraseña</label>
                <input 
                  type="password" 
                  id="smtpPassword" 
                  v-model="integrationSettings.smtp.password"
                  placeholder="••••••••"
                />
              </div>
              
              <div class="form-group">
                <label for="smtpFrom">Desde (From)</label>
                <input 
                  type="text" 
                  id="smtpFrom" 
                  v-model="integrationSettings.smtp.from"
                  placeholder="Soporte ISP <soporte@tuisp.com>"
                />
              </div>
            </div>
            
            <div class="setting-group">
              <h3>Telegram Bot</h3>
              
              <div class="form-group">
                <label for="telegramToken">Token del Bot</label>
                <input 
                  type="text" 
                  id="telegramToken" 
                  v-model="integrationSettings.telegram.token"
                  placeholder="123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                />
              </div>
              
              <div class="form-check">
                <input 
                  type="checkbox" 
                  id="telegramEnabled" 
                  v-model="integrationSettings.telegram.enabled"
                />
                <label for="telegramEnabled">Habilitar Bot de Telegram</label>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn" @click="testSmtpConnection" :disabled="saving">
                Probar SMTP
              </button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import UserService from '../services/user.service';
import SettingsService from '../services/settings.service';

export default {
  name: 'Settings',
  data() {
    return {
      activeTab: 'general',
      saving: false,
      generalSettings: {
        companyName: 'Mi ISP',
        language: 'es',
        timezone: 'America/Mexico_City',
        dateFormat: 'DD/MM/YYYY',
        logoUrl: null,
        theme: 'light'
      },
      userProfile: {
        fullName: '',
        email: '',
        avatarUrl: null
      },
      passwordChange: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      passwordError: null,
      twoFactor: {
        enabled: false
      },
      notificationSettings: {
        email: {
          newTicket: true,
          ticketUpdate: true,
          ticketComment: false,
          deviceStatus: false
        },
        app: {
          newTicket: true,
          ticketUpdate: true,
          ticketComment: true,
          deviceStatus: true
        }
      },
      networkSettings: {
        mikrotik: {
          defaultUser: 'admin',
          defaultPort: 8728,
          timeout: 5000
        },
        ubiquiti: {
          defaultUser: 'admin',
          apiUrl: '',
          timeout: 5000
        },
        monitoring: {
          interval: 5,
          retentionDays: 30,
          enabled: true
        }
      },
      integrationSettings: {
        jellyfin: {
          url: 'http://localhost:8096',
          apiKey: '',
          defaultProfile: ''
        },
        smtp: {
          host: '',
          port: 587,
          security: 'tls',
          user: '',
          password: '',
          from: ''
        },
        telegram: {
          token: '',
          enabled: false
        }
      },
      jellyfinConnection: null,
      smtpConnection: null
    };
  },
  computed: {
    passwordStrength() {
      if (!this.passwordChange.newPassword) {
        return {
          percent: 0,
          class: '',
          text: ''
        };
      }
      
      const password = this.passwordChange.newPassword;
      let strength = 0;
      let text = '';
      let cssClass = '';
      
      // Longitud mínima
      if (password.length >= 8) strength += 25;
      
      // Mayúsculas y minúsculas
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
      
      // Números
      if (/\d/.test(password)) strength += 25;
      
      // Caracteres especiales
      if (/[^a-zA-Z0-9]/.test(password)) strength += 25;
      
      if (strength <= 25) {
        text = 'Débil';
        cssClass = 'strength-weak';
      } else if (strength <= 50) {
        text = 'Regular';
        cssClass = 'strength-medium';
      } else if (strength <= 75) {
        text = 'Buena';
        cssClass = 'strength-good';
      } else {
        text = 'Fuerte';
        cssClass = 'strength-strong';
      }
      
      return {
        percent: strength,
        text,
        class: cssClass
      };
    },
    canChangePassword() {
      return (
        this.passwordChange.currentPassword && 
        this.passwordChange.newPassword && 
        this.passwordChange.confirmPassword &&
        this.passwordChange.newPassword === this.passwordChange.confirmPassword &&
        this.passwordStrength.percent >= 50
      );
    }
  },
  created() {
    this.loadSettings();
    this.loadUserProfile();
  },
  methods: {
	async loadSettings() {
		try {
			// Usar el servicio de configuración para cargar datos
			const response = await SettingsService.mockGetSettings(); // En producción: getGeneralSettings(), etc.
			const settings = response.data;

			// Aplicar configuraciones cargadas
			if (settings.general) {
				this.generalSettings = settings.general;
			}
			
			if (settings.network) {
				this.networkSettings = settings.network;
			}
			
			if (settings.integrations) {
				this.integrationSettings = settings.integrations;
			}
			
			if (settings.notifications) {
				this.notificationSettings = settings.notifications;
			}
			
			console.log('Settings loaded successfully');
		} catch (error) {
			console.error('Error loading settings:', error);
			this.$toast?.error('Error al cargar la configuración');
		}
	},
    
    async loadUserProfile() {
      try {
        // En una app real, cargarías el perfil desde la API
        const currentUser = this.$store.state.auth.user;
        if (currentUser) {
          this.userProfile.fullName = currentUser.fullName;
          this.userProfile.email = currentUser.email;
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    },
    
	async saveGeneralSettings() {
		this.saving = true;
		try {
			// En producción: await SettingsService.saveGeneralSettings(this.generalSettings);
			await SettingsService.mockSaveSettings();
			
			this.$toast?.success('Configuración general guardada correctamente');
		} catch (error) {
			console.error('Error saving general settings:', error);
			this.$toast?.error('Error al guardar la configuración');
		} finally {
			this.saving = false;
		}
	},
    
    async saveUserProfile() {
      this.saving = true;
      try {
        // En una app real, guardarías en la API
        console.log('Saving user profile:', this.userProfile);
        
        // Simular un retraso para mostrar el estado de guardado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Aquí iría la llamada a la API para guardar
        
        this.$toast.success('Perfil actualizado correctamente');
      } catch (error) {
        console.error('Error saving user profile:', error);
        this.$toast.error('Error al actualizar el perfil');
      } finally {
        this.saving = false;
      }
    },
    
    async changePassword() {
      if (!this.canChangePassword) {
        return;
      }
      
      if (this.passwordChange.newPassword !== this.passwordChange.confirmPassword) {
        this.passwordError = 'Las contraseñas no coinciden';
        return;
      }
      
      this.saving = true;
      this.passwordError = null;
      
      try {
        // En una app real, cambiarías la contraseña a través de la API
        console.log('Changing password');
        
        // Simular un retraso para mostrar el estado de guardado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Aquí iría la llamada a la API para cambiar la contraseña
		// Aquí iría la llamada a la API para cambiar la contraseña
        
        // Limpiar el formulario después de un cambio exitoso
        this.passwordChange = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        
        this.$toast.success('Contraseña cambiada correctamente');
      } catch (error) {
        console.error('Error changing password:', error);
        this.passwordError = 'Error al cambiar la contraseña. Verifique su contraseña actual.';
        this.$toast.error('Error al cambiar la contraseña');
      } finally {
        this.saving = false;
      }
    },
    
    async setupTwoFactor() {
      try {
        // En una app real, activarías 2FA a través de la API
        console.log('Setting up 2FA...');
        
        // Simular configuración de 2FA
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Aquí se mostraría un flujo de configuración con código QR para escanear
        // Por ahora, simplemente activamos el estado
        this.twoFactor.enabled = true;
        
        this.$toast.success('Autenticación de dos factores activada correctamente');
      } catch (error) {
        console.error('Error setting up 2FA:', error);
        this.$toast.error('Error al configurar la autenticación de dos factores');
      }
    },
    
    async disableTwoFactor() {
      try {
        // En una app real, desactivarías 2FA a través de la API
        console.log('Disabling 2FA...');
        
        // Simular desactivación de 2FA
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.twoFactor.enabled = false;
        
        this.$toast.success('Autenticación de dos factores desactivada correctamente');
      } catch (error) {
        console.error('Error disabling 2FA:', error);
        this.$toast.error('Error al desactivar la autenticación de dos factores');
      }
    },
    
    async saveNotificationSettings() {
      this.saving = true;
      try {
        // En una app real, guardarías en la API
        console.log('Saving notification settings:', this.notificationSettings);
        
        // Simular un retraso para mostrar el estado de guardado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Aquí iría la llamada a la API para guardar
        
        this.$toast.success('Preferencias de notificaciones guardadas correctamente');
      } catch (error) {
        console.error('Error saving notification settings:', error);
        this.$toast.error('Error al guardar las preferencias de notificaciones');
      } finally {
        this.saving = false;
      }
    },
    
    async saveNetworkSettings() {
      this.saving = true;
      try {
        // En una app real, guardarías en la API
        console.log('Saving network settings:', this.networkSettings);
        
        // Simular un retraso para mostrar el estado de guardado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Aquí iría la llamada a la API para guardar
        
        this.$toast.success('Configuración de red guardada correctamente');
      } catch (error) {
        console.error('Error saving network settings:', error);
        this.$toast.error('Error al guardar la configuración de red');
      } finally {
        this.saving = false;
      }
    },
    
    async saveJellyfinSettings() {
      this.saving = true;
      try {
        // En una app real, guardarías en la API
        console.log('Saving Jellyfin settings:', this.integrationSettings.jellyfin);
        
        // Simular un retraso para mostrar el estado de guardado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Aquí iría la llamada a la API para guardar
        
        this.$toast.success('Configuración de Jellyfin guardada correctamente');
      } catch (error) {
        console.error('Error saving Jellyfin settings:', error);
        this.$toast.error('Error al guardar la configuración de Jellyfin');
      } finally {
        this.saving = false;
      }
    },
    
    async saveCommunicationSettings() {
      this.saving = true;
      try {
        // En una app real, guardarías en la API
        console.log('Saving communication settings:', {
          smtp: this.integrationSettings.smtp,
          telegram: this.integrationSettings.telegram
        });
        
        // Simular un retraso para mostrar el estado de guardado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Aquí iría la llamada a la API para guardar
        
        this.$toast.success('Configuración de comunicaciones guardada correctamente');
      } catch (error) {
        console.error('Error saving communication settings:', error);
        this.$toast.error('Error al guardar la configuración de comunicaciones');
      } finally {
        this.saving = false;
      }
    },
    
	async testJellyfinConnection() {
		try {
			// En producción: const response = await SettingsService.testJellyfinConnection(this.integrationSettings.jellyfin);
			const response = await SettingsService.mockTestConnection(Math.random() > 0.3);
			
			this.jellyfinConnection = {
				success: response.data.success,
				message: response.data.message
			};
		} catch (error) {
			console.error('Error testing Jellyfin connection:', error);
			this.jellyfinConnection = {
				success: false,
				message: 'Error de conexión. Verifique URL y API Key.'
			};
		}
	},
    
    async testSmtpConnection() {
      try {
        // En una app real, probarías la conexión a través de la API
        console.log('Testing SMTP connection...');
        
        // Simular prueba de conexión
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulamos éxito o fracaso aleatoriamente
        const success = Math.random() > 0.3;
        this.smtpConnection = {
          success,
          message: success 
            ? 'Conexión SMTP exitosa. Correo de prueba enviado.' 
            : 'Error de conexión SMTP. Verifique las credenciales.'
        };
        
        this.$toast[success ? 'success' : 'error'](this.smtpConnection.message);
      } catch (error) {
        console.error('Error testing SMTP connection:', error);
        this.smtpConnection = {
          success: false,
          message: 'Error de conexión SMTP. Verifique las credenciales.'
        };
        this.$toast.error(this.smtpConnection.message);
      }
    },
    
    handleLogoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // En una app real, subirías este archivo a un servidor
      // Aquí simularemos que ya se ha subido y obtenemos una URL
      const reader = new FileReader();
      reader.onload = e => {
        this.generalSettings.logoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    removeLogo() {
      this.generalSettings.logoUrl = null;
      // También se eliminaría del servidor en una app real
    },
    
    handleAvatarUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      // En una app real, subirías este archivo a un servidor
      // Aquí simularemos que ya se ha subido y obtenemos una URL
      const reader = new FileReader();
      reader.onload = e => {
        this.userProfile.avatarUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    triggerAvatarUpload() {
      document.getElementById('avatar').click();
    },
    
    removeAvatar() {
      this.userProfile.avatarUrl = null;
      // También se eliminaría del servidor en una app real
    },
    
    getUserInitials() {
      if (!this.userProfile.fullName) return '??';
      
      const names = this.userProfile.fullName.split(' ');
      if (names.length > 1) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
  }
};
</script>

<style scoped>
.settings-page {
  max-width: 900px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.page-title {
  margin-bottom: 25px;
}

.tabs {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
}

.tab-button {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.tab-button:hover {
  color: var(--primary-color);
}

.tab-button.active {
  border-bottom-color: var(--primary-color);
  color: var(--primary-color);
  font-weight: 600;
}

.tab-content {
  margin-top: 30px;
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  padding: 25px;
  margin-bottom: 20px;
}

.card h2 {
  font-size: 1.3rem;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.setting-group, .notification-group {
  margin-bottom: 30px;
}

.setting-group h3, .notification-group h3 {
  font-size: 1.1rem;
  margin-bottom: 15px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.form-group {
  margin-bottom: 20px;
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 1rem;
}

.form-check {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.form-check input[type="checkbox"] {
  margin-right: 10px;
  width: auto;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
}

.current-logo {
  margin-top: 10px;
}

.current-logo img {
  max-width: 200px;
  max-height: 60px;
  margin-bottom: 10px;
}

.theme-selector {
  display: flex;
  gap: 20px;
  margin-top: 10px;
}

.theme-option {
  text-align: center;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.3s;
}

.theme-option:hover, .theme-option.active {
  opacity: 1;
}

.theme-preview {
  width: 100px;
  height: 60px;
  border-radius: 6px;
  margin-bottom: 8px;
  border: 2px solid transparent;
}

.theme-option.active .theme-preview {
  border-color: var(--primary-color);
}

.light-theme {
  background-color: #f9f9f9;
  border: 1px solid #eee;
}

.dark-theme {
  background-color: #333;
  border: 1px solid #222;
}

.auto-theme {
  background: linear-gradient(to right, #f9f9f9 50%, #333 50%);
  border: 1px solid #eee;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 20px;
}

.current-avatar {
  width: 100px;
  height: 100px;
  overflow: hidden;
  border-radius: 50%;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-circle {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-color);
  color: white;
  font-size: 2rem;
  font-weight: bold;
}

.current-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-upload input[type="file"] {
  display: none;
}

.btn-text {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  padding: 0;
  font-size: 0.9rem;
}

.btn-text:hover {
  text-decoration: underline;
}

.password-strength {
  margin-top: 10px;
  margin-bottom: 20px;
}

.strength-label {
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.strength-meter {
  height: 6px;
  background-color: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.strength-value {
  height: 100%;
  transition: width 0.3s;
}

.strength-text {
  margin-top: 5px;
  font-size: 0.9rem;
}

.strength-weak {
  background-color: #f44336;
  color: #f44336;
}

.strength-medium {
  background-color: #ff9800;
  color: #ff9800;
}

.strength-good {
  background-color: #4caf50;
  color: #4caf50;
}

.strength-strong {
  background-color: #2e7d32;
  color: #2e7d32;
}

.error-message {
  color: #f44336;
  margin-top: 5px;
  font-size: 0.9rem;
}

.two-factor-status {
  margin-bottom: 20px;
}

.status-success {
  color: var(--success);
  font-weight: 600;
}

.status-danger {
  color: var(--danger);
  font-weight: 600;
}

.test-connection-result {
  margin-top: 15px;
}

.connection-status {
  padding: 10px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.connection-status.success {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.connection-status.error {
  background-color: #ffebee;
  color: #c62828;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .theme-selector {
    flex-direction: column;
    align-items: center;
  }
  
  .avatar-upload {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>