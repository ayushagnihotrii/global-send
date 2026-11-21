const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Disable hardware acceleration issues on specific VMs/GPUs if needed
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#121215',
    frame: false, // Frameless for exact custom dark Apple Notes / Neo-Editorial titlebar
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#121215',
      symbolColor: '#CDFF5D',
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const startUrl = isDev
    ? (process.env.ELECTRON_START_URL || 'http://localhost:3000')
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon?.({
          title: 'Global Send Vault',
          content: 'Running in the background. Uploads will continue.',
        });
      }
    }
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

function createTray() {
  // Simple fallback SVG icon representation if asset not generated yet
  const iconPath = path.join(__dirname, '../public/favicon.ico');
  const trayIcon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(trayIcon);
  tray.setToolTip('Global Send — Client-Sealed Vault');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Global Send Vault',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Window control IPC handlers
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

// Native file picker
ipcMain.handle('dialog-pick-files', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Select Files to Upload to Global Send Vault',
  });
  if (result.canceled) return [];
  return result.filePaths;
});

/**
 * Direct PC-to-Telegram Bot API High-Speed Upload
 * Bypasses Vercel serverless function body limits entirely!
 * Reads file directly from local disk and uploads over HTTPS.
 */
ipcMain.handle('telegram-direct-upload', async (event, { filePath, botToken, channelId, title }) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);

    // Convert file stream to FormData for direct upload
    const formData = new FormData();
    formData.append('chat_id', channelId);
    
    // Read file as Uint8Array
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    formData.append('document', blob, filename);
    formData.append('caption', `[Global Send Desktop Vault] ${title || filename}`);

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(`Telegram upload failed (${res.status}): ${errJson.description || res.statusText}`);
    }

    const result = await res.json();
    return {
      success: true,
      messageId: result.result?.message_id,
      fileId: result.result?.document?.file_id,
      fileSize: stats.size,
      filename,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
