require('dotenv').config();
const DashboardUser = require('./src/models/DashboardUser');

async function addAdminUser() {
    console.log('Iniciando script para agregar usuario administrador...');
    try {
        const username = 'admin_temporal';
        const password = 'admin123';
        const email = 'temp@admin.com';
        const role = 'admin';

        // Verificar si el usuario ya existe
        const existingUser = await DashboardUser.findByUsername(username);
        if (existingUser) {
            console.log(`El usuario "${username}" ya existe. Si olvidaste la contraseña, deberás restablecerla manualmente en la base de datos o eliminar este usuario y volver a ejecutar el script.`);
            return;
        }

        // Agregar el nuevo usuario
        const newUserId = await DashboardUser.add(username, password, email, 'Admin Temporal', role, true);
        console.log(`✅ ¡Usuario administrador creado exitosamente!`);
        console.log(`   ID: ${newUserId}`);
        console.log(`   Usuario: ${username}`);
        console.log(`   Contraseña: ${password}`);
        
    } catch (error) {
        console.error('❌ Error al agregar el usuario administrador:', error);
    } finally {
        // Cierro la conexión a la base de datos
        const { pool } = require('./src/config/database');
        pool.end();
        console.log('Conexión a la base de datos cerrada.');
    }
}

addAdminUser(); 