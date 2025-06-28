import AuthorizedUserManagementView from './views/AuthorizedUserManagementView.vue';
import { User as UserIcon } from '@element-plus/icons-vue'; // Asegúrate que la importación del ícono sea correcta

export default {
  id: 'botUsers', // Identificador único del módulo

  // Configuración para la navegación (pestañas en DashboardLayout)
  navigation: {
    name: 'AuthorizedUserManagement', // Coincide con el nombre de la ruta de Vue Router
    label: 'Usuarios Bot',       // Etiqueta de la pestaña
    icon: UserIcon,              // Componente del ícono
    requiresAuth: true,
    adminOnly: false,
    order: 10                    // Número para ordenar las pestañas (menor primero)
  },

  // Configuración para Vue Router
  router: {
    path: '/authorized-users',       // El path de la ruta
    name: 'AuthorizedUserManagement',// El nombre de la ruta
    component: AuthorizedUserManagementView // El componente de la vista principal del módulo
    // meta: { requiresAuth: true } // Esto usualmente se maneja por el layout padre del dashboard
  }
}; 