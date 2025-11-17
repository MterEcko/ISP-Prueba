// backend/src/controllers/documentBulk.controller.js
const db = require('../models');
const DocumentTemplate = db.DocumentTemplate;
const GeneratedDocumentHistory = db.GeneratedDocumentHistory;
const Client = db.Client;
const archiver = require('archiver');
const { generatePDF } = require('../utils/pdfGenerator');
const fs = require('fs').promises;
const path = require('path');

// ===============================
// GENERAR DOCUMENTOS MASIVOS
// ===============================

const generateBulkDocuments = async (req, res) => {
  try {
    const { templateId, clientIds, saveToDocuments = true } = req.body;
    const userId = req.userId;

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        message: 'Se requiere un array de IDs de clientes'
      });
    }

    // Verificar plantilla
    const template = await DocumentTemplate.findByPk(templateId);
    if (!template || !template.enabled) {
      return res.status(404).json({
        message: 'Plantilla no encontrada o deshabilitada'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    // Procesar cada cliente
    for (const clientId of clientIds) {
      try {
        // Obtener cliente
        const client = await getClientWithAllData(clientId);
        if (!client) {
          results.failed.push({
            clientId,
            reason: 'Cliente no encontrado'
          });
          continue;
        }

        // Obtener variables
        const variables = await buildClientVariables(client);

        // Leer plantilla HTML
        const templatePath = path.join(
          __dirname,
          '../../templates/documents',
          path.basename(template.filePath)
        );

        let htmlContent = await fs.readFile(templatePath, 'utf-8');

        // Reemplazar variables
        htmlContent = replaceVariables(htmlContent, variables);

        // Generar nombre de archivo
        const filename = generateFilename(template, client);

        // Crear directorio
        const clientDir = path.join(__dirname, `../../uploads/clients/${clientId}`);
        await fs.mkdir(clientDir, { recursive: true });

        // Ruta completa del PDF
        const pdfPath = path.join(clientDir, filename);

        // Generar PDF
        await generatePDF(htmlContent, pdfPath, template.config);

        let clientDocumentId = null;

        // Guardar en ClientDocuments si se solicitó
        if (saveToDocuments) {
          const clientDocument = await db.ClientDocument.create({
            clientId: client.id,
            type: template.name,
            filename: filename,
            path: pdfPath,
            description: `Generado masivamente - ${template.description}`,
            uploadDate: new Date()
          });
          clientDocumentId = clientDocument.id;
        }

        // Registrar en historial
        const history = await GeneratedDocumentHistory.create({
          clientId: client.id,
          templateId: template.id,
          clientDocumentId,
          templateData: variables,
          generatedBy: userId,
          status: 'generated',
          ipAddress: req.ip || req.connection.remoteAddress
        });

        results.success.push({
          clientId,
          clientName: `${client.firstName} ${client.lastName}`,
          documentId: clientDocumentId,
          historyId: history.id,
          filename
        });

      } catch (error) {
        console.error(`Error generando documento para cliente ${clientId}:`, error);
        results.failed.push({
          clientId,
          reason: error.message
        });
      }
    }

    return res.status(200).json({
      message: `Generación completada: ${results.success.length} exitosos, ${results.failed.length} fallidos`,
      results
    });

  } catch (error) {
    console.error('Error en generación masiva:', error);
    return res.status(500).json({
      message: 'Error en generación masiva',
      error: error.message
    });
  }
};

// ===============================
// DESCARGAR DOCUMENTOS EN ZIP
// ===============================

const downloadBulkDocuments = async (req, res) => {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        message: 'Se requiere un array de IDs de documentos'
      });
    }

    // Obtener documentos
    const documents = await db.ClientDocument.findAll({
      where: {
        id: documentIds
      },
      include: [{
        model: Client,
        attributes: ['firstName', 'lastName']
      }]
    });

    if (documents.length === 0) {
      return res.status(404).json({
        message: 'No se encontraron documentos'
      });
    }

    // Configurar response para ZIP
    const zipName = `documentos_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    // Crear archivo ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.pipe(res);

    // Agregar cada documento al ZIP
    for (const doc of documents) {
      try {
        const fileExists = await fs.access(doc.path)
          .then(() => true)
          .catch(() => false);

        if (fileExists) {
          const clientName = doc.Client 
            ? `${doc.Client.firstName}_${doc.Client.lastName}`.replace(/\s+/g, '_')
            : 'sin_cliente';
          
          const fileName = `${clientName}/${doc.filename}`;
          archive.file(doc.path, { name: fileName });
        }
      } catch (error) {
        console.error(`Error agregando documento ${doc.id} al ZIP:`, error);
      }
    }

    await archive.finalize();

  } catch (error) {
    console.error('Error generando ZIP:', error);
    return res.status(500).json({
      message: 'Error generando archivo ZIP',
      error: error.message
    });
  }
};

// ===============================
// FUNCIONES AUXILIARES
// ===============================

async function getClientWithAllData(clientId) {
  return await Client.findByPk(clientId, {
    include: [
      {
        model: db.Sector,
        as: 'Sector',
        include: [{
          model: db.Node,
          as: 'Node',
          include: [{
            model: db.Zone,
            as: 'Zone'
          }]
        }]
      },
      {
        model: db.Subscription,
        as: 'subscriptions',
        where: { status: 'active' },
        required: false,
        include: [{
          model: db.ServicePackage,
          as: 'servicePackage'
        }]
      }
    ]
  });
}

async function buildClientVariables(client) {
  const subscription = client.subscriptions?.[0];

  return {
    nombre_completo: `${client.firstName} ${client.lastName}`,
    nombre: client.firstName,
    apellidos: client.lastName,
    domicilio: client.address || 'No especificado',
    telefono: client.phone || 'No especificado',
    email: client.email || 'No especificado',
    whatsapp: client.whatsapp || client.phone || 'No especificado',
    numero_cliente: client.id,
    numero_contrato: client.contractNumber || `ISP-${client.id.toString().padStart(6, '0')}`,
    fecha_inicio: client.startDate ? formatDate(client.startDate) : formatDate(new Date()),
    plan_servicio: subscription?.servicePackage?.name || 'No asignado',
    velocidad_descarga: subscription?.servicePackage?.downloadSpeedMbps || 'N/A',
    velocidad_subida: subscription?.servicePackage?.uploadSpeedMbps || 'N/A',
    precio_mensual: subscription?.monthlyFee || subscription?.servicePackage?.price || '0',
    usuario_pppoe: subscription?.pppoeUsername || 'No asignado',
    ip_asignada: subscription?.assignedIpAddress || 'DHCP',
    zona: client.Sector?.Node?.Zone?.name || 'No asignada',
    nodo: client.Sector?.Node?.name || 'No asignado',
    sector: client.Sector?.name || 'No asignado',
    fecha_generacion: formatDate(new Date()),
    latitud: client.latitude,
    longitud: client.longitude
  };
}

function replaceVariables(html, variables) {
  let result = html;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  
  return result;
}

function generateFilename(template, client) {
  const timestamp = new Date().getTime();
  const clientName = `${client.firstName}_${client.lastName}`.replace(/\s+/g, '_');
  const templateName = template.name.replace(/\s+/g, '_');
  
  return `${templateName}_${clientName}_${timestamp}.pdf`;
}

function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} de ${month} de ${year}`;
}

// ===============================
// EXPORTAR (CORREGIDO)
// ===============================
module.exports = {
  generateBulkDocuments,
  downloadBulkDocuments
};