/**
 * Servicio para generar documentos PDF del sistema ISP
 * ✅ Compatible con las rutas reales del backend
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import authHeader from './auth-header';
import axios from 'axios';

// Configuración API
const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api';

// Utils básicos (si no existen)
const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount || 0);
};

class PDFGeneratorService {

  // ===============================
  // CONFIGURACIÓN BASE DEL PDF
  // ===============================

  getBasePDFConfig() {
    return {
      company: {
        name: 'Sistema ISP',
        address: 'Dirección de la empresa',
        phone: '(123) 456-7890',
        email: 'contacto@sistemaISP.com',
        website: 'www.sistemaISP.com'
      },
      colors: {
        primary: [41, 128, 185],
        secondary: [52, 73, 94],
        success: [39, 174, 96],
        danger: [231, 76, 60],
        warning: [241, 196, 15],
        light: [236, 240, 241]
      }
    };
  }

  addPDFHeader(pdf, title, subtitle = '') {
    const config = this.getBasePDFConfig();
    
    pdf.setFontSize(18);
    pdf.setTextColor(...config.colors.primary);
    pdf.text(config.company.name, 14, 20);
    
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, 105, 20, { align: 'center' });
    
    if (subtitle) {
      pdf.setFontSize(12);
      pdf.setTextColor(...config.colors.secondary);
      pdf.text(subtitle, 105, 28, { align: 'center' });
    }
    
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generado: ${formatDate(new Date())}`, 195, 20, { align: 'right' });
    
    pdf.setDrawColor(...config.colors.light);
    pdf.line(14, 35, 195, 35);
    
    return 45;
  }

  addPDFFooter(pdf, pageNumber = 1, totalPages = 1) {
    const config = this.getBasePDFConfig();
    const pageHeight = pdf.internal.pageSize.height;
    
    pdf.setDrawColor(...config.colors.light);
    pdf.line(14, pageHeight - 25, 195, pageHeight - 25);
    
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${config.company.name} | ${config.company.phone} | ${config.company.email}`, 14, pageHeight - 15);
    pdf.text(`Página ${pageNumber} de ${totalPages}`, 195, pageHeight - 15, { align: 'right' });
    
    pdf.setFontSize(7);
    pdf.text('Este documento es confidencial y para uso exclusivo del destinatario.', 105, pageHeight - 8, { align: 'center' });
  }

  // ===============================
  // CONFIGURACIÓN DE CLIENTE
  // ===============================

  /**
   * ✅ Genera PDF con configuración de servicio del cliente
   * Usa rutas reales: /api/clients/:id y /api/subscriptions (si existe)
   */
  async generateClientConfigPDF(clientId, subscriptionId) {
    try {
      // ✅ Obtener datos usando rutas reales del backend
      const clientResponse = await axios.get(`${API_URL}/clients/${clientId}`, { 
        headers: authHeader() 
      });
      const client = clientResponse.data.data || clientResponse.data;

      // ✅ Intentar obtener datos de suscripción (si existe la ruta)
      let subscription = null;
      let servicePackage = null;
      let mikrotikData = null;
      
      try {
        // Buscar suscripción en los datos del cliente
        if (client.Subscriptions && client.Subscriptions.length > 0) {
          subscription = client.Subscriptions.find(sub => sub.id == subscriptionId) || client.Subscriptions[0];
          servicePackage = subscription.ServicePackage;
        }
        
        // ✅ Intentar obtener datos de Mikrotik PPPoE usando ruta real
        if (subscription?.pppoeUsername) {
          try {
            const mikrotikResponse = await axios.get(`${API_URL}/mikrotik/pppoe-users`, { 
              headers: authHeader(),
              params: { username: subscription.pppoeUsername }
            });
            mikrotikData = mikrotikResponse.data?.[0];
          } catch (error) {
            console.warn('Datos de Mikrotik no disponibles:', error.message);
          }
        }
      } catch (error) {
        console.warn('Datos de suscripción no disponibles:', error.message);
      }

      // Crear PDF
      const pdf = new jsPDF();
      let yPosition = this.addPDFHeader(pdf, 'Configuración de Servicio', 'Datos de conexión a Internet');

      // Información del cliente
      yPosition += 10;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('INFORMACIÓN DEL CLIENTE', 14, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(11);
      const clientInfo = [
        [`Cliente:`, `${client.firstName} ${client.lastName}`],
        [`Email:`, client.email || 'No especificado'],
        [`Teléfono:`, client.phone || 'No especificado'],
        [`WhatsApp:`, client.whatsapp || 'No especificado'],
        [`Dirección:`, client.address || 'No especificada'],
        [`Fecha de inicio:`, formatDate(subscription?.startDate || client.startDate)],
        [`Estado del servicio:`, this.formatSubscriptionStatus(subscription?.status || 'active')]
      ];

      clientInfo.forEach(([label, value]) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(label, 14, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.text(value, 70, yPosition);
        yPosition += 7;
      });

      // Información del servicio
      yPosition += 10;
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('INFORMACIÓN DEL SERVICIO', 14, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(11);
      const serviceInfo = [
        [`Plan contratado:`, servicePackage?.name || 'Plan personalizado'],
        [`Velocidad de descarga:`, `${servicePackage?.downloadSpeedMbps || 'N/A'} Mbps`],
        [`Velocidad de subida:`, `${servicePackage?.uploadSpeedMbps || 'N/A'} Mbps`],
        [`Cuota mensual:`, formatCurrency(subscription?.monthlyFee || 0)],
        [`IP asignada:`, subscription?.assignedIpAddress || 'Dinámica'],
        [`Perfil Mikrotik:`, subscription?.mikrotikProfileName || 'No asignado']
      ];

      serviceInfo.forEach(([label, value]) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(label, 14, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.text(value, 70, yPosition);
        yPosition += 7;
      });

      // Datos de conexión PPPoE
      if (subscription?.pppoeUsername) {
        yPosition += 10;
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('DATOS DE CONEXIÓN PPPoE', 14, yPosition);
        
        yPosition += 10;
        pdf.setFontSize(11);
        
        // Cuadro destacado para credenciales
        pdf.setFillColor(240, 248, 255);
        pdf.rect(14, yPosition - 5, 170, 30, 'F');
        pdf.setDrawColor(100, 149, 237);
        pdf.rect(14, yPosition - 5, 170, 30);
        
        pdf.setFont(undefined, 'bold');
        pdf.text('Usuario:', 20, yPosition + 5);
        pdf.setFont(undefined, 'normal');
        pdf.text(subscription.pppoeUsername, 50, yPosition + 5);
        
        pdf.setFont(undefined, 'bold');
        pdf.text('Contraseña:', 20, yPosition + 12);
        pdf.setFont(undefined, 'normal');
        pdf.text(subscription.pppoePassword || '••••••••', 50, yPosition + 12);
        
        if (mikrotikData) {
          pdf.setFont(undefined, 'bold');
          pdf.text('Estado:', 20, yPosition + 19);
          pdf.setFont(undefined, 'normal');
          pdf.text(this.formatMikrotikStatus(mikrotikData.status), 50, yPosition + 19);
        }
        
        yPosition += 40;
      }

      // Instrucciones de configuración
      yPosition += 5;
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('INSTRUCCIONES DE CONFIGURACIÓN', 14, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      
      const instructions = [
        '1. Conecte su router al equipo instalado mediante cable Ethernet.',
        '2. Acceda a la configuración de su router (generalmente 192.168.1.1 ó 192.168.0.1).',
        '3. Configure la conexión WAN como PPPoE.',
        '4. Ingrese el usuario y contraseña proporcionados arriba.',
        '5. Guarde la configuración y reinicie el router.',
        '6. Verifique la conectividad a Internet.',
        '',
        'NOTA: Si no puede acceder a Internet después de seguir estos pasos,',
        'comuníquese con nuestro equipo de soporte técnico.'
      ];

      instructions.forEach((instruction) => {
        pdf.text(instruction, 14, yPosition);
        yPosition += 6;
      });

      // Información de soporte
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('SOPORTE TÉCNICO', 14, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      const config = this.getBasePDFConfig();
      
      pdf.text(`Teléfono: ${config.company.phone}`, 14, yPosition);
      pdf.text(`Email: ${config.company.email}`, 14, yPosition + 7);
      pdf.text('Horario: Lunes a Viernes 8:00 AM - 8:00 PM, Sábados 9:00 AM - 2:00 PM', 14, yPosition + 14);

      this.addPDFFooter(pdf);
      return pdf.output('blob');

    } catch (error) {
      console.error('❌ Error generando PDF de configuración:', error);
      throw new Error('Error al generar el documento de configuración');
    }
  }

  // ===============================
  // FACTURACIÓN - Usando rutas reales
  // ===============================

  /**
   * ✅ Genera PDF de factura usando datos proporcionados
   */
  async generateInvoicePDF(invoiceData) {
    try {
      const { invoice, client, subscription } = invoiceData;
      
      const pdf = new jsPDF();
      let yPosition = this.addPDFHeader(pdf, 'FACTURA', `No. ${invoice.invoiceNumber || invoice.id}`);

      // Información de facturación
      yPosition += 10;
      pdf.setFontSize(12);
      
      // Datos del cliente (lado izquierdo)
      pdf.setFont(undefined, 'bold');
      pdf.text('FACTURAR A:', 14, yPosition);
      yPosition += 8;
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      pdf.text(`${client.firstName} ${client.lastName}`, 14, yPosition);
      pdf.text(client.email || '', 14, yPosition + 6);
      pdf.text(client.phone || '', 14, yPosition + 12);
      pdf.text(client.address || '', 14, yPosition + 18);

      // Datos de la factura (lado derecho)
      const invoiceDetails = [
        [`Fecha de factura:`, formatDate(invoice.createdAt || new Date())],
        [`Período:`, this.formatBillingPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd)],
        [`Fecha de vencimiento:`, formatDate(invoice.dueDate)],
        [`Estado:`, this.formatInvoiceStatus(invoice.status)]
      ];

      let detailY = yPosition;
      invoiceDetails.forEach(([label, value]) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(label, 120, detailY);
        pdf.setFont(undefined, 'normal');
        pdf.text(value, 170, detailY);
        detailY += 6;
      });

      // Tabla de servicios
      yPosition += 40;
      const tableData = [
        ['Descripción', 'Cantidad', 'Precio Unitario', 'Total']
      ];

      if (subscription) {
        tableData.push([
          `Servicio de Internet - ${subscription.ServicePackage?.name || 'Plan personalizado'}`,
          '1',
          formatCurrency(invoice.amount || 0),
          formatCurrency(invoice.amount || 0)
        ]);
      } else {
        tableData.push([
          'Servicio de Internet',
          '1',
          formatCurrency(invoice.amount || 0),
          formatCurrency(invoice.amount || 0)
        ]);
      }

      pdf.autoTable({
        startY: yPosition,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Totales
      yPosition = pdf.lastAutoTable.finalY + 20;
      const totals = [
        [`Subtotal:`, formatCurrency(invoice.amount || 0)],
        [`IVA (16%):`, formatCurrency(invoice.taxAmount || 0)],
        [`TOTAL:`, formatCurrency(invoice.totalAmount || invoice.amount || 0)]
      ];

      totals.forEach(([label, value], index) => {
        const isTotal = index === totals.length - 1;
        if (isTotal) {
          pdf.setFont(undefined, 'bold');
          pdf.setFontSize(12);
        } else {
          pdf.setFont(undefined, 'normal');
          pdf.setFontSize(10);
        }
        
        pdf.text(label, 140, yPosition);
        pdf.text(value, 190, yPosition, { align: 'right' });
        yPosition += isTotal ? 10 : 7;
      });

      this.addPDFFooter(pdf);
      return pdf.output('blob');

    } catch (error) {
      console.error('❌ Error generando PDF de factura:', error);
      throw new Error('Error al generar la factura');
    }
  }

  /**
   * ✅ Genera estado de cuenta usando datos proporcionados
   */
  async generateAccountStatement(billingData) {
    try {
    // eslint-disable-next-line no-unused-vars
      const { client, billingInfo, invoices, period } = billingData;
      
      const pdf = new jsPDF();
      let yPosition = this.addPDFHeader(pdf, 'ESTADO DE CUENTA', `Cliente: ${client.firstName} ${client.lastName}`);

      // Resumen de cuenta
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('RESUMEN DE CUENTA', 14, yPosition);

      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');

      const summary = [
        [`Estado del cliente:`, this.formatBillingStatus(billingInfo?.clientStatus || 'active')],
        [`Último pago:`, formatDate(billingInfo?.lastPaymentDate) || 'Sin pagos registrados'],
        [`Próximo vencimiento:`, formatDate(billingInfo?.nextDueDate) || 'No definido'],
        [`Cuota mensual:`, formatCurrency(billingInfo?.monthlyFee || 0)],
        [`Días de gracia:`, billingInfo?.graceDays || '0'],
        [`Método de pago:`, this.formatPaymentMethod(billingInfo?.paymentMethod) || 'No definido']
      ];

      summary.forEach(([label, value]) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(label, 14, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.text(value, 70, yPosition);
        yPosition += 7;
      });

      // Historial de facturas
      if (invoices && invoices.length > 0) {
        yPosition += 10;
        pdf.setFont(undefined, 'bold');
        pdf.text('HISTORIAL DE FACTURAS', 14, yPosition);
        yPosition += 10;

        const tableData = [
          ['Factura', 'Fecha', 'Vencimiento', 'Monto', 'Estado']
        ];

        invoices.forEach(invoice => {
          tableData.push([
            invoice.invoiceNumber || `#${invoice.id}`,
            formatDate(invoice.createdAt),
            formatDate(invoice.dueDate),
            formatCurrency(invoice.totalAmount || invoice.amount),
            this.formatInvoiceStatus(invoice.status)
          ]);
        });

        pdf.autoTable({
          startY: yPosition,
          head: [tableData[0]],
          body: tableData.slice(1),
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [41, 128, 185] }
        });
      }

      this.addPDFFooter(pdf);
      return pdf.output('blob');

    } catch (error) {
      console.error('❌ Error generando estado de cuenta:', error);
      throw new Error('Error al generar el estado de cuenta');
    }
  }

  // ===============================
  // CONTRATOS Y REPORTES
  // ===============================

  /**
   * ✅ Genera contrato de servicio
   */
  async generateServiceContract(contractData) {
    try {
      // eslint-disable-next-line no-unused-vars
      const { client, equipment, subscription, installationDate } = contractData;
      
      const pdf = new jsPDF();
      let yPosition = this.addPDFHeader(pdf, 'CONTRATO DE SERVICIO', 'Servicios de Internet');

      // Contenido del contrato
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('CONTRATO DE PRESTACIÓN DE SERVICIOS DE INTERNET', 14, yPosition);

      yPosition += 15;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');

      const contractText = [
        `Entre ${this.getBasePDFConfig().company.name}, en adelante "LA EMPRESA", y ${client.firstName} ${client.lastName}, en adelante "EL CLIENTE", se celebra el presente contrato bajo las siguientes condiciones:`,
        '',
        'PRIMERA.- OBJETO DEL CONTRATO',
        'LA EMPRESA se compromete a brindar servicios de acceso a Internet de banda ancha al CLIENTE en el domicilio especificado.',
        '',
        'SEGUNDA.- CARACTERÍSTICAS DEL SERVICIO',
        `• Plan contratado: ${subscription?.ServicePackage?.name || 'Plan personalizado'}`,
        `• Velocidad de descarga: ${subscription?.ServicePackage?.downloadSpeedMbps || 'N/A'} Mbps`,
        `• Velocidad de subida: ${subscription?.ServicePackage?.uploadSpeedMbps || 'N/A'} Mbps`,
        `• Cuota mensual: ${formatCurrency(subscription?.monthlyFee || 0)}`,
        `• Fecha de inicio: ${formatDate(subscription?.startDate)}`,
        '',
        'TERCERA.- OBLIGACIONES DEL CLIENTE',
        '• Pagar puntualmente la cuota mensual en la fecha acordada',
        '• Cuidar los equipos instalados en su propiedad',
        '• Permitir el acceso para mantenimiento cuando sea necesario',
        '• Usar el servicio conforme a los términos establecidos',
        '',
        'CUARTA.- OBLIGACIONES DE LA EMPRESA',
        '• Proporcionar el servicio con la calidad acordada',
        '• Realizar mantenimiento preventivo y correctivo',
        '• Brindar soporte técnico durante horarios establecidos',
        '• Instalar y mantener los equipos necesarios'
      ];

      contractText.forEach((line) => {
        if (line === '') {
          yPosition += 6;
        } else {
          const lines = pdf.splitTextToSize(line, 170);
          lines.forEach(splitLine => {
            pdf.text(splitLine, 14, yPosition);
            yPosition += 5;
          });
          yPosition += 2;
        }
      });

      // Firmas
      yPosition += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('FIRMAS', 14, yPosition);
      yPosition += 20;

      pdf.line(14, yPosition, 80, yPosition);
      pdf.line(120, yPosition, 186, yPosition);
      
      yPosition += 5;
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      pdf.text('Firma del Cliente', 14, yPosition);
      pdf.text('Firma de la Empresa', 120, yPosition);

      yPosition += 10;
      pdf.text(`${client.firstName} ${client.lastName}`, 14, yPosition);
      pdf.text(`${this.getBasePDFConfig().company.name}`, 120, yPosition);

      this.addPDFFooter(pdf);
      return pdf.output('blob');

    } catch (error) {
      console.error('❌ Error generando contrato:', error);
      throw new Error('Error al generar el contrato');
    }
  }

  /**
   * ✅ Genera reporte de instalación usando datos reales de equipos
   */
  async generateInstallationReport(installationData) {
    try {
      const { client, equipment, device, installationDate, technicianNotes } = installationData;
      
      const pdf = new jsPDF();
      let yPosition = this.addPDFHeader(pdf, 'REPORTE DE INSTALACIÓN', `Cliente: ${client.firstName} ${client.lastName}`);

      // Información de la instalación
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('DETALLES DE LA INSTALACIÓN', 14, yPosition);

      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');

      const installationInfo = [
        [`Fecha de instalación:`, formatDate(installationDate)],
        [`Cliente:`, `${client.firstName} ${client.lastName}`],
        [`Dirección:`, client.address || 'No especificada'],
        [`Teléfono:`, client.phone || 'No especificado'],
        [`Tipo de instalación:`, 'Instalación de equipo de red']
      ];

      installationInfo.forEach(([label, value]) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(label, 14, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.text(value, 70, yPosition);
        yPosition += 7;
      });

      // ✅ Detalles del equipo instalado (usando datos reales)
      if (equipment || device) {
        yPosition += 10;
        pdf.setFont(undefined, 'bold');
        pdf.text('EQUIPO INSTALADO', 14, yPosition);
        yPosition += 10;

        const equipmentData = equipment || device;
        const equipmentDetails = [
          [`Nombre:`, equipmentData.name || 'N/A'],
          [`Marca:`, equipmentData.brand || 'N/A'],
          [`Modelo:`, equipmentData.model || 'N/A'],
          [`Número de serie:`, equipmentData.serialNumber || 'N/A'],
          [`Dirección MAC:`, equipmentData.macAddress || 'N/A'],
          [`IP asignada:`, equipmentData.ipAddress || device?.ipAddress || 'No asignada'],
          [`Ubicación:`, equipmentData.location || device?.location || 'No especificada']
        ];

        equipmentDetails.forEach(([label, value]) => {
          pdf.setFont(undefined, 'bold');
          pdf.text(label, 14, yPosition);
          pdf.setFont(undefined, 'normal');
          pdf.text(value, 70, yPosition);
          yPosition += 7;
        });
      }

      // Notas del técnico
      if (technicianNotes) {
        yPosition += 10;
        pdf.setFont(undefined, 'bold');
        pdf.text('OBSERVACIONES DEL TÉCNICO', 14, yPosition);
        yPosition += 10;
        pdf.setFont(undefined, 'normal');
        
        const lines = pdf.splitTextToSize(technicianNotes, 170);
        lines.forEach(line => {
          pdf.text(line, 14, yPosition);
          yPosition += 6;
        });
      }

      // Lista de verificación
      yPosition += 15;
      pdf.setFont(undefined, 'bold');
      pdf.text('LISTA DE VERIFICACIÓN', 14, yPosition);
      yPosition += 10;
      pdf.setFont(undefined, 'normal');

      const checkList = [
        '☐ Equipo instalado correctamente',
        '☐ Conexión a Internet verificada',
        '☐ Configuración WiFi realizada',
        '☐ Pruebas de velocidad satisfactorias',
        '☐ Cliente capacitado en uso básico',
        '☐ Documentación entregada al cliente'
      ];

      checkList.forEach(item => {
        pdf.text(item, 14, yPosition);
        yPosition += 7;
      });

      // Firmas
      yPosition += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('FIRMAS DE CONFORMIDAD', 14, yPosition);
      yPosition += 20;

      pdf.line(14, yPosition, 80, yPosition);
      pdf.line(120, yPosition, 186, yPosition);
      
      yPosition += 5;
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      pdf.text('Firma del Cliente', 14, yPosition);
      pdf.text('Firma del Técnico', 120, yPosition);

      yPosition += 7;
      pdf.text('Acepto la instalación', 14, yPosition);
      pdf.text('Instalación completada', 120, yPosition);

      this.addPDFFooter(pdf);
      return pdf.output('blob');

    } catch (error) {
      console.error('❌ Error generando reporte de instalación:', error);
      throw new Error('Error al generar el reporte de instalación');
    }
  }

  // ===============================
  // MÉTODOS AUXILIARES
  // ===============================

  formatSubscriptionStatus(status) {
    const statusMap = {
      'active': 'Activo',
      'suspended': 'Suspendido',
      'cancelled': 'Cancelado',
      'pending': 'Pendiente'
    };
    return statusMap[status] || status;
  }

  formatBillingStatus(status) {
    const statusMap = {
      'active': 'Activo',
      'suspended': 'Suspendido',
      'cancelled': 'Cancelado',
      'overdue': 'Vencido',
      'pending': 'Pendiente'
    };
    return statusMap[status] || status;
  }

  formatInvoiceStatus(status) {
    const statusMap = {
      'pending': 'Pendiente',
      'paid': 'Pagada',
      'overdue': 'Vencida',
      'cancelled': 'Cancelada'
    };
    return statusMap[status] || status;
  }

  formatMikrotikStatus(status) {
    const statusMap = {
      'active': 'Conectado',
      'disabled': 'Deshabilitado',
      'inactive': 'Desconectado'
    };
    return statusMap[status] || status;
  }

  formatPaymentMethod(method) {
    const methodMap = {
      'cash': 'Efectivo',
      'transfer': 'Transferencia',
      'card': 'Tarjeta',
      'check': 'Cheque',
      'online': 'Pago en línea'
    };
    return methodMap[method] || method;
  }

  formatBillingPeriod(startDate, endDate) {
    if (!startDate || !endDate) return 'Período no definido';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;
  }

  // ===============================
  // MÉTODOS PÚBLICOS DE DESCARGA
  // ===============================

  async downloadClientConfigPDF(clientId, subscriptionId) {
    try {
      const pdfBlob = await this.generateClientConfigPDF(clientId, subscriptionId);
      this.downloadBlob(pdfBlob, `configuracion_cliente_${clientId}_${subscriptionId}.pdf`);
      return true;
    } catch (error) {
      console.error('❌ Error descargando PDF de configuración:', error);
      throw error;
    }
  }

  async downloadInvoicePDF(invoiceData) {
    try {
      const pdfBlob = await this.generateInvoicePDF(invoiceData);
      const { invoice } = invoiceData;
      this.downloadBlob(pdfBlob, `factura_${invoice.invoiceNumber || invoice.id}.pdf`);
      return true;
    } catch (error) {
      console.error('❌ Error descargando factura:', error);
      throw error;
    }
  }

  async downloadAccountStatement(billingData) {
    try {
      const pdfBlob = await this.generateAccountStatement(billingData);
      const { client } = billingData;
      this.downloadBlob(pdfBlob, `estado_cuenta_${client.id}_${new Date().getTime()}.pdf`);
      return true;
    } catch (error) {
      console.error('❌ Error descargando estado de cuenta:', error);
      throw error;
    }
  }

  async downloadServiceContract(contractData) {
    try {
      const pdfBlob = await this.generateServiceContract(contractData);
      const { client, subscription } = contractData;
      this.downloadBlob(pdfBlob, `contrato_${client.id}_${subscription.id}.pdf`);
      return true;
    } catch (error) {
      console.error('❌ Error descargando contrato:', error);
      throw error;
    }
  }

  async downloadInstallationReport(installationData) {
    try {
      const pdfBlob = await this.generateInstallationReport(installationData);
      const { client } = installationData;
      this.downloadBlob(pdfBlob, `reporte_instalacion_${client.id}_${new Date().getTime()}.pdf`);
      return true;
    } catch (error) {
      console.error('❌ Error descargando reporte de instalación:', error);
      throw error;
    }
  }

  downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export default new PDFGeneratorService();