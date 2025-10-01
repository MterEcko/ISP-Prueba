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

    <!-- Lista de documentos -->
    <div class="documents-content">
      
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
          <div 
            v-for="doc in uploadedDocs" 
            :key="doc.id"
            class="document-card uploaded"
          >
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
              <button @click="downloadDocument(doc.id)" class="action-btn download" title="Descargar">
                ⬇️
              </button>
              <button @click="previewDocument(doc)" class="action-btn preview" title="Vista previa">
                👁️
              </button>
              <button @click="deleteDocument(doc.id)" class="action-btn delete" title="Eliminar">
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
          <div 
            v-for="doc in generatedDocs" 
            :key="doc.id"
            class="document-card generated"
          >
            <div class="document-icon">
              📋
            </div>
            
            <div class="document-info">
              <div class="document-name">{{ doc.name }}</div>
              <div class="document-meta">
                <span class="document-type">{{ doc.type }}</span>
                <span class="document-date">{{ formatDate(doc.generatedAt) }}</span>
              </div>
              <div class="document-status">
                <span :class="['status-badge', doc.status]">
                  {{ formatDocumentStatus(doc.status) }}
                </span>
              </div>
            </div>

            <div class="document-actions">
              <button @click="downloadGeneratedDocument(doc)" class="action-btn download" title="Descargar">
                ⬇️
              </button>
              <button @click="regenerateDocument(doc)" class="action-btn regenerate" title="Regenerar">
                🔄
              </button>
              <button @click="viewDocumentDetails(doc)" class="action-btn details" title="Detalles">
                ℹ️
              </button>
            </div>
          </div>
        </div>

        <!-- Plantillas disponibles -->
        <div class="document-templates">
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
              <p>{{ selectedTemplate.preview }}</p>
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
          <h3>Vista Previa: {{ previewDocument?.filename }}</h3>
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
              <button @click="downloadDocument(previewDocument.id)" class="download-anyway-btn">
                Descargar para ver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: 'DocumentosTab',
  props: {
    client: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      activeCategory: 'all',
      showUploadModal: false,
      showGenerateModal: false,
      showPreviewModal: false,
      uploading: false,
      generating: false,
      uploadProgress: 0,
      previewDocument: null,
      previewUrl: null,
      selectedTemplate: null,

      categories: [
        { id: 'all', label: 'Todos', icon: '📁', count: 0 },
        { id: 'uploaded', label: 'Subidos', icon: '📎', count: 0 },
        { id: 'generated', label: 'Generados', icon: '📋', count: 0 }
      ],

      newDocument: {
        type: '',
        file: null,
        description: ''
      },

      availableTemplates: [
        {
          id: 'contract',
          name: 'Contrato de Servicio',
          description: 'Contrato estándar de servicios de internet',
          icon: '📋',
          preview: 'Contrato de prestación de servicios de internet entre la empresa y el cliente...'
        },
        {
          id: 'installation',
          name: 'Hoja de Instalación',
          description: 'Documento técnico de instalación',
          icon: '🔧',
          preview: 'Reporte técnico de instalación de equipo y configuración de servicio...'
        },
        {
          id: 'receipt',
          name: 'Recibo de Pago',
          description: 'Comprobante de pago de servicios',
          icon: '🧾',
          preview: 'Comprobante de pago por servicios de internet correspondiente al período...'
        },
        {
          id: 'report',
          name: 'Reporte Técnico',
          description: 'Informe de estado del servicio',
          icon: '📊',
          preview: 'Reporte técnico del estado del servicio y equipamiento del cliente...'
        }
      ]
    };
  },
  computed: {
    uploadedDocs() {
      return this.client.ClientDocuments || [];
    },

    generatedDocs() {
      // Simular documentos generados por el sistema
      return [
        {
          id: 'gen_1',
          name: 'Contrato de Servicio - Juan Pérez.pdf',
          type: 'Contrato',
          status: 'generated',
          generatedAt: '2024-01-15T10:30:00Z'
        }
        // Aquí irían los documentos reales generados
      ];
    },

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
      // Calcular tamaño total (simulado)
      return this.uploadedDocs.length * 1024 * 1024 * 2; // 2MB promedio por doc
    }
  },
  methods: {
    // ===============================
    // GESTIÓN DE ARCHIVOS
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
      // Validar tamaño (10MB máximo)
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 10MB permitido.');
        return;
      }

      // Validar tipo de archivo
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

        // Simular progreso de subida
        const progressInterval = setInterval(() => {
          if (this.uploadProgress < 90) {
            this.uploadProgress += 10;
          }
        }, 200);

        // Llamar al método del componente padre
        await this.$emit('upload-document', formData);
        
        clearInterval(progressInterval);
        this.uploadProgress = 100;

        setTimeout(() => {
          this.closeUploadModal();
          this.updateCategoryCounts();
        }, 500);

      } catch (error) {
        console.error('Error subiendo documento:', error);
        alert('Error subiendo documento');
      } finally {
        this.uploading = false;
      }
    },

    async downloadDocument(id) {
      try {
        await this.$emit('download-document', id);
      } catch (error) {
        console.error('Error descargando documento:', error);
        alert('Error descargando documento');
      }
    },

    async deleteDocument(id) {
      if (!confirm('¿Está seguro que desea eliminar este documento?')) {
        return;
      }

      try {
        await this.$emit('delete-document', id);
        this.updateCategoryCounts();
      } catch (error) {
        console.error('Error eliminando documento:', error);
        alert('Error eliminando documento');
      }
    },

    // ===============================
    // GENERACIÓN DE DOCUMENTOS
    // ===============================

    selectTemplate(template) {
      this.selectedTemplate = template;
    },

    async generateDocument() {
      if (!this.selectedTemplate) return;

      this.generating = true;

      try {
        await this.$emit('generate-document', this.selectedTemplate.id);
        this.closeGenerateModal();
        this.updateCategoryCounts();
      } catch (error) {
        console.error('Error generando documento:', error);
        alert('Error generando documento');
      } finally {
        this.generating = false;
      }
    },

    generateFromTemplate(template) {
      this.selectedTemplate = template;
      this.showGenerateModal = true;
    },

    async regenerateDocument(doc) {
      if (!confirm('¿Regenerar este documento? Se sobrescribirá la versión actual.')) {
        return;
      }

      try {
        await this.$emit('generate-document', doc.templateId || 'contract');
      } catch (error) {
        console.error('Error regenerando documento:', error);
        alert('Error regenerando documento');
      }
    },

    downloadGeneratedDocument(doc) {
      // Simular descarga de documento generado
      console.log('Descargando documento generado:', doc.name);
    },

    viewDocumentDetails(doc) {
      console.log('Ver detalles del documento:', doc);
    },

    // ===============================
    // VISTA PREVIA
    // ===============================

   /* previewDocument(doc) {
      this.previewDocument = doc;
      
      // Solo mostrar vista previa para PDFs e imágenes
      const extension = doc.filename.split('.').pop().toLowerCase();
      if (['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
        this.previewUrl = `/api/documents/${doc.id}/preview`;
      } else {
        this.previewUrl = null;
      }
      
      this.showPreviewModal = true;
    },*/

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
        'doc': '📘',
        'docx': '📘',
        'txt': '📝',
        'xls': '📗',
        'xlsx': '📗'
      };
      
      return iconMap[extension] || '📄';
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
        'error': 'Error'
      };
      return statusMap[status] || status;
    },

    updateCategoryCounts() {
      this.categories[0].count = this.totalDocuments; // Todos
      this.categories[1].count = this.uploadedDocuments; // Subidos
      this.categories[2].count = this.generatedDocuments; // Generados
    },

    // ===============================
    // MODALES
    // ===============================

    closeUploadModal() {
      this.showUploadModal = false;
      this.newDocument = {
        type: '',
        file: null,
        description: ''
      };
      this.uploadProgress = 0;
    },

    closeGenerateModal() {
      this.showGenerateModal = false;
      this.selectedTemplate = null;
    },

    closePreviewModal() {
      this.showPreviewModal = false;
      this.previewDocument = null;
      this.previewUrl = null;
    }
  },

  mounted() {
    this.updateCategoryCounts();
  },

  watch: {
    'client.ClientDocuments': {
      handler() {
        this.updateCategoryCounts();
      },
      deep: true
    }
  }
};
</script>

<style scoped>
.documentos-tab {
  padding: 24px;
  background: #f8f9fa;
  min-height: 100vh;
}

/* ===============================
   HEADER
   =============================== */

.documentos-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-info h3 {
  margin: 0 0 4px 0;
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
}

.upload-btn {
  background: linear-gradient(135deg, #2196F3, #1976D2);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-btn:hover {
  background: linear-gradient(135deg, #1976D2, #1565C0);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* ===============================
   CATEGORÍAS
   =============================== */

.document-categories {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.category-btn:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.category-btn.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.category-icon {
  font-size: 1.2rem;
}

.category-count {
  background: rgba(255,255,255,0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.category-btn.active .category-count {
  background: rgba(255,255,255,0.3);
}

/* ===============================
   ESTADÍSTICAS
   =============================== */

.documents-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 4px;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

/* ===============================
   CONTENIDO DE DOCUMENTOS
   =============================== */

.documents-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  overflow: hidden;
}

.document-section {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.document-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h4 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
  font-weight: 600;
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

.generate-btn,
.upload-first-btn,
.generate-first-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.generate-btn:hover,
.upload-first-btn:hover,
.generate-first-btn:hover {
  background: #45a049;
}

/* ===============================
  DOCUMENTOS GRID
  =============================== */

.documents-grid {
 display: grid;
 grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
 gap: 16px;
 margin-top: 16px;
}

.document-card {
 display: flex;
 align-items: center;
 gap: 16px;
 padding: 16px;
 border: 1px solid #e0e0e0;
 border-radius: 8px;
 background: #fafafa;
 transition: all 0.2s ease;
}

.document-card:hover {
 border-color: #667eea;
 background: white;
 box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.document-card.uploaded {
 border-left: 4px solid #2196F3;
}

.document-card.generated {
 border-left: 4px solid #4CAF50;
}

.document-icon {
 font-size: 2rem;
 flex-shrink: 0;
}

.document-info {
 flex: 1;
 min-width: 0;
}

.document-name {
 font-weight: 600;
 color: #333;
 margin-bottom: 4px;
 white-space: nowrap;
 overflow: hidden;
 text-overflow: ellipsis;
}

.document-meta {
 display: flex;
 gap: 12px;
 margin-bottom: 4px;
}

.document-type,
.document-date {
 font-size: 0.85rem;
 color: #666;
}

.document-description {
 font-size: 0.9rem;
 color: #777;
 margin-top: 8px;
 line-height: 1.4;
}

.document-status {
 margin-top: 8px;
}

.status-badge {
 padding: 4px 8px;
 border-radius: 12px;
 font-size: 0.75rem;
 font-weight: 600;
 text-transform: uppercase;
}

.status-badge.generated {
 background: #e8f5e8;
 color: #4CAF50;
}

.status-badge.pending {
 background: #fff3cd;
 color: #856404;
}

.status-badge.error {
 background: #f8d7da;
 color: #721c24;
}

.document-actions {
 display: flex;
 gap: 8px;
 flex-shrink: 0;
}

.action-btn {
 width: 36px;
 height: 36px;
 border: none;
 border-radius: 6px;
 cursor: pointer;
 font-size: 1rem;
 transition: all 0.2s ease;
 display: flex;
 align-items: center;
 justify-content: center;
}

.action-btn.download {
 background: #e3f2fd;
 color: #1976d2;
}

.action-btn.download:hover {
 background: #1976d2;
 color: white;
}

.action-btn.preview {
 background: #f3e5f5;
 color: #7b1fa2;
}

.action-btn.preview:hover {
 background: #7b1fa2;
 color: white;
}

.action-btn.delete {
 background: #ffebee;
 color: #d32f2f;
}

.action-btn.delete:hover {
 background: #d32f2f;
 color: white;
}

.action-btn.regenerate {
 background: #e8f5e8;
 color: #4CAF50;
}

.action-btn.regenerate:hover {
 background: #4CAF50;
 color: white;
}

.action-btn.details {
 background: #fff3e0;
 color: #f57c00;
}

.action-btn.details:hover {
 background: #f57c00;
 color: white;
}

/* ===============================
  EMPTY SECTIONS
  =============================== */

.empty-section {
 text-align: center;
 padding: 40px 20px;
 color: #666;
}

.empty-icon {
 font-size: 3rem;
 margin-bottom: 16px;
 opacity: 0.6;
}

.empty-section p {
 margin: 0 0 16px 0;
 font-size: 1.1rem;
}

/* ===============================
  PLANTILLAS
  =============================== */

.document-templates {
 margin-top: 32px;
 padding-top: 24px;
 border-top: 1px solid #f0f0f0;
}

.document-templates h5 {
 margin: 0 0 16px 0;
 color: #333;
 font-size: 1.1rem;
 font-weight: 600;
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
 border: 1px solid #e0e0e0;
 border-radius: 8px;
 background: white;
 cursor: pointer;
 transition: all 0.2s ease;
}

.template-card:hover {
 border-color: #667eea;
 background: #f8f9ff;
 transform: translateY(-1px);
}

.template-icon {
 font-size: 1.5rem;
 flex-shrink: 0;
}

.template-info {
 flex: 1;
}

.template-name {
 font-weight: 600;
 color: #333;
 margin-bottom: 4px;
 font-size: 0.95rem;
}

.template-description {
 font-size: 0.85rem;
 color: #666;
 line-height: 1.3;
}

/* ===============================
  MODALES
  =============================== */

.modal-overlay {
 position: fixed;
 top: 0;
 left: 0;
 right: 0;
 bottom: 0;
 background: rgba(0,0,0,0.5);
 display: flex;
 align-items: center;
 justify-content: center;
 z-index: 1000;
 padding: 20px;
}

.modal-content {
 background: white;
 border-radius: 12px;
 box-shadow: 0 20px 60px rgba(0,0,0,0.3);
 max-width: 90vw;
 max-height: 90vh;
 overflow: hidden;
 display: flex;
 flex-direction: column;
}

.upload-modal {
 width: 500px;
}

.generate-modal {
 width: 600px;
}

.preview-modal {
 width: 80vw;
 height: 80vh;
}

.modal-header {
 display: flex;
 justify-content: space-between;
 align-items: center;
 padding: 20px 24px;
 border-bottom: 1px solid #e0e0e0;
 background: #f8f9fa;
}

.modal-header h3 {
 margin: 0;
 color: #333;
 font-size: 1.3rem;
 font-weight: 600;
}

.close-btn {
 background: none;
 border: none;
 font-size: 1.5rem;
 cursor: pointer;
 color: #666;
 width: 32px;
 height: 32px;
 border-radius: 50%;
 display: flex;
 align-items: center;
 justify-content: center;
 transition: all 0.2s ease;
}

.close-btn:hover {
 background: #f0f0f0;
 color: #333;
}

.modal-body {
 padding: 24px;
 overflow-y: auto;
 flex: 1;
}

/* ===============================
  FORMULARIOS
  =============================== */

.form-group {
 margin-bottom: 20px;
}

.form-group label {
 display: block;
 margin-bottom: 6px;
 font-weight: 600;
 color: #333;
}

.form-control {
 width: 100%;
 padding: 12px;
 border: 1px solid #ddd;
 border-radius: 6px;
 font-size: 0.95rem;
 transition: border-color 0.2s ease;
 box-sizing: border-box;
}

.form-control:focus {
 outline: none;
 border-color: #667eea;
 box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.file-upload-area {
 border: 2px dashed #ddd;
 border-radius: 8px;
 padding: 20px;
 transition: all 0.2s ease;
 cursor: pointer;
 position: relative;
}

.file-upload-area:hover {
 border-color: #667eea;
 background: #f8f9ff;
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
 text-align: center;
}

.upload-placeholder {
 color: #666;
}

.upload-icon {
 font-size: 2rem;
 margin-bottom: 12px;
}

.upload-link {
 color: #667eea;
 font-weight: 600;
}

.file-preview {
 display: flex;
 align-items: center;
 justify-content: space-between;
 padding: 12px;
 background: #f8f9fa;
 border-radius: 6px;
}

.file-info {
 display: flex;
 align-items: center;
 gap: 12px;
}

.file-icon {
 font-size: 1.5rem;
}

.file-details {
 text-align: left;
}

.file-name {
 font-weight: 600;
 color: #333;
 margin-bottom: 2px;
}

.file-size {
 font-size: 0.85rem;
 color: #666;
}

.remove-file-btn {
 background: #ffebee;
 color: #d32f2f;
 border: none;
 width: 24px;
 height: 24px;
 border-radius: 50%;
 cursor: pointer;
 font-size: 0.9rem;
 display: flex;
 align-items: center;
 justify-content: center;
 transition: all 0.2s ease;
}

.remove-file-btn:hover {
 background: #d32f2f;
 color: white;
}

.upload-progress {
 margin: 16px 0;
}

.progress-bar {
 background: #f0f0f0;
 border-radius: 10px;
 height: 8px;
 overflow: hidden;
 margin-bottom: 4px;
}

.progress-fill {
 background: linear-gradient(90deg, #667eea, #764ba2);
 height: 100%;
 transition: width 0.3s ease;
}

.progress-text {
 font-size: 0.85rem;
 color: #666;
 text-align: center;
 display: block;
}

.form-actions {
 display: flex;
 gap: 12px;
 justify-content: flex-end;
 margin-top: 24px;
 padding-top: 16px;
 border-top: 1px solid #f0f0f0;
}

.btn-cancel {
 padding: 10px 20px;
 border: 1px solid #ddd;
 background: white;
 color: #666;
 border-radius: 6px;
 cursor: pointer;
 font-weight: 500;
 transition: all 0.2s ease;
}

.btn-cancel:hover {
 background: #f5f5f5;
 border-color: #bbb;
}

.btn-upload,
.btn-generate {
 padding: 10px 20px;
 border: none;
 background: linear-gradient(135deg, #667eea, #764ba2);
 color: white;
 border-radius: 6px;
 cursor: pointer;
 font-weight: 500;
 transition: all 0.2s ease;
}

.btn-upload:hover,
.btn-generate:hover {
 background: linear-gradient(135deg, #5a6fd8, #6a42a0);
 transform: translateY(-1px);
}

.btn-upload:disabled,
.btn-generate:disabled {
 background: #ccc;
 cursor: not-allowed;
 transform: none;
}

/* ===============================
  SELECCIÓN DE PLANTILLAS
  =============================== */

.template-selection h4 {
 margin: 0 0 16px 0;
 color: #333;
 font-size: 1.1rem;
 font-weight: 600;
}

.template-options {
 display: grid;
 gap: 12px;
 margin-bottom: 24px;
}

.template-option {
 display: flex;
 align-items: center;
 gap: 16px;
 padding: 16px;
 border: 2px solid #e0e0e0;
 border-radius: 8px;
 background: white;
 cursor: pointer;
 transition: all 0.2s ease;
}

.template-option:hover {
 border-color: #667eea;
 background: #f8f9ff;
}

.template-option.selected {
 border-color: #667eea;
 background: #667eea;
 color: white;
}

.option-icon {
 font-size: 1.5rem;
 flex-shrink: 0;
}

.option-info {
 flex: 1;
}

.option-name {
 font-weight: 600;
 margin-bottom: 4px;
 font-size: 1rem;
}

.option-description {
 font-size: 0.9rem;
 opacity: 0.8;
 line-height: 1.3;
}

.template-preview {
 background: #f8f9fa;
 border-radius: 8px;
 padding: 16px;
 margin-bottom: 24px;
}

.template-preview h4 {
 margin: 0 0 12px 0;
 color: #333;
 font-size: 1rem;
 font-weight: 600;
}

.preview-content {
 background: white;
 padding: 16px;
 border-radius: 6px;
 border: 1px solid #e0e0e0;
}

.preview-content p {
 margin: 0;
 color: #666;
 font-style: italic;
 line-height: 1.4;
}

/* ===============================
  VISTA PREVIA DE DOCUMENTOS
  =============================== */

.preview-container {
 height: 100%;
 display: flex;
 flex-direction: column;
}

.document-preview-frame {
 width: 100%;
 height: 100%;
 border: none;
 border-radius: 6px;
}

.preview-unavailable {
 display: flex;
 flex-direction: column;
 align-items: center;
 justify-content: center;
 height: 400px;
 color: #666;
 text-align: center;
}

.unavailable-icon {
 font-size: 3rem;
 margin-bottom: 16px;
 opacity: 0.6;
}

.preview-unavailable p {
 margin: 0 0 16px 0;
 font-size: 1.1rem;
}

.download-anyway-btn {
 background: #667eea;
 color: white;
 border: none;
 padding: 10px 20px;
 border-radius: 6px;
 cursor: pointer;
 font-weight: 500;
 transition: background-color 0.2s ease;
}

.download-anyway-btn:hover {
 background: #5a6fd8;
}

/* ===============================
  RESPONSIVE
  =============================== */

@media (max-width: 768px) {
 .documentos-tab {
   padding: 16px;
 }

 .documentos-header {
   flex-direction: column;
   gap: 16px;
   align-items: stretch;
 }

 .documents-stats {
   grid-template-columns: repeat(2, 1fr);
 }

 .documents-grid {
   grid-template-columns: 1fr;
 }

 .document-card {
   flex-direction: column;
   align-items: flex-start;
   gap: 12px;
 }

 .document-actions {
   align-self: stretch;
   justify-content: flex-end;
 }

 .section-header {
   flex-direction: column;
   align-items: flex-start;
   gap: 12px;
 }

 .section-actions {
   align-self: stretch;
   justify-content: space-between;
 }

 .templates-grid {
   grid-template-columns: 1fr;
 }

 .modal-content {
   width: 95vw;
   margin: 20px;
 }

 .category-btn {
   flex: 1;
   justify-content: center;
 }
}

@media (max-width: 480px) {
 .documents-stats {
   grid-template-columns: 1fr;
 }

 .category-btn {
   padding: 10px 12px;
   font-size: 0.9rem;
 }

 .stat-card {
   padding: 16px;
 }

 .stat-number {
   font-size: 1.5rem;
 }

 .form-actions {
   flex-direction: column;
 }

 .document-actions {
   grid-template-columns: repeat(4, 1fr);
   gap: 4px;
 }

 .action-btn {
   width: 32px;
   height: 32px;
   font-size: 0.9rem;
 }
}

</style>