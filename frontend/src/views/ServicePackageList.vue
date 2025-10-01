<template>
  <div class="service-package-list">
    <div class="page-header">
      <h1 class="page-title">Gestión de Paquetes de Servicio</h1>
      <div class="header-actions">
        <button class="btn btn-outline" @click="loadServicePackages">🔄 Actualizar</button>
        <router-link to="/service-packages/new" class="btn btn-primary">+ Nuevo Paquete</router-link>
      </div>
    </div>

    <!-- Filtros y búsqueda -->
    <div class="filters-section">
      <div class="search-filters">
        <div class="search-box">
          <input
            type="text"
            v-model="searchTerm"
            placeholder="Buscar paquetes..."
            @input="filterPackages"
          />
        </div>

        <div class="filter-controls">
          <select v-model="selectedZone" @change="filterPackages">
            <option value="">Todas las zonas</option>
            <option v-for="zone in zones" :key="zone.id" :value="zone.id">{{ zone.name }}</option>
          </select>

          <select v-model="selectedStatus" @change="filterPackages">
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          <select v-model="selectedSpeedRange" @change="filterPackages">
            <option value="">Todas las velocidades</option>
            <option value="1-10">1-10 Mbps</option>
            <option value="11-50">11-50 Mbps</option>
            <option value="51-100">51-100 Mbps</option>
            <option value="100+">100+ Mbps</option>
          </select>
        </div>
      </div>

      <div class="view-controls">
        <button
          class="btn btn-small"
          :class="{ active: viewMode === 'grid' }"
          @click="viewMode = 'grid'"
        >
          📱 Tarjetas
        </button>
        <button
          class="btn btn-small"
          :class="{ active: viewMode === 'table' }"
          @click="viewMode = 'table'"
        >
          📋 Tabla
        </button>
      </div>
    </div>

    <!-- Estadísticas rápidas -->
    <div class="quick-stats">
      <div class="stat-card">
        <div class="stat-value">{{ statistics.totalPackages }}</div>
        <div class="stat-label">Total Paquetes</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ statistics.activePackages }}</div>
        <div class="stat-label">Activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ statistics.totalClients }}</div>
        <div class="stat-label">Total Clientes</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${{ statistics.monthlyRevenue }}</div>
        <div class="stat-label">Ingresos Mensuales</div>
      </div>
    </div>

    <!-- Vista en tarjetas -->
    <div v-if="viewMode === 'grid'" class="packages-grid">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando paquetes de servicio...</p>
      </div>

      <div v-else-if="filteredPackages.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No se encontraron paquetes</h3>
        <p>{{ searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer paquete de servicio' }}</p>
        <router-link to="/service-packages/new" class="btn">Crear Paquete</router-link>
      </div>

      <div v-else class="packages-container">
        <div
          v-for="pkg in filteredPackages"
          :key="pkg.id"
          class="package-card"
          :class="{ inactive: !pkg.active }"
        >
          <!-- Header de la tarjeta -->
          <div class="package-header">
            <div class="package-title">
              <h3>{{ pkg.name }}</h3>
              <div class="package-status">
                <span class="status-badge" :class="pkg.active ? 'active' : 'inactive'">
                  {{ pkg.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
            <div class="package-price">
              <span class="price">${{ pkg.price }}</span>
              <span class="billing-cycle">{{ getBillingCycleText(pkg.billingCycle) }}</span>
            </div>
          </div>

          <!-- Velocidades -->
          <div class="package-speeds">
            <div class="speed-item download">
              <span class="speed-label">↓ Descarga</span>
              <span class="speed-value">{{ pkg.downloadSpeedMbps }} Mbps</span>
            </div>
            <div class="speed-item upload">
              <span class="speed-label">↑ Subida</span>
              <span class="speed-value">{{ pkg.uploadSpeedMbps }} Mbps</span>
            </div>
          </div>

          <!-- Características -->
          <div class="package-features">
            <div class="feature" v-if="pkg.dataLimitGb">
              <span class="feature-icon">📊</span>
              <span>{{ pkg.dataLimitGb }} GB</span>
            </div>
            <div class="feature" v-else>
              <span class="feature-icon">♾️</span>
              <span>Datos Ilimitados</span>
            </div>

            <div class="feature" v-if="pkg.hasJellyfin">
              <span class="feature-icon">📺</span>
              <span>Streaming Incluido</span>
            </div>
          </div>

          <!-- Estadísticas -->
          <div class="package-stats">
            <div class="stat-item">
              <span class="stat-number">{{ pkg.statistics?.activeClients || 0 }}</span>
              <span class="stat-text">clientes activos</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ pkg.statistics?.configuredProfiles || 0 }}</span>
              <span class="stat-text">perfiles configurados</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${{ pkg.statistics?.monthlyRevenue || '0.00' }}</span>
              <span class="stat-text">ingresos mensuales</span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="package-actions">
            <button class="btn btn-small btn-outline" @click="viewPackageDetails(pkg)">
              👁️ Ver Detalles
            </button>
            <button
              class="btn btn-small"
              @click="syncPackageProfiles(pkg)"
              :disabled="pkg.syncing"
            >
              {{ pkg.syncing ? '⏳' : '🔄' }} Sincronizar
            </button>
            <router-link
              :to="`/service-packages/${pkg.id}/edit`"
              class="btn btn-small btn-primary"
            >
              ✏️ Editar
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista en tabla -->
    <div v-else-if="viewMode === 'table'" class="packages-table-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando paquetes de servicio...</p>
      </div>

      <table v-else class="packages-table">
        <thead>
          <tr>
            <th @click="sortBy('name')" class="sortable">
              Nombre {{ getSortIcon('name') }}
            </th>
            <th @click="sortBy('price')" class="sortable">
              Precio {{ getSortIcon('price') }}
            </th>
            <th @click="sortBy('downloadSpeedMbps')" class="sortable">
              Velocidades {{ getSortIcon('downloadSpeedMbps') }}
            </th>
            <th>Características</th>
            <th @click="sortBy('activeClients')" class="sortable">
              Clientes {{ getSortIcon('activeClients') }}
            </th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pkg in filteredPackages" :key="pkg.id" :class="{ inactive: !pkg.active }">
            <td>
              <div class="package-name">
                <strong>{{ pkg.name }}</strong>
                <div class="package-description">{{ pkg.description }}</div>
              </div>
            </td>
            <td>
              <div class="price-cell">
                <span class="price">${{ pkg.price }}</span>
                <span class="billing-cycle">{{ getBillingCycleText(pkg.billingCycle) }}</span>
              </div>
            </td>
            <td>
              <div class="speeds-cell">
                <span class="speed download">↓ {{ pkg.downloadSpeedMbps }} Mbps</span>
                <span class="speed upload">↑ {{ pkg.uploadSpeedMbps }} Mbps</span>
              </div>
            </td>
            <td>
              <div class="features-cell">
                <span class="feature" v-if="pkg.dataLimitGb">📊 {{ pkg.dataLimitGb }} GB</span>
                <span class="feature" v-else>♾️ Ilimitado</span>
                <span class="feature" v-if="pkg.hasJellyfin">📺 Streaming</span>
              </div>
            </td>
            <td>
              <div class="clients-cell">
                <strong>{{ pkg.statistics?.activeClients || 0 }}</strong>
                <span class="revenue">${{ pkg.statistics?.monthlyRevenue || '0.00' }}/mes</span>
              </div>
            </td>
            <td>
              <span class="status-badge" :class="pkg.active ? 'active' : 'inactive'">
                {{ pkg.active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>
              <div class="table-actions">
                <button
                  class="btn btn-tiny"
                  @click="viewPackageDetails(pkg)"
                  title="Ver detalles"
                >
                  👁️
                </button>
                <button
                  class="btn btn-tiny"
                  @click="syncPackageProfiles(pkg)"
                  :disabled="pkg.syncing"
                  title="Sincronizar perfiles"
                >
                  {{ pkg.syncing ? '⏳' : '🔄' }}
                </button>
                <router-link
                  :to="`/service-packages/${pkg.id}/edit`"
                  class="btn btn-tiny btn-primary"
                  title="Editar"
                >
                  ✏️
                </router-link>
                <button
                  class="btn btn-tiny btn-danger"
                  @click="confirmDeletePackage(pkg)"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal de confirmación de eliminación -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Confirmar Eliminación</h3>
        </div>
        <div class="modal-body">
          <p>
            ¿Está seguro que desea eliminar el paquete
            <strong>{{ packageToDelete?.name }}</strong>?
          </p>
          <p class="warning">
            Esta acción no se puede deshacer y afectará a todos los clientes que usen este paquete.
          </p>
          <div v-if="packageToDelete?.statistics?.activeClients > 0" class="client-warning">
            ⚠️ <strong>{{ packageToDelete.statistics.activeClients }} clientes activos</strong> serán
            afectados
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn" @click="showDeleteModal = false">Cancelar</button>
          <button class="btn btn-danger" @click="deletePackage" :disabled="deleting">
            {{ deleting ? 'Eliminando...' : 'Eliminar Paquete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de detalles del paquete -->
<!-- frontend/src/views/ServicePackages/ServicePackageList.vue -->
<div v-if="showDetailsModal" class="modal-overlay" @click="showDetailsModal = false">
  <div class="modal large" @click.stop>
    <div class="modal-header">
      <h3>Detalles: {{ selectedPackage?.name || 'Cargando...' }}</h3>
      <button class="modal-close" @click="showDetailsModal = false">×</button>
    </div>
    <div class="modal-body">
      <div v-if="loadingDetails" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando detalles...</p>
      </div>
      <div v-else-if="packageDetails" class="package-details">
        <div class="detail-section">
          <h4>Información Básica</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">Nombre:</span>
              <span class="value">{{ packageDetails.package?.name || 'N/A' }}</span>
            </div>
            <!-- ... otros detail-item con ?. para price, downloadSpeedMbps, etc. -->
            <div class="detail-item">
              <span class="label">Precio:</span>
              <span class="value">
                ${{ packageDetails.package?.price || '0' }}/{{ getBillingCycleText(packageDetails.package?.billingCycle || 'monthly') }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Velocidad de descarga:</span>
              <span class="value">{{ packageDetails.package?.downloadSpeedMbps || '0' }} Mbps</span>
            </div>
            <div class="detail-item">
              <span class="label">Velocidad de subida:</span>
              <span class="value">{{ packageDetails.package?.uploadSpeedMbps || '0' }} Mbps</span>
            </div>
          </div>
        </div>
        <!-- ... resto del modal sin cambios -->
      </div>
      <div v-else class="error-state">
        <p>Error al cargar los detalles del paquete.</p>
      </div>
    </div>
  </div>
</div>

  </div>
</template>

<script>
import ServicePackageService from '../services/servicePackage.service';
import NetworkService from '../services/network.service';

export default {
 name: 'ServicePackageList',
 data() {
   return {
     servicePackages: [],
     filteredPackages: [],
     zones: [],
     loading: false,

     // Filtros
     searchTerm: '',
     selectedZone: '',
     selectedStatus: '',
     selectedSpeedRange: '',

     // Vista
     viewMode: 'grid', // 'grid' o 'table'

     // Ordenación
     sortField: 'name',
     sortDirection: 'asc',

     // Estadísticas
     statistics: {
       totalPackages: 0,
       activePackages: 0,
       totalClients: 0,
       monthlyRevenue: '0.00'
     },

     // Modales
     showDeleteModal: false,
     packageToDelete: null,
     deleting: false,

     showDetailsModal: false,
     selectedPackage: null,
     packageDetails: null,
     loadingDetails: false
   };
 },
 created() {
   this.loadInitialData();
 },
 methods: {
   async loadInitialData() {
     console.log('🔄 Cargando datos iniciales...');
     await Promise.all([
       this.loadServicePackages(), 
       this.loadZones()
     ]);
   },

   async loadServicePackages() {
     this.loading = true;
     try {
       console.log('📦 Cargando paquetes de servicio...');
       const response = await ServicePackageService.getAllServicePackages();
       
       if (response.data.success) {
         this.servicePackages = response.data.data;
         console.log(`📦 ${this.servicePackages.length} paquetes cargados`);
         
         // ✅ CARGAR ESTADÍSTICAS PARA CADA PAQUETE
         for (const pkg of this.servicePackages) {
           try {
             console.log(`📊 Cargando clientes para paquete ${pkg.name} (ID: ${pkg.id})`);
             
             const clientsResponse = await ServicePackageService.getPackageClients(pkg.id);
             
             if (clientsResponse.data.success) {
               const clientBillings = clientsResponse.data.data;
               console.log(`✅ Paquete ${pkg.name}: ${clientBillings.length} registros de facturación encontrados`);
               
               // Calcular estadísticas basadas en ClientBilling
               const activeClients = clientBillings.filter(billing => 
                 billing.clientStatus === 'active'
               ).length;
               
               const monthlyRevenue = clientBillings
                 .filter(billing => billing.clientStatus === 'active')
                 .reduce((total, billing) => total + parseFloat(billing.monthlyFee || 0), 0);
               
               // Asignar estadísticas al paquete
               pkg.statistics = {
                 activeClients: activeClients,
                 totalClients: clientBillings.length,
                 monthlyRevenue: monthlyRevenue.toFixed(2),
                 configuredProfiles: 0 // Se actualiza después
               };
               
               console.log(`📊 Estadísticas para ${pkg.name}:`, pkg.statistics);
             } else {
               console.warn(`⚠️ No se pudieron cargar clientes para paquete ${pkg.id}`);
               pkg.statistics = {
                 activeClients: 0,
                 totalClients: 0,
                 monthlyRevenue: '0.00',
                 configuredProfiles: 0
               };
             }
             
             // ✅ CARGAR PERFILES MIKROTIK
             await this.loadPackageProfilesCount(pkg);
             
           } catch (error) {
             console.warn(`❌ Error cargando datos para paquete ${pkg.id}:`, error);
             pkg.statistics = {
               activeClients: 0,
               totalClients: 0,
               monthlyRevenue: '0.00',
               configuredProfiles: 0
             };
           }
         }
         
         // ✅ CALCULAR ESTADÍSTICAS GENERALES
         this.calculateGeneralStatistics();
         
         this.filterPackages();
       }
     } catch (error) {
       console.error('❌ Error cargando paquetes de servicio:', error);
       alert('Error al cargar paquetes de servicio: ' + (error.response?.data?.message || error.message));
       this.servicePackages = [];
     } finally {
       this.loading = false;
     }
   },

   // ✅ MÉTODO PARA CARGAR PERFILES MIKROTIK
   async loadPackageProfilesCount(pkg) {
     try {
       console.log(`⚙️ Cargando perfiles Mikrotik para paquete ${pkg.name} (ID: ${pkg.id})`);
       
       const profilesResponse = await ServicePackageService.getPackageProfiles(pkg.id);
       console.log(`📋 Respuesta de perfiles para paquete ${pkg.id}:`, profilesResponse.data);
       
       if (profilesResponse.data.success) {
         const profiles = profilesResponse.data.data || [];
         pkg.statistics.configuredProfiles = profiles.length;
         
         console.log(`✅ Paquete ${pkg.name}: ${profiles.length} perfiles Mikrotik configurados`);
         
         // Log adicional para ver los detalles de los perfiles
         profiles.forEach((profileData, index) => {
           const dbProfile = profileData.dbProfile;
           const router = profileData.router;
           console.log(`📋 Perfil ${index + 1}: "${dbProfile.profileName}" (${dbProfile.rateLimit}) en router ${router.name}`);
         });
         
       } else {
         console.warn(`⚠️ No se pudieron cargar perfiles para paquete ${pkg.id}:`, profilesResponse.data.message);
         pkg.statistics.configuredProfiles = 0;
       }
     } catch (error) {
       console.error(`❌ Error cargando perfiles para paquete ${pkg.id}:`, error);
       pkg.statistics.configuredProfiles = 0;
     }
   },

   // ✅ MÉTODO PARA CALCULAR ESTADÍSTICAS GENERALES
   calculateGeneralStatistics() {
     console.log('📊 Calculando estadísticas generales...');
     
     let totalPackages = this.servicePackages.length;
     let activePackages = this.servicePackages.filter(pkg => pkg.active).length;
     let totalClients = 0;
     let totalMonthlyRevenue = 0;
     
     // Sumar estadísticas de todos los paquetes
     this.servicePackages.forEach(pkg => {
       if (pkg.statistics) {
         totalClients += pkg.statistics.totalClients || 0;
         totalMonthlyRevenue += parseFloat(pkg.statistics.monthlyRevenue || 0);
       }
     });
     
     // Asignar estadísticas generales
     this.statistics = {
       totalPackages: totalPackages,
       activePackages: activePackages,
       totalClients: totalClients,
       monthlyRevenue: totalMonthlyRevenue.toFixed(2)
     };
     
     console.log('✅ Estadísticas generales calculadas:', this.statistics);
   },

   async loadZones() {
     try {
       console.log('🗺️ Cargando zonas...');
       const response = await NetworkService.getAllZones();
       
       this.zones = response.data?.zones || response.data || [];
       console.log(`🗺️ ${this.zones.length} zonas cargadas`);
     } catch (error) {
       console.error('❌ Error cargando zonas:', error);
       this.zones = [];
     }
   },

   filterPackages() {
     let filtered = [...this.servicePackages];

     // Filtrar por búsqueda
     if (this.searchTerm) {
       const search = this.searchTerm.toLowerCase();
       filtered = filtered.filter(
         pkg =>
           pkg.name?.toLowerCase().includes(search) ||
           (pkg.description && pkg.description.toLowerCase().includes(search))
       );
     }

     // Filtrar por zona
     if (this.selectedZone) {
       filtered = filtered.filter(pkg => pkg.zoneId === parseInt(this.selectedZone));
     }

     // Filtrar por estado
     if (this.selectedStatus) {
       const isActive = this.selectedStatus === 'active';
       filtered = filtered.filter(pkg => pkg.active === isActive);
     }

     // Filtrar por rango de velocidad
     if (this.selectedSpeedRange) {
       const [min, max] = this.selectedSpeedRange.split('-').map(v => (v === '100+' ? 999 : parseInt(v)));
       filtered = filtered.filter(pkg => {
         const speed = pkg.downloadSpeedMbps;
         return max === 999 ? speed >= min : speed >= min && speed <= max;
       });
     }

     this.filteredPackages = this.sortPackages(filtered);
   },

   sortBy(field) {
     if (this.sortField === field) {
       this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
     } else {
       this.sortField = field;
       this.sortDirection = 'asc';
     }
     this.filteredPackages = this.sortPackages(this.filteredPackages);
   },

   sortPackages(packages) {
     return packages.sort((a, b) => {
       let aVal = a[this.sortField];
       let bVal = b[this.sortField];

       // Manejar casos especiales
       if (this.sortField === 'activeClients') {
         aVal = a.statistics?.activeClients || 0;
         bVal = b.statistics?.activeClients || 0;
       }

       if (this.sortDirection === 'asc') {
         return aVal > bVal ? 1 : -1;
       } else {
         return aVal < bVal ? 1 : -1;
       }
     });
   },

   getSortIcon(field) {
     if (this.sortField !== field) return '';
     return this.sortDirection === 'asc' ? '↑' : '↓';
   },

async viewPackageDetails(pkg) {
  console.log('👁️ Cargando detalles del paquete:', pkg.id);
  this.selectedPackage = pkg;
  this.showDetailsModal = true;
  this.loadingDetails = true;
  this.packageDetails = null;
  
  try {
    const response = await ServicePackageService.getServicePackage(pkg.id);
    console.log('✅ Respuesta completa de detalles:', response);
    console.log('✅ Data de detalles:', response.data);
    
    if (response.data.success) {
      // ✅ VERIFICAR LA ESTRUCTURA DE LA RESPUESTA
      this.packageDetails = {
        package: response.data.data, // El paquete está en response.data.data
        profiles: [], // Se puede cargar después
        clients: []   // Se puede cargar después
      };
      
      console.log('📋 Package details asignado:', this.packageDetails);
    } else {
      console.error('❌ No hay data en la respuesta de detalles');
      this.packageDetails = null;
    }
  } catch (error) {
    console.error('❌ Error cargando detalles del paquete:', error);
    alert('Error al cargar detalles del paquete: ' + (error.response?.data?.message || error.message));
    this.packageDetails = null;
  } finally {
    this.loadingDetails = false;
  }
},

   async syncPackageProfiles(pkg) {
     console.log('🔄 Sincronizando perfiles para:', pkg.name);
     pkg.syncing = true;
     try {
       await ServicePackageService.syncPackageWithRouters(pkg.id);
       alert(`Perfiles de ${pkg.name} sincronizados correctamente`);
       await this.loadServicePackages();
     } catch (error) {
       console.error('❌ Error sincronizando perfiles:', error);
       alert('Error al sincronizar perfiles: ' + (error.response?.data?.message || error.message));
     } finally {
       pkg.syncing = false;
     }
   },

   confirmDeletePackage(pkg) {
     this.packageToDelete = pkg;
     this.showDeleteModal = true;
   },

   async deletePackage() {
     this.deleting = true;
     try {
       await ServicePackageService.deleteServicePackage(this.packageToDelete.id);
       alert(`Paquete ${this.packageToDelete.name} eliminado correctamente`);
       this.showDeleteModal = false;
       await this.loadServicePackages();
     } catch (error) {
       console.error('❌ Error eliminando paquete:', error);
       alert('Error al eliminar paquete: ' + (error.response?.data?.message || error.message));
     } finally {
       this.deleting = false;
     }
   },

   async createProfiles(packageId) {
     try {
       console.log('⚙️ Creando perfiles para paquete:', packageId);
       await ServicePackageService.createPackageProfiles(packageId);
       alert('Perfiles creados correctamente');
       await this.viewPackageDetails(this.selectedPackage);
     } catch (error) {
       console.error('❌ Error creando perfiles:', error);
       alert('Error al crear perfiles: ' + (error.response?.data?.message || error.message));
     }
   },

   getBillingCycleText(cycle) {
     const cycles = {
       monthly: 'mes',
       weekly: 'semana',
       annually: 'año'
     };
     return cycles[cycle] || cycle;
   },

   formatDate(dateString) {
     if (!dateString) return 'Nunca';
     return new Date(dateString).toLocaleDateString('es-MX');
   }
 }
};
</script>


<style scoped>
.service-package-list {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-title {
  font-size: 1.5rem;
  color: #2c3e50;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filters-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-filters {
  display: flex;
  align-items: center;
  gap: 15px;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 250px;
  font-size: 14px;
}

.search-box input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.filter-controls {
  display: flex;
  gap: 10px;
}

.filter-controls select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filter-controls select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.view-controls {
  display: flex;
  gap: 5px;
}

.view-controls .btn {
  padding: 6px 12px;
  font-size: 12px;
}

.view-controls .btn.active {
  background-color: #3498db;
  color: white;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #3498db;
}

.stat-label {
  color: #666;
  margin-top: 5px;
  font-size: 0.9rem;
}

.packages-grid {
  min-height: 400px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin-bottom: 10px;
  color: #34495e;
}

.empty-state p {
  margin-bottom: 20px;
}

.packages-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.package-card {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e8ed;
  transition: transform 0.2s, box-shadow 0.2s;
}

.package-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

.package-card.inactive {
  opacity: 0.7;
  background-color: #f8f9fa;
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.package-title h3 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.package-price {
  text-align: right;
}

.price {
  font-size: 1.5rem;
  font-weight: bold;
  color: #27ae60;
}

.billing-cycle {
  display: block;
  color: #666;
  font-size: 0.9rem;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.active {
  background-color: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background-color: #f8d7da;
  color: #721c24;
}

.package-speeds {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
}

.speed-item {
  text-align: center;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.speed-label {
  display: block;
  color: #666;
  font-size: 0.9rem;
}

.speed-value {
  font-weight: bold;
  color: #2c3e50;
}

.package-features {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9rem;
}

.feature-icon {
  font-size: 1rem;
}

.package-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-weight: bold;
  color: #3498db;
}

.stat-text {
  color: #666;
  font-size: 0.8rem;
}

.package-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.packages-table-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.packages-table {
  width: 100%;
  border-collapse: collapse;
}

.packages-table th,
.packages-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #e1e8ed;
}

.packages-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #34495e;
}

.packages-table th.sortable {
  cursor: pointer;
}

.packages-table th.sortable:hover {
  background-color: #e9ecef;
}

.packages-table tr.inactive {
  opacity: 0.7;
  background-color: #f8f9fa;
}

.package-name strong {
  color: #2c3e50;
}

.package-description {
  color: #666;
  font-size: 0.9rem;
}

.price-cell .price {
  font-weight: bold;
  color: #27ae60;
}

.price-cell .billing-cycle {
  display: block;
  color: #666;
  font-size: 0.9rem;
}

.speeds-cell .speed {
  display: block;
  font-weight: 500;
}

.speeds-cell .download {
  color: #3498db;
}

.speeds-cell .upload {
  color: #27ae60;
}

.features-cell .feature {
  display: inline-block;
  margin-right: 10px;
  font-size: 0.9rem;
}

.clients-cell strong {
  color: #2c3e50;
}

.clients-cell .revenue {
  display: block;
  color: #666;
  font-size: 0.9rem;
}

.table-actions {
  display: flex;
  gap: 5px;
}

.btn-tiny {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c0392b;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal.large {
  width: 800px;
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e1e8ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #34495e;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
}

.modal-body .warning {
  color: #e74c3c;
  font-weight: 500;
}

.client-warning {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
}

.modal-actions {
  padding: 15px 20px;
  border-top: 1px solid #e1e8ed;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.package-details .detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  color: #34495e;
  margin-bottom: 15px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.detail-item {
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.detail-item .label {
  font-weight: 600;
  color: #555;
}

.detail-item .value {
  color: #2c3e50;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.stat-box {
  text-align: center;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.stat-box .stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #3498db;
}

.stat-box .stat-label {
  color: #666;
  font-size: 0.9rem;
}

.empty-profiles {
  text-align: center;
  padding: 20px;
  color: #666;
}

.profiles-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-item {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.profile-info strong {
  color: #2c3e50;
}

.profile-router {
  display: block;
  color: #666;
  font-size: 0.9rem;
}

.profile-config {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.rate-limit {
  font-weight: 500;
  color: #3498db;
}

.last-sync {
  color: #666;
  font-size: 0.9rem;
}

.profile-status .status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-outline {
  background-color: transparent;
  color: #3498db;
  border: 1px solid #3498db;
}

.btn-outline:hover {
  background-color: #3498db;
  color: white;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .filters-section {
    flex-direction: column;
    gap: 15px;
  }

  .search-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box input {
    width: 100%;
  }

  .filter-controls {
    flex-direction: column;
    gap: 10px;
  }

  .filter-controls select {
    width: 100%;
  }

  .packages-container {
    grid-template-columns: 1fr;
  }

  .modal {
    width: 95%;
  }

  .modal.large {
    width: 95%;
  }
}
</style>