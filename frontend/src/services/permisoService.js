// permisoService.js
// Servicio para interactuar con los endpoints de Permisos en el backend.

import API_BASE_URL from "./frontend_apiConfig"; // Ajustar la ruta si es necesario

const permisoService = {
    /**
     * Obtiene todos los permisos.
     * @returns {Promise<Array<object>>} - Promesa que resuelve con un array de permisos.
     */
    async getAllPermisos() {
        try {
            const response = await fetch(`${API_BASE_URL}permisos`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log("[permisoService.js] Permisos obtenidos:", data);
            return data;
        } catch (error) {
            console.error("[permisoService.js] Error al obtener todos los permisos:", error);
            return [];
        }
    },

    /**
     * Obtiene un permiso por su ID.
     * @param {number|string} id - El ID del permiso.
     * @returns {Promise<object|null>} - Promesa que resuelve con el objeto del permiso o null si no se encuentra.
     */
    async getPermisoById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}permisos/${id}`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[permisoService.js] Permiso con ID ${id} no encontrado.`);
                    return null;
                }
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`[permisoService.js] Permiso con ID ${id} obtenido:`, data);
            return data;
        } catch (error) {
            console.error(`[permisoService.js] Error al obtener permiso por ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Crea un nuevo permiso.
     * @param {object} permisoData - Datos del permiso a crear (e.g., { nombre: "ver_dashboard", descripcion: "Permite ver el dashboard" }).
     * @returns {Promise<object|null>} - Promesa que resuelve con el permiso creado o null en caso de error.
     */
    async createPermiso(permisoData) {
        try {
            const response = await fetch(`${API_BASE_URL}permisos`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(permisoData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log("[permisoService.js] Permiso creado:", data);
            return data;
        } catch (error) {
            console.error("[permisoService.js] Error al crear permiso:", error);
            return null;
        }
    },

    /**
     * Actualiza un permiso existente.
     * @param {number|string} id - El ID del permiso a actualizar.
     * @param {object} permisoData - Datos actualizados del permiso.
     * @returns {Promise<object|null>} - Promesa que resuelve con el permiso actualizado o null en caso de error.
     */
    async updatePermiso(id, permisoData) {
        try {
            const response = await fetch(`${API_BASE_URL}permisos/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(permisoData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log(`[permisoService.js] Permiso con ID ${id} actualizado:`, data);
            return data;
        } catch (error) {
            console.error(`[permisoService.js] Error al actualizar permiso con ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Elimina un permiso por su ID.
     * @param {number|string} id - El ID del permiso a eliminar.
     * @returns {Promise<boolean>} - Promesa que resuelve a true si se eliminó correctamente, false en caso contrario.
     */
    async deletePermiso(id) {
        try {
            const response = await fetch(`${API_BASE_URL}permisos/${id}`, {
                method: "DELETE",
                headers: {
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[permisoService.js] Intento de eliminar permiso con ID ${id} no encontrado.`);
                    return false;
                }
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            console.log(`[permisoService.js] Permiso con ID ${id} eliminado.`);
            return true;
        } catch (error) {
            console.error(`[permisoService.js] Error al eliminar permiso con ID ${id}:`, error);
            return false;
        }
    },
};

export default permisoService;

