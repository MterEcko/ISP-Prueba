<template>
  <div class="client-form">
    <h2>{{ isEdit ? 'Editar Cliente' : 'Nuevo Cliente' }}</h2>
    
    <form @submit.prevent="submitForm">
      <div class="form-section">
        <h3>Información Personal</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">Nombre *</label>
            <input 
              type="text"
              id="firstName"
              v-model="client.firstName"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="lastName">Apellidos *</label>
            <input 
              type="text"
              id="lastName"
              v-model="client.lastName"
              required
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email"
              id="email"
              v-model="client.email"
            />
          </div>
          
          <div class="form-group">
            <label for="phone">Teléfono</label>
            <input 
              type="tel"
              id="phone"
              v-model="client.phone"
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="whatsapp">WhatsApp</label>
            <input 
              type="tel"
              id="whatsapp"
              v-model="client.whatsapp"
            />
          </div>
          
          <div class="form-group">
            <label for="birthDate">Fecha de Nacimiento</label>
            <input 
              type="date"
              id="birthDate"
              v-model="client.birthDate"
            />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Ubicación</h3>
        
        <div class="form-group full-width">
          <label for="address">Dirección</label>
          <input 
            type="text"
            id="address"
            v-model="client.address"
          />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="latitude">Latitud</label>
            <input 
              type="number"
              id="latitude"
              v-model="client.latitude"
              step="0.0000001"
            />
          </div>
          
          <div class="form-group">
            <label for="longitude">Longitud</label>
            <input 
              type="number"
              id="longitude"
              v-model="client.longitude"
              step="0.0000001"
            />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Servicio</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="sectorId">Sector *</label>
            <select 
              id="sectorId"
              v-model="client.sectorId"
              required
            >
              <option value="">Seleccionar Sector</option>
              <option v-for="sector in sectors" :key="sector.id" :value="sector.id">
                {{ sector.name }} ({{ sector.Node ? sector.Node.name : 'Sin nodo' }})
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="startDate">Fecha de Inicio</label>
            <input 
              type="date"
              id="startDate"
              v-model="client.startDate"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="active">Estado</label>
          <div class="toggle-switch">
            <input 
              type="checkbox"
              id="active"
              v-model="client.active"
            />
            <label for="active">{{ client.active ? 'Activo' : 'Inactivo' }}</label>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Notas</h3>
        
        <div class="form-group full-width">
          <label for="notes">Notas adicionales</label>
          <textarea 
            id="notes"
            v-model="client.notes"
            rows="4"
          ></textarea>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="cancel">Cancelar</button>
        <button type="submit" class="save">Guardar</button>
      </div>
    </form>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import ClientService from '../services/client.service';
import NetworkService from '../services/network.service';

export default {
  name: 'ClientForm',
  data() {
    return {
      client: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        whatsapp: '',
        address: '',
        latitude: null,
        longitude: null,
        birthDate: '',
        startDate: new Date().toISOString().split('T')[0],
        active: true,
        notes: '',
        sectorId: ''
      },
      sectors: [],
      isEdit: false,
      loading: false,
      errorMessage: ''
    };
  },
  created() {
    this.loadSectors();
    const clientId = this.$route.params.id;
    if (clientId && clientId !== 'new') {
      this.isEdit = true;
      this.loadClient(clientId);
    }
  },
  methods: {
    async loadSectors() {
      try {
        const response = await NetworkService.getAllSectors({ active: true });
        this.sectors = response.data;
      } catch (error) {
        console.error('Error cargando sectores:', error);
        this.errorMessage = 'Error cargando sectores. Por favor, intente nuevamente.';
      }
    },
    async loadClient(id) {
      this.loading = true;
      try {
        const response = await ClientService.getClient(id);
        const client = response.data;
        
        // Formatear fechas para el formato input date
        if (client.birthDate) {
          client.birthDate = new Date(client.birthDate).toISOString().split('T')[0];
        }
        if (client.startDate) {
          client.startDate = new Date(client.startDate).toISOString().split('T')[0];
        }
        
        this.client = client;
      } catch (error) {
        console.error('Error cargando cliente:', error);
        this.errorMessage = 'Error cargando datos del cliente. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    async submitForm() {
      this.loading = true;
      this.errorMessage = '';
      
      try {
        if (this.isEdit) {
          await ClientService.updateClient(this.client.id, this.client);
        } else {
          await ClientService.createClient(this.client);
        }
        
        // Redirigir a la lista de clientes
        this.$router.push('/clients');
      } catch (error) {
        console.error('Error guardando cliente:', error);
        this.errorMessage = 'Error guardando datos del cliente. Por favor, verifique los campos e intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    cancel() {
      this.$router.push('/clients');
    }
  }
};
</script>

<style scoped>
.client-form {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.form-section {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #555;
  font-size: 1.2em;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
  margin-bottom: 16px;
}

.full-width {
  width: 100%;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

input, select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

textarea {
  resize: vertical;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.toggle-switch input:checked + label {
  background-color: #4CAF50;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.form-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.form-actions button:first-child {
  background-color: #e0e0e0;
}

.form-actions button.save {
  background-color: #4CAF50;
  color: white;
}

.error-message {
  color: #f44336;
  margin-top: 16px;
  text-align: center;
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>