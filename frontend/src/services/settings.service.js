// src/services/settings.service.js

import axios from 'axios';
import authHeader from './auth-header';

const API_URL = 'http://localhost:3000/api/';

class SettingsService {
  // General Settings
  getGeneralSettings() {
    return axios.get(API_URL + 'settings/general', { headers: authHeader() });
  }

  saveGeneralSettings(settings) {
    return axios.post(API_URL + 'settings/general', settings, { headers: authHeader() });
  }

  // Network Settings
  getNetworkSettings() {
    return axios.get(API_URL + 'settings/network', { headers: authHeader() });
  }

  saveNetworkSettings(settings) {
    return axios.post(API_URL + 'settings/network', settings, { headers: authHeader() });
  }

  // Integration Settings
  getIntegrationSettings() {
    return axios.get(API_URL + 'settings/integrations', { headers: authHeader() });
  }

  saveJellyfinSettings(settings) {
    return axios.post(API_URL + 'settings/integrations/jellyfin', settings, { headers: authHeader() });
  }

  testJellyfinConnection(settings) {
    return axios.post(API_URL + 'settings/integrations/jellyfin/test', settings, { headers: authHeader() });
  }

  saveCommunicationSettings(settings) {
    return axios.post(API_URL + 'settings/integrations/communication', settings, { headers: authHeader() });
  }

  testSmtpConnection(settings) {
    return axios.post(API_URL + 'settings/integrations/smtp/test', settings, { headers: authHeader() });
  }

  // Notification Settings
  getNotificationSettings() {
    return axios.get(API_URL + 'settings/notifications', { headers: authHeader() });
  }

  saveNotificationSettings(settings) {
    return axios.post(API_URL + 'settings/notifications', settings, { headers: authHeader() });
  }

  // Para ambiente de desarrollo (simulación)
  // Estas funciones devuelven promesas simuladas para desarrollo local
  mockGetSettings() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          data: {
            general: {
              companyName: 'Mi ISP',
              language: 'es',
              timezone: 'America/Mexico_City',
              dateFormat: 'DD/MM/YYYY',
              logoUrl: null,
              theme: 'light'
            },
            network: {
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
            integrations: {
              jellyfin: {
                url: 'http://localhost:8096',
                apiKey: '',
                defaultProfile: ''
              },
              smtp: {
                host: 'smtp.example.com',
                port: 587,
                security: 'tls',
                user: 'user@example.com',
                password: '',
                from: 'ISP Sistema <noreply@example.com>'
              },
              telegram: {
                token: '',
                enabled: false
              }
            },
            notifications: {
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
            }
          }
        });
      }, 500);
    });
  }

  mockSaveSettings() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ data: { success: true, message: 'Configuración guardada correctamente' } });
      }, 1000);
    });
  }

  mockTestConnection(success = true) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          data: {
            success,
            message: success 
              ? 'Conexión exitosa' 
              : 'Error de conexión. Verifique las credenciales.'
          }
        });
      }, 1500);
    });
  }
}

export default new SettingsService();