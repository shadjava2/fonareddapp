import { app, BrowserWindow, Menu, shell } from 'electron';
import * as path from 'path';
import { isDev } from './utils';

// Configuration de sécurité Electron
const isDevelopment = isDev();

// Garder une référence globale de l'objet window
let mainWindow: BrowserWindow;

function createWindow(): void {
  // Créer la fenêtre du navigateur
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      // Configuration sécurisée
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icons/icon-512.png'),
    titleBarStyle: 'default',
    show: false, // Ne pas montrer jusqu'à ce que tout soit chargé
  });

  // Charger l'application
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:3001');
    // Ouvrir les DevTools en développement
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  // Montrer la fenêtre quand elle est prête
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Gérer les liens externes
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Gérer la fermeture de la fenêtre
  mainWindow.on('closed', () => {
    mainWindow = null as any;
  });
}

// Cette méthode sera appelée quand Electron aura fini de s'initialiser
app.whenReady().then(() => {
  createWindow();

  // Sur macOS, il est courant de recréer une fenêtre quand l'icône du dock est cliquée
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Menu de l'application
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Fonaredd App',
      submenu: [
        {
          label: 'À propos de Fonaredd App',
          click: () => {
            // Afficher une boîte de dialogue "À propos"
          },
        },
        { type: 'separator' },
        {
          label: 'Quitter',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'forceReload', label: 'Forcer le rechargement' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

// Quitter quand toutes les fenêtres sont fermées
app.on('window-all-closed', () => {
  // Sur macOS, il est courant pour les applications et leur barre de menu
  // de rester actives jusqu'à ce que l'utilisateur quitte explicitement avec Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Sécurité: empêcher la création de nouvelles fenêtres
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Empêcher l'ouverture de nouvelles fenêtres
    shell.openExternal(url);
    return { action: 'deny' };
  });
});
