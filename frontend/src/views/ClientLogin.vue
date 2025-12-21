<template>
  <div class="client-login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">
            <span class="logo-icon">🌐</span>
            <h1>Portal del Cliente</h1>
          </div>
          <p class="subtitle">Accede a tu cuenta</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="clientNumber">Número de Cliente</label>
            <input
              id="clientNumber"
              v-model="loginForm.clientNumber"
              type="text"
              placeholder="00001"
              required
              autofocus
              :disabled="loading"
            />
            <small class="help-text">Tu número de cliente de 5 dígitos</small>
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <input
              id="password"
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Ingresa tu contraseña"
              required
              :disabled="loading"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="password-toggle"
            >
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </button>
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn-login" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span v-else>Iniciar Sesión</span>
          </button>
        </form>

        <div class="login-footer">
          <p class="help-text">
            ¿Olvidaste tu contraseña? <br>
            Contacta con soporte para restablecerla
          </p>
          <router-link to="/" class="back-link">
            Volver al inicio
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ClientAuthService from '../services/clientAuth.service';

export default {
  name: 'ClientLogin',
  data() {
    return {
      loginForm: {
        clientNumber: '',
        password: ''
      },
      loading: false,
      errorMessage: '',
      showPassword: false
    };
  },
  methods: {
    async handleLogin() {
      this.errorMessage = '';
      this.loading = true;

      try {
        const response = await ClientAuthService.login(
          this.loginForm.clientNumber,
          this.loginForm.password
        );

        if (response.success) {
          // Redirigir al dashboard del portal del cliente
          this.$router.push('/client-portal/dashboard');
        } else {
          this.errorMessage = response.message || 'Error en el login';
        }
      } catch (error) {
        console.error('Error en login:', error);
        this.errorMessage = error.message || 'Credenciales inválidas';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.client-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 450px;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  margin-bottom: 10px;
}

.logo-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 10px;
}

.logo h1 {
  font-size: 28px;
  color: #2c3e50;
  margin: 0;
  font-weight: 700;
}

.subtitle {
  color: #7f8c8d;
  font-size: 16px;
  margin: 10px 0 0 0;
}

.login-form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 24px;
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 600;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 38px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  transition: opacity 0.3s;
}

.password-toggle:hover {
  opacity: 0.7;
}

.help-text {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #95a5a6;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
}

.btn-login {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.login-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #ecf0f1;
}

.login-footer .help-text {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 15px;
  line-height: 1.6;
}

.back-link {
  display: inline-block;
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: color 0.3s;
}

.back-link:hover {
  color: #764ba2;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
  }

  .logo-icon {
    font-size: 50px;
  }

  .logo h1 {
    font-size: 24px;
  }
}
</style>
