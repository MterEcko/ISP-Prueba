<template>
  <div class="servicios-tab">
    <div class="servicios-grid">
      
      <!-- Servicios de Internet -->
      <div class="section-card servicios-internet">
        <div class="section-header">
          <div class="section-title">
            <div class="section-icon">🌐</div>
            <h3>Servicios de Internet</h3>
            <span class="count-badge">{{ subscriptions.length }}</span>
          </div>
          <div class="section-actions">
            <button @click="$emit('add-subscription')" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Agregar Servicio
            </button>
            <button @click="debugInvoiceGeneration" class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
              </svg>
              Debug
            </button>
          </div>
        </div>
        
        <div class="section-content">
          <div v-if="subscriptions.length > 0" class="services-grid">
            <div 
              v-for="subscription in subscriptions" 
              :key="subscription.id"
              class="service-card"
            >
              <div class="service-header">
                <div class="service-info">
                  <h4>{{ subscription.ServicePackage?.name || 'Plan no definido' }}</h4>
                  <div class="service-meta">
                    <span class="service-id">ID: {{ subscription.id }}</span>
                    <span :class="['status-indicator', 'status-' + subscription.status]">
                      <span class="status-dot"></span>
                      {{ formatSubscriptionStatus(subscription.status) }}
                    </span>
                  </div>
                </div>
                <div class="service-menu">
                  <button @click="showSubscriptionMenu(subscription)" class="btn-menu">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="service-details">
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">Velocidad</span>
                    <span class="detail-value">
                      ↓{{ subscription.ServicePackage?.downloadSpeedMbps || 0 }} / 
                      ↑{{ subscription.ServicePackage?.uploadSpeedMbps || 0 }} Mbps
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">IP Asignada</span>
                    <span class="detail-value ip-address">
                      {{ subscription.assignedIpAddress || 'No asignada' }}
                      <button 
                        v-if="subscription.assignedIpAddress" 
                        @click="pingIP(subscription.assignedIpAddress)"
                        class="ping-btn"
                        title="Ping"
                      >
                        🏓
                      </button>
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Usuario PPPoE</span>
                    <span class="detail-value">{{ subscription.pppoeUsername || 'No configurado' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Cuota Mensual</span>
                    <span class="detail-value price">${{ subscription.monthlyFee || '0.00' }}</span>
                  </div>
                </div>

                <div class="service-actions">
                  <button @click="$emit('edit-subscription', subscription)" class="action-btn secondary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                    Editar
                  </button>
                  <button @click="viewPPPoEDetails(subscription)" class="action-btn secondary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Verificar
                  </button>
                </div>
              </div>

              <!-- Menú contextual -->
              <div v-if="showMenu === subscription.id" class="service-menu-dropdown">
                <button 
                  v-if="subscription.status === 'active'" 
                  @click="suspendSubscription(subscription)" 
                  class="menu-item"
                >
                  ⏸️ Suspender
                </button>
                <button 
                  v-if="subscription.status === 'suspended'" 
                  @click="reactivateSubscription(subscription)" 
                  class="menu-item"
                >
                  ▶️ Reactivar
                </button>
                <button @click="downloadConfigPDF(subscription)" class="menu-item">
                  📄 Descargar Configuración
                </button>
                <button @click="cancelSubscription(subscription)" class="menu-item danger">
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <div class="empty-icon">📡</div>
            <h4>Sin servicios de internet</h4>
            <p>Este cliente no tiene servicios de internet contratados</p>
            <button @click="$emit('add-subscription')" class="btn btn-primary">
              Agregar Primer Servicio
            </button>
          </div>
        </div>
      </div>

      <!-- Equipos y Materiales (Combinados) -->
      <div class="section-card equipos-materiales">
        <div class="section-header">
          <div class="section-title">
            <div class="section-icon">📦</div>
            <h3>Equipos y Materiales</h3>
            <span class="count-badge">{{ clientDevices.length + clientMaterials.length }}</span>
          </div>
          <div class="section-actions">
            <button @click="openAssignEquipmentModal" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Asignar Equipo
            </button>
            <button @click="openAssignMaterialModal" class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Asignar Material
            </button>
          </div>
        </div>
        
        <div class="section-content">
          <!-- Equipos Asignados -->
          <div class="subsection">
            <div class="subsection-header">
              <h4>📶 Equipos Asignados ({{ clientDevices.length }})</h4>
            </div>
            
            <div v-if="clientDevices.length > 0" class="devices-grid">
              <div 
                v-for="device in clientDevices" 
                :key="device.id"
                class="device-card"
              >
                <div class="device-image">
                  <div class="device-placeholder">
                    {{ getDeviceIcon(device.type) }}
                  </div>
                </div>

                <div class="device-info">
                  <h5>{{ device.name }}</h5>
                  <div class="device-details">
                    <span class="device-brand">{{ device.brand }} {{ device.model }}</span>
                    <span :class="['device-status', device.status]">
                      {{ formatDeviceStatus(device.status) }}
                    </span>
                  </div>
                  
                  <div class="device-specs">
                    <div v-if="device.ipAddress" class="spec-item">
                      <span class="spec-label">IP:</span>
                      <span class="spec-value">{{ device.ipAddress }}</span>
                    </div>
                    <div v-if="device.macAddress" class="spec-item">
                      <span class="spec-label">MAC:</span>
                      <span class="spec-value mac">{{ device.macAddress }}</span>
                    </div>
                    <div v-if="device.serialNumber" class="spec-item">
                      <span class="spec-label">S/N:</span>
                      <span class="spec-value">{{ device.serialNumber }}</span>
                    </div>
                  </div>

                  <div v-if="device.location" class="device-location">
                    📍 {{ device.location }}
                  </div>

                  <div v-if="device.notes" class="device-notes">
                    💭 {{ device.notes }}
                  </div>
                </div>

                <div class="device-actions">
                  <button 
                    v-if="device.ipAddress"
                    @click="accessDevice(device)" 
                    class="device-action-btn access"
                    title="Acceder"
                  >
                    🔗
                  </button>
                  <button 
                    @click="configureDevice(device)" 
                    class="device-action-btn config"
                    title="Configurar"
                  >
                    ⚙️
                  </button>
                  <button 
                    @click="$emit('manage-device', device)" 
                    class="device-action-btn manage"
                    title="Gestionar"
                  >
                    📋
                  </button>
                  <button 
                    @click="unassignDevice(device)" 
                    class="device-action-btn unassign"
                    title="Desasignar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
            
            <div v-else class="empty-state-small">
              <span class="empty-icon-small">📶</span>
              <span>Sin equipos asignados</span>
            </div>
          </div>

          <!-- Materiales Consumibles -->
          <div class="subsection">
            <div class="subsection-header">
              <h4>🔌 Materiales Consumibles ({{ clientMaterials.length }})</h4>
            </div>
            
            <div v-if="clientMaterials.length > 0" class="materials-grid">
              <div 
                v-for="material in clientMaterials" 
                :key="material.id"
                class="material-card"
              >
                <div class="material-icon">
                  {{ getMaterialIcon(material.name) }}
                </div>

                <div class="material-info">
                  <h5>{{ material.name }}</h5>
                  <div class="material-details">
                    <span class="material-brand">{{ material.brand }} {{ material.model }}</span>
                    <span class="material-quantity">{{ material.quantity }}{{ getUnitType(material.name) }}</span>
                  </div>
                  
                  <div class="material-specs">
                    <div class="spec-item">
                      <span class="spec-label">Costo:</span>
                      <span class="spec-value">${{ material.cost }}</span>
                    </div>
                    <div class="spec-item">
                      <span class="spec-label">Fecha:</span>
                      <span class="spec-value">{{ formatDate(material.createdAt) }}</span>
                    </div>
                  </div>

                  <div v-if="material.notes" class="material-notes">
                    💭 {{ material.notes }}
                  </div>
                </div>

                <div class="material-actions">
                  <button 
                    @click="viewInstallationDetails(material)" 
                    class="material-action-btn details"
                    title="Ver detalles"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
            
            <div v-else class="empty-state-small">
              <span class="empty-icon-small">🔌</span>
              <span>Sin materiales asignados</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Facturación y Estado de Cuenta -->
      <div class="section-card facturacion-completa">
        <div class="section-header">
          <div class="section-title">
            <div class="section-icon">💰</div>
            <h3>Facturación y Estado de Cuenta</h3>
            <span class="count-badge">{{ clientInvoices.length }}</span>
          </div>
          <div class="section-actions">
            <button @click="generateInvoiceManually" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              Generar Factura
            </button>
            <button @click="refreshInvoices" class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              Actualizar
            </button>
          </div>
        </div>
        
        <div class="section-content">
          <!-- Estado de Facturación -->
          <div class="subsection">
            <div class="subsection-header">
              <h4>💳 Estado de Facturación</h4>
            </div>
            
            <div v-if="billingInfo" class="billing-summary">
              <div class="billing-status-grid">
                <div class="status-item">
                  <span class="status-label">Estado</span>
                  <span :class="['status-value', 'billing-' + billingInfo.clientStatus]">
                    {{ formatBillingStatus(billingInfo.clientStatus) }}
                  </span>
                </div>
                
                <div class="status-item">
                  <span class="status-label">Día de Facturación</span>
                  <span class="status-value">{{ billingInfo.billingDay }}</span>
                </div>
                
                <div class="status-item">
                  <span class="status-label">Último Pago</span>
                  <span class="status-value">{{ formatDate(billingInfo.lastPaymentDate) || 'Sin pagos' }}</span>
                </div>
                
                <div class="status-item">
                  <span class="status-label">Próximo Vencimiento</span>
                  <span class="status-value">{{ formatDate(billingInfo.nextDueDate) || 'No definido' }}</span>
                </div>
                
                <div class="status-item">
                  <span class="status-label">Tarifa Mensual</span>
                  <span class="status-value price">${{ billingInfo.monthlyFee || '0.00' }}</span>
                </div>
              </div>

              <div class="billing-actions">
                <button @click="registerPayment" class="btn btn-primary">
                  💰 Registrar Pago
                </button>
                <button @click="downloadAccountStatement" class="btn btn-secondary">
                  📄 Estado de Cuenta
                </button>
              </div>
            </div>
            
            <div v-else class="empty-state-small">
              <span class="empty-icon-small">💳</span>
              <span>Sin configuración de facturación</span>
              <button @click="setupBilling" class="btn btn-primary btn-small">
                Configurar
              </button>
            </div>
          </div>

          <!-- Historial de Facturas -->
          <div class="subsection">
            <div class="subsection-header">
              <h4>🧾 Historial de Facturas</h4>
              <div class="subsection-actions">
                <button @click="showAllInvoices = !showAllInvoices" class="btn btn-small btn-secondary">
                  {{ showAllInvoices ? 'Mostrar menos' : 'Ver todas' }}
                </button>
              </div>
            </div>
            
            <div v-if="clientInvoices.length > 0" class="invoices-list">
              <div 
                v-for="invoice in displayedInvoices" 
                :key="invoice.id"
                class="invoice-card"
              >
                <div class="invoice-header">
                  <div class="invoice-info">
                    <h5>Factura #{{ invoice.invoiceNumber || invoice.id }}</h5>
                    <div class="invoice-meta">
                      <span class="invoice-period">
                        {{ formatInvoicePeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd) }}
                      </span>
                      <span :class="['invoice-status', 'status-' + invoice.status]">
                        {{ formatInvoiceStatus(invoice.status) }}
                      </span>
                    </div>
                  </div>
                  <div class="invoice-amount">
                    <span class="amount">${{ invoice.totalAmount || invoice.amount }}</span>
                  </div>
                </div>

                <div class="invoice-details">
                  <div class="detail-row">
                    <span class="detail-label">Fecha de Vencimiento:</span>
                    <span class="detail-value">{{ formatDate(invoice.dueDate) }}</span>
                  </div>
                  
                  <div v-if="invoice.status === 'overdue'" class="detail-row overdue">
                    <span class="detail-label">Días de Retraso:</span>
                    <span class="detail-value">{{ calculateOverdueDays(invoice.dueDate) }} días</span>
                  </div>
                </div>

                <div class="invoice-actions">
                  <button @click="downloadInvoicePDF(invoice)" class="action-btn secondary">
                    📄 PDF
                  </button>
                  <button 
                    v-if="invoice.status === 'pending' || invoice.status === 'overdue'"
                    @click="markAsPaid(invoice)" 
                    class="action-btn primary"
                  >
                    💰 Marcar Pagada
                  </button>
                  <button @click="viewInvoiceDetails(invoice)" class="action-btn secondary">
                    👁️ Ver Detalles
                  </button>
                </div>
              </div>
            </div>
            
            <div v-else class="empty-state-small">
              <span class="empty-icon-small">🧾</span>
              <span>Sin facturas generadas</span>
              <button @click="generateInvoiceManually" class="btn btn-primary btn-small">
                Generar Primera Factura
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para asignar equipos -->
    <div v-if="showAssignEquipmentModal" class="modal-overlay" @click="closeAssignEquipmentModal">
      <div class="modal-content assign-equipment-modal" @click.stop>
        <div class="modal-header">
          <h3>Asignar Equipo al Cliente</h3>
          <button @click="closeAssignEquipmentModal" class="close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="search-section">
            <label for="equipmentSearch">Buscar por Serial o MAC:</label>
            <div class="search-input-group">
              <input 
                type="text" 
                id="equipmentSearch"
                v-model="equipmentSearchTerm"
                placeholder="Ingrese número de serie o dirección MAC..."
                @keyup.enter="searchEquipment"
              />
              <button @click="searchEquipment" :disabled="!equipmentSearchTerm.trim()" class="search-btn">
                🔍 Buscar
              </button>
            </div>
          </div>

          <div v-if="equipmentSearchResults.length > 0" class="search-results">
            <h4>Resultados de búsqueda:</h4>
            <div 
              v-for="item in equipmentSearchResults" 
              :key="item.id"
              class="search-result-item"
            >
              <div class="result-info">
                <h5>{{ item.name }}</h5>
                <p>{{ item.brand }} {{ item.model }}</p>
                <div class="result-details">
                  <span v-if="item.serialNumber">S/N: {{ item.serialNumber }}</span>
                  <span v-if="item.macAddress">MAC: {{ item.macAddress }}</span>
                  <span>Estado: {{ item.status }}</span>
                </div>
              </div>
              <div class="result-actions">
                <button 
                  @click="selectEquipmentForAssignment(item)" 
                  :disabled="item.clientId !== null"
                  class="select-btn"
                >
                  {{ item.clientId !== null ? 'Ya asignado' : 'Seleccionar' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="selectedEquipment" class="assignment-form">
            <h4>Asignar: {{ selectedEquipment.name }}</h4>
            
            <!-- Información del template encontrado -->
            <div v-if="selectedEquipment.deviceTemplate" class="template-info success">
              <div class="info-badge">
                ✓ Configuración encontrada: {{ selectedEquipment.deviceTemplate.brand }} {{ selectedEquipment.deviceTemplate.model }}
              </div>
              <small>Se aplicarán automáticamente las credenciales y configuración técnica</small>
            </div>
            
            <div v-else class="template-info warning">
              <div class="info-badge">
                ⚠ No hay configuración previa para este modelo
              </div>
              <small>Se creará como dispositivo nuevo</small>
            </div>
            
            <!-- Información del inventario -->
            <div class="inventory-info">
              <h5>Información del inventario:</h5>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">ID Inventario:</span>
                  <span class="value">{{ selectedEquipment.id }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Estado actual:</span>
                  <span class="value">{{ selectedEquipment.status }}</span>
                </div>
                <div class="info-item" v-if="selectedEquipment.location">
                  <span class="label">Ubicación:</span>
                  <span class="value">{{ selectedEquipment.location.name }}</span>
                </div>
              </div>
            </div>
            
            <!-- Campos de solo lectura del inventario -->
            <div class="readonly-section">
              <div class="form-row">
                <div class="form-group">
                  <label for="serialNumber">Número de serie:</label>
                  <input 
                    type="text" 
                    id="serialNumber"
                    :value="selectedEquipment.serialNumber"
                    readonly
                    class="readonly-field"
                  />
                </div>
                
                <div class="form-group">
                  <label for="macAddress">MAC Address:</label>
                  <input 
                    type="text" 
                    id="macAddress"
                    :value="selectedEquipment.macAddress"
                    readonly
                    class="readonly-field"
                  />
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="inventoryBrand">Marca:</label>
                  <input 
                    type="text" 
                    id="inventoryBrand"
                    :value="selectedEquipment.brand"
                    readonly
                    class="readonly-field"
                  />
                </div>
                
                <div class="form-group">
                  <label for="inventoryModel">Modelo:</label>
                  <input 
                    type="text" 
                    id="inventoryModel"
                    :value="selectedEquipment.model"
                    readonly
                    class="readonly-field"
                  />
                </div>
              </div>
            </div>
            
            <!-- Campos editables -->
            <div class="editable-section">
              <div class="form-group">
                <label for="deviceName">Nombre del dispositivo:</label>
                <input 
                  type="text" 
                  id="deviceName"
                  v-model="assignmentForm.deviceName"
                  :placeholder="selectedEquipment.name"
                />
              </div>
              
              <div class="form-group">
                <label for="deviceType">Tipo de dispositivo:</label>
                <select id="deviceType" v-model="assignmentForm.deviceType">
                  <option value="antenna">Antena</option>
                  <option value="modem">Módem</option>
                  <option value="router">Router</option>
                  <option value="switch">Switch</option>
                  <option value="cpe">CPE</option>
                  <option value="other">Otro</option>
                </select>
                <small v-if="selectedEquipment.deviceTemplate" class="auto-detected">
                  Autodetectado desde template: {{ selectedEquipment.deviceTemplate.type }}
                </small>
              </div>
              
              <div class="form-group">
                <label for="deviceIP">Dirección IP (opcional):</label>
                <input 
                  type="text" 
                  id="deviceIP"
                  v-model="assignmentForm.ipAddress"
                  placeholder="192.168.1.100"
                />
              </div>
              
              <div class="form-group">
                <label for="deviceLocation">Ubicación física:</label>
                <input 
                  type="text" 
                  id="deviceLocation"
                  v-model="assignmentForm.location"
                  placeholder="Casa del cliente, torre, etc."
                />
              </div>
              
              <div class="form-group">
                <label for="assignmentNotes">Notas de instalación:</label>
                <textarea 
                  id="assignmentNotes"
                  v-model="assignmentForm.notes"
                  placeholder="Notas adicionales sobre la instalación..."
                  rows="3"
                ></textarea>
              </div>
            </div>
            
            <!-- Resumen de la asignación -->
            <div class="assignment-summary">
              <h5>Resumen de la asignación:</h5>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="label">Cliente:</span>
                  <span class="value">{{ client.firstName }} {{ client.lastName }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Nodo:</span>
                  <span class="value">{{ getNodeName(client.nodeId) }}</span>
                </div>
                <div class="summary-item" v-if="client.sectorId">
                  <span class="label">Sector:</span>
                  <span class="value">{{ getSectorName(client.sectorId) }}</span>
                </div>
                <div class="summary-item" v-if="selectedEquipment.deviceTemplate">
                  <span class="label">Credenciales:</span>
                  <span class="value">Se copiarán automáticamente</span>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button @click="cancelAssignment" class="cancel-btn">Cancelar</button>
              <button @click="confirmEquipmentAssignment" class="confirm-btn">
                {{ selectedEquipment.deviceTemplate ? 'Asignar con Template' : 'Asignar Equipo' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para asignar materiales -->
    <div v-if="showAssignMaterialModal" class="modal-overlay" @click="closeAssignMaterialModal">
      <div class="modal-content assign-material-modal" @click.stop>
        <div class="modal-header">
          <h3>Asignar Material Consumible</h3>
          <button @click="closeAssignMaterialModal" class="close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="search-section">
            <label for="materialSearch">Buscar Material:</label>
            <div class="search-input-group">
              <input 
                type="text" 
                id="materialSearch"
                v-model="materialSearchTerm"
                placeholder="Ingrese nombre del material..."
                @keyup.enter="searchMaterial"
              />
              <button @click="searchMaterial" :disabled="!materialSearchTerm.trim()" class="search-btn">
                🔍 Buscar
              </button>
            </div>
          </div>

          <div v-if="materialSearchResults.length > 0" class="search-results">
            <h4>Materiales disponibles:</h4>
            <div 
              v-for="item in materialSearchResults" 
              :key="item.id"
              class="search-result-item"
            >
              <div class="result-info">
                <h5>{{ item.name }}</h5>
                <p>{{ item.brand }} {{ item.model }}</p>
                <div class="result-details">
                  <span>Disponible: {{ item.quantity }}{{ getUnitType(item.name) }}</span>
                  <span>Costo: ${{ item.cost }}</span>
                  <span>Ubicación: {{ item.location?.name || 'Sin ubicación' }}</span>
                </div>
              </div>
              <div class="result-actions">
                <button 
                  @click="selectMaterialForAssignment(item)" 
                  :disabled="item.quantity <= 0"
                  class="select-btn"
                >
                  {{ item.quantity <= 0 ? 'Sin stock' : 'Seleccionar' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="selectedMaterial" class="assignment-form">
            <h4>Asignar: {{ selectedMaterial.name }}</h4>
            
            <div class="form-group">
              <label for="quantityToUse">Cantidad a usar:</label>
              <div class="quantity-input-group">
                <input 
                  type="number" 
                  id="quantityToUse"
                  v-model="materialAssignmentForm.quantityToUse"
                  :max="selectedMaterial.quantity"
                  min="1"
                  step="0.1"
                />
                <span class="unit-label">{{ getUnitType(selectedMaterial.name) }}</span>
              </div>
              <small>Disponible: {{ selectedMaterial.quantity }}{{ getUnitType(selectedMaterial.name) }}</small>
            </div>

            <div class="form-group">
              <label for="materialUsage">Tipo de uso:</label>
              <select id="materialUsage" v-model="materialAssignmentForm.usage">
                <option value="installation">Instalación</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="repair">Reparación</option>
                <option value="upgrade">Actualización</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div class="form-group">
              <label for="materialNotes">Notas:</label>
              <textarea 
                id="materialNotes"
                v-model="materialAssignmentForm.notes"
                placeholder="Detalles del uso del material..."
              ></textarea>
            </div>

            <div class="cost-summary">
              <div class="cost-item">
                <span>Costo unitario:</span>
                <span>${{ (parseFloat(selectedMaterial.cost) / selectedMaterial.quantity).toFixed(2) }}</span>
              </div>
              <div class="cost-item total">
                <span>Costo total:</span>
                <span>${{ calculateMaterialCost() }}</span>
              </div>
            </div>

            <div class="form-actions">
              <button @click="cancelMaterialAssignment" class="cancel-btn">Cancelar</button>
              <button @click="confirmMaterialAssignment" class="confirm-btn">Asignar Material</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// import ClientService from '../../services/client.service'; // Unused
import DeviceService from '../../services/device.service';
import InventoryService from '../../services/inventory.service';
// import PDFGeneratorService from '../../services/pdf.generator.service'; // Unused
import BillingService from '../../services/billing.service';
import SubscriptionService from '../../services/subscription.service';
import InvoiceService from '../../services/invoice.service';  // ✅ AGREGAR




export default {
  name: 'ServicesTab',
  props: {
    client: {
      type: Object,
      required: true
    },
    subscriptions: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      showAllInvoices: false,
      showMenu: null,
      clientDevices: [],
      clientMaterials: [],
      billingInfo: null,
      clientInvoices: [],
      
      // Modal states
      showAssignEquipmentModal: false,
      
      // Equipment assignment
      equipmentSearchTerm: '',
      equipmentSearchResults: [],
      selectedEquipment: null,
      assignmentForm: {
        deviceName: '',
        deviceType: 'antenna',
        ipAddress: '',
        location: '',
        notes: ''
      },
      
      // Material assignment
      showAssignMaterialModal: false,
      materialSearchTerm: '',
      materialSearchResults: [],
      selectedMaterial: null,
      materialAssignmentForm: {
        quantityToUse: 1,
        usage: '',
        notes: ''
      }
    };
  },
  mounted() {
    this.loadClientDevicesAndMaterials();
    this.loadClientBilling();
    this.loadClientInvoices();

    document.addEventListener('click', this.closeMenusOnOutsideClick);    
    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.subscription-menu') && !e.target.closest('.action-btn.menu')) {
        this.showMenu = null;
      }
    });
  },
  
  beforeUnmount() {
  document.removeEventListener('click', this.closeMenusOnOutsideClick);
},

// ✅ AGREGAR ESTA COMPUTED PROPERTY NUEVA:
computed: {
  displayedInvoices() {
    if (this.showAllInvoices) {
      return this.clientInvoices;
    }
    return this.clientInvoices.slice(0, 3);
  }
},


  methods: {

  // Método para cambiar pestañas
  setActiveTab(tabName) {
    this.activeTab = tabName;
  },
  
  // Método para cerrar menús al hacer clic fuera
  closeMenusOnOutsideClick(event) {
    if (!event.target.closest('.service-menu-dropdown') && !event.target.closest('.btn-menu')) {
      this.showMenu = null;
    }
  },  
  
// Agregar estos métodos en la sección methods:
getNodeName(nodeId) {
  // Si tienes acceso a la lista de nodos
  return 'Nodo ' + nodeId; // Simplificado, puedes mejorarlo
},

getSectorName(sectorId) {
  // Si tienes acceso a la lista de sectores
  return 'Sector ' + sectorId; // Simplificado, puedes mejorarlo
},
    // ===============================
    // CARGA DE DATOS
    // ===============================
async loadClientDevicesAndMaterials() {
  try {
    // ✅ Cargar dispositivos
    const devicesResponse = await DeviceService.getAllDevices({ 
      clientId: this.client.id 
    });
    
    // ✅ Cargar materiales 
    const inventoryResponse = await InventoryService.getAllInventory({ 
      clientId: this.client.id 
    });

    // ✅ USAR LA MISMA EXTRACCIÓN QUE FUNCIONA
    const devicesData = this.extractApiData(devicesResponse);
    const inventoryData = this.extractApiData(inventoryResponse);
    
    this.clientDevices = devicesData.devices || devicesData || [];
    this.clientMaterials = inventoryData.items || inventoryData || [];

    console.log('✅ Dispositivos cargados:', this.clientDevices.length);
    console.log('✅ Materiales cargados:', this.clientMaterials.length);

  } catch (error) {
    console.error('❌ Error cargando dispositivos y materiales:', error);
    this.$emit('show-notification', 'Error cargando equipos del cliente', 'error');
  }
},

async loadClientBilling() {
  try {
    console.log('🔍 Cargando billing para cliente:', this.client.id);
    
    // ✅ USAR EL MÉTODO CORRECTO DEL BILLING SERVICE
    const response = await BillingService.getClientBillingByClientId(this.client.id);
    
    console.log('📋 Respuesta del billing service:', response);
    console.log('📋 Datos recibidos:', response.data);
    
    // ✅ MANEJAR DIFERENTES ESTRUCTURAS DE RESPUESTA
    let billingData = null;
    
    if (response.data) {
      if (response.data.success && response.data.data) {
        // Estructura: { success: true, data: {...} }
        billingData = response.data.data;
      } else if (response.data.id) {
        // Estructura directa: { id, clientId, ... }
        billingData = response.data;
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        // Estructura array: [{ id, clientId, ... }]
        billingData = response.data[0];
      }
    }
    
    this.billingInfo = billingData;
    
    console.log('✅ BillingInfo asignado:', {
      id: this.billingInfo?.id,
      billingDay: this.billingInfo?.billingDay,
      monthlyFee: this.billingInfo?.monthlyFee,
      nextDueDate: this.billingInfo?.nextDueDate,
      lastPaymentDate: this.billingInfo?.lastPaymentDate
    });
    
  } catch (error) {
    console.error('❌ Error cargando facturación del cliente:', error);
    console.error('❌ Error response:', error.response?.data);
    this.billingInfo = null;
  }
},

async loadClientInvoices() {
  try {
    // ✅ USAR LA MISMA LÓGICA QUE FUNCIONA EN EL DASHBOARD
    const response = await InvoiceService.getClientInvoices(this.client.id, { 
      page: 1,
      limit: 10
    });
    
    console.log('📋 Respuesta completa de facturas:', response);
    
    // ✅ APLICAR LA MISMA EXTRACCIÓN DE DATOS QUE EN EL DASHBOARD
    const invoicesData = this.extractApiData(response);
    this.clientInvoices = invoicesData.invoices || invoicesData || [];
    
    console.log('📋 Facturas del cliente extraídas:', this.clientInvoices.length);
    
  } catch (error) {
    console.error('❌ Error cargando facturas del cliente:', error);
    this.clientInvoices = [];
  }
},

// ✅ AGREGAR EL MÉTODO AUXILIAR QUE FUNCIONA EN EL DASHBOARD
extractApiData(response) {
  if (!response || !response.data) {
    console.warn('⚠️ Respuesta vacía o inválida:', response);
    return {};
  }
  // Si tiene estructura { success: true, data: {...} }
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  // Si es directamente los datos
  return response.data;
},


    // ===============================
    // GESTIÓN DE SUSCRIPCIONES
    // ===============================
    showSubscriptionMenu(subscription) {
      this.showMenu = this.showMenu === subscription.id ? null : subscription.id;
    },

    async suspendSubscription(subscription) {
      if (!confirm('¿Está seguro que desea suspender este servicio?')) return;
      
      try {
        this.showMenu = null;
        
        await SubscriptionService.suspendSubscription(subscription.id, 'Suspensión manual');
        await SubscriptionService.reactivateSubscription(subscription.id);
        await SubscriptionService.cancelSubscription(subscription.id, 'Cancelación manual');
         
        this.$emit('refresh');
        this.$emit('show-notification', 'Servicio suspendido correctamente', 'success');
        
      } catch (error) {
        console.error('❌ Error suspendiendo servicio:', error);
        this.$emit('show-notification', 'Error al suspender el servicio', 'error');
      }
    },

    async reactivateSubscription(subscription) {
      if (!confirm('¿Está seguro que desea reactivar este servicio?')) return;
      
      try {
        this.showMenu = null;
        
        await SubscriptionService.reactivateSubscription(subscription.id);
        
        this.$emit('refresh');
        this.$emit('show-notification', 'Servicio reactivado correctamente', 'success');
        
      } catch (error) {
        console.error('❌ Error reactivando servicio:', error);
        this.$emit('show-notification', 'Error al reactivar el servicio', 'error');
      }
    },

    async cancelSubscription(subscription) {
      if (!confirm('¿Está seguro que desea cancelar permanentemente esta suscripción?')) return;
      
      try {
        this.showMenu = null;
        
        await SubscriptionService.cancelSubscription(subscription.id, 'Cancelación manual');
        
        this.$emit('refresh');
        this.$emit('show-notification', 'Suscripción cancelada correctamente', 'success');
        
      } catch (error) {
        console.error('❌ Error cancelando suscripción:', error);
        this.$emit('show-notification', 'Error al cancelar la suscripción', 'error');
      }
    },

    // eslint-disable-next-line no-unused-vars
    downloadConfigPDF(subscription) {
      this.showMenu = null;
      this.$emit('show-notification', 'Descarga de configuración iniciada', 'info');
    },

    viewPPPoEDetails(subscription) {
      this.showMenu = null;
      this.$router.push(`/mikrotik/pppoe-users?username=${subscription.pppoeUsername}`);
    },

    // ===============================
    // GESTIÓN DE EQUIPOS
    // ===============================
    getDeviceIcon(type) {
      const icons = {
        'router': '📡',
        'antenna': '📶',
        'switch': '🔌',
        'cpe': '📻',
        'modem': '📱',
        'other': '🔧'
      };
      return icons[type] || '📱';
    },

    formatDeviceStatus(status) {
      const statusMap = {
        'online': 'En línea',
        'offline': 'Fuera de línea',
        'unknow': 'Desconocido',
        'maintenance': 'Mantenimiento'
      };
      return statusMap[status] || status;
    },

    accessDevice(device) {
      if (device.ipAddress) {
        const url = `http://${device.ipAddress}`;
        window.open(url, '_blank');
      }
    },

    configureDevice(device) {
      this.$router.push(`/devices/${device.id}/configure`);
    },

async unassignDevice(device) {
  if (!confirm('¿Está seguro que desea desasignar este equipo del cliente?')) return;
  
  try {
    // Actualizar dispositivo
    await DeviceService.updateDevice(device.id, { 
      clientId: null,
      status: 'offline',
      notes: `${device.notes || ''} - Desasignado de cliente ${this.client.firstName} ${this.client.lastName}`.trim()
    });
    
    // SINCRONIZACIÓN: Actualizar inventario también
    if (device.serialNumber) {
      try {
        const inventoryResponse = await InventoryService.searchInventoryBySerial(device.serialNumber);
        const inventoryItems = inventoryResponse.data.items || [];
        
        for (const item of inventoryItems) {
          if (item.clientId === this.client.id) {
            await InventoryService.updateInventory(item.id, {
              clientId: null,
              status: 'available',
              notes: `Desasignado - Disponible para nuevo cliente`
            });
          }
        }
      } catch (syncError) {
        console.log('No se pudo sincronizar con inventario');
      }
    }
    
    await this.loadClientDevicesAndMaterials();
    this.$emit('show-notification', 'Equipo desasignado correctamente', 'success');
    
  } catch (error) {
    console.error('Error desasignando equipo:', error);
    this.$emit('show-notification', 'Error al desasignar el equipo', 'error');
  }
},
    // ===============================
    // GESTIÓN DE MATERIALES
    // ===============================
    getMaterialIcon(name) {
      const lowerName = name.toLowerCase();
      if (lowerName.includes('cable')) return '🔌';
      if (lowerName.includes('conector')) return '🔗';
      if (lowerName.includes('tornillo')) return '🔩';
      if (lowerName.includes('abrazadera')) return '⚙️';
      if (lowerName.includes('tubo')) return '🚰';
      return '📦';
    },

    getUnitType(itemName) {
      const lowerName = itemName.toLowerCase();
      if (lowerName.includes('cable') || lowerName.includes('tubo')) return 'm';
      if (lowerName.includes('conector') || lowerName.includes('tornillo')) return ' pzs';
      return '';
    },

    viewInstallationDetails(material) {
      this.$router.push(`/inventory/${material.id}/installation-details`);
    },

    // ===============================
    // MODAL DE ASIGNACIÓN DE EQUIPOS
    // ===============================
    openAssignEquipmentModal() {
      this.showAssignEquipmentModal = true;
      this.resetEquipmentAssignment();
    },

    closeAssignEquipmentModal() {
      this.showAssignEquipmentModal = false;
      this.resetEquipmentAssignment();
    },

    resetEquipmentAssignment() {
      this.equipmentSearchTerm = '';
      this.equipmentSearchResults = [];
      this.selectedEquipment = null;
      this.assignmentForm = {
        deviceName: '',
        deviceType: 'antenna',
        ipAddress: '',
        location: '',
        notes: ''
      };
    },

async searchEquipment() {
  if (!this.equipmentSearchTerm.trim()) return;
  
  try {
    const searchTerm = this.equipmentSearchTerm.trim();
    
    // PASO 1: Buscar en Inventory por serial
    const inventoryResponse = await InventoryService.searchInventoryBySerial(searchTerm);
    const inventoryResults = inventoryResponse.data.items || inventoryResponse.data || [];
    
    // PASO 2: Buscar en Device por el mismo serial para obtener configuración técnica
    let deviceTemplate = null;
    try {
      const deviceResponse = await DeviceService.getAllDevices({ serialNumber: searchTerm });
      const deviceResults = deviceResponse.data.devices || deviceResponse.data || [];
      if (deviceResults.length > 0) {
        deviceTemplate = deviceResults[0]; // Tomar el primer resultado como template
      }
    } catch (error) {
      console.log('No se encontró template de dispositivo para este serial');
    }
    
    // PASO 3: Combinar datos y filtrar disponibles
    this.equipmentSearchResults = inventoryResults
      .filter(item => 
        item.clientId === null && 
        (item.status !== 'consumable' && !item.name.toLowerCase().includes('cable'))
      )
      .map(item => ({
        ...item,
        deviceTemplate: deviceTemplate // Agregar template si existe
      }));
    
    console.log('Equipos encontrados:', this.equipmentSearchResults.length);
    if (deviceTemplate) {
      console.log('Template de configuración encontrado:', deviceTemplate.brand, deviceTemplate.model);
    }

    if (this.equipmentSearchResults.length === 0) {
      this.$emit('show-notification', 'No se encontraron equipos disponibles', 'warning');
    }
    
  } catch (error) {
    console.error('Error buscando equipos:', error);
    this.$emit('show-notification', 'Error al buscar equipos', 'error');
  }
},

selectEquipmentForAssignment(item) {
  this.selectedEquipment = item;
  
  // Usar datos del inventario
  this.assignmentForm.deviceName = item.name;
  
  // Si hay template de Device, usar esos datos técnicos
  if (item.deviceTemplate) {
    this.assignmentForm.deviceType = item.deviceTemplate.type || 'antenna';
    // Prellenar más campos si están disponibles en el template
    this.assignmentForm.ipAddress = ''; // Dejarlo vacío para que el usuario ingrese uno nuevo
  } else {
    // Auto-detectar tipo si no hay template
    const name = item.name.toLowerCase();
    if (name.includes('antena')) this.assignmentForm.deviceType = 'antenna';
    else if (name.includes('modem')) this.assignmentForm.deviceType = 'modem';
    else if (name.includes('router')) this.assignmentForm.deviceType = 'router';
    else if (name.includes('switch')) this.assignmentForm.deviceType = 'switch';
    else if (name.includes('cpe')) this.assignmentForm.deviceType = 'cpe';
  }
},


    cancelAssignment() {
      this.selectedEquipment = null;
      this.assignmentForm = {
        deviceName: '',
        deviceType: 'antenna',
        ipAddress: '',
        location: '',
        notes: ''
      };
    },

async confirmEquipmentAssignment() {
  if (!this.selectedEquipment) return;
  
  try {
    const template = this.selectedEquipment.deviceTemplate;
    
    const deviceData = {
      name: this.assignmentForm.deviceName || this.selectedEquipment.name,
      type: this.assignmentForm.deviceType,
      brand: template?.brand || this.selectedEquipment.brand || 'unknown',
      model: template?.model || this.selectedEquipment.model || 'N/A',
      serialNumber: this.selectedEquipment.serialNumber, // ✅ Sin ||null
      macAddress: this.selectedEquipment.macAddress || null,
      ipAddress: this.assignmentForm.ipAddress || '192.168.1.1',
      location: this.assignmentForm.location || null,
      clientId: this.client.id, // ✅ CAMPO OBLIGATORIO
      nodeId: this.client.nodeId || null,
      sectorId: this.client.sectorId || null,
      status: 'offline',
      firmwareVersion: template?.firmwareVersion || 'N/A',
      isFiberDevice: template?.isFiberDevice || false,
      notes: `${this.assignmentForm.notes || ''} - ID Inventario: ${this.selectedEquipment.id}`.trim(),
      connectionParams: template?.connectionParams || {}, // ✅ OBJETO VACÍO
      monitoringData: template?.monitoringData || {},
      specificConfig: template?.specificConfig || {},
      metadata: template?.metadata || {} // ✅ OBJETO VACÍO
    };

    // Debug para verificar
    console.log('Verificando campos obligatorios:');
    console.log('- serialNumber:', deviceData.serialNumber);
    console.log('- clientId:', deviceData.clientId);
    console.log('- connectionParams:', deviceData.connectionParams);
    console.log('- metadata:', deviceData.metadata);

    const newDevice = await DeviceService.createDevice(deviceData);
    
     if (!deviceData.name || !deviceData.type || !deviceData.brand || !deviceData.ipAddress) {
  this.$emit('show-notification', 'Por favor complete todos los campos obligatorios', 'warning');
  return;
}
    console.log('Datos que se van a enviar:', deviceData);
    // Si hay template, copiar credenciales también
    const deviceId = newDevice.data.id || newDevice.data.device?.id;
    
    if (template && deviceId) {
      // Copiar credenciales del template
      try {
        const credentialsResponse = await DeviceService.getDeviceCredentials(template.id);
        const templateCredentials = credentialsResponse.data.credentials || [];
        
        for (const cred of templateCredentials) {
          const newCredential = {
            deviceId: deviceId,
            connectionType: cred.connectionType,
            username: cred.username,
            password: cred.password,
            port: cred.port,
            // ... copiar otros campos de credenciales
            isActive: cred.isActive
          };
          await DeviceService.createDeviceCredentials(deviceId, newCredential);
        }
      } catch (credError) {
        console.log('No se pudieron copiar las credenciales del template');
      }
    }
    
    // Actualizar inventario (sincronización bidireccional)
    await InventoryService.updateInventory(this.selectedEquipment.id, {
      clientId: this.client.id,
      status: 'inUse',
      notes: `Asignado a cliente ${this.client.firstName} ${this.client.lastName}`
    });
    
    this.closeAssignEquipmentModal();
    await this.loadClientDevicesAndMaterials();
    this.$emit('show-notification', 'Equipo asignado correctamente', 'success');
    
} catch (error) {
  console.error('Error asignando equipo:', error);
  console.error('Response data:', error.response?.data);
  console.error('Response status:', error.response?.status);
  this.$emit('show-notification', 
    error.response?.data?.message || 'Error al asignar el equipo', 
    'error'
  );
}} ,


    // ===============================
    // MODAL DE ASIGNACIÓN DE MATERIALES
    // ===============================
    openAssignMaterialModal() {
      this.showAssignMaterialModal = true;
      this.resetMaterialAssignment();
    },

    closeAssignMaterialModal() {
      this.showAssignMaterialModal = false;
      this.resetMaterialAssignment();
    },

    resetMaterialAssignment() {
      this.materialSearchTerm = '';
      this.materialSearchResults = [];
      this.selectedMaterial = null;
      this.materialAssignmentForm = {
        quantityToUse: 1,
        usage: 'installation',
        notes: ''
      };
    },

async searchMaterial() {
  if (!this.materialSearchTerm.trim()) return;
  
  try {
const results = await InventoryService.searchInventory(
  this.materialSearchTerm.trim()
);

this.materialSearchResults = results.filter(item => 
  item.quantity > 0 && 
  (item.status === 'consumable' || item.name.toLowerCase().includes('cable') || item.name.toLowerCase().includes('conector') || item.name.toLowerCase().includes('tornillo')) &&
  (item.clientId === null || item.clientId === undefined)
);
    

    console.log('🔍 Materiales encontrados:', this.materialSearchResults.length);

    if (this.materialSearchResults.length === 0) {
      this.$emit('show-notification', 'No se encontraron materiales disponibles', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Error buscando materiales:', error);
    this.$emit('show-notification', 'Error al buscar materiales', 'error');
  }
},

	
	async searchEquipmentAlternative() {
  if (!this.equipmentSearchTerm.trim()) return;
  
  try {
    this.equipmentSearchResults = [];
    const searchTerm = this.equipmentSearchTerm.trim();
    
    // Determinar si es serial o MAC por el formato
    const isMacAddress = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(searchTerm);
    
    let results = [];
    
    if (isMacAddress) {
      // ✅ Buscar por MAC usando ruta real
      const response = await InventoryService.searchInventoryByMac(searchTerm);
      results = response.data || [];
    } else {
      // ✅ Buscar por serial usando ruta real
      const response = await InventoryService.searchInventoryBySerial(searchTerm);
      results = response.data || [];
    }
    
    // Si no encuentra por serial/MAC, buscar por nombre
    if (results.length === 0) {
      const response = await InventoryService.getAllInventory({
        name: searchTerm,
        page: 1,
        size: 20
      });
      results = response.data.items || [];
    }
    
    // Filtrar solo equipos disponibles
    this.equipmentSearchResults = results.filter(item => 
      item.clientId === null && 
      item.status !== 'consumable'
    );
    
    if (this.equipmentSearchResults.length === 0) {
      this.$emit('show-notification', 'No se encontraron equipos disponibles', 'warning');
    }
    
  } catch (error) {
    console.error('❌ Error buscando equipos:', error);
    this.$emit('show-notification', 'Error al buscar equipos', 'error');
  }
},

selectMaterialForAssignment(item) {
  this.selectedMaterial = item;
  this.materialAssignmentForm.quantityToUse = Math.min(1, item.quantity);
  this.materialAssignmentForm.usage = 'installation'; // ✅ AGREGAR ESTA LÍNEA
  this.materialAssignmentForm.notes = `${item.name} usado para cliente ${this.client.firstName} ${this.client.lastName}`;
},

calculateMaterialCost() {
  if (!this.selectedMaterial || !this.materialAssignmentForm.quantityToUse) return '0.00';
  
  const unitCost = parseFloat(this.selectedMaterial.cost) / this.selectedMaterial.quantity;
  const totalCost = unitCost * this.materialAssignmentForm.quantityToUse;
  return totalCost.toFixed(2);
},

cancelMaterialAssignment() {
  this.selectedMaterial = null;
  this.resetMaterialAssignment();
},

async confirmMaterialAssignment() {
  if (!this.selectedMaterial || !this.materialAssignmentForm.quantityToUse) return;
  // Validar usuario logueado
  const currentUser = this.$store.state.auth.user;
  console.log('Current user from store:', currentUser);
  console.log('User ID:', currentUser?.id);
  
  if (!currentUser || !currentUser.id) {
    this.$emit('show-notification', 'Error: Usuario no autenticado correctamente', 'error');
    return;
  }  
  try {
    // 1. Consumir material (esto ya funciona)
    await InventoryService.consumeMaterial({
      inventoryId: this.selectedMaterial.id,
      quantityToUse: this.materialAssignmentForm.quantityToUse,
      clientId: this.client.id,
      technicianId: this.$store.state.auth.user?.id || 1,
      notes: this.materialAssignmentForm.notes,
      usage: this.materialAssignmentForm.usage
    });
    
    // 2. Crear registro hijo en inventario
    const childInventoryData = {
      name: `${this.selectedMaterial.name} - Usado`,
      brand: this.selectedMaterial.brand,
      model: this.selectedMaterial.model,
      serialNumber: this.selectedMaterial.serialNumber,
      description: this.selectedMaterial.description,
      quantity: this.materialAssignmentForm.quantityToUse,
      clientId: this.client.id,
      status: 'inUse',
      locationId: 5,
      notes: `Material usado para cliente - Origen: ID${this.selectedMaterial.id} - ${this.materialAssignmentForm.notes}`,
      cost: (parseFloat(this.selectedMaterial.cost) / this.selectedMaterial.quantity) * this.materialAssignmentForm.quantityToUse,
      productId: this.selectedMaterial.productId || null
    };
    
    const newInventoryItem = await InventoryService.createInventory(childInventoryData);
    const newItemId = newInventoryItem.data.id || newInventoryItem.data.item?.id;
    console.log('Selected material data:', {
  id: this.selectedMaterial.id,
  name: this.selectedMaterial.name,
  locationId: this.selectedMaterial.locationId,
  location: this.selectedMaterial.location
});

console.log('Full selected material object:', this.selectedMaterial);
    // 3. Crear movimiento de inventario
    const movementData = {
      inventoryId: this.selectedMaterial.id,
      type: 'out',
      quantity: this.materialAssignmentForm.quantityToUse, // Negativo porque sale del stock
      reason: this.materialAssignmentForm.usage,
      reference: `SPLIT_TO_${newItemId}`,
      notes: `División de material - Cliente: ${this.client.firstName} ${this.client.lastName} - Nuevo ID: ${newItemId}`,
      fromLocationId: this.selectedMaterial.locationId, // ← Tomar ubicación original
      toLocationId: 5, // ← Ubicación "Cliente"
      movementDate: new Date().toISOString(),
      movedById: currentUser.id
    };

    console.log('Movement data being sent:', movementData); // Debug para ver qué se envía
    
    await InventoryService.createMovement(movementData);
    
    this.closeAssignMaterialModal();
    await this.loadClientDevicesAndMaterials();
    
    this.$emit('show-notification', 
      `${this.materialAssignmentForm.quantityToUse}${this.getUnitType(this.selectedMaterial.name)} de ${this.selectedMaterial.name} asignados correctamente`, 
      'success'
    );
    
  } catch (error) {
    console.error('Error asignando material:', error);
    this.$emit('show-notification', 'Error al asignar el material', 'error');
  }
},

    // ===============================
    // GESTIÓN DE FACTURACIÓN
    // ===============================
    setupBilling() {
      this.$router.push(`/clients/${this.client.id}/billing/setup`);
    },

// Para cuando implementes el registro de pagos
async registerPayment(paymentData) {
  try {
    // 1. ✅ Crear registro en Payments
    await BillingService.registerPayment(this.client.id, paymentData);

    // 2. ✅ Actualizar Invoice a status 'paid'
    await this.updateInvoiceStatus(paymentData.invoiceId, 'paid');
    
    // 3. ✅ Actualizar ClientBilling con lastPaymentDate y próximo nextDueDate
    const nextDueDate = this.calculateNextDueDate(paymentData.paymentDate);
    await BillingService.updateClientBilling(this.billingInfo.id, {
      lastPaymentDate: paymentData.paymentDate,
      nextDueDate: nextDueDate,
      clientStatus: 'active'
    });
    
  } catch (error) {
    console.error('❌ Error registrando pago:', error);
  }
},

// Calcular próxima fecha de vencimiento basada en billingDay
calculateNextDueDate(paymentDate) {
  const payment = new Date(paymentDate);
  const billingDay = parseInt(this.billingInfo.billingDay);
  
  // Próximo billing day después del pago
  const nextDue = new Date(payment.getFullYear(), payment.getMonth() + 1, billingDay);
  
  return nextDue.toISOString().split('T')[0];
},

    viewBillingHistory() {
      this.$router.push(`/payments?clientId=${this.client.id}`);
    },

    downloadAccountStatement() {
      this.$emit('show-notification', 'Estado de cuenta generándose...', 'info');
    },

    async refreshInvoices() {
      await this.loadClientInvoices();
      this.$emit('show-notification', 'Facturas actualizadas', 'success');
    },

async generateInvoiceManually() {
  try {
    if (!this.billingInfo) {
      this.$emit('show-notification', 'Configure primero la facturación del cliente', 'warning');
      return;
    }

    const activeSubscription = this.subscriptions.find(sub => sub.status === 'active') || this.subscriptions[0];
    
    if (!activeSubscription) {
      this.$emit('show-notification', 'El cliente no tiene suscripciones activas', 'warning');
      return;
    }

    // ✅ USAR DATOS REALES DEL CLIENTBILLING
    const billingDay = parseInt(this.billingInfo.billingDay) || 1;
    
    let billingPeriodStart, billingPeriodEnd, dueDate;
    
    if (this.billingInfo.nextDueDate) {
      // ✅ SI YA TIENE NEXTDUEDATE, USARLO COMO BASE
      dueDate = new Date(this.billingInfo.nextDueDate);
      
      // ✅ EL PERÍODO ES DEL ÚLTIMO BILLING DAY AL DÍA ANTERIOR AL PRÓXIMO
      billingPeriodStart = new Date(dueDate);
      billingPeriodStart.setMonth(billingPeriodStart.getMonth() - 1); // Mes anterior
      billingPeriodStart.setDate(billingDay); // Día de facturación
      
      billingPeriodEnd = new Date(dueDate);
      billingPeriodEnd.setDate(billingPeriodEnd.getDate() - 1); // Un día antes del vencimiento
      
    } else {
      // ✅ SI NO TIENE NEXTDUEDATE, CALCULAR DESDE HOY
      const today = new Date();
      
      // Determinar el período actual basado en el billing day
      if (today.getDate() >= billingDay) {
        // Ya pasó el billing day de este mes
        billingPeriodStart = new Date(today.getFullYear(), today.getMonth(), billingDay);
        billingPeriodEnd = new Date(today.getFullYear(), today.getMonth() + 1, billingDay - 1);
        dueDate = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
      } else {
        // Aún no llega el billing day de este mes
        billingPeriodStart = new Date(today.getFullYear(), today.getMonth() - 1, billingDay);
        billingPeriodEnd = new Date(today.getFullYear(), today.getMonth(), billingDay - 1);
        dueDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
      }
    }

    // ✅ GENERAR NÚMERO DE FACTURA CON PERÍODO CORRECTO
    const invoiceNumber = `INV-${billingPeriodStart.getFullYear()}${String(billingPeriodStart.getMonth() + 1).padStart(2, '0')}-${this.client.id}-${Date.now().toString().slice(-4)}`;
    
    // ✅ CALCULAR MONTOS CORRECTOS
    const baseAmount = parseFloat(this.billingInfo.monthlyFee || 0);
    const taxAmount = baseAmount * 0.16; // 16% IVA
    const totalAmount = baseAmount + taxAmount;

    // ✅ DATOS DE FACTURA CON FECHAS CORREGIDAS
    const invoiceData = {
      period: `${billingPeriodStart.getFullYear()}-${String(billingPeriodStart.getMonth() + 1).padStart(2, '0')}`,
      
      // ✅ FECHAS SINCRONIZADAS CON CLIENTBILLING
      subscriptionId: activeSubscription.id,
      invoiceNumber: invoiceNumber,
      billingPeriodStart: billingPeriodStart.toISOString().split('T')[0],
      billingPeriodEnd: billingPeriodEnd.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0], // ✅ Mismo que nextDueDate
      
      // ✅ MONTOS CORREGIDOS
      amount: baseAmount,
      taxAmount: taxAmount,
      totalAmount: totalAmount, // ✅ Era 0.00, ahora será correcto
      
      // Estado
      status: 'pending',
      description: `Facturación mensual - ${billingPeriodStart.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`,
      
      // Datos adicionales
      invoiceData: {
        clientName: `${this.client.firstName} ${this.client.lastName}`,
        servicePackage: activeSubscription.ServicePackage?.name || 'Servicio',
        billingDay: billingDay,
        period: `${billingPeriodStart.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - ${billingPeriodEnd.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        details: {
          baseAmount: baseAmount,
          taxAmount: taxAmount,
          totalAmount: totalAmount,
          pppoeUsername: activeSubscription.pppoeUsername
        }
      }
    };

    // ✅ LOG DETALLADO PARA VERIFICAR CÁLCULOS
    console.log('📅 Información de ClientBilling:', {
      billingDay: billingDay,
      lastPaymentDate: this.billingInfo.lastPaymentDate,
      nextDueDate: this.billingInfo.nextDueDate,
      monthlyFee: this.billingInfo.monthlyFee
    });

    console.log('📅 Fechas calculadas para Invoice:', {
      billingPeriodStart: billingPeriodStart.toLocaleDateString(),
      billingPeriodEnd: billingPeriodEnd.toLocaleDateString(), 
      dueDate: dueDate.toLocaleDateString(),
      shouldMatchNextDue: this.billingInfo.nextDueDate
    });

    console.log('💰 Montos calculados:', {
      baseAmount: baseAmount,
      taxAmount: taxAmount,
      totalAmount: totalAmount
    });

    // ✅ Generar la factura
    const response = await BillingService.generateInvoice(this.client.id, invoiceData);
    
    console.log('✅ Factura generada exitosamente:', response.data);
    
    // Recargar datos
    await this.loadClientInvoices();
    await this.loadClientBilling();
    
    this.$emit('show-notification', 
      `Factura ${invoiceNumber} generada correctamente\nPeríodo: ${billingPeriodStart.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - ${billingPeriodEnd.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}\nVence: ${dueDate.toLocaleDateString('es-MX')}`, 
      'success'
    );
    
  } catch (error) {
    console.error('❌ Error generando factura:', error);
    console.error('❌ Response:', error.response?.data);
    
    let errorMessage = 'Error generando factura';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    this.$emit('show-notification', errorMessage, 'error');
  }
},


async updateClientBillingAfterInvoice(nextDueDate) {
  try {
    // ✅ ACTUALIZAR EL NEXTDUEDATE EN CLIENTBILLING
    const updateData = {
      nextDueDate: nextDueDate.toISOString().split('T')[0]
    };
    
    await BillingService.updateClientBilling(this.billingInfo.id, updateData);
    
    console.log('✅ ClientBilling actualizado con nueva fecha de vencimiento:', nextDueDate.toLocaleDateString());
    
  } catch (error) {
    console.error('❌ Error actualizando ClientBilling:', error);
  }
},

async debugInvoiceGeneration() {
  try {
    // Probar con datos mínimos primero
    const testData = {
      period: "2025-01"
    };
    
    console.log('🧪 Probando generación con datos mínimos:', testData);
    const response = await BillingService.generateInvoice(this.client.id, testData);
    console.log('✅ Response exitosa:', response.data);
    
  } catch (error) {
    console.error('❌ Error en debug:', error.response?.data);
    console.log('📋 Esto nos dice qué campos faltan:', error.response?.data?.message);
  }
},



    // eslint-disable-next-line no-unused-vars
    downloadInvoicePDF(invoice) {
      this.$emit('show-notification', 'Descarga de factura iniciada', 'info');
    },

    async markAsPaid(invoice) {
      if (!confirm('¿Marcar esta factura como pagada?')) return;
      
      try {
        
        const paymentData = {
          invoiceId: invoice.id,
          clientId: this.client.id,
          amount: invoice.totalAmount || invoice.amount,
          paymentMethod: 'cash',
          status: 'completed',
          paymentDate: new Date().toISOString()
        };
        
        await InvoiceService.markAsPaid(invoice.id, paymentData);
        
        await this.loadClientInvoices();
        await this.loadClientBilling();
        
        this.$emit('show-notification', 'Factura marcada como pagada', 'success');
        
      } catch (error) {
        console.error('❌ Error marcando factura como pagada:', error);
        this.$emit('show-notification', 'Error actualizando factura', 'error');
      }
    },

    viewInvoiceDetails(invoice) {
      this.$router.push(`/billing/invoices/${invoice.id}`);
    },

    viewAllInvoices() {
      this.$router.push(`/clients/${this.client.id}/invoices`);
    },

    // ===============================
    // MÉTODOS AUXILIARES DE FORMATO
    // ===============================
    formatSubscriptionStatus(status) {
      const statusMap = {
        'active': 'Activo',
        'suspended': 'Suspendido',
        'cancelled': 'Cancelado',
        'pending': 'Pendiente'
      };
      return statusMap[status] || status;
    },

    formatBillingStatus(status) {
      const statusMap = {
        'active': 'Activo',
        'suspended': 'Suspendido',
        'cancelled': 'Cancelado',
        'overdue': 'Vencido',
        'pending': 'Pendiente'
      };
      return statusMap[status] || status;
    },

    formatInvoiceStatus(status) {
      const statusMap = {
        'pending': 'Pendiente',
        'paid': 'Pagada',
        'overdue': 'Vencida',
        'cancelled': 'Cancelada'
      };
      return statusMap[status] || status;
    },

    formatDate(dateString) {
      if (!dateString) return null;
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },

    formatInvoicePeriod(startDate, endDate) {
      if (!startDate || !endDate) return 'Período no definido';
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return `${start.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;
    },

    calculateOverdueDays(dueDate) {
      if (!dueDate) return 0;
      
      const today = new Date();
      const due = new Date(dueDate);
      const diffTime = today - due;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : 0;
    },

    pingIP(ipAddress) {
      this.$emit('ping-test', ipAddress);
    }
  }
};
</script>



<style scoped>
/* CSS Modernizado para ServicesTab.vue */

/* CSS para Layout Vertical Sin Pestañas - ServicesTab.vue */

.servicios-tab {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ===== GRID PRINCIPAL ===== */
.servicios-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ===== TARJETAS DE SECCIÓN ===== */
.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  font-size: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.section-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.count-badge {
  background: #e2e8f0;
  color: #64748b;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.section-actions {
  display: flex;
  gap: 8px;
}

.section-content {
  padding: 24px;
}

/* ===== SUBSECCIONES ===== */
.subsection {
  margin-bottom: 32px;
}

.subsection:last-child {
  margin-bottom: 0;
}

.subsection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.subsection-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.subsection-actions {
  display: flex;
  gap: 8px;
}

/* ===== BOTONES ===== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-menu {
  background: none;
  border: none;
  color: #64748b;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-menu:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

/* ===== SERVICIOS ===== */
.services-grid {
  display: grid;
  gap: 20px;
}

.service-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.service-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
}

.service-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.service-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.service-id {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 6px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-indicator.status-active .status-dot {
  background: #22c55e;
}

.status-indicator.status-suspended {
  background: #fef3c7;
  color: #92400e;
}

.status-indicator.status-suspended .status-dot {
  background: #f59e0b;
}

.status-indicator.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.status-indicator.status-cancelled .status-dot {
  background: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ===== DETALLES DEL SERVICIO ===== */
.service-details {
  padding: 24px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
}

.detail-value.price {
  color: #059669;
  font-weight: 600;
  font-size: 16px;
}

.detail-value.ip-address {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  background: #f1f5f9;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ping-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.ping-btn:hover {
  background: #e2e8f0;
}

/* ===== ACCIONES DEL SERVICIO ===== */
.service-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.secondary {
  color: #475569;
}

.action-btn.secondary:hover {
  border-color: #3b82f6;
  background: #f8fafc;
  color: #3b82f6;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.action-btn.primary:hover {
  background: #2563eb;
}

.action-btn.danger {
  color: #ef4444;
  border-color: #fecaca;
}

.action-btn.danger:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

/* ===== MENÚ CONTEXTUAL ===== */
.service-menu-dropdown {
  position: absolute;
  top: 60px;
  right: 24px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 180px;
  overflow: hidden;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  transition: background 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: #f9fafb;
}

.menu-item.danger {
  color: #ef4444;
}

.menu-item.danger:hover {
  background: #fef2f2;
}

/* ===== DISPOSITIVOS Y MATERIALES ===== */
.devices-grid,
.materials-grid {
  display: grid;
  gap: 16px;
}

.device-card,
.material-card {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  background: white;
  transition: all 0.2s ease;
}

.device-card:hover,
.material-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.device-placeholder,
.material-icon {
  font-size: 2rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 12px;
  margin-right: 16px;
  border: 2px solid #e2e8f0;
}

.device-info,
.material-info {
  flex: 1;
}

.device-info h5,
.material-info h5 {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.device-details,
.material-details {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 13px;
}

.device-brand,
.material-brand {
  color: #64748b;
}

.device-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.device-status.online {
  background: #dcfce7;
  color: #166534;
}

.device-status.offline {
  background: #fee2e2;
  color: #991b1b;
}

.device-specs,
.material-specs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.spec-item {
  font-size: 12px;
  color: #64748b;
}

.spec-label {
  font-weight: 500;
  margin-right: 6px;
}

.spec-value.mac {
  font-family: monospace;
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
}

.device-location,
.device-notes,
.material-notes {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
}

.device-actions,
.material-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 12px;
}

.device-action-btn,
.material-action-btn {
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  text-align: center;
  min-width: 36px;
}

.device-action-btn:hover,
.material-action-btn:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.device-action-btn.access {
  background: #dcfce7;
  border-color: #16a34a;
  color: #166534;
}

.device-action-btn.unassign {
  background: #fee2e2;
  border-color: #dc2626;
  color: #991b1b;
}

/* ===== FACTURACIÓN ===== */
.billing-summary {
  margin-bottom: 24px;
}

.billing-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.status-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
}

.status-value.billing-active {
  color: #059669;
}

.status-value.billing-suspended {
  color: #dc2626;
}

.status-value.billing-overdue {
  color: #ea580c;
}

.billing-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

/* ===== FACTURAS ===== */
.invoices-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invoice-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: all 0.2s ease;
}

.invoice-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.invoice-info h5 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.invoice-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoice-period {
  font-size: 12px;
  color: #64748b;
}

.invoice-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.invoice-status.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.invoice-status.status-paid {
  background: #dcfce7;
  color: #166534;
}

.invoice-status.status-overdue {
  background: #fee2e2;
  color: #991b1b;
}

.invoice-amount .amount {
  font-size: 16px;
  font-weight: 700;
  color: #059669;
}

.invoice-details {
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
}

.detail-row.overdue {
  color: #dc2626;
  font-weight: 500;
}

.invoice-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

/* ===== ESTADOS VACÍOS ===== */
.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: #64748b;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
  filter: grayscale(20%);
}

.empty-state h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #1e293b;
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.5;
}

.empty-state-small {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  color: #64748b;
  font-size: 14px;
}

.empty-icon-small {
  font-size: 24px;
  opacity: 0.6;
}

/* ===== MODALES ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #ef4444;
}

.modal-body {
  padding: 24px;
}

/* ===== RESPONSIVO ===== */
@media (max-width: 768px) {
  .servicios-tab {
    padding: 16px;
  }
  
  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .subsection-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .detail-grid,
  .billing-status-grid {
    grid-template-columns: 1fr;
  }
  
  .device-card,
  .material-card {
    flex-direction: column;
  }
  
  .device-actions,
  .material-actions {
    flex-direction: row;
    margin-left: 0;
    margin-top: 12px;
  }
  
  .billing-actions,
  .service-actions,
  .invoice-actions {
    justify-content: center;
  }
  
  .invoice-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

/* ===== NAVEGACIÓN DE PESTAÑAS ===== */
.tab-navigation {
  display: flex;
  gap: 4px;
  margin-bottom: 28px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px 8px 0 0;
  padding: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.tab-btn:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.tab-btn.active {
  color: #3b82f6;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tab-icon {
  font-size: 16px;
}

.count-badge {
  background: #e2e8f0;
  color: #64748b;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.tab-btn.active .count-badge {
  background: #dbeafe;
  color: #3b82f6;
}

/* ===== CONTENIDO DE PESTAÑAS ===== */
.tab-content {
  min-height: 500px;
}

/* ===== TARJETAS DE SECCIÓN ===== */
.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  font-size: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.section-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.section-actions {
  display: flex;
  gap: 8px;
}

.section-content {
  padding: 24px;
}

/* ===== BOTONES ===== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.btn-menu {
  background: none;
  border: none;
  color: #64748b;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-menu:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

/* ===== SERVICIOS ===== */
.services-grid {
  display: grid;
  gap: 20px;
}

.service-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.service-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
}

.service-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.service-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.service-id {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 6px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-indicator.status-active .status-dot {
  background: #22c55e;
}

.status-indicator.status-suspended {
  background: #fef3c7;
  color: #92400e;
}

.status-indicator.status-suspended .status-dot {
  background: #f59e0b;
}

.status-indicator.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.status-indicator.status-cancelled .status-dot {
  background: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ===== DETALLES DEL SERVICIO ===== */
.service-details {
  padding: 24px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
}

.detail-value.price {
  color: #059669;
  font-weight: 600;
  font-size: 16px;
}

.detail-value.ip-address {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  background: #f1f5f9;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ping-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.ping-btn:hover {
  background: #e2e8f0;
}

/* ===== ACCIONES DEL SERVICIO ===== */
.service-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.secondary {
  color: #475569;
}

.action-btn.secondary:hover {
  border-color: #3b82f6;
  background: #f8fafc;
  color: #3b82f6;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.action-btn.primary:hover {
  background: #2563eb;
}

.action-btn.danger {
  color: #ef4444;
  border-color: #fecaca;
}

.action-btn.danger:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

/* ===== MENÚ CONTEXTUAL ===== */
.service-menu-dropdown {
  position: absolute;
  top: 60px;
  right: 24px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 180px;
  overflow: hidden;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  transition: background 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: #f9fafb;
}

.menu-item.danger {
  color: #ef4444;
}

.menu-item.danger:hover {
  background: #fef2f2;
}

/* ===== DISPOSITIVOS ===== */
.devices-grid {
  display: grid;
  gap: 16px;
}

.device-card {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  background: white;
  transition: all 0.2s ease;
}

.device-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.device-placeholder {
  font-size: 2rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 12px;
  margin-right: 16px;
  border: 2px solid #e2e8f0;
}

.device-info {
  flex: 1;
}

.device-info h5 {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.device-details {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 13px;
}

.device-brand {
  color: #64748b;
}

.device-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.device-status.online {
  background: #dcfce7;
  color: #166534;
}

.device-status.offline {
  background: #fee2e2;
  color: #991b1b;
}

.device-specs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.spec-item {
  font-size: 12px;
  color: #64748b;
}

.spec-label {
  font-weight: 500;
  margin-right: 6px;
}

.spec-value.mac {
  font-family: monospace;
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
}

.device-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 12px;
}

.device-action-btn {
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  text-align: center;
  min-width: 36px;
}

.device-action-btn:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.device-action-btn.access {
  background: #dcfce7;
  border-color: #16a34a;
  color: #166534;
}

.device-action-btn.unassign {
  background: #fee2e2;
  border-color: #dc2626;
  color: #991b1b;
}

/* ===== FACTURACIÓN ===== */
.billing-summary {
  space-y: 24px;
}

.billing-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.status-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
}

.status-value.billing-active {
  color: #059669;
}

.status-value.billing-suspended {
  color: #dc2626;
}

.status-value.billing-overdue {
  color: #ea580c;
}

.invoices-section {
  margin-top: 24px;
}

.invoices-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.invoices-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invoice-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: all 0.2s ease;
}

.invoice-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.invoice-info h5 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.invoice-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.invoice-status.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.invoice-status.status-paid {
  background: #dcfce7;
  color: #166534;
}

.invoice-status.status-overdue {
  background: #fee2e2;
  color: #991b1b;
}

.invoice-amount .amount {
  font-size: 16px;
  font-weight: 700;
  color: #059669;
}

.invoice-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

/* ===== ESTADOS VACÍOS ===== */
.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: #64748b;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
  filter: grayscale(20%);
}

.empty-state h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #1e293b;
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.5;
}

/* ===== RESPONSIVO ===== */
@media (max-width: 768px) {
  .servicios-tab {
    padding: 16px;
  }
  
  .tab-navigation {
    flex-direction: column;
    gap: 4px;
  }
  
  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .billing-status-grid {
    grid-template-columns: 1fr;
  }
  
  .device-card {
    flex-direction: column;
  }
  
  .device-actions {
    flex-direction: row;
    margin-left: 0;
    margin-top: 12px;
  }
  
  .service-actions {
    justify-content: center;
  }
  
  .invoice-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .tab-btn {
    padding: 10px 16px;
    font-size: 13px;
  }
  
  .section-header {
    padding: 16px 20px;
  }
  
  .section-content {
    padding: 20px;
  }
  
  .service-header {
    padding: 16px 20px;
  }
  
  .service-details {
    padding: 20px;
  }
}
</style>
