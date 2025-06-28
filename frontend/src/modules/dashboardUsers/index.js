import DashboardUserManagementView from './views/DashboardUserManagementView.vue';
import { Avatar as AvatarIcon } from '@element-plus/icons-vue';

export default {
  id: 'dashboardUsers',
  navigation: {
    name: 'DashboardUserManagement',
    label: 'Usuarios Dashboard',
    icon: AvatarIcon,
    requiresAuth: true,
    adminOnly: true, // Esta sección es solo para administradores
    order: 30
  },
  router: {
    path: '/dashboard-users',
    name: 'DashboardUserManagement',
    component: DashboardUserManagementView
  }
}; 