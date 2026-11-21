const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopVault', {
  isDesktop: true,
  platform: process.platform,

  // Window Controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Native Dialogs
  pickFiles: () => ipcRenderer.invoke('dialog-pick-files'),

  // Direct High-Speed Telegram Uploader (PC -> Telegram directly)
  directUpload: (params) => ipcRenderer.invoke('telegram-direct-upload', params),
});
