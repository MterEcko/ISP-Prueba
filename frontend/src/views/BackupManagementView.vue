<template>
  <div class="backup-management-container">
    <div class="card">
      <div class="card-header">
        <h3>Gestión de Backups</h3>
        <div class="actions">
          <div class="btn-group">
            <button class="btn btn-primary" @click="refreshData">
              <i class="fas fa-sync-alt"></i> Actualizar
            </button>
            <button class="btn btn-success dropdown-toggle" data-toggle="dropdown">
              <i class="fas fa-plus"></i> Crear Backup
            </button>
            <div class="dropdown-menu">
              <a class="dropdown-item" href="#" @click.prevent="createDatabaseBackup">
                <i class="fas fa-database"></i> Backup de Base de Datos
              </a>
              <a class="dropdown-item" href="#" @click.prevent="createConfigBackup">
                <i class="fas fa-cogs"></i> Backup de Configuración
              </a>
              <a class="dropdown-item" href="#" @click.prevent="createFullBackup">
                <i class="fas fa-archive"></i> Backup Completo
              </a>
            </div>
          </div>
          <button class="btn btn-warning" @click="showCleanupModal = true">
            <i class="fas fa-broom"></i> Limpiar Backups Antiguos
          </button>
        </div>
      </div>

      <div class="card-body">
        <!-- Filtros -->
        <div class="filters mb-3">
          <div class="row">
            <div class="col-md-4">
              <div class="form-group">
                <label>Tipo de Backup</label>
                <select v-model="filters.type" class="form-control" @change="loadBackups">
                  <option value="all">Todos</option>
                  <option value="database">Base de Datos</option>
                  <option value="config">Configuración</option>
                  <option value="full">Completo</option>
                </select>
              </div>
            </div>
            <div class="col-md-8">
              <div class="form-group">
                <label>Buscar</label>
                <input type="text" v-model="filters.search" class="form-control" placeholder="Buscar por descripción..." @input="loadBackups">
              </div>
            </div>
          </div>
        </div>

        <!-- Tabla de Backups -->
        <div class="table-responsive">
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Tamaño</th>
                <th>Descripción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="backup in backups" :key="backup.id" :class="getRowClass(backup)">
                <td>{{ backup.id }}</td>
                <td>
                  <span :class="getTypeBadgeClass(backup.type)">{{ getTypeText(backup.type) }}</span>
                </td>
                <td>{{ formatDate(backup.createdAt) }}</td>
                <td>{{ backup.size }}</td>
                <td>{{ backup.description }}</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-sm btn-info" @click="downloadBackup(backup)">
                      <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" @click="openRestoreModal(backup)">
                      <i class="fas fa-undo"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" @click="openDeleteModal(backup)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="backups.length === 0">
                <td colspan="6" class="text-center">No hay backups disponibles</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal para crear backup -->
    <div class="modal" :class="{ 'show d-block': showCreateModal }" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Crear Backup {{ getTypeText(createData.type) }}</h5>
            <button type="button" class="close" @click="showCreateModal = false">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Descripción</label>
              <textarea v-model="createData.description" class="form-control" rows="3" placeholder="Descripción opcional del backup..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCreateModal = false">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="confirmCreateBackup" :disabled="loading">Crear Backup</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para restaurar backup -->
    <div class="modal" :class="{ 'show d-block': showRestoreModalFlag }" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Restaurar Backup</h5>
            <button type="button" class="close" @click="showRestoreModalFlag = false">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body" v-if="selectedBackup">
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle"></i> <strong>¡Advertencia!</strong> La restauración de un backup sobrescribirá los datos actuales. Esta acción no se puede deshacer.
            </div>
            <p>¿Está seguro de restaurar el backup <strong>{{ getTypeText(selectedBackup.type) }}</strong> creado el <strong>{{ formatDate(selectedBackup.createdAt) }}</strong>?</p>
            <p><strong>Descripción:</strong> {{ selectedBackup.description }}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showRestoreModalFlag = false">Cancelar</button>
            <button type="button" class="btn btn-warning" @click="confirmRestoreBackup" :disabled="loading">Confirmar Restauración</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para eliminar backup -->
    <div class="modal" :class="{ 'show d-block': showDeleteModalFlag }" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Eliminar Backup</h5>
            <button type="button" class="close" @click="showDeleteModalFlag = false">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body" v-if="selectedBackup">
            <p>¿Está seguro de eliminar el backup <strong>{{ getTypeText(selectedBackup.type) }}</strong> creado el <strong>{{ formatDate(selectedBackup.createdAt) }}</strong>?</p>
            <p><strong>Descripción:</strong> {{ selectedBackup.description }}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDeleteModalFlag = false">Cancelar</button>
            <button type="button" class="btn btn-danger" @click="confirmDeleteBackup" :disabled="loading">Confirmar Eliminación</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para limpiar backups antiguos -->
    <div class="modal" :class="{ 'show d-block': showCleanupModal }" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Limpiar Backups Antiguos</h5>
            <button type="button" class="close" @click="showCleanupModal = false">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Tipo de Backup</label>
              <select v-model="cleanupData.type" class="form-control">
                <option value="all">Todos</option>
                <option value="database">Base de Datos</option>
                <option value="config">Configuración</option>
                <option value="full">Completo</option>
              </select>
            </div>
            <div class="form-group">
              <label>Mantener últimos</label>
              <input type="number" v-model.number="cleanupData.keepLast" class="form-control" min="1" max="100">
              <small class="form-text text-muted">Número de backups recientes a mantener</small>
            </div>
            <div class="form-group">
              <label>Eliminar más antiguos que</label>
              <input type="number" v-model.number="cleanupData.olderThan" class="form-control" min="1" max="365">
              <small class="form-text text-muted">Días</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCleanupModal = false">Cancelar</button>
            <button type="button" class="btn btn-warning" @click="confirmCleanupBackups" :disabled="loading">Limpiar Backups</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay para operaciones -->
    <div class="loading-overlay" v-if="loading">
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only">Cargando...</span>
      </div>
    </div>
  </div>
</template>

<script>
import backupService from '@/services/backup.service';
import { formatDate } from '@/utils/formatters';

export default {
  name: 'BackupManagementView',
  data() {
    return {
      backups: [],
      loading: false,
      filters: {
        type: 'all',
        search: ''
      },
      showCreateModal: false,
      showRestoreModalFlag: false,
      showDeleteModalFlag: false,
      showCleanupModal: false,
      selectedBackup: null,
      createData: {
        type: 'database',
        description: ''
      },
      cleanupData: {
        type: 'all',
        keepLast: 5,
        olderThan: 30
      }
    };
  },
  created() {
    this.loadBackups();
  },
  methods: {
    formatDate,
    async loadBackups() {
      try {
        this.loading = true;
        const response = await backupService.getBackupsList(this.filters.type);
        
        // Aplicar filtro de búsqueda si existe
        if (this.filters.search) {
          const searchLower = this.filters.search.toLowerCase();
          this.backups = response.data.filter(backup => 
            backup.description && backup.description.toLowerCase().includes(searchLower)
          );
        } else {
          this.backups = response.data;
        }
      } catch (error) {
        console.error('Error al cargar backups:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar backups'
        });
      } finally {
        this.loading = false;
      }
    },
    getTypeText(type) {
      const typeMap = {
        database: 'Base de Datos',
        config: 'Configuración',
        full: 'Completo'
      };
      return typeMap[type] || type;
    },
    getTypeBadgeClass(type) {
      const classMap = {
        database: 'badge badge-primary',
        config: 'badge badge-info',
        full: 'badge badge-success'
      };
      return classMap[type] || 'badge badge-secondary';
    },
    getRowClass(backup) {
      return '';
    },
    refreshData() {
      this.loadBackups();
    },
    createDatabaseBackup() {
      this.createData.type = 'database';
      this.createData.description = '';
      this.showCreateModal = true;
    },
    createConfigBackup() {
      this.createData.type = 'config';
      this.createData.description = '';
      this.showCreateModal = true;
    },
    createFullBackup() {
      this.createData.type = 'full';
      this.createData.description = '';
      this.showCreateModal = true;
    },
    async confirmCreateBackup() {
      try {
        this.loading = true;
        let response;
        
        switch (this.createData.type) {
          case 'database':
            response = await backupService.createDatabaseBackup(this.createData.description);
            break;
          case 'config':
            response = await backupService.createConfigBackup(this.createData.description);
            break;
          case 'full':
            response = await backupService.createFullBackup(this.createData.description);
            break;
        }
        
        this.showCreateModal = false;
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: response.data.message || 'Backup creado correctamente'
        });
        
        await this.loadBackups();
      } catch (error) {
        console.error('Error al crear backup:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al crear backup'
        });
      } finally {
        this.loading = false;
      }
    },
    openRestoreModal(backup) {
      this.selectedBackup = backup;
      this.showRestoreModalFlag = true;
    },
    async confirmRestoreBackup() {
      try {
        this.loading = true;
        let response;
        
        switch (this.selectedBackup.type) {
          case 'database':
            response = await backupService.restoreDatabaseBackup(this.selectedBackup.id);
            break;
          case 'config':
            response = await backupService.restoreConfigBackup(this.selectedBackup.id);
            break;
        }
        
        this.showRestoreModalFlag = false;
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: response.data.message || 'Backup restaurado correctamente'
        });
        
        // Recargar la página después de restaurar un backup
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } catch (error) {
        console.error('Error al restaurar backup:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al restaurar backup'
        });
      } finally {
        this.loading = false;
      }
    },
    openDeleteModal(backup) {
      this.selectedBackup = backup;
      this.showDeleteModalFlag = true;
    },
    async confirmDeleteBackup() {
      try {
        this.loading = true;
        const response = await backupService.deleteBackup(this.selectedBackup.id);
        
        this.showDeleteModalFlag = false;
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: response.data.message || 'Backup eliminado correctamente'
        });
        
        await this.loadBackups();
      } catch (error) {
        console.error('Error al eliminar backup:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al eliminar backup'
        });
      } finally {
        this.loading = false;
      }
    },
    async confirmCleanupBackups() {
      try {
        this.loading = true;
        const response = await backupService.cleanupOldBackups(
          this.cleanupData.keepLast,
          this.cleanupData.olderThan,
          this.cleanupData.type
        );
        
        this.showCleanupModal = false;
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: response.data.message || 'Backups antiguos eliminados correctamente'
        });
        
        await this.loadBackups();
      } catch (error) {
        console.error('Error al limpiar backups antiguos:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al limpiar backups antiguos'
        });
      } finally {
        this.loading = false;
      }
    },
    async downloadBackup(backup) {
      try {
        this.loading = true;
        const response = await backupService.downloadBackup(backup.id);
        
        // Crear un blob y descargar el archivo
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${backup.type}_${new Date().toISOString().replace(/[:.]/g, '-')}.${this.getFileExtension(backup.type)}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: 'Backup descargado correctamente'
        });
      } catch (error) {
        console.error('Error al descargar backup:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al descargar backup'
        });
      } finally {
        this.loading = false;
      }
    },
    getFileExtension(type) {
      const extensionMap = {
        database: 'sql',
        config: 'json',
        full: 'tar.gz'
      };
      return extensionMap[type] || 'zip';
    }
  }
};
</script>

<style scoped>
.backup-management-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions {
  display: flex;
  gap: 10px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal.show {
  display: block;
}
</style>