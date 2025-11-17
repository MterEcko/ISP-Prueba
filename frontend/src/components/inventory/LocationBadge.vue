<template>
  <div 
    class="location-badge" 
    :class="badgeClass"
    @click="showInfo && hasDetails && toggleDetails()"
  >
    <span class="location-icon">
      <i :class="getIcon()"></i>
    </span>
    <span class="location-text">{{ displayName }}</span>
    <span v-if="showInfo && hasDetails" class="location-info">
      <i class="icon-info"></i>
    </span>
    
    <!-- Panel de detalles -->
    <div v-if="showDetails" class="location-details" @click.stop>
      <div class="details-header">
        <h4>Información de ubicación</h4>
        <button @click="showDetails = false" class="btn-close">
          <i class="icon-close"></i>
        </button>
      </div>
      <div class="details-body">
        <!-- Nombre y tipo -->
        <div class="location-type">
          <span class="type-badge" :class="typeClass">{{ formattedLocationType }}</span>
        </div>
        
        <div class="location-info-row">
          <span class="label">Nombre:</span>
          <span class="value">{{ location }}</span>
        </div>
        
        <!-- Dirección si existe -->
        <div v-if="address" class="location-info-row">
          <span class="label">Dirección:</span>
          <span class="value">{{ address }}</span>
        </div>
        
        <!-- Coordenadas si existen -->
        <div v-if="hasCoordinates" class="location-info-row">
          <span class="label">Coordenadas:</span>
          <span class="value">
            {{ latitude }}, {{ longitude }}
            <button 
              class="btn-link" 
              @click="openMap"
              title="Ver en mapa"
            >
              <i class="icon-map-pin"></i>
            </button>
          </span>
        </div>
        
        <!-- Responsable si existe -->
        <div v-if="responsibleName" class="location-info-row">
          <span class="label">Responsable:</span>
          <span class="value">{{ responsibleName }}</span>
        </div>
        
        <!-- Información adicional -->
        <div v-if="description" class="location-info-row">
          <span class="label">Descripción:</span>
          <span class="value description">{{ description }}</span>
        </div>
        
        <!-- Información de capacidad si es un almacén -->
        <div v-if="isWarehouse && capacity" class="location-info-row">
          <span class="label">Capacidad:</span>
          <span class="value">
            <div class="capacity-bar">
              <div 
                class="capacity-fill" 
                :style="{ width: `${capacityPercentage}%` }"
                :class="capacityClass"
              ></div>
            </div>
            <span class="capacity-text" :class="capacityClass">
              {{ usedCapacity }}/{{ capacity }} ({{ capacityPercentage }}%)
            </span>
          </span>
        </div>
        
        <!-- Contenido actual si es un almacén -->
        <div v-if="isWarehouse && items && items.length > 0" class="warehouse-content">
          <h5>Contenido ({{ items.length }} elementos)</h5>
          <ul class="items-list">
            <li v-for="(item, index) in itemsToShow" :key="index">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-count">{{ item.count }}</span>
            </li>
          </ul>
          <div v-if="hasMoreItems" class="more-items">
            <button class="btn-link" @click="showAllItems = !showAllItems">
              {{ showAllItems ? 'Mostrar menos' : `Ver ${items.length - itemsLimit} más...` }}
            </button>
          </div>
        </div>
      </div>
      <div class="details-footer">
        <button 
          v-if="allowMove" 
          class="btn-secondary"
          @click="$emit('move-items')"
        >
          Mover elementos aquí
        </button>
        <button 
          class="btn-primary" 
          @click="$emit('view-location')"
        >
          Ver detalles completos
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LocationBadge',
  props: {
    /**
     * Nombre de la ubicación (requerido)
     */
    location: {
      type: String,
      required: true
    },
    /**
     * Tipo de ubicación
     * Valores posibles: 'warehouse', 'office', 'client', 'technician', 'installation', 'other'
     */
    locationType: {
      type: String,
      default: 'other',
      validator: value => ['warehouse', 'office', 'client', 'technician', 'installation', 'other', ''].includes(value)
    },
    /**
     * Dirección física
     */
    address: {
      type: String,
      default: ''
    },
    /**
     * Latitud para mapas
     */
    latitude: {
      type: [Number, String],
      default: null
    },
    /**
     * Longitud para mapas
     */
    longitude: {
      type: [Number, String],
      default: null
    },
    /**
     * Nombre del responsable de la ubicación
     */
    responsibleName: {
      type: String,
      default: ''
    },
    /**
     * Descripción adicional
     */
    description: {
      type: String,
      default: ''
    },
    /**
     * Capacidad total (para almacenes)
     */
    capacity: {
      type: [Number, String],
      default: null
    },
    /**
     * Capacidad utilizada (para almacenes)
     */
    usedCapacity: {
      type: [Number, String],
      default: null
    },
    /**
     * Elementos en la ubicación (para almacenes)
     * Array de objetos con formato { name: 'Nombre', count: 5 }
     */
    items: {
      type: Array,
      default: () => []
    },
    /**
     * Si es true, muestra el icono de información
     */
    showInfo: {
      type: Boolean,
      default: true
    },
    /**
     * Si es true, permite la funcionalidad de mover elementos
     */
    allowMove: {
      type: Boolean,
      default: true
    },
    /**
     * Tamaño del badge: 'small', 'medium' (default), 'large'
     */
    size: {
      type: String,
      default: 'medium',
      validator: value => ['small', 'medium', 'large'].includes(value)
    },
    /**
     * Si es true, muestra el tipo de ubicación junto al nombre
     */
    showType: {
      type: Boolean,
      default: false
    },
    /**
     * Límite de elementos a mostrar en la lista
     */
    itemsLimit: {
      type: Number,
      default: 5
    }
  },
  data() {
    return {
      showDetails: false,
      showAllItems: false
    };
  },
  computed: {
    /**
     * Clases CSS para el badge
     */
    badgeClass() {
      return [
        `type-${this.locationType || 'other'}`,
        `size-${this.size}`,
        { 'clickable': this.showInfo && this.hasDetails }
      ];
    },
    
    /**
     * Clase CSS específica para el tipo de ubicación
     */
    typeClass() {
      return `type-${this.locationType || 'other'}`;
    },
    
    /**
     * Comprobar si hay detalles para mostrar
     */
    hasDetails() {
      return this.address || 
        this.hasCoordinates || 
        this.responsibleName || 
        this.description || 
        (this.isWarehouse && (this.capacity || (this.items && this.items.length > 0)));
    },
    
    /**
     * Comprobar si hay coordenadas válidas
     */
    hasCoordinates() {
      return this.latitude !== null && this.longitude !== null &&
        this.latitude !== undefined && this.longitude !== undefined &&
        this.latitude !== '' && this.longitude !== '';
    },
    
    /**
     * Determinar si es un almacén
     */
    isWarehouse() {
      return this.locationType === 'warehouse';
    },
    
    /**
     * Calcular el porcentaje de capacidad utilizada
     */
    capacityPercentage() {
      if (this.capacity && this.usedCapacity) {
        const capacity = parseFloat(this.capacity);
        const used = parseFloat(this.usedCapacity);
        
        if (!isNaN(capacity) && !isNaN(used) && capacity > 0) {
          const percentage = Math.round((used / capacity) * 100);
          return Math.min(100, Math.max(0, percentage));
        }
      }
      
      return 0;
    },
    
    /**
     * Determinar la clase CSS para la barra de capacidad
     */
    capacityClass() {
      if (this.capacityPercentage >= 90) {
        return 'capacity-critical';
      } else if (this.capacityPercentage >= 75) {
        return 'capacity-warning';
      } else {
        return 'capacity-normal';
      }
    },
    
    /**
     * Formatear el tipo de ubicación para mostrar
     */
    formattedLocationType() {
      const typeMap = {
        warehouse: 'Almacén',
        office: 'Oficina',
        client: 'Cliente',
        technician: 'Técnico',
        installation: 'Instalación',
        other: 'Otra'
      };
      
      return typeMap[this.locationType] || 'Ubicación';
    },
    
    /**
     * Generar nombre para mostrar
     */
    displayName() {
      if (this.showType && this.locationType) {
        return `${this.location} (${this.formattedLocationType})`;
      }
      return this.location;
    },
    
    /**
     * Elementos a mostrar en la lista con límite
     */
    itemsToShow() {
      if (!this.items || this.items.length === 0) {
        return [];
      }
      
      if (this.showAllItems) {
        return this.items;
      }
      
      return this.items.slice(0, this.itemsLimit);
    },
    
    /**
     * Verificar si hay más elementos que el límite
     */
    hasMoreItems() {
      return this.items && this.items.length > this.itemsLimit;
    }
  },
  methods: {
    /**
     * Obtener ícono según el tipo de ubicación
     */
    getIcon() {
      const icons = {
        warehouse: 'icon-box',
        office: 'icon-building',
        client: 'icon-home',
        technician: 'icon-user',
        installation: 'icon-map-pin',
        other: 'icon-map'
      };
      
      return icons[this.locationType] || 'icon-map';
    },
    
    /**
     * Alternar visualización de detalles
     */
    toggleDetails() {
      this.showDetails = !this.showDetails;
    },
    
    /**
     * Abrir mapa con las coordenadas
     */
    openMap() {
      if (!this.hasCoordinates) return;
      
      const url = `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
      window.open(url, '_blank');
      
      this.$emit('open-map', { latitude: this.latitude, longitude: this.longitude });
    }
  }
};
</script>

<style scoped>
.location-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
  position: relative;
  white-space: nowrap;
}

/* Tamaños */
.location-badge.size-small {
  padding: 2px 6px;
  font-size: 11px;
}

.location-badge.size-large {
  padding: 6px 10px;
  font-size: 14px;
}

/* Estilos por tipo */
.location-badge.type-warehouse {
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
}

.location-badge.type-office {
  background-color: var(--success-lightest, #e8f5e9);
  color: var(--success-color, #2e7d32);
}

.location-badge.type-client {
  background-color: var(--warning-lightest, #fff8e1);
  color: var(--warning-color, #f57c00);
}

.location-badge.type-technician {
  background-color: var(--info-lightest, #e1f5fe);
  color: var(--info-color, #0288d1);
}

.location-badge.type-installation {
  background-color: var(--secondary-lightest, #f3e5f5);
  color: var(--secondary-color, #7b1fa2);
}

/* Ícono */
.location-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.size-small .location-icon {
  font-size: 10px;
}

.size-large .location-icon {
  font-size: 12px;
}

/* Icono de información */
.location-info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.1);
  cursor: pointer;
  margin-left: 2px;
  font-size: 10px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.location-info:hover {
  opacity: 1;
}

/* Estilo cuando es clickable */
.location-badge.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.location-badge.clickable:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Panel de detalles */
.location-details {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 100;
  width: 300px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  font-weight: normal;
  text-align: left;
}

.location-details::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 20px;
  width: 12px;
  height: 12px;
  background-color: var(--bg-primary, white);
  transform: rotate(45deg);
  border-left: 1px solid var(--border-color, #e0e0e0);
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.details-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.btn-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary, #666);
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.details-body {
  padding: 16px;
  font-size: 13px;
  color: var(--text-primary, #333);
}

/* Insignia de tipo */
.location-type {
  margin-bottom: 12px;
}

.type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.type-badge.type-warehouse {
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
}

.type-badge.type-office {
  background-color: var(--success-lightest, #e8f5e9);
  color: var(--success-color, #2e7d32);
}

.type-badge.type-client {
  background-color: var(--warning-lightest, #fff8e1);
  color: var(--warning-color, #f57c00);
}

.type-badge.type-technician {
  background-color: var(--info-lightest, #e1f5fe);
  color: var(--info-color, #0288d1);
}

.type-badge.type-installation {
  background-color: var(--secondary-lightest, #f3e5f5);
  color: var(--secondary-color, #7b1fa2);
}

.type-badge.type-other {
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-secondary, #666);
}

/* Filas de información */
.location-info-row {
  display: flex;
  margin-bottom: 10px;
}

.location-info-row .label {
  width: 90px;
  font-weight: 500;
  color: var(--text-secondary, #666);
}

.location-info-row .value {
  flex: 1;
}

.location-info-row .value.description {
  white-space: pre-line;
}

/* Botón de enlace */
.btn-link {
  background: transparent;
  border: none;
  color: var(--primary-color, #1976d2);
  padding: 0;
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
}

.btn-link:hover {
  color: var(--primary-dark, #1565c0);
}

/* Barra de capacidad */
.capacity-bar {
  width: 100%;
  height: 8px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.capacity-fill {
  height: 100%;
  background-color: var(--success-color, #4caf50);
  border-radius: 4px;
}

.capacity-fill.capacity-warning {
  background-color: var(--warning-color, #ff9800);
}

.capacity-fill.capacity-critical {
  background-color: var(--error-color, #f44336);
}

.capacity-text {
  font-size: 12px;
}

.capacity-text.capacity-warning {
  color: var(--warning-color, #ff9800);
}

.capacity-text.capacity-critical {
  color: var(--error-color, #f44336);
}

/* Contenido del almacén */
.warehouse-content {
  margin-top: 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  padding-top: 12px;
}

.warehouse-content h5 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.items-list li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
  font-size: 12px;
}

.items-list li:last-child {
  border-bottom: none;
}

.item-name {
  flex: 1;
}

.item-count {
  font-weight: 500;
  margin-left: 16px;
}

.more-items {
  margin-top: 8px;
  text-align: center;
}

/* Pie del panel */
.details-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Botones estándar */
.btn-primary {
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: var(--primary-dark, #1565c0);
}

.btn-secondary {
  background-color: transparent;
  color: var(--primary-color, #1976d2);
  border: 1px solid var(--primary-color, #1976d2);
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background-color: var(--primary-lightest, #e3f2fd);
}
</style>