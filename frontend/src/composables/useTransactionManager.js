// composables/useTransactionManager.js
import { ref, reactive } from 'vue'
import SubscriptionService from '@/services/subscription.service'
import MikrotikService from '@/services/mikrotik.service'
import ClientService from '@/services/client.service'

export function useTransactionManager() {
  // ===============================
  // ESTADO DE TRANSACCIONES
  // ===============================
  
  const transactionSteps = ref([])
  const currentTransactionStep = ref(0)
  const transactionErrors = ref([])
  const showTransactionProgress = ref(false)
  const transactionId = ref(null)
  const rollbackData = ref({})

  // ===============================
  // EJECUTOR PRINCIPAL DE TRANSACCIONES
  // ===============================
  
  const executeTransaction = async (plan, formData, operationType) => {
    console.log('🚀 INICIANDO TRANSACCIÓN ATÓMICA')
    console.log('📋 Plan:', plan)
    console.log('📝 Datos del formulario:', formData)
    console.log('🔧 Tipo de operación:', operationType)
    
    transactionId.value = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    showTransactionProgress.value = true
    transactionErrors.value = []
    rollbackData.value = {}
    
    try {
      let result
      
      switch (operationType) {
        case 'CREATE_NEW':
          result = await executeCreateNewSubscription(formData)
          break
          
        case 'CHANGE_PLAN':
          result = await executeChangePlan(formData)
          break
          
        case 'CHANGE_NODE':
          result = await executeChangeNode(formData)
          break
          
        case 'CHANGE_ZONE':
          result = await executeChangeZone(formData)
          break
          
        default:
          throw new Error(`Tipo de operación no soportado: ${operationType}`)
      }
      
      console.log('✅ TRANSACCIÓN COMPLETADA EXITOSAMENTE')
      console.log('📄 Resultado:', result)
      
      showTransactionProgress.value = false
      return result
      
    } catch (error) {
      console.error('❌ ERROR EN TRANSACCIÓN:', error)
      
      // Determinar si requiere rollback
      error.requiresRollback = shouldRollback(error, currentTransactionStep.value)
      error.transactionId = transactionId.value
      error.completedSteps = getCompletedSteps()
      
      throw error
    }
  }

  // ===============================
  // OPERACIÓN: CREAR NUEVA SUSCRIPCIÓN
  // ===============================
  
  const executeCreateNewSubscription = async (formData) => {
    console.log('🆕 EJECUTANDO: Crear Nueva Suscripción')
    
    updateStep(0, 'running', 'Validando datos del formulario...')
    
    // PASO 1: Validar datos
    const validationResult = await validateNewSubscriptionData(formData)
    if (!validationResult.isValid) {
      throw new Error(`Validación fallida: ${validationResult.errors.join(', ')}`)
    }
    updateStep(0, 'completed', 'Datos validados correctamente')
    
    // PASO 2: Crear suscripción en BD
    updateStep(1, 'running', 'Creando suscripción en base de datos...')
    const subscription = await createSubscriptionInDB(formData)
    rollbackData.value.subscriptionId = subscription.id
    console.log('✅ Suscripción creada en BD:', subscription.id)
    updateStep(1, 'completed', `Suscripción creada (ID: ${subscription.id})`)
    
    try {
      // PASO 3: Crear configuración de red
      updateStep(2, 'running', 'Creando configuración de red...')
      const networkConfig = await createNetworkConfig(subscription, formData)
      rollbackData.value.networkConfigId = networkConfig.id
      console.log('✅ Configuración de red creada:', networkConfig.id)
      updateStep(2, 'completed', 'Configuración de red creada')
      
      // PASO 4: Crear usuario en Mikrotik (CRÍTICO)
      updateStep(3, 'running', 'Creando usuario PPPoE en Mikrotik...')
      const mikrotikUser = await createMikrotikUser(subscription, formData)
      rollbackData.value.mikrotikUserId = mikrotikUser.id
      rollbackData.value.mikrotikRouterIp = formData.targetRouterIp
      console.log('✅ Usuario PPPoE creado en Mikrotik:', mikrotikUser.username)
      updateStep(3, 'completed', `Usuario PPPoE creado: ${mikrotikUser.username}`)
      
      // PASO 5: Asignar IP del pool (CRÍTICO)
      updateStep(4, 'running', 'Asignando IP del pool...')
      const ipAssignment = await assignIpFromPool(subscription, formData)
      rollbackData.value.assignedIpId = ipAssignment.id
      console.log('✅ IP asignada:', ipAssignment.ipAddress)
      updateStep(4, 'completed', `IP asignada: ${ipAssignment.ipAddress}`)
      
      // PASO 6: Sincronizar todos los datos
      updateStep(5, 'running', 'Sincronizando datos entre BD y Mikrotik...')
      const syncResult = await syncAllData(subscription.id)
      console.log('✅ Sincronización completada:', syncResult)
      updateStep(5, 'completed', 'Sincronización completada')
      
      return {
        subscription,
        networkConfig,
        mikrotikUser,
        ipAssignment,
        syncResult
      }
      
    } catch (mikrotikError) {
      console.error('❌ Error en operaciones de Mikrotik:', mikrotikError)
      
      // Si falló después de crear en BD, intentar rollback de Mikrotik
      if (rollbackData.value.mikrotikUserId) {
        console.log('🔄 Intentando limpiar usuario de Mikrotik...')
        try {
          await MikrotikService.deleteUser(
            rollbackData.value.mikrotikRouterIp,
            rollbackData.value.mikrotikUserId
          )
          console.log('✅ Usuario de Mikrotik eliminado en rollback')
        } catch (cleanupError) {
          console.error('❌ Error limpiando Mikrotik:', cleanupError)
        }
      }
      
      throw mikrotikError
    }
  }

  // ===============================
  // OPERACIÓN: CAMBIO DE PLAN
  // ===============================
  
  const executeChangePlan = async (formData) => {
    console.log('📊 EJECUTANDO: Cambio de Plan')
    
    updateStep(0, 'running', 'Validando cambio de plan...')
    
    // PASO 1: Validar que el cambio sea posible
    const currentSubscription = await SubscriptionService.getSubscription(formData.subscriptionId)
    const validationResult = await validatePlanChange(currentSubscription, formData)
    if (!validationResult.isValid) {
      throw new Error(`Cambio de plan no válido: ${validationResult.errors.join(', ')}`)
    }
    updateStep(0, 'completed', 'Cambio validado')
    
    // Guardar configuración actual para rollback
    rollbackData.value.originalSubscription = { ...currentSubscription }
    rollbackData.value.originalMikrotikProfile = await getMikrotikProfile(currentSubscription)
    
    try {
      // PASO 2: Actualizar suscripción en BD
      updateStep(1, 'running', 'Actualizando suscripción...')
      const updatedSubscription = await updateSubscriptionInDB(formData)
      console.log('✅ Suscripción actualizada en BD')
      updateStep(1, 'completed', 'Suscripción actualizada')
      
      // PASO 3: Actualizar perfil en Mikrotik (CRÍTICO)
      updateStep(2, 'running', 'Actualizando perfil en Mikrotik...')
      const mikrotikUpdate = await updateMikrotikProfile(formData)
      console.log('✅ Perfil actualizado en Mikrotik:', mikrotikUpdate)
      updateStep(2, 'completed', 'Perfil actualizado en Mikrotik')
      
      // PASO 4: Verificar sincronización
      updateStep(3, 'running', 'Verificando sincronización...')
      const verificationResult = await verifyMikrotikSync(formData.subscriptionId)
      if (!verificationResult.isSync) {
        throw new Error('Sincronización fallida después del cambio de plan')
      }
      console.log('✅ Sincronización verificada')
      updateStep(3, 'completed', 'Sincronización verificada')
      
      return {
        subscription: updatedSubscription,
        mikrotikUpdate,
        verification: verificationResult
      }
      
    } catch (error) {
      console.error('❌ Error en cambio de plan:', error)
      
      // Intentar restaurar configuración anterior
      if (rollbackData.value.originalSubscription) {
        console.log('🔄 Intentando restaurar configuración anterior...')
        try {
          await restorePreviousConfiguration(rollbackData.value)
          console.log('✅ Configuración anterior restaurada')
        } catch (restoreError) {
          console.error('❌ Error restaurando configuración:', restoreError)
        }
      }
      
      throw error
    }
  }

  // ===============================
  // OPERACIÓN: CAMBIO DE NODO
  // ===============================
  
  const executeChangeNode = async (formData) => {
    console.log('🗼 EJECUTANDO: Cambio de Nodo')
    
    updateStep(0, 'running', 'Validando cambio de nodo...')
    
    // Obtener configuración actual
    const currentSubscription = await SubscriptionService.getSubscription(formData.subscriptionId)
    const currentMikrotikConfig = await getMikrotikUserConfig(currentSubscription)
    
    // Guardar para rollback
    rollbackData.value.originalSubscription = { ...currentSubscription }
    rollbackData.value.originalMikrotikConfig = { ...currentMikrotikConfig }
    rollbackData.value.oldMikrotikIp = currentMikrotikConfig.routerIp
    rollbackData.value.newMikrotikIp = formData.newRouterIp
    
    updateStep(0, 'completed', 'Cambio validado')
    
    try {
      // PASO 1: Respaldar configuración actual
      updateStep(1, 'running', 'Respaldando configuración actual...')
      const backup = await createConfigBackup(currentSubscription)
      rollbackData.value.configBackup = backup
      console.log('✅ Configuración respaldada')
      updateStep(1, 'completed', 'Configuración respaldada')
      
      // PASO 2: Eliminar de Mikrotik anterior (CRÍTICO)
      updateStep(2, 'running', 'Eliminando usuario del Mikrotik anterior...')
      const deleteResult = await MikrotikService.deleteUser(
        rollbackData.value.oldMikrotikIp,
        currentMikrotikConfig.mikrotikUserId
      )
      console.log('✅ Usuario eliminado del Mikrotik anterior')
      updateStep(2, 'completed', 'Usuario eliminado del Mikrotik anterior')
      
      // PASO 3: Actualizar suscripción en BD
      updateStep(3, 'running', 'Actualizando suscripción...')
      const updatedSubscription = await updateSubscriptionForNodeChange(formData)
      console.log('✅ Suscripción actualizada para nuevo nodo')
      updateStep(3, 'completed', 'Suscripción actualizada')
      
      // PASO 4: Crear en nuevo Mikrotik (CRÍTICO)
      updateStep(4, 'running', 'Creando usuario en nuevo Mikrotik...')
      const newMikrotikUser = await createMikrotikUserInNewNode(formData, currentMikrotikConfig)
      rollbackData.value.newMikrotikUserId = newMikrotikUser.id
      console.log('✅ Usuario creado en nuevo Mikrotik:', newMikrotikUser.username)
      updateStep(4, 'completed', `Usuario creado: ${newMikrotikUser.username}`)
      
      // PASO 5: Verificar conectividad
      updateStep(5, 'running', 'Verificando conectividad...')
      const connectivityTest = await verifyConnectivity(formData.subscriptionId)
      if (!connectivityTest.isConnected) {
        throw new Error('Conectividad fallida después del cambio de nodo')
      }
      console.log('✅ Conectividad verificada')
      updateStep(5, 'completed', 'Conectividad verificada')
      
      return {
        subscription: updatedSubscription,
        mikrotikUser: newMikrotikUser,
        connectivity: connectivityTest
      }
      
    } catch (error) {
      console.error('❌ Error en cambio de nodo:', error)
      
      // Rollback específico para cambio de nodo
      await rollbackNodeChange(rollbackData.value, error)
      
      throw error
    }
  }

  // ===============================
  // OPERACIÓN: CAMBIO DE ZONA
  // ===============================
  
  const executeChangeZone = async (formData) => {
    console.log('🌍 EJECUTANDO: Cambio de Zona')
    
    // Similar a cambio de nodo pero con validaciones adicionales
    updateStep(0, 'running', 'Validando cambio de zona...')
    
    const currentSubscription = await SubscriptionService.getSubscription(formData.subscriptionId)
    
    // Validar que el paquete exista en la nueva zona
    const packageValidation = await validatePackageInZone(
      formData.servicePackageId, 
      formData.newZoneId
    )
    if (!packageValidation.isValid) {
      throw new Error(`Paquete no disponible en la nueva zona: ${packageValidation.message}`)
    }
    
    updateStep(0, 'completed', 'Cambio de zona validado')
    
    // El resto es similar al cambio de nodo, pero con actualizaciones adicionales
    // (zona, validación de paquetes, posibles cambios de precio)
    
    return await executeChangeNode(formData) // Reutilizar lógica base
  }

  // ===============================
  // FUNCIONES DE ROLLBACK
  // ===============================
  
  const rollbackTransaction = async (transactionId, completedSteps) => {
    console.log('⏪ INICIANDO ROLLBACK COMPLETO')
    console.log('🆔 Transaction ID:', transactionId)
    console.log('📋 Pasos completados:', completedSteps)
    console.log('💾 Datos de rollback:', rollbackData.value)
    
    try {
      // Rollback en orden inverso
      const rollbackSteps = [...completedSteps].reverse()
      
      for (const step of rollbackSteps) {
        console.log(`🔄 Revirtiendo paso: ${step.id}`)
        
        switch (step.id) {
          case 'create_mikrotik_user':
            await rollbackMikrotikUser()
            break
            
          case 'assign_ip':
            await rollbackIpAssignment()
            break
            
          case 'create_subscription':
            await rollbackSubscription()
            break
            
          case 'update_mikrotik_profile':
            await rollbackMikrotikProfile()
            break
            
          // Más casos según sea necesario
        }
        
        console.log(`✅ Paso revertido: ${step.id}`)
      }
      
      console.log('✅ ROLLBACK COMPLETADO')
      
    } catch (rollbackError) {
      console.error('❌ ERROR DURANTE ROLLBACK:', rollbackError)
      console.error('⚠️ ATENCIÓN: SE REQUIERE INTERVENCIÓN MANUAL')
      
      // Aquí deberíamos enviar una alerta al administrador
      await notifyAdminManualIntervention(transactionId, rollbackError, rollbackData.value)
      
      throw new Error('Rollback fallido - Se requiere intervención manual')
    }
  }

  const rollbackMikrotikUser = async () => {
    if (rollbackData.value.mikrotikUserId && rollbackData.value.mikrotikRouterIp) {
      await MikrotikService.deleteUser(
        rollbackData.value.mikrotikRouterIp,
        rollbackData.value.mikrotikUserId
      )
      console.log('✅ Usuario de Mikrotik eliminado en rollback')
    }
  }

  const rollbackIpAssignment = async () => {
    if (rollbackData.value.assignedIpId) {
      await SubscriptionService.releaseIpAssignment(rollbackData.value.assignedIpId)
      console.log('✅ Asignación de IP liberada en rollback')
    }
  }

  const rollbackSubscription = async () => {
    if (rollbackData.value.subscriptionId) {
      await SubscriptionService.deleteSubscription(rollbackData.value.subscriptionId)
      console.log('✅ Suscripción eliminada en rollback')
    }
  }

  const rollbackNodeChange = async (rollbackData, originalError) => {
    console.log('🔄 Ejecutando rollback específico para cambio de nodo')
    
    try {
      // Si se creó usuario en nuevo Mikrotik, eliminarlo
      if (rollbackData.newMikrotikUserId && rollbackData.newMikrotikIp) {
        await MikrotikService.deleteUser(
          rollbackData.newMikrotikIp,
          rollbackData.newMikrotikUserId
        )
        console.log('✅ Usuario eliminado del nuevo Mikrotik')
      }
      
      // Restaurar usuario en Mikrotik anterior
      if (rollbackData.originalMikrotikConfig && rollbackData.oldMikrotikIp) {
        await MikrotikService.createUser(
          rollbackData.oldMikrotikIp,
          rollbackData.originalMikrotikConfig
        )
        console.log('✅ Usuario restaurado en Mikrotik anterior')
      }
      
      // Restaurar suscripción en BD
      if (rollbackData.originalSubscription) {
        await SubscriptionService.updateSubscription(
          rollbackData.originalSubscription.id,
          rollbackData.originalSubscription
        )
        console.log('✅ Suscripción restaurada en BD')
      }
      
    } catch (rollbackError) {
      console.error('❌ Error durante rollback de cambio de nodo:', rollbackError)
      throw rollbackError
    }
  }

  // ===============================
  // FUNCIONES AUXILIARES
  // ===============================
  
  const updateStep = (index, status, message) => {
    if (transactionSteps.value[index]) {
      transactionSteps.value[index].status = status
      transactionSteps.value[index].message = message
      currentTransactionStep.value = index
      
      console.log(`📝 Paso ${index + 1}: ${status.toUpperCase()} - ${message}`)
    }
  }

  const shouldRollback = (error, currentStep) => {
    // Determinar si el error requiere rollback basado en el paso y tipo de error
    const criticalSteps = ['create_mikrotik_user', 'assign_ip', 'remove_from_old_mikrotik']
    const currentStepId = transactionSteps.value[currentStep]?.id
    
    return criticalSteps.includes(currentStepId) || error.type === 'MIKROTIK_ERROR'
  }

  const getCompletedSteps = () => {
    return transactionSteps.value.filter(step => step.status === 'completed')
  }

  const cancelTransaction = () => {
    console.log('❌ TRANSACCIÓN CANCELADA POR USUARIO')
    showTransactionProgress.value = false
    // Aquí podríamos implementar cancelación si está en progreso
  }

  // ===============================
  // FUNCIONES DE SERVICIOS (Placeholder - implementar según tus servicios)
  // ===============================
  
  const validateNewSubscriptionData = async (formData) => {
    // Implementar validación específica
    return { isValid: true, errors: [] }
  }

  const createSubscriptionInDB = async (formData) => {
    return await SubscriptionService.createSubscription(formData)
  }

  const createNetworkConfig = async (subscription, formData) => {
    return await SubscriptionService.createNetworkConfig(subscription.id, formData)
  }

  const createMikrotikUser = async (subscription, formData) => {
    return await MikrotikService.createUser(formData.routerIp, {
      username: formData.pppoeConfig.username,
      password: formData.pppoeConfig.password,
      profile: formData.profileName,
      subscription: subscription
    })
  }

  const assignIpFromPool = async (subscription, formData) => {
    return await SubscriptionService.assignIpFromPool(subscription.id, formData.ipPoolId)
  }

  const syncAllData = async (subscriptionId) => {
    return await SubscriptionService.syncWithMikrotik(subscriptionId)
  }

  // Más funciones de servicios...

  const notifyAdminManualIntervention = async (transactionId, error, rollbackData) => {
    // Implementar notificación al administrador
    console.error('🚨 ALERTA: Se requiere intervención manual del administrador')
    console.error('🆔 Transaction ID:', transactionId)
    console.error('❌ Error:', error)
    console.error('💾 Datos de rollback:', rollbackData)
  }
  
  // ===============================
  // FUNCIONES AUXILIARES FALTANTES
  // ===============================
  
  const validatePlanChange = async (currentSubscription, formData) => {
    // Validar que el cambio de plan sea válido
    return { isValid: true, errors: [] };
  };

  const getMikrotikProfile = async (subscription) => {
    // Obtener perfil actual de Mikrotik
    return await MikrotikService.getProfile(subscription.routerIp, subscription.profileName);
  };

  const updateSubscriptionInDB = async (formData) => {
    // Actualizar suscripción en base de datos
    return await SubscriptionService.updateSubscription(formData.subscriptionId, formData);
  };

  const updateMikrotikProfile = async (formData) => {
    // Actualizar perfil en Mikrotik
    return await MikrotikService.updateProfile(formData.routerIp, formData);
  };

  const verifyMikrotikSync = async (subscriptionId) => {
    // Verificar sincronización entre BD y Mikrotik
    return await SubscriptionService.verifySync(subscriptionId);
  };

  const restorePreviousConfiguration = async (rollbackData) => {
    // Restaurar configuración anterior
    return await SubscriptionService.restoreConfiguration(rollbackData);
  };

  const getMikrotikUserConfig = async (subscription) => {
    // Obtener configuración de usuario en Mikrotik
    return await MikrotikService.getUserConfig(subscription.routerIp, subscription.username);
  };

  const createConfigBackup = async (subscription) => {
    // Crear respaldo de configuración
    return await SubscriptionService.createBackup(subscription.id);
  };

  const updateSubscriptionForNodeChange = async (formData) => {
    // Actualizar suscripción para cambio de nodo
    return await SubscriptionService.updateForNodeChange(formData);
  };

  const createMikrotikUserInNewNode = async (formData, currentConfig) => {
    // Crear usuario en nuevo nodo Mikrotik
    return await MikrotikService.createUserInNewNode(formData.newRouterIp, currentConfig);
  };

  const verifyConnectivity = async (subscriptionId) => {
    // Verificar conectividad después del cambio
    return await SubscriptionService.verifyConnectivity(subscriptionId);
  };

  const validatePackageInZone = async (packageId, zoneId) => {
    // Validar que el paquete esté disponible en la zona
    return await SubscriptionService.validatePackageInZone(packageId, zoneId);
  };

  const rollbackMikrotikProfile = async () => {
    // Hacer rollback del perfil de Mikrotik
    if (rollbackData.value.originalMikrotikProfile) {
      return await MikrotikService.restoreProfile(rollbackData.value.originalMikrotikProfile);
    }
  };

  // ===============================
  // RETURN
  // ===============================
  
  return {
    // Estados
    transactionSteps,
    currentTransactionStep,
    transactionErrors,
    showTransactionProgress,
    
    // Métodos principales
    executeTransaction,
    rollbackTransaction,
    cancelTransaction,
    
    // Métodos auxiliares
    updateStep,
    shouldRollback,
    getCompletedSteps
  }
}