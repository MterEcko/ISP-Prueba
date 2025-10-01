// src/services/settings.service.js

import axios from 'axios';
import authHeader from './auth-header';

import { API_URL } from './frontend_apiConfig';

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

  

}


export default new SettingsService();