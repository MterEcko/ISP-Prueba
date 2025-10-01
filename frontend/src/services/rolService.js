// rolService.js
// Servicio para interactuar con los endpoints de Roles en el backend.

import API_BASE_URL from "./frontend_apiConfig"; // Ajustar la ruta si es necesario

const rolService = {
    /**
     * Obtiene todos los roles.
     * @returns {Promise<Array<object>>} - Promesa que resuelve con un array de roles.
     */
    async getAllRoles() {
        try {
            const response = await fetch(`${API_BASE_URL}roles`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log("[rolService.js] Roles obtenidos:", data);
            return data;
        } catch (error) {
            console.error("[rolService.js] Error al obtener todos los roles:", error);
            return [];
        }
    },

    /**
     * Obtiene un rol por su ID.
     * @param {number|string} id - El ID del rol.
     * @returns {Promise<object|null>} - Promesa que resuelve con el objeto del rol o null si no se encuentra.
     */
    async getRolById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}roles/${id}`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[rolService.js] Rol con ID ${id} no encontrado.`);
                    return null;
                }
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`[rolService.js] Rol con ID ${id} obtenido:`, data);
            return data;
        } catch (error) {
            console.error(`[rolService.js] Error al obtener rol por ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Crea un nuevo rol.
     * @param {object} rolData - Datos del rol a crear (e.g., { nombre: "Nuevo Rol", descripcion: "Descripción del rol" }).
     * @returns {Promise<object|null>} - Promesa que resuelve con el rol creado o null en caso de error.
     */
    async createRol(rolData) {
        try {
            const response = await fetch(`${API_BASE_URL}roles`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(rolData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log("[rolService.js] Rol creado:", data);
            return data;
        } catch (error) {
            console.error("[rolService.js] Error al crear rol:", error);
            return null;
        }
    },

    /**
     * Actualiza un rol existente.
     * @param {number|string} id - El ID del rol a actualizar.
     * @param {object} rolData - Datos actualizados del rol.
     * @returns {Promise<object|null>} - Promesa que resuelve con el rol actualizado o null en caso de error.
     */
    async updateRol(id, rolData) {
        try {
            const response = await fetch(`${API_BASE_URL}roles/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(rolData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log(`[rolService.js] Rol con ID ${id} actualizado:`, data);
            return data;
        } catch (error) {
            console.error(`[rolService.js] Error al actualizar rol con ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Elimina un rol por su ID.
     * @param {number|string} id - El ID del rol a eliminar.
     * @returns {Promise<boolean>} - Promesa que resuelve a true si se eliminó correctamente, false en caso contrario.
     */
    async deleteRol(id) {
        try {
            const response = await fetch(`${API_BASE_URL}roles/${id}`, {
                method: "DELETE",
                headers: {
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[rolService.js] Intento de eliminar rol con ID ${id} no encontrado.`);
                    return false;
                }
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            console.log(`[rolService.js] Rol con ID ${id} eliminado.`);
            return true;
        } catch (error) {
            console.error(`[rolService.js] Error al eliminar rol con ID ${id}:`, error);
            return false;
        }
    },
};

export default rolService;

