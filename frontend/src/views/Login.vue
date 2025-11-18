<template>
  <div class="login-container">
    <div class="login-form">
      <h2>Sistema Integral ISP</h2>
      <h3>Iniciar Sesión</h3>
      
      <div class="form-group">
        <label for="username">Usuario o Email</label>
        <input 
          type="text"
          id="username"
          v-model="user.username"
          required
          placeholder="Ingrese su usuario o email"
        />
      </div>
      
      <div class="form-group">
        <label for="password">Contraseña</label>
        <input 
          type="password"
          id="password"
          v-model="user.password"
          required
          placeholder="Ingrese su contraseña"
        />
      </div>
      
      <div class="form-actions">
        <button class="btn-login" @click="handleLogin" :disabled="loading">
          <span v-if="loading">Procesando...</span>
          <span v-else>Ingresar</span>
        </button>
      </div>
      
      <div class="message" v-if="message">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script>
import AuthService from '../services/auth.service';

export default {
  name: 'LoginView',
  data() {
    return {
      user: {
        username: '',
        password: ''
      },
      loading: false,
      message: ''
    };
  },
  methods: {
    handleLogin() {
      this.loading = true;
      this.message = '';
      
      if (!this.user.username || !this.user.password) {
        this.message = 'Usuario y contraseña son requeridos';
        this.loading = false;
        return;
      }
      
      AuthService.login(this.user.username, this.user.password)
        .then(() => {
          this.$router.push('/dashboard');
        })
        .catch(error => {
          this.loading = false;
          this.message = 
            (error.response && error.response.data && error.response.data.message) ||
            error.message ||
            error.toString();
        });
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f5f5;
}

.login-form {
  width: 100%;
  max-width: 400px;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h2, h3 {
  text-align: center;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-actions {
  margin-top: 30px;
}

.btn-login {
  width: 100%;
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.btn-login:hover {
  background-color: #45a049;
}

.btn-login:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.message {
  margin-top: 20px;
  color: #f44336;
  text-align: center;
}
</style>