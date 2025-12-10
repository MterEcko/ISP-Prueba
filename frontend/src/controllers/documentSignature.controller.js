// backend/src/controllers/documentSignature.controller.js
const db = require('../models');
const DocumentSignature = db.DocumentSignature;
const GeneratedDocumentHistory = db.GeneratedDocumentHistory;
const crypto = require('crypto');

// ===============================
// CREAR FIRMA
// ===============================

exports.createSignature = async (req, res) => {
  try {
    const { 
      generatedDocumentId,
      signerType,
      signerName,
      signatureData,
      geolocation,
      notes
    } = req.body;

    const clientId = req.body.clientId || req.params.clientId;

    // Validar que el documento existe
    const document = await GeneratedDocumentHistory.findByPk(generatedDocumentId);
    if (!document) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    // Generar hash de la firma
    const signatureHash = crypto
      .createHash('sha256')
      .update(signatureData + Date.now())
      .digest('hex');

    // Crear firma
    const signature = await DocumentSignature.create({
      generatedDocumentId,
      clientId,
      signerType: signerType || 'client',
      signerName,
      signatureData,
      signatureHash,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      geolocation,
      signedAt: new Date(),
      status: 'valid',
      notes
    });

    // Actualizar documento como firmado
    await document.update({
      signatureCompleted: true,
      signedAt: new Date(),
      signedBy: req.userId
    });

    return res.status(201).json({
      message: 'Firma registrada exitosamente',
      signature: {
        id: signature.id,
        signatureHash: signature.signatureHash,
        signedAt: signature.signedAt
      }
    });
  } catch (error) {
    console.error('Error creando firma:', error);
    return res.status(500).json({ 
      message: 'Error registrando firma',
      error: error.message 
    });
  }
};

// ===============================
// OBTENER FIRMAS DE UN DOCUMENTO
// ===============================

exports.getDocumentSignatures = async (req, res) => {
  try {
    const { documentId } = req.params;

    const signatures = await DocumentSignature.findAll({
      where: { generatedDocumentId: documentId },
      include: [
        {
          model: db.Client,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['signedAt', 'DESC']]
    });

    return res.status(200).json(signatures);
  } catch (error) {
    console.error('Error obteniendo firmas:', error);
    return res.status(500).json({ 
      message: 'Error obteniendo firmas',
      error: error.message 
    });
  }
};

// ===============================
// VERIFICAR FIRMA
// ===============================

exports.verifySignature = async (req, res) => {
  try {
    const { id } = req.params;

    const signature = await DocumentSignature.findByPk(id, {
      include: [
        {
          model: GeneratedDocumentHistory,
          as: 'document'
        },
        {
          model: db.Client,
          as: 'client'
        }
      ]
    });

    if (!signature) {
      return res.status(404).json({ message: 'Firma no encontrada' });
    }

    const verification = {
      valid: signature.status === 'valid',
      signature: {
        id: signature.id,
        signerName: signature.signerName,
        signerType: signature.signerType,
        signedAt: signature.signedAt,
        hash: signature.signatureHash,
        status: signature.status
      },
      metadata: {
        ipAddress: signature.ipAddress,
        userAgent: signature.userAgent,
        geolocation: signature.geolocation
      },
      document: {
        id: signature.document.id,
        template: signature.document.templateId
      }
    };

    return res.status(200).json(verification);
  } catch (error) {
    console.error('Error verificando firma:', error);
    return res.status(500).json({ 
      message: 'Error verificando firma',
      error: error.message 
    });
  }
};

// ===============================
// REVOCAR FIRMA
// ===============================

exports.revokeSignature = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const signature = await DocumentSignature.findByPk(id);
    if (!signature) {
      return res.status(404).json({ message: 'Firma no encontrada' });
    }

    await signature.update({
      status: 'revoked',
      notes: `Revocada: ${reason || 'Sin razón especificada'}`
    });

    return res.status(200).json({
      message: 'Firma revocada exitosamente',
      signature
    });
  } catch (error) {
    console.error('Error revocando firma:', error);
    return res.status(500).json({ 
      message: 'Error revocando firma',
      error: error.message 
    });
  }
};