# 📋 PLAN MAESTRO DE IMPLEMENTACIÓN - Sistema ISP Completo

**Fecha**: 17 de Noviembre, 2025
**Estado**: En progreso - 4/14 funcionalidades completadas

---

## ✅ COMPLETADO (28%)

### 1. Conectividad Multi-Entorno ✅
- **Estado**: 100% completado
- **Archivos**:
  - `frontend/src/services/frontend_apiConfig.js` - Detección automática de API
  - `backend/src/index.js` - CORS configurado
  - `DEPLOYMENT_GUIDE.md` - Guía completa de despliegue
- **Funciona en**: localhost, red local (10.10.0.121), dominio (ISP.serviciosqbit.net)

### 2. Sistema de Correo Corporativo ✅
- **Estado**: 100% completado
- **Tecnología**: Mailu (open source)
- **Archivos**:
  - `backend/src/models/employeeEmail.model.js`
  - `backend/src/controllers/employeeEmail.controller.js`
  - `backend/src/routes/employeeEmail.routes.js`
  - `frontend/src/views/EmployeeEmailManagement.vue`
  - `MAIL_SERVER_SETUP.md` - Guía de instalación Mailu
- **Características**: Correos personalizados (juan.perez@dominio.com), webmail, API completa

### 3. Setup Wizard ✅
- **Estado**: 100% completado
- **Archivos**:
  - `backend/src/controllers/setup.controller.js`
  - `backend/src/routes/setup.routes.js`
  - `frontend/src/views/Setup/SetupWizard.vue`
- **Funcionalidad**: Configuración inicial del sistema en 7 pasos

### 4. Segmentación y Suspensión Automática ✅
- **Estado**: 100% completado
- **Archivos**:
  - `backend/src/services/client.segmentation.service.js`
  - `backend/src/services/client.suspension.service.js`
  - `backend/src/jobs/segmentation.job.js`
- **Funcionalidad**: Mueve clientes a "Moroso", suspende PPPoE automáticamente

---

## 🚧 EN PROGRESO (50%)

### 5. Sistema de Contabilidad 🔄
- **Estado**: 50% - Documentado, falta implementar código
- **Documentación**: `ACCOUNTING_IMPLEMENTATION_SUMMARY.md`
- **Por hacer**:
  - [ ] Crear modelos de BD
  - [ ] Crear controladores
  - [ ] Crear rutas API
  - [ ] Crear vistas Vue
  - [ ] Integrar con sistema existente

---

## ⏳ PENDIENTE (35%)

### 6. Sistema de Llamadas/Videollamadas Entre Personal
- **Tecnología recomendada**: Jitsi Meet (open source)
- **Características necesarias**:
  - Videollamadas 1 a 1 entre empleados
  - Conferencias grupales
  - Compartir pantalla
  - Chat durante la llamada
  - Grabación (opcional)

**Archivos a crear**:
```
backend/src/models/videoCall.model.js
backend/src/controllers/videoCall.controller.js
backend/src/routes/videoCall.routes.js
backend/src/services/jitsi.service.js
frontend/src/views/VideoCalls/CallCenter.vue
frontend/src/views/VideoCalls/ActiveCall.vue
frontend/src/components/VideoCallWidget.vue
```

**Implementación**:
```javascript
// Opción 1: Usar Jitsi Meet público (gratis)
const JITSI_SERVER = 'https://meet.jit.si';

// Opción 2: Instalar Jitsi propio (Docker)
// docker run -p 80:80 -p 443:443 jitsi/web

// Crear sala de videollamada
POST /api/video-calls/create
{
  "participants": [userId1, userId2],
  "subject": "Revisión técnica",
  "scheduled": "2025-11-17T15:00:00Z" // Opcional
}

// Unirse a llamada
GET /api/video-calls/:id/join
// Retorna: URL de Jitsi con JWT
```

### 7. Sistema de Plugins Mejorado
- **Categorías**:
  1. Pasarelas de pago (PayPal, Stripe, MercadoPago, OXXO)
  2. Servicios externos (SMS, WhatsApp, Telegram)
  3. Comunicación interna (entre empleados)
  4. Comunicación externa (con clientes)
  5. Notificaciones (push, email, SMS)

**Estructura propuesta**:
```
backend/src/models/plugin.model.js (ACTUALIZAR)
- Agregar campo: pluginCategory (payment|service|communication_internal|communication_external|notification)
- Agregar campo: communicationType (internal|external) para plugins de comunicación

backend/src/controllers/plugin.controller.js
- installPlugin() - Mejorar validación por categoría
- activatePlugin() - Configuración específica por tipo
- getPluginsByCategory() - Filtrar por categoría

frontend/src/views/Plugins/PluginMarketplace.vue (ACTUALIZAR)
- Tabs por categoría
- Vista previa de configuración
- Test de conectividad antes de activar
```

### 8. Portal del Cliente (Self-Service)
**Objetivo**: Los clientes pueden gestionar su cuenta sin llamar a soporte

**Funcionalidades**:
- Ver facturas y estado de cuenta
- Pagar online con tarjeta/transferencia
- Abrir tickets de soporte
- Ver consumo de internet
- Solicitar cambio de plan
- Descargar recibos
- Actualizar datos de contacto

**Archivos a crear**:
```
frontend/src/views/CustomerPortal/
├── PortalLogin.vue               # Login exclusivo para clientes
├── PortalDashboard.vue           # Dashboard del cliente
├── PortalInvoices.vue            # Ver facturas
├── PortalPayments.vue            # Pagar facturas
├── PortalTickets.vue             # Tickets de soporte
├── PortalUsage.vue               # Consumo de internet
└── PortalProfile.vue             # Perfil y configuración

backend/src/controllers/customerPortal.controller.js
backend/src/routes/customerPortal.routes.js
backend/src/middleware/customerAuth.middleware.js
```

**Rutas API**:
```
POST   /api/customer-portal/auth/login
GET    /api/customer-portal/dashboard
GET    /api/customer-portal/invoices
POST   /api/customer-portal/invoices/:id/pay
GET    /api/customer-portal/usage
POST   /api/customer-portal/tickets
```

### 9. Pasarelas de Pago Reales
**Pasarelas a integrar**:

#### PayPal
```javascript
// backend/src/services/payment/paypal.service.js
const paypal = require('@paypal/checkout-server-sdk');

exports.createPayment = async (amount, description, invoiceId) => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'MXN',
        value: amount
      },
      description: description,
      invoice_id: invoiceId
    }]
  });

  const order = await paypalClient.execute(request);
  return order.result;
};
```

#### Stripe
```javascript
// backend/src/services/payment/stripe.service.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (amount, currency, metadata) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Centavos
    currency: currency || 'mxn',
    metadata: metadata
  });

  return paymentIntent;
};
```

#### MercadoPago
```javascript
// backend/src/services/payment/mercadopago.service.js
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

exports.createPreference = async (items, payer) => {
  const preference = {
    items: items,
    payer: payer,
    back_urls: {
      success: `${process.env.FRONTEND_URL}/payment/success`,
      failure: `${process.env.FRONTEND_URL}/payment/failure`,
      pending: `${process.env.FRONTEND_URL}/payment/pending`
    },
    auto_return: 'approved'
  };

  const response = await mercadopago.preferences.create(preference);
  return response;
};
```

### 10. Dashboard de Métricas en Tiempo Real
**Tecnología**: WebSockets + Chart.js

**Métricas a mostrar**:
- Ingresos del mes (actualización en tiempo real)
- Clientes activos vs suspendidos
- Tickets abiertos/cerrados
- Pagos recibidos hoy
- Nuevos clientes del mes
- Tasa de morosidad
- Predicción de ingresos

**Archivos**:
```
backend/src/services/websocket.service.js
backend/src/controllers/metrics.controller.js
backend/src/jobs/metrics-update.job.js
frontend/src/views/Dashboard/RealtimeMetrics.vue
frontend/src/components/Charts/
├── LineChart.vue
├── BarChart.vue
├── PieChart.vue
└── GaugeChart.vue
```

### 11. Notificaciones en Tiempo Real (WebSockets)
**Eventos a notificar**:
- Pago recibido
- Cliente nuevo registrado
- Ticket urgente creado
- Cliente suspendido
- Instalación completada
- Mensaje de chat recibido

**Implementación**:
```javascript
// backend/src/services/websocket.service.js
const socketIO = require('socket.io');

let io;

exports.initialize = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('join-room', (userId) => {
      socket.join(`user-${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
};

exports.notifyUser = (userId, notification) => {
  io.to(`user-${userId}`).emit('notification', notification);
};

exports.broadcastToAdmins = (notification) => {
  io.to('admins').emit('notification', notification);
};
```

### 12. WhatsApp/SMS Recordatorios Automáticos
**Proveedores recomendados**:
- Twilio (SMS + WhatsApp)
- MessageBird (SMS)
- WhatsApp Business API

**Recordatorios**:
- 3 días antes del vencimiento
- Día del vencimiento
- 1 día después (advertencia)
- 5 días después (pre-suspensión)
- Confirmación de pago

**Implementación**:
```javascript
// backend/src/services/notifications/twilio.service.js
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.sendSMS = async (to, message) => {
  const result = await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to
  });

  return result;
};

exports.sendWhatsApp = async (to, message) => {
  const result = await client.messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`
  });

  return result;
};

// Job automático
// backend/src/jobs/payment-reminders.job.js
const cron = require('node-cron');

// Ejecutar diario a las 9:00 AM
cron.schedule('0 9 * * *', async () => {
  const upcomingDue = await getClientsWithUpcomingDueDate(3); // 3 días

  for (const client of upcomingDue) {
    const message = `Hola ${client.firstName}, tu pago de Internet vence en 3 días. Monto: $${client.billing.monthlyFee}. Paga en: https://isp.serviciosqbit.net/pay/${client.id}`;

    await twilioService.sendWhatsApp(client.phone, message);
  }
});
```

### 13. Mapa de Cobertura Geográfica
**Tecnología**: Leaflet.js (open source)

**Funcionalidades**:
- Ver clientes en el mapa
- Nodos/Antenas ubicados
- Zonas de cobertura (círculos de alcance)
- Filtrar por estado de cuenta
- Planificar nuevas instalaciones

**Implementación**:
```vue
<!-- frontend/src/views/Network/CoverageMap.vue -->
<template>
  <div class="coverage-map">
    <div id="map" style="height: 600px;"></div>

    <div class="map-controls">
      <label>
        <input type="checkbox" v-model="showActiveClients" />
        Clientes Activos
      </label>
      <label>
        <input type="checkbox" v-model="showSuspendedClients" />
        Clientes Suspendidos
      </label>
      <label>
        <input type="checkbox" v-model="showNodes" />
        Nodos/Antenas
      </label>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';

export default {
  data() {
    return {
      map: null,
      markers: [],
      showActiveClients: true,
      showSuspendedClients: false,
      showNodes: true
    };
  },

  mounted() {
    this.initMap();
    this.loadData();
  },

  methods: {
    initMap() {
      this.map = L.map('map').setView([19.4326, -99.1332], 12); // CDMX

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
    },

    async loadData() {
      const clients = await this.fetchClients();
      const nodes = await this.fetchNodes();

      this.plotClients(clients);
      this.plotNodes(nodes);
    },

    plotClients(clients) {
      clients.forEach(client => {
        if (!client.latitude || !client.longitude) return;

        const icon = client.status === 'active'
          ? this.createIcon('green')
          : this.createIcon('red');

        const marker = L.marker([client.latitude, client.longitude], { icon })
          .bindPopup(`
            <strong>${client.firstName} ${client.lastName}</strong><br>
            Estado: ${client.status}<br>
            Plan: ${client.servicePackage.name}
          `)
          .addTo(this.map);

        this.markers.push(marker);
      });
    },

    plotNodes(nodes) {
      nodes.forEach(node => {
        // Círculo de cobertura (500m de radio)
        L.circle([node.latitude, node.longitude], {
          color: 'blue',
          fillColor: '#30f',
          fillOpacity: 0.2,
          radius: node.coverageRadius || 500
        }).addTo(this.map);

        // Marcador del nodo
        L.marker([node.latitude, node.longitude], {
          icon: this.createIcon('blue')
        }).bindPopup(`
          <strong>${node.name}</strong><br>
          Tipo: ${node.type}<br>
          Clientes: ${node.clientCount}
        `).addTo(this.map);
      });
    }
  }
};
</script>
```

### 14. Reportes Exportables (PDF, Excel)
**Librerías**:
- PDF: `pdfkit` o `puppeteer`
- Excel: `xlsx` o `exceljs`

**Reportes a implementar**:
- Estado de cuenta de cliente (PDF)
- Listado de morosos (Excel)
- Reporte de ingresos mensual (PDF + Excel)
- Inventario de equipos (Excel)
- Tickets por técnico (PDF)
- Nómina (PDF)

**Implementación**:
```javascript
// backend/src/services/reports/pdf.service.js
const PDFDocument = require('pdfkit');
const fs = require('fs');

exports.generateInvoicePDF = async (invoice, client) => {
  const doc = new PDFDocument();
  const filename = `factura-${invoice.id}.pdf`;
  const stream = fs.createWriteStream(`./reports/${filename}`);

  doc.pipe(stream);

  // Header
  doc.fontSize(20).text('FACTURA', { align: 'center' });
  doc.fontSize(10).text(`Folio: ${invoice.invoiceNumber}`);
  doc.text(`Fecha: ${invoice.createdAt.toLocaleDateString()}`);

  // Cliente
  doc.fontSize(12).text(`Cliente: ${client.firstName} ${client.lastName}`);
  doc.text(`Dirección: ${client.address}`);

  // Concepto
  doc.fontSize(14).text('Concepto:', { underline: true });
  doc.fontSize(10).text(`Servicio de Internet - ${invoice.billingPeriodStart.toLocaleDateString()} al ${invoice.billingPeriodEnd.toLocaleDateString()}`);

  // Total
  doc.fontSize(16).text(`Total: $${invoice.totalAmount} MXN`, { align: 'right' });

  doc.end();

  return new Promise((resolve) => {
    stream.on('finish', () => {
      resolve(filename);
    });
  });
};

// backend/src/services/reports/excel.service.js
const ExcelJS = require('exceljs');

exports.generateDelinquentsReport = async (clients) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Clientes Morosos');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Teléfono', key: 'phone', width: 15 },
    { header: 'Deuda', key: 'debt', width: 15 },
    { header: 'Días Vencido', key: 'daysOverdue', width: 15 }
  ];

  clients.forEach(client => {
    worksheet.addRow({
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      phone: client.phone,
      debt: `$${client.debt}`,
      daysOverdue: client.daysOverdue
    });
  });

  const filename = `morosos-${Date.now()}.xlsx`;
  await workbook.xlsx.writeFile(`./reports/${filename}`);

  return filename;
};
```

---

## 🎯 PRIORIDAD DE IMPLEMENTACIÓN

### Urgente (Implementar AHORA)
1. Sistema de Contabilidad (en progreso)
2. Portal del Cliente (genera ingresos)
3. Pasarelas de Pago (automatiza cobranza)

### Importante (Próxima semana)
4. Dashboard de Métricas en Tiempo Real
5. WhatsApp/SMS Recordatorios
6. Reportes Exportables

### Útil (Cuando haya tiempo)
7. Sistema de Videollamadas
8. Mapa de Cobertura
9. Sistema de Plugins Mejorado
10. Notificaciones WebSocket

---

## 📝 CHECKLIST GENERAL

### Para cada funcionalidad nueva:
- [ ] Crear modelo de BD (si aplica)
- [ ] Crear controlador con lógica de negocio
- [ ] Crear rutas API
- [ ] Agregar validaciones
- [ ] Crear servicio (si lógica compleja)
- [ ] Crear vista Vue
- [ ] Agregar ruta en router
- [ ] Agregar enlace en sidebar
- [ ] Probar funcionalidad
- [ ] Documentar en README
- [ ] Commit y push

---

## 🔗 ENLACES ÚTILES

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000/api
- **Documentación API**: /ROUTES_DOCUMENTATION.md
- **Guía de Despliegue**: /DEPLOYMENT_GUIDE.md
- **Configuración Correo**: /MAIL_SERVER_SETUP.md

---

**Última actualización**: 17 de Noviembre, 2025
**Completado**: 4/14 funcionalidades (28%)
**Próximo objetivo**: Sistema de Contabilidad completo
