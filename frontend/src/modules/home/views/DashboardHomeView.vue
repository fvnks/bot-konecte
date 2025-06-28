<template>
  <div class="dashboard-home">
    <el-row :gutter="20" class="page-header-row">
      <el-col :span="24">
        <h1 class="page-title"><el-icon><House /></el-icon> Dashboard Principal</h1>
        <p class="page-subtitle">Resumen general y accesos directos.</p>
      </el-col>
    </el-row>

    <el-row :gutter="24" style="margin-top: 25px;">
      <el-col :xs="24" :sm="24" :md="10" :lg="8">
        <el-card class="box-card user-details-card animated-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span><el-icon><UserFilled /></el-icon> Mis Datos</span>
            </div>
          </template>
          <div v-if="authStore.user" class="user-info-content">
            <div class="user-avatar">
              <el-avatar :size="60" :icon="UserFilled" /> 
            </div>
            <div class="user-text-details">
              <p><strong>Usuario:</strong> {{ authStore.user.username }}</p>
              <p><strong>Email:</strong> {{ authStore.user.email }}</p>
              <p><strong>Nombre:</strong> {{ authStore.user.fullName }}</p>
              <p><strong>Rol:</strong> <el-tag :type="authStore.isAdmin ? 'success' : 'info'" size="small">{{ authStore.user.role }}</el-tag></p>
            </div>
          </div>
          <el-empty v-else description="No se pudo cargar la información del usuario." :image-size="80"></el-empty>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :md="14" :lg="16">
        <el-card class="box-card quick-actions-card animated-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span><el-icon><Promotion /></el-icon> Acciones Frecuentes</span>
            </div>
          </template>
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :lg="6">
              <el-button type="primary" @click="goTo('/authorized-users')" class="action-button" plain>
                <el-icon><User /></el-icon> Usuarios Bot
              </el-button>
            </el-col>
            <el-col :xs="24" :sm="12" :lg="6">
              <el-button type="success" @click="goTo('/sheet-configs')" class="action-button" plain>
                <el-icon><DocumentAdd /></el-icon> Config. Sheets
              </el-button>
            </el-col>
            <el-col :xs="24" :sm="12" :lg="6" v-if="authStore.isAdmin">
              <el-button color="#626aef" @click="goTo('/dashboard-users')" class="action-button" plain>
                <el-icon><Avatar /></el-icon> Usuarios Dashboard
              </el-button>
            </el-col>
            <el-col :xs="24" :sm="12" :lg="6">
              <!-- Este botón necesitará ser eliminado o su ruta actualizada si eliminamos /sheet-viewer -->
              <el-button type="info" @click="goTo('/sheet-viewer')" class="action-button" plain>
                <el-icon><Files /></el-icon> Ver Hoja Activa
              </el-button>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import { House, UserFilled, Promotion, User, DocumentAdd, Avatar, Files } from '@element-plus/icons-vue';

const authStore = useAuthStore();
const router = useRouter();

const goTo = (path) => {
  router.push(path);
};

// Cargar datos del usuario si aún no están (aunque el layout ya podría hacerlo)
// if (!authStore.user) {
//   authStore.checkAuth(); // O alguna función específica para obtener datos del usuario
// }
</script>

<style scoped>
.dashboard-home {
  padding: 25px;
  background-color: #f7f8fc; /* Fondo general ligeramente grisáceo */
  min-height: calc(100vh - 60px - 40px); /* 100vh - header height - main padding */
}

.page-header-row {
  margin-bottom: 25px;
}

.page-title {
  font-size: 1.8em; /* Ligeramente más pequeño */
  font-weight: 600;
  color: #2c3e50; /* Un azul oscuro/gris */
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.page-title .el-icon {
  margin-right: 10px;
  color: #409EFF;
}

.page-subtitle {
  font-size: 0.95em;
  color: #7f8c8d; /* Un gris más suave */
}

.box-card {
  border-radius: 8px; /* Bordes más redondeados */
  border: none; /* Quitar borde por defecto si usamos shadow */
}

.animated-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

/* .animated-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.12) !important; 
} */

.card-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 1.1em;
  color: #34495e; /* Un color más oscuro para cabeceras */
}

.card-header .el-icon {
  margin-right: 8px;
  color: #409EFF; /* Iconos de cabecera en azul */
}

/* User Details Card */
.user-details-card .user-info-content {
  display: flex;
  align-items: center;
}

.user-details-card .user-avatar {
  margin-right: 20px;
  flex-shrink: 0;
}

.user-details-card .user-text-details p {
  margin: 6px 0;
  font-size: 0.9em;
  color: #555;
}

.user-details-card .user-text-details p strong {
  color: #333;
  margin-right: 5px;
}

.user-details-card .el-tag {
  font-weight: bold;
}

/* Quick Actions Card */
.quick-actions-card .action-button {
  width: 100%;
  height: 80px; /* Altura fija para botones más grandes */
  margin-bottom: 16px;
  display: flex;
  flex-direction: column; /* Icono arriba, texto abajo */
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.85em; /* Texto del botón más pequeño */
  line-height: 1.3;
  padding: 10px 5px; /* Ajustar padding */
  border-radius: 6px;
}

.quick-actions-card .action-button .el-icon {
  margin-right: 0; /* Quitar margen si el icono está arriba */
  margin-bottom: 8px; /* Espacio entre icono y texto */
  font-size: 1.8em; /* Iconos más grandes */
}

/* Estilos para el-empty */
.el-empty {
  padding: 20px 0;
}
</style> 