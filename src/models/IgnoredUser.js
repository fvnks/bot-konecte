const { pool } = require('../config/database');

// Modelo para los usuarios ignorados por el bot
const IgnoredUser = {
    async createTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ignored_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone_number VARCHAR(25) NOT NULL UNIQUE,
                reason VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        try {
            await pool.query(createTableQuery);
            console.log("Tabla 'ignored_users' creada o ya existente.");
        } catch (error) {
            console.error("Error creando tabla 'ignored_users':", error);
            throw error;
        }
    },

    async add(phoneNumber, reason = null) {
        const query = 'INSERT INTO ignored_users (phone_number, reason) VALUES (?, ?)';
        try {
            const [result] = await pool.query(query, [phoneNumber, reason]);
            return result.insertId;
        } catch (error) {
            console.error('Error agregando usuario ignorado:', error);
            throw error;
        }
    },

    async findByPhoneNumber(phoneNumber) {
        const query = 'SELECT * FROM ignored_users WHERE phone_number = ?';
        try {
            const [rows] = await pool.query(query, [phoneNumber]);
            return rows[0];
        } catch (error) {
            console.error('Error buscando usuario ignorado por número:', error);
            throw error;
        }
    },
    
    async remove(phoneNumber) {
        const query = 'DELETE FROM ignored_users WHERE phone_number = ?';
        try {
            const [result] = await pool.query(query, [phoneNumber]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error eliminando usuario ignorado:', error);
            throw error;
        }
    }
};

// Crear la tabla al iniciar, si no existe
(async () => {
    try {
        await IgnoredUser.createTable();
    } catch (err) {
        // El error ya se loguea en createTable
        process.exit(1); // Detener la app si no se puede crear la tabla esencial
    }
})();

module.exports = IgnoredUser; 