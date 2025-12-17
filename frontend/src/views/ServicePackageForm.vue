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

       <!-- Configuración de Suspensión -->
       <div class="form-section">
         <h3>Configuración de Suspensión de Usuarios PPPoE</h3>
         <p class="section-description">
           Configura cómo se debe manejar el usuario PPPoE cuando un cliente es suspendido por falta de pago.
         </p>

         <div class="form-group">
           <label>Acción al suspender usuario</label>
           <div class="radio-group">
             <label class="radio-option">
               <input
                 type="radio"
                 v-model="packageData.suspensionAction"
                 value="disable"
               />
               <div class="radio-content">
                 <strong>Desactivar Usuario</strong>
                 <small>El usuario PPPoE será deshabilitado (disabled) en MikroTik</small>
               </div>
             </label>

             <label class="radio-option">
               <input
                 type="radio"
                 v-model="packageData.suspensionAction"
                 value="move_pool"
               />
               <div class="radio-content">
                 <strong>Mover a Pool de Suspendidos</strong>
                 <small>El usuario PPPoE será movido a un pool específico para suspendidos</small>
               </div>
             </label>
           </div>
         </div>

         <!-- Campo para nombre del pool (solo visible si se selecciona move_pool) -->
         <div v-if="packageData.suspensionAction === 'move_pool'" class="form-group">
           <label for="suspendedPoolName">Nombre del Pool de Suspendidos *</label>
           <div class="input-with-button">
             <input
               type="text"
               id="suspendedPoolName"
               v-model="packageData.suspendedPoolName"
               :required="packageData.suspensionAction === 'move_pool'"
               placeholder="ej. pool-suspendidos"
             />
             <button
               type="button"
               @click="validatePoolName"
               :disabled="!packageData.suspendedPoolName || validatingPool"
               class="btn btn-small btn-outline"
             >
               {{ validatingPool ? '⏳ Validando...' : '✓ Validar Pool' }}
             </button>
           </div>
           <small class="form-help">
             Este pool debe existir previamente en el MikroTik. Los usuarios suspendidos serán movidos a este pool.
           </small>
           <div v-if="poolValidationMessage" class="validation-message" :class="poolValidationStatus">
             {{ poolValidationMessage }}
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

               <!-- ✅ NUEVO: Alertas de perfiles vinculados -->
               <div v-if="router.linkedProfiles && router.linkedProfiles.length > 0" class="linked-profiles-alert">
                 <div class="alert-header">
                   <span class="alert-icon">⚠️</span>
                   <strong>Perfiles No Disponibles ({{ router.linkedProfiles.length }})</strong>
                 </div>
                 <div class="linked-profiles-list">
                   <div 
                     v-for="profile in router.linkedProfiles" 
                     :key="profile.profileId" 
                     class="linked-profile-item"
                   >
                     <span class="profile-name">{{ profile.name }}</span>
                     <span class="profile-speed">{{ profile.rateLimit }}</span>
                     <span class="profile-status">{{ profile.statusText }}</span>
                   </div>
                 </div>
                 <div class="alert-note">
                   <small>Estos perfiles ya están vinculados a otros paquetes y no pueden ser reutilizados.</small>
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
                       Cargando perfiles disponibles...
                     </div>
                     <div v-else-if="!router.existingProfiles || router.existingProfiles.length === 0" class="no-profiles">
                       <p>No hay perfiles disponibles en este router</p>
                       <small>Todos los perfiles están vinculados a otros paquetes</small>
                     </div>
                     <div v-else class="profiles-list">
                       <div class="profiles-header">
                         <h6>Seleccionar Perfil Disponible ({{ router.existingProfiles.length }})</h6>
                       </div>
                       <div 
                         v-for="profile in router.existingProfiles" 
                         :key="profile.profileId"
                         class="profile-item"
                         :class="{ selected: router.selectedProfile === profile.name }"
                         @click="selectProfile(router.id, profile.name, profile.profileId)"
                       >
                         <div class="profile-info">
                           <div class="profile-main">
                             <strong>{{ profile.name }}</strong>
                             <span class="profile-id">({{ profile.profileId }})</span>
                           </div>
                           <div class="profile-details">
                             <span class="profile-speed">{{ profile.rateLimit || 'Sin límite' }}</span>
                             <span class="profile-status-badge available">✅ Disponible</span>
                           </div>
                           <div v-if="profile.localAddress || profile.dnsServer" class="profile-extra">
                             <span v-if="profile.localAddress" class="extra-info">IP: {{ profile.localAddress }}</span>
                             <span v-if="profile.dnsServer" class="extra-info">DNS: {{ profile.dnsServer }}</span>
                           </div>
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
       zoneId: null,
       suspensionAction: 'disable',
       suspendedPoolName: null
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
     validatingPool: false,
     poolValidationMessage: '',
     poolValidationStatus: '',
     errorMessage: '',
     successMessage: ''
   };
 },
 computed: {
   zoneIdFromUrl() {
     return this.$route?.params?.zoneId || this.$route?.query?.zoneId || null;
   },
   isFormValid() {
     if (!this.packageData) return false;
     const hasBasicData = this.packageData.name && 
                         this.packageData.price > 0 && 
                         this.packageData.downloadSpeedMbps > 0 && 
                         this.packageData.uploadSpeedMbps > 0;
     
     const hasZone = this.packageData.zoneId || this.zoneIdFromUrl;
     
     return hasBasicData && hasZone;
   }
 },
 created() {
   this.initializeForm();
 },
 methods: {
   async initializeForm() {
     try {
       console.log('=== INICIALIZANDO FORMULARIO ===');
       console.log('$route completa:', this.$route);
       
       // Obtener zoneId de múltiples fuentes
       const zoneIdFromParams = this.$route?.params?.zoneId;
       const zoneIdFromQuery = this.$route?.query?.zoneId;
       const zoneIdFromPath = this.extractZoneIdFromPath();
       
       const detectedZoneId = zoneIdFromParams || zoneIdFromQuery || zoneIdFromPath;
       
       if (detectedZoneId) {
         this.packageData.zoneId = parseInt(detectedZoneId);
         console.log('✅ ZoneId detectado:', this.packageData.zoneId);
       }
       
       // Verificar si es edición
       const packageId = this.$route?.params?.id;
       this.isEdit = packageId && packageId !== 'new';
       console.log('Es edición:', this.isEdit, 'Package ID:', packageId);
       
       // Cargar zonas disponibles si no hay zoneId desde URL
       if (!detectedZoneId) {
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
       
       console.log('=== INICIALIZACIÓN COMPLETADA ===');
       
     } catch (error) {
       console.error('Error inicializando formulario:', error);
       this.errorMessage = 'Error inicializando el formulario: ' + error.message;
     }
   },

   extractZoneIdFromPath() {
     const path = this.$route?.path || '';
     const zoneMatch = path.match(/\/zones\/(\d+)\//);
     return zoneMatch ? zoneMatch[1] : null;
   },

   async loadAvailableZones() {
     this.loadingZones = true;
     try {
       const response = await NetworkService.getAllZones({ active: true });
       this.availableZones = response.data?.zones || response.data || [];
       console.log('Zonas cargadas:', this.availableZones.length);
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
       console.log('Cargando zona:', this.packageData.zoneId);
       const response = await NetworkService.getZone(this.packageData.zoneId);
       this.selectedZone = response.data || null;
       console.log('Zona cargada:', this.selectedZone);
     } catch (error) {
       console.error('Error cargando zona seleccionada:', error);
       this.errorMessage = 'Error cargando información de la zona';
       this.selectedZone = null;
     }
   },

   async onZoneChange() {
     console.log('Zona cambiada a:', this.packageData.zoneId);
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
       console.log('Cargando routers para zona:', this.packageData.zoneId);
       
       const response = await DeviceService.getAllDevices({ 
         brand: 'mikrotik', 
         type: 'router',
         active: true
       });
       
       let allRouters = response.data?.devices || response.data || [];
       console.log('Todos los routers Mikrotik:', allRouters.length);
       
       const routersWithNodes = allRouters.filter(router => router.nodeId);
       console.log('Routers con nodeId:', routersWithNodes.length);
       
       const validRouters = [];
       
       for (const router of routersWithNodes) {
         try {
           const nodeResponse = await NetworkService.getNode(router.nodeId);
           const node = nodeResponse.data || {};
           
           if (node.zoneId && node.zoneId == this.packageData.zoneId) {
             validRouters.push({
               ...router,
               Node: { id: node.id, name: node.name }
             });
           }
         } catch (nodeError) {
           console.warn(`Error verificando nodo ${router.nodeId}:`, nodeError);
         }
       }
       
       console.log('Routers válidos para la zona:', validRouters.length);
       
       // Configurar routers con opciones por defecto
       this.availableRouters = validRouters.map(router => ({
         ...router,
         selectedOption: 'existing',
         selectedProfile: null,
         selectedProfileId: null,
         existingProfiles: null,
         loadingProfiles: false,
         testingProfile: false
       }));
       
       // Cargar perfiles automáticamente
       for (const router of this.availableRouters) {
         await this.loadRouterProfiles(router);
       }
       
     } catch (error) {
       console.error('Error cargando routers de la zona:', error);
       this.errorMessage = `Error cargando routers de la zona: ${error.message}`;
       this.availableRouters = [];
     } finally {
       this.loadingRouters = false;
     }
   },

async loadPackage(id) {
  try {
    console.log('Cargando paquete:', id);
    const response = await ServicePackageService.getServicePackage(id);
    
    if (response.data.success) {
      // ✅ CORREGIR: La estructura es response.data.data, no response.data.package
      const packageData = response.data.data; // El paquete está en response.data.data
      
      // Asignar datos del paquete (excluyendo relaciones)
      this.packageData = {
        ...this.packageData,
        id: packageData.id,
        name: packageData.name,
        description: packageData.description,
        price: parseFloat(packageData.price),
        downloadSpeedMbps: packageData.downloadSpeedMbps,
        uploadSpeedMbps: packageData.uploadSpeedMbps,
        dataLimitGb: packageData.dataLimitGb,
        billingCycle: packageData.billingCycle,
        hasJellyfin: packageData.hasJellyfin || false,
        active: packageData.active,
        zoneId: packageData.zoneId,
        suspensionAction: packageData.suspensionAction || 'disable',
        suspendedPoolName: packageData.suspendedPoolName || null
      };
      
      console.log('Paquete cargado:', this.packageData);
      
      // ✅ CARGAR ZONA desde la respuesta
      if (packageData.Zone) {
        this.selectedZone = packageData.Zone;
        console.log('Zona cargada desde respuesta:', this.selectedZone);
      } else if (this.packageData.zoneId && !this.selectedZone) {
        await this.loadSelectedZone();
      }
      
      // Cargar routers de la zona
      if (this.packageData.zoneId) {
        await this.loadRoutersForZone();
        
        // ✅ APLICAR CONFIGURACIÓN DE PERFILES MIKROTIK EXISTENTES
        if (packageData.MikrotikProfiles && packageData.MikrotikProfiles.length > 0) {
          this.applyExistingMikrotikProfiles(packageData.MikrotikProfiles);
        }
      }
      
    } else {
      console.error('Error en respuesta:', response.data);
      this.errorMessage = response.data.message || 'Error cargando paquete';
    }
    
  } catch (error) {
    console.error('Error cargando paquete:', error);
    this.errorMessage = 'Error cargando datos del paquete';
  }
},


applyExistingMikrotikProfiles(mikrotikProfiles) {
  console.log('🔧 [DEBUG] === APLICANDO PERFILES EXISTENTES ===');
  console.log('🔧 [DEBUG] MikrotikProfiles recibidos:', mikrotikProfiles.length);
  
  if (mikrotikProfiles.length === 0) {
    console.log('⚠️ [DEBUG] NO HAY PERFILES EXISTENTES - Este es el problema del paquete 6');
    return;
  }
  
  for (const profileConfig of mikrotikProfiles) {
    console.log('🔧 [DEBUG] Procesando perfil:', profileConfig);
    
    const router = this.availableRouters.find(r => r.id === profileConfig.mikrotikRouterId);
    if (router) {
      router.selectedOption = 'existing';
      router.selectedProfile = profileConfig.profileName;
      router.selectedProfileId = profileConfig.profileId;
      
      console.log(`🔧 [DEBUG] Router ${router.name} configurado:`, {
        selectedOption: router.selectedOption,
        selectedProfile: router.selectedProfile,
        selectedProfileId: router.selectedProfileId
      });
    } else {
      console.warn(`⚠️ [DEBUG] Router ID ${profileConfig.mikrotikRouterId} NO encontrado en availableRouters`);
    }
  }
  
  console.log('🔧 [DEBUG] === FIN APLICAR PERFILES EXISTENTES ===');
},

// EN: ServicePackageForm.vue - MÉTODO ACTUALIZADO
async loadRouterProfiles(router) {
  if (!router) return;
  
  router.loadingProfiles = true;
  try {
    console.log(`🔄 Cargando perfiles desde BD para router ${router.name}`);
    
    // ✅ NUEVO: Usar la ruta que consulta BD + Mikrotik
    const response = await DeviceService.getDeviceProfilesFromDB(router.id);



    if (response.data?.success) {
      const allProfiles = response.data.data;
      
      // ✅ FILTRAR: Solo perfiles disponibles para selección
      const availableProfiles = allProfiles.filter(profile => profile.isAvailable);
      const linkedProfiles = allProfiles.filter(profile => profile.isLinked);
      
      router.existingProfiles = availableProfiles;
      router.linkedProfiles = linkedProfiles; // Para mostrar alertas
      router.totalProfiles = allProfiles.length;
      
      console.log(`✅ Router ${router.name}:`, {
        total: allProfiles.length,
        available: availableProfiles.length,
        linked: linkedProfiles.length
      });
      
      // ✅ MOSTRAR INFORMACIÓN EN CONSOLA
      if (linkedProfiles.length > 0) {
        console.log(`🔒 Perfiles vinculados en ${router.name}:`, 
          linkedProfiles.map(p => `${p.name} -> ${p.statusText}`)
        );
      }
      
      if (availableProfiles.length === 0) {
        router.selectedOption = 'create';
        console.warn(`⚠️ Router ${router.name}: No hay perfiles disponibles`);
      } else {
        router.selectedOption = 'existing';
      }
    } else {
      console.error(`❌ Error en respuesta de ${router.name}:`, response.data);
      router.existingProfiles = [];
      router.linkedProfiles = [];
      router.selectedOption = 'create';
    }
  } catch (error) {
    console.error(`❌ Error cargando perfiles de ${router.name}:`, error);
    router.existingProfiles = [];
    router.linkedProfiles = [];
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
       router.selectedProfileId = null;
       
       if (option === 'existing' && !router.existingProfiles) {
         this.loadRouterProfiles(router);
       }
     }
   },

// EN: ServicePackageForm.vue - MÉTODO ACTUALIZADO
selectProfile(routerId, profileName, profileId) {
  const router = this.availableRouters.find(r => r.id === routerId);
  if (router && router.existingProfiles) {
    const selectedProfile = router.existingProfiles.find(p => p.name === profileName);
    
    if (selectedProfile) {
      router.selectedProfile = profileName;
      router.selectedProfileId = profileId; // ✅ Usar el profileId correcto
      
      console.log(`✅ Perfil seleccionado en ${router.name}:`, {
        name: profileName,
        profileId: profileId,
        rateLimit: selectedProfile.rateLimit
      });
    }
  }
},

   async testProfile(router) {
     if (!router?.selectedProfile) return;
     
     router.testingProfile = true;
     try {
       console.log(`Probando perfil ${router.selectedProfile} (ID: ${router.selectedProfileId}) en router ${router.name}`);
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

// EN: ServicePackageForm.vue - Verificar buildProfileConfiguration
buildProfileConfiguration(activeRouters) {
  console.log('🔧 [DEBUG] === INICIANDO buildProfileConfiguration ===');
  console.log('🔧 [DEBUG] activeRouters recibidos:', activeRouters.length);
  
  const configs = activeRouters.map((router, index) => {
    console.log(`🔧 [DEBUG] Procesando router ${index + 1}:`, {
      id: router.id,
      name: router.name,
      selectedOption: router.selectedOption,
      selectedProfile: router.selectedProfile,
      selectedProfileId: router.selectedProfileId
    });
    
    const config = {
      mikrotikRouterId: router.id,
      routerName: router.name
    };
    
    if (router.selectedOption === 'existing') {
      console.log(`🔧 [DEBUG] Router ${router.name} - Modo EXISTENTE`);
      console.log(`🔧 [DEBUG] Perfiles disponibles:`, router.existingProfiles?.length || 0);
      
      const selectedProfile = router.existingProfiles?.find(p => p.name === router.selectedProfile);
      console.log(`🔧 [DEBUG] Perfil seleccionado encontrado:`, selectedProfile ? 'SÍ' : 'NO');
      
      if (selectedProfile) {
        console.log(`🔧 [DEBUG] Datos del perfil seleccionado:`, {
          name: selectedProfile.name,
          '.id': selectedProfile['.id'],
          'rate-limit': selectedProfile['rate-limit']
        });
      }
      
      config.useExistingProfile = true;
      config.profileId = router.selectedProfileId;
      config.profileName = router.selectedProfile;
      config.rateLimit = selectedProfile?.['rate-limit'] || null;
      config.burstLimit = selectedProfile?.['burst-limit'] || null;
      config.burstThreshold = selectedProfile?.['burst-threshold'] || null;
      config.burstTime = selectedProfile?.['burst-time'] || null;
      config.priority = selectedProfile?.priority || null;
      
      console.log(`🔧 [DEBUG] Configuración generada para ${router.name}:`, config);
      
    } else {
      console.log(`🔧 [DEBUG] Router ${router.name} - Modo CREAR NUEVO`);
      
      config.useExistingProfile = false;
      config.profileName = this.generateProfileName();
      config.rateLimit = `${this.packageData.downloadSpeedMbps}M/${this.packageData.uploadSpeedMbps}M`;
      config.burstLimit = this.calculateBurstLimit();
      config.burstThreshold = this.calculateBurstThreshold();
      config.burstTime = '8s/8s';
      config.priority = 8;
      
      console.log(`🔧 [DEBUG] Configuración generada para ${router.name}:`, config);
    }
    
    return config;
  });
  
  console.log('🔧 [DEBUG] === CONFIGURACIÓN FINAL COMPLETA ===');
  console.log('🔧 [DEBUG] Total de configuraciones:', configs.length);
  configs.forEach((config, index) => {
    console.log(`🔧 [DEBUG] Config ${index + 1}:`, JSON.stringify(config, null, 2));
  });
  console.log('🔧 [DEBUG] === FIN buildProfileConfiguration ===');
  
  return configs;
},


// EN: ServicePackageForm.vue - VERSIÓN SIMPLIFICADA Y CORREGIDA
async savePackage() {
  console.log('🚨 EJECUTANDO SAVEPACKAGE VERSIÓN FINAL CORREGIDA 🚨');
  this.saving = true;
  this.errorMessage = '';
  this.successMessage = '';
  
  try {
    // 1️⃣ Validaciones básicas
    const finalZoneId = this.packageData.zoneId || this.zoneIdFromUrl;
    if (!finalZoneId) {
      this.errorMessage = 'Debe seleccionar una zona para el paquete.';
      return;
    }
    
    const routerErrors = this.validateRouterConfiguration();
    if (routerErrors.length > 0) {
      this.errorMessage = routerErrors.join('\n');
      return;
    }
    
    // 2️⃣ Preparar datos del paquete (SIN perfiles)
    const packageDataToSend = {
      name: this.packageData.name?.trim(),
      description: this.packageData.description?.trim() || null,
      price: parseFloat(this.packageData.price),
      downloadSpeedMbps: parseInt(this.packageData.downloadSpeedMbps),
      uploadSpeedMbps: parseInt(this.packageData.uploadSpeedMbps),
      dataLimitGb: this.packageData.dataLimitGb ? parseInt(this.packageData.dataLimitGb) : null,
      billingCycle: this.packageData.billingCycle || 'monthly',
      hasJellyfin: Boolean(this.packageData.hasJellyfin),
      active: Boolean(this.packageData.active),
      zoneId: finalZoneId,
      suspensionAction: this.packageData.suspensionAction || 'disable',
      suspendedPoolName: this.packageData.suspensionAction === 'move_pool' ? this.packageData.suspendedPoolName?.trim() : null
    };
    
    console.log('📦 Datos del paquete a guardar:', packageDataToSend);
    
    let packageId;
    let response;
    
    // 3️⃣ Crear o actualizar SOLO el paquete (sin perfiles)
    if (this.isEdit) {
      console.log('✏️ Actualizando paquete existente...');
      response = await ServicePackageService.updateServicePackage(
        this.$route.params.id, 
        packageDataToSend
      );
      packageId = this.$route.params.id;
    } else {
      console.log('🆕 Creando paquete nuevo...');
      response = await ServicePackageService.createServicePackage(packageDataToSend);
      packageId = response.data?.data?.id;
    }
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error en operación del paquete');
    }
    
    console.log(`✅ Paquete ${this.isEdit ? 'actualizado' : 'creado'} exitosamente. ID: ${packageId}`);
    
    // 4️⃣ Procesar perfiles por separado (SOLO si hay routers activos)
    const activeRouters = this.getActiveRouters();
    
    if (activeRouters.length > 0) {
      console.log('🔧 Procesando perfiles Mikrotik...');
      await this.processProfilesForPackage(packageId, activeRouters);
    } else {
      console.log('📝 No hay routers activos para configurar perfiles');
    }
    
    // 5️⃣ Mensaje de éxito y redirección
    const profileCount = activeRouters.length;
    this.successMessage = profileCount > 0 
      ? `Paquete ${this.isEdit ? 'actualizado' : 'creado'} exitosamente con ${profileCount} perfiles Mikrotik configurados`
      : `Paquete ${this.isEdit ? 'actualizado' : 'creado'} exitosamente`;
    
    console.log('📋 Operación completada:', this.successMessage);
    
    setTimeout(() => {
      this.goBack();
    }, 2000);
    
  } catch (error) {
    console.error('❌ ERROR GENERAL EN SAVEPACKAGE:', error);
    this.errorMessage = error.response?.data?.message || `Error: ${error.message}`;
  } finally {
    this.saving = false;
  }
},

// ✅ NUEVO MÉTODO: Procesar perfiles por separado
async processProfilesForPackage(packageId, activeRouters) {
  try {
    console.log('🔧 [DEBUG] === INICIANDO processProfilesForPackage ===');
    console.log('🔧 [DEBUG] PackageId:', packageId);
    console.log('🔧 [DEBUG] ActiveRouters:', activeRouters.length);
    
    // Construir configuración de perfiles
    const profileConfiguration = this.buildProfileConfiguration(activeRouters);
    
    console.log('🔧 [DEBUG] === ENVIANDO AL BACKEND ===');
    console.log('🔧 [DEBUG] URL:', `service-packages/${packageId}/profiles`);
    console.log('🔧 [DEBUG] Payload completo:', JSON.stringify({
      profileConfigurations: profileConfiguration
    }, null, 2));
    
    // ✅ USAR SOLO createPackageProfiles (que maneja tanto crear como actualizar)
    const profilesResponse = await ServicePackageService.createPackageProfiles(
      packageId, 
      profileConfiguration
    );
    
    console.log('🔧 [DEBUG] === RESPUESTA DEL BACKEND ===');
    console.log('🔧 [DEBUG] Status:', profilesResponse.status);
    console.log('🔧 [DEBUG] Response data:', JSON.stringify(profilesResponse.data, null, 2));
    
    if (!profilesResponse.data.success) {
      console.warn('⚠️ [DEBUG] Advertencia en perfiles:', profilesResponse.data.message);
    } else {
      console.log('✅ [DEBUG] Perfiles procesados exitosamente');
    }
    
    return profilesResponse.data;
    
  } catch (error) {
    console.error('❌ [DEBUG] Error procesando perfiles:', error);
    console.error('❌ [DEBUG] Error response:', error.response?.data);
    return { success: false, error: error.message };
  }
},

   goBack() {
     const zoneId = this.zoneIdFromUrl || this.packageData.zoneId;
     
     if (zoneId) {
       this.$router.push(`/zones/${zoneId}`);
     } else {
       this.$router.push('/service-packages');
     }
   },
 
   // Métodos de utilidad
   formatSpeed(speedMbps) {
     if (!speedMbps) return '0 Mbps';
     return `${speedMbps} Mbps`;
   },
 
   calculateValuePerMbps() {
     if (!this.packageData.price || !this.packageData.downloadSpeedMbps) return '0.00';
     const value = this.packageData.price / this.packageData.downloadSpeedMbps;
     return value.toFixed(2);
   },
 
   generateProfileName() {
     if (!this.packageData.name) return 'profile-nuevo-paquete';
     return this.packageData.name
       .toLowerCase()
       .replace(/\s+/g, '-')
       .replace(/[^a-z0-9-]/g, '')
       .substring(0, 20);
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
   },

   async validatePoolName() {
     if (!this.packageData.suspendedPoolName || !this.packageData.zoneId) {
       return;
     }

     this.validatingPool = true;
     this.poolValidationMessage = '';
     this.poolValidationStatus = '';

     try {
       console.log('Validando pool:', this.packageData.suspendedPoolName, 'en zona:', this.packageData.zoneId);

       // Validar en todos los routers de la zona
       const poolName = this.packageData.suspendedPoolName.trim();
       let poolFoundCount = 0;
       let totalRouters = this.availableRouters.length;

       for (const router of this.availableRouters) {
         try {
           const response = await MikrotikService.getIPPools(router.id);

           if (response.data && response.data.pools) {
             const poolExists = response.data.pools.some(pool =>
               pool.name === poolName
             );

             if (poolExists) {
               poolFoundCount++;
             }
           }
         } catch (error) {
           console.warn(`Error verificando pool en router ${router.name}:`, error);
         }
       }

       if (poolFoundCount === 0) {
         this.poolValidationStatus = 'error';
         this.poolValidationMessage = `❌ El pool "${poolName}" no existe en ningún router de la zona`;
       } else if (poolFoundCount < totalRouters) {
         this.poolValidationStatus = 'warning';
         this.poolValidationMessage = `⚠️ El pool existe en ${poolFoundCount} de ${totalRouters} routers`;
       } else {
         this.poolValidationStatus = 'success';
         this.poolValidationMessage = `✅ El pool "${poolName}" existe en todos los routers (${totalRouters})`;
       }
     } catch (error) {
       console.error('Error validando pool:', error);
       this.poolValidationStatus = 'error';
       this.poolValidationMessage = '❌ Error al validar el pool: ' + error.message;
     } finally {
       this.validatingPool = false;
     }
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

/* EN: ServicePackageForm.vue - AGREGAR estilos */
.linked-profiles-alert {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: #856404;
}

.alert-icon {
  font-size: 1.2em;
}

.linked-profiles-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.linked-profile-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #f0d0a3;
}

.profile-name {
  font-weight: 600;
  color: #2c3e50;
}

.profile-speed {
  font-family: monospace;
  color: #666;
  font-size: 0.9em;
}

.profile-status {
  font-size: 0.85em;
  color: #856404;
}

.alert-note {
  color: #856404;
  font-style: italic;
}

.profiles-header h6 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1rem;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.profile-id {
  font-size: 0.8em;
  color: #999;
  font-family: monospace;
}

.profile-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.profile-status-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 600;
}

.profile-status-badge.available {
  background-color: #d4edda;
  color: #155724;
}

.profile-extra {
  display: flex;
  gap: 12px;
}

.extra-info {
  font-size: 0.8em;
  color: #666;
}

.no-profiles p {
  margin: 0 0 5px 0;
  color: #666;
}

.no-profiles small {
  color: #999;
  font-style: italic;
}

/* Estilos para configuración de suspensión */
.section-description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 20px;
  line-height: 1.5;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  border: 2px solid #e0e6ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: white;
}

.radio-option:hover {
  border-color: #3498db;
  background-color: #f8f9ff;
}

.radio-option input[type="radio"] {
  margin-top: 3px;
  margin-right: 12px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.radio-option input[type="radio"]:checked ~ .radio-content {
  color: #3498db;
}

.radio-option:has(input[type="radio"]:checked) {
  border-color: #3498db;
  background-color: #f8f9ff;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.15);
}

.radio-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.radio-content strong {
  color: #2c3e50;
  font-size: 1rem;
}

.radio-content small {
  color: #666;
  font-size: 0.85rem;
  line-height: 1.4;
}

/* Estilos para input con botón */
.input-with-button {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-with-button input {
  flex: 1;
}

.validation-message {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
}

.validation-message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.validation-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.validation-message.warning {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

</style>