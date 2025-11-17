<template>
  <div class="recent-movements">
    <div class="section-header">
      <h3>{{ title }}</h3>
      <button v-if="showRefresh" class="refresh-button" @click="reloadData" title="Actualizar">
        <i class="fas fa-sync-alt"></i>
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>Cargando movimientos...</span>
    </div>

    <div v-else-if="movements.length === 0" class="no-data">
      <i class="fas fa-inbox"></i>
      <p>{{ emptyMessage }}</p>
    </div>

    <div v-else>
      <div class="movements-list">
        <div v-for="movement in movements" :key="movement.id" class="movement-item">
          <div class="movement-icon" :class="getTypeClass(movement.type)">
            <i :class="getTypeIcon(movement.type)"></i>
          </div>
          <div class="movement-content">
            <div class="movement-header">
              <span class="movement-title">{{ formatMovementTitle(movement) }}</span>
              <span class="movement-date">{{ formatDate(movement.date) }}</span>
            </div>
            <div class="movement-details">
              <span v-if="movement.source" class="movement-source">
                Desde: {{ movement.source }}
              </span>
              <span v-if="movement.destination" class="movement-destination">
                Hacia: {{ movement.destination }}
              </span>
              <span class="movement-user">
                Por: {{ movement.userName }}
              </span>
            </div>
            <div v-if="movement.notes" class="movement-notes">
              <i class="fas fa-comment-alt"></i>
              {{ movement.notes }}
            </div>
          </div>
          <div class="movement-actions">
            <button 
              v-if="movement.itemId" 
              class="action-button"
              @click="viewItem(movement.itemId)"
              title="Ver equipo"
            >
              <i class="fas fa-eye"></i>
            </button>
            <button 
              class="action-button"
              @click="viewMovementDetails(movement.id)"
              title="Ver detalles"
            >
              <i class="fas fa-info-circle"></i>
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="showViewAll" class="view-all">
        <button @click="viewAllMovements" class="view-all-button">
          Ver todos los movimientos
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import InventoryService from '../../services/inventory.service';

export default {
  name: 'RecentMovements',
  props: {
    /**
     * Título del componente
     */
    title: {
      type: String,
      default: 'Movimientos Recientes'
    },
    /**
     * Mostrar botón de actualización
     */
    showRefresh: {
      type: Boolean,
      default: true
    },
    /**
     * Mostrar botón "Ver todos"
     */
    showViewAll: {
      type: Boolean,
      default: true
    },
    /**
     * Número máximo de movimientos a mostrar
     */
    limit: {
      type: Number,
      default: 5
    },
    /**
     * Filtrar por tipo de movimiento
     */
    typeFilter: {
      type: String,
      default: null
    },
    /**
     * Filtrar por ID de equipo
     */
    itemId: {
      type: [Number, String],
      default: null
    },
    /**
     * Mensaje cuando no hay movimientos
     */
    emptyMessage: {
      type: String,
      default: 'No hay movimientos recientes para mostrar'
    }
  },
  data() {
    return {
      movements: [],
      loading: false
    };
  },
  created() {
    this.loadMovements();
  },
  methods: {
    /**
     * Carga los movimientos desde el servicio
     */
    async loadMovements() {
      this.loading = true;
      try {
        const params = { limit: this.limit };
        
        // Agregar filtros opcionales
        if (this.typeFilter) {
          params.type = this.typeFilter;
        }
        if (this.itemId) {
          params.itemId = this.itemId;
        }
        
        const response = await InventoryService.getRecentMovements(params);
        this.movements = response.data || [];
      } catch (error) {
        console.error('Error cargando movimientos recientes:', error);
        this.$emit('error', error);
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Recarga los datos desde el servicio
     */
    reloadData() {
      this.loadMovements();
    },
    
    /**
     * Muestra la vista de todos los movimientos
     */
    viewAllMovements() {
      this.$emit('view-all');
      this.$router.push({ name: 'InventoryMovements' });
    },
    
    /**
     * Navega a la vista de detalles del equipo
     */
    viewItem(itemId) {
      this.$emit('view-item', itemId);
      this.$router.push(`/inventory/${itemId}`);
    },
    
    /**
     * Muestra los detalles del movimiento
     */
    viewMovementDetails(movementId) {
      this.$emit('view-details', movementId);
      this.$router.push(`/inventory/movements/${movementId}`);
    },
    
    /**
     * Formatea la fecha del movimiento
     */
    formatDate(dateString) {
      if (!dateString) return '-';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      // Compara con fecha actual para formato relativo
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) {
        return 'Justo ahora';
      } else if (diffMins < 60) {
        return `Hace ${diffMins} min`;
      } else if (diffHours < 24) {
        return `Hace ${diffHours} h`;
      } else if (diffDays < 7) {
        return `Hace ${diffDays} d`;
      } else {
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },
    
    /**
     * Obtiene la clase CSS para el tipo de movimiento
     */
    getTypeClass(type) {
      const classMap = {
        'entry': 'type-entry',
        'exit': 'type-exit',
        'transfer': 'type-transfer',
        'assign': 'type-assign',
        'return': 'type-return',
        'repair': 'type-repair',
        'retired': 'type-retired'
      };
      
      return classMap[type] || 'type-default';
    },
    
    /**
     * Obtiene el icono para el tipo de movimiento
     */
    getTypeIcon(type) {
      const iconMap = {
        'entry': 'fas fa-arrow-down',
        'exit': 'fas fa-arrow-up',
        'transfer': 'fas fa-exchange-alt',
        'assign': 'fas fa-user-plus',
        'return': 'fas fa-undo',
        'repair': 'fas fa-tools',
        'retired': 'fas fa-archive'
      };
      
      return iconMap[type] || 'fas fa-dot-circle';
    },
    
    /**
     * Formatea el título del movimiento
     */
    formatMovementTitle(movement) {
      const typeMap = {
        'entry': `Entrada: ${movement.itemName || 'Equipo'}`,
        'exit': `Salida: ${movement.itemName || 'Equipo'}`,
        'transfer': `Transferencia: ${movement.itemName || 'Equipo'}`,
        'assign': `Asignación a cliente: ${movement.itemName || 'Equipo'}`,
        'return': `Devolución: ${movement.itemName || 'Equipo'}`,
        'repair': `Enviado a reparación: ${movement.itemName || 'Equipo'}`,
        'retired': `Retirado: ${movement.itemName || 'Equipo'}`
      };
      
      return typeMap[movement.type] || `${movement.itemName || 'Equipo'}`;
    }
  }
};
</script>

<style scoped>
.recent-movements {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
}

.section-header h3 {
  margin: 0;
  color: #333;
}

.refresh-button {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 16px;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.refresh-button:hover {
  background-color: #e0e0e0;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
  text-align: center;
}

.no-data i {
  font-size: 32px;
  margin-bottom: 16px;
  color: #ddd;
}

.movements-list {
  padding: 12px;
}

.movement-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}

.movement-item:last-child {
  border-bottom: none;
}

.movement-item:hover {
  background-color: #f5f5f5;
}

.movement-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: white;
  flex-shrink: 0;
}

.type-entry {
  background-color: #4CAF50;
}

.type-exit {
  background-color: #F44336;
}

.type-transfer {
  background-color: #2196F3;
}

.type-assign {
  background-color: #FF9800;
}

.type-return {
  background-color: #9C27B0;
}

.type-repair {
  background-color: #00BCD4;
}

.type-retired {
  background-color: #607D8B;
}

.type-default {
  background-color: #9E9E9E;
}

.movement-content {
  flex-grow: 1;
}

.movement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}

.movement-title {
  font-weight: bold;
}

.movement-date {
  color: #666;
  font-size: 0.85em;
  white-space: nowrap;
  margin-left: 8px;
}

.movement-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 0.9em;
  color: #555;
}

.movement-notes {
  font-size: 0.85em;
  color: #666;
  font-style: italic;
}

.movement-notes i {
  margin-right: 4px;
}

.movement-actions {
  margin-left: 12px;
}

.action-button {
  background: none;
  border: none;
  padding: 6px;
  font-size: 16px;
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s, color 0.2s;
}

.action-button:hover {
  background-color: #e0e0e0;
  color: #333;
}

.view-all {
  padding: 16px;
  text-align: center;
}

.view-all-button {
  background-color: transparent;
  color: #2196F3;
  border: 1px solid #2196F3;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.view-all-button:hover {
  background-color: #e3f2fd;
}

@media (max-width: 768px) {
  .movement-header {
    flex-direction: column;
  }
  
  .movement-date {
    margin-left: 0;
    margin-top: 4px;
  }
  
  .movement-details {
    flex-direction: column;
    gap: 4px;
  }
}
</style>