<template>
  <div class="bulk-import-form">
    <div v-if="!hasFile && !importStarted" class="upload-section">
      <div class="upload-illustration">
        <i class="icon-upload-cloud"></i>
      </div>
      
      <h3>Importar elementos de inventario</h3>
      
      <p class="upload-description">
        Carga un archivo CSV o Excel con los elementos que deseas agregar al inventario.
      </p>
      
      <div class="upload-methods">
        <!-- Método 1: Drag & Drop -->
        <div 
          class="dropzone"
          @dragover.prevent="dragOver = true" 
          @dragleave.prevent="dragOver = false"
          @drop.prevent="handleFileDrop"
          :class="{ active: dragOver }"
        >
          <div class="dropzone-content">
            <i class="icon-file-plus"></i>
            <p>Arrastra y suelta tu archivo aquí</p>
            <span class="dropzone-hint">o</span>
          </div>
        </div>
        
        <!-- Método 2: Selección de archivo -->
        <div class="file-select">
          <input 
            type="file" 
            id="fileInput" 
            ref="fileInput" 
            class="file-input" 
            accept=".csv,.xls,.xlsx"
            @change="handleFileSelect" 
          />
          <button 
            class="btn-secondary"
            @click="triggerFileInput"
          >
            Seleccionar archivo
          </button>
        </div>
      </div>
      
      <div class="file-types">
        Formatos soportados: <strong>CSV</strong>, <strong>XLS</strong>, <strong>XLSX</strong>
      </div>
      
      <div class="template-download">
        <a href="#" @click.prevent="downloadTemplate">
          <i class="icon-download"></i> Descargar plantilla
        </a>
      </div>
    </div>
    
    <div v-else-if="hasFile && !importStarted" class="file-preview">
      <div class="file-preview-header">
        <div class="file-info">
          <div class="file-icon">
            <i :class="fileIcon"></i>
          </div>
          <div class="file-details">
            <h3 class="file-name">{{ file.name }}</h3>
            <span class="file-meta">{{ fileSize }} - {{ fileRecords }} registros</span>
          </div>
        </div>
        <button class="btn-icon" @click="resetFile" title="Cambiar archivo">
          <i class="icon-x"></i>
        </button>
      </div>
      
      <!-- Configuración de importación -->
      <div class="import-config">
        <h4>Configuración de importación</h4>
        
        <!-- Opciones de mapeo de campos -->
        <div class="config-section">
          <h5>Mapeo de columnas</h5>
          <p class="config-description">
            Verifica que los campos de tu archivo correspondan correctamente con los campos del inventario.
          </p>
          
          <table class="mapping-table">
            <thead>
              <tr>
                <th>Campo en sistema</th>
                <th>Columna en archivo</th>
                <th>Vista previa</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="field in fields" :key="field.id">
                <td>
                  <div class="field-name">
                    {{ field.label }}
                    <span v-if="field.required" class="required-badge">Obligatorio</span>
                  </div>
                </td>
                <td>
                  <select 
                    v-model="field.mappedColumn" 
                    :class="{ 'error': field.required && !field.mappedColumn && showValidation }"
                  >
                    <option value="">Seleccionar columna</option>
                    <option 
                      v-for="column in columns" 
                      :key="column" 
                      :value="column"
                      :disabled="isColumnMapped(column, field.id)"
                    >
                      {{ column }}
                    </option>
                  </select>
                </td>
                <td>
                  <div class="preview-value">
                    {{ getPreviewValue(field.mappedColumn) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Opciones adicionales -->
        <div class="config-section">
          <h5>Opciones</h5>
          
          <div class="option-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="config.updateExisting" />
              <span>Actualizar elementos existentes (coincidencia por número de serie)</span>
            </label>
            
            <label class="checkbox-label">
              <input type="checkbox" v-model="config.skipErrors" />
              <span>Continuar importación si hay errores (omitir registros con error)</span>
            </label>
            
            <label class="checkbox-label">
              <input type="checkbox" v-model="config.sendNotification" />
              <span>Enviar notificación por correo al completar</span>
            </label>
          </div>
          
          <div v-if="config.sendNotification" class="notification-email">
            <label>Correo electrónico:</label>
            <input type="email" v-model="config.notificationEmail" placeholder="Ingresa tu correo electrónico" />
          </div>
        </div>
      </div>
      
      <!-- Acciones -->
      <div class="import-actions">
        <button class="btn-outline" @click="cancelImport">
          Cancelar
        </button>
        <button class="btn-primary" @click="startImport" :disabled="importing">
          <i class="icon-upload"></i> Iniciar importación
        </button>
      </div>
      
      <!-- Alerta de validación -->
      <div v-if="validationError" class="validation-alert">
        <i class="icon-alert-triangle"></i>
        {{ validationError }}
      </div>
    </div>
    
    <!-- Progreso de importación -->
    <div v-else-if="importStarted" class="import-progress">
      <div v-if="!importComplete">
        <div class="progress-header">
          <h3>Importando elementos...</h3>
          <p class="progress-description">
            Este proceso puede tardar varios minutos dependiendo de la cantidad de elementos.
          </p>
        </div>
        
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${importProgress}%` }"></div>
          </div>
          <div class="progress-stats">
            <span>{{ processedCount }} de {{ totalCount }} elementos procesados</span>
            <span>{{ importProgress }}%</span>
          </div>
        </div>
        
        <div class="processing-details">
          <div class="status-item">
            <i class="icon-check-circle success"></i>
            <span>Elementos procesados correctamente: <strong>{{ successCount }}</strong></span>
          </div>
          <div v-if="errorCount > 0" class="status-item">
            <i class="icon-alert-circle error"></i>
            <span>Elementos con errores: <strong>{{ errorCount }}</strong></span>
          </div>
          <div v-if="skipCount > 0" class="status-item">
            <i class="icon-skip warning"></i>
            <span>Elementos omitidos: <strong>{{ skipCount }}</strong></span>
          </div>
        </div>
        
        <div class="import-note">
          <i class="icon-info"></i>
          <span>Puedes continuar trabajando en otras áreas del sistema mientras se completa la importación.</span>
        </div>
        
        <button v-if="canCancel" class="btn-outline btn-cancel" @click="cancelImportProcess">
          Cancelar importación
        </button>
      </div>
      
      <!-- Resultado de la importación -->
      <div v-else class="import-result">
        <div class="result-header" :class="{ 'has-errors': errorCount > 0 }">
          <i :class="resultIcon"></i>
          <h3>{{ resultTitle }}</h3>
        </div>
        
        <div class="result-summary">
          <div class="summary-item">
            <span class="summary-label">Total procesado:</span>
            <span class="summary-value">{{ totalCount }} elementos</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Importados correctamente:</span>
            <span class="summary-value success">{{ successCount }} elementos</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Actualizados:</span>
            <span class="summary-value info">{{ updatedCount }} elementos</span>
          </div>
          <div v-if="errorCount > 0" class="summary-item">
            <span class="summary-label">Con errores:</span>
            <span class="summary-value error">{{ errorCount }} elementos</span>
          </div>
        </div>
        
        <!-- Lista de errores -->
        <div v-if="errorCount > 0" class="error-list">
          <h4>Detalles de errores</h4>
          <div class="error-table-container">
            <table class="error-table">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Campo</th>
                  <th>Mensaje de error</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(error, index) in errors" :key="index">
                  <td>{{ error.row }}</td>
                  <td>{{ error.field || 'Múltiple' }}</td>
                  <td>{{ error.message }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="result-actions">
          <button class="btn-secondary" @click="downloadErrorReport" v-if="errorCount > 0">
            <i class="icon-download"></i> Descargar reporte de errores
          </button>
          <button class="btn-primary" @click="finishImport">
            <i class="icon-check"></i> Finalizar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default {
  name: 'BulkImportForm',
  data() {
    return {
      // Estado del archivo
      file: null,
      fileData: null,
      previewData: [],
      columns: [],
      dragOver: false,
      
      // Campos para mapeo
      fields: [
        { id: 'name', label: 'Nombre', required: true, mappedColumn: '' },
        { id: 'brand', label: 'Marca', required: false, mappedColumn: '' },
        { id: 'model', label: 'Modelo', required: false, mappedColumn: '' },
        { id: 'serialNumber', label: 'Número de serie', required: true, mappedColumn: '' },
        { id: 'macAddress', label: 'Dirección MAC', required: false, mappedColumn: '' },
        { id: 'status', label: 'Estado', required: false, mappedColumn: '' },
        { id: 'category', label: 'Categoría', required: false, mappedColumn: '' },
        { id: 'location', label: 'Ubicación', required: false, mappedColumn: '' },
        { id: 'purchaseDate', label: 'Fecha de compra', required: false, mappedColumn: '' },
        { id: 'cost', label: 'Costo', required: false, mappedColumn: '' },
        { id: 'warrantyExpiration', label: 'Fecha fin garantía', required: false, mappedColumn: '' },
        { id: 'supplier', label: 'Proveedor', required: false, mappedColumn: '' }
      ],
      
      // Configuración de importación
      config: {
        updateExisting: false,
        skipErrors: true,
        sendNotification: false,
        notificationEmail: ''
      },
      
      // Estado de validación
      showValidation: false,
      validationError: '',
      
      // Estado de importación
      importStarted: false,
      importComplete: false,
      importing: false,
      importProgress: 0,
      totalCount: 0,
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      skipCount: 0,
      updatedCount: 0,
      canCancel: true,
      errors: []
    };
  },
  computed: {
    /**
     * Verificar si hay un archivo cargado
     */
    hasFile() {
      return !!this.file;
    },
    
    /**
     * Obtener ícono según el tipo de archivo
     */
    fileIcon() {
      if (!this.file) return 'icon-file';
      
      const extension = this.getFileExtension(this.file.name).toLowerCase();
      
      if (extension === 'csv') {
        return 'icon-file-text';
      } else if (['xls', 'xlsx'].includes(extension)) {
        return 'icon-file-spreadsheet';
      }
      
      return 'icon-file';
    },
    
    /**
     * Formatear el tamaño del archivo
     */
    fileSize() {
      if (!this.file) return '';
      
      const size = this.file.size;
      
      if (size < 1024) {
        return `${size} B`;
      } else if (size < 1024 * 1024) {
        return `${Math.round(size / 1024 * 10) / 10} KB`;
      } else {
        return `${Math.round(size / (1024 * 1024) * 10) / 10} MB`;
      }
    },
    
    /**
     * Obtener cantidad de registros del archivo
     */
    fileRecords() {
      return this.fileData ? this.fileData.length : 0;
    },
    
    /**
     * Ícono para el resultado de la importación
     */
    resultIcon() {
      return this.errorCount > 0 ? 'icon-alert-circle error' : 'icon-check-circle success';
    },
    
    /**
     * Título para el resultado de la importación
     */
    resultTitle() {
      if (this.errorCount > 0) {
        if (this.successCount === 0) {
          return 'La importación ha fallado';
        } else {
          return 'Importación completada con algunos errores';
        }
      }
      
      return 'Importación completada correctamente';
    }
  },
  methods: {
    /**
     * Trigger para el input de archivo
     */
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    
    /**
     * Manejar la selección de archivo
     */
    handleFileSelect(event) {
      const selectedFile = event.target.files[0];
      if (selectedFile) {
        this.processFile(selectedFile);
      }
    },
    
    /**
     * Manejar el drop de archivo
     */
    handleFileDrop(event) {
      this.dragOver = false;
      
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile) {
        this.processFile(droppedFile);
      }
    },
    
    /**
     * Procesar el archivo seleccionado
     */
    async processFile(file) {
      const extension = this.getFileExtension(file.name).toLowerCase();
      
      if (!['csv', 'xls', 'xlsx'].includes(extension)) {
        this.validationError = 'Formato de archivo no soportado. Por favor, carga un archivo CSV o Excel.';
        return;
      }
      
      this.file = file;
      this.validationError = '';
      
      try {
        // Procesar según el tipo de archivo
        if (extension === 'csv') {
          await this.processCSV(file);
        } else {
          await this.processExcel(file);
        }
        
        // Auto-mapeo de columnas
        this.autoMapColumns();
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
        this.validationError = 'Error al procesar el archivo. Por favor, verifica que el formato sea correcto.';
        this.file = null;
      }
    },
    
    /**
     * Procesar archivo CSV
     */
    processCSV(file) {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error('Error al analizar el archivo CSV'));
              return;
            }
            
            this.fileData = results.data;
            this.columns = results.meta.fields || [];
            this.previewData = results.data.slice(0, 3);
            resolve();
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    },
    
    /**
     * Procesar archivo Excel
     */
    processExcel(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const fileData = e.target.result;
            const workbook = XLSX.read(fileData, { type: 'array' });
            
            // Obtener la primera hoja
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convertir a JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
              reject(new Error('El archivo Excel está vacío o no tiene suficientes datos'));
              return;
            }
            
            // La primera fila contiene los nombres de las columnas
            const headers = jsonData[0];
            
            // Convertir los datos a un array de objetos
            const dataRows = jsonData.slice(1).map(row => {
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = row[index];
              });
              return obj;
            });
            
            this.fileData = dataRows;
            this.columns = headers;
            this.previewData = dataRows.slice(0, 3);
            
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        
        reader.onerror = (error) => {
          reject(error);
        };
        
        reader.readAsArrayBuffer(file);
      });
    },
    
    /**
     * Auto-mapear columnas
     */
    autoMapColumns() {
      this.fields.forEach(field => {
        // Buscar columna exactamente igual
        let found = this.columns.find(col => 
          col.toLowerCase() === field.id.toLowerCase() || 
          col.toLowerCase() === field.label.toLowerCase()
        );
        
        // Si no se encuentra, buscar parcial
        if (!found) {
          found = this.columns.find(col => 
            col.toLowerCase().includes(field.id.toLowerCase()) || 
            col.toLowerCase().includes(field.label.toLowerCase())
          );
        }
        
        if (found) {
          field.mappedColumn = found;
        }
      });
    },
    
    /**
     * Verificar si una columna ya está mapeada
     */
    isColumnMapped(column, currentFieldId) {
      return this.fields.some(field => 
        field.mappedColumn === column && field.id !== currentFieldId
      );
    },
    
    /**
     * Obtener valor de preview para una columna
     */
    getPreviewValue(column) {
      if (!column || !this.previewData.length) return '—';
      
      const value = this.previewData[0][column];
      
      if (value === undefined || value === null) {
        return '—';
      }
      
      return value;
    },
    
    /**
     * Obtener la extensión del archivo
     */
    getFileExtension(filename) {
      return filename.split('.').pop();
    },
    
    /**
     * Validar la configuración antes de importar
     */
    validateImport() {
      this.showValidation = true;
      
      // Verificar campos obligatorios
      const missingRequired = this.fields.filter(field => 
        field.required && !field.mappedColumn
      );
      
      if (missingRequired.length > 0) {
        this.validationError = `Faltan campos obligatorios: ${missingRequired.map(f => f.label).join(', ')}`;
        return false;
      }
      
      // Verificar email si se activó la notificación
      if (this.config.sendNotification && !this.isValidEmail(this.config.notificationEmail)) {
        this.validationError = 'Por favor, ingresa un correo electrónico válido para las notificaciones.';
        return false;
      }
      
      this.validationError = '';
      return true;
    },
    
    /**
     * Validar formato de email
     */
    isValidEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },
    
    /**
     * Iniciar la importación
     */
    startImport() {
      if (!this.validateImport()) {
        return;
      }
      
      this.importing = true;
      
      // Preparar datos para enviar a la API
      const mappingConfig = {};
      this.fields.forEach(field => {
        if (field.mappedColumn) {
          mappingConfig[field.id] = field.mappedColumn;
        }
      });
      
      const importConfig = {
        mapping: mappingConfig,
        options: {
          updateExisting: this.config.updateExisting,
          skipErrors: this.config.skipErrors,
          notification: this.config.sendNotification ? this.config.notificationEmail : null
        }
      };
      
      // Emitir evento para que el componente padre maneje la importación real
      this.$emit('import-start', {
        file: this.file,
        config: importConfig
      });
      
      this.importStarted = true;
    },
    
    /**
     * Actualizar progreso de importación
     * Esta función será llamada por el componente padre con los datos reales
     */
    updateImportProgress(progressData) {
      this.importProgress = progressData.progress;
      this.totalCount = progressData.total;
      this.processedCount = progressData.processed;
      this.successCount = progressData.success;
      this.errorCount = progressData.errors;
      this.skipCount = progressData.skipped;
      this.updatedCount = progressData.updated;
      
      if (progressData.errors && progressData.errors.length > 0) {
        this.errors = progressData.errors;
      }
      
      if (progressData.complete) {
        this.importComplete = true;
        this.canCancel = false;
      }
    },
    
    /**
     * Cancelar la importación
     */
    cancelImport() {
      this.$emit('import-cancel');
    },
    
    /**
     * Cancelar el proceso de importación en curso
     */
    cancelImportProcess() {
      this.$emit('import-cancel-process');
    },
    
    /**
     * Descargar plantilla de importación
     */
    downloadTemplate() {
      // Crear encabezados
      const headers = this.fields.map(field => field.label);
      
      // Crear un objeto vacío para la plantilla
      const templateRow = {};
      this.fields.forEach(field => {
        templateRow[field.label] = '';
      });
      
      // Crear workbook
      const ws = XLSX.utils.json_to_sheet([templateRow], { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      
      // Guardar archivo
      XLSX.writeFile(wb, 'plantilla_importacion_inventario.xlsx');
    },
    
    /**
     * Descargar reporte de errores
     */
    downloadErrorReport() {
      if (this.errors.length === 0) return;
      
      // Convertir errores a formato tabular
      const errorReport = this.errors.map(error => ({
        'Fila': error.row,
        'Campo': error.field || 'Múltiple',
        'Mensaje de error': error.message
      }));
      
      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(errorReport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Errores');
      
      // Guardar archivo
      XLSX.writeFile(wb, 'errores_importacion.xlsx');
    },
    
    /**
     * Finalizar importación
     */
    finishImport() {
      // Emitir evento con resultados
      this.$emit('import-success', {
        total: this.totalCount,
        imported: this.successCount,
        updated: this.updatedCount,
        errors: this.errorCount,
        skipped: this.skipCount
      });
    },
    
    /**
     * Resetear el archivo
     */
    resetFile() {
      this.file = null;
      this.fileData = null;
      this.previewData = [];
      this.columns = [];
      
      // Reiniciar mapeo
      this.fields.forEach(field => {
        field.mappedColumn = '';
      });
      
      this.showValidation = false;
      this.validationError = '';
      
      // Reiniciar input de archivo
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
    }
  }
};
</script>

<style scoped>
.bulk-import-form {
  padding: 20px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  max-width: 800px;
  margin: 0 auto;
}

/* Sección de carga */
.upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.upload-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
  border-radius: 50%;
  margin-bottom: 16px;
  font-size: 32px;
}

.upload-section h3 {
  margin: 0 0 12px 0;
  font-size: 20px;
  color: var(--text-primary, #333);
}

.upload-description {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
  max-width: 500px;
}

/* Zona de drag & drop */
.upload-methods {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 500px;
}

.dropzone {
  width: 100%;
  border: 2px dashed var(--border-color, #e0e0e0);
  border-radius: 8px;
  padding: 32px;
  margin-bottom: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropzone:hover, .dropzone.active {
  border-color: var(--primary-color, #1976d2);
  background-color: var(--primary-lightest, #e3f2fd);
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dropzone-content i {
  font-size: 32px;
  color: var(--primary-color, #1976d2);
  margin-bottom: 16px;
}

.dropzone-content p {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.dropzone-hint {
  margin: 8px 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

/* Selección de archivo */
.file-select {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-bottom: 16px;
}

.file-input {
  display: none;
}

/* Información de tipos de archivo */
.file-types {
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin-bottom: 16px;
}

.file-types strong {
  font-weight: 600;
  color: var(--text-primary, #333);
}

/* Descarga de plantilla */
.template-download {
  margin-top: 16px;
}

.template-download a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--primary-color, #1976d2);
  font-size: 14px;
  text-decoration: none;
}

.template-download a:hover {
  text-decoration: underline;
}

/* Vista previa del archivo */
.file-preview {
  width: 100%;
}

.file-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  margin-bottom: 24px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
  border-radius: 8px;
  font-size: 20px;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.file-meta {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-secondary, #666);
  cursor: pointer;
}

.btn-icon:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

/* Configuración de importación */
.import-config {
  margin-bottom: 24px;
}

.import-config h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-primary, #333);
}

.config-section {
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.config-section h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--text-primary, #333);
}

.config-description {
  margin: 0 0 16px 0;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

/* Tabla de mapeo */
.mapping-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
}

.mapping-table th,
.mapping-table td {
  padding: 10px;
  text-align: left;
  border: 1px solid var(--border-color, #e0e0e0);
}

.mapping-table th {
  background-color: var(--bg-primary, white);
  font-weight: 600;
  color: var(--text-primary, #333);
}

.mapping-table tr:nth-child(even) td {
  background-color: var(--bg-primary, white);
}

.mapping-table select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 13px;
  background-color: var(--bg-primary, white);
}

.mapping-table select.error {
  border-color: var(--error-color, #f44336);
}

.field-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

.required-badge {
  background-color: var(--warning-light, #fff3e0);
  color: var(--warning-color, #ef6c00);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 12px;
  font-weight: 500;
}

.preview-value {
  font-size: 13px;
  color: var(--text-secondary, #666);
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Opciones */
.option-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.notification-email {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notification-email label {
  font-size: 13px;
  color: var(--text-primary, #333);
}

.notification-email input {
  padding: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 13px;
}

/* Acciones */
.import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* Alerta de validación */
.validation-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--error-light, #ffebee);
  color: var(--error-color, #c62828);
  font-size: 13px;
}

.validation-alert i {
  font-size: 16px;
  color: var(--error-color, #c62828);
}

/* Progreso de importación */
.import-progress {
  padding: 20px;
}

.progress-header {
  text-align: center;
  margin-bottom: 24px;
}

.progress-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.progress-description {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.progress-bar-container {
  margin-bottom: 24px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color, #1976d2);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.processing-details {
  margin-bottom: 24px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-primary, #333);
}

.status-item i {
  font-size: 16px;
}

.status-item i.success {
  color: var(--success-color, #4caf50);
}

.status-item i.error {
  color: var(--error-color, #f44336);
}

.status-item i.warning {
  color: var(--warning-color, #ff9800);
}

.import-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--info-light, #e3f2fd);
  color: var(--info-color, #1565c0);
  font-size: 13px;
  margin-bottom: 24px;
}

.import-note i {
  font-size: 16px;
  color: var(--info-color, #1565c0);
}

.btn-cancel {
  margin: 0 auto;
  display: block;
}

/* Resultado de la importación */
.import-result {
  padding: 20px;
}

.result-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 24px;
}

.result-header i {
  font-size: 48px;
  margin-bottom: 16px;
}

.result-header i.success {
  color: var(--success-color, #4caf50);
}

.result-header i.error {
  color: var(--error-color, #f44336);
}

.result-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.result-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-item {
  padding: 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
}

.summary-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary, #666);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.summary-value.success {
  color: var(--success-color, #4caf50);
}

.summary-value.error {
  color: var(--error-color, #f44336);
}

.summary-value.info {
  color: var(--info-color, #1565c0);
}

/* Lista de errores */
.error-list {
  margin-bottom: 24px;
}

.error-list h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: var(--text-primary, #333);
}

.error-table-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
}

.error-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.error-table th,
.error-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.error-table th {
  position: sticky;
  top: 0;
  background-color: var(--bg-primary, white);
  font-weight: 600;
  color: var(--text-primary, #333);
  z-index: 1;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* Botones estándar */
.btn-primary,
.btn-secondary,
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-dark, #1565c0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
  border: 1px solid var(--border-color, #e0e0e0);
}

.btn-secondary:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-outline {
  background-color: transparent;
  color: var(--text-primary, #333);
  border: 1px solid var(--border-color, #e0e0e0);
}

.btn-outline:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

/* Responsive */
@media (max-width: 768px) {
  .bulk-import-form {
    padding: 16px;
  }
  
  .result-summary {
    grid-template-columns: 1fr;
  }
  
  .import-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .btn-primary,
  .btn-secondary,
  .btn-outline {
    width: 100%;
    justify-content: center;
  }
}
</style>