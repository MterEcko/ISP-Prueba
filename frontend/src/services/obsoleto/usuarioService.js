// usuarioService.js
// Servicio para interactuar con los endpoints de Usuarios en el backend.

import API_BASE_URL from "./frontend_apiConfig"; // Ajustar la ruta si es necesario

const usuarioService = {
    /**
     * Obtiene todos los usuarios.
     * @param {object} [queryParams] - Parámetros de consulta opcionales (e.g., { rol_id: 1, departamento_id: 2 }).
     * @returns {Promise<Array<object>>} - Promesa que resuelve con un array de usuarios.
     */
    async getAllUsuarios(queryParams = {}) {
        try {
            const queryString = new URLSearchParams(queryParams).toString();
            const url = queryString ? `${API_BASE_URL}usuarios?${queryString}` : `${API_BASE_URL}usuarios`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log("[usuarioService.js] Usuarios obtenidos:", data);
            return data;
        } catch (error) {
            console.error("[usuarioService.js] Error al obtener todos los usuarios:", error);
            return [];
        }
    },

    /**
     * Obtiene un usuario por su ID.
     * @param {number|string} id - El ID del usuario.
     * @returns {Promise<object|null>} - Promesa que resuelve con el objeto del usuario o null si no se encuentra.
     */
    async getUsuarioById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}usuarios/${id}`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[usuarioService.js] Usuario con ID ${id} no encontrado.`);
                    return null;
                }
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`[usuarioService.js] Usuario con ID ${id} obtenido:`, data);
            return data;
        } catch (error) {
            console.error(`[usuarioService.js] Error al obtener usuario por ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Crea un nuevo usuario.
     * @param {object} usuarioData - Datos del usuario a crear.
     * @returns {Promise<object|null>} - Promesa que resuelve con el usuario creado o null en caso de error.
     */
    async createUsuario(usuarioData) {
        try {
            const response = await fetch(`${API_BASE_URL}usuarios`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(usuarioData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log("[usuarioService.js] Usuario creado:", data);
            return data;
        } catch (error) {
            console.error("[usuarioService.js] Error al crear usuario:", error);
            return null;
        }
    },

    /**
     * Actualiza un usuario existente.
     * @param {number|string} id - El ID del usuario a actualizar.
     * @param {object} usuarioData - Datos actualizados del usuario.
     * @returns {Promise<object|null>} - Promesa que resuelve con el usuario actualizado o null en caso de error.
     */
    async updateUsuario(id, usuarioData) {
        try {
            const response = await fetch(`${API_BASE_URL}usuarios/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(usuarioData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log(`[usuarioService.js] Usuario con ID ${id} actualizado:`, data);
            return data;
        } catch (error) {
            console.error(`[usuarioService.js] Error al actualizar usuario con ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Elimina un usuario por su ID.
     * @param {number|string} id - El ID del usuario a eliminar.
     * @returns {Promise<boolean>} - Promesa que resuelve a true si se eliminó correctamente, false en caso contrario.
     */
    async deleteUsuario(id) {
        try {
            const response = await fetch(`${API_BASE_URL}usuarios/${id}`, {
                method: "DELETE",
                headers: {
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[usuarioService.js] Intento de eliminar usuario con ID ${id} no encontrado.`);
                    return false;
                }
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            console.log(`[usuarioService.js] Usuario con ID ${id} eliminado.`);
            return true;
        } catch (error) {
            console.error(`[usuarioService.js] Error al eliminar usuario con ID ${id}:`, error);
            return false;
        }
    },
};

export default usuarioService;

