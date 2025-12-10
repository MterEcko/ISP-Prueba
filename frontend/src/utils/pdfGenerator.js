// backend/src/utils/pdfGenerator.js
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');

// =================================================================
// FUNCIÓN AÑADIDA: generateFromTemplate (Resuelve el TypeError)
// Se encarga de leer el archivo, reemplazar variables y llamar a generatePDF.
// =================================================================
/**
 * Lee una plantilla HTML, reemplaza variables y genera el PDF.
 * @param {string} templatePathName - Nombre/ruta relativa del archivo HTML de la plantilla (e.g., 'contrato_servicio.html')
 * @param {object} variables - Variables a inyectar en el HTML
 * @param {object} config - Configuración del PDF (márgenes, orientación, etc.)
 * @returns {Promise<{filePath: string}>} - Retorna la ruta del archivo generado
 */
async function generateFromTemplate(templatePathName, variables, config = {}) {
  // 1. Construir ruta absoluta al archivo de la plantilla
  const templatePath = path.join(
    __dirname,
    '../../templates/documents',
    path.basename(templatePathName)
  );

  // 2. Leer contenido HTML
  let htmlContent = await fs.readFile(templatePath, 'utf-8');

  // 3. Reemplazar variables (tomado de la lógica en documentBulk.controller.js)
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    htmlContent = htmlContent.replace(regex, value || '');
  }

  // 4. Generar nombre de archivo único y ruta temporal
  // Creamos un directorio temporal para guardar los documentos antes de ser movidos
  const filename = `documento_generado_${Date.now()}.pdf`;
  // NOTA: Es posible que necesites ajustar la ruta '../../uploads/temp'
  const tempDir = path.join(__dirname, '../../uploads/temp'); 
  await fs.mkdir(tempDir, { recursive: true });
  const outputPath = path.join(tempDir, filename);

  // 5. Generar PDF (llamando a la función generatePDF existente)
  await generatePDF(htmlContent, outputPath, config);

  return { filePath: outputPath };
}


// =================================================================
// FUNCIÓN EXISTENTE: generatePDF
// =================================================================
/**
 * Genera un PDF desde HTML usando Puppeteer
 * @param {string} htmlContent - Contenido HTML del documento
 * @param {string} outputPath - Ruta donde se guardará el PDF
 * @param {object} config - Configuración del PDF (márgenes, orientación, etc.)
 * @returns {Promise<void>}
 */
async function generatePDF(htmlContent, outputPath, config = {}) {
  let browser = null;

  try {
    // Configuración por defecto
    const defaultConfig = {
      pageSize: 'letter',
      orientation: 'portrait',
      margins: {
        top: 40,
        right: 40,
        bottom: 40,
        left: 40
      }
    };

    const pdfConfig = { ...defaultConfig, ...config };

    // Lanzar navegador
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Procesar códigos QR si existen en el HTML
    htmlContent = await processQRCodes(htmlContent);

    // Procesar logo del sistema si existe
    htmlContent = await processSystemLogo(htmlContent);

    // Establecer contenido HTML
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Configurar opciones del PDF
    const pdfOptions = {
      path: outputPath,
      format: pdfConfig.pageSize.toUpperCase(),
      printBackground: true,
      margin: {
        top: `${pdfConfig.margins.top}px`,
        right: `${pdfConfig.margins.right}px`,
        bottom: `${pdfConfig.margins.bottom}px`,
        left: `${pdfConfig.margins.left}px`
      },
      landscape: pdfConfig.orientation === 'landscape',
      preferCSSPageSize: true
    };

    // Generar PDF
    await page.pdf(pdfOptions);

    console.log(`PDF generado exitosamente: ${outputPath}`);
  } catch (error) {
    console.error('Error generando PDF:', error);
    throw new Error(`Error al generar PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// =================================================================
// OTRAS FUNCIONES AUXILIARES
// =================================================================

/**
 * Procesa tags especiales para códigos QR en el HTML
 * Reemplaza <qr-code data="..."></qr-code> con imagen base64
 */
async function processQRCodes(html) {
  const qrRegex = /<qr-code\s+data="([^"]+)"(?:\s+size="(\d+)")?><\/qr-code>/g;
  let processedHtml = html;
  const matches = [...html.matchAll(qrRegex)];

  for (const match of matches) {
    const qrData = match[1];
    const qrSize = match[2] || 200;

    try {
      // Generar QR code como data URL
      const qrDataURL = await QRCode.toDataURL(qrData, {
        width: parseInt(qrSize),
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Reemplazar tag con imagen
      const imgTag = `<img src="${qrDataURL}" alt="QR Code" style="width: ${qrSize}px; height: ${qrSize}px;" />`;
      processedHtml = processedHtml.replace(match[0], imgTag);
    } catch (error) {
      console.error('Error generando QR code:', error);
      // Si falla, dejar un placeholder
      processedHtml = processedHtml.replace(match[0], '<div style="width: 200px; height: 200px; border: 1px dashed #ccc;"></div>');
    }
  }

  return processedHtml;
}

/**
 * Procesa el logo del sistema
 * Reemplaza <system-logo></system-logo> con el logo desde BD o archivo
 */
async function processSystemLogo(html) {
  if (!html.includes('<system-logo')) {
    return html;
  }

  try {
    // TODO: Obtener logo de la base de datos (tabla SystemConfiguration)
    // Por ahora, usar logo por defecto si existe
    const logoPath = path.join(__dirname, '../../assets/logo.png');
    
    let logoDataURL = '';
    
    try {
      const logoBuffer = await fs.readFile(logoPath);
      const base64Logo = logoBuffer.toString('base64');
      const mimeType = 'image/png'; // Ajustar según el tipo de imagen
      logoDataURL = `data:${mimeType};base64,${base64Logo}`;
    } catch (error) {
      console.log('Logo no encontrado, usando placeholder');
      // Si no existe el logo, usar un placeholder SVG
      logoDataURL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iODAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNpc3RlbWEgSVNQPC90ZXh0Pjwvc3ZnPg==';
    }

    // Reemplazar todas las ocurrencias de <system-logo>
    const logoRegex = /<system-logo(?:\s+width="(\d+)")?(?:\s+height="(\d+)")?><\/system-logo>/g;
    const matches = [...html.matchAll(logoRegex)];

    let processedHtml = html;
    for (const match of matches) {
      const width = match[1] || '200';
      const height = match[2] || '80';
      
      const imgTag = `<img src="${logoDataURL}" alt="Logo ISP" style="width: ${width}px; height: ${height}px;" />`;
      processedHtml = processedHtml.replace(match[0], imgTag);
    }

    return processedHtml;
  } catch (error) {
    console.error('Error procesando logo del sistema:', error);
    return html;
  }
}

/**
 * Genera un preview HTML (sin generar PDF)
 * Útil para mostrar vista previa en navegador
 */
async function generateHTMLPreview(htmlContent) {
  try {
    // Procesar QR codes y logos
    let processedHtml = await processQRCodes(htmlContent);
    processedHtml = await processSystemLogo(processedHtml);
    
    return processedHtml;
  } catch (error) {
    console.error('Error generando preview HTML:', error);
    throw error;
  }
}

/**
 * Valida que Puppeteer esté instalado correctamente
 */
async function validatePuppeteer() {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    await browser.close();
    return true;
  } catch (error) {
    console.error('Puppeteer no está configurado correctamente:', error);
    return false;
  }
}

// =================================================================
// EXPORTACIONES
// =================================================================
module.exports = {
  generatePDF,
  generateFromTemplate, 
  generateHTMLPreview,
  processQRCodes,
  processSystemLogo,
  validatePuppeteer
};