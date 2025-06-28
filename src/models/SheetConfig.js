const { pool } = require('../config/database');

// Modelo para la configuración de Google Sheets
const SheetConfig = {
    async createTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS sheet_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                config_name VARCHAR(100) NOT NULL UNIQUE, -- ej. 'MAIN_CATEGORIZATION_SHEET'
                sheet_id VARCHAR(255) NOT NULL,
                sheet_name VARCHAR(255), -- Nombre de la pestaña/hoja específica
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `;
        try {
            await pool.query(createTableQuery);
            console.log("Tabla 'sheet_configs' creada o ya existente.");
        } catch (error) {
            console.error("Error creando tabla 'sheet_configs':", error);
            throw error;
        }
    },

    async add(configName, sheetId, sheetName = null, description = null, isActive = false) {
        const query = 'INSERT INTO sheet_configs (config_name, sheet_id, sheet_name, description, is_active) VALUES (?, ?, ?, ?, ?)';
        try {
            const [result] = await pool.query(query, [configName, sheetId, sheetName, description, isActive]);
            return result.insertId;
        } catch (error) {
            console.error('Error agregando configuración de sheet:', error);
            throw error;
        }
    },

    async findByConfigName(configName, onlyActive = true) {
        let query = 'SELECT * FROM sheet_configs WHERE config_name = ?';
        const params = [configName];
        if (onlyActive) {
            query += ' AND is_active = true';
        }

        try {
            const [rows] = await pool.query(query, params);
            return rows[0];
        } catch (error) {
            console.error('Error buscando configuración de sheet por nombre:', error);
            throw error;
        }
    },

    async findById(id) {
        const query = 'SELECT * FROM sheet_configs WHERE id = ?';
        try {
            const [rows] = await pool.query(query, [id]);
            return rows[0];
        } catch (error) {
            console.error('Error buscando configuración de sheet por ID:', error);
            throw error;
        }
    },

    async getAllActive() {
        const query = 'SELECT * FROM sheet_configs WHERE is_active = true ORDER BY config_name ASC';
        try {
            const [rows] = await pool.query(query);
            return rows;
        } catch (error) {
            console.error('Error obteniendo todas las configuraciones de sheet activas:', error);
            throw error;
        }
    },

    async getAll() {
        const query = 'SELECT * FROM sheet_configs ORDER BY config_name ASC';
        try {
            const [rows] = await pool.query(query);
            return rows;
        } catch (error) {
            console.error('Error obteniendo todas las configuraciones de sheet:', error);
            throw error;
        }
    },

    async update(id, { configName, sheetId, sheetName, description, isActive }) {
        let query = 'UPDATE sheet_configs SET ';
        const params = [];
        if (configName !== undefined) {
            query += 'config_name = ?, ';
            params.push(configName);
        }
        if (sheetId !== undefined) {
            query += 'sheet_id = ?, ';
            params.push(sheetId);
        }
        if (sheetName !== undefined) {
            query += 'sheet_name = ?, ';
            params.push(sheetName);
        }
        if (description !== undefined) {
            query += 'description = ?, ';
            params.push(description);
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
            console.error('Error actualizando configuración de sheet:', error);
            throw error;
        }
    },

    async setAllInactive() {
        const query = 'UPDATE sheet_configs SET is_active = false WHERE is_active = true';
        try {
            const [result] = await pool.query(query);
            console.log(`Filas afectadas por setAllInactive: ${result.affectedRows}`);
            return result.affectedRows;
        } catch (error) {
            console.error('Error estableciendo todas las configuraciones como inactivas:', error);
            throw error;
        }
    },

    async delete(id) {
        // Podríamos simplemente marcar como inactivo en lugar de borrar permanentemente
        // return this.update(id, { isActive: false });
        const query = 'DELETE FROM sheet_configs WHERE id = ?';
        try {
            const [result] = await pool.query(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error eliminando configuración de sheet:', error);
            throw error;
        }
    }
};

// Crear la tabla al iniciar, si no existe
(async () => {
    try {
        await SheetConfig.createTable();
    } catch (err) {
        // El error ya se loguea en createTable
        process.exit(1); // Detener la app si no se puede crear la tabla esencial
    }
})();

module.exports = SheetConfig; 