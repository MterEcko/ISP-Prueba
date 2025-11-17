// backend/src/controllers/documentGenerate.controller.js

const db = require('../models');
const pdfGenerator = require('../utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

// ===============================
// GENERAR DOCUMENTO
// ===============================

exports.generateDocument = async (req, res) => {
  try {
    const { templateId, clientId } = req.params;
    const { saveToDocuments = true, customVariables = {} } = req.body;

    // Verificar que la plantilla existe
    const template = await db.DocumentTemplate.findByPk(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Verificar que el cliente existe
    const client = await db.Client.findByPk(clientId, {
      include: [
        { model: db.Sector, include: [{ model: db.Node }] }
      ]
    });

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Obtener variables del cliente
    const clientVariables = {
      // Información personal
      nombre_completo: `${client.firstName} ${client.lastName}`,
      nombre: client.firstName,
      apellidos: client.lastName,
      email: client.email || '',
      telefono: client.phone || '',
      whatsapp: client.whatsapp || '',
      domicilio: client.address || '',
      latitud: client.latitude || '',
      longitud: client.longitude || '',
      
      // IDs y referencias
      numero_cliente: client.id,
      numero_contrato: `CONT-${client.id}`,
      
      // Fechas
      fecha_inicio: client.startDate ? new Date(client.startDate).toLocaleDateString('es-MX') : '',
      fecha_generacion: new Date().toLocaleDateString('es-MX'),
      
      // Ubicación
      zona: client.Sector?.Node?.Zone?.name || '',
      nodo: client.Sector?.Node?.name || '',
      sector: client.Sector?.name || '',
      
      // Servicio (valores por defecto si no existen)
      plan_servicio: 'Plan Básico',
      velocidad_descarga: '10',
      velocidad_subida: '5',
      precio_mensual: '500',
      
      // Combinar con variables personalizadas
      ...customVariables
    };

// Generar PDF
const pdfResult = await pdfGenerator.generateFromTemplate(
  template.filePath,
  clientVariables,
  template.config // Asegurar que la configuración del PDF se pasa al generador
);

// Guardar en ClientDocuments si se solicita
let clientDocument = null;
if (saveToDocuments) {
  clientDocument = await db.ClientDocument.create({
    clientId: client.id,
    type: 'Generado',
    filename: `${template.name}_${client.id}_${Date.now()}.pdf`,
    path: pdfResult.filePath,
    description: `Documento generado desde plantilla: ${template.name}`,
    uploadDate: new Date()
  });
}

// Registrar en historial
const history = await db.GeneratedDocumentHistory.create({
  templateId: template.id,
  clientId: client.id,
  generatedBy: req.userId,
  status: 'generated',
  generatedAt: new Date(),
  clientDocumentId: clientDocument ? clientDocument.id : null,
  templateData: clientVariables, // ? CORRECCIÓN: Pasar las variables al campo templateData
  metadata: {
    templateName: template.name
    // NOTA: Si necesitas las variables también en metadata, puedes incluirlas,
    // pero el campo templateData es el que resuelve el error notNull Violation.
  }
});

    // Actualizar estadísticas de la plantilla
    await template.increment('usageCount');
    await template.update({ lastUsed: new Date() });

    return res.status(200).json({
      message: 'Documento generado exitosamente',
      documentId: history.id,
      pdfPath: pdfResult.filePath,
      clientDocumentId: clientDocument ? clientDocument.id : null
    });

  } catch (error) {
    console.error('Error generando documento:', error);
    return res.status(500).json({
      message: 'Error al generar el documento',
      error: error.message
    });
  }
};

// ===============================
// OBTENER HISTORIAL DE CLIENTE
// ===============================

exports.getClientDocumentHistory = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 50 } = req.query;

    // Obtener historial de documentos generados
    const history = await db.GeneratedDocumentHistory.findAll({
      where: { clientId },
      limit: parseInt(limit),
      order: [['generatedAt', 'DESC']],
      include: [
        {
          model: db.DocumentTemplate,
          as: 'template',
          attributes: ['id', 'name', 'description', 'templateType', 'category', 'icon', 'requiresSignature']
        },
        {
          model: db.User,
          as: 'generator', // ? ALIAS CORRECTO
          attributes: ['id', 'username', 'fullName']
        },
        {
          model: db.ClientDocument,
          as: 'savedDocument',
          attributes: ['id', 'filename', 'path']
        }
      ]
    });

    return res.status(200).json(history);

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return res.status(500).json({
      message: 'Error al obtener el historial de documentos',
      error: error.message
    });
  }
};

// ===============================
// PREVIEW DE DOCUMENTO
// ===============================

exports.previewDocument = async (req, res) => {
  try {
    const { templateId, clientId } = req.params;

    // Verificar plantilla
    const template = await db.DocumentTemplate.findByPk(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Verificar cliente
    const client = await db.Client.findByPk(clientId, {
      include: [
        { model: db.Sector, include: [{ model: db.Node }] }
      ]
    });

    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Obtener variables del cliente
    const clientVariables = {
      nombre_completo: `${client.firstName} ${client.lastName}`,
      nombre: client.firstName,
      apellidos: client.lastName,
      email: client.email || '',
      telefono: client.phone || '',
      whatsapp: client.whatsapp || '',
      domicilio: client.address || '',
      numero_cliente: client.id,
      zona: client.Sector?.Node?.Zone?.name || '',
      nodo: client.Sector?.Node?.name || '',
      sector: client.Sector?.name || '',
      fecha_generacion: new Date().toLocaleDateString('es-MX')
    };

    // Generar preview HTML
    const htmlPreview = await pdfGenerator.generateHTMLPreview(
      template.filePath,
      clientVariables
    );

    return res.status(200).json({
      html: htmlPreview,
      variables: clientVariables
    });

  } catch (error) {
    console.error('Error generando preview:', error);
    return res.status(500).json({
      message: 'Error al generar la vista previa',
      error: error.message
    });
  }
};

// ===============================
// DESCARGAR DOCUMENTO GENERADO
// ===============================

exports.downloadGeneratedDocument = async (req, res) => {
  try {
    const { historyId } = req.params;

    // Buscar documento en historial
    const document = await db.GeneratedDocumentHistory.findByPk(historyId, {
      include: [
        {
          model: db.ClientDocument,
          as: 'savedDocument'  // ? Alias correcto
        }
      ]
    });

    if (!document) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    // ? CORRECCIÓN: Usar savedDocument en lugar de clientDocument
    if (!document.savedDocument || !document.savedDocument.path) {
      return res.status(404).json({ 
        message: 'Archivo no encontrado',
        details: 'El documento no tiene un archivo asociado'
      });
    }

    // Verificar que el archivo existe en disco
    if (!fs.existsSync(document.savedDocument.path)) {
      return res.status(404).json({ 
        message: 'Archivo físico no encontrado',
        path: document.savedDocument.path
      });
    }

    // Descargar archivo
    res.download(
      document.savedDocument.path,
      document.savedDocument.filename,
      (err) => {
        if (err) {
          console.error('Error descargando archivo:', err);
          return res.status(500).json({ message: 'Error al descargar el archivo' });
        }
      }
    );

  } catch (error) {
    console.error('Error descargando documento generado:', error);
    return res.status(500).json({
      message: 'Error al descargar el documento',
      error: error.message
    });
  }
};

// ===============================
// MARCAR COMO FIRMADO
// ===============================

exports.signDocument = async (req, res) => {
  try {
    const { historyId } = req.params;
    const { signatureHash } = req.body;

    const document = await db.GeneratedDocumentHistory.findByPk(historyId);
    
    if (!document) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    await document.update({
      status: 'signed',
      signedAt: new Date(),
      metadata: {
        ...document.metadata,
        signatureHash
      }
    });

    return res.status(200).json({
      message: 'Documento firmado exitosamente',
      document
    });

  } catch (error) {
    console.error('Error firmando documento:', error);
    return res.status(500).json({
      message: 'Error al firmar el documento',
      error: error.message
    });
  }
};