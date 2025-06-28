<template>
  <el-container class="layout-container-tabs" direction="vertical">
    <el-header class="header app-header">
      <div class="toolbar">
        <span class="dashboard-title">Bot Dashboard</span>
        <div class="user-actions">
          <span v-if="authStore.user" class="welcome-message">
            <el-icon><UserFilled /></el-icon> {{ authStore.user.username }} ({{ authStore.user.role }})
          </span>
          <el-tooltip content="Cerrar Sesión" placement="bottom" :hide-after="0">
            <el-button 
              @click="handleLogout" 
              v-if="authStore.isAuthenticated" 
              :icon="SwitchButton" 
              circle 
              class="logout-button-light"
            />
          </el-tooltip>
        </div>
      </div>
    </el-header>

    <el-tabs v-model="activeTab" type="card" class="dashboard-tabs app-tabs" @tab-change="handleTabChange">
      <el-tab-pane
        v-for="tab in filteredTabs"
        :key="tab.name"
        :name="tab.name"
      >
        <template #label>
          <span class="tab-label">
            <el-icon><component :is="tab.icon" /></el-icon>
            <span class="tab-text">{{ tab.label }}</span>
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <el-main class="main-content-tabs">
      <router-view v-slot="{ Component }">
        <transition name="fade-router" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>

  </el-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import {
  House,
  User,
  Document,
  Avatar,
  Files,
  UserFilled,
  SwitchButton
} from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Cargar dinámicamente los descriptores de módulos
const moduleFiles = import.meta.glob('../../modules/*/index.js', { eager: true }); // Ajustar ruta si es necesario
const modules = Object.values(moduleFiles).map(mod => mod.default).filter(mod => mod && mod.navigation);

const activeTab = ref(route.path);

const filteredTabs = computed(() => {
  // Extraer la configuración de navegación de cada módulo
  const moduleNavigations = modules.map(module => module.navigation);
  
  // Combinar con la configuración de la pestaña de inicio
  const allTabsConfig = [...moduleNavigations]; // Solo módulos ahora

  return allTabsConfig
    .filter(tab => {
      if (tab.adminOnly && !authStore.isAdmin) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.order || 99) - (b.order || 99)); // Ordenar por la propiedad 'order'
});

const handleTabChange = (tabName) => {
  // El tabName es el module.navigation.name, que coincide con module.router.name
  if (route.name !== tabName) { 
    router.push({ name: tabName }); 
  }
};

watch(route, (newRoute) => {
  // Sincronizar activeTab con la ruta actual (path o name)
  // Si el `name` de la pestaña en `el-tabs` coincide con `route.name` o `route.path`.
  // El `name` que le pasamos a `el-tab-pane` viene de `tab.name` en `filteredTabs`.
  // En nuestros módulos, `module.navigation.name` está pensado para coincidir con `module.router.name` o `module.router.path`.
  activeTab.value = newRoute.name && filteredTabs.value.some(t => t.name === newRoute.name) 
                    ? newRoute.name 
                    : newRoute.path;
}, { immediate: true });

const handleLogout = async () => {
  try {
    await authStore.logout();
    router.push('/login');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};
</script>

<style scoped>
.layout-container-tabs {
  height: 100vh;
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  background-color: #f8f9fa; /* Fondo general un poco más claro */
  display: flex;
  flex-direction: column;
}

.app-header {
  background-color: #ffffff; /* Header blanco */
  color: #343a40; /* Texto oscuro para el header */
  border-bottom: 1px solid #dee2e6; /* Borde inferior sutil */
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  height: 60px; 
  padding: 0 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between; /* Para separar título y acciones */
}

.dashboard-title {
  font-size: 1.3em; /* Un poco más pequeño para un look refinado */
  font-weight: 600;
  color: #495057;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.welcome-message {
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6c757d;
}

.logout-button-light.el-button {
  color: #6c757d !important;
  border-color: transparent !important; 
  background-color: transparent !important; 
}
.logout-button-light.el-button:hover {
  color: #343a40 !important;
  background-color: #f1f3f5 !important; 
}

.app-tabs.el-tabs {
  margin: 0;
  background-color: #ffffff;
  border-bottom: 1px solid #e9ecef; /* Línea divisoria muy fina y clara */
  flex-shrink: 0;
}

.app-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none; 
}

.app-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 15px; /* Ajustar padding lateral si es necesario */
}

.app-tabs :deep(.el-tabs__item) {
  padding: 0 12px; /* Padding más ajustado para un look compacto */
  height: 48px;   
  line-height: 48px;
  color: #6c757d; /* Gris estándar para inactivas */
  font-weight: 500;
  font-size: 0.875rem; /* Ligeramente más pequeño y nítido */
  border: none !important; /* Sin bordes visibles */
  border-bottom: 2px solid transparent !important; /* Base transparente */
  transition: color 0.15s ease, border-color 0.15s ease;
  margin-bottom: -1px; /* Para que el borde de la activa se alinee con el borde de .app-tabs */
}

.app-tabs :deep(.el-tabs__item:hover) {
  color: #212529; /* Texto más oscuro en hover, sin cambio de fondo ni borde */
  /* border-bottom-color: transparent !important; */ /* Asegurar que no aparezca borde en hover */
}

.app-tabs :deep(.el-tabs__item.is-active) {
  color: #0d6efd; /* Azul primario Bootstrap como ejemplo (o tu color corporativo) */
  border-bottom-color: #0d6efd !important;
  font-weight: 600;
  background-color: transparent !important; /* Sin fondo para la activa */
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px; /* Espacio entre ícono y texto */
}

.tab-text {
  /* Estilos adicionales para el texto si es necesario */
}

.main-content-tabs {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f8f9fa; /* Fondo para el área de contenido */
}

.fade-router-enter-active,
.fade-router-leave-active {
  transition: opacity 0.2s ease;
}

.fade-router-enter-from,
.fade-router-leave-to {
  opacity: 0;
}
</style> 