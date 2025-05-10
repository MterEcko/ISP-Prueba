<template>
  <div class="home">
    <h1>Sistema Integral para ISP</h1>
    <p>Bienvenido al sistema de gestión para proveedores de Internet.</p>
    <router-link to="/login" class="login-link">Iniciar sesión</router-link>
  </div>
</template>

<script>
export default {
  name: 'HomeView'
}
</script>

<style scoped>
.home {
  padding: 40px;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #2196F3;
  margin-bottom: 20px;
}

p {
  margin-bottom: 30px;
  color: #666;
  font-size: 1.2em;
}

.login-link {
  display: inline-block;
  padding: 12px 24px;
  background-color: #4CAF50;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.login-link:hover {
  background-color: #45a049;
}
</style>