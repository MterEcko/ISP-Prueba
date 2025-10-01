// fibraOpticaService.js
// Servicio para interactuar con los endpoints de Equipos de Fibra Óptica en el backend.

import API_BASE_URL from "./frontend_apiConfig"; // Ajustar la ruta si es necesario

const fibraOpticaService = {
    /**
     * Obtiene todos los equipos de fibra óptica.
     * @returns {Promise<Array<object>>} - Promesa que resuelve con un array de equipos.
     */
    async getAllEquipos() {
        try {
            const response = await fetch(`${API_BASE_URL}equiposFibraOptica`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log("[fibraOpticaService.js] Equipos obtenidos:", data);
            return data;
        } catch (error) {
            console.error("[fibraOpticaService.js] Error al obtener todos los equipos de fibra óptica:", error);
            // En una aplicación real, se podría manejar el error de forma más sofisticada
            // (e.g., mostrar notificación al usuario, reintentar, etc.)
            return []; // Retornar un array vacío en caso de error para evitar que la UI rompa
        }
    },

    /**
     * Obtiene un equipo de fibra óptica por su ID.
     * @param {number|string} id - El ID del equipo.
     * @returns {Promise<object|null>} - Promesa que resuelve con el objeto del equipo o null si no se encuentra.
     */
    async getEquipoById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}equipos-fibra-optica/${id}`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[fibraOpticaService.js] Equipo con ID ${id} no encontrado.`);
                    return null;
                }
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`[fibraOpticaService.js] Equipo con ID ${id} obtenido:`, data);
            return data;
        } catch (error) {
            console.error(`[fibraOpticaService.js] Error al obtener equipo de fibra óptica por ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Crea un nuevo equipo de fibra óptica.
     * @param {object} equipoData - Datos del equipo a crear.
     * @returns {Promise<object|null>} - Promesa que resuelve con el equipo creado o null en caso de error.
     */
    async createEquipo(equipoData) {
        try {
            const response = await fetch(`${API_BASE_URL}equipos-fibra-optica`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Aquí podrían ir headers de autenticación si son necesarios (e.g., JWT token)
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(equipoData),
            });
            if (!response.ok) {
                // Intentar parsear el error del backend si está disponible
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log("[fibraOpticaService.js] Equipo creado:", data);
            return data;
        } catch (error) {
            console.error("[fibraOpticaService.js] Error al crear equipo de fibra óptica:", error);
            return null;
        }
    },

    /**
     * Actualiza un equipo de fibra óptica existente.
     * @param {number|string} id - El ID del equipo a actualizar.
     * @param {object} equipoData - Datos actualizados del equipo.
     * @returns {Promise<object|null>} - Promesa que resuelve con el equipo actualizado o null en caso de error.
     */
    async updateEquipo(id, equipoData) {
        try {
            const response = await fetch(`${API_BASE_URL}equipos-fibra-optica/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(equipoData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log(`[fibraOpticaService.js] Equipo con ID ${id} actualizado:`, data);
            return data;
        } catch (error) {
            console.error(`[fibraOpticaService.js] Error al actualizar equipo de fibra óptica con ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Elimina un equipo de fibra óptica por su ID.
     * @param {number|string} id - El ID del equipo a eliminar.
     * @returns {Promise<boolean>} - Promesa que resuelve a true si se eliminó correctamente, false en caso contrario.
     */
    async deleteEquipo(id) {
        try {
            const response = await fetch(`${API_BASE_URL}equipos-fibra-optica/${id}`, {
                method: "DELETE",
                headers: {
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[fibraOpticaService.js] Intento de eliminar equipo con ID ${id} no encontrado.`);
                    return false;
                }
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            console.log(`[fibraOpticaService.js] Equipo con ID ${id} eliminado.`);
            // Usualmente DELETE no retorna contenido, o retorna un mensaje de éxito.
            // Aquí asumimos que un status 200 o 204 significa éxito.
            return true;
        } catch (error) {
            console.error(`[fibraOpticaService.js] Error al eliminar equipo de fibra óptica con ID ${id}:`, error);
            return false;
        }
    },
};

export default fibraOpticaService;

