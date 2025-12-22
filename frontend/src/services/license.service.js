// frontend/src/services/license.service.js
import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class LicenseService {
  // ================== SYSTEM LICENSES ==================

  /**
   * Obtener todas las licencias del sistema
   */
  getAllLicenses() {
    return axios.get(`${API_URL}system-licenses`, {
      headers: authHeader()
    });
  }

  /**
   * Obtener licencia por ID
   */
  getLicenseById(id) {
    return axios.get(`${API_URL}system-licenses/${id}`, {
      headers: authHeader()
    });
  }

  /**
   * Obtener la licencia activa actual del sistema
   */
  getCurrentLicense() {
    return axios.get(`${API_URL}system-licenses/current`, {
      headers: authHeader()
    });
  }

  /**
   * Crear una nueva licencia
   */
  createLicense(licenseData) {
    return axios.post(`${API_URL}system-licenses`, licenseData, {
      headers: authHeader()
    });
  }

  /**
   * Actualizar una licencia existente
   */
  updateLicense(id, licenseData) {
    return axios.put(`${API_URL}system-licenses/${id}`, licenseData, {
      headers: authHeader()
    });
  }

  /**
   * Eliminar una licencia
   */
  deleteLicense(id) {
    return axios.delete(`${API_URL}system-licenses/${id}`, {
      headers: authHeader()
    });
  }

  /**
   * Activar una licencia con su clave
   */
  activateLicense(licenseKey, hardwareId = null) {
    return axios.post(
      `${API_URL}system-licenses/activate`,
      {
        license_key: licenseKey,
        hardware_id: hardwareId
      },
      {
        headers: authHeader()
      }
    );
  }

  /**
   * Desactivar una licencia
   */
  deactivateLicense(id) {
    return axios.put(
      `${API_URL}system-licenses/${id}/deactivate`,
      {},
      {
        headers: authHeader()
      }
    );
  }

  /**
   * Verificar el estado de una licencia
   */
  verifyLicense(licenseKey, hardwareId = null) {
    return axios.post(
      `${API_URL}system-licenses/verify`,
      {
        licenseKey: licenseKey,  // Cambiado de license_key a licenseKey (camelCase)
        hardwareId: hardwareId   // Cambiado de hardware_id a hardwareId (camelCase)
      },
      {
        headers: authHeader()
      }
    );
  }

  /**
   * Renovar una licencia
   */
  renewLicense(id, renewalData) {
    return axios.put(`${API_URL}system-licenses/${id}/renew`, renewalData, {
      headers: authHeader()
    });
  }

  /**
   * Obtener estadísticas de uso de una licencia
   */
  getLicenseUsage(id) {
    return axios.get(`${API_URL}system-licenses/${id}/usage`, {
      headers: authHeader()
    });
  }

  // ================== UTILIDADES LOCALES ==================

  /**
   * Guardar licencia activa en localStorage
   */
  saveActiveLicense(license) {
    localStorage.setItem('active_license', JSON.stringify(license));
  }

  /**
   * Obtener licencia activa desde localStorage
   */
  getActiveLicense() {
    const license = localStorage.getItem('active_license');
    return license ? JSON.parse(license) : null;
  }

  /**
   * Eliminar licencia activa del localStorage
   */
  removeActiveLicense() {
    localStorage.removeItem('active_license');
  }

  /**
   * Verificar si hay una licencia activa
   */
  hasActiveLicense() {
    const license = this.getActiveLicense();
    if (!license) return false;

    // Verificar si está expirada
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      this.removeActiveLicense();
      return false;
    }

    return license.active === true;
  }

  /**
   * Obtener características habilitadas por la licencia
   */
  getEnabledFeatures() {
    const license = this.getActiveLicense();
    if (!license || !license.featuresEnabled) {
      return {};
    }
    return license.featuresEnabled;
  }

  /**
   * Verificar si una característica está habilitada
   */
  isFeatureEnabled(featureName) {
    const features = this.getEnabledFeatures();
    return features[featureName] === true;
  }

  /**
   * Obtener información del plan actual
   */
  getPlanInfo() {
    const license = this.getActiveLicense();
    if (!license) {
      return {
        planType: 'freemium',
        clientLimit: 50,
        unlimited: false
      };
    }

    return {
      planType: license.planType || 'freemium',
      clientLimit: license.clientLimit,
      unlimited: license.clientLimit === null,
      expiresAt: license.expiresAt,
      isMasterLicense: license.isMasterLicense || false
    };
  }

  /**
   * Verificar si se alcanzó el límite de clientes
   */
  async checkClientLimit() {
    const planInfo = this.getPlanInfo();

    // Si es ilimitado, siempre retorna true
    if (planInfo.unlimited) {
      return { canAddClient: true, unlimited: true };
    }

    try {
      // Aquí deberías llamar a tu API para obtener el conteo actual de clientes
      // Por ahora retornamos un ejemplo
      const response = await axios.get(`${API_URL}clients/count`, {
        headers: authHeader()
      });

      const currentClients = response.data.count || 0;
      const canAddClient = currentClients < planInfo.clientLimit;

      return {
        canAddClient,
        currentClients,
        clientLimit: planInfo.clientLimit,
        unlimited: false
      };
    } catch (error) {
      console.error('Error checking client limit:', error);
      return {
        canAddClient: false,
        error: error.message
      };
    }
  }

  /**
   * Calcular días restantes de la licencia
   */
  getDaysRemaining() {
    const license = this.getActiveLicense();
    if (!license || !license.expiresAt) {
      return null; // Sin expiración
    }

    const expirationDate = new Date(license.expiresAt);
    const today = new Date();
    const diffTime = expirationDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }

  /**
   * Verificar si la licencia está próxima a vencer
   */
  isLicenseExpiringSoon(daysThreshold = 30) {
    const daysRemaining = this.getDaysRemaining();
    if (daysRemaining === null) return false; // Sin expiración
    return daysRemaining <= daysThreshold && daysRemaining > 0;
  }

  /**
   * Verificar si la licencia está expirada
   */
  isLicenseExpired() {
    const daysRemaining = this.getDaysRemaining();
    if (daysRemaining === null) return false; // Sin expiración
    return daysRemaining <= 0;
  }

  /**
   * Obtener estado completo de la licencia
   */
  getLicenseStatus() {
    const license = this.getActiveLicense();
    if (!license) {
      return {
        hasLicense: false,
        status: 'no_license',
        message: 'No hay licencia activa'
      };
    }

    const daysRemaining = this.getDaysRemaining();
    const expired = this.isLicenseExpired();
    const expiringSoon = this.isLicenseExpiringSoon();

    let status = 'active';
    let message = 'Licencia activa';

    if (expired) {
      status = 'expired';
      message = 'Licencia expirada';
    } else if (expiringSoon) {
      status = 'expiring_soon';
      message = `Licencia expira en ${daysRemaining} días`;
    } else if (license.isMasterLicense) {
      status = 'master';
      message = 'Licencia maestra activa';
    }

    return {
      hasLicense: true,
      status,
      message,
      daysRemaining,
      license,
      planInfo: this.getPlanInfo()
    };
  }
}

export default new LicenseService();
