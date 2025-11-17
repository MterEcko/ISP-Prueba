// frontend/src/services/telemetry.service.js
// Servicio de Telemetría - Envía métricas al servidor Store
import axios from 'axios';
import appConfig from '@/config/app-config';

const STORE_API_URL = appConfig.LICENSE_SERVER_URL || 'http://localhost:3001/api';

class TelemetryService {
  constructor() {
    this.installationKey = localStorage.getItem('installation_key');
    this.isEnabled = appConfig.FEATURES.TELEMETRY_ENABLED;
    this.interval = null;
  }

  /**
   * Registrar instalación (primera vez)
   */
  async registerInstallation(companyData) {
    if (appConfig.USE_MOCK_DATA) {
      console.log('[Mock] Registrando instalación:', companyData);
      const mockKey = 'MOCK-' + Math.random().toString(36).substring(7).toUpperCase();
      localStorage.setItem('installation_key', mockKey);
      this.installationKey = mockKey;
      return { installationKey: mockKey };
    }

    try {
      const hardwareId = await this.generateHardwareId();
      const systemInfo = await this.getSystemInfo();

      const response = await axios.post(`${STORE_API_URL}/installations/register`, {
        companyName: companyData.companyName,
        contactEmail: companyData.contactEmail,
        contactPhone: companyData.contactPhone,
        hardwareId,
        systemInfo,
        softwareVersion: '1.0.0'
      });

      const { installationKey } = response.data.data;
      localStorage.setItem('installation_key', installationKey);
      this.installationKey = installationKey;

      console.log('✅ Instalación registrada:', installationKey);

      return response.data.data;
    } catch (error) {
      console.error('Error registrando instalación:', error);
      throw error;
    }
  }

  /**
   * Enviar heartbeat al servidor
   */
  async sendHeartbeat() {
    if (!this.isEnabled || !this.installationKey) return;

    if (appConfig.USE_MOCK_DATA) {
      console.log('[Mock] Heartbeat enviado');
      return;
    }

    try {
      const location = await this.getLocation();
      const systemInfo = await this.getSystemInfo();

      await axios.post(`${STORE_API_URL}/installations/heartbeat`, {
        installationKey: this.installationKey,
        latitude: location.latitude,
        longitude: location.longitude,
        systemInfo
      });
    } catch (error) {
      console.error('Error enviando heartbeat:', error);
    }
  }

  /**
   * Enviar métricas de hardware
   */
  async sendMetrics() {
    if (!this.isEnabled || !this.installationKey) return;

    if (appConfig.USE_MOCK_DATA) {
      console.log('[Mock] Métricas enviadas');
      return;
    }

    try {
      const metrics = await this.collectMetrics();

      await axios.post(`${STORE_API_URL}/telemetry/metrics`, {
        installationKey: this.installationKey,
        ...metrics
      });
    } catch (error) {
      console.error('Error enviando métricas:', error);
    }
  }

  /**
   * Enviar ubicación GPS
   */
  async sendLocation() {
    if (!this.isEnabled || !this.installationKey || !appConfig.FEATURES.GPS_TRACKING_ENABLED) return;

    if (appConfig.USE_MOCK_DATA) {
      console.log('[Mock] Ubicación enviada');
      return;
    }

    try {
      const location = await this.getLocation();

      await axios.post(`${STORE_API_URL}/telemetry/location`, {
        installationKey: this.installationKey,
        ...location
      });
    } catch (error) {
      console.error('Error enviando ubicación:', error);
    }
  }

  /**
   * Registrar evento
   */
  async recordEvent(eventType, data = {}) {
    if (!this.isEnabled || !this.installationKey) return;

    if (appConfig.USE_MOCK_DATA) {
      console.log('[Mock] Evento registrado:', eventType, data);
      return;
    }

    try {
      await axios.post(`${STORE_API_URL}/telemetry/event`, {
        installationKey: this.installationKey,
        eventType,
        data
      });
    } catch (error) {
      console.error('Error registrando evento:', error);
    }
  }

  /**
   * Obtener comandos remotos pendientes
   */
  async getRemoteCommands() {
    if (!this.installationKey) return [];

    if (appConfig.USE_MOCK_DATA) {
      return [];
    }

    try {
      const response = await axios.get(`${STORE_API_URL}/remote-control/commands/${this.installationKey}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error obteniendo comandos remotos:', error);
      return [];
    }
  }

  /**
   * Ejecutar comando remoto
   */
  async executeRemoteCommand(command) {
    console.log('Ejecutando comando remoto:', command);

    try {
      let result = { success: true, response: {} };

      switch (command.command) {
        case 'block':
          // Bloquear sistema
          localStorage.setItem('system_blocked', 'true');
          localStorage.setItem('block_reason', command.parameters.reason || 'Bloqueado por administrador');
          result.response = { blocked: true };
          alert(`SISTEMA BLOQUEADO: ${command.parameters.reason || 'Contacte al administrador'}`);
          break;

        case 'unblock':
          // Desbloquear sistema
          localStorage.removeItem('system_blocked');
          localStorage.removeItem('block_reason');
          result.response = { unblocked: true };
          break;

        case 'restart':
          // Reiniciar (recarga la página)
          result.response = { restarting: true };
          setTimeout(() => window.location.reload(), 2000);
          break;

        case 'message':
          // Mostrar mensaje
          alert(command.parameters.message);
          result.response = { messageShown: true };
          break;

        case 'collect_logs':
          // Recopilar logs
          result.response = { logs: this.collectLogs() };
          break;

        default:
          result = { success: false, error: 'Comando desconocido' };
      }

      // Reportar resultado al servidor
      if (!appConfig.USE_MOCK_DATA) {
        await axios.put(`${STORE_API_URL}/remote-control/commands/${command.id}/response`, result);
      }

      return result;
    } catch (error) {
      console.error('Error ejecutando comando:', error);
      if (!appConfig.USE_MOCK_DATA) {
        await axios.put(`${STORE_API_URL}/remote-control/commands/${command.id}/response`, {
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Iniciar telemetría automática
   */
  startAutomaticTelemetry() {
    if (!this.isEnabled || this.interval) return;

    // Heartbeat cada 5 minutos
    this.interval = setInterval(() => {
      this.sendHeartbeat();
      this.sendMetrics();

      // Verificar comandos remotos
      this.getRemoteCommands().then(commands => {
        commands.forEach(cmd => this.executeRemoteCommand(cmd));
      });
    }, 300000); // 5 minutos

    // Enviar ubicación cada hora
    setInterval(() => {
      this.sendLocation();
    }, 3600000); // 1 hora

    console.log('✅ Telemetría automática iniciada');
  }

  /**
   * Detener telemetría
   */
  stopAutomaticTelemetry() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('⏹️ Telemetría detenida');
    }
  }

  /**
   * Utilidades privadas
   */
  async generateHardwareId() {
    const navigatorInfo = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset()
    ].join('|');

    let hash = 0;
    for (let i = 0; i < navigatorInfo.length; i++) {
      const char = navigatorInfo.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
  }

  async getSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: navigator.onLine,
      cores: navigator.hardwareConcurrency,
      memory: navigator.deviceMemory || 'unknown',
      connection: navigator.connection?.effectiveType || 'unknown'
    };
  }

  async collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString()
    };

    // Uso de memoria (si está disponible)
    if (performance.memory) {
      metrics.memoryUsed = performance.memory.usedJSHeapSize;
      metrics.memoryTotal = performance.memory.totalJSHeapSize;
      metrics.memoryUsage = (performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize * 100).toFixed(2);
    }

    // Performance del navegador
    if (performance.timing) {
      metrics.loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    }

    // Conexiones activas (simulado)
    metrics.activeConnections = 1;

    return metrics;
  }

  async getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation || !appConfig.FEATURES.GPS_TRACKING_ENABLED) {
        resolve({ latitude: null, longitude: null });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude
          });
        },
        (error) => {
          console.warn('Error obteniendo ubicación:', error);
          resolve({ latitude: null, longitude: null });
        }
      );
    });
  }

  collectLogs() {
    // Recopilar logs del localStorage y errores recientes
    const logs = {
      errors: [],
      localStorage: { ...localStorage },
      timestamp: new Date().toISOString()
    };

    return logs;
  }

  /**
   * Verificar si el sistema está bloqueado
   */
  isSystemBlocked() {
    return localStorage.getItem('system_blocked') === 'true';
  }

  /**
   * Obtener razón del bloqueo
   */
  getBlockReason() {
    return localStorage.getItem('block_reason') || 'Sistema bloqueado';
  }
}

export default new TelemetryService();
