// backend/src/controllers/documentEmail.controller.js
const db = require('../models');
const GeneratedDocumentHistory = db.GeneratedDocumentHistory;
const ClientDocument = db.ClientDocument;
const Client = db.Client;
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const configHelper = require('../helpers/configHelper');

// Inicializar configHelper
configHelper.init(db);

// Configurar transporter de email usando configuraciones de DB
const createTransporter = async () => {
  try {
    const emailConfig = await configHelper.getEmailConfig();
    
    return nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      tls: emailConfig.tls,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      logger: true,
      debug: true
    });
  } catch (error) {
    console.error('Error creando transporter:', error);
    throw new Error('No se pudo configurar el servicio de email. Verifique las configuraciones.');
  }
};

// ===============================
// ENVIAR DOCUMENTO POR EMAIL
// ===============================

exports.sendDocumentByEmail = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { 
      recipientEmail, 
      subject, 
      message, 
      includeAttachment = true 
    } = req.body;

    console.log('📧 Iniciando envío de email para documento:', documentId);

    // Obtener documento generado
    const document = await GeneratedDocumentHistory.findByPk(documentId, {
      include: [
        {
          model: db.DocumentTemplate,
          as: 'template'
        },
        {
          model: db.Client,
          as: 'client'
        },
        {
          model: ClientDocument,
          as: 'savedDocument'
        }
      ]
    });

    if (!document) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    // Determinar email del destinatario
    const toEmail = recipientEmail || document.client.email;
    if (!toEmail) {
      return res.status(400).json({ 
        message: 'No se especificó email del destinatario y el cliente no tiene email registrado' 
      });
    }

    console.log('📧 Destinatario:', toEmail);

    // Obtener configuración de email desde DB
    const emailConfig = await configHelper.getEmailConfig();

    // Preparar contenido del email
    const emailSubject = subject || `Documento: ${document.template.name}`;
    const emailBody = message || `
      Estimado/a ${document.client.firstName} ${document.client.lastName},
      
      Adjuntamos el documento "${document.template.name}" generado el ${formatDate(document.generatedAt)}.
      
      Si tiene alguna pregunta, no dude en contactarnos.
      
      Saludos cordiales,
      ${emailConfig.from.name}
    `;

    // Configurar email
    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
      to: toEmail,
      subject: emailSubject,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${emailSubject}</h2>
          <div style="white-space: pre-line; line-height: 1.6;">
            ${emailBody}
          </div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Este es un mensaje automático de ${emailConfig.from.name}. Por favor no responda a este email.
          </p>
        </div>
      `
    };

    // Adjuntar PDF si está disponible y se solicitó
    if (includeAttachment && document.savedDocument) {
      try {
        const pdfPath = document.savedDocument.path;
        const pdfExists = await fs.access(pdfPath).then(() => true).catch(() => false);
        
        if (pdfExists) {
          console.log('📎 Adjuntando archivo:', document.savedDocument.filename);
          mailOptions.attachments = [{
            filename: document.savedDocument.filename,
            path: pdfPath
          }];
        } else {
          console.warn('⚠️ Archivo PDF no encontrado:', pdfPath);
        }
      } catch (error) {
        console.error('❌ Error adjuntando PDF:', error);
      }
    }

    // Enviar email
    console.log('📤 Enviando email...');
    const transporter = await createTransporter();
    
    // Verificar conexión primero
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada');
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado:', info.messageId);

    // Registrar envío
    await document.update({
      metadata: {
        ...document.metadata,
        emailsSent: [
          ...(document.metadata?.emailsSent || []),
          {
            to: toEmail,
            subject: emailSubject,
            sentAt: new Date(),
            messageId: info.messageId,
            sentBy: req.userId
          }
        ]
      }
    });

    return res.status(200).json({
      message: 'Documento enviado por email exitosamente',
      emailInfo: {
        to: toEmail,
        subject: emailSubject,
        messageId: info.messageId
      }
    });
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    console.error('Código de error:', error.code);
    console.error('Comando:', error.command);
    
    return res.status(500).json({ 
      message: 'Error enviando documento por email',
      error: error.message,
      code: error.code,
      command: error.command
    });
  }
};


// ===============================
// CONFIGURAR ENVÍO AUTOMÁTICO
// ===============================

exports.configureAutoSend = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { 
      enabled, 
      sendToClient = true,
      sendCopyTo = [],
      emailTemplate 
    } = req.body;

    const template = await db.DocumentTemplate.findByPk(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Actualizar configuración de envío automático
    await template.update({
      metadata: {
        ...template.metadata,
        autoSend: {
          enabled,
          sendToClient,
          sendCopyTo,
          emailTemplate: emailTemplate || {
            subject: `Documento: ${template.name}`,
            message: 'Se adjunta el documento generado.'
          }
        }
      }
    });

    return res.status(200).json({
      message: 'Configuración de envío automático actualizada',
      config: template.metadata.autoSend
    });
  } catch (error) {
    console.error('Error configurando envío automático:', error);
    return res.status(500).json({ 
      message: 'Error configurando envío automático',
      error: error.message 
    });
  }
};

// ===============================
// ENVIAR MÚLTIPLES DOCUMENTOS
// ===============================

exports.sendBulkDocuments = async (req, res) => {
  try {
    const { documentIds, emailConfig } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: 'Se requiere un array de IDs de documentos' });
    }

    const results = {
      success: [],
      failed: []
    };

    const transporter = await createTransporter();

    // Obtener configuración de email
    const systemEmailConfig = await configHelper.getEmailConfig();

    for (const documentId of documentIds) {
      try {
        const document = await GeneratedDocumentHistory.findByPk(documentId, {
          include: [
            {
              model: db.DocumentTemplate,
              as: 'template'
            },
            {
              model: db.Client,
              as: 'client'
            },
            {
              model: ClientDocument,
              as: 'savedDocument'
            }
          ]
        });

        if (!document || !document.client.email) {
          results.failed.push({
            documentId,
            reason: 'Documento no encontrado o cliente sin email'
          });
          continue;
        }

        // Preparar email
        const mailOptions = {
          from: `"${systemEmailConfig.from.name}" <${systemEmailConfig.from.address}>`,
          to: document.client.email,
          subject: emailConfig?.subject || `Documento: ${document.template.name}`,
          html: emailConfig?.message || `
            <p>Estimado/a ${document.client.firstName} ${document.client.lastName},</p>
            <p>Adjuntamos su documento.</p>
            <p>Saludos,<br>${systemEmailConfig.from.name}</p>
          `
        };

        // Adjuntar PDF
        if (document.savedDocument) {
          const pdfExists = await fs.access(document.savedDocument.path)
            .then(() => true)
            .catch(() => false);
          
          if (pdfExists) {
            mailOptions.attachments = [{
              filename: document.savedDocument.filename,
              path: document.savedDocument.path
            }];
          }
        }

        // Enviar
        await transporter.sendMail(mailOptions);

        results.success.push({
          documentId,
          clientEmail: document.client.email
        });
      } catch (error) {
        results.failed.push({
          documentId,
          reason: error.message
        });
      }
    }

    return res.status(200).json({
      message: `Envío completado: ${results.success.length} exitosos, ${results.failed.length} fallidos`,
      results
    });
  } catch (error) {
    console.error('Error enviando documentos masivamente:', error);
    return res.status(500).json({ 
      message: 'Error en envío masivo',
      error: error.message 
    });
  }
};

// ===============================
// OBTENER HISTORIAL DE EMAILS
// ===============================

exports.getEmailHistory = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await GeneratedDocumentHistory.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    const emailHistory = document.metadata?.emailsSent || [];

    return res.status(200).json({
      documentId: document.id,
      totalEmailsSent: emailHistory.length,
      emails: emailHistory
    });
  } catch (error) {
    console.error('Error obteniendo historial de emails:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo historial',
      error: error.message 
    });
  }
};

// ===============================
// PREVIEW DE EMAIL
// ===============================

exports.previewEmail = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { subject, message } = req.body;

    const document = await GeneratedDocumentHistory.findByPk(documentId, {
      include: [
        {
          model: db.DocumentTemplate,
          as: 'template'
        },
        {
          model: db.Client,
          as: 'client'
        }
      ]
    });

    if (!document) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    // Obtener configuración de email
    const emailConfig = await configHelper.getEmailConfig();

    // Reemplazar variables en el mensaje
    let processedMessage = message || '';
    const variables = {
      nombre_completo: `${document.client.firstName} ${document.client.lastName}`,
      nombre: document.client.firstName,
      documento: document.template.name,
      fecha_generacion: formatDate(document.generatedAt),
      empresa: emailConfig.from.name
    };

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedMessage = processedMessage.replace(regex, variables[key]);
    });

    const preview = {
      from: `${emailConfig.from.name} <${emailConfig.from.address}>`,
      to: document.client.email || 'cliente@example.com',
      subject: subject || `Documento: ${document.template.name}`,
      message: processedMessage,
      hasAttachment: !!document.savedDocument,
      attachmentName: document.savedDocument?.filename
    };

    return res.status(200).json(preview);
  } catch (error) {
    console.error('Error generando preview:', error);
    return res.status(500).json({ 
      message: 'Error generando preview',
      error: error.message 
    });
  }
};

// ===============================
// UTILIDADES
// ===============================

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}