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
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'email' }"
        @click="activeTab = 'email'"
      >
        Email (SMTP)
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'telegram' }"
        @click="activeTab = 'telegram'"
      >
        Telegram
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'whatsapp' }"
        @click="activeTab = 'whatsapp'"
      >
        WhatsApp
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'domain' }"
        @click="activeTab = 'domain'"
      >
        Dominio
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
      <!-- Configuración de Email SMTP -->
<div v-if="activeTab === 'email'" class="tab-pane">
  <div class="card">
    <h2>Configuración de Email (SMTP)</h2>
    
    <form @submit.prevent="saveEmailSettings">
      <div class="form-group">
        <label for="smtpHost">Servidor SMTP</label>
        <input 
          type="text" 
          id="smtpHost" 
          v-model="emailSettings.host"
          placeholder="smtp.gmail.com"
          required
        />
        <small class="form-hint">Ejemplo: smtp.gmail.com, smtp.ionos.mx, smtp.office365.com</small>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="smtpPort">Puerto</label>
          <input 
            type="number" 
            id="smtpPort" 
            v-model="emailSettings.port"
            placeholder="587"
            required
          />
          <small class="form-hint">587 (TLS) o 465 (SSL)</small>
        </div>
        
        <div class="form-group">
          <label>Tipo de Conexión</label>
          <div class="connection-type-display">
            <span class="badge" :class="emailSettings.port == 465 ? 'badge-success' : 'badge-info'">
              {{ emailSettings.port == 465 ? 'SSL (Puerto 465)' : 'TLS (Puerto 587)' }}
            </span>
          </div>
          <small class="form-hint">Se detecta automáticamente según el puerto</small>
        </div>
      </div>
      
      <div class="form-group">
        <label for="smtpUser">Usuario / Email</label>
        <input 
          type="email" 
          id="smtpUser" 
          v-model="emailSettings.user"
          placeholder="usuario@ejemplo.com"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="smtpPassword">Contraseña SMTP</label>
        <input 
          type="password" 
          id="smtpPassword" 
          v-model="emailSettings.password"
          :placeholder="emailSettings.hasPassword ? '••••••••' : 'Ingrese su contraseña'"
        />
        <small class="form-hint">
          {{ emailSettings.hasPassword ? 'Dejar en blanco para mantener la contraseña actual' : 'Para Gmail, use una App Password' }}
        </small>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="emailFromName">Nombre del Remitente</label>
          <input 
            type="text" 
            id="emailFromName" 
            v-model="emailSettings.fromName"
            placeholder="Mi ISP"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="emailFromAddress">Email del Remitente</label>
          <input 
            type="email" 
            id="emailFromAddress" 
            v-model="emailSettings.fromAddress"
            placeholder="noreply@miisp.com"
            required
          />
        </div>
      </div>
      
      <!-- Resultado de prueba -->
      <div v-if="testResults.email" class="test-result" :class="testResults.email.success ? 'success' : 'error'">
        <div class="test-result-icon">
          {{ testResults.email.success ? '✓' : '✗' }}
        </div>
        <div class="test-result-message">
          {{ testResults.email.message }}
        </div>
      </div>
      
      <div class="form-actions">
        <button 
          type="button" 
          class="btn btn-secondary" 
          @click="testEmailConnection" 
          :disabled="saving || !emailSettings.user"
        >
          <span v-if="saving">Probando...</span>
          <span v-else>🧪 Probar Conexión</span>
        </button>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <span v-if="saving">Guardando...</span>
          <span v-else>💾 Guardar Configuración</span>
        </button>
      </div>
    </form>
    
    <!-- Información adicional -->
    <div class="info-box mt-4">
      <h4>📝 Configuraciones Comunes</h4>
      <div class="config-examples">
        <div class="config-example">
          <strong>Gmail:</strong>
          <p>Host: smtp.gmail.com | Puerto: 587 o 465</p>
          <p><small>Requiere App Password (no la contraseña normal)</small></p>
        </div>
        <div class="config-example">
          <strong>Outlook/Hotmail:</strong>
          <p>Host: smtp-mail.outlook.com | Puerto: 587</p>
        </div>
        <div class="config-example">
          <strong>Office 365:</strong>
          <p>Host: smtp.office365.com | Puerto: 587</p>
        </div>
        <div class="config-example">
          <strong>Ionos:</strong>
          <p>Host: smtp.ionos.mx | Puerto: 465 o 587</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Configuración de Telegram -->
<div v-if="activeTab === 'telegram'" class="tab-pane">
  <div class="card">
    <h2>Configuración de Telegram Bot</h2>
    
    <div class="telegram-status">
      <div class="status-badge" :class="telegramSettings.enabled ? 'status-active' : 'status-inactive'">
        {{ telegramSettings.enabled ? '✓ Activo' : '○ Inactivo' }}
      </div>
    </div>
    
    <form @submit.prevent="saveTelegramSettings">
      <div class="form-check mb-4">
        <input 
          type="checkbox" 
          id="telegramEnabled" 
          v-model="telegramSettings.enabled"
        />
        <label for="telegramEnabled">
          <strong>Habilitar notificaciones por Telegram</strong>
        </label>
      </div>
      
      <div class="form-group">
        <label for="telegramToken">Token del Bot</label>
        <input 
          type="text" 
          id="telegramToken" 
          v-model="telegramSettings.botToken"
          :placeholder="telegramSettings.hasToken ? '••••••••••••••••••••' : '123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'"
          :disabled="!telegramSettings.enabled"
        />
        <small class="form-hint">
          {{ telegramSettings.hasToken ? 'Dejar en blanco para mantener el token actual' : 'Obtenga el token de @BotFather en Telegram' }}
        </small>
      </div>
      
      <div class="form-group">
        <label for="telegramChatId">Chat ID / Group ID</label>
        <input 
          type="text" 
          id="telegramChatId" 
          v-model="telegramSettings.chatId"
          placeholder="-1001234567890"
          :disabled="!telegramSettings.enabled"
        />
        <small class="form-hint">ID del chat o grupo donde se enviarán las alertas técnicas</small>
      </div>
      
      <!-- Resultado de prueba -->
      <div v-if="testResults.telegram" class="test-result" :class="testResults.telegram.success ? 'success' : 'error'">
        <div class="test-result-icon">
          {{ testResults.telegram.success ? '✓' : '✗' }}
        </div>
        <div class="test-result-message">
          {{ testResults.telegram.message }}
        </div>
      </div>
      
      <div class="form-actions">
        <button 
          type="button" 
          class="btn btn-secondary" 
          @click="testTelegramConnection" 
          :disabled="saving || !telegramSettings.enabled"
        >
          <span v-if="saving">Probando...</span>
          <span v-else>🧪 Enviar Mensaje de Prueba</span>
        </button>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <span v-if="saving">Guardando...</span>
          <span v-else>💾 Guardar Configuración</span>
        </button>
      </div>
    </form>
    
    <!-- Guía de configuración -->
    <div class="info-box mt-4">
      <h4>📖 Cómo configurar tu Bot de Telegram</h4>
      <ol class="setup-steps">
        <li>
          <strong>Crear el Bot:</strong>
          <p>Busca <code>@BotFather</code> en Telegram y envía <code>/newbot</code></p>
        </li>
        <li>
          <strong>Obtener el Token:</strong>
          <p>Sigue las instrucciones de BotFather. Te dará un token como: <code>123456789:ABC-DEF...</code></p>
        </li>
        <li>
          <strong>Obtener el Chat ID:</strong>
          <p>Opción 1: Agrega el bot a tu grupo y obtén el ID con <code>@userinfobot</code></p>
          <p>Opción 2: Envía un mensaje al bot y visita: <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></p>
        </li>
        <li>
          <strong>Activar y Probar:</strong>
          <p>Guarda la configuración y usa el botón "Enviar Mensaje de Prueba"</p>
        </li>
      </ol>
    </div>
  </div>
</div>

      <!-- Configuración de WhatsApp -->
      <div v-if="activeTab === 'whatsapp'" class="tab-pane">
        <div class="card">
          <h2>Configuracion de WhatsApp</h2>

          <div class="telegram-status">
            <div class="status-badge" :class="whatsappSettings.enabled ? 'status-active' : 'status-inactive'">
              {{ whatsappSettings.enabled ? 'Activo' : 'Inactivo' }}
            </div>
          </div>

          <form @submit.prevent="saveWhatsAppSettings">
            <div class="form-check mb-4">
              <input
                type="checkbox"
                id="whatsappEnabled"
                v-model="whatsappSettings.enabled"
              />
              <label for="whatsappEnabled">
                <strong>Habilitar WhatsApp para chat de soporte</strong>
              </label>
            </div>

            <div class="form-group">
              <label>Metodo de Conexion</label>
              <select v-model="whatsappSettings.method" :disabled="!whatsappSettings.enabled" class="form-control">
                <option value="api">WhatsApp Business API</option>
                <option value="twilio">Twilio</option>
                <option value="web">WhatsApp Web (QR)</option>
              </select>
            </div>

            <!-- API Oficial de WhatsApp Business -->
            <div v-if="whatsappSettings.method === 'api'">
              <h4 class="mt-4">API Oficial de WhatsApp Business</h4>

              <div class="form-group">
                <label for="whatsappApiUrl">URL de la API</label>
                <input
                  type="text"
                  id="whatsappApiUrl"
                  v-model="whatsappSettings.apiUrl"
                  placeholder="https://graph.facebook.com/v17.0/"
                  :disabled="!whatsappSettings.enabled"
                />
                <small class="form-hint">URL del endpoint de WhatsApp Business API</small>
              </div>

              <div class="form-group">
                <label for="whatsappApiToken">Token de Acceso</label>
                <input
                  type="password"
                  id="whatsappApiToken"
                  v-model="whatsappSettings.apiToken"
                  :placeholder="whatsappSettings.hasToken ? '••••••••••••••••••••' : 'EAAFZBpX...'"
                  :disabled="!whatsappSettings.enabled"
                />
                <small class="form-hint">
                  {{ whatsappSettings.hasToken ? 'Dejar en blanco para mantener el token actual' : 'Token de acceso de Meta Business' }}
                </small>
              </div>

              <div class="form-group">
                <label for="whatsappPhoneNumberId">Phone Number ID</label>
                <input
                  type="text"
                  id="whatsappPhoneNumberId"
                  v-model="whatsappSettings.phoneNumberId"
                  placeholder="123456789012345"
                  :disabled="!whatsappSettings.enabled"
                />
                <small class="form-hint">ID del numero de telefono en WhatsApp Business</small>
              </div>
            </div>

            <!-- Twilio -->
            <div v-if="whatsappSettings.method === 'twilio'">
              <h4 class="mt-4">Twilio WhatsApp</h4>

              <div class="form-group">
                <label for="twilioAccountSid">Account SID</label>
                <input
                  type="text"
                  id="twilioAccountSid"
                  v-model="whatsappSettings.twilioAccountSid"
                  placeholder="AC..."
                  :disabled="!whatsappSettings.enabled"
                />
              </div>

              <div class="form-group">
                <label for="twilioAuthToken">Auth Token</label>
                <input
                  type="password"
                  id="twilioAuthToken"
                  v-model="whatsappSettings.twilioAuthToken"
                  :placeholder="whatsappSettings.hasTwilioToken ? '••••••••••••••••••••' : ''"
                  :disabled="!whatsappSettings.enabled"
                />
                <small class="form-hint">
                  {{ whatsappSettings.hasTwilioToken ? 'Dejar en blanco para mantener el token actual' : 'Token de autenticacion de Twilio' }}
                </small>
              </div>

              <div class="form-group">
                <label for="twilioWhatsAppNumber">Numero de WhatsApp</label>
                <input
                  type="text"
                  id="twilioWhatsAppNumber"
                  v-model="whatsappSettings.twilioWhatsAppNumber"
                  placeholder="whatsapp:+14155238886"
                  :disabled="!whatsappSettings.enabled"
                />
                <small class="form-hint">Formato: whatsapp:+14155238886</small>
              </div>
            </div>

            <!-- WhatsApp Web (QR) -->
            <div v-if="whatsappSettings.method === 'web'">
              <h4 class="mt-4">WhatsApp Web (Escanear QR)</h4>

              <div class="alert alert-info">
                <p>Este metodo conecta usando WhatsApp Web. Es mas facil de configurar pero:</p>
                <ul>
                  <li>El telefono debe estar conectado a internet</li>
                  <li>No es oficial de WhatsApp Business</li>
                  <li>Puede ser bloqueado por WhatsApp</li>
                </ul>
              </div>

              <div class="qr-container" v-if="whatsappQR">
                <img :src="whatsappQR" alt="Codigo QR de WhatsApp" />
                <p>Escanea este codigo con WhatsApp en tu telefono</p>
              </div>

              <button type="button" @click="generateWhatsAppQR" class="btn btn-secondary" :disabled="!whatsappSettings.enabled">
                Generar Codigo QR
              </button>
            </div>

            <!-- Resultado de prueba -->
            <div v-if="testResults.whatsapp" class="test-result" :class="testResults.whatsapp.success ? 'success' : 'error'">
              <div class="test-result-icon">
                {{ testResults.whatsapp.success ? 'Si' : 'No' }}
              </div>
              <div class="test-result-message">
                {{ testResults.whatsapp.message }}
              </div>
            </div>

            <div class="form-actions">
              <button
                type="button"
                class="btn btn-secondary"
                @click="testWhatsAppConnection"
                :disabled="saving || !whatsappSettings.enabled"
              >
                <span v-if="saving">Probando...</span>
                <span v-else>Enviar Mensaje de Prueba</span>
              </button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                <span v-if="saving">Guardando...</span>
                <span v-else>Guardar Configuración</span>
              </button>
            </div>
          </form>

          <!-- Guia de configuracion -->
          <div class="info-box mt-4">
            <h4>Como configurar WhatsApp</h4>

            <div v-if="whatsappSettings.method === 'api'">
              <h5>Opcion 1: API Oficial de WhatsApp Business</h5>
              <ol class="setup-steps">
                <li>
                  <strong>Crear cuenta de Meta Business:</strong>
                  <p>Ve a <a href="https://business.facebook.com" target="_blank">business.facebook.com</a></p>
                </li>
                <li>
                  <strong>Configurar WhatsApp Business API:</strong>
                  <p>En Meta Business Suite, agrega WhatsApp Business</p>
                </li>
                <li>
                  <strong>Obtener credenciales:</strong>
                  <p>Copia el Phone Number ID y genera un token de acceso</p>
                </li>
                <li>
                  <strong>Configurar webhook:</strong>
                  <p>URL: <code>https://tu-dominio.com/api/plugins/whatsapp/webhook</code></p>
                  <p>Verify Token: (el que configures en variables de entorno)</p>
                </li>
              </ol>
            </div>

            <div v-if="whatsappSettings.method === 'twilio'">
              <h5>Opcion 2: Twilio (Recomendado para empezar)</h5>
              <ol class="setup-steps">
                <li>
                  <strong>Crear cuenta en Twilio:</strong>
                  <p>Ve a <a href="https://www.twilio.com" target="_blank">twilio.com</a></p>
                </li>
                <li>
                  <strong>Activar WhatsApp Sandbox:</strong>
                  <p>En Twilio Console, ve a Messaging → Try it out → Try WhatsApp</p>
                </li>
                <li>
                  <strong>Obtener credenciales:</strong>
                  <p>Copia Account SID y Auth Token del Dashboard</p>
                </li>
                <li>
                  <strong>Numero de WhatsApp:</strong>
                  <p>Sandbox: <code>whatsapp:+14155238886</code></p>
                  <p>Produccion: Solicita aprobacion de tu numero</p>
                </li>
              </ol>
            </div>

            <div v-if="whatsappSettings.method === 'web'">
              <h5>Opcion 3: WhatsApp Web (QR)</h5>
              <p class="alert alert-warning">
                <strong>Advertencia:</strong> Este metodo no es oficial y puede ser bloqueado por WhatsApp.
                Solo para desarrollo o uso personal.
              </p>
              <ol class="setup-steps">
                <li>Click en "Generar Codigo QR"</li>
                <li>Abre WhatsApp en tu telefono</li>
                <li>Ve a Configuracion → Dispositivos vinculados</li>
                <li>Escanea el codigo QR</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuración de Dominio -->
      <div v-if="activeTab === 'domain'" class="tab-pane">
        <div class="card">
          <h2>Configuración de Dominio y CORS</h2>
          <p class="card-description">
            Configura el dominio principal de tu sistema y los orígenes permitidos para CORS.
            Esto permite que tu sistema funcione correctamente con tu dominio personalizado.
          </p>

          <form @submit.prevent="saveDomainSettings">
            <div class="form-group">
              <label for="systemDomain">Dominio Principal</label>
              <input
                type="text"
                id="systemDomain"
                v-model="domainSettings.systemDomain"
                placeholder="ejemplo: miempresa-isp.com"
              />
              <small>El dominio principal de tu sistema (sin https://)</small>
            </div>

            <div class="form-group">
              <label>Orígenes Permitidos (CORS)</label>
              <div class="origins-list">
                <div
                  v-for="(origin, index) in domainSettings.allowedOrigins"
                  :key="index"
                  class="origin-item"
                >
                  <input
                    type="text"
                    v-model="domainSettings.allowedOrigins[index]"
                    placeholder="https://ejemplo.com"
                  />
                  <button
                    type="button"
                    class="btn-remove"
                    @click="removeOrigin(index)"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="btn-add"
                @click="addOrigin"
              >
                + Agregar Origen
              </button>
              <small>URLs completas permitidas para acceder al sistema</small>
            </div>

            <div class="alert alert-info">
              <strong>Ejemplo de configuración:</strong>
              <ul>
                <li>Dominio: miempresa-isp.com</li>
                <li>Orígenes:
                  <ul>
                    <li>https://miempresa-isp.com</li>
                    <li>https://www.miempresa-isp.com</li>
                    <li>http://localhost:8080 (desarrollo)</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary">
                Guardar Configuración
              </button>
              <button
                type="button"
                class="btn-secondary"
                @click="reloadCors"
              >
                Recargar CORS
              </button>
            </div>
          </form>

          <div v-if="domainMessage" :class="['message', domainMessageType]">
            {{ domainMessage }}
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

// frontend/src/views/SettingsView.vue - SCRIPT SECTION

<script>
import SettingsService from '../services/settings.service';

export default {
  name: 'AppSettings',
  data() {
    return {
      activeTab: 'general',
      saving: false,
      loading: false,
      
      generalSettings: {
        companyName: '',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        companyWebsite: '',
        timeZone: 'America/Mexico_City',
        currency: 'MXN',
        logoUrl: null,
        theme: 'light'
      },
      
      emailSettings: {
        host: '',
        port: 587,
        secure: false,
        user: '',
        password: '',
        fromName: '',
        fromAddress: '',
        hasPassword: false
      },
      
      telegramSettings: {
        enabled: false,
        chatId: '',
        botToken: '',
        hasToken: false
      },
      
      whatsappSettings: {
        enabled: false,
        apiUrl: '',
        token: '',
        hasToken: false
      },

      domainSettings: {
        systemDomain: '',
        allowedOrigins: []
      },

      domainMessage: '',
      domainMessageType: '',

      jellyfinSettings: {
        enabled: false,
        url: '',
        apiKey: '',
        hasApiKey: false,
        jfaGoEnabled: false,
        jfaGoUrl: '',
        jfaGoDbPath: ''
      },
      
      paymentSettings: {
        mercadoPago: {
          enabled: false,
          publicKey: '',
          accessToken: '',
          webhookUrl: '',
          hasAccessToken: false
        },
        paypal: {
          enabled: false,
          clientId: '',
          clientSecret: '',
          sandbox: true,
          hasClientSecret: false
        }
      },
      
      mapSettings: {
        provider: 'openstreetmap',
        googleMapsApiKey: '',
        defaultCenter: { lat: 20.659699, lng: -103.349609 },
        defaultZoom: 11,
        hasGoogleMapsKey: false
      },
      
      monitoringSettings: {
        interval: 300,
        thresholds: {
          cpu: 85,
          memory: 90,
          disk: 95
        },
        retentionDays: 30
      },
      
      billingSettings: {
        taxRate: 16,
        graceDays: 5,
        reminderDays: [3, 7, 15],
        autoSuspendDays: 15,
        invoicePrefix: 'INV'
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
      
      testResults: {
        email: null,
        telegram: null,
        jellyfin: null
      }
    };
  },
  
  computed: {
    passwordStrength() {
      if (!this.passwordChange.newPassword) {
        return { percent: 0, class: '', text: '' };
      }
      
      const password = this.passwordChange.newPassword;
      let strength = 0;
      
      if (password.length >= 8) strength += 25;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
      if (/\d/.test(password)) strength += 25;
      if (/[^a-zA-Z0-9]/.test(password)) strength += 25;
      
      let text = '';
      let cssClass = '';
      
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
      
      return { percent: strength, text, class: cssClass };
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
    this.loadAllSettings();
    this.loadUserProfile();
  },
  
  methods: {
    // ===============================
    // CARGAR CONFIGURACIONES
    // ===============================
    
    async loadAllSettings() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadGeneralSettings(),
          this.loadEmailSettings(),
          this.loadTelegramSettings(),
          this.loadWhatsAppSettings(),
          this.loadDomainSettings(),
          this.loadJellyfinSettings(),
          this.loadPaymentSettings(),
          this.loadMapSettings(),
          this.loadMonitoringSettings(),
          this.loadBillingSettings(),
          this.loadNetworkSettings()
        ]);
        
        console.log('✅ Todas las configuraciones cargadas');
      } catch (error) {
        console.error('❌ Error cargando configuraciones:', error);
        this.$toast?.error('Error al cargar las configuraciones');
      } finally {
        this.loading = false;
      }
    },
    
    async loadGeneralSettings() {
      try {
        const response = await SettingsService.getGeneralSettings();
        this.generalSettings = { ...this.generalSettings, ...response.data };
      } catch (error) {
        console.error('Error cargando configuración general:', error);
      }
    },
    
    async loadEmailSettings() {
      try {
        const response = await SettingsService.getEmailSettings();
        this.emailSettings = { ...this.emailSettings, ...response.data };
      } catch (error) {
        console.error('Error cargando configuración de email:', error);
      }
    },
    
    async loadTelegramSettings() {
      try {
        const response = await SettingsService.getTelegramSettings();
        this.telegramSettings = { ...this.telegramSettings, ...response.data };
      } catch (error) {
        console.error('Error cargando configuración de Telegram:', error);
      }
    },
    
    async loadWhatsAppSettings() {
      try {
        const response = await SettingsService.getWhatsAppSettings();
        this.whatsappSettings = { ...this.whatsappSettings, ...response.data };
      } catch (error) {
        console.error('Error cargando configuración de WhatsApp:', error);
      }
    },

    async loadDomainSettings() {
      try {
        const response = await SettingsService.getDomainSettings();
        this.domainSettings.systemDomain = response.data.systemDomain || '';
        this.domainSettings.allowedOrigins = response.data.allowedOrigins || [];

        // Si no hay orígenes, agregar uno por defecto
        if (this.domainSettings.allowedOrigins.length === 0) {
          this.domainSettings.allowedOrigins.push('');
        }
      } catch (error) {
        console.error('Error cargando configuración de dominio:', error);
      }
    },

    async saveDomainSettings() {
      try {
        this.saving = true;
        this.domainMessage = '';

        // Filtrar orígenes vacíos
        const allowedOrigins = this.domainSettings.allowedOrigins.filter(o => o.trim() !== '');

        const response = await SettingsService.updateDomainSettings({
          systemDomain: this.domainSettings.systemDomain,
          allowedOrigins
        });

        if (response.data.success) {
          this.domainMessage = 'Configuración guardada correctamente';
          this.domainMessageType = 'success';

          // Recargar CORS automáticamente
          await this.reloadCors();
        }
      } catch (error) {
        console.error('Error guardando configuración de dominio:', error);
        this.domainMessage = error.response?.data?.message || 'Error al guardar la configuración';
        this.domainMessageType = 'error';
      } finally {
        this.saving = false;

        // Limpiar mensaje después de 5 segundos
        setTimeout(() => {
          this.domainMessage = '';
        }, 5000);
      }
    },

    async reloadCors() {
      try {
        const response = await SettingsService.reloadCors();
        if (response.data.success) {
          this.domainMessage = 'CORS recargado correctamente. Los cambios están activos.';
          this.domainMessageType = 'success';
        }
      } catch (error) {
        console.error('Error recargando CORS:', error);
        this.domainMessage = 'Error al recargar CORS';
        this.domainMessageType = 'error';
      }
    },

    addOrigin() {
      this.domainSettings.allowedOrigins.push('');
    },

    removeOrigin(index) {
      if (this.domainSettings.allowedOrigins.length > 1) {
        this.domainSettings.allowedOrigins.splice(index, 1);
      }
    },

    async loadJellyfinSettings() {
      try {
        const response = await SettingsService.getJellyfinSettings();
        this.jellyfinSettings = { ...this.jellyfinSettings, ...response.data };
      } catch (error) {
        console.error('Error cargando configuración de Jellyfin:', error);
      }
    },
    
    async loadPaymentSettings() {
      try {
        const response = await SettingsService.getPaymentSettings();
        this.paymentSettings = { ...this.paymentSettings, ...response.data };
      } catch (error) {
        console.error('Error cargando configuración de pagos:', error);
      }
    },
    
    async loadMapSettings() {
      try {
        const response = await SettingsService.getMapSettings();
        this.mapSettings = { ...this.mapSettings, ...response.data };
      } catch (error) {
        console.error('Error cargando configuración de mapas:', error);
      }
    },
    
    async loadMonitoringSettings() {
      try {
        const response = await SettingsService.getMonitoringSettings();
        this.monitoringSettings = { ...this.monitoringSettings, ...response.data };
      } catch (error) {
        console.error('Error cargando configuración de monitoreo:', error);
      }
    },
    
    async loadBillingSettings() {
      try {
        const response = await SettingsService.getBillingSettings();
        this.billingSettings = { ...this.billingSettings, ...response.data };
      } catch (error) {
        console.error('Error cargando configuración de facturación:', error);
      }
    },
    
    async loadNetworkSettings() {
      try {
        const response = await SettingsService.getNetworkSettings();
        this.networkSettings = { ...this.networkSettings, ...response.data };
      } catch (error) {
        console.error('Error cargando configuración de red:', error);
      }
    },
    
    async loadUserProfile() {
      try {
        const currentUser = this.$store.state.auth.user;
        if (currentUser) {
          this.userProfile.fullName = currentUser.fullName;
          this.userProfile.email = currentUser.email;
        }
      } catch (error) {
        console.error('Error cargando perfil de usuario:', error);
      }
    },
    
    // ===============================
    // GUARDAR CONFIGURACIONES
    // ===============================
    
    async saveGeneralSettings() {
      this.saving = true;
      try {
        await SettingsService.updateGeneralSettings(this.generalSettings);
        this.$toast?.success('Configuración general guardada correctamente');
      } catch (error) {
        console.error('Error guardando configuración general:', error);
        this.$toast?.error('Error al guardar la configuración general');
      } finally {
        this.saving = false;
      }
    },
    
    async saveEmailSettings() {
      this.saving = true;
      try {
        await SettingsService.updateEmailSettings({
          host: this.emailSettings.host,
          port: this.emailSettings.port,
          user: this.emailSettings.user,
          password: this.emailSettings.password || undefined,
          fromName: this.emailSettings.fromName,
          fromAddress: this.emailSettings.fromAddress
        });
        
        this.$toast?.success('Configuración de email guardada correctamente');
        
        // Recargar para actualizar el estado hasPassword
        await this.loadEmailSettings();
      } catch (error) {
        console.error('Error guardando configuración de email:', error);
        this.$toast?.error('Error al guardar la configuración de email');
      } finally {
        this.saving = false;
      }
    },
    
    async saveTelegramSettings() {
      this.saving = true;
      try {
        await SettingsService.updateTelegramSettings({
          enabled: this.telegramSettings.enabled,
          botToken: this.telegramSettings.botToken || undefined,
          chatId: this.telegramSettings.chatId
        });

        this.$toast?.success('Configuración de Telegram guardada correctamente');
        await this.loadTelegramSettings();
      } catch (error) {
        console.error('Error guardando configuración de Telegram:', error);
        this.$toast?.error('Error al guardar la configuración de Telegram');
      } finally {
        this.saving = false;
      }
    },

    async saveWhatsAppSettings() {
      this.saving = true;
      try {
        const data = {
          enabled: this.whatsappSettings.enabled,
          method: this.whatsappSettings.method
        };

        // Agregar configuración según el método seleccionado
        if (this.whatsappSettings.method === 'api') {
          data.api = {
            apiUrl: this.whatsappSettings.api.apiUrl,
            phoneNumberId: this.whatsappSettings.api.phoneNumberId,
            apiToken: this.whatsappSettings.api.apiToken || undefined
          };
        } else if (this.whatsappSettings.method === 'twilio') {
          data.twilio = {
            phoneNumber: this.whatsappSettings.twilio.phoneNumber,
            accountSid: this.whatsappSettings.twilio.accountSid || undefined,
            authToken: this.whatsappSettings.twilio.authToken || undefined
          };
        }

        await SettingsService.updateWhatsAppSettings(data);

        this.$toast?.success('Configuración de WhatsApp guardada correctamente');
        await this.loadWhatsAppSettings();
      } catch (error) {
        console.error('Error guardando configuración de WhatsApp:', error);
        this.$toast?.error('Error al guardar la configuración de WhatsApp');
      } finally {
        this.saving = false;
      }
    },

    async saveJellyfinSettings() {
      this.saving = true;
      try {
        await SettingsService.updateJellyfinSettings({
          enabled: this.jellyfinSettings.enabled,
          url: this.jellyfinSettings.url,
          apiKey: this.jellyfinSettings.apiKey || undefined,
          jfaGoEnabled: this.jellyfinSettings.jfaGoEnabled,
          jfaGoUrl: this.jellyfinSettings.jfaGoUrl,
          jfaGoDbPath: this.jellyfinSettings.jfaGoDbPath
        });
        
        this.$toast?.success('Configuración de Jellyfin guardada correctamente');
        await this.loadJellyfinSettings();
      } catch (error) {
        console.error('Error guardando configuración de Jellyfin:', error);
        this.$toast?.error('Error al guardar la configuración de Jellyfin');
      } finally {
        this.saving = false;
      }
    },
    
    async saveMonitoringSettings() {
      this.saving = true;
      try {
        await SettingsService.updateMonitoringSettings(this.monitoringSettings);
        this.$toast?.success('Configuración de monitoreo guardada correctamente');
      } catch (error) {
        console.error('Error guardando configuración de monitoreo:', error);
        this.$toast?.error('Error al guardar la configuración de monitoreo');
      } finally {
        this.saving = false;
      }
    },
    
    async saveBillingSettings() {
      this.saving = true;
      try {
        await SettingsService.updateBillingSettings(this.billingSettings);
        this.$toast?.success('Configuración de facturación guardada correctamente');
      } catch (error) {
        console.error('Error guardando configuración de facturación:', error);
        this.$toast?.error('Error al guardar la configuración de facturación');
      } finally {
        this.saving = false;
      }
    },
    
    // ===============================
    // PRUEBAS DE CONEXIÓN
    // ===============================
    
    async testEmailConnection() {
      if (!this.emailSettings.user) {
        this.$toast?.warning('Por favor configure el email primero');
        return;
      }
      
      this.saving = true;
      this.testResults.email = null;
      
      try {
        const testEmail = prompt('Ingrese el email de prueba:', this.emailSettings.user);
        if (!testEmail) return;
        
        const response = await SettingsService.testEmailSettings(testEmail);
        
        this.testResults.email = {
          success: response.data.success,
          message: response.data.message
        };
        
        this.$toast?.success('Email de prueba enviado correctamente');
      } catch (error) {
        console.error('Error probando conexión de email:', error);
        this.testResults.email = {
          success: false,
          message: error.response?.data?.message || 'Error enviando email de prueba'
        };
        this.$toast?.error('Error en la prueba de email');
      } finally {
        this.saving = false;
      }
    },
    
    async testTelegramConnection() {
      this.saving = true;
      this.testResults.telegram = null;

      try {
        const response = await SettingsService.testTelegramSettings();

        this.testResults.telegram = {
          success: response.data.success,
          message: response.data.message
        };

        this.$toast?.success('Mensaje de prueba enviado a Telegram');
      } catch (error) {
        console.error('Error probando conexión de Telegram:', error);
        this.testResults.telegram = {
          success: false,
          message: error.response?.data?.message || 'Error enviando mensaje de prueba'
        };
        this.$toast?.error('Error en la prueba de Telegram');
      } finally {
        this.saving = false;
      }
    },

    async testWhatsAppConnection() {
      // Pedir número de teléfono al usuario
      const testPhoneNumber = prompt('Ingresa el número de teléfono para enviar el mensaje de prueba (formato internacional, ej: +526141234567):');

      if (!testPhoneNumber) {
        return; // Usuario canceló
      }

      this.saving = true;
      this.testResults.whatsapp = null;

      try {
        const response = await SettingsService.testWhatsAppSettings(testPhoneNumber);

        this.testResults.whatsapp = {
          success: response.data.success,
          message: response.data.message
        };

        this.$toast?.success('Mensaje de prueba enviado a WhatsApp');
      } catch (error) {
        console.error('Error probando conexión de WhatsApp:', error);
        this.testResults.whatsapp = {
          success: false,
          message: error.response?.data?.message || 'Error enviando mensaje de prueba'
        };
        this.$toast?.error('Error en la prueba de WhatsApp');
      } finally {
        this.saving = false;
      }
    },

    // ===============================
    // OTROS MÉTODOS
    // ===============================
    
    async saveUserProfile() {
      this.saving = true;
      try {
        console.log('Saving user profile:', this.userProfile);
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.$toast?.success('Perfil actualizado correctamente');
      } catch (error) {
        console.error('Error saving user profile:', error);
        this.$toast?.error('Error al actualizar el perfil');
      } finally {
        this.saving = false;
      }
    },
    
    async changePassword() {
      if (!this.canChangePassword) return;
      
      if (this.passwordChange.newPassword !== this.passwordChange.confirmPassword) {
        this.passwordError = 'Las contraseñas no coinciden';
        return;
      }
      
      this.saving = true;
      this.passwordError = null;
      
      try {
        console.log('Changing password');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.passwordChange = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        
        this.$toast?.success('Contraseña cambiada correctamente');
      } catch (error) {
        console.error('Error changing password:', error);
        this.passwordError = 'Error al cambiar la contraseña. Verifique su contraseña actual.';
        this.$toast?.error('Error al cambiar la contraseña');
      } finally {
        this.saving = false;
      }
    },
    
    handleLogoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = e => {
        this.generalSettings.logoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    removeLogo() {
      this.generalSettings.logoUrl = null;
    },
    
    handleAvatarUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
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