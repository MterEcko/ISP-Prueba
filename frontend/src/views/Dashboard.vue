<template>
  <div class="dashboard">
    <h1 class="page-title">Panel de Control</h1>
    
    <div class="stats-grid">
      <div class="stat-card clients">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <div class="stat-title">Clientes</div>
          <div class="stat-value">{{ stats.clientCount }}</div>
          <div class="stat-details">
            <span class="active">{{ stats.activeClientCount }} activos</span>
            <span class="inactive">{{ stats.inactiveClientCount }} inactivos</span>
          </div>
        </div>
        <router-link to="/clients" class="stat-action">Ver Clientes</router-link>
      </div>
      
      <div class="stat-card sectors">
        <div class="stat-icon">📡</div>
        <div class="stat-info">
          <div class="stat-title">Sectores</div>
          <div class="stat-value">{{ stats.sectorCount }}</div>
          <div class="stat-details">
            <span>{{ stats.nodeCount }} nodos</span>
          </div>
        </div>
        <router-link to="/network" class="stat-action">Ver Red</router-link>
      </div>
      
      <div class="stat-card tickets">
        <div class="stat-icon">🎫</div>
        <div class="stat-info">
          <div class="stat-title">Tickets</div>
          <div class="stat-value">{{ stats.openTicketCount }}</div>
          <div class="stat-details">
            <span class="critical">{{ stats.criticalTicketCount }} críticos</span>
          </div>
        </div>
        <router-link to="/tickets" class="stat-action">Ver Tickets</router-link>
      </div>
      
      <div class="stat-card income">
        <div class="stat-icon">💰</div>
        <div class="stat-info">
          <div class="stat-title">Ingresos Mensuales</div>
          <div class="stat-value">${{ stats.monthlyIncome }}</div>
          <div class="stat-details">
            <span class="pending">${{ stats.pendingIncome }} pendientes</span>
          </div>
        </div>
        <router-link to="/billing" class="stat-action">Ver Facturación</router-link>
      </div>
    </div>
    
    <div class="dashboard-sections">
      <div class="dashboard-section">
        <h2>Estado de la Red</h2>
        <div class="network-status">
          <div class="status-item" v-for="(node, index) in networkStatus" :key="index" :class="node.status">
            <div class="status-name">{{ node.name }}</div>
            <div class="status-indicator">{{ node.status === 'online' ? 'En línea' : 'Fuera de línea' }}</div>
            <div class="status-details">
              <div><span>Clientes:</span> {{ node.clients }}</div>
              <div><span>Tráfico:</span> {{ node.traffic }} Mbps</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dashboard-section">
        <h2>Actividad Reciente</h2>
        <div class="activity-list">
          <div class="activity-item" v-for="(activity, index) in recentActivity" :key="index">
            <div class="activity-time">{{ formatTime(activity.time) }}</div>
            <div class="activity-content">
              <span class="activity-type" :class="activity.type">{{ activity.type }}</span>
              <span class="activity-text">{{ activity.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DashboardView',
  data() {
    return {
      stats: {
        clientCount: 120,
        activeClientCount: 112,
        inactiveClientCount: 8,
        sectorCount: 12,
        nodeCount: 4,
        openTicketCount: 5,
        criticalTicketCount: 2,
        monthlyIncome: '35,500',
        pendingIncome: '4,800'
      },
      networkStatus: [
        {
          name: 'Nodo Principal',
          status: 'online',
          clients: 45,
          traffic: 156.8
        },
        {
          name: 'Nodo Norte',
          status: 'online',
          clients: 32,
          traffic: 98.4
        },
        {
          name: 'Nodo Sur',
          status: 'online',
          clients: 28,
          traffic: 76.2
        },
        {
          name: 'Nodo Este',
          status: 'offline',
          clients: 15,
          traffic: 0
        }
      ],
      recentActivity: [
        {
          type: 'client',
          text: 'Nuevo cliente registrado: María López',
          time: new Date(new Date().getTime() - 15 * 60000) // 15 minutos atrás
        },
        {
          type: 'ticket',
          text: 'Ticket #45 actualizado: Sin internet en sector Norte',
          time: new Date(new Date().getTime() - 45 * 60000) // 45 minutos atrás
        },
        {
          type: 'payment',
          text: 'Pago recibido: $500 de Juan Pérez',
          time: new Date(new Date().getTime() - 120 * 60000) // 2 horas atrás
        }
      ]
    };
  },
  methods: {
    formatTime(date) {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 60) {
        return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
      } else {
        const diffHours = Math.floor(diffMins / 60);
        return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
      }
    }
  }
};
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  margin-bottom: 25px;
  font-size: 1.75rem;
  color: #2c3e50;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

.stat-card.clients::before {
  background-color: #3498db;
}

.stat-card.sectors::before {
  background-color: #f39c12;
}

.stat-card.tickets::before {
  background-color: #e74c3c;
}

.stat-card.income::before {
  background-color: #2ecc71;
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 15px;
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 1rem;
  color: #7f8c8d;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  margin: 5px 0;
}

.stat-details {
  display: flex;
  gap: 12px;
  font-size: 0.9rem;
}

.active {
  color: #2ecc71;
}

.inactive {
  color: #e74c3c;
}

.critical {
  color: #e74c3c;
}

.pending {
  color: #f39c12;
}

.stat-action {
  margin-top: 15px;
  text-align: right;
  color: #3498db;
  text-decoration: none;
  font-size: 0.9rem;
}

.stat-action:hover {
  text-decoration: underline;
}

.dashboard-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.dashboard-section {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.dashboard-section h2 {
  font-size: 1.2rem;
  color: #2c3e50;
  margin-bottom: 20px;
  border-bottom: 1px solid #ecf0f1;
  padding-bottom: 10px;
}

.network-status {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
}

.status-item {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
}

.status-item.online {
  border-left: 3px solid #2ecc71;
}

.status-item.offline {
  border-left: 3px solid #e74c3c;
}

.status-name {
  font-weight: bold;
  margin-bottom: 5px;
}

.status-indicator {
  display: inline-block;
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 12px;
  margin-bottom: 10px;
}

.status-item.online .status-indicator {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-item.offline .status-indicator {
  background-color: #ffebee;
  color: #c62828;
}

.status-details {
  font-size: 0.9rem;
  color: #7f8c8d;
}

.status-details span {
  font-weight: bold;
  color: #34495e;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.activity-item {
  display: flex;
  border-bottom: 1px solid #ecf0f1;
  padding-bottom: 10px;
}

.activity-time {
  width: 100px;
  font-size: 0.8rem;
  color: #95a5a6;
}

.activity-content {
  flex: 1;
}

.activity-type {
  display: inline-block;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 8px;
  text-transform: uppercase;
}

.activity-type.client {
  background-color: #e3f2fd;
  color: #1565c0;
}

.activity-type.ticket {
  background-color: #fff3e0;
  color: #e65100;
}

.activity-type.payment {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.activity-type.network {
  background-color: #fce4ec;
  color: #c2185b;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .dashboard-sections {
    grid-template-columns: 1fr;
  }
  
  .network-status {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 500px) {
  .network-status {
    grid-template-columns: 1fr;
  }
  
  .stat-details {
    flex-direction: column;
  }
}
</style>