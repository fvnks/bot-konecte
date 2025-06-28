<template>
  <el-card class="box-card">
    <template #header>
      <div class="card-header">
        <span>Visualizador de Hoja de Cálculo</span>
      </div>
    </template>
    <div v-if="isLoadingConfig" class="loading-container">
      <el-skeleton :rows="1" animated />
    </div>
    <div v-else>
      <el-form @submit.prevent inline class="actions-form">
        <el-form-item label="Seleccionar Configuración" class="config-selector">
          <el-select v-model="selectedConfigId" placeholder="Seleccione una configuración" clearable filterable @change="handleConfigChange">
            <el-option
              v-for="config in sheetConfigs"
              :key="config.id"
              :label="config.name"
              :value="config.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="checkConnection" :disabled="!selectedConfigId || isLoading" :loading="isLoading">
            Comprobar Conexión
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="success" @click="loadSheetData" :disabled="!selectedConfigId || isLoading" :loading="isLoading">
            Cargar Datos de Hoja
          </el-button>
        </el-form-item>
      </el-form>

      <div v-if="connectionStatus" class="status-message">
        <el-alert :title="`Estado Conexión: ${connectionStatus}`" type="info" show-icon :closable="false" />
      </div>

      <el-divider v-if="sheetData.length > 0 || isLoading" />

      <div v-if="isLoading && !sheetData.length" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>
      <div v-else-if="error" class="error-message">
        <el-alert :title="`Error: ${error}`" type="error" show-icon />
      </div>
      
      <el-card v-if="sheetData.length > 0" class="data-display-card">
        <template #header>
          <span>Datos de la Hoja</span>
        </template>
        <div class="table-container">
          <el-table :data="sheetData" stripe style="width: 100%" border height="400px">
            <el-table-column 
              v-for="header in tableHeaders" 
              :key="header.prop" 
              :prop="header.prop" 
              :label="header.label"
              sortable 
            />
          </el-table>
        </div>
      </el-card>
      <el-empty v-else-if="!isLoading && !error && selectedConfigId" description="No hay datos para mostrar o no se han cargado."></el-empty>
      <el-empty v-else-if="!isLoading && !error && !selectedConfigId" description="Seleccione una configuración para ver los datos."></el-empty>

    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { ElMessage, ElMessageBox } from 'element-plus';

const authStore = useAuthStore();

const sheetConfigs = ref([]);
const selectedConfigId = ref(null);
const sheetData = ref([]);
const tableHeaders = ref([]);
const isLoading = ref(false);
const isLoadingConfig = ref(false);
const error = ref(null);
const connectionStatus = ref('');

const fetchSheetConfigs = async () => {
  isLoadingConfig.value = true;
  error.value = null;
  try {
    const response = await fetch('/api/dashboard/sheet-configs', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    });
    if (!response.ok) throw new Error('Error al cargar configuraciones de hoja.');
    const data = await response.json();
    sheetConfigs.value = data;
  } catch (err) {
    error.value = err.message;
    ElMessage({ message: err.message, type: 'error' });
  } finally {
    isLoadingConfig.value = false;
  }
};

const loadSheetData = async () => {
  if (!selectedConfigId.value) {
    ElMessage({ message: 'Por favor, seleccione una configuración primero.', type: 'warning' });
    return;
  }
  isLoading.value = true;
  error.value = null;
  sheetData.value = [];
  tableHeaders.value = [];
  connectionStatus.value = ''; // Limpiar estado de conexión anterior

  try {
    const response = await fetch(`/api/dashboard/sheet-configs/${selectedConfigId.value}/view`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al cargar datos de la hoja.');
    }
    const data = await response.json();
    if (data && data.length > 0) {
      // Asumir que la primera fila son los encabezados si no vienen separados
      const headerRow = data[0];
      tableHeaders.value = Object.keys(headerRow).map(key => ({
        prop: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) // Formato simple para label
      }));
      sheetData.value = data;
    } else {
      sheetData.value = [];
      ElMessage({ message: 'No se encontraron datos para esta configuración.', type: 'info' });
    }
  } catch (err) {
    error.value = err.message;
    ElMessage({ message: err.message, type: 'error' });
  } finally {
    isLoading.value = false;
  }
};

const checkConnection = async () => {
  if (!selectedConfigId.value) {
    ElMessage({ message: 'Por favor, seleccione una configuración primero.', type: 'warning' });
    return;
  }
  isLoading.value = true;
  error.value = null;
  connectionStatus.value = 'Comprobando...';

  try {
    const response = await fetch(`/api/dashboard/sheet-configs/${selectedConfigId.value}/check-connection`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
       }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error al comprobar la conexión.');
    }
    connectionStatus.value = data.message;
    ElMessage({ message: data.message, type: data.status === 'success' ? 'success' : 'error' });

  } catch (err) {
    connectionStatus.value = `Error: ${err.message}`;
    error.value = err.message;
    ElMessage({ message: err.message, type: 'error' });
  } finally {
    isLoading.value = false;
  }
};

const handleConfigChange = () => {
  sheetData.value = [];
  tableHeaders.value = [];
  connectionStatus.value = '';
  error.value = null;
};

onMounted(fetchSheetConfigs);

</script>

<style scoped>
.box-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.actions-form .el-form-item {
  margin-bottom: 10px;
}
.config-selector {
  margin-right: 10px;
  min-width: 250px; /* Ajusta según sea necesario */
}
.status-message {
  margin-top: 15px;
  margin-bottom: 15px;
}
.error-message {
  margin-top: 15px;
  margin-bottom: 15px;
}
.loading-container {
  padding: 20px;
}
.table-container {
  margin-top: 10px;
}
.data-display-card {
  margin-top: 20px;
}
</style> 