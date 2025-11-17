<template>
  <div class="inventory-editor-container">
    <!-- Formulario de edición -->
    <form @submit.prevent="saveItem" class="editor-form">
      <!-- Cabecera del formulario -->
      <div class="form-header">
        <h2 class="form-title">{{ isEditMode ? 'Editar elemento' : 'Nuevo elemento' }}</h2>
        
        <div v-if="isEditMode" class="item-status">
          <div class="status-badge" :class="getStatusClass(formData.status)">
            {{ getStatusName(formData.status) }}
          </div>
        </div>
      </div>
      
      <!-- Mensajes de alerta -->
      <div v-if="errorMessage" class="alert error">
        <i class="icon-alert-circle"></i>
        <span>{{ errorMessage }}</span>
        <button type="button" class="alert-close" @click="errorMessage = ''">
          <i class="icon-x"></i>
        </button>
      </div>
      
      <div v-if="successMessage" class="alert success">
        <i class="icon-check-circle"></i>
        <span>{{ successMessage }}</span>
        <button type="button" class="alert-close" @click="successMessage = ''">
          <i class="icon-x"></i>
        </button>
      </div>
      
      <!-- Secciones del formulario en pestañas -->
      <div class="form-tabs">
        <button 
          type="button"
          class="tab-button" 
          :class="{ active: activeTab === 'general' }"
          @click="activeTab = 'general'"
        >
          <i class="icon-info"></i>
          <span>Información general</span>
        </button>
        
        <button 
          type="button"
          class="tab-button" 
          :class="{ active: activeTab === 'details' }"
          @click="activeTab = 'details'"
        >
          <i class="icon-list"></i>
          <span>Detalles técnicos</span>
        </button>
        
        <button 
          type="button"
          class="tab-button" 
          :class="{ active: activeTab === 'location' }"
          @click="activeTab = 'location'"
        >
          <i class="icon-map-pin"></i>
          <span>Ubicación y asignación</span>
        </button>
        
        <button 
          type="button"
          class="tab-button" 
          :class="{ active: activeTab === 'notes' }"
          @click="activeTab = 'notes'"
        >
          <i class="icon-file-text"></i>
          <span>Notas y anexos</span>
        </button>
      </div>
      
      <!-- Contenido de las pestañas -->
      <div class="tab-content">
        <!-- Pestaña de información general -->
        <div v-show="activeTab === 'general'" class="tab-pane">
          <div class="form-grid">
            <div class="form-group">
              <label for="name">Nombre *</label>
              <input 
                id="name" 
                type="text" 
                v-model="formData.name" 
                required 
                class="form-control"
                :class="{ 'is-invalid': validationErrors.name }"
              >
              <div v-if="validationErrors.name" class="invalid-feedback">
                {{ validationErrors.name }}
              </div>
            </div>
            
            <div class="form-group">
              <label for="code">Código</label>
              <input 
                id="code" 
                type="text" 
                v-model="formData.code" 
                class="form-control"
                :class="{ 'is-invalid': validationErrors.code }"
              >
              <div v-if="validationErrors.code" class="invalid-feedback">
                {{ validationErrors.code }}
              </div>
              <div class="form-hint">Código único para identificar el elemento (generado automáticamente si se deja vacío)</div>
            </div>
            
            <div class="form-group">
              <label for="category">Categoría *</label>
              <select 
                id="category" 
                v-model="formData.category" 
                required 
                class="form-control"
                :class="{ 'is-invalid': validationErrors.category }"
                @change="handleCategoryChange"
              >
                <option value="">Seleccionar categoría...</option>
                <option 
                  v-for="category in categories" 
                  :key="category.id" 
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
              <div v-if="validationErrors.category" class="invalid-feedback">
                {{ validationErrors.category }}
              </div>
            </div>
            
            <div class="form-group">
              <label for="type">Tipo *</label>
              <select 
                id="type" 
                v-model="formData.type" 
                required 
                class="form-control"
                :class="{ 'is-invalid': validationErrors.type }"
                :disabled="!formData.category"
              >
                <option value="">Seleccionar tipo...</option>
                <option 
                  v-for="type in filteredTypes" 
                  :key="type.id" 
                  :value="type.id"
                >
                  {{ type.name }}
                </option>
              </select>
              <div v-if="validationErrors.type" class="invalid-feedback">
                {{ validationErrors.type }}
              </div>
            </div>
            
            <div class="form-group">
              <label for="brand">Marca</label>
              <input 
                id="brand" 
                type="text" 
                v-model="formData.brand" 
                class="form-control"
              >
            </div>
            
            <div class="form-group">
              <label for="model">Modelo</label>
              <input 
                id="model" 
                type="text" 
                v-model="formData.model" 
                class="form-control"
              >
            </div>
            
            <div class="form-group">
              <label for="status">Estado *</label>
              <select 
                id="status" 
                v-model="formData.status" 
                required 
                class="form-control"
                :class="{ 'is-invalid': validationErrors.status }"
              >
                <option value="">Seleccionar estado...</option>
                <option 
                  v-for="status in statuses" 
                  :key="status.id" 
                  :value="status.id"
                >
                  {{ status.name }}
                </option>
              </select>
              <div v-if="validationErrors.status" class="invalid-feedback">
                {{ validationErrors.status }}
              </div>
            </div>
            
            <div class="form-group">
              <label for="quantity">Cantidad *</label>
              <input 
                id="quantity" 
                type="number" 
                v-model.number="formData.quantity" 
                min="1" 
                required 
                class="form-control"
                :class="{ 'is-invalid': validationErrors.quantity }"
              >
              <div v-if="validationErrors.quantity" class="invalid-feedback">
                {{ validationErrors.quantity }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Pestaña de detalles técnicos -->
        <div v-show="activeTab === 'details'" class="tab-pane">
          <div class="form-grid">
            <div class="form-group">
              <label for="serialNumber">Número de serie</label>
              <input 
                id="serialNumber" 
                type="text" 
                v-model="formData.serialNumber" 
                class="form-control"
                :class="{ 'is-invalid': validationErrors.serialNumber }"
              >
              <div v-if="validationErrors.serialNumber" class="invalid-feedback">
                {{ validationErrors.serialNumber }}
              </div>
            </div>
            
            <div class="form-group">
              <label for="macAddress">Dirección MAC</label>
              <input 
                id="macAddress" 
                type="text" 
                v-model="formData.macAddress" 
                class="form-control"
                :class="{ 'is-invalid': validationErrors.macAddress }"
                placeholder="00:00:00:00:00:00"
              >
              <div v-if="validationErrors.macAddress" class="invalid-feedback">
                {{ validationErrors.macAddress }}
              </div>
            </div>
            
            <div class="form-group">
              <label for="purchaseDate">Fecha de compra</label>
              <input 
                id="purchaseDate" 
                type="date" 
                v-model="formData.purchaseDate" 
                class="form-control"
              >
            </div>
            
            <div class="form-group">
              <label for="cost">Costo</label>
              <div class="input-group">
                <div class="input-prefix">$</div>
                <input 
                  id="cost" 
                  type="number" 
                  v-model.number="formData.cost" 
                  min="0" 
                  step="0.01" 
                  class="form-control"
                >
              </div>
            </div>
            
            <div class="form-group">
              <label for="warrantyUntil">Garantía hasta</label>
              <input 
                id="warrantyUntil" 
                type="date" 
                v-model="formData.warrantyUntil" 
                class="form-control"
              >
            </div>
            
            <div class="form-group">
              <label for="supplier">Proveedor</label>
              <input 
                id="supplier" 
                type="text" 
                v-model="formData.supplier" 
                class="form-control"
              >
            </div>
          </div>
          
          <!-- Especificaciones técnicas -->
          <div class="specifications-section">
            <h3 class="section-title">Especificaciones técnicas</h3>
            
            <div class="specifications-list">
              <div 
                v-for="(spec, index) in formData.specifications" 
                :key="index" 
                class="specification-item"
              >
                <div class="specification-inputs">
                  <input 
                    type="text" 
                    v-model="spec.key" 
                    placeholder="Propiedad" 
                    class="form-control specification-key"
                  >
                  <input 
                    type="text" 
                    v-model="spec.value" 
                    placeholder="Valor" 
                    class="form-control specification-value"
                  >
                </div>
                
                <button 
                  type="button" 
                  class="btn-icon remove-spec" 
                  @click="removeSpecification(index)"
                  title="Eliminar especificación"
                >
                  <i class="icon-trash"></i>
                </button>
              </div>
            </div>
            
            <button 
              type="button" 
              class="btn-outline add-specification" 
              @click="addSpecification"
            >
              <i class="icon-plus"></i>
              <span>Agregar especificación</span>
            </button>
          </div>
        </div>
        
        <!-- Pestaña de ubicación -->
        <div v-show="activeTab === 'location'" class="tab-pane">
          <div class="form-grid">
            <div class="form-group">
              <label for="location">Ubicación actual *</label>
              <select 
                id="location" 
                v-model="formData.location" 
                required 
                class="form-control"
                :class="{ 'is-invalid': validationErrors.location }"
              >
                <option value="">Seleccionar ubicación...</option>
                <option 
                  v-for="location in locations" 
                  :key="location.id" 
                  :value="location.id"
                >
                  {{ location.name }}
                </option>
              </select>
              <div v-if="validationErrors.location" class="invalid-feedback">
                {{ validationErrors.location }}
              </div>
            </div>
            
            <div class="form-group">
              <label>¿Asignar a un cliente?</label>
              <div class="toggle-switch">
                <input 
                  type="checkbox" 
                  id="assignToClient" 
                  v-model="assignToClient"
                >
                <label for="assignToClient">{{ assignToClient ? 'Sí' : 'No' }}</label>
              </div>
            </div>
            
            <div class="form-group" v-if="assignToClient">
              <label for="assignedClientId">Cliente</label>
              <select 
                id="assignedClientId" 
                v-model="formData.clientId" 
                class="form-control"
                :required="assignToClient"
              >
                <option value="">Seleccionar cliente...</option>
                <option 
                  v-for="client in clients" 
                  :key="client.id" 
                  :value="client.id"
                >
                  {{ client.name }}
                </option>
              </select>
              <div class="form-hint">Al asignar a un cliente, el estado cambiará a "Asignado"</div>
            </div>
            
            <div class="form-group" v-if="assignToClient">
              <label for="installationDate">Fecha de instalación</label>
              <input 
                id="installationDate" 
                type="date" 
                v-model="formData.installationDate" 
                class="form-control"
              >
            </div>
          </div>
        </div>
        
        <!-- Pestaña de notas -->
        <div v-show="activeTab === 'notes'" class="tab-pane">
          <div class="form-group">
            <label for="notes">Notas y observaciones</label>
            <textarea 
              id="notes" 
              v-model="formData.notes" 
              rows="6" 
              class="form-control"
              placeholder="Ingrese cualquier información adicional relevante sobre este elemento..."
            ></textarea>
          </div>
          
          <!-- Documentos adjuntos -->
          <div class="attachments-section">
            <h3 class="section-title">Documentos adjuntos</h3>
            
            <div class="attachments-list" v-if="formData.attachments && formData.attachments.length > 0">
              <div 
                v-for="(attachment, index) in formData.attachments" 
                :key="index" 
                class="attachment-item"
              >
                <div class="attachment-info">
                  <i class="icon-file" :class="getFileIcon(attachment.type)"></i>
                  <span class="attachment-name">{{ attachment.name }}</span>
                  <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
                </div>
                
                <div class="attachment-actions">
                  <button 
                    type="button" 
                    class="btn-icon" 
                    @click="viewAttachment(attachment)"
                    title="Ver documento"
                  >
                    <i class="icon-eye"></i>
                  </button>
                  
                  <button 
                    type="button" 
                    class="btn-icon danger" 
                    @click="removeAttachment(index)"
                    title="Eliminar documento"
                  >
                    <i class="icon-trash"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="no-attachments" v-else>
              No hay documentos adjuntos.
            </div>
            
            <div class="attachment-upload">
              <input
                type="file"
                ref="fileInput"
                @change="handleFileUpload"
                class="file-input"
                multiple
              >
              <button 
                type="button" 
                class="btn-outline upload-button" 
                @click="$refs.fileInput.click()"
              >
                <i class="icon-upload"></i>
                <span>Subir documento</span>
              </button>
              <div class="upload-hint">
                Formatos permitidos: PDF, JPG, PNG, DOCX (Máx. 5MB por archivo)
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Botones de acción -->
      <div class="form-actions">
        <button 
          type="button" 
          class="btn-outline" 
          @click="cancel"
        >
          Cancelar
        </button>
        
        <button 
          type="submit" 
          class="btn-primary" 
          :disabled="saving"
        >
          <i class="icon-loader" v-if="saving"></i>
          <span>{{ isEditMode ? 'Guardar cambios' : 'Crear elemento' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import inventoryService from '@/services/inventory';
import clientService from '@/services/client';
import { formatFileSize } from '@/utils/formatters';

export default {
  name: 'InventoryEditor',
  props: {
    // ID del elemento a editar (null para crear nuevo)
    itemId: {
      type: [Number, String],
      default: null
    },
    
    // Si es llamado desde un modal (cambia comportamiento de navegación)
    isModal: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      // Datos del formulario
      formData: {
        name: '',
        code: '',
        category: '',
        type: '',
        brand: '',
        model: '',
        status: '',
        quantity: 1,
        serialNumber: '',
        macAddress: '',
        purchaseDate: '',
        cost: null,
        warrantyUntil: '',
        supplier: '',
        location: '',
        clientId: '',
        installationDate: '',
        notes: '',
        specifications: [],
        attachments: []
      },
      
      // Estado del formulario
      activeTab: 'general',
      saving: false,
      isEditMode: false,
      assignToClient: false,
      
      // Mensajes
      errorMessage: '',
      successMessage: '',
      validationErrors: {},
      
      // Metadatos
      categories: [],
      types: [],
      statuses: [],
      locations: [],
      clients: []
    };
  },
  computed: {
    /**
     * Filtrar tipos según la categoría seleccionada
     */
    filteredTypes() {
      if (!this.formData.category) {
        return [];
      }
      
      return this.types.filter(type => type.categoryId === this.formData.category);
    }
  },
  async created() {
    // Cargar datos necesarios
    await this.loadMetadata();
    
    // Si es modo de edición, cargar datos del elemento
    if (this.itemId) {
      this.isEditMode = true;
      this.loadItemDetails();
    }
  },
  methods: {
    /**
     * Cargar metadatos necesarios
     */
    async loadMetadata() {
      try {
        // Cargar categorías, estados, ubicaciones, etc.
        const [categories, types, statuses, locations, clients] = await Promise.all([
          inventoryService.getCategories(),
          inventoryService.getTypes(),
          inventoryService.getStatuses(),
          inventoryService.getLocations(),
          clientService.getActiveClients()
        ]);
        
        this.categories = categories;
        this.types = types;
        this.statuses = statuses;
        this.locations = locations;
        this.clients = clients;
      } catch (error) {
        console.error('Error al cargar metadatos:', error);
        this.errorMessage = 'Error al cargar datos necesarios. Por favor, intente nuevamente.';
      }
    },
    
    /**
     * Cargar detalles del elemento para edición
     */
    async loadItemDetails() {
      try {
        const item = await inventoryService.getItem(this.itemId);
        
        // Convertir objeto a estructura de formulario
        this.formData = {
          name: item.name || '',
          code: item.code || '',
          category: item.category || '',
          type: item.type || '',
          brand: item.brand || '',
          model: item.model || '',
          status: item.status || '',
          quantity: item.quantity || 1,
          serialNumber: item.serialNumber || '',
          macAddress: item.macAddress || '',
          purchaseDate: item.purchaseDate ? this.formatDateForInput(item.purchaseDate) : '',
          cost: item.cost || null,
          warrantyUntil: item.warrantyUntil ? this.formatDateForInput(item.warrantyUntil) : '',
          supplier: item.supplier || '',
          location: item.location || '',
          clientId: item.assignedClient ? item.assignedClient.id : '',
          installationDate: item.installationDate ? this.formatDateForInput(item.installationDate) : '',
          notes: item.notes || '',
          specifications: this.parseSpecifications(item.specifications || {}),
          attachments: item.attachments || []
        };
        
        // Actualizar estado de asignación de cliente
        this.assignToClient = !!item.assignedClient;
        
      } catch (error) {
        console.error('Error al cargar detalles del elemento:', error);
        this.errorMessage = 'Error al cargar los detalles del elemento. Por favor, intente nuevamente.';
      }
    },
    
    /**
     * Guardar elemento (crear o actualizar)
     */
    async saveItem() {
      // Validar formulario
      if (!this.validateForm()) {
        this.activeTab = 'general'; // Volver a primera pestaña donde suelen estar los campos requeridos
        return;
      }
      
      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      try {
        // Convertir especificaciones a objeto
        const specifications = {};
        this.formData.specifications.forEach(spec => {
          if (spec.key && spec.value) {
            specifications[spec.key] = spec.value;
          }
        });
        
        // Preparar datos para enviar
        const itemData = {
          ...this.formData,
          specifications
        };
        
        // Si no se está asignando a un cliente, eliminar datos relacionados
        if (!this.assignToClient) {
          itemData.clientId = null;
          itemData.installationDate = null;
        }
        
        let result;
        
        if (this.isEditMode) {
          // Actualizar elemento existente
          result = await inventoryService.updateItem(this.itemId, itemData);
          this.successMessage = 'Elemento actualizado correctamente.';
        } else {
          // Crear nuevo elemento
          result = await inventoryService.createItem(itemData);
          this.successMessage = 'Elemento creado correctamente.';
          
          // Limpiar formulario si no es un modal
          if (!this.isModal) {
            this.resetForm();
          }
        }
        
        // Emitir evento para notificar al componente padre
        this.$emit('save-success', result);
        
        // Navegar a la vista de detalle si no es un modal
        if (!this.isModal && this.isEditMode) {
          // Esperar un poco para que se vea el mensaje de éxito
          setTimeout(() => {
            this.$router.push(`/inventario/${result.id}`);
          }, 1500);
        }
        
      } catch (error) {
        console.error('Error al guardar elemento:', error);
        this.errorMessage = 'Error al guardar el elemento. Por favor, intente nuevamente.';
        
        // Si hay errores de validación desde el servidor
        if (error.response && error.response.data && error.response.data.errors) {
          this.validationErrors = error.response.data.errors;
        }
      } finally {
        this.saving = false;
      }
    },
    
    /**
     * Validar formulario antes de enviar
     */
    validateForm() {
      this.validationErrors = {};
      
      // Validar campos requeridos
      const requiredFields = ['name', 'category', 'type', 'status', 'quantity', 'location'];
      
      for (const field of requiredFields) {
        if (!this.formData[field]) {
          this.validationErrors[field] = 'Este campo es obligatorio.';
        }
      }
      
      // Validar formato de MAC Address
      if (this.formData.macAddress) {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        if (!macRegex.test(this.formData.macAddress)) {
          this.validationErrors.macAddress = 'Formato inválido. Utilice el formato XX:XX:XX:XX:XX:XX.';
        }
      }
      
      // Validar que la cantidad sea mayor a 0
      if (this.formData.quantity <= 0) {
        this.validationErrors.quantity = 'La cantidad debe ser mayor a 0.';
      }
      
      // Validar cliente si está asignado
      if (this.assignToClient && !this.formData.clientId) {
        this.validationErrors.clientId = 'Debe seleccionar un cliente.';
      }
      
      // Verificar si hay errores
      return Object.keys(this.validationErrors).length === 0;
    },
    
    /**
     * Cancelar y regresar
     */
    cancel() {
      if (this.isModal) {
        // Si es un modal, emitir evento para cerrar
        this.$emit('cancel');
      } else {
        // Si no es un modal, regresar a la vista anterior
        this.$router.go(-1);
      }
    },
    
    /**
     * Resetear formulario
     */
    resetForm() {
      this.formData = {
        name: '',
        code: '',
        category: '',
        type: '',
        brand: '',
        model: '',
        status: '',
        quantity: 1,
        serialNumber: '',
        macAddress: '',
        purchaseDate: '',
        cost: null,
        warrantyUntil: '',
        supplier: '',
        location: '',
        clientId: '',
        installationDate: '',
        notes: '',
        specifications: [],
        attachments: []
      };
      
      this.assignToClient = false;
      this.validationErrors = {};
      this.activeTab = 'general';
    },
    
    /**
     * Manejar cambio de categoría (para filtrar tipos)
     */
    handleCategoryChange() {
      // Resetear tipo al cambiar de categoría
      this.formData.type = '';
    },
    
    /**
     * Agregar nueva especificación
     */
    addSpecification() {
      this.formData.specifications.push({
        key: '',
        value: ''
      });
    },
    
    /**
     * Eliminar especificación
     */
    removeSpecification(index) {
      this.formData.specifications.splice(index, 1);
    },
    
    /**
     * Manejar subida de archivos
     */
    handleFileUpload(event) {
      const files = event.target.files;
      
      if (!files || files.length === 0) {
        return;
      }
      
      // Verificar tamaño y tipo de archivo
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Verificar tamaño (5MB máximo)
        const maxSize = 5 * 1024 * 1024; // 5MB en bytes
        if (file.size > maxSize) {
          this.errorMessage = `El archivo "${file.name}" excede el tamaño máximo permitido (5MB).`;
          continue;
        }
        
        // Verificar tipo
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
          this.errorMessage = `El tipo de archivo "${file.name}" no está permitido.`;
          continue;
        }
        
        // Agregar a la lista de adjuntos
        // En una implementación real, aquí se subiría el archivo al servidor
        this.formData.attachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          file: file, // Guardar referencia al archivo
          url: URL.createObjectURL(file) // URL temporal para previsualización
        });
      }
      
      // Limpiar input de archivo para permitir seleccionar el mismo archivo nuevamente
      event.target.value = null;
    },
    
    /**
     * Eliminar adjunto
     */
    removeAttachment(index) {
      // Liberar URL de objeto si existe
      if (this.formData.attachments[index].url) {
        URL.revokeObjectURL(this.formData.attachments[index].url);
      }
      
      // Eliminar de la lista
      this.formData.attachments.splice(index, 1);
    },
    
    /**
     * Visualizar adjunto
     */
    viewAttachment(attachment) {
      // Abrir en nueva pestaña
      if (attachment.url) {
        window.open(attachment.url, '_blank');
      } else if (attachment.fileUrl) {
        // URL desde el servidor
        window.open(attachment.fileUrl, '_blank');
      }
    },
    
    /**
     * Convertir objeto de especificaciones a array para edición
     */
    parseSpecifications(specs) {
      if (!specs || typeof specs !== 'object') {
        return [];
      }
      
      return Object.entries(specs).map(([key, value]) => ({
        key,
        value
      }));
    },
    
    /**
     * Formatear fecha para input type="date"
     */
    formatDateForInput(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return '';
      }
      
      // Formato YYYY-MM-DD
      return date.toISOString().split('T')[0];
    },
    
    /**
     * Obtener nombre de estado
     */
    getStatusName(statusId) {
      if (!statusId) return '';
      
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
     * Obtener ícono según tipo de archivo
     */
    getFileIcon(fileType) {
      if (!fileType) return 'icon-file';
      
      if (fileType.includes('pdf')) {
        return 'icon-file-pdf';
      } else if (fileType.includes('image')) {
        return 'icon-file-image';
      } else if (fileType.includes('wordprocessingml')) {
        return 'icon-file-word';
      } else {
        return 'icon-file';
      }
    },
    
    /**
     * Formatear tamaño de archivo
     */
    formatFileSize
  }
};
</script>

<style scoped>
.inventory-editor-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 0;
}

/* Formulario */
.editor-form {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.form-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.item-status {
  display: flex;
  align-items: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 16px;
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

/* Alertas */
.alert {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 16px 24px 0;
  border-radius: 6px;
  font-size: 14px;
}

.alert i {
  margin-right: 8px;
  font-size: 16px;
}

.alert.error {
  background-color: var(--error-light, #ffebee);
  color: var(--error-color, #f44336);
}

.alert.success {
  background-color: var(--success-light, #e8f5e9);
  color: var(--success-color, #4caf50);
}

.alert-close {
  margin-left: auto;
  background: none;
  border: none;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-close:hover {
  opacity: 1;
}

/* Pestañas */
.form-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  margin-top: 16px;
  padding: 0 24px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--primary-color, #1976d2);
}

.tab-button.active {
  color: var(--primary-color, #1976d2);
  border-bottom-color: var(--primary-color, #1976d2);
}

/* Contenido de pestañas */
.tab-content {
  padding: 24px;
}

.tab-pane {
  /* Asegurarse que las pestañas ocupen el mismo espacio */
  min-height: 300px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
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
  transition: border-color 0.2s ease;
}

.form-control:focus {
  border-color: var(--primary-color, #1976d2);
  outline: none;
}

.form-control.is-invalid {
  border-color: var(--error-color, #f44336);
}

.invalid-feedback {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--error-color, #f44336);
}

.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

textarea.form-control {
  resize: vertical;
  min-height: 100px;
}

.input-group {
  display: flex;
  align-items: center;
}

.input-prefix {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-right: none;
  border-radius: 6px 0 0 6px;
  color: var(--text-secondary, #666);
}

.input-group .form-control {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  flex: 1;
}

/* Switch Toggle */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-switch label::before {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  left: 4px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.toggle-switch input:checked + label {
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.toggle-switch input:checked + label::before {
  transform: translateX(24px);
}

/* Especificaciones técnicas */
.specifications-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.specifications-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.specification-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.specification-inputs {
  display: flex;
  flex: 1;
  gap: 12px;
}

.specification-key,
.specification-value {
  flex: 1;
}

.remove-spec {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--error-color, #f44336);
  border: 1px solid var(--border-color, #e0e0e0);
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-spec:hover {
  background-color: var(--error-light, #ffebee);
}

/* Documentos adjuntos */
.attachments-section {
  margin-top: 24px;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.attachment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  border: 1px solid var(--border-color, #e0e0e0);
}

.attachment-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.attachment-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.attachment-size {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.attachment-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-color, #e0e0e0);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.btn-icon.danger {
  color: var(--error-color, #f44336);
}

.btn-icon.danger:hover {
  background-color: var(--error-light, #ffebee);
}

.no-attachments {
  padding: 16px;
  text-align: center;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  color: var(--text-secondary, #666);
  font-size: 14px;
  margin-bottom: 16px;
}

.attachment-upload {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.file-input {
  display: none;
}

.upload-button {
  padding: 10px 16px;
  cursor: pointer;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

/* Botones de acción */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  margin-top: 24px;
}

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

/* Botón de carga */
.icon-loader {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .form-tabs {
    overflow-x: auto;
    padding: 0 16px;
  }
  
  .tab-button {
    padding: 12px 12px;
    white-space: nowrap;
  }
  
  .tab-content {
    padding: 16px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .specification-inputs {
    flex-direction: column;
    gap: 8px;
  }
  
  .form-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }
  
  .form-actions button {
    width: 100%;
  }
}

/* Animaciones */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.tab-pane {
  animation: fadeIn 0.2s ease;
}
</style>
