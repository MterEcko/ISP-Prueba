<template>
  <div class="invoice-form">
    <div class="header">
      <h2>{{ isEdit ? 'Editar Factura' : 'Nueva Factura' }}</h2>
      <div class="header-actions">
        <button @click="cancel" class="cancel-button">
          Cancelar
        </button>
        <button @click="saveDraft" class="draft-button" :disabled="saving">
          💾 Guardar Borrador
        </button>
        <button @click="saveAndSend" class="save-button" :disabled="saving || !isFormValid">
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear y Enviar') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando datos...
    </div>

    <form v-else @submit.prevent="saveAndSend" class="invoice-form-content">
      <!-- Información del cliente -->
      <div class="form-section">
        <h3>Información del Cliente</h3>
        
        <div class="form-row">
          <div class="form-group full-width">
            <label for="clientSearch">Cliente *</label>
            <div class="client-search-container">
              <input
                type="text"
                id="clientSearch"
                v-model="clientSearch"
                @input="searchClients"
                placeholder="Buscar cliente por nombre, email o teléfono..."
                :disabled="isEdit"
                required
              />
              <div v-if="clientSearchResults.length > 0" class="search-results">
                <div
                  v-for="client in clientSearchResults"
                  :key="client.id"
                  @click="selectClient(client)"
                  class="search-result-item"
                >
                  <span class="client-name">{{ client.fullName }}</span>
                  <span class="client-details">{{ client.phone }} - {{ client.email }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedClient" class="selected-client">
          <div class="client-card">
            <div class="client-info">
              <h4>{{ selectedClient.fullName }}</h4>
              <p>📧 {{ selectedClient.email }}</p>
              <p>📞 {{ selectedClient.phone }}</p>
              <p>📍 {{ selectedClient.address }}</p>
            </div>
            <div class="client-billing-info">
              <p><strong>Plan:</strong> {{ selectedClient.servicePackage || 'Sin plan' }}</p>
              <p><strong>Día de Facturación:</strong> {{ selectedClient.billingDay || 'No definido' }}</p>
              <p><strong>Estado:</strong> 
                <span :class="selectedClient.active ? 'status-active' : 'status-inactive'">
                  {{ selectedClient.active ? 'Activo' : 'Inactivo' }}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Información de la factura -->
      <div class="form-section">
        <h3>Detalles de la Factura</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="invoiceNumber">Número de Factura</label>
            <input
              type="text"
              id="invoiceNumber"
              v-model="invoice.invoiceNumber"
              placeholder="Se generará automáticamente"
              readonly
            />
          </div>
          <div class="form-group">
            <label for="dueDate">Fecha de Vencimiento *</label>
            <input
              type="date"
              id="dueDate"
              v-model="invoice.dueDate"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="billingPeriodStart">Inicio del Período</label>
            <input
              type="date"
              id="billingPeriodStart"
              v-model="invoice.billingPeriodStart"
            />
          </div>
          <div class="form-group">
            <label for="billingPeriodEnd">Fin del Período</label>
            <input
              type="date"
              id="billingPeriodEnd"
              v-model="invoice.billingPeriodEnd"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="notes">Notas</label>
          <textarea
            id="notes"
            v-model="invoice.notes"
            rows="3"
            placeholder="Notas adicionales para la factura..."
          ></textarea>
        </div>
      </div>

      <!-- Servicios/Items de la factura -->
      <div class="form-section">
        <div class="section-header">
          <h3>Servicios a Facturar</h3>
          <button type="button" @click="addInvoiceItem" class="add-item-btn">
            + Agregar Servicio
          </button>
        </div>

        <div class="invoice-items">
          <div v-if="invoice.items.length === 0" class="no-items">
            No hay servicios agregados. Haga clic en "Agregar Servicio" para comenzar.
          </div>

          <div v-for="(item, index) in invoice.items" :key="index" class="invoice-item">
            <div class="item-header">
              <span class="item-number">Servicio {{ index + 1 }}</span>
              <button type="button" @click="removeInvoiceItem(index)" class="remove-item-btn">
                ❌
              </button>
            </div>

            <div class="item-form">
              <div class="form-row">
                <div class="form-group">
                  <label>Nombre del Servicio *</label>
                  <input
                    type="text"
                    v-model="item.serviceName"
                    placeholder="Ej: Internet Residencial"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>Descripción</label>
                  <input
                    type="text"
                    v-model="item.description"
                    placeholder="Ej: Plan 20 Mbps"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Cantidad</label>
                  <input
                    type="number"
                    v-model="item.quantity"
                    min="1"
                    step="1"
                    @input="calculateItemTotal(index)"
                  />
                </div>
                <div class="form-group">
                  <label>Precio Unitario *</label>
                  <input
                    type="number"
                    v-model="item.unitPrice"
                    min="0"
                    step="0.01"
                    @input="calculateItemTotal(index)"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>Total</label>
                  <input
                    type="number"
                    v-model="item.totalPrice"
                    readonly
                    class="calculated-field"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Inicio del Período</label>
                  <input
                    type="date"
                    v-model="item.periodStart"
                  />
                </div>
                <div class="form-group">
                  <label>Fin del Período</label>
                  <input
                    type="date"
                    v-model="item.periodEnd"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen financiero -->
      <div class="form-section">
        <h3>Resumen Financiero</h3>
        
        <div class="financial-summary">
          <div class="summary-left">
            <div class="form-row">
              <div class="form-group">
                <label for="discountAmount">Descuento</label>
                <input
                  type="number"
                  id="discountAmount"
                  v-model="invoice.discountAmount"
                  min="0"
                  step="0.01"
                  @input="calculateTotals"
                />
              </div>
              <div class="form-group">
                <label for="taxAmount">Impuestos</label>
                <input
                  type="number"
                  id="taxAmount"
                  v-model="invoice.taxAmount"
                  min="0"
                  step="0.01"
                  @input="calculateTotals"
                />
              </div>
            </div>

            <div class="form-group">
              <label>
                <input
                  type="checkbox"
                  v-model="autoCalculateTax"
                  @change="toggleAutoTax"
                />
                Calcular impuestos automáticamente (16% IVA)
              </label>
            </div>
          </div>

          <div class="summary-right">
            <div class="totals-breakdown">
              <div class="total-row">
                <span class="label">Subtotal:</span>
                <span class="value">${{ formatNumber(subtotal) }}</span>
              </div>
              <div class="total-row" v-if="invoice.discountAmount > 0">
                <span class="label">Descuento:</span>
                <span class="value discount">-${{ formatNumber(invoice.discountAmount) }}</span>
              </div>
              <div class="total-row" v-if="invoice.taxAmount > 0">
                <span class="label">Impuestos:</span>
                <span class="value">${{ formatNumber(invoice.taxAmount) }}</span>
              </div>
              <div class="total-row final-total">
                <span class="label">Total:</span>
                <span class="value">${{ formatNumber(invoice.totalAmount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuración de envío -->
      <div class="form-section" v-if="!isEdit">
        <h3>Opciones de Envío</h3>
        
        <div class="form-group">
          <label>
            <input
              type="checkbox"
              v-model="sendOptions.sendEmail"
            />
            Enviar por correo electrónico al cliente
          </label>
        </div>

        <div class="form-group">
          <label>
            <input
              type="checkbox"
              v-model="sendOptions.sendWhatsApp"
            />
            Enviar notificación por WhatsApp
          </label>
        </div>

        <div class="form-group">
          <label>
            <input
              type="checkbox"
              v-model="sendOptions.generatePDF"
              checked
              disabled
            />
            Generar PDF automáticamente
          </label>
        </div>
      </div>
    </form>

    <!-- Modal de confirmación -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal-content" @click.stop>
        <h3>{{ confirmModal.title }}</h3>
        <p>{{ confirmModal.message }}</p>
        <div v-if="confirmModal.showDetails" class="confirm-details">
          <p><strong>Cliente:</strong> {{ selectedClient?.fullName }}</p>
          <p><strong>Total:</strong> ${{ formatNumber(invoice.totalAmount) }}</p>
          <p><strong>Vencimiento:</strong> {{ formatDate(invoice.dueDate) }}</p>
        </div>
        <div class="modal-actions">
          <button @click="closeConfirmModal" class="btn-cancel">
            Cancelar
          </button>
          <button @click="confirmAction" class="btn-confirm">
            {{ confirmModal.confirmText }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de plantillas -->
    <div v-if="showTemplateModal" class="modal-overlay" @click="closeTemplateModal">
      <div class="modal-content large" @click.stop>
        <h3>Seleccionar Plantilla de Servicios</h3>
        
        <div class="template-list">
          <div v-for="template in serviceTemplates" :key="template.id" class="template-item">
            <div class="template-info">
              <h4>{{ template.name }}</h4>
              <p>{{ template.description }}</p>
              <span class="template-price">${{ formatNumber(template.price) }}</span>
            </div>
            <button @click="applyTemplate(template)" class="apply-template-btn">
              Aplicar
            </button>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeTemplateModal" class="btn-cancel">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import InvoiceService from '../services/invoice.service';
import ClientService from '../services/client.service';

export default {
  name: 'InvoiceForm',
  data() {
    return {
      loading: false,
      saving: false,
      isEdit: false,
      clientSearch: '',
      clientSearchResults: [],
      selectedClient: null,
      autoCalculateTax: true,
      invoice: {
        id: null,
        clientId: '',
        invoiceNumber: '',
        dueDate: '',
        billingPeriodStart: '',
        billingPeriodEnd: '',
        amount: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        notes: '',
        items: []
      },
      sendOptions: {
        sendEmail: true,
        sendWhatsApp: false,
        generatePDF: true
      },
      showConfirmModal: false,
      confirmModal: {
        title: '',
        message: '',
        confirmText: '',
        showDetails: false,
        action: null
      },
      showTemplateModal: false,
      serviceTemplates: [],
      searchTimeout: null
    };
  },
  computed: {
    subtotal() {
      return this.invoice.items.reduce((total, item) => {
        return total + (parseFloat(item.totalPrice) || 0);
      }, 0);
    },
    isFormValid() {
      return this.selectedClient && 
             this.invoice.dueDate && 
             this.invoice.items.length > 0 &&
             this.invoice.items.every(item => item.serviceName && item.unitPrice > 0);
    }
  },
  created() {
    this.initializeForm();
    this.loadServiceTemplates();
  },
  methods: {
    initializeForm() {
      const invoiceId = this.$route.params.id;
      
      if (invoiceId && invoiceId !== 'new') {
        this.isEdit = true;
        this.loadInvoice(invoiceId);
      } else {
        this.setDefaultDates();
        this.addInvoiceItem(); // Agregar un item por defecto
      }
    },

    setDefaultDates() {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      
      // Período de facturación del mes actual
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      this.invoice.dueDate = nextMonth.toISOString().split('T')[0];
      this.invoice.billingPeriodStart = startOfMonth.toISOString().split('T')[0];
      this.invoice.billingPeriodEnd = endOfMonth.toISOString().split('T')[0];
    },

    async loadInvoice(invoiceId) {
      this.loading = true;
      try {
        const response = await InvoiceService.getInvoiceById(invoiceId);
        const invoiceData = response.data;
        
        this.invoice = {
          ...invoiceData,
          dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate).toISOString().split('T')[0] : '',
          billingPeriodStart: invoiceData.billingPeriodStart ? new Date(invoiceData.billingPeriodStart).toISOString().split('T')[0] : '',
          billingPeriodEnd: invoiceData.billingPeriodEnd ? new Date(invoiceData.billingPeriodEnd).toISOString().split('T')[0] : '',
          items: invoiceData.items || []
        };

        // Cargar información del cliente
        if (invoiceData.clientId) {
          const clientResponse = await ClientService.getClient(invoiceData.clientId);
          this.selectedClient = clientResponse.data;
          this.clientSearch = this.selectedClient.fullName;
        }

        // Si no hay items, agregar uno por defecto
        if (this.invoice.items.length === 0) {
          this.addInvoiceItem();
        }

      } catch (error) {
        console.error('Error cargando factura:', error);
        alert('Error cargando los datos de la factura');
        this.$router.push('/billing/invoices');
      } finally {
        this.loading = false;
      }
    },

    async loadServiceTemplates() {
      try {
        // Simular plantillas de servicios (normalmente vendrían de la API)
        this.serviceTemplates = [
          {
            id: 1,
            name: 'Internet Residencial 20 Mbps',
            description: 'Plan básico para uso doméstico',
            price: 500,
            serviceName: 'Internet Residencial',
            description_detail: 'Plan 20 Mbps simétrico'
          },
          {
            id: 2,
            name: 'Internet Residencial 50 Mbps',
            description: 'Plan intermedio para uso doméstico',
            price: 800,
            serviceName: 'Internet Residencial',
            description_detail: 'Plan 50 Mbps simétrico'
          },
          {
            id: 3,
            name: 'Internet Empresarial 100 Mbps',
            description: 'Plan empresarial con soporte 24/7',
            price: 1500,
            serviceName: 'Internet Empresarial',
            description_detail: 'Plan 100 Mbps simétrico con IP fija'
          }
        ];
      } catch (error) {
        console.error('Error cargando plantillas:', error);
      }
    },

    searchClients() {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      this.searchTimeout = setTimeout(async () => {
        if (this.clientSearch.length >= 3) {
          try {
            const response = await ClientService.getAllClients({
              globalSearch: this.clientSearch,
              size: 10
            });
            this.clientSearchResults = response.data.clients || response.data;
          } catch (error) {
            console.error('Error buscando clientes:', error);
            this.clientSearchResults = [];
          }
        } else {
          this.clientSearchResults = [];
        }
      }, 300);
    },

    selectClient(client) {
      this.selectedClient = client;
      this.invoice.clientId = client.id;
      this.clientSearch = client.fullName;
      this.clientSearchResults = [];

      // Auto-llenar datos basados en el cliente
      if (client.billingDay) {
        const today = new Date();
        const dueDate = new Date(today.getFullYear(), today.getMonth(), client.billingDay);
        if (dueDate <= today) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        this.invoice.dueDate = dueDate.toISOString().split('T')[0];
      }

      // Si hay un plan de servicio, agregarlo automáticamente
      if (client.servicePackage && this.invoice.items.length === 1 && !this.invoice.items[0].serviceName) {
        this.invoice.items[0] = {
          serviceName: 'Internet Residencial',
          description: client.servicePackage,
          quantity: 1,
          unitPrice: client.monthlyFee || 0,
          totalPrice: client.monthlyFee || 0,
          periodStart: this.invoice.billingPeriodStart,
          periodEnd: this.invoice.billingPeriodEnd
        };
        this.calculateTotals();
      }
    },

    addInvoiceItem() {
      this.invoice.items.push({
        serviceName: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        periodStart: this.invoice.billingPeriodStart,
        periodEnd: this.invoice.billingPeriodEnd
      });
    },

    removeInvoiceItem(index) {
      if (this.invoice.items.length > 1) {
        this.invoice.items.splice(index, 1);
        this.calculateTotals();
      }
    },

    calculateItemTotal(index) {
      const item = this.invoice.items[index];
      const quantity = parseFloat(item.quantity) || 1;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      item.totalPrice = quantity * unitPrice;
      this.calculateTotals();
    },

    calculateTotals() {
      this.invoice.amount = this.subtotal;
      
      if (this.autoCalculateTax) {
        this.invoice.taxAmount = this.subtotal * 0.16; // 16% IVA
      }

      this.invoice.totalAmount = this.subtotal + 
                                (parseFloat(this.invoice.taxAmount) || 0) - 
                                (parseFloat(this.invoice.discountAmount) || 0);
    },

    toggleAutoTax() {
      if (this.autoCalculateTax) {
        this.invoice.taxAmount = this.subtotal * 0.16;
      }
      this.calculateTotals();
    },

    applyTemplate(template) {
      const newItem = {
        serviceName: template.serviceName,
        description: template.description_detail,
        quantity: 1,
        unitPrice: template.price,
        totalPrice: template.price,
        periodStart: this.invoice.billingPeriodStart,
        periodEnd: this.invoice.billingPeriodEnd
      };

      // Si es el primer item y está vacío, reemplazarlo
      if (this.invoice.items.length === 1 && !this.invoice.items[0].serviceName) {
        this.invoice.items[0] = newItem;
      } else {
        this.invoice.items.push(newItem);
      }

      this.calculateTotals();
      this.closeTemplateModal();
    },

    openTemplateModal() {
      this.showTemplateModal = true;
    },

    closeTemplateModal() {
      this.showTemplateModal = false;
    },

    saveDraft() {
      this.showConfirmation(
        'Guardar Borrador',
        'La factura se guardará como borrador. ¿Desea continuar?',
        'Guardar Borrador',
        'saveDraft'
      );
    },

    saveAndSend() {
      if (!this.isFormValid) {
        alert('Por favor complete todos los campos requeridos');
        return;
      }

      this.showConfirmation(
        this.isEdit ? 'Actualizar Factura' : 'Crear Factura',
        this.isEdit ? 
          'Se actualizará la factura con los nuevos datos.' :
          'Se creará la factura y se enviará al cliente según las opciones seleccionadas.',
        this.isEdit ? 'Actualizar' : 'Crear y Enviar',
        'saveAndSend',
        true
      );
    },

    cancel() {
      if (this.hasUnsavedChanges()) {
        if (confirm('¿Está seguro que desea cancelar? Se perderán los cambios no guardados.')) {
          this.goBack();
        }
      } else {
        this.goBack();
      }
    },

    goBack() {
      this.$router.push('/billing/invoices');
    },

    hasUnsavedChanges() {
      // Verificar si hay cambios no guardados
      return this.invoice.items.some(item => item.serviceName || item.unitPrice > 0) ||
             this.invoice.notes ||
             this.invoice.discountAmount > 0 ||
             this.invoice.taxAmount > 0;
    },

    showConfirmation(title, message, confirmText, action, showDetails = false) {
      this.confirmModal = {
        title,
        message,
        confirmText,
        showDetails,
        action
      };
      this.showConfirmModal = true;
    },

    closeConfirmModal() {
      this.showConfirmModal = false;
      this.confirmModal = {
        title: '',
        message: '',
        confirmText: '',
        showDetails: false,
        action: null
      };
    },

    async confirmAction() {
      const { action } = this.confirmModal;
      
      this.saving = true;
      this.closeConfirmModal();

      try {
        const invoiceData = this.prepareInvoiceData();

        if (action === 'saveDraft') {
          invoiceData.status = 'draft';
        }

        let response;
        if (this.isEdit) {
          response = await InvoiceService.updateInvoice(this.invoice.id, invoiceData);
        } else {
          // eslint-disable-next-line no-unused-vars
          response = await InvoiceService.createInvoice(invoiceData);
        }

        const message = this.isEdit ? 
          'Factura actualizada exitosamente' : 
          'Factura creada exitosamente';
        
        alert(message);
        this.$router.push('/billing/invoices');

      } catch (error) {
        console.error('Error guardando factura:', error);
        alert('Error guardando la factura. Por favor, intente nuevamente.');
      } finally {
        this.saving = false;
      }
    },

    prepareInvoiceData() {
      return {
        clientId: this.invoice.clientId,
        dueDate: this.invoice.dueDate,
        billingPeriodStart: this.invoice.billingPeriodStart,
        billingPeriodEnd: this.invoice.billingPeriodEnd,
        amount: this.invoice.amount,
        taxAmount: parseFloat(this.invoice.taxAmount) || 0,
        discountAmount: parseFloat(this.invoice.discountAmount) || 0,
        totalAmount: this.invoice.totalAmount,
        notes: this.invoice.notes,
        items: this.invoice.items.filter(item => item.serviceName && item.unitPrice > 0),
        sendOptions: this.sendOptions
      };
    },

    formatNumber(value) {
      if (!value) return '0.00';
      return parseFloat(value).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },

    formatDate(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('es-MX');
    }
  },
  
  // Actualizar totales cuando cambian los items
  watch: {
    'invoice.items': {
      handler() {
        this.calculateTotals();
      },
      deep: true
    }
  }
};
</script>

<style scoped>
.invoice-form {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.header h2 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.cancel-button, .draft-button, .save-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #666;
}

.draft-button {
  background-color: #FF9800;
  color: white;
}

.save-button {
  background-color: #4CAF50;
  color: white;
}

.save-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.invoice-form-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.form-section {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-section h3 {
  margin: 0 0 20px 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  border: none;
  padding: 0;
}

.add-item-btn {
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  flex: 1;
}
</style>