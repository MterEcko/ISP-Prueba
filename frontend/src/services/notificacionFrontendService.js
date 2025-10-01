// notificacionFrontendService.js
// Servicio para interactuar con los endpoints de Notificaciones (Telegram, WhatsApp) en el backend.

import API_BASE_URL from "./frontend_apiConfig"; // Ajustar la ruta si es necesario

const notificacionFrontendService = {

    /**
     * Envía una notificación genérica a través del backend.
     * El backend decidirá el canal (Telegram, WhatsApp, Email, etc.) basado en la configuración o el tipo de notificación.
     * @param {object} notificacionData - Datos de la notificación.
     * E.g., { userId: 123, tipo: "recordatorio_pago", mensaje: "Su factura vence pronto", canalPreferido: "whatsapp" }
     * @returns {Promise<object|null>} - Promesa que resuelve con la respuesta del backend.
     */
    async enviarNotificacion(notificacionData) {
        try {
            // Asumiendo un endpoint genérico en el backend para manejar el envío de notificaciones.
            // Este endpoint podría ser /notificaciones/enviar o similar.
            const response = await fetch(`${API_BASE_URL}notificaciones/enviar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(notificacionData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log("[notificacionFrontendService.js] Respuesta de envío de notificación:", data);
            return data; // Podría ser { success: true, messageId: "...", canal: "whatsapp" }
        } catch (error) {
            console.error("[notificacionFrontendService.js] Error al enviar notificación:", error);
            return null;
        }
    },

    /**
     * Envía un mensaje directo a través de Telegram usando el backend.
     * @param {string} chatId - El ID del chat de Telegram.
     * @param {string} texto - El mensaje a enviar.
     * @returns {Promise<object|null>} - Promesa que resuelve con la respuesta del backend.
     */
    async enviarMensajeTelegram(chatId, texto) {
        try {
            const response = await fetch(`${API_BASE_URL}notificaciones/telegram/enviar-mensaje`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ chatId, texto }),
            });
            if (!response.ok) throw new Error("Error al enviar mensaje de Telegram");
            const data = await response.json();
            console.log("[notificacionFrontendService.js] Mensaje de Telegram enviado:", data);
            return data;
        } catch (error) {
            console.error("[notificacionFrontendService.js] Error al enviar mensaje de Telegram:", error);
            return null;
        }
    },

    /**
     * Envía un mensaje de plantilla de WhatsApp usando el backend.
     * @param {string} numero - Número de WhatsApp del destinatario.
     * @param {string} templateName - Nombre de la plantilla aprobada.
     * @param {string} languageCode - Código de idioma (e.g., "es_MX").
     * @param {Array<object>} components - Componentes de la plantilla.
     * @returns {Promise<object|null>} - Promesa que resuelve con la respuesta del backend.
     */
    async enviarMensajePlantillaWhatsApp(numero, templateName, languageCode, components) {
        try {
            const response = await fetch(`${API_BASE_URL}notificaciones/whatsapp/enviar-plantilla`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ numero, templateName, languageCode, components }),
            });
            if (!response.ok) throw new Error("Error al enviar plantilla de WhatsApp");
            const data = await response.json();
            console.log("[notificacionFrontendService.js] Plantilla de WhatsApp enviada:", data);
            return data;
        } catch (error) {
            console.error("[notificacionFrontendService.js] Error al enviar plantilla de WhatsApp:", error);
            return null;
        }
    }

    // Aquí podrían ir más métodos para gestionar plantillas de mensajes, preferencias de notificación del usuario, etc.
    // Por ejemplo, obtener plantillas disponibles:
    // async getPlantillasMensaje(canal) { ... }
};

export default notificacionFrontendService;

