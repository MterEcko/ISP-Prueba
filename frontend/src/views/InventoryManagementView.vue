<template>
  <div class="inventory-list">
    <div class="page-header">
      <div class="header-content">
        <h2>
          <i class="fas fa-boxes mr-3"></i>
          Gestión de Inventario
        </h2>
        <div class="header-stats">
          <div class="stat-item available">
            <span class="stat-number">{{ stats.available || 0 }}</span>
            <span class="stat-label">Disponibles</span>
          </div>
          <div class="stat-item in-use">
            <span class="stat-number">{{ stats.inUse || 0 }}</span>
            <span class="stat-label">En Uso</span>
          </div>
          <div class="stat-item defective">
            <span class="stat-number">{{ stats.defective || 0 }}</span>
            <span class="stat-label">Defectuosos</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Filtros y controles -->
    <div class="filters-section">
      <div class="search-controls">
        <div class="search-box">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            v-model="searchName" 
            placeholder="Buscar por nombre, serial, MAC..."
            @keyup.enter="loadInventory"
            @input="debouncedSearch"
          />
          <button 
            v-if="searchName" 
            @click="clearSearch" 
            class="clear-search"
            title="Limpiar búsqueda"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <button @click="showAdvancedFilters = !showAdvancedFilters" class="filters-toggle">
          <i class="fas fa-filter"></i>
          Filtros
          <i :class="showAdvancedFilters ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
        </button>
      </div>
      
      <!-- Filtros avanzados (colapsables) -->
      <div v-show="showAdvancedFilters" class="advanced-filters">
        <div class="filter-row">
          <div class="filter-group">
            <label>Marca</label>
            <select v-model="selectedBrand" @change="loadInventory">
              <option value="">Todas las marcas</option>
              <option v-for="brand in brands" :key="brand" :value="brand">
                {{ brand }}
              </option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Estado</label>
            <select v-model="selectedStatus" @change="loadInventory">
              <option value="">Todos los estados</option>
              <option value="available">Disponible</option>
              <option value="inUse">En uso</option>
              <option value="defective">Defectuoso</option>
              <option value="inRepair">En reparación</option>
              <option value="retired">Retirado</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Ubicación</label>
            <select v-model="selectedLocation" @change="loadInventory">
              <option value="">Todas las ubicaciones</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Asignación</label>
            <select v-model="assignedFilter" @change="loadInventory">
              <option value="">Todos</option>
              <option value="true">Asignados</option>
              <option value="false">No asignados</option>
            </select>
          </div>
        </div>
        
        <div class="filter-actions">
          <button @click="clearFilters" class="btn-clear-filters">
            <i class="fas fa-broom"></i>
            Limpiar Filtros
          </button>
          <button @click="loadInventory" class="btn-apply-filters">
            <i class="fas fa-check"></i>
            Aplicar
          </button>
        </div>
      </div>
      
      <!-- Controles de acción -->
      <div class="action-controls">
        <div class="view-controls">
          <button 
            :class="['view-btn', { active: viewMode === 'table' }]"
            @click="viewMode = 'table'"
            title="Vista de tabla"
          >
            <i class="fas fa-table"></i>
          </button>
          <button 
            :class="['view-btn', { active: viewMode === 'cards' }]"
            @click="viewMode = 'cards'"
            title="Vista de tarjetas"
          >
            <i class="fas fa-th-large"></i>
          </button>
        </div>
        
        <div class="action-buttons">
          <button @click="exportInventory" class="btn-export">
            <i class="fas fa-download"></i>
            Exportar
          </button>
          <button @click="openNewInventoryForm" class="btn-add">
            <i class="fas fa-plus"></i>
            Nuevo Item
          </button>
        </div>
      </div>
    </div>
    
    <!-- Estados de carga -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Cargando inventario...</p>
      </div>
    </div>
    
    <div v-else-if="items.length === 0 && !loading" class="empty-state">
      <div class="empty-content">
        <i class="fas fa-box-open"></i>
        <h3>{{ searchName || hasActiveFilters ? 'No se encontraron resultados' : 'No hay items en el inventario' }}</h3>
        <p>{{ searchName || hasActiveFilters ? 'Intenta modificar los filtros de búsqueda' : 'Comienza agregando tu primer equipo al inventario' }}</p>
        <button v-if="!searchName && !hasActiveFilters" @click="openNewInventoryForm" class="btn-primary">
          <i class="fas fa-plus"></i>
          Agregar Primer Item
        </button>
      </div>
    </div>
    
    <!-- Vista de tabla -->
    <div v-else-if="viewMode === 'table'" class="table-view">
      <div class="table-container">
        <table class="inventory-table">
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox" 
                  v-model="selectAll" 
                  @change="toggleSelectAll"
                  :indeterminate.prop="someSelected"
                />
              </th>
              <th @click="sortBy('id')" class="sortable">
                ID
                <i :class="getSortIcon('id')"></i>
              </th>
              <th @click="sortBy('name')" class="sortable">
                Nombre
                <i :class="getSortIcon('name')"></i>
              </th>
              <th>Marca/Modelo</th>
              <th>N° Serie</th>
              <th>MAC</th>
              <th>Estado</th>
              <th>Ubicación</th>
              <th>Cliente Asignado</th>
              <th>Cantidad</th>
              <th class="actions-header">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <!-- Mostrar grupos de equipos con mismo serial -->
            <template v-for="group in groupedItems" :key="group.groupKey">
              <!-- Si es un grupo con múltiples equipos -->
              <template v-if="group.items.length > 1">
                <!-- Fila de grupo (cabecera) -->
                <tr class="group-header-row" @click="toggleGroup(group.groupKey)">
                  <td>
                    <input 
                      type="checkbox" 
                      @click.stop
                      :checked="isGroupSelected(group)"
                      @change="toggleGroupSelection(group, $event)"
                    />
                  </td>
                  <td colspan="2">
                    <div class="group-header">
                      <i :class="group.expanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"></i>
                      <strong>{{ group.items[0].name }}</strong>
                      <span class="group-count">({{ group.items.length }} equipos)</span>
                    </div>
                  </td>
                  <td>
                    <div class="brand-model">
                      <span class="brand">{{ group.items[0].brand || '-' }}</span>
                      <span class="model">{{ group.items[0].model || '-' }}</span>
                    </div>
                  </td>
                  <td>
                    <code class="serial">{{ group.items[0].serialNumber || '-' }}</code>
                  </td>
                  <td>
                    <div class="mac-summary">
                      <span class="mac-count">{{ group.macCount }} MAC{{ group.macCount !== 1 ? 's' : '' }}</span>
                      <button @click.stop="showGroupMacs(group)" class="btn-show-macs" title="Ver todas las MACs">
                        <i class="fas fa-list"></i>
                      </button>
                    </div>
                  </td>
                  <td>
                    <div class="status-summary">
                      <span v-for="(count, status) in group.statusSummary" :key="status" :class="['status-mini', status]">
                        {{ count }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="location-summary">
                      <span v-if="group.locations.length === 1">{{ group.locations[0] }}</span>
                      <span v-else class="multiple-locations">{{ group.locations.length }} ubicaciones</span>
                    </div>
                  </td>
                  <td>
                    <div class="client-summary">
                      <span v-if="group.assignedCount === 0">No asignados</span>
                      <span v-else-if="group.assignedCount === group.items.length">Todos asignados</span>
                      <span v-else>{{ group.assignedCount }}/{{ group.items.length }} asignados</span>
                    </div>
                  </td>
                  <td>
                    <span class="quantity">{{ group.items.length }}</span>
                  </td>
                  <td class="actions">
                    <div class="group-actions">
                      <button @click.stop="assignGroupToClient(group)" title="Asignar disponibles" class="btn-action assign"
                              v-if="group.availableCount > 0">
                        <i class="fas fa-user-plus"></i>
                        <span class="action-count">{{ group.availableCount }}</span>
                      </button>
                      <button @click.stop="showGroupDetails(group)" title="Ver detalles" class="btn-action view">
                          👁️ <i class="fas fa-list"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                
                <!-- Filas de equipos individuales (expandibles) -->
                <template v-if="group.expanded">
                  <tr v-for="item in group.items" :key="item.id" 
                      :class="['group-item-row', { 'selected': selectedItems.includes(item.id) }]">
                    <td>
                      <input 
                        type="checkbox" 
                        :value="item.id" 
                        v-model="selectedItems"
                      />
                    </td>
                    <td>
                      <span class="item-id">#{{ item.id }}</span>
                    </td>
                    <td>
                      <div class="item-name sub-item">
                        <i class="fas fa-arrow-right"></i>
                        {{ item.name }}
                        <small v-if="item.description">{{ item.description }}</small>
                      </div>
                    </td>
                    <td>
                      <div class="brand-model">
                        <span class="brand">{{ item.brand || '-' }}</span>
                        <span class="model">{{ item.model || '-' }}</span>
                      </div>
                    </td>
                    <td>
                      <code class="serial">{{ item.serialNumber || '-' }}</code>
                    </td>
                    <td>
                      <code class="mac" v-if="item.macAddress">{{ formatMacAddress(item.macAddress) }}</code>
                      <span v-else class="no-data">Sin MAC</span>
                    </td>
                    <td>
                      <span :class="['status-badge', item.status]">
                        <i :class="getStatusIcon(item.status)"></i>
                        {{ formatStatus(item.status) }}
                      </span>
                    </td>
                    <td>
                      <div class="location-info">
                        <i class="fas fa-map-marker-alt"></i>
                        {{ item.location ? item.location.name : '-' }}
                      </div>
                    </td>
                    <td>
                      <div v-if="item.assignedClient" class="client-info">
                        <i class="fas fa-user"></i>
                        {{ item.assignedClient.firstName }} {{ item.assignedClient.lastName }}
                      </div>
                      <span v-else class="no-client">No asignado</span>
                    </td>
                    <td>
                      <span class="quantity">1</span>
                    </td>
                    <td class="actions">
                      <div class="action-buttons">
                        <button @click="viewItem(item.id)" title="Ver detalles" class="btn-action view">
                            👁️ <i class="fas fa-eye"></i>
                        </button>
                        <button @click="editItem(item.id)" title="Editar" class="btn-action edit">
                           ✏️ <i class="fas fa-edit"></i>
                        </button>
                        <button 
                          @click="changeStatus(item)" 
                          title="Cambiar estado"
                          class="btn-action status"
                        >🔄
                          <i class="fas fa-exchange-alt"></i>
                        </button>
                        <button 
                          @click="assignToClient(item)" 
                          title="Asignar a cliente"
                          v-if="item.status === 'available'"
                          class="btn-action assign"
                        >👥
                          <i class="fas fa-user-plus"></i>
                        </button>
                        <button 
                          @click="unassignFromClient(item)" 
                          title="Desasignar cliente"
                          v-if="item.assignedClient"
                          class="btn-action unassign"
                        >👥
                          <i class="fas fa-user-minus"></i>
                        </button>
                        <button @click="confirmDelete(item)" title="Eliminar" class="btn-action delete">
                          🗑️<i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>
              </template>
              
              <!-- Si es un equipo individual (no agrupado) -->
              <template v-else>
                <tr :class="{ 'selected': selectedItems.includes(group.items[0].id) }">
                  <td>
                    <input 
                      type="checkbox" 
                      :value="group.items[0].id" 
                      v-model="selectedItems"
                    />
                  </td>
                  <td>
                    <span class="item-id">#{{ group.items[0].id }}</span>
                  </td>
                  <td>
                    <div class="item-name">
                      <strong>{{ group.items[0].name }}</strong>
                      <small v-if="group.items[0].description">{{ group.items[0].description }}</small>
                    </div>
                  </td>
                  <td>
                    <div class="brand-model">
                      <span class="brand">{{ group.items[0].brand || '-' }}</span>
                      <span class="model">{{ group.items[0].model || '-' }}</span>
                    </div>
                  </td>
                  <td>
                    <code class="serial">{{ group.items[0].serialNumber || '-' }}</code>
                  </td>
                  <td>
                    <code class="mac" v-if="group.items[0].macAddress">{{ formatMacAddress(group.items[0].macAddress) }}</code>
                    <span v-else class="no-data">-</span>
                  </td>
                  <td>
                    <span :class="['status-badge', group.items[0].status]">
                      <i :class="getStatusIcon(group.items[0].status)"></i>
                      {{ formatStatus(group.items[0].status) }}
                    </span>
                  </td>
                  <td>
                    <div class="location-info">
                      <i class="fas fa-map-marker-alt"></i>
                      {{ group.items[0].location ? group.items[0].location.name : '-' }}
                    </div>
                  </td>
                  <td>
                    <div v-if="group.items[0].assignedClient" class="client-info">
                      <i class="fas fa-user"></i>
                      {{ group.items[0].assignedClient.firstName }} {{ group.items[0].assignedClient.lastName }}
                    </div>
                    <span v-else class="no-client">No asignado</span>
                  </td>
                  <td>
                    <span class="quantity">{{ group.items[0].quantity || 1 }}</span>
                  </td>
                  <td class="actions">
                    <div class="action-buttons">
                      <button @click="viewItem(group.items[0].id)" title="Ver detalles" class="btn-action view">
                         👁️ <i class="fas fa-eye"></i>
                      </button>
                      <button @click="editItem(group.items[0].id)" title="Editar" class="btn-action edit">
                         ✏️ <i class="fas fa-edit"></i>
                      </button>
                      <button 
                        @click="changeStatus(group.items[0])" 
                        title="Cambiar estado"
                        class="btn-action status"
                      >🔄
                        <i class="fas fa-exchange-alt"></i>
                      </button>
                      <button 
                        @click="assignToClient(group.items[0])" 
                        title="Asignar a cliente"
                        v-if="group.items[0].status === 'available'"
                        class="btn-action assign"
                      >👥
                        <i class="fas fa-user-plus"></i>
                      </button>
                      <button 
                        @click="unassignFromClient(group.items[0])" 
                        title="Desasignar cliente"
                        v-if="group.items[0].assignedClient"
                        class="btn-action unassign"
                      >👥
                        <i class="fas fa-user-minus"></i>
                      </button>
                      <button @click="confirmDelete(group.items[0])" title="Eliminar" class="btn-action delete">
                        🗑️<i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Vista de tarjetas -->
    <div v-else-if="viewMode === 'cards'" class="cards-view">
      <div class="cards-grid">
        <div v-for="item in items" :key="item.id" class="inventory-card">
          <div class="card-header">
            <div class="card-checkbox">
              <input type="checkbox" :value="item.id" v-model="selectedItems" />
            </div>
            <div class="card-status">
              <span :class="['status-badge', item.status]">
                <i :class="getStatusIcon(item.status)"></i>
                {{ formatStatus(item.status) }}
              </span>
            </div>
          </div>
          
          <div class="card-content">
            <h3 class="item-name">{{ item.name }}</h3>
            <div class="item-details">
              <div class="detail-row">
                <i class="fas fa-tag"></i>
                <span>{{ item.brand }} {{ item.model }}</span>
              </div>
              <div class="detail-row" v-if="item.serialNumber">
                <i class="fas fa-barcode"></i>
                <code>{{ item.serialNumber }}</code>
              </div>
              <div class="detail-row" v-if="item.macAddress">
                <i class="fas fa-network-wired"></i>
                <code>{{ formatMacAddress(item.macAddress) }}</code>
              </div>
              <div class="detail-row">
                <i class="fas fa-map-marker-alt"></i>
                <span>{{ item.location ? item.location.name : 'Sin ubicación' }}</span>
              </div>
              <div class="detail-row" v-if="item.assignedClient">
                <i class="fas fa-user"></i>
                <span>{{ item.assignedClient.firstName }} {{ item.assignedClient.lastName }}</span>
              </div>
            </div>
          </div>
          
          <div class="card-actions">
            <button @click="viewItem(item.id)" class="card-btn view">
               👁️ <i class="fas fa-eye"></i>
            </button>
            <button @click="editItem(item.id)" class="card-btn edit">
               ✏️ <i class="fas fa-edit"></i>
            </button>
            <button @click="changeStatus(item)" class="card-btn status">
              👥<i class="fas fa-exchange-alt"></i>
            </button>
            <button @click="confirmDelete(item)" class="card-btn delete">
              🗑️<i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Acciones en lote -->
    <div v-if="selectedItems.length > 0" class="bulk-actions">
      <div class="bulk-actions-content">
        <span class="selected-count">
          {{ selectedItems.length }} elemento{{ selectedItems.length > 1 ? 's' : '' }} seleccionado{{ selectedItems.length > 1 ? 's' : '' }}
        </span>
        <div class="bulk-buttons">
          <button @click="bulkChangeStatus" class="bulk-btn">
            <i class="fas fa-exchange-alt"></i>
            Cambiar Estado🔄
          </button>
          <button @click="bulkAssignToLocation" class="bulk-btn">
            <i class="fas fa-map-marker-alt"></i>
            Asignar Ubicación
          </button>
          <button @click="bulkDelete" class="bulk-btn danger">
            🗑️<i class="fas fa-trash"></i>
            Eliminar
          </button>
        </div>
      </div>
    </div>
    
    <!-- Paginación -->
    <div v-if="totalPages > 1" class="pagination-container">
      <div class="pagination-info">
        Mostrando {{ (currentPage - 1) * pageSize + 1 }} - 
        {{ Math.min(currentPage * pageSize, totalItems) }} de {{ totalItems }} elementos
      </div>
      
      <nav class="pagination">
        <button 
          @click="changePage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          <i class="fas fa-chevron-left"></i>
          Anterior
        </button>
        
        <div class="pagination-pages">
          <button 
            v-for="page in visiblePages" 
            :key="page"
            @click="changePage(page)"
            :class="['pagination-page', { active: currentPage === page }]"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          @click="changePage(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Siguiente
          <i class="fas fa-chevron-right"></i>
        </button>
      </nav>
    </div>
    
    <!-- Modal de confirmación de eliminación -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
      <div class="modal-content delete-modal">
        <div class="modal-header">
          <h3>
            <i class="fas fa-exclamation-triangle"></i>
            🗑️ Confirmar Eliminación
          </h3>
          <button @click="closeDeleteModal" class="modal-close">
            <i class="fas fa-times">🗑️</i>
          </button>
        </div>
        <div class="modal-body">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            Esta acción no se puede deshacer.
          </div>
          <p>¿Está seguro que desea eliminar el item <strong>{{ itemToDelete?.name }}</strong>?</p>
          <div v-if="itemToDelete" class="item-info">
            <div class="info-row">
              <span class="label">Serial:</span>
              <span class="value">{{ itemToDelete.serialNumber || 'N/A' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Marca/Modelo:</span>
              <span class="value">{{ itemToDelete.brand }} {{ itemToDelete.model }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDeleteModal" class="btn-secondary">Cancelar</button>
          <button @click="deleteItem" class="btn-danger" :disabled="deletingInProgress">
            <i v-if="deletingInProgress" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-trash"></i>
            {{ deletingInProgress ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modal de cambio de estado -->
    <div v-if="showStatusModal" class="modal-overlay" @click.self="closeStatusModal">
      <div class="modal-content status-modal">
        <div class="modal-header">
          <h3>
            <i class="fas fa-exchange-alt"></i>
            Cambiar Estado
          </h3>
          <button @click="closeStatusModal" class="modal-close">
            🔄<i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveStatusChange">
            <div class="form-group">
              <label for="newStatus">Nuevo Estado *</label>
              <select id="newStatus" v-model="statusChange.status" required class="form-control">
                <option value="available">Disponible</option>
                <option value="inUse">En uso</option>
                <option value="defective">Defectuoso</option>
                <option value="inRepair">En reparación</option>
                <option value="retired">Retirado</option>
              </select>
            </div>
            <div class="form-group">
              <label for="statusReason">Razón</label>
              <input 
                type="text" 
                id="statusReason" 
                v-model="statusChange.reason" 
                class="form-control"
                placeholder="Motivo del cambio de estado"
              />
            </div>
            <div class="form-group">
              <label for="statusNotes">Notas adicionales</label>
              <textarea 
                id="statusNotes" 
                v-model="statusChange.notes" 
                rows="3"
                class="form-control"
                placeholder="Información adicional sobre el cambio"
              ></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button @click="closeStatusModal" class="btn-secondary">Cancelar</button>
          <button @click="saveStatusChange" class="btn-primary" :disabled="statusChanging">
            <i v-if="statusChanging" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-check"></i>
            {{ statusChanging ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modal de asignación a cliente -->
    <div v-if="showAssignModal" class="modal-overlay" @click.self="closeAssignModal">
      <div class="modal-content assign-modal">
        <div class="modal-header">
          <h3>
            <i class="fas fa-user-plus"></i>
            Asignar a Cliente👥
          </h3>
          <button @click="closeAssignModal" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="clientSelect">Cliente *</label>
            <select id="clientSelect" v-model="assignment.clientId" required class="form-control">
              <option value="">Seleccionar cliente</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.firstName }} {{ client.lastName }} - {{ client.email || client.phone }}
              </option>
            </select>
          </div>
          
          <!-- Selector de MAC específica si hay múltiples equipos disponibles -->
          <div v-if="assignment.availableItems && assignment.availableItems.length > 1" class="form-group">
            <label for="specificItemSelect">Equipo específico *</label>
            <div class="equipment-selector">
              <div v-for="item in assignment.availableItems" :key="item.id" class="equipment-option">
                <input 
                  type="radio" 
                  :id="`item-${item.id}`"
                  :value="item.id" 
                  v-model="assignment.specificItemId"
                  required
                />
                <label :for="`item-${item.id}`" class="equipment-label">
                  <div class="equipment-info">
                    <div class="equipment-main">
                      <span class="equipment-id">#{{ item.id }}</span>
                      <span class="equipment-name">{{ item.name }}</span>
                    </div>
                    <div class="equipment-details">
                      <span v-if="item.macAddress" class="mac-info">
                        <i class="fas fa-network-wired"></i>
                        <code>{{ formatMacAddress(item.macAddress) }}</code>
                      </span>
                      <span v-else class="no-mac">
                        <i class="fas fa-times-circle"></i>
                        Sin MAC
                      </span>
                      <span class="location-info">
                        <i class="fas fa-map-marker-alt"></i>
                        {{ item.location ? item.location.name : 'Sin ubicación' }}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
            <small class="form-text">Selecciona el equipo específico que deseas asignar al cliente</small>
          </div>
          
          <div class="form-group">
            <label for="assignReason">Razón de asignación</label>
            <input 
              type="text" 
              id="assignReason" 
              v-model="assignment.reason" 
              class="form-control"
              placeholder="Motivo de la asignación"
            />
          </div>
          <div class="form-group">
            <label for="assignNotes">Notas adicionales</label>
            <textarea 
              id="assignNotes" 
              v-model="assignment.notes" 
              rows="3"
              class="form-control"
              placeholder="Información adicional sobre la asignación"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeAssignModal" class="btn-secondary">Cancelar</button>
          <button @click="saveAssignment" class="btn-primary" :disabled="assigning">
            <i v-if="assigning" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-user-plus"></i>
            {{ assigning ? 'Asignando...' : 'Asignar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal para mostrar MACs de un grupo -->
    <div v-if="showMacListModal" class="modal-overlay" @click.self="closeMacListModal">
      <div class="modal-content mac-list-modal">
        <div class="modal-header">
          <h3>
            <i class="fas fa-network-wired"></i>
            Direcciones MAC - {{ macListGroup?.items[0]?.name }}
          </h3>
          <button @click="closeMacListModal" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="mac-list">
            <div v-for="item in macListGroup?.items" :key="item.id" class="mac-item">
              <div class="mac-item-header">
                <span class="item-id">#{{ item.id }}</span>
                <span :class="['status-badge', item.status]">{{ formatStatus(item.status) }}</span>
              </div>
              <div class="mac-item-content">
                <div class="mac-address">
                  <i class="fas fa-network-wired"></i>
                  <code v-if="item.macAddress">{{ formatMacAddress(item.macAddress) }}</code>
                  <span v-else class="no-mac">Sin dirección MAC</span>
                </div>
                <div class="mac-item-details">
                  <span class="location">
                    <i class="fas fa-map-marker-alt"></i>
                    {{ item.location ? item.location.name : 'Sin ubicación' }}
                  </span>
                  <span v-if="item.assignedClient" class="client">
                    <i class="fas fa-user"></i>
                    {{ item.assignedClient.firstName }} {{ item.assignedClient.lastName }}
                  </span>
                </div>
              </div>
              <div class="mac-item-actions">
                <button @click="viewItem(item.id); closeMacListModal();" class="btn-action view" title="Ver detalles">
                     👁️ <i class="fas fa-eye"></i>
                </button>
                <button @click="editItem(item.id); closeMacListModal();" class="btn-action edit" title="Editar">
                   ✏️ <i class="fas fa-edit"></i>
                </button>
                <button 
                  v-if="item.status === 'available'"
                  @click="assignToClient(item); closeMacListModal();" 
                  class="btn-action assign" 
                  title="Asignar"
                >
                  <i class="fas fa-user-plus"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeMacListModal" class="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Modal para detalles de grupo -->
    <div v-if="showGroupDetailsModal" class="modal-overlay" @click.self="closeGroupDetailsModal">
      <div class="modal-content group-details-modal">
        <div class="modal-header">
          <h3>
            <i class="fas fa-list"></i>
            Detalles del Grupo - {{ groupDetails?.items[0]?.name }}
          </h3>
          <button @click="closeGroupDetailsModal" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="group-summary">
            <div class="summary-cards">
              <div class="summary-card">
                <div class="summary-icon available">
                  <i class="fas fa-check-circle"></i>
                </div>
                <div class="summary-content">
                  <span class="summary-number">{{ groupDetails?.availableCount || 0 }}</span>
                  <span class="summary-label">Disponibles</span>
                </div>
              </div>
              <div class="summary-card">
                <div class="summary-icon in-use">
                  <i class="fas fa-user"></i>
                </div>
                <div class="summary-content">
                  <span class="summary-number">{{ groupDetails?.assignedCount || 0 }}</span>
                  <span class="summary-label">Asignados</span>
                </div>
              </div>
              <div class="summary-card">
                <div class="summary-icon defective">
                  <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="summary-content">
                  <span class="summary-number">{{ groupDetails?.defectiveCount || 0 }}</span>
                  <span class="summary-label">Defectuosos</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="group-items-list">
            <h4>Equipos individuales</h4>
            <div class="items-table">
              <div class="table-header">
                <span>ID</span>
                <span>MAC</span>
                <span>Estado</span>
                <span>Ubicación</span>
                <span>Cliente</span>
                <span>Acciones</span>
              </div>
              <div v-for="item in groupDetails?.items" :key="item.id" class="table-row">
                <span class="item-id">#{{ item.id }}</span>
                <span class="mac">
                  <code v-if="item.macAddress">{{ formatMacAddress(item.macAddress) }}</code>
                  <span v-else class="no-mac">Sin MAC</span>
                </span>
                <span :class="['status-badge', item.status]">{{ formatStatus(item.status) }}</span>
                <span class="location">{{ item.location ? item.location.name : '-' }}</span>
                <span class="client">
                  {{ item.assignedClient ? `${item.assignedClient.firstName} ${item.assignedClient.lastName}` : '-' }}
                </span>
                <span class="actions">
                  <button @click="viewItem(item.id); closeGroupDetailsModal();" class="btn-mini view">
                     👁️ <i class="fas fa-eye"></i>
                  </button>
                  <button @click="editItem(item.id); closeGroupDetailsModal();" class="btn-mini edit">
                     ✏️ <i class="fas fa-edit"></i>
                  </button>
                  <button 
                    v-if="item.status === 'available'"
                    @click="assignToClient(item); closeGroupDetailsModal();" 
                    class="btn-mini assign"
                  >
                    <i class="fas fa-user-plus"></i>
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button 
            @click="assignGroupToClient(groupDetails); closeGroupDetailsModal();" 
            class="btn-primary"
            v-if="groupDetails?.availableCount > 0"
          >
            <i class="fas fa-user-plus"></i>
            Asignar Disponibles ({{ groupDetails?.availableCount }})
          </button>
          <button @click="closeGroupDetailsModal" class="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
import InventoryService from '../services/inventory.service';
import ClientService from '../services/client.service';
import DeviceService from '../services/device.service';

export default {
  name: 'InventoryManagementView',
  data() {
    return {
      // ===============================
      // DATOS PRINCIPALES
      // ===============================
      items: [],
      groupedItems: [],
      locations: [],
      clients: [],
      brands: [],
      stats: {
        available: 0,
        inUse: 0,
        defective: 0,
        inRepair: 0,
        retired: 0
      },
      
      // ===============================
      // CONFIGURACIÓN DE VISTA
      // ===============================
      viewMode: 'table', // 'table' | 'cards'
      loading: false,
      
      // ===============================
      // PAGINACIÓN
      // ===============================
      currentPage: 1,
      pageSize: 15,
      totalItems: 0,
      totalPages: 0,
      
      // ===============================
      // FILTROS Y BÚSQUEDA
      // ===============================
      searchName: '',
      selectedBrand: '',
      selectedStatus: '',
      selectedLocation: '',
      assignedFilter: '',
      showAdvancedFilters: false,
      searchTimeout: null,
      
      // ===============================
      // ORDENAMIENTO
      // ===============================
      sortField: 'id',
      sortDirection: 'desc',
      
      // ===============================
      // SELECCIÓN MÚLTIPLE
      // ===============================
      selectedItems: [],
      selectAll: false,
      
      // ===============================
      // AGRUPACIÓN
      // ===============================
      expandedGroups: {},
      groupExpansionKey: 'inventory_expanded_groups',
      
      // ===============================
      // MODALES
      // ===============================
      showDeleteModal: false,
      showStatusModal: false,
      showAssignModal: false,
      showMacListModal: false,
      showGroupDetailsModal: false,
      
      // ===============================
      // DATOS DE MODALES
      // ===============================
      itemToDelete: null,
      deletingInProgress: false,
      
      statusChange: {
        item: null,
        items: [],
        status: '',
        reason: '',
        notes: ''
      },
      statusChanging: false,
      
      assignment: {
        item: null,
        items: [],
        availableItems: [],
        clientId: '',
        specificItemId: null,
        reason: '',
        notes: ''
      },
      assigning: false,
      
      macListGroup: null,
      groupDetails: null,
      
      // ===============================
      // DEBOUNCE Y PERFORMANCE
      // ===============================
      debounceTimeout: 300
    };
  },
  
  computed: {
    // ===============================
    // COMPUTED PROPERTIES
    // ===============================
    
    hasActiveFilters() {
      return this.selectedBrand || this.selectedStatus || this.selectedLocation || this.assignedFilter;
    },
    
    someSelected() {
      return this.selectedItems.length > 0 && this.selectedItems.length < this.getAllSelectableIds().length;
    },
    
    visiblePages() {
      const pages = [];
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, this.currentPage + 3);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      return pages;
    }
  },
  
  watch: {
    // ===============================
    // WATCHERS
    // ===============================
    
    selectedItems: {
      // eslint-disable-next-line no-unused-vars
      handler(newVal) {
        this.updateSelectAllState();
      },
      deep: true
    },
    
    items: {
      handler() {
        this.processGroupedItems();
        this.updateSelectAllState();
      },
      deep: true
    }
  },
  
  created() {
    this.initializeComponent();
  },
  
  mounted() {
    this.loadExpandedGroups();
    document.addEventListener('keydown', this.handleKeydown);
  },
  
  beforeUnmount() {
    this.saveExpandedGroups();
    document.removeEventListener('keydown', this.handleKeydown);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  },
  
  methods: {
    // ===============================
    // INICIALIZACIÓN
    // ===============================
    
    async initializeComponent() {
      try {
        await Promise.all([
          this.loadLocations(),
          this.loadClients(),
          this.loadInventory(),
          this.loadStats()
        ]);
        this.extractBrandsFromInventory();
      } catch (error) {
        console.error('Error inicializando componente:', error);
        this.showNotification('error', 'Error al cargar datos iniciales');
      }
    },
    
    // ===============================
    // CARGA DE DATOS
    // ===============================
    
    async loadLocations() {
      try {
        const response = await InventoryService.getAllLocations({ active: true });
        this.locations = response.data.items || response.data.locations || response.data || [];
      } catch (error) {
        console.error('Error cargando ubicaciones:', error);
      }
    },
    
    async loadClients() {
      try {
        const response = await ClientService.getAllClients({ active: true, size: 200 });
        this.clients = response.data.clients || response.data.items || response.data || [];
      } catch (error) {
        console.error('Error cargando clientes:', error);
      }
    },
    
    async loadInventory() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          sortField: this.sortField,
          sortDirection: this.sortDirection
        };
        
        // Aplicar filtros activos
        if (this.searchName?.trim()) params.name = this.searchName.trim();
        if (this.selectedBrand) params.brand = this.selectedBrand;
        if (this.selectedStatus) params.status = this.selectedStatus;
        if (this.selectedLocation) params.locationId = this.selectedLocation;
        if (this.assignedFilter) params.assignedOnly = this.assignedFilter;
        
        const response = await InventoryService.getAllInventory(params);
        
        this.items = response.data.items || response.data || [];
        this.totalItems = response.data.totalItems || this.items.length;
        this.totalPages = response.data.totalPages || Math.ceil(this.totalItems / this.pageSize);
        
        this.processGroupedItems();
        this.extractBrandsFromInventory();
        
      } catch (error) {
        console.error('Error cargando inventario:', error);
        this.showNotification('error', 'Error al cargar inventario');
      } finally {
        this.loading = false;
      }
    },
    
async loadStats() {
  try {
    // Usar los mismos filtros que la vista actual para las estadísticas
    const params = {};
    if (this.selectedLocation) params.locationId = this.selectedLocation;
    if (this.selectedBrand) params.brand = this.selectedBrand;
    if (this.assignedFilter) params.assignedOnly = this.assignedFilter;
    
    const response = await InventoryService.getInventoryStats(params);
    this.stats = response.data;
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    // Fallback: calcular desde items locales
    this.calculateStatsFromItems();
  }
},

calculateStatsFromItems() {
  const stats = {
    available: 0,
    inUse: 0,
    defective: 0,
    inRepair: 0,
    retired: 0
  };
  
  this.items.forEach(item => {
    if (Object.prototype.hasOwnProperty.call(stats, item.status)) {
      stats[item.status]++;
    }
  });
  
  this.stats = stats;
},

 
    // ===============================
    // PROCESAMIENTO DE AGRUPACIÓN
    // ===============================
    
    processGroupedItems() {
      const groups = {};
      
      // Agrupar por nombre + serialNumber (clave única)
      this.items.forEach(item => {
        const groupKey = this.generateGroupKey(item);
        
        if (!groups[groupKey]) {
          groups[groupKey] = {
            groupKey,
            items: [],
            expanded: this.expandedGroups[groupKey] || false
          };
        }
        
        groups[groupKey].items.push(item);
      });
      
      // Procesar cada grupo para agregar metadatos
      this.groupedItems = Object.values(groups).map(group => {
        return this.processGroupMetadata(group);
      });
      
      // Ordenar grupos por nombre
      this.groupedItems.sort((a, b) => {
        const nameA = a.items[0]?.name || '';
        const nameB = b.items[0]?.name || '';
        return nameA.localeCompare(nameB);
      });
    },
    
    generateGroupKey(item) {
      // Crear clave única basada en nombre y serial
      const name = (item.name || '').trim().toLowerCase();
      const serial = (item.serialNumber || '').trim().toLowerCase();
      return `${name}_${serial}`;
    },
    
    processGroupMetadata(group) {
      const items = group.items;
      
      // Estadísticas de estado
      const statusSummary = {};
      items.forEach(item => {
        statusSummary[item.status] = (statusSummary[item.status] || 0) + 1;
      });
      
      // Ubicaciones únicas
      const locations = [...new Set(
        items.map(item => item.location?.name).filter(Boolean)
      )];
      
      // Contadores
      const availableCount = items.filter(item => item.status === 'available').length;
      const assignedCount = items.filter(item => item.assignedClient).length;
      const defectiveCount = items.filter(item => item.status === 'defective').length;
      
      // MACs disponibles
      const macCount = items.filter(item => item.macAddress).length;
      
      return {
        ...group,
        statusSummary,
        locations,
        availableCount,
        assignedCount,
        defectiveCount,
        macCount
      };
    },
    
    // ===============================
    // NAVEGACIÓN Y ACCIONES
    // ===============================
    
    openNewInventoryForm() {
      this.$router.push('/inventory/new');
    },
    
    viewItem(id) {
      this.$router.push(`/inventory/${id}`);
    },
    
    editItem(id) {
      this.$router.push(`/inventory/${id}/edit`);
    },
    
    // ===============================
    // GESTIÓN DE GRUPOS
    // ===============================
    
    toggleGroup(groupKey) {
      this.expandedGroups[groupKey] = !this.expandedGroups[groupKey];
      
      // Actualizar el estado expandido en los datos agrupados
      const group = this.groupedItems.find(g => g.groupKey === groupKey);
      if (group) {
        group.expanded = this.expandedGroups[groupKey];
      }
      
      this.saveExpandedGroups();
    },
    
    showGroupMacs(group) {
      this.macListGroup = group;
      this.showMacListModal = true;
    },
    
    showGroupDetails(group) {
      this.groupDetails = group;
      this.showGroupDetailsModal = true;
    },
    
    assignGroupToClient(group) {
      const availableItems = group.items.filter(item => item.status === 'available');
      
      if (availableItems.length === 0) {
        this.showNotification('warning', 'No hay equipos disponibles para asignar en este grupo');
        return;
      }
      
      this.assignment = {
        item: null,
        items: availableItems,
        availableItems: availableItems,
        clientId: '',
        specificItemId: availableItems.length === 1 ? availableItems[0].id : null,
        reason: '',
        notes: ''
      };
      
      this.showAssignModal = true;
    },
    
    // ===============================
    // GESTIÓN DE FILTROS
    // ===============================
    
    debouncedSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.currentPage = 1;
        this.loadInventory();
      }, this.debounceTimeout);
    },
    
    clearSearch() {
      this.searchName = '';
      this.currentPage = 1;
      this.loadInventory();
    },
    
    clearFilters() {
      this.searchName = '';
      this.selectedBrand = '';
      this.selectedStatus = '';
      this.selectedLocation = '';
      this.assignedFilter = '';
      this.currentPage = 1;
      this.loadInventory();
    },
    
    // ===============================
    // ORDENAMIENTO
    // ===============================
    
    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'asc';
      }
      
      this.loadInventory();
    },
    
    getSortIcon(field) {
      if (this.sortField !== field) {
        return 'fas fa-sort';
      }
      return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    },
    
    // ===============================
    // SELECCIÓN MÚLTIPLE
    // ===============================
    
    getAllSelectableIds() {
      return this.items.map(item => item.id);
    },
    
    updateSelectAllState() {
      const allIds = this.getAllSelectableIds();
      this.selectAll = allIds.length > 0 && this.selectedItems.length === allIds.length;
    },
    
    toggleSelectAll() {
      if (this.selectAll) {
        this.selectedItems = this.getAllSelectableIds();
      } else {
        this.selectedItems = [];
      }
    },
    
    isGroupSelected(group) {
      const groupItemIds = group.items.map(item => item.id);
      return groupItemIds.every(id => this.selectedItems.includes(id));
    },
    
    toggleGroupSelection(group, event) {
      const groupItemIds = group.items.map(item => item.id);
      
      if (event.target.checked) {
        // Agregar todos los IDs del grupo
        groupItemIds.forEach(id => {
          if (!this.selectedItems.includes(id)) {
            this.selectedItems.push(id);
          }
        });
      } else {
        // Remover todos los IDs del grupo
        this.selectedItems = this.selectedItems.filter(id => !groupItemIds.includes(id));
      }
    },
    
    // ===============================
    // GESTIÓN DE ESTADO
    // ===============================
    
    changeStatus(item) {
      this.statusChange = {
        item,
        items: [item],
        status: item.status,
        reason: '',
        notes: ''
      };
      this.showStatusModal = true;
    },
    
    async saveStatusChange() {
      if (!this.statusChange.status) {
        this.showNotification('error', 'Debe seleccionar un estado');
        return;
      }
      
      this.statusChanging = true;
      try {
        const item = this.statusChange.item;
        
        await InventoryService.changeStatus(
          item.id,
          this.statusChange.status,
          this.statusChange.reason,
          this.statusChange.notes
        );
        
        this.showNotification('success', 'Estado cambiado correctamente');
        this.closeStatusModal();
        await this.loadInventory();
        await this.loadStats();
        
      } catch (error) {
        console.error('Error cambiando estado:', error);
        this.showNotification('error', error.response?.data?.message || 'Error al cambiar estado');
      } finally {
        this.statusChanging = false;
      }
    },
    
    // ===============================
    // GESTIÓN DE ASIGNACIONES
    // ===============================
    
    assignToClient(item) {
      // Si es un equipo individual
      this.assignment = {
        item,
        items: [item],
        availableItems: [item],
        clientId: '',
        specificItemId: item.id,
        reason: '',
        notes: ''
      };
      
      this.showAssignModal = true;
    },
    
    async saveAssignment() {
      if (!this.assignment.clientId) {
        this.showNotification('error', 'Debe seleccionar un cliente');
        return;
      }
      
      if (this.assignment.availableItems.length > 1 && !this.assignment.specificItemId) {
        this.showNotification('error', 'Debe seleccionar un equipo específico');
        return;
      }
      
      this.assigning = true;
      try {
        const itemId = this.assignment.specificItemId || this.assignment.item?.id;
        
        // 1. Asignar en inventario
        await InventoryService.assignToClient(
          itemId,
          this.assignment.clientId,
          this.assignment.reason,
          this.assignment.notes
        );
        
        // 2. Crear/actualizar registro en devices
        await this.syncWithDevices(itemId, this.assignment.clientId);
        
        this.showNotification('success', 'Equipo asignado correctamente');
        this.closeAssignModal();
        await this.loadInventory();
        await this.loadStats();
        
      } catch (error) {
        console.error('Error asignando equipo:', error);
        this.showNotification('error', error.response?.data?.message || 'Error al asignar equipo');
      } finally {
        this.assigning = false;
      }
    },
    
    async unassignFromClient(item) {
      if (!confirm(`¿Desea desasignar el equipo "${item.name}" del cliente?`)) {
        return;
      }
      
      try {
        // 1. Desasignar en inventario
        await InventoryService.assignToClient(item.id, null, 'Desasignación manual', '');
        
        // 2. Actualizar en devices
        await this.syncWithDevices(item.id, null);
        
        this.showNotification('success', 'Equipo desasignado correctamente');
        await this.loadInventory();
        await this.loadStats();
        
      } catch (error) {
        console.error('Error desasignando equipo:', error);
        this.showNotification('error', 'Error al desasignar equipo');
      }
    },
    
    // ===============================
    // SINCRONIZACIÓN CON DEVICES
    // ===============================
    
    async syncWithDevices(inventoryItemId, clientId) {
      try {
        // Obtener el item de inventario completo
        const inventoryResponse = await InventoryService.getInventory(inventoryItemId);
        const inventoryItem = inventoryResponse.data;
        
        // Buscar si ya existe un device con este serial/MAC
        let existingDevice = null;
        
        if (inventoryItem.serialNumber) {
          try {
            const deviceResponse = await DeviceService.getAllDevices({
              serialNumber: inventoryItem.serialNumber,
              size: 1
            });
            
            if (deviceResponse.data.items && deviceResponse.data.items.length > 0) {
              existingDevice = deviceResponse.data.items[0];
            }
          } catch (error) {
            console.warn('No se encontró device existente:', error);
          }
        }
        
        const deviceData = {
          name: inventoryItem.name,
          type: this.mapInventoryTypeToDeviceType(inventoryItem.name, inventoryItem.brand),
          brand: this.mapBrandToDeviceBrand(inventoryItem.brand),
          model: inventoryItem.model || 'Unknown',
          serialNumber: inventoryItem.serialNumber,
          macAddress: inventoryItem.macAddress,
          clientId: clientId,
          status: clientId ? 'online' : 'offline',
          notes: `Sincronizado desde inventario ID: ${inventoryItemId}`,
          metadata: {
            inventoryId: inventoryItemId,
            syncedAt: new Date().toISOString(),
            source: 'inventory_assignment'
          }
        };
        
        if (existingDevice) {
          // Actualizar device existente
          await DeviceService.updateDevice(existingDevice.id, deviceData);
          console.log(`Device ${existingDevice.id} actualizado con cliente ${clientId}`);
        } else {
          // Crear nuevo device
          await DeviceService.createDevice(deviceData);
          console.log(`Nuevo device creado para inventario ${inventoryItemId}`);
        }
        
      } catch (error) {
        console.error('Error sincronizando con devices:', error);
        // No interrumpir el flujo principal, solo log del error
      }
    },
    
    mapInventoryTypeToDeviceType(name, brand) {
      const lowerName = (name || '').toLowerCase();
      const lowerBrand = (brand || '').toLowerCase();
      
      if (lowerName.includes('router') || lowerName.includes('rb')) return 'router';
      if (lowerName.includes('switch')) return 'switch';
      if (lowerName.includes('antena') || lowerName.includes('cpe') || lowerName.includes('nanobeam') || lowerName.includes('litebeam')) return 'cpe';
      if (lowerName.includes('ont') || lowerName.includes('onu')) return 'fiberOnt';
      if (lowerName.includes('olt')) return 'fiberOlt';
      if (lowerBrand.includes('ubiquiti') || lowerBrand.includes('mikrotik')) return 'antenna';
      
      return 'other';
    },
    
    mapBrandToDeviceBrand(brand) {
      if (!brand) return 'other';
      
      const lowerBrand = brand.toLowerCase();
      if (lowerBrand.includes('mikrotik')) return 'mikrotik';
      if (lowerBrand.includes('ubiquiti') || lowerBrand.includes('ubnt')) return 'ubiquiti';
      if (lowerBrand.includes('tp-link') || lowerBrand.includes('tplink')) return 'tplink';
      if (lowerBrand.includes('cambium')) return 'cambium';
      if (lowerBrand.includes('mimosa')) return 'mimosa';
      if (lowerBrand.includes('huawei')) return 'huawei';
      if (lowerBrand.includes('zte')) return 'zte';
      
      return 'other';
    },
    
    // ===============================
    // ELIMINACIÓN
    // ===============================
    
    confirmDelete(item) {
      this.itemToDelete = item;
      this.showDeleteModal = true;
    },
    
    async deleteItem() {
      if (!this.itemToDelete) return;
      
      this.deletingInProgress = true;
      try {
        await InventoryService.deleteInventory(this.itemToDelete.id);
        
        this.showNotification('success', 'Equipo eliminado correctamente');
        this.closeDeleteModal();
        await this.loadInventory();
        await this.loadStats();
        
      } catch (error) {
        console.error('Error eliminando equipo:', error);
        this.showNotification('error', error.response?.data?.message || 'Error al eliminar equipo');
      } finally {
        this.deletingInProgress = false;
      }
    },
    
    // ===============================
    // ACCIONES EN LOTE
    // ===============================
    
    async bulkChangeStatus() {
      if (this.selectedItems.length === 0) {
        this.showNotification('warning', 'Debe seleccionar al menos un elemento');
        return;
      }
      
      const selectedItemObjects = this.items.filter(item => this.selectedItems.includes(item.id));
      
      this.statusChange = {
        item: null,
        items: selectedItemObjects,
        status: '',
        reason: '',
        notes: ''
      };
      
      this.showStatusModal = true;
    },
    
    async bulkAssignToLocation() {
      if (this.selectedItems.length === 0) {
        this.showNotification('warning', 'Debe seleccionar al menos un elemento');
        return;
      }
      
      // Implementar modal de asignación masiva a ubicación
      this.showNotification('info', 'Funcionalidad en desarrollo');
    },
    
    async bulkDelete() {
      if (this.selectedItems.length === 0) {
        this.showNotification('warning', 'Debe seleccionar al menos un elemento');
        return;
      }
      
      if (!confirm(`¿Está seguro que desea eliminar ${this.selectedItems.length} elemento(s)?`)) {
        return;
      }
      
      try {
        this.loading = true;
        
        // Eliminar cada elemento seleccionado
        await Promise.all(
          this.selectedItems.map(id => InventoryService.deleteInventory(id))
        );
        
        this.showNotification('success', `${this.selectedItems.length} elemento(s) eliminado(s) correctamente`);
        this.selectedItems = [];
        await this.loadInventory();
        await this.loadStats();
        
      } catch (error) {
        console.error('Error en eliminación masiva:', error);
        this.showNotification('error', 'Error al eliminar elementos');
      } finally {
        this.loading = false;
      }
    },
    
    // ===============================
    // GESTIÓN DE MODALES
    // ===============================
    
    closeDeleteModal() {
      this.showDeleteModal = false;
      this.itemToDelete = null;
      this.deletingInProgress = false;
    },
    
    closeStatusModal() {
      this.showStatusModal = false;
      this.statusChange = {
        item: null,
        items: [],
        status: '',
        reason: '',
        notes: ''
      };
      this.statusChanging = false;
    },
    
    closeAssignModal() {
      this.showAssignModal = false;
      this.assignment = {
        item: null,
        items: [],
        availableItems: [],
        clientId: '',
        specificItemId: null,
        reason: '',
        notes: ''
      };
      this.assigning = false;
    },
    
    closeMacListModal() {
      this.showMacListModal = false;
      this.macListGroup = null;
    },
    
    closeGroupDetailsModal() {
      this.showGroupDetailsModal = false;
      this.groupDetails = null;
    },
    
    // ===============================
    // PAGINACIÓN
    // ===============================
    
    changePage(page) {
      if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
        this.currentPage = page;
        this.loadInventory();
      }
    },
    
    // ===============================
    // UTILIDADES
    // ===============================
    
    extractBrandsFromInventory() {
      const brandsSet = new Set();
      this.items.forEach(item => {
        if (item.brand && item.brand.trim()) {
          brandsSet.add(item.brand.trim());
        }
      });
      this.brands = Array.from(brandsSet).sort();
    },
    
    formatStatus(status) {
      const statusMap = {
        'available': 'Disponible',
        'inUse': 'En uso',
        'defective': 'Defectuoso',
        'inRepair': 'En reparación',
        'retired': 'Retirado'
      };
      return statusMap[status] || status;
    },
    
    getStatusIcon(status) {
      const iconMap = {
        'available': 'fas fa-check-circle',
        'inUse': 'fas fa-user',
        'defective': 'fas fa-exclamation-triangle',
        'inRepair': 'fas fa-tools',
        'retired': 'fas fa-archive'
      };
      return iconMap[status] || 'fas fa-question-circle';
    },
    
    formatMacAddress(mac) {
      return InventoryService.formatMacAddress(mac);
    },
    
    // ===============================
    // PERSISTENCIA LOCAL
    // ===============================
    
    loadExpandedGroups() {
      try {
        const saved = localStorage.getItem(this.groupExpansionKey);
        if (saved) {
          this.expandedGroups = JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Error cargando estado de grupos expandidos:', error);
        this.expandedGroups = {};
      }
    },
    
    saveExpandedGroups() {
      try {
        localStorage.setItem(this.groupExpansionKey, JSON.stringify(this.expandedGroups));
      } catch (error) {
        console.warn('Error guardando estado de grupos expandidos:', error);
      }
    },
    
    // ===============================
    // EVENTOS Y NAVEGACIÓN
    // ===============================
    
    handleKeydown(event) {
      if (event.key === 'Escape') {
        if (this.showDeleteModal) {
          this.closeDeleteModal();
        } else if (this.showStatusModal) {
          this.closeStatusModal();
        } else if (this.showAssignModal) {
          this.closeAssignModal();
        } else if (this.showMacListModal) {
          this.closeMacListModal();
        } else if (this.showGroupDetailsModal) {
          this.closeGroupDetailsModal();
        }
      }
    },
    
    // ===============================
    // NOTIFICACIONES
    // ===============================
    
    showNotification(type, message) {
      // Implementación básica - puede ser mejorada con una librería de notificaciones
      if (this.$notify) {
        this.$notify({
          group: 'notifications',
          type: type,
          title: type === 'success' ? 'Éxito' : type === 'warning' ? 'Advertencia' : 'Error',
          text: message,
          duration: type === 'error' ? 5000 : 3000
        });
      } else {
        // Fallback para desarrollo
        const prefix = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
        console.log(`${prefix} ${message}`);
        
        // Mostrar alert solo para errores críticos
        if (type === 'error') {
          alert(message);
        }
      }
    },
    
    // ===============================
    // REFRESH Y REFETCH
    // ===============================
    
    async refreshData() {
      this.selectedItems = [];
      this.expandedGroups = {};
      await this.initializeComponent();
    },
    
    // ===============================
    // VALIDACIONES
    // ===============================
    
    validateAssignment() {
      const errors = [];
      
      if (!this.assignment.clientId) {
        errors.push('Debe seleccionar un cliente');
      }
      
      if (this.assignment.availableItems.length > 1 && !this.assignment.specificItemId) {
        errors.push('Debe seleccionar un equipo específico');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    },
    
    // ===============================
    // HELPERS DE ESTADO
    // ===============================
    
    getItemById(id) {
      return this.items.find(item => item.id === id);
    },
    
    getGroupByKey(groupKey) {
      return this.groupedItems.find(group => group.groupKey === groupKey);
    },
    
    isItemSelected(id) {
      return this.selectedItems.includes(id);
    },
    
    getSelectedItemsData() {
      return this.items.filter(item => this.selectedItems.includes(item.id));
    },
    
    // ===============================
    // HELPERS DE FORMATEO
    // ===============================
    
    formatQuantity(quantity, includeUnit = false) {
      const num = parseInt(quantity) || 1;
      return includeUnit ? `${num} ${num === 1 ? 'unidad' : 'unidades'}` : num.toString();
    },
    
    formatLocationsList(locations) {
      if (!locations || locations.length === 0) return 'Sin ubicación';
      if (locations.length === 1) return locations[0];
      if (locations.length === 2) return locations.join(' y ');
      return `${locations[0]} y ${locations.length - 1} más`;
    },
    
    // ===============================
    // DEBUG Y DESARROLLO
    // ===============================
    
    logGroupData() {
      console.group('📊 Estado de Agrupación de Inventario');
      console.log('Items originales:', this.items.length);
      console.log('Grupos generados:', this.groupedItems.length);
      console.log('Grupos expandidos:', Object.keys(this.expandedGroups).length);
      console.log('Items seleccionados:', this.selectedItems.length);
      
      this.groupedItems.forEach(group => {
        console.log(`Grupo "${group.groupKey}":`, {
          items: group.items.length,
          disponibles: group.availableCount,
          asignados: group.assignedCount,
          defectuosos: group.defectiveCount,
          macs: group.macCount,
          expandido: group.expanded
        });
      });
      
      console.groupEnd();
    },
    
    // ===============================
    // MÉTODOS DE CICLO DE VIDA ADICIONALES
    // ===============================
    
    async beforeRouteLeave(to, from, next) {
      // Guardar estado antes de navegar
      this.saveExpandedGroups();
      next();
    }
  }
};
</script>


<style scoped>
/* ===============================
   VARIABLES CSS Y COLORES
   =============================== */
.inventory-list {
  --primary-color: #667eea;
  --primary-hover: #5a67d8;
  --secondary-color: #718096;
  --success-color: #48bb78;
  --warning-color: #ed8936;
  --error-color: #f56565;
  --info-color: #4299e1;
  
  --bg-primary: #ffffff;
  --bg-secondary: #f7fafc;
  --bg-tertiary: #edf2f7;
  --bg-group: #f1f5f9;
  
  --text-primary: #2d3748;
  --text-secondary: #4a5568;
  --text-muted: #718096;
  
  --border-color: #e2e8f0;
  --border-hover: #cbd5e0;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

/* ===============================
   CONTENEDOR PRINCIPAL
   =============================== */
.inventory-list {
  padding: var(--spacing-xl);
  background-color: var(--bg-secondary);
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ===============================
   HEADER DE PÁGINA
   =============================== */
.page-header {
  background: linear-gradient(135deg, var(--primary-color) 0%, #764ba2 100%);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  color: white;
  box-shadow: var(--shadow-lg);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.header-content h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.header-content h2 i {
  margin-right: var(--spacing-md);
  opacity: 0.9;
}

.header-stats {
  display: flex;
  gap: var(--spacing-lg);
}

.stat-item {
  text-align: center;
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md);
  backdrop-filter: blur(10px);
  min-width: 80px;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  display: block;
  font-size: 0.875rem;
  opacity: 0.9;
  margin-top: var(--spacing-xs);
}

/* ===============================
   SECCIÓN DE FILTROS
   =============================== */
.filters-section {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.search-controls {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 300px;
  max-width: 500px;
}

.search-box input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) 2.5rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: all 0.2s ease;
}

.search-box input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.clear-search {
  position: absolute;
  right: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.clear-search:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.filters-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.filters-toggle:hover {
  background: var(--border-color);
}

/* ===============================
   FILTROS AVANZADOS
   =============================== */
.advanced-filters {
  border-top: 1px solid var(--border-color);
  padding-top: var(--spacing-lg);
  margin-top: var(--spacing-lg);
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  font-size: 0.875rem;
}

.filter-group select {
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.filter-group select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.filter-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

.btn-clear-filters, .btn-apply-filters {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-clear-filters {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-clear-filters:hover {
  background: var(--border-color);
}

.btn-apply-filters {
  background: var(--primary-color);
  color: white;
}

.btn-apply-filters:hover {
  background: var(--primary-hover);
}

/* ===============================
   CONTROLES DE ACCIÓN
   =============================== */
.action-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.view-controls {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--spacing-xs);
}

.view-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.view-btn.active {
  background: var(--primary-color);
  color: white;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-md);
}

.btn-export, .btn-add {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-export {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-export:hover {
  background: var(--border-color);
}

.btn-add {
  background: var(--success-color);
  color: white;
}

.btn-add:hover {
  background: #38a169;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* ===============================
   ESTADOS DE CARGA Y VACÍO
   =============================== */
.loading-state, .empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.loading-spinner {
  text-align: center;
  color: var(--text-muted);
}

.loading-spinner i {
  font-size: 2rem;
  margin-bottom: var(--spacing-md);
  color: var(--primary-color);
}

.empty-content {
  text-align: center;
  max-width: 400px;
  padding: var(--spacing-xl);
}

.empty-content i {
  font-size: 4rem;
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}

.empty-content h3 {
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.empty-content p {
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

/* ===============================
   TABLA DE INVENTARIO
   =============================== */
.table-view {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.table-container {
  overflow-x: auto;
}

.inventory-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.inventory-table th {
  background: var(--bg-tertiary);
  padding: var(--spacing-md);
  text-align: left;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 2px solid var(--border-color);
  white-space: nowrap;
}

.inventory-table th.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: background-color 0.2s ease;
}

.inventory-table th.sortable:hover {
  background: var(--border-color);
}

.inventory-table th.sortable i {
  margin-left: var(--spacing-sm);
  opacity: 0.6;
}

.inventory-table td {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.inventory-table tr:hover {
  background: var(--bg-secondary);
}

.inventory-table tr.selected {
  background: rgba(102, 126, 234, 0.05);
}

/* ===============================
   FILAS DE GRUPO
   =============================== */
.group-header-row {
  background: var(--bg-group) !important;
  cursor: pointer;
  transition: all 0.2s ease;
}

.group-header-row:hover {
  background: var(--border-color) !important;
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 600;
}

.group-header i {
  transition: transform 0.2s ease;
  color: var(--primary-color);
}

.group-count {
  background: var(--primary-color);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  margin-left: var(--spacing-sm);
}

.group-item-row {
  background: rgba(248, 249, 250, 0.5);
  border-left: 3px solid var(--primary-color);
}

.group-item-row td:first-child {
  padding-left: var(--spacing-xl);
}

.sub-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.sub-item i {
  color: var(--text-muted);
  font-size: 0.75rem;
}

/* ===============================
   RESÚMENES DE GRUPO
   =============================== */
.mac-summary {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.mac-count {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.btn-show-macs {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--spacing-xs);
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.btn-show-macs:hover {
  background: var(--bg-tertiary);
  color: var(--primary-color);
}

.status-summary {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.status-mini {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  min-width: 20px;
  text-align: center;
}

.status-mini.available {
  background: #e6fffa;
  color: #234e52;
}

.status-mini.inUse {
  background: #fef5e7;
  color: #744210;
}

.status-mini.defective {
  background: #fed7d7;
  color: #742a2a;
}

.status-mini.inRepair {
  background: #ebf8ff;
  color: #2a4365;
}

.multiple-locations {
  font-style: italic;
  color: var(--text-muted);
}

.client-summary {
  font-size: 0.875rem;
}

/* ===============================
   ACCIONES DE GRUPO
   =============================== */
.group-actions {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
}

.action-count {
  background: white;
  color: var(--primary-color);
  border-radius: 50%;
  width: 16px;
  height: 16px;
  font-size: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: -4px;
  right: -4px;
  border: 1px solid var(--primary-color);
}

/* ===============================
   CONTENIDO DE CELDAS
   =============================== */
.item-id {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-weight: 600;
  color: var(--text-secondary);
}

.item-name strong {
  color: var(--text-primary);
  display: block;
}

.item-name small {
  color: var(--text-muted);
  font-size: 0.75rem;
  display: block;
  margin-top: var(--spacing-xs);
}

.brand-model {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.brand {
  font-weight: 500;
  color: var(--text-primary);
}

.model {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.serial, .mac {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  background: var(--bg-tertiary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  display: inline-block;
}

.no-data, .no-mac, .no-client {
  color: var(--text-muted);
  font-style: italic;
}

.location-info, .client-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.location-info i, .client-info i {
  color: var(--text-muted);
  width: 12px;
}

/* ===============================
   BADGES DE ESTADO
   =============================== */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.available {
  background: #e6fffa;
  color: #234e52;
}

.status-badge.inUse {
  background: #fef5e7;
  color: #744210;
}

.status-badge.defective {
  background: #fed7d7;
  color: #742a2a;
}

.status-badge.inRepair {
  background: #ebf8ff;
  color: #2a4365;
}

.status-badge.retired {
  background: #f7fafc;
  color: #4a5568;
}

/* ===============================
   BOTONES DE ACCIÓN
   =============================== */
.actions {
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.btn-action {
  padding: var(--spacing-sm);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.btn-action:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.btn-action.view {
  background: var(--info-color);
  color: white;
}

.btn-action.edit {
  background: var(--warning-color);
  color: white;
}

.btn-action.status {
  background: var(--secondary-color);
  color: white;
}

.btn-action.assign {
  background: var(--success-color);
  color: white;
}

.btn-action.unassign {
  background: #e53e3e;
  color: white;
}

.btn-action.delete {
  background: var(--error-color);
  color: white;
}

/* ===============================
   VISTA DE TARJETAS
   =============================== */
.cards-view {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-lg);
}

.inventory-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.inventory-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-header {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-content {
  padding: var(--spacing-lg);
}

.card-content h3 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: 1.125rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  color: var(--text-secondary);
}

.detail-row i {
  width: 16px;
  color: var(--text-muted);
}

.card-actions {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
}

.card-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
  font-weight: 500;
}

.card-btn.view { background: var(--info-color); }
.card-btn.edit { background: var(--warning-color); }
.card-btn.status { background: var(--secondary-color); }
.card-btn.delete { background: var(--error-color); }

/* ===============================
   ACCIONES EN LOTE
   =============================== */
.bulk-actions {
  position: fixed;
  bottom: var(--spacing-xl);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.bulk-actions-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-lg);
}

.selected-count {
  font-weight: 600;
  color: var(--text-primary);
}

.bulk-buttons {
  display: flex;
  gap: var(--spacing-sm);
}

.bulk-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.bulk-btn:hover {
  background: var(--border-color);
}

.bulk-btn.danger {
  background: var(--error-color);
  color: white;
}

.bulk-btn.danger:hover {
  background: #e53e3e;
}

/* ===============================
   PAGINACIÓN
   =============================== */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  margin-top: var(--spacing-lg);
  border: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.pagination-info {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.pagination {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.pagination-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-pages {
  display: flex;
  gap: var(--spacing-xs);
}

.pagination-page {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.pagination-page:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.pagination-page.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

/* ===============================
   MODALES
   =============================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
  padding: var(--spacing-lg);
}

.modal-content {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--primary-color) 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.modal-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--radius-sm);
  transition: background 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-body {
  padding: var(--spacing-xl);
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  padding: var(--spacing-lg) var(--spacing-xl);
  background: var(--bg-secondary);
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

/* ===============================
   FORMULARIOS EN MODALES
   =============================== */
.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-group label {
  display: block;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  font-size: 0.875rem;
}

.form-control {
  width: 100%;
  padding: var(--spacing-md);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: var(--spacing-sm);
}

/* ===============================
   SELECTOR DE EQUIPOS
   =============================== */
.equipment-selector {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-height: 300px;
  overflow-y: auto;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.equipment-option {
  position: relative;
}

.equipment-option input[type="radio"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.equipment-label {
  display: block;
  padding: var(--spacing-md);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-primary);
}

.equipment-option input[type="radio"]:checked + .equipment-label {
  border-color: var(--primary-color);
  background: rgba(102, 126, 234, 0.05);
}

.equipment-label:hover {
  border-color: var(--primary-hover);
  background: var(--bg-secondary);
}

.equipment-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.equipment-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.equipment-id {
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg-tertiary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.equipment-name {
  font-weight: 600;
  color: var(--text-primary);
}

.equipment-details {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.mac-info, .no-mac, .location-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.875rem;
}

.mac-info {
  color: var(--success-color);
}

.no-mac {
  color: var(--error-color);
}

.location-info {
  color: var(--text-secondary);
}

.mac-info code {
  font-family: 'JetBrains Mono', monospace;
  background: rgba(72, 187, 120, 0.1);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
}

/* ===============================
   MODAL DE LISTA DE MACS
   =============================== */
.mac-list-modal .modal-content {
  width: 600px;
}

.mac-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.mac-item {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.2s ease;
}

.mac-item:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.mac-item-header {
  background: var(--bg-secondary);
  padding: var(--spacing-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mac-item-content {
  padding: var(--spacing-md);
}

.mac-address {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  font-weight: 500;
}

.mac-address code {
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg-tertiary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
}

.mac-item-details {
  display: flex;
  gap: var(--spacing-lg);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.mac-item-actions {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
}

/* ===============================
   MODAL DE DETALLES DE GRUPO
   =============================== */
.group-details-modal .modal-content {
  width: 800px;
}

.group-summary {
  margin-bottom: var(--spacing-xl);
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.summary-icon.available {
  background: var(--success-color);
}

.summary-icon.in-use {
  background: var(--warning-color);
}

.summary-icon.defective {
  background: var(--error-color);
}

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.group-items-list h4 {
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.items-table {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 60px 120px 100px 150px 150px 120px;
  background: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-primary);
}

.table-header span {
  padding: var(--spacing-md);
  border-right: 1px solid var(--border-color);
}

.table-row {
  display: grid;
  grid-template-columns: 60px 120px 100px 150px 150px 120px;
  border-top: 1px solid var(--border-color);
}

.table-row span {
  padding: var(--spacing-md);
  border-right: 1px solid var(--border-color);
  display: flex;
  align-items: center;
}

.table-row:hover {
  background: var(--bg-secondary);
}

.btn-mini {
  padding: var(--spacing-xs);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: white;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: var(--spacing-xs);
}

.btn-mini.view { background: var(--info-color); }
.btn-mini.edit { background: var(--warning-color); }
.btn-mini.assign { background: var(--success-color); }

/* ===============================
   BOTONES DE MODAL
   =============================== */
.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--border-color);
}

.btn-danger {
  background: var(--error-color);
  color: white;
  border: none;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  background: #e53e3e;
}

.btn-danger:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===============================
   ALERTAS Y NOTIFICACIONES
   =============================== */
.alert {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.alert-warning {
  background: #fef5e7;
  color: #744210;
  border: 1px solid #f6e05e;
}

.item-info {
  background: var(--bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  margin-top: var(--spacing-md);
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.info-row:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 600;
  color: var(--text-secondary);
}

.value {
  color: var(--text-primary);
}

/* ===============================
   ANIMACIONES Y TRANSICIONES
   =============================== */
.fa-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ===============================
   RESPONSIVE DESIGN
   =============================== */
@media (max-width: 1200px) {
  .header-stats {
    gap: var(--spacing-md);
  }
  
  .stat-item {
    min-width: 70px;
  }
  
  .stat-number {
    font-size: 1.25rem;
  }
}

@media (max-width: 768px) {
  .inventory-list {
    padding: var(--spacing-md);
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }
  
  .header-stats {
    width: 100%;
    justify-content: space-between;
  }
  
  .search-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
    max-width: none;
  }
  
  .filter-row {
    grid-template-columns: 1fr;
  }
  
  .action-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .view-controls {
    align-self: center;
  }
  
  .action-buttons {
    justify-content: center;
  }
  
  /* Tabla responsive */
  .table-container {
    font-size: 0.75rem;
  }
  
  .inventory-table th,
  .inventory-table td {
    padding: var(--spacing-sm);
  }
  
  .action-buttons {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .btn-action {
    width: 28px;
    height: 28px;
  }
  
  /* Modales responsive */
  .modal-overlay {
    padding: var(--spacing-md);
  }
  
  .modal-content {
    max-width: 100%;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: var(--spacing-md);
  }
  
  .equipment-details {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: var(--spacing-xs);
  }
  
  .table-header span,
  .table-row span {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  /* Paginación responsive */
  .pagination-container {
    flex-direction: column;
    text-align: center;
  }
  
  .pagination-pages {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  /* Bulk actions responsive */
  .bulk-actions {
    left: var(--spacing-md);
    right: var(--spacing-md);
    transform: none;
  }
  
  .bulk-actions-content {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .bulk-buttons {
    justify-content: center;
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: var(--spacing-md);
  }
  
  .header-content h2 {
    font-size: 1.5rem;
  }
  
  .header-stats {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: left;
    width: 100%;
  }
  
  .filters-section {
    padding: var(--spacing-md);
  }
  
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .equipment-main {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .btn-secondary,
  .btn-primary,
  .btn-danger {
    width: 100%;
    justify-content: center;
  }
}

/* ===============================
   MODO OSCURO (OPCIONAL)
   =============================== */
@media (prefers-color-scheme: dark) {
  .inventory-list {
    --bg-primary: #1a202c;
    --bg-secondary: #2d3748;
    --bg-tertiary: #4a5568;
    --bg-group: #2d3748;
    
    --text-primary: #f7fafc;
    --text-secondary: #e2e8f0;
    --text-muted: #a0aec0;
    
    --border-color: #4a5568;
    --border-hover: #718096;
  }
  
  .page-header {
    background: linear-gradient(135deg, #4c51bf 0%, #553c9a 100%);
  }
  
  .status-badge.available {
    background: rgba(72, 187, 120, 0.2);
    color: #9ae6b4;
  }
  
  .status-badge.inUse {
    background: rgba(237, 137, 54, 0.2);
    color: #fbb957;
  }
  
  .status-badge.defective {
    background: rgba(245, 101, 101, 0.2);
    color: #feb2b2;
  }
  
  .status-badge.inRepair {
    background: rgba(66, 153, 225, 0.2);
    color: #90cdf4;
  }
  
  .status-badge.retired {
    background: rgba(160, 174, 192, 0.2);
    color: #cbd5e0;
  }
}

/* ===============================
   SCROLL PERSONALIZADO
   =============================== */
.table-container::-webkit-scrollbar,
.equipment-selector::-webkit-scrollbar,
.modal-body::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.table-container::-webkit-scrollbar-track,
.equipment-selector::-webkit-scrollbar-track,
.modal-body::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb,
.equipment-selector::-webkit-scrollbar-thumb,
.modal-body::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover,
.equipment-selector::-webkit-scrollbar-thumb:hover,
.modal-body::-webkit-scrollbar-thumb:hover {
  background: var(--border-hover);
}

/* ===============================
   UTILIDADES
   =============================== */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.font-mono {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ===============================
   PRINT STYLES
   =============================== */
@media print {
  .page-header,
  .filters-section,
  .action-controls,
  .bulk-actions,
  .pagination-container {
    display: none !important;
  }
  
  .inventory-list {
    padding: 0;
  }
  
  .table-view {
    box-shadow: none;
    border: 1px solid #000;
  }
  
  .inventory-table {
    font-size: 12px;
  }
  
  .inventory-table th,
  .inventory-table td {
    padding: 4px;
    border: 1px solid #000;
  }
  
  .actions {
    display: none;
  }
}
</style>