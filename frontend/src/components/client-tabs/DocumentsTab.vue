<!-- frontend/src/components/client/DocumentosTab.vue -->
<template>
  <div class="documentos-tab">
    <div class="documentos-header">
      <div class="header-info">
        <h3>Documentos del Cliente</h3>
        <p class="subtitle">Gestión de documentos subidos y generados por el sistema</p>
      </div>
      <button @click="showUploadModal = true" class="upload-btn">
        📎 Subir Documento
      </button>
    </div>

    <!-- Categorías de documentos -->
    <div class="document-categories">
      <button 
        v-for="category in categories" 
        :key="category.id"
        @click="activeCategory = category.id"
        :class="['category-btn', { active: activeCategory === category.id }]"
      >
        <span class="category-icon">{{ category.icon }}</span>
        <span class="category-label">{{ category.label }}</span>
        <span v-if="category.count > 0" class="category-count">{{ category.count }}</span>
      </button>
    </div>

    <!-- Estadísticas -->
    <div class="documents-stats">
      <div class="stat-card">
        <div class="stat-number">{{ totalDocuments }}</div>
        <div class="stat-label">Total Documentos</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ uploadedDocuments }}</div>
        <div class="stat-label">Subidos</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ generatedDocuments }}</div>
        <div class="stat-label">Generados</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ formatFileSize(totalSize) }}</div>
        <div class="stat-label">Tamaño Total</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Cargando documentos...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
      <button @click="loadDocuments" class="retry-btn">Reintentar</button>
    </div>

    <!-- Lista de documentos -->
    <div v-if="!loading && !error" class="documents-content">
      
      <!-- Documentos Subidos -->
      <div v-if="activeCategory === 'all' || activeCategory === 'uploaded'" class="document-section">
        <div class="section-header">
          <h4>📎 Documentos Subidos</h4>
          <span class="document-count">{{ uploadedDocs.length }} documentos</span>
        </div>

        <div v-if="uploadedDocs.length === 0" class="empty-section">
          <div class="empty-icon">📄</div>
          <p>No hay documentos subidos</p>
          <button @click="showUploadModal = true" class="upload-first-btn">
            Subir Primer Documento
          </button>
        </div>

        <div v-else class="documents-grid">
          <div v-for="doc in uploadedDocs" :key="doc.id" class="document-card uploaded">
            <div class="document-icon">
              {{ getFileIcon(doc.filename) }}
            </div>
            
            <div class="document-info">
              <div class="document-name">{{ doc.filename }}</div>
              <div class="document-meta">
                <span class="document-type">{{ doc.type }}</span>
                <span class="document-date">{{ formatDate(doc.uploadDate) }}</span>
              </div>
              <div v-if="doc.description" class="document-description">
                {{ doc.description }}
              </div>
            </div>

            <div class="document-actions">
              <button @click="downloadUploadedDocument(doc.id)" class="action-btn download" title="Descargar">
                ⬇️
              </button>
              <button @click="previewDocument(doc)" class="action-btn preview" title="Vista previa">
                👁️
              </button>
              <button @click="deleteUploadedDocument(doc.id)" class="action-btn delete" title="Eliminar">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Documentos Generados -->
      <div v-if="activeCategory === 'all' || activeCategory === 'generated'" class="document-section">
        <div class="section-header">
          <h4>📋 Documentos Generados</h4>
          <div class="section-actions">
            <span class="document-count">{{ generatedDocs.length }} documentos</span>
            <button @click="showGenerateModal = true" class="generate-btn">
              + Generar Documento
            </button>
          </div>
        </div>

        <div v-if="generatedDocs.length === 0" class="empty-section">
          <div class="empty-icon">📋</div>
          <p>No hay documentos generados</p>
          <button @click="showGenerateModal = true" class="generate-first-btn">
            Generar Primer Documento
          </button>
        </div>

        <div v-else class="documents-grid">
          <div v-for="doc in generatedDocs" :key="doc.id" class="document-card generated">
            <div class="document-icon">
              {{ getTemplateIcon(doc.DocumentTemplate?.templateType) }}
            </div>
            
            <div class="document-info">
              <div class="document-name">{{ doc.DocumentTemplate?.name || 'Documento' }}</div>
              <div class="document-meta">
                <span class="document-type">{{ doc.DocumentTemplate?.category || 'general' }}</span>
                <span class="document-date">{{ formatDate(doc.generatedAt) }}</span>
              </div>
              <div class="document-status">
                <span :class="['status-badge', doc.status]">
                  {{ formatDocumentStatus(doc.status) }}
                </span>
                <span v-if="doc.signedAt" class="signed-badge">✍️ Firmado</span>
              </div>
            </div>

            <div class="document-actions">
              <button @click="downloadGeneratedDoc(doc.id)" class="action-btn download" title="Descargar">
                ⬇️
              </button>
              <button 
                v-if="doc.DocumentTemplate?.requiresSignature && !doc.signedAt" 
                @click="openSignatureModal(doc)" 
                class="action-btn sign" 
                title="Firmar"
              >
                ✍️
              </button>
              <button @click="openEmailModal(doc)" class="action-btn email" title="Enviar por email">
                📧
              </button>
              <button @click="viewDocumentDetails(doc)" class="action-btn details" title="Detalles">
                ℹ️
              </button>
            </div>
          </div>
        </div>

        <!-- Plantillas disponibles -->
        <div v-if="availableTemplates.length > 0" class="document-templates">
          <h5>📄 Plantillas Disponibles</h5>
          <div class="templates-grid">
            <div 
              v-for="template in availableTemplates" 
              :key="template.id"
              class="template-card"
              @click="generateFromTemplate(template)"
            >
              <div class="template-icon">{{ template.icon }}</div>
              <div class="template-info">
                <div class="template-name">{{ template.name }}</div>
                <div class="template-description">{{ template.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal para subir documentos -->
    <div v-if="showUploadModal" class="modal-overlay" @click="closeUploadModal">
      <div class="modal-content upload-modal" @click.stop>
        <div class="modal-header">
          <h3>Subir Documento</h3>
          <button @click="closeUploadModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="uploadDocument">
            <div class="form-group">
              <label for="docType">Tipo de documento: *</label>
              <select id="docType" v-model="newDocument.type" class="form-control" required>
                <option value="">Seleccionar tipo</option>
                <option value="INE">INE/IFE</option>
                <option value="Comprobante de domicilio">Comprobante de domicilio</option>
                <option value="Contrato">Contrato de servicio</option>
                <option value="Identificación">Identificación oficial</option>
                <option value="Comprobante de ingresos">Comprobante de ingresos</option>
                <option value="Fotografía">Fotografía</option>
                <option value="Plano">Plano/Croquis</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div class="form-group">
              <label for="docFile">Archivo: *</label>
              <div class="file-upload-area" @drop="handleDrop" @dragover.prevent @dragenter.prevent>
                <input 
                  type="file" 
                  id="docFile" 
                  ref="fileInput"
                  @change="handleFileUpload" 
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  class="file-input"
                  required
                />
                <div class="upload-content">
                  <div v-if="!newDocument.file" class="upload-placeholder">
                    <div class="upload-icon">📎</div>
                    <p>Arrastra el archivo aquí o <span class="upload-link">haz clic para seleccionar</span></p>
                    <small>Formatos: PDF, JPG, PNG, DOC, DOCX (Máx. 10MB)</small>
                  </div>
                  <div v-else class="file-preview">
                    <div class="file-info">
                      <div class="file-icon">{{ getFileIcon(newDocument.file.name) }}</div>
                      <div class="file-details">
                        <div class="file-name">{{ newDocument.file.name }}</div>
                        <div class="file-size">{{ formatFileSize(newDocument.file.size) }}</div>
                      </div>
                    </div>
                    <button type="button" @click="removeFile" class="remove-file-btn">✕</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="docDescription">Descripción:</label>
              <textarea 
                id="docDescription" 
                v-model="newDocument.description" 
                class="form-control"
                rows="3"
                placeholder="Descripción opcional del documento"
              ></textarea>
            </div>

            <div class="upload-progress" v-if="uploadProgress > 0">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
              </div>
              <span class="progress-text">{{ uploadProgress }}%</span>
            </div>

            <div class="form-actions">
              <button type="button" @click="closeUploadModal" class="btn-cancel">
                Cancelar
              </button>
              <button type="submit" class="btn-upload" :disabled="uploading || !newDocument.file">
                {{ uploading ? 'Subiendo...' : 'Subir Documento' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal para generar documentos -->
    <div v-if="showGenerateModal" class="modal-overlay" @click="closeGenerateModal">
      <div class="modal-content generate-modal" @click.stop>
        <div class="modal-header">
          <h3>Generar Documento</h3>
          <button @click="closeGenerateModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="template-selection">
            <h4>Selecciona el tipo de documento:</h4>
            <div class="template-options">
              <div 
                v-for="template in availableTemplates" 
                :key="template.id"
                class="template-option"
                @click="selectTemplate(template)"
                :class="{ selected: selectedTemplate?.id === template.id }"
              >
                <div class="option-icon">{{ template.icon }}</div>
                <div class="option-info">
                  <div class="option-name">{{ template.name }}</div>
                  <div class="option-description">{{ template.description }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedTemplate" class="template-preview">
            <h4>Vista previa:</h4>
            <div class="preview-content">
              <p>{{ selectedTemplate.description }}</p>
              <p class="preview-note" v-if="selectedTemplate.availableVariables && selectedTemplate.availableVariables.length > 0">
                <strong>Variables disponibles:</strong> 
                {{ selectedTemplate.availableVariables.slice(0, 5).join(', ') }}
                <span v-if="selectedTemplate.availableVariables.length > 5">...</span>
              </p>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeGenerateModal" class="btn-cancel">
              Cancelar
            </button>
            <button 
              @click="generateDocument" 
              class="btn-generate" 
              :disabled="!selectedTemplate || generating"
            >
              {{ generating ? 'Generando...' : 'Generar Documento' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para vista previa -->
    <div v-if="showPreviewModal" class="modal-overlay" @click="closePreviewModal">
      <div class="modal-content preview-modal" @click.stop>
        <div class="modal-header">
          <h3>Vista Previa: {{ currentPreviewDoc?.filename }}</h3>
          <button @click="closePreviewModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="preview-container">
            <iframe 
              v-if="previewUrl"
              :src="previewUrl"
              class="document-preview-frame"
              frameborder="0"
            ></iframe>
            <div v-else class="preview-unavailable">
              <div class="unavailable-icon">❌</div>
              <p>Vista previa no disponible para este tipo de archivo</p>
              <button @click="downloadUploadedDocument(currentPreviewDoc.id)" class="download-anyway-btn">
                Descargar para ver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Firma Digital -->
    <div v-if="showSignatureModal" class="modal-overlay" @click="closeSignatureModal">
      <div class="modal-content signature-modal" @click.stop>
        <div class="modal-header">
          <h3>Firma Digital del Documento</h3>
          <button @click="closeSignatureModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="signature-document-info">
            <p><strong>Documento:</strong> {{ currentSignatureDoc?.DocumentTemplate?.name }}</p>
            <p><strong>Cliente:</strong> {{ client.firstName }} {{ client.lastName }}</p>
          </div>

          <signature-canvas
            v-if="client && client.firstName"
            :signer-name="`${client.firstName} ${client.lastName}`"
            signer-type="client"
            @signature-saved="handleSignatureSaved"
            @signature-cancelled="closeSignatureModal"
            @signature-error="handleSignatureError"
          />
        </div>
      </div>
    </div>

    <!-- Modal de Envío por Email -->
    <div v-if="showEmailModal" class="modal-overlay" @click="closeEmailModal">
      <div class="modal-content email-modal" @click.stop>
        <div class="modal-header">
          <h3>Enviar Documento por Email</h3>
          <button @click="closeEmailModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="sendEmail">
            <div class="form-group">
              <label>Documento:</label>
              <div class="document-preview-info">
                {{ currentEmailDoc?.DocumentTemplate?.name || 'Documento' }}
              </div>
            </div>

            <div class="form-group">
              <label for="emailRecipient">Destinatario: *</label>
              <input 
                type="email"
                id="emailRecipient"
                v-model="emailData.recipient"
                class="form-control"
                :placeholder="client.email || 'email@ejemplo.com'"
                required
              />
            </div>

            <div class="form-group">
              <label for="emailSubject">Asunto: *</label>
              <input 
                type="text"
                id="emailSubject"
                v-model="emailData.subject"
                class="form-control"
                placeholder="Asunto del correo"
                required
              />
            </div>

            <div class="form-group">
              <label for="emailMessage">Mensaje:</label>
              <textarea 
                id="emailMessage"
                v-model="emailData.message"
                class="form-control"
                rows="6"
                placeholder="Escribe tu mensaje aquí..."
              ></textarea>
              <small class="form-hint">
                Variables disponibles: {{nombre_completo}}, {{documento}}
              </small>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" v-model="emailData.includeAttachment" />
                Adjuntar documento PDF
              </label>
            </div>

            <div class="form-actions">
              <button type="button" @click="closeEmailModal" class="btn-cancel">
                Cancelar
              </button>
              <button type="submit" class="btn-send" :disabled="sendingEmail">
                {{ sendingEmail ? 'Enviando...' : 'Enviar Email' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import ClientDocumentService from '../../services/clientDocument.service';
import DocumentTemplateService from '../../services/documentTemplate.service';
import DocumentAdvancedService from '../../services/documentAdvanced.service';
import SignatureCanvas from '../documents/SignatureCanvas.vue';

export default {
  name: 'DocumentosTab',
  components: {
    SignatureCanvas
  },
  props: {
    client: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      activeCategory: 'all',
      loading: false,
      error: null,
      
      // Documentos
      uploadedDocs: [],
      generatedDocs: [],
      availableTemplates: [],
      
      // Modales
      showUploadModal: false,
      showGenerateModal: false,
      showPreviewModal: false,
      showSignatureModal: false,
      showEmailModal: false,
      
      // Estados
      uploading: false,
      generating: false,
      sendingEmail: false,
      uploadProgress: 0,
      
      // Documentos actuales
      currentPreviewDoc: null,
      currentSignatureDoc: null,
      currentEmailDoc: null,
      previewUrl: null,
      selectedTemplate: null,

      // Formularios
      newDocument: {
        type: '',
        file: null,
        description: ''
      },

      emailData: {
        recipient: '',
        subject: '',
        message: '',
        includeAttachment: true
      },

      categories: [
        { id: 'all', label: 'Todos', icon: '📁', count: 0 },
        { id: 'uploaded', label: 'Subidos', icon: '📎', count: 0 },
        { id: 'generated', label: 'Generados', icon: '📋', count: 0 }
      ]
    };
  },
  
  computed: {
    totalDocuments() {
      return this.uploadedDocs.length + this.generatedDocs.length;
    },

    uploadedDocuments() {
      return this.uploadedDocs.length;
    },

    generatedDocuments() {
      return this.generatedDocs.length;
    },

    totalSize() {
      // Estimación simple
      return this.uploadedDocs.length * 1024 * 1024 * 2;
    }
  },

  mounted() {
    if (this.client && this.client.id) {
      this.loadDocuments();
      this.loadTemplates();
    }
  },

  methods: {
    // ===============================
    // CARGA DE DATOS
    // ===============================

    async loadDocuments() {
      if (!this.client || !this.client.id) {
        console.warn('Cliente no disponible');
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        // Cargar documentos subidos
        const uploadedResponse = await ClientDocumentService.getClientDocuments(this.client.id);
        this.uploadedDocs = uploadedResponse.data || [];

        // Cargar documentos generados
        const generatedResponse = await DocumentTemplateService.getDocumentHistory(this.client.id);
        this.generatedDocs = generatedResponse.data || [];

        this.updateCategoryCounts();

      } catch (error) {
        console.error('Error cargando documentos:', error);
        this.error = 'Error al cargar los documentos. Por favor, intenta de nuevo.';
      } finally {
        this.loading = false;
      }
    },

    async loadTemplates() {
      try {
        const response = await DocumentTemplateService.getActiveTemplates();
        this.availableTemplates = response.data || [];
      } catch (error) {
        console.error('Error cargando plantillas:', error);
      }
    },

    // ===============================
    // SUBIR DOCUMENTOS
    // ===============================

    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.validateAndSetFile(file);
      }
    },

    handleDrop(event) {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) {
        this.validateAndSetFile(file);
      }
    },

    validateAndSetFile(file) {
      // Validar tamaño (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 10MB permitido.');
        return;
      }

      // Validar tipo
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        alert('Tipo de archivo no permitido. Solo PDF, JPG, PNG, DOC, DOCX.');
        return;
      }

      this.newDocument.file = file;
    },

    removeFile() {
      this.newDocument.file = null;
      this.uploadProgress = 0;
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
    },

    async uploadDocument() {
      if (!this.newDocument.file || !this.newDocument.type) {
        return;
      }

      this.uploading = true;
      this.uploadProgress = 0;

      try {
        const formData = new FormData();
        formData.append('document', this.newDocument.file);
        formData.append('type', this.newDocument.type);
        if (this.newDocument.description) {
          formData.append('description', this.newDocument.description);
        }

        // Simular progreso
        const progressInterval = setInterval(() => {
          if (this.uploadProgress < 90) {
            this.uploadProgress += 10;
          }
        }, 200);

        await ClientDocumentService.uploadDocument(this.client.id, formData);
        
        clearInterval(progressInterval);
        this.uploadProgress = 100;

        setTimeout(() => {
          this.closeUploadModal();
          this.loadDocuments(); // Recargar documentos
        }, 500);

      } catch (error) {
        console.error('Error subiendo documento:', error);
        alert('Error subiendo documento: ' + (error.response?.data?.message || error.message));
      } finally {
        this.uploading = false;
      }
    },

    // ===============================
    // DESCARGAR/ELIMINAR SUBIDOS
    // ===============================

    async downloadUploadedDocument(documentId) {
      try {
        const response = await ClientDocumentService.downloadDocument(documentId);
        
        // Crear enlace para descargar
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // Obtener nombre del archivo
        const contentDisposition = response.headers['content-disposition'];
        let filename = 'documento.pdf';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch.length === 2) {
            filename = filenameMatch[1];
          }
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
      } catch (error) {
        console.error('Error descargando documento:', error);
        alert('Error al descargar el documento');
      }
    },

    async deleteUploadedDocument(documentId) {
      if (!confirm('¿Está seguro que desea eliminar este documento?')) {
        return;
      }

      try {
        await ClientDocumentService.deleteDocument(documentId);
        this.loadDocuments(); // Recargar documentos
      } catch (error) {
        console.error('Error eliminando documento:', error);
        alert('Error al eliminar el documento');
      }
    },

    // ===============================
    // GENERAR DOCUMENTOS
    // ===============================

    selectTemplate(template) {
      this.selectedTemplate = template;
    },

    generateFromTemplate(template) {
      this.selectedTemplate = template;
      this.showGenerateModal = true;
    },

    async generateDocument() {
      if (!this.selectedTemplate) return;

      this.generating = true;

      try {
        await DocumentTemplateService.generateDocument(
          this.selectedTemplate.id,
          this.client.id,
          { saveToDocuments: true }
        );
        
        this.closeGenerateModal();
        this.loadDocuments(); // Recargar documentos
        
        alert('Documento generado exitosamente');
        
      } catch (error) {
        console.error('Error generando documento:', error);
        alert('Error al generar el documento: ' + (error.response?.data?.message || error.message));
      } finally {
        this.generating = false;
      }
    },

    // ===============================
    // DESCARGAR DOCUMENTOS GENERADOS
    // ===============================

    async downloadGeneratedDoc(historyId) {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const headers = user && user.accessToken 
          ? { 'x-access-token': user.accessToken }
          : {};

        const response = await axios.get(
          `http://localhost:3000/api/documents/generated/${historyId}/download`,
          {
            headers,
            responseType: 'blob'
          }
        );
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // Obtener nombre del archivo
        const contentDisposition = response.headers['content-disposition'];
        let filename = `documento_${historyId}.pdf`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch.length === 2) {
            filename = filenameMatch[1];
          }
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
      } catch (error) {
        console.error('Error descargando documento generado:', error);
        alert('Error al descargar el documento');
      }
    },

    // ===============================
    // FIRMAS DIGITALES
    // ===============================

    openSignatureModal(doc) {
      this.currentSignatureDoc = doc;
      this.showSignatureModal = true;
    },

    async handleSignatureSaved(signatureData) {
      try {
        await DocumentAdvancedService.createSignature({
          generatedDocumentId: this.currentSignatureDoc.id,
          signatureData: signatureData.signatureData,
          signerName: signatureData.signerName,
          signerType: signatureData.signerType,
          signedAt: signatureData.signedAt
        });
        
        this.closeSignatureModal();
        this.loadDocuments(); // Recargar para mostrar firma
        alert('Firma guardada exitosamente');
        
      } catch (error) {
        console.error('Error guardando firma:', error);
        alert('Error al guardar la firma');
      }
    },

    handleSignatureError(error) {
      console.error('Error en firma:', error);
      alert('Error al procesar la firma');
    },

    // ===============================
    // ENVÍO DE EMAILS
    // ===============================

    openEmailModal(doc) {
      this.currentEmailDoc = doc;
      this.emailData.recipient = this.client.email || '';
      this.emailData.subject = `Documento: ${doc.DocumentTemplate?.name || 'Documento'}`;
      this.emailData.message = `Estimado/a ${this.client.firstName} ${this.client.lastName},\n\nAdjunto encontrará el documento solicitado.\n\nSaludos cordiales.`;
      this.showEmailModal = true;
    },

    async sendEmail() {
      if (!this.emailData.recipient || !this.emailData.subject) {
        alert('Complete los campos requeridos');
        return;
      }

      this.sendingEmail = true;

      try {
        await DocumentAdvancedService.sendDocumentByEmail(
          this.currentEmailDoc.id,
          {
            recipient: this.emailData.recipient,
            subject: this.emailData.subject,
            message: this.emailData.message,
            includeAttachment: this.emailData.includeAttachment
          }
        );
        
        this.closeEmailModal();
        alert('Email enviado correctamente');
        
      } catch (error) {
        console.error('Error enviando email:', error);
        alert('Error al enviar el email: ' + (error.response?.data?.message || error.message));
      } finally {
        this.sendingEmail = false;
      }
    },

    // ===============================
    // VISTA PREVIA
    // ===============================

    previewDocument(doc) {
      this.currentPreviewDoc = doc;
      
      const extension = doc.filename.split('.').pop().toLowerCase();
      if (['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
        // Crear URL para preview
        this.previewUrl = `http://localhost:3000/api/documents/${doc.id}/preview`;
      } else {
        this.previewUrl = null;
      }
      
      this.showPreviewModal = true;
    },

    viewDocumentDetails(doc) {
      // Mostrar modal con detalles completos del documento
      console.log('Ver detalles:', doc);
      // Aquí puedes crear un modal de detalles si lo deseas
      alert(`Detalles del documento:\n\nID: ${doc.id}\nPlantilla: ${doc.DocumentTemplate?.name}\nGenerado: ${this.formatDate(doc.generatedAt)}\nEstado: ${this.formatDocumentStatus(doc.status)}`);
    },

    // ===============================
    // UTILIDADES
    // ===============================

    getFileIcon(filename) {
      if (!filename) return '📄';
      
      const extension = filename.split('.').pop().toLowerCase();
      const iconMap = {
        'pdf': '📕',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'gif': '🖼️',
        'doc': '📘',
        'docx': '📘',
        'txt': '📝',
        'xls': '📗',
        'xlsx': '📗',
        'zip': '📦',
        'rar': '📦'
      };
      
      return iconMap[extension] || '📄';
    },

    getTemplateIcon(templateType) {
      const iconMap = {
        'contract': '📋',
        'installation': '🔧',
        'receipt': '🧾',
        'report': '📊',
        'invoice': '💰',
        'letter': '✉️'
      };
      return iconMap[templateType] || '📄';
    },

    formatDate(dateString) {
      if (!dateString) return 'Sin fecha';
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatDocumentStatus(status) {
      const statusMap = {
        'generated': 'Generado',
        'pending': 'Pendiente',
        'signed': 'Firmado',
        'sent': 'Enviado',
        'error': 'Error'
      };
      return statusMap[status] || status;
    },

    updateCategoryCounts() {
      this.categories[0].count = this.totalDocuments;
      this.categories[1].count = this.uploadedDocuments;
      this.categories[2].count = this.generatedDocuments;
    },

    // ===============================
    // CERRAR MODALES
    // ===============================

    closeUploadModal() {
      this.showUploadModal = false;
      this.newDocument = {
        type: '',
        file: null,
        description: ''
      };
      this.uploadProgress = 0;
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
    },

    closeGenerateModal() {
      this.showGenerateModal = false;
      this.selectedTemplate = null;
    },

    closePreviewModal() {
      this.showPreviewModal = false;
      this.currentPreviewDoc = null;
      this.previewUrl = null;
    },

    closeSignatureModal() {
      this.showSignatureModal = false;
      this.currentSignatureDoc = null;
    },

    closeEmailModal() {
      this.showEmailModal = false;
      this.currentEmailDoc = null;
      this.emailData = {
        recipient: '',
        subject: '',
        message: '',
        includeAttachment: true
      };
    }
  },

  watch: {
    'client.id': {
      handler(newVal) {
        if (newVal) {
          this.loadDocuments();
          this.loadTemplates();
        }
      },
      immediate: true
    }
  }
};
</script>

<style scoped>
/* ============================= */
/* CONTENEDOR PRINCIPAL */
/* ============================= */

.documentos-tab {
  padding: 20px;
  background: #f8f9fa;
  min-height: 500px;
}

/* ============================= */
/* HEADER */
/* ============================= */

.documentos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
}

.header-info h3 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.subtitle {
  color: #666;
  font-size: 0.9rem;
  margin-top: 4px;
}

.upload-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
}

.upload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
}

/* ============================= */
/* CATEGORÍAS */
/* ============================= */

.document-categories {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  color: #666;
}

.category-btn:hover {
  border-color: #667eea;
  color: #667eea;
  transform: translateY(-2px);
}

.category-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.category-icon {
  font-size: 1.2rem;
}

.category-count {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: bold;
}

.category-btn.active .category-count {
  background: rgba(255, 255, 255, 0.25);
}

/* ============================= */
/* ESTADÍSTICAS */
/* ============================= */

.documents-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8px;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

/* ============================= */
/* LOADING Y ERROR */
/* ============================= */

.loading-container {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  text-align: center;
  padding: 60px 20px;
  color: #f44336;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.retry-btn {
  padding: 10px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 16px;
  font-weight: 600;
}

.retry-btn:hover {
  background: #5568d3;
}

/* ============================= */
/* CONTENIDO DE DOCUMENTOS */
/* ============================= */

.documents-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.document-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.section-header h4 {
  margin: 0;
  color: #333;
  font-size: 1.3rem;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.document-count {
  color: #666;
  font-size: 0.9rem;
}

.generate-btn {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.generate-btn:hover {
  background: #45a049;
  transform: translateY(-2px);
}

/* ============================= */
/* EMPTY STATE */
/* ============================= */

.empty-section {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.upload-first-btn,
.generate-first-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.upload-first-btn:hover,
.generate-first-btn:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

/* ============================= */
/* GRID DE DOCUMENTOS */
/* ============================= */

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.document-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9f9f9;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.document-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.document-card.uploaded {
  border-left: 4px solid #2196F3;
}

.document-card.generated {
  border-left: 4px solid #4CAF50;
}

.document-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.document-info {
  flex: 1;
  min-width: 0;
}

.document-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-meta {
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  color: #666;
}

.document-type {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.document-description {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-status {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-badge.generated {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.pending {
  background: #fff3e0;
  color: #f57f17;
}

.status-badge.signed {
  background: #e3f2fd;
  color: #1976d2;
}

.status-badge.sent {
  background: #f3e5f5;
  color: #7b1fa2;
}

.status-badge.error {
  background: #ffebee;
  color: #c62828;
}

.signed-badge {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* ============================= */
/* ACCIONES DE DOCUMENTOS */
/* ============================= */

.document-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  padding: 8px 12px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: scale(1.1);
}

.action-btn.download {
  border-color: #4CAF50;
}

.action-btn.download:hover {
  background: #4CAF50;
}

.action-btn.preview {
  border-color: #2196F3;
}

.action-btn.preview:hover {
  background: #2196F3;
}

.action-btn.delete {
  border-color: #f44336;
}

.action-btn.delete:hover {
  background: #f44336;
}

.action-btn.sign {
  border-color: #ff9800;
}

.action-btn.sign:hover {
  background: #ff9800;
}

.action-btn.email {
  border-color: #9c27b0;
}

.action-btn.email:hover {
  background: #9c27b0;
}

.action-btn.details {
  border-color: #607d8b;
}

.action-btn.details:hover {
  background: #607d8b;
}

/* ============================= */
/* PLANTILLAS DISPONIBLES */
/* ============================= */

.document-templates {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px dashed #e0e0e0;
}

.document-templates h5 {
  margin-bottom: 16px;
  color: #333;
  font-size: 1.1rem;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.template-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.template-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.template-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
}

.template-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.template-description {
  font-size: 0.85rem;
  color: #666;
}

/* ============================= */
/* MODALES */
/* ============================= */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 2px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
  transition: color 0.3s ease;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  color: #333;
  background: #f0f0f0;
}

.modal-body {
  padding: 24px;
}

/* ============================= */
/* MODAL DE UPLOAD */
/* ============================= */

.upload-modal {
  width: 600px;
}

.file-upload-area {
  position: relative;
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  background: #fafafa;
  transition: all 0.3s ease;
  cursor: pointer;
}

.file-upload-area:hover {
  border-color: #667eea;
  background: #f5f7ff;
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-content {
  pointer-events: none;
}

.upload-placeholder {
  color: #666;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.upload-link {
  color: #667eea;
  text-decoration: underline;
  font-weight: 600;
}

.file-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: white;
  border-radius: 6px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 2rem;
}

.file-details {
  text-align: left;
}

.file-name {
  font-weight: 600;
  color: #333;
}

.file-size {
  font-size: 0.85rem;
  color: #666;
}

.remove-file-btn {
  background: #f44336;
  color: white;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  pointer-events: all;
}

.remove-file-btn:hover {
  background: #d32f2f;
  transform: scale(1.1);
}

.upload-progress {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-weight: 600;
  color: #667eea;
  min-width: 40px;
}

/* ============================= */
/* MODAL DE GENERAR */
/* ============================= */

.generate-modal {
  width: 700px;
}

.template-selection h4 {
  margin-bottom: 16px;
  color: #333;
}

.template-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.template-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.template-option:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.template-option.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, #f5f7ff 0%, #e8ebff 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.option-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.option-info {
  flex: 1;
}

.option-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  font-size: 1.1rem;
}

.option-description {
  color: #666;
  font-size: 0.9rem;
}

.template-preview {
  margin-top: 24px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.template-preview h4 {
  margin-bottom: 12px;
  color: #333;
}

.preview-content p {
  color: #666;
  margin-bottom: 12px;
}

.preview-note {
  margin-top: 12px;
  padding: 12px;
  background: #fff3e0;
  border-left: 4px solid #ff9800;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #666;
}

/* ============================= */
/* MODAL DE PREVIEW */
/* ============================= */

.preview-modal {
  width: 90%;
  max-width: 1200px;
  height: 90vh;
}

.preview-modal .modal-body {
  padding: 0;
  height: calc(90vh - 80px);
}

.preview-container {
  width: 100%;
  height: 100%;
}

.document-preview-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-unavailable {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.unavailable-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.download-anyway-btn {
  margin-top: 20px;
  padding: 10px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.download-anyway-btn:hover {
  background: #5568d3;
}

/* ============================= */
/* MODAL DE FIRMA */
/* ============================= */

.signature-modal {
  width: 800px;
}

.signature-document-info {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.signature-document-info p {
  margin: 8px 0;
  color: #333;
}

/* ============================= */
/* MODAL DE EMAIL */
/* ============================= */

.email-modal {
  width: 700px;
}

.document-preview-info {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  color: #333;
  font-weight: 600;
}

/* ============================= */
/* FORMULARIOS */
/* ============================= */

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 0.85rem;
  color: #666;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

.btn-cancel,
.btn-upload,
.btn-generate,
.btn-send {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.btn-cancel {
  background: #f0f0f0;
  color: #333;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-upload {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-upload:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
}

.btn-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-generate {
  background: #4CAF50;
  color: white;
}

.btn-generate:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-2px);
}

.btn-generate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-send {
  background: #2196F3;
  color: white;
}

.btn-send:hover:not(:disabled) {
  background: #1976d2;
  transform: translateY(-2px);
}

.btn-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ============================= */
/* RESPONSIVE */
/* ============================= */

@media (max-width: 768px) {
  .documentos-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .upload-btn {
    width: 100%;
  }

  .document-categories {
    flex-wrap: wrap;
  }

  .documents-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .documents-grid {
    grid-template-columns: 1fr;
  }

  .document-card {
    flex-direction: column;
    text-align: center;
  }

  .document-actions {
    width: 100%;
    justify-content: center;
  }

  .templates-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    max-height: 95vh;
  }

  .upload-modal,
  .generate-modal,
  .email-modal {
    width: 95%;
  }

  .preview-modal {
    width: 95%;
    height: 95vh;
  }

  .signature-modal {
    width: 95%;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-upload,
  .btn-generate,
  .btn-send {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .documentos-tab {
    padding: 12px;
  }

  .documents-stats {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .section-actions {
    width: 100%;
    flex-direction: column;
  }

  .generate-btn {
    width: 100%;
  }
}

/* ============================= */
/* SCROLLBAR PERSONALIZADO */
/* ============================= */

.template-options::-webkit-scrollbar,
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.template-options::-webkit-scrollbar-track,
.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.template-options::-webkit-scrollbar-thumb,
.modal-body::-webkit-scrollbar-thumb {
  background: #667eea;
  border-radius: 10px;
}

.template-options::-webkit-scrollbar-thumb:hover,
.modal-body::-webkit-scrollbar-thumb:hover {
  background: #5568d3;
}

/* ============================= */
/* ANIMACIONES ADICIONALES */
/* ============================= */

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.document-card {
  animation: fadeIn 0.3s ease;
}

.template-card {
  animation: fadeIn 0.3s ease;
}

/* ============================= */
/* ESTILOS PARA IMPRESIÓN */
/* ============================= */

@media print {
  .documentos-header,
  .document-categories,
  .documents-stats,
  .document-actions,
  .upload-btn,
  .generate-btn {
    display: none;
  }

  .documentos-tab {
    background: white;
    padding: 0;
  }

  .document-card {
    page-break-inside: avoid;
    border: 1px solid #ddd;
  }
}
</style>