/**
 * Tiến trình chính (Main Process) của Novata - Phiên bản Thuần Đen Trắng (Monochrome)
 * Loại bỏ hoàn toàn Glassmorphism, chuyển sang phong cách tối giản thuần đen trắng.
 * Sóng âm thanh không có nền, tràn cạnh màn hình và có thể bị các cửa sổ khác đè lên tự nhiên.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, screen, desktopCapturer, session, nativeImage } = require('electron');
const path = require('path');

// Cờ Chromium & V8 tối ưu hóa hiệu năng mượt mà, không lag hệ thống
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-client-side-phishing-detection');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-translate');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-crash-reporter');
app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('disable-spell-checking');
app.commandLine.appendSwitch('disable-hang-monitor');
app.commandLine.appendSwitch('disable-features', 'Translate,AudioServiceOutOfProcess,SpareRendererForSitePerProcess,CalculateNativeWinOcclusion');
// Cho phép tự động phát âm thanh In-App mượt mà không yêu cầu cử chỉ chuột ban đầu
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const store = require('./store');
const mediaManager = require('./mediaManager');
const { searchMusic, getAudioStreamUrl } = require('./musicSearch');

// Trạng thái trình phát nhạc In-App
let currentInAppTrack = null;
let inAppPlaybackState = { isPlaying: false, currentTime: 0, duration: 0 };

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.exit(0);
}

let overlayWindow = null;
let settingsWindow = null;
let tray = null;
let isQuitting = false;

const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');

/**
 * Tinh toan vi tri cua so visualizer va the dieu khien tren toan man hinh desktop
 */
function calculateWindowBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  return {
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height
  };
}

/**
 * Khoi tao cua so Visualizer (Trong suot 100%, song am toa tu tam, cho phep bi de len)
 */
function createOverlayWindow() {
  const bounds = calculateWindowBounds();

  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: false, // Luon de o lop hinh nen de cac cua so khac de len tu nhien
    focusable: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      devTools: false
    }
  });

  overlayWindow.loadFile(path.join(__dirname, '..', 'renderer', 'overlay', 'index.html'));

  // Mac dinh luon xuyen chuot tren vung song am
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

/**
 * Khởi tạo cửa sổ Cài đặt (Thuần Đen Trắng - Loại bỏ 100% Glass)
 */
function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    settingsWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const width = 800;
  const height = 620;

  settingsWindow = new BrowserWindow({
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    backgroundColor: '#09090b', // Nền đen tuyền mờ phẳng (OLED black), không glass
    frame: false,
    resizable: false,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'settings', 'index.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
    settingsWindow.focus();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    trimMemory();
  });
}

function applySettingsToOverlay(settings) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  const bounds = calculateWindowBounds();
  overlayWindow.setBounds(bounds);
  overlayWindow.setAlwaysOnTop(false);
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  overlayWindow.webContents.send('settings-updated', settings);
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('settings-updated', settings);
  }

  if (typeof settings.launchOnStartup === 'boolean') {
    app.setLoginItemSettings({
      openAtLogin: settings.launchOnStartup,
      path: process.execPath
    });
  }
}

let trayClickTimer = null;

function createTray() {
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip('Novata nvt_0.1 - Minimalist Audio Visualizer');

  updateTrayMenu();

  // Nhan 1 lan: Hien / An the dieu khien nhac goc man hinh (Desktop Player Widget)
  tray.on('click', () => {
    if (trayClickTimer) clearTimeout(trayClickTimer);
    trayClickTimer = setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        if (!overlayWindow.isVisible()) overlayWindow.show();
        overlayWindow.webContents.send('toggle-player-card');
      }
      trayClickTimer = null;
    }, 220);
  });

  // Double click: Mo cua so Cai dat
  tray.on('double-click', () => {
    if (trayClickTimer) {
      clearTimeout(trayClickTimer);
      trayClickTimer = null;
    }
    createSettingsWindow();
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const media = mediaManager.getCurrentMedia();
  let songLabel = 'Ready to listen';
  let isPlaying = false;

  if (currentInAppTrack) {
    songLabel = `${currentInAppTrack.title} - ${currentInAppTrack.artist}`;
    isPlaying = inAppPlaybackState.isPlaying;
  } else if (media && media.Title) {
    songLabel = `${media.Title} - ${media.Artist || 'Artist'}`;
    isPlaying = media.Status && media.Status.toLowerCase().includes('play');
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Novata nvt_0.1',
      enabled: false,
      icon: nativeImage.createFromPath(iconPath).resize({ width: 14, height: 14 })
    },
    {
      label: songLabel.length > 36 ? songLabel.substring(0, 34) + '...' : songLabel,
      enabled: false
    },
    { type: 'separator' },
    {
      label: isPlaying ? 'Pause Music' : 'Play Music',
      click: async () => {
        if (currentInAppTrack) {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('inapp-control', 'toggle');
          }
        } else {
          await mediaManager.sendAction('play_pause');
        }
      }
    },
    {
      label: 'Next Track',
      click: async () => {
        if (currentInAppTrack) {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('inapp-control', 'next');
          }
        } else {
          await mediaManager.sendAction('next');
        }
      }
    },
    {
      label: 'Previous Track',
      click: async () => {
        if (currentInAppTrack) {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('inapp-control', 'prev');
          }
        } else {
          await mediaManager.sendAction('prev');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Toggle Player Widget',
      click: () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send('toggle-player-card');
        }
      }
    },
    {
      label: 'Search & Play Music...',
      click: () => {
        createSettingsWindow();
        setTimeout(() => {
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('switch-to-search-tab');
          }
        }, 300);
      }
    },
    {
      label: 'Settings...',
      click: () => {
        createSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Exit Novata',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

mediaManager.on('media-changed', (media) => {
  updateTrayMenu();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('media-updated', media);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('media-updated', media);
  }
});

function trimMemory() {
  if (global.gc) {
    try { global.gc(); } catch (e) {}
  }
  if (session && session.defaultSession) {
    session.defaultSession.clearCache().catch(() => {});
  }
}

app.whenReady().then(() => {
  // Cho phép nhúng và stream audio mượt mà không bị chặn bởi CORS hoặc X-Frame-Options
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    responseHeaders['access-control-allow-origin'] = ['*'];
    responseHeaders['access-control-allow-headers'] = ['*'];
    responseHeaders['access-control-allow-methods'] = ['GET, HEAD, OPTIONS'];
    callback({ cancel: false, responseHeaders });
  });

  // Chi cung cap am thanh loopback he thong, tuyet doi khong bat screen video gay giat lag
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    callback({ audio: 'loopback' });
  });

  createOverlayWindow();
  createTray();
  mediaManager.startMonitoring();

  if (process.argv.includes('--settings')) {
    createSettingsWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
    }
  });
});

ipcMain.handle('get-settings', () => {
  return store.getAll();
});

ipcMain.handle('save-settings', (event, newSettings) => {
  store.save(newSettings);
  applySettingsToOverlay(store.getAll());
  return { success: true };
});

ipcMain.handle('get-media-state', () => {
  if (currentInAppTrack) {
    return {
      Active: true,
      Title: currentInAppTrack.title,
      Artist: currentInAppTrack.artist,
      Album: 'In-App Player',
      Source: 'In-App Player',
      Status: inAppPlaybackState.isPlaying ? 'Playing' : 'Paused',
      Thumbnail: currentInAppTrack.thumbnail,
      Duration: currentInAppTrack.duration
    };
  }
  return mediaManager.getCurrentMedia();
});

// IPC Tìm kiếm bài hát
ipcMain.handle('search-music', async (event, query) => {
  return await searchMusic(query);
});

// IPC Phát bài hát In-App
ipcMain.handle('play-inapp-track', async (event, track) => {
  currentInAppTrack = track;
  inAppPlaybackState.isPlaying = true;

  // Trích xuất direct audio stream URL
  const streamUrl = await getAudioStreamUrl(track.id);
  const trackWithStream = { ...track, streamUrl };

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('inapp-play-track', trackWithStream);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('inapp-track-changed', { track: trackWithStream, isPlaying: true });
  }
  updateTrayMenu();
  return { success: true, streamUrl };
});

ipcMain.handle('get-audio-stream', async (event, videoId) => {
  return await getAudioStreamUrl(videoId);
});

// IPC Điều khiển trình phát In-App
ipcMain.handle('control-inapp-player', (event, action, payload) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('inapp-control', action, payload);
  }
  return { success: true };
});

// IPC Đồng bộ tiến trình phát nhạc In-App
ipcMain.handle('sync-inapp-state', (event, state) => {
  inAppPlaybackState = { ...inAppPlaybackState, ...state };
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('inapp-state-sync', inAppPlaybackState);
  }
  return { success: true };
});

// IPC Mở nhanh tab Tìm & Phát nhạc
ipcMain.handle('open-search-tab', () => {
  createSettingsWindow();
  setTimeout(() => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('switch-to-search-tab');
    }
  }, 300);
  return { success: true };
});

ipcMain.handle('control-media', async (event, action) => {
  return await mediaManager.sendAction(action);
});

ipcMain.handle('set-click-through', (event, enabled) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(enabled, { forward: true });
    store.set('clickThrough', enabled);
  }
  return { success: true };
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, forward) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, { forward: !!forward });
  }
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
  return { success: true };
});

ipcMain.handle('close-settings', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.destroy();
    settingsWindow = null;
  }
  trimMemory();
  return { success: true };
});

ipcMain.handle('minimize-to-tray', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
    updateTrayMenu();
  }
  return { success: true };
});

ipcMain.handle('close-app', () => {
  isQuitting = true;
  app.quit();
  return { success: true };
});

ipcMain.handle('get-audio-source-id', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources.length > 0 ? sources[0].id : null;
  } catch (err) {
    return null;
  }
});

app.on('window-all-closed', (e) => {
  if (!isQuitting) {
    e.preventDefault();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  mediaManager.stopMonitoring();
});
