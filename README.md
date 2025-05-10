Sistema Integral para Proveedores de Internet (ISP)
<div align="center">
  <img src="frontend/src/assets/logo.png" alt="ISP Sistema Logo" width="200">
  <br>
  <br>
  <p>
    <strong>Sistema completo para la gestión integral de proveedores de servicios de internet</strong>
  </p>
  <p>
    <a href="#características">Características</a> •
    <a href="#tecnologías">Tecnologías</a> •
    <a href="#instalación">Instalación</a> •
    <a href="#uso">Uso</a> •
    <a href="#capturas-de-pantalla">Capturas</a> •
    <a href="#contribución">Contribución</a>
  </p>
</div>
Descripción
Sistema completo para gestión de proveedores de servicios de internet (ISP), con funcionalidades integradas para administración de clientes, monitoreo de red, gestión de tickets, facturación y servicios de streaming.
<div id="características"></div>
Funcionalidades Principales
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
Tecnologías Utilizadas
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
Integraciones
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
<div id="instalación"></div>
Estructura del Proyecto

ISP-Sistema-Integral/
├── backend/               # API y servicios del backend
│   ├── src/
│   │   ├── controllers/   # Controladores de lógica de negocio
│   │   ├── models/        # Modelos de datos (Sequelize)
│   │   ├── routes/        # Definición de rutas API
│   │   ├── services/      # Servicios para integraciones externas
│   │   ├── middleware/    # Middleware para autenticación y permisos
│   │   └── utils/         # Utilidades comunes
│   └── database.sqlite    # Base de datos SQLite para desarrollo
├── frontend/              # Aplicación Vue.js
│   ├── src/
│   │   ├── assets/        # Recursos estáticos (imágenes, CSS)
│   │   ├── components/    # Componentes Vue reutilizables
│   │   ├── services/      # Servicios para comunicación con API
│   │   ├── store/         # Estado global con Vuex
│   │   ├── views/         # Componentes de página principales
│   │   └── router/        # Configuración de rutas
│   └── public/            # Archivos públicos estáticos
└── docker/                # Configuración de Docker
    ├── nginx/             # Configuración de Nginx
    └── docker-compose.yml # Orquestación de servicios


Instalación
Requisitos Previos

Desarrollo: Node.js 16+, SQLite
Producción: Ubuntu Server 20.04+, Docker, Docker Compose

Instalación para Desarrollo
<details>
<summary>Instrucciones detalladas para desarrollo</summary>

Clonar el repositorio
bashgit clone https://github.com/tu-usuario/ISP-Sistema-Integral.git
cd ISP-Sistema-Integral

Configurar el Backend
bashcd backend
npm install
cp .env.example .env
# Editar .env con la configuración apropiada

Configurar el Frontend
bashcd ../frontend
npm install

Iniciar en Modo Desarrollo
bash# Terminal 1: Iniciar el backend
cd backend
npm run dev

# Terminal 2: Iniciar el frontend
cd frontend
npm run serve

Acceder a la aplicación
La aplicación estará disponible en http://localhost:8080

</details>
Instalación para Producción
<details>
<summary>Instrucciones detalladas para producción</summary>

Clonar el repositorio
bashgit clone https://github.com/tu-usuario/ISP-Sistema-Integral.git
cd ISP-Sistema-Integral

Configurar el Entorno
bashcp .env.example .env
# Editar .env con la configuración de producción

Iniciar con Docker Compose
bashdocker-compose up -d

Configurar Nginx y SSL
bashsudo certbot --nginx -d tudominio.com

Acceder a la aplicación
La aplicación estará disponible en https://tudominio.com

</details>
<div id="uso"></div>
Uso
Acceso Inicial

Usuario predeterminado: admin
Contraseña predeterminada: admin123
Se recomienda cambiar la contraseña inmediatamente después del primer inicio de sesión

Módulos Principales

Dashboard: Visualización general del sistema
Clientes: Gestión completa de usuarios y servicios
Red: Monitoreo y configuración de equipos
Tickets: Sistema de soporte técnico
Facturación: Control de pagos y facturación
Configuración: Ajustes generales del sistema

<div id="capturas-de-pantalla"></div>
Capturas de Pantalla
<div align="center">
  <img src="docs/images/dashboard.png" alt="Dashboard" width="45%">
  <img src="docs/images/clients.png" alt="Gestión de Clientes" width="45%">
  <br><br>
  <img src="docs/images/network.png" alt="Monitoreo de Red" width="45%">
  <img src="docs/images/tickets.png" alt="Sistema de Tickets" width="45%">
</div>
<div id="contribución"></div>
Contribución
Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

Fork del repositorio
Crea una rama para tu funcionalidad (git checkout -b feature/amazing-feature)
Haz commit de tus cambios (git commit -m 'Añadir funcionalidad X')
Push a la rama (git push origin feature/amazing-feature)
Abre un Pull Request

Directrices de Contribución

Sigue el estilo de código establecido
Escribe pruebas para nuevas funcionalidades
Mantén las dependencias al mínimo
Documenta el código nuevo

Licencia
Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo LICENSE para más detalles.
Contacto
Tu Nombre - @tu_twitter - correo@ejemplo.com
Link del Proyecto: https://github.com/tu-usuario/ISP-Sistema-Integral
Agradecimientos
<ul>
  <li>Nombre de Contribuyente 1</li>
  <li>Nombre de Contribuyente 2</li>
  <li>Vue.js community</li>
  <li>Node.js community</li>
</ul>
<hr>
<p align="center">
  Desarrollado con ❤️ para la gestión eficiente de proveedores de internet
</p>
