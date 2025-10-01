// composables/useSubscriptionForm.js
import { ref, reactive, computed, watch } from 'vue'
import ClientService from '@/services/client.service'
import SubscriptionService from '@/services/subscription.service'
import ServicePackageService from '@/services/servicePackage.service'
import DeviceService from '@/services/device.service'
import MikrotikService from '@/services/mikrotik.service'
import MikrotikRouterService from '@/services/mikrotikRouter.service'
import NetworkService from '@/services/network.service'
import { useDebugLogger } from './useDebugLogger'

export function useSubscriptionForm(clientId, existingSubscription = null, subscriptionId = null) {
 const { logInfo, logWarn, logError, logDebug, logFormDataChange, logValidation } = useDebugLogger()

 // ===============================
 // ESTADOS PRINCIPALES
 // ===============================
 
 const loading = ref(false)
 const initialLoading = ref(true)
 const loadingMessage = ref('Inicializando formulario...')
 
 // Datos del cliente y suscripción actual
 const clientInfo = ref({})
 const currentSubscription = ref(existingSubscription)
 const currentNetworkConfig = ref(null)
 const currentMikrotikData = ref(null)
 
 // Datos disponibles para selección
 const availablePackages = ref([])
 const availableRouters = ref([])
 const availableIpPools = ref([])
 const availableZones = ref([])
 const availableNodes = ref([])
 
 // Errores y validaciones
 const validationErrors = ref([])
 const formWarnings = ref([])
 
 // Datos del formulario
 const formData = reactive({
   // Identificadores
   clientId: null,
   subscriptionId: null,
   
   // Ubicación (para cambios)
   newZoneId: null,
   newNodeId: null,
   
   // Servicio
   servicePackageId: null,
   
   // Configuración de red
   primaryRouterId: null,
   ipPoolId: null,
   
   // Configuración PPPoE
   pppoeConfig: {
     username: '',
     password: '',
     generateAuto: true
   },
   
   // Precios
   customPrice: null,
   promoDiscount: 0,
   
   // Facturación
   billingDay: 1,
   autoCreateBilling: true,
   
   // Observaciones
   notes: '',
   changeReason: '',
   
   // Flags internos
   preserveUserCredentials: false,
   forceRecreateUser: false
 })

 // ===============================
 // COMPUTED PROPERTIES
 // ===============================
 
 const operationType = computed(() => {
   // Agregar guards de seguridad
   if (!clientInfo.value || !formData) {
     return 'CREATE_NEW'
   }
   
   try {
     const result = detectOperationType(
       currentSubscription.value,
       formData,
       clientInfo.value
     )
     
     // Asegurar que retornamos un string válido
     return result || 'CREATE_NEW'
   } catch (error) {
     logWarn('⚠️ Error detectando tipo de operación:', error)
     return 'CREATE_NEW'
   }
 })

 const selectedPackage = computed(() => {
   if (!formData.servicePackageId || !Array.isArray(availablePackages.value)) {
     return null
   }
   return availablePackages.value.find(pkg => pkg.id == formData.servicePackageId) || null
 })

 const targetZoneId = computed(() => {
   return formData.newZoneId || clientInfo.value.zoneId
 })

 const targetNodeId = computed(() => {
   return formData.newNodeId || clientInfo.value.nodeId
 })

 const suggestedPPPoEUsername = computed(() => {
   if (!clientInfo.value.firstName || !clientInfo.value.lastName) return ''
   
   const firstName = clientInfo.value.firstName.toLowerCase().replace(/[^a-z]/g, '')
   const lastName = clientInfo.value.lastName.toLowerCase().replace(/[^a-z]/g, '')
   
   return `${firstName}${lastName.substring(0, 3)}`
 })

 const isFormValid = computed(() => {
   return validateForm() && validationErrors.value.length === 0
 })

 const hasLocationChange = computed(() => {
   return !!(formData.newZoneId || formData.newNodeId)
 })

 const requiresMikrotikRecreation = computed(() => {
   const opType = operationType.value
   return ['CHANGE_NODE', 'CHANGE_ZONE'].includes(opType) || formData.forceRecreateUser
 })

 // ===============================
 // DETECCIÓN DEL TIPO DE OPERACIÓN (MEJORADA)
 // ===============================
 
 const detectOperationType = (subscription, formData, clientInfo) => {
   logDebug('🔍 Detectando tipo de operación', {
     hasSubscription: !!subscription,
     hasZoneChange: !!formData?.newZoneId,
     hasNodeChange: !!formData?.newNodeId,
     clientInfo: {
       zoneId: clientInfo?.zoneId,
       nodeId: clientInfo?.nodeId
     },
     operationHint: window.currentOperationHint
   })

   // Sin suscripción = nueva
   if (!subscription) {
     logInfo('✅ Operación detectada: CREATE_NEW')
     return 'CREATE_NEW'
   }

   // ✅ USAR operationHint SI ESTÁ DISPONIBLE
   if (window.currentOperationHint) {
     const hintMap = {
       'change-plan': 'CHANGE_PLAN',
       'change-address': 'CHANGE_ADDRESS', 
       'change-node': 'CHANGE_NODE',
       'change-zone': 'CHANGE_ZONE',
       'new': 'CREATE_NEW'
     }
     const detectedFromHint = hintMap[window.currentOperationHint]
     if (detectedFromHint) {
       logInfo('✅ Operación detectada desde hint:', detectedFromHint)
       return detectedFromHint
     }
   }

   // Cambio de zona
   if (formData?.newZoneId && formData.newZoneId !== clientInfo?.zoneId) {
     logInfo('✅ Operación detectada: CHANGE_ZONE', {
       from: clientInfo.zoneId,
       to: formData.newZoneId
     })
     return 'CHANGE_ZONE'
   }

   // Cambio de nodo
   if (formData?.newNodeId && formData.newNodeId !== clientInfo?.nodeId) {
     logInfo('✅ Operación detectada: CHANGE_NODE', {
       from: clientInfo.nodeId,
       to: formData.newNodeId
     })
     return 'CHANGE_NODE'
   }

   // Cambio de dirección (solo ubicación física)
   if (hasLocationChange.value && !formData.newZoneId && !formData.newNodeId) {
     logInfo('✅ Operación detectada: CHANGE_ADDRESS')
     return 'CHANGE_ADDRESS'
   }

   // Por defecto es cambio de plan si hay suscripción
   logInfo('✅ Operación detectada: CHANGE_PLAN')
   return 'CHANGE_PLAN'
 }

 // ===============================
 // INICIALIZACIÓN
 // ===============================
 
 const initializeForm = async () => {
   try {
	console.log('🔍 DEBUG initializeForm:', {
    clientId,           // ¿Qué valor tiene?
    typeOfClientId: typeof clientId,
    subscriptionId,
    existingSubscription
  })
     logInfo('🚀 Inicializando formulario de suscripción', { clientId, subscriptionId })
     initialLoading.value = true
     
     // Configurar ID del cliente
     formData.clientId = clientId
     
     // Cargar datos en paralelo
     await Promise.all([
       loadClientInfo(),
       loadAvailableZones(),
       loadCurrentSubscription(),
       loadAvailableRouters()
     ])
     
     // Si hay suscripción existente, cargar su configuración
     if (currentSubscription.value) {
       await loadCurrentConfiguration()
       prefillFormWithExistingData() // ✅ NUEVA FUNCIÓN
     }
     
     // Cargar datos dependientes DESPUÉS de tener la suscripción
     await loadServicePackages()
     await loadIpPools()
     
     logInfo('✅ Formulario inicializado correctamente')
     
   } catch (error) {
     logError('❌ Error inicializando formulario', error)
     throw error
   } finally {
     initialLoading.value = false
   }
 }

const loadClientInfo = async () => {
  try {
    loadingMessage.value = 'Cargando información del cliente...'
    logDebug('📋 Cargando información del cliente')
    
    // ✅ PRIMERO: Hacer la llamada API
    const response = await ClientService.getClient(clientId)
    
    // ✅ DESPUÉS: Los debug logs
    console.log('🔍 CLIENT RAW RESPONSE:', response.data)
    
    // ✅ DESPUÉS: Extraer datos de la estructura {success: true, data: {...}}
    if (response.data.success && response.data.data) {
      clientInfo.value = response.data.data
    } else {
      clientInfo.value = response.data
    }
    
    console.log('🔍 CLIENT AFTER PARSING:', clientInfo.value)
    console.log('🔍 CLIENT NODE ID:', clientInfo.value.nodeId)
    console.log('🔍 CLIENT ZONE ID:', clientInfo.value.zoneId)
    
    // ✅ CARGAR NOMBRES DE ZONA Y NODO si existen los IDs
    if (clientInfo.value.zoneId) {
      try {
        const zoneResponse = await NetworkService.getZone(clientInfo.value.zoneId)
        clientInfo.value.Zone = zoneResponse.data.success ? zoneResponse.data.data : zoneResponse.data
      } catch (error) {
        logWarn('⚠️ Error cargando zona', error)
      }
    }
    
    if (clientInfo.value.nodeId) {
      try {
        const nodeResponse = await NetworkService.getNode(clientInfo.value.nodeId)
        clientInfo.value.Node = nodeResponse.data.success ? nodeResponse.data.data : nodeResponse.data
      } catch (error) {
        logWarn('⚠️ Error cargando nodo', error)
      }
    }
    
    logInfo('✅ Cliente cargado', {
      name: `${clientInfo.value.firstName} ${clientInfo.value.lastName}`,
      zoneId: clientInfo.value.zoneId,
      nodeId: clientInfo.value.nodeId,
      zoneName: clientInfo.value.Zone?.name,
      nodeName: clientInfo.value.Node?.name,
      active: clientInfo.value.active
    })
    
    // Validar datos críticos del cliente
    validateClientData()
    
  } catch (error) {
    logError('❌ Error cargando cliente', error)
    throw error
  }
}

const loadCurrentSubscription = async () => {
  if (currentSubscription.value) return
  
  try {
    loadingMessage.value = 'Buscando suscripciones existentes...'
    logDebug('🔍 Buscando suscripciones del cliente')
    
    // Si tenemos subscriptionId específico, cargar esa suscripción
    if (subscriptionId) {
      try {
        loadingMessage.value = 'Cargando suscripción específica...'
        const response = await SubscriptionService.getSubscriptionDetails(subscriptionId)
        
        // ✅ MANEJAR ESTRUCTURA { success: true, data: {...} }
        const subscriptionData = response.data?.success ? response.data.data : response.data
        currentSubscription.value = subscriptionData
        
        logInfo('✅ Suscripción específica cargada', {
          id: currentSubscription.value.id,
          status: currentSubscription.value.status,
          package: currentSubscription.value.ServicePackage?.name
        })
        return
      } catch (error) {
        logError('❌ Error cargando suscripción específica', error)
        // Continuar con búsqueda general
      }
    }
    
    // Búsqueda general de suscripciones del cliente
    const response = await SubscriptionService.getClientSubscriptions(clientId, true)
    
    // ✅ MANEJAR DIFERENTES ESTRUCTURAS DE RESPUESTA
    let subscriptions = []
    
    if (response.data) {
      if (response.data.success && Array.isArray(response.data.data)) {
        subscriptions = response.data.data
      } else if (Array.isArray(response.data)) {
        subscriptions = response.data
      } else if (Array.isArray(response.data.subscriptions)) {
        subscriptions = response.data.subscriptions
      }
    }
    
    if (subscriptions.length > 0) {
      // Priorizar suscripción activa
      currentSubscription.value = subscriptions.find(sub => sub.status === 'active') ||
                                 subscriptions.find(sub => sub.status === 'suspended') ||
                                 subscriptions[0]
      
      logInfo('✅ Suscripción actual encontrada', {
        id: currentSubscription.value.id,
        status: currentSubscription.value.status,
        package: currentSubscription.value.ServicePackage?.name
      })
    } else {
      logInfo('ℹ️ No se encontraron suscripciones para el cliente')
    }
    
  } catch (error) {
    logWarn('⚠️ Error cargando suscripciones (no crítico)', error)
    // No es crítico si no tiene suscripciones
  }
}

 const loadCurrentConfiguration = async () => {
   if (!currentSubscription.value) return
   
   try {
     loadingMessage.value = 'Cargando configuración actual...'
     logDebug('⚙️ Cargando configuración de red actual')
     
     // Cargar configuración de red
     const networkResponse = await SubscriptionService.getNetworkConfig(currentSubscription.value.id)
     currentNetworkConfig.value = networkResponse.data
     
     // Cargar datos de Mikrotik si existen
     if (currentNetworkConfig.value?.mikrotikRouterId) {
       const mikrotikResponse = await MikrotikService.getUserConfig(
         currentNetworkConfig.value.mikrotikRouterId,
         currentSubscription.value.pppoeUsername
       )
       currentMikrotikData.value = mikrotikResponse.data
     }
     
     logInfo('✅ Configuración actual cargada', {
       hasNetworkConfig: !!currentNetworkConfig.value,
       hasMikrotikData: !!currentMikrotikData.value
     })
     
   } catch (error) {
     logWarn('⚠️ Error cargando configuración actual', error)
     // No es crítico, puede que no tenga configuración de red
   }
 }

 // ===============================
 // ✅ NUEVA FUNCIÓN: PRE-LLENAR FORMULARIO
 // ===============================
 
 const prefillFormWithExistingData = () => {
   if (!currentSubscription.value) return
   
   logDebug('📝 Pre-llenando formulario con datos existentes')
   
   // Pre-llenar con datos de la suscripción actual
   formData.subscriptionId = currentSubscription.value.id
   formData.servicePackageId = currentSubscription.value.servicePackageId
   formData.billingDay = currentSubscription.value.billingDay || 1
   
   // Si tiene precio personalizado
   if (currentSubscription.value.customPrice) {
     formData.customPrice = currentSubscription.value.customPrice
   }
   
   // Si tiene descuento promocional
   if (currentSubscription.value.promoDiscount) {
     formData.promoDiscount = currentSubscription.value.promoDiscount
   }
   
   // Si tiene configuración de red, usarla
   if (currentNetworkConfig.value) {
     formData.primaryRouterId = currentNetworkConfig.value.mikrotikRouterId
     formData.ipPoolId = currentNetworkConfig.value.ipPoolId
   }
   
   // Configuración PPPoE existente
   if (currentSubscription.value.pppoeUsername) {
     formData.pppoeConfig.username = currentSubscription.value.pppoeUsername
     formData.pppoeConfig.generateAuto = false
   }
   
   // Notas existentes
   if (currentSubscription.value.notes) {
     formData.notes = currentSubscription.value.notes
   }
   
   logInfo('✅ Formulario pre-llenado', {
     servicePackageId: formData.servicePackageId,
     subscriptionId: formData.subscriptionId,
     billingDay: formData.billingDay,
     hasCustomPrice: !!formData.customPrice,
     hasRouterConfig: !!formData.primaryRouterId
   })
 }

// ✅ CORRECTO (CONSIDERA LA ESTRUCTURA { success: true, data: [...] })
const loadServicePackages = async () => {
  try {
    loadingMessage.value = 'Cargando paquetes de servicio...'
    logDebug('📦 Cargando paquetes de servicio')
    
    const params = { active: true }
    
    // Filtrar por zona si está definida
    if (targetZoneId.value) {
      params.zoneId = targetZoneId.value
      logDebug('🔍 Filtrando paquetes por zona', { zoneId: targetZoneId.value })
    }
    
    console.log('🔄 Llamando ServicePackageService.getAllServicePackages con:', params)
    
    const response = await ServicePackageService.getAllServicePackages(params)
    
    console.log('📦 Respuesta RAW del servicio:', response)
    console.log('📦 response.data:', response.data)
    
    // ✅ ARREGLAR EL PARSING PARA MANEJAR { success: true, data: [...] }
    let packagesArray = []
    
    if (response.data) {
      if (response.data.success && Array.isArray(response.data.data)) {
        // Estructura: { success: true, data: [...] }
        packagesArray = response.data.data
      } else if (Array.isArray(response.data)) {
        // Estructura: [...]
        packagesArray = response.data
      } else if (Array.isArray(response.data.packages)) {
        // Estructura: { packages: [...] }
        packagesArray = response.data.packages
      }
    }
    
    availablePackages.value = packagesArray
    
    console.log('📦 availablePackages.value después de parsing:', availablePackages.value)
    
    logInfo('✅ Paquetes de servicio cargados', {
      cantidad: availablePackages.value.length,
      zona: targetZoneId.value,
      paquetes: availablePackages.value.map(p => `${p.id}: ${p.name}`)
    })
    
    // Validar que hay paquetes disponibles
    if (availablePackages.value.length === 0) {
      console.warn('⚠️ No se encontraron paquetes')
      formWarnings.value.push({
        code: 'NO_PACKAGES',
        message: 'No hay paquetes disponibles para la zona seleccionada'
      })
    }
    
  } catch (error) {
    console.error('❌ Error cargando paquetes de servicio:', error)
    console.error('❌ Error completo:', error.response?.data || error.message)
    availablePackages.value = []
    throw error
  }
}

const loadAvailableRouters = async () => {
  try {
    loadingMessage.value = 'Cargando routers disponibles...'
    logDebug('🌐 Cargando routers Mikrotik')
    
    const response = await MikrotikRouterService.getAllMikrotikRouters({ active: true })
    
    console.log('🔍 RESPUESTA COMPLETA MIKROTIK:', response.data)
    
    // ✅ MANEJAR LA ESTRUCTURA CORRECTA
    let devices = []
    if (response.data.success && response.data.data && Array.isArray(response.data.data.routers)) {
      // Estructura: { success: true, data: { routers: [...] } }
      devices = response.data.data.routers
    } else if (response.data.success && Array.isArray(response.data.data)) {
      // Estructura: { success: true, data: [...] }
      devices = response.data.data
    } else if (Array.isArray(response.data.routers)) {
      // Estructura: { routers: [...] }
      devices = response.data.routers
    } else if (Array.isArray(response.data)) {
      // Estructura: [...]
      devices = response.data
    }
    
    console.log('🔍 ROUTERS EXTRAÍDOS:', devices)
    
    // ✅ MAPEAR A LA ESTRUCTURA ESPERADA
    availableRouters.value = devices
      .filter(router => router.active !== false) // Filtrar solo activos
      .map(router => ({
        id: router.id,
        name: router.name,
        ipAddress: router.ipAddress,
        nodeId: router.nodeId,
        zoneId: router.Node?.zoneId || null,
        displayName: `${router.name} (${router.ipAddress})`,
        // Datos adicionales para mostrar
        systemIdentity: router.systemIdentity,
        routerModel: router.routerModel,
        status: router.device?.status || 'unknown'
      }))
    
    console.log('🔍 ROUTERS PROCESADOS:', availableRouters.value)
    
    logInfo('✅ Routers cargados', {
      total: availableRouters.value.length,
      routers: availableRouters.value.map(r => `${r.name} (${r.ipAddress}) - Nodo: ${r.nodeId}`)
    })
    
    // Priorizar routers del nodo del cliente
    prioritizeNodeRouters()
    
  } catch (error) {
    logError('❌ Error cargando routers', error)
    console.error('❌ Error completo:', error.response?.data || error.message)
    availableRouters.value = []
    // No hacer throw para que no interrumpa la inicialización
  }
}

 const loadIpPools = async () => {
   if (!targetNodeId.value) return
   
   try {
     loadingMessage.value = 'Cargando pools de IP...'
     logDebug('🌊 Cargando pools de IP')
     
     const response = await MikrotikService.getIpPools({
       nodeId: targetNodeId.value,
       active: true
     })
     
     availableIpPools.value = Array.isArray(response.data) ? response.data : []
     
     logInfo('✅ Pools de IP cargados', {
       cantidad: availableIpPools.value.length,
       nodo: targetNodeId.value
     })
     
   } catch (error) {
     logWarn('⚠️ Error cargando pools de IP', error)
     availableIpPools.value = []
   }
 }

 const loadAvailableZones = async () => {
   try {
     const response = await ClientService.getAvailableZones()
     availableZones.value = response.data || []
     logDebug('✅ Zonas disponibles cargadas', { cantidad: availableZones.value.length })
   } catch (error) {
     logWarn('⚠️ Error cargando zonas', error)
     availableZones.value = []
   }
 }

 // ===============================
 // VALIDACIONES
 // ===============================
 
 const validateForm = () => {
   validationErrors.value = []
   formWarnings.value = []
   
   logDebug('🔍 Iniciando validación del formulario', {
     operationType: operationType.value,
     formData: {
       clientId: formData.clientId,
       servicePackageId: formData.servicePackageId,
       primaryRouterId: formData.primaryRouterId
     }
   })
   
   // Validaciones por tipo de operación
   switch (operationType.value) {
     case 'CREATE_NEW':
       validateNewSubscription()
       break
     case 'CHANGE_PLAN':
       validatePlanChange()
       break
     case 'CHANGE_NODE':
       validateNodeChange()
       break
     case 'CHANGE_ZONE':
       validateZoneChange()
       break
     case 'CHANGE_ADDRESS':
       validateAddressChange()
       break
   }
   
   // Validaciones comunes
   validateCommonFields()
   
   const isValid = validationErrors.value.length === 0
   logValidation('FORM_VALIDATION', 'complete', isValid, 
     isValid ? null : validationErrors.value.map(e => e.message).join(', '))
   
   return isValid
 }

 const validateNewSubscription = () => {
   logDebug('🆕 Validando nueva suscripción')
   
   // Cliente debe estar activo
   if (!clientInfo.value.active) {
     addValidationError('CLIENT_INACTIVE', 'El cliente debe estar activo para crear una suscripción')
   }
   
   // Debe tener zona y nodo
   if (!clientInfo.value.zoneId) {
     addValidationError('NO_ZONE', 'El cliente debe tener una zona asignada')
   }
   
   if (!clientInfo.value.nodeId) {
     addValidationError('NO_NODE', 'El cliente debe tener un nodo asignado')
   }
   
   // Paquete requerido
   if (!formData.servicePackageId) {
     addValidationError('NO_PACKAGE', 'Debe seleccionar un paquete de servicio')
   }
   
   // Router requerido
   if (!formData.primaryRouterId) {
     addValidationError('NO_ROUTER', 'Debe seleccionar un router/nodo')
   }
   
   // Username PPPoE
   if (!formData.pppoeConfig.username && !formData.pppoeConfig.generateAuto) {
     addValidationError('NO_PPPOE_USERNAME', 'Debe especificar un usuario PPPoE o habilitar generación automática')
   }
   
   logDebug('✅ Validación de nueva suscripción completada')
 }

 const validatePlanChange = () => {
   logDebug('📊 Validando cambio de plan')
   
   // Debe tener suscripción actual
   if (!currentSubscription.value) {
     addValidationError('NO_CURRENT_SUBSCRIPTION', 'No hay suscripción actual para cambiar')
     return
   }
   
   // Suscripción debe estar activa o suspendida
   if (!['active', 'suspended'].includes(currentSubscription.value.status)) {
     addValidationError('INVALID_SUBSCRIPTION_STATUS', 'La suscripción debe estar activa o suspendida para cambiar el plan')
   }
   
   // Nuevo paquete requerido
   if (!formData.servicePackageId) {
     addValidationError('NO_NEW_PACKAGE', 'Debe seleccionar el nuevo paquete')
   }
   
   // No debe ser el mismo paquete
   if (formData.servicePackageId === currentSubscription.value.servicePackageId) {
     addValidationError('SAME_PACKAGE', 'Debe seleccionar un paquete diferente al actual')
   }
   
   logDebug('✅ Validación de cambio de plan completada')
 }

 const validateNodeChange = () => {
   logDebug('🗼 Validando cambio de nodo')
   
   // Validaciones base de cambio de plan
   validatePlanChange()
   
   // Nuevo nodo requerido
   if (!formData.newNodeId) {
     addValidationError('NO_NEW_NODE', 'Debe seleccionar el nuevo nodo')
   }
   
   // No debe ser el mismo nodo
   if (formData.newNodeId === clientInfo.value.nodeId) {
     addValidationError('SAME_NODE', 'Debe seleccionar un nodo diferente al actual')
   }
   
   // Verificar que el paquete existe en el nuevo nodo
   if (formData.servicePackageId && formData.newNodeId) {
     validatePackageInNode(formData.servicePackageId, formData.newNodeId)
   }
   
   // Razón del cambio requerida
   if (!formData.changeReason) {
     addValidationError('NO_CHANGE_REASON', 'Debe especificar la razón del cambio de nodo')
   }
   
   logDebug('✅ Validación de cambio de nodo completada')
 }

 const validateZoneChange = () => {
   logDebug('🌍 Validando cambio de zona')
   
   // Validaciones base de cambio de nodo
   validateNodeChange()
   
   // Nueva zona requerida
   if (!formData.newZoneId) {
     addValidationError('NO_NEW_ZONE', 'Debe seleccionar la nueva zona')
   }
   
   // No debe ser la misma zona
   if (formData.newZoneId === clientInfo.value.zoneId) {
     addValidationError('SAME_ZONE', 'Debe seleccionar una zona diferente a la actual')
   }
   
   // Verificar que el paquete existe en la nueva zona
   if (formData.servicePackageId && formData.newZoneId) {
     validatePackageInZone(formData.servicePackageId, formData.newZoneId)
   }
   
   logDebug('✅ Validación de cambio de zona completada')
 }

 const validateAddressChange = () => {
   logDebug('🏠 Validando cambio de dirección')
   
   // Para cambio de dirección sin cambio de nodo
   if (!formData.changeReason) {
     addValidationError('NO_CHANGE_REASON', 'Debe especificar la razón del cambio de dirección')
   }
   
   logDebug('✅ Validación de cambio de dirección completada')
 }

 const validateCommonFields = () => {
   logDebug('🔧 Validando campos comunes')
   
   // Precios válidos
   if (formData.customPrice && (formData.customPrice < 0 || formData.customPrice > 99999)) {
     addValidationError('INVALID_CUSTOM_PRICE', 'El precio personalizado debe estar entre 0 y 99,999')
   }
   
   if (formData.promoDiscount && (formData.promoDiscount < 0 || formData.promoDiscount > 100)) {
     addValidationError('INVALID_PROMO_DISCOUNT', 'El descuento promocional debe estar entre 0% y 100%')
   }
   
   // Día de facturación válido
   if (formData.billingDay < 1 || formData.billingDay > 31) {
     addValidationError('INVALID_BILLING_DAY', 'El día de facturación debe estar entre 1 y 31')
   }
   
   // Username PPPoE válido si se especifica
   if (formData.pppoeConfig.username && !/^[a-z0-9_]{3,20}$/.test(formData.pppoeConfig.username)) {
     addValidationError('INVALID_PPPOE_USERNAME', 'El usuario PPPoE debe tener entre 3-20 caracteres (solo letras, números y _)')
   }
   
   logDebug('✅ Validación de campos comunes completada')
 }

 const validatePackageInZone = async (packageId, zoneId) => {
   try {
     const result = await ServicePackageService.validatePackageInZone(packageId, zoneId)
     if (!result.isValid) {
       addValidationError('PACKAGE_NOT_IN_ZONE', `El paquete seleccionado no está disponible en la zona de destino`)
     }
   } catch (error) {
     logWarn('⚠️ Error validando paquete en zona', error)
   }
 }

 const validatePackageInNode = async (packageId, nodeId) => {
   try {
     const result = await ServicePackageService.validatePackageInNode(packageId, nodeId)
     if (!result.isValid) {
       addValidationError('PACKAGE_NOT_IN_NODE', `El paquete seleccionado no está disponible en el nodo de destino`)
     }
   } catch (error) {
     logWarn('⚠️ Error validando paquete en nodo', error)
   }
 }

 const validateClientData = () => {
   logDebug('👤 Validando datos del cliente')
   
   if (!clientInfo.value.zoneId) {
     formWarnings.value.push({
       code: 'NO_ZONE_ASSIGNED',
       message: 'El cliente no tiene zona asignada. Esto puede limitar las opciones disponibles.'
     })
   }
   
   if (!clientInfo.value.nodeId) {
     formWarnings.value.push({
       code: 'NO_NODE_ASSIGNED',
       message: 'El cliente no tiene nodo asignado. Esto es requerido para crear suscripciones.'
     })
   }
   
   if (!clientInfo.value.active) {
     formWarnings.value.push({
       code: 'CLIENT_INACTIVE',
       message: 'El cliente está inactivo. Active el cliente antes de crear suscripciones.'
     })
   }
 }

 const addValidationError = (code, message, field = null) => {
   validationErrors.value.push({ code, message, field })
   logValidation('FIELD_VALIDATION', field || code, false, message)
 }

// En useSubscriptionForm.js, agregar esta función antes del return
// En useSubscriptionForm.js, reemplaza la función por esta versión corregida:
const submitSubscriptionChange = async (formData, operationType) => {
  try {
    logInfo('🚀 Enviando cambio de suscripción', { operationType, formData })
    
    let response
    
    switch (operationType) {
      case 'CREATE_NEW': {
        // ✅ AGREGAR LLAVES para permitir const
        const newSubscriptionData = {
          clientId: formData.clientId,
          servicePackageId: formData.servicePackageId,
          primaryRouterId: formData.primaryRouterId,
          customPrice: formData.customPrice,
          promoDiscount: formData.promoDiscount,
          billingDay: formData.billingDay,
          notes: formData.notes,
          autoCreateBilling: formData.autoCreateBilling,
          pppoeConfig: formData.pppoeConfig
        }
        
        response = await SubscriptionService.createSubscription(newSubscriptionData)
        break
      }
        
      case 'CHANGE_PLAN': {
        // ✅ AGREGAR LLAVES
        if (!currentSubscription.value) {
          throw new Error('No hay suscripción actual para cambiar')
        }
        
        const planChangeData = {
          subscriptionId: currentSubscription.value.id,
          newServicePackageId: formData.servicePackageId,
          customPrice: formData.customPrice,
          promoDiscount: formData.promoDiscount,
          billingDay: formData.billingDay,
          notes: formData.notes,
          changeReason: formData.changeReason
        }
        
        response = await SubscriptionService.changeServicePlan(
          currentSubscription.value.id,
          formData.servicePackageId,
          new Date().toISOString()
        )
        break
      }
        
      case 'CHANGE_NODE':
      case 'CHANGE_ZONE': {
        // ✅ AGREGAR LLAVES
        // Para cambios más complejos, podrías necesitar múltiples llamadas API
        throw new Error(`Operación ${operationType} no implementada aún`)
      }
        
      default: {
        // ✅ AGREGAR LLAVES
        throw new Error(`Tipo de operación desconocido: ${operationType}`)
      }
    }
    
    logInfo('✅ Cambio de suscripción exitoso', response.data)
    return response.data
    
  } catch (error) {
    logError('❌ Error en cambio de suscripción', error)
    throw error
  }
}

 // ===============================
 // WATCHERS Y REACTIVIDAD
 // ===============================
 
 watch(() => formData.newZoneId, async (newZoneId) => {
   if (newZoneId) {
     logFormDataChange('newZoneId', clientInfo.value.zoneId, newZoneId, 'zone_selector')
     
     // Recargar paquetes para la nueva zona
     await loadServicePackages()
     
     // Limpiar selección de paquete si no está disponible en nueva zona
     if (formData.servicePackageId) {
       const packageExists = availablePackages.value.some(pkg => pkg.id == formData.servicePackageId)
       if (!packageExists) {
         logWarn('⚠️ Paquete actual no disponible en nueva zona, limpiando selección')
         formData.servicePackageId = null
       }
     }
     
     // Cargar nodos de la nueva zona
     await loadNodesForZone(newZoneId)
   }
 })

 watch(() => formData.newNodeId, async (newNodeId) => {
   if (newNodeId) {
     logFormDataChange('newNodeId', clientInfo.value.nodeId, newNodeId, 'node_selector')
     
     // Recargar routers para el nuevo nodo
     await loadRoutersForNode(newNodeId)
     
     // Recargar pools de IP
     await loadIpPools()
   }
 })

watch(() => formData.servicePackageId, (newPackageId, oldPackageId) => {
   if (newPackageId !== oldPackageId) {
     logFormDataChange('servicePackageId', oldPackageId, newPackageId, 'package_selector')
     
     // Limpiar precio personalizado al cambiar paquete
     if (!initialLoading.value) {
       formData.customPrice = null
       logDebug('🧹 Precio personalizado limpiado al cambiar paquete')
     }
   }
 })

 // ===============================
 // FUNCIONES AUXILIARES
 // ===============================
 
const prioritizeNodeRouters = () => {
  if (!clientInfo.value.nodeId || availableRouters.value.length === 0) {
    logWarn('⚠️ No se puede priorizar routers', {
      clientNodeId: clientInfo.value.nodeId,
      availableRouters: availableRouters.value.length
    })
    return
  }
  
  // Filtrar routers del nodo del cliente
  const nodeRouters = availableRouters.value.filter(router => 
    router.nodeId === clientInfo.value.nodeId
  )
  const otherRouters = availableRouters.value.filter(router => 
    router.nodeId !== clientInfo.value.nodeId
  )
  
  // Reordenar: routers del nodo primero
  availableRouters.value = [...nodeRouters, ...otherRouters]
  
  // ✅ AUTO-SELECCIONAR si solo hay un router en el nodo
  if (nodeRouters.length === 1 && !formData.primaryRouterId) {
    formData.primaryRouterId = nodeRouters[0].id
    logInfo('🎯 Router auto-seleccionado del nodo', {
      routerId: nodeRouters[0].id,
      routerName: nodeRouters[0].name,
      nodeId: clientInfo.value.nodeId
    })
  }
  
  logDebug('🔄 Routers reordenados', {
    clientNodeId: clientInfo.value.nodeId,
    nodeRouters: nodeRouters.length,
    otherRouters: otherRouters.length,
    autoSelected: !!formData.primaryRouterId
  })
}

 const loadNodesForZone = async (zoneId) => {
   try {
     const response = await ClientService.getNodesForZone(zoneId)
     availableNodes.value = response.data || []
     logDebug('✅ Nodos cargados para zona', { zoneId, cantidad: availableNodes.value.length })
   } catch (error) {
     logWarn('⚠️ Error cargando nodos para zona', error)
     availableNodes.value = []
   }
 }

 const loadRoutersForNode = async (nodeId) => {
   try {
     const filteredRouters = availableRouters.value.filter(router => 
       router.nodeId === nodeId
     )
     
     // Si no hay routers para este nodo, cargar todos
     if (filteredRouters.length === 0) {
       await loadAvailableRouters()
     }
     
     logDebug('✅ Routers filtrados para nodo', { nodeId, cantidad: filteredRouters.length })
   } catch (error) {
     logWarn('⚠️ Error cargando routers para nodo', error)
   }
 }

 const resetForm = () => {
   logInfo('🔄 Reseteando formulario')
   
   // Limpiar datos del formulario manteniendo IDs básicos
   Object.assign(formData, {
     clientId: formData.clientId,
     subscriptionId: null,
     newZoneId: null,
     newNodeId: null,
     servicePackageId: null,
     primaryRouterId: null,
     ipPoolId: null,
     pppoeConfig: {
       username: '',
       password: '',
       generateAuto: true
     },
     customPrice: null,
     promoDiscount: 0,
     billingDay: 1,
     autoCreateBilling: true,
     notes: '',
     changeReason: '',
     preserveUserCredentials: false,
     forceRecreateUser: false
   })
   
   // Limpiar errores y warnings
   validationErrors.value = []
   formWarnings.value = []
   
   logDebug('✅ Formulario reseteado')
 }

 const exportFormData = () => {
   return {
     formData: { ...formData },
     clientInfo: { ...clientInfo.value },
     currentSubscription: currentSubscription.value ? { ...currentSubscription.value } : null,
     operationType: operationType.value,
     validationErrors: [...validationErrors.value],
     formWarnings: [...formWarnings.value]
   }
 }

 // ===============================
 // RETURN
 // ===============================
 
 return {
   // Estados principales
   loading,
   initialLoading,
   loadingMessage,
   
   // Datos
   formData,
   clientInfo,
   currentSubscription,
   currentNetworkConfig,
   currentMikrotikData,
   
   // Opciones disponibles
   availablePackages,
   availableRouters,
   availableIpPools,
   availableZones,
   availableNodes,
   
   // Validaciones
   validationErrors,
   formWarnings,
   
   // Computed
   operationType,
   selectedPackage,
   targetZoneId,
   targetNodeId,
   suggestedPPPoEUsername,
   isFormValid,
   hasLocationChange,
   requiresMikrotikRecreation,
   
   // Métodos principales
   initializeForm,
   validateForm,
   resetForm,
   exportFormData,
   
   // Métodos de carga
   loadClientInfo,
   loadServicePackages,
   loadAvailableRouters,
   loadIpPools,
   
   // Métodos de validación
   validateNewSubscription,
   validatePlanChange,
   validateNodeChange,
   validateZoneChange,
   
   // Métodos auxiliares
   detectOperationType,
   prioritizeNodeRouters,
   addValidationError,
   prefillFormWithExistingData,
   submitSubscriptionChange,   // ✅ NUEVA FUNCIÓN EXPORTADA
 }
}