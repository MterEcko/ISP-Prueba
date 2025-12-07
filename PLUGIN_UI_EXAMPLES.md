# ?? Ejemplos de Inyección de UI (Sidebar, Servicios, Pagos)

El sistema utiliza un sistema de **Zonas (Zones)**. El plugin declara en su `manifest.json` en qué zonas quiere aparecer, y el Frontend lo renderiza automáticamente.

---

## 1. Ejemplo: Agregar un Menú al Sidebar ??

**Caso de Uso:** Un plugin de "VoIP / Telefonía" necesita su propio panel de administración para ver el historial de llamadas global.

### A. Configuración en `manifest.json`
El Sidebar suele ser **basado en configuración** (no necesitas crear un componente Vue complejo, solo decir dónde va el link).

```json
{
  "id": "voip-manager",
  "name": "VoIP System",
  "ui": {
    // Definimos la inyección en el Sidebar
    "sidebar": {
      "label": "Telefonía VoIP",
      "icon": "??",  // Puede ser emoji o clase de FontAwesome 'fa-phone'
      "path": "/plugins/voip-manager/dashboard",
      "category": "COMUNICACIONES", // Opcional: Para agruparlo
      "permission": "manage_voip"   // Opcional: Solo visible si tiene permiso
    }
  }
}
B. Resultado en el Core (Sidebar.vue)El Core lee esta configuración y renderiza:HTML<li v-for="item in pluginMenuItems">
  <router-link :to="item.path">
    <span class="icon">{{ item.icon }}</span>
    <span class="text">{{ item.label }}</span>
  </router-link>
</li>
2. Ejemplo: Widget en Pestaña de Servicios ??Caso de Uso: El plugin de "Streaming" quiere mostrar el usuario y contraseña de Jellyfin dentro del perfil del cliente (Juan Pérez).A. Configuración en manifest.jsonAquí sí inyectamos un Componente Visual Completo.JSON{
  "id": "streaming-pro",
  "ui": {
    // Definimos el widget para la zona 'client_services'
    "widgets": [
      {
        "zone": "client_services_tab",
        "componentName": "StreamingCard",
        "scriptUrl": "dist/streaming-card.umd.js"
      }
    ]
  }
}
B. Código del Plugin (StreamingCard.vue)El desarrollador del plugin crea este archivo y lo compila.HTML<template>
  <div class="service-card streaming">
    <div class="card-header">
      <h4>?? Streaming TV</h4>
      <span class="badge active">Activo</span>
    </div>
    <div class="card-body">
      <p><strong>Usuario:</strong> {{ contextData.clientName }}_tv</p>
      <button @click="resetPass">Resetear Contraseña</button>
    </div>
  </div>
</template>

<script>
export default {
  // El Core inyecta 'contextData' automáticamente con datos del cliente actual
  props: ['contextData'], 
  methods: {
    resetPass() {
      // Llamada a la API del plugin
      this.$http.post(`/api/plugins/streaming-pro/reset/${this.contextData.clientId}`);
    }
  }
}
</script>
3. Ejemplo: Botón en Pasarela de Pagos ??Caso de Uso: Un plugin de "Stripe" quiere agregar el botón "Pagar con Tarjeta" en el modal de cobro.A. Configuración en manifest.jsonJSON{
  "id": "stripe-gateway",
  "capabilities": ["payment_processor"],
  "ui": {
    "widgets": [
      {
        "zone": "payment_methods_list", // Zona específica del modal de pago
        "componentName": "StripePaymentButton",
        "scriptUrl": "dist/stripe-btn.umd.js",
        "props": { "publicKey": "pk_test_123..." } // Config pública extra
      }
    ]
  }
}
B. Código del Plugin (StripePaymentButton.vue)Este componente debe comunicarse con el Core para decir "¡Ya pagó!".HTML<template>
  <button class="btn btn-stripe" @click="handlePay">
    ?? Pagar con Tarjeta (Stripe)
  </button>
</template>

<script>
export default {
  props: ['contextData', 'publicKey'], // Recibe monto, clientId, etc.
  methods: {
    async handlePay() {
      // 1. Lógica interna de Stripe (abrir popup, validar tarjeta)
      const token = await stripe.createToken(...);

      if (token) {
        // 2. AVISAR AL CORE que el pago fue exitoso
        // Emitimos un evento estandarizado 'payment-success'
        this.$emit('action', {
          type: 'PAYMENT_PROCESSED',
          payload: {
            method: 'stripe-gateway',
            transactionId: token.id,
            amount: this.contextData.amount
          }
        });
      }
    }
  }
}
</script>
Resumen de Zonas Disponibles (Slots)Para que tus plugins sepan dónde ponerse, definiremos estas zonas estándar en el Core:Zona (zone)Dónde apareceUso típicoDatos de Contexto (contextData)sidebarMenú LateralAccesos directos a paneles de administración.userRoledashboard_widgetsPantalla de InicioGráficas, Resúmenes, Alertas de Clima.globalStatsclient_services_tabDetalle Cliente > ServiciosTarjetas de Streaming, VoIP, IoT.clientId, planIdclient_actionsDetalle Cliente > BotonesBotón "Enviar a WhatsApp", "Firmar Contrato".clientpayment_methods_listModal de PagoBotones de PayPal, Stripe, MercadoPago.invoiceId, amountnetwork_node_tabDetalle de Nodo/TorreGráficas de monitoreo, Control de Energía.nodeId, ipAddress