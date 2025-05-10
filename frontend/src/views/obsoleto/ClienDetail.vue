<template>
  <div class="client-detail">
    <div class="header">
      <h2>Detalle de Cliente</h2>
      <div class="actions">
        <button @click="goToEdit" class="edit-button">Editar</button>
        <button @click="goBack" class="back-button">Volver</button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando información del cliente...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="client-content">
      <div class="panel personal-info">
        <h3>Información Personal</h3>
        <div class="status-badge" :class="{ active: client.active, inactive: !client.active }">
          {{ client.active ? 'Activo' : 'Inactivo' }}
        </div>
        
        <div class="info-item">
          <span class="label">Nombre:</span>
          <span class="value">{{ client.firstName }} {{ client.lastName }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Email:</span>
          <span class="value">{{ client.email || 'No especificado' }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Teléfono:</span>
          <span class="value">{{ client.phone || 'No especificado' }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">WhatsApp:</span>
          <span class="value">
            <a v-if="client.whatsapp" :href="'https://wa.me/' + formatWhatsApp(client.whatsapp)" target="_blank">
              {{ client.whatsapp }}
            </a>
            <span v-else>No especificado</span>
          </span>
        </div>
        
        <div class="info-item">
          <span class="label">Fecha de Nacimiento:</span>
          <span class="value">{{ formatDate(client.birthDate) || 'No especificada' }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Fecha de Inicio:</span>
          <span class="value">{{ formatDate(client.startDate) }}</span>
        </div>
      </div>
      
      <div class="panel location-info">
        <h3>Ubicación</h3>
        
        <div class="info-item">
          <span class="label">Dirección:</span>
          <span class="value">{{ client.address || 'No especificada' }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Coordenadas:</span>
          <span class="value" v-if="client.latitude && client.longitude">
            {{ client.latitude }}, {{ client.longitude }}
            <a 
              :href="'https://www.google.com/maps?q=' + client.latitude + ',' + client.longitude" 
              target="_blank"
              class="map-link"
            >
              Ver en mapa
            </a>
          </span>
          <span v-else class="value">No especificadas</span>
        </div>
        
        <div class="info-item">
          <span class="label">Sector:</span>
          <span class="value">{{ client.Sector ? client.Sector.name : 'No asignado' }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Nodo:</span>
          <span class="value">{{ client.Sector && client.Sector.Node ? client.Sector.Node.name : 'No asignado' }}</span>
        </div>
      </div>
      
      <div class="panel documents">
        <h3>Documentos</h3>
        
        <div v-if="client.ClientDocuments && client.ClientDocuments.length > 0">
          <div class="document-item" v-for="doc in client.ClientDocuments" :key="doc.id">
            <div class="document-info">
              <div class="doc-type">{{ doc.type }}</div>
              <div class="doc-name">{{ doc.filename }}</div>
              <div class="doc-date">{{ formatDate(doc.uploadDate) }}</div>
            </div>
            <div class="document-actions">
              <button @click="downloadDocument(doc.id)" class="download-button">Descargar</button>
              <button @click="deleteDocument(doc.id)" class="delete-button">Eliminar</button>
            </div>
          </div>
        </div>
        
        <div v-else class="no-documents">
          No hay documentos registrados.
        </div>
        
        <div class="upload-section">
          <h4>Subir nuevo documento</h4>
          <form @submit.prevent="uploadDocument">
            <div class="form-row">
              <div class="form-group">
                <label for="docType">Tipo de documento *</label>
                <select id="docType" v-model="newDocument.type" required>
                  <option value="">Seleccionar tipo</option>
                  <option value="INE">INE</option>
                  <option value="Comprobante de domicilio">Comprobante de domicilio</option>
                  <option value="Contrato">Contrato</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="docFile">Archivo *</label>
                <input 
                  type="file" 
                  id="docFile" 
                  @change="handleFileUpload" 
                  accept=".pdf,.jpg,.jpeg,.png" 
                  required
                />
              </div>
            </div>
            
            <div class="form-group">
              <label for="docDescription">Descripción</label>
              <input type="text" id="docDescription" v-model="newDocument.description" />
            </div>
            
            <button type="submit" class="upload-button" :disabled="uploading">
              {{ uploading ? 'Subiendo...' : 'Subir documento' }}
            </button>
          </form>
        </div>
      </div>
      
      <div class="panel services">
        <h3>Servicios Contratados</h3>
        
        <div v-if="client.Services && client.Services.length > 0">
          <div class="service-item" v-for="service in client.Services" :key="service.id">
            <div class="service-info">
              <div class="service-name">{{ service.name }}</div>
              <div class="service-details">
                <span class="download">↓ {{ service.downloadSpeed }} Mbps</span>
                <span class="upload">↑ {{ service.uploadSpeed }} Mbps</span>
                <span class="price">${{ service.price }}/mes</span>
              </div>
              <div class="subscription-details">
                <div class="subscription-date">
                  Desde: {{ formatDate(service.Subscription.startDate) }}
                </div>
                <div class="subscription-status" :class="service.Subscription.status">
                  {{ service.Subscription.status }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="no-services">
          No hay servicios contratados.
        </div>
      </div>
      
      <div class="panel notes" v-if="client.notes">
        <h3>Notas</h3>
        <div class="notes-content">
          {{ client.notes }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ClientService from '../services/client.service';

export default {
  name: 'ClientDetail',
  data() {
    return {
      client: {},
      loading: true,
      error: null,
      newDocument: {
        type: '',
        file: null,
        description: ''
      },
      uploading: false
    };
  },
  created() {
    this.loadClient();
  },
  methods: {
    async loadClient() {
      this.loading = true;
      try {
        const response = await ClientService.getClient(this.$route.params.id);
        this.client = response.data;
      } catch (error) {
        console.error('Error cargando cliente:', error);
        this.error = 'Error cargando datos del cliente. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
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
    formatWhatsApp(number) {
      // Eliminar caracteres no numéricos
      return number.replace(/\D/g, '');
    },
    goToEdit() {
      this.$router.push(`/clients/${this.client.id}/edit`);
    },
    goBack() {
      this.$router.push('/clients');
    },
    handleFileUpload(event) {
      this.newDocument.file = event.target.files[0];
    },
    async uploadDocument() {
      if (!this.newDocument.file || !this.newDocument.type) {
        return;
      }
      
      this.uploading = true;
      try {
        const formData = new FormData();
        formData.append('document', this.newDocument.file);
        formData.append('type', this.newDocument.type);
        if (this.newDocument.description) {
          formData.append('description', this.newDocument.description);
        }
        
        await ClientService.uploadDocument(this.client.id, formData);
        
        // Limpiar formulario
        this.newDocument = {
          type: '',
          file: null,
          description: ''
        };
        
        // Recargar cliente para mostrar el nuevo documento
        this.loadClient();
      } catch (error) {
        console.error('Error subiendo documento:', error);
        this.error = 'Error subiendo documento. Por favor, intente nuevamente.';
      } finally {
        this.uploading = false;
      }
    },
    async downloadDocument(id) {
      try {
        const response = await ClientService.downloadDocument(id);
        
        // Crear enlace para descargar archivo
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // Obtener nombre del documento de los encabezados de respuesta o usar un nombre genérico
        const contentDisposition = response.headers['content-disposition'];
        let filename = 'documento.pdf';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch.length === 2) {
            filename = filenameMatch[1];
          }
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error('Error descargando documento:', error);
        this.error = 'Error descargando documento. Por favor, intente nuevamente.';
      }
    },
    async deleteDocument(id) {
      if (!confirm('¿Está seguro que desea eliminar este documento?')) {
        return;
      }
      
      try {
        await ClientService.deleteDocument(id);
        // Recargar cliente para actualizar la lista de documentos
        this.loadClient();
      } catch (error) {
        console.error('Error eliminando documento:', error);
        this.error = 'Error eliminando documento. Por favor, intente nuevamente.';
      }
    }
  }
};
</script>

<style scoped>
.client-detail {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.edit-button {
  background-color: #2196F3;
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

.client-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.panel {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
}

.personal-info, .location-info {
  grid-column: span 1;
}

.documents, .services, .notes {
  grid-column: 1 / -1;
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.status-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.9em;
}

.status-badge.active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-badge.inactive {
  background-color: #ffebee;
  color: #c62828;
}

.info-item {
  margin-bottom: 12px;
  display: flex;
}

.label {
  font-weight: bold;
  width: 140px;
  color: #666;
}

.value {
  flex: 1;
}

.map-link {
  margin-left: 8px;
  color: #2196F3;
  text-decoration: none;
}

.document-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 8px;
}

.document-info {
  display: flex;
  flex-direction: column;
}

.doc-type {
  font-weight: bold;
}

.doc-name {
  color: #666;
  font-size: 0.9em;
}

.doc-date {
  color: #999;
  font-size: 0.8em;
}

.document-actions {
  display: flex;
  gap: 8px;
}

.download-button, .delete-button {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.download-button {
  background-color: #e0e0e0;
}

.delete-button {
  background-color: #ffcdd2;
  color: #c62828;
}

.no-documents, .no-services {
  color: #999;
  font-style: italic;
  padding: 10px 0;
}

.upload-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px dashed #ddd;
}

h4 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #555;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

input, select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.upload-button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.upload-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.service-item {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 8px;
}

.service-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.service-details {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  color: #666;
}

.subscription-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
  color: #999;
}

.subscription-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
}

.subscription-status.active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.subscription-status.suspended {
  background-color: #fff8e1;
  color: #f57f17;
}

.subscription-status.cancelled {
  background-color: #ffebee;
  color: #c62828;
}

.notes-content {
  white-space: pre-line;
  color: #666;
}

@media (max-width: 800px) {
  .client-content {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>