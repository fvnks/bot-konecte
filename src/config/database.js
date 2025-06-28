const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'botito_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Conexión a MySQL establecida correctamente.');
        connection.release();
    } catch (error) {
        console.error('Error al conectar con MySQL:', error);
        throw error; // Re-lanzar para que el inicio del servidor falle si no hay DB
    }
}

// (Opcional) Podrías llamar a testConnection() aquí si quieres verificar al inicio,
// o manejarlo en server.js antes de iniciar el servidor.

module.exports = {
    pool,
    testConnection
}; 