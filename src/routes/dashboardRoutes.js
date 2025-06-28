const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const dashboardUserController = require('../controllers/dashboardUserController');
const authorizedUserController = require('../controllers/authorizedUserController');
const sheetConfigController = require('../controllers/sheetConfigController');
// const googleSheetViewController = require('../controllers/googleSheetViewController'); // Nos aseguramos que esta línea esté comentada o eliminada

// --- Rutas de Autenticación del Dashboard (sin protección de token) ---
const authRouter = express.Router();
authRouter.post('/register', dashboardUserController.register); // Crear el primer admin o por admins
authRouter.post('/login', dashboardUserController.login);
router.use('/auth', authRouter);

// --- A partir de aquí, todas las rutas requieren un token válido ---
router.use(authMiddleware.verifyToken);

// Rutas para administrar usuarios autorizados de WhatsApp (protegidas por token)
router.post('/authorized-users', authorizedUserController.addAuthorizedUser);
router.get('/authorized-users', authorizedUserController.getAllAuthorizedUsers);
router.put('/authorized-users/:id', authorizedUserController.updateAuthorizedUser);
router.delete('/authorized-users/:id', authorizedUserController.deleteAuthorizedUser);

// Rutas para administrar usuarios del Dashboard (protegidas por token)
// Solo admins pueden listar todos, crear, actualizar roles/estado, o eliminar otros usuarios.
router.get('/users', authMiddleware.isAdmin, dashboardUserController.getAllDashboardUsers);
router.get('/users/me', dashboardUserController.getCurrentDashboardUser); // Cualquier usuario autenticado puede ver su propia info
// La ruta de registro está en /auth/register. La creación de nuevos usuarios por un admin podría ser esta:
router.post('/users', authMiddleware.isAdmin, dashboardUserController.createDashboardUserByAdmin); // Cambiado a createDashboardUserByAdmin
router.put('/users/:id', dashboardUserController.updateDashboardUser); // Lógica de admin/propio usuario dentro del controlador
router.delete('/users/:id', authMiddleware.isAdmin, dashboardUserController.deleteDashboardUser);


// Rutas para administrar la configuración de Google Sheets (protegidas por token)
router.post('/sheet-configs', authMiddleware.isAdmin, sheetConfigController.addSheetConfig);
router.get('/sheet-configs', sheetConfigController.getAllSheetConfigs);
router.get('/sheet-configs/:id', sheetConfigController.getSheetConfigById);
router.put('/sheet-configs/:id', authMiddleware.isAdmin, sheetConfigController.updateSheetConfig);
router.delete('/sheet-configs/:id', authMiddleware.isAdmin, sheetConfigController.deleteSheetConfig);
router.post('/sheet-configs/:id/check-connection', sheetConfigController.checkSheetConnectionStatus);

// Nueva ruta para obtener datos de una hoja específica -> ELIMINADA
// router.get('/sheet-configs/:id/view', authMiddleware, sheetConfigController.getSheetDataById); // Esta línea se elimina completamente

// Rutas para ver contenido de Google Sheets (Nueva) -> ELIMINADA
// TEMPORALMENTE SIMPLIFICADA PARA DEPURACIÓN: -> Toda esta sección se elimina
// router.get('/sheet-content',
//     // authMiddleware.isAdmin, // Mantenemos comentado
//     (req, res) => { // Callback inline simple
//         res.status(200).json({ message: 'Ruta /sheet-content temporalmente simplificada para depuración.' });
//     }
// );

router.get('/', (req, res) => {
    res.json({ message: 'API del Dashboard funcionando (protegida)', user: req.user });
});

module.exports = router; 