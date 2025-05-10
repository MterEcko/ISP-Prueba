// Servicio para interactuar con dispositivos Ubiquiti a través de UNMS/UISP API
// Para desarrollo local, simularemos las respuestas

// Simulador para desarrollo local
class UbiquitiSimulator {
  constructor() {
    this.devices = {
      '192.168.2.1': {
        name: 'Rocket M5',
        model: 'Rocket M5',
        serial: 'UBI123456',
        version: '6.3.1',
        uptime: '7d12h45m',
        cpuLoad: 8,
        memoryUsage: 30,
        signal: -65,
        noiseFloor: -95,
        frequency: '5805 MHz',
        channel: '161',
        interfaces: [
          { name: 'eth0', type: 'ethernet', status: 'up', rxBytes: 512000, txBytes: 256000 },
          { name: 'ath0', type: 'wireless', status: 'up', rxBytes: 1024000, txBytes: 512000 }
        ],
        stations: [
          { mac: 'AA:BB:CC:11:22:33', signalStrength: -68, ccq: 95, rxBytes: 512000, txBytes: 256000 },
          { mac: 'DD:EE:FF:44:55:66', signalStrength: -72, ccq: 92, rxBytes: 256000, txBytes: 128000 }
        ]
      },
      '192.168.2.2': {
        name: 'NanoStation M5',
        model: 'NanoStation M5',
        serial: 'UBI789012',
        version: '6.2.0',
        uptime: '3d8h22m',
        cpuLoad: 5,
        memoryUsage: 22,
        signal: -70,
        noiseFloor: -94,
        frequency: '5805 MHz',
        channel: '161',
        interfaces: [
          { name: 'eth0', type: 'ethernet', status: 'up', rxBytes: 256000, txBytes: 128000 },
          { name: 'ath0', type: 'wireless', status: 'up', rxBytes: 512000, txBytes: 256000 }
        ],
        stations: []
      }
    };
    
    // Generar datos históricos simulados
    this.generateHistoricalData();
  }
  
  // Generar datos históricos para simulación
  generateHistoricalData() {
    // Períodos de tiempo
    const periods = ['1h', '6h', '24h', '7d', '30d'];
    
    // Para cada dispositivo, generar datos históricos
    Object.keys(this.devices).forEach(ip => {
      const device = this.devices[ip];
      device.historicalData = {};
      
      periods.forEach(period => {
        // Determinar número de puntos de datos según el período
        let points;
        switch(period) {
          case '1h': points = 60; break;    // 1 punto por minuto
          case '6h': points = 72; break;    // 1 punto cada 5 minutos
          case '24h': points = 96; break;   // 1 punto cada 15 minutos
          case '7d': points = 168; break;   // 1 punto por hora
          case '30d': points = 180; break;  // 1 punto cada 4 horas
          default: points = 60;
        }
        
        // Generar datos para CPU, memoria, señal y tráfico
        const cpuData = [];
        const memoryData = [];
        const signalData = [];
        const trafficData = [];
        
        const now = new Date();
        
        for (let i = 0; i < points; i++) {
          // Calcular timestamp según el período
          let timestamp;
          switch(period) {
            case '1h': timestamp = new Date(now - (60 - i) * 60000); break;
            case '6h': timestamp = new Date(now - (6 * 60 - i * 5) * 60000); break;
            case '24h': timestamp = new Date(now - (24 * 60 - i * 15) * 60000); break;
            case '7d': timestamp = new Date(now - (7 * 24 - i) * 3600000); break;
            case '30d': timestamp = new Date(now - (30 * 24 - i * 4) * 3600000); break;
			default: timestamp = new Date(now - (60 - i) * 60000);
          }
          
          // Generar datos aleatorios
          cpuData.push({
            time: timestamp,
            value: Math.floor(Math.random() * 20) + 3 // 3-23%
          });
          
          memoryData.push({
            time: timestamp,
            value: Math.floor(Math.random() * 30) + 15 // 15-45%
          });
          
          signalData.push({
            time: timestamp,
            value: Math.floor(Math.random() * 10) - 70 // -70 a -60 dBm
          });
          
          trafficData.push({
            time: timestamp,
            rx: Math.floor(Math.random() * 500000) + 100000, // 100K-600K bytes
            tx: Math.floor(Math.random() * 300000) + 50000  // 50K-350K bytes
          });
        }
        
        device.historicalData[period] = {
          cpu: cpuData,
          memory: memoryData,
          signal: signalData,
          traffic: trafficData
        };
      });
    });
  }
  
  // Simular test de conexión
  async testConnection(ipAddress, username, password, apiKey) {
    // Simular una demora
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // Verificar si el dispositivo existe en nuestra simulación
    if (this.devices[ipAddress]) {
      return true; // Conexión exitosa
    }
    
    // 50% de probabilidad de éxito para IPs no conocidas
    return Math.random() > 0.5;
  }
  
  // Obtener información del dispositivo
  async getDeviceInfo(ipAddress, username, password, apiKey) {
    // Simular una demora
    await new Promise(resolve => setTimeout(resolve, 900));
    
    // Verificar si el dispositivo existe en nuestra simulación
    if (this.devices[ipAddress]) {
      const device = this.devices[ipAddress];
      return {
        connected: true,
        info: {
          name: device.name,
          model: device.model,
          serial: device.serial,
          version: device.version,
          uptime: device.uptime,
          cpuLoad: device.cpuLoad,
          memoryUsage: device.memoryUsage,
          signal: device.signal,
          noiseFloor: device.noiseFloor,
          frequency: device.frequency,
          channel: device.channel,
          interfaces: device.interfaces.length,
          stations: device.stations.length
        }
      };
    }
    
    // Para IPs no conocidas, generamos datos aleatorios o devolvemos error
    if (Math.random() > 0.3) {
      return {
        connected: true,
        info: {
          name: `AP-${ipAddress.split('.').pop()}`,
          model: Math.random() > 0.5 ? 'Rocket M5' : 'NanoStation M5',
          serial: `UBI${Math.floor(Math.random() * 1000000)}`,
          version: '6.3.1',
          uptime: `${Math.floor(Math.random() * 10)}d${Math.floor(Math.random() * 24)}h${Math.floor(Math.random() * 60)}m`,
          cpuLoad: Math.floor(Math.random() * 20) + 3,
          memoryUsage: Math.floor(Math.random() * 30) + 15,
          signal: Math.floor(Math.random() * 10) - 70,
          noiseFloor: -95,
          frequency: '5805 MHz',
          channel: '161',
          interfaces: Math.floor(Math.random() * 2) + 1,
          stations: Math.floor(Math.random() * 5)
        }
      };
    } else {
      throw new Error('No se pudo conectar al dispositivo');
    }
  }
  
  // Obtener métricas del dispositivo
  async getMetrics(ipAddress, username, password, apiKey, period) {
    // Simular una demora
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Verificar si el dispositivo existe en nuestra simulación
    if (this.devices[ipAddress] && this.devices[ipAddress].historicalData[period]) {
      return this.devices[ipAddress].historicalData[period];
    }
    
    // Para IPs no conocidas o períodos no válidos, generamos datos aleatorios
    const points = period === '1h' ? 60 : 
                  period === '6h' ? 72 : 
                  period === '24h' ? 96 : 
                  period === '7d' ? 168 : 180;
                  
    const cpuData = [];
    const memoryData = [];
    const signalData = [];
    const trafficData = [];
    
    const now = new Date();
    
    for (let i = 0; i < points; i++) {
      // Calcular timestamp según el período
      let timestamp;
      switch(period) {
        case '1h': timestamp = new Date(now - (60 - i) * 60000); break;
        case '6h': timestamp = new Date(now - (6 * 60 - i * 5) * 60000); break;
        case '24h': timestamp = new Date(now - (24 * 60 - i * 15) * 60000); break;
        case '7d': timestamp = new Date(now - (7 * 24 - i) * 3600000); break;
        case '30d': timestamp = new Date(now - (30 * 24 - i * 4) * 3600000); break;
        default: timestamp = new Date(now - (60 - i) * 60000);
      }
      
      // Generar datos aleatorios
      cpuData.push({
        time: timestamp,
        value: Math.floor(Math.random() * 20) + 3 // 3-23%
      });
      
      memoryData.push({
        time: timestamp,
        value: Math.floor(Math.random() * 30) + 15 // 15-45%
      });
      
      signalData.push({
        time: timestamp,
        value: Math.floor(Math.random() * 10) - 70 // -70 a -60 dBm
      });
      
      trafficData.push({
        time: timestamp,
        rx: Math.floor(Math.random() * 500000) + 100000, // 100K-600K bytes
        tx: Math.floor(Math.random() * 300000) + 50000  // 50K-350K bytes
      });
    }
    
    return {
      cpu: cpuData,
      memory: memoryData,
      signal: signalData,
      traffic: trafficData
    };
  }
  
  // Ejecutar acción en el dispositivo
  async executeAction(ipAddress, username, password, apiKey, action) {
    // Simular una demora
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    // Acciones soportadas
    const supportedActions = ['reboot', 'backup', 'factory-reset', 'spectrum-scan'];
    
    if (!supportedActions.includes(action)) {
      throw new Error(`Acción no soportada: ${action}`);
    }
    
    // 80% de probabilidad de éxito
    if (Math.random() > 0.2) {
      return {
        success: true,
        message: `Acción ${action} ejecutada exitosamente`,
        details: action === 'spectrum-scan' ? { 
          frequencies: [
            { frequency: 5180, noise: -96, utilization: 15 },
            { frequency: 5200, noise: -95, utilization: 22 },
            { frequency: 5220, noise: -96, utilization: 8 },
            { frequency: 5240, noise: -97, utilization: 5 },
            { frequency: 5260, noise: -95, utilization: 30 },
            { frequency: 5280, noise: -96, utilization: 18 },
            { frequency: 5300, noise: -94, utilization: 25 },
            { frequency: 5320, noise: -95, utilization: 12 }
          ]
        } : null
      };
    } else {
      throw new Error(`Error al ejecutar la acción ${action}`);
    }
  }
}

// Instanciar el simulador
const ubiquitiSimulator = new UbiquitiSimulator();

// Servicio Ubiquiti
const UbiquitiService = {
  // Test de conexión a dispositivo Ubiquiti
  testConnection: async (ipAddress, username, password, apiKey) => {
    try {
      // En producción, usarías la API de UNMS/UISP o AirOS
      // Para desarrollo, usamos el simulador
      return await ubiquitiSimulator.testConnection(ipAddress, username, password, apiKey);
    } catch (error) {
      console.error(`Error conectando a Ubiquiti ${ipAddress}:`, error);
      return false;
    }
  },
  
  // Obtener información del dispositivo
  getDeviceInfo: async (ipAddress, username, password, apiKey) => {
    try {
      // En producción, usarías la API real
      // Para desarrollo, usamos el simulador
      return await ubiquitiSimulator.getDeviceInfo(ipAddress, username, password, apiKey);
    } catch (error) {
      console.error(`Error obteniendo info de Ubiquiti ${ipAddress}:`, error);
      return {
        connected: false,
        info: null
      };
    }
  },
  
  // Obtener métricas del dispositivo
  getMetrics: async (ipAddress, username, password, apiKey, period = '1h') => {
    try {
      // En producción, obtendrías datos reales de la API
      // Para desarrollo, usamos el simulador
      return await ubiquitiSimulator.getMetrics(ipAddress, username, password, apiKey, period);
    } catch (error) {
      console.error(`Error obteniendo métricas de Ubiquiti ${ipAddress}:`, error);
      throw error;
    }
  },
  
  // Ejecutar acción en el dispositivo
  executeAction: async (ipAddress, username, password, apiKey, action) => {
    try {
      // En producción, ejecutarías comandos reales
      // Para desarrollo, usamos el simulador
      return await ubiquitiSimulator.executeAction(ipAddress, username, password, apiKey, action);
    } catch (error) {
      console.error(`Error ejecutando acción ${action} en Ubiquiti ${ipAddress}:`, error);
      throw error;
    }
  }
};

module.exports = UbiquitiService;