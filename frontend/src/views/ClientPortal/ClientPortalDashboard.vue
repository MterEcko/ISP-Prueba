<template>
  <div class="client-portal-dashboard">
    <div class="header">
      <h1>Mi Portal</h1>
      <div class="user-info">
        <span class="welcome">Bienvenido, {{ userName }}</span>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <p>Cargando información...</p>
    </div>

    <div v-else-if="dashboard" class="dashboard-content">
      <!-- Estado de la cuenta -->
      <div class="account-status-card" :class="getStatusClass()">
        <div class="status-header">
          <h2>Estado de Cuenta</h2>
          <span class="status-badge" :class="getStatusClass()">
            {{ getStatusText() }}
          </span>
        </div>
        <div class="status-details">
          <div class="detail-item">
            <span class="label">Balance Actual:</span>
            <span class="value" :class="{ negative: dashboard.balance < 0 }">
              {{ formatCurrency(dashboard.balance) }}
            </span>
          </div>
          <div class="detail-item">
            <span class="label">Último Pago:</span>
            <span class="value">{{ formatDate(dashboard.lastPaymentDate) }}</span>
          </div>
        </div>
      </div>

      <!-- Información de suscripción -->
      <div class="subscription-card">
        <h2>Mi Suscripción</h2>
        <div class="subscription-details">
          <div class="detail-row">
            <span class="icon">📦</span>
            <div class="detail-content">
              <span class="label">Plan Actual:</span>
              <span class="value">{{ dashboard.subscription.planName }}</span>
            </div>
          </div>
          <div class="detail-row">
            <span class="icon">⚡</span>
            <div class="detail-content">
              <span class="label">Velocidad:</span>
              <span class="value">{{ dashboard.subscription.speed }}</span>
            </div>
          </div>
          <div class="detail-row">
            <span class="icon">💰</span>
            <div class="detail-content">
              <span class="label">Precio Mensual:</span>
              <span class="value">{{ formatCurrency(dashboard.subscription.price) }}</span>
            </div>
          </div>
          <div class="detail-row">
            <span class="icon">📅</span>
            <div class="detail-content">
              <span class="label">Próximo Vencimiento:</span>
              <span class="value">{{ formatDate(dashboard.subscription.nextDueDate) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Facturas pendientes -->
      <div class="pending-invoices-card" v-if="dashboard.pendingInvoices.length > 0">
        <div class="card-header">
          <h2>Facturas Pendientes</h2>
          <span class="count-badge">{{ dashboard.pendingInvoices.length }}</span>
        </div>
        <div class="invoices-list">
          <div
            v-for="invoice in dashboard.pendingInvoices"
            :key="invoice.id"
            class="invoice-item"
          >
            <div class="invoice-info">
              <span class="invoice-number">Factura #{{ invoice.invoiceNumber }}</span>
              <span class="invoice-date">{{ formatDate(invoice.dueDate) }}</span>
            </div>
            <div class="invoice-amount">
              {{ formatCurrency(invoice.total) }}
            </div>
            <button @click="viewInvoice(invoice.id)" class="btn-view">
              Ver Detalle
            </button>
          </div>
        </div>
        <button @click="goToInvoices" class="btn-see-all">
          Ver Todas las Facturas
        </button>
      </div>

      <div v-else class="no-pending-invoices">
        <p>✅ No tienes facturas pendientes</p>
      </div>

      <!-- Tickets recientes -->
      <div class="recent-tickets-card">
        <div class="card-header">
          <h2>Tickets Recientes</h2>
          <button @click="goToTickets" class="btn-new-ticket">
            + Nuevo Ticket
          </button>
        </div>
        <div v-if="dashboard.recentTickets.length > 0" class="tickets-list">
          <div
            v-for="ticket in dashboard.recentTickets"
            :key="ticket.id"
            class="ticket-item"
          >
            <div class="ticket-info">
              <span class="ticket-id">#{{ ticket.id }}</span>
              <span class="ticket-subject">{{ ticket.subject }}</span>
            </div>
            <span class="ticket-status" :class="'status-' + ticket.status">
              {{ getTicketStatusText(ticket.status) }}
            </span>
            <span class="ticket-date">{{ formatDate(ticket.createdAt) }}</span>
          </div>
        </div>
        <div v-else class="no-tickets">
          <p>No tienes tickets registrados</p>
        </div>
      </div>

      <!-- Accesos rápidos -->
      <div class="quick-actions">
        <button @click="goToInvoices" class="action-card">
          <span class="icon">🧾</span>
          <span class="text">Mis Facturas</span>
        </button>
        <button @click="goToTickets" class="action-card">
          <span class="icon">🎫</span>
          <span class="text">Soporte</span>
        </button>
        <button @click="goToUsage" class="action-card">
          <span class="icon">📊</span>
          <span class="text">Mi Consumo</span>
        </button>
        <button @click="goToProfile" class="action-card">
          <span class="icon">👤</span>
          <span class="text">Mi Perfil</span>
        </button>
      </div>
    </div>

    <div v-else class="error">
      <p>Error al cargar el dashboard</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '../../services/frontend_apiConfig';

export default {
  name: 'ClientPortalDashboard',
  data() {
    return {
      loading: false,
      dashboard: null,
      userName: ''
    };
  },
  mounted() {
    this.loadUserName();
    this.loadDashboard();
  },
  methods: {
    loadUserName() {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.userName = user.name || 'Cliente';
    },
    async loadDashboard() {
      this.loading = true;
      try {
        const response = await axios.get(`${API_URL}client-portal/dashboard`, {
          headers: {
            'x-access-token': localStorage.getItem('token')
          }
        });
        this.dashboard = response.data;
      } catch (error) {
        console.error('Error al cargar dashboard:', error);
        this.$toast?.error('Error al cargar el dashboard');
      } finally {
        this.loading = false;
      }
    },
    getStatusClass() {
      if (!this.dashboard) return '';
      return this.dashboard.status;
    },
    getStatusText() {
      if (!this.dashboard) return '';
      const statusMap = {
        active: 'Activo',
        suspended: 'Suspendido',
        pending: 'Pendiente'
      };
      return statusMap[this.dashboard.status] || this.dashboard.status;
    },
    getTicketStatusText(status) {
      const statusMap = {
        open: 'Abierto',
        in_progress: 'En Progreso',
        resolved: 'Resuelto',
        closed: 'Cerrado'
      };
      return statusMap[status] || status;
    },
    formatCurrency(amount) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(amount);
    },
    formatDate(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    viewInvoice(id) {
      this.$router.push(`/client-portal/invoices/${id}`);
    },
    goToInvoices() {
      this.$router.push('/client-portal/invoices');
    },
    goToTickets() {
      this.$router.push('/client-portal/tickets');
    },
    goToUsage() {
      this.$router.push('/client-portal/usage');
    },
    goToProfile() {
      this.$router.push('/client-portal/profile');
    }
  }
};
</script>

<style scoped>
.client-portal-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 28px;
  color: #2c3e50;
}

.user-info .welcome {
  font-size: 16px;
  color: #666;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Account Status Card */
.account-status-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid;
}

.account-status-card.active {
  border-left-color: #27ae60;
}

.account-status-card.suspended {
  border-left-color: #e74c3c;
}

.account-status-card.pending {
  border-left-color: #f39c12;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.status-header h2 {
  font-size: 20px;
  color: #2c3e50;
  margin: 0;
}

.status-badge {
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.suspended {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.pending {
  background: #fff3cd;
  color: #856404;
}

.status-details {
  display: flex;
  gap: 30px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item .label {
  font-size: 14px;
  color: #666;
}

.detail-item .value {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.detail-item .value.negative {
  color: #e74c3c;
}

/* Subscription Card */
.subscription-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.subscription-card h2 {
  font-size: 20px;
  color: #2c3e50;
  margin: 0 0 15px 0;
}

.subscription-details {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
}

.detail-row .icon {
  font-size: 24px;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.detail-content .label {
  font-size: 12px;
  color: #666;
}

.detail-content .value {
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
}

/* Pending Invoices Card */
.pending-invoices-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.card-header h2 {
  font-size: 20px;
  color: #2c3e50;
  margin: 0;
}

.count-badge {
  background: #e74c3c;
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: bold;
}

.invoices-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.invoice-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #e74c3c;
}

.invoice-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.invoice-number {
  font-weight: 500;
  color: #2c3e50;
}

.invoice-date {
  font-size: 12px;
  color: #666;
}

.invoice-amount {
  font-size: 18px;
  font-weight: bold;
  color: #e74c3c;
}

.btn-view {
  padding: 8px 15px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-view:hover {
  background: #2980b9;
}

.btn-see-all {
  width: 100%;
  padding: 10px;
  background: #ecf0f1;
  color: #2c3e50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-see-all:hover {
  background: #bdc3c7;
}

.no-pending-invoices {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.no-pending-invoices p {
  font-size: 16px;
  color: #27ae60;
  margin: 0;
}

/* Recent Tickets Card */
.recent-tickets-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-new-ticket {
  padding: 8px 15px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-new-ticket:hover {
  background: #229954;
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ticket-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.ticket-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.ticket-id {
  font-weight: bold;
  color: #3498db;
}

.ticket-subject {
  color: #2c3e50;
}

.ticket-status {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.ticket-status.status-open {
  background: #fff3cd;
  color: #856404;
}

.ticket-status.status-in_progress {
  background: #cce5ff;
  color: #004085;
}

.ticket-status.status-resolved {
  background: #d4edda;
  color: #155724;
}

.ticket-status.status-closed {
  background: #e2e3e5;
  color: #383d41;
}

.ticket-date {
  font-size: 12px;
  color: #666;
}

.no-tickets {
  text-align: center;
  padding: 20px;
  color: #666;
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: white;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:hover {
  border-color: #3498db;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.action-card .icon {
  font-size: 32px;
}

.action-card .text {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.error {
  text-align: center;
  padding: 40px;
  color: #e74c3c;
}
</style>
