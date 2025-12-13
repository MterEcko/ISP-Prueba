<template>
  <div class="login-container">
    <!-- Fondo animado con mundo y red -->
    <div class="background-animation">
      <div class="world-globe"></div>
      <div class="network-lines">
        <div class="line" v-for="i in 15" :key="i" :style="getLineStyle(i)"></div>
      </div>
      <div class="data-particles">
        <div class="particle" v-for="i in 30" :key="i" :style="getParticleStyle()"></div>
      </div>
      <div class="grid-overlay"></div>
    </div>

    <!-- Formulario de login -->
    <div class="login-card" :class="{ 'loading-mode': isAuthenticating }">
      <div class="card-header">
        <div class="logo-container">
          <div class="signal-icon">
            <div class="signal-bar"></div>
            <div class="signal-bar"></div>
            <div class="signal-bar"></div>
            <div class="signal-bar"></div>
          </div>
        </div>
        <h1 class="system-title">Sistema Integral ISP</h1>
        <p class="subtitle">Gestión de Telecomunicaciones</p>
      </div>

      <!-- Formulario normal -->
      <div v-if="!isAuthenticating" class="login-form">
        <div class="form-group">
          <label for="username">
            <span class="icon">👤</span>
            Usuario o Email
          </label>
          <input
            type="text"
            id="username"
            v-model="user.username"
            @keyup.enter="handleLogin"
            required
            placeholder="usuario@ejemplo.com"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="password">
            <span class="icon">🔒</span>
            Contraseña
          </label>
          <input
            type="password"
            id="password"
            v-model="user.password"
            @keyup.enter="handleLogin"
            required
            placeholder="••••••••"
            class="form-input"
          />
        </div>

        <button
          class="btn-login"
          @click="handleLogin"
          :disabled="loading"
        >
          <span v-if="loading">Procesando...</span>
          <span v-else>
            <span class="btn-icon">⚡</span>
            Conectar
          </span>
        </button>

        <div class="error-message" v-if="message">
          <span class="error-icon">⚠️</span>
          {{ message }}
        </div>
      </div>

      <!-- Barra de progreso animada -->
      <div v-else class="authentication-progress">
        <div class="progress-icon">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>

        <div class="progress-steps">
          <div
            v-for="(step, index) in authSteps"
            :key="index"
            class="step"
            :class="{
              active: index === currentStep,
              completed: index < currentStep
            }"
          >
            <div class="step-icon">
              <span v-if="index < currentStep">✓</span>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="step-text">{{ step.text }}</div>
            <div class="step-bar" v-if="index === currentStep">
              <div class="step-bar-fill" :style="{ width: step.progress + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="status-text">{{ currentStatus }}</div>
      </div>
    </div>

    <!-- Footer decorativo -->
    <div class="login-footer">
      <div class="tech-stats">
        <div class="stat">
          <span class="stat-icon">📡</span>
          <span class="stat-value">99.9%</span>
          <span class="stat-label">Uptime</span>
        </div>
        <div class="stat">
          <span class="stat-icon">⚡</span>
          <span class="stat-value">&lt; 50ms</span>
          <span class="stat-label">Latencia</span>
        </div>
        <div class="stat">
          <span class="stat-icon">🌐</span>
          <span class="stat-value">24/7</span>
          <span class="stat-label">Soporte</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AuthService from '../services/auth.service';

export default {
  name: 'LoginView',
  data() {
    return {
      user: {
        username: '',
        password: ''
      },
      loading: false,
      isAuthenticating: false,
      currentStep: 0,
      currentStatus: '',
      message: '',
      authSteps: [
        { text: '🔐 Verificando credenciales', progress: 0 },
        { text: '📦 Validando paquetes', progress: 0 },
        { text: '⚡ Test de velocidad', progress: 0 },
        { text: '🚀 Iniciando servicios', progress: 0 }
      ]
    };
  },
  methods: {
    handleLogin() {
      this.loading = true;
      this.message = '';

      if (!this.user.username || !this.user.password) {
        this.message = 'Usuario y contraseña son requeridos';
        this.loading = false;
        return;
      }

      // Iniciar animación de autenticación
      this.isAuthenticating = true;
      this.simulateAuthSteps();

      AuthService.login(this.user.username, this.user.password)
        .then(() => {
          // Completar todos los pasos
          this.currentStep = this.authSteps.length;
          setTimeout(() => {
            this.$router.push('/dashboard');
          }, 500);
        })
        .catch(error => {
          this.loading = false;
          this.isAuthenticating = false;
          this.currentStep = 0;
          this.message =
            (error.response && error.response.data && error.response.data.message) ||
            error.message ||
            'Error de autenticación';
        });
    },

    simulateAuthSteps() {
      const stepDuration = 400; // Duración de cada paso

      this.authSteps.forEach((step, index) => {
        setTimeout(() => {
          this.currentStep = index;
          this.currentStatus = step.text;
          this.animateProgress(index);
        }, index * stepDuration);
      });
    },

    animateProgress(stepIndex) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        this.authSteps[stepIndex].progress = progress;
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 30);
    },

    getLineStyle(index) {
      const angle = (index / 15) * 360;
      const delay = index * 0.2;
      return {
        transform: `rotate(${angle}deg)`,
        animationDelay: `${delay}s`
      };
    },

    getParticleStyle() {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = 3 + Math.random() * 3;
      return {
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`
      };
    }
  }
};
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: linear-gradient(135deg, #0a1628 0%, #1a2f4a 50%, #0d1b2a 100%);
}

/* ===== FONDO ANIMADO ===== */
.background-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.4;
  pointer-events: none;
}

.world-globe {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(52, 152, 219, 0.3), transparent 70%);
  border: 2px solid rgba(52, 152, 219, 0.2);
  animation: pulse 4s ease-in-out infinite;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(52, 152, 219, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(52, 152, 219, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: gridMove 20s linear infinite;
}

.network-lines {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
}

.line {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(52, 152, 219, 0.6), transparent);
  transform-origin: left center;
  animation: rotateLine 10s linear infinite;
}

.data-particles {
  position: absolute;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #3498db;
  border-radius: 50%;
  animation: floatParticle 6s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(52, 152, 219, 0.8);
}

/* ===== TARJETA DE LOGIN ===== */
.login-card {
  position: relative;
  width: 90%;
  max-width: 450px;
  padding: 40px;
  background: rgba(15, 25, 40, 0.95);
  border-radius: 20px;
  border: 1px solid rgba(52, 152, 219, 0.3);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(52, 152, 219, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  z-index: 10;
}

.login-card.loading-mode {
  min-height: 400px;
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.signal-icon {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 40px;
}

.signal-bar {
  width: 8px;
  background: linear-gradient(to top, #3498db, #5dade2);
  border-radius: 4px;
  animation: signalPulse 1.5s ease-in-out infinite;
}

.signal-bar:nth-child(1) { height: 10px; animation-delay: 0s; }
.signal-bar:nth-child(2) { height: 20px; animation-delay: 0.2s; }
.signal-bar:nth-child(3) { height: 30px; animation-delay: 0.4s; }
.signal-bar:nth-child(4) { height: 40px; animation-delay: 0.6s; }

.system-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
  text-shadow: 0 0 20px rgba(52, 152, 219, 0.5);
}

.subtitle {
  font-size: 14px;
  color: #5dade2;
  font-weight: 300;
}

.login-form {
  animation: fadeIn 0.5s ease-in;
}

.form-group {
  margin-bottom: 25px;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-weight: 500;
  color: #e0e0e0;
  font-size: 14px;
}

.icon {
  font-size: 16px;
}

.form-input {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid rgba(52, 152, 219, 0.3);
  border-radius: 10px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 20px rgba(52, 152, 219, 0.2);
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.btn-login {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
}

.btn-login:hover:not(:disabled) {
  background: linear-gradient(135deg, #2980b9 0%, #21618c 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 18px;
}

.error-message {
  margin-top: 20px;
  padding: 12px;
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.5);
  border-radius: 8px;
  color: #e74c3c;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===== PROGRESO DE AUTENTICACIÓN ===== */
.authentication-progress {
  text-align: center;
  padding: 20px 0;
  animation: fadeIn 0.5s ease-in;
}

.progress-icon {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 30px;
}

.spinner-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

.spinner-ring:nth-child(2) {
  animation-delay: 0.3s;
  border-top-color: #5dade2;
}

.spinner-ring:nth-child(3) {
  animation-delay: 0.6s;
  border-top-color: #85c1e9;
}

.progress-steps {
  margin: 20px 0;
}

.step {
  padding: 15px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(52, 152, 219, 0.2);
  transition: all 0.3s ease;
}

.step.active {
  background: rgba(52, 152, 219, 0.1);
  border-color: #3498db;
  box-shadow: 0 0 20px rgba(52, 152, 219, 0.2);
}

.step.completed {
  background: rgba(46, 204, 113, 0.1);
  border-color: #2ecc71;
}

.step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
  margin-right: 10px;
  font-weight: bold;
}

.step.completed .step-icon {
  background: #2ecc71;
  color: white;
}

.step-text {
  display: inline;
  color: #e0e0e0;
  font-size: 14px;
}

.step-bar {
  margin-top: 8px;
  height: 4px;
  background: rgba(52, 152, 219, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.step-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #5dade2);
  transition: width 0.3s ease;
}

.status-text {
  margin-top: 20px;
  color: #5dade2;
  font-size: 14px;
  font-weight: 500;
}

/* ===== FOOTER ===== */
.login-footer {
  position: absolute;
  bottom: 30px;
  z-index: 10;
}

.tech-stats {
  display: flex;
  gap: 40px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  font-size: 24px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #3498db;
}

.stat-label {
  font-size: 11px;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ===== ANIMACIONES ===== */
@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.5; }
}

@keyframes gridMove {
  0% { background-position: 0 0; }
  100% { background-position: 50px 50px; }
}

@keyframes rotateLine {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes floatParticle {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
  50% { transform: translateY(-30px) translateX(20px); opacity: 1; }
}

@keyframes signalPulse {
  0%, 100% { opacity: 0.3; transform: scaleY(0.8); }
  50% { opacity: 1; transform: scaleY(1); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .login-card {
    padding: 30px 20px;
  }

  .system-title {
    font-size: 24px;
  }

  .tech-stats {
    gap: 20px;
  }

  .stat-value {
    font-size: 14px;
  }
}
</style>
