# 📚 Documentación Completa de Rutas API - Sistema ISP

**Fecha de actualización:** $(date +"%Y-%m-%d")
**Total de archivos de rutas:** 80
**Base URL:** `http://localhost:3000/api`

---

## 📑 Tabla de Contenidos

1. [Autenticación y Usuarios](#1-autenticación-y-usuarios)
2. [Clientes](#2-clientes)
3. [Servicios y Suscripciones](#3-servicios-y-suscripciones)
4. [Dispositivos y Red](#4-dispositivos-y-red)
5. [Mikrotik](#5-mikrotik)
6. [Tickets y Soporte](#6-tickets-y-soporte)
7. [Inventario](#7-inventario)
8. [Facturación y Pagos](#8-facturación-y-pagos)
9. [Contabilidad y Nómina](#9-contabilidad-y-nómina)
10. [Comunicaciones](#10-comunicaciones)
11. [Documentos y Plantillas](#11-documentos-y-plantillas)
12. [Notificaciones](#12-notificaciones)
13. [Chat](#13-chat)
14. [Calendario](#14-calendario)
15. [Sistema y Configuración](#15-sistema-y-configuración)
16. [Comandos de Dispositivos](#16-comandos-de-dispositivos)
17. [Reportes y Métricas](#17-reportes-y-métricas)
18. [Integraciones](#18-integraciones)

---

## 1. Autenticación y Usuarios

### 🔐 **auth.routes.js** - Autenticación

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| POST | `/auth/signup` | Registrar nuevo usuario | `username`, `email`, `password`, `fullName`, `roleId` |
| POST | `/auth/signin` | Iniciar sesión | `username`, `password` |
| POST | `/auth/signout` | Cerrar sesión | - |
| POST | `/auth/refresh` | Refrescar token | `refreshToken` |
| POST | `/auth/forgot-password` | Solicitar recuperación de contraseña | `email` |
| POST | `/auth/reset-password` | Restablecer contraseña | `token`, `newPassword` |

### 👥 **user.routes.js** - Usuarios

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/users` | Listar usuarios | `page`, `limit`, `roleId`, `active` |
| GET | `/users/:id` | Obtener usuario por ID | - |
| POST | `/users` | Crear usuario | `username`, `email`, `password`, `fullName`, `roleId`, `phone` |
| PUT | `/users/:id` | Actualizar usuario | `fullName`, `email`, `phone`, `roleId`, `active` |
| DELETE | `/users/:id` | Eliminar usuario | - |
| PUT | `/users/:id/password` | Cambiar contraseña | `currentPassword`, `newPassword` |
| GET | `/users/:id/permissions` | Obtener permisos del usuario | - |

### 🔑 **role.routes.js** - Roles

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/roles` | Listar roles | - |
| GET | `/roles/:id` | Obtener rol por ID | - |
| POST | `/roles` | Crear rol | `name`, `description`, `level`, `category` |
| PUT | `/roles/:id` | Actualizar rol | `name`, `description`, `level`, `category` |
| DELETE | `/roles/:id` | Eliminar rol | - |

### 🛡️ **permission.routes.js** - Permisos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/permissions` | Listar permisos | `module` |
| GET | `/permissions/:id` | Obtener permiso por ID | - |
| POST | `/permissions` | Crear permiso | `name`, `description`, `module` |
| PUT | `/permissions/:id` | Actualizar permiso | `name`, `description`, `module` |
| DELETE | `/permissions/:id` | Eliminar permiso | - |
| POST | `/roles/:roleId/permissions` | Asignar permisos a rol | `permissionIds[]` |

---

## 2. Clientes

### 👤 **client.routes.js** - Clientes

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/clients` | Listar clientes | `page`, `limit`, `status`, `search` |
| GET | `/clients/:id` | Obtener cliente por ID | - |
| POST | `/clients` | Crear cliente | `firstName`, `lastName`, `email`, `phone`, `address`, `dni`, `zoneId` |
| PUT | `/clients/:id` | Actualizar cliente | `firstName`, `lastName`, `email`, `phone`, `address`, `status` |
| DELETE | `/clients/:id` | Eliminar cliente | - |
| GET | `/clients/search` | Buscar clientes | `q` (query) |
| POST | `/clients/bulk/status` | Actualizar estado masivo | `clientIds[]`, `status` |
| GET | `/clients/:clientId/documents` | Documentos del cliente | - |
| POST | `/clients/:clientId/documents` | Subir documento | `file`, `documentType`, `description` |
| DELETE | `/clients/:clientId/documents/:id` | Eliminar documento | - |

### 📡 **client-network.routes.js** - Redes de Cliente

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/client-networks` | Listar redes de clientes | `zoneId`, `status` |
| GET | `/client-networks/:id` | Obtener red por ID | - |
| POST | `/client-networks` | Crear red de cliente | `clientId`, `name`, `ipAddress`, `gateway`, `dns` |
| PUT | `/client-networks/:id` | Actualizar red | `name`, `ipAddress`, `gateway`, `dns`, `status` |
| DELETE | `/client-networks/:id` | Eliminar red | - |

### 🔧 **clientNetworkConfig.routes.js** - Configuración de Red del Cliente ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/client-network-configs` | Listar configuraciones | `page`, `limit`, `clientId`, `protocol` |
| GET | `/client-network-configs/:id` | Obtener configuración por ID | - |
| GET | `/clients/:clientId/network-config` | Config por cliente | - |
| POST | `/client-network-configs` | Crear configuración | `clientId`, `mikrotikRouterId`, `pppoeUsername`, `pppoePasswordEncrypted`, `staticIp`, `macAddress`, `gateway`, `dnsPrimary`, `dnsSecondary`, `protocol` |
| PUT | `/client-network-configs/:id` | Actualizar configuración | `mikrotikRouterId`, `pppoeUsername`, `staticIp`, `protocol` |
| DELETE | `/client-network-configs/:id` | Eliminar configuración | - |
| POST | `/client-network-configs/:id/sync` | Sincronizar con Mikrotik | - |

### 💰 **client.billing.routes.js** - Facturación de Cliente

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/clients/:clientId/billing` | Historial de facturación | `startDate`, `endDate`, `status` |
| GET | `/clients/:clientId/billing/summary` | Resumen de facturación | - |
| POST | `/clients/:clientId/billing` | Crear cargo | `amount`, `description`, `dueDate`, `serviceId` |
| PUT | `/clients/:clientId/billing/:id` | Actualizar cargo | `amount`, `description`, `dueDate`, `status` |
| DELETE | `/clients/:clientId/billing/:id` | Eliminar cargo | - |

### 🔌 **client.mikrotik.routes.js** - Mikrotik de Cliente

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/clients/:clientId/mikrotik` | Datos Mikrotik del cliente | - |
| POST | `/clients/:clientId/mikrotik/activate` | Activar servicio | `packageId`, `routerId` |
| POST | `/clients/:clientId/mikrotik/suspend` | Suspender servicio | `reason` |
| POST | `/clients/:clientId/mikrotik/resume` | Reanudar servicio | - |
| GET | `/clients/:clientId/mikrotik/stats` | Estadísticas de uso | `startDate`, `endDate` |

### 🛠️ **clientInstallation.routes.js** - Instalaciones

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/client-installations` | Listar instalaciones | `status`, `technicianId`, `startDate`, `endDate` |
| GET | `/client-installations/:id` | Obtener instalación por ID | - |
| POST | `/client-installations` | Crear instalación | `clientId`, `scheduledDate`, `technicianId`, `notes`, `materials` |
| PUT | `/client-installations/:id` | Actualizar instalación | `scheduledDate`, `status`, `notes`, `completedAt` |
| DELETE | `/client-installations/:id` | Eliminar instalación | - |
| POST | `/client-installations/:id/complete` | Completar instalación | `completedAt`, `notes`, `photos` |

### 🎧 **clientSupport.routes.js** - Soporte de Cliente

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/client-support` | Listar casos de soporte | `clientId`, `status`, `priority` |
| GET | `/client-support/:id` | Obtener caso por ID | - |
| POST | `/client-support` | Crear caso de soporte | `clientId`, `subject`, `description`, `priority` |
| PUT | `/client-support/:id` | Actualizar caso | `status`, `priority`, `assignedTo`, `resolution` |
| DELETE | `/client-support/:id` | Eliminar caso | - |

### 🌐 **clientPortal.routes.js** - Portal del Cliente

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/client-portal/dashboard` | Dashboard del cliente | - |
| GET | `/client-portal/invoices` | Facturas del cliente | `status`, `year` |
| GET | `/client-portal/services` | Servicios activos | - |
| POST | `/client-portal/support-ticket` | Crear ticket de soporte | `subject`, `description`, `priority` |
| GET | `/client-portal/usage` | Estadísticas de uso | `period` |

---

## 3. Servicios y Suscripciones

### 📦 **service.package.routes.js** - Paquetes de Servicio

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/service-packages` | Listar paquetes | - |
| GET | `/service-packages/statistics` | Estadísticas de paquetes | - |
| GET | `/service-packages/:id` | Obtener paquete por ID | - |
| POST | `/service-packages` | Crear paquete | **`name`**, **`description`**, **`price`**, **`downloadSpeedMbps`**, **`uploadSpeedMbps`**, **`zoneId`**, `dataLimitGb`, `billingCycle`, `active`, `profileConfigurations[]` |
| PUT | `/service-packages/:id` | Actualizar paquete | `name`, `description`, `price`, `downloadSpeedMbps`, `uploadSpeedMbps`, `active` |
| DELETE | `/service-packages/:id` | Eliminar paquete | - |
| GET | `/service-packages/:id/profiles` | Perfiles Mikrotik del paquete | - |
| POST | `/service-packages/:id/profiles` | Crear perfiles en routers | `routerIds[]` |
| POST | `/service-packages/:id/sync` | Sincronizar con routers | - |
| GET | `/service-packages/:id/clients` | Clientes del paquete | - |
| PUT | `/service-packages/:id/profiles/:routerId` | Actualizar perfil específico | `rateLimit`, `burstLimit` |
| DELETE | `/service-packages/:id/profiles/:routerId` | Eliminar perfil específico | - |
| POST | `/service-packages/subscriptions` | Crear suscripción completa | `clientId`, `packageId`, `routerId`, `poolId` |
| GET | `/service-packages/zones/:zoneId/routers` | Routers disponibles por zona | - |

### 📋 **subscription.routes.js** - Suscripciones

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/subscriptions/:id` | Obtener suscripción | - |
| GET | `/clients/:clientId/subscriptions` | Suscripciones del cliente | - |
| POST | `/subscriptions` | Crear suscripción | `clientId`, `packageId`, `startDate`, `routerId` |
| PUT | `/subscriptions/:id/change-plan` | Cambiar plan | `newPackageId`, `effectiveDate` |
| POST | `/subscriptions/:id/suspend` | Suspender suscripción | `reason`, `suspendedUntil` |
| POST | `/subscriptions/:id/cancel` | Cancelar suscripción | `cancellationReason`, `effectiveDate` |

---

## 4. Dispositivos y Red

### 📡 **device.routes.js** - Dispositivos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/devices` | Listar dispositivos | `type`, `status`, `familyId`, `zoneId` |
| GET | `/devices/:id` | Obtener dispositivo por ID | - |
| POST | `/devices` | Crear dispositivo | `name`, `type`, `ipAddress`, `familyId`, `brandId`, `zoneId`, `credentials` |
| PUT | `/devices/:id` | Actualizar dispositivo | `name`, `ipAddress`, `status`, `location` |
| DELETE | `/devices/:id` | Eliminar dispositivo | - |
| POST | `/devices/test-connection` | Probar conexión | `ipAddress`, `credentials` |
| POST | `/devices/:id/execute-command` | Ejecutar comando | `command`, `parameters` |

### 🏷️ **deviceFamily.routes.js** - Familias de Dispositivos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/device-family` | Listar familias | - |
| GET | `/device-family/:id` | Obtener familia por ID | - |
| POST | `/device-family` | Crear familia | `name`, `description`, `manufacturer` |
| PUT | `/device-family/:id` | Actualizar familia | `name`, `description` |
| DELETE | `/device-family/:id` | Eliminar familia | - |

### 🔖 **deviceBrand.routes.js** - Marcas de Dispositivos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/device-brands` | Listar marcas | - |
| GET | `/device-brands/:id` | Obtener marca por ID | - |
| POST | `/device-brands` | Crear marca | `name`, `description`, `logoUrl` |
| PUT | `/device-brands/:id` | Actualizar marca | `name`, `description`, `logoUrl` |
| DELETE | `/device-brands/:id` | Eliminar marca | - |

### 🔐 **deviceCredential.routes.js** - Credenciales de Dispositivos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/device-credentials` | Listar credenciales | `deviceId` |
| GET | `/device-credentials/:id` | Obtener credencial | - |
| POST | `/device-credentials` | Crear credencial | `deviceId`, `username`, `password`, `credentialType`, `sshPort` |
| PUT | `/device-credentials/:id` | Actualizar credencial | `username`, `password`, `sshPort` |
| DELETE | `/device-credentials/:id` | Eliminar credencial | - |

### 📊 **deviceMetric.routes.js** - Métricas de Dispositivos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/device-metrics` | Listar métricas | `deviceId`, `startDate`, `endDate` |
| GET | `/device-metrics/:deviceId/latest` | Últimas métricas | - |
| GET | `/device-metrics/:deviceId/history` | Historial de métricas | `metric`, `period` |

### 🌐 **network.routes.js** - Red

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/network/topology` | Topología de red | `zoneId` |
| GET | `/network/zones` | Listar zonas | - |
| POST | `/network/zones` | Crear zona | `name`, `description`, `coordinates` |
| GET | `/network/nodes` | Nodos de red | `zoneId` |
| POST | `/network/nodes` | Crear nodo | `name`, `type`, `zoneId`, `coordinates` |
| GET | `/network/links` | Enlaces de red | - |

---

## 5. Mikrotik

### 🔴 **mikrotik.routes.js** - Mikrotik General

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/mikrotik/devices/:id/metrics` | Métricas del router | - |
| POST | `/mikrotik/test-connection` | Probar conexión | `host`, `username`, `password`, `port` |
| POST | `/mikrotik/routers` | Crear router | `name`, `host`, `username`, `password`, `port`, `zoneId` |
| GET | `/mikrotik/routers` | Listar routers | `zoneId`, `active` |
| GET | `/mikrotik/routers/:id` | Obtener router por ID | - |
| PUT | `/mikrotik/routers/:id` | Actualizar router | `name`, `host`, `credentials` |
| DELETE | `/mikrotik/routers/:id` | Eliminar router | - |

### 👥 **mikrotikPPPOE.routes.js** - Usuarios PPPoE ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/mikrotik-pppoe` | Listar usuarios PPPoE | `page`, `limit`, `mikrotikRouterId`, `clientId`, `status` |
| GET | `/mikrotik-pppoe/:id` | Obtener usuario por ID | - |
| POST | `/mikrotik-pppoe` | Crear usuario PPPoE | **`mikrotikRouterId`**, **`clientId`**, **`passwordEncrypted`**, **`profileId`**, **`mikrotikUserId`**, `username`, `subscriptionId`, `poolId`, `staticIp`, `status` |
| PUT | `/mikrotik-pppoe/:id` | Actualizar usuario | `username`, `passwordEncrypted`, `profileId`, `poolId`, `staticIp`, `status`, `uptime`, `bytesIn`, `bytesOut` |
| DELETE | `/mikrotik-pppoe/:id` | Eliminar usuario PPPoE | - |

### 🌐 **mikrotikIp.routes.js** - IPs de Mikrotik ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/mikrotik-ips` | Listar IPs | `ipPoolId`, `clientId`, `status` |
| GET | `/mikrotik-ips/:id` | Obtener IP por ID | - |
| POST | `/mikrotik-ips` | Crear IP | **`ipPoolId`**, **`ipAddress`**, `clientId`, `mikrotikPPPOEId`, `status`, `macAddress`, `hostname`, `comment` |
| PUT | `/mikrotik-ips/:id` | Actualizar IP | `clientId`, `mikrotikPPPOEId`, `status`, `macAddress`, `hostname`, `lastSeen` |
| DELETE | `/mikrotik-ips/:id` | Eliminar IP | - |

### ⚡ **mikrotikProfile.routes.js** - Perfiles Mikrotik ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/mikrotik-profiles` | Listar perfiles | `mikrotikRouterId`, `servicePackageId`, `active` |
| GET | `/mikrotik-profiles/:id` | Obtener perfil por ID | - |
| POST | `/mikrotik-profiles` | Crear perfil | **`mikrotikRouterId`**, **`profileId`**, **`profileName`**, **`rateLimit`**, `servicePackageId`, `burstLimit`, `burstThreshold`, `burstTime`, `priority`, `active` |
| PUT | `/mikrotik-profiles/:id` | Actualizar perfil | `profileName`, `rateLimit`, `burstLimit`, `servicePackageId`, `active` |
| DELETE | `/mikrotik-profiles/:id` | Eliminar perfil | - |

### 🏊 **ip.pool.routes.js** - Pools de IPs

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/ip-pool` | Listar pools | `mikrotikRouterId` |
| GET | `/ip-pool/available` | IPs disponibles | `poolId` |
| POST | `/ip-pool` | Crear pool | `name`, `range`, `mikrotikRouterId`, `gateway`, `dns` |
| PUT | `/ip-pool/:id` | Actualizar pool | `name`, `range`, `gateway`, `dns` |
| DELETE | `/ip-pool/:id` | Eliminar pool | - |

### 📍 **ip.assignment.routes.js** - Asignaciones de IP

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/ip-assignments` | Listar asignaciones | `clientId`, `ipPoolId` |
| POST | `/ip-assignments` | Asignar IP | `clientId`, `ipAddress`, `ipPoolId`, `type` |
| DELETE | `/ip-assignments/:id` | Liberar IP | - |

---

## 6. Tickets y Soporte

### 🎫 **ticket.routes.js** - Tickets

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/tickets` | Listar tickets | `status`, `priority`, `assignedTo`, `clientId` |
| GET | `/tickets/:id` | Obtener ticket por ID | - |
| POST | `/tickets` | Crear ticket | `title`, `description`, `clientId`, `priority`, `typeId`, `assignedTo` |
| PUT | `/tickets/:id` | Actualizar ticket | `title`, `description`, `status`, `priority`, `assignedTo` |
| DELETE | `/tickets/:id` | Eliminar ticket | - |
| GET | `/tickets/:ticketId/comments` | Comentarios del ticket | - |
| POST | `/tickets/:ticketId/comments` | Agregar comentario | `comment`, `isInternal` |
| PUT | `/comments/:commentId` | Actualizar comentario | `comment` |
| DELETE | `/comments/:commentId` | Eliminar comentario | - |

### 🏷️ **ticketType.routes.js** - Tipos de Ticket ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/ticket-types` | Listar tipos | `category`, `active` |
| GET | `/ticket-types/:id` | Obtener tipo por ID | - |
| POST | `/ticket-types` | Crear tipo | **`name`**, **`category`**, `description`, `estimatedDurationHours`, `requiresMaterials`, `active` |
| PUT | `/ticket-types/:id` | Actualizar tipo | `name`, `description`, `category`, `estimatedDurationHours`, `active` |
| DELETE | `/ticket-types/:id` | Eliminar tipo | - |

**Categorías válidas:** `installation`, `support`, `maintenance`

### 📎 **ticketAttachment.routes.js** - Adjuntos de Ticket ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/tickets/:ticketId/attachments` | Adjuntos del ticket | - |
| GET | `/ticket-attachments/:id` | Obtener adjunto por ID | - |
| POST | `/tickets/:ticketId/attachments` | Subir adjunto | **`file`** (multipart), `description`, `attachmentType` |
| PUT | `/ticket-attachments/:id` | Actualizar descripción | `description` |
| DELETE | `/ticket-attachments/:id` | Eliminar adjunto | - |
| GET | `/ticket-attachments/:id/download` | Descargar adjunto | - |

**Tipos de adjunto:** `photo`, `document`, `video`

---

## 7. Inventario

### 📦 **inventory.routes.js** - Inventario

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/inventory` | Listar items | `typeId`, `locationId`, `status`, `search` |
| GET | `/inventory/:id` | Obtener item por ID | - |
| POST | `/inventory` | Crear item | `typeId`, `productId`, `serial`, `locationId`, `status`, `purchasePrice` |
| PUT | `/inventory/:id` | Actualizar item | `locationId`, `status`, `notes` |
| DELETE | `/inventory/:id` | Eliminar item | - |
| POST | `/inventory/consume` | Consumir inventario | `itemId`, `quantity`, `ticketId`, `notes` |
| GET | `/inventory-types` | Listar tipos | `categoryId` |
| POST | `/inventory-types` | Crear tipo | **`name`**, **`categoryId`**, `description`, `unitType`, `hasSerial`, `hasMac`, `defaultScrapPercentage` |
| PUT | `/inventory-types/:id` | Actualizar tipo | `name`, `description`, `unitType` |
| DELETE | `/inventory-types/:id` | Eliminar tipo | - |

### 🏷️ **inventoryCategory.routes.js** - Categorías de Inventario ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/inventory-categories` | Listar categorías | `active` |
| GET | `/inventory-categories/:id` | Obtener categoría por ID | - |
| POST | `/inventory-categories` | Crear categoría | **`name`**, `description`, `active` |
| PUT | `/inventory-categories/:id` | Actualizar categoría | `name`, `description`, `active` |
| DELETE | `/inventory-categories/:id` | Eliminar categoría | - |

### 📦 **inventoryProduct.routes.js** - Productos de Inventario ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/inventory-products` | Listar productos | `page`, `limit`, `typeId`, `brand`, `active` |
| GET | `/inventory-products/:id` | Obtener producto por ID | - |
| POST | `/inventory-products` | Crear producto | **`typeId`**, **`brand`**, **`model`**, `partNumber`, `description`, `purchasePrice`, `salePrice`, `warrantyMonths`, `specifications`, `active` |
| PUT | `/inventory-products/:id` | Actualizar producto | `brand`, `model`, `purchasePrice`, `salePrice`, `active` |
| DELETE | `/inventory-products/:id` | Eliminar producto | - |

### ♻️ **inventoryScrap.routes.js** - Scrap de Inventario ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/inventory-scrap` | Listar registros de scrap | `page`, `limit`, `inventoryId`, `technicianId`, `ticketId`, `startDate`, `endDate` |
| GET | `/inventory-scrap/statistics` | Estadísticas de scrap | `technicianId`, `startDate`, `endDate` |
| GET | `/inventory-scrap/:id` | Obtener registro por ID | - |
| POST | `/inventory-scrap` | Crear registro | **`inventoryId`**, **`originalQuantity`**, **`usedQuantity`**, **`scrapQuantity`**, `scrapReason`, `technicianId`, `ticketId`, `costImpact`, `unitType`, `notes` |
| PUT | `/inventory-scrap/:id` | Actualizar registro | `usedQuantity`, `scrapQuantity`, `scrapReason`, `costImpact`, `notes` |
| DELETE | `/inventory-scrap/:id` | Eliminar registro | - |

### 📍 **inventoryLocation.routes.js** - Ubicaciones de Inventario

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/inventory-location` | Listar ubicaciones | `type`, `active` |
| GET | `/inventory-location/:id` | Obtener ubicación por ID | - |
| POST | `/inventory-location` | Crear ubicación | `name`, `type`, `description`, `active` |
| PUT | `/inventory-location/:id` | Actualizar ubicación | `name`, `description`, `active` |
| DELETE | `/inventory-location/:id` | Eliminar ubicación | - |

**Tipos de ubicación:** `warehouse`, `vehicle`, `repair_shop`, `client_site`

### 📦 **inventoryMovement.routes.js** - Movimientos de Inventario

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/inventory-movement` | Listar movimientos | `itemId`, `locationId`, `type`, `startDate`, `endDate` |
| POST | `/inventory-movement` | Registrar movimiento | `itemId`, `fromLocationId`, `toLocationId`, `movementType`, `quantity`, `userId`, `notes` |

### 📦 **inventoryBatch.routes.js** - Lotes de Inventario

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/inventory-batch` | Listar lotes | `productId`, `status` |
| GET | `/inventory-batch/:id` | Obtener lote por ID | - |
| POST | `/inventory-batch` | Crear lote | `productId`, `quantity`, `batchNumber`, `expirationDate`, `purchasePrice` |
| PUT | `/inventory-batch/:id` | Actualizar lote | `quantity`, `expirationDate`, `status` |
| DELETE | `/inventory-batch/:id` | Eliminar lote | - |

### 🔧 **installationMaterial.routes.js** - Materiales de Instalación ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/installation-materials` | Listar materiales | `ticketId` |
| GET | `/installation-materials/:id` | Obtener material por ID | - |
| POST | `/installation-materials` | Registrar material | **`ticketId`**, **`itemId`**, **`quantityUsed`**, **`usageType`**, `scrapGenerated`, `notes` |
| PUT | `/installation-materials/:id` | Actualizar material | `quantityUsed`, `scrapGenerated`, `notes` |
| DELETE | `/installation-materials/:id` | Eliminar material | - |

**Tipos de uso:** `installation`, `repair`, `maintenance`

### 🔄 **inventoryReconciliation.routes.js** - Conciliación de Inventario

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/inventory-reconciliation` | Listar conciliaciones | `technicianId`, `status` |
| GET | `/inventory-reconciliation/:id` | Obtener conciliación | - |
| POST | `/inventory-reconciliation` | Crear conciliación | `technicianId`, `items[]`, `notes` |
| PUT | `/inventory-reconciliation/:id` | Actualizar conciliación | `status`, `approvedBy`, `notes` |
| DELETE | `/inventory-reconciliation/:id` | Eliminar conciliación | - |

### 👷 **inventoryTechnician.routes.js** - Inventario de Técnico

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/inventory/technician/:technicianId` | Inventario del técnico | - |
| POST | `/inventory/technician/assign` | Asignar a técnico | `itemIds[]`, `technicianId`, `notes` |
| POST | `/inventory/technician/return` | Devolver items | `itemIds[]`, `technicianId`, `notes` |

---

## 8. Facturación y Pagos

### 💵 **billing.routes.js** - Facturación

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/billing/summary` | Resumen de facturación | `month`, `year` |
| GET | `/billing/pending` | Facturas pendientes | `clientId` |
| POST | `/billing/generate` | Generar facturas | `month`, `year`, `clientIds[]` |
| POST | `/billing/send-reminders` | Enviar recordatorios | `overdueOnly` |

### 🧾 **invoice.routes.js** - Facturas

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/invoices` | Listar facturas | `clientId`, `status`, `startDate`, `endDate` |
| GET | `/invoices/:id` | Obtener factura por ID | - |
| POST | `/invoices` | Crear factura | `clientId`, `items[]`, `dueDate`, `notes` |
| PUT | `/invoices/:id` | Actualizar factura | `dueDate`, `notes`, `status` |
| DELETE | `/invoices/:id` | Eliminar factura | - |
| POST | `/invoices/:id/send` | Enviar factura por email | `email` |
| GET | `/invoices/:id/pdf` | Descargar PDF | - |

### 💳 **payment.routes.js** - Pagos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/payments` | Listar pagos | `clientId`, `status`, `startDate`, `endDate` |
| GET | `/payments/statistics` | Estadísticas de pagos | - |
| GET | `/payments/:id` | Obtener pago por ID | - |
| POST | `/payments` | Crear pago | `clientId`, `amount`, `paymentMethod`, `invoiceIds[]`, `paymentDate` |
| PUT | `/payments/:id` | Actualizar pago | `amount`, `notes`, `status` |
| DELETE | `/payments/:id` | Eliminar pago | - |
| POST | `/payments/process` | Procesar pago con plugin | `gatewayId`, `amount`, `paymentData` |
| POST | `/payments/reconcile` | Conciliar pagos | `startDate`, `endDate` |
| POST | `/payments/webhook/:gateway` | Webhook de pasarela | - |
| POST | `/payments/:id/confirm` | Confirmar pago pendiente | `transactionId` |
| GET | `/payment-gateways` | Listar pasarelas | - |
| GET | `/payment-gateways/plugins` | Plugins disponibles | - |
| GET | `/payment-gateways/:id/stats` | Estadísticas de pasarela | - |
| POST | `/payment-gateways` | Crear pasarela | `name`, `pluginId`, `config`, `active` |
| POST | `/payment-gateways/:id/activate` | Activar/desactivar | `active` |
| PUT | `/payment-gateways/:id` | Actualizar pasarela | `name`, `config`, `active` |
| GET | `/payment-reminders` | Listar recordatorios | - |
| GET | `/payment-reminders/history` | Historial de recordatorios | - |
| POST | `/payment-reminders` | Crear recordatorio | `clientId`, `invoiceId`, `scheduledDate` |
| POST | `/payment-reminders/:id/send` | Enviar recordatorio | - |
| POST | `/payment-reminders/schedule` | Programar recordatorios | `daysBeforeDue`, `template` |

### 💰 **manual.payment.routes.js** - Pagos Manuales

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| POST | `/manual-payments` | Registrar pago manual | `clientId`, `amount`, `paymentMethod`, `reference`, `notes` |
| GET | `/manual-payments` | Listar pagos manuales | `startDate`, `endDate` |

### 🔔 **reminders.routes.js** - Recordatorios

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/reminders` | Listar recordatorios | `type`, `status` |
| POST | `/reminders/payment` | Enviar recordatorio de pago | `clientIds[]`, `template` |
| POST | `/reminders/schedule` | Programar recordatorio | `type`, `clientId`, `scheduledDate` |

---

## 9. Contabilidad y Nómina

### 💼 **accounting.routes.js** - Contabilidad

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/accounting/balance-sheet` | Balance general | `month`, `year` |
| GET | `/accounting/income-statement` | Estado de resultados | `startDate`, `endDate` |
| GET | `/accounting/cash-flow` | Flujo de efectivo | `month`, `year` |

### 💸 **expense.routes.js** - Gastos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/expenses` | Listar gastos | `categoryId`, `startDate`, `endDate` |
| GET | `/expenses/:id` | Obtener gasto por ID | - |
| POST | `/expenses` | Crear gasto | `description`, `amount`, `categoryId`, `date`, `receipt` |
| PUT | `/expenses/:id` | Actualizar gasto | `description`, `amount`, `categoryId`, `date` |
| DELETE | `/expenses/:id` | Eliminar gasto | - |
| GET | `/expenses/categories` | Categorías de gastos | - |
| POST | `/expenses/categories` | Crear categoría | `name`, `description` |
| PUT | `/expenses/categories/:id` | Actualizar categoría | `name`, `description` |
| DELETE | `/expenses/categories/:id` | Eliminar categoría | - |

### 💵 **payroll.routes.js** - Nómina

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/payroll` | Listar nóminas | `userId`, `month`, `year`, `status` |
| GET | `/payroll/:id` | Obtener nómina por ID | - |
| POST | `/payroll` | Crear nómina | `userId`, `month`, `year`, `baseSalary`, `bonuses`, `deductions` |
| PUT | `/payroll/:id` | Actualizar nómina | `baseSalary`, `bonuses`, `deductions` |
| DELETE | `/payroll/:id` | Eliminar nómina | - |

### 💳 **payrollPayment.routes.js** - Pagos de Nómina ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/payroll-payments` | Listar pagos | `payrollId`, `paymentMethod`, `startDate`, `endDate` |
| GET | `/payroll-payments/:id` | Obtener pago por ID | - |
| POST | `/payroll-payments` | Registrar pago | **`payrollId`**, **`amount`**, **`paymentDate`**, **`paymentMethod`**, `paymentReference`, `notes`, `createdBy` |
| PUT | `/payroll-payments/:id` | Actualizar pago | `amount`, `paymentDate`, `paymentMethod`, `notes` |
| DELETE | `/payroll-payments/:id` | Eliminar pago | - |

**Métodos de pago:** `cash`, `transfer`, `check`

### 💱 **currency.routes.js** - Monedas y Tipos de Cambio

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/currencies` | Listar monedas | `active` |
| GET | `/currencies/:id` | Obtener moneda por ID | - |
| POST | `/currencies` | Crear moneda | `code`, `name`, `symbol`, `isDefault`, `active` |
| PUT | `/currencies/:id` | Actualizar moneda | `name`, `symbol`, `isDefault`, `active` |
| DELETE | `/currencies/:id` | Eliminar moneda | - |
| GET | `/exchange-rates` | Tipos de cambio | `fromCurrency`, `toCurrency` |
| POST | `/exchange-rates` | Crear tipo de cambio | `fromCurrencyId`, `toCurrencyId`, `rate` |
| PUT | `/exchange-rates/:id` | Actualizar tipo de cambio | `rate` |

---

## 10. Comunicaciones

### 📧 **communicationPlugin.routes.js** - Plugin de Comunicación

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/communication-channels` | Listar canales | `type`, `active` |
| POST | `/communication-channels` | Crear canal | `type`, `name`, `config`, `active` |
| PUT | `/communication-channels/:id` | Actualizar canal | `name`, `config`, `active` |
| DELETE | `/communication-channels/:id` | Eliminar canal | - |
| POST | `/communication/send` | Enviar mensaje | `channelId`, `to`, `message`, `templateId` |
| GET | `/communication/history` | Historial de comunicación | `clientId`, `channelId`, `startDate` |

### 📝 **template.routes.js** - Plantillas de Mensajes

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/templates` | Listar plantillas | `type`, `channelType` |
| GET | `/templates/:id` | Obtener plantilla por ID | - |
| POST | `/templates` | Crear plantilla | `name`, `type`, `channelType`, `content`, `variables` |
| PUT | `/templates/:id` | Actualizar plantilla | `name`, `content`, `variables`, `active` |
| DELETE | `/templates/:id` | Eliminar plantilla | - |

### 👥 **communicationContact.routes.js** - Contactos de Comunicación ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/communication-contacts` | Listar contactos | `clientId`, `contactType`, `verified`, `optIn` |
| GET | `/communication-contacts/:id` | Obtener contacto por ID | - |
| POST | `/communication-contacts` | Crear contacto | **`clientId`**, **`contactType`**, **`contactValue`**, `isPreferred`, `verified`, `preferences`, `optIn`, `notes` |
| PUT | `/communication-contacts/:id` | Actualizar contacto | `contactValue`, `isPreferred`, `verified`, `preferences`, `optIn`, `notes` |
| DELETE | `/communication-contacts/:id` | Eliminar contacto | - |

**Tipos de contacto:** `email`, `phone`, `whatsapp`, `telegram`

### 📅 **communicationEvent.routes.js** - Eventos de Comunicación ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/communication-events` | Listar eventos | `page`, `limit`, `eventType`, `clientId`, `processed`, `priority` |
| GET | `/communication-events/:id` | Obtener evento por ID | - |
| POST | `/communication-events` | Crear evento | **`eventType`**, **`entityType`**, **`entityId`**, `clientId`, `eventData`, `priority` |
| PUT | `/communication-events/:id` | Actualizar evento | `processed`, `processedAt`, `notificationsTriggered` |
| DELETE | `/communication-events/:id` | Eliminar evento | - |

---

## 11. Documentos y Plantillas

### 📄 **documentTemplate.routes.js** - Plantillas de Documentos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/document-templates` | Listar plantillas | `type`, `active` |
| GET | `/document-templates/:id` | Obtener plantilla por ID | - |
| POST | `/document-templates` | Crear plantilla | `name`, `type`, `content`, `variables`, `active` |
| PUT | `/document-templates/:id` | Actualizar plantilla | `name`, `content`, `variables`, `active` |
| DELETE | `/document-templates/:id` | Eliminar plantilla | - |
| POST | `/document-templates/:id/generate` | Generar documento | `data`, `clientId` |

### 📑 **documentAdvanced.routes.js** - Funciones Avanzadas de Documentos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/documents/generated/:historyId/download` | Descargar documento generado | - |
| POST | `/documents/send-bulk` | Envío masivo de documentos | `documentIds[]`, `recipients[]` |
| POST | `/documents/generate-bulk` | Generar masivamente | `templateId`, `clientIds[]`, `data` |
| POST | `/documents/download-bulk` | Descargar en ZIP | `documentIds[]` |
| POST | `/documents/signatures` | Crear firma digital | `documentId`, `signatureData`, `certificateId` |
| GET | `/documents/:documentId/signatures` | Firmas de un documento | - |
| GET | `/signatures/:id/verify` | Verificar firma | - |
| POST | `/signatures/:id/revoke` | Revocar firma | `reason` |
| POST | `/documents/:documentId/send-email` | Enviar por email | `to`, `subject`, `message` |
| GET | `/documents/:documentId/email-history` | Historial de emails | - |
| POST | `/documents/:documentId/email-preview` | Preview de email | `to`, `subject` |
| GET | `/templates/:templateId/versions` | Versiones de plantilla | - |
| POST | `/templates/:templateId/versions` | Crear nueva versión | `content`, `notes` |
| POST | `/templates/versions/:versionId/restore` | Restaurar versión | - |
| GET | `/templates/versions/compare` | Comparar versiones | `versionId1`, `versionId2` |
| POST | `/templates/:templateId/auto-send` | Configurar envío automático | `config` |
| POST | `/templates/:templateId/duplicate` | Duplicar plantilla | `newName` |
| GET | `/templates/:templateId/export` | Exportar plantilla | `format` |
| GET | `/templates/:templateId/export-history` | Historial de exportaciones | - |
| POST | `/templates/import` | Importar plantilla | `file` |

---

## 12. Notificaciones

### 🔔 **notification.routes.js** - Notificaciones

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/notifications` | Listar notificaciones | `userId`, `read`, `type` |
| GET | `/notifications/:id` | Obtener notificación | - |
| POST | `/notifications` | Crear notificación | `userId`, `title`, `message`, `type`, `link` |
| PUT | `/notifications/:id` | Actualizar notificación | `title`, `message` |
| DELETE | `/notifications/:id` | Eliminar notificación | - |
| POST | `/notifications/read-all` | Marcar todas como leídas | `userId` |
| PUT | `/notifications/:id/read` | Marcar como leída | - |

### ⚙️ **notificationRule.routes.js** - Reglas de Notificaciones ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/notification-rules` | Listar reglas | `eventType`, `channelType`, `active` |
| GET | `/notification-rules/:id` | Obtener regla por ID | - |
| POST | `/notification-rules` | Crear regla | **`name`**, **`eventType`**, **`channelType`**, `triggerCondition`, `templateId`, `delayMinutes`, `active`, `priority` |
| PUT | `/notification-rules/:id` | Actualizar regla | `name`, `eventType`, `channelType`, `triggerCondition`, `active`, `priority` |
| DELETE | `/notification-rules/:id` | Eliminar regla | - |

**Tipos de evento:** `payment_overdue`, `service_suspended`, `ticket_created`, `installation_scheduled`, `custom`
**Tipos de canal:** `email`, `whatsapp`, `telegram`, `sms`
**Prioridades:** `low`, `normal`, `high`, `urgent`

### 📬 **notificationQueue.routes.js** - Cola de Notificaciones ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/notification-queue` | Listar cola | `page`, `limit`, `clientId`, `status`, `priority` |
| GET | `/notification-queue/:id` | Obtener notificación | - |
| POST | `/notification-queue` | Encolar notificación | **`channelId`**, **`recipient`**, **`messageData`**, **`scheduledFor`**, `clientId`, `templateId`, `ruleId`, `priority` |
| PUT | `/notification-queue/:id` | Actualizar estado | `status`, `attempts`, `processedAt`, `result` |
| DELETE | `/notification-queue/:id` | Eliminar de cola | - |
| POST | `/notification-queue/:id/cancel` | Cancelar notificación | - |

**Estados:** `pending`, `processing`, `sent`, `failed`, `cancelled`

---

## 13. Chat

### 💬 **chat.routes.js** - Chat Interno

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/chat/conversations` | Listar conversaciones | - |
| POST | `/chat/conversations` | Crear conversación | `participantIds[]`, `name`, `type` |
| GET | `/chat/conversations/:id/messages` | Mensajes de conversación | `limit`, `offset` |
| PUT | `/chat/conversations/:id/read` | Marcar como leída | - |
| PUT | `/chat/conversations/:id` | Actualizar conversación | `name`, `metadata` |
| DELETE | `/chat/conversations/:id` | Eliminar conversación | - |
| POST | `/chat/messages` | Enviar mensaje | `conversationId`, `content`, `messageType`, `attachments` |
| PUT | `/chat/messages/:id` | Editar mensaje | `content`, `metadata` |
| DELETE | `/chat/messages/:id` | Eliminar mensaje | - |
| GET | `/chat/telegram/status` | Estado de Telegram | - |

---

## 14. Calendario

### 📅 **calendar.routes.js** - Calendario y Eventos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/calendar/events` | Listar eventos | `startDate`, `endDate`, `type`, `assignedTo` |
| GET | `/calendar/events/:id` | Obtener evento por ID | - |
| POST | `/calendar/events` | Crear evento | `title`, `description`, `startDate`, `endDate`, `type`, `assignedTo`, `location` |
| PUT | `/calendar/events/:id` | Actualizar evento | `title`, `description`, `startDate`, `endDate` |
| DELETE | `/calendar/events/:id` | Eliminar evento | - |
| GET | `/calendar/google/auth-url` | URL de auth de Google | - |
| GET | `/calendar/microsoft/auth-url` | URL de auth de Microsoft | - |

---

## 15. Sistema y Configuración

### ⚙️ **settings.routes.js** - Configuración del Sistema

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/settings` | Obtener todas las configuraciones | - |
| GET | `/settings/:key` | Obtener configuración por clave | - |
| POST | `/settings` | Crear configuración | **`key`**, **`value`**, `description`, `category` |
| PUT | `/settings/:key` | Actualizar configuración | `value`, `description` |
| DELETE | `/settings/:key` | Eliminar configuración | - |

### 🔧 **setup.routes.js** - Wizard de Configuración Inicial

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/setup/status` | Estado de configuración | - |
| POST | `/setup/company` | Información de empresa | `name`, `address`, `phone`, `email`, `taxId` |
| POST | `/setup/logo` | Subir logo | `file` (multipart) |
| POST | `/setup/segmentation` | Configurar segmentación | `zones`, `nodes` |
| POST | `/setup/webhooks` | Configurar webhooks | `webhooks[]` |
| POST | `/setup/payment-gateways` | Configurar pasarelas | `gateways[]` |
| POST | `/setup/mikrotik` | Configurar Mikrotik | `routers[]` |
| POST | `/setup/complete` | Completar setup | - |
| POST | `/setup/reset` | Resetear setup (dev) | - |

### 🔌 **systemPlugin.routes.js** - Plugins del Sistema

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/system-plugins` | Listar plugins | `category`, `active` |
| GET | `/system-plugins/:id` | Obtener plugin por ID | - |
| POST | `/system-plugins` | Instalar plugin | `name`, `version`, `config` |
| POST | `/system-plugins/:id/activate` | Activar/desactivar | `active` |

### 📤 **pluginUpload.routes.js** - Upload de Plugins

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| POST | `/plugin-upload` | Subir plugin | `file` (multipart), `metadata` |
| GET | `/plugin-upload/validate` | Validar plugin | `pluginId` |

### 📝 **pluginAudit.routes.js** - Auditoría de Plugins

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/plugin-audit` | Logs de auditoría | `pluginId`, `startDate`, `endDate` |

### 📜 **systemLicense.routes.js** - Licencias del Sistema

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/system-license` | Información de licencia | - |
| POST | `/system-license/activate` | Activar licencia | `licenseKey` |
| POST | `/system-license/validate` | Validar licencia | - |

### 📧 **employeeEmail.routes.js** - Emails de Empleados

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/employee-emails` | Listar emails | `userId` |
| POST | `/employee-emails` | Crear email | `userId`, `email`, `type`, `isDefault` |
| PUT | `/employee-emails/:id` | Actualizar email | `email`, `isDefault` |
| DELETE | `/employee-emails/:id` | Eliminar email | - |

### 💾 **backup.routes.js** - Respaldos del Sistema

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/backups` | Listar respaldos | - |
| POST | `/backups/create` | Crear respaldo | `includeFiles`, `description` |
| POST | `/backups/:id/restore` | Restaurar respaldo | - |
| DELETE | `/backups/:id` | Eliminar respaldo | - |
| GET | `/backups/:id/download` | Descargar respaldo | - |

---

## 16. Comandos de Dispositivos

### ⚡ **deviceCommand.routes.js** - Comandos de Dispositivos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/device-commands` | Listar comandos | `deviceId`, `familyId` |
| POST | `/device-commands` | Crear comando | `name`, `command`, `deviceId`, `familyId` |
| PUT | `/device-commands/:id` | Actualizar comando | `name`, `command` |
| DELETE | `/device-commands/:id` | Eliminar comando | - |

### 🔧 **commonCommand.routes.js** - Comandos Comunes

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/common-commands` | Listar comandos comunes | `category`, `platform` |
| GET | `/common-commands/:id` | Obtener comando por ID | - |
| POST | `/common-commands` | Crear comando común | `name`, `description`, `category`, `platform`, `syntax` |
| PUT | `/common-commands/:id` | Actualizar comando | `name`, `description`, `syntax` |
| DELETE | `/common-commands/:id` | Eliminar comando | - |

### 🛠️ **commandImplementation.routes.js** - Implementaciones de Comandos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/command-implementations` | Listar implementaciones | `commonCommandId`, `familyId` |
| GET | `/command-implementations/:id` | Obtener implementación | - |
| POST | `/command-implementations` | Crear implementación | `commonCommandId`, `familyId`, `implementation`, `syntax` |
| PUT | `/command-implementations/:id` | Actualizar implementación | `implementation`, `syntax` |
| DELETE | `/command-implementations/:id` | Eliminar implementación | - |

### 📋 **commandParameter.routes.js** - Parámetros de Comandos ✨ **NUEVO**

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/command-parameters` | Listar parámetros | `implementationId` |
| GET | `/command-parameters/:id` | Obtener parámetro por ID | - |
| POST | `/command-parameters` | Crear parámetro | **`implementationId`**, **`name`**, **`type`**, `description`, `defaultValue`, `required`, `validation`, `order` |
| PUT | `/command-parameters/:id` | Actualizar parámetro | `name`, `type`, `description`, `defaultValue`, `required` |
| DELETE | `/command-parameters/:id` | Eliminar parámetro | - |

**Tipos de parámetro:** `string`, `int`, `bool`, `float`, `json`

### 📜 **commandHistory.routes.js** - Historial de Comandos

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/command-history` | Historial de comandos | `deviceId`, `startDate`, `endDate`, `status` |
| GET | `/command-history/:id` | Obtener registro | - |
| DELETE | `/command-history/:id` | Eliminar registro | - |

### 📊 **snmpOid.routes.js** - OIDs SNMP

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/snmp-oid` | Listar OIDs | `category`, `deviceFamily` |
| POST | `/snmp-oid` | Crear OID | `name`, `oid`, `description`, `category`, `deviceFamily` |
| PUT | `/snmp-oid/:id` | Actualizar OID | `name`, `oid`, `description` |
| DELETE | `/snmp-oid/:id` | Eliminar OID | - |

---

## 17. Reportes y Métricas

### 📊 **reports.routes.js** - Reportes

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/reports/clients` | Reporte de clientes | `startDate`, `endDate`, `status` |
| GET | `/reports/revenue` | Reporte de ingresos | `month`, `year`, `breakdown` |
| GET | `/reports/tickets` | Reporte de tickets | `startDate`, `endDate`, `status`, `priority` |
| GET | `/reports/inventory` | Reporte de inventario | `locationId`, `typeId` |
| GET | `/reports/devices` | Reporte de dispositivos | `zoneId`, `status`, `type` |
| POST | `/reports/custom` | Reporte personalizado | `reportType`, `filters`, `groupBy` |
| GET | `/reports/:id/export` | Exportar reporte | `format` (pdf, xlsx, csv) |

### 📈 **metrics.routes.js** - Métricas

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/metrics/dashboard` | Métricas del dashboard | `period` |
| GET | `/metrics/network` | Métricas de red | `zoneId`, `period` |
| GET | `/metrics/financial` | Métricas financieras | `month`, `year` |
| GET | `/metrics/performance` | Métricas de rendimiento | `deviceId`, `metric`, `period` |

---

## 18. Integraciones

### 🔗 **n8n.routes.js** - Integración n8n

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/n8n/workflows` | Listar workflows | `active`, `category` |
| GET | `/n8n/workflows/:id` | Obtener workflow | - |
| POST | `/n8n/workflows` | Crear workflow | `name`, `workflow`, `active` |
| PUT | `/n8n/workflows/:id` | Actualizar workflow | `name`, `workflow`, `active` |
| DELETE | `/n8n/workflows/:id` | Eliminar workflow | - |
| POST | `/n8n/workflows/:id/execute` | Ejecutar workflow | `inputData` |

### 🏪 **storeCustomer.routes.js** - Store/Marketplace

| Método | Ruta | Descripción | Parámetros |
|--------|------|-------------|------------|
| GET | `/store-customers` | Listar clientes de tienda | `status` |
| GET | `/store-customers/:id` | Obtener cliente | - |
| POST | `/store-customers` | Crear cliente de tienda | `name`, `email`, `phone`, `address` |
| GET | `/store-orders` | Listar órdenes | `customerId`, `status` |
| POST | `/store-orders` | Crear orden | `customerId`, `items[]`, `total` |

---

## 📝 Notas Importantes

### Autenticación
- Todas las rutas (excepto las públicas como `/auth/signin` y webhooks) requieren token JWT
- Header requerido: `x-access-token: <token>`
- Los tokens se obtienen al hacer login en `/auth/signin`

### Paginación
- Parámetros comunes: `page` (default: 1), `limit` (default: 10-50 según endpoint)
- Respuesta incluye: `data[]`, `pagination: { total, page, limit, totalPages }`

### Fechas
- Formato ISO 8601: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Para filtros de rango: `startDate` y `endDate`

### Archivos
- Content-Type: `multipart/form-data`
- Campos de archivo: `file`, `logo`, `receipt`, etc.
- Tamaño máximo por defecto: 5MB (configurable)

### Respuestas
Formato estándar:
```json
{
  "success": true/false,
  "data": {},
  "message": "Mensaje descriptivo"
}
```

---

**Última actualización:** $(date +"%Y-%m-%d %H:%M:%S")
**Versión del sistema:** 1.0.0
**Total de endpoints documentados:** ~400+
