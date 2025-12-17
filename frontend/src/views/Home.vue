<template>
  <div class="home-container">
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

    <!-- Card principal -->
    <div class="welcome-card">
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
        <p class="subtitle">Plataforma de Gestión para Proveedores de Internet</p>
      </div>

      <div class="welcome-content">
        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon">📊</span>
            <div class="feature-text">
              <h3>Gestión Completa</h3>
              <p>Administra clientes, facturación y servicios</p>
            </div>
          </div>

          <div class="feature-item">
            <span class="feature-icon">📡</span>
            <div class="feature-text">
              <h3>Control de Red</h3>
              <p>Monitoreo en tiempo real de dispositivos</p>
            </div>
          </div>

          <div class="feature-item">
            <span class="feature-icon">💰</span>
            <div class="feature-text">
              <h3>Contabilidad</h3>
              <p>Gastos, nóminas y reportes financieros</p>
            </div>
          </div>

          <div class="feature-item">
            <span class="feature-icon">🔌</span>
            <div class="feature-text">
              <h3>Sistema de Plugins</h3>
              <p>Extiende funcionalidades según necesites</p>
            </div>
          </div>
        </div>

        <button class="btn-login" @click="goToLogin">
          <span class="btn-icon">⚡</span>
          Iniciar Sesión
        </button>

        <div class="info-text">
          <p>¿Nuevo en el sistema? Contacta a tu administrador para obtener acceso.</p>
        </div>
      </div>
    </div>

    <!-- Footer decorativo -->
    <div class="home-footer">
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
export default {
  name: 'HomeView',
  methods: {
    goToLogin() {
      this.$router.push('/login');
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
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.home-container {
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

/* ===== TARJETA PRINCIPAL ===== */
.welcome-card {
  position: relative;
  width: 90%;
  max-width: 550px;
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
  animation: fadeIn 0.8s ease-in;
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

/* ===== CONTENIDO ===== */
.welcome-content {
  animation: fadeIn 1s ease-in;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(52, 152, 219, 0.2);
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: rgba(52, 152, 219, 0.1);
  border-color: #3498db;
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.feature-text h3 {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.feature-text p {
  font-size: 11px;
  color: #7f8c8d;
  line-height: 1.4;
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

.btn-login:hover {
  background: linear-gradient(135deg, #2980b9 0%, #21618c 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
}

.btn-icon {
  font-size: 18px;
}

.info-text {
  margin-top: 20px;
  text-align: center;
}

.info-text p {
  color: #7f8c8d;
  font-size: 12px;
  line-height: 1.6;
}

/* ===== FOOTER ===== */
.home-footer {
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

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .welcome-card {
    padding: 30px 20px;
  }

  .system-title {
    font-size: 24px;
  }

  .feature-list {
    grid-template-columns: 1fr;
  }

  .tech-stats {
    gap: 20px;
  }

  .stat-value {
    font-size: 14px;
  }
}
</style>
