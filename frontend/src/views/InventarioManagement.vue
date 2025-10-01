<template>
  <div class="inventario-management">
    <h2>Gestión de Inventario</h2>

    <!-- Filtros -->
    <div class="filters">
      <input type="text" v-model="filtros.nombre_equipo" placeholder="Nombre del equipo">
      <input type="text" v-model="filtros.numero_serie" placeholder="Número de serie">
      <select v-model="filtros.tipo_equipo">
        <option value="">Todos los tipos</option>
        <option value="ONT">ONT</option>
        <option value="OLT">OLT</option>
        <option value="Router">Router</option>
        <option value="Switch">Switch</option>
        <option value="Otro">Otro</option>
      </select>
      <select v-model="filtros.estado_equipo">
        <option value="">Todos los estados</option>
        <option value="disponible">Disponible</option>
        <option value="asignado">Asignado</option>
        <option value="en_reparacion">En Reparación</option>
        <option value="defectuoso">Defectuoso</option>
      </select>
      <button @click="aplicarFiltros">Filtrar</button>
      <button @click="limpiarFiltros">Limpiar Filtros</button>
    </div>

    <div v-if="isLoading" class="loading">Cargando inventario...</div>
    <div v-if="error" class="error-message">{{ error }}</div>
    
    <div v-if="!isLoading && !error && inventario.length === 0 && !filtrosAplicados" class="no-data">
      No hay ítems en el inventario para mostrar.
    </div>
    <div v-if="!isLoading && !error && inventario.length === 0 && filtrosAplicados" class="no-data">
      No se encontraron ítems con los filtros aplicados.
    </div>

    <table v-if="!isLoading && !error && inventario.length > 0" class="inventario-table">
      <thead>
        <tr>
          <th>Nombre Equipo</th>
          <th>Tipo</th>
          <th>Número de Serie</th>
          <th>Estado</th>
          <th>Ubicación</th>
          <th>Proveedor</th>
          <th>Fecha Compra</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in inventario" :key="item.id">
          <td>{{ item.nombre_equipo }}</td>
          <td>{{ item.tipo_equipo }}</td>
          <td>{{ item.numero_serie }}</td>
          <td>{{ item.estado_equipo }}</td>
          <td>{{ item.ubicacion_id ? `ID: ${item.ubicacion_id}` : (item.UbicacionInventario ? item.UbicacionInventario.nombre_ubicacion : 'N/A') }}</td>
          <td>{{ item.proveedor }}</td>
          <td>{{ formatDate(item.fecha_compra) }}</td>
          <td>
            <button @click="verItem(item.id)">Ver</button>
            <button @click="editarItem(item.id)">Editar</button>
            <button @click="eliminarItem(item.id)" class="delete-button">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Paginación (simulada o a implementar) -->

    <button @click="abrirModalNuevoItem()" class="add-button">Añadir Nuevo Ítem</button>

    <!-- Modal para añadir/editar ítem (simplificado) -->
    <div v-if="mostrarModal" class="modal">
      <div class="modal-content">
        <span class="close-button" @click="cerrarModal">&times;</span>
        <h3>{{ esEdicion ? 'Editar Ítem' : 'Añadir Nuevo Ítem' }}</h3>
        <form @submit.prevent="guardarItem">
          <div>
            <label for="nombre_equipo">Nombre del Equipo:</label>
            <input type="text" id="nombre_equipo" v-model="itemActual.nombre_equipo" required>
          </div>
          <div>
            <label for="tipo_equipo">Tipo de Equipo:</label>
            <select id="tipo_equipo" v-model="itemActual.tipo_equipo">
              <option value="ONT">ONT</option>
              <option value="OLT">OLT</option>
              <option value="Router">Router</option>
              <option value="Switch">Switch</option>
              <option value="Antena">Antena</option>
              <option value="Cable">Cable</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label for="numero_serie">Número de Serie:</label>
            <input type="text" id="numero_serie" v-model="itemActual.numero_serie" required>
          </div>
           <div>
            <label for="estado_equipo">Estado:</label>
            <select id="estado_equipo" v-model="itemActual.estado_equipo">
              <option value="disponible">Disponible</option>
              <option value="asignado">Asignado</option>
              <option value="en_reparacion">En Reparación</option>
              <option value="defectuoso">Defectuoso</option>
              <option value="descartado">Descartado</option>
            </select>
          </div>
          <div>
            <label for="proveedor">Proveedor:</label>
            <input type="text" id="proveedor" v-model="itemActual.proveedor">
          </div>
          <div>
            <label for="fecha_compra">Fecha de Compra:</label>
            <input type="date" id="fecha_compra" v-model="itemActual.fecha_compra">
          </div>
          <div>
            <label for="costo">Costo:</label>
            <input type="number" step="0.01" id="costo" v-model.number="itemActual.costo">
          </div>
          <div>
            <label for="ubicacion_id">ID Ubicación (Opcional):</label>
            <input type="number" id="ubicacion_id" v-model.number="itemActual.ubicacion_id">
          </div>
          <button type="submit">{{ esEdicion ? 'Actualizar' : 'Guardar' }}</button>
          <button type="button" @click="cerrarModal">Cancelar</button>
        </form>
      </div>
    </div>

  </div>
</template>



<style scoped>
.inventario-management {
  font-family: Arial, sans-serif;
  padding: 20px;
  max-width: 1000px;
  margin: auto;
}

.loading,
.no-data {
  text-align: center;
  padding: 20px;
  font-style: italic;
  color: #555;
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

.filters {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f0f0f0;
  border-radius: 8px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filters input[type="text"],
.filters select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.filters button {
  padding: 8px 15px;
}

.inventario-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.inventario-table th,
.inventario-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

.inventario-table th {
  background-color: #f2f2f2;
  color: #333;
}

.inventario-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.inventario-table button {
  margin-right: 5px;
  padding: 5px 8px;
  font-size: 0.9em;
}

.delete-button {
  background-color: #dc3545;
}
.delete-button:hover {
  background-color: #c82333;
}

.add-button {
  display: block;
  margin: 20px auto;
  padding: 10px 20px;
  font-size: 1.1em;
}

/* Modal Styles */
.modal {
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: #fefefe;
  padding: 25px;
  border: 1px solid #888;
  width: 80%;
  max-width: 500px;
  border-radius: 8px;
  position: relative;
}

.close-button {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  position: absolute;
  top: 10px;
  right: 15px;
}

.close-button:hover,
.close-button:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}

.modal-content form div {
  margin-bottom: 15px;
}

.modal-content label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.modal-content input[type="text"],
.modal-content input[type="number"],
.modal-content input[type="date"],
.modal-content select {
  width: calc(100% - 22px); /* Account for padding and border */
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.modal-content button[type="submit"] {
  background-color: #28a745;
}
.modal-content button[type="submit"]:hover {
  background-color: #218838;
}
.modal-content button[type="button"] {
  background-color: #6c757d;
}
.modal-content button[type="button"]:hover {
  background-color: #5a6268;
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

