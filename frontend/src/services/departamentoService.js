// departamentoService.js
// Servicio para interactuar con los endpoints de Departamentos en el backend.

import API_BASE_URL from "./frontend_apiConfig"; // Ajustar la ruta si es necesario

const departamentoService = {
    /**
     * Obtiene todos los departamentos.
     * @returns {Promise<Array<object>>} - Promesa que resuelve con un array de departamentos.
     */
    async getAllDepartamentos() {
        try {
            const response = await fetch(`${API_BASE_URL}departamentos`);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log("[departamentoService.js] Departamentos obtenidos:", data);
            return data;
        } catch (error) {
            console.error("[departamentoService.js] Error al obtener todos los departamentos:", error);
            return [];
        }
    },

    /**
     * Obtiene un departamento por su ID.
     * @param {number|string} id - El ID del departamento.
     * @returns {Promise<object|null>} - Promesa que resuelve con el objeto del departamento o null si no se encuentra.
     */
    async getDepartamentoById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}departamentos/${id}`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[departamentoService.js] Departamento con ID ${id} no encontrado.`);
                    return null;
                }
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`[departamentoService.js] Departamento con ID ${id} obtenido:`, data);
            return data;
        } catch (error) {
            console.error(`[departamentoService.js] Error al obtener departamento por ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Crea un nuevo departamento.
     * @param {object} departamentoData - Datos del departamento a crear (e.g., { nombre: "Ventas", descripcion: "Departamento de ventas" }).
     * @returns {Promise<object|null>} - Promesa que resuelve con el departamento creado o null en caso de error.
     */
    async createDepartamento(departamentoData) {
        try {
            const response = await fetch(`${API_BASE_URL}departamentos`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(departamentoData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log("[departamentoService.js] Departamento creado:", data);
            return data;
        } catch (error) {
            console.error("[departamentoService.js] Error al crear departamento:", error);
            return null;
        }
    },

    /**
     * Actualiza un departamento existente.
     * @param {number|string} id - El ID del departamento a actualizar.
     * @param {object} departamentoData - Datos actualizados del departamento.
     * @returns {Promise<object|null>} - Promesa que resuelve con el departamento actualizado o null en caso de error.
     */
    async updateDepartamento(id, departamentoData) {
        try {
            const response = await fetch(`${API_BASE_URL}departamentos/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(departamentoData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log(`[departamentoService.js] Departamento con ID ${id} actualizado:`, data);
            return data;
        } catch (error) {
            console.error(`[departamentoService.js] Error al actualizar departamento con ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Elimina un departamento por su ID.
     * @param {number|string} id - El ID del departamento a eliminar.
     * @returns {Promise<boolean>} - Promesa que resuelve a true si se eliminó correctamente, false en caso contrario.
     */
    async deleteDepartamento(id) {
        try {
            const response = await fetch(`${API_BASE_URL}departamentos/${id}`, {
                method: "DELETE",
                headers: {
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[departamentoService.js] Intento de eliminar departamento con ID ${id} no encontrado.`);
                    return false;
                }
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            console.log(`[departamentoService.js] Departamento con ID ${id} eliminado.`);
            return true;
        } catch (error) {
            console.error(`[departamentoService.js] Error al eliminar departamento con ID ${id}:`, error);
            return false;
        }
    },
};

export default departamentoService;

