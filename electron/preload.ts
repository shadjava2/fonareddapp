import { contextBridge, ipcRenderer } from 'electron';

// API minimale exposée au renderer pour la sécurité
const electronAPI = {
  // Fonctionnalités système basiques
  platform: process.platform,
  versions: process.versions,

  // IPC pour communication sécurisée si nécessaire
  invoke: (channel: string, ...args: any[]) => {
    // Whitelist des canaux autorisés
    const validChannels = [
      'app-version',
      'platform-info',
    ];

    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }

    throw new Error(`Channel ${channel} is not allowed`);
  },
};

// Exposer l'API de manière sécurisée
contextBridge.exposeInMainWorld('native', electronAPI);

// Types pour TypeScript
declare global {
  interface Window {
    native: typeof electronAPI;
  }
}
