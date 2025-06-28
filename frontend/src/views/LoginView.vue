<template>
  <div class="login-container">
    <div class="login-box">
      <h2>Iniciar Sesión - Dashboard</h2>
      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <label for="username">Usuario:</label>
          <input type="text" id="username" v-model="username" required />
        </div>
        <div class="input-group">
          <label for="password">Contraseña:</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <button type="submit" :disabled="auth.loading" class="login-button">
          {{ auth.loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
        <p v-if="auth.error" class="error-message">{{ auth.error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/authStore';

const auth = useAuthStore();

const username = ref('');
const password = ref('');

const handleLogin = async () => {
  console.log('Intentando login con:', username.value, password.value);
  if (!username.value || !password.value) {
    auth.error = 'Por favor, ingresa usuario y contraseña.';
    return;
  }
  await auth.login({ username: username.value, password: password.value });
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5; 
}

.login-box {
  background: white;
  padding: 2.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.input-group {
  margin-bottom: 1rem;
  text-align: left;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1rem;
}

.login-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-button:disabled {
  background-color: #aaa;
}

.login-button:not(:disabled):hover {
  background-color: #0056b3;
}

.error-message {
  margin-top: 1rem;
  color: red;
  font-size: 0.9rem;
}
</style> 