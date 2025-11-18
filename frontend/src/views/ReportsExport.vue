<template>
  <div class="reports-export-container">
    <div class="page-header">
      <h2>📊 Exportar Reportes</h2>
      <p>Generación y exportación de reportes del sistema</p>
    </div>

    <div class="export-options">
      <div class="option-card">
        <h3>Reporte de Clientes</h3>
        <button @click="exportClients" class="btn-export">Exportar a Excel</button>
      </div>

      <div class="option-card">
        <h3>Reporte Financiero</h3>
        <button @click="exportFinancial" class="btn-export">Exportar a PDF</button>
      </div>

      <div class="option-card">
        <h3>Reporte de Red</h3>
        <button @click="exportNetwork" class="btn-export">Exportar a Excel</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReportsExportView',
  methods: {
    exportClients() {
      console.log('Exportando reporte de clientes...');
    },
    exportFinancial() {
      console.log('Exportando reporte financiero...');
    },
    exportNetwork() {
      console.log('Exportando reporte de red...');
    }
  }
};
</script>

<style scoped>
.reports-export-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.export-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.option-card {
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  background: white;
}

.option-card h3 {
  margin-bottom: 15px;
}

.btn-export {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-export:hover {
  background-color: #45a049;
}
</style>
