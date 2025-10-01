<template>
  <div class="client-detail">
    <!-- Header con información básica del cliente -->
    <div class="client-header">
      <div class="client-info">
        <div class="client-avatar">
          {{ getClientInitials() }}
        </div>
        <div class="client-basic">
          <h1>{{ client.firstName }} {{ client.lastName }}</h1>
          <p class="client-id">#{{ client.id || 'Cargando...' }}</p>
          <div class="status-badges">
            <span :class="['status-badge', client.active ? 'active' : 'inactive']">
              {{ client.active ? 'Activo' : 'Inactivo' }}
            </span>
            <span v-if="primarySubscription" :class="['status-badge', 'service-' + primarySubscription.status]">
              {{ formatSubscriptionStatus(primarySubscription.status) }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="client-actions">
        <button @click="showQuickActions = !showQuickActions" class="action-btn primary">
          Acciones Rápidas
        </button>
        <button @click="goBack" class="action-btn secondary">
          Volver
        </button>
      </div>

      <!-- Quick Actions Dropdown -->
      <div v-if="showQuickActions" class="quick-actions-dropdown">
        <button @click="sendQuickMessage('whatsapp')" class="quick-action">
          💬 WhatsApp
        </button>
        <button @click="sendQuickMessage('email')" class="quick-action">
          📧 Email
        </button>
        <button @click="createTicket" class="quick-action">
          🎫 Nuevo Ticket
        </button>
        <button @click="addPayment" class="quick-action">
          💰 Registrar Pago
        </button>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="tabs-navigation">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando información del cliente...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h3>Error cargando datos</h3>
      <p>{{ error }}</p>
      <button @click="loadClient" class="retry-btn">Reintentar</button>
    </div>

    <!-- Tab Contents -->
    <div v-else class="tab-content">
      
      <!-- TAB: Resumen -->
      <div v-if="activeTab === 'resumen'" class="tab-panel">
        <ResumenTab 
          :client="client"
          :primarySubscription="primarySubscription"
          :billingInfo="billingInfo"
          @update-client="updateClientData"
          @edit-field="editClientField"
        />
      </div>

      <!-- TAB: Servicios -->
      <div v-if="activeTab === 'servicios'" class="tab-panel">
        <ServicesTab 
          :client="client"
          :subscriptions="client.Subscriptions || []"
          :devices="clientDevices"
          :inventory="clientInventory"
          @add-subscription="openSubscriptionForm"
          @edit-subscription="editSubscription"
          @manage-device="manageDevice"
          @return-inventory="returnInventoryItem"
          @refresh="loadClientDevices"
        />
      </div>

      <!-- TAB: Facturación -->
      <div v-if="activeTab === 'facturacion'" class="tab-panel">
        <FacturacionTab 
          :clientId="client.id"
          :billingInfo="billingInfo"
          @add-payment="addPayment"
          @view-invoice="viewInvoice"
        />
      </div>

      <!-- TAB: Tickets -->
      <div v-if="activeTab === 'tickets'" class="tab-panel">
        <TicketsTab 
          :clientId="client.id"
          @create-ticket="createTicket"
          @view-ticket="viewTicket"
        />
      </div>

      <!-- TAB: Contacto -->
      <div v-if="activeTab === 'contacto'" class="tab-panel">
        <ContactoTab 
          :clientId="client.id"
          @send-message="sendMessage"
          @view-communication="viewCommunication"
        />
      </div>

      <!-- TAB: Documentos -->
      <div v-if="activeTab === 'documentos'" class="tab-panel">
        <DocumentosTab 
          :client="client"
          @upload-document="uploadDocument"
          @download-document="downloadDocument"
          @delete-document="deleteDocument"
          @generate-document="generateDocument"
        />
      </div>

      <!-- TAB: Estadísticas -->
      <div v-if="activeTab === 'estadisticas'" class="tab-panel">
        <EstadisticasTab 
          :clientId="client.id"
          :subscriptions="client.Subscriptions || []"
        />
      </div>

      <!-- TAB: Logs -->
      <div v-if="activeTab === 'logs'" class="tab-panel">
        <LogsTab 
          :clientId="client.id"
        />
      </div>

      <!-- TAB: Herramientas -->
      <div v-if="activeTab === 'herramientas'" class="tab-panel">
        <HerramientasTab 
          :client="client"
          :primarySubscription="primarySubscription"
          :devices="clientDevices"
          @ping-test="executePing"
          @access-device="accessDevice"
          @view-traffic="viewTraffic"
        />
      </div>

    </div>

    <!-- Modal para SubscriptionForm -->
    <div v-if="showSubscriptionForm" class="modal-overlay" @click="closeSubscriptionForm">
      <div class="modal-content subscription-modal" @click.stop>
        <SubscriptionFormIntelligent 
          :clientId="client.id"
          :subscription="editingSubscription"
          :operationHint="currentOperationHint"
          @close="closeSubscriptionForm"
          @cancel="closeSubscriptionForm"
          @success="onSubscriptionSuccess"
          @error="onSubscriptionError"
        />
      </div>
    </div>

    <!-- Modal para Quick Messages -->
    <div v-if="showMessageModal" class="modal-overlay" @click="closeMessageModal">
      <div class="modal-content message-modal" @click.stop>
        <QuickMessageForm 
          :clientId="client.id"
          :channel="selectedChannel"
          @close="closeMessageModal"
          @sent="onMessageSent"
        />
      </div>
    </div>

    <!-- Notifications -->
    <div v-if="notification.show" :class="['notification', notification.type]">
      <div class="notification-content">
        <span class="notification-icon">{{ notification.icon }}</span>
        <span class="notification-text">{{ notification.message }}</span>
        <button class="notification-close" @click="hideNotification">✕</button>
      </div>
    </div>

  </div>
</template>

<script>
import ClientService from '../services/client.service';
import SubscriptionService from '../services/subscription.service';
import DeviceService from '../services/device.service';
import BillingService from '../services/billing.service';
import InventoryService from '../services/inventory.service';
import CommunicationService from '../services/communication.service';
import TicketService from '../services/ticket.service';


// Tab Components
import ResumenTab from '../components/client-tabs/ResumeTab.vue';
import ServicesTab from '../components/client-tabs/ServicesTab.vue';
import FacturacionTab from '../components/client-tabs/BillingTab.vue';
import TicketsTab from '../components/client-tabs/TicketsTab.vue';
import ContactoTab from '../components/client-tabs/ContactTab.vue';
import DocumentosTab from '../components/client-tabs/DocumentsTab.vue';
import EstadisticasTab from '../components/client-tabs/EstadisticasTab.vue';
import LogsTab from '../components/client-tabs/LogsTab.vue';
import HerramientasTab from '../components/client-tabs/ToolingsTab.vue';

// Form Components
import SubscriptionFormIntelligent from '../components/SubscriptionFormIntelligent.vue';
import QuickMessageForm from '../components/QuickMessageForm.vue';

export default {
 name: 'ClientDetail',
 components: {
   ResumenTab,
   ServicesTab,
   FacturacionTab,
   TicketsTab,
   ContactoTab,
   DocumentosTab,
   EstadisticasTab,
   LogsTab,
   HerramientasTab,
   SubscriptionFormIntelligent,
   QuickMessageForm
 },
 data() {
   return {
     client: {},
     loading: true,
     error: null,
     activeTab: 'resumen',
     showQuickActions: false,
     showSubscriptionForm: false,
     showMessageModal: false,
     editingSubscription: null,
     currentOperationHint: null,
     selectedChannel: null,
     clientDevices: [],
     clientInventory: [],
     billingInfo: null,
     
     // Notifications
     notification: {
       show: false,
       type: 'info',
       message: '',
       icon: 'ℹ️'
     },

     // Tab Configuration
     tabs: [
       { id: 'resumen', label: 'Resumen', icon: '📋', badge: null },
       { id: 'servicios', label: 'Servicios', icon: '📡', badge: null },
       { id: 'facturacion', label: 'Facturación', icon: '💰', badge: null },
       { id: 'tickets', label: 'Tickets', icon: '🎫', badge: null },
       { id: 'contacto', label: 'Contacto', icon: '📧', badge: null },
       { id: 'documentos', label: 'Documentos', icon: '📄', badge: null },
       { id: 'estadisticas', label: 'Estadísticas', icon: '📊', badge: null },
       { id: 'logs', label: 'Logs', icon: '📝', badge: null },
       { id: 'herramientas', label: 'Herramientas', icon: '🔧', badge: null }
     ]
   };
 },
  computed: {
  primarySubscription() {
    // Verificar que client.Subscriptions existe y es un array
    if (!this.client.Subscriptions || !Array.isArray(this.client.Subscriptions)) {
      return null;
    }
    
    if (this.client.Subscriptions.length === 0) {
      return null;
    }
    
    // Buscar suscripción activa primero
    const active = this.client.Subscriptions.find(sub => sub.status === 'active');
    if (active) return active;
    
    // Si no hay activa, tomar la más reciente (crear copia antes de ordenar)
    return [...this.client.Subscriptions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  }
  },


 created() {
   this.loadClient();
   this.updateTabBadges();
 },
 methods: {
   async loadClient() {
     this.loading = true;
     this.error = null;
     try {
       const response = await ClientService.getClient(this.$route.params.id);
       this.client = response.data.success !== undefined ? response.data.data : response.data;
       
       // Cargar billing info
       this.billingInfo = this.client.ClientBilling || this.client.clientBilling;
       
       // Cargar datos adicionales en paralelo
       await Promise.all([
         this.loadClientDevices(),
         this.loadClientInventory(),
         this.loadClientSubscriptions()
       ]);
       
       this.updateTabBadges();
     } catch (error) {
       console.error('❌ Error cargando cliente:', error);
       this.error = 'Error cargando datos del cliente. Por favor, intente nuevamente.';
     } finally {
       this.loading = false;
     }
   },



async loadClientDevices() {
  try {
    // Cargar dispositivos de red asignados al cliente desde la tabla Devices
    const response = await DeviceService.getAllDevices({ 
      clientId: this.client.id 
    });
    this.clientDevices = response.data.devices || response.data || [];
  } catch (error) {
    console.error('❌ Error cargando dispositivos:', error);
    this.clientDevices = [];
  }
},

async loadClientInventory() {
  try {
    // Cargar inventario asignado al cliente (equipos físicos)
    const response = await InventoryService.getAllInventory({ 
      clientId: this.client.id 
    });
    this.clientInventory = response.data.items || response.data || [];
  } catch (error) {
    console.error('❌ Error cargando inventario:', error);
    this.clientInventory = [];
  }
},

async returnInventoryItem(item) {
  try {
    // Devolver item al inventario (cambiar clientId a null)
    await InventoryService.assignToClient(item.id, null, 'Devuelto por cliente');
    await this.loadClientInventory(); // Recargar inventario
    this.showNotification('Equipo devuelto al inventario', 'success');
  } catch (error) {
    console.error('❌ Error devolviendo equipo:', error);
    this.showNotification('Error devolviendo equipo', 'error');
  }
},

   async loadClientSubscriptions() {
     try {
       const response = await SubscriptionService.getClientSubscriptions(this.client.id);
       // Si el cliente ya tiene suscripciones cargadas, no sobrescribir
       if (!this.client.Subscriptions || this.client.Subscriptions.length === 0) {
         this.client.Subscriptions = response.data.subscriptions || response.data || [];
       }
     } catch (error) {
       console.error('❌ Error cargando suscripciones:', error);
       this.client.Subscriptions = this.client.Subscriptions || [];
     }
   },

async updateTabBadges() {
  try {
    // Obtener estadísticas de tickets
    const ticketStats = await this.getClientTicketStats();
    
    this.tabs.forEach(tab => {
      switch (tab.id) {
        case 'servicios':
          tab.badge = this.client.Subscriptions?.length || 0;
          break;
        case 'documentos':
          tab.badge = this.client.ClientDocuments?.length || 0;
          break;
        case 'tickets':
          tab.badge = ticketStats.open; // Solo tickets abiertos/en progreso
          break;
      }
    });
  } catch (error) {
    console.error('❌ Error actualizando badges:', error);
  }
},

   // ===============================
   // MÉTODOS DE NAVEGACIÓN
   // ===============================

   goBack() {
     this.$router.push('/clients');
   },

   getClientInitials() {
     if (!this.client.firstName || !this.client.lastName) return '??';
     return (this.client.firstName[0] + this.client.lastName[0]).toUpperCase();
   },

   // ===============================
   // MÉTODOS DE SUSCRIPCIONES
   // ===============================

   openSubscriptionForm() {
     this.editingSubscription = null;
     this.currentOperationHint = 'new';
     this.showSubscriptionForm = true;
   },

   editSubscription(subscription) {
     this.editingSubscription = subscription;
     this.currentOperationHint = 'edit';
     this.showSubscriptionForm = true;
   },

   closeSubscriptionForm() {
     this.showSubscriptionForm = false;
     this.editingSubscription = null;
     this.currentOperationHint = null;
   },

   async onSubscriptionSuccess(event) {
     try {
       // Si es una nueva suscripción, crear facturación automáticamente
       if (event.operation === 'create' && event.subscription) {
         const billingData = {
           clientId: this.client.id,
           servicePackageId: event.subscription.servicePackageId,
           clientStatus: 'active',
           billingDay: 1,
           monthlyFee: event.subscription.monthlyFee || 0,
           paymentMethod: 'cash',
           graceDays: 5
         };
         
         await BillingService.createClientBilling(billingData);
       }
     } catch (error) {
       console.error('❌ Error creando facturación automática:', error);
     }
     
     this.closeSubscriptionForm();
     this.loadClient();
     this.showNotification('Operación completada exitosamente', 'success');
   },

   onSubscriptionError(event) {
     console.error('❌ Error en operación de suscripción:', event);
     this.showNotification(
       event.error?.message || 'Error en la operación', 
       'error'
     );
   },

   // ===============================
   // MÉTODOS DE COMUNICACIÓN
   // ===============================

   sendQuickMessage(channel) {
     this.selectedChannel = channel;
     this.showMessageModal = true;
     this.showQuickActions = false;
   },

   closeMessageModal() {
     this.showMessageModal = false;
     this.selectedChannel = null;
   },

   onMessageSent(event) {
     this.closeMessageModal();
     this.showNotification('Mensaje enviado correctamente', 'success');
   },

   sendMessage(data) {
     // Implementar envío de mensaje
   },

   viewCommunication(communication) {
     // Implementar vista de comunicación
   },

   // ===============================
   // MÉTODOS DE TICKETS
   // ===============================

// ===============================
// MÉTODOS DE TICKETS (Solo estos)
// ===============================

async createTicket() {
  try {
    this.$router.push({
      path: '/tickets/new',
      query: { 
        clientId: this.client.id,
        clientName: `${this.client.firstName} ${this.client.lastName}`,
        clientAddress: this.client.address,
        clientPhone: this.client.phone,
        serviceStatus: this.primarySubscription?.status
      }
    });
  } catch (error) {
    console.error('❌ Error navegando a crear ticket:', error);
    this.showNotification('Error abriendo formulario de ticket', 'error');
  }
},

viewTicket(ticket) {
  if (ticket && ticket.id) {
    this.$router.push(`/tickets/${ticket.id}`);
  } else {
    this.showNotification('ID de ticket no válido', 'error');
  }
},

// Obtener tickets del cliente para el badge
async getClientTicketStats() {
  try {
    const response = await TicketService.getTickets({ 
      clientId: this.client.id,
      size: 100 
    });
    
    const tickets = response.data.tickets || response.data || [];
    
    return {
      total: tickets.length,
      open: tickets.filter(t => ['open', 'in_progress'].includes(t.status)).length
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de tickets:', error);
    return { total: 0, open: 0 };
  }
},

   // ===============================
   // MÉTODOS DE FACTURACIÓN
   // ===============================

   addPayment() {
     this.$router.push(`/payments/new?clientId=${this.client.id}`);
   },

   viewInvoice(invoice) {
     this.$router.push(`/invoices/${invoice.id}`);
   },

   // ===============================
   // MÉTODOS DE DOCUMENTOS
   // ===============================

   async uploadDocument(documentData) {
     try {
       await ClientService.uploadDocument(this.client.id, documentData);
       this.loadClient();
       this.showNotification('Documento subido correctamente', 'success');
     } catch (error) {
       console.error('❌ Error subiendo documento:', error);
       this.showNotification('Error subiendo documento', 'error');
     }
   },

   async downloadDocument(documentId) {
     try {
       const response = await ClientService.downloadDocument(documentId);
       // Crear enlace de descarga
       const url = window.URL.createObjectURL(new Blob([response.data]));
       const link = document.createElement('a');
       link.href = url;
       link.setAttribute('download', 'documento.pdf');
       document.body.appendChild(link);
       link.click();
       link.remove();
     } catch (error) {
       console.error('❌ Error descargando documento:', error);
       this.showNotification('Error descargando documento', 'error');
     }
   },

   async deleteDocument(documentId) {
     if (!confirm('¿Está seguro que desea eliminar este documento?')) {
       return;
     }

     try {
       await ClientService.deleteDocument(documentId);
       this.loadClient();
       this.showNotification('Documento eliminado correctamente', 'success');
     } catch (error) {
       console.error('❌ Error eliminando documento:', error);
       this.showNotification('Error eliminando documento', 'error');
     }
   },

   generateDocument(type) {
     // Implementar generación de documentos
   },

   // ===============================
   // MÉTODOS DE DISPOSITIVOS
   // ===============================

   manageDevice(device) {
     this.$router.push(`/devices/${device.id}`);
   },

   // ===============================
   // MÉTODOS DE HERRAMIENTAS
   // ===============================

   executePing(target) {
     // Implementar ping
   },

   accessDevice(device) {
     // Implementar acceso remoto
   },

   viewTraffic(device) {
     // Implementar vista de tráfico
   },

   // ===============================
   // MÉTODOS DE EDICIÓN
   // ===============================

// En ClientDetail.vue, agregar/mejorar este método:
async updateClientData(section, newData) {
  try {
    // Hacer la petición al backend para actualizar
    await ClientService.updateClient(this.client.id, newData);
    
    // Actualizar los datos locales
    Object.assign(this.client, newData);
    
    this.showNotification('Datos actualizados correctamente', 'success');
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    this.showNotification('Error actualizando datos', 'error');
  }
},

  editClientField(field) {
    // Implementar edición in-place
    const currentValue = this.client[field.name] || '';
    
    // Crear prompt personalizado según el tipo de campo
    let newValue;
    
    switch (field.type) {
      case 'email':
        newValue = prompt(`Nuevo ${field.label}:`, currentValue);
        if (newValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)) {
          this.showNotification('Email no válido', 'error');
          return;
        }
        break;
        
      case 'phone':
        newValue = prompt(`Nuevo ${field.label}:`, currentValue);
        if (newValue && !/^[\d\s\-+()]+$/.test(newValue)) {
          this.showNotification('Teléfono no válido', 'error');
          return;
        }
        break;
        
      case 'date':
        newValue = prompt(`Nueva ${field.label} (YYYY-MM-DD):`, currentValue);
        if (newValue && isNaN(Date.parse(newValue))) {
          this.showNotification('Fecha no válida', 'error');
          return;
        }
        break;
        
      case 'number':
        newValue = prompt(`Nuevo ${field.label}:`, currentValue);
        if (newValue && isNaN(parseFloat(newValue))) {
          this.showNotification('Número no válido', 'error');
          return;
        }
        newValue = parseFloat(newValue);
        break;
        
      case 'textarea':
        newValue = prompt(`Nueva ${field.label}:`, currentValue);
        break;
        
      default:
        newValue = prompt(`Nuevo ${field.label}:`, currentValue);
    }
    
    // Si el usuario canceló o no cambió nada
    if (newValue === null || newValue === currentValue) {
      return;
    }
    
    // Actualizar el campo
    this.updateClientData(field.name, newValue);
  },

   // ===============================
   // UTILIDADES
   // ===============================

   formatSubscriptionStatus(status) {
     const statusMap = {
       'active': 'Activo',
       'suspended': 'Suspendido',
       'cancelled': 'Cancelado',
       'pending': 'Pendiente'
     };
     return statusMap[status] || status;
   },

   showNotification(message, type = 'info') {
     const icons = {
       success: '✅',
       error: '❌',
       warning: '⚠️',
       info: 'ℹ️'
     };

     this.notification = {
       show: true,
       type,
       message,
       icon: icons[type] || icons.info
     };

     // Auto-hide after 5 seconds
     setTimeout(() => {
       this.hideNotification();
     }, 5000);
   },

   hideNotification() {
     this.notification.show = false;
   }
 },

 // Close dropdowns when clicking outside
 mounted() {
   document.addEventListener('click', (e) => {
     if (!e.target.closest('.quick-actions-dropdown') && !e.target.closest('.action-btn')) {
       this.showQuickActions = false;
     }
   });
 }
};
</script>


<style scoped>
/* ===============================
   LAYOUT PRINCIPAL
   =============================== */

.client-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

/* ===============================
   HEADER DEL CLIENTE
   =============================== */

.client-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 30px;
  position: relative;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.client-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.client-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255,255,255,0.3);
}

.client-basic h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
}

.client-id {
  margin: 5px 0;
  opacity: 0.8;
  font-size: 1.1rem;
}

.status-badges {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  backdrop-filter: blur(10px);
}

.status-badge.active {
  background: rgba(76, 175, 80, 0.8);
  border: 1px solid rgba(255,255,255,0.3);
}

.status-badge.inactive {
  background: rgba(244, 67, 54, 0.8);
  border: 1px solid rgba(255,255,255,0.3);
}

.status-badge.service-active {
  background: rgba(33, 150, 243, 0.8);
  border: 1px solid rgba(255,255,255,0.3);
}

.status-badge.service-suspended {
  background: rgba(255, 152, 0, 0.8);
  border: 1px solid rgba(255,255,255,0.3);
}

.client-actions {
  position: absolute;
  top: 20px;
  right: 30px;
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn.primary {
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
}

.action-btn.primary:hover {
  background: rgba(255,255,255,0.3);
}

.action-btn.secondary {
  background: rgba(0,0,0,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
}

.action-btn.secondary:hover {
  background: rgba(0,0,0,0.3);
}

/* Quick Actions Dropdown */
.quick-actions-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  padding: 10px;
  margin-top: 10px;
  min-width: 200px;
  z-index: 1000;
}

.quick-action {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
  color: #333;
  font-size: 0.95rem;
}

.quick-action:hover {
  background-color: #f5f5f5;
}

/* ===============================
   NAVEGACIÓN DE PESTAÑAS
   =============================== */

.tabs-navigation {
  display: flex;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tabs-navigation::-webkit-scrollbar {
  display: none;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  white-space: nowrap;
  color: #666;
  font-weight: 500;
  min-width: max-content;
}

.tab-button:hover {
  background-color: #f8f9fa;
  color: #333;
}

.tab-button.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background-color: #f8f9ff;
}

.tab-icon {
  font-size: 1.2em;
}

.tab-label {
  font-size: 0.95rem;
}

.tab-badge {
  background: #667eea;
  color: white;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.tab-button.active .tab-badge {
  background: #5a67d8;
}

/* ===============================
   CONTENIDO DE PESTAÑAS
   =============================== */

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.tab-panel {
  min-height: 100%;
  background: white;
}

/* ===============================
   ESTADOS DE CARGA Y ERROR
   =============================== */

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.error-container h3 {
  margin: 0 0 10px 0;
  color: #f44336;
}

.retry-btn {
  margin-top: 20px;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #5a67d8;
}

/* ===============================
   MODALES
   =============================== */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.subscription-modal {
  max-width: 1200px;
  width: 95vw;
  max-height: 95vh;
}

.message-modal {
  max-width: 600px;
  width: 90vw;
}

/* ===============================
   NOTIFICACIONES
   =============================== */

.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 3000;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.2);
  max-width: 400px;
  animation: slideInRight 0.3s ease-out;
}

.notification.success {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
}

.notification.error {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  color: white;
}

.notification.warning {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
}

.notification.info {
  background: linear-gradient(135deg, #2196F3, #1976D2);
  color: white;
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 12px;
}

.notification-icon {
  font-size: 1.3em;
  flex-shrink: 0;
}

.notification-text {
  flex: 1;
  font-weight: 500;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.2em;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.notification-close:hover {
  background: rgba(255,255,255,0.2);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ===============================
   RESPONSIVE DESIGN
   =============================== */

@media (max-width: 768px) {
  .client-header {
    padding: 15px 20px;
  }
  
  .client-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .client-avatar {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
  }
  
  .client-basic h1 {
    font-size: 1.5rem;
  }
  
  .client-actions {
    position: static;
    margin-top: 15px;
  }
  
  .tabs-navigation {
    padding: 0 10px;
  }
  
  .tab-button {
    padding: 12px 16px;
  }
  
  .tab-label {
    display: none;
  }
  
  .subscription-modal,
  .message-modal {
    width: 95vw;
    max-height: 95vh;
    margin: 10px;
  }
  
  .notification {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}

@media (max-width: 480px) {
  .client-header {
    padding: 10px 15px;
  }
  
  .tab-button {
    padding: 10px 12px;
    min-width: auto;
  }
  
  .tab-icon {
    font-size: 1.1em;
  }
}

/* ===============================
   UTILIDADES
   =============================== */

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>