const { pool } = require('../config/database');
const bcrypt = require('bcryptjs'); // Para hashear contraseñas, necesitarás instalarlo: npm install bcryptjs

// Modelo para los usuarios del Dashboard
const DashboardUser = {
    async createTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS dashboard_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                email VARCHAR(100) UNIQUE,
                full_name VARCHAR(100),
                role ENUM('admin', 'editor') DEFAULT 'editor',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `;
        try {
            await pool.query(createTableQuery);
            console.log("Tabla 'dashboard_users' creada o ya existente.");
        } catch (error) {
            console.error("Error creando tabla 'dashboard_users':", error);
            throw error;
        }
    },

    async add(username, password, email = null, fullName = null, role = 'editor', isActive = true) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const query = 'INSERT INTO dashboard_users (username, password_hash, email, full_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?)';
        try {
            const [result] = await pool.query(query, [username, passwordHash, email, fullName, role, isActive]);
            return result.insertId;
        } catch (error) {
            console.error('Error agregando usuario de dashboard:', error);
            throw error;
        }
    },

    async findByUsername(username) {
        const query = 'SELECT * FROM dashboard_users WHERE username = ? AND is_active = true';
        try {
            const [rows] = await pool.query(query, [username]);
            return rows[0];
        } catch (error) {
            console.error('Error buscando usuario de dashboard por username:', error);
            throw error;
        }
    },

    async findById(id) {
        const query = 'SELECT id, username, email, full_name, role, is_active, created_at FROM dashboard_users WHERE id = ?';
        try {
            const [rows] = await pool.query(query, [id]);
            return rows[0];
        } catch (error) {
            console.error('Error buscando usuario de dashboard por ID:', error);
            throw error;
        }
    },

    async comparePassword(candidatePassword, hash) {
        return bcrypt.compare(candidatePassword, hash);
    },

    async getAll() {
        const query = 'SELECT id, username, email, full_name, role, is_active, created_at FROM dashboard_users ORDER BY username ASC';
        try {
            const [rows] = await pool.query(query);
            return rows;
        } catch (error) {
            console.error('Error obteniendo todos los usuarios de dashboard:', error);
            throw error;
        }
    },

    async update(id, { username, email, fullName, role, isActive, password }) {
        let query = 'UPDATE dashboard_users SET ';
        const params = [];
        if (username !== undefined) {
            query += 'username = ?, ';
            params.push(username);
        }
        if (email !== undefined) {
            query += 'email = ?, ';
            params.push(email);
        }
        if (fullName !== undefined) {
            query += 'full_name = ?, ';
            params.push(fullName);
        }
        if (role !== undefined) {
            query += 'role = ?, ';
            params.push(role);
        }
        if (isActive !== undefined) {
            query += 'is_active = ?, ';
            params.push(isActive);
        }
        if (password !== undefined) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            query += 'password_hash = ?, ';
            params.push(passwordHash);
        }

        query = query.slice(0, -2); // Remover la última coma y espacio
        query += ' WHERE id = ?';
        params.push(id);

        try {
            const [result] = await pool.query(query, params);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error actualizando usuario de dashboard:', error);
            throw error;
        }
    },

    async delete(id) {
        const query = 'DELETE FROM dashboard_users WHERE id = ?';
        try {
            const [result] = await pool.query(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error eliminando usuario de dashboard:', error);
            throw error;
        }
    }
};

// Crear la tabla al iniciar, si no existe
(async () => {
    try {
        await DashboardUser.createTable();
    } catch (err) {
        // El error ya se loguea en createTable
        process.exit(1); // Detener la app si no se puede crear la tabla esencial
    }
})();

module.exports = DashboardUser; 