<template>
  <div class="fibra-optica-list">
    <h2>Listado de Equipos de Fibra Óptica</h2>
    <div v-if="isLoading" class="loading">Cargando equipos...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="!isLoading && !error && equipos.length === 0" class="no-data">
      No hay equipos de fibra óptica para mostrar.
    </div>
    <ul v-if="!isLoading && !error && equipos.length > 0" class="equipo-items">
      <li v-for="equipo in equipos" :key="equipo.id" class="equipo-item">
        <h3>{{ equipo.nombre_olt || equipo.modelo_ont || 'Equipo sin nombre' }}</h3>
        <p><strong>Tipo:</strong> {{ equipo.tipo_equipo }}</p>
        <p><strong>Estado:</strong> {{ equipo.estado }}</p>
        <p><strong>Número de Serie:</strong> {{ equipo.numero_serie }}</p>
        <p><strong>Dirección IP:</strong> {{ equipo.direccion_ip || 'N/A' }}</p>
        <p><strong>Ubicación:</strong> {{ equipo.ubicacion_instalacion }}</p>
        <p><strong>Fecha de Instalación:</strong> {{ formatDate(equipo.fecha_instalacion) }}</p>
        <!-- Aquí se podrían añadir botones para editar o eliminar -->
        <!-- <button @click="editarEquipo(equipo.id)">Editar</button> -->
        <!-- <button @click="eliminarEquipo(equipo.id)">Eliminar</button> -->
      </li>
    </ul>
    <!-- Aquí podría ir un formulario o botón para añadir nuevos equipos -->
    <!-- <button @click="abrirModalNuevoEquipo()">Añadir Nuevo Equipo</button> -->
  </div>
</template>

<script>
import fibraOpticaService from "../services/fibraOpticaService"; // Ajustar la ruta si es necesario

export default {
  name: "FibraOpticaList",
  data() {
    return {
      equipos: [],
      isLoading: false,
      error: null,
    };
  },
  async created() {
    await this.cargarEquipos();
  },
  methods: {
    async cargarEquipos() {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await fibraOpticaService.getAllEquipos();
        this.equipos = data || [];
      } catch (err) {
        this.error = "Error al cargar los equipos de fibra óptica. Por favor, inténtelo más tarde.";
        console.error("[FibraOpticaList.vue] Error en cargarEquipos:", err);
        this.equipos = []; // Asegurar que equipos sea un array vacío en caso de error
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      try {
        return new Date(dateString).toLocaleDateString(undefined, options);
      } catch (e) {
        return dateString; // Devolver el string original si no se puede parsear
      }
    },
    // editarEquipo(id) {
    //   // Lógica para navegar a la página de edición o abrir un modal
    //   console.log("Editar equipo con ID:", id);
    // },
    // async eliminarEquipo(id) {
    //   if (confirm("¿Está seguro de que desea eliminar este equipo?")) {
    //     this.isLoading = true; // Podría usarse un loading específico para la acción
    //     const success = await fibraOpticaService.deleteEquipo(id);
    //     if (success) {
    //       this.equipos = this.equipos.filter(equipo => equipo.id !== id);
    //       alert("Equipo eliminado exitosamente.");
    //     } else {
    //       alert("Error al eliminar el equipo.");
    //     }
    //     this.isLoading = false;
    //   }
    // },
    // abrirModalNuevoEquipo() {
    //   // Lógica para mostrar un modal o navegar a una página de creación
    //   console.log("Abrir modal para nuevo equipo");
    // }
  },
};
</script>

<style scoped>
.fibra-optica-list {
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

.equipo-items {
  list-style-type: none;
  padding: 0;
}

.equipo-item {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.equipo-item h3 {
  margin-top: 0;
  color: #333;
}

.equipo-item p {
  margin: 5px 0;
  font-size: 0.9em;
  color: #555;
}

.equipo-item p strong {
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

