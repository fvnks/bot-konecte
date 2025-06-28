import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import { useAuthStore } from './stores/authStore'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// Estilos globales (opcional, si tienes)
// import './assets/main.css'

const app = createApp(App)

app.use(ElementPlus)

// Usar Pinia
const pinia = createPinia()
app.use(pinia)

// Antes de montar la app, inicializar el estado de autenticación
const authStore = useAuthStore()
try {
    authStore.initializeAuth()
} catch (error) {
    console.error("Error al inicializar authStore en main.js:", error)
}

// Usar Vue Router
app.use(router)

app.mount('#app')
