const DashboardUser = require('../models/DashboardUser');
const jwt = require('jsonwebtoken');

// Controlador para el CRUD de Usuarios del Dashboard y Autenticación
const dashboardUserController = {
    // POST /api/dashboard/auth/register  (Considerar proteger esta ruta o usarla solo para setup inicial)
    async register(req, res) {
        const { username, password, email, full_name, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'El nombre de usuario y la contraseña son requeridos.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        try {
            const existingUser = await DashboardUser.findByUsername(username);
            if (existingUser) {
                return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
            }

            // Opcional: Validar si es el primer usuario para asignarle rol 'admin' por defecto
            // const userCount = await DashboardUser.count(); // Necesitaría un método count() en el modelo
            // const assignedRole = (userCount === 0 && !role) ? 'admin' : (role || 'editor');
            const assignedRole = role || 'editor'; // Simplificado por ahora

            const userId = await DashboardUser.add(username, password, email, full_name, assignedRole);
            // No devolver token en el registro, forzar login
            res.status(201).json({ message: 'Usuario de dashboard registrado exitosamente.', userId });
        } catch (error) {
            console.error('Error al registrar usuario de dashboard:', error);
            res.status(500).json({ message: 'Error interno del servidor al registrar usuario.' });
        }
    },

    // POST /api/dashboard/auth/login
    async login(req, res) {
        const { username, password } = req.body;
        console.log(`Login attempt for username: ${username}`); // Log del username

        if (!username || !password) {
            return res.status(400).json({ message: 'El nombre de usuario y la contraseña son requeridos.' });
        }

        try {
            const user = await DashboardUser.findByUsername(username);
            console.log('User found by username:', user ? user.username : null, user ? user.id : null); // Log del usuario encontrado

            if (!user) {
                return res.status(401).json({ message: 'Credenciales inválidas (usuario no encontrado).' });
            }

            console.log(`Comparing password for user ID: ${user.id}`);
            const isMatch = await DashboardUser.comparePassword(password, user.password_hash);
            console.log(`Password match result: ${isMatch}`); // Log del resultado de la comparación

            if (!isMatch) {
                return res.status(401).json({ message: 'Credenciales inválidas (contraseña incorrecta).' });
            }

            if (!user.is_active) {
                return res.status(403).json({ message: 'Cuenta de usuario inactiva.' });
            }

            const payload = {
                id: user.id,
                username: user.username,
                role: user.role
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }); // Token expira en 24 horas

            res.json({
                message: 'Login exitoso.',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Error en login de dashboard:', error);
            res.status(500).json({ message: 'Error interno del servidor durante el login.' });
        }
    },

    // GET /api/dashboard/users (Requiere autenticación y ser admin)
    async getAllDashboardUsers(req, res) {
        try {
            const users = await DashboardUser.getAll(); // Este método ya excluye password_hash
            res.status(200).json(users);
        } catch (error) {
            console.error('Error al obtener usuarios de dashboard:', error);
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    },
    
    // GET /api/dashboard/users/me (Requiere autenticación)
    async getCurrentDashboardUser(req, res) {
        // req.user es adjuntado por authMiddleware.verifyToken
        // El password_hash ya fue excluido en el middleware cuando se cargó el usuario.
        if (!req.user) {
            return res.status(404).json({ message: 'Usuario no encontrado en la solicitud.'});
        }
        res.status(200).json(req.user); 
    },

    // PUT /api/dashboard/users/:id (Requiere autenticación y ser admin)
    // Un usuario también podría actualizar su propia información (excepto el rol)
    async updateDashboardUser(req, res) {
        const { id } = req.params;
        const { username, email, full_name, role, is_active, password } = req.body;
        const requestingUser = req.user; // Usuario que hace la petición

        if (isNaN(parseInt(id))) {
            return res.status(400).json({ message: 'ID de usuario inválido.' });
        }

        // Un admin puede cambiar el rol. Un usuario normal no puede cambiar su propio rol.
        if (role && requestingUser.role !== 'admin') {
            return res.status(403).json({ message: 'No tienes permisos para cambiar roles.' });
        }
        // Un admin puede actualizar a cualquier usuario. Un usuario normal solo a sí mismo.
        if (requestingUser.role !== 'admin' && parseInt(requestingUser.id) !== parseInt(id)) {
            return res.status(403).json({ message: 'No tienes permisos para actualizar este usuario.' });
        }

        try {
            const updateData = {};
            if (username !== undefined) updateData.username = username;
            if (email !== undefined) updateData.email = email;
            if (full_name !== undefined) updateData.fullName = full_name;
            if (role !== undefined && requestingUser.role === 'admin') updateData.role = role; // Solo admin
            if (is_active !== undefined && requestingUser.role === 'admin') updateData.isActive = is_active; // Solo admin puede (des)activar
            if (password !== undefined) {
                 if (password.length < 6) {
                    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
                }
                updateData.password = password; // El modelo se encargará del hash
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ message: 'No se proporcionaron datos válidos para actualizar.' });
            }

            const success = await DashboardUser.update(parseInt(id), updateData);
            if (success) {
                res.status(200).json({ message: 'Usuario de dashboard actualizado exitosamente.' });
            } else {
                res.status(404).json({ message: 'Usuario de dashboard no encontrado o sin cambios.' });
            }
        } catch (error) {
            console.error('Error al actualizar usuario de dashboard:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'El nombre de usuario o email ya está en uso.' });
            }
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    },

    // DELETE /api/dashboard/users/:id (Requiere autenticación y ser admin)
    async deleteDashboardUser(req, res) {
        const { id } = req.params;
        const requestingUser = req.user;

        if (isNaN(parseInt(id))) {
            return res.status(400).json({ message: 'ID de usuario inválido.' });
        }

        if (parseInt(requestingUser.id) === parseInt(id)) {
            return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta de administrador.' });
        }

        try {
            const success = await DashboardUser.delete(parseInt(id));
            if (success) {
                res.status(200).json({ message: 'Usuario de dashboard eliminado exitosamente.' });
            } else {
                res.status(404).json({ message: 'Usuario de dashboard no encontrado.' });
            }
        } catch (error) {
            console.error('Error al eliminar usuario de dashboard:', error);
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    },

    // POST /api/dashboard/users (Ruta para que un admin cree usuarios)
    async createDashboardUserByAdmin(req, res) {
        const { username, password, email, full_name, role, is_active } = req.body;

        // Validaciones básicas
        if (!username || !password) {
            return res.status(400).json({ message: 'El nombre de usuario y la contraseña son requeridos.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
        }
        if (role && !['admin', 'editor'].includes(role)) {
            return res.status(400).json({ message: 'Rol inválido. Debe ser \'admin\' o \'editor\'.' });
        }

        try {
            const existingUser = await DashboardUser.findByUsername(username);
            if (existingUser) {
                return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
            }

            // El email podría ser opcional o único, dependiendo de tu modelo. Asumimos que puede ser null.
            // El modelo DashboardUser.add ya maneja el hasheo de la contraseña.
            const userId = await DashboardUser.add(username, password, email, full_name, role || 'editor', is_active === undefined ? true : is_active);
            
            // Devolver el usuario creado (sin el hash de contraseña)
            const newUser = await DashboardUser.findById(userId);
            if (!newUser) {
                 // Esto no debería suceder si add() fue exitoso, pero es una buena comprobación
                console.error('Error crítico: Usuario creado con add() pero no encontrado con findById()', {userId});
                return res.status(500).json({ message: 'Error creando usuario, no se pudo recuperar después de la inserción.' });
            }

            res.status(201).json({ message: 'Usuario creado exitosamente por el administrador.', user: newUser });

        } catch (error) {
            console.error('Error al crear usuario por admin:', error);
            if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('email')) {
                return res.status(409).json({ message: 'El email proporcionado ya está en uso.' });
            }
            res.status(500).json({ message: 'Error interno del servidor al crear usuario.' });
        }
    }
};

module.exports = dashboardUserController; 