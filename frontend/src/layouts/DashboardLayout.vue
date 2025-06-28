<template>
  <div class="flex flex-col min-h-screen bg-slate-100">
    <!-- Header -->
    <header class="bg-white text-slate-700 shadow-sm sticky top-0 z-50">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-sky-600">Bot Dashboard</h1>
        <div class="user-info flex items-center" v-if="auth.isAuthenticated">
          <span class="mr-4 text-sm text-slate-600">
            Bienvenido, {{ auth.user?.fullName || auth.user?.username }}
          </span>
          <button 
            @click="handleLogout" 
            class="bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 px-4 rounded-md text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <div class="flex flex-1">
      <!-- Sidebar -->
      <nav 
        class="w-64 bg-slate-800 text-slate-100 p-4 pt-6 space-y-1 transition-all duration-300 ease-in-out shadow-lg"
        v-if="showSidebar" 
      >
        <ul>
          <li>
            <router-link 
              to="/"
              class="flex items-center py-2.5 px-3 rounded-md transition duration-200 hover:bg-slate-700 hover:text-sky-400 group"
              active-class="bg-sky-600 text-white font-semibold shadow-sm"
            >
              <!-- Icono (ejemplo, necesitarías una librería de iconos) -->
              <!-- <HomeIcon class="h-5 w-5 mr-3 text-slate-400 group-hover:text-sky-400" /> -->
              Inicio
            </router-link>
          </li>
          <li v-if="auth.isAdmin">
            <router-link 
              to="/dashboard-users"
              class="flex items-center py-2.5 px-3 rounded-md transition duration-200 hover:bg-slate-700 hover:text-sky-400 group"
              active-class="bg-sky-600 text-white font-semibold shadow-sm"
            >
              Usuarios Dashboard
            </router-link>
          </li>
          <li>
            <router-link 
              to="/authorized-users"
              class="flex items-center py-2.5 px-3 rounded-md transition duration-200 hover:bg-slate-700 hover:text-sky-400 group"
              active-class="bg-sky-600 text-white font-semibold shadow-sm"
            >
              Usuarios Autorizados (Bot)
            </router-link>
          </li>
          <li>
            <router-link 
              to="/sheet-configs"
              class="flex items-center py-2.5 px-3 rounded-md transition duration-200 hover:bg-slate-700 hover:text-sky-400 group"
              active-class="bg-sky-600 text-white font-semibold shadow-sm"
            >
              Config. Google Sheets
            </router-link>
          </li>
          <li>
            <router-link 
              to="/sheet-viewer"
              class="flex items-center py-2.5 px-3 rounded-md transition duration-200 hover:bg-slate-700 hover:text-sky-400 group"
              active-class="bg-sky-600 text-white font-semibold shadow-sm"
            >
              Ver Hoja de Cálculo
            </router-link>
          </li>
        </ul>
      </nav>

      <!-- Content Area -->
      <main class="flex-1 p-6 lg:p-8 bg-slate-50">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from 'vue-router';
// import { HomeIcon } from '@heroicons/vue/24/outline' // Ejemplo si usaras Heroicons

const auth = useAuthStore();
const router = useRouter();

const showSidebar = ref(true); 

const handleLogout = () => {
  auth.logout();
};
</script>

<style scoped>
/* Mantendremos esto vacío por ahora, confiando en Tailwind */

/* Para el scrollbar de la sidebar si el contenido crece mucho (opcional) */
/* 
nav {
  scrollbar-width: thin; 
  scrollbar-color: #4A5568 #2D3748; 
}
nav::-webkit-scrollbar {
  width: 8px;
}
nav::-webkit-scrollbar-track {
  background: #2D3748; 
}
nav::-webkit-scrollbar-thumb {
  background-color: #4A5568; 
  border-radius: 4px;
  border: 2px solid #2D3748; 
}
*/
</style> 