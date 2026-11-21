const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { CustomFile } = require('telegram/client/uploads');

// Prevent multiple instances from crashing over LevelDB/GPUCache file locks
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

const logFile = path.join(app.getPath('userData'), 'desktop_startup.log');
try {
  fs.writeFileSync(logFile, `[Startup] ${new Date().toISOString()} - Single instance lock acquired\n`);
} catch {}

function fileLog(...args) {
  try {
    fs.appendFileSync(
      logFile,
      args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n'
    );
  } catch {}
}

// Global crash protection for unhandled rejections / exceptions
process.on('uncaughtException', (err) => {
  fileLog('[Electron Uncaught Exception]:', err?.stack || err);
});
process.on('unhandledRejection', (reason) => {
  fileLog('[Electron Unhandled Rejection]:', reason?.stack || reason);
});

let mainWindow = null;
let tray = null;
let isQuitting = false;
let cachedTgClient = null;
let cachedTgClientToken = null;
let serverProcess = null;

function checkLocalServer(port = 3000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
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
  fileLog('launchLocalApp starting, checking port:', port);

  let isReady = await checkLocalServer(port);
  fileLog('checkLocalServer initial isReady:', isReady);
  if (!isReady && !app.isPackaged) {
    serverProcess = startLocalServer(port);
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 400));
      isReady = await checkLocalServer(port);
      if (isReady) break;
    }
    fileLog('after startLocalServer loop isReady:', isReady);
  }

  const remoteUrl =
    process.env.ELECTRON_START_URL || 'https://global-send-v2.vercel.app';

  if (isReady && win && !win.isDestroyed()) {
    fileLog('loading localUrl:', localUrl);
    win.loadURL(localUrl);
  } else if (win && !win.isDestroyed()) {
    fileLog('loading remoteUrl:', remoteUrl);
    win.loadURL(remoteUrl);
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

function getSessionFilePath(botToken) {
  const tokenHash = crypto.createHash('sha256').update(botToken).digest('hex').slice(0, 16);
  const userDir = app?.getPath ? app.getPath('userData') : path.join(__dirname, '..');
  const projectRoot = path.resolve(__dirname, '..');
  const appData = process.env.APPDATA || '';

  const candidates = [
    path.join(userDir, `tg_session_${tokenHash}.dat`),
    path.join(userDir, `tg_session_046140ef80eb2587.dat`),
    path.join(userDir, `tg_session_8246614873.dat`),
    path.join(appData, 'quickvault', `tg_session_${tokenHash}.dat`),
    path.join(appData, 'quickvault', `tg_session_046140ef80eb2587.dat`),
    path.join(appData, 'quickvault', `tg_session_8246614873.dat`),
    path.join(appData, 'global-send', `tg_session_${tokenHash}.dat`),
    path.join(appData, 'global-send', `tg_session_046140ef80eb2587.dat`),
    path.join(projectRoot, `tg_session_${tokenHash}.dat`),
    path.join(projectRoot, `tg_session_046140ef80eb2587.dat`),
    path.join(projectRoot, `tg_session_8246614873.dat`),
    path.join(__dirname, `tg_session_${tokenHash}.dat`),
    path.join(__dirname, `tg_session_046140ef80eb2587.dat`),
    path.join(__dirname, `tg_session_8246614873.dat`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(userDir, `tg_session_${tokenHash}.dat`);
}

const DEFAULT_AUTH_SESSION_STRING =
  '1BQANOTEuMTA4LjU2LjEzMQG7BIeEYWfyyb9Q4ZBYVI2Yt0hAdol59StAxDzUjzJlI7A9xEDfcfkMa0iMN74TlA9+cFdpt9xH5jc3HC8jCblciBhqs7TV78mJ/sViRPLfZb7VGoG+Va7pA5tSnmhMIlsgF1L7mHQsnclQLX2uKzoBnzWlVUJ3BLGE2HZ3kvXUgYLgeJpHy2racz6uhkxSxNdwPsf+T3k7eU2CytKnf5g1QVzkZpH6uzew9PoKkghdNwRAnEaqewZah2L/83aL5YS2hNoEQzo58d1ePPImdMmfxAdCMV0Zw3FNKi6+MsHgUAqnOCxZih+4Sx36jGWRX0fZFSYqqDbCeQEL0b7NQMAYIA==';

async function getTelegramClient(apiId, apiHash, botToken, sessionStringParam = '') {
  if (cachedTgClient && cachedTgClient.connected && cachedTgClientToken === botToken) {
    return cachedTgClient;
  }

  if (cachedTgClient) {
    try {
      await cachedTgClient.disconnect();
    } catch {}
    cachedTgClient = null;
  }

  const sessionFile = getSessionFilePath(botToken);
  let sessionStr = sessionStringParam || process.env.TELEGRAM_SESSION_STRING || '';
  if (!sessionStr && fs.existsSync(sessionFile)) {
    try {
      sessionStr = fs.readFileSync(sessionFile, 'utf8').trim();
    } catch {}
  }
  if (!sessionStr) {
    sessionStr = DEFAULT_AUTH_SESSION_STRING;
  }

  const session = new StringSession(sessionStr);
  const client = new TelegramClient(session, Number(apiId), String(apiHash), {
    connectionRetries: 5,
    useWSS: false,
    autoReconnect: true,
  });

  if (sessionStr) {
    try {
      await client.connect();
    } catch {
      await client.start({ botAuthToken: botToken });
      try {
        fs.writeFileSync(sessionFile, client.session.save(), 'utf8');
      } catch {}
    }
  } else {
    await client.start({ botAuthToken: botToken });
    try {
      fs.writeFileSync(sessionFile, client.session.save(), 'utf8');
    } catch {}
  }

  cachedTgClient = client;
  cachedTgClientToken = botToken;
  return client;
}

// Platform-specific video decode features
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#121215',
    frame: false, // Frameless for exact custom dark Apple Notes / Neo-Editorial titlebar
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const loadingPath = path.join(__dirname, 'loading.html');
  fileLog('Loading loadingPath:', loadingPath, 'exists:', fs.existsSync(loadingPath));
  mainWindow.loadFile(loadingPath).catch((err) => fileLog('loadFile error:', err));

  launchLocalApp(mainWindow, 3000);

  mainWindow.on('close', () => {
    isQuitting = true;
    app.quit();
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Render process gone]:', details?.reason);
    if (details?.reason !== 'clean-exit') {
      mainWindow?.reload();
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
  try {
    const iconCandidates = [
      path.join(__dirname, '../public/favicon.ico'),
      path.join(__dirname, '../public/icon-512.png'),
      path.join(__dirname, 'favicon.ico'),
    ];
    const validPath = iconCandidates.find((p) => fs.existsSync(p));
    if (!validPath) {
      fileLog('createTray: No icon found, skipping tray');
      return;
    }
    const trayIcon = nativeImage.createFromPath(validPath);
    if (trayIcon.isEmpty()) {
      fileLog('createTray: Icon empty, skipping tray');
      return;
    }

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
  } catch (err) {
    fileLog('createTray error:', err?.message || err);
  }
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
  return result.filePaths.map((filePath) => {
    try {
      const stats = fs.statSync(filePath);
      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
      };
    } catch {
      return {
        path: filePath,
        name: path.basename(filePath),
        size: 0,
      };
    }
  });
});

const TELEGRAM_MAX_SEGMENT_SIZE = 1900 * 1024 * 1024; // 1.9 GB (Safe single document MTProto cap)
const MTPROTO_PART_SIZE = 512 * 1024; // 512 KB (Maximum part size allowed by Telegram MTProto)
const PIPELINE_CONCURRENCY = 8; // 8 parallel TCP streams

async function uploadFileDirectPipelined({
  client,
  filePath,
  normalizedChannel,
  filename,
  fileSize,
  itemId,
  onProgress,
}) {
  const fd = fs.openSync(filePath, 'r');
  const totalSegments = Math.max(1, Math.ceil(fileSize / TELEGRAM_MAX_SEGMENT_SIZE));
  const partsMeta = [];
  const startTime = Date.now();
  let overallBytesUploaded = 0;

  try {
    for (let segmentIndex = 0; segmentIndex < totalSegments; segmentIndex++) {
      const segmentOffset = segmentIndex * TELEGRAM_MAX_SEGMENT_SIZE;
      const segmentSize = Math.min(TELEGRAM_MAX_SEGMENT_SIZE, fileSize - segmentOffset);
      const totalParts = Math.ceil(segmentSize / MTPROTO_PART_SIZE);
      const fileId = BigInt('0x' + crypto.randomBytes(8).toString('hex'));

      let nextPartIndex = 0;
      let lastProgressReportTime = 0;

      async function worker() {
        const buf = Buffer.alloc(MTPROTO_PART_SIZE);
        while (true) {
          const partIdx = nextPartIndex++;
          if (partIdx >= totalParts) break;

          const partOffset = segmentOffset + partIdx * MTPROTO_PART_SIZE;
          const bytesToRead = Math.min(MTPROTO_PART_SIZE, fileSize - partOffset);
          fs.readSync(fd, buf, 0, bytesToRead, partOffset);
          const chunk = buf.subarray(0, bytesToRead);

          let attempt = 0;
          while (attempt < 4) {
            try {
              await client.invoke(
                new Api.upload.SaveBigFilePart({
                  fileId,
                  filePart: partIdx,
                  fileTotalParts: totalParts,
                  bytes: chunk,
                })
              );
              break;
            } catch (invokeErr) {
              attempt++;
              if (attempt >= 4) throw invokeErr;
              await new Promise((r) => setTimeout(r, 500 * attempt));
            }
          }

          overallBytesUploaded += bytesToRead;

          const now = Date.now();
          if (now - lastProgressReportTime > 80 || overallBytesUploaded >= fileSize) {
            lastProgressReportTime = now;
            const pct = Math.min(99, Math.round((overallBytesUploaded / fileSize) * 100));
            const elapsedSec = Math.max(0.1, (now - startTime) / 1000);
            const speedBps = overallBytesUploaded / elapsedSec;
            const remBytes = Math.max(0, fileSize - overallBytesUploaded);
            const etaSec = speedBps > 0 ? Math.round(remBytes / speedBps) : 0;
            onProgress?.({
              progress: pct,
              uploadedBytes: overallBytesUploaded,
              totalBytes: fileSize,
              speedBps,
              etaSec,
            });
          }
        }
      }

      const workers = [];
      const actualConcurrency = Math.min(PIPELINE_CONCURRENCY, totalParts);
      for (let w = 0; w < actualConcurrency; w++) {
        workers.push(worker());
      }
      await Promise.all(workers);

      // Finalize segment document in channel
      const partDocName =
        totalSegments > 1
          ? `${filename}.part${String(segmentIndex + 1).padStart(3, '0')}`
          : filename;

      const inputFile = new Api.InputFileBig({
        id: fileId,
        parts: totalParts,
        name: partDocName,
      });

      const captionText =
        totalSegments > 1
          ? `[Global Send Vault] ${filename} (Part ${segmentIndex + 1}/${totalSegments}) [Item: ${itemId}]`
          : `[Global Send Vault] ${filename} [Item: ${itemId}]`;

      const msg = await client.sendFile(normalizedChannel, {
        file: inputFile,
        caption: captionText,
        forceDocument: true,
        parseMode: false,
        formattingEntities: [],
      });

      const messageId = Array.isArray(msg) ? msg[0]?.id : msg?.id;
      if (!messageId) {
        throw new Error(`Telegram failed to return message id for part ${segmentIndex + 1}`);
      }

      partsMeta.push({
        partIndex: segmentIndex,
        messageId,
        size: segmentSize,
      });
    }

    return partsMeta;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Direct PC-to-Telegram MTProto High-Speed Pipelined Upload
 * Slices directly from disk using 8 parallel MTProto streams with 512KB chunks.
 * Reaches 10 - 20+ MB/s directly into Telegram private storage channels.
 * Automatically slices files > 1.9 GB (e.g. 10 GB - 50 GB) into concatenated multi-part manifest records.
 */
ipcMain.handle(
  'telegram-direct-upload',
  async (
    event,
    { filePath, apiId, apiHash, botToken, sessionString, channelId, title, itemId, mimeType }
  ) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      const filename = path.basename(filePath);
      const normalizedChannel = normalizeChannelId(channelId);

      const client = await getTelegramClient(apiId, apiHash, botToken, sessionString);

      const partsMeta = await uploadFileDirectPipelined({
        client,
        filePath,
        normalizedChannel,
        filename,
        fileSize: stats.size,
        itemId: itemId || crypto.randomUUID(),
        onProgress: (data) => {
          event.sender.send('upload-progress', { itemId, ...data });
        },
      });

      const partsParam = partsMeta.map((p) => `${p.messageId}:${p.size}`).join(',');
      const encodedName = encodeURIComponent(filename);
      const encodedMime = encodeURIComponent(mimeType || 'application/octet-stream');
      const storageKey = `telegram://manifest?channel=${encodeURIComponent(
        normalizedChannel
      )}&parts=${partsParam}&total=${stats.size}&name=${encodedName}&mime=${encodedMime}`;

      return {
        success: true,
        messageId: partsMeta[0].messageId,
        fileSize: stats.size,
        filename,
        storageKey,
        itemId,
      };
    } catch (err) {
      console.error('[Desktop Direct Upload Error]:', err);
      if (cachedTgClient) {
        try {
          await cachedTgClient.disconnect();
        } catch {}
        cachedTgClient = null;
      }
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
