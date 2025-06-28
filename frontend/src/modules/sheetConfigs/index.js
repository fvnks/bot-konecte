import SheetConfigManagementView from './views/SheetConfigManagementView.vue';
import { Document as DocumentIcon } from '@element-plus/icons-vue';

export default {
  id: 'sheetConfigs',
  navigation: {
    name: 'SheetConfigManagement',
    label: 'Config. Sheets',
    icon: DocumentIcon,
    requiresAuth: true,
    adminOnly: false, // O true si esta sección debe ser solo para admins
    order: 20
  },
  router: {
    path: '/sheet-configs',
    name: 'SheetConfigManagement',
    component: SheetConfigManagementView
  }
}; 