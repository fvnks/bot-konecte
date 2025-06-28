<template>
  <div class="sheet-config-management-container">
    <h1>Configuración de Google Sheets</h1>
    <p v-if="loading">Cargando configuraciones...</p>
    <p v-if="error" class="error-message">Error al cargar configuraciones: {{ error }}</p>

    <div v-if="!loading && !error" class="table-actions">
      <button @click="openAddModal" class="add-config-button">Añadir Configuración</button>
    </div>

    <table v-if="!loading && !error && sheetConfigs.length > 0">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre Descriptivo</th>
          <th>Spreadsheet ID</th>
          <th>Hoja/Rango</th>
          <th>Activa</th>
          <th>Creado</th>
          <th>Actualizado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="config in sheetConfigs" :key="config.id" :class="{ 'active-row': config.is_active }">
          <td>{{ config.id }}</td>
          <td>{{ config.config_name }}</td>
          <td>{{ config.sheet_id }}</td>
          <td>{{ config.sheet_name }}</td>
          <td>
            <span v-if="config.is_active" class="status-active">Sí</span>
            <button v-else @click="activateConfig(config.id)" class="action-button activate-button" title="Activar esta configuración">Activar</button>
          </td>
          <td>{{ formatDate(config.created_at) }}</td>
          <td>{{ formatDate(config.updated_at) }}</td>
          <td>
            <button @click="editSheetConfig(config)" class="action-button edit-button">Editar</button>
            <button @click="confirmDeleteSheetConfig(config)" class="action-button delete-button" :disabled="config.is_active" title="No se puede eliminar una configuración activa">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!loading && sheetConfigs.length === 0 && !error">No hay configuraciones de Google Sheets para mostrar.</p>

    <!-- Modal para añadir/editar configuración -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h2>{{ editingSheetConfig ? 'Editar Configuración' : 'Añadir Nueva Configuración' }}</h2>
        <form @submit.prevent="editingSheetConfig ? handleUpdateSheetConfig() : handleAddSheetConfig()">
          <div class="form-group">
            <label for="config_name">Nombre Descriptivo (config_name):</label>
            <input type="text" id="config_name" v-model="formData.config_name" required />
          </div>
          <div class="form-group">
            <label for="sheet_id">Spreadsheet ID (sheet_id):</label>
            <input type="text" id="sheet_id" v-model="formData.sheet_id" required />
          </div>
          <div class="form-group">
            <label for="sheet_name">Nombre de Hoja/Rango (sheet_name, ej: Hoja1!A1):</label>
            <input type="text" id="sheet_name" v-model="formData.sheet_name" required />
          </div>
          <div class="form-group">
            <label for="config_is_active">
              <input type="checkbox" id="config_is_active" v-model="formData.is_active" />
              Marcar como activa
            </label>
          </div>
          <p v-if="modalError" class="error-message">{{ modalError }}</p>
          <div class="modal-actions">
            <button type="submit" class="submit-button">{{ editingSheetConfig ? 'Actualizar' : 'Guardar' }}</button>
            <button type="button" @click="closeModal" class="cancel-button">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore'; // Ajustada la ruta

const authStore = useAuthStore();
const sheetConfigs = ref([]);
const loading = ref(true);
const error = ref(null);
const modalError = ref(null);

const showModal = ref(false);
const editingSheetConfig = ref(null);

const initialFormData = {
  config_name: '',
  sheet_id: '',
  sheet_name: '',
  is_active: false,
};
const formData = ref({ ...initialFormData });

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const fetchSheetConfigs = async () => {
  loading.value = true;
  error.value = null;
  try {
    const apiClient = authStore.getApiClient();
    const response = await apiClient.get('/sheet-configs');
    sheetConfigs.value = response.data;
  } catch (err) {
    console.error('Error al obtener configuraciones de Sheets:', err);
    error.value = err.response?.data?.message || err.message || 'Error desconocido.';
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  editingSheetConfig.value = null;
  formData.value = { ...initialFormData, is_active: sheetConfigs.value.length === 0 };
  modalError.value = null;
  showModal.value = true;
};

const editSheetConfig = (config) => {
  editingSheetConfig.value = { ...config };
  formData.value = {
    config_name: config.config_name,
    sheet_id: config.sheet_id,
    sheet_name: config.sheet_name,
    is_active: config.is_active,
  };
  modalError.value = null;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingSheetConfig.value = null;
  formData.value = { ...initialFormData };
  modalError.value = null;
};

const handleAddSheetConfig = async () => {
  modalError.value = null;
  if (!formData.value.config_name || !formData.value.sheet_id || !formData.value.sheet_name) {
    modalError.value = 'Nombre descriptivo, Spreadsheet ID y Nombre de Hoja/Rango son obligatorios.';
    return;
  }
  try {
    const apiClient = authStore.getApiClient();
    await apiClient.post('/sheet-configs', formData.value);
    fetchSheetConfigs();
    closeModal();
  } catch (err) {
    console.error('Error al añadir configuración de Sheet:', err);
    modalError.value = err.response?.data?.message || 'Error al guardar la configuración.';
  }
};

const handleUpdateSheetConfig = async () => {
  modalError.value = null;
  if (!editingSheetConfig.value || !editingSheetConfig.value.id) return;
  if (!formData.value.config_name || !formData.value.sheet_id || !formData.value.sheet_name) {
    modalError.value = 'Nombre descriptivo, Spreadsheet ID y Nombre de Hoja/Rango son obligatorios.';
    return;
  }

  try {
    const apiClient = authStore.getApiClient();
    await apiClient.put(`/sheet-configs/${editingSheetConfig.value.id}`, formData.value);
    fetchSheetConfigs();
    closeModal();
  } catch (err) {
    console.error('Error al actualizar configuración de Sheet:', err);
    modalError.value = err.response?.data?.message || 'Error al actualizar la configuración.';
  }
};

const confirmDeleteSheetConfig = async (config) => {
  if (config.is_active) {
    alert('No se puede eliminar una configuración activa. Por favor, active otra configuración primero o desactívela editándola.');
    return;
  }
  if (window.confirm(`¿Estás seguro de que quieres eliminar la configuración \"${config.config_name}\"?`)) {
    try {
      const apiClient = authStore.getApiClient();
      await apiClient.delete(`/sheet-configs/${config.id}`);
      fetchSheetConfigs();
    } catch (err) {
      console.error('Error al eliminar configuración de Sheet:', err);
      alert(err.response?.data?.message || 'Error al eliminar la configuración.');
    }
  }
};

const activateConfig = async (configId) => {
  try {
    const apiClient = authStore.getApiClient();
    // Para activar, simplemente actualizamos el campo is_active a true
    // El backend debería manejar la desactivación de otras configuraciones si es necesario
    await apiClient.put(`/sheet-configs/${configId}`, { is_active: true });
    fetchSheetConfigs(); // Recargar para reflejar el cambio de estado
  } catch (err) {
    console.error(`Error al activar la configuración ${configId}:`, err);
    alert(err.response?.data?.message || 'Error al activar la configuración.');
  }
};

onMounted(() => {
  fetchSheetConfigs();
});
</script>

<style scoped>
/* Estilos generales */
.sheet-config-management-container {
  padding: 2rem;
  background-color: #f9f9f9;
  /* Agrega aquí más estilos si son necesarios y no están ya en un global */
}

.error-message {
  color: #d9534f; /* Bootstrap's danger color */
  margin-bottom: 1rem;
}

.table-actions {
  margin-bottom: 1.5rem;
  text-align: right;
}

.add-config-button {
  background-color: #007bff; /* Azul primario */
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

.add-config-button:hover {
  background-color: #0056b3;
}

/* Estilos de la tabla */
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5rem;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

thead {
  background-color: #e9ecef;
  color: #333;
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background-color: #f1f3f5;
}

.active-row {
  background-color: #e6ffed; /* Un verde muy claro para destacar la fila activa */
  font-weight: bold;
}

.status-active {
  color: #28a745; /* Verde */
  font-weight: bold;
}

.action-button {
  padding: 6px 12px;
  margin-right: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: opacity 0.2s ease;
}

.action-button:hover {
  opacity: 0.8;
}

.activate-button {
  background-color: #17a2b8; /* Info blue */
  color: white;
}

.edit-button {
  background-color: #ffc107; /* Amarillo */
  color: #212529;
}

.delete-button {
  background-color: #dc3545; /* Rojo */
  color: white;
}

.delete-button:disabled {
  background-color: #a9a9a9;
  cursor: not-allowed;
}

/* Estilos del Modal (similares a otros modales) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 25px 30px;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 550px; /* Un poco más ancho para este formulario */
  z-index: 1001;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input[type="text"],
.form-group input[type="checkbox"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

/* Específico para el checkbox para que no ocupe todo el ancho */
.form-group input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
  vertical-align: middle;
}
.form-group label input[type="checkbox"] + span { /* Si envuelves el texto en un span */
  vertical-align: middle;
}


.modal-actions {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions button {
  padding: 10px 20px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
}

.submit-button {
  background-color: #28a745;
  color: white;
}

.cancel-button {
  background-color: #6c757d;
  color: white;
}
</style> 