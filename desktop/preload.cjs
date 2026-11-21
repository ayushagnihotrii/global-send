const { contextBridge, ipcRenderer, webUtils } = require('electron');

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

  // Resolves absolute filesystem path from a File object
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch {}
    return file?.path || '';
  },

  // Direct High-Speed Telegram Uploader (PC -> Telegram MTProto directly)
  directUpload: (params) => ipcRenderer.invoke('telegram-direct-upload', params),

  // Real-time progress listener
  onUploadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('upload-progress', handler);
    return () => ipcRenderer.removeListener('upload-progress', handler);
  },
});
