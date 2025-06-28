const jwt = require('jsonwebtoken');
const DashboardUser = require('../models/DashboardUser');

const authMiddleware = {
    verifyToken: async (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Buscar el usuario en la BD para asegurarse de que todavía existe y está activo
            const user = await DashboardUser.findById(decoded.id);
            if (!user || !user.is_active) {
                return res.status(401).json({ message: 'Token inválido o usuario inactivo.' });
            }
            req.user = user; // Adjuntar el objeto de usuario completo (sin password_hash)
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expirado.' });
            }
            console.error('Error de autenticación de token:', error.message);
            return res.status(403).json({ message: 'Token inválido.' });
        }
    },

    // Middleware para verificar si el usuario tiene el rol de 'admin'
    isAdmin: (req, res, next) => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
        }
    }
};

module.exports = authMiddleware; 