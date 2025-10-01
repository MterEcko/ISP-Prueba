// composables/useDebugLogger.js
import { ref, computed, reactive } from 'vue'

export function useDebugLogger() {
  // ===============================
  // ESTADO DEL DEBUG
  // ===============================
  
  const debugMode = ref(false)
  const consoleLogs = ref([])
  const maxLogs = ref(100) // Máximo número de logs a mantener
  const logLevels = {
    DEBUG: 'debug',
    INFO: 'info', 
    WARN: 'warn',
    ERROR: 'error'
  }

  // Información de debug compilada
  const debugInfo = computed(() => {
    const info = {
      timestamp: new Date().toISOString(),
      debugMode: debugMode.value,
      totalLogs: consoleLogs.value.length,
      logsByLevel: getLogCountByLevel(),
      lastError: getLastError(),
      systemInfo: getSystemInfo()
    }
    
    return info
  })

  // ===============================
  // FUNCIONES DE LOGGING PRINCIPALES
  // ===============================
  
  const logDebug = (message, data = null) => {
    addLog(logLevels.DEBUG, message, data)
    console.log(`🔍 DEBUG: ${message}`, data || '')
  }

  const logInfo = (message, data = null) => {
    addLog(logLevels.INFO, message, data)
    console.log(`ℹ️ INFO: ${message}`, data || '')
  }

  const logWarn = (message, data = null) => {
    addLog(logLevels.WARN, message, data)
    console.warn(`⚠️ WARN: ${message}`, data || '')
  }

  const logError = (message, data = null) => {
    addLog(logLevels.ERROR, message, data)
    console.error(`❌ ERROR: ${message}`, data || '')
  }

  // ===============================
  // LOGGING ESPECÍFICO PARA TRANSACCIONES
  // ===============================
  
  const logTransactionStart = (operationType, formData) => {
    logInfo('🚀 INICIO DE TRANSACCIÓN', {
      operationType,
      timestamp: new Date().toISOString(),
      formDataKeys: Object.keys(formData),
      clientId: formData.clientId,
      servicePackageId: formData.servicePackageId
    })
  }

  const logTransactionStep = (stepId, stepName, status, data = null) => {
    const message = `📝 PASO: ${stepName} (${stepId})`
    
    switch (status) {
      case 'running':
        logInfo(`${message} - EJECUTANDO`, data)
        break
      case 'completed':
        logInfo(`${message} - ✅ COMPLETADO`, data)
        break
      case 'failed':
        logError(`${message} - ❌ FALLIDO`, data)
        break
      default:
        logDebug(`${message} - ${status}`, data)
    }
  }

  const logMikrotikOperation = (operation, routerIp, data, result = null) => {
    logInfo(`🔧 MIKROTIK ${operation.toUpperCase()}`, {
      router: routerIp,
      operation,
      data,
      result,
      timestamp: new Date().toISOString()
    })
  }

  const logDatabaseOperation = (table, operation, data, result = null) => {
    logInfo(`💾 DB ${operation.toUpperCase()} - ${table}`, {
      table,
      operation,
      data,
      result,
      timestamp: new Date().toISOString()
    })
  }

  const logSyncOperation = (syncType, sourceData, targetData, differences = null) => {
    logInfo(`🔄 SYNC: ${syncType}`, {
      syncType,
      sourceData,
      targetData,
      differences,
      timestamp: new Date().toISOString()
    })
  }

  const logRollbackOperation = (stepId, rollbackData, success = true) => {
    if (success) {
      logInfo(`⏪ ROLLBACK EXITOSO: ${stepId}`, rollbackData)
    } else {
      logError(`⏪ ROLLBACK FALLIDO: ${stepId}`, rollbackData)
    }
  }

  // ===============================
  // LOGGING PARA VALIDACIONES
  // ===============================
  
  const logValidation = (validationType, field, isValid, errorMessage = null) => {
    if (isValid) {
      logDebug(`✅ VALIDACIÓN OK: ${validationType} - ${field}`)
    } else {
      logWarn(`❌ VALIDACIÓN FALLIDA: ${validationType} - ${field}`, {
        field,
        error: errorMessage
      })
    }
  }

  const logValidationSummary = (validationResults) => {
    const passed = validationResults.filter(v => v.isValid).length
    const failed = validationResults.length - passed
    
    logInfo(`📋 RESUMEN VALIDACIONES: ${passed} exitosas, ${failed} fallidas`, {
      total: validationResults.length,
      passed,
      failed,
      failedValidations: validationResults
        .filter(v => !v.isValid)
        .map(v => ({ field: v.field, error: v.error }))
    })
  }

  // ===============================
  // LOGGING PARA FORMULARIOS
  // ===============================
  
  const logFormDataChange = (field, oldValue, newValue, trigger = null) => {
    logDebug(`📝 FORM CHANGE: ${field}`, {
      field,
      oldValue,
      newValue,
      trigger,
      timestamp: new Date().toISOString()
    })
  }

  const logFormSubmit = (formData, validationResult) => {
    logInfo('📤 FORM SUBMIT', {
      formData,
      validation: validationResult,
      timestamp: new Date().toISOString()
    })
  }

  const logFormError = (field, errorType, errorMessage, formData = null) => {
    logError(`📝 FORM ERROR: ${field}`, {
      field,
      errorType,
      errorMessage,
      formData,
      timestamp: new Date().toISOString()
    })
  }

  // ===============================
  // FUNCIONES DE ANÁLISIS Y REPORTES
  // ===============================
  
  const generateDebugReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalLogs: consoleLogs.value.length,
        logsByLevel: getLogCountByLevel(),
        timeRange: getTimeRange(),
        systemInfo: getSystemInfo()
      },
      recentErrors: getRecentErrors(10),
      transactionLogs: getTransactionLogs(),
      mikrotikOperations: getMikrotikOperations(),
      databaseOperations: getDatabaseOperations(),
      allLogs: consoleLogs.value
    }
    
    return report
  }

  const exportDebugLogs = (format = 'json') => {
    const report = generateDebugReport()
    
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2)
        
      case 'csv':
        return convertLogsToCsv(consoleLogs.value)
        
      case 'txt':
        return convertLogsToText(consoleLogs.value)
        
      default:
        return report
    }
  }

  // ===============================
  // FUNCIONES AUXILIARES INTERNAS
  // ===============================
  
  const addLog = (level, message, data) => {
    const logEntry = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? (typeof data === 'object' ? JSON.parse(JSON.stringify(data)) : data) : null,
      stackTrace: level === 'error' ? new Error().stack : null
    }
    
    consoleLogs.value.push(logEntry)
    
    // Mantener solo los últimos N logs
    if (consoleLogs.value.length > maxLogs.value) {
      consoleLogs.value.shift()
    }
    
    // Enviar a analytics si está habilitado
    if (debugMode.value && shouldSendToAnalytics(level)) {
      sendToAnalytics(logEntry)
    }
  }

  const generateLogId = () => {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const getLogCountByLevel = () => {
    const counts = { debug: 0, info: 0, warn: 0, error: 0 }
    
    consoleLogs.value.forEach(log => {
      if (Object.prototype.hasOwnProperty.call(counts, log.level)) {
        counts[log.level]++
      }
    })
    
    return counts
  }

  const getLastError = () => {
    const errors = consoleLogs.value.filter(log => log.level === 'error')
    return errors.length > 0 ? errors[errors.length - 1] : null
  }

  const getRecentErrors = (count = 5) => {
    return consoleLogs.value
      .filter(log => log.level === 'error')
      .slice(-count)
      .reverse()
  }

  const getTransactionLogs = () => {
    return consoleLogs.value.filter(log => 
      log.message.includes('TRANSACCIÓN') || 
      log.message.includes('PASO:') ||
      log.message.includes('ROLLBACK')
    )
  }

  const getMikrotikOperations = () => {
    return consoleLogs.value.filter(log => 
      log.message.includes('MIKROTIK') ||
      (log.data && log.data.router)
    )
  }

  const getDatabaseOperations = () => {
    return consoleLogs.value.filter(log => 
      log.message.includes('DB ') ||
      (log.data && log.data.table)
    )
  }

  const getTimeRange = () => {
    if (consoleLogs.value.length === 0) return null
    
    const timestamps = consoleLogs.value.map(log => new Date(log.timestamp))
    const earliest = new Date(Math.min(...timestamps))
    const latest = new Date(Math.max(...timestamps))
    
    return {
      earliest: earliest.toISOString(),
      latest: latest.toISOString(),
      duration: latest - earliest
    }
  }

  const getSystemInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    }
  }

  const convertLogsToCsv = (logs) => {
    const headers = ['Timestamp', 'Level', 'Message', 'Data']
    const rows = logs.map(log => [
      log.timestamp,
      log.level,
      log.message,
      log.data ? JSON.stringify(log.data) : ''
    ])
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
  }

  const convertLogsToText = (logs) => {
    return logs.map(log => {
      let line = `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
      if (log.data) {
        line += `\n  Data: ${JSON.stringify(log.data, null, 2)}`
      }
      return line
    }).join('\n\n')
  }

  const shouldSendToAnalytics = (level) => {
    // Solo enviar errores y warnings importantes
    return ['error', 'warn'].includes(level)
  }

  const sendToAnalytics = (logEntry) => {
    // Implementación para enviar logs a sistema de analytics
    // Por ejemplo: Sentry, LogRocket, etc.
    if (window.analytics && typeof window.analytics.track === 'function') {
      window.analytics.track('Debug Log', {
        level: logEntry.level,
        message: logEntry.message,
        timestamp: logEntry.timestamp,
        hasData: !!logEntry.data
      })
    }
  }

  // ===============================
  // FUNCIONES DE FILTROS Y BÚSQUEDA
  // ===============================
  
  const filterLogs = (filters) => {
    let filteredLogs = [...consoleLogs.value]
    
    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level)
    }
    
    if (filters.message) {
      const searchTerm = filters.message.toLowerCase()
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchTerm)
      )
    }
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= fromDate
      )
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= toDate
      )
    }
    
    if (filters.hasData !== undefined) {
      filteredLogs = filteredLogs.filter(log => 
        filters.hasData ? !!log.data : !log.data
      )
    }
    
    return filteredLogs
  }

  const searchLogs = (searchTerm, searchIn = ['message', 'data']) => {
    const term = searchTerm.toLowerCase()
    
    return consoleLogs.value.filter(log => {
      let matches = false
      
      if (searchIn.includes('message')) {
        matches = matches || log.message.toLowerCase().includes(term)
      }
      
      if (searchIn.includes('data') && log.data) {
        const dataStr = JSON.stringify(log.data).toLowerCase()
        matches = matches || dataStr.includes(term)
      }
      
      return matches
    })
  }

  const getLogStats = () => {
    const stats = {
      total: consoleLogs.value.length,
      byLevel: getLogCountByLevel(),
      byHour: {},
      averagePerMinute: 0,
      errorRate: 0
    }
    
    // Estadísticas por hora
    consoleLogs.value.forEach(log => {
      const hour = new Date(log.timestamp).getHours()
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1
    })
    
    // Promedio por minuto
    const timeRange = getTimeRange()
    if (timeRange && timeRange.duration > 0) {
      const minutes = timeRange.duration / (1000 * 60)
      stats.averagePerMinute = Math.round((stats.total / minutes) * 100) / 100
    }
    
    // Tasa de errores
    if (stats.total > 0) {
      stats.errorRate = Math.round((stats.byLevel.error / stats.total) * 10000) / 100
    }
    
    return stats
  }

  // ===============================
  // FUNCIONES PARA ALERTAS AUTOMÁTICAS
  // ===============================
  
  const checkForCriticalPatterns = () => {
    const recentLogs = consoleLogs.value.slice(-20) // Últimos 20 logs
    const criticalPatterns = []
    
    // Patrón: Múltiples errores en corto tiempo
    const recentErrors = recentLogs.filter(log => log.level === 'error')
    if (recentErrors.length >= 3) {
      criticalPatterns.push({
        type: 'MULTIPLE_ERRORS',
        severity: 'HIGH',
        message: `${recentErrors.length} errores en los últimos logs`,
        logs: recentErrors
      })
    }
    
    // Patrón: Errores de Mikrotik repetidos
    const mikrotikErrors = recentErrors.filter(log => 
      log.message.includes('MIKROTIK') || 
      (log.data && log.data.router)
    )
    if (mikrotikErrors.length >= 2) {
      criticalPatterns.push({
        type: 'MIKROTIK_ERRORS',
        severity: 'CRITICAL',
        message: 'Errores repetidos en operaciones de Mikrotik',
        logs: mikrotikErrors
      })
    }
    
    // Patrón: Rollbacks frecuentes
    const rollbackLogs = recentLogs.filter(log => 
      log.message.includes('ROLLBACK')
    )
    if (rollbackLogs.length >= 2) {
      criticalPatterns.push({
        type: 'FREQUENT_ROLLBACKS',
        severity: 'HIGH',
        message: 'Rollbacks frecuentes detectados',
        logs: rollbackLogs
      })
    }
    
    return criticalPatterns
  }

  const alertOnCriticalPatterns = () => {
    const patterns = checkForCriticalPatterns()
    
    patterns.forEach(pattern => {
      logError(`🚨 PATRÓN CRÍTICO DETECTADO: ${pattern.type}`, pattern)
      
      // Aquí podrías enviar notificaciones, emails, etc.
      if (pattern.severity === 'CRITICAL') {
        notifyAdministrator(pattern)
      }
    })
    
    return patterns
  }

  const notifyAdministrator = (pattern) => {
    // Implementación para notificar al administrador
    console.error('🚨 ALERTA CRÍTICA PARA ADMINISTRADOR:', pattern)
    
    // Ejemplo: Enviar a sistema de monitoreo
    if (window.monitoring && typeof window.monitoring.alert === 'function') {
      window.monitoring.alert({
        type: pattern.type,
        severity: pattern.severity,
        message: pattern.message,
        timestamp: new Date().toISOString(),
        logs: pattern.logs
      })
    }
  }

  // ===============================
  // FUNCIONES DE CONTROL
  // ===============================
  
  const toggleDebugMode = () => {
    debugMode.value = !debugMode.value
    logInfo(`🔍 Debug mode ${debugMode.value ? 'ACTIVADO' : 'DESACTIVADO'}`)
    
    if (debugMode.value) {
      logInfo('📊 Sistema de debug inicializado', getSystemInfo())
    }
  }

  const clearLogs = () => {
    const previousCount = consoleLogs.value.length
    consoleLogs.value = []
    logInfo(`🧹 Logs limpiados (${previousCount} logs eliminados)`)
  }

  const setMaxLogs = (newMax) => {
    maxLogs.value = newMax
    
    // Recortar logs existentes si es necesario
    if (consoleLogs.value.length > newMax) {
      const removed = consoleLogs.value.length - newMax
      consoleLogs.value = consoleLogs.value.slice(-newMax)
      logInfo(`📏 Límite de logs actualizado a ${newMax} (${removed} logs removidos)`)
    }
  }

  const pauseLogging = () => {
    // Implementación para pausar temporalmente el logging
    // Útil durante operaciones de alto volumen
  }

  const resumeLogging = () => {
    // Reanudar logging
  }

  // ===============================
  // AUTO-MONITORING
  // ===============================
  
  // Ejecutar verificación de patrones críticos cada 30 segundos
  setInterval(() => {
    if (debugMode.value) {
      alertOnCriticalPatterns()
    }
  }, 30000)

  // ===============================
  // RETURN
  // ===============================
  
  return {
    // Estados
    debugMode,
    consoleLogs,
    debugInfo,
    maxLogs,
    
    // Funciones principales de logging
    logDebug,
    logInfo,
    logWarn,
    logError,
    
    // Logging específico
    logTransactionStart,
    logTransactionStep,
    logMikrotikOperation,
    logDatabaseOperation,
    logSyncOperation,
    logRollbackOperation,
    logValidation,
    logValidationSummary,
    logFormDataChange,
    logFormSubmit,
    logFormError,
    
    // Análisis y reportes
    generateDebugReport,
    exportDebugLogs,
    getLogStats,
    filterLogs,
    searchLogs,
    
    // Alertas y monitoreo
    checkForCriticalPatterns,
    alertOnCriticalPatterns,
    
    // Control
    toggleDebugMode,
    clearLogs,
    setMaxLogs,
    pauseLogging,
    resumeLogging
  }
}