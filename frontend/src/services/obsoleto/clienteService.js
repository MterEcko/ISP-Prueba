// clienteService.js
// Servicio para interactuar con los endpoints de Clientes en el backend.

import API_BASE_URL from "./frontend_apiConfig"; // Ajustar la ruta si es necesario

const clienteService = {
    /**
     * Obtiene todos los clientes.
     * @param {object} [queryParams] - Parámetros de consulta opcionales (e.g., { estado_cliente: 'activo', plan_id: 3 }).
     * @returns {Promise<Array<object>>} - Promesa que resuelve con un array de clientes.
     */
    async getAllClientes(queryParams = {}) {
        try {
            const queryString = new URLSearchParams(queryParams).toString();
            const url = queryString ? `${API_BASE_URL}clientes?${queryString}` : `${API_BASE_URL}clientes`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log("[clienteService.js] Clientes obtenidos:", data);
            return data;
        } catch (error) {
            console.error("[clienteService.js] Error al obtener todos los clientes:", error);
            return [];
        }
    },

    /**
     * Obtiene un cliente por su ID.
     * @param {number|string} id - El ID del cliente.
     * @returns {Promise<object|null>} - Promesa que resuelve con el objeto del cliente o null si no se encuentra.
     */
    async getClienteById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}clientes/${id}`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[clienteService.js] Cliente con ID ${id} no encontrado.`);
                    return null;
                }
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`[clienteService.js] Cliente con ID ${id} obtenido:`, data);
            return data;
        } catch (error) {
            console.error(`[clienteService.js] Error al obtener cliente por ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Crea un nuevo cliente.
     * @param {object} clienteData - Datos del cliente a crear.
     * @returns {Promise<object|null>} - Promesa que resuelve con el cliente creado o null en caso de error.
     */
    async createCliente(clienteData) {
        try {
            const response = await fetch(`${API_BASE_URL}clientes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(clienteData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log("[clienteService.js] Cliente creado:", data);
            return data;
        } catch (error) {
            console.error("[clienteService.js] Error al crear cliente:", error);
            return null;
        }
    },

    /**
     * Actualiza un cliente existente.
     * @param {number|string} id - El ID del cliente a actualizar.
     * @param {object} clienteData - Datos actualizados del cliente.
     * @returns {Promise<object|null>} - Promesa que resuelve con el cliente actualizado o null en caso de error.
     */
    async updateCliente(id, clienteData) {
        try {
            const response = await fetch(`${API_BASE_URL}clientes/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify(clienteData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            const data = await response.json();
            console.log(`[clienteService.js] Cliente con ID ${id} actualizado:`, data);
            return data;
        } catch (error) {
            console.error(`[clienteService.js] Error al actualizar cliente con ID ${id}:`, error);
            return null;
        }
    },

    /**
     * Elimina un cliente por su ID.
     * @param {number|string} id - El ID del cliente a eliminar.
     * @returns {Promise<boolean>} - Promesa que resuelve a true si se eliminó correctamente, false en caso contrario.
     */
    async deleteCliente(id) {
        try {
            const response = await fetch(`${API_BASE_URL}clientes/${id}`, {
                method: "DELETE",
                headers: {
                    // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[clienteService.js] Intento de eliminar cliente con ID ${id} no encontrado.`);
                    return false;
                }
                const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message || `Error HTTP: ${response.status}`);
            }
            console.log(`[clienteService.js] Cliente con ID ${id} eliminado.`);
            return true;
        } catch (error) {
            console.error(`[clienteService.js] Error al eliminar cliente con ID ${id}:`, error);
            return false;
        }
    },
};

export default clienteService;

