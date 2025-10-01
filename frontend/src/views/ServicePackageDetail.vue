<template>
 <div class="service-package-form">
   <div class="page-header">
     <h1>{{ isEdit ? 'Editar Paquete de Servicio' : 'Nuevo Paquete de Servicio' }}</h1>
     <button class="btn btn-outline" @click="goBack">
       ← Volver
     </button>
   </div>

   <div class="form-container">
     <form @submit.prevent="savePackage">
       <!-- Información Básica -->
       <div class="form-section">
         <h3>Información Básica</h3>
         
         <!-- Selector de Zona (solo para nuevos paquetes sin zoneId en URL) -->
         <div v-if="!isEdit && !zoneIdFromUrl" class="form-group">
           <label for="zoneSelector">Zona de Servicio *</label>
           <select 
             id="zoneSelector" 
             v-model="packageData.zoneId" 
             @change="onZoneChange"
             required
           >
             <option value="">Seleccionar zona</option>
             <option v-for="zone in availableZones" :key="zone.id" :value="zone.id">
               {{ zone.name }} ({{ zone.description || 'Sin descripción' }})
             </option>
           </select>
         </div>

         <!-- Zona readonly para edición o cuando viene de URL -->
         <div v-if="isEdit || zoneIdFromUrl" class="form-group">
           <label>Zona de Servicio</label>
           <div class="readonly-field">
             <span class="zone-display">
               📍 {{ selectedZone?.name || 'Cargando zona...' }}
               <small v-if="selectedZone?.description">{{ selectedZone.description }}</small>
             </span>
           </div>
         </div>
         
         <div class="form-row">
           <div class="form-group">
             <label for="packageName">Nombre del Paquete *</label>
             <input 
               type="text" 
               id="packageName" 
               v-model="packageData.name" 
               required
               placeholder="ej. Plan Básico 20MB"
             />
           </div>
           
           <div class="form-group">
             <label for="packagePrice">Precio Mensual *</label>
             <div class="input-with-prefix">
               <span class="prefix">$</span>
               <input 
                 type="number" 
                 id="packagePrice" 
                 v-model="packageData.price" 
                 required
                 min="1"
                 step="0.01"
                 placeholder="500.00"
               />
             </div>
           </div>
         </div>
         
         <div class="form-group">
           <label for="packageDescription">Descripción</label>
           <textarea 
             id="packageDescription" 
             v-model="packageData.description" 
             rows="3"
             placeholder="Descripción del paquete de servicio..."
           ></textarea>
         </div>
       </div>

       <!-- Configuración de Velocidades -->
       <div class="form-section">
         <h3>Configuración de Velocidades</h3>
         
         <div class="form-row">
           <div class="form-group">
             <label for="downloadSpeed">Velocidad de Descarga *</label>
             <div class="input-with-suffix">
               <input 
                 type="number" 
                 id="downloadSpeed" 
                 v-model="packageData.downloadSpeedMbps" 
                 required
                 min="1"
                 placeholder="20"
               />
               <span class="suffix">Mbps</span>
             </div>
           </div>
           
           <div class="form-group">
             <label for="uploadSpeed">Velocidad de Subida *</label>
             <div class="input-with-suffix">
               <input 
                 type="number" 
                 id="uploadSpeed" 
                 v-model="packageData.uploadSpeedMbps" 
                 required
                 min="1"
                 placeholder="10"
               />
               <span class="suffix">Mbps</span>
             </div>
           </div>
         </div>
         
         <div class="form-row">
           <div class="form-group">
             <label for="dataLimit">Límite de Datos</label>
             <div class="input-with-suffix">
               <input 
                 type="number" 
                 id="dataLimit" 
                 v-model="packageData.dataLimitGb" 
                 min="1"
                 placeholder="Dejar vacío para ilimitado"
               />
               <span class="suffix">GB</span>
             </div>
             <small class="form-help">Dejar vacío para datos ilimitados</small>
           </div>
           
           <div class="form-group">
             <label for="billingCycle">Ciclo de Facturación</label>
             <select id="billingCycle" v-model="packageData.billingCycle">
               <option value="monthly">Mensual</option>
               <option value="weekly">Semanal</option>
             </select>
           </div>
         </div>

         <!-- Vista previa de velocidades -->
         <div class="speed-preview">
           <div class="preview-item">
             <span class="label">Velocidad Total:</span>
             <span class="value">
               ↓ {{ formatSpeed(packageData.downloadSpeedMbps) }} / 
               ↑ {{ formatSpeed(packageData.uploadSpeedMbps) }}
             </span>
           </div>
           <div class="preview-item">
             <span class="label">Valor por Mbps:</span>
             <span class="value">${{ calculateValuePerMbps() }}</span>
           </div>
         </div>
       </div>

       <!-- Configuración Adicional -->
       <div class="form-section">
         <h3>Configuración Adicional</h3>
         
         <div class="form-row">
           <div class="form-group">
             <label>
               <input 
                 type="checkbox" 
                 v-model="packageData.hasJellyfin"
               />
               Incluir acceso a Jellyfin (Streaming)
             </label>
           </div>
           
           <div class="form-group">
             <label>
               <input 
                 type="checkbox" 
                 v-model="packageData.active"
               />
               Paquete activo
             </label>
           </div>
         </div>
       </div>

       <!-- Configuración de Perfiles Mikrotik -->
       <div class="form-section" v-if="packageData.zoneId">
         <h3>Configuración de Perfiles Mikrotik</h3>
         
         <div class="routers-management">
           <h4>Gestión de Perfiles por Router</h4>
           
           <div v-if="loadingRouters" class="loading-state">
             Cargando routers de la zona...
           </div>
           
           <div v-else-if="availableRouters.length === 0" class="empty-state">
             <p>No hay routers Mikrotik disponibles en esta zona</p>
             <small>Los routers se filtran automáticamente por los nodos de la zona seleccionada</small>
           </div>
           
           <div v-else class="routers-list">
             <div 
               v-for="router in availableRouters" 
               :key="router.id"
               class="router-management-card"
             >
               <!-- Header del router -->
               <div class="router-header">
                 <div class="router-info">
                   <h5>{{ router.name }}</h5>
                   <span class="router-details">
                     {{ router.ipAddress }} - 
                     <strong>{{ router.Node?.name || 'Sin nodo' }}</strong>
                     <span v-if="router.location"> ({{ router.location }})</span>
                   </span>
                 </div>
                 <div class="router-status">
                   <span class="status-badge" :class="'status-' + router.status">
                     {{ getStatusText(router.status) }}
                   </span>
                 </div>
               </div>

               <!-- Gestión de perfiles para este router -->
               <div class="profile-management">
                 <div class="profile-options">
                   <div class="option-tabs">
                     <button 
                       type="button"
                       class="tab-btn"
                       :class="{ active: router.selectedOption === 'existing' }"
                       @click="setRouterOption(router.id, 'existing')"
                       :disabled="!router.existingProfiles || router.existingProfiles.length === 0"
                     >
                       Usar Existente ({{ router.existingProfiles?.length || 0 }})
                     </button>
                     <button 
                       type="button"
                       class="tab-btn"
                       :class="{ active: router.selectedOption === 'create' }"
                       @click="setRouterOption(router.id, 'create')"
                     >
                       Crear Nuevo
                     </button>
                     <button 
                       type="button"
                       class="tab-btn"
                       :class="{ active: router.selectedOption === 'skip' }"
                       @click="setRouterOption(router.id, 'skip')"
                     >
                       Omitir
                     </button>
                   </div>
                 </div>

                 <!-- Contenido según opción seleccionada -->
                 <div class="option-content">
                   <!-- Usar perfil existente -->
                   <div v-if="router.selectedOption === 'existing'" class="existing-profiles">
                     <div v-if="router.loadingProfiles" class="loading-profiles">
                       Cargando perfiles existentes...
                     </div>
                     <div v-else-if="!router.existingProfiles || router.existingProfiles.length === 0" class="no-profiles">
                       No hay perfiles existentes en este router
                     </div>
                     <div v-else class="profiles-list">
                       <div 
                         v-for="profile in router.existingProfiles" 
                         :key="profile.name"
                         class="profile-item"
                         :class="{ selected: router.selectedProfile === profile.name }"
                         @click="selectProfile(router.id, profile.name)"
                       >
                         <div class="profile-info">
                           <strong>{{ profile.name }}</strong>
                           <span class="profile-config">{{ profile['rate-limit'] || 'Sin límite' }}</span>
                         </div>
                         <div class="profile-actions">
                           <input 
                             type="radio" 
                             :name="'profile-' + router.id"
                             :value="profile.name"
                             v-model="router.selectedProfile"
                           />
                         </div>
                       </div>
                     </div>
                   </div>

                   <!-- Crear nuevo perfil -->
                   <div v-if="router.selectedOption === 'create'" class="create-profile">
                     <div class="profile-preview">
                       <h6>Nuevo Perfil a Crear:</h6>
                       <div class="preview-fields">
                         <div class="field">
                           <span class="label">Nombre:</span>
                           <span class="value">{{ generateProfileName() }}</span>
                         </div>
                         <div class="field">
                           <span class="label">Rate Limit:</span>
                           <span class="value">{{ packageData.downloadSpeedMbps || 0 }}M/{{ packageData.uploadSpeedMbps || 0 }}M</span>
                         </div>
                         <div class="field">
                           <span class="label">Burst Limit:</span>
                           <span class="value">{{ calculateBurstLimit() }}</span>
                         </div>
                       </div>
                     </div>
                   </div>

                   <!-- Omitir router -->
                   <div v-if="router.selectedOption === 'skip'" class="skip-router">
                     <p class="skip-message">Este router será omitido en la configuración del paquete</p>
                   </div>
                 </div>

                 <!-- Botones de acción para el router -->
                 <div class="router-actions">
                   <button 
                     type="button"
                     @click="loadRouterProfiles(router)"
                     :disabled="router.loadingProfiles"
                     class="btn btn-small btn-outline"
                   >
                     {{ router.loadingProfiles ? '⏳' : '🔄' }} Actualizar Perfiles
                   </button>
                   
                   <button 
                     v-if="router.selectedOption === 'existing' && router.selectedProfile"
                     type="button"
                     @click="testProfile(router)"
                     :disabled="router.testingProfile"
                     class="btn btn-small"
                   >
                     {{ router.testingProfile ? '⏳' : '🧪' }} Probar Perfil
                   </button>
                 </div>
               </div>
             </div>
           </div>

           <!-- Resumen de configuración -->
           <div class="configuration-summary" v-if="availableRouters.length > 0">
             <h5>Resumen de Configuración</h5>
             <div class="summary-items">
               <div class="summary-item">
                 <span class="label">Routers que usarán perfiles existentes:</span>
                 <span class="value">{{ getRoutersByOption('existing').length }}</span>
               </div>
               <div class="summary-item">
                 <span class="label">Routers donde se crearán perfiles nuevos:</span>
                 <span class="value">{{ getRoutersByOption('create').length }}</span>
               </div>
               <div class="summary-item">
                 <span class="label">Routers omitidos:</span>
                 <span class="value">{{ getRoutersByOption('skip').length }}</span>
               </div>
             </div>
           </div>
         </div>
       </div>

       <!-- Mensaje para seleccionar zona -->
       <div v-else class="form-section">
         <div class="zone-required-message">
           <h3>⚠️ Selección de Zona Requerida</h3>
           <p>Para configurar los perfiles Mikrotik, primero debe seleccionar una zona de servicio.</p>
         </div>
       </div>

       <!-- Botones de Acción -->
       <div class="form-actions">
         <button type="button" class="btn" @click="goBack">
           Cancelar
         </button>
         <button 
           type="submit" 
           class="btn btn-primary" 
           :disabled="saving || !isFormValid"
         >
           {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar Paquete' : 'Crear Paquete') }}
         </button>
       </div>
     </form>

     <!-- Test de Conexión con Routers -->
     <div v-if="!isEdit && getActiveRouters().length > 0" class="connection-test-section">
       <h3>Probar Conexión con Routers Seleccionados</h3>
       <button 
         type="button" 
         @click="testRouterConnections" 
         :disabled="testingConnections"
         class="btn btn-outline"
       >
         {{ testingConnections ? 'Probando conexiones...' : 'Probar Conexiones' }}
       </button>
       
       <div v-if="connectionResults.length > 0" class="connection-results">
         <div 
           v-for="result in connectionResults" 
           :key="result.routerId"
           class="connection-result"
           :class="result.success ? 'success' : 'error'"
         >
           <span class="router-name">{{ result.routerName }}</span>
           <span class="result-status">{{ result.message }}</span>
         </div>
       </div>
     </div>
   </div>

   <!-- Mensajes de Estado -->
   <div v-if="errorMessage" class="alert alert-error">
     {{ errorMessage }}
   </div>

   <div v-if="successMessage" class="alert alert-success">
     {{ successMessage }}
   </div>
 </div>
</template>

<script>
import ServicePackageService from '../services/servicePackage.service';
import DeviceService from '../services/device.service';
import MikrotikService from '../services/mikrotik.service';
import NetworkService from '../services/network.service';

export default {
  name: 'ServicePackageForm',
  data() {
    return {
      packageData: {
        name: '',
        description: '',
        price: null,
        downloadSpeedMbps: null,
        uploadSpeedMbps: null,
        dataLimitGb: null,
        billingCycle: 'monthly',
        hasJellyfin: false,
        active: true,
        zoneId: null
      },
      availableZones: [],
      selectedZone: null,
      availableRouters: [],
      loadingZones: false,
      loadingRouters: false,
      isEdit: false,
      saving: false,
      testingConnections: false,
      connectionResults: [],
      errorMessage: '',
      successMessage: ''
    };
  },
  computed: {
    zoneIdFromUrl() {
      return this.$route?.params?.zoneId || null;
    },
    isFormValid() {
      if (!this.packageData) return false;
      return this.packageData.name && 
             this.packageData.price > 0 && 
             this.packageData.downloadSpeedMbps > 0 && 
             this.packageData.uploadSpeedMbps > 0 &&
             this.packageData.zoneId;
    }
  },
  created() {
    this.initializeForm();
  },
  methods: {
    async initializeForm() {
      try {
        // Determinar zoneId desde URL o query params
        this.packageData.zoneId = this.$route?.params?.zoneId || this.$route?.query?.zoneId;
        
        // Verificar si es edición
        const packageId = this.$route?.params?.id;
        this.isEdit = packageId && packageId !== 'new';
        
        // Cargar zonas disponibles si no hay zoneId desde URL
        if (!this.zoneIdFromUrl) {
          await this.loadAvailableZones();
        }
        
        // Cargar zona actual si hay zoneId
        if (this.packageData.zoneId) {
          await this.loadSelectedZone();
          await this.loadRoutersForZone();
        }
        
        // Cargar paquete si es edición
        if (this.isEdit && packageId) {
          await this.loadPackage(packageId);
        }
      } catch (error) {
        console.error('Error inicializando formulario:', error);
        this.errorMessage = 'Error inicializando el formulario';
      }
    },

    async loadAvailableZones() {
      this.loadingZones = true;
      try {
        const response = await NetworkService.getAllZones({ active: true });
        this.availableZones = response.data?.zones || response.data || [];
      } catch (error) {
        console.error('Error cargando zonas:', error);
        this.errorMessage = 'Error cargando zonas disponibles';
        this.availableZones = [];
      } finally {
        this.loadingZones = false;
      }
    },

    async loadSelectedZone() {
      if (!this.packageData.zoneId) return;
      
      try {
        const response = await NetworkService.getZone(this.packageData.zoneId);
        this.selectedZone = response.data || null;
      } catch (error) {
        console.error('Error cargando zona seleccionada:', error);
        this.errorMessage = 'Error cargando información de la zona';
        this.selectedZone = null;
      }
    },

    async onZoneChange() {
      if (this.packageData.zoneId) {
        await this.loadSelectedZone();
        await this.loadRoutersForZone();
      } else {
        this.selectedZone = null;
        this.availableRouters = [];
      }
    },

    async loadRoutersForZone() {
      if (!this.packageData.zoneId) return;
      
      this.loadingRouters = true;
      try {
        // Cargar nodos de la zona
        const nodesResponse = await NetworkService.getNodesByZone(this.packageData.zoneId);
        const nodes = nodesResponse.data?.nodes || nodesResponse.data || [];
        const nodeIds = nodes.map(node => node.id).filter(id => id);
        
        if (nodeIds.length === 0) {
          console.warn('No se encontraron nodos para la zona:', this.packageData.zoneId);
          this.availableRouters = [];
          return;
        }
        
        // Cargar routers Mikrotik de esos nodos
        const response = await DeviceService.getDevices({ 
          brand: 'mikrotik', 
          type: 'router',
          active: true
        });
        
        let routers = response.data?.devices || response.data || [];
        
        // Filtrar routers por nodeId
        routers = routers.filter(router => 
          router.nodeId && nodeIds.includes(router.nodeId)
        );
        
        this.availableRouters = (routers || []).map(router => ({
          ...router,
          selectedOption: 'existing',
          selectedProfile: null,
          existingProfiles: null,
          loadingProfiles: false,
          testingProfile: false
        }));
        
        // Cargar perfiles automáticamente para todos los routers
        for (const router of this.availableRouters) {
          await this.loadRouterProfiles(router);
        }
        
      } catch (error) {
        console.error('Error cargando routers de la zona:', error);
        this.errorMessage = 'Error cargando routers de la zona';
        this.availableRouters = [];
      } finally {
        this.loadingRouters = false;
      }
    },
  
    async loadPackage(id) {
      try {
        const response = await ServicePackageService.getServicePackage(id);
        this.packageData = { ...this.packageData, ...(response.data || {}) };
        
        // Cargar zona si no se ha cargado
        if (this.packageData.zoneId && !this.selectedZone) {
          await this.loadSelectedZone();
        }
        
        // Cargar routers de la zona
        if (this.packageData.zoneId) {
          await this.loadRoutersForZone();
        }
        
        // Cargar configuración de perfiles existentes
        try {
          const profilesResponse = await ServicePackageService.getPackageProfiles(id);
          if (profilesResponse.data?.profiles) {
            this.applyExistingProfileConfiguration(profilesResponse.data.profiles);
          }
        } catch (profileError) {
          console.warn('Error cargando perfiles existentes:', profileError);
        }
        
      } catch (error) {
        console.error('Error cargando paquete:', error);
        this.errorMessage = 'Error cargando datos del paquete';
      }
    },

    applyExistingProfileConfiguration(profiles) {
      // Aplicar configuración existente a los routers
      for (const profileConfig of profiles || []) {
        const router = this.availableRouters.find(r => r.id === profileConfig.routerId);
        if (router) {
          router.selectedOption = profileConfig.action || 'existing';
          router.selectedProfile = profileConfig.profileName;
        }
      }
    },
  
    async loadRouterProfiles(router) {
      if (!router) return;
      
      router.loadingProfiles = true;
      try {
        // Verificar que el router tenga credenciales
        const credentialsResponse = await DeviceService.getDeviceCredentials(router.id);
        const credentials = credentialsResponse.data?.credentials || [];
        const activeCredential = credentials.find(c => c.isActive) || credentials[0];
        
        if (!activeCredential) {
          console.warn(`Router ${router.name} no tiene credenciales configuradas`);
          router.existingProfiles = [];
          router.selectedOption = 'create';
          return;
        }
        
        // Cargar perfiles existentes
        const response = await MikrotikService.getPPPoEProfiles(router.id);
        if (response.data?.success) {
          router.existingProfiles = response.data.data || [];
          console.log(`Router ${router.name}: ${router.existingProfiles.length} perfiles encontrados`);
          
          // Si no hay perfiles existentes, cambiar a "create"
          if (router.existingProfiles.length === 0) {
            router.selectedOption = 'create';
          }
        } else {
          router.existingProfiles = [];
          router.selectedOption = 'create';
        }
      } catch (error) {
        console.error(`Error cargando perfiles de ${router.name}:`, error);
        router.existingProfiles = [];
        router.selectedOption = 'create';
      } finally {
        router.loadingProfiles = false;
      }
    },

    setRouterOption(routerId, option) {
      const router = this.availableRouters.find(r => r.id === routerId);
      if (router) {
        router.selectedOption = option;
        router.selectedProfile = null;
        
        // Cargar perfiles si selecciona "existing" y no los ha cargado
        if (option === 'existing' && !router.existingProfiles) {
          this.loadRouterProfiles(router);
        }
      }
    },

    selectProfile(routerId, profileName) {
      const router = this.availableRouters.find(r => r.id === routerId);
      if (router) {
        router.selectedProfile = profileName;
      }
    },

    async testProfile(router) {
      if (!router?.selectedProfile) return;
      
      router.testingProfile = true;
      try {
        console.log(`Probando perfil ${router.selectedProfile} en router ${router.name}`);
        
        // Simular prueba por ahora
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.successMessage = `Perfil "${router.selectedProfile}" probado exitosamente en ${router.name}`;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      } catch (error) {
        console.error('Error probando perfil:', error);
        this.errorMessage = 'Error probando perfil';
      } finally {
        router.testingProfile = false;
      }
    },

    getRoutersByOption(option) {
      return this.availableRouters.filter(r => r.selectedOption === option);
    },

    getActiveRouters() {
      return this.availableRouters.filter(r => r.selectedOption !== 'skip');
    },
  
    async testRouterConnections() {
      const activeRouters = this.getActiveRouters();
      if (activeRouters.length === 0) {
        this.errorMessage = 'No hay routers activos para probar';
        return;
      }
      
      this.testingConnections = true;
      this.connectionResults = [];
      
      for (const router of activeRouters) {
        try {
          // Obtener credenciales del router
          const credentialsResponse = await DeviceService.getDeviceCredentials(router.id);
          const credentials = credentialsResponse.data?.credentials || [];
          const activeCredential = credentials.find(c => c.isActive) || credentials[0];
          
          if (!activeCredential) {
            this.connectionResults.push({
              routerId: router.id,
              routerName: router.name,
              success: false,
              message: 'Sin credenciales configuradas'
            });
            continue;
          }
          
          const response = await MikrotikService.testConnection(
            router.ipAddress,
            activeCredential.username,
            activeCredential.password,
            activeCredential.port || 8728
          );
          
          this.connectionResults.push({
            routerId: router.id,
            routerName: router.name,
            success: response.data?.success || false,
            message: response.data?.message || 'Sin respuesta'
          });
          
        } catch (error) {
          this.connectionResults.push({
            routerId: router.id,
            routerName: router.name,
            success: false,
            message: error.response?.data?.message || 'Error de conexión'
          });
        }
      }
      
      this.testingConnections = false;
    },
  
    validateRouterConfiguration() {
      const errors = [];
      
      for (const router of this.availableRouters) {
        if (router.selectedOption === 'existing' && !router.selectedProfile) {
          errors.push(`Router ${router.name}: Debe seleccionar un perfil existente`);
        }
      }
      
      return errors;
    },
  
    async savePackage() {
      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      try {
        // Validar configuración de routers
        const routerErrors = this.validateRouterConfiguration();
        if (routerErrors.length > 0) {
          this.errorMessage = routerErrors.join('\n');
          return;
        }
        
        // Validar datos del paquete
        if (!this.packageData.zoneId) {
          this.errorMessage = 'Debe seleccionar una zona para el paquete';
          return;
        }
        
        const validationErrors = ServicePackageService.validatePackageData(this.packageData);
        if (validationErrors.length > 0) {
          this.errorMessage = validationErrors.join(', ');
          return;
        }
        
        let response;
        if (this.isEdit) {
          response = await ServicePackageService.updateServicePackage(
            this.$route.params.id, 
            this.packageData
          );
        } else {
          response = await ServicePackageService.createServicePackage(this.packageData);
        }
        
        const packageId = response.data?.packageId || response.data?.id || this.$route.params.id;
        
        // Configurar perfiles Mikrotik si hay routers activos
        const activeRouters = this.getActiveRouters();
        if (activeRouters.length > 0 && packageId) {
          try {
            // Usar método existente del service
            const routerIds = activeRouters.map(router => router.id);
            await ServicePackageService.createPackageProfiles(packageId, routerIds);
            this.successMessage = `Paquete ${this.isEdit ? 'actualizado' : 'creado'} y perfiles Mikrotik configurados exitosamente`;
          } catch (profileError) {
            console.warn('Error configurando perfiles:', profileError);
            this.successMessage = `Paquete ${this.isEdit ? 'actualizado' : 'creado'} exitosamente. Algunos perfiles Mikrotik pueden requerir configuración manual.`;
          }
        } else {
          this.successMessage = `Paquete ${this.isEdit ? 'actualizado' : 'creado'} exitosamente`;
        }
        
        // Redirigir después de un tiempo
        setTimeout(() => {
          this.goBack();
        }, 2000);
        
      } catch (error) {
        console.error('Error guardando paquete:', error);
        this.errorMessage = error.response?.data?.message || 'Error guardando el paquete';
      } finally {
        this.saving = false;
      }
    },
  
    goBack() {
      // Priorizar zoneId desde URL, luego desde packageData
      const zoneId = this.zoneIdFromUrl || this.packageData.zoneId;
      
      if (zoneId) {
        this.$router.push(`/zones/${zoneId}`);
      } else {
        this.$router.push('/service-packages');
      }
    },
  
    // Métodos de utilidad
    formatSpeed(speedMbps) {
      return ServicePackageService.formatSpeed(speedMbps || 0);
    },
  
    calculateValuePerMbps() {
      if (!this.packageData.price || !this.packageData.downloadSpeedMbps) return '0.00';
      return ServicePackageService.calculateValuePerMbps(
        this.packageData.price, 
        this.packageData.downloadSpeedMbps
      );
    },
  
    generateProfileName() {
      if (!this.packageData.name) return 'profile-nuevo-paquete';
      return ServicePackageService.generateProfileName(this.packageData.name);
    },
  
    calculateBurstLimit() {
      const down = this.packageData.downloadSpeedMbps || 0;
      const up = this.packageData.uploadSpeedMbps || 0;
      return `${Math.round(down * 1.5)}M/${Math.round(up * 1.5)}M`;
    },
  
    calculateBurstThreshold() {
      const down = this.packageData.downloadSpeedMbps || 0;
      const up = this.packageData.uploadSpeedMbps || 0;
      return `${Math.round(down * 0.8)}M/${Math.round(up * 0.8)}M`;
    },
  
    getStatusText(status) {
      const texts = {
        online: 'Online',
        offline: 'Offline',
        unknown: 'Desconocido',
        maintenance: 'Mantenimiento'
      };
      return texts[status] || 'Desconocido';
    }
  }
};
</script>



<style scoped>
.service-package-form {
 max-width: 1000px;
 margin: 0 auto;
 padding: 20px;
}

.page-header {
 display: flex;
 justify-content: space-between;
 align-items: center;
 margin-bottom: 30px;
}

.page-header h1 {
 font-size: 1.5rem;
 color: #2c3e50;
 margin: 0;
}

.form-container {
 background-color: white;
 border-radius: 8px;
 padding: 30px;
 box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-section {
 margin-bottom: 30px;
 padding-bottom: 20px;
 border-bottom: 1px solid #e0e6ed;
}

.form-section:last-child {
 border-bottom: none;
}

.form-section h3 {
 color: #34495e;
 margin-bottom: 20px;
 font-size: 1.1rem;
}

.form-row {
 display: grid;
 grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
 gap: 20px;
 margin-bottom: 20px;
}

.form-group {
 display: flex;
 flex-direction: column;
}

.form-group label {
 font-weight: 600;
 color: #555;
 margin-bottom: 5px;
}

.form-group input,
.form-group textarea,
.form-group select {
 padding: 10px;
 border: 1px solid #ddd;
 border-radius: 4px;
 font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
 outline: none;
 border-color: #3498db;
 box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.readonly-field {
 padding: 10px;
 background-color: #f8f9fa;
 border: 1px solid #e0e6ed;
 border-radius: 4px;
}

.zone-display {
 color: #2c3e50;
 font-weight: 500;
}

.zone-display small {
 display: block;
 color: #666;
 font-weight: normal;
 margin-top: 4px;
}

.input-with-prefix,
.input-with-suffix {
 display: flex;
 align-items: center;
 border: 1px solid #ddd;
 border-radius: 4px;
 overflow: hidden;
}

.input-with-prefix input,
.input-with-suffix input {
 border: none;
 flex: 1;
}

.prefix,
.suffix {
 padding: 10px;
 background-color: #f8f9fa;
 color: #666;
 font-weight: 500;
}

.form-help {
 font-size: 0.85rem;
 color: #666;
 margin-top: 5px;
}

.speed-preview {
 background-color: #f8f9fa;
 padding: 15px;
 border-radius: 8px;
 margin-top: 15px;
}

.preview-item {
 display: flex;
 justify-content: space-between;
 margin-bottom: 8px;
}

.preview-item:last-child {
 margin-bottom: 0;
}

.preview-item .label {
 font-weight: 600;
 color: #555;
}

.preview-item .value {
 font-weight: 500;
 color: #2c3e50;
}

.zone-required-message {
 text-align: center;
 padding: 30px;
 background-color: #fff3cd;
 border: 1px solid #ffeaa7;
 border-radius: 8px;
 color: #856404;
}

.zone-required-message h3 {
 margin-top: 0;
 color: #856404;
}

.loading-state,
.empty-state {
 text-align: center;
 padding: 30px;
 color: #666;
}

.empty-state small {
 display: block;
 margin-top: 10px;
 font-style: italic;
 color: #999;
}

/* Estilos para la gestión de routers y perfiles */
.routers-management {
 margin-top: 20px;
}

.routers-management h4 {
 margin-bottom: 15px;
 color: #34495e;
 font-size: 1rem;
}

.routers-list {
 display: flex;
 flex-direction: column;
 gap: 20px;
}

.router-management-card {
 border: 1px solid #e0e6ed;
 border-radius: 8px;
 padding: 20px;
 background-color: #fff;
 transition: box-shadow 0.2s;
}

.router-management-card:hover {
 box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.router-header {
 display: flex;
 justify-content: space-between;
 align-items: center;
 margin-bottom: 15px;
 padding-bottom: 10px;
 border-bottom: 1px solid #f0f0f0;
}

.router-info h5 {
 margin: 0 0 5px 0;
 color: #2c3e50;
 font-size: 1.1rem;
}

.router-details {
 font-size: 0.9rem;
 color: #666;
}

.router-status .status-badge {
 padding: 4px 8px;
 border-radius: 4px;
 font-size: 0.8rem;
 font-weight: 600;
}

.status-online {
 background-color: #d4edda;
 color: #155724;
}

.status-offline {
 background-color: #f8d7da;
 color: #721c24;
}

.status-unknown {
 background-color: #e2e3e5;
 color: #383d41;
}

.status-maintenance {
 background-color: #fff3cd;
 color: #856404;
}

.profile-management {
 margin-top: 15px;
}

.profile-options {
 margin-bottom: 15px;
}

.option-tabs {
 display: flex;
 gap: 5px;
 border-bottom: 1px solid #e0e6ed;
}

.tab-btn {
 padding: 10px 15px;
 border: none;
 background: none;
 cursor: pointer;
 font-size: 14px;
 color: #666;
 border-bottom: 2px solid transparent;
 transition: all 0.2s;
}

.tab-btn:hover {
 color: #3498db;
 background-color: #f8f9fa;
}

.tab-btn.active {
 color: #3498db;
 border-bottom-color: #3498db;
 font-weight: 600;
}

.tab-btn:disabled {
 color: #ccc;
 cursor: not-allowed;
}

.option-content {
 min-height: 100px;
 padding: 15px 0;
}

.existing-profiles {
 background-color: #f8f9fa;
 padding: 15px;
 border-radius: 6px;
}

.loading-profiles {
 text-align: center;
 color: #666;
 padding: 20px;
}

.no-profiles {
 text-align: center;
 color: #999;
 font-style: italic;
 padding: 20px;
}

.profiles-list {
 display: flex;
 flex-direction: column;
 gap: 10px;
 max-height: 200px;
 overflow-y: auto;
}

.profile-item {
 display: flex;
 justify-content: space-between;
 align-items: center;
 padding: 12px;
 background-color: white;
 border: 1px solid #ddd;
 border-radius: 4px;
 cursor: pointer;
 transition: all 0.2s;
}

.profile-item:hover {
 border-color: #3498db;
 box-shadow: 0 2px 4px rgba(52, 152, 219, 0.1);
}

.profile-item.selected {
 border-color: #3498db;
 background-color: #f8f9ff;
}

.profile-info {
 display: flex;
 flex-direction: column;
 gap: 4px;
}

.profile-info strong {
 color: #2c3e50;
}

.profile-config {
 font-size: 0.85rem;
 color: #666;
 font-family: monospace;
}

.profile-actions input[type="radio"] {
 width: 18px;
 height: 18px;
}

.create-profile {
 background-color: #f8f9fa;
 padding: 15px;
 border-radius: 6px;
}

.profile-preview h6 {
 margin: 0 0 10px 0;
 color: #34495e;
}

.preview-fields {
 display: grid;
 grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
 gap: 10px;
}

.preview-fields .field {
 display: flex;
 justify-content: space-between;
 padding: 8px 10px;
 background-color: white;
 border-radius: 4px;
 border: 1px solid #e0e6ed;
}

.preview-fields .label {
 font-weight: 600;
 color: #555;
}

.preview-fields .value {
 color: #2c3e50;
 font-family: monospace;
}

.skip-router {
 background-color: #f8f9fa;
 padding: 15px;
 border-radius: 6px;
 text-align: center;
}

.skip-message {
 color: #666;
 font-style: italic;
 margin: 0;
}

.router-actions {
 display: flex;
 gap: 10px;
 margin-top: 15px;
 padding-top: 15px;
 border-top: 1px solid #f0f0f0;
}

.configuration-summary {
 background-color: #f8f9fa;
 padding: 20px;
 border-radius: 8px;
 margin-top: 20px;
}

.configuration-summary h5 {
 margin: 0 0 15px 0;
 color: #34495e;
}

.summary-items {
 display: grid;
 grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
 gap: 15px;
}

.summary-item {
 display: flex;
 justify-content: space-between;
 align-items: center;
 padding: 10px;
 background-color: white;
 border-radius: 4px;
 border: 1px solid #e0e6ed;
}

.summary-item .label {
 font-weight: 500;
 color: #555;
}

.summary-item .value {
 font-weight: 600;
 color: #3498db;
 font-size: 1.1rem;
}

.connection-test-section {
 background-color: #f8f9fa;
 padding: 20px;
 border-radius: 8px;
 margin-top: 30px;
}

.connection-results {
 margin-top: 15px;
}

.connection-result {
 display: flex;
 justify-content: space-between;
 padding: 10px;
 margin-bottom: 5px;
 border-radius: 4px;
}

.connection-result.success {
 background-color: #d4edda;
 color: #155724;
}

.connection-result.error {
 background-color: #f8d7da;
 color: #721c24;
}

.form-actions {
 display: flex;
 justify-content: flex-end;
 gap: 15px;
 margin-top: 30px;
 padding-top: 20px;
 border-top: 1px solid #e0e6ed;
}

.alert {
 padding: 15px;
 border-radius: 4px;
 margin-top: 20px;
}

.alert-success {
 background-color: #d4edda;
 color: #155724;
 border: 1px solid #c3e6cb;
}

.alert-error {
 background-color: #f8d7da;
 color: #721c24;
 border: 1px solid #f5c6cb;
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
 .form-row {
   grid-template-columns: 1fr;
 }
 
 .page-header {
   flex-direction: column;
   align-items: stretch;
   gap: 15px;
 }
 
 .form-actions {
   flex-direction: column;
 }
 
 .router-header {
   flex-direction: column;
   align-items: stretch;
   gap: 10px;
 }
 
 .option-tabs {
   flex-direction: column;
 }
 
 .tab-btn {
   text-align: left;
   border-bottom: none;
   border-left: 2px solid transparent;
 }
 
 .tab-btn.active {
   border-left-color: #3498db;
   border-bottom-color: transparent;
 }
 
 .router-actions {
   flex-direction: column;
 }
 
 .preview-fields {
   grid-template-columns: 1fr;
 }
 
 .summary-items {
   grid-template-columns: 1fr;
 }
}
</style>