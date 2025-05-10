# Sistema Integral para Proveedores de Internet (ISP)

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

Sistema completo para gestión de proveedores de servicios de internet (ISP), con funcionalidades integradas para administración de clientes, monitoreo de red, gestión de tickets, facturación y servicios de streaming.

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
  <li>Gestión de equipos Mikrotik y Ubiquiti</li>
</ul>
</details>

<details>
<summary><strong>🎫 Sistema de Tickets</strong></summary>
<ul>
  <li>Creación y seguimiento de solicitudes de soporte</li>
  <li>Asignación a técnicos con niveles de prioridad</li>
  <li>Historial de comunicaciones</li>
  <li>Métricas de tiempo de resolución</li>
</ul>
</details>

<details>
<summary><strong>💰 Facturación</strong></summary>
<ul>
  <li>Control de pagos y facturas</li>
  <li>Estados de cuenta por cliente</li>
  <li>Recordatorios automáticos</li>
  <li>Informes financieros</li>
</ul>
</details>

<details>
<summary><strong>📺 Integración con Jellyfin</strong></summary>
<ul>
  <li>Gestión de cuentas de streaming</li>
  <li>Automatización con JFA-GO</li>
  <li>Control de accesos según plan contratado</li>
</ul>
</details>

<details>
<summary><strong>🔐 Sistema Avanzado de Permisos</strong></summary>
Control de acceso granular basado en roles y permisos específicos para cada módulo y función.
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
      </ul>
    </td>
    <td>
      <ul>
        <li>Docker</li>
        <li>Docker Compose</li>
        <li>Nginx</li>
        <li>Ubuntu Server</li>
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
    <td><strong>Jellyfin API</strong></td>
    <td>Integración con servidor de streaming</td>
  </tr>
  <tr>
    <td><strong>JFA-GO</strong></td>
    <td>Automatización de invitaciones para Jellyfin</td>
  </tr>
</table>

<div id="estado-del-proyecto"></div>

## Estado del Proyecto

El proyecto se encuentra en desarrollo activo. A continuación, se detalla el estado de las diferentes funcionalidades:

### Funcionalidades Implementadas:
- ✅ Sistema de autenticación con JWT
- ✅ Gestión básica de roles y permisos
- ✅ Gestión de nodos y sectores (Módulo de Red)
- ✅ Estructura base para gestión de tickets
- ✅ Base para gestión de clientes

### En Desarrollo:
- 🔄 Gestión completa de dispositivos de red (Mikrotik, Ubiquiti)
- 🔄 Visualización de métricas y estado de dispositivos
- 🔄 Administración completa de clientes con datos detallados (IP, usuario PPPoE, consumo, etc.)
- 🔄 Mapa interactivo de nodos, sectores y clientes basado en geolocalización

### Pendientes:
- ⭕ Módulo de facturación y pagos
- ⭕ Gestión avanzada de usuarios y permisos del sistema
- ⭕ Integración con Jellyfin para servicios de streaming
- ⭕ Dashboard con indicadores clave
- ⭕ Sistema de notificaciones

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
npm install
cp .env.example .env
# Editar .env con la configuración apropiada
```

3. **Configurar el Frontend**
```bash
cd ../frontend
npm install
```

4. **Iniciar en Modo Desarrollo**
```bash
# Terminal 1: Iniciar el backend
cd backend
npm run dev

# Terminal 2: Iniciar el frontend
cd frontend
npm run serve
```

5. **Acceder a la aplicación**
La aplicación estará disponible en http://localhost:8080
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
- **Facturación**: Control de pagos y facturación
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
└── docker/                 # Configuración Docker
    ├── nginx/              # Configuración Nginx
    └── docker-compose.yml  # Orquestación
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

## Próximos Pasos

Los objetivos inmediatos para el desarrollo incluyen:

1. **Integración completa con dispositivos de red**:
   - Implementar monitoreo en tiempo real
   - Mostrar métricas de rendimiento de dispositivos
   - Control remoto de equipos Mikrotik y Ubiquiti

2. **Mejoras en la gestión de clientes**:
   - Agregar información detallada de conectividad (IP, usuario PPPoE, contraseña)
   - Mostrar consumo actual de datos
   - Visualizar dispositivos conectados a las antenas de clientes
   - Información de subredes y MACs

3. **Visualización geográfica**:
   - Implementar mapa interactivo para visualizar nodos, sectores y clientes
   - Mostrar coberturas aproximadas de sectores
   - Identificar visualmente problemas de conexión

4. **Sistema de administración de usuarios**:
   - Interfaz para creación de cuentas administrativas
   - Gestión avanzada de permisos
   - Registros de actividad

## Licencia

Este proyecto está licenciado bajo la [Licencia MIT](LICENSE.md).

## Contacto

- Desarrolladores: Contribuidores de ISP-Prueba
- GitHub: [https://github.com/MterEcko/ISP-Prueba](https://github.com/MterEcko/ISP-Prueba)

<hr>

<p align="center">
  Desarrollado con ❤️ para la gestión eficiente de proveedores de internet
</p>
