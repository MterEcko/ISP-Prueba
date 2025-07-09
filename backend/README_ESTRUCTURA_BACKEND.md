# Documentación de la Estructura del Backend del Sistema ISP (Actualizado)

Este documento detalla la estructura de carpetas y archivos del backend para el Sistema ISP, incluyendo las nuevas integraciones y módulos de servicios. El backend está diseñado para ser modular y escalable, utilizando Node.js con Express y Sequelize como ORM principal (aunque los archivos generados son simulaciones y requerirán la implementación real de las librerías y lógica de negocio).

## Estructura General del Proyecto (Backend)

La estructura principal del backend se organiza de la siguiente manera (asumiendo que la raíz del backend es `isp_backend_final`):

```
isp_backend_final/
├── src/
│   ├── config/                 # Archivos de configuración (base de datos, logging, etc.)
│   │   ├── database.js           # Configuración de Sequelize y conexión a BD (Existente)
│   │   ├── apiConfig.js          # Configuración de API (Existente)
│   │   ├── winstonConfig.js      # NUEVO: Configuración de logging con Winston (Simulado)
│   │   ├── morganConfig.js       # NUEVO: Configuración de logging HTTP con Morgan (Simulado)
│   │   ├── nodeCronJobs.js       # NUEVO: Definición de tareas programadas (Simulado)
│   │   └── rateLimitConfig.js    # NUEVO: Configuración de limitación de peticiones (Simulado)
│   │
│   ├── controllers/            # Controladores para manejar la lógica de las rutas (Existente)
│   │   ├── authController.js
│   │   ├── usuariosController.js
│   │   ├── clientesController.js
│   │   ├── rolesController.js
│   │   ├── permisosController.js
│   │   ├── planesServicioController.js
│   │   ├── serviciosClienteController.js
│   │   ├── dispositivosRedController.js
│   │   ├── nodosController.js
│   │   ├── sectoresController.js
│   │   ├── inventarioController.js
│   │   ├── ubicacionesInventarioController.js
│   │   ├── metricasRedController.js
│   │   ├── credencialesDispositivoController.js
│   │   ├── documentosClienteController.js
│   │   ├── plantillasMensajeController.js
│   │   ├── departamentosController.js
│   │   └── equiposFibraOpticaController.js # Para la gestión de fibra óptica
│   │
│   ├── migrations/             # Migraciones de Sequelize para la base de datos (Existente)
│   │   └── (Varias migraciones ...)
│   │
│   ├── models/                 # Modelos de Sequelize para la base de datos (Existente)
│   │   ├── index.js              # Inicialización de modelos Sequelize
│   │   ├── Cliente.js
│   │   ├── Usuario.js
│   │   ├── Rol.js
│   │   ├── Permiso.js
│   │   ├── RolPermisos.js
│   │   ├── PlanServicio.js
│   │   ├── ServicioCliente.js
│   │   ├── Departamento.js
│   │   ├── DispositivoRed.js
│   │   ├── Nodo.js
│   │   ├── Sector.js
│   │   ├── EquipoFibraOptica.js  # Modelo para equipos de fibra óptica
│   │   ├── Inventario.js
│   │   ├── UbicacionInventario.js
│   │   ├── MetricasRed.js
│   │   ├── CredencialesDispositivo.js
│   │   ├── DocumentosCliente.js
│   │   ├── PlantillasMensaje.js
│   │   ├── TransaccionPago.js    # NUEVO: Modelo para transacciones de pago
│   │   └── Factura.js            # NUEVO: Modelo para facturas
│   │
│   ├── routes/                 # Definición de rutas de la API (Existente)
│   │   ├── index.js              # Enrutador principal
│   │   └── (Varias rutas ...)
│   │
│   ├── services/               # Lógica de negocio y servicios reutilizables
│   │   ├── equiposFibraOpticaService.js # Servicio para fibra óptica (Existente)
│   │   └── integrations/         # NUEVA CARPETA: Servicios para integraciones con APIs externas
│   │       ├── mercadoPagoService.js # NUEVO: Integración con MercadoPago (Simulado)
│   │       ├── paypalService.js      # NUEVO: Integración con PayPal (Simulado)
│   │       ├── facturacionService.js # NUEVO: Integración para CFDI (Simulado)
│   │       ├── telegramService.js    # NUEVO: Integración con Telegram (Simulado)
│   │       ├── whatsappService.js    # NUEVO: Integración con WhatsApp (Simulado)
│   │       ├── pdfkitService.js      # NUEVO: Servicio para generar PDFs con pdfkit (Simulado)
│   │       ├── qrcodeService.js      # NUEVO: Servicio para generar QRs con qrcode (Simulado)
│   │       ├── googleCalendarService.js # NUEVO: Integración con Google Calendar (Simulado)
│   │       ├── googleDriveService.js   # NUEVO: Integración con Google Drive (Simulado)
│   │       ├── firebaseCloudMessagingService.js # NUEVO: Integración con FCM (Simulado)
│   │       ├── googleCloudStorageService.js # NUEVO: Integración con GCS (Simulado)
│   │       └── twoFactorAuthService.js # NUEVO: Servicio para 2FA con Speakeasy (Simulado)
│   │
│   └── utils/                  # Utilidades generales (helpers, etc.)
│       └── (Archivos de utilidades ...)
│
├── package.json                # Dependencias y scripts del proyecto
├── .sequelizerc                # Configuración de Sequelize CLI
└── README_ESTRUCTURA_BACKEND.md # Este archivo
```

## Descripción de Nuevos Módulos y Archivos

A continuación, se describen los nuevos módulos y archivos añadidos para las integraciones y funcionalidades solicitadas. **Es importante notar que estos archivos contienen una estructura y lógica simulada. Deberás instalar las librerías correspondientes y completar la implementación con la lógica real y las credenciales/configuraciones necesarias.**

### 1. Modelos Adicionales (`src/models/`)

*   **`TransaccionPago.js`**: Modelo Sequelize para registrar las transacciones de pago realizadas a través de diferentes pasarelas.
*   **`Factura.js`**: Modelo Sequelize para almacenar la información de las facturas generadas, incluyendo su estado y relación con los pagos y CFDI.

### 2. Servicios de Integraciones (`src/services/integrations/`)

Esta nueva carpeta contiene servicios dedicados a interactuar con APIs externas y librerías específicas:

*   **`mercadoPagoService.js`**: Simula la lógica para crear preferencias de pago, consultar pagos y manejar notificaciones IPN de MercadoPago.
*   **`paypalService.js`**: Simula la lógica para crear órdenes, capturar pagos y consultar estados de órdenes en PayPal.
*   **`facturacionService.js`**: Simula la lógica para generar, cancelar y consultar el estado de CFDI (facturas electrónicas mexicanas), asumiendo el uso de una librería como `cfdi-generator` y un PAC.
*   **`telegramService.js`**: Simula el envío de mensajes y notificaciones a través de la API de Telegram Bot.
*   **`whatsappService.js`**: Simula el envío de mensajes de texto y plantillas a través de la API de WhatsApp Business (Cloud API o librerías como `whatsapp-web.js`).
*   **`pdfkitService.js`**: Simula la generación de documentos PDF utilizando una librería como `pdfkit`.
*   **`qrcodeService.js`**: Simula la generación de códigos QR (como archivo o Data URL) utilizando una librería como `qrcode`.
*   **`googleCalendarService.js`**: Simula la interacción con la API de Google Calendar para listar y crear eventos.
*   **`googleDriveService.js`**: Simula la interacción con la API de Google Drive para listar, subir y descargar archivos.
*   **`firebaseCloudMessagingService.js`**: Simula el envío de notificaciones push a dispositivos y temas mediante Firebase Cloud Messaging (FCM).
*   **`googleCloudStorageService.js`**: Simula la interacción con Google Cloud Storage para subir, descargar y listar archivos en buckets.
*   **`twoFactorAuthService.js`**: Simula la generación de secretos y verificación de tokens para la Autenticación de Dos Factores (2FA) usando una librería como `speakeasy`.

### 3. Configuración (`src/config/`)

Se han añadido archivos de configuración para módulos de logging, monitoreo y seguridad:

*   **`winstonConfig.js`**: Simula la configuración de Winston para un sistema de logging robusto, con diferentes transportes (archivos, consola) y niveles.
*   **`morganConfig.js`**: Simula la configuración del middleware Morgan para el logging de peticiones HTTP, integrado con el stream de Winston.
*   **`nodeCronJobs.js`**: Simula la definición y programación de tareas periódicas (cron jobs) utilizando una librería como `node-cron`. Incluye ejemplos de tareas comunes.
*   **`rateLimitConfig.js`**: Simula la configuración del middleware `express-rate-limit` para proteger la API contra ataques de fuerza bruta o abuso, definiendo límites globales y específicos para rutas sensibles.

## Próximos Pasos y Consideraciones

1.  **Instalación de Dependencias**: Revisa cada archivo de servicio y configuración simulado para identificar las librerías necesarias (e.g., `mercadopago`, `@paypal/checkout-server-sdk`, `node-telegram-bot-api`, `whatsapp-web.js` o cliente de Facebook Graph API, `pdfkit`, `qrcode`, `googleapis`, `firebase-admin`, `@google-cloud/storage`, `speakeasy`, `winston`, `morgan`, `node-cron`, `express-rate-limit`). Deberás añadirlas a tu `package.json` e instalarlas (`npm install` o `yarn install`).
2.  **Implementación de la Lógica Real**: Reemplaza la lógica simulada en cada archivo con la implementación real utilizando los SDKs y APIs correspondientes. Esto incluye manejar la autenticación, configuración de credenciales (de forma segura, usando variables de entorno), gestión de errores específica de cada servicio, y la interacción con tus modelos de base de datos.
3.  **Integración en la Aplicación Express**: Importa y utiliza los nuevos servicios en tus controladores y las configuraciones (morgan, rate limiters, cron jobs) en tu archivo principal de la aplicación Express (probablemente `src/index.js` o `src/app.js`).
4.  **Variables de Entorno**: Configura todas las credenciales, tokens de API, y configuraciones sensibles como variables de entorno (e.g., usando un archivo `.env` con la librería `dotenv`).
5.  **Pruebas Exhaustivas**: Realiza pruebas unitarias y de integración para cada nuevo módulo y servicio para asegurar su correcto funcionamiento.
6.  **Seguridad**: Presta especial atención a la seguridad al manejar credenciales, datos de pago, y tokens de API. Sigue las mejores prácticas recomendadas por cada proveedor de servicios.

Este backend ahora cuenta con una base más completa para las funcionalidades requeridas. ¡Mucho éxito con la implementación final!

