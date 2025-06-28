import DashboardHomeView from './views/DashboardHomeView.vue';
import { House as HomeIcon } from '@element-plus/icons-vue';

export default {
  id: 'home',
  navigation: {
    name: 'DashboardHome', // Coincide con el nombre de la ruta de Vue Router
    label: 'Inicio',
    icon: HomeIcon,
    requiresAuth: true,
    adminOnly: false,
    order: 0 // El primero
  },
  router: {
    path: '/', // Para el DashboardLayout, la ruta hija vacía ('') es la default.
                 // Si queremos que sea exactamente '/', necesitaríamos anidar más o cambiar el path del layout padre.
                 // Por ahora, para que coincida con la estructura actual del router, usaremos el nombre.
                 // O, si el path de DashboardLayout es '/', el path del hijo es ''.
                 // Voy a asumir que el layout está en '/', y la ruta hija para home es path: '' y name: 'DashboardHome'.
    path: '', // Ruta vacía para ser el default del DashboardLayout en '/'
    name: 'DashboardHome',
    component: DashboardHomeView
  }
}; 