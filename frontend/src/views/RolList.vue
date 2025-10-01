<template>
  <div class="rol-list">
    <h2>Listado de Roles</h2>
    <div v-if="isLoading" class="loading">Cargando roles...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="!isLoading && !error && roles.length === 0" class="no-data">
      No hay roles para mostrar.
    </div>
    <ul v-if="!isLoading && !error && roles.length > 0" class="rol-items">
      <li v-for="rol in roles" :key="rol.id" class="rol-item">
        <h3>{{ rol.nombre }}</h3>
        <p><strong>Descripción:</strong> {{ rol.descripcion || 'N/A' }}</p>
        <!-- Aquí se podrían añadir botones para editar, eliminar o ver permisos del rol -->
        <!-- <button @click="verPermisos(rol.id)">Ver Permisos</button> -->
        <!-- <button @click="editarRol(rol.id)">Editar</button> -->
        <!-- <button @click="eliminarRol(rol.id)">Eliminar</button> -->
      </li>
    </ul>
    <!-- Aquí podría ir un formulario o botón para añadir nuevos roles -->
    <!-- <button @click="abrirModalNuevoRol()">Añadir Nuevo Rol</button> -->
  </div>
</template>

<script>
import rolService from "../services/rolService"; // Ajustar la ruta si es necesario

export default {
  name: "RolList",
  data() {
    return {
      roles: [],
      isLoading: false,
      error: null,
    };
  },
  async created() {
    await this.cargarRoles();
  },
  methods: {
    async cargarRoles() {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await rolService.getAllRoles();
        this.roles = data || [];
      } catch (err) {
        this.error = "Error al cargar los roles. Por favor, inténtelo más tarde.";
        console.error("[RolList.vue] Error en cargarRoles:", err);
        this.roles = [];
      } finally {
        this.isLoading = false;
      }
    },
    // verPermisos(rolId) {
    //   // Lógica para mostrar los permisos asociados a este rol
    //   console.log("Ver permisos del rol con ID:", rolId);
    //   // this.$router.push({ name: 'RolPermisos', params: { rolId: rolId } });
    // },
    // editarRol(id) {
    //   console.log("Editar rol con ID:", id);
    // },
    // async eliminarRol(id) {
    //   if (confirm("¿Está seguro de que desea eliminar este rol?")) {
    //     this.isLoading = true;
    //     const success = await rolService.deleteRol(id);
    //     if (success) {
    //       this.roles = this.roles.filter(rol => rol.id !== id);
    //       alert("Rol eliminado exitosamente.");
    //     } else {
    //       alert("Error al eliminar el rol.");
    //     }
    //     this.isLoading = false;
    //   }
    // },
    // abrirModalNuevoRol() {
    //   console.log("Abrir modal para nuevo rol");
    // }
  },
};
</script>

<style scoped>
.rol-list {
  font-family: Arial, sans-serif;
  padding: 20px;
  max-width: 800px;
  margin: auto;
}

.loading,
.no-data {
  text-align: center;
  padding: 20px;
  font-style: italic;
}

.error-message {
  color: red;
  background-color: #ffe0e0;
  border: 1px solid red;
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 4px;
  text-align: center;
}

.rol-items {
  list-style-type: none;
  padding: 0;
}

.rol-item {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.rol-item h3 {
  margin-top: 0;
  color: #333;
}

.rol-item p {
  margin: 5px 0;
  font-size: 0.9em;
  color: #555;
}

.rol-item p strong {
  color: #333;
}

button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
}

button:hover {
  background-color: #0056b3;
}
</style>

