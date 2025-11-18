<template>
  <div class="ip-assignment-container">
    <div class="card">
      <div class="card-header">
        <h3>Asignación de IPs</h3>
        <div class="actions">
          <button class="btn btn-primary" @click="refreshData">
            <i class="fas fa-sync-alt"></i> Actualizar
          </button>
          <button class="btn btn-success" @click="showImportModal = true">
            <i class="fas fa-file-import"></i> Importar IPs
          </button>
          <button class="btn btn-warning" @click="verifyAssignments">
            <i class="fas fa-check-circle"></i> Verificar Asignaciones
          </button>
          <button class="btn btn-info" @click="syncWithRouter">
            <i class="fas fa-sync"></i> Sincronizar con Router
          </button>
        </div>
      </div>

      <div class="card-body">
        <!-- Filtros -->
        <div class="filters mb-3">
          <div class="row">
            <div class="col-md-3">
              <div class="form-group">
                <label>Pool de IPs</label>
                <select v-model="selectedPoolId" class="form-control" @change="loadIps">
                  <option v-for="pool in ipPools" :key="pool.id" :value="pool.id">
                    {{ pool.name }} ({{ pool.network }})
                  </option>
                </select>
              </div>
            </div>
            <div class="col-md-3">
              <div class="form-group">
                <label>Estado</label>
                <select v-model="filters.status" class="form-control" @change="loadIps">
                  <option value="">Todos</option>
                  <option value="available">Disponible</option>
                  <option value="assigned">Asignada</option>
                  <option value="reserved">Reservada</option>
                  <option value="blocked">Bloqueada</option>
                </select>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label>Buscar</label>
                <input type="text" v-model="filters.search" class="form-control" placeholder="Buscar por IP, cliente, usuario..." @input="loadIps">
              </div>
            </div>
          </div>
        </div>

        <!-- Estadísticas del Pool -->
        <div class="pool-stats mb-3" v-if="poolStats">
          <div class="row">
            <div class="col-md-2">
              <div class="stat-card bg-primary">
                <div class="stat-title">Total</div>
                <div class="stat-value">{{ poolStats.total }}</div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="stat-card bg-success">
                <div class="stat-title">Disponibles</div>
                <div class="stat-value">{{ poolStats.available }}</div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="stat-card bg-warning">
                <div class="stat-title">Asignadas</div>
                <div class="stat-value">{{ poolStats.assigned }}</div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="stat-card bg-info">
                <div class="stat-title">Reservadas</div>
                <div class="stat-value">{{ poolStats.reserved }}</div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="stat-card bg-danger">
                <div class="stat-title">Bloqueadas</div>
                <div class="stat-value">{{ poolStats.blocked }}</div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="stat-card bg-secondary">
                <div class="stat-title">Uso</div>
                <div class="stat-value">{{ poolStats.usagePercent }}%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabla de IPs -->
        <div class="table-responsive">
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>IP</th>
                <th>Estado</th>
                <th>Cliente</th>
                <th>Usuario PPPoE</th>
                <th>MAC</th>
                <th>Última Conexión</th>
                <th>Comentario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ip in ips" :key="ip.id" :class="getRowClass(ip)">
                <td>{{ ip.ipAddress }}</td>
                <td>
                  <span :class="getStatusBadgeClass(ip.status)">{{ getStatusText(ip.status) }}</span>
                </td>
                <td>
                  <router-link v-if="ip.Client" :to="{ name: 'ClientDetail', params: { id: ip.Client.id } }">
                    {{ ip.Client.name }}
                  </router-link>
                  <span v-else>-</span>
                </td>
                <td>
                  <router-link v-if="ip.MikrotikPPPOE" :to="{ name: 'PPPoEDetail', params: { id: ip.MikrotikPPPOE.id } }">
                    {{ ip.MikrotikPPPOE.username }}
                  </router-link>
                  <span v-else>-</span>
                </td>
                <td>{{ ip.macAddress || '-' }}</td>
                <td>{{ formatDate(ip.lastSeen) }}</td>
                <td>{{ ip.comment || '-' }}</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-sm btn-primary" @click="editIp(ip)">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button v-if="ip.status === 'assigned'" class="btn btn-sm btn-danger" @click="releaseIp(ip)">
                      <i class="fas fa-unlink"></i>
                    </button>
                    <button v-if="ip.status === 'available'" class="btn btn-sm btn-success" @click="showAssignModal(ip)">
                      <i class="fas fa-link"></i>
                    </button>
                    <button v-if="ip.status !== 'blocked'" class="btn btn-sm btn-warning" @click="blockIp(ip)">
                      <i class="fas fa-ban"></i>
                    </button>
                    <button v-if="ip.status === 'blocked'" class="btn btn-sm btn-info" @click="unblockIp(ip)">
                      <i class="fas fa-check"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="pagination-container">
          <ul class="pagination">
            <li class="page-item" :class="{ disabled: currentPage === 0 }">
              <a class="page-link" href="#" @click.prevent="changePage(currentPage - 1)">Anterior</a>
            </li>
            <li v-for="page in totalPages" :key="page" class="page-item" :class="{ active: currentPage === page - 1 }">
              <a class="page-link" href="#" @click.prevent="changePage(page - 1)">{{ page }}</a>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages - 1 }">
              <a class="page-link" href="#" @click.prevent="changePage(currentPage + 1)">Siguiente</a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Modal para importar IPs -->
    <div class="modal" :class="{ 'show d-block': showImportModal }" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Importar IPs desde CIDR</h5>
            <button type="button" class="close" @click="showImportModal = false">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Pool de IPs</label>
              <select v-model="importData.poolId" class="form-control">
                <option v-for="pool in ipPools" :key="pool.id" :value="pool.id">
                  {{ pool.name }} ({{ pool.network }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Rango CIDR</label>
              <input type="text" v-model="importData.cidr" class="form-control" placeholder="Ej: 192.168.1.0/24">
              <small class="form-text text-muted">
                Formato: IP_BASE/PREFIJO (Ej: 192.168.1.0/24)
              </small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showImportModal = false">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="importIps" :disabled="!isValidImportData">Importar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para editar IP -->
    <div class="modal" :class="{ 'show d-block': showEditModal }" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar IP {{ editingIp ? editingIp.ipAddress : '' }}</h5>
            <button type="button" class="close" @click="showEditModal = false">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body" v-if="editingIp">
            <div class="form-group">
              <label>Estado</label>
              <select v-model="editingIp.status" class="form-control">
                <option value="available">Disponible</option>
                <option value="reserved">Reservada</option>
                <option value="blocked">Bloqueada</option>
              </select>
            </div>
            <div class="form-group">
              <label>Comentario</label>
              <textarea v-model="editingIp.comment" class="form-control" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showEditModal = false">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="saveIpChanges">Guardar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para asignar IP -->
    <div class="modal" :class="{ 'show d-block': showAssignIpModal }" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Asignar IP {{ assigningIp ? assigningIp.ipAddress : '' }}</h5>
            <button type="button" class="close" @click="showAssignIpModal = false">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Usuario PPPoE</label>
              <select v-model="assignData.mikrotikPPPOEId" class="form-control">
                <option v-for="user in pppoeUsers" :key="user.id" :value="user.id">
                  {{ user.username }} ({{ user.Client ? user.Client.name : 'Sin cliente' }})
                </option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAssignIpModal = false">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="assignIpToSelectedUser" :disabled="!assignData.mikrotikPPPOEId">Asignar</button>
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
import ipAssignmentService from '@/services/ip.assignment.service';
import ipPoolService from '@/services/ipPool.service';
import mikrotikService from '@/services/mikrotik.service';
import { formatDate } from '@/utils/formatters';

export default {
  name: 'IpAssignmentView',
  data() {
    return {
      ips: [],
      ipPools: [],
      pppoeUsers: [],
      selectedPoolId: null,
      currentPage: 0,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      poolStats: null,
      loading: false,
      showImportModal: false,
      showEditModal: false,
      showAssignIpModal: false,
      editingIp: null,
      assigningIp: null,
      filters: {
        status: '',
        search: ''
      },
      importData: {
        poolId: null,
        cidr: ''
      },
      assignData: {
        mikrotikPPPOEId: null
      }
    };
  },
  computed: {
    isValidImportData() {
      return this.importData.poolId && this.importData.cidr && this.validateCidr(this.importData.cidr);
    }
  },
  created() {
    this.loadIpPools();
  },
  methods: {
    formatDate,
    async loadIpPools() {
      try {
        this.loading = true;
        const response = await ipPoolService.getAllPools();
        this.ipPools = response.data;
        
        if (this.ipPools.length > 0) {
          this.selectedPoolId = this.ipPools[0].id;
          this.importData.poolId = this.ipPools[0].id;
          await this.loadIps();
        }
      } catch (error) {
        console.error('Error al cargar pools de IPs:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar pools de IPs'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadIps() {
      if (!this.selectedPoolId) return;
      
      try {
        this.loading = true;
        const response = await ipAssignmentService.getIpsByPool(
          this.selectedPoolId,
          this.currentPage,
          this.pageSize,
          this.filters.status
        );
        
        this.ips = response.data.items;
        this.totalItems = response.data.totalItems;
        this.totalPages = response.data.totalPages;
        this.poolStats = response.data.stats;
        
        // Cargar usuarios PPPoE para asignación
        await this.loadPPPoEUsers();
      } catch (error) {
        console.error('Error al cargar IPs:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al cargar IPs'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadPPPoEUsers() {
      try {
        // Obtener el router ID del pool seleccionado
        const selectedPool = this.ipPools.find(pool => pool.id === this.selectedPoolId);
        if (!selectedPool) return;
        
        const response = await mikrotikService.getPPPoEUsers(selectedPool.mikrotikRouterId);
        this.pppoeUsers = response.data.filter(user => !user.staticIp);
      } catch (error) {
        console.error('Error al cargar usuarios PPPoE:', error);
      }
    },
    async refreshData() {
      await this.loadIps();
    },
    changePage(page) {
      if (page < 0 || page >= this.totalPages) return;
      this.currentPage = page;
      this.loadIps();
    },
    getStatusText(status) {
      const statusMap = {
        available: 'Disponible',
        assigned: 'Asignada',
        reserved: 'Reservada',
        blocked: 'Bloqueada'
      };
      return statusMap[status] || status;
    },
    getStatusBadgeClass(status) {
      const classMap = {
        available: 'badge badge-success',
        assigned: 'badge badge-warning',
        reserved: 'badge badge-info',
        blocked: 'badge badge-danger'
      };
      return classMap[status] || 'badge badge-secondary';
    },
    getRowClass(ip) {
      const classMap = {
        available: '',
        assigned: 'table-warning',
        reserved: 'table-info',
        blocked: 'table-danger'
      };
      return classMap[ip.status] || '';
    },
    editIp(ip) {
      this.editingIp = { ...ip };
      this.showEditModal = true;
    },
    async saveIpChanges() {
      try {
        this.loading = true;
        await ipAssignmentService.updateIp(this.editingIp.id, {
          status: this.editingIp.status,
          comment: this.editingIp.comment
        });
        
        this.showEditModal = false;
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: `IP ${this.editingIp.ipAddress} actualizada correctamente`
        });
        
        await this.loadIps();
      } catch (error) {
        console.error('Error al guardar cambios de IP:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al guardar cambios de IP'
        });
      } finally {
        this.loading = false;
      }
    },
    showAssignModal(ip) {
      this.assigningIp = ip;
      this.assignData.mikrotikPPPOEId = null;
      this.showAssignIpModal = true;
    },
    async assignIpToSelectedUser() {
      try {
        this.loading = true;
        await ipAssignmentService.assignIpToUser(
          this.assignData.mikrotikPPPOEId,
          null,
          this.assigningIp.ipAddress
        );
        
        this.showAssignIpModal = false;
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: `IP ${this.assigningIp.ipAddress} asignada correctamente`
        });
        
        await this.loadIps();
      } catch (error) {
        console.error('Error al asignar IP:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al asignar IP'
        });
      } finally {
        this.loading = false;
      }
    },
    async releaseIp(ip) {
      if (!ip.MikrotikPPPOE) {
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Esta IP no está asignada a ningún usuario PPPoE'
        });
        return;
      }
      
      if (!confirm(`¿Está seguro de liberar la IP ${ip.ipAddress}?`)) return;
      
      try {
        this.loading = true;
        await ipAssignmentService.releaseIpFromUser(ip.MikrotikPPPOE.id);
        
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: `IP ${ip.ipAddress} liberada correctamente`
        });
        
        await this.loadIps();
      } catch (error) {
        console.error('Error al liberar IP:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al liberar IP'
        });
      } finally {
        this.loading = false;
      }
    },
    async blockIp(ip) {
      try {
        this.loading = true;
        await ipAssignmentService.updateIp(ip.id, {
          status: 'blocked',
          comment: ip.comment || 'Bloqueada manualmente'
        });
        
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: `IP ${ip.ipAddress} bloqueada correctamente`
        });
        
        await this.loadIps();
      } catch (error) {
        console.error('Error al bloquear IP:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al bloquear IP'
        });
      } finally {
        this.loading = false;
      }
    },
    async unblockIp(ip) {
      try {
        this.loading = true;
        await ipAssignmentService.updateIp(ip.id, {
          status: 'available',
          comment: (ip.comment || '') + ' - Desbloqueada manualmente'
        });
        
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: `IP ${ip.ipAddress} desbloqueada correctamente`
        });
        
        await this.loadIps();
      } catch (error) {
        console.error('Error al desbloquear IP:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al desbloquear IP'
        });
      } finally {
        this.loading = false;
      }
    },
    validateCidr(cidr) {
      // Validación básica de formato CIDR
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrRegex.test(cidr)) return false;
      
      const [ip, prefix] = cidr.split('/');
      const prefixNum = parseInt(prefix, 10);
      
      // Validar rango de prefijo
      if (prefixNum < 0 || prefixNum > 32) return false;
      
      // Validar octetos de IP
      const octets = ip.split('.').map(Number);
      return octets.every(octet => octet >= 0 && octet <= 255);
    },
    async importIps() {
      if (!this.isValidImportData) return;
      
      try {
        this.loading = true;
        const response = await ipAssignmentService.importIpsFromCidr(
          this.importData.poolId,
          this.importData.cidr
        );
        
        this.showImportModal = false;
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Éxito',
          text: `Se importaron ${response.data.totalIps} IPs correctamente`
        });
        
        // Si el pool importado es el seleccionado actualmente, recargar IPs
        if (this.importData.poolId === this.selectedPoolId) {
          await this.loadIps();
        }
      } catch (error) {
        console.error('Error al importar IPs:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al importar IPs'
        });
      } finally {
        this.loading = false;
      }
    },
    async verifyAssignments() {
      try {
        this.loading = true;
        const response = await ipAssignmentService.verifyIpAssignments();
        
        // eslint-disable-next-line no-unused-vars
        // eslint-disable-next-line no-unused-vars
        // eslint-disable-next-line no-unused-vars
        const { multipleIpsPerUser, orphanedIps, mismatchedIps, fixed } = response.data.issues;
        const totalFixed = fixed.multipleIpsPerUser + fixed.orphanedIps + fixed.mismatchedIps;
        
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Verificación completada',
          text: `Se corrigieron ${totalFixed} problemas de asignación de IPs`
        });
        
        await this.loadIps();
      } catch (error) {
        console.error('Error al verificar asignaciones:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al verificar asignaciones de IPs'
        });
      } finally {
        this.loading = false;
      }
    },
    async syncWithRouter() {
      // Obtener el router ID del pool seleccionado
      const selectedPool = this.ipPools.find(pool => pool.id === this.selectedPoolId);
      if (!selectedPool) {
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'No se pudo determinar el router asociado al pool'
        });
        return;
      }
      
      try {
        this.loading = true;
        const response = await ipAssignmentService.syncIpsWithRouter(selectedPool.mikrotikRouterId);
        
        this.$notify({
          group: 'notifications',
          type: 'success',
          title: 'Sincronización completada',
          text: response.data.message
        });
        
        await this.loadIps();
      } catch (error) {
        console.error('Error al sincronizar con router:', error);
        this.$notify({
          group: 'notifications',
          type: 'error',
          title: 'Error',
          text: 'Error al sincronizar IPs con el router'
        });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.ip-assignment-container {
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

.pool-stats {
  margin-bottom: 20px;
}

.stat-card {
  padding: 15px;
  border-radius: 5px;
  color: white;
  text-align: center;
}

.stat-title {
  font-size: 14px;
  font-weight: bold;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
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
