/**
 * Tiến trình chính (Main Process) của Novata - Phiên bản nvt_0.2
 * Tích hợp Discord Rich Presence (RPC), Hệ thống Multi-Playlists, Auto-play Startup
 * Sóng âm thanh tối giản không nền, tràn cạnh màn hình và xuyên chuột.
 * Bình luận bằng tiếng Việt theo quy định toàn cục.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, screen, desktopCapturer, session, nativeImage } = require('electron');
const path = require('path');

// Dinh danh Windows App User Model ID cho Windows 10/11 SMTC
if (process.platform === 'win32') {
  app.setAppUserModelId('com.antigravity.novata');
}

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
// Cho phép tự động phát âm thanh In-App mượt mà không yêu cầu cử chỉ chuột ban đầu (hỗ trợ default music)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const store = require('./store');
const mediaManager = require('./mediaManager');
const discordRpc = require('./discordRpc');
const playlistManager = require('./playlistManager');
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
 * Tính toán vị trí cửa sổ visualizer và thẻ điều khiển trên toàn màn hình desktop
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
 * Khởi tạo cửa sổ Visualizer (Trong suốt 100%, sóng âm tỏa từ tâm, cho phép bị đè lên)
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
    alwaysOnTop: false, // Luôn để ở lớp hình nền để các cửa sổ khác đè lên tự nhiên
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

  // Mặc định luôn xuyên chuột trên vùng sóng âm
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  // Tự động phát nhạc khi khởi động (Default Music / Startup Playlist)
  overlayWindow.webContents.once('did-finish-load', () => {
    checkAndTriggerStartupPlayback();
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

/**
 * Kiểm tra cấu hình và tự động phát nhạc khi mở ứng dụng nếu người dùng đã bật Default Music
 */
function checkAndTriggerStartupPlayback() {
  const autoPlay = store.get('autoPlayOnStartup');
  if (!autoPlay) return;

  setTimeout(async () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;

    try {
      const startupMode = store.get('defaultStartupMode') || 'playlist';
      if (startupMode === 'playlist') {
        const defaultPlId = store.get('defaultPlaylistId');
        let playlist = defaultPlId ? playlistManager.get(defaultPlId) : null;
        if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
          // Lấy playlist đầu tiên có bài hát
          const all = playlistManager.getAll();
          playlist = all.find(p => p.tracks && p.tracks.length > 0) || null;
        }

        if (playlist && playlist.tracks && playlist.tracks.length > 0) {
          const shuffle = !!store.get('shuffle');
          overlayWindow.webContents.send('play-playlist-queue', {
            playlistId: playlist.id,
            playlistName: playlist.name,
            tracks: playlist.tracks,
            startIndex: 0,
            shuffle: shuffle
          });
        }
      } else if (startupMode === 'last_played') {
        const lastTrack = store.get('lastPlayedTrack');
        if (lastTrack) {
          const streamUrl = await getAudioStreamUrl(lastTrack.id);
          const trackWithStream = { ...lastTrack, streamUrl };
          currentInAppTrack = trackWithStream;
          inAppPlaybackState.isPlaying = true;
          overlayWindow.webContents.send('inapp-play-track', trackWithStream);
          updateDiscordForCurrentTrack(trackWithStream, true, 0);
          updateTrayMenu();
        }
      }
    } catch (err) {
      console.warn('Lỗi khi kích hoạt phát nhạc mặc định lúc mở app:', err.message);
    }
  }, 1000);
}

/**
 * Khởi tạo cửa sổ Cài đặt & Quản lý Playlists (Thuần Đen Trắng OLED)
 */
function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    settingsWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const width = 880;
  const height = 660;

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

function broadcastPlaylists() {
  const list = playlistManager.getAll();
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('playlists-updated', list);
  }
}

let trayClickTimer = null;

function createTray() {
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip('Novata nvt_0.2 - Minimalist Audio Visualizer');

  updateTrayMenu();

  // Nhấn 1 lần: Hiện / Ẩn thẻ điều khiển nhạc góc màn hình (Desktop Player Widget)
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

  // Double click: Mở cửa sổ Cài đặt
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
      label: 'Novata nvt_0.2',
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
      label: 'Playlists...',
      click: () => {
        createSettingsWindow();
        setTimeout(() => {
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('switch-to-playlist-tab');
          }
        }, 300);
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

/**
 * Cập nhật Rich Presence lên Discord cho bài hát In-App
 */
function updateDiscordForCurrentTrack(track, isPlaying, currentTime = 0) {
  if (!discordRpc.isEnabled) return;

  if (!track) {
    discordRpc.clearActivity();
    return;
  }

  discordRpc.updateActivity({
    Title: track.title,
    Artist: track.artist,
    Source: track.source || 'YouTube Music',
    Status: isPlaying ? 'Playing' : 'Paused',
    Thumbnail: track.thumbnail,
    Duration: track.duration,
    currentTime: currentTime
  });
}

// Lắng nghe thay đổi nhạc hệ thống từ Windows SMTC (Spotify, YouTube Web, Edge, Chrome)
mediaManager.on('media-changed', (media) => {
  updateTrayMenu();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('media-updated', media);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('media-updated', media);
  }

  // Nếu không có bài hát In-App nào đang phát, cập nhật Discord Rich Presence theo nhạc hệ thống
  if (!currentInAppTrack || !inAppPlaybackState.isPlaying) {
    if (media && media.Title) {
      discordRpc.updateActivity({
        Title: media.Title,
        Artist: media.Artist,
        Source: media.Source || 'Spotify',
        Status: media.Status,
        Thumbnail: media.Thumbnail,
        currentTime: 0
      });
    } else {
      discordRpc.clearActivity();
    }
  }
});

// Lắng nghe trạng thái kết nối Discord RPC
discordRpc.on('connected', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('discord-status-updated', discordRpc.getStatus());
  }
});

discordRpc.on('disconnected', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('discord-status-updated', discordRpc.getStatus());
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

  // Chỉ cung cấp âm thanh loopback hệ thống, tuyệt đối không bật screen video gây giật lag
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    callback({ audio: 'loopback' });
  });

  createOverlayWindow();
  createTray();
  mediaManager.startMonitoring();
  discordRpc.init(store);

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
      Source: currentInAppTrack.source || 'YouTube Music',
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
  inAppPlaybackState.currentTime = 0;

  // Lưu track này làm bài hát nghe gần nhất để phục vụ tính năng startup
  store.save({ lastPlayedTrack: track });

  // Trích xuất direct audio stream URL
  const streamUrl = await getAudioStreamUrl(track.id);
  const trackWithStream = { ...track, streamUrl };

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('inapp-play-track', trackWithStream);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('inapp-track-changed', { track: trackWithStream, isPlaying: true });
  }

  updateDiscordForCurrentTrack(trackWithStream, true, 0);
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

// IPC Dong bo tien trinh phat nhac In-App
ipcMain.handle('sync-inapp-state', (event, state) => {
  const wasPlaying = inAppPlaybackState.isPlaying;
  const previousTrackId = currentInAppTrack ? currentInAppTrack.id : null;
  inAppPlaybackState = { ...inAppPlaybackState, ...state };

  let trackChanged = false;
  if (state.track) {
    if (!previousTrackId || previousTrackId !== state.track.id) {
      trackChanged = true;
    }
    currentInAppTrack = state.track;
    store.save({ lastPlayedTrack: state.track });
  }

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('inapp-state-sync', inAppPlaybackState);
  }

  // Cap nhat Discord Rich Presence khi bai hat doi hoac trang thai play/pause thay doi
  if (currentInAppTrack && (trackChanged || wasPlaying !== inAppPlaybackState.isPlaying)) {
    updateDiscordForCurrentTrack(currentInAppTrack, inAppPlaybackState.isPlaying, inAppPlaybackState.currentTime);
  }

  updateTrayMenu();
  return { success: true };
});

// IPC Quản lý Multi-Playlists
ipcMain.handle('get-playlists', () => {
  return playlistManager.getAll();
});

ipcMain.handle('create-playlist', (event, data) => {
  const newPl = playlistManager.create(data);
  broadcastPlaylists();
  return newPl;
});

ipcMain.handle('update-playlist', (event, id, data) => {
  const updated = playlistManager.update(id, data);
  broadcastPlaylists();
  return updated;
});

ipcMain.handle('delete-playlist', (event, id) => {
  const ok = playlistManager.delete(id);
  broadcastPlaylists();
  return ok;
});

ipcMain.handle('add-to-playlist', (event, playlistId, track) => {
  const result = playlistManager.addTrack(playlistId, track);
  broadcastPlaylists();
  return result;
});

ipcMain.handle('remove-from-playlist', (event, playlistId, trackId) => {
  const ok = playlistManager.removeTrack(playlistId, trackId);
  broadcastPlaylists();
  return ok;
});

ipcMain.handle('play-playlist', async (event, playlistId, startIndex = 0, shuffle = false) => {
  const pl = playlistManager.get(playlistId);
  if (!pl || !pl.tracks || pl.tracks.length === 0) {
    return { success: false, error: 'Playlist is empty' };
  }

  store.save({ defaultPlaylistId: playlistId });

  const targetTrack = pl.tracks[startIndex] || pl.tracks[0];
  currentInAppTrack = targetTrack;
  inAppPlaybackState.isPlaying = true;
  updateDiscordForCurrentTrack(targetTrack, true, 0);
  updateTrayMenu();

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('play-playlist-queue', {
      playlistId: pl.id,
      playlistName: pl.name,
      tracks: pl.tracks,
      startIndex: startIndex,
      shuffle: shuffle
    });
  }
  return { success: true };
});

ipcMain.handle('set-startup-playlist', (event, playlistId) => {
  store.save({
    defaultPlaylistId: playlistId,
    autoPlayOnStartup: true,
    defaultStartupMode: 'playlist'
  });
  applySettingsToOverlay(store.getAll());
  return { success: true };
});

// IPC Quản lý Discord Rich Presence (RPC)
ipcMain.handle('get-discord-status', () => {
  return discordRpc.getStatus();
});

ipcMain.handle('set-discord-rpc-enabled', (event, enabled) => {
  store.save({ discordRpcEnabled: enabled });
  discordRpc.setEnabled(enabled);
  return discordRpc.getStatus();
});

// IPC Mở nhanh các tab
ipcMain.handle('open-search-tab', () => {
  createSettingsWindow();
  setTimeout(() => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('switch-to-search-tab');
    }
  }, 300);
  return { success: true };
});

ipcMain.handle('open-playlist-tab', () => {
  createSettingsWindow();
  setTimeout(() => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('switch-to-playlist-tab');
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
  discordRpc.destroy();
});
