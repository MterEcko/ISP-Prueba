<template>
  <div class="plugin-upload-container">
    <div class="page-header">
      <h1>Subir Plugin al Marketplace</h1>
    </div>

    <!-- Upload Section -->
    <div class="upload-section">
      <h2>Paso 1: Seleccionar Archivo</h2>

      <div
        class="dropzone"
        :class="{ 'dragover': isDragOver, 'has-file': selectedFile }"
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @click="triggerFileInput"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".zip"
          @change="handleFileSelect"
          style="display: none"
        />

        <div v-if="!selectedFile" class="dropzone-placeholder">
          <div class="icon">📦</div>
          <h3>Arrastra tu plugin aquí</h3>
          <p>o haz clic para seleccionar un archivo .zip</p>
          <small>Tamaño máximo: 50MB</small>
        </div>

        <div v-else class="file-info">
          <div class="icon">✅</div>
          <div class="file-details">
            <div class="file-name">{{ selectedFile.name }}</div>
            <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
          </div>
          <button @click.stop="clearFile" class="btn-clear">✕</button>
        </div>
      </div>

      <div v-if="fileError" class="error-message">
        {{ fileError }}
      </div>
    </div>

    <!-- Preview Section -->
    <div v-if="selectedFile && !uploading" class="preview-section">
      <h2>Paso 2: Configurar Publicación</h2>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="publishImmediately" />
          Publicar inmediatamente en el marketplace
        </label>
        <small>Si no se marca, el plugin quedará como borrador</small>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="updateExisting" />
          Actualizar plugin existente (si ya existe con el mismo identificador)
        </label>
      </div>

      <div class="actions">
        <button @click="uploadPlugin" class="btn btn-primary" :disabled="!selectedFile">
          Subir Plugin
        </button>
        <button @click="clearFile" class="btn btn-secondary">
          Cancelar
        </button>
      </div>
    </div>

    <!-- Uploading Progress -->
    <div v-if="uploading" class="uploading-section">
      <div class="spinner"></div>
      <p>Subiendo plugin...</p>
    </div>

    <!-- Uploaded Plugins List -->
    <div class="plugins-list-section">
      <h2>Plugins Subidos</h2>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Cargando plugins...</p>
      </div>

      <div v-else-if="plugins.length > 0" class="plugins-grid">
        <div v-for="plugin in plugins" :key="plugin.id" class="plugin-card">
          <div class="plugin-header">
            <div class="plugin-icon">
              {{ plugin.icon || '📦' }}
            </div>
            <div class="plugin-info">
              <h3>{{ plugin.name }}</h3>
              <div class="plugin-version">v{{ plugin.version }}</div>
            </div>
            <div class="plugin-status">
              <span
                :class="['status-badge', plugin.isActive ? 'active' : 'inactive']"
              >
                {{ plugin.isActive ? 'Publicado' : 'Borrador' }}
              </span>
            </div>
          </div>

          <div class="plugin-description">
            {{ plugin.description }}
          </div>

          <div class="plugin-meta">
            <div class="meta-item">
              <span class="label">Categoría:</span>
              <span class="value">{{ plugin.category }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Autor:</span>
              <span class="value">{{ plugin.author }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Precio:</span>
              <span class="value">{{ plugin.price > 0 ? `$${plugin.price}` : 'Gratis' }}</span>
            </div>
            <div class="meta-item">
              <span class="label">Descargas:</span>
              <span class="value">{{ plugin.downloadCount || 0 }}</span>
            </div>
          </div>

          <div class="plugin-actions">
            <button
              @click="togglePluginStatus(plugin)"
              :class="['btn', plugin.isActive ? 'btn-warning' : 'btn-success']"
            >
              {{ plugin.isActive ? 'Despublicar' : 'Publicar' }}
            </button>
            <button @click="deletePluginConfirm(plugin)" class="btn btn-danger">
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <div v-else class="no-plugins">
        No has subido ningún plugin todavía
      </div>
    </div>
  </div>
</template>

<script>
import pluginUploadService from '@/services/pluginUpload.service';

export default {
  name: 'PluginUploadView',

  data() {
    return {
      selectedFile: null,
      isDragOver: false,
      fileError: null,
      publishImmediately: false,
      updateExisting: false,
      uploading: false,
      plugins: [],
      loading: false
    };
  },

  mounted() {
    this.loadPlugins();
  },

  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    handleFileSelect(event) {
      const file = event.target.files[0];
      this.validateAndSetFile(file);
    },

    handleDrop(event) {
      this.isDragOver = false;
      const file = event.dataTransfer.files[0];
      this.validateAndSetFile(file);
    },

    validateAndSetFile(file) {
      this.fileError = null;

      if (!file) {
        return;
      }

      // Validar extensión
      if (!file.name.endsWith('.zip')) {
        this.fileError = 'Solo se permiten archivos .zip';
        return;
      }

      // Validar tamaño (50MB max)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        this.fileError = 'El archivo es demasiado grande. Tamaño máximo: 50MB';
        return;
      }

      this.selectedFile = file;
    },

    clearFile() {
      this.selectedFile = null;
      this.fileError = null;
      this.publishImmediately = false;
      this.updateExisting = false;
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
    },

    async uploadPlugin() {
      if (!this.selectedFile) {
        return;
      }

      this.uploading = true;

      try {
        const response = await pluginUploadService.uploadPlugin(this.selectedFile, {
          publish: this.publishImmediately,
          update: this.updateExisting
        });

        if (response.success) {
          this.$notify({
            type: 'success',
            message: response.message || 'Plugin subido correctamente'
          });

          this.clearFile();
          await this.loadPlugins();
        }
      } catch (error) {
        console.error('Error uploading plugin:', error);
        this.$notify({
          type: 'error',
          message: error.response?.data?.message || 'Error al subir el plugin'
        });
      } finally {
        this.uploading = false;
      }
    },

    async loadPlugins() {
      this.loading = true;

      try {
        const response = await pluginUploadService.getAllPlugins();

        if (response.success) {
          this.plugins = response.data;
        }
      } catch (error) {
        console.error('Error loading plugins:', error);
      } finally {
        this.loading = false;
      }
    },

    async togglePluginStatus(plugin) {
      try {
        const response = await pluginUploadService.updatePluginStatus(
          plugin.id,
          !plugin.isActive
        );

        if (response.success) {
          this.$notify({
            type: 'success',
            message: response.message
          });

          await this.loadPlugins();
        }
      } catch (error) {
        console.error('Error toggling plugin status:', error);
        this.$notify({
          type: 'error',
          message: 'Error al cambiar estado del plugin'
        });
      }
    },

    async deletePluginConfirm(plugin) {
      if (!confirm(`¿Estás seguro de eliminar el plugin "${plugin.name}"?`)) {
        return;
      }

      try {
        const response = await pluginUploadService.deletePlugin(plugin.id);

        if (response.success) {
          this.$notify({
            type: 'success',
            message: 'Plugin eliminado correctamente'
          });

          await this.loadPlugins();
        }
      } catch (error) {
        console.error('Error deleting plugin:', error);
        this.$notify({
          type: 'error',
          message: 'Error al eliminar plugin'
        });
      }
    },

    formatFileSize(bytes) {
      return pluginUploadService.formatFileSize(bytes);
    }
  }
};
</script>

<style scoped>
.plugin-upload-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.upload-section,
.preview-section,
.plugins-list-section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.upload-section h2,
.preview-section h2,
.plugins-list-section h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
}

.dropzone {
  border: 3px dashed #ddd;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.dropzone.dragover {
  border-color: #3498db;
  background: #e3f2fd;
}

.dropzone.has-file {
  border-color: #2ecc71;
  background: #d4edda;
  padding: 30px 20px;
}

.dropzone-placeholder .icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.dropzone-placeholder h3 {
  margin: 0 0 10px 0;
}

.dropzone-placeholder p {
  color: #666;
  margin: 0 0 10px 0;
}

.dropzone-placeholder small {
  color: #999;
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.file-info .icon {
  font-size: 48px;
}

.file-details {
  flex: 1;
  text-align: left;
}

.file-name {
  font-weight: 600;
  font-size: 18px;
  margin-bottom: 4px;
}

.file-size {
  color: #666;
  font-size: 14px;
}

.btn-clear {
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #c0392b;
}

.error-message {
  margin-top: 15px;
  padding: 12px;
  background: #f8d7da;
  color: #721c24;
  border-radius: 6px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-group small {
  display: block;
  margin-left: 28px;
  color: #666;
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-success {
  background: #2ecc71;
  color: white;
  font-size: 13px;
  padding: 8px 16px;
}

.btn-success:hover {
  background: #27ae60;
}

.btn-warning {
  background: #f39c12;
  color: white;
  font-size: 13px;
  padding: 8px 16px;
}

.btn-warning:hover {
  background: #e67e22;
}

.btn-danger {
  background: #e74c3c;
  color: white;
  font-size: 13px;
  padding: 8px 16px;
}

.btn-danger:hover {
  background: #c0392b;
}

.uploading-section {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.loading {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.plugin-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s;
}

.plugin-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.plugin-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.plugin-icon {
  font-size: 48px;
}

.plugin-info {
  flex: 1;
}

.plugin-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
}

.plugin-version {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.plugin-status {
  align-self: flex-start;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #fff3cd;
  color: #856404;
}

.plugin-description {
  color: #666;
  margin-bottom: 15px;
  font-size: 14px;
  line-height: 1.5;
}

.plugin-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.meta-item {
  font-size: 13px;
}

.meta-item .label {
  color: #666;
  margin-right: 5px;
}

.meta-item .value {
  font-weight: 600;
}

.plugin-actions {
  display: flex;
  gap: 10px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.no-plugins {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}
</style>
