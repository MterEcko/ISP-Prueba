// Técnicas anti-piratería
class AntiPiracyMeasures {
  /**
   * 1. Ofuscación del código de licencia
   */
  static obfuscateLicenseCode() {
    // Usar herramientas como javascript-obfuscator
    // para ofuscar el código relacionado con licencias
  }

  /**
   * 2. Verificación de integridad del código
   */
  static async verifyCodeIntegrity() {
    const crypto = require('crypto');
    const fs = require('fs');
    
    // Lista de archivos críticos con sus hashes
    const criticalFiles = {
      'src/services/licenseClient.js': 'expected_hash_here',
      'src/services/pluginEngine.js': 'expected_hash_here'
    };

    for (const [file, expectedHash] of Object.entries(criticalFiles)) {
      const content = fs.readFileSync(file);
      const actualHash = crypto.createHash('sha256').update(content).digest('hex');
      
      if (actualHash !== expectedHash) {
        // Código ha sido modificado
        console.error(`File ${file} has been tampered with`);
        process.exit(1);
      }
    }
  }

  /**
   * 3. Detección de debuggers
   */
  static detectDebugger() {
    const startTime = Date.now();
    debugger; // Esta línea causa una pausa si hay debugger
    const endTime = Date.now();
    
    if (endTime - startTime > 100) {
      // Debugger detectado
      console.log('Debugger detected');
      return true;
    }
    
    return false;
  }

  /**
   * 4. Verificación de dominio/hostname
   */
  static async verifyHostname() {
    const os = require('os');
    const hostname = os.hostname();
    
    // Lista de hostnames sospechosos (VMs, contenedores de cracking)
    const suspiciousHostnames = [
      'DESKTOP-CRACK',
      'VM-',
      'localhost',
      'crack'
    ];

    for (const suspicious of suspiciousHostnames) {
      if (hostname.toLowerCase().includes(suspicious.toLowerCase())) {
        // Hostname sospechoso
        await this.reportSuspiciousActivity({
          type: 'suspicious_hostname',
          hostname: hostname
        });
      }
    }
  }

  /**
   * 5. Watermarking - Marcar cada instalación
   */
  static async createWatermark(licenseKey) {
    const crypto = require('crypto');
    
    // Crear marca de agua única
    const watermark = crypto
      .createHash('sha256')
      .update(licenseKey + Date.now())
      .digest('hex');
    
    // Guardar en múltiples ubicaciones
    await this.embedWatermark(watermark);
    
    return watermark;
  }

  /**
   * 6. Reportar actividad sospechosa
   */
  static async reportSuspiciousActivity(data) {
    try {
      await axios.post(
        `${process.env.STORE_API_URL}/security/report`,
        {
          ...data,
          timestamp: new Date(),
          system_info: {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch()
          }
        }
      );
    } catch (error) {
      // Fallar silenciosamente
    }
  }

  /**
   * 7. Validación periódica en background
   */
  static startBackgroundValidation() {
    // Validar cada hora con variación aleatoria
    const baseInterval = 60 * 60 * 1000; // 1 hora
    const variation = Math.random() * 30 * 60 * 1000; // ±30 minutos
    
    setInterval(async () => {
      const licenseClient = require('./licenseClient');
      const validation = await licenseClient.validate();
      
      if (!validation.valid) {
        // Deshabilitar funcionalidad gradualmente
        this.enforceInvalidLicense();
      }
    }, baseInterval + variation);
  }

  /**
   * 8. Enforcement de licencia inválida
   */
  static enforceInvalidLicense() {
    // No deshabilitar inmediatamente (para evitar alertar crackers)
    // Degradar funcionalidad progresivamente
    
    global.LICENSE_INVALID = true;
    
    // Después de 7 días sin licencia válida, deshabilitar
    setTimeout(() => {
      if (global.LICENSE_INVALID) {
        console.log('License validation failed. System disabled.');
        process.exit(1);
      }
    }, 7 * 24 * 60 * 60 * 1000);
  }
}

module.exports = AntiPiracyMeasures;