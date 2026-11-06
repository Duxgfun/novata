const { app, BrowserWindow, Tray, Menu, ipcMain, screen, desktopCapturer, session, nativeImage, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
if (process.platform === "win32") {
  app.setAppUserModelId("com.antigravity.novata");
}
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-accelerated-2d-canvas");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("force-color-profile", "srgb");
app.commandLine.appendSwitch("disable-background-networking");
app.commandLine.appendSwitch("disable-component-update");
app.commandLine.appendSwitch("disable-client-side-phishing-detection");
app.commandLine.appendSwitch("disable-default-apps");
app.commandLine.appendSwitch("disable-extensions");
app.commandLine.appendSwitch("disable-sync");
app.commandLine.appendSwitch("disable-translate");
app.commandLine.appendSwitch("disable-breakpad");
app.commandLine.appendSwitch("disable-crash-reporter");
app.commandLine.appendSwitch("disable-logging");
app.commandLine.appendSwitch("disable-spell-checking");
app.commandLine.appendSwitch("disable-hang-monitor");
app.commandLine.appendSwitch("disable-features", "Translate,AudioServiceOutOfProcess,SpareRendererForSitePerProcess,CalculateNativeWinOcclusion");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
const store = require("./store");
const mediaManager = require("./mediaManager");
const discordRpc = require("./discordRpc");
const playlistManager = require("./playlistManager");
const { searchMusic, getAudioStreamUrl, resolveMediaUrl, getLyricsForTrack } = require("./musicSearch");
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
const iconPath = path.join(__dirname, "..", "..", "assets", "icon.png");
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
    alwaysOnTop: false,
    
    focusable: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      devTools: false
    }
  });
  overlayWindow.loadFile(path.join(__dirname, "..", "renderer", "overlay", "index.html"));
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.webContents.once("did-finish-load", () => {
    checkAndTriggerStartupPlayback();
  });
  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
}
function checkAndTriggerStartupPlayback() {
  const autoPlay = store.get("autoPlayOnStartup");
  if (!autoPlay) return;
  setTimeout(async () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    try {
      const startupMode = store.get("defaultStartupMode") || "playlist";
      if (startupMode === "playlist") {
        const defaultPlId = store.get("defaultPlaylistId");
        let playlist = defaultPlId ? playlistManager.get(defaultPlId) : null;
        if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
          const all = playlistManager.getAll();
          playlist = all.find((p) => p.tracks && p.tracks.length > 0) || null;
        }
        if (playlist && playlist.tracks && playlist.tracks.length > 0) {
          const shuffle = !!store.get("shuffle");
          overlayWindow.webContents.send("play-playlist-queue", {
            playlistId: playlist.id,
            playlistName: playlist.name,
            tracks: playlist.tracks,
            startIndex: 0,
            shuffle
          });
        }
      } else if (startupMode === "last_played") {
        const lastTrack = store.get("lastPlayedTrack");
        if (lastTrack) {
          const streamUrl = await getAudioStreamUrl(lastTrack.id);
          const trackWithStream = { ...lastTrack, streamUrl };
          currentInAppTrack = trackWithStream;
          inAppPlaybackState.isPlaying = true;
          overlayWindow.webContents.send("inapp-play-track", trackWithStream);
          updateDiscordForCurrentTrack(trackWithStream, true, 0);
          updateTrayMenu();
        }
      }
    } catch (err) {
      console.warn("L\u1ED7i khi k\xEDch ho\u1EA1t ph\xE1t nh\u1EA1c m\u1EB7c \u0111\u1ECBnh l\xFAc m\u1EDF app:", err.message);
    }
  }, 1e3);
}
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
    backgroundColor: "#09090b",
    
    frame: false,
    resizable: false,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false
    }
  });
  settingsWindow.loadFile(path.join(__dirname, "..", "renderer", "settings", "index.html"));
  settingsWindow.once("ready-to-show", () => {
    settingsWindow.show();
    settingsWindow.focus();
  });
  settingsWindow.on("closed", () => {
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
  overlayWindow.webContents.send("settings-updated", settings);
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("settings-updated", settings);
  }
  if (typeof settings.launchOnStartup === "boolean") {
    app.setLoginItemSettings({
      openAtLogin: settings.launchOnStartup,
      path: process.execPath
    });
  }
}
function broadcastPlaylists() {
  const list = playlistManager.getAll();
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("playlists-updated", list);
  }
}
let trayClickTimer = null;
function createTray() {
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip("Novata nvt_0.6 beta");
  updateTrayMenu();
  tray.on("click", () => {
    if (trayClickTimer) clearTimeout(trayClickTimer);
    trayClickTimer = setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        if (!overlayWindow.isVisible()) overlayWindow.show();
        overlayWindow.webContents.send("toggle-player-card");
      }
      trayClickTimer = null;
    }, 220);
  });
  tray.on("double-click", () => {
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
  let songLabel = "Ready to listen";
  let isPlaying = false;
  if (currentInAppTrack) {
    songLabel = `${currentInAppTrack.title} - ${currentInAppTrack.artist}`;
    isPlaying = inAppPlaybackState.isPlaying;
  } else if (media && media.Title) {
    songLabel = `${media.Title} - ${media.Artist || "Artist"}`;
    isPlaying = media.Status && media.Status.toLowerCase().includes("play");
  }
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Novata nvt_0.6 beta",
      enabled: false,
      icon: nativeImage.createFromPath(iconPath).resize({ width: 14, height: 14 })
    },
    {
      label: songLabel.length > 36 ? songLabel.substring(0, 34) + "..." : songLabel,
      enabled: false
    },
    { type: "separator" },
    {
      label: isPlaying ? "Pause Music" : "Play Music",
      click: async () => {
        if (currentInAppTrack) {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send("inapp-control", "toggle");
          }
        } else {
          await mediaManager.sendAction("play_pause");
        }
      }
    },
    {
      label: "Next Track",
      click: async () => {
        if (currentInAppTrack) {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send("inapp-control", "next");
          }
        } else {
          await mediaManager.sendAction("next");
        }
      }
    },
    {
      label: "Previous Track",
      click: async () => {
        if (currentInAppTrack) {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send("inapp-control", "prev");
          }
        } else {
          await mediaManager.sendAction("prev");
        }
      }
    },
    { type: "separator" },
    {
      label: "Toggle Player Widget",
      click: () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send("toggle-player-card");
        }
      }
    },
    {
      label: "Toggle Lyrics Widget",
      click: () => {
        const cur = store.get("showLyricsWidget") !== false;
        store.save({ showLyricsWidget: !cur });
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send("toggle-lyrics-card", !cur);
        }
      }
    },
    {
      label: "Adjust Widgets Position & Size",
      click: () => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          if (!overlayWindow.isVisible()) overlayWindow.show();
          overlayWindow.webContents.send("enter-edit-mode");
        }
      }
    },
    {
      label: "Playlists...",
      click: () => {
        createSettingsWindow();
        setTimeout(() => {
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send("switch-to-playlist-tab");
          }
        }, 300);
      }
    },
    {
      label: "Search & Play Music...",
      click: () => {
        createSettingsWindow();
        setTimeout(() => {
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send("switch-to-search-tab");
          }
        }, 300);
      }
    },
    {
      label: "Settings...",
      click: () => {
        createSettingsWindow();
      }
    },
    { type: "separator" },
    {
      label: "Exit Novata",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
}
function updateDiscordForCurrentTrack(track, isPlaying, currentTime = 0) {
  if (!discordRpc.isEnabled) return;
  if (!track) {
    discordRpc.clearActivity();
    return;
  }
  discordRpc.updateActivity({
    Title: track.title,
    Artist: track.artist,
    Source: track.source || "YouTube Music",
    Status: isPlaying ? "Playing" : "Paused",
    Thumbnail: track.thumbnail,
    Duration: track.duration,
    currentTime
  });
}
mediaManager.on("media-changed", (media) => {
  updateTrayMenu();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("media-updated", media);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("media-updated", media);
  }
  if (!currentInAppTrack || !inAppPlaybackState.isPlaying) {
    if (media && media.Title) {
      discordRpc.updateActivity({
        Title: media.Title,
        Artist: media.Artist,
        Source: media.Source || "Spotify",
        Status: media.Status,
        Thumbnail: media.Thumbnail,
        currentTime: 0
      });
    } else {
      discordRpc.clearActivity();
    }
  }
});
discordRpc.on("connected", () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("discord-status-updated", discordRpc.getStatus());
  }
});
discordRpc.on("disconnected", () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("discord-status-updated", discordRpc.getStatus());
  }
});
function trimMemory() {
  if (global.gc) {
    try {
      global.gc();
    } catch (e) {
    }
  }
  if (session && session.defaultSession) {
    session.defaultSession.clearCache().catch(() => {
    });
  }
}
app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders["x-frame-options"];
    delete responseHeaders["X-Frame-Options"];
    delete responseHeaders["content-security-policy"];
    delete responseHeaders["Content-Security-Policy"];
    responseHeaders["access-control-allow-origin"] = ["*"];
    responseHeaders["access-control-allow-headers"] = ["*"];
    responseHeaders["access-control-allow-methods"] = ["GET, HEAD, OPTIONS"];
    callback({ cancel: false, responseHeaders });
  });
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      if (request.videoRequested) {
        const sources = await desktopCapturer.getSources({ types: ["screen"] });
        callback({ video: sources[0] || null, audio: "loopback" });
      } else {
        callback({ audio: "loopback" });
      }
    } catch (e) {
      callback({ audio: "loopback" });
    }
  });
  createOverlayWindow();
  createTray();
  mediaManager.startMonitoring();
  discordRpc.init(store);
  if (process.argv.includes("--settings")) {
    createSettingsWindow();
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
    }
  });
});
ipcMain.handle("get-settings", () => {
  return store.getAll();
});
ipcMain.handle("save-settings", (event, newSettings) => {
  store.save(newSettings);
  applySettingsToOverlay(store.getAll());
  return { success: true };
});
ipcMain.handle("get-media-state", () => {
  if (currentInAppTrack) {
    return {
      Active: true,
      Title: currentInAppTrack.title,
      Artist: currentInAppTrack.artist,
      Album: "In-App Player",
      Source: currentInAppTrack.source || "YouTube Music",
      Status: inAppPlaybackState.isPlaying ? "Playing" : "Paused",
      Thumbnail: currentInAppTrack.thumbnail,
      Duration: currentInAppTrack.duration
    };
  }
  return mediaManager.getCurrentMedia();
});
ipcMain.handle("search-music", async (event, query) => {
  return await searchMusic(query);
});
ipcMain.handle("play-inapp-track", async (event, track) => {
  currentInAppTrack = track;
  inAppPlaybackState.isPlaying = true;
  inAppPlaybackState.currentTime = 0;
  store.save({ lastPlayedTrack: track });
  const streamUrl = await getAudioStreamUrl(track.id);
  const trackWithStream = { ...track, streamUrl };
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("inapp-play-track", trackWithStream);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("inapp-track-changed", { track: trackWithStream, isPlaying: true });
  }
  updateDiscordForCurrentTrack(trackWithStream, true, 0);
  updateTrayMenu();
  return { success: true, streamUrl };
});
ipcMain.handle("get-audio-stream", async (event, videoId) => {
  return await getAudioStreamUrl(videoId);
});
ipcMain.handle("control-inapp-player", (event, action, payload) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("inapp-control", action, payload);
  }
  return { success: true };
});
ipcMain.handle("sync-inapp-state", (event, state) => {
  const wasPlaying = inAppPlaybackState.isPlaying;
  const previousTrackId = currentInAppTrack ? currentInAppTrack.id : null;
  inAppPlaybackState = { ...inAppPlaybackState, ...state };
  let trackChanged = false;
  if (state.track) {
    if (!previousTrackId || previousTrackId !== state.track.id) {
      trackChanged = true;
    }
    currentInAppTrack = state.track;
    if (trackChanged) {
      store.save({ lastPlayedTrack: state.track });
    }
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("inapp-state-sync", inAppPlaybackState);
  }
  if (currentInAppTrack && (trackChanged || wasPlaying !== inAppPlaybackState.isPlaying)) {
    updateDiscordForCurrentTrack(currentInAppTrack, inAppPlaybackState.isPlaying, inAppPlaybackState.currentTime);
    updateTrayMenu();
  }
  return { success: true };
});
ipcMain.handle("get-playlists", () => {
  return playlistManager.getAll();
});
ipcMain.handle("create-playlist", (event, data) => {
  const newPl = playlistManager.create(data);
  broadcastPlaylists();
  return newPl;
});
ipcMain.handle("update-playlist", (event, id, data) => {
  const updated = playlistManager.update(id, data);
  broadcastPlaylists();
  return updated;
});
ipcMain.handle("delete-playlist", (event, id) => {
  const ok = playlistManager.delete(id);
  broadcastPlaylists();
  return ok;
});
ipcMain.handle("add-to-playlist", (event, playlistId, track) => {
  const result = playlistManager.addTrack(playlistId, track);
  broadcastPlaylists();
  return result;
});
ipcMain.handle("remove-from-playlist", (event, playlistId, trackId) => {
  const ok = playlistManager.removeTrack(playlistId, trackId);
  broadcastPlaylists();
  return ok;
});
ipcMain.handle("play-playlist", async (event, playlistId, startIndex = 0, shuffle = false) => {
  const pl = playlistManager.get(playlistId);
  if (!pl || !pl.tracks || pl.tracks.length === 0) {
    return { success: false, error: "Playlist is empty" };
  }
  store.save({ defaultPlaylistId: playlistId });
  const targetTrack = pl.tracks[startIndex] || pl.tracks[0];
  currentInAppTrack = targetTrack;
  inAppPlaybackState.isPlaying = true;
  updateDiscordForCurrentTrack(targetTrack, true, 0);
  updateTrayMenu();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("play-playlist-queue", {
      playlistId: pl.id,
      playlistName: pl.name,
      tracks: pl.tracks,
      startIndex,
      shuffle
    });
  }
  return { success: true };
});
ipcMain.handle("set-startup-playlist", (event, playlistId) => {
  store.save({
    defaultPlaylistId: playlistId,
    autoPlayOnStartup: true,
    defaultStartupMode: "playlist"
  });
  applySettingsToOverlay(store.getAll());
  return { success: true };
});
ipcMain.handle("get-discord-status", () => {
  return discordRpc.getStatus();
});
ipcMain.handle("set-discord-rpc-enabled", (event, enabled) => {
  store.save({ discordRpcEnabled: enabled });
  discordRpc.setEnabled(enabled);
  return discordRpc.getStatus();
});
ipcMain.handle("set-discord-client-id", (event, clientId) => {
  const cleanId = (clientId || "").trim();
  if (cleanId) {
    store.save({ discordClientId: cleanId });
    discordRpc.updateClientId(cleanId);
  }
  return discordRpc.getStatus();
});
ipcMain.handle("resolve-media-url", async (event, url) => {
  return await resolveMediaUrl(url);
});
ipcMain.handle("get-lyrics", async (event, { title, artist, duration }) => {
  return await getLyricsForTrack(title, artist, duration);
});
ipcMain.handle("select-font-file", async () => {
  try {
    const parentWin = settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow : null;
    const { canceled, filePaths } = await dialog.showOpenDialog(parentWin, {
      title: "Select Font File for Lyrics",
      properties: ["openFile"],
      filters: [
        { name: "Font Files (*.ttf, *.otf, *.woff, *.woff2)", extensions: ["ttf", "otf", "woff", "woff2"] }
      ]
    });
    if (canceled || !filePaths || filePaths.length === 0) {
      return { canceled: true };
    }
    const selectedPath = filePaths[0];
    const ext = path.extname(selectedPath).toLowerCase().replace(".", "");
    const fileName = path.basename(selectedPath);
    const fontName = path.basename(selectedPath, path.extname(selectedPath)).replace(/[^a-zA-Z0-9_-]/g, "_");
    const fontBuffer = fs.readFileSync(selectedPath);
    const mimeType = ext === "woff2" ? "font/woff2" : ext === "woff" ? "font/woff" : ext === "otf" ? "font/otf" : "font/ttf";
    const dataUrl = `data:${mimeType};base64,${fontBuffer.toString("base64")}`;
    const appDataFontsDir = path.join(app.getPath("userData"), "fonts");
    if (!fs.existsSync(appDataFontsDir)) {
      try {
        fs.mkdirSync(appDataFontsDir, { recursive: true });
      } catch (e) {
      }
    }
    const savedFontPath = path.join(appDataFontsDir, `custom_font_${Date.now()}.${ext}`);
    try {
      fs.writeFileSync(savedFontPath, fontBuffer);
    } catch (e) {
    }
    const fontConfig = {
      name: fontName,
      fileName,
      ext,
      dataUrl,
      path: savedFontPath,
      loadedAt: Date.now()
    };
    store.save({
      lyricsCustomFont: fontConfig,
      lyricsFontFamily: fontName
    });
    applySettingsToOverlay(store.getAll());
    return {
      success: true,
      font: fontConfig
    };
  } catch (err) {
    console.error("L\u1ED7i khi n\u1EA1p t\u1EC7p font ch\u1EEF:", err);
    return { success: false, error: err.message };
  }
});
ipcMain.handle("reset-custom-font", () => {
  store.save({
    lyricsCustomFont: null,
    lyricsFontFamily: "system"
  });
  applySettingsToOverlay(store.getAll());
  return { success: true };
});
ipcMain.handle("toggle-lyrics-widget", (event, show) => {
  const currentShow = typeof show === "boolean" ? show : store.get("showLyricsWidget") === false;
  store.save({ showLyricsWidget: currentShow });
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("toggle-lyrics-card", currentShow);
  }
  return { success: true, showLyricsWidget: currentShow };
});
ipcMain.handle("open-search-tab", () => {
  createSettingsWindow();
  setTimeout(() => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send("switch-to-search-tab");
    }
  }, 300);
  return { success: true };
});
ipcMain.handle("open-playlist-tab", () => {
  createSettingsWindow();
  setTimeout(() => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send("switch-to-playlist-tab");
    }
  }, 300);
  return { success: true };
});
ipcMain.handle("control-media", async (event, action) => {
  return await mediaManager.sendAction(action);
});
ipcMain.handle("set-click-through", (event, enabled) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(enabled, { forward: true });
    store.set("clickThrough", enabled);
  }
  return { success: true };
});
ipcMain.on("set-ignore-mouse-events", (event, ignore, forward) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, { forward: !!forward });
  }
});
ipcMain.handle("enter-edit-mode", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (!overlayWindow.isVisible()) overlayWindow.show();
    overlayWindow.webContents.send("enter-edit-mode");
  }
  return { success: true };
});
ipcMain.handle("open-settings", () => {
  createSettingsWindow();
  return { success: true };
});
ipcMain.handle("close-settings", () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.destroy();
    settingsWindow = null;
  }
  trimMemory();
  return { success: true };
});
ipcMain.handle("minimize-to-tray", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
    updateTrayMenu();
  }
  return { success: true };
});
ipcMain.handle("close-app", () => {
  isQuitting = true;
  app.quit();
  return { success: true };
});
ipcMain.handle("get-audio-source-id", async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    return sources.length > 0 ? sources[0].id : null;
  } catch (err) {
    return null;
  }
});
app.on("window-all-closed", (e) => {
  if (!isQuitting) {
    e.preventDefault();
  }
});
app.on("before-quit", () => {
  isQuitting = true;
  mediaManager.stopMonitoring();
  discordRpc.destroy();
});
