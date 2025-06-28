const AuthorizedUser = require('../models/AuthorizedUser');

// Controlador para el CRUD de Usuarios Autorizados (WhatsApp)
const authorizedUserController = {
    // POST /api/dashboard/authorized-users
    async addAuthorizedUser(req, res) {
        const { phone_number, name } = req.body;
        if (!phone_number) {
            return res.status(400).json({ message: 'El número de teléfono (phone_number) es requerido.' });
        }
        try {
            // Validar/Normalizar el número de teléfono si es necesario antes de guardar
            // Por ejemplo, asegurarse de que tenga el código de país y no caracteres extraños.
            const existingUser = await AuthorizedUser.findByPhoneNumber(phone_number); // Verificar si ya existe
            if (existingUser) {
                return res.status(409).json({ message: 'Este número de teléfono ya está autorizado.' });
            }

            const userId = await AuthorizedUser.add(phone_number, name);
            res.status(201).json({ message: 'Usuario autorizado agregado exitosamente.', userId });
        } catch (error) {
            console.error('Error al agregar usuario autorizado:', error);
            res.status(500).json({ message: 'Error interno del servidor al agregar usuario autorizado.' });
        }
    },

    // GET /api/dashboard/authorized-users
    async getAllAuthorizedUsers(req, res) {
        try {
            const users = await AuthorizedUser.getAll();
            res.status(200).json(users);
        } catch (error) {
            console.error('Error al obtener usuarios autorizados:', error);
            res.status(500).json({ message: 'Error interno del servidor al obtener usuarios autorizados.' });
        }
    },

    // PUT /api/dashboard/authorized-users/:id
    async updateAuthorizedUser(req, res) {
        const { id } = req.params;
        const { phone_number, name, is_active } = req.body;

        if (isNaN(parseInt(id))){
            return res.status(400).json({ message: 'ID inválido.'});
        }

        // Validar que al menos un campo se esté actualizando
        if (phone_number === undefined && name === undefined && is_active === undefined) {
            return res.status(400).json({ message: 'No se proporcionaron datos para actualizar.' });
        }

        try {
            const updateData = {};
            if (phone_number !== undefined) updateData.phoneNumber = phone_number;
            if (name !== undefined) updateData.name = name;
            if (is_active !== undefined) updateData.isActive = is_active;

            const success = await AuthorizedUser.update(parseInt(id), updateData);
            if (success) {
                res.status(200).json({ message: 'Usuario autorizado actualizado exitosamente.' });
            } else {
                res.status(404).json({ message: 'Usuario autorizado no encontrado o sin cambios.' });
            }
        } catch (error) {
            console.error('Error al actualizar usuario autorizado:', error);
            // Si el error es por phone_number duplicado (MySQL error code 1062 for ER_DUP_ENTRY)
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'El número de teléfono ya está en uso por otro usuario.' });
            }
            res.status(500).json({ message: 'Error interno del servidor al actualizar usuario autorizado.' });
        }
    },

    // DELETE /api/dashboard/authorized-users/:id
    async deleteAuthorizedUser(req, res) {
        const { id } = req.params;
         if (isNaN(parseInt(id))){
            return res.status(400).json({ message: 'ID inválido.'});
        }

        try {
            // Alternativamente, se podría cambiar el estado a inactivo:
            // const success = await AuthorizedUser.setActiveStatus(parseInt(id), false);
            const success = await AuthorizedUser.delete(parseInt(id));
            if (success) {
                res.status(200).json({ message: 'Usuario autorizado eliminado exitosamente.' });
                // Si usas setActiveStatus: res.status(200).json({ message: 'Usuario autorizado desactivado exitosamente.' });
            } else {
                res.status(404).json({ message: 'Usuario autorizado no encontrado.' });
            }
        } catch (error) {
            console.error('Error al eliminar usuario autorizado:', error);
            res.status(500).json({ message: 'Error interno del servidor al eliminar usuario autorizado.' });
        }
    }
};

module.exports = authorizedUserController; 