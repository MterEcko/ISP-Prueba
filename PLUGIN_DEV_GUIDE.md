# ??? Gu¨ªa de Desarrollo de Plugins (Arquitectura V2)

> **Versi¨®n del Sistema:** 2.0 (Modular Core)  
> **Framework Frontend:** Vue.js 3 (Options API)  
> **Framework Backend:** Node.js + Express + Sequelize

Esta gu¨ªa detalla c¨®mo crear plugins compatibles con la **Arquitectura Universal** del ISP System. El sistema utiliza un modelo de **Capacidades (Capabilities)** e **Inyecci¨®n de Dependencias** para permitir que un ZIP extienda el n¨²cleo sin modificar el c¨®digo fuente.

---

## 1. Estructura del Plugin (.zip)

Todo plugin debe empaquetarse en un archivo ZIP con la siguiente estructura interna estricta al descomprimirse en `backend/src/plugins/`:

```text
nombre-del-plugin/
©À©¤©¤ manifest.json           # ?? Configuraci¨®n, Capacidades y Metadatos
©À©¤©¤ package.json            # ?? Dependencias de Node.js (se instalan autom¨¢ticamente)
©À©¤©¤ server/                 # ?? L¨®gica Backend (Node.js)
©¦   ©À©¤©¤ index.js            # Punto de entrada (Exports obligatorios)
©¦   ©À©¤©¤ models/             # Modelos Sequelize propios (Tablas aisladas)
©¦   ©À©¤©¤ services/           # L¨®gica de negocio
©¦   ©¸©¤©¤ routes.js           # Rutas API adicionales
©¸©¤©¤ frontend/               # ?? L¨®gica Visual (Vue.js)
    ©À©¤©¤ src/                # C¨®digo fuente Vue (para referencia)
    ©¦   ©À©¤©¤ Widget.vue      # Componente visual
    ©¦   ©¸©¤©¤ Config.vue      # Formulario de configuraci¨®n
    ©¸©¤©¤ dist/               # C¨®digo compilado
        ©¸©¤©¤ widget.umd.js   # Componente UMD listo para el navegador
2. El Archivo manifest.json y las "Capabilities"El campo m¨¢s importante es capabilities. Define en qu¨¦ partes del Core se "enchufar¨¢" el plugin.Capacidades SoportadasCapabilityDescripci¨®nEjemplo de UsoHook en Coreservice_providerAgrega un servicio facturable a la "Super Tabla".Streaming, VoIP, IoT, Gaming.ClientServiceControllerpayment_processorAgrega un m¨¦todo de pago al orquestador.Stripe, PayPal, OpenPay.PaymentOrchestratorcommunication_channelPermite enviar notificaciones/mensajes.WhatsApp, SMS, Email.CommunicationServicesecurity_middlewareSe ejecuta antes de cada petici¨®n HTTP.Firewall, Geo-Block, IP Filter.securityMiddlewareChaindashboard_widgetInyecta gr¨¢ficas/KPIs en el Dashboard.Analytics, Clima, Estado de Red.PluginLoader (Frontend)system_observerSolo escucha eventos, no interact¨²a con UI.n8n Connector, Auditor¨ªa Externa.EventBus3. Ejemplo A: Plugin de Servicio (Streaming)Este ejemplo muestra c¨®mo crear un plugin que agrega un servicio de TV (Jellyfin) y se muestra en la pesta?a del cliente.?? manifest.jsonJSON{
  "id": "streaming-pro",
  "name": "Streaming TV Integration",
  "version": "1.0.0",
  "capabilities": ["service_provider"], 
  "ui": {
    "client_tab_widget": "StreamingWidget", // Nombre del componente Vue registrado
    "widget_script": "dist/widget.umd.js"   // Ubicaci¨®n del script
  }
}
?? server/index.jsDebe exportar initialize y serviceHandler.JavaScriptconst streamingService = require('./services/streaming.service');

module.exports = {
  /**
   * Se llama al cargar el plugin.
   * @param {EventBus} eventBus - Para escuchar/emitir eventos
   * @param {Object} config - Configuraci¨®n desencriptada
   */
  initialize: async (eventBus, config) => {
    // 1. Configurar servicio
    streamingService.setConfig(config);
    
    // 2. Escuchar eventos del Core (Ej: Si suspenden al cliente por falta de pago)
    eventBus.subscribe('SERVICE_SUSPENDED', async (data) => {
      // Buscar si este cliente tiene streaming y cortarlo
      await streamingService.suspendAccount(data.clientId);
    });
  },

  /**
   * Interfaz requerida para 'service_provider'
   * El Core usa esto para obtener info sin saber detalles t¨¦cnicos
   */
  serviceHandler: {
    // Retorna detalles para mostrar en la factura o lista
    getServiceDetails: async (referenceId) => {
      const account = await streamingService.getAccount(referenceId);
      return {
        label: `TV Plan ${account.plan}`,
        cost: account.price,
        status: account.status,
        metadata: { username: account.user, quality: '4K' }
      };
    },
    
    // Acci¨®n ejecutada al eliminar el servicio desde el Core
    terminateService: async (referenceId) => {
      await streamingService.deleteAccount(referenceId);
    }
  }
};
4. Ejemplo B: Plugin de Pagos (Stripe)Este ejemplo muestra c¨®mo inyectar un bot¨®n de pago en el modal de facturaci¨®n.?? manifest.jsonJSON{
  "id": "stripe-payments",
  "name": "Stripe Gateway",
  "capabilities": ["payment_processor"],
  "ui": {
    "payment_button_component": "StripeButton",
    "widget_script": "dist/button.umd.js"
  }
}
?? server/index.jsDebe exportar paymentHandler.JavaScriptconst stripe = require('stripe');

module.exports = {
  initialize: async (eventBus, config) => {
    this.stripeClient = stripe(config.secretKey);
  },

  /**
   * Interfaz requerida para 'payment_processor'
   */
  paymentHandler: {
    /**
     * Procesa un cobro
     * @param {Object} params { amount, currency, clientId, reference }
     */
    processPayment: async (params) => {
      try {
        const charge = await this.stripeClient.charges.create({
          amount: params.amount * 100, // Centavos
          currency: 'mxn',
          source: 'tok_visa', // Token que viene del frontend
          description: `Pago Cliente #${params.clientId}`
        });

        return {
          success: true,
          transactionId: charge.id,
          status: 'completed'
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }
};
5. Desarrollo del Frontend (Vue.js)El Core NO SE RECOMPILA. Los plugins deben entregar componentes pre-compilados (UMD).Flujo de Trabajo:Crear el componente MyWidget.vue normalmente usando el estilo del sistema (.card, .btn-primary).Usar vue-cli-service para compilarlo como librer¨ªa.Comando de Compilaci¨®n:Bashvue-cli-service build --target lib --name my-plugin-widget --dest dist/ src/components/MyWidget.vue
Esto generar¨¢ dist/my-plugin-widget.umd.js. Este archivo es el que el PluginLoader del Core descargar¨¢ e inyectar¨¢ en el navegador del cliente.Ejemplo Visual: frontend/src/StreamingWidget.vueNota: Este ejemplo usa las clases CSS nativas de tu sistema (client-list, header-actions) para mantener la coherencia visual.HTML<template>
  <div class="plugin-card card">
    <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
      <h5 class="mb-0">?? Streaming TV</h5>
      <span v-if="account" class="badge" :class="statusBadgeClass">{{ account.status }}</span>
    </div>
    
    <div class="card-body">
      <div v-if="loading" class="text-center p-3">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <div v-else-if="account">
        <div class="info-row mb-2">
          <strong>Usuario:</strong> {{ account.username }}
        </div>
        <div class="info-row mb-3">
          <strong>Plan:</strong> {{ account.plan }}
        </div>
        
        <div class="actions">
          <button @click="resetPassword" class="btn btn-sm btn-outline-warning mr-2">
            Reset Password
          </button>
          <button @click="openPlayer" class="btn btn-sm btn-primary">
            Abrir Reproductor
          </button>
        </div>
      </div>

      <div v-else class="text-center">
        <p class="text-muted">El cliente no tiene servicio activo.</p>
        <button @click="activar" class="btn btn-success btn-block">
          Activar Servicio
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StreamingWidget',
  props: ['contextData'], // El Core pasa { clientId: 50, planId: 2 }
  data() { 
    return { 
      account: null,
      loading: true 
    } 
  },
  computed: {
    statusBadgeClass() {
      return this.account?.status === 'active' ? 'badge-success' : 'badge-danger';
    }
  },
  async mounted() {
    // Llamar a la API propia del plugin
    try {
      const res = await this.$http.get(`/api/plugins/streaming/account/${this.contextData.clientId}`);
      this.account = res.data;
    } catch (e) {
      console.error("Error cargando widget", e);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    async activar() {
      // L¨®gica de activaci¨®n
    }
  }
}
</script>

<style scoped>
/* Respetar estilos del sistema base */
.plugin-card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>
6. Lista de Eventos del Sistema (Hooks)Tu plugin puede suscribirse a estos eventos usando eventBus.subscribe(EVENTO, callback).EventoCu¨¢ndo ocurreDatos que recibeCLIENT_CREATEDNuevo cliente registrado.{ client: Object }SERVICE_ACTIVATEDInternet activado.{ clientId, planId }SERVICE_SUSPENDEDCorte por impago o manual.{ clientId, reason }SERVICE_REACTIVATEDServicio restaurado.{ clientId }PAYMENT_RECEIVEDPago exitoso (cualquier m¨¦todo).{ paymentId, amount, method }INVOICE_GENERATEDNueva factura creada.{ invoiceId, total }TICKET_CREATEDNuevo ticket de soporte.{ ticketId, priority }7. Notas de Seguridad y AislamientoAislamiento de Rutas: Todas las rutas del plugin se montan autom¨¢ticamente bajo /api/plugins/{nombre-plugin}/. No pueden sobrescribir rutas del Core.Modelos: Las tablas del plugin deben tener prefijos (ej: Plugin_Streaming_Users) para evitar colisiones con el Core.Errores: Si tu hook falla (lanza una excepci¨®n), el sistema principal NO se detiene (Fail Safe), pero el error queda registrado en el log de auditor¨ªa.Frontend Sandbox: Los scripts del frontend corren en el contexto de la aplicaci¨®n principal. Deben evitar usar selectores globales como document.body y limitarse a su propio componente Vue.