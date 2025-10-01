<template>
  <div class="package-selector">
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Cargando paquetes disponibles...</span>
    </div>

    <!-- No packages available -->
    <div v-else-if="availablePackages.length === 0" class="no-packages">
      <div class="no-packages-icon">📦</div>
      <h4>No hay paquetes disponibles</h4>
      <p v-if="zoneId">No se encontraron paquetes para la zona seleccionada.</p>
      <p v-else>No se encontraron paquetes de servicio.</p>
      <button @click="$emit('loadAllPackages')" class="btn-load-all">
        Cargar todos los paquetes
      </button>
    </div>

    <!-- Package selection -->
    <div v-else class="package-selection">
      <!-- Current package indicator (for changes) -->
      <div v-if="currentPackage && operationType !== 'CREATE_NEW'" class="current-package">
        <h4>📊 Paquete Actual</h4>
        <PackageCard 
          :package="currentPackage" 
          :selected="false"
          :current="true"
          :showActions="false"
        />
      </div>

      <!-- Package selector -->
      <div class="package-list-header">
        <h4>{{ getPackageListTitle() }}</h4>
        <div class="package-filters" v-if="availablePackages.length > 3">
          <select v-model="sortBy" @change="sortPackages">
            <option value="price">Ordenar por precio</option>
            <option value="speed">Ordenar por velocidad</option>
            <option value="name">Ordenar por nombre</option>
          </select>
          <select v-model="filterBy" @change="filterPackages">
            <option value="">Todos los tipos</option>
            <option value="residential">Residencial</option>
            <option value="business">Empresarial</option>
          </select>
        </div>
      </div>

      <!-- Package cards grid -->
      <div class="package-grid">
        <PackageCard
          v-for="pkg in filteredAndSortedPackages"
          :key="pkg.id"
          :package="pkg"
          :selected="pkg.id == selectedPackageId"
          :current="currentPackage && pkg.id === currentPackage.id"
          :recommended="getRecommendedStatus(pkg)"
          :showComparison="!!currentPackage && operationType !== 'CREATE_NEW'"
          :comparedTo="currentPackage"
          @select="selectPackage(pkg)"
        />
      </div>

      <!-- Package comparison (if changing) -->
      <div v-if="selectedPackage && currentPackage && operationType !== 'CREATE_NEW'" class="package-comparison">
        <h4>🔄 Comparación de Cambios</h4>
        <PackageComparison 
          :currentPackage="currentPackage"
          :newPackage="selectedPackage"
          :operationType="operationType"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import PackageCard from './PackageCard.vue'
import PackageComparison from './PackageComparison.vue'

export default {
  name: 'PackageSelector',
  components: {
    PackageCard,
    PackageComparison
  },
  props: {
    modelValue: {
      type: [Number, String],
      default: null
    },
    availablePackages: {
      type: Array,
      required: true
    },
    currentPackage: {
      type: Object,
      default: null
    },
    operationType: {
      type: String,
      required: true
    },
    zoneId: {
      type: [Number, String],
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'packageSelected', 'loadAllPackages'],
  setup(props, { emit }) {
    // ===============================
    // ESTADO LOCAL
    // ===============================
    
    const sortBy = ref('price')
    const filterBy = ref('')
    
    // ===============================
    // COMPUTED PROPERTIES
    // ===============================
    
    const selectedPackageId = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value)
    })

    const selectedPackage = computed(() => {
      if (!selectedPackageId.value) return null
      return props.availablePackages.find(pkg => pkg.id == selectedPackageId.value)
    })

    const filteredAndSortedPackages = computed(() => {
      let packages = [...props.availablePackages]
      
      // Filtrar por tipo si está seleccionado
      if (filterBy.value) {
        packages = packages.filter(pkg => pkg.type === filterBy.value)
      }
      
      // Ordenar según criterio seleccionado
      packages.sort((a, b) => {
        switch (sortBy.value) {
          case 'price':
            return parseFloat(a.price || 0) - parseFloat(b.price || 0)
          case 'speed':
            return (b.downloadSpeedMbps || 0) - (a.downloadSpeedMbps || 0)
          case 'name':
            return a.name.localeCompare(b.name)
          default:
            return 0
        }
      })
      
      return packages
    })

    // ===============================
    // MÉTODOS
    // ===============================
    
    const getPackageListTitle = () => {
      const titles = {
        'CREATE_NEW': '📦 Seleccionar Paquete de Servicio',
        'CHANGE_PLAN': '🔄 Nuevo Paquete',
        'CHANGE_ZONE': '📍 Paquetes Disponibles en Nueva Zona',
        'CHANGE_NODE': '📦 Confirmar Paquete',
        'CHANGE_ADDRESS': '📦 Paquete Actual'
      }
      return titles[props.operationType] || '📦 Seleccionar Paquete'
    }

    const selectPackage = (pkg) => {
      console.log('📦 Paquete seleccionado:', pkg.name)
      
      selectedPackageId.value = pkg.id
      
      emit('packageSelected', {
        package: pkg,
        operationType: props.operationType,
        isUpgrade: isUpgrade(pkg),
        isDowngrade: isDowngrade(pkg)
      })
    }

    const getRecommendedStatus = (pkg) => {
      if (!props.currentPackage || props.operationType === 'CREATE_NEW') return false
      
      // Recomendar paquetes similares o mejores
      const currentSpeed = props.currentPackage.downloadSpeedMbps || 0
      const packageSpeed = pkg.downloadSpeedMbps || 0
      const currentPrice = parseFloat(props.currentPackage.price || 0)
      const packagePrice = parseFloat(pkg.price || 0)
      
      // Recomendar si tiene velocidad similar o mejor con precio razonable
      return packageSpeed >= currentSpeed && packagePrice <= currentPrice * 1.2
    }

    const isUpgrade = (pkg) => {
      if (!props.currentPackage) return false
      
      const currentSpeed = props.currentPackage.downloadSpeedMbps || 0
      const packageSpeed = pkg.downloadSpeedMbps || 0
      
      return packageSpeed > currentSpeed
    }

    const isDowngrade = (pkg) => {
      if (!props.currentPackage) return false
      
      const currentSpeed = props.currentPackage.downloadSpeedMbps || 0
      const packageSpeed = pkg.downloadSpeedMbps || 0
      
      return packageSpeed < currentSpeed
    }

    const sortPackages = () => {
      console.log('🔄 Ordenando paquetes por:', sortBy.value)
    }

    const filterPackages = () => {
      console.log('🔍 Filtrando paquetes por:', filterBy.value || 'todos')
    }

    // ===============================
    // WATCHERS
    // ===============================
    
    watch(() => props.zoneId, (newZoneId) => {
      if (newZoneId) {
        console.log('🌍 Zona cambiada, actualizando paquetes disponibles:', newZoneId)
        // Limpiar selección si el paquete actual no está disponible
        if (selectedPackageId.value) {
          const packageExists = props.availablePackages.some(pkg => pkg.id == selectedPackageId.value)
          if (!packageExists) {
            console.log('⚠️ Paquete seleccionado no disponible en nueva zona, limpiando selección')
            selectedPackageId.value = null
          }
        }
      }
    })

    return {
      // Estado
      sortBy,
      filterBy,
      
      // Computed
      selectedPackageId,
      selectedPackage,
      filteredAndSortedPackages,
      
      // Métodos
      getPackageListTitle,
      selectPackage,
      getRecommendedStatus,
      isUpgrade,
      isDowngrade,
      sortPackages,
      filterPackages
    }
  }
}
</script>

<style scoped>
.package-selector {
  width: 100%;
}

/* Loading state */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: #666;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* No packages state */
.no-packages {
  text-align: center;
  padding: 40px;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 2px dashed #ddd;
}

.no-packages-icon {
  font-size: 3em;
  margin-bottom: 16px;
}

.no-packages h4 {
  margin: 0 0 8px 0;
  color: #666;
}

.no-packages p {
  margin: 0 0 16px 0;
  color: #999;
}

.btn-load-all {
  background-color: #ff9800;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-load-all:hover {
  background-color: #f57c00;
}

/* Current package */
.current-package {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f0f4f8;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.current-package h4 {
  margin: 0 0 12px 0;
  color: #1976d2;
}

/* Package list */
.package-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.package-list-header h4 {
  margin: 0;
  color: #333;
}

.package-filters {
  display: flex;
  gap: 12px;
}

.package-filters select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
}

/* Package grid */
.package-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

/* Package comparison */
.package-comparison {
  padding: 20px;
  background-color: #fff8e1;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.package-comparison h4 {
  margin: 0 0 16px 0;
  color: #ef6c00;
}

/* Responsive */
@media (max-width: 768px) {
  .package-list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .package-filters {
    width: 100%;
    justify-content: space-between;
  }
  
  .package-filters select {
    flex: 1;
  }
  
  .package-grid {
    grid-template-columns: 1fr;
  }
}
</style>