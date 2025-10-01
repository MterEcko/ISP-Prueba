/**
 * Utilidades para formateo de fechas y moneda
 */

/**
 * Formatea una fecha en formato legible
 * @param {Date|string} date - Fecha a formatear
 * @param {boolean} includeTime - Si se debe incluir la hora
 * @returns {string} - Fecha formateada
 */
export function formatDate(date, includeTime = false) {
  if (!date) return '-';
  
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-ES', options);
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return String(date);
  }
}

/**
 * Formatea un valor como moneda
 * @param {number} value - Valor a formatear
 * @param {string} currency - Código de moneda (por defecto USD)
 * @returns {string} - Valor formateado como moneda
 */
export function formatCurrency(value, currency = 'USD') {
  if (value === null || value === undefined) return '-';
  
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(value);
  } catch (error) {
    console.error('Error al formatear moneda:', error);
    return `${value} ${currency}`;
  }
}

/**
 * Formatea un tamaño de archivo en bytes a una unidad legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formatea una dirección MAC con separadores consistentes
 * @param {string} mac - Dirección MAC
 * @param {string} separator - Separador a utilizar (por defecto :)
 * @returns {string} - Dirección MAC formateada
 */
export function formatMacAddress(mac, separator = ':') {
  if (!mac) return '';
  
  // Eliminar todos los separadores existentes y convertir a mayúsculas
  const cleanMac = mac.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
  
  // Verificar longitud
  if (cleanMac.length !== 12) return mac;
  
  // Insertar separadores
  let formattedMac = '';
  for (let i = 0; i < cleanMac.length; i += 2) {
    formattedMac += cleanMac.substr(i, 2);
    if (i < cleanMac.length - 2) {
      formattedMac += separator;
    }
  }
  
  return formattedMac;
}
