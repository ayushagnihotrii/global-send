const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { CustomFile } = require('telegram/client/uploads');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let cachedTgClient = null;
let cachedTgClientToken = null;
let serverProcess = null;

function checkLocalServer(port = 3000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startLocalServer(port = 3000) {
  const projectRoot = path.resolve(__dirname, '..');
  const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

  try {
    const server = spawn('node', [nextBin, 'start', '-p', String(port)], {
      cwd: projectRoot,
      env: { ...process.env, PORT: String(port) },
      stdio: 'ignore',
      windowsHide: true,
    });
    server.on('error', (err) => {
      console.error('[Local Server Error]:', err);
    });
    return server;
  } catch (err) {
    console.error('[Failed to spawn local server]:', err);
    return null;
  }
}

async function launchLocalApp(win, port = 3000) {
  const localUrl = `http://127.0.0.1:${port}`;

  let isReady = await checkLocalServer(port);
  if (!isReady) {
    serverProcess = startLocalServer(port);
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 400));
      isReady = await checkLocalServer(port);
      if (isReady) break;
    }
  }

  if (isReady && win && !win.isDestroyed()) {
    win.loadURL(localUrl);
  }
}

function normalizeChannelId(rawChannelId) {
  const trimmed = String(rawChannelId || '').trim();
  if (trimmed.startsWith('@') || trimmed.startsWith('-100')) {
    return trimmed;
  }
  if (trimmed.startsWith('100') && /^\d+$/.test(trimmed)) {
    return `-${trimmed}`;
  }
  if (/^\d+$/.test(trimmed)) {
    return `-100${trimmed}`;
  }
  return trimmed;
}

async function getTelegramClient(apiId, apiHash, botToken) {
  if (cachedTgClient && cachedTgClient.connected && cachedTgClientToken === botToken) {
    return cachedTgClient;
  }

  if (cachedTgClient) {
    try {
      await cachedTgClient.disconnect();
    } catch {}
    cachedTgClient = null;
  }

  const client = new TelegramClient(new StringSession(''), Number(apiId), String(apiHash), {
    connectionRetries: 5,
    useWSS: false,
    autoReconnect: true,
  });

  await client.start({ botAuthToken: botToken });
  cachedTgClient = client;
  cachedTgClientToken = botToken;
  return client;
}

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

  const loadingPath = path.join(__dirname, 'loading.html');
  mainWindow.loadFile(loadingPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    launchLocalApp(mainWindow, 3000);
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
 * Direct PC-to-Telegram MTProto High-Speed Upload
 * Slices and streams directly from disk via GramJS MTProto with 8 parallel workers.
 * Bypasses Vercel serverless function body limits, memory caps, and timeouts entirely!
 * Supports files up to 2,000,000,000 bytes (2 GB) with real-time hardware upload progress.
 */
ipcMain.handle(
  'telegram-direct-upload',
  async (
    event,
    { filePath, apiId, apiHash, botToken, channelId, title, itemId, mimeType }
  ) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      const filename = path.basename(filePath);
      const normalizedChannel = normalizeChannelId(channelId);

      const client = await getTelegramClient(apiId, apiHash, botToken);
      const customFile = new CustomFile(filename, stats.size, filePath);

      let lastProgressTime = 0;
      const msg = await client.sendFile(normalizedChannel, {
        file: customFile,
        forceDocument: true,
        caption: `[Global Send Desktop Vault] ${filename} [Item: ${itemId || crypto.randomUUID()}]`,
        workers: 8,
        progressCallback: (progress) => {
          const now = Date.now();
          if (now - lastProgressTime > 50 || progress >= 1) {
            lastProgressTime = now;
            const pct = Math.min(100, Math.round(progress * 100));
            event.sender.send('upload-progress', { itemId, progress: pct });
          }
        },
      });

      const partsParam = `${msg.id}:${stats.size}`;
      const encodedName = encodeURIComponent(filename);
      const encodedMime = encodeURIComponent(mimeType || 'application/octet-stream');
      const storageKey = `telegram://manifest?channel=${encodeURIComponent(
        normalizedChannel
      )}&parts=${partsParam}&total=${stats.size}&name=${encodedName}&mime=${encodedMime}`;

      return {
        success: true,
        messageId: msg.id,
        fileSize: stats.size,
        filename,
        storageKey,
        itemId,
      };
    } catch (err) {
      console.error('[Desktop Direct Upload Error]:', err);
      return {
        success: false,
        error: err.message || 'Direct upload to Telegram failed',
      };
    }
  }
);

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  isQuitting = true;
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {}
    serverProcess = null;
  }
  if (cachedTgClient) {
    try {
      await cachedTgClient.disconnect();
    } catch {}
    cachedTgClient = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
