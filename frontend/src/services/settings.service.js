// frontend/src/services/settings.service.js
import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class SettingsService {
  // ===============================
  // CONFIGURACIÓN GENERAL
  // ===============================
  
  getGeneralSettings() {
    return axios.get(API_URL + 'settings/general', { headers: authHeader() });
  }

  updateGeneralSettings(data) {
    return axios.put(API_URL + 'settings/general', data, { headers: authHeader() });
  }

  // Mantener compatibilidad con código anterior
  saveGeneralSettings(settings) {
    return this.updateGeneralSettings(settings);
  }

  // ===============================
  // CONFIGURACIÓN DE EMAIL
  // ===============================
  
  getEmailSettings() {
    return axios.get(API_URL + 'settings/email', { headers: authHeader() });
  }

  updateEmailSettings(data) {
    return axios.put(API_URL + 'settings/email', data, { headers: authHeader() });
  }

  testEmailSettings(testEmail) {
    return axios.post(API_URL + 'settings/email/test', { testEmail }, { headers: authHeader() });
  }

  // ===============================
  // CONFIGURACIÓN DE TELEGRAM
  // ===============================
  
  getTelegramSettings() {
    return axios.get(API_URL + 'settings/telegram', { headers: authHeader() });
  }

  updateTelegramSettings(data) {
    return axios.put(API_URL + 'settings/telegram', data, { headers: authHeader() });
  }

  testTelegramSettings() {
    return axios.post(API_URL + 'settings/telegram/test', {}, { headers: authHeader() });
  }

  // ===============================
  // CONFIGURACIÓN DE WHATSAPP
  // ===============================
  
  getWhatsAppSettings() {
    return axios.get(API_URL + 'settings/whatsapp', { headers: authHeader() });
  }

  updateWhatsAppSettings(data) {
    return axios.put(API_URL + 'settings/whatsapp', data, { headers: authHeader() });
  }

  // ===============================
  // CONFIGURACIÓN DE DOMINIO Y CORS
  // ===============================

  getDomainSettings() {
    return axios.get(API_URL + 'settings/domain', { headers: authHeader() });
  }

  updateDomainSettings(data) {
    return axios.put(API_URL + 'settings/domain', data, { headers: authHeader() });
  }

  reloadCors() {
    return axios.post(API_URL + 'settings/cors/reload', {}, { headers: authHeader() });
  }

  // ===============================
  // CONFIGURACIÓN DE JELLYFIN
  // ===============================
  
  getJellyfinSettings() {
    return axios.get(API_URL + 'settings/jellyfin', { headers: authHeader() });
  }

  updateJellyfinSettings(data) {
    return axios.put(API_URL + 'settings/jellyfin', data, { headers: authHeader() });
  }

  // Mantener compatibilidad con código anterior
  saveJellyfinSettings(settings) {
    return this.updateJellyfinSettings(settings);
  }

  testJellyfinConnection(settings) {
    return axios.post(API_URL + 'settings/integrations/jellyfin/test', settings, { headers: authHeader() });
  }

  // ===============================
  // CONFIGURACIÓN DE PAGOS
  // ===============================
  
  getPaymentSettings() {
    return axios.get(API_URL + 'settings/payments', { headers: authHeader() });
  }

  updatePaymentSettings(data) {
    return axios.put(API_URL + 'settings/payments', data, { headers: authHeader() });
  }

  // ===============================
  // CONFIGURACIÓN DE MAPAS
  // ===============================
  
  getMapSettings() {
    return axios.get(API_URL + 'settings/maps', { headers: authHeader() });
  }

  updateMapSettings(data) {
    return axios.put(API_URL + 'settings/maps', data, { headers: authHeader() });
  }

  // ===============================
  // CONFIGURACIÓN DE MONITOREO
  // ===============================
  
  getMonitoringSettings() {
    return axios.get(API_URL + 'settings/monitoring', { headers: authHeader() });
  }

  updateMonitoringSettings(data) {
    return axios.put(API_URL + 'settings/monitoring', data, { headers: authHeader() });
  }

  // ===============================
  // CONFIGURACIÓN DE FACTURACIÓN
  // ===============================
  
  getBillingSettings() {
    return axios.get(API_URL + 'settings/billing', { headers: authHeader() });
  }

  updateBillingSettings(data) {
    return axios.put(API_URL + 'settings/billing', data, { headers: authHeader() });
  }

  // ===============================
  // CONFIGURACIÓN DE RED
  // ===============================
  
  getNetworkSettings() {
    return axios.get(API_URL + 'settings/network', { headers: authHeader() });
  }

  // Mantener compatibilidad con código anterior
  saveNetworkSettings(settings) {
    return axios.post(API_URL + 'settings/network', settings, { headers: authHeader() });
  }

  // ===============================
  // CONFIGURACIÓN DE INTEGRACIONES (ANTIGUAS)
  // ===============================
  
  getIntegrationSettings() {
    return axios.get(API_URL + 'settings/integrations', { headers: authHeader() });
  }

  saveCommunicationSettings(settings) {
    return axios.post(API_URL + 'settings/integrations/communication', settings, { headers: authHeader() });
  }

  testSmtpConnection(settings) {
    // Redirigir al nuevo endpoint de email test
    return this.testEmailSettings(settings.testEmail || settings.user);
  }

  // ===============================
  // CONFIGURACIÓN DE NOTIFICACIONES
  // ===============================
  
  getNotificationSettings() {
    return axios.get(API_URL + 'settings/notifications', { headers: authHeader() });
  }

  saveNotificationSettings(settings) {
    return axios.post(API_URL + 'settings/notifications', settings, { headers: authHeader() });
  }

  // ===============================
  // OPERACIONES GENERALES
  // ===============================
  
  getAllSettings() {
    return axios.get(API_URL + 'settings/all', { headers: authHeader() });
  }

  getConfigByKey(key) {
    return axios.get(API_URL + `settings/key/${key}`, { headers: authHeader() });
  }

  getConfigByModule(module) {
    return axios.get(API_URL + `settings/module/${module}`, { headers: authHeader() });
  }

  invalidateCache() {
    return axios.post(API_URL + 'settings/cache/invalidate', {}, { headers: authHeader() });
  }
}

export default new SettingsService();