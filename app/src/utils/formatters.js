/**
 * Formatea un número a formato de moneda
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

/**
 * Formatea bytes a formato legible (KB, MB, GB, etc.)
 */
export const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Formatea una fecha a formato legible
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Formatea una fecha con hora
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Obtiene el texto de estado de factura
 */
export const getInvoiceStatusText = (status) => {
  const statusMap = {
    pending: 'Pendiente',
    paid: 'Pagado',
    overdue: 'Vencido',
    cancelled: 'Cancelado',
  };
  return statusMap[status] || status;
};

/**
 * Obtiene el color de estado de factura
 */
export const getInvoiceStatusColor = (status) => {
  const colorMap = {
    pending: '#f39c12',
    paid: '#27ae60',
    overdue: '#e74c3c',
    cancelled: '#95a5a6',
  };
  return colorMap[status] || '#95a5a6';
};

/**
 * Obtiene el texto de estado de ticket
 */
export const getTicketStatusText = (status) => {
  const statusMap = {
    open: 'Abierto',
    in_progress: 'En Progreso',
    resolved: 'Resuelto',
    closed: 'Cerrado',
  };
  return statusMap[status] || status;
};

/**
 * Obtiene el color de estado de ticket
 */
export const getTicketStatusColor = (status) => {
  const colorMap = {
    open: '#f39c12',
    in_progress: '#3498db',
    resolved: '#27ae60',
    closed: '#95a5a6',
  };
  return colorMap[status] || '#95a5a6';
};

/**
 * Obtiene el texto de prioridad de ticket
 */
export const getTicketPriorityText = (priority) => {
  const priorityMap = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
  };
  return priorityMap[priority] || priority;
};

/**
 * Obtiene el color de prioridad de ticket
 */
export const getTicketPriorityColor = (priority) => {
  const colorMap = {
    low: '#95a5a6',
    medium: '#3498db',
    high: '#f39c12',
    urgent: '#e74c3c',
  };
  return colorMap[priority] || '#95a5a6';
};
