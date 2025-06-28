/**
 * Utilidad para verificar si un número de teléfono pertenece a un administrador
 */

/**
 * Verifica si un número de teléfono está en la lista de administradores
 * @param {string} phoneNumber - Número de teléfono a verificar
 * @returns {boolean} - true si es administrador, false en caso contrario
 */
function isAdmin(phoneNumber) {
    // Obtener la lista de administradores desde las variables de entorno
    const adminPhonesList = process.env.ADMIN_SENDER_IDS || '';
    
    // Convertir la cadena separada por comas a un array
    const adminPhones = adminPhonesList.split(',').map(phone => phone.trim());
    
    // Normalizar el número de teléfono para la comparación
    let normalizedPhone = phoneNumber;
    
    // Eliminar el sufijo @c.us si existe
    if (normalizedPhone && normalizedPhone.includes('@c.us')) {
        normalizedPhone = normalizedPhone.split('@')[0];
    }
    
    // Eliminar el signo + si existe
    if (normalizedPhone && normalizedPhone.startsWith('+')) {
        normalizedPhone = normalizedPhone.substring(1);
    }
    
    // Verificar si el número normalizado está en la lista de administradores
    return adminPhones.some(adminPhone => {
        // Normalizar también el número de administrador para comparación
        let normalizedAdminPhone = adminPhone;
        if (normalizedAdminPhone.includes('@c.us')) {
            normalizedAdminPhone = normalizedAdminPhone.split('@')[0];
        }
        if (normalizedAdminPhone.startsWith('+')) {
            normalizedAdminPhone = normalizedAdminPhone.substring(1);
        }
        return normalizedPhone === normalizedAdminPhone;
    });
}

module.exports = {
    isAdmin
}; 