<template>
  <div class="inventory-detail-container">
    <!-- Barra superior con navegación y acciones -->
    <div class="detail-header">
      <div class="navigation">
        <button class="btn-back" @click="goBack">
          <i class="icon-arrow-left"></i>
          <span>Volver al inventario</span>
        </button>
        
        <div class="breadcrumbs" v-if="item">
          <span>Inventario</span>
          <i class="icon-chevron-right"></i>
          <span>{{ getCategoryName(item.category) }}</span>
          <i class="icon-chevron-right"></i>
          <span class="current">{{ item.name }}</span>
        </div>
      </div>
      
      <div class="actions" v-if="item">
        <button class="btn-outline" @click="printDetails">
          <i class="icon-printer"></i>
          <span>Imprimir</span>
        </button>
        
        <button class="btn-outline" @click="generateQR">
          <i class="icon-qrcode"></i>
          <span>Generar QR</span>
        </button>
        
        <button class="btn-outline" @click="editItem">
          <i class="icon-edit"></i>
          <span>Editar</span>
        </button>
        
        <button class="btn-outline danger" @click="confirmDelete">
          <i class="icon-trash"></i>
          <span>Eliminar</span>
        </button>
      </div>
    </div>
    
    <!-- Contenido principal -->
    <div class="detail-content" v-if="item">
      <!-- Información general del elemento -->
      <div class="item-overview">
        <div class="item-primary-info">
          <div class="item-status-badge" :class="getStatusClass(item.status)">
            {{ getStatusName(item.status) }}
          </div>
          
          <h1 class="item-name">{{ item.name }}</h1>
          
          <div class="item-identifiers">
            <div class="identifier" v-if="item.serialNumber">
              <span class="label">Número de serie:</span>
              <span class="value">{{ item.serialNumber }}</span>
            </div>
            
            <div class="identifier" v-if="item.macAddress">
              <span class="label">MAC:</span>
              <span class="value">{{ item.macAddress }}</span>
            </div>
            
            <div class="identifier" v-if="item.code">
              <span class="label">Código:</span>
              <span class="value">{{ item.code }}</span>
            </div>
          </div>
        </div>
        
        <div class="item-image-container">
          <div class="item-image" v-if="item.imageUrl">
            <img :src="item.imageUrl" :alt="item.name" />
          </div>
          <div class="item-icon" v-else>
            <i :class="getCategoryIcon(item.category)"></i>
          </div>
        </div>
      </div>
      
      <!-- Paneles de información detallada -->
      <div class="item-panels">
        <!-- Panel de especificaciones -->
        <div class="info-panel specifications">
          <h2 class="panel-title">Especificaciones</h2>
          
          <div class="panel-content">
            <div class="info-group">
              <div class="info-row" v-if="item.brand">
                <span class="label">Marca:</span>
                <span class="value">{{ item.brand }}</span>
              </div>
              
              <div class="info-row" v-if="item.model">
                <span class="label">Modelo:</span>
                <span class="value">{{ item.model }}</span>
              </div>
              
              <div class="info-row" v-if="item.category">
                <span class="label">Categoría:</span>
                <span class="value">{{ getCategoryName(item.category) }}</span>
              </div>
              
              <div class="info-row" v-if="item.type">
                <span class="label">Tipo:</span>
                <span class="value">{{ getTypeName(item.type) }}</span>
              </div>
            </div>
            
            <div class="info-group" v-if="item.specifications">
              <div class="info-row" v-for="(spec, key) in item.specifications" :key="key">
                <span class="label">{{ formatSpecLabel(key) }}:</span>
                <span class="value">{{ spec }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Panel de información de adquisición -->
        <div class="info-panel acquisition">
          <h2 class="panel-title">Información de adquisición</h2>
          
          <div class="panel-content">
            <div class="info-group">
              <div class="info-row" v-if="item.purchaseDate">
                <span class="label">Fecha de compra:</span>
                <span class="value">{{ formatDate(item.purchaseDate) }}</span>
              </div>
              
              <div class="info-row" v-if="item.cost !== undefined && item.cost !== null">
                <span class="label">Costo:</span>
                <span class="value">{{ formatCurrency(item.cost) }}</span>
              </div>
              
              <div class="info-row" v-if="item.supplier">
                <span class="label">Proveedor:</span>
                <span class="value">{{ item.supplier }}</span>
              </div>
              
              <div class="info-row" v-if="item.warrantyUntil">
                <span class="label">Garantía hasta:</span>
                <span class="value">
                  {{ formatDate(item.warrantyUntil) }}
                  <span class="warranty-status" :class="getWarrantyStatusClass(item.warrantyUntil)">
                    ({{ getWarrantyStatus(item.warrantyUntil) }})
                  </span>
                </span>
              </div>
              
              <div class="info-row" v-if="item.invoice">
                <span class="label">Factura:</span>
                <span class="value document-link" @click="viewDocument(item.invoice)">
                  <i class="icon-file"></i> Ver documento
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Panel de ubicación y asignación -->
        <div class="info-panel location">
          <h2 class="panel-title">Ubicación y asignación</h2>
          
          <div class="panel-content">
            <div class="info-group">
              <div class="info-row" v-if="item.location">
                <span class="label">Ubicación actual:</span>
                <span class="value">{{ getLocationName(item.location.name) }}</span>
              </div>
              
              <div class="info-row" v-if="item.assignedClient">
                <span class="label">Cliente asignado:</span>
                <span class="value client-link" @click="viewClient(item.assignedClient.id)">
                  {{ item.assignedClient.firstName }}
                </span>
              </div>
              
              <div class="info-row" v-else-if="item.assignedTo">
                <span class="label">Asignado a:</span>
                <span class="value">{{ item.assignedTo }}</span>
              </div>
              
              <div class="info-row" v-if="item.installationDate">
                <span class="label">Fecha de instalación:</span>
                <span class="value">{{ formatDate(item.installationDate) }}</span>
              </div>
            </div>
          </div>
          
          <div class="location-actions" v-if="!item.assignedClient">
            <button class="btn-outline" @click="openAssignDialog">
              <i class="icon-user-plus"></i>
              <span>Asignar</span>
            </button>
            
            <button class="btn-outline" @click="openMoveDialog">
              <i class="icon-move"></i>
              <span>Mover</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Historial de movimientos -->
      <div class="movements-history">
        <h2 class="section-title">Historial de movimientos</h2>
        
        <div class="movements-table-container" v-if="movements && movements.length">
          <table class="movements-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Usuario</th>
                <th>Notas</th>
              </tr>
            </thead>
            
            <tbody>
              <tr v-for="movement in movements" :key="movement.id">
                <td>{{ formatDateTime(movement.movementDate) }}</td>
                <td>{{ getMovementTypeName(movement.type) }}</td>
                <td>{{ getLocationName(movement.fromLocation).name }}</td>
                <td>{{ getLocationName(movement.toLocation).name }}</td>
                <td>{{ movement.movedBy ? movement.movedBy.name : 'Sistema' }}</td>
                <td>{{ movement.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="no-movements" v-else>
          No hay movimientos registrados para este elemento.
        </div>
      </div>
      
      <!-- Notas y comentarios -->
      <div class="notes-section" v-if="item.notes">
        <h2 class="section-title">Notas</h2>
        
        <div class="notes-content">
          {{ item.notes }}
        </div>
      </div>
    </div>
    
    <!-- Estado de carga y errores -->
    <div class="loading-state" v-if="loading">
      <div class="spinner"></div>
      <span>Cargando detalles...</span>
    </div>
    
    <div class="error-state" v-if="error">
      <i class="icon-alert-circle"></i>
      <h3>Error al cargar los detalles</h3>
      <p>{{ error }}</p>
      <button class="btn-primary" @click="loadItem">Reintentar</button>
    </div>
    
    <div class="not-found" v-if="notFound">
      <i class="icon-help-circle"></i>
      <h3>Elemento no encontrado</h3>
      <p>El elemento que busca no existe o ha sido eliminado.</p>
      <button class="btn-primary" @click="goBack">Volver al inventario</button>
    </div>
    
    <!-- Modales -->
    <!-- Modal para confirmar eliminación -->
    <BaseModal
      v-if="showDeleteModal"
      :show="showDeleteModal"
      title="Confirmar eliminación"
      @close="closeDeleteModal"
      @confirm="deleteItem"
      :loading="deletingItem"
      confirmText="Eliminar"
      confirmClass="danger"
    >
      <div class="confirm-delete">
        <p>¿Está seguro de que desea eliminar este elemento del inventario?</p>
        <p class="warning">Esta acción no se puede deshacer.</p>
        
        <div class="delete-details" v-if="item">
          <div class="info-row">
            <span class="label">Elemento:</span>
            <span class="value">{{ item.name }}</span>
          </div>
          
          <div class="info-row" v-if="item.serialNumber">
            <span class="label">Número de serie:</span>
            <span class="value">{{ item.serialNumber }}</span>
          </div>
          
          <div class="info-row" v-if="item.location">
            <span class="label">Ubicación:</span>
            <span class="value">{{ getLocationName(item.location) }}</span>
          </div>
        </div>
      </div>
    </BaseModal>
    
    <!-- Modal para asignar a cliente o técnico -->
    <BaseModal
      v-if="showAssignModal"
      title="Asignar elemento"
      @close="closeAssignModal"
      size="default"
    >
      <template #body>
        <div class="assign-form">
          <div class="form-group">
            <label>Asignar a:</label>
            <div class="radio-group">
              <label class="radio">
                <input type="radio" v-model="assignmentType" value="client">
                <span>Cliente</span>
              </label>
              
              <label class="radio">
                <input type="radio" v-model="assignmentType" value="technician">
                <span>Técnico</span>
              </label>
              
              <label class="radio">
                <input type="radio" v-model="assignmentType" value="other">
                <span>Otro</span>
              </label>
            </div>
          </div>
          
          <div class="form-group" v-if="assignmentType === 'client'">
            <label>Cliente:</label>
            <select v-model="assignmentData.clientId" class="form-control">
              <option value="">Seleccionar cliente...</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.firstName }} {{ client.lastName }}
              </option>
            </select>
          </div>
          
          <div class="form-group" v-if="assignmentType === 'technician'">
            <label>Técnico:</label>
            <select v-model="assignmentData.technicianId" class="form-control">
              <option value="">Seleccionar técnico...</option>
              <option v-for="technician in technicians" :key="technician.id" :value="technician.id">
                {{ technician.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group" v-if="assignmentType === 'other'">
            <label>Descripción:</label>
            <input type="text" v-model="assignmentData.description" class="form-control" placeholder="Ej: Laboratorio de pruebas">
          </div>
          
          <div class="form-group">
            <label>Notas de asignación:</label>
            <textarea v-model="assignmentData.notes" class="form-control" rows="3" placeholder="Detalles adicionales sobre esta asignación"></textarea>
          </div>
        </div>
      </template>
      
      <template #footer>
        <button 
          class="btn-outline" 
          @click="closeAssignModal"
          :disabled="assigningItem"
        >
          Cancelar
        </button>
        <button 
          class="btn-primary" 
          @click="saveAssignment"
          :disabled="assigningItem"
        >
          <i v-if="assigningItem" class="icon-loader"></i>
          {{ assigningItem ? 'Guardando...' : 'Guardar' }}
        </button>
      </template>
    </BaseModal>
    
    <!-- Modal para mover a otra ubicación -->
    <BaseModal
      v-if="showMoveModal"
      title="Mover elemento"
      @close="closeMoveModal"
      size="default"
    >
      <template #body>
        <div class="move-form">
          <div class="form-group">
            <label>Ubicación actual:</label>
            <div class="current-location">{{ getLocationName(item.location) }}</div>
          </div>
          
          <div class="form-group">
            <label>Nueva ubicación:</label>
            <select v-model="movementData.toLocationId" class="form-control">
              <option value="">Seleccionar ubicación...</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Razón del movimiento:</label>
            <select v-model="movementData.reason" class="form-control">
              <option value="">Seleccionar razón...</option>
              <option value="transfer">Transferencia</option>
              <option value="repair">Reparación</option>
              <option value="installation">Instalación</option>
              <option value="return">Devolución</option>
              <option value="other">Otra</option>
            </select>
          </div>
          
          <div class="form-group" v-if="movementData.reason === 'other'">
            <label>Especificar razón:</label>
            <input type="text" v-model="movementData.customReason" class="form-control">
          </div>
          
          <div class="form-group">
            <label>Notas:</label>
            <textarea v-model="movementData.notes" class="form-control" rows="3"></textarea>
          </div>
        </div>
      </template>
      
      <template #footer>
        <button 
          class="btn-outline" 
          @click="closeMoveModal"
          :disabled="movingItem"
        >
          Cancelar
        </button>
        <button 
          class="btn-primary" 
          @click="saveMovement"
          :disabled="movingItem"
        >
          <i v-if="movingItem" class="icon-loader"></i>
          {{ movingItem ? 'Moviendo...' : 'Mover' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script>

import BaseModal from '@/components/common/Modal.vue';

import inventoryService from '../../services/inventory.service';
import clientService from '../../services/client.service';

import userService from '../../services/user.service';
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
import { formatDate, formatDateTime, formatCurrency } from '@/utils/formatters';

export default {
  name: 'InventoryDetail',
  components: {
    BaseModal
  },
  data() {
    return {
      // Datos del elemento y estado de carga
      item: {},
      clients: [],
      locations: [],
      itemId: {},
      created: [],
      
      movements: [],
      loading: true,
      error: null,

      notFound: false,
      
      // Metadatos
      categories: [],
      statuses: [],

      types: [],

      technicians: [],
      
      // Modales
      showDeleteModal: false,
      showStatusModal: true,
      statusChange: {
        status: '',
        reason: '',
        notes: ''
      },
      showAssignModal: false,
      assignment: {
        clientId: '',
        reason: '',
        notes: ''
      },
      showLocationModal: false,
      locationChange: {
        locationId: '',
        reason: '',
        notes: ''
      },
      showMoveModal: false,
      
      // Estados de operaciones
      deletingItem: false,
      assigningItem: false,
      movingItem: false,
      
      // Datos para asignación
      assignmentType: 'client',
      assignmentData: {
        clientId: '',
        technicianId: '',
        description: '',
        notes: ''
      },
      
      // Datos para movimiento
      movementData: {
        toLocationId: '',
        reason: '',
        customReason: '',
        notes: '',
		movedById: 1
      }
    };
  },
  created() {
    
 
    this.loadItem();
	this.loadMovementHistory()
    // Cargar datos principales
    //this.loadItemDetails();
    
    // Cargar metadatos
    //this.loadMetadata();
	
   
    this.loadClients();
    this.loadLocations();
  },
  methods: {
    /**
     * Cargar detalles del elemento
     */
    async loadItem() {
    this.loading = true;
      this.error = null;
      this.notFound = false;
    try {
       const response = await inventoryService.getInventory(this.$route.params.id);
       this.item = response.data;
       console.log('prueba item', this.item);
        if (this.item) {
          //this.loadMovementHistory();
        }

    } catch (error) {
      console.error('Error cargando item loadItem: ', error);
        this.error = 'Error cargando datos del item. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }	  
},

    async loadClients() {
      try {
        const response = await clientService.getAllClients({ active: true, size: 100 });
        
        // Manejar diferentes formatos de respuesta
        if (response.data) {
          this.clients = response.data.clients || response.data.items || response.data || [];
        } else {
          this.clients = [];
        }
        
        console.log('Clientes cargados:', this.clients.length);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        this.clients = [];
        
        // Fallback con datos mock si falla la API
        this.clients = [
          { id: 1, name: 'Juan Pérez', status: 'active' },
          { id: 2, name: 'María López', status: 'active' },
          { id: 3, name: 'Carlos Ruiz', status: 'active' }
        ];
      }
    },
    
    /**
     * Cargar historial de movimientos
     */
    async loadMovementHistory() {
      try {
        const response = await inventoryService.getMovementsByItem(this.$route.params.id);
        this.movements = response.data;
		console.log('objetos del movement:', this.movements);
      } catch (error) {
        console.error('Error al cargar historial de movimientos:', error);
        // No mostramos error crítico si fallan los movimientos
      }
    },
	
    formatDate(dateString) {
      if (!dateString) return null;
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    formatDateTime(dateString) {
      if (!dateString) return null;
      
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    /**
     * Cargar metadatos necesarios
     */
    async loadMetadata() {
      try {
        // Cargar categorías, estados y ubicaciones
        const [categories, statuses, locations, types] = await Promise.all([
          inventoryService.getCategories(),
          inventoryService.getStatuses(),
          inventoryService.getLocations(),
          inventoryService.getTypes()
        ]);
        
        this.categories = categories;
        this.statuses = statuses;
        this.locations = locations;
        this.types = types;
      } catch (error) {
        console.error('Error al cargar metadatos:', error);
      }
    },
    
    /**
     * Cargar datos para asignación
     */
    async loadAssignmentData() {
      try {
        const [clients, technicians] = await Promise.all([
          clientService.getActiveClients(),
          userService.getTechnicians()
        ]);
        
        this.clients = clients;
        this.technicians = technicians;
      } catch (error) {
        console.error('Error al cargar datos para asignación:', error);
        this.$emit('show-notification', {
          type: 'error',
          message: 'Error al cargar datos para asignación. Por favor, intente nuevamente.'
        });
      }
    },
    
    /**
     * Volver a la lista de inventario
     */
    goBack() {
      this.$router.push('/inventory');
    },
    
    /**
     * Imprimir detalles del elemento
     */
    printDetails() {
      window.print();
    },
    
    /**
     * Generar código QR para el elemento
     */
    async generateQR() {
      try {
        // Llamar al servicio con el ID del item
        const response = await inventoryService.generateQRCodes(this.item.id);
        
        // El backend debería retornar el QR code
        // Por ahora mostramos un mensaje de éxito
        this.$emit('show-notification', {
          type: 'success',
          message: 'Código QR generado correctamente'
        });
        
        // Si el backend retorna un blob o URL, lo procesamos
        if (response.data) {
          console.log('QR generado:', response.data);
          // Aquí puedes manejar la descarga si el backend lo envía
        }
      } catch (error) {
        console.error('Error al generar código QR:', error);
        this.$emit('show-notification', {
          type: 'error',
          message: 'Error al generar código QR. Por favor, intente nuevamente.'
        });
      }
    },
    
    /**
     * Abrir formulario de edición
     */
    editItem() {
      // Redirigir a la ruta de edición o mostrar modal de edición
      this.$router.push(`/inventory/${this.item.id}/edit`);
    },
    
    /**
     * Abrir modal para confirmar eliminación
     */
    confirmDelete() {
      this.showDeleteModal = true;
    },
    
    /**
     * Cerrar modal de confirmación de eliminación
     */
    closeDeleteModal() {
      this.showDeleteModal = false;
    },
    
    /**
     * Eliminar elemento
     */
    async deleteItem() {
      this.deletingItem = true;
      
      try {
        await inventoryService.deleteItem(this.item.id);
        
        this.$emit('show-notification', {
          type: 'success',
          message: 'Elemento eliminado correctamente'
        });
        
        // Cerrar modal y redirigir a inventario
        this.closeDeleteModal();
        this.goBack();
      } catch (error) {
        console.error('Error al eliminar elemento:', error);
        this.$emit('show-notification', {
          type: 'error',
          message: 'Error al eliminar elemento. Por favor, intente nuevamente.'
        });
      } finally {
        this.deletingItem = false;
      }
    },
    
    /**
     * Ver documento relacionado
     */
    viewDocument(documentUrl) {
      window.open(documentUrl, '_blank');
    },
    
    /**
     * Ver perfil de cliente
     */
    viewClient(clientId) {
      this.$router.push(`/clients/${clientId}`);
    },
    
    /**
     * Abrir modal para asignar elemento
     */
    async openAssignDialog() {
      // Cargar datos necesarios para asignación
      await this.loadAssignmentData();
      
      // Resetear datos de asignación
      this.assignmentType = 'client';
      this.assignmentData = {
        clientId: '',
        technicianId: '',
        description: '',
        notes: ''
      };
      
      // Mostrar modal
      this.showAssignModal = true;
    },
    
    /**
     * Cerrar modal de asignación
     */
    closeAssignModal() {
      this.showAssignModal = false;
    },
    
    /**
     * Guardar asignación
     */
    async saveAssignment() {
      this.assigningItem = true;
      
      try {
        // Preparar datos según el tipo de asignación
        if (this.assignmentType === 'client') {
          // Usar assignToClient del servicio
          await inventoryService.assignToClient(
            this.item.id,
            this.assignmentData.clientId,
            'Asignación manual',
            this.assignmentData.notes
          );
        } else if (this.assignmentType === 'technician') {
          // Usar assignToTechnician del servicio
          await inventoryService.assignToTechnician({
            inventoryId: this.item.id,
            technicianId: this.assignmentData.technicianId,
            notes: this.assignmentData.notes
          });
        } else {
          // Para 'other', podemos usar updateInventory para cambiar el estado
          await inventoryService.updateInventory(this.item.id, {
            ...this.item,
            notes: this.assignmentData.notes,
            assignedTo: this.assignmentData.description
          });
        }
        
        this.$emit('show-notification', {
          type: 'success',
          message: 'Elemento asignado correctamente'
        });
        
        // Cerrar modal y recargar datos
        this.closeAssignModal();
        this.loadItem();
      } catch (error) {
        console.error('Error al asignar elemento:', error);
        this.$emit('show-notification', {
          type: 'error',
          message: 'Error al asignar elemento. Por favor, intente nuevamente.'
        });
      } finally {
        this.assigningItem = false;
      }
    },
    
    /**
     * Abrir modal para mover elemento
     */
    openMoveDialog() {
      // Resetear datos de movimiento
      this.movementData = {
        toLocationId: '',
        reason: '',
        customReason: '',
        notes: '',
        movedById: 1
      };
      
      // Mostrar modal
      this.showMoveModal = true;
    },
    
    /**
     * Cerrar modal de movimiento
     */
    closeMoveModal() {
      this.showMoveModal = false;
    },
    
    /**
     * Guardar movimiento
     */
    async saveMovement() {
      this.movingItem = true;
      
      try {
        // Preparar datos de movimiento según la estructura esperada por createMovement
        const movementData = {
          inventoryId: this.item.id,
          fromLocationId: typeof this.item.location === 'object' ? this.item.location.id : this.item.location,
          toLocationId: this.movementData.toLocationId,
          type: 'transfer', // Tipo de movimiento
          reason: this.movementData.reason === 'other' ? this.movementData.customReason : this.movementData.reason,
          notes: this.movementData.notes,
          movedById: 1
          //performedBy: null // Podría obtener el usuario actual
        };
        
        // Usar createMovement del servicio
        await inventoryService.createMovement(movementData);
        
        this.$emit('show-notification', {
          type: 'success',
          message: 'Elemento movido correctamente'
        });
        
        // Cerrar modal y recargar datos
        this.closeMoveModal();
        this.loadItem();
      } catch (error) {
        console.error('Error al mover elemento:', error);
        this.$emit('show-notification', {
          type: 'error',
          message: 'Error al mover elemento. Por favor, intente nuevamente.'
        });
      } finally {
        this.movingItem = false;
      }
    },
    
    /**
     * Obtener nombre de categoría
     */
    getCategoryName(categoryId) {
      if (!categoryId) return '—';
      
      const category = this.categories.find(c => c.id === categoryId);
      return category ? category.name : categoryId;
    },
    
    /**
     * Obtener nombre de tipo
     */
    getTypeName(typeId) {
      if (!typeId) return '—';
      
      const type = this.types.find(t => t.id === typeId);
      return type ? type.name : typeId;
    },
    
    /**
     * Obtener nombre de estado
     */
    getStatusName(statusId) {
      if (!statusId) return '—';
      
      const status = this.statuses.find(s => s.id === statusId);
      return status ? status.name : statusId;
    },
    
    /**
     * Obtener clase CSS para el estado
     */
    getStatusClass(statusId) {
      if (!statusId) return '';
      
      const status = this.statuses.find(s => s.id === statusId);
      if (!status) return '';
      
      return `status-${status.id.toLowerCase().replace(/\s+/g, '-')}`;
    },
    
    /**
     * Obtener nombre de ubicación
     */
    getLocationName(location) {
      if (!location) return '—';
      
      // Si location ya es un objeto con name, retornar directamente
      if (typeof location === 'object' && location.name) {
        return location.name;
      }
      
      // Si es un ID, buscar en el array de locations
      if (typeof location === 'number' || typeof location === 'string') {
        const foundLocation = this.locations.find(l => l.id === location);
        console.log('Buscando ubicación con ID:', location, 'Encontrada:', foundLocation);
        return foundLocation ? foundLocation.name : location;
      }
      
      return '—';
    },

    async loadLocations() {
      try {
        const response = await inventoryService.getAllLocations({ active: true });
        
        // Manejar diferentes formatos de respuesta
        if (response.data) {
          this.locations = response.data.locations || response.data.items || response.data || [];
        } else {
          this.locations = [];
        }
        
        console.log('Ubicaciones cargadas:', this.locations.length);
      } catch (error) {
        console.error('Error cargando ubicaciones:', error);
        this.locations = [];
        
        // Fallback con datos mock si falla la API
        this.locations = [
          { id: 1, name: 'Almacén Principal', type: 'warehouse' },
          { id: 2, name: 'Bodega Norte', type: 'storage' },
          { id: 3, name: 'Oficina Central', type: 'office' }
        ];
      }
    },    
    /**
     * Obtener ícono para categoría
     */
    getCategoryIcon(categoryId) {
      if (!categoryId) return 'icon-box';
      
      // Mapeo directo de categorías a íconos
      const iconMap = {
        'routers': 'icon-wifi',
        'router': 'icon-wifi',
        'antennas': 'icon-radio',
        'antenna': 'icon-radio',
        'cables': 'icon-cable',
        'cable': 'icon-cable',
        'switches': 'icon-layers',
        'switch': 'icon-layers',
        'servers': 'icon-server',
        'server': 'icon-server',
        'tools': 'icon-tool',
        'tool': 'icon-tool',
        'accessories': 'icon-box',
        'misc': 'icon-box'
      };
      
      // Normalizar el ID (a minúsculas)
      const normalizedId = categoryId.toString().toLowerCase();
      return iconMap[normalizedId] || 'icon-box';
    },
    
    /**
     * Obtener nombre de tipo de movimiento
     */
    getMovementTypeName(type) {
      const typeNames = {
        'in': 'Entrada',
        'out': 'Salida',
        'transfer': 'Transferencia',
        'return': 'Devolución',
        'assignment': 'Asignación',
        'scrap': 'Descarte'
      };
      
      return typeNames[type] || type;
    },
    
    /**
     * Obtener estado de garantía
     */
    getWarrantyStatus(warrantyDate) {
      if (!warrantyDate) return 'Sin garantía';
      
      const now = new Date();
      const warranty = new Date(warrantyDate);
      
      if (warranty < now) {
        return 'Vencida';
      } else {
        // Calcular días restantes
        const diffTime = Math.abs(warranty - now);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return `${diffDays} días restantes`;
      }
    },
    
    /**
     * Obtener clase CSS para estado de garantía
     */
    getWarrantyStatusClass(warrantyDate) {
      if (!warrantyDate) return 'no-warranty';
      
      const now = new Date();
      const warranty = new Date(warrantyDate);
      
      if (warranty < now) {
        return 'warranty-expired';
      } else {
        // Calcular días restantes
        const diffTime = Math.abs(warranty - now);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 30) {
          return 'warranty-ending';
        } else {
          return 'warranty-valid';
        }
      }
    },
    
    /**
     * Formatear etiqueta de especificación
     */
    formatSpecLabel(key) {
      // Convertir camelCase a palabras
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, function(str) { return str.toUpperCase(); });
    },
    

    
    /**
     * Formatear moneda
     */
    formatCurrency(amount) {
      return formatCurrency(amount);
    }
  }
};
</script>

<style scoped>
.inventory-detail-container {
  padding: 0 24px 24px;
}

/* Cabecera con navegación y acciones */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.navigation {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: none;
  border: none;
  color: var(--text-secondary, #666);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  color: var(--primary-color, #1976d2);
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.breadcrumbs i {
  font-size: 12px;
}

.breadcrumbs .current {
  color: var(--text-primary, #333);
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 12px;
}

/* Información general del elemento */
.item-overview {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding: 24px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
}

.item-primary-info {
  flex: 1;
}

.item-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 16px;
  margin-bottom: 12px;
  background-color: var(--bg-secondary, #f5f5f5);
}

/* Clases para diferentes estados */
.status-active {
  background-color: var(--success-light, #e8f5e9);
  color: var(--success-color, #4caf50);
}

.status-inactive {
  background-color: var(--warning-light, #fff3e0);
  color: var(--warning-color, #ff9800);
}

.status-maintenance {
  background-color: var(--info-light, #e3f2fd);
  color: var(--info-color, #2196f3);
}

.status-damaged {
  background-color: var(--error-light, #ffebee);
  color: var(--error-color, #f44336);
}

.status-reserved {
  background-color: var(--purple-light, #f3e5f5);
  color: var(--purple-color, #9c27b0);
}

.status-assigned {
  background-color: var(--teal-light, #e0f2f1);
  color: var(--teal-color, #009688);
}

.item-name {
  margin: 0 0 16px;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.item-identifiers {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.identifier {
  display: flex;
  align-items: center;
  gap: 8px;
}

.identifier .label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #666);
}

.identifier .value {
  font-size: 14px;
  color: var(--text-primary, #333);
  font-family: monospace;
}

.item-image-container {
  width: 120px;
  height: 120px;
  margin-left: 24px;
}

.item-image {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-secondary, #666);
  font-size: 48px;
}

/* Paneles de información */
.item-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.info-panel {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.panel-title {
  margin: 0;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
  background-color: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.panel-content {
  padding: 16px;
}

.info-group {
  margin-bottom: 16px;
}

.info-group:last-child {
  margin-bottom: 0;
}

.info-row {
  display: flex;
  margin-bottom: 12px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  width: 150px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
}

.info-row .value {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary, #333);
}

.document-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary-color, #1976d2);
  cursor: pointer;
}

.document-link:hover {
  text-decoration: underline;
}

.client-link {
  color: var(--primary-color, #1976d2);
  cursor: pointer;
}

.client-link:hover {
  text-decoration: underline;
}

.warranty-status {
  margin-left: 8px;
  font-size: 12px;
}

.warranty-valid {
  color: var(--success-color, #4caf50);
}

.warranty-ending {
  color: var(--warning-color, #ff9800);
}

.warranty-expired {
  color: var(--error-color, #f44336);
}

.no-warranty {
  color: var(--text-secondary, #666);
}

.location-actions {
  padding: 0 16px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Historial de movimientos */
.movements-history {
  margin-bottom: 32px;
}

.section-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.movements-table-container {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.movements-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.movements-table th,
.movements-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.movements-table th {
  font-weight: 600;
  color: var(--text-primary, #333);
  background-color: var(--bg-secondary, #f5f5f5);
}

.movements-table tr:last-child td {
  border-bottom: none;
}

.movements-table tbody tr:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.no-movements {
  padding: 24px;
  text-align: center;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  color: var(--text-secondary, #666);
}

/* Notas */
.notes-section {
  margin-bottom: 32px;
}

.notes-content {
  padding: 16px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  color: var(--text-primary, #333);
  white-space: pre-line;
  font-size: 14px;
}

/* Estados de carga y errores */
.loading-state,
.error-state,
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--primary-lighter, #bbdefb);
  border-top: 3px solid var(--primary-color, #1976d2);
  border-radius: 50%;
  margin-bottom: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.icon-loader {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 4px;
}

.loading-state span,
.error-state p,
.not-found p {
  font-size: 14px;
  color: var(--text-secondary, #666);
  margin: 8px 0;
}

.error-state i,
.not-found i {
  font-size: 48px;
  margin-bottom: 16px;
  color: var(--error-color, #f44336);
}

.not-found i {
  color: var(--warning-color, #ff9800);
}

.error-state h3,
.not-found h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

/* Modales */
.confirm-delete {
  padding: 16px 0;
  text-align: center;
}

.confirm-delete p {
  margin: 0 0 16px;
  font-size: 16px;
  color: var(--text-primary, #333);
}

.confirm-delete .warning {
  color: var(--error-color, #f44336);
  font-weight: 500;
}

.delete-details {
  margin-top: 24px;
  padding: 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  text-align: left;
}

.assign-form,
.move-form {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  background-color: var(--bg-primary, white);
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.radio {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.current-location {
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-secondary, #666);
}

/* Botones */
.btn-primary,
.btn-outline,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-dark, #1565c0);
}

.btn-outline {
  background-color: transparent;
  border: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-primary, #333);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-outline.danger {
  color: var(--error-color, #f44336);
  border-color: var(--error-color, #f44336);
}

.btn-outline.danger:hover:not(:disabled) {
  background-color: var(--error-light, #ffebee);
}

.btn-secondary {
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-primary, #333);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-primary:disabled,
.btn-outline:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .navigation {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
  
  .actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .item-overview {
    flex-direction: column;
    gap: 24px;
  }
  
  .item-image-container {
    margin-left: 0;
  }
  
  .item-panels {
    grid-template-columns: 1fr;
  }
  
  .info-row {
    flex-direction: column;
  }
  
  .info-row .label {
    width: 100%;
    margin-bottom: 4px;
  }
  
  .movements-table-container {
    overflow-x: auto;
  }
}

/* Estilo para impresión */
@media print {
  .detail-header,
  .actions,
  .location-actions,
  .btn-back,
  .btn-primary,
  .btn-outline {
    display: none;
  }
  
  .inventory-detail-container {
    padding: 0;
  }
  
  .item-overview,
  .info-panel,
  .notes-content,
  .movements-table-container {
    box-shadow: none;
    border: 1px solid #ccc;
  }
}
</style>