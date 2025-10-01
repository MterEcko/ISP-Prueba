<template>
  <div class="permiso-list">
    <h2>Listado de Permisos</h2>
    <div v-if="isLoading" class="loading">Cargando permisos...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="!isLoading && !error && permisos.length === 0" class="no-data">
      No hay permisos para mostrar.
    </div>
    <ul v-if="!isLoading && !error && permisos.length > 0" class="permiso-items">
      <li v-for="permiso in permisos" :key="permiso.id" class="permiso-item">
        <h3>{{ permiso.nombre }}</h3>
        <p><strong>Descripción:</strong> {{ permiso.descripcion || 'N/A' }}</p>
        <!-- Aquí se podrían añadir botones para editar o eliminar permisos -->
        <!-- <button @click="editarPermiso(permiso.id)">Editar</button> -->
        <!-- <button @click="eliminarPermiso(permiso.id)">Eliminar</button> -->
      </li>
    </ul>
    <!-- Aquí podría ir un formulario o botón para añadir nuevos permisos -->
    <!-- <button @click="abrirModalNuevoPermiso()">Añadir Nuevo Permiso</button> -->
  </div>
</template>

<script>
import permisoService from "../services/permisoService"; // Ajustar la ruta si es necesario

export default {
  name: "PermisoList",
  data() {
    return {
      permisos: [],
      isLoading: false,
      error: null,
    };
  },
  async created() {
    await this.cargarPermisos();
  },
  methods: {
    async cargarPermisos() {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await permisoService.getAllPermisos();
        this.permisos = data || [];
      } catch (err) {
        this.error = "Error al cargar los permisos. Por favor, inténtelo más tarde.";
        console.error("[PermisoList.vue] Error en cargarPermisos:", err);
        this.permisos = [];
      } finally {
        this.isLoading = false;
      }
    },
    // editarPermiso(id) {
    //   console.log("Editar permiso con ID:", id);
    // },
    // async eliminarPermiso(id) {
    //   if (confirm("¿Está seguro de que desea eliminar este permiso?")) {
    //     this.isLoading = true;
    //     const success = await permisoService.deletePermiso(id);
    //     if (success) {
    //       this.permisos = this.permisos.filter(permiso => permiso.id !== id);
    //       alert("Permiso eliminado exitosamente.");
    //     } else {
    //       alert("Error al eliminar el permiso.");
    //     }
    //     this.isLoading = false;
    //   }
    // },
    // abrirModalNuevoPermiso() {
    //   console.log("Abrir modal para nuevo permiso");
    // }
  },
};
</script>

<style scoped>
.permiso-list {
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

.permiso-items {
  list-style-type: none;
  padding: 0;
}

.permiso-item {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.permiso-item h3 {
  margin-top: 0;
  color: #333;
}

.permiso-item p {
  margin: 5px 0;
  font-size: 0.9em;
  color: #555;
}

.permiso-item p strong {
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

