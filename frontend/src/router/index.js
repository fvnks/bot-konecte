import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue'; 
import DashboardLayout from '../views/layouts/DashboardLayout.vue';
// Ya no se importan vistas individuales aquí, se cargan desde módulos
// import DashboardHomeView from '../views/DashboardHomeView.vue';
// import DashboardUserManagementView from '../views/DashboardUserManagementView.vue';
// import SheetConfigManagementView from '../views/SheetConfigManagementView.vue';
import { useAuthStore } from '../stores/authStore';

// Cargar dinámicamente los descriptores de módulos
const moduleFiles = import.meta.glob('../modules/*/index.js', { eager: true });
const modules = Object.values(moduleFiles).map(module => module.default);

// Extraer las rutas de los módulos
const moduleRoutes = modules.map(module => module.router).filter(route => route);

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true },
  },
  {
    path: '/',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      // Las rutas principales como Home, DashboardUsers, SheetConfigs ahora vienen de moduleRoutes
      // {
      //   path: '',
      //   name: 'DashboardHome',
      //   component: DashboardHomeView,
      // },
      // {
      //   path: 'dashboard-users',
      //   name: 'DashboardUserManagement',
      //   component: DashboardUserManagementView,
      // },
      // {
      //   path: 'sheet-configs',
      //   name: 'SheetConfigManagement',
      //   component: SheetConfigManagementView,
      // },
      // Añadir las rutas de los módulos cargados dinámicamente
      ...moduleRoutes,
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Guard de navegación (Navigation Guard)
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('authToken');
  // const authStore = useAuthStore(); // No es estrictamente necesario aquí si solo se usa isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' });
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next({ path: '/' });
  } else {
    next();
  }
});

export default router; 