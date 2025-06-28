const SheetConfig = require('../models/SheetConfig');
const googleSheetsService = require('../services/googleSheetsService'); // Importar el servicio
// const mongoose = require('mongoose'); // Eliminamos esta importación

// Controlador para el CRUD de Configuración de Google Sheets
const sheetConfigController = {
    // POST /api/dashboard/sheet-configs (Admin)
    async addSheetConfig(req, res) {
        let { config_name, sheet_id, sheet_name, description, is_active } = req.body;

        if (!config_name || !sheet_id) {
            return res.status(400).json({ message: 'El nombre de configuración (config_name) y el ID de la hoja (sheet_id) son requeridos.' });
        }

        try {
            const existingConfigByName = await SheetConfig.findByConfigName(config_name, false); // Buscar incluso inactivas por nombre para evitar duplicados de nombre
            if (existingConfigByName) {
                return res.status(409).json({ message: 'Ya existe una configuración con este nombre (config_name), aunque esté inactiva.' });
            }

            const allConfigs = await SheetConfig.getAll();
            if (allConfigs.length === 0 && is_active === undefined) {
                is_active = true; // Si es la primera config, hacerla activa por defecto
            }

            if (is_active === true) {
                await SheetConfig.setAllInactive();
            }
            
            // Si después de desactivar todas, is_active no es true (y no había otras), o si se pasó explícitamente como false cuando había otras activas.
            // Necesitamos asegurar que siempre haya una activa si es posible.
            // Esta lógica puede ser compleja. Por ahora: si se marca como activa, se desactiva el resto.
            // Si se quiere marcar como NO activa, y no hay otras activas, ¿qué hacer? 
            // Por simplicidad, si is_active es true, se procede. Si es false o undefined, y no hay otras activas, se debería activar esta.
            // Sin embargo, la lógica de arriba (allConfigs.length === 0) ya cubre el caso de la primera.

            const newConfigId = await SheetConfig.add(config_name, sheet_id, sheet_name, description, is_active);
            res.status(201).json({ message: 'Configuración de Google Sheet agregada exitosamente.', configId: newConfigId, isActive: is_active });
        } catch (error) {
            console.error('Error al agregar configuración de sheet:', error);
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    },

    // GET /api/dashboard/sheet-configs (Autenticado)
    async getAllSheetConfigs(req, res) {
        try {
            // Podríamos diferenciar entre getAllActive() para el bot y getAll() para el dashboard
            const configs = await SheetConfig.getAll(); 
            res.status(200).json(configs);
        } catch (error) {
            console.error('Error al obtener configuraciones de sheet:', error);
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    },

    // GET /api/dashboard/sheet-configs/:id (Autenticado)
    async getSheetConfigById(req, res) {
        const { id } = req.params;
        if (isNaN(parseInt(id))){
            return res.status(400).json({ message: 'ID inválido.'});
        }
        try {
            const config = await SheetConfig.findById(parseInt(id));
            if (config) {
                res.status(200).json(config);
            } else {
                res.status(404).json({ message: 'Configuración de Sheet no encontrada.' });
            }
        } catch (error) {
            console.error('Error al obtener configuración de sheet por ID:', error);
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    },

    // PUT /api/dashboard/sheet-configs/:id (Admin)
    async updateSheetConfig(req, res) {
        const { id } = req.params;
        const { config_name, sheet_id, sheet_name, description, is_active } = req.body;
        const configId = parseInt(id);

        if (isNaN(configId)){
            return res.status(400).json({ message: 'ID inválido.'});
        }

        if (config_name === undefined && sheet_id === undefined && sheet_name === undefined && description === undefined && is_active === undefined) {
            return res.status(400).json({ message: 'No se proporcionaron datos para actualizar.' });
        }

        try {
            const currentConfig = await SheetConfig.findById(configId);
            if (!currentConfig) {
                return res.status(404).json({ message: 'Configuración no encontrada para actualizar.' });
            }

            // Evitar duplicados de config_name al actualizar
            if (config_name && config_name !== currentConfig.config_name) {
                const existingNamedConfig = await SheetConfig.findByConfigName(config_name, false);
                if (existingNamedConfig && existingNamedConfig.id !== configId) {
                    return res.status(409).json({ message: 'Otro registro ya usa ese nombre de configuración (config_name).' });
                }
            }

            if (is_active === true) {
                await SheetConfig.setAllInactive(); // Pone todas las demás (y la actual si estaba activa) en false
            } else if (is_active === false) {
                // Se está intentando desactivar esta hoja.
                // Verificar si es la única activa.
                const activeConfigs = await SheetConfig.getAllActive();
                if (activeConfigs.length === 1 && activeConfigs[0].id === configId) {
                    // Es la única activa y se está intentando desactivar.
                    // Por ahora, permitiremos esto, pero idealmente se debería advertir o impedir.
                    // O forzar a que otra se active si se quiere mantener siempre una activa.
                    console.warn(`Se está desactivando la última hoja activa (ID: ${configId}). El sistema podría quedar sin hoja activa.`);
                }
            }

            const updateData = {};
            if (config_name !== undefined) updateData.configName = config_name;
            if (sheet_id !== undefined) updateData.sheetId = sheet_id;
            if (sheet_name !== undefined) updateData.sheetName = sheet_name;
            if (description !== undefined) updateData.description = description;
            if (is_active !== undefined) updateData.isActive = is_active; // Esto aplicará el is_active deseado después del setAllInactive si es true

            const success = await SheetConfig.update(configId, updateData);

            if (success) {
                // Si se actualizó a is_active: true, y originalmente era false, setAllInactive ya hizo su trabajo.
                // Si se actualizó a is_active: false, no hay más que hacer aquí.
                res.status(200).json({ message: 'Configuración de Google Sheet actualizada exitosamente.' });
            } else {
                res.status(404).json({ message: 'Configuración no encontrada o sin cambios reales.' }); // updateData podría no tener cambios si solo se pasó el mismo valor de is_active
            }
        } catch (error) {
            console.error('Error al actualizar configuración de sheet:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'El nombre de configuración ya está en uso.' });
            }
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    },

    // DELETE /api/dashboard/sheet-configs/:id (Admin)
    async deleteSheetConfig(req, res) {
        const { id } = req.params;
        if (isNaN(parseInt(id))){
            return res.status(400).json({ message: 'ID inválido.'});
        }

        try {
            // Opcionalmente, en lugar de borrar, podríamos solo marcar como is_active = false
            // const success = await SheetConfig.update(parseInt(id), { isActive: false });
            const success = await SheetConfig.delete(parseInt(id));
            if (success) {
                res.status(200).json({ message: 'Configuración de Google Sheet eliminada exitosamente.' });
            } else {
                res.status(404).json({ message: 'Configuración no encontrada.' });
            }
        } catch (error) {
            console.error('Error al eliminar configuración de sheet:', error);
            res.status(500).json({ message: 'Error interno del servidor.' });
        }
    },

    // Renombrar esta función para que coincida con la ruta
    async checkSheetConnectionStatus(req, res) {
        const { configId } = req.params;
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ message: 'ID de configuración inválido.' });
        }

        try {
            const config = await SheetConfig.findById(id);
            if (!config) {
                return res.status(404).json({ message: 'Configuración de Sheet no encontrada.' });
            }

            const sheetNameOnly = config.sheet_name ? config.sheet_name.split('!')[0] : null;
            const result = await googleSheetsService.checkSheetAccess(config.sheet_id, sheetNameOnly);
            
            res.status(200).json(result); // Simplificado, el frontend interpretará result.status

        } catch (error) {
            console.error(`Error al verificar estado de conexión para config ID ${id}:`, error);
            res.status(500).json({ status: 'error', message: 'Error interno del servidor al verificar el estado de la conexión.' });
        }
    },

    // La siguiente función getSheetDataById se elimina porque ya no se usa.
    // /**
    //  * Obtiene los datos de una hoja de cálculo configurada por su ID.
    //  */
    // async getSheetDataById(req, res) { ...TODA LA FUNCION ELIMINADA... }

};

module.exports = sheetConfigController; 