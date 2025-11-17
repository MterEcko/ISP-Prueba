import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class ReportsService {
  /**
   * Obtiene un resumen ejecutivo combinado.
   * Nota: Este es un endpoint hipotético que tu backend debería crear.
   * Debería combinar estadísticas de facturas, pagos y clientes.
   */
  getExecutiveSummary(params = {}) {
    const queryParams = new URLSearchParams(params);
    return axios.get(`${API_URL}reports/executive-summary?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  /**
   * Obtiene un análisis de la cartera vencida por rangos de días.
   * Nota: Endpoint hipotético que tu backend debería crear.
   */
  getPortfolioAnalysis(params = {}) {
    const queryParams = new URLSearchParams(params);
    return axios.get(`${API_URL}reports/portfolio-analysis?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }
  
  /**
   * Obtiene proyecciones de ingresos.
   * Nota: Endpoint hipotético que tu backend debería crear.
   */
  getProjections(params = {}) {
    const queryParams = new URLSearchParams(params);
    return axios.get(`${API_URL}reports/projections?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }
  
  /**
   * Obtiene métricas de eficiencia operativa.
   * Nota: Endpoint hipotético que tu backend debería crear.
   */
  getOperationalEfficiency(params = {}) {
    const queryParams = new URLSearchParams(params);
    return axios.get(`${API_URL}reports/efficiency?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }
  
  getClientActivityLog(clientId, params = {}) {
    const queryParams = new URLSearchParams(params);
    // Este es el endpoint que tu backend necesita implementar
    return axios.get(`${API_URL}reports/client-activity-log/${clientId}?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }
  
  /**
 * Obtener estadísticas completas del cliente
 */
getClientStatistics(clientId, params = {}) {
  const queryParams = new URLSearchParams(params);
  return axios.get(`${API_URL}reports/client-statistics/${clientId}?${queryParams.toString()}`, { 
    headers: authHeader() 
  });
}
}

export default new ReportsService();