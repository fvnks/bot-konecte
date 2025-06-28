import { defineStore } from 'pinia';
import axios from 'axios';
import router from '../router';
import { reactive } from 'vue';

const API_BASE_URL = 'http://localhost:3001/api/dashboard';

// Crear una instancia de Axios para la API autenticada
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('authToken') || null,
    error: null,
    loading: false,
    // Exponer la instancia de apiClient para que los componentes puedan usarla
    // No es reactiva, pero se accede a través del store que sí lo es.
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    isAdmin: (state) => state.user && state.user.role === 'admin',
    // Getter para acceder al apiClient, aunque también se podría acceder directamente
    // desde la instancia del store si se añade al estado o se expone de otra forma.
    // Por simplicidad, los componentes pueden importar y usar `authStore.apiClient` directamente
    // después de que el store se haya inicializado y el token (si existe) se haya configurado.
  },
  actions: {
    // Hacer que apiClient esté disponible en las acciones y en el store instanciado
    // Esto permite que los componentes hagan: const auth = useAuthStore(); auth.apiClient.get(...)
    // OJO: apiClient en sí mismo no es reactivo. Se configura cuando cambia el token.
    getApiClient() {
      // Asegurarse de que el token más reciente esté en la cabecera
      // Esto es crucial si el token puede cambiar durante la sesión sin un login/logout completo
      // o si la instancia del store se crea antes de que el token se cargue de localStorage.
      const currentToken = this.token || localStorage.getItem('authToken');
      if (currentToken) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
      } else {
        delete apiClient.defaults.headers.common['Authorization'];
      }
      return apiClient;
    },

    async login(credentials) {
      this.loading = true;
      this.error = null;
      try {
        // Usar la instancia apiClient para la llamada de login (aunque login no necesita token previo)
        // Podríamos usar axios directamente aquí también si se prefiere
        const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials); // Login no necesita token
        const { token, user } = response.data;

        this.token = token;
        this.user = user;

        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Configurar la instancia de apiClient para futuras peticiones
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Ya no es necesario modificar axios.defaults globalmente
        // delete axios.defaults.headers.common['Authorization']; <--- esto estaba mal, era para logout

        router.push('/');
      } catch (err) {
        this.error = err.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        delete apiClient.defaults.headers.common['Authorization']; // Limpiar en la instancia apiClient
        console.error('Error de login:', err);
      } finally {
        this.loading = false;
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      delete apiClient.defaults.headers.common['Authorization']; // Limpiar en la instancia apiClient
      router.push('/login');
    },
    initializeAuth() {
      const token = localStorage.getItem('authToken');
      const user = JSON.parse(localStorage.getItem('user'));

      if (token && user) {
        this.token = token;
        this.user = user;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        this.logout(); 
        // console.log("initializeAuth: No token/user found, calling logout."); // Ya se hace en logout si es necesario
      }
    }
  },
});

// Exponer la instancia de apiClient directamente también puede ser una opción,
// pero es mejor manejar su configuración a través de las acciones del store
// para asegurar que el token esté correctamente seteado.
// export { apiClient }; // No exportar directamente para forzar la configuración vía store. 