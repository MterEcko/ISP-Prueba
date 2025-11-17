/**
 * Utilidades para formateo de datos en la aplicación
 */

/**
 * Formatea una fecha en formato local (dd/mm/yyyy)
 * @param {string|Date} dateValue - Fecha a formatear
 * @param {string} [locale='es-MX'] - Configuración regional
 * @returns {string} Fecha formateada
 */
export function formatDate(dateValue, locale = 'es-MX') {
  if (!dateValue) return '—';
  
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  
  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) {
    return '—';
  }
  
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatea una fecha y hora en formato local (dd/mm/yyyy hh:mm)
 * @param {string|Date} dateTimeValue - Fecha y hora a formatear
 * @param {string} [locale='es-MX'] - Configuración regional
 * @returns {string} Fecha y hora formateada
 */
export function formatDateTime(dateTimeValue, locale = 'es-MX') {
  if (!dateTimeValue) return '—';
  
  const dateTime = dateTimeValue instanceof Date ? dateTimeValue : new Date(dateTimeValue);
  
  // Verificar si la fecha es válida
  if (isNaN(dateTime.getTime())) {
    return '—';
  }
  
  return dateTime.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatea un valor monetario
 * @param {number} amount - Cantidad a formatear
 * @param {string} [currency='MXN'] - Moneda
 * @param {string} [locale='es-MX'] - Configuración regional
 * @returns {string} Valor formateado como moneda
 */
export function formatCurrency(amount, currency = 'MXN', locale = 'es-MX') {
  if (amount === undefined || amount === null) {
    return '—';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formatea un número con separador de miles
 * @param {number} value - Número a formatear
 * @param {number} [decimals=0] - Número de decimales
 * @param {string} [locale='es-MX'] - Configuración regional
 * @returns {string} Número formateado
 */
export function formatNumber(value, decimals = 0, locale = 'es-MX') {
  if (value === undefined || value === null) {
    return '—';
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Formatea un tamaño de archivo a unidades legibles (KB, MB, GB)
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado con unidad
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formatea una duración en segundos a formato hh:mm:ss
 * @param {number} seconds - Duración en segundos
 * @returns {string} Duración formateada
 */
export function formatDuration(seconds) {
  if (seconds === undefined || seconds === null) {
    return '—';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    remainingSeconds.toString().padStart(2, '0')
  ].join(':');
}

/**
 * Formatea un porcentaje
 * @param {number} value - Valor a formatear como porcentaje
 * @param {number} [decimals=2] - Número de decimales
 * @returns {string} Porcentaje formateado
 */
export function formatPercentage(value, decimals = 2) {
  if (value === undefined || value === null) {
    return '—';
  }
  
  return `${value.toFixed(decimals)}%`;
}

/**
 * Convierte una cadena a formato camelCase
 * @param {string} str - Cadena a convertir
 * @returns {string} Cadena en formato camelCase
 */
export function toCamelCase(str) {
  return str
    .replace(/\s(.)/g, function(match, group1) {
      return group1.toUpperCase();
    })
    .replace(/\s/g, '')
    .replace(/^(.)/, function(match, group1) {
      return group1.toLowerCase();
    });
}

/**
 * Convierte una cadena a formato de título (primera letra de cada palabra en mayúscula)
 * @param {string} str - Cadena a convertir
 * @returns {string} Cadena en formato título
 */
export function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  formatFileSize,
  formatDuration,
  formatPercentage,
  toCamelCase,
  toTitleCase
};
