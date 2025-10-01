<template>
  <div class="departamento-list">
    <h2>Listado de Departamentos</h2>
    <div v-if="isLoading" class="loading">Cargando departamentos...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="!isLoading && !error && departamentos.length === 0" class="no-data">
      No hay departamentos para mostrar.
    </div>
    <ul v-if="!isLoading && !error && departamentos.length > 0" class="departamento-items">
      <li v-for="departamento in departamentos" :key="departamento.id" class="departamento-item">
        <h3>{{ departamento.nombre }}</h3>
        <p><strong>Descripción:</strong> {{ departamento.descripcion || 'N/A' }}</p>
        <!-- Aquí se podrían añadir botones para editar o eliminar departamentos -->
        <!-- <button @click="editarDepartamento(departamento.id)">Editar</button> -->
        <!-- <button @click="eliminarDepartamento(departamento.id)">Eliminar</button> -->
      </li>
    </ul>
    <!-- Aquí podría ir un formulario o botón para añadir nuevos departamentos -->
    <!-- <button @click="abrirModalNuevoDepartamento()">Añadir Nuevo Departamento</button> -->
  </div>
</template>

<script>
import departamentoService from "../services/departamentoService"; // Ajustar la ruta si es necesario

export default {
  name: "DepartamentoList",
  data() {
    return {
      departamentos: [],
      isLoading: false,
      error: null,
    };
  },
  async created() {
    await this.cargarDepartamentos();
  },
  methods: {
    async cargarDepartamentos() {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await departamentoService.getAllDepartamentos();
        this.departamentos = data || [];
      } catch (err) {
        this.error = "Error al cargar los departamentos. Por favor, inténtelo más tarde.";
        console.error("[DepartamentoList.vue] Error en cargarDepartamentos:", err);
        this.departamentos = [];
      } finally {
        this.isLoading = false;
      }
    },
    // editarDepartamento(id) {
    //   console.log("Editar departamento con ID:", id);
    // },
    // async eliminarDepartamento(id) {
    //   if (confirm("¿Está seguro de que desea eliminar este departamento?")) {
    //     this.isLoading = true;
    //     const success = await departamentoService.deleteDepartamento(id);
    //     if (success) {
    //       this.departamentos = this.departamentos.filter(depto => depto.id !== id);
    //       alert("Departamento eliminado exitosamente.");
    //     } else {
    //       alert("Error al eliminar el departamento.");
    //     }
    //     this.isLoading = false;
    //   }
    // },
    // abrirModalNuevoDepartamento() {
    //   console.log("Abrir modal para nuevo departamento");
    // }
  },
};
</script>

<style scoped>
.departamento-list {
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

.departamento-items {
  list-style-type: none;
  padding: 0;
}

.departamento-item {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.departamento-item h3 {
  margin-top: 0;
  color: #333;
}

.departamento-item p {
  margin: 5px 0;
  font-size: 0.9em;
  color: #555;
}

.departamento-item p strong {
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

