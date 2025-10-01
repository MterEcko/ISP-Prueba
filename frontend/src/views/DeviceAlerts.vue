<template>
  <div class="device-alerts">
    <div class="header">
      <h2>Alertas y Notificaciones - {{ device.name }}</h2>
      <div class="actions">
        <button @click="refreshAlerts" class="refresh-button" :disabled="loading">
          🔄 Actualizar
        </button>
        <button @click="showCreateAlert" class="create-button">
          + Nueva Alerta
        </button>
        <button @click="markAllAsRead" class="mark-read-button" v-if="unreadCount > 0">
          ✓ Marcar Todo Leído
        </button>
        <button @click="goBack" class="back-button">
          ← Volver
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando alertas...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="alerts-content">
      <!-- Información del Dispositivo -->
      <div class="device-info-card">
        <div class="device-header">
          <div class="device-icon">{{ getBrandIcon(device.brand) }}</div>
          <div class="device-details">
            <h3>{{ device.name }}</h3>
            <div class="device-meta">
              <span class="brand">{{ device.brand?.toUpperCase() }}</span>
              <span class="type">{{ device.type?.toUpperCase() }}</span>
              <span class="ip">{{ device.ipAddress }}</span>
            </div>
          </div>
          <div class="alert-summary">
            <div class="alert-count critical">
              <span class="count">{{ alertCounts.critical }}</span>
              <span class="label">Críticas</span>
            </div>
            <div class="alert-count warning">
              <span class="count">{{ alertCounts.warning }}</span>
              <span class="label">Advertencias</span>
            </div>
            <div class="alert-count info">
              <span class="count">{{ alertCounts.info }}</span>
              <span class="label">Información</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Estadísticas de Alertas -->
      <div class="alert-stats">
        <div class="stat-card">
          <div class="stat-icon">🚨</div>
          <div class="stat-content">
            <div class="stat-value">{{ alertCounts.total }}</div>
            <div class="stat-label">Total de Alertas</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📬</div>
          <div class="stat-content">
            <div class="stat-value">{{ unreadCount }}</div>
            <div class="stat-label">Sin Leer</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">{{ alertCounts.resolved }}</div>
            <div class="stat-label">Resueltas</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <div class="stat-value">{{ averageResponseTime }}</div>
            <div class="stat-label">Tiempo Promedio</div>
          </div>
        </div>
      </div>
      
      <!-- Filtros y Controles -->
      <div class="alert-controls">
        <div class="filters">
          <div class="filter-group">
            <label>Severidad:</label>
            <select v-model="selectedSeverity" @change="filterAlerts">
              <option value="">Todas las severidades</option>
              <option value="critical">Crítica</option>
              <option value="warning">Advertencia</option>
              <option value="info">Información</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Estado:</label>
            <select v-model="selectedStatus" @change="filterAlerts">
              <option value="">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="acknowledged">Reconocidas</option>
              <option value="resolved">Resueltas</option>
              <option value="muted">Silenciadas</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Categoría:</label>
            <select v-model="selectedCategory" @change="filterAlerts">
              <option value="">Todas las categorías</option>
              <option value="connectivity">Conectividad</option>
              <option value="performance">Rendimiento</option>
              <option value="security">Seguridad</option>
              <option value="hardware">Hardware</option>
              <option value="configuration">Configuración</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Período:</label>
            <select v-model="selectedPeriod" @change="loadAlerts">
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="all">Todas</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Búsqueda:</label>
            <input 
              type="text" 
              v-model="searchQuery" 
              @input="filterAlerts"
              placeholder="Buscar alertas..."
            />
          </div>
        </div>
        
        <div class="view-options">
          <button 
            @click="viewMode = 'list'" 
            :class="{ active: viewMode === 'list' }"
            class="view-btn"
          >
            📋 Lista
          </button>
          <button 
            @click="viewMode = 'timeline'" 
            :class="{ active: viewMode === 'timeline' }"
            class="view-btn"
          >
            📅 Cronología
          </button>
          <button 
            @click="viewMode = 'chart'" 
            :class="{ active: viewMode === 'chart' }"
            class="view-btn"
          >
            📈 Gráficos
          </button>
        </div>
      </div>
      
      <!-- Vista de Lista -->
      <div v-if="viewMode === 'list'" class="alerts-list">
        <div 
          class="alert-card" 
          v-for="alert in filteredAlerts" 
          :key="alert.id"
          :class="[
            'severity-' + alert.severity,
            'status-' + alert.status,
            { 'unread': !alert.read }
          ]"
        >
          <div class="alert-header">
            <div class="alert-info">
              <div class="alert-severity">
                <span :class="['severity-icon', alert.severity]">
                  {{ getSeverityIcon(alert.severity) }}
                </span>
                <span class="severity-text">{{ getSeverityText(alert.severity) }}</span>
              </div>
              <div class="alert-category">{{ getCategoryText(alert.category) }}</div>
            </div>
            
            <div class="alert-meta">
              <div class="alert-time">{{ formatDate(alert.createdAt) }}</div>
              <div class="alert-status">
                <span :class="['status-badge', alert.status]">
                  {{ getStatusText(alert.status) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="alert-content">
            <h4 class="alert-title">{{ alert.title }}</h4>
            <p class="alert-description">{{ alert.description }}</p>
            
            <div v-if="alert.metrics" class="alert-metrics">
              <div class="metric-item" v-for="(value, key) in alert.metrics" :key="key">
                <span class="metric-label">{{ getMetricLabel(key) }}:</span>
                <span class="metric-value">{{ value }}</span>
              </div>
            </div>
            
            <div v-if="alert.recommendation" class="alert-recommendation">
              <strong>Recomendación:</strong> {{ alert.recommendation }}
            </div>
          </div>
          
          <div class="alert-actions">
            <button 
              v-if="!alert.read" 
              @click="markAsRead(alert)" 
              class="action-btn read-btn"
              title="Marcar como leída"
            >
              👁️ Leer
            </button>
            
            <button 
              v-if="alert.status === 'active'" 
              @click="acknowledgeAlert(alert)" 
              class="action-btn ack-btn"
              title="Reconocer alerta"
            >
              ✋ Reconocer
            </button>
            
            <button 
              v-if="alert.status !== 'resolved'" 
              @click="resolveAlert(alert)" 
              class="action-btn resolve-btn"
              title="Resolver alerta"
            >
              ✅ Resolver
            </button>
            
            <button 
              v-if="alert.status !== 'muted'" 
              @click="muteAlert(alert)" 
              class="action-btn mute-btn"
              title="Silenciar alerta"
            >
              🔇 Silenciar
            </button>
            
            <button 
              @click="showAlertDetails(alert)" 
              class="action-btn detail-btn"
              title="Ver detalles"
            >
              📋 Detalles
            </button>
            
            <button 
              @click="deleteAlert(alert)" 
              class="action-btn delete-btn"
              title="Eliminar alerta"
            >
              🗑️ Eliminar
            </button>
          </div>
          
          <div v-if="alert.resolvedAt" class="alert-resolution">
            <div class="resolution-info">
              <strong>Resuelto:</strong> {{ formatDate(alert.resolvedAt) }}
              <span v-if="alert.resolvedBy"> por {{ alert.resolvedBy }}</span>
            </div>
            <div v-if="alert.resolutionNotes" class="resolution-notes">
              <strong>Notas:</strong> {{ alert.resolutionNotes }}
            </div>
          </div>
        </div>
        
        <div v-if="filteredAlerts.length === 0" class="no-alerts">
          No se encontraron alertas para los filtros seleccionados.
        </div>
      </div>
      
      <!-- Vista de Cronología -->
      <div v-if="viewMode === 'timeline'" class="timeline-view">
        <div class="timeline-container">
          <div 
            class="timeline-item" 
            v-for="alert in filteredAlerts" 
            :key="alert.id"
          >
            <div class="timeline-marker">
              <div :class="['timeline-dot', alert.severity]"></div>
            </div>
            
            <div class="timeline-content">
              <div class="timeline-header">
                <div class="timeline-title">{{ alert.title }}</div>
                <div class="timeline-time">{{ formatDate(alert.createdAt) }}</div>
              </div>
              
              <div class="timeline-description">{{ alert.description }}</div>
              
              <div class="timeline-tags">
                <span :class="['tag', 'severity', alert.severity]">
                  {{ getSeverityText(alert.severity) }}
                </span>
                <span class="tag category">{{ getCategoryText(alert.category) }}</span>
                <span :class="['tag', 'status', alert.status]">
                  {{ getStatusText(alert.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Vista de Gráficos -->
      <div v-if="viewMode === 'chart'" class="chart-view">
        <div class="charts-container">
          <div class="chart-card">
            <h4>📊 Alertas por Severidad</h4>
            <div class="chart-wrapper">
              <canvas ref="severityChart" class="alert-chart"></canvas>
            </div>
          </div>
          
          <div class="chart-card">
            <h4>📈 Alertas en el Tiempo</h4>
            <div class="chart-wrapper">
              <canvas ref="timeChart" class="alert-chart"></canvas>
            </div>
          </div>
          
          <div class="chart-card">
            <h4>📋 Alertas por Categoría</h4>
            <div class="chart-wrapper">
              <canvas ref="categoryChart" class="alert-chart"></canvas>
            </div>
          </div>
          
          <div class="chart-card">
            <h4>⏱️ Tiempo de Resolución</h4>
            <div class="chart-wrapper">
              <canvas ref="resolutionChart" class="alert-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Configuración de Alertas -->
      <div class="alert-configuration">
        <h3>Configuración de Alertas</h3>
        
        <div class="config-cards">
          <div class="config-card">
            <h4>🔔 Reglas de Alerta</h4>
            <div class="rule-list">
              <div 
                v-for="rule in alertRules" 
                :key="rule.id"
                class="rule-item"
              >
                <div class="rule-info">
                  <div class="rule-name">{{ rule.name }}</div>
                  <div class="rule-condition">{{ rule.condition }}</div>
                </div>
                <div class="rule-actions">
                  <button @click="editRule(rule)" class="edit-rule-btn">✏️</button>
                  <button @click="toggleRule(rule)" class="toggle-rule-btn">
                    {{ rule.enabled ? '🔴' : '🟢' }}
                  </button>
                </div>
              </div>
            </div>
            <button @click="showCreateRule" class="add-rule-btn">+ Agregar Regla</button>
          </div>
          
          <div class="config-card">
            <h4>📬 Canales de Notificación</h4>
            <div class="channel-list">
              <div 
                v-for="channel in notificationChannels" 
                :key="channel.id"
                class="channel-item"
              >
                <div class="channel-info">
                  <div class="channel-name">{{ channel.name }}</div>
                  <div class="channel-type">{{ channel.type }}</div>
                </div>
                <div class="channel-toggle">
                  <input 
                    type="checkbox" 
                    v-model="channel.enabled"
                    @change="updateChannel(channel)"
                  />
                </div>
              </div>
            </div>
            <button @click="showAddChannel" class="add-channel-btn">+ Agregar Canal</button>
          </div>
          
          <div class="config-card">
            <h4>⚙️ Configuración General</h4>
            <div class="general-settings">
              <div class="setting-item">
                <label>Retención de Alertas (días):</label>
                <input 
                  type="number" 
                  v-model="generalSettings.retentionDays"
                  @change="updateGeneralSettings"
                  min="1"
                  max="365"
                />
              </div>
              
              <div class="setting-item">
                <label>Agrupar Alertas Similares:</label>
                <input 
                  type="checkbox" 
                  v-model="generalSettings.groupSimilar"
                  @change="updateGeneralSettings"
                />
              </div>
              
              <div class="setting-item">
                <label>Auto-resolver después de (horas):</label>
                <input 
                  type="number" 
                  v-model="generalSettings.autoResolveHours"
                  @change="updateGeneralSettings"
                  min="0"
                  max="168"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal de Detalles de Alerta -->
    <div v-if="showDetailsModal" class="modal" @click="closeDetailsModal">
      <div class="modal-content large" @click.stop>
        <h3>Detalles de la Alerta</h3>
        
        <div v-if="selectedAlert" class="alert-details-modal">
          <div class="detail-section">
            <h4>Información General</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Título:</span>
                <span>{{ selectedAlert.title }}</span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">Severidad:</span>
                <span :class="['severity-badge', selectedAlert.severity]">
                  {{ getSeverityIcon(selectedAlert.severity) }} {{ getSeverityText(selectedAlert.severity) }}
                </span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">Estado:</span>
                <span :class="['status-badge', selectedAlert.status]">
                  {{ getStatusText(selectedAlert.status) }}
                </span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">Categoría:</span>
                <span>{{ getCategoryText(selectedAlert.category) }}</span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">Creada:</span>
                <span>{{ formatDate(selectedAlert.createdAt) }}</span>
              </div>
              
              <div class="detail-item" v-if="selectedAlert.resolvedAt">
                <span class="detail-label">Resuelta:</span>
                <span>{{ formatDate(selectedAlert.resolvedAt) }}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Descripción</h4>
            <p>{{ selectedAlert.description }}</p>
          </div>
          
          <div v-if="selectedAlert.metrics" class="detail-section">
            <h4>Métricas</h4>
            <div class="metrics-grid">
              <div v-for="(value, key) in selectedAlert.metrics" :key="key" class="metric-card">
                <div class="metric-label">{{ getMetricLabel(key) }}</div>
                <div class="metric-value">{{ value }}</div>
              </div>
            </div>
          </div>
          
          <div v-if="selectedAlert.recommendation" class="detail-section">
            <h4>Recomendación</h4>
            <p>{{ selectedAlert.recommendation }}</p>
          </div>
          
          <div v-if="selectedAlert.history?.length > 0" class="detail-section">
            <h4>Historial de Acciones</h4>
            <div class="history-list">
              <div v-for="action in selectedAlert.history" :key="action.id" class="history-item">
                <div class="history-time">{{ formatDate(action.timestamp) }}</div>
                <div class="history-action">{{ action.action }}</div>
                <div class="history-user">{{ action.user }}</div>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Acciones</h4>
            <div class="modal-alert-actions">
              <button 
                v-if="selectedAlert.status === 'active'" 
                @click="acknowledgeAlert(selectedAlert)" 
                class="action-btn ack-btn"
              >
                ✋ Reconocer
              </button>
              
              <button 
                v-if="selectedAlert.status !== 'resolved'" 
                @click="resolveAlert(selectedAlert)" 
                class="action-btn resolve-btn"
              >
                ✅ Resolver
              </button>
              
              <button 
                @click="showResolveForm" 
                class="action-btn resolve-form-btn"
              >
                📝 Resolver con Notas
              </button>
              
              <button 
                @click="muteAlert(selectedAlert)" 
                class="action-btn mute-btn"
              >
                🔇 Silenciar
              </button>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeDetailsModal">Cerrar</button>
        </div>
      </div>
    </div>
    
    <!-- Modal de Resolución con Notas -->
    <div v-if="showResolveModal" class="modal" @click="closeResolveModal">
      <div class="modal-content" @click.stop>
        <h3>Resolver Alerta</h3>
        
        <div class="resolve-form">
          <div class="form-group">
            <label>Notas de Resolución:</label>
            <textarea 
              v-model="resolutionNotes"
              rows="4"
              placeholder="Describa cómo se resolvió la alerta..."
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>Causa Raíz:</label>
            <select v-model="rootCause">
              <option value="">Seleccionar causa</option>
              <option value="hardware">Problema de Hardware</option>
              <option value="software">Problema de Software</option>
              <option value="network">Problema de Red</option>
              <option value="configuration">Error de Configuración</option>
              <option value="external">Factor Externo</option>
              <option value="false_positive">Falso Positivo</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="preventRecurrence" />
              Implementar medidas preventivas
            </label>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeResolveModal" class="cancel-btn">Cancelar</button>
          <button @click="resolveWithNotes" class="resolve-btn">Resolver</button>
        </div>
      </div>
    </div>
    
    <!-- Modal de Nueva Alerta -->
    <div v-if="showCreateModal" class="modal" @click="closeCreateModal">
      <div class="modal-content" @click.stop>
        <h3>Crear Nueva Alerta</h3>
        
        <div class="create-form">
          <div class="form-group">
            <label>Título:</label>
            <input type="text" v-model="newAlert.title" placeholder="Título de la alerta" />
          </div>
          
          <div class="form-group">
            <label>Descripción:</label>
            <textarea v-model="newAlert.description" rows="3" placeholder="Descripción detallada"></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Severidad:</label>
              <select v-model="newAlert.severity">
                <option value="info">Información</option>
                <option value="warning">Advertencia</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Categoría:</label>
              <select v-model="newAlert.category">
                <option value="connectivity">Conectividad</option>
                <option value="performance">Rendimiento</option>
                <option value="security">Seguridad</option>
                <option value="hardware">Hardware</option>
                <option value="configuration">Configuración</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Recomendación:</label>
            <textarea v-model="newAlert.recommendation" rows="2" placeholder="Recomendación para resolver"></textarea>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeCreateModal" class="cancel-btn">Cancelar</button>
          <button @click="createAlert" class="create-btn">Crear Alerta</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import DeviceService from '../services/device.service';
import Chart from 'chart.js/auto';

export default {
  name: 'DeviceAlerts',
  data() {
    return {
      device: {},
      alerts: [],
      filteredAlerts: [],
      alertCounts: {
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
        resolved: 0
      },
      alertRules: [],
      notificationChannels: [],
      generalSettings: {
        retentionDays: 30,
        groupSimilar: true,
        autoResolveHours: 24
      },
      loading: true,
      error: null,
      viewMode: 'list',
      selectedSeverity: '',
      selectedStatus: '',
      selectedCategory: '',
      selectedPeriod: '7d',
      searchQuery: '',
      showDetailsModal: false,
      showResolveModal: false,
      showCreateModal: false,
      selectedAlert: null,
      resolutionNotes: '',
      rootCause: '',
      preventRecurrence: false,
      newAlert: {
        title: '',
        description: '',
        severity: 'warning',
        category: 'connectivity',
        recommendation: ''
      },
      charts: {}
    };
  },
  computed: {
    unreadCount() {
      return this.alerts.filter(alert => !alert.read).length;
    },
    
    averageResponseTime() {
      const resolvedAlerts = this.alerts.filter(alert => alert.resolvedAt);
      if (resolvedAlerts.length === 0) return '0h';
      
      const totalTime = resolvedAlerts.reduce((total, alert) => {
        const created = new Date(alert.createdAt);
        const resolved = new Date(alert.resolvedAt);
        return total + (resolved - created);
      }, 0);
      
      const avgMs = totalTime / resolvedAlerts.length;
      const avgHours = Math.round(avgMs / (1000 * 60 * 60));
      return `${avgHours}h`;
    }
  },
  created() {
    this.loadDevice();
  },
  beforeUnmount() {
    this.destroyCharts();
  },
  methods: {
    async loadDevice() {
      this.loading = true;
      try {
        const deviceId = this.$route.params.deviceId;
        const response = await DeviceService.getDevice(deviceId);
        this.device = response.data;
        
        await Promise.all([
          this.loadAlerts(),
          this.loadAlertRules(),
          this.loadNotificationChannels()
        ]);
      } catch (error) {
        console.error('Error cargando dispositivo:', error);
        this.error = 'Error cargando información del dispositivo.';
      } finally {
        this.loading = false;
      }
    },
    
    async loadAlerts() {
      try {
        this.alerts = this.generateMockAlerts();
        this.calculateAlertCounts();
        this.filterAlerts();
        
        if (this.viewMode === 'chart') {
          this.$nextTick(() => {
            this.createCharts();
          });
        }
      } catch (error) {
        console.error('Error cargando alertas:', error);
        this.error = 'Error cargando alertas del dispositivo.';
      }
    },
    
    generateMockAlerts() {
      const severities = ['critical', 'warning', 'info'];
      const statuses = ['active', 'acknowledged', 'resolved', 'muted'];
      const categories = ['connectivity', 'performance', 'security', 'hardware', 'configuration'];
      
      const alerts = [];
      const now = new Date();
      
      for (let i = 0; i < 25; i++) {
        const createdAt = new Date(now.getTime() - (i * 3600000));
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const category = categories[Math.floor(Math.random() * categories.length)];
        
        alerts.push({
          id: i + 1,
          title: this.getAlertTitle(category, severity),
          description: this.getAlertDescription(category),
          severity,
          status,
          category,
          createdAt,
          read: Math.random() > 0.3,
          resolvedAt: status === 'resolved' ? new Date(createdAt.getTime() + Math.random() * 86400000) : null,
          resolvedBy: status === 'resolved' ? 'Admin' : null,
          resolutionNotes: status === 'resolved' ? 'Problema resuelto reiniciando el servicio' : null,
          recommendation: this.getRecommendation(category),
          metrics: this.getAlertMetrics(category),
          history: this.generateAlertHistory()
        });
      }
      
      return alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    
    getAlertTitle(category, severity) {
      const titles = {
        connectivity: {
          critical: 'Pérdida total de conectividad',
          warning: 'Conectividad intermitente detectada',
          info: 'Verificación de conectividad programada'
        },
        performance: {
          critical: 'Rendimiento crítico del dispositivo',
          warning: 'Degradación del rendimiento',
          info: 'Métricas de rendimiento actualizadas'
        },
        security: {
          critical: 'Brecha de seguridad detectada',
          warning: 'Intento de acceso no autorizado',
          info: 'Actualización de políticas de seguridad'
        },
        hardware: {
          critical: 'Falla crítica de hardware',
          warning: 'Componente de hardware degradado',
          info: 'Estado del hardware verificado'
        },
        configuration: {
          critical: 'Error crítico de configuración',
          warning: 'Configuración subóptima detectada',
          info: 'Configuración actualizada'
        }
      };
      return titles[category][severity];
    },
    
    getAlertDescription(category) {
      const descriptions = {
        connectivity: 'El dispositivo presenta problemas de conectividad que afectan su operación normal.',
        performance: 'Se han detectado métricas de rendimiento fuera de los parámetros normales.',
        security: 'Se ha identificado una situación que podría comprometer la seguridad del dispositivo.',
        hardware: 'Los componentes de hardware muestran signos de degradación o falla.',
        configuration: 'La configuración actual del dispositivo requiere atención.'
      };
      return descriptions[category];
    },
    
    getRecommendation(category) {
      const recommendations = {
        connectivity: 'Verificar cables de red y configuración de conectividad.',
        performance: 'Revisar uso de CPU y memoria. Considerar reinicio si es necesario.',
        security: 'Cambiar credenciales y revisar logs de acceso.',
        hardware: 'Realizar diagnóstico de hardware y planificar reemplazo si es necesario.',
        configuration: 'Revisar y corregir la configuración del dispositivo.'
      };
      return recommendations[category];
    },
    
    getAlertMetrics(category) {
      const metrics = {
        connectivity: { latency: Math.floor(Math.random() * 100) + 'ms', packetLoss: Math.floor(Math.random() * 10) + '%' },
        performance: { cpuUsage: Math.floor(Math.random() * 100) + '%', memoryUsage: Math.floor(Math.random() * 100) + '%' },
        security: { failedAttempts: Math.floor(Math.random() * 10), lastAttempt: '10 min ago' },
        hardware: { temperature: Math.floor(Math.random() * 30) + 40 + '°C', uptime: Math.floor(Math.random() * 100) + ' days' },
        configuration: { lastChanged: '2 hours ago', changedBy: 'Admin' }
      };
      return metrics[category];
    },
    
    generateAlertHistory() {
      const actions = ['Created', 'Acknowledged', 'Assigned', 'Updated', 'Resolved'];
      const history = [];
      const now = new Date();
      
      for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
        history.push({
          id: i,
          timestamp: new Date(now.getTime() - (i * 1800000)),
          action: actions[i % actions.length],
          user: 'Admin'
        });
      }
      
      return history.reverse();
    },
    
    async loadAlertRules() {
      this.alertRules = [
        {
          id: 1,
          name: 'CPU Alto',
          condition: 'CPU > 80% por 5 minutos',
          enabled: true
        },
        {
          id: 2,
          name: 'Conectividad Perdida',
          condition: 'Ping timeout > 30 segundos',
          enabled: true
        },
        {
          id: 3,
          name: 'Memoria Alta',
          condition: 'Memoria > 90% por 10 minutos',
          enabled: false
        }
      ];
    },
    
    async loadNotificationChannels() {
      this.notificationChannels = [
        {
          id: 1,
          name: 'Email Administrativo',
          type: 'Email',
          enabled: true
        },
        {
          id: 2,
          name: 'Telegram Técnico',
          type: 'Telegram',
          enabled: true
        },
        {
          id: 3,
          name: 'WhatsApp Emergencias',
          type: 'WhatsApp',
          enabled: false
        }
      ];
    },
    
    calculateAlertCounts() {
      this.alertCounts = {
        total: this.alerts.length,
        critical: this.alerts.filter(a => a.severity === 'critical').length,
        warning: this.alerts.filter(a => a.severity === 'warning').length,
        info: this.alerts.filter(a => a.severity === 'info').length,
        resolved: this.alerts.filter(a => a.status === 'resolved').length
      };
    },
    
    filterAlerts() {
      let filtered = [...this.alerts];
      
      if (this.selectedSeverity) {
        filtered = filtered.filter(alert => alert.severity === this.selectedSeverity);
      }
      
      if (this.selectedStatus) {
        filtered = filtered.filter(alert => alert.status === this.selectedStatus);
      }
      
      if (this.selectedCategory) {
        filtered = filtered.filter(alert => alert.category === this.selectedCategory);
      }
      
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(alert => 
          alert.title.toLowerCase().includes(query) ||
          alert.description.toLowerCase().includes(query)
        );
      }
      
      this.filteredAlerts = filtered;
    },
    
    createCharts() {
      this.createSeverityChart();
      this.createTimeChart();
      this.createCategoryChart();
      this.createResolutionChart();
    },
    
    createSeverityChart() {
      const ctx = this.$refs.severityChart;
      if (!ctx) return;
      
      if (this.charts.severity) {
        this.charts.severity.destroy();
      }
      
      this.charts.severity = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Críticas', 'Advertencias', 'Información'],
          datasets: [{
            data: [this.alertCounts.critical, this.alertCounts.warning, this.alertCounts.info],
            backgroundColor: ['#dc3545', '#ffc107', '#17a2b8']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    },
    
    createTimeChart() {
      const ctx = this.$refs.timeChart;
      if (!ctx) return;
      
      if (this.charts.time) {
        this.charts.time.destroy();
      }
      
      const last24Hours = [];
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
        const alertsInHour = this.alerts.filter(alert => {
          const alertHour = new Date(alert.createdAt).getHours();
          return alertHour === hour.getHours();
        }).length;
        
        last24Hours.push({
          time: hour.getHours() + ':00',
          count: alertsInHour
        });
      }
      
      this.charts.time = new Chart(ctx, {
        type: 'line',
        data: {
          labels: last24Hours.map(h => h.time),
          datasets: [{
            label: 'Alertas por Hora',
            data: last24Hours.map(h => h.count),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    },
    
    createCategoryChart() {
      const ctx = this.$refs.categoryChart;
      if (!ctx) return;
      
      if (this.charts.category) {
        this.charts.category.destroy();
      }
      
      const categories = ['connectivity', 'performance', 'security', 'hardware', 'configuration'];
      const categoryCounts = categories.map(cat => 
        this.alerts.filter(alert => alert.category === cat).length
      );
      
      this.charts.category = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: categories.map(cat => this.getCategoryText(cat)),
          datasets: [{
            label: 'Alertas por Categoría',
            data: categoryCounts,
            backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#6f42c1', '#17a2b8']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    },
    
    createResolutionChart() {
      const ctx = this.$refs.resolutionChart;
      if (!ctx) return;
      
      if (this.charts.resolution) {
        this.charts.resolution.destroy();
      }
      
      const resolvedAlerts = this.alerts.filter(alert => alert.resolvedAt);
      const resolutionTimes = resolvedAlerts.map(alert => {
        const created = new Date(alert.createdAt);
        const resolved = new Date(alert.resolvedAt);
        return Math.round((resolved - created) / (1000 * 60 * 60)); // horas
      });
      
      const timeRanges = ['0-1h', '1-4h', '4-12h', '12-24h', '24h+'];
      const rangeCounts = [
        resolutionTimes.filter(t => t <= 1).length,
        resolutionTimes.filter(t => t > 1 && t <= 4).length,
        resolutionTimes.filter(t => t > 4 && t <= 12).length,
        resolutionTimes.filter(t => t > 12 && t <= 24).length,
        resolutionTimes.filter(t => t > 24).length
      ];
      
      this.charts.resolution = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: timeRanges,
          datasets: [{
            label: 'Tiempo de Resolución',
            data: rangeCounts,
            backgroundColor: '#28a745'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    },
    
    destroyCharts() {
      Object.values(this.charts).forEach(chart => {
        if (chart) chart.destroy();
      });
      this.charts = {};
    },
    
    async markAsRead(alert) {
      alert.read = true;
      // Aquí iría la llamada a la API para marcar como leída
    },
    
    async markAllAsRead() {
      this.alerts.forEach(alert => {
        alert.read = true;
      });
      // Aquí iría la llamada a la API para marcar todas como leídas
    },
    
    async acknowledgeAlert(alert) {
      alert.status = 'acknowledged';
      // Aquí iría la llamada a la API para reconocer la alerta
    },
    
    async resolveAlert(alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolvedBy = 'Admin';
      this.calculateAlertCounts();
      // Aquí iría la llamada a la API para resolver la alerta
    },
    
    async muteAlert(alert) {
      alert.status = 'muted';
      // Aquí iría la llamada a la API para silenciar la alerta
    },
    
    async deleteAlert(alert) {
      if (confirm('¿Está seguro de eliminar esta alerta?')) {
        const index = this.alerts.findIndex(a => a.id === alert.id);
        if (index > -1) {
          this.alerts.splice(index, 1);
          this.calculateAlertCounts();
          this.filterAlerts();
        }
        // Aquí iría la llamada a la API para eliminar la alerta
      }
    },
    
    showAlertDetails(alert) {
      this.selectedAlert = alert;
      this.showDetailsModal = true;
    },
    
    closeDetailsModal() {
      this.showDetailsModal = false;
      this.selectedAlert = null;
    },
    
    showResolveForm() {
      this.showResolveModal = true;
    },
    
    closeResolveModal() {
      this.showResolveModal = false;
      this.resolutionNotes = '';
      this.rootCause = '';
      this.preventRecurrence = false;
    },
    
    async resolveWithNotes() {
      if (this.selectedAlert) {
        this.selectedAlert.status = 'resolved';
        this.selectedAlert.resolvedAt = new Date();
        this.selectedAlert.resolvedBy = 'Admin';
        this.selectedAlert.resolutionNotes = this.resolutionNotes;
        this.selectedAlert.rootCause = this.rootCause;
        
        this.calculateAlertCounts();
        this.closeResolveModal();
        // Aquí iría la llamada a la API para resolver con notas
      }
    },
    
    showCreateAlert() {
      this.showCreateModal = true;
    },
    
    closeCreateModal() {
      this.showCreateModal = false;
      this.newAlert = {
        title: '',
        description: '',
        severity: 'warning',
        category: 'connectivity',
        recommendation: ''
      };
    },
    
    async createAlert() {
      const alert = {
        id: Date.now(),
        ...this.newAlert,
        status: 'active',
        createdAt: new Date(),
        read: false,
        metrics: this.getAlertMetrics(this.newAlert.category),
        history: [{ id: 1, timestamp: new Date(), action: 'Created', user: 'Admin' }]
      };
      
      this.alerts.unshift(alert);
      this.calculateAlertCounts();
      this.filterAlerts();
      this.closeCreateModal();
      // Aquí iría la llamada a la API para crear la alerta
    },
    
    async refreshAlerts() {
      await this.loadAlerts();
    },
    
    editRule(rule) {
      // Implementar edición de reglas
      console.log('Edit rule:', rule);
    },
    
    toggleRule(rule) {
      rule.enabled = !rule.enabled;
      // Aquí iría la llamada a la API para actualizar la regla
    },
    
    showCreateRule() {
      // Implementar creación de reglas
      console.log('Create new rule');
    },
    
    updateChannel(channel) {
      // Aquí iría la llamada a la API para actualizar el canal
      console.log('Update channel:', channel);
    },
    
    showAddChannel() {
      // Implementar agregar canal
      console.log('Add new channel');
    },
    
    updateGeneralSettings() {
      // Aquí iría la llamada a la API para actualizar configuración general
      console.log('Update general settings:', this.generalSettings);
    },
    
    getBrandIcon(brand) {
      const icons = {
        mikrotik: '🔧',
        ubiquiti: '📡',
        tplink: '🌐',
        cambium: '📶',
        mimosa: '🎯'
      };
      return icons[brand] || '🔌';
    },
    
    getSeverityIcon(severity) {
      const icons = {
        critical: '🔴',
        warning: '🟡',
        info: '🔵'
      };
      return icons[severity] || '⚪';
    },
    
    getSeverityText(severity) {
      const texts = {
        critical: 'Crítica',
        warning: 'Advertencia',
        info: 'Información'
      };
      return texts[severity] || 'Desconocido';
    },
    
    getStatusText(status) {
      const texts = {
        active: 'Activa',
        acknowledged: 'Reconocida',
        resolved: 'Resuelta',
        muted: 'Silenciada'
      };
      return texts[status] || 'Desconocido';
    },
    
    getCategoryText(category) {
      const texts = {
        connectivity: 'Conectividad',
        performance: 'Rendimiento',
        security: 'Seguridad',
        hardware: 'Hardware',
        configuration: 'Configuración'
      };
      return texts[category] || 'Desconocido';
    },
    
    getMetricLabel(key) {
      const labels = {
        latency: 'Latencia',
        packetLoss: 'Pérdida de Paquetes',
        cpuUsage: 'Uso de CPU',
        memoryUsage: 'Uso de Memoria',
        temperature: 'Temperatura',
        uptime: 'Tiempo Activo',
        failedAttempts: 'Intentos Fallidos',
        lastAttempt: 'Último Intento',
        lastChanged: 'Último Cambio',
        changedBy: 'Cambiado por'
      };
      return labels[key] || key;
    },
    
    formatDate(dateString) {
      if (!dateString) return 'No disponible';
      
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    goBack() {
      this.$router.push(`/devices/${this.device.id}`);
    }
  }
};
</script>
<style scoped>
.device-alerts {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 10px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.refresh-button {
  background-color: #28a745;
  color: white;
}

.create-button {
  background-color: #007bff;
  color: white;
}

.mark-read-button {
  background-color: #6c757d;
  color: white;
}

.back-button {
  background-color: #e0e0e0;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #f44336;
}

.alerts-content {
  display: grid;
  gap: 20px;
}

.device-info-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.device-header {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.device-icon {
  font-size: 2rem;
}

.device-details h3 {
  margin: 0 0 5px 0;
  color: #333;
}

.device-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.brand, .type, .ip {
  font-size: 0.8em;
  padding: 2px 6px;
  border-radius: 3px;
  background: #f8f9fa;
  color: #495057;
}

.alert-summary {
  display: flex;
  gap: 15px;
  margin-left: auto;
}

.alert-count {
  text-align: center;
  padding: 8px 12px;
  border-radius: 6px;
  min-width: 60px;
}

.alert-count.critical {
  background: #ffebee;
  color: #c62828;
}

.alert-count.warning {
  background: #fff8e1;
  color: #f57c00;
}

.alert-count.info {
  background: #e3f2fd;
  color: #1976d2;
}

.alert-count .count {
  display: block;
  font-size: 1.2em;
  font-weight: bold;
}

.alert-count .label {
  font-size: 0.8em;
}

.alert-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  font-size: 2rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.8em;
  font-weight: bold;
  color: #333;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 0.9em;
  color: #666;
}

.alert-controls {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 15px;
}

.filters {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-weight: 500;
  color: #666;
  white-space: nowrap;
}

.filter-group select,
.filter-group input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 120px;
}

.view-options {
  display: flex;
  gap: 5px;
}

.view-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.view-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

/* Alerts List */
.alerts-list {
  display: grid;
  gap: 15px;
}

.alert-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid transparent;
}

.alert-card.severity-critical {
  border-left-color: #dc3545;
}

.alert-card.severity-warning {
  border-left-color: #ffc107;
}

.alert-card.severity-info {
  border-left-color: #17a2b8;
}

.alert-card.unread {
  background: #f8f9ff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}

.alert-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.alert-severity {
  display: flex;
  align-items: center;
  gap: 5px;
}

.severity-icon {
  font-size: 1.2em;
}

.severity-text {
  font-weight: 500;
  text-transform: capitalize;
}

.alert-category {
  padding: 2px 6px;
  background: #f8f9fa;
  color: #495057;
  border-radius: 3px;
  font-size: 0.8em;
  text-transform: capitalize;
}

.alert-meta {
  display: flex;
  align-items: center;
  gap: 15px;
}

.alert-time {
  font-size: 0.9em;
  color: #666;
}

.alert-status .status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 500;
}

.status-badge.active {
  background: #ffebee;
  color: #c62828;
}

.status-badge.acknowledged {
  background: #fff3e0;
  color: #f57c00;
}

.status-badge.resolved {
  background: #e8f5e8;
  color: #2e7d32;
}

.status-badge.muted {
  background: #f5f5f5;
  color: #757575;
}

.alert-content {
  margin-bottom: 15px;
}

.alert-title {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1.1em;
}

.alert-description {
  margin: 0 0 10px 0;
  color: #666;
  line-height: 1.4;
}

.alert-metrics {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.metric-item {
  display: flex;
  gap: 5px;
  font-size: 0.9em;
}

.metric-label {
  color: #666;
}

.metric-value {
  font-weight: 500;
  color: #333;
}

.alert-recommendation {
  background: #e3f2fd;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.9em;
  color: #1976d2;
  border-left: 3px solid #2196f3;
}

.alert-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
}

.read-btn {
  background: #e3f2fd;
  color: #1976d2;
}

.ack-btn {
  background: #fff3e0;
  color: #f57c00;
}

.resolve-btn {
  background: #e8f5e8;
  color: #2e7d32;
}

.mute-btn {
  background: #f5f5f5;
  color: #757575;
}

.detail-btn {
  background: #e0e0e0;
  color: #424242;
}

.delete-btn {
  background: #ffebee;
  color: #c62828;
}

.alert-resolution {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.resolution-info {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 5px;
}

.resolution-notes {
  font-size: 0.9em;
  color: #666;
}

.no-alerts {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Timeline View */
.timeline-view {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.timeline-container {
  position: relative;
}

.timeline-container::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e0e0e0;
}

.timeline-item {
  display: flex;
  margin-bottom: 20px;
  position: relative;
}

.timeline-marker {
  position: relative;
  margin-right: 20px;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  position: relative;
  z-index: 1;
}

.timeline-dot.critical {
  background: #dc3545;
}

.timeline-dot.warning {
  background: #ffc107;
}

.timeline-dot.info {
  background: #17a2b8;
}

.timeline-content {
  flex: 1;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.timeline-title {
  font-weight: 500;
  color: #333;
}

.timeline-time {
  font-size: 0.9em;
  color: #666;
}

.timeline-description {
  color: #666;
  margin-bottom: 10px;
  line-height: 1.4;
}

.timeline-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8em;
}

.tag.severity.critical {
  background: #ffebee;
  color: #c62828;
}

.tag.severity.warning {
  background: #fff8e1;
  color: #f57c00;
}

.tag.severity.info {
  background: #e3f2fd;
  color: #1976d2;
}

.tag.category {
  background: #f8f9fa;
  color: #495057;
}

.tag.status.active {
  background: #ffcdd2;
  color: #c62828;
}

.tag.status.acknowledged {
  background: #ffe0b2;
  color: #f57c00;
}

.tag.status.resolved {
  background: #c8e6c9;
  color: #2e7d32;
}

.tag.status.muted {
  background: #f5f5f5;
  color: #757575;
}

/* Chart View */
.chart-view {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-card {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
}

.chart-card h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.chart-wrapper {
  position: relative;
  height: 250px;
}

.alert-chart {
  width: 100% !important;
  height: 100% !important;
}

/* Alert Configuration */
.alert-configuration {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.alert-configuration h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.config-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.config-card {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
}

.config-card h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.rule-list, .channel-list {
  margin-bottom: 15px;
}

.rule-item, .channel-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 4px;
  margin-bottom: 8px;
}

.rule-info, .channel-info {
  flex: 1;
}

.rule-name, .channel-name {
  font-weight: 500;
  color: #333;
}

.rule-condition, .channel-type {
  font-size: 0.9em;
  color: #666;
}

.rule-actions, .channel-toggle {
  display: flex;
  gap: 5px;
}

.edit-rule-btn, .toggle-rule-btn {
  padding: 4px 8px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
}

.add-rule-btn, .add-channel-btn {
  width: 100%;
  padding: 10px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.general-settings {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.setting-item label {
  color: #666;
}

.setting-item input {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 3px;
  width: 80px;
}

.setting-item input[type="checkbox"] {
  width: auto;
}

/* Modals */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  width: 600px;
  max-width: 90%;
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.modal-content.large {
  width: 800px;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
}

.alert-details-modal {
  margin-bottom: 20px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin-bottom: 10px;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 5px;
}

.detail-grid {
  display: grid;
  gap: 10px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-label {
  font-weight: 500;
  color: #666;
}

.severity-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 500;
}

.severity-badge.critical {
  background: #ffebee;
  color: #c62828;
}

.severity-badge.warning {
  background: #fff8e1;
  color: #f57c00;
}

.severity-badge.info {
  background: #e3f2fd;
  color: #1976d2;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.metric-card {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.metric-label {
  font-size: 0.8em;
  color: #666;
  margin-bottom: 5px;
}

.metric-value {
  font-weight: 500;
  color: #333;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9em;
}

.history-time {
  color: #666;
}

.history-action {
  color: #333;
  font-weight: 500;
}

.history-user {
  color: #666;
}

.modal-alert-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.resolve-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #666;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.create-form {
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.resolve-btn, .create-btn {
  background: #28a745;
  color: white;
}

.resolve-form-btn {
  background: #007bff;
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .device-alerts {
    padding: 10px;
  }
  
  .header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .device-header {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .alert-summary {
    margin-left: 0;
    justify-content: center;
  }
  
  .alert-stats {
    grid-template-columns: 1fr 1fr;
  }
  
  .alert-controls {
    flex-direction: column;
  }
  
  .filters {
    flex-direction: column;
    gap: 10px;
  }
  
  .alert-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .alert-actions {
    justify-content: flex-start;
  }
  
  .config-cards {
    grid-template-columns: 1fr;
  }
  
  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
    padding: 20px;
  }
  
  .modal-content.large {
    width: 95%;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}

@media (max-width: 480px) {
  .alert-stats {
    grid-template-columns: 1fr;
  }
  
  .alert-count {
    min-width: auto;
  }
  
  .alert-summary {
    flex-direction: column;
    gap: 8px;
  }
  
  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .timeline-container::before {
    left: 10px;
  }
  
  .timeline-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .timeline-marker {
    margin-bottom: 10px;
  }
  
  .chart-wrapper {
    height: 200px;
  }
  
  .alert-metrics {
    flex-direction: column;
    gap: 8px;
  }
}
</style>