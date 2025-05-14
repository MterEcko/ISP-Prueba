#### Chat y Comunicaciones
- `GET /api/chat/conversations/:clientId` - Obtener conversaciones de cliente
- `POST /api/chat/messages` - Enviar mensaje
- `GET /api/chat/messages/:conversationId` - Obtener mensajes
- `POST /api/chat/telegram/webhook` - Webhook de Telegram
- `POST /api/chat/whatsapp/webhook` - Webhook de WhatsApp7. **Sistema de chat integrado**:
   - Chat en tiempo real con Socket.io
   - Conversaciones organizadas por cliente
   - Integración con Telegram y WhatsApp
   - Sistema de asignación a técnicos
   - Historial completo de comunicaciones

8. **Soporte para fibra óptica**:
   - Gestión de equipos ONT/OLT
   - Monitoreo de métricas específicas de fibra
   - Topologías PON y punto a punto
   - Integración con emuladores de red
   - APIs para principales vendors de fibra💬 Chat Integrado</strong></summary>
<ul>
  <li>Chat web en tiempo real con Socket.io</li>
  <li>Conversaciones por cliente específico</li>
  <li>Integración con Telegram para clientes</li>
  <li>Historial completo de comunicaciones</li>
  <li>Asignación de conversaciones a técnicos</li>
</ul>
</details>

<details>
<summary><strong>🌐 Soporte para Fibra Óptica</strong></summary>
<ul>
  <li>Gestión de ONT/OLT (en desarrollo)</li>
  <li>Monitoreo de potencia óptica</li>
  <li>Topología PON</li>
  <li>Métricas específicas de fibra</li>
  <li>Integración SNMP para equipos PON</li>
</ul>
</details>

<details>
<summary><strong># Sistema Integral para Proveedores de Internet (ISP)

<div align="center">
  <!-- <img src="frontend/src/assets/logo.png" alt="ISP Sistema Logo" width="200"> -->
  <h1>ISP-Sistema-Integral</h1>
  <p>
    <strong>Sistema completo para la gestión integral de proveedores de servicios de internet</strong>
  </p>
  <p>
    <a href="#características">Características</a> •
    <a href="#tecnologías">Tecnologías</a> •
    <a href="#instalación">Instalación</a> •
    <a href="#uso">Uso</a> •
    <a href="#estado-del-proyecto">Estado del Proyecto</a> •
    <a href="#estructura">Estructura del Proyecto</a> •
    <a href="#contribución">Contribución</a>
  </p>
</div>

## Descripción

Sistema completo para gestión de proveedores de servicios de internet (ISP), con funcionalidades integradas para administración de clientes, monitoreo de red, gestión de tickets, facturación, servicios de streaming y comunicaciones multicanal.

<div id="características"></div>

## Funcionalidades Principales

<details>
<summary><strong>📊 Dashboard Centralizado</strong></summary>
Panel de control con visualización en tiempo real de métricas clave, estado de red, tickets pendientes e información financiera.
</details>

<details>
<summary><strong>👥 Gestión de Clientes</strong></summary>
Administración completa de clientes con:
<ul>
  <li>Información personal y de contacto</li>
  <li>Ubicación geográfica con mapas integrados</li>
  <li>Gestión de documentos</li>
  <li>Historial de servicios y pagos</li>
  <li>Organización jerárquica por nodos/sectores</li>
</ul>
</details>

<details>
<summary><strong>📡 Monitoreo de Red</strong></summary>
<ul>
  <li>Visualización de estado de nodos, sectores y dispositivos</li>
  <li>Métricas en tiempo real de tráfico y calidad de conexión</li>
  <li>Alertas y notificaciones automáticas</li>
  <li>Gestión de equipos Mikrotik, Ubiquiti y TP-Link Pharos</li>
  <li>Soporte para fibra óptica (en desarrollo)</li>
  <li>Monitoreo vía SNMP</li>
</ul>
</details>

<details>
<summary><strong>🎫 Sistema de Tickets</strong></summary>
<ul>
  <li>Creación y seguimiento de solicitudes de soporte</li>
  <li>Asignación a técnicos con niveles de prioridad</li>
  <li>Historial de comunicaciones</li>
  <li>Métricas de tiempo de resolución</li>
  <li>Base de conocimiento integrada</li>
</ul>
</details>

<details>
<summary><strong>💰 Facturación</strong></summary>
<ul>
  <li>Control de pagos y facturas</li>
  <li>Estados de cuenta por cliente</li>
  <li>Recordatorios automáticos</li>
  <li>Informes financieros</li>
  <li>Integración con Mercado Pago</li>
</ul>
</details>

<details>
<summary><strong>📺 Integración con Jellyfin</strong></summary>
<ul>
  <li>Gestión de cuentas de streaming</li>
  <li>Automatización con JFA-GO</li>
  <li>Control de accesos según plan contratado</li>
  <li>Invitaciones automáticas por correo</li>
</ul>
</details>

<details>
<summary><strong>💬 Comunicaciones Multicanal</strong></summary>
<ul>
  <li>Notificaciones por correo electrónico</li>
  <li>Integración con WhatsApp</li>
  <li>Bot de Telegram para alertas técnicas</li>
  <li>Plantillas personalizables</li>
  <li>Envíos masivos y programados</li>
</ul>
</details>

<details>
<summary><strong>📊 Inventario</strong></summary>
<ul>
  <li>Gestión de equipos y materiales</li>
  <li>Códigos QR para seguimiento</li>
  <li>Control de stock y alertas</li>
  <li>Historial de movimientos</li>
</ul>
</details>

<details>
<summary><strong>🗺️ Integración con Mapas</strong></summary>
<ul>
  <li>OpenStreetMap con Leaflet.js</li>
  <li>Visualización de clientes y antenas</li>
  <li>Geolocalización automática</li>
  <li>Datos de ubicación por IP</li>
</ul>
</details>

<details>
<summary><strong>🔐 Sistema Avanzado de Permisos</strong></summary>
Control de acceso granular basado en roles y permisos específicos para cada módulo y función.
</details>

<details>
<summary><strong>🔍 Búsqueda Global</strong></summary>
<ul>
  <li>Búsqueda unificada en todos los módulos</li>
  <li>Resultados categorizados</li>
  <li>Filtros avanzados</li>
  <li>Autocompletado inteligente</li>
</ul>
</details>

<div id="tecnologías"></div>

## Tecnologías Utilizadas

<table>
  <tr>
    <th>Frontend</th>
    <th>Backend</th>
    <th>Infraestructura</th>
  </tr>
  <tr>
    <td>
      <ul>
        <li>Vue.js 3</li>
        <li>Vuex</li>
        <li>Vue Router</li>
        <li>CSS personalizado</li>
        <li>Responsive Design</li>
        <li>Leaflet.js (mapas)</li>
        <li>Chart.js (gráficos)</li>
      </ul>
    </td>
    <td>
      <ul>
        <li>Node.js</li>
        <li>Express</li>
        <li>SQLite (desarrollo)</li>
        <li>PostgreSQL (producción)</li>
        <li>Sequelize ORM</li>
        <li>JWT Authentication</li>
        <li>Passport.js</li>
      </ul>
    </td>
    <td>
      <ul>
        <li>Docker</li>
        <li>Docker Compose</li>
        <li>Nginx</li>
        <li>Ubuntu Server</li>
        <li>Let's Encrypt</li>
      </ul>
    </td>
  </tr>
</table>

### Integraciones

<table>
  <tr>
    <td><strong>Mikrotik RouterOS API</strong></td>
    <td>Control y monitoreo de routers</td>
  </tr>
  <tr>
    <td><strong>Ubiquiti UNMS/UISP API</strong></td>
    <td>Gestión de equipos Ubiquiti</td>
  </tr>
  <tr>
    <td><strong>TP-Link Pharos</strong></td>
    <td>Monitoreo de CPEs vía SNMP</td>
  </tr>
  <tr>
    <td><strong>Jellyfin API</strong></td>
    <td>Integración con servidor de streaming</td>
  </tr>
  <tr>
    <td><strong>JFA-GO</strong></td>
    <td>Automatización de invitaciones para Jellyfin</td>
  </tr>
  <tr>
    <td><strong>WhatsApp Web.js</strong></td>
    <td>Comunicación por WhatsApp</td>
  </tr>
  <tr>
    <td><strong>Telegram Bot API</strong></td>
    <td>Notificaciones técnicas</td>
  </tr>
  <tr>
    <td><strong>SendGrid</strong></td>
    <td>Envío de correos electrónicos</td>
  </tr>
  <tr>
    <td><strong>Mercado Pago API</strong></td>
    <td>Procesamiento de pagos en Latinoamérica</td>
  </tr>
  <tr>
    <td><strong>PayPal API</strong></td>
    <td>Procesamiento de pagos internacionales</td>
  </tr>
  <tr>
    <td><strong>CFDI Generator</strong></td>
    <td>Facturación electrónica para México (SAT)</td>
  </tr>
  <tr>
    <td><strong>Fibra Óptica**</strong></td>
    <td>Soporte para ONT/OLT (en desarrollo)</td>
  </tr>
</table>

### Bibliotecas y Dependencias

<details>
<summary>Bibliotecas Backend Instaladas</summary>

**Comunicaciones:**
- `nodemailer` - Envío de emails
- `whatsapp-web.js` - WhatsApp integration
- `telegraf` - Telegram Bot API

**APIs de Red:**
- `routeros` - Mikrotik RouterOS API
- `axios` - Cliente HTTP para APIs REST
- `snmp-native` - Monitoreo SNMP
- `net-snmp` - SNMP mejorado para PON/fibra

**Chat y Tiempo Real:**
- `socket.io` - WebSockets para chat en tiempo real
- `socket.io-client` - Cliente WebSocket

**Utilidades:**
- `pdfkit` - Generación de PDFs
- `qrcode` - Generación de códigos QR
- `speakeasy` - Two-Factor Authentication
- `moment` - Manejo de fechas
- `lodash` - Utilidades de JavaScript

**Google APIs:**
- `googleapis` - Google Calendar, Drive APIs
- `firebase-admin` - Firebase Cloud Messaging
- `@google-cloud/storage` - Google Cloud Storage

**Monitoreo:**
- `winston` - Sistema de logging
- `morgan` - HTTP request logging
- `node-cron` - Tareas programadas
- `express-rate-limit` - Limitación de requests

**Pagos y Facturación:**
- `mercadopago` - MercadoPago SDK
- `@paypal/checkout-server-sdk` - PayPal SDK
- `cfdi-generator` - Facturación electrónica México (SAT)

**Fibra Óptica:**
- `node-ssh` - Conexión SSH a ONT/OLT
- `node-telnet-client` - Conexión Telnet legacy
- `net-snmp` - Monitoreo SNMP para equipos PON

</details>

<div id="estado-del-proyecto"></div>

## Estado del Proyecto

El proyecto se encuentra en desarrollo activo. A continuación, se detalla el estado de las diferentes funcionalidades:

### Funcionalidades Implementadas:
- ✅ Sistema de autenticación con JWT
- ✅ Gestión básica de roles y permisos
- ✅ Gestión de nodos y sectores (Módulo de Red)
- ✅ Estructura base para gestión de tickets
- ✅ Base para gestión de clientes
- ✅ Instalación de todas las librerías necesarias
- ✅ APIs de pago (MercadoPago, PayPal) y facturación (CFDI)
- ✅ Librerías para chat en tiempo real (Socket.io)
- ✅ Soporte básico para fibra óptica (librerías instaladas)

### En Desarrollo:
- 🔄 Gestión completa de dispositivos de red (Mikrotik, Ubiquiti, TP-Link)
- 🔄 Visualización de métricas y estado de dispositivos
- 🔄 Administración completa de clientes con datos detallados
- 🔄 Mapa interactivo de nodos, sectores y clientes
- 🔄 Integración real con APIs de comunicación
- 🔄 Sistema de inventario con códigos QR
- 🔄 Implementación de pagos con MercadoPago y PayPal
- 🔄 Sistema de facturación electrónica (CFDI)
- 🔄 Chat en tiempo real con Socket.io
- 🔄 Soporte para fibra óptica (ONT/OLT)

### Pendientes:
- ⭕ Módulo de facturación y pagos (interfaces de usuario)
- ⭕ Gestión avanzada de usuarios y permisos del sistema
- ⭕ Integración con Jellyfin para servicios de streaming
- ⭕ Dashboard con indicadores clave
- ⭕ Sistema de notificaciones
- ⭕ Búsqueda global avanzada

<div id="instalación"></div>

## Instalación

### Requisitos Previos

- **Desarrollo**: Node.js 16+, SQLite
- **Producción**: Ubuntu Server 20.04+, Docker, Docker Compose, PostgreSQL

### Instalación para Desarrollo

<details>
<summary>Instrucciones detalladas para desarrollo</summary>

1. **Clonar el repositorio**
```bash
git clone https://github.com/MterEcko/ISP-Prueba.git
cd ISP-Prueba
```

2. **Configurar el Backend**
```bash
cd backend
yarn install
cp .env.example .env
# Editar .env con la configuración apropiada
```

3. **Configurar el Frontend**
```bash
cd ../frontend
yarn install
```

4. **Iniciar en Modo Desarrollo**
```bash
# Terminal 1: Iniciar el backend
cd backend
yarn dev

# Terminal 2: Iniciar el frontend
cd frontend
yarn serve
```

5. **Acceder a la aplicación**
La aplicación estará disponible en http://localhost:8080

### Cambio desde npm a yarn

Si tienes problemas con npm en Windows, puedes cambiar a yarn:
```bash
# Instalar yarn globalmente
npm install -g yarn

# Eliminar node_modules y package-lock.json
rm -rf node_modules package-lock.json

# Instalar dependencias con yarn
yarn install
```

</details>

### Instalación para Producción

<details>
<summary>Instrucciones detalladas para producción</summary>

1. **Clonar el repositorio**
```bash
git clone https://github.com/MterEcko/ISP-Prueba.git
cd ISP-Prueba
```

2. **Configurar el Entorno**
```bash
cp .env.example .env
# Editar .env con la configuración de producción
```

3. **Iniciar con Docker Compose**
```bash
docker-compose up -d
```

4. **Configurar Nginx y SSL**
```bash
sudo certbot --nginx -d tudominio.com
```

5. **Acceder a la aplicación**
La aplicación estará disponible en https://tudominio.com
</details>

<div id="uso"></div>

## Uso

### Acceso Inicial

- **Usuario predeterminado**: admin
- **Contraseña predeterminada**: admin123

⚠️ Se recomienda cambiar la contraseña inmediatamente después del primer inicio de sesión

### Módulos Principales

- **Dashboard**: Visualización general del sistema
- **Clientes**: Gestión completa de usuarios y servicios
- **Red**: Monitoreo y configuración de equipos
- **Tickets**: Sistema de soporte técnico
- **Inventario**: Control de equipos y materiales
- **Facturación**: Control de pagos y facturación
- **Jellyfin**: Gestión de streaming
- **Comunicaciones**: Mensajería multicanal
- **Configuración**: Ajustes generales del sistema

<div id="estructura"></div>

## Estructura del Proyecto

```
ISP-Sistema-Integral/
├── backend/                # API y servicios
│   ├── src/
│   │   ├── controllers/    # Lógica de negocio
│   │   ├── models/         # Modelos Sequelize
│   │   ├── routes/         # Rutas API
│   │   ├── services/       # Integraciones externas
│   │   ├── middleware/     # Autenticación y permisos
│   │   ├── apis/           # Clientes API personalizados
│   │   │   ├── uisp/       # Cliente UISP personalizado
│   │   │   └── mikrotik/   # Cliente RouterOS
│   │   └── utils/          # Utilidades
│   └── database.sqlite     # SQLite para desarrollo
├── frontend/               # App Vue.js
│   ├── src/
│   │   ├── assets/         # Recursos estáticos
│   │   ├── components/     # Componentes Vue
│   │   ├── services/       # Comunicación con API
│   │   ├── store/          # Vuex
│   │   ├── views/          # Páginas principales
│   │   └── router/         # Rutas
│   └── public/             # Archivos estáticos
├── docker/                 # Configuración Docker
│   ├── nginx/              # Configuración Nginx
│   └── docker-compose.yml  # Orquestación
└── docs/                   # Documentación
    ├── mermaid/            # Diagramas de arquitectura
    └── mockups/            # Mockups de interfaces
```

### Estructura de Rutas API

<details>
<summary>Endpoints API</summary>

#### Autenticación
- `POST /api/auth/signup` - Registro de usuario
- `POST /api/auth/signin` - Inicio de sesión

#### Clientes
- `GET /api/clients` - Obtener lista de clientes
- `POST /api/clients` - Crear cliente
- `GET /api/clients/:id` - Obtener cliente por ID
- `PUT /api/clients/:id` - Actualizar cliente
- `PATCH /api/clients/:id/status` - Cambiar estado del cliente
- `DELETE /api/clients/:id` - Eliminar cliente

#### Documentos de Cliente
- `GET /api/clients/:clientId/documents` - Obtener documentos de un cliente
- `POST /api/clients/:clientId/documents` - Subir documento
- `GET /api/documents/:id/download` - Descargar documento
- `DELETE /api/documents/:id` - Eliminar documento

#### Red - Nodos
- `GET /api/nodes` - Obtener todos los nodos
- `POST /api/nodes` - Crear nodo
- `GET /api/nodes/:id` - Obtener nodo por ID
- `PUT /api/nodes/:id` - Actualizar nodo
- `DELETE /api/nodes/:id` - Eliminar nodo

#### Red - Sectores
- `GET /api/sectors` - Obtener todos los sectores
- `POST /api/sectors` - Crear sector
- `GET /api/sectors/:id` - Obtener sector por ID
- `PUT /api/sectors/:id` - Actualizar sector
- `DELETE /api/sectors/:id` - Eliminar sector

#### Dispositivos
- `GET /api/devices` - Obtener todos los dispositivos
- `POST /api/devices` - Crear dispositivo
- `GET /api/devices/:id` - Obtener dispositivo por ID
- `PUT /api/devices/:id` - Actualizar dispositivo
- `DELETE /api/devices/:id` - Eliminar dispositivo
- `GET /api/devices/:id/status` - Verificar estado del dispositivo
- `GET /api/devices/:id/metrics` - Obtener métricas del dispositivo
- `POST /api/devices/:id/actions` - Ejecutar acción en el dispositivo

#### Tickets
- `GET /api/tickets` - Obtener todos los tickets
- `POST /api/tickets` - Crear ticket
- `GET /api/tickets/:id` - Obtener ticket por ID
- `PUT /api/tickets/:id` - Actualizar ticket
- `DELETE /api/tickets/:id` - Eliminar ticket

#### Comentarios de Tickets
- `GET /api/tickets/:ticketId/comments` - Obtener comentarios de un ticket
- `POST /api/tickets/:ticketId/comments` - Agregar comentario a un ticket
- `PUT /api/comments/:commentId` - Actualizar comentario
- `DELETE /api/comments/:commentId` - Eliminar comentario

#### Comunicaciones
- `POST /api/communications/email` - Enviar email
- `POST /api/communications/whatsapp` - Enviar WhatsApp
- `POST /api/communications/telegram` - Enviar Telegram
- `GET /api/communications/templates` - Obtener plantillas

#### Inventario
- `GET /api/inventory` - Obtener inventario
- `POST /api/inventory` - Agregar elemento
- `PUT /api/inventory/:id` - Actualizar elemento
- `DELETE /api/inventory/:id` - Eliminar elemento
- `POST /api/inventory/:id/qr` - Generar código QR

#### Pagos y Facturación
- `GET /api/billing/invoices` - Obtener facturas
- `POST /api/billing/invoices` - Crear factura
- `POST /api/billing/payments` - Registrar pago
- `GET /api/billing/payments/:id` - Estado de pago
</details>

<div id="contribución"></div>

## Contribución

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Añadir funcionalidad X'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

### Directrices de Contribución

- Sigue el estilo de código establecido
- Escribe pruebas para nuevas funcionalidades
- Mantén las dependencias al mínimo
- Documenta el código nuevo
- Usa `yarn` en lugar de `npm` para gestión de dependencias

## Próximos Pasos

Los objetivos inmediatos para el desarrollo incluyen:

1. **Integración completa con dispositivos de red**:
   - Implementar clientes personalizados para Ubiquiti UISP
   - Desarrollar sistema de monitoreo SNMP para TP-Link
   - Mostrar métricas de rendimiento en tiempo real
   - Control remoto de equipos Mikrotik

2. **Funcionalidades de comunicación**:
   - Implementar sistema de plantillas avanzado
   - Configurar bot de Telegram con comandos personalizados
   - Desarrollar sistema de notificaciones inteligentes
   - Integrar WhatsApp Business API oficial

3. **Mejoras en la gestión de clientes**:
   - Agregar información detallada de conectividad (IP, usuario PPPoE)
   - Mostrar consumo actual de datos y estadísticas
   - Implementar herramientas de diagnóstico remoto
   - Desarrollar sistema de facturación automática

4. **Visualización geográfica avanzada**:
   - Implementar mapa interactivo completo con Leaflet.js
   - Mostrar coberturas aproximadas de sectores
   - Integrar datos de clima para análisis de interferencias
   - Herramientas de planificación para nuevas instalaciones

5. **Sistema avanzado de inventario**:
   - Implementar códigos QR para seguimiento de equipos
   - Sistema de alertas por stock bajo
   - Integración con órdenes de trabajo
   - Control de garantías y mantenimientos

6. **Análisis y reportes**:
   - Dashboard con KPIs personalizables
   - Reportes automáticos por email
   - Análisis predictivo de fallas
   - Métricas de calidad de servicio

## Licencia

Este proyecto está licenciado bajo la [Licencia MIT](LICENSE.md).

## Contacto

- Desarrolladores: Contribuidores de ISP-Prueba
- GitHub: [https://github.com/MterEcko/ISP-Prueba](https://github.com/MterEcko/ISP-Prueba)

<hr>

<p align="center">
  Desarrollado con ❤️ para la gestión eficiente de proveedores de internet
</p>
