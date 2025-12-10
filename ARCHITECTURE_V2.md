# 🏛️ Arquitectura V2: Sistema Modular Híbrido (Core + Plugins)

Este documento define la arquitectura técnica para transformar el sistema ISP en una plataforma extensible (tipo WordPress/Shopify), donde el núcleo permanece inmutable y las funcionalidades de negocio se agregan dinámicamente.

---

## 1. Filosofía del Sistema: "Core Agnóstico"

El principio fundamental es que el **Backend Core** no sabe, ni le importa, qué negocios adicionales existen.

* **El Core SOLO sabe de:** Clientes, Facturación básica, Autenticación, Roles, y eventos del ciclo de vida (crear, suspender, pagar).
* **Los Plugins saben del Core:** Los plugins sí conocen al Core y se "enganchan" a él para extender su funcionalidad.

### Diferencias Clave con la Versión Anterior
| Característica | Arquitectura Monolítica (V1) | Arquitectura Modular (V2) |
| :--- | :--- | :--- |
| **Base de Datos** | Tablas específicas (`JellyfinAccounts`, `VoipLines`) en el Core. | Tabla Polimórfica (`ClientServices`) que apunta a tablas aisladas. |
| **Lógica** | `ClientController` llama a `JellyfinService` directamente. | `ClientController` emite un evento; el Plugin escucha y actúa. |
| **Frontend** | Botones hardcoded en `ClientList.vue`. | "Slots" dinámicos que renderizan componentes inyectados. |
| **Dependencias** | `package.json` gigante en la raíz. | Cada plugin tiene su propio `package.json` aislado. |

---

## 2. Capa de Datos: La "Super Tabla" (Polimorfismo)

Para que el sistema pueda facturar servicios que desconoce (como "Mantenimiento de Cámaras" o "Licencia de Antivirus"), utilizamos un patrón de **Asociación Polimórfica**.

### 2.1. Tabla Maestra: `ClientServices` (En el Core)
Esta tabla actúa como el "Índice" o "Enchufe Universal". Vive en `backend/src/models/clientService.model.js`.

| Campo | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `id` | PK | Identificador único del servicio asignado. | `105` |
| `clientId` | FK | Relación con la tabla `Clients`. | `50` (Cliente Juan) |
| `pluginName` | String | Identificador único del plugin dueño. | `"streaming-pro"` |
| `serviceType` | Enum | Categoría para agrupar en factura. | `"entertainment"` |
| **`referenceId`** | String | **CLAVE:** ID interno dentro de la tabla del plugin. | `"user_jf_99"` |
| `status` | Enum | Estado global del servicio. | `"active"` |
| `metadata` | JSON | Datos visuales rápidos (cache) para no consultar al plugin siempre. | `{ "label": "Netflix 4K", "price": 15.00 }` |

### 2.2. Tablas de Plugins (Aisladas)
Cada plugin crea sus propias tablas al instalarse. El Core no las toca.

**Ejemplo: Tabla `Plugin_StreamingAccounts` (Creada por el plugin)**
| id | username | password | quality | parental_control |
| :--- | :--- | :--- | :--- | :--- |
| `user_jf_99` | juan_tv | 12345 | 4K | true |

### 2.3. Flujo de Datos
1.  **Lectura:** Cuando el Frontend pide "Ver servicios del cliente 50":
    * El Core consulta `ClientServices` where `clientId = 50`.
    * Obtiene 3 filas.
    * Devuelve la `metadata` (Nombre y Precio) para mostrar rápido en la lista.
    * Si el usuario hace click en "Detalles", el Core llama al controlador del plugin usando `pluginName` + `referenceId`.

---

## 3. Capa de Lógica: El Bus de Eventos (Event Bus)

Para desacoplar el código, usamos un patrón **Pub/Sub (Publicar/Suscribir)**.

### 3.1. Servicio: `EventBus`
Un Singleton en el Backend que gestiona la comunicación.

### 3.2. Ciclo de Vida de un Evento (Ejemplo: Suspensión)

1.  **Acción en Core:** El administrador hace click en "Suspender Cliente" o el Cron Job detecta falta de pago.
2.  **Emisión:** `ClientController` ejecuta:
    ```javascript
    EventBus.emit('SERVICE_SUSPENDED', { clientId: 50, reason: 'overdue' });
    ```
3.  **Reacción (Plugins):**
    * **Plugin Streaming:** Escucha el evento -> Busca en `ClientServices` si el cliente 50 tiene streaming -> Si sí, conecta a Jellyfin y bloquea el usuario.
    * **Plugin WhatsApp:** Escucha el evento -> Busca el teléfono del cliente -> Envía plantilla de "Servicio Suspendido".
    * **Plugin n8n:** Escucha el evento -> Envía un Webhook a un flujo externo.

### 3.3. Lista de Eventos Estándar (Hooks)
El sistema debe emitir estos eventos mínimos para ser útil:

* `CLIENT_REGISTERED`
* `CLIENT_UPDATED`
* `SERVICE_ACTIVATED` (Internet)
* `SERVICE_SUSPENDED`
* `SERVICE_CANCELLED`
* `PAYMENT_CREATED`
* `INVOICE_GENERATED`

---

## 4. Capa de Presentación: Frontend Dinámico

Como no podemos recompilar el Frontend Vue.js cada vez que instalamos un plugin, usamos **Inyección de Componentes**.

### 4.1. Concepto de "Slots" (Huecos)
El Frontend Core define áreas vacías donde los plugins pueden "dibujar".

* **`SidebarSlot`**: Debajo del menú principal.
* **`ClientServicesSlot`**: En la pestaña de servicios del cliente.
* **`PaymentMethodsSlot`**: En el modal de pagar.

### 4.2. Carga de Componentes (.UMD.js)
1.  El plugin debe contener una carpeta `frontend/dist/` con un archivo Javascript compilado (ej. `widget.umd.js`).
2.  Al cargar el sistema, el Frontend hace un `GET /api/system-plugins/ui-components`.
3.  El backend devuelve una lista de URLs de scripts.
4.  El Frontend carga esos scripts y registra los componentes globales de Vue.

**Ejemplo de Flujo Visual:**
1.  Entras a "Detalles de Cliente".
2.  El componente `ClientServices.vue` (Core) itera sobre `ClientServices` (DB).
3.  Encuentra un servicio de tipo `streaming-pro`.
4.  Busca si existe un componente registrado llamado `streaming-pro-card`.
5.  Si existe, lo renderiza pasando los datos. Si no, muestra una tarjeta genérica.

---

## 5. Estructura de Archivos del Plugin (El Estándar)

Para que el sistema reconozca un ZIP como plugin válido, debe seguir esta estructura estricta.

```text
nombre-del-plugin/
├── package.json              # Dependencias de Node (ej. axios, twilio)
├── manifest.json             # Metadatos, permisos y configuración UI
├── server/                   # Lógica Backend
│   ├── index.js              # Punto de entrada (Hooks)
│   ├── controller.js         # Lógica de negocio
│   ├── routes.js             # Endpoints Express extra (/api/plugin/...)
│   └── model.js              # Modelos Sequelize propios
└── frontend/                 # Lógica Visual
    ├── src/                  # Código fuente Vue
    │   ├── Config.vue        # Formulario de configuración
    │   └── Widget.vue        # Widget para el cliente
    └── dist/                 # Código compilado para el navegador
        └── plugin.umd.js     # El archivo que descarga el navegador
5.1. Detalle del manifest.json
Este archivo es el DNI del plugin.

JSON

{
  "id": "whatsapp-pro",
  "version": "1.0.0",
  "type": ["communication", "notification"], // Capabilities
  "database": {
    "tables": ["WhatsappLogs", "WhatsappTemplates"] // Tablas a crear
  },
  "ui": {
    "sidebar_menu": { "label": "WhatsApp", "icon": "fa-whatsapp", "link": "/whatsapp" },
    "client_tab": true, // ¿Aparece en detalles de cliente?
    "settings_page": true // ¿Tiene configuración?
  }
}
6. Flujo de Instalación (Paso a Paso)
¿Qué pasa internamente cuando subes el ZIP?

Subida: SystemPluginController recibe el ZIP y lo guarda en uploads/temp.

Validación: Descomprime y lee manifest.json. Verifica que la versión del sistema sea compatible.

Despliegue: Mueve los archivos a backend/src/plugins/{id}/.

Dependencias: Ejecuta npm install --production dentro de esa carpeta.

Base de Datos: Lee los modelos del plugin y ejecuta sequelize.sync() para crear las tablas nuevas sin tocar las viejas.

Registro: Guarda el plugin en la tabla SystemPlugins como "Inactivo".

Activación: Al activar, el Core carga el archivo server/index.js del plugin y registra sus Hooks en el EventBus.

7. Resumen de Seguridad
Sandbox: Los plugins corren en el mismo proceso de Node.js, pero se les pasan instancias limitadas de la DB y el Logger.

Fronteras: Un plugin fallido puede tumbar el servidor si tiene errores no capturados (try/catch). Por eso, el Core envuelve las llamadas a los Hooks en bloques try/catch para que si un plugin falla, el sistema principal siga funcionando.

Privacidad: La "Super Tabla" evita que un plugin lea datos de otro plugin a menos que use la API pública.