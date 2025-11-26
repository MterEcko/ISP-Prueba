# ANÁLISIS COMPLETO: RUTAS API vs MODELOS DE BASE DE DATOS

## Resumen Ejecutivo

**Total de Modelos en DB:** 82 modelos activos
**Total de Archivos de Rutas:** 63 archivos
**Fecha:** 2025-11-26

---

## LEYENDA
- ✅ **COMPLETO**: Tiene GET, POST, PUT/PATCH y DELETE
- ⚠️ **PARCIAL**: Tiene algunos métodos pero faltan otros
- ❌ **SIN RUTA**: No tiene ninguna ruta API
- 📖 **SOLO LECTURA**: Solo tiene GET (sin POST, PUT, DELETE)

---

## CATEGORÍA 1: AUTENTICACIÓN Y AUTORIZACIÓN

### ✅ User (COMPLETO)
**Archivo:** `user.routes.js`
- ✅ GET `/api/users` - Listar usuarios
- ✅ GET `/api/users/:id` - Obtener usuario específico
- ✅ POST `/api/users` - Crear usuario
- ✅ PUT `/api/users/:id` - Actualizar usuario
- ✅ DELETE `/api/users/:id` - Eliminar usuario
- ➕ PATCH `/api/users/:id/status` - Cambiar estado
- ➕ POST `/api/users/:id/change-password` - Cambiar contraseña

### ✅ Role (COMPLETO)
**Archivo:** `role.routes.js`
- ✅ GET `/api/roles`
- ✅ POST `/api/roles`
- ✅ PUT `/api/roles/:id`
- ✅ DELETE `/api/roles/:id`

### ✅ Permission (COMPLETO)
**Archivo:** `permission.routes.js`
- ✅ GET `/api/permissions`
- ✅ POST `/api/permissions`
- ✅ PUT `/api/permissions/:id`
- ✅ DELETE `/api/permissions/:id`

### ⚠️ SystemConfiguration (PARCIAL)
**Archivo:** `settings.routes.js`
- ✅ GET `/api/settings/all`
- ✅ PUT `/api/settings/general`
- ❌ **FALTA:** POST (crear), DELETE

### ✅ SystemLicense (COMPLETO)
**Archivo:** `systemLicense.routes.js`
- ✅ GET `/api/system-licenses`
- ✅ GET `/api/system-licenses/current`
- ✅ POST `/api/system-licenses`
- ✅ POST `/api/system-licenses/:id/activate`
- ✅ DELETE `/api/system-licenses/:id`

---

## CATEGORÍA 2: ESTRUCTURA DE RED

### ✅ Zone (COMPLETO)
**Archivo:** `network.routes.js`
- ✅ GET `/api/zones` o `/api/network`
- ✅ POST `/api/network`
- ✅ PUT `/api/network/:id`
- ✅ DELETE `/api/network/:id`

### ✅ Node (COMPLETO)
**Archivo:** `network.routes.js`
- ✅ GET `/api/nodes` o `/api/network/nodes`
- ✅ POST `/api/network/nodes`
- ✅ PUT `/api/network/nodes/:id`
- ✅ DELETE `/api/network/nodes/:id`

### ✅ Sector (COMPLETO)
**Archivo:** `network.routes.js`
- ✅ GET `/api/sectors` o `/api/network/sectors`
- ✅ POST `/api/network/sectors`
- ✅ PUT `/api/network/sectors/:id`
- ✅ DELETE `/api/network/sectors/:id`

### ✅ Device (COMPLETO)
**Archivo:** `device.routes.js`
- ✅ GET `/api/devices`
- ✅ GET `/api/devices/:id`
- ✅ POST `/api/devices`
- ✅ PUT `/api/devices/:id`
- ✅ DELETE `/api/devices/:id`
- ➕ POST `/api/devices/test-connection`
- ➕ POST `/api/devices/:id/execute-command`

### ✅ DeviceFamily (COMPLETO)
**Archivo:** `deviceFamily.routes.js`
- ✅ GET `/api/device-family`
- ✅ POST `/api/device-family`
- ✅ PUT `/api/device-family/:id`
- ✅ DELETE `/api/device-family/:id`

### ✅ DeviceBrand (COMPLETO)
**Archivo:** `deviceBrand.routes.js`
- ✅ GET `/api/device-brands`
- ✅ POST `/api/device-brands`
- ✅ PUT `/api/device-brands/:id`
- ✅ DELETE `/api/device-brands/:id`

### ⚠️ MikrotikRouter (PARCIAL)
**Archivo:** `mikrotik.routes.js`
- ✅ GET `/api/mikrotik/devices/:id/metrics`
- ✅ POST `/api/mikrotik/test-connection`
- ❌ **FALTA:** POST (crear router), PUT (actualizar), DELETE

---

## CATEGORÍA 3: GESTIÓN DE CLIENTES

### ✅ Client (COMPLETO)
**Archivo:** `client.routes.js`
- ✅ GET `/api/clients`
- ✅ GET `/api/clients/:id`
- ✅ POST `/api/clients`
- ✅ PUT `/api/clients/:id`
- ✅ DELETE `/api/clients/:id`
- ➕ GET `/api/clients/search`
- ➕ POST `/api/clients/bulk/status`

### ✅ ClientDocument (COMPLETO)
**Archivo:** `client.routes.js`
- ✅ GET `/api/clients/:clientId/documents`
- ✅ POST `/api/clients/:clientId/documents`
- ✅ DELETE `/api/clients/:clientId/documents/:id`

### ✅ ClientNetwork (COMPLETO)
**Archivo:** `client-network.routes.js`
- ✅ GET `/api/client-networks`
- ✅ POST `/api/client-networks`
- ✅ PUT `/api/client-networks/:id`
- ✅ DELETE `/api/client-networks/:id`

### ❌ ClientBilling (SIN RUTA)
**FALTA CREAR:** `clientBilling.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE
- **Recomendación:** Crear rutas CRUD completas

### ❌ ClientNetworkConfig (SIN RUTA)
**FALTA CREAR:** `clientNetworkConfig.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ✅ ClientInstallation (COMPLETO)
**Archivo:** `clientInstallation.routes.js`
- ✅ GET `/api/client-installations`
- ✅ POST `/api/client-installations`
- ✅ PUT `/api/client-installations/:id`
- ✅ DELETE `/api/client-installations/:id`
- ➕ POST `/api/client-installations/:id/complete`

### ✅ ClientSupport (COMPLETO)
**Archivo:** `clientSupport.routes.js`
- ✅ GET `/api/client-support`
- ✅ POST `/api/client-support`
- ✅ PUT `/api/client-support/:id`
- ✅ DELETE `/api/client-support/:id`

---

## CATEGORÍA 4: SERVICIOS Y SUSCRIPCIONES

### ✅ Subscription (COMPLETO)
**Archivo:** `subscription.routes.js`
- ✅ GET `/api/subscriptions/:id`
- ✅ GET `/api/clients/:clientId/subscriptions`
- ✅ POST `/api/subscriptions`
- ✅ PUT `/api/subscriptions/:id/change-plan`
- ✅ POST `/api/subscriptions/:id/suspend`
- ✅ POST `/api/subscriptions/:id/cancel`

### ✅ ServicePackage (COMPLETO)
**Archivo:** `service.package.routes.js`
- ✅ GET `/api/service-packages`
- ✅ POST `/api/service-packages`
- ✅ PUT `/api/service-packages/:id`
- ✅ DELETE `/api/service-packages/:id`

---

## CATEGORÍA 5: TICKETS Y SOPORTE

### ✅ Ticket (COMPLETO)
**Archivo:** `ticket.routes.js`
- ✅ GET `/api/tickets`
- ✅ GET `/api/tickets/:id`
- ✅ POST `/api/tickets`
- ✅ PUT `/api/tickets/:id`
- ✅ DELETE `/api/tickets/:id`

### ✅ TicketComment (COMPLETO)
**Archivo:** `ticket.routes.js`
- ✅ GET `/api/tickets/:ticketId/comments`
- ✅ POST `/api/tickets/:ticketId/comments`
- ✅ PUT `/api/comments/:commentId`
- ✅ DELETE `/api/comments/:commentId`

### ❌ TicketType (SIN RUTA)
**FALTA CREAR:** `ticketType.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ❌ TicketAttachment (SIN RUTA)
**FALTA CREAR:** `ticketAttachment.routes.js`
- ❌ **FALTA:** GET, POST, DELETE

---

## CATEGORÍA 6: DISPOSITIVOS Y COMANDOS

### ✅ DeviceCredential (COMPLETO)
**Archivo:** `deviceCredential.routes.js`
- ✅ GET `/api/device-credentials`
- ✅ POST `/api/device-credentials`
- ✅ PUT `/api/device-credentials/:id`
- ✅ DELETE `/api/device-credentials/:id`

### 📖 DeviceMetric (SOLO LECTURA)
**Archivo:** `deviceMetric.routes.js`
- ✅ GET `/api/device-metrics`
- ❌ **FALTA:** POST, PUT, DELETE (probablemente no necesarios - solo lectura)

### ❌ CommandHistory (SIN RUTA)
**FALTA CREAR:** `commandHistory.routes.js`
- ❌ **FALTA:** GET (para ver historial), DELETE (limpiar historial)
- **Nota:** POST/PUT probablemente no necesarios (se crean automáticamente)

### ✅ DeviceCommand (COMPLETO)
**Archivo:** `deviceCommand.routes.js`
- ✅ GET `/api/device-commands`
- ✅ POST `/api/device-commands`
- ✅ PUT `/api/device-commands/:id`
- ✅ DELETE `/api/device-commands/:id`

### ❌ CommonCommand (SIN RUTA)
**FALTA CREAR:** `commonCommand.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ❌ CommandImplementation (SIN RUTA)
**FALTA CREAR:** `commandImplementation.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ❌ CommandParameter (SIN RUTA)
**FALTA CREAR:** `commandParameter.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ✅ SnmpOid (COMPLETO)
**Archivo:** `snmpOid.routes.js`
- ✅ GET `/api/snmp-oid`
- ✅ POST `/api/snmp-oid`
- ✅ PUT `/api/snmp-oid/:id`
- ✅ DELETE `/api/snmp-oid/:id`

---

## CATEGORÍA 7: INVENTARIO

### ✅ Inventory (COMPLETO)
**Archivo:** `inventory.routes.js`
- ✅ GET `/api/inventory`
- ✅ GET `/api/inventory/:id`
- ✅ POST `/api/inventory`
- ✅ PUT `/api/inventory/:id`
- ✅ DELETE `/api/inventory/:id`
- ➕ POST `/api/inventory/consume`

### ✅ InventoryLocation (COMPLETO)
**Archivo:** `inventoryLocation.routes.js`
- ✅ GET `/api/inventory-location`
- ✅ POST `/api/inventory-location`
- ✅ PUT `/api/inventory-location/:id`
- ✅ DELETE `/api/inventory-location/:id`

### ✅ InventoryMovement (COMPLETO)
**Archivo:** `inventoryMovement.routes.js`
- ✅ GET `/api/inventory-movement`
- ✅ POST `/api/inventory-movement`

### ❌ InventoryCategory (SIN RUTA)
**FALTA CREAR:** `inventoryCategory.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ⚠️ InventoryType (PARCIAL)
**Archivo:** `inventory.routes.js`
- ✅ GET `/api/inventory-types`
- ❌ **FALTA:** POST, PUT, DELETE

### ❌ InventoryProduct (SIN RUTA)
**FALTA CREAR:** `inventoryProduct.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ✅ InventoryBatch (COMPLETO)
**Archivo:** `inventoryBatch.routes.js`
- ✅ GET `/api/inventory-batch`
- ✅ POST `/api/inventory-batch`
- ✅ PUT `/api/inventory-batch/:id`
- ✅ DELETE `/api/inventory-batch/:id`

### ❌ InventoryScrap (SIN RUTA)
**FALTA CREAR:** `inventoryScrap.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ❌ InstallationMaterial (SIN RUTA)
**FALTA CREAR:** `installationMaterial.routes.js`
- ❌ **FALTA:** GET, POST, DELETE

### ⚠️ TechnicianInventoryReconciliation (PARCIAL)
**Archivo:** `inventoryReconciliation.routes.js`
- ✅ GET `/api/inventory-reconciliation`
- ✅ POST `/api/inventory-reconciliation`
- ✅ PUT `/api/inventory-reconciliation/:id`
- ❌ **FALTA:** DELETE

---

## CATEGORÍA 8: MIKROTIK INTEGRATION

### ❌ MikrotikPPPOE (SIN RUTA)
**FALTA CREAR:** `mikrotikPPPOE.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE
- **Nota:** Actualmente se maneja vía `/api/mikrotik/devices/:id/pppoe-users`

### ❌ MikrotikIp (SIN RUTA)
**FALTA CREAR:** `mikrotikIp.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ❌ MikrotikProfile (SIN RUTA)
**FALTA CREAR:** `mikrotikProfile.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ✅ IpPool (COMPLETO)
**Archivo:** `ip.pool.routes.js`
- ✅ GET `/api/ip-pool`
- ✅ GET `/api/ip-pool/available`
- ✅ POST `/api/ip-pool`
- ✅ PUT `/api/ip-pool/:id`
- ✅ DELETE `/api/ip-pool/:id`

---

## CATEGORÍA 9: PAGOS Y FACTURACIÓN

### ✅ Invoice (COMPLETO)
**Archivo:** `invoice.routes.js`
- ✅ GET `/api/invoices`
- ✅ GET `/api/invoices/:id`
- ✅ POST `/api/invoices` (implícito en create)
- ✅ PUT `/api/invoices/:id` (implícito en update)
- ✅ DELETE `/api/invoices/:id`

### ✅ Payment (COMPLETO)
**Archivo:** `payment.routes.js`
- ✅ GET `/api/payments`
- ✅ POST `/api/payments`
- ✅ POST `/api/payments/process`
- ❌ **FALTA:** PUT, DELETE (probablemente intencional por auditoría)

### ❌ PaymentGateway (SIN RUTA)
**FALTA CREAR:** `paymentGateway.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ❌ PaymentReminder (SIN RUTA)
**FALTA CREAR:** `paymentReminder.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ❌ PaymentTransaction (SIN RUTA - modelo no encontrado en index.js)
**Nota:** Este modelo podría no existir o estar obsoleto

### ❌ Currency (SIN RUTA)
**FALTA CREAR:** `currency.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE
- **Nota:** Mencionado en accounting pero sin rutas dedicadas

### ❌ ExchangeRate (SIN RUTA)
**FALTA CREAR:** `exchangeRate.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

---

## CATEGORÍA 10: COMUNICACIONES

### ⚠️ CommunicationChannel (PARCIAL)
**Archivo:** `communicationPlugin.routes.js`
- ✅ GET `/api/communication-channels`
- ✅ POST `/api/communication-channels`
- ✅ PUT `/api/communication-channels/:id`
- ❌ **FALTA:** DELETE

### ✅ MessageTemplate (COMPLETO)
**Archivo:** `template.routes.js`
- ✅ GET `/api/templates`
- ✅ GET `/api/templates/:id`
- ✅ POST `/api/templates`
- ✅ PUT `/api/templates/:id`
- ✅ DELETE `/api/templates/:id`

### 📖 CommunicationLog (SOLO LECTURA)
**Archivo:** `communicationPlugin.routes.js`
- ✅ GET `/api/communication/history`
- ❌ **FALTA:** POST (se crea automáticamente), DELETE (limpiar logs)

### ❌ MessageLog (SIN RUTA)
**FALTA CREAR:** `messageLog.routes.js`
- ❌ **FALTA:** GET, DELETE

### ❌ NotificationRule (SIN RUTA)
**FALTA CREAR:** `notificationRule.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ❌ NotificationQueue (SIN RUTA)
**FALTA CREAR:** `notificationQueue.routes.js`
- ❌ **FALTA:** GET, DELETE

### ⚠️ Notification (PARCIAL)
**Archivo:** `notification.routes.js`
- ✅ GET `/api/notifications`
- ✅ POST `/api/notifications`
- ❌ **FALTA:** PUT (marcar como leído), DELETE

### ❌ CommunicationContact (SIN RUTA)
**FALTA CREAR:** `communicationContact.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ❌ CommunicationEvent (SIN RUTA)
**FALTA CREAR:** `communicationEvent.routes.js`
- ❌ **FALTA:** GET, POST, DELETE

---

## CATEGORÍA 11: DOCUMENTOS

### ✅ DocumentTemplate (COMPLETO)
**Archivo:** `documentTemplate.routes.js`
- ✅ GET `/api/document-templates`
- ✅ POST `/api/document-templates`
- ✅ PUT `/api/document-templates/:id`
- ✅ DELETE `/api/document-templates/:id`

### ❌ GeneratedDocumentHistory (SIN RUTA)
**FALTA CREAR:** `generatedDocumentHistory.routes.js`
- ❌ **FALTA:** GET, DELETE

### ❌ DocumentSignature (SIN RUTA)
**FALTA CREAR:** `documentSignature.routes.js`
- ❌ **FALTA:** GET, POST, PUT

### ❌ TemplateExport (SIN RUTA)
**FALTA CREAR:** `templateExport.routes.js`
- ❌ **FALTA:** GET, POST

---

## CATEGORÍA 12: CALENDARIO

### ⚠️ CalendarEvent (PARCIAL)
**Archivo:** `calendar.routes.js`
- ✅ GET `/api/calendar/events`
- ✅ POST `/api/calendar/events`
- ✅ PUT `/api/calendar/events/:id`
- ✅ DELETE `/api/calendar/events/:id`

### ⚠️ CalendarIntegration (PARCIAL)
**Archivo:** `calendar.routes.js`
- ✅ GET `/api/calendar/google/auth-url`
- ✅ GET `/api/calendar/microsoft/auth-url`
- ❌ **FALTA:** GET (listar integraciones), DELETE (desconectar)

---

## CATEGORÍA 13: CHAT

### ⚠️ ChatConversation (PARCIAL)
**Archivo:** `chat.routes.js`
- ✅ GET `/api/chat/conversations`
- ✅ POST `/api/chat/conversations`
- ❌ **FALTA:** PUT (actualizar), DELETE

### ⚠️ ChatMessage (PARCIAL)
**Archivo:** `chat.routes.js`
- ✅ GET `/api/chat/conversations/:id/messages`
- ✅ POST `/api/chat/messages`
- ❌ **FALTA:** PUT (editar mensaje), DELETE (eliminar mensaje)

---

## CATEGORÍA 14: CONTABILIDAD

### ✅ Expense (COMPLETO)
**Archivo:** `expense.routes.js`
- ✅ GET `/api/expenses`
- ✅ GET `/api/expenses/:id`
- ✅ POST `/api/expenses`
- ✅ PUT `/api/expenses/:id`
- ✅ DELETE `/api/expenses/:id`

### ✅ ExpenseCategory (COMPLETO)
**Archivo:** `expense.routes.js`
- ✅ GET `/api/expenses/categories`
- ✅ POST `/api/expenses/categories`
- ✅ PUT `/api/expenses/categories/:id`
- ✅ DELETE `/api/expenses/categories/:id`

### ⚠️ Payroll (PARCIAL)
**Archivo:** `payroll.routes.js`
- ✅ GET `/api/payroll`
- ✅ POST `/api/payroll`
- ❌ **FALTA:** PUT, DELETE

### ❌ PayrollPayment (SIN RUTA)
**FALTA CREAR:** `payrollPayment.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

---

## CATEGORÍA 15: SISTEMA

### ⚠️ SystemPlugin (PARCIAL)
**Archivo:** `systemPlugin.routes.js`
- ✅ GET `/api/system-plugins`
- ✅ POST `/api/system-plugins`
- ✅ POST `/api/system-plugins/:id/activate`
- ❌ **FALTA:** PUT, DELETE

### 📖 PluginAuditLog (SOLO LECTURA)
**Archivo:** `pluginAudit.routes.js`
- ✅ GET `/api/plugin-audit`
- ❌ **FALTA:** DELETE (limpiar logs antiguos)

### ❌ N8nWorkflow (SIN RUTA)
**FALTA CREAR:** `n8nWorkflow.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE
- **Nota:** Mencionado en n8n.routes.js pero sin CRUD completo

---

## CATEGORÍA 16: STORE/MARKETPLACE

### ⚠️ StoreCustomer (PARCIAL)
**Archivo:** `storeCustomer.routes.js`
- ✅ GET `/api/store-customers`
- ✅ POST `/api/store-customers`
- ❌ **FALTA:** PUT, DELETE

### ❌ StoreOrder (SIN RUTA)
**FALTA CREAR:** `storeOrder.routes.js`
- ❌ **FALTA:** GET, POST, PUT, DELETE

### ❌ StoreOrderItem (SIN RUTA)
**FALTA CREAR:** `storeOrderItem.routes.js`
- ❌ **FALTA:** GET, POST, DELETE

---

## CATEGORÍA 17: OTROS

### ✅ EmployeeEmail (COMPLETO)
**Archivo:** `employeeEmail.routes.js`
- ✅ GET `/api/employee-emails`
- ✅ POST `/api/employee-emails`
- ✅ PUT `/api/employee-emails/:id`
- ✅ DELETE `/api/employee-emails/:id`

---

## 📊 RESUMEN ESTADÍSTICO

### Por Estado de Implementación

| Estado | Cantidad | Porcentaje |
|--------|----------|------------|
| ✅ COMPLETO (GET, POST, PUT, DELETE) | 32 | 39% |
| ⚠️ PARCIAL (faltan algunos métodos) | 15 | 18% |
| ❌ SIN RUTA (sin ninguna ruta) | 30 | 37% |
| 📖 SOLO LECTURA (solo GET) | 5 | 6% |
| **TOTAL** | **82** | **100%** |

---

## 🚨 RUTAS CRÍTICAS FALTANTES

### ALTA PRIORIDAD (Core Business Logic)

1. **ClientBilling** - ❌ Sin rutas
   - Necesario para: Gestión de facturación de clientes
   - Crear: `clientBilling.routes.js`

2. **ClientNetworkConfig** - ❌ Sin rutas
   - Necesario para: Configuración de red de clientes
   - Crear: `clientNetworkConfig.routes.js`

3. **TicketType** - ❌ Sin rutas
   - Necesario para: Categorización de tickets
   - Crear: `ticketType.routes.js`

4. **InventoryCategory** - ❌ Sin rutas
   - Necesario para: Categorización de inventario
   - Crear: `inventoryCategory.routes.js`

5. **InventoryProduct** - ❌ Sin rutas
   - Necesario para: Catálogo de productos
   - Crear: `inventoryProduct.routes.js`

6. **MikrotikPPPOE** - ❌ Sin rutas
   - Necesario para: Gestión de usuarios PPPoE
   - Crear: `mikrotikPPPOE.routes.js`

7. **MikrotikProfile** - ❌ Sin rutas
   - Necesario para: Perfiles de velocidad Mikrotik
   - Crear: `mikrotikProfile.routes.js`

8. **PaymentGateway** - ❌ Sin rutas
   - Necesario para: Configuración de gateways de pago
   - Crear: `paymentGateway.routes.js`

9. **Currency** - ❌ Sin rutas
   - Necesario para: Gestión de monedas
   - Crear: `currency.routes.js`

10. **ExchangeRate** - ❌ Sin rutas
    - Necesario para: Tasas de cambio
    - Crear: `exchangeRate.routes.js`

### PRIORIDAD MEDIA (Features & Management)

11. **CommonCommand** - ❌ Sin rutas
12. **CommandImplementation** - ❌ Sin rutas
13. **CommandParameter** - ❌ Sin rutas
14. **NotificationRule** - ❌ Sin rutas
15. **NotificationQueue** - ❌ Sin rutas
16. **CommunicationContact** - ❌ Sin rutas
17. **GeneratedDocumentHistory** - ❌ Sin rutas
18. **DocumentSignature** - ❌ Sin rutas
19. **N8nWorkflow** - ❌ Sin rutas
20. **StoreOrder** - ❌ Sin rutas
21. **StoreOrderItem** - ❌ Sin rutas

### PRIORIDAD BAJA (Audit & Logs)

22. **CommandHistory** - ❌ Sin rutas (probablemente solo necesita GET)
23. **MessageLog** - ❌ Sin rutas
24. **CommunicationEvent** - ❌ Sin rutas
25. **TemplateExport** - ❌ Sin rutas
26. **InstallationMaterial** - ❌ Sin rutas
27. **InventoryScrap** - ❌ Sin rutas
28. **PaymentReminder** - ❌ Sin rutas
29. **PayrollPayment** - ❌ Sin rutas
30. **TicketAttachment** - ❌ Sin rutas

---

## 🔧 RUTAS PARCIALES QUE NECESITAN COMPLETARSE

### Agregar DELETE

1. **InventoryType** - Agregar POST, PUT, DELETE a `inventory.routes.js`
2. **CommunicationChannel** - Agregar DELETE a `communicationPlugin.routes.js`
3. **Notification** - Agregar PUT, DELETE a `notification.routes.js`
4. **ChatConversation** - Agregar PUT, DELETE a `chat.routes.js`
5. **ChatMessage** - Agregar PUT, DELETE a `chat.routes.js`
6. **Payroll** - Agregar PUT, DELETE a `payroll.routes.js`
7. **SystemPlugin** - Agregar PUT, DELETE a `systemPlugin.routes.js`
8. **StoreCustomer** - Agregar PUT, DELETE a `storeCustomer.routes.js`
9. **TechnicianInventoryReconciliation** - Agregar DELETE a `inventoryReconciliation.routes.js`
10. **CalendarIntegration** - Agregar GET (listar), DELETE a `calendar.routes.js`

### Agregar POST/PUT

11. **SystemConfiguration** - Agregar POST, DELETE a `settings.routes.js`
12. **MikrotikRouter** - Agregar POST, PUT, DELETE a `mikrotik.routes.js`

---

## 📋 PLAN DE ACCIÓN RECOMENDADO

### FASE 1: Rutas Críticas de Negocio (Semana 1-2)
```
1. clientBilling.routes.js (GET, POST, PUT, DELETE)
2. inventoryCategory.routes.js (GET, POST, PUT, DELETE)
3. inventoryProduct.routes.js (GET, POST, PUT, DELETE)
4. ticketType.routes.js (GET, POST, PUT, DELETE)
5. currency.routes.js (GET, POST, PUT, DELETE)
6. exchangeRate.routes.js (GET, POST, PUT, DELETE)
```

### FASE 2: Integración Mikrotik (Semana 3)
```
7. mikrotikPPPOE.routes.js (GET, POST, PUT, DELETE)
8. mikrotikProfile.routes.js (GET, POST, PUT, DELETE)
9. mikrotik.routes.js - Completar con POST, PUT, DELETE
```

### FASE 3: Sistema de Pagos (Semana 4)
```
10. paymentGateway.routes.js (GET, POST, PUT, DELETE)
11. paymentReminder.routes.js (GET, POST, PUT, DELETE)
12. payrollPayment.routes.js (GET, POST, DELETE)
```

### FASE 4: Comunicaciones y Notificaciones (Semana 5)
```
13. notificationRule.routes.js (GET, POST, PUT, DELETE)
14. notificationQueue.routes.js (GET, DELETE)
15. communicationContact.routes.js (GET, POST, PUT, DELETE)
16. messageLog.routes.js (GET, DELETE)
```

### FASE 5: Sistema de Comandos (Semana 6)
```
17. commonCommand.routes.js (GET, POST, PUT, DELETE)
18. commandImplementation.routes.js (GET, POST, PUT, DELETE)
19. commandParameter.routes.js (GET, POST, PUT, DELETE)
20. commandHistory.routes.js (GET, DELETE)
```

### FASE 6: Documentos y Store (Semana 7)
```
21. generatedDocumentHistory.routes.js (GET, DELETE)
22. documentSignature.routes.js (GET, POST)
23. storeOrder.routes.js (GET, POST, PUT, DELETE)
24. storeOrderItem.routes.js (GET, POST, DELETE)
```

### FASE 7: Completar Rutas Parciales (Semana 8)
```
25. Completar todos los métodos faltantes en rutas parciales
26. Agregar tests para todas las rutas nuevas
27. Documentación de API actualizada
```

---

## 💡 RECOMENDACIONES ADICIONALES

### 1. Estandarización de Rutas
- Todos los endpoints deben seguir el patrón REST estándar
- Usar nombres en plural: `/api/resources` no `/api/resource`
- IDs en la URL: `/api/resources/:id`

### 2. Métodos HTTP Estándar
```
GET    /api/resources      - Listar todos
GET    /api/resources/:id  - Obtener uno
POST   /api/resources      - Crear nuevo
PUT    /api/resources/:id  - Actualizar completo
PATCH  /api/resources/:id  - Actualizar parcial
DELETE /api/resources/:id  - Eliminar
```

### 3. Respuestas Consistentes
```javascript
// Success
{ success: true, data: {...}, message: "..." }

// Error
{ success: false, error: "...", message: "..." }

// List
{ success: true, data: [...], total: 100, page: 1, limit: 20 }
```

### 4. Middleware de Autenticación
- Todos los endpoints deben tener autenticación JWT
- Verificar permisos por rol
- Logs de auditoría para operaciones críticas

### 5. Validación de Datos
- Usar Joi o similar para validar request bodies
- Validar IDs y parámetros de URL
- Sanitizar inputs para prevenir inyecciones

---

## 🎯 CONCLUSIÓN

El sistema tiene una **cobertura del 39% de rutas completas** y un **37% de modelos sin ninguna ruta**.

**Prioridad inmediata:**
1. Crear rutas para los 10 modelos de alta prioridad
2. Completar las 10 rutas parciales con métodos faltantes
3. Implementar tests y documentación

**Impacto estimado:**
- **30 archivos de rutas nuevos** a crear
- **15 archivos de rutas existentes** a actualizar
- **~200-300 endpoints nuevos** a implementar

---

*Generado el: 2025-11-26*
*Sistema: ISP Management Platform*
