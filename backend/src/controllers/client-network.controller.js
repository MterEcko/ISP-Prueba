// Agregar estos imports al inicio del archivo
const TpLinkService = require("../services/client-network.service");

// Agregar estos métodos al controlador existente
exports.associateWithTpLinkDevice = async (req, res) => {
  try {
    const clientNetworkId = req.params.id;
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        message: "ID del dispositivo TP-Link es requerido"
      });
    }

    const result = await TpLinkService.associateWithTpLinkDevice(clientNetworkId, deviceId);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      message: error.message || "Error al asociar red de cliente con dispositivo TP-Link"
    });
  }
};

exports.applyTpLinkSpeedConfig = async (req, res) => {
  try {
    const clientNetworkId = req.params.id;
    
    const result = await TpLinkService.applySpeedConfigToTpLinkDevice(clientNetworkId);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      message: error.message || "Error al aplicar configuración de velocidad"
    });
  }
};

exports.updateTpLinkStatus = async (req, res) => {
  try {
    const clientNetworkId = req.params.id;
    
    const result = await TpLinkService.updateTpLinkConnectionStatus(clientNetworkId);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      message: error.message || "Error al actualizar estado de conexión"
    });
  }
};