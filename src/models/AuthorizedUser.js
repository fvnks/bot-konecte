const { pool } = require('../config/database');

// Modelo para los usuarios autorizados a interactuar con el bot vía WhatsApp
const AuthorizedUser = {
    async createTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS authorized_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone_number VARCHAR(25) NOT NULL UNIQUE,
                name VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `;
        try {
            await pool.query(createTableQuery);
            console.log("Tabla 'authorized_users' creada o ya existente.");
        } catch (error) {
            console.error("Error creando tabla 'authorized_users':", error);
            throw error;
        }
    },

    async add(phoneNumber, name = null) {
        const query = 'INSERT INTO authorized_users (phone_number, name) VALUES (?, ?)';
        try {
            const [result] = await pool.query(query, [phoneNumber, name]);
            return result.insertId;
        } catch (error) {
            console.error('Error agregando usuario autorizado:', error);
            throw error;
        }
    },

    async findByPhoneNumber(phoneNumber) {
        const query = 'SELECT * FROM authorized_users WHERE phone_number = ? AND is_active = true';
        try {
            const [rows] = await pool.query(query, [phoneNumber]);
            return rows[0];
        } catch (error) {
            console.error('Error buscando usuario autorizado por número:', error);
            throw error;
        }
    },

    async getAll() {
        const query = 'SELECT * FROM authorized_users ORDER BY created_at DESC';
        try {
            const [rows] = await pool.query(query);
            return rows;
        } catch (error) {
            console.error('Error obteniendo todos los usuarios autorizados:', error);
            throw error;
        }
    },

    async update(id, { phoneNumber, name, isActive }) {
        let query = 'UPDATE authorized_users SET ';
        const params = [];
        if (phoneNumber !== undefined) {
            query += 'phone_number = ?, ';
            params.push(phoneNumber);
        }
        if (name !== undefined) {
            query += 'name = ?, ';
            params.push(name);
        }
        if (isActive !== undefined) {
            query += 'is_active = ?, ';
            params.push(isActive);
        }
        query = query.slice(0, -2); // Remover la última coma y espacio
        query += ' WHERE id = ?';
        params.push(id);

        try {
            const [result] = await pool.query(query, params);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error actualizando usuario autorizado:', error);
            throw error;
        }
    },

    async setActiveStatus(id, isActive) {
        const query = 'UPDATE authorized_users SET is_active = ? WHERE id = ?';
        try {
            const [result] = await pool.query(query, [isActive, id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error actualizando estado de usuario autorizado:', error);
            throw error;
        }
    },

    async delete(id) {
        const query = 'DELETE FROM authorized_users WHERE id = ?';
        try {
            const [result] = await pool.query(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error eliminando usuario autorizado:', error);
            throw error;
        }
    }
};

// Crear la tabla al iniciar, si no existe
(async () => {
    try {
        await AuthorizedUser.createTable();
    } catch (err) {
        // El error ya se loguea en createTable
        process.exit(1); // Detener la app si no se puede crear la tabla esencial
    }
})();

module.exports = AuthorizedUser; 