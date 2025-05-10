Sistema Integral para Proveedores de Internet (ISP)
Descripción
Sistema Integral para gestión completa de Proveedores de Servicios de Internet (ISP), que incluye administración de clientes, monitoreo de red, facturación, tickets de soporte y integración con servicios de streaming (Jellyfin). Esta plataforma está diseñada para unificar todas las operaciones de un ISP en una única aplicación web, optimizando procesos y mejorando la experiencia tanto de administradores como de clientes.
Características

Gestión de Clientes: Administración completa de clientes, con datos personales, coordenadas geográficas, documentos y servicios contratados.
Monitoreo de Red: Visualización del estado de equipos Mikrotik y Ubiquiti, métricas de tráfico y alertas.
Sistema de Tickets: Gestión de soporte técnico con asignación, seguimiento y resolución de incidencias.
Facturación: Control de pagos, planes de servicio y estados de cuenta.
Inventario: Gestión de equipos y materiales, con seguimiento de ubicación y estado.
Integración con Jellyfin: Administración de usuarios de streaming vinculados a clientes.
Comunicaciones Multicanal: Notificaciones vía email, Telegram y WhatsApp.
Dashboard: Panel de control con métricas e indicadores clave.

Tecnologías
Frontend

Vue.js 3: Framework progresivo de JavaScript
Vue Router: Manejo de rutas y navegación
Vuex: Gestión de estado global
CSS personalizado: Diseño responsivo sin frameworks externos

Backend

Node.js: Entorno de ejecución para JavaScript
Express: Framework web para API RESTful
Sequelize: ORM para bases de datos
JWT: Autenticación mediante tokens

Base de Datos

SQLite (desarrollo): Base de datos ligera para entorno local
PostgreSQL (producción): Base de datos relacional para entorno productivo
InfluxDB (opcional): Para almacenamiento de métricas temporales

Infraestructura

Docker: Contenerización de servicios
Nginx: Servidor web y proxy inverso

Estructura del Proyecto
ISP-Sistema-Integral/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Controladores de la API
│   │   ├── models/          # Modelos de Sequelize
│   │   ├── routes/          # Rutas de la API
│   │   ├── services/        # Servicios para APIs externas
│   │   ├── middleware/      # Middleware (auth, logs)
│   │   ├── utils/           # Utilidades comunes
│   │   ├── config/          # Configuraciones
│   │   └── index.js         # Punto de entrada
│   ├── .env                 # Variables de entorno
│   ├── database.sqlite      # Base de datos SQLite para desarrollo
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/          # Recursos estáticos
│   │   ├── components/      # Componentes Vue reutilizables
│   │   ├── router/          # Configuración de rutas
│   │   ├── services/        # Servicios API
│   │   ├── store/           # Estado global (Vuex)
│   │   ├── views/           # Componentes de página
│   │   ├── App.vue          # Componente principal
│   │   └── main.js          # Punto de entrada
│   └── package.json
├── docker-compose.yml       # Configuración de contenedores
├── .gitignore
└── README.md
Requisitos

Node.js v14+
npm o yarn
Docker y Docker Compose (opcional, para producción)
Servidor Ubuntu (para despliegue)

Instalación para Desarrollo

Clonar el repositorio

bashgit clone https://github.com/tu-usuario/ISP-Sistema-Integral.git
cd ISP-Sistema-Integral

Configurar el Backend

bashcd backend
npm install
cp .env.example .env  # Y editar según corresponda

Configurar el Frontend

bashcd ../frontend
npm install

Ejecutar en Desarrollo

Backend:
bashcd backend
npm run dev
Frontend:
bashcd frontend
npm run serve
El frontend estará disponible en http://localhost:8080 y la API en http://localhost:3000.
Despliegue en Producción
Usando Docker (Recomendado)

Configurar variables de entorno

bashcp .env.example .env  # Y editar para producción

Construir y levantar contenedores

bashdocker-compose build
docker-compose up -d

Configurar Nginx como proxy inverso

Ver documentación en /docs/nginx-config.md
Instalación Manual
Ver instrucciones detalladas en /docs/manual-deploy.md
Configuración de Integración con Jellyfin

Asegúrese de tener instalado Jellyfin en su servidor
Configure una API Key en el panel de administración de Jellyfin
En el panel de configuración del ISP, vaya a la sección "Integraciones"
Ingrese la URL y la API Key de Jellyfin

Mantenimiento
Respaldos
Los respaldos se configuran automáticamente con los scripts en /scripts/backup.sh. Por defecto, se realizan diariamente a las 2 AM.
Actualizaciones
bashgit pull
docker-compose down
docker-compose build
docker-compose up -d
Personalización

Tema: El sistema incluye temas claro y oscuro, configurables por usuario
Logo: Puede cambiarse desde el panel de configuración
Plantillas de correo: Editables desde el apartado de comunicaciones

Contribución

Haz un Fork del repositorio
Crea una rama para tu característica (git checkout -b feature/nueva-caracteristica)
Haz commit de tus cambios (git commit -am 'Agrega nueva característica')
Haz push a la rama (git push origin feature/nueva-caracteristica)
Crea un nuevo Pull Request

Licencia
Este proyecto está licenciado bajo MIT License.
Contacto
Para soporte o consultas:

Email: soporte@tuisp.com
Sitio web: https://tuisp.com


Desarrollado por [Tu Nombre/Empresa]
