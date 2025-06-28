<template>
  <div class="authorized-user-management-container">
    <h1>Gestión de Usuarios Autorizados (Bot)</h1>
    <p v-if="loading">Cargando usuarios autorizados...</p>
    <p v-if="error" class="error-message">Error al cargar usuarios: {{ error }}</p>

    <div v-if="!loading && !error" class="table-actions">
      <button @click="openAddModal" class="add-user-button">Añadir Usuario Autorizado</button>
    </div>

    <table v-if="!loading && !error && authorizedUsers.length > 0">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Número WhatsApp</th>
          <th>Comentarios</th>
          <th>Creado</th>
          <th>Actualizado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="authUser in authorizedUsers" :key="authUser.id">
          <td>{{ authUser.id }}</td>
          <td>{{ authUser.name }}</td>
          <td>{{ authUser.phone_number }}</td>
          <td>{{ authUser.comments }}</td>
          <td>{{ formatDate(authUser.created_at) }}</td>
          <td>{{ formatDate(authUser.updated_at) }}</td>
          <td>
            <button @click="editAuthorizedUser(authUser)" class="action-button edit-button">Editar</button>
            <button @click="confirmDeleteAuthorizedUser(authUser)" class="action-button delete-button">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!loading && authorizedUsers.length === 0 && !error">No hay usuarios autorizados para mostrar.</p>

    <!-- Modal para añadir/editar usuario autorizado -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h2>{{ editingAuthUser ? 'Editar Usuario Autorizado' : 'Añadir Nuevo Usuario Autorizado' }}</h2>
        <form @submit.prevent="editingAuthUser ? handleUpdateAuthorizedUser() : handleAddAuthorizedUser()">
          <div class="form-group">
            <label for="auth_name">Nombre:</label>
            <input type="text" id="auth_name" v-model="formData.name" required />
          </div>
          <div class="form-group">
            <label for="auth_phone_number">Número WhatsApp (ej: 521XXXXXXXXXX):</label>
            <input type="text" id="auth_phone_number" v-model="formData.phone_number" required placeholder="Formato internacional sin + o 00"/>
          </div>
          <div class="form-group">
            <label for="auth_comments">Comentarios:</label>
            <textarea id="auth_comments" v-model="formData.comments" rows="3"></textarea>
          </div>
          <p v-if="modalError" class="error-message">{{ modalError }}</p>
          <div class="modal-actions">
            <button type="submit" class="submit-button">{{ editingAuthUser ? 'Actualizar' : 'Guardar' }}</button>
            <button type="button" @click="closeModal" class="cancel-button">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore'; // Ajustada la ruta de importación

const authStore = useAuthStore();
const authorizedUsers = ref([]);
const loading = ref(true);
const error = ref(null);
const modalError = ref(null);

const showModal = ref(false);
const editingAuthUser = ref(null);

const initialFormData = {
  name: '',
  phone_number: '',
  comments: '',
};
const formData = ref({ ...initialFormData });

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const fetchAuthorizedUsers = async () => {
  loading.value = true;
  error.value = null;
  try {
    const apiClient = authStore.getApiClient();
    const response = await apiClient.get('/authorized-users'); // Endpoint del backend
    authorizedUsers.value = response.data;
  } catch (err) {
    console.error('Error al obtener usuarios autorizados:', err);
    error.value = err.response?.data?.message || err.message || 'Error desconocido.';
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  editingAuthUser.value = null;
  formData.value = { ...initialFormData };
  modalError.value = null;
  showModal.value = true;
};

const editAuthorizedUser = (user) => {
  editingAuthUser.value = { ...user };
  formData.value = {
    name: user.name,
    phone_number: user.phone_number,
    comments: user.comments || '',
  };
  modalError.value = null;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingAuthUser.value = null;
  formData.value = { ...initialFormData };
  modalError.value = null;
};

const handleAddAuthorizedUser = async () => {
  modalError.value = null;
  if (!formData.value.name || !formData.value.phone_number) {
    modalError.value = 'El nombre y el número de WhatsApp son obligatorios.';
    return;
  }
  if (!/^\d{10,15}$/.test(formData.value.phone_number)) {
    modalError.value = 'El número de WhatsApp debe contener solo dígitos y tener entre 10 y 15 caracteres (ej. 521XXXXXXXXXX).';
    return;
  }
  try {
    const apiClient = authStore.getApiClient();
    await apiClient.post('/authorized-users', formData.value);
    fetchAuthorizedUsers();
    closeModal();
  } catch (err) {
    console.error('Error al añadir usuario autorizado:', err);
    modalError.value = err.response?.data?.message || 'Error al guardar el usuario autorizado.';
  }
};

const handleUpdateAuthorizedUser = async () => {
  modalError.value = null;
  if (!editingAuthUser.value || !editingAuthUser.value.id) return;
  if (!formData.value.name || !formData.value.phone_number) {
    modalError.value = 'El nombre y el número de WhatsApp son obligatorios.';
    return;
  }
  if (!/^\d{10,15}$/.test(formData.value.phone_number)) {
    modalError.value = 'El número de WhatsApp debe contener solo dígitos y tener entre 10 y 15 caracteres (ej. 521XXXXXXXXXX).';
    return;
  }

  try {
    const apiClient = authStore.getApiClient();
    await apiClient.put(`/authorized-users/${editingAuthUser.value.id}`, formData.value);
    fetchAuthorizedUsers();
    closeModal();
  } catch (err) {
    console.error('Error al actualizar usuario autorizado:', err);
    modalError.value = err.response?.data?.message || 'Error al actualizar el usuario autorizado.';
  }
};

const confirmDeleteAuthorizedUser = async (user) => {
  if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario autorizado \"${user.name}\" (${user.phone_number})?`)) {
    try {
      const apiClient = authStore.getApiClient();
      await apiClient.delete(`/authorized-users/${user.id}`);
      fetchAuthorizedUsers();
    } catch (err) {
      console.error('Error al eliminar usuario autorizado:', err);
      alert(err.response?.data?.message || 'Error al eliminar el usuario autorizado.');
    }
  }
};

onMounted(() => {
  fetchAuthorizedUsers();
});
</script>

<style scoped>
/* Estilos generales (similares a DashboardUserManagementView) */
.authorized-user-management-container {
  padding: 2rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  max-width: 1200px;
  margin: 2rem auto;
}

h1 {
  color: #333;
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
}

.table-actions {
  margin-bottom: 1rem;
  text-align: right;
}

.add-user-button,
.action-button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
  margin-left: 0.5rem;
}

.add-user-button {
  background-color: #28a745; /* Verde */
  color: white;
}
.add-user-button:hover {
  background-color: #218838;
}

.edit-button {
  background-color: #ffc107; /* Amarillo */
  color: #333;
}
.edit-button:hover {
  background-color: #e0a800;
}

.delete-button {
  background-color: #dc3545; /* Rojo */
  color: white;
}
.delete-button:hover {
  background-color: #c82333;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

thead {
  background-color: #007bff; /* Azul primario */
  color: white;
}

th, td {
  border: 1px solid #ddd;
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.9rem;
}

tbody tr:nth-child(even) {
  background-color: #f2f2f2;
}

tbody tr:hover {
  background-color: #e9ecef;
}

/* Modal Styles */
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
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #333;
  font-size: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: bold;
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 0.95rem;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.modal-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.modal-actions .submit-button {
  background-color: #007bff;
  color: white;
}
.modal-actions .submit-button:hover {
  background-color: #0056b3;
}

.modal-actions .cancel-button {
  background-color: #6c757d; /* Gris secundario */
  color: white;
}
.modal-actions .cancel-button:hover {
  background-color: #5a6268;
}

.error-message {
  color: #d9534f; /* Bootstrap's danger color */
  background-color: #f8d7da; /* Lighter red for background */
  border: 1px solid #f5c6cb; /* Border for the error message */
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

/* Ajuste para que el mensaje de error del modal también use estos estilos si es necesario */
.modal-content .error-message {
   margin-top: 1rem; /* Espacio antes del mensaje de error en el modal */
}
</style> 