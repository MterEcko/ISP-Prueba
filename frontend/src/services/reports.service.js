// backend/src/services/reports.service.js - VERSIÓN COMPLETA ACTUALIZADA
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const db = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

class ReportsService {
  constructor() {
    // Directorio temporal para archivos generados
    this.tempDir = path.join(__dirname, '../../temp/reports');
    this._ensureTempDir();
  }

  /**
   * Asegura que el directorio temporal existe
   * @private
   */
  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Recopila y unifica el historial de actividad de un cliente desde múltiples tablas.
   * @param {number} clientId - El ID del cliente.
   * @param {object} filters - Opciones de filtrado (ej. tipo de acción).
   * @returns {Promise<Array>} Una lista unificada y cronológica de eventos.
   */
  async getClientActivityLog(clientId, filters = {}) {
    let allLogs = [];
    const limit = 20; // Límite por tabla para mantener el rendimiento

    // Mapeo de tipos de filtro a las tablas que deben consultar
    const filterMapping = {
      'payment': ['payment', 'invoice', 'clientBilling', 'paymentReminder', 'subscription', 'clientNetworkConfig', 'ticketInstallation', 'ticketCommentInstallation', 'ticketAttachmentInstallation', 'inventoryScrapInstallation'],
      'subscription': ['subscription', 'clientNetworkConfig', 'mikrotikPPPOE', 'mikrotikIp', 'clientInstallation', 'installationMaterial', 'clientBilling', 'clientDocument'],
      'ticket': ['ticket', 'ticketComment', 'ticketAttachment', 'clientSupport'],
      'communication': ['communicationLog', 'communicationContact', 'communicationEvent', 'notificationQueue'],
      'device': ['device', 'inventory', 'mikrotikPPPOE', 'mikrotikIp', 'installationMaterial', 'inventoryScrap', 'clientNetwork'],
      'system': ['client', 'clientDocument', 'communicationLog', 'notificationQueue'],
      'installation': ['clientInstallation', 'installationMaterial', 'ticketAttachment', 'inventory', 'device'],
      'network': ['clientNetworkConfig', 'mikrotikPPPOE', 'mikrotikIp', 'clientNetwork', 'device'],
      'inventory': ['inventory', 'installationMaterial', 'inventoryScrap', 'device']
    };

    // Nueva función shouldFetch mejorada
    const shouldFetch = (tableType) => {
      if (!filters.action || filters.action === '') return true;
      
      const allowedTables = filterMapping[filters.action] || [];
      return allowedTables.includes(tableType);
    };

    // Helper para obtener el modelo sin importar mayúsculas/minúsculas
    const getModel = (modelName) => {
      const pascalCase = modelName.charAt(0).toUpperCase() + modelName.slice(1);
      const camelCase = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      return db[pascalCase] || db[camelCase];
    };

    // Helper para verificar si un ticket es de instalación
    const isInstallationTicket = async (ticketId) => {
      const TicketTypeModel = getModel('TicketType');
      const TicketModel = getModel('Ticket');
      
      if (!TicketModel) return false;
      
      const ticket = await TicketModel.findByPk(ticketId, {
        include: TicketTypeModel ? [{
          model: TicketTypeModel,
          attributes: ['category']
        }] : []
      });
      
      if (!ticket) return false;
      
      // Verificar si es instalación por TicketType o por category directo
      if (ticket.TicketType && ticket.TicketType.category === 'installation') return true;
      if (ticket.category === 'installation') return true;
      
      return false;
    };

    try {
      // ========================================
      // 1. CREACIÓN DEL CLIENTE (Clients)
      // ========================================
      if (shouldFetch('client')) {
        const ClientModel = getModel('Client');
        if (ClientModel) {
          try {
            const client = await ClientModel.findByPk(clientId);
            if (client) {
              allLogs.push({
                id: `c-${client.id}`,
                type: 'system',
                title: 'Cliente Creado',
                description: `La cuenta del cliente fue registrada en el sistema.`,
                timestamp: client.createdAt,
                user: 'Sistema',
                important: true
              });
            }
          } catch (err) {
            console.log('Error en Client:', err.message);
          }
        }
      }

      // ========================================
      // 2. PAGOS (Payments)
      // ========================================
      if (shouldFetch('payment')) {
        const PaymentModel = getModel('Payment');
        if (PaymentModel) {
          try {
            const data = await PaymentModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            data.forEach(p => {
              const amount = parseFloat(p.amount) || 0;
              
              allLogs.push({
                id: `p-${p.id}`,
                type: 'payment',
                title: `Pago ${p.status}`,
                description: `Se procesó un pago de $${amount.toFixed(2)} por ${p.paymentMethod}.`,
                timestamp: p.createdAt,
                user: 'Sistema de Pagos',
                link: `/billing/payments/${p.id}`,
                important: p.status === 'completed'
              });
            });
          } catch (err) {
            console.log('Error en Payments:', err.message);
          }
        }
      }

      // ========================================
      // 3. FACTURAS (Invoices)
      // ========================================
      if (shouldFetch('invoice')) {
        const InvoiceModel = getModel('Invoice');
        if (InvoiceModel) {
          try {
            const data = await InvoiceModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            data.forEach(i => {
              const totalAmount = parseFloat(i.totalAmount) || 0;
              const dueDate = i.dueDate ? new Date(i.dueDate).toLocaleDateString('es-MX') : 'Sin fecha';
              
              allLogs.push({
                id: `i-${i.id}`,
                type: 'payment',
                title: `Factura Generada #${i.invoiceNumber}`,
                description: `Factura por $${totalAmount.toFixed(2)}, vence el ${dueDate}.`,
                timestamp: i.createdAt,
                user: 'Sistema',
                link: `/billing/invoices/${i.id}`
              });
            });
          } catch (err) {
            console.log('Error en Invoices:', err.message);
          }
        }
      }

      // ========================================
      // 4. TICKETS (Tickets)
      // ========================================
      if (shouldFetch('ticket') || shouldFetch('ticketInstallation')) {
        const TicketModel = getModel('Ticket') || getModel('Tickets');
        if (TicketModel) {
          try {
            const data = await TicketModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            
            for (const t of data) {
              const isInstallation = await isInstallationTicket(t.id);
              
              // Si estamos en filtro 'ticket', mostrar todos
              // Si estamos en filtro 'payment', solo mostrar instalaciones
              if (shouldFetch('ticket') || (shouldFetch('ticketInstallation') && isInstallation)) {
                allLogs.push({
                  id: `t-${t.id}`,
                  type: isInstallation ? 'installation' : 'ticket',
                  title: `Ticket #${t.id} - ${t.status}`,
                  description: `Ticket de ${isInstallation ? 'instalación' : 'soporte'}: "${t.title || 'Sin título'}".`,
                  timestamp: t.createdAt,
                  user: 'Sistema',
                  link: `/tickets/${t.id}`,
                  important: isInstallation
                });
              }
            }
          } catch (err) {
            console.log('Error en Tickets:', err.message);
          }
        }
      }

      // ========================================
      // 5. COMUNICACIONES (CommunicationLogs)
      // ========================================
      if (shouldFetch('communicationLog')) {
        const CommLogModel = getModel('CommunicationLog') || getModel('CommunicationLogs');
        if (CommLogModel) {
          try {
            const data = await CommLogModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            data.forEach(c => {
              allLogs.push({
                id: `comm-${c.id}`,
                type: 'communication',
                title: `Mensaje Enviado`,
                description: `Se envió un mensaje a "${c.recipient}". Asunto: ${c.subject || 'Sin asunto'}.`,
                timestamp: c.sentAt || c.createdAt,
                user: 'Sistema'
              });
            });
          } catch (err) {
            console.log('Error en CommunicationLogs:', err.message);
          }
        }
      }

      // ========================================
      // 6. SUSCRIPCIONES (Subscriptions)
      // ========================================
      if (shouldFetch('subscription')) {
        const SubscriptionModel = getModel('Subscription') || getModel('Subscriptions');
        if (SubscriptionModel) {
          try {
            const data = await SubscriptionModel.findAll({
              where: { clientId },
              order: [['updatedAt', 'DESC']],
              limit
            });
            data.forEach(s => {
              allLogs.push({
                id: `sub-${s.id}`,
                type: 'subscription',
                title: `Suscripción Actualizada (${s.status})`,
                description: `La suscripción al plan (ID: ${s.servicePackageId}) cambió a "${s.status}".`,
                timestamp: s.lastStatusChange || s.updatedAt,
                user: 'Sistema',
                important: true
              });
            });
          } catch (err) {
            console.log('Error en Subscriptions:', err.message);
          }
        }
      }

      // ========================================
      // 7. CONFIGURACIONES DE RED (ClientNetworkConfigs)
      // ========================================
      if (shouldFetch('clientNetworkConfig')) {
        const CncModel = getModel('ClientNetworkConfig') || getModel('ClientNetworkConfigs');
        if (CncModel) {
          try {
            const data = await CncModel.findAll({
              where: { clientId },
              order: [['updatedAt', 'DESC']],
              limit
            });
            data.forEach(nc => {
              allLogs.push({
                id: `netconf-${nc.id}`,
                type: 'network',
                title: 'Config. de Red Actualizada',
                description: `Actualizado usuario PPPoE: ${nc.pppoeUsername}.`,
                timestamp: nc.updatedAt,
                user: 'Sistema',
                important: true
              });
            });
          } catch (err) {
            console.log('Error en ClientNetworkConfig:', err.message);
          }
        }
      }

      // ========================================
      // 8. DOCUMENTOS (ClientDocuments)
      // ========================================
      if (shouldFetch('clientDocument')) {
        const DocModel = getModel('ClientDocument') || getModel('ClientDocuments');
        if (DocModel) {
          try {
            const data = await DocModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            data.forEach(d => {
              allLogs.push({
                id: `doc-${d.id}`,
                type: 'system',
                title: 'Documento Subido',
                description: `Se subió un nuevo documento: "${d.filename}".`,
                timestamp: d.uploadDate || d.createdAt,
                user: 'Operador'
              });
            });
          } catch (err) {
            console.log('Error en ClientDocuments:', err.message);
          }
        }
      }

      // ========================================
      // 9. ASIGNACIÓN DE DISPOSITIVOS (Devices)
      // ========================================
      if (shouldFetch('device')) {
        const DeviceModel = getModel('Device') || getModel('Devices');
        if (DeviceModel) {
          try {
            const data = await DeviceModel.findAll({
              where: { clientId },
              order: [['updatedAt', 'DESC']],
              limit
            });
            data.forEach(d => {
              allLogs.push({
                id: `dev-${d.id}`,
                type: 'device',
                title: 'Dispositivo Asignado',
                description: `Se asignó el dispositivo "${d.name}" (Modelo: ${d.model}).`,
                timestamp: d.updatedAt,
                user: 'Sistema'
              });
            });
          } catch (err) {
            console.log('Error en Devices:', err.message);
          }
        }
      }

      // ========================================
      // 10. ASIGNACIÓN DE INVENTARIO (Inventory)
      // ========================================
      if (shouldFetch('inventory')) {
        const InvModel = getModel('Inventory');
        if (InvModel) {
          try {
            const data = await InvModel.findAll({
              where: { clientId },
              order: [['updatedAt', 'DESC']],
              limit
            });
            data.forEach(i => {
              allLogs.push({
                id: `inv-${i.id}`,
                type: 'device',
                title: 'Equipo Asignado',
                description: `Se asignó el equipo de inventario "${i.name}" (S/N: ${i.serialNumber}).`,
                timestamp: i.updatedAt,
                user: 'Sistema'
              });
            });
          } catch (err) {
            console.log('Error en Inventory:', err.message);
          }
        }
      }

      // ========================================
      // 11. CAMBIOS EN PPPoE (MikrotikPPPOEs)
      // ========================================
      if (shouldFetch('mikrotikPPPOE')) {
        const PppoeModel = getModel('MikrotikPPPOE') || getModel('MikrotikPPPOEs');
        if (PppoeModel) {
          try {
            const data = await PppoeModel.findAll({
              where: { clientId },
              order: [['updatedAt', 'DESC']],
              limit
            });
            data.forEach(m => {
              allLogs.push({
                id: `ppp-${m.id}`,
                type: 'network',
                title: `Sesión PPPoE: ${m.status}`,
                description: `El usuario PPPoE "${m.username}" cambió su estado a "${m.status}".`,
                timestamp: m.lastDisconnected || m.updatedAt,
                user: 'Router'
              });
            });
          } catch (err) {
            console.log('Error en MikrotikPPPOE:', err.message);
          }
        }
      }

      // ========================================
      // 12. ASIGNACIÓN DE IP (MikrotikIps)
      // ========================================
      if (shouldFetch('mikrotikIp')) {
        const IpModel = getModel('MikrotikIp') || getModel('MikrotikIps');
        if (IpModel) {
          try {
            const data = await IpModel.findAll({
              where: { clientId },
              order: [['updatedAt', 'DESC']],
              limit
            });
            data.forEach(mi => {
              allLogs.push({
                id: `ip-${mi.id}`,
                type: 'network',
                title: 'IP Asignada',
                description: `Se asignó o actualizó la dirección IP "${mi.ipAddress}".`,
                timestamp: mi.lastSeen || mi.updatedAt,
                user: 'Router'
              });
            });
          } catch (err) {
            console.log('Error en MikrotikIp:', err.message);
          }
        }
      }

      // ========================================
      // 13. CREACIÓN DE FACTURACIÓN (ClientBilling)
      // ========================================
      if (shouldFetch('clientBilling')) {
        const CbModel = getModel('ClientBilling');
        if (CbModel) {
          try {
            const data = await CbModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            data.forEach(cb => {
              allLogs.push({
                id: `cb-${cb.id}`,
                type: 'subscription',
                title: 'Facturación Configurada',
                description: `Se creó la config. de facturación con una cuota de $${cb.monthlyFee}.`,
                timestamp: cb.createdAt,
                user: 'Sistema'
              });
            });
          } catch (err) {
            console.log('Error en ClientBilling:', err.message);
          }
        }
      }

      // ========================================
      // 14. NOTIFICACIONES (NotificationQueue)
      // ========================================
      if (shouldFetch('notificationQueue')) {
        const NqModel = getModel('NotificationQueue');
        if (NqModel) {
          try {
            const data = await NqModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            data.forEach(n => {
              allLogs.push({
                id: `nq-${n.id}`,
                type: 'communication',
                title: `Notificación Programada`,
                description: `Notificación a "${n.recipient}" encolada. Estado: ${n.status}.`,
                timestamp: n.scheduledFor || n.createdAt,
                user: 'Sistema'
              });
            });
          } catch (err) {
            console.log('Error en NotificationQueue:', err.message);
          }
        }
      }

      // ========================================
      // 15. INSTALACIONES (ClientInstallations)
      // ========================================
      if (shouldFetch('clientInstallation')) {
        const CiModel = getModel('ClientInstallation') || getModel('ClientInstallations');
        if (CiModel) {
          try {
            const data = await CiModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            data.forEach(ci => {
              allLogs.push({
                id: `inst-${ci.id}`,
                type: 'installation',
                title: 'Instalación Registrada',
                description: `Reporte de instalación asociado al ticket #${ci.ticketId}.`,
                timestamp: ci.installationDate || ci.createdAt,
                user: 'Técnico',
                important: true
              });
            });
          } catch (err) {
            console.log('Error en ClientInstallation:', err.message);
          }
        }
      }

      // ========================================
      // 16. SOPORTES (ClientSupports)
      // ========================================
      if (shouldFetch('clientSupport')) {
        const CsModel = getModel('ClientSupport') || getModel('ClientSupports');
        if (CsModel) {
          try {
            const data = await CsModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            data.forEach(cs => {
              allLogs.push({
                id: `supp-${cs.id}`,
                type: 'ticket',
                title: `Soporte Registrado: ${cs.issueType}`,
                description: `Se registró un caso de soporte con estado "${cs.status}".`,
                timestamp: cs.createdAt,
                user: 'Sistema'
              });
            });
          } catch (err) {
            console.log('Error en ClientSupport:', err.message);
          }
        }
      }

      // ========================================
      // 17. CONTACTOS (CommunicationContacts)
      // ========================================
      if (shouldFetch('communicationContact')) {
        const CcModel = getModel('CommunicationContact') || getModel('CommunicationContacts');
        if (CcModel) {
          try {
            const data = await CcModel.findAll({
              where: { clientId },
              order: [['updatedAt', 'DESC']],
              limit
            });
            data.forEach(cc => {
              allLogs.push({
                id: `contact-${cc.id}`,
                type: 'communication',
                title: 'Contacto Actualizado',
                description: `Se actualizó un contacto de tipo "${cc.contactType}".`,
                timestamp: cc.updatedAt,
                user: 'Operador'
              });
            });
          } catch (err) {
            console.log('Error en CommunicationContact:', err.message);
          }
        }
      }

      // ========================================
      // 18. EVENTOS (CommunicationEvents)
      // ========================================
      if (shouldFetch('communicationEvent')) {
        const CeModel = getModel('CommunicationEvent') || getModel('CommunicationEvents');
        if (CeModel) {
          try {
            const data = await CeModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            data.forEach(ce => {
              allLogs.push({
                id: `event-${ce.id}`,
                type: 'communication',
                title: `Evento: ${ce.eventType}`,
                description: `Se registró un evento automático del sistema.`,
                timestamp: ce.createdAt,
                user: 'Sistema'
              });
            });
          } catch (err) {
            console.log('Error en CommunicationEvent:', err.message);
          }
        }
      }

      // ========================================
      // 19. ESTADO DE RED (ClientNetworks)
      // ========================================
      if (shouldFetch('clientNetwork')) {
        const CnModel = getModel('ClientNetwork') || getModel('ClientNetworks');
        if (CnModel) {
          try {
            const data = await CnModel.findAll({
              where: { clientId },
              order: [['updatedAt', 'DESC']],
              limit
            });
            data.forEach(cn => {
              allLogs.push({
                id: `cnet-${cn.id}`,
                type: 'network',
                title: `Estado de Red: ${cn.status}`,
                description: `El estado de la red del cliente cambió a "${cn.status}".`,
                timestamp: cn.lastCheck || cn.updatedAt,
                user: 'Sistema de Monitoreo'
              });
            });
          } catch (err) {
            console.log('Error en ClientNetwork:', err.message);
          }
        }
      }

      // ========================================
      // 20. RECORDATORIOS DE PAGO (PaymentReminders)
      // ========================================
      if (shouldFetch('paymentReminder')) {
        const PrModel = getModel('PaymentReminder') || getModel('PaymentReminders');
        if (PrModel) {
          try {
            const data = await PrModel.findAll({
              where: { clientId },
              order: [['createdAt', 'DESC']],
              limit
            });
            data.forEach(pr => {
              allLogs.push({
                id: `pr-${pr.id}`,
                type: 'payment',
                title: `Recordatorio de Pago Enviado`,
                description: `Se envió recordatorio de pago. Tipo: ${pr.reminderType}, Días vencidos: ${pr.daysOverdue}.`,
                timestamp: pr.sentAt || pr.createdAt,
                user: 'Sistema'
              });
            });
          } catch (err) {
            console.log('Error en PaymentReminder:', err.message);
          }
        }
      }

      // ========================================
      // 21. COMENTARIOS DE TICKETS (TicketComments)
      // ========================================
      if (shouldFetch('ticketComment') || shouldFetch('ticketCommentInstallation')) {
        const TcModel = getModel('TicketComment') || getModel('TicketComments');
        if (TcModel) {
          try {
            const TicketModel = getModel('Ticket') || getModel('Tickets');
            if (TicketModel) {
              const tickets = await TicketModel.findAll({
                where: { clientId },
                attributes: ['id']
              });
              const ticketIds = tickets.map(t => t.id);

              if (ticketIds.length > 0) {
                const data = await TcModel.findAll({
                  where: { ticketId: { [Op.in]: ticketIds } },
                  order: [['createdAt', 'DESC']],
                  limit
                });
                
                for (const tc of data) {
                  const isInstallation = await isInstallationTicket(tc.ticketId);
                  
                  if (shouldFetch('ticketComment') || (shouldFetch('ticketCommentInstallation') && isInstallation)) {
                    allLogs.push({
                      id: `tc-${tc.id}`,
                      type: isInstallation ? 'installation' : 'ticket',
                      title: `Comentario en Ticket #${tc.ticketId}`,
                      description: `Se agregó un comentario al ticket.`,
                      timestamp: tc.createdAt,
                      user: 'Usuario',
                      link: `/tickets/${tc.ticketId}`
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.log('Error en TicketComment:', err.message);
          }
        }
      }

      // ========================================
      // 22. ADJUNTOS DE TICKETS (TicketAttachments)
      // ========================================
      if (shouldFetch('ticketAttachment') || shouldFetch('ticketAttachmentInstallation')) {
        const TaModel = getModel('TicketAttachment') || getModel('TicketAttachments');
        if (TaModel) {
          try {
            const TicketModel = getModel('Ticket') || getModel('Tickets');
            if (TicketModel) {
              const tickets = await TicketModel.findAll({
                where: { clientId },
                attributes: ['id']
              });
              const ticketIds = tickets.map(t => t.id);

              if (ticketIds.length > 0) {
                const data = await TaModel.findAll({
                  where: { ticketId: { [Op.in]: ticketIds } },
                  order: [['createdAt', 'DESC']],
                  limit
                });
                
                for (const ta of data) {
                  const isInstallation = await isInstallationTicket(ta.ticketId);
                  
                  if (shouldFetch('ticketAttachment') || (shouldFetch('ticketAttachmentInstallation') && isInstallation)) {
                    allLogs.push({
                      id: `ta-${ta.id}`,
                      type: isInstallation ? 'installation' : 'ticket',
                      title: `Archivo Adjunto en Ticket #${ta.ticketId}`,
                      description: `Se subió el archivo "${ta.filename}".`,
                      timestamp: ta.uploadedAt || ta.createdAt,
                      user: 'Usuario'
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.log('Error en TicketAttachment:', err.message);
          }
        }
      }

      // ========================================
      // 23. MATERIALES DE INSTALACIÓN (InstallationMaterials)
      // ========================================
      if (shouldFetch('installationMaterial')) {
        const ImModel = getModel('InstallationMaterial') || getModel('InstallationMaterials');
        if (ImModel) {
          try {
            const TicketModel = getModel('Ticket') || getModel('Tickets');
            if (TicketModel) {
              const tickets = await TicketModel.findAll({
                where: { clientId },
                attributes: ['id']
              });
              const ticketIds = tickets.map(t => t.id);

              if (ticketIds.length > 0) {
                const data = await ImModel.findAll({
                  where: { ticketId: { [Op.in]: ticketIds } },
                  order: [['createdAt', 'DESC']],
                  limit
                });
                data.forEach(im => {
                  allLogs.push({
                    id: `im-${im.id}`,
                    type: 'installation',
                    title: `Material Utilizado`,
                    description: `Se utilizó material en la instalación. Cantidad: ${im.quantityUsed}.`,
                    timestamp: im.usedAt || im.createdAt,
                    user: 'Técnico'
                  });
                });
              }
            }
          } catch (err) {
            console.log('Error en InstallationMaterial:', err.message);
          }
        }
      }

      // ========================================
      // 24. SCRAP DE INVENTARIO (InventoryScraps)
      // ========================================
      if (shouldFetch('inventoryScrap') || shouldFetch('inventoryScrapInstallation')) {
        const IsModel = getModel('InventoryScrap') || getModel('InventoryScraps');
        if (IsModel) {
          try {
            const InvModel = getModel('Inventory');
            if (InvModel) {
              const inventory = await InvModel.findAll({
                where: { clientId },
                attributes: ['id']
              });
              const inventoryIds = inventory.map(i => i.id);

              if (inventoryIds.length > 0) {
                const data = await IsModel.findAll({
                  where: { inventoryId: { [Op.in]: inventoryIds } },
                  order: [['createdAt', 'DESC']],
                  limit,
                  include: [{
                    model: getModel('Ticket') || getModel('Tickets'),
                    attributes: ['id', 'category'],
                    required: false
                  }]
                });
                
                for (const is of data) {
                  let isInstallation = false;
                  if (is.ticketId) {
                    isInstallation = await isInstallationTicket(is.ticketId);
                  }
                  
                  if (shouldFetch('inventoryScrap') || (shouldFetch('inventoryScrapInstallation') && isInstallation)) {
allLogs.push({
                      id: `scrap-${is.id}`,
                      type: isInstallation ? 'installation' : 'device',
                      title: `Material Descartado`,
                      description: `Se descartó material. Razón: ${is.scrapReason}.`,
                      timestamp: is.scrapDate || is.createdAt,
                      user: 'Técnico'
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.log('Error en InventoryScrap:', err.message);
          }
        }
      }

      // Finalmente, unir todos los logs y ordenarlos por fecha
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Aplicar filtros de fecha si existen
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        allLogs = allLogs.filter(log => new Date(log.timestamp) >= startDate);
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        allLogs = allLogs.filter(log => new Date(log.timestamp) <= endDate);
      }

      return allLogs.slice(0, filters.limit || 200);

    } catch (error) {
      console.error('Error general en getClientActivityLog:', error);
      throw error;
    }
  }

  /**
   * Obtener resumen de actividad del cliente
   */
  async getClientActivitySummary(clientId, period = 'month') {
    const logs = await this.getClientActivityLog(clientId, { limit: 9999 });
    
    const summary = {
      totalEvents: logs.length,
      byType: {},
      byPeriod: {},
      lastActivity: logs[0]?.timestamp || null
    };

    logs.forEach(log => {
      summary.byType[log.type] = (summary.byType[log.type] || 0) + 1;
    });

    return summary;
  }

  /**
   * Exportar log de actividad
   */
  async exportClientActivityLog(clientId, format, filters) {
    const logs = await this.getClientActivityLog(clientId, filters);
    
    if (format === 'csv') {
      let csv = 'Fecha,Hora,Tipo,Título,Descripción,Usuario\n';
      logs.forEach(log => {
        const date = new Date(log.timestamp);
        const dateStr = date.toLocaleDateString('es-MX');
        const timeStr = date.toLocaleTimeString('es-MX');
        csv += `"${dateStr}","${timeStr}","${log.type}","${log.title}","${log.description}","${log.user || ''}"\n`;
      });
      return csv;
    }
    
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Estadísticas del sistema
   */
  async getSystemStats(period = 'month') {
    const ClientModel = db.Client;
    const TicketModel = db.Ticket || db.Tickets;
    const PaymentModel = db.Payment;
    const DeviceModel = db.Device || db.Devices;

    const stats = {
      clients: {
        total: await ClientModel.count(),
        active: await ClientModel.count({ where: { active: true } }),
        inactive: await ClientModel.count({ where: { active: false } })
      },
      tickets: {
        total: await TicketModel?.count() || 0,
        open: await TicketModel?.count({ where: { status: 'open' } }) || 0,
        inProgress: await TicketModel?.count({ where: { status: 'in_progress' } }) || 0,
        closed: await TicketModel?.count({ where: { status: 'closed' } }) || 0
      },
      devices: {
        total: await DeviceModel?.count() || 0,
        online: await DeviceModel?.count({ where: { status: 'online' } }) || 0,
        offline: await DeviceModel?.count({ where: { status: 'offline' } }) || 0
      },
      financial: {
        paymentsThisMonth: await PaymentModel?.count({
          where: {
            status: 'completed',
            createdAt: {
              [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        }) || 0
      }
    };

    return stats;
  }

  /**
   * Resumen de tickets
   */
  async getTicketsSummary(options) {
    const TicketModel = db.Ticket || db.Tickets;
    if (!TicketModel) return { summary: [], total: 0 };

    const summary = await TicketModel.findAll({
      attributes: [
        [options.groupBy, 'group'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: [options.groupBy],
      raw: true
    });

    return {
      summary,
      total: summary.reduce((acc, item) => acc + parseInt(item.count), 0)
    };
  }

  /**
   * Resumen financiero
   */
  async getFinancialSummary(options) {
    const PaymentModel = db.Payment;
    const InvoiceModel = db.Invoice;

    if (!PaymentModel || !InvoiceModel) {
      return { payments: [], invoices: [], total: 0 };
    }

    const payments = await PaymentModel.findAll({
      where: { status: 'completed' },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
      ],
      raw: true
    });

    const invoices = await InvoiceModel.findAll({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('totalAmount')), 'total']
      ],
      raw: true
    });

    return {
      totalPayments: parseFloat(payments[0]?.total || 0),
      totalInvoices: parseFloat(invoices[0]?.total || 0)
    };
  }

  /**
   * Reporte de dispositivos de red
   */
  async getNetworkDevicesReport(options) {
    const DeviceModel = db.Device || db.Devices;
    if (!DeviceModel) return { devices: [], summary: {} };

    const where = {};
    if (options.status) where.status = options.status;
    if (options.type) where.type = options.type;
    if (options.nodeId) where.nodeId = options.nodeId;

    const devices = await DeviceModel.findAll({ where, limit: 100 });

    return {
      devices,
      total: devices.length
    };
  }

  /**
   * Resumen de inventario
   */
  async getInventorySummary(options) {
    const InventoryModel = db.Inventory;
    if (!InventoryModel) return { items: [], summary: {} };

    const where = {};
    if (options.locationId) where.locationId = options.locationId;
    if (options.status) where.status = options.status;

    const items = await InventoryModel.findAll({ where, limit: 100 });

    return {
      items,
      total: items.length
    };
  }

  /**
   * Clientes por ubicación
   */
  async getClientsByLocation(options) {
    const ClientModel = db.Client;
    
    const groupField = options.groupBy === 'node' ? 'nodeId' : 
                       options.groupBy === 'zone' ? 'zoneId' : 'sectorId';

    const where = {};
    if (!options.includeInactive) {
      where.active = true;
    }

    const clients = await ClientModel.findAll({
      where,
      attributes: [
        groupField,
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: [groupField],
      raw: true
    });

    return {
      groups: clients,
      total: clients.reduce((acc, item) => acc + parseInt(item.count), 0)
    };
  }
  
  /**
 * Obtener estadísticas generales del cliente
 */
async getClientGeneralStats(clientId, period = 'monthly') {
  const ClientModel = db.Client;
  const PaymentModel = db.Payment;
  const TicketModel = db.Ticket || db.Tickets;
  const SubscriptionModel = db.Subscription || db.Subscriptions;

  try {
    const client = await ClientModel.findByPk(clientId);
    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    // Calcular días desde el inicio
    const startDate = new Date(client.startDate || client.createdAt);
    const now = new Date();
    const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

    // Calcular ingresos totales
    const payments = await PaymentModel.findAll({
      where: { 
        clientId,
        status: 'completed'
      }
    });

    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Calcular uptime basado en tickets
    const totalTickets = await TicketModel?.count({ where: { clientId } }) || 0;
    const criticalTickets = await TicketModel?.count({ 
      where: { 
        clientId,
        priority: 'high'
      } 
    }) || 0;
    
    const serviceUptime = totalTickets > 0 
      ? Math.max(0, 100 - ((criticalTickets / totalTickets) * 10))
      : 100;

    return {
      totalRevenue: totalRevenue.toFixed(2),
      revenueGrowth: 0, // Calcular comparando periodos
      daysSinceStart,
      startDate: client.startDate || client.createdAt,
      serviceUptime: parseFloat(serviceUptime.toFixed(1)),
      satisfactionScore: 0, // Requiere tabla de encuestas
      totalSurveys: 0
    };
  } catch (error) {
    console.error('Error en getClientGeneralStats:', error);
    throw error;
  }
}

/**
 * Obtener estadísticas de soporte del cliente
 */
async getClientSupportStats(clientId) {
  const TicketModel = db.Ticket || db.Tickets;
  const TicketCommentModel = db.TicketComment || db.TicketComments;

  try {
    const tickets = await TicketModel?.findAll({
      where: { clientId },
      order: [['createdAt', 'DESC']]
    }) || [];

    const totalTickets = tickets.length;

    // Calcular tiempo promedio de respuesta
    let totalResponseTime = 0;
    let ticketsWithResponse = 0;

    for (const ticket of tickets) {
      const firstComment = await TicketCommentModel?.findOne({
        where: { ticketId: ticket.id },
        order: [['createdAt', 'ASC']]
      });

      if (firstComment) {
        const responseTime = new Date(firstComment.createdAt) - new Date(ticket.createdAt);
        totalResponseTime += responseTime;
        ticketsWithResponse++;
      }
    }

    const avgResponseTimeMs = ticketsWithResponse > 0 
      ? totalResponseTime / ticketsWithResponse 
      : 0;
    const avgResponseTimeHours = Math.round(avgResponseTimeMs / (1000 * 60 * 60));

    // Tasa de resolución
    const resolvedTickets = tickets.filter(t => 
      t.status === 'closed' || t.status === 'resolved'
    ).length;
    const resolutionRate = totalTickets > 0 
      ? Math.round((resolvedTickets / totalTickets) * 100) 
      : 0;

    // Categorías de tickets
    const categoryCounts = {};
    tickets.forEach(ticket => {
      const category = ticket.category || 'general';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return {
      totalTickets,
      avgResponseTime: `${avgResponseTimeHours}h`,
      resolutionRate,
      satisfactionRating: 0, // Requiere sistema de calificaciones
      ticketCategories: categoryCounts
    };
  } catch (error) {
    console.error('Error en getClientSupportStats:', error);
    throw error;
  }
}

/**
 * Obtener estadísticas de facturación del cliente
 */
async getClientBillingStats(clientId) {
  const PaymentModel = db.Payment;
  const InvoiceModel = db.Invoice;

  try {
    const payments = await PaymentModel.findAll({
      where: { 
        clientId,
        status: 'completed'
      },
      order: [['createdAt', 'DESC']],
      limit: 6
    });

    const invoices = await InvoiceModel.findAll({
      where: { clientId },
      order: [['createdAt', 'DESC']]
    });

    // Calcular promedio mensual
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const monthsActive = payments.length > 0 ? payments.length : 1;
    const monthlyAverage = totalPaid / monthsActive;

    // Calcular pagos puntuales
    let onTimePayments = 0;
    let totalDelayDays = 0;

    for (const payment of payments) {
      const invoice = invoices.find(inv => inv.id === payment.invoiceId);
      if (invoice) {
        const paymentDate = new Date(payment.paymentDate || payment.createdAt);
        const dueDate = new Date(invoice.dueDate);
        const delayDays = Math.max(0, Math.floor((paymentDate - dueDate) / (1000 * 60 * 60 * 24)));
        
        if (delayDays === 0) onTimePayments++;
        totalDelayDays += delayDays;
      }
    }

    const onTimePaymentsPercent = payments.length > 0 
      ? Math.round((onTimePayments / payments.length) * 100) 
      : 0;
    const avgDelayDays = payments.length > 0 
      ? Math.round(totalDelayDays / payments.length) 
      : 0;

    // Historial de pagos (últimos 6 meses)
    const paymentHistory = {};
    payments.slice(0, 6).reverse().forEach(payment => {
      const date = new Date(payment.createdAt);
      const monthKey = date.toLocaleDateString('es-MX', { month: 'short' });
      
      const invoice = invoices.find(inv => inv.id === payment.invoiceId);
      const isLate = invoice 
        ? new Date(payment.paymentDate || payment.createdAt) > new Date(invoice.dueDate)
        : false;

      paymentHistory[monthKey] = {
        amount: parseFloat(payment.amount || 0),
        late: isLate
      };
    });

    return {
      monthlyAverage: monthlyAverage.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      onTimePayments: onTimePaymentsPercent,
      avgDelayDays,
      paymentHistory
    };
  } catch (error) {
    console.error('Error en getClientBillingStats:', error);
    throw error;
  }
}

/**
 * Calcular puntuación del cliente
 */
async getClientScore(clientId) {
  try {
    const billingStats = await this.getClientBillingStats(clientId);
    const supportStats = await this.getClientSupportStats(clientId);
    const generalStats = await this.getClientGeneralStats(clientId);

    // Puntuación de pagos (0-100)
    const paymentScore = billingStats.onTimePayments;

    // Puntuación de lealtad basada en días (0-100)
    const daysSinceStart = generalStats.daysSinceStart;
    const loyaltyScore = Math.min(100, Math.round((daysSinceStart / 365) * 100));

    // Puntuación de soporte (0-100)
    const supportScore = supportStats.resolutionRate;

    // Puntuación de uso (pendiente, por ahora 0)
    const usageScore = 0;

    // Puntuación general (promedio ponderado)
    const overall = Math.round(
      (paymentScore * 0.4) + 
      (loyaltyScore * 0.3) + 
      (supportScore * 0.2) + 
      (usageScore * 0.1)
    );

    return {
      overall,
      paymentScore,
      loyaltyScore,
      supportScore,
      usageScore
    };
  } catch (error) {
    console.error('Error en getClientScore:', error);
    throw error;
  }
}

/**
 * Obtener comparativas del cliente
 */
async getClientComparisons(clientId) {
  try {
    // Por ahora retornamos valores por defecto
    // Esto requeriría calcular promedios de todos los clientes
    return {
      actualSpeed: 0, // Requiere métricas de red
      dataUsage: 0    // Requiere métricas de uso
    };
  } catch (error) {
    console.error('Error en getClientComparisons:', error);
    throw error;
  }
}

  // ========================================
  // MÉTODOS DE EXPORTACIÓN A PDF Y EXCEL
  // ========================================

  /**
   * Genera reporte de clientes en PDF
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Buffer>} - Buffer del PDF
   */
  async generateClientsPDF(filters = {}) {
    const clients = await this._fetchClients(filters);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Reporte de Clientes', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, { align: 'center' });
        doc.moveDown(2);

        // Totales
        doc.fontSize(14).text(`Total de clientes: ${clients.length}`, { bold: true });
        doc.moveDown();

        // Tabla de clientes
        doc.fontSize(10);
        const tableTop = doc.y;
        const itemHeight = 20;

        // Headers
        doc.font('Helvetica-Bold');
        doc.text('ID', 50, tableTop, { width: 40 });
        doc.text('Nombre', 90, tableTop, { width: 150 });
        doc.text('Email', 240, tableTop, { width: 150 });
        doc.text('Estado', 390, tableTop, { width: 80 });

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Datos
        doc.font('Helvetica');
        let currentY = tableTop + 20;

        clients.forEach((client) => {
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          doc.text(client.id, 50, currentY, { width: 40 });
          doc.text(client.nombre || 'N/A', 90, currentY, { width: 150 });
          doc.text(client.email || 'N/A', 240, currentY, { width: 150 });
          doc.text(client.estado || 'N/A', 390, currentY, { width: 80 });

          currentY += itemHeight;
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Genera reporte de clientes en Excel
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Buffer>} - Buffer del Excel
   */
  async generateClientsExcel(filters = {}) {
    const clients = await this._fetchClients(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema ISP';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Clientes');

    // Configurar columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Dirección', key: 'direccion', width: 40 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Fecha Registro', key: 'createdAt', width: 15 }
    ];

    // Estilo del header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Agregar datos
    clients.forEach(client => {
      worksheet.addRow({
        id: client.id,
        nombre: client.nombre || 'N/A',
        email: client.email || 'N/A',
        telefono: client.telefono || 'N/A',
        direccion: client.direccion || 'N/A',
        estado: client.estado || 'N/A',
        createdAt: client.createdAt ? new Date(client.createdAt).toLocaleDateString('es-MX') : 'N/A'
      });
    });

    // Auto-filtros
    worksheet.autoFilter = {
      from: 'A1',
      to: 'G1'
    };

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Genera reporte de pagos en PDF
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Buffer>} - Buffer del PDF
   */
  async generatePaymentsPDF(filters = {}) {
    const payments = await this._fetchPayments(filters);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Reporte de Pagos', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, { align: 'center' });
        doc.moveDown(2);

        // Calcular totales
        const totalPagos = payments.length;
        const totalMonto = payments.reduce((sum, p) => sum + parseFloat(p.monto || p.amount || 0), 0);

        // Resumen
        doc.fontSize(14).text('Resumen:', { underline: true });
        doc.fontSize(10);
        doc.text(`Total de pagos: ${totalPagos}`);
        doc.text(`Monto total: $${totalMonto.toFixed(2)}`);
        doc.moveDown(2);

        // Tabla de pagos
        const tableTop = doc.y;
        const itemHeight = 20;

        // Headers
        doc.font('Helvetica-Bold');
        doc.text('ID', 50, tableTop, { width: 30 });
        doc.text('Cliente', 80, tableTop, { width: 140 });
        doc.text('Monto', 220, tableTop, { width: 60 });
        doc.text('Estado', 280, tableTop, { width: 70 });
        doc.text('Fecha', 350, tableTop, { width: 80 });

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Datos
        doc.font('Helvetica');
        let currentY = tableTop + 20;

        payments.forEach(payment => {
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          doc.text(payment.id, 50, currentY, { width: 30 });
          doc.text(payment.Client?.nombre || 'N/A', 80, currentY, { width: 140 });
          doc.text(`$${parseFloat(payment.monto || payment.amount || 0).toFixed(2)}`, 220, currentY, { width: 60 });
          doc.text(payment.estado || payment.status || 'N/A', 280, currentY, { width: 70 });
          doc.text(
            payment.fecha_pago || payment.paymentDate ? new Date(payment.fecha_pago || payment.paymentDate).toLocaleDateString('es-MX') : 'N/A',
            350,
            currentY,
            { width: 80 }
          );

          currentY += itemHeight;
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Genera reporte de pagos en Excel
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Buffer>} - Buffer del Excel
   */
  async generatePaymentsExcel(filters = {}) {
    const payments = await this._fetchPayments(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema ISP';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Pagos');

    // Configurar columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Monto', key: 'monto', width: 15 },
      { header: 'Método de Pago', key: 'metodo', width: 20 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Fecha de Pago', key: 'fecha', width: 15 },
      { header: 'Referencia', key: 'referencia', width: 25 }
    ];

    // Estilo del header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Agregar datos
    payments.forEach(payment => {
      worksheet.addRow({
        id: payment.id,
        cliente: payment.Client?.nombre || 'N/A',
        monto: parseFloat(payment.monto || payment.amount || 0),
        metodo: payment.metodo_pago || payment.paymentMethod || 'N/A',
        estado: payment.estado || payment.status || 'N/A',
        fecha: payment.fecha_pago || payment.paymentDate ? new Date(payment.fecha_pago || payment.paymentDate).toLocaleDateString('es-MX') : 'N/A',
        referencia: payment.referencia || payment.reference || 'N/A'
      });
    });

    // Formato de moneda para la columna de monto
    worksheet.getColumn('monto').numFmt = '"$"#,##0.00';

    // Auto-filtros
    worksheet.autoFilter = {
      from: 'A1',
      to: 'G1'
    };

    // Agregar resumen al final
    const totalRow = worksheet.rowCount + 2;
    worksheet.getCell(`A${totalRow}`).value = 'TOTAL:';
    worksheet.getCell(`A${totalRow}`).font = { bold: true };
    worksheet.getCell(`C${totalRow}`).value = {
      formula: `SUM(C2:C${worksheet.rowCount - 1})`
    };
    worksheet.getCell(`C${totalRow}`).font = { bold: true };
    worksheet.getCell(`C${totalRow}`).numFmt = '"$"#,##0.00';

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Obtiene clientes con filtros
   * @private
   */
  async _fetchClients(filters) {
    const where = {};

    if (filters.estado) {
      where.estado = filters.estado;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt[Op.gte] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt[Op.lte] = new Date(filters.dateTo);
      }
    }

    return await db.Client.findAll({
      where,
      order: [['id', 'DESC']],
      limit: filters.limit || 1000
    });
  }

  /**
   * Obtiene pagos con filtros
   * @private
   */
  async _fetchPayments(filters) {
    const where = {};

    if (filters.estado) {
      where.estado = filters.estado;
      where.status = filters.estado;
    }

    if (filters.metodo_pago) {
      where.metodo_pago = filters.metodo_pago;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.fecha_pago = {};
      where.paymentDate = {};
      if (filters.dateFrom) {
        where.fecha_pago[Op.gte] = new Date(filters.dateFrom);
        where.paymentDate[Op.gte] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.fecha_pago[Op.lte] = new Date(filters.dateTo);
        where.paymentDate[Op.lte] = new Date(filters.dateTo);
      }
    }

    return await db.Payment.findAll({
      where,
      include: [{
        model: db.Client,
        attributes: ['id', 'nombre'],
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: filters.limit || 1000
    });
  }
}

module.exports = new ReportsService();