import SheetDataViewerView from './views/SheetDataViewerView.vue';
import { Files as FilesIcon } from '@element-plus/icons-vue';

export default {
  id: 'sheetViewer',
  navigation: {
    name: 'SheetDataViewer',
    label: 'Ver Hoja Activa',
    icon: FilesIcon,
    requiresAuth: true,
    adminOnly: false,
    order: 40 // Después de Usuarios Dashboard
  },
  router: {
    path: '/sheet-viewer',
    name: 'SheetDataViewer',
    component: SheetDataViewerView
  }
}; 