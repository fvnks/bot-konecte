<template>
  <div class="user-management-container">
    <h1>Gestión de Usuarios del Dashboard</h1>
    <p v-if="loading">Cargando usuarios...</p>
    <p v-if="error" class="error-message">Error al cargar usuarios: {{ error }}</p>

    <div v-if="!loading && !error" class="table-actions">
      <button @click="openAddModalIntern" class="add-user-button">Añadir Usuario</button>
    </div>

    <table v-if="!loading && !error && users.length > 0">
      <thead>
        <tr>
          <th>ID</th>
          <th>Username</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Activo</th>
          <th>Creado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.username }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.role }}</td>
          <td>{{ user.is_active ? 'Sí' : 'No' }}</td>
          <td>{{ formatDate(user.created_at) }}</td>
          <td>
            <button @click="editUser(user)" class="action-button edit-button">Editar</button>
            <button @click="confirmDeleteUser(user)" class="action-button delete-button">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!loading && users.length === 0 && !error">No hay usuarios para mostrar.</p>

    <!-- Modal para añadir/editar usuario -->
    <div v-if="showModalIntern" class="modal-overlay">
      <div class="modal-content">
        <h2>{{ editingUser ? 'Editar Usuario' : 'Añadir Nuevo Usuario' }}</h2>
        <form @submit.prevent="editingUser ? handleUpdateUser() : handleAddUser()">
          <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" v-model="formData.username" required />
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" v-model="formData.email" />
          </div>
          <div class="form-group">
            <label for="full_name">Nombre Completo:</label>
            <input type="text" id="full_name" v-model="formData.full_name" />
          </div>
          <div class="form-group">
            <label for="password">Contraseña (dejar en blanco para no cambiar si edita):</label>
            <input type="password" id="password" v-model="formData.password" :placeholder="editingUser ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'" />
          </div>
          <div class="form-group">
            <label for="role">Rol:</label>
            <select id="role" v-model="formData.role">
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="form-group" v-if="editingUser">
            <label for="is_active">Activo:</label>
            <input type="checkbox" id="is_active" v-model="formData.is_active" />
          </div>
          <p v-if="modalError" class="error-message">{{ modalError }}</p>
          <div class="modal-actions">
            <button type="submit" class="submit-button">{{ editingUser ? 'Actualizar' : 'Guardar' }}</button>
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
const users = ref([]);
const loading = ref(true);
const error = ref(null);
const modalError = ref(null);

const showModalIntern = ref(false); // Renombrado para evitar conflicto si showAddUserModal se usa globalmente
const editingUser = ref(null);

const initialFormData = {
  username: '',
  email: '',
  full_name: '',
  password: '',
  role: 'editor',
  is_active: true
};
const formData = ref({ ...initialFormData });

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const fetchUsers = async () => {
  loading.value = true;
  error.value = null;
  try {
    const apiClientInstance = authStore.getApiClient();
    const response = await apiClientInstance.get('/users');
    users.value = response.data;
  } catch (err) {
    console.error('Error al obtener usuarios del dashboard:', err);
    error.value = err.response?.data?.message || err.message || 'Error desconocido.';
  } finally {
    loading.value = false;
  }
};

const openAddModalIntern = () => { // Renombrado
  editingUser.value = null;
  formData.value = { ...initialFormData };
  modalError.value = null;
  showModalIntern.value = true; // Renombrado
};

const editUser = (user) => {
  editingUser.value = { ...user };
  formData.value = {
    username: user.username,
    email: user.email || '',
    full_name: user.full_name || '',
    password: '',
    role: user.role,
    is_active: user.is_active
  };
  modalError.value = null;
  showModalIntern.value = true; // Renombrado
};

const closeModal = () => {
  showModalIntern.value = false; // Renombrado
  editingUser.value = null;
  formData.value = { ...initialFormData };
  modalError.value = null;
};

const handleAddUser = async () => {
  modalError.value = null;
  if (!formData.value.username || !formData.value.password) {
    modalError.value = 'El nombre de usuario y la contraseña son obligatorios.';
    return;
  }
  if (formData.value.password.length < 6) {
    modalError.value = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }
  try {
    const apiClientInstance = authStore.getApiClient();
    await apiClientInstance.post('/users', formData.value);
    fetchUsers();
    closeModal();
  } catch (err) {
    console.error('Error al añadir usuario:', err);
    modalError.value = err.response?.data?.message || 'Error al guardar el usuario.';
  }
};

const handleUpdateUser = async () => {
  modalError.value = null;
  if (!editingUser.value || !editingUser.value.id) return;

  const payload = { ...formData.value };
  if (!payload.password) {
    delete payload.password;
  } else if (payload.password.length < 6) {
    modalError.value = 'La nueva contraseña debe tener al menos 6 caracteres.';
    return;
  }

  try {
    const apiClientInstance = authStore.getApiClient();
    await apiClientInstance.put(`/users/${editingUser.value.id}`, payload);
    fetchUsers();
    closeModal();
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    modalError.value = err.response?.data?.message || 'Error al actualizar el usuario.';
  }
};

const confirmDeleteUser = async (user) => {
  if (authStore.user && authStore.user.id === user.id) {
    alert('No puedes eliminar tu propia cuenta de esta manera.');
    return;
  }
  if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`)) {
    try {
      const apiClientInstance = authStore.getApiClient();
      await apiClientInstance.delete(`/users/${user.id}`);
      fetchUsers();
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      alert(err.response?.data?.message || 'Error al eliminar el usuario.');
    }
  }
};

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
/* Estilos generales (similares a otras vistas de gestión) */
.user-management-container {
  padding: 2rem;
  background-color: #f9f9f9;
}

.error-message {
  color: #d9534f;
  margin-bottom: 1rem;
}

.table-actions {
  margin-bottom: 1.5rem;
  text-align: right;
}

.add-user-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

.add-user-button:hover {
  background-color: #0056b3;
}

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

.edit-button {
  background-color: #ffc107;
  color: #212529;
}

.delete-button {
  background-color: #dc3545;
  color: white;
}

/* Estilos del Modal */
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
  max-width: 500px;
  z-index: 1001;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group input[type="password"],
.form-group select,
.form-group input[type="checkbox"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.form-group input[type="checkbox"] {
  width: auto;
  margin-right: 5px;
}

.modal-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions button {
  padding: 10px 20px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
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