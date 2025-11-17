// Plugin Obfuscator - Sistema de ofuscación y empaquetado de plugins
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const logger = require('../config/logger');

class PluginObfuscator {
  constructor() {
    this.uploadPath = path.join(__dirname, '../../uploads/plugins');
  }

  /**
   * Ofuscar código JavaScript usando transformaciones básicas
   * En producción, usar herramientas como javascript-obfuscator
   */
  obfuscateCode(code) {
    // Transformaciones básicas (en producción usar javascript-obfuscator)
    let obfuscated = code;

    // 1. Remover comentarios
    obfuscated = obfuscated.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    // 2. Minificar (remover espacios innecesarios)
    obfuscated = obfuscated.replace(/\s+/g, ' ').trim();

    // 3. Ofuscar nombres de variables (básico)
    // En producción usar javascript-obfuscator npm package

    // 4. Añadir encoding base64 como capa extra
    const encoded = Buffer.from(obfuscated).toString('base64');
    const wrapper = `(function(){eval(Buffer.from('${encoded}','base64').toString('utf8'));})();`;

    return wrapper;
  }

  /**
   * Calcular hash SHA256 de un archivo
   */
  async calculateHash(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  /**
   * Empaquetar plugin en formato .plugin (ZIP)
   */
  async packagePlugin(pluginDir, outputPath) {
    return new Promise(async (resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Máxima compresión
      });

      output.on('close', () => {
        logger.info(`Plugin empaquetado: ${archive.pointer()} bytes`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Leer manifest.json
      const manifestPath = path.join(pluginDir, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      archive.file(manifestPath, { name: 'manifest.json' });

      // Procesar archivos de código
      const srcDir = path.join(pluginDir, 'src');
      try {
        const files = await fs.readdir(srcDir);

        for (const file of files) {
          if (file.endsWith('.js')) {
            const filePath = path.join(srcDir, file);
            const code = await fs.readFile(filePath, 'utf8');

            // Ofuscar código
            const obfuscated = this.obfuscateCode(code);

            // Agregar al ZIP
            archive.append(obfuscated, { name: `src/${file}` });
          }
        }
      } catch (error) {
        // Si no hay carpeta src, continuar
        logger.warn(`No src folder in ${pluginDir}`);
      }

      // Finalizar
      await archive.finalize();
    });
  }

  /**
   * Procesar todos los plugins
   */
  async processAllPlugins() {
    try {
      const pluginDirs = await fs.readdir(this.uploadPath);
      const results = [];

      for (const pluginDir of pluginDirs) {
        const pluginPath = path.join(this.uploadPath, pluginDir);
        const stats = await fs.stat(pluginPath);

        if (!stats.isDirectory()) continue;

        // Verificar que tenga manifest.json
        const manifestPath = path.join(pluginPath, 'manifest.json');
        try {
          await fs.access(manifestPath);
        } catch {
          logger.warn(`No manifest.json in ${pluginDir}`);
          continue;
        }

        // Empaquetar plugin
        const outputPath = path.join(this.uploadPath, `${pluginDir}.plugin`);
        await this.packagePlugin(pluginPath, outputPath);

        // Calcular hash
        const hash = await this.calculateHash(outputPath);

        // Obtener tamaño
        const fileStats = await fs.stat(outputPath);

        // Leer manifest
        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

        results.push({
          name: manifest.name,
          slug: pluginDir,
          version: manifest.version,
          filePath: `${pluginDir}.plugin`,
          fileSize: fileStats.size,
          fileHash: hash,
          manifest
        });

        logger.info(`✅ Plugin procesado: ${manifest.name} (${hash.substring(0, 8)}...)`);
      }

      return results;
    } catch (error) {
      logger.error('Error processing plugins:', error);
      throw error;
    }
  }

  /**
   * Verificar integridad de un plugin
   */
  async verifyPlugin(filePath, expectedHash) {
    const actualHash = await this.calculateHash(filePath);
    return actualHash === expectedHash;
  }
}

module.exports = new PluginObfuscator();
