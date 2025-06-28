const { google } = require('googleapis');
const SheetConfig = require('../models/SheetConfig');

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const googleSheetsService = {
    async appendData(spreadsheetId, range, values) {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
            console.error('LOG_ERROR: Credenciales de Google Service Account no configuradas en .env');
            throw new Error('Servicio de Google Sheets no configurado correctamente.');
        }
        if (!spreadsheetId || !range || !values) {
            console.error(`LOG_ERROR: Faltan parámetros para appendData. spreadsheetId: ${spreadsheetId}, range: ${range}, values: ${JSON.stringify(values)}`);
            throw new Error('Faltan parámetros para añadir datos a Google Sheets.');
        }
        try {
            console.log(`LOG_INFO: Intentando añadir datos a Google Sheets. ID: ${spreadsheetId}, Rango: ${range}`);
            const response = await sheets.spreadsheets.values.append({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                resource: { values },
            });
            console.log('LOG_SUCCESS: Datos añadidos a Google Sheets:', response.data.updates.updatedRange);
            return response.data;
        } catch (error) {
            console.error('LOG_ERROR: Error al añadir datos a Google Sheets:', error.message);
            if (error.response && error.response.data) {
                console.error('LOG_ERROR_DETAILS: Detalles del error de la API de Google:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    },

    async getMainSheetConfig() {
        console.log("Buscando configuración de Google Sheet activa...");
        try {
            const activeConfigs = await SheetConfig.getAllActive();
            if (!activeConfigs || activeConfigs.length === 0) {
                console.error('No se encontró ninguna configuración de Google Sheet activa en la base de datos.');
                return null;
            }
            if (activeConfigs.length > 1) {
                console.warn('Se encontró más de una configuración de Google Sheet activa. Usando la primera por defecto.');
            }
            const mainConfig = activeConfigs[0];
            console.log(`Configuración activa encontrada: ${mainConfig.config_name} (ID: ${mainConfig.sheet_id})`);
            return {
                spreadsheetId: mainConfig.sheet_id,
                sheetName: mainConfig.sheet_name || 'Hoja1',
                range: mainConfig.sheet_name ? `${mainConfig.sheet_name}!A:AA` : 'Hoja1!A:AA'
            };
        } catch (error) {
            console.error(`Error obteniendo la configuración activa de Google Sheet:`, error);
            return null;
        }
    },

    async readData(spreadsheetId, range) {
        if (!spreadsheetId || !range) {
            throw new Error('Faltan parámetros para leer datos de Google Sheets.');
        }
        try {
            const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
            return response.data.values || [];
        } catch (error) {
            console.error('Error al leer datos de Google Sheets:', error.message);
            return null;
        }
    },
    
    async saveToKonecte(spreadsheetId, propertyData, senderInfo) {
        const sheetName = 'konecte';
        try {
            await this.ensureSheetExists(spreadsheetId, sheetName);
            const now = new Date();
            
            // Limpiar números de teléfono (eliminar el signo + si existe)
            let telefono = propertyData.telefono || null;
            let telefonoCorredor = propertyData.telefonoCorredor || null;
            
            // Eliminar el signo + del número de teléfono principal
            if (telefono && typeof telefono === 'string') {
                telefono = telefono.replace(/^\+/, '');
            }
            
            // Eliminar el signo + del número del corredor
            if (telefonoCorredor && typeof telefonoCorredor === 'string') {
                telefonoCorredor = telefonoCorredor.replace(/^\+/, '');
            }
            
            const newRow = [
                propertyData.accion || null, propertyData.tipoOperacion || null, propertyData.tipoPropiedad || null,
                propertyData.region || null, propertyData.ciudad || null, propertyData.comuna || null,
                null, null, null,
                propertyData.numDormitorios || null, propertyData.numBanos || null, propertyData.estacionamiento || null,
                propertyData.bodegas || null, propertyData.valor || null, propertyData.moneda || null,
                propertyData.gastosComunes || null, propertyData.superficie || null, telefono,
                propertyData.correoElectronico || null, telefonoCorredor, senderInfo.name || null,
                now.toLocaleDateString('es-CL'), now.toLocaleTimeString('es-CL'), senderInfo.id || null,
                'activa', null, null
            ];
            await this.appendData(spreadsheetId, sheetName, [newRow]);
            console.log(`LOG_SUCCESS: Entrada guardada exitosamente en la hoja ${sheetName}.`);
            return true;
        } catch (error) {
            console.error(`LOG_ERROR: Fallo al guardar la entrada en ${sheetName}:`, error.message);
            return false;
        }
    },
    
    async ensureSheetExists(spreadsheetId, sheetName) {
        try {
            const response = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
            const sheetExists = response.data.sheets.some(sheet => sheet.properties.title === sheetName);
            if (!sheetExists) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    resource: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
                });
            }
        } catch (error) {
            console.error(`Error al verificar/crear la hoja ${sheetName}:`, error);
            throw error;
        }
    },
    
    async getAllSheetNames(spreadsheetId) {
        try {
            const res = await sheets.spreadsheets.get({ spreadsheetId });
            return res.data.sheets.map(sheet => sheet.properties.title);
        } catch (error) {
            console.error('Error al obtener los nombres de las hojas:', error);
            return [];
        }
    },

    async searchInKonecte(spreadsheetId, criteria, normalize) {
        const sheetName = 'konecte';
        const data = await this.readData(spreadsheetId, `${sheetName}!A:AA`);
        if (!data || data.length <= 1) return [];

        // Esta función se llama cuando un usuario 'busca', por lo tanto, siempre buscamos registros de 'ofrezco'.
        const accionBuscar = 'ofrezco';
        console.log(`DEBUG: Intención de búsqueda: se buscarán registros de tipo '${accionBuscar}'`);
        
        const normalizedCriteria = {
            tipoPropiedad: normalize(criteria.tipoPropiedad),
            comunas: criteria.ubicacion ? [normalize(criteria.ubicacion)] : (criteria.comuna ? criteria.comuna.split(',').map(c => normalize(c.trim())) : []),
            tipoOperacion: normalize(criteria.tipoOperacion),
            accion: accionBuscar // Usamos 'ofrezco' directamente
        };

        console.log(`DEBUG: Criterios normalizados para búsqueda: ${JSON.stringify(normalizedCriteria)}`);

        // Mapeo de columnas en la hoja "konecte"
        const col = { 
            accion: 0,                // A
            tipoOperacion: 1,         // B
            tipoPropiedad: 2,         // C
            region: 3,                // D
            ciudad: 4,                // E
            comuna: 5,                // F
            direccion: 6,             // G
            superficie: 16,           // Q
            dormitorios: 9,           // J
            banos: 10,                // K
            valor: 13,                // N
            moneda: 14,               // O
            telefono: 18,             // S
            email: 19,                // T
            telefonoCorredor: 19,     // T
            nombreContacto: 20,       // U
            corredora: 25,            // Z
            descripcion: 26           // AA
        };

        return data.slice(1).map((row, index) => {
            // Verificar si coincide con la acción que estamos buscando (busco/ofrezco)
            const rowAccion = normalize(row[col.accion] || '');
            if (rowAccion !== normalizedCriteria.accion) {
                console.log(`DEBUG: Descartando fila ${index + 2} por acción: '${rowAccion}' !== '${normalizedCriteria.accion}'`);
                return null;
            }
            
            // Verificar tipo de propiedad
            if (normalizedCriteria.tipoPropiedad) {
                const rowTipoPropiedad = normalize(row[col.tipoPropiedad] || '');
                if (rowTipoPropiedad !== normalizedCriteria.tipoPropiedad) {
                    console.log(`DEBUG: Descartando fila ${index + 2} por tipo de propiedad: '${rowTipoPropiedad}' !== '${normalizedCriteria.tipoPropiedad}'`);
                    return null;
                }
            }
            
            // Verificar tipo de operación (debe ser exactamente igual, no parcial)
            if (normalizedCriteria.tipoOperacion) {
                const rowTipoOperacion = normalize(row[col.tipoOperacion] || '');
                // Comparación exacta, no parcial
                if (rowTipoOperacion !== normalizedCriteria.tipoOperacion) {
                    console.log(`DEBUG: Descartando fila ${index + 2} por tipo de operación: '${rowTipoOperacion}' !== '${normalizedCriteria.tipoOperacion}'`);
                    return null;
                }
            }
            
            // Verificar comuna
            if (normalizedCriteria.comunas.length > 0) {
                const rowComuna = normalize(row[col.comuna] || '');
                const comunaMatch = normalizedCriteria.comunas.some(criteriaComuna => 
                    rowComuna.includes(criteriaComuna)
                );
                if (!comunaMatch) {
                    console.log(`DEBUG: Descartando fila ${index + 2} por comuna: '${rowComuna}' no coincide con ninguna de ${JSON.stringify(normalizedCriteria.comunas)}`);
                    return null;
                }
            }

            return {
                source: sheetName,
                tipoOperacion: row[col.tipoOperacion],
                tipoPropiedad: row[col.tipoPropiedad],
                region: row[col.region],
                comuna: row[col.comuna] || criteria.comuna,
                direccion: row[col.direccion],
                superficie: row[col.superficie],
                dormitorios: row[col.dormitorios],
                banos: row[col.banos],
                valor: `${row[col.valor] || ''} ${row[col.moneda] || ''}`.trim(),
                nombreContacto: row[col.nombreContacto],
                telefono: row[col.telefono],
                telefonoCorredor: row[col.telefonoCorredor],
                email: row[col.email],
                corredora: row[col.corredora],
                descripcion: row[col.descripcion],
                row_index: index + 2
            };
        }).filter(Boolean);
    },

    async searchInCommuneSheets(spreadsheetId, sheetNames, criteria, normalize) {
        // Determinar qué acción buscar (busco/ofrezco)
        let accionBuscar = criteria.accion; // Prioriza lo que venga directamente de Gemini si lo hay
        if (!accionBuscar) { // Si Gemini no lo proporcionó
            if (criteria.tipoOperacion === 'busco') {
                accionBuscar = 'busco';
            } else if (criteria.tipoOperacion === 'arriendo' || criteria.tipoOperacion === 'venta') {
                accionBuscar = 'ofrezco';
            } else {
                accionBuscar = null; // O un valor por defecto si aplica
            }
        }
        console.log(`DEBUG: accionBuscar determinado para comuna: "${accionBuscar}"`);
        
        const normalizedCriteria = {
            tipoPropiedad: normalize(criteria.tipoPropiedad),
            comunas: criteria.comuna ? criteria.comuna.split(',').map(c => normalize(c.trim())) : [],
            tipoOperacion: normalize(criteria.tipoOperacion),
            accion: normalize(accionBuscar)
        };

        const excludedSheets = ['konecte', 'alertasofertas', 'dashboardusers', 'sheetconfig', 'ignoredusers', 'alertasbusquedas'];
        
        let allResults = [];
        
        for (const comunaNormalizada of normalizedCriteria.comunas) {
            const targetSheet = sheetNames.find(name => 
                !excludedSheets.includes(normalize(name)) && 
                normalize(name).includes(comunaNormalizada)
            );
            
            if (targetSheet) {
                const data = await this.readData(spreadsheetId, `${targetSheet}!A:Q`);
                if (data && data.length > 1) {
                    const col = { 
                        tipoOperacion: 0,     // A
                        tipoPropiedad: 1,     // B
                        region: 2,            // C
                        ciudad: 3,            // D 
                        comuna: 5,            // F
                        direccion: 6,         // G
                        dormitorios: 7,       // H
                        banos: 8,             // I
                        valor: 10,            // K
                        moneda: 11,           // L
                        nombreContacto: 13,   // N
                        telefono: 14,         // O
                        email: 15,            // P
                        link: 16              // Q
                    };
                    
                    const results = data.slice(1).map((row, index) => {
                        // Verificar tipo de propiedad
                        if (normalizedCriteria.tipoPropiedad) {
                            const rowTipoPropiedad = normalize(row[col.tipoPropiedad] || '');
                            if (rowTipoPropiedad !== normalizedCriteria.tipoPropiedad) {
                                console.log(`DEBUG: Descartando fila ${index + 2} en ${targetSheet} por tipo de propiedad: '${rowTipoPropiedad}' !== '${normalizedCriteria.tipoPropiedad}'`);
                                return null;
                            }
                        }
                        
                        // Verificar tipo de operación (debe ser exactamente igual, no parcial)
                        if (normalizedCriteria.tipoOperacion) {
                            const rowTipoOperacion = normalize(row[col.tipoOperacion] || '');
                            // Comparación exacta, no parcial
                            if (rowTipoOperacion !== normalizedCriteria.tipoOperacion) {
                                console.log(`DEBUG: Descartando fila ${index + 2} en ${targetSheet} por tipo de operación: '${rowTipoOperacion}' !== '${normalizedCriteria.tipoOperacion}'`);
                                return null;
                            }
                        }
                        
                        // Verificar comuna
                        const rowComuna = normalize(row[col.comuna] || '');
                        if (!rowComuna.includes(comunaNormalizada)) {
                            console.log(`DEBUG: Descartando fila ${index + 2} en ${targetSheet} por comuna: '${rowComuna}' no incluye '${comunaNormalizada}'`);
                            return null;
                        }
                        
                        return {
                            source: targetSheet,
                            tipoOperacion: row[col.tipoOperacion],
                            tipoPropiedad: row[col.tipoPropiedad],
                            region: row[col.region],
                            comuna: row[col.comuna],
                            direccion: row[col.direccion],
                            dormitorios: row[col.dormitorios],
                            banos: row[col.banos],
                            valor: `${row[col.valor] || ''} ${row[col.moneda] || ''}`.trim(),
                            nombreContacto: row[col.nombreContacto],
                            telefono: row[col.telefono],
                            email: row[col.email],
                            link: row[col.link] || `Fila ${index + 2} en '${targetSheet}'`
                        };
                    }).filter(Boolean);
                    
                    allResults = allResults.concat(results);
                }
            }
        }
        
        return allResults;
    },

    _formatResults(results, criteria) {
        let response = `🎉 *¡Buenas noticias!* 🎉\n\nEncontré ${results.length} propiedad(es) que coinciden con tu búsqueda:\n\n`;
        response += results.map((prop, index) => {
            let result = `*Resultado ${index + 1} (encontrado en: ${prop.source})* 🏠\n`;
            result += `  - *Operación:* ${prop.tipoOperacion || 'No especificada'} 📝\n`;
            result += `  - *Propiedad:* ${prop.tipoPropiedad || 'No especificada'} 🏢\n`;
            result += `  - *Comuna:* ${prop.comuna || 'No especificada'} 📍\n`;
            result += `  - *Valor:* ${prop.valor || 'No especificado'} 💰\n`;
            
            if (prop.direccion) result += `  - *Dirección:* ${prop.direccion} 🏢\n`;
            if (prop.superficie) result += `  - *Superficie:* ${prop.superficie} 📐\n`;
            
            let telefono = prop.telefono || '';
            let telefonoCorredor = prop.telefonoCorredor || '';
            
            if (telefono && typeof telefono === 'string' && !telefono.startsWith('+') && 
                /^(\d{1,3})?\s*\d{6,}$/.test(telefono.trim())) {
                telefono = '+' + telefono.trim();
            }
            
            if (telefonoCorredor && typeof telefonoCorredor === 'string' && !telefonoCorredor.startsWith('+') && 
                /^(\d{1,3})?\s*\d{6,}$/.test(telefonoCorredor.trim())) {
                telefonoCorredor = '+' + telefonoCorredor.trim();
            }
            
            result += `\n  *Datos de contacto del corredor:* 👨‍💼👩‍💼\n`;
            if (prop.nombreContacto) result += `  - *Nombre:* ${prop.nombreContacto} 👤\n`;
            if (telefono) result += `  - *Teléfono:* ${telefono} 📱\n`;
            if (telefonoCorredor && telefonoCorredor !== telefono) 
                result += `  - *Tel. corredor:* ${telefonoCorredor} 📱\n`;
            if (prop.email) result += `  - *Email:* ${prop.email} 📧\n`;
            if (prop.whatsapp) result += `  - *WhatsApp:* ${prop.whatsapp} 💬\n`;
            if (prop.corredora) result += `  - *Corredora:* ${prop.corredora} 🏢\n`;
            if (prop.link) result += `  - *Más info:* ${prop.link} 🔗\n`;
            
            return result;
        }).join('\n');
        return response;
    },

    async findProperties(criteria) {
        const normalize = (text) => (typeof text === 'string' ? text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() : '');

        const mainSheetConfig = await this.getMainSheetConfig();
        if (!mainSheetConfig) {
            return "No se pudo obtener la configuración de Google Sheets.";
        }
        const { spreadsheetId } = mainSheetConfig;

        // Gemini puede devolver "Ofrezco" u "ofrezco". Normalizamos para ser consistentes.
        const normalizedAction = normalize(criteria.tipoOperacion);
        const userAction = normalizedAction.startsWith('busc') ? 'busco' : 'ofrezco';
        
        console.log(`INFO: Acción del usuario: ${userAction}. Criterios: ${JSON.stringify(criteria)}`);

        // --- 1. Guardar SIEMPRE la interacción del usuario en la hoja 'konecte' ---
        try {
            const now = new Date();
            const senderName = criteria.senderName || 'Desconocido';
            const from = criteria.from || 'N/A';
            const comunas = (criteria.comuna || (criteria.ubicacion ? criteria.ubicacion.split(',')[0] : '')).split(',').map(c => c.trim());

            const newRow = [
                userAction, // Col A: Busco / Ofrezco
                criteria.tipoOperacion || null, // Col B: Tipo de Operacion
                criteria.tipoPropiedad || null, // Col C: Propiedad
                criteria.region || (criteria.ubicacion ? criteria.ubicacion.split(',')[1] : null), // Col D: Region
                criteria.ciudad || (criteria.ubicacion ? criteria.ubicacion.split(',')[0] : null), // Col E: Ciudad
                comunas[0] || null, // Col F: Opcion Comuna
                comunas[1] || null, // Col G: Opcion Comuna 2
                comunas[2] || null, // Col H: Opcion Comuna 3
                comunas[3] || null, // Col I: Opcion Comuna 4
                criteria.dormitorios || null, // Col J: Dormitorios
                criteria.banos || null, // Col K: Baños
                criteria.estacionamiento || null, // Col L: Estacionamiento
                criteria.bodega || null, // Col M: Bodegas
                criteria.precioMax || criteria.precioMin || null, // Col N: Valor
                criteria.moneda || null, // Col O: Moneda
                null, // Col P: Gastos Comunes
                criteria.metrosCuadradosMin || null, // Col Q: Metros Cuadrados
                null, null, null, // R, S, T: Teléfono, Correo, Teléfono Corredor
                senderName, // Col U: Nombre Whatsapp
                now.toLocaleDateString('es-CL'), // Col V: Fecha Publicacion
                now.toLocaleTimeString('es-CL'), // Col W: Hora Publicacion
                from, // Col X: UID
                'activa', // Col Y: Status
                null, // Col Z: Null
                null, // Col AA: Fecha del Último Seguimiento
            ];

            await this.saveToSheet(spreadsheetId, 'konecte', [newRow]);
            console.log(`INFO: La interacción '${userAction}' del usuario ha sido registrada en 'konecte'.`);
        } catch (error) {
            console.error('ERROR CRÍTICO: No se pudo guardar la interacción del usuario en Google Sheets.', error);
            if (error.message && error.message.includes('permission')) {
                return '❌ *Error de Permisos*: No pude guardar la información en Google Sheets. Por favor, revisa que el bot tenga permisos de "Editor" en la hoja de cálculo.';
            }
            return '❌ Ocurrió un error al intentar guardar tu solicitud en nuestra base de datos.';
        }

        // --- 2. Si el usuario ofrece, confirmamos y terminamos ---
        if (userAction === 'ofrezco') {
            return `✅ ¡Gracias! Tu oferta para "${criteria.tipoPropiedad} en ${criteria.ubicacion || 'la ubicación especificada'}" ha sido registrada exitosamente.`;
        }

        // --- 3. Si el usuario busca, procedemos a buscar ofertas coincidentes ---
        console.log(`INFO: Buscando en 'konecte' y otras hojas por ofertas que coincidan...`);
        
        const allSheetNames = await this.getAllSheetNames(spreadsheetId);
        
        let allResults = [];
        
        // Buscar primero en la hoja principal 'konecte'
        const konecteResults = await this.searchInKonecte(spreadsheetId, criteria, normalize);
        if (konecteResults.length > 0) {
            allResults.push(...konecteResults);
        }
        
        // Buscar en las hojas de comunas
        const communeSheetResults = await this.searchInCommuneSheets(spreadsheetId, allSheetNames, criteria, normalize);
        if (communeSheetResults.length > 0) {
            allResults.push(...communeSheetResults);
        }
        
        if (allResults.length === 0) {
            console.log(`INFO: No se encontraron coincidencias para la acción '${userAction}' en ninguna hoja.`);
        }
        
        return this._formatResults(allResults, criteria);
    },

    async saveToSheet(spreadsheetId, sheetName, rows) {
        try {
            await this.ensureSheetExists(spreadsheetId, sheetName);
            await this.appendData(spreadsheetId, sheetName, rows);
            console.log(`LOG_SUCCESS: Datos guardados exitosamente en la hoja ${sheetName}.`);
            return true;
        } catch (error) {
            console.error(`LOG_ERROR: Fallo al guardar la entrada en ${sheetName}:`, error.message);
            return false;
        }
    },
    
    async saveOfferAlert(spreadsheetId, offerData) {
        const sheetName = 'alertas_ofertas';
        try {
            await this.ensureSheetExists(spreadsheetId, sheetName);
            
            const now = new Date();
            const formattedDate = now.toLocaleDateString('es-CL');
            const formattedTime = now.toLocaleTimeString('es-CL');
            
            let otrosCriterios = offerData.OtrosCriterios || '';
            let datosContacto = {};
            
            if (typeof otrosCriterios === 'string' && otrosCriterios.includes('+')) {
                otrosCriterios = otrosCriterios.replace(/\+(\d{1,3}\s*)?(\d{6,})/g, '$1$2');
            } else if (typeof otrosCriterios === 'object' || typeof otrosCriterios === 'string') {
                try {
                    let criteriosObj = otrosCriterios;
                    if (typeof otrosCriterios === 'string') {
                        criteriosObj = JSON.parse(otrosCriterios);
                    }
                    
                    if (criteriosObj.telefono) {
                        datosContacto.telefonoOriginal = criteriosObj.telefono;
                    }
                    
                    if (criteriosObj.whatsapp) {
                        datosContacto.whatsapp = criteriosObj.whatsapp;
                    }
                    
                    if (criteriosObj.email) {
                        datosContacto.email = criteriosObj.email;
                    }
                    
                    if (criteriosObj.nombreContacto) {
                        datosContacto.nombreContacto = criteriosObj.nombreContacto;
                    }
                    
                    if (criteriosObj.corredora) {
                        datosContacto.corredora = criteriosObj.corredora;
                    }
                    
                    if (criteriosObj.telefono && typeof criteriosObj.telefono === 'string') {
                        criteriosObj.telefono = criteriosObj.telefono.replace(/^\+/, '');
                        datosContacto.telefono = criteriosObj.telefono;
                    }
                    
                    if (criteriosObj.whatsapp && typeof criteriosObj.whatsapp === 'string') {
                        criteriosObj.whatsapp = criteriosObj.whatsapp.replace(/^\+/, '');
                    }
                    
                    offerData.OtrosCriterios = typeof otrosCriterios === 'string' ? 
                        JSON.stringify(criteriosObj) : criteriosObj;
                } catch (err) {
                    console.log("Error al procesar OtrosCriterios como JSON:", err);
                }
            }
            
            const newRow = [
                offerData.SenderID || '',
                offerData.TipoPropiedadOfertada || '',
                offerData.RegionOfertada || '',
                offerData.ComunaOfertada || '',
                offerData.DormitoriosOfertada || '',
                offerData.BanosOfertada || '',
                typeof offerData.OtrosCriterios === 'object' ? 
                    JSON.stringify(offerData.OtrosCriterios) : offerData.OtrosCriterios,
                formattedDate,
                formattedTime,
                'activa'
            ];
            
            await this.appendData(spreadsheetId, sheetName, [newRow]);
            console.log(`LOG_SUCCESS: Alerta de oferta guardada exitosamente en la hoja ${sheetName}.`);
            
            const senderData = await this.getSenderDataFromKonecte(spreadsheetId, offerData.SenderID);
            
            let otrosCriteriosObj = {};
            try {
                if (typeof offerData.OtrosCriterios === 'string') {
                    otrosCriteriosObj = JSON.parse(offerData.OtrosCriterios || '{}');
                } else if (typeof offerData.OtrosCriterios === 'object') {
                    otrosCriteriosObj = offerData.OtrosCriterios;
                }
            } catch (e) {
                console.error('Error al parsear OtrosCriterios:', e);
            }
            
            let senderPhoneNumber = '';
            if (offerData.SenderID && offerData.SenderID.includes('@c.us')) {
                senderPhoneNumber = offerData.SenderID.replace(/@c\.us$/, '');
            }
            
            const combinedData = {
                tipoPropiedad: offerData.TipoPropiedadOfertada,
                region: offerData.RegionOfertada,
                comuna: offerData.ComunaOfertada,
                numDormitorios: offerData.DormitoriosOfertada,
                numBanos: offerData.BanosOfertada,
                valor: otrosCriteriosObj.valor,
                moneda: otrosCriteriosObj.moneda,
                telefono: datosContacto.telefono || senderData.telefono || senderPhoneNumber,
                telefonoOriginal: datosContacto.telefonoOriginal || senderData.telefonoOriginal || (senderPhoneNumber ? '+' + senderPhoneNumber : ''),
                telefonoCorredor: senderData.telefonoCorredor || otrosCriteriosObj.telefonoCorredor,
                telefonoCorredorOriginal: senderData.telefonoCorredorOriginal || otrosCriteriosObj.telefonoCorredorOriginal,
                email: datosContacto.email || senderData.email || otrosCriteriosObj.email,
                nombreContacto: datosContacto.nombreContacto || senderData.nombreContacto || otrosCriteriosObj.nombreContacto,
                whatsapp: datosContacto.whatsapp || senderData.whatsapp || otrosCriteriosObj.whatsapp || senderPhoneNumber,
                corredora: datosContacto.corredora || senderData.corredora || otrosCriteriosObj.corredora,
                link: otrosCriteriosObj.link || ''
            };
            
            console.log('Datos completos del corredor que se enviarán:', {
                telefono: combinedData.telefono,
                telefonoOriginal: combinedData.telefonoOriginal,
                telefonoCorredor: combinedData.telefonoCorredor,
                telefonoCorredorOriginal: combinedData.telefonoCorredorOriginal,
                nombreContacto: combinedData.nombreContacto,
                email: combinedData.email,
                whatsapp: combinedData.whatsapp,
                corredora: combinedData.corredora
            });
            
            const { findMatchingAlertsAndNotify } = require('./alertService');
            await findMatchingAlertsAndNotify(combinedData);
            
            return true;
        } catch (error) {
            console.error(`LOG_ERROR: Fallo al guardar la alerta de oferta en ${sheetName}:`, error.message);
            return false;
        }
    },

    async getSenderDataFromKonecte(spreadsheetId, senderId) {
        try {
            const data = await this.readData(spreadsheetId, 'konecte!A:AA');
            if (!data || data.length <= 1) return {};
            
            const senderIdIdx = 23;
            const nombreContactoIdx = 20;
            const telefonoIdx = 17;
            const telefonoPersonaIdx = 17;
            const emailIdx = 18;
            const corredoraIdx = 25;
            
            const senderEntries = data.slice(1).filter(row => 
                row.length > senderIdIdx && row[senderIdIdx] === senderId
            );
            
            if (senderEntries.length === 0) return {};
            
            const latestEntry = senderEntries[senderEntries.length - 1];
            
            const result = {
                nombreContacto: latestEntry.length > nombreContactoIdx ? latestEntry[nombreContactoIdx] : '',
                telefono: latestEntry.length > telefonoIdx ? latestEntry[telefonoIdx] : '',
                telefonoCorredor: latestEntry.length > telefonoIdx ? latestEntry[telefonoIdx] : '',
                email: latestEntry.length > emailIdx ? latestEntry[emailIdx] : '',
                corredora: latestEntry.length > corredoraIdx ? latestEntry[corredoraIdx] : ''
            };
            
            if (!result.telefono && senderId) {
                const phoneFromId = senderId.replace(/@c\.us$/, '');
                if (phoneFromId.match(/^\d+$/)) {
                    result.telefono = phoneFromId;
                }
            }
            
            if (result.telefono && !result.telefono.startsWith('+') && /^\d{6,}$/.test(result.telefono)) {
                result.telefonoOriginal = '+' + result.telefono;
            } else {
                result.telefonoOriginal = result.telefono;
            }
            
            if (result.telefonoCorredor && !result.telefonoCorredor.startsWith('+') && /^\d{6,}$/.test(result.telefonoCorredor)) {
                result.telefonoCorredorOriginal = '+' + result.telefonoCorredor;
            } else {
                result.telefonoCorredorOriginal = result.telefonoCorredor;
            }
            
            return result;
        } catch (error) {
            console.error('Error al obtener datos del remitente:', error);
            return {};
        }
    },

    async readAlerts(spreadsheetId) {
        const sheetName = 'AlertasBusquedas';
        try {
            await this.ensureSheetExists(spreadsheetId, sheetName);
            
            const data = await this.readData(spreadsheetId, `${sheetName}!A:K`);
            return data || [];
        } catch (error) {
            console.error(`LOG_ERROR: Fallo al leer alertas de búsqueda de ${sheetName}:`, error.message);
            return [];
        }
    },

    async saveBusquedaAlert(spreadsheetId, searchData) {
        const sheetName = 'AlertasBusquedas';
        try {
            await this.ensureSheetExists(spreadsheetId, sheetName);
            const now = new Date();
            const alertId = `ALERTA-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const senderId = searchData.from || 'Desconocido';
            
            const otherCriteria = {
                precioMax: searchData.precioMax,
                moneda: searchData.moneda,
                estacionamiento: searchData.estacionamiento,
                bodega: searchData.bodega,
                metrosCuadradosMin: searchData.metrosCuadradosMin
            };

            const newRow = [
                alertId, // Col A: IDAlerta
                senderId, // Col B: SenderID
                now.toISOString(), // Col C: TimestampCreacion
                searchData.tipoPropiedad || null, // Col D: TipoPropiedadBuscada
                searchData.region || null, // Col E: RegionBuscada
                searchData.comuna || searchData.ubicacion || null, // Col F: ComunaBuscada
                searchData.dormitorios || null, // Col G: DormitoriosBuscados
                searchData.banos || null, // Col H: BanosBuscados
                JSON.stringify(otherCriteria), // Col I: OtrosCriterios
                'activa', // Col J: EstadoAlerta
                null, // Col K: UltimaNotificacionEnviada
            ];

            await this.appendData(spreadsheetId, sheetName, [newRow]);
            console.log(`LOG_SUCCESS: Alerta de búsqueda guardada exitosamente en ${sheetName} para ${senderId}.`);
            return true;
        } catch (error) {
            console.error(`LOG_ERROR: Fallo al guardar la alerta de búsqueda en ${sheetName}:`, error.message);
            return false;
        }
    },

    async getUserDataFromAlerts(spreadsheetId, alertId) {
        const sheetName = 'AlertasBusquedas';
        try {
            const alertsData = await this.readAlerts(spreadsheetId);
            if (!alertsData || alertsData.length <= 1) return {};
            
            const senderIdIdx = 1;
            
            const alertEntry = alertsData.slice(1).find(row => 
                row.length > 0 && row[0] === alertId
            );
            
            if (!alertEntry) return {};
            
            const result = {
                senderId: alertEntry.length > senderIdIdx ? alertEntry[senderIdIdx] : ''
            };
            
            if (result.senderId) {
                const phoneNumber = result.senderId.replace(/@c\.us$/, '');
                if (phoneNumber.match(/^\d+$/)) {
                    result.telefono = phoneNumber;
                    result.telefonoOriginal = '+' + phoneNumber;
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error al obtener datos del usuario desde alertas:', error);
            return {};
        }
    },

    /**
     * Actualiza el estado de una alerta en la hoja AlertasBusquedas
     * @param {string} spreadsheetId - ID de la hoja de cálculo
     * @param {string} alertId - ID de la alerta
     * @param {string} newStatus - Nuevo estado de la alerta ('activa', 'eliminada', etc.)
     * @returns {boolean} - true si se actualizó correctamente, false en caso contrario
     */
    async updateAlertStatus(spreadsheetId, alertId, newStatus) {
        const sheetName = 'AlertasBusquedas';
        try {
            console.log(`INFO: Actualizando estado de alerta ${alertId} a "${newStatus}"`);
            
            // Leer todas las alertas
            const alertsData = await this.readAlerts(spreadsheetId);
            if (!alertsData || alertsData.length <= 1) {
                console.error(`ERROR: No se encontraron datos de alertas en la hoja ${sheetName}`);
                return false;
            }
            
            // Encontrar el índice de la alerta por su ID (columna A)
            const idAlertaIdx = 0;
            const estadoAlertaIdx = 9;
            
            // Buscar la fila que contiene la alerta con el ID especificado
            let rowIndex = -1;
            for (let i = 1; i < alertsData.length; i++) {
                const row = alertsData[i];
                if (row.length > idAlertaIdx && row[idAlertaIdx] === alertId) {
                    rowIndex = i + 1; // +1 porque las filas en la API de Google Sheets empiezan en 1, y la primera fila son las cabeceras
                    break;
                }
            }
            
            if (rowIndex === -1) {
                console.error(`ERROR: No se encontró la alerta con ID ${alertId}`);
                return false;
            }
            
            console.log(`INFO: Alerta encontrada en la fila ${rowIndex}`);
            
            // Actualizar el estado de la alerta
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!J${rowIndex}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [[newStatus]]
                }
            });
            
            console.log(`LOG_SUCCESS: Estado de alerta ${alertId} actualizado a "${newStatus}" exitosamente.`);
            return true;
        } catch (error) {
            console.error(`LOG_ERROR: Error al actualizar el estado de la alerta ${alertId}:`, error.message);
            return false;
        }
    }
};

module.exports = googleSheetsService; 