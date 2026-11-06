const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("novata", {
  
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  onSettingsChange: (callback) => {
    const handler = (event, settings) => callback(settings);
    ipcRenderer.on("settings-updated", handler);
    return () => ipcRenderer.removeListener("settings-updated", handler);
  },
  
  getMediaState: () => ipcRenderer.invoke("get-media-state"),
  controlMedia: (action) => ipcRenderer.invoke("control-media", action),
  onMediaChange: (callback) => {
    const handler = (event, media) => callback(media);
    ipcRenderer.on("media-updated", handler);
    return () => ipcRenderer.removeListener("media-updated", handler);
  },
  
  searchMusic: (query) => ipcRenderer.invoke("search-music", query),
  getAudioStream: (videoId) => ipcRenderer.invoke("get-audio-stream", videoId),
  playInAppTrack: (track) => ipcRenderer.invoke("play-inapp-track", track),
  controlInAppPlayer: (action, payload) => ipcRenderer.invoke("control-inapp-player", action, payload),
  syncInAppState: (state) => ipcRenderer.invoke("sync-inapp-state", state),
  onPlayInAppTrack: (callback) => {
    const handler = (event, track) => callback(track);
    ipcRenderer.on("inapp-play-track", handler);
    return () => ipcRenderer.removeListener("inapp-play-track", handler);
  },
  onInAppControl: (callback) => {
    const handler = (event, action, payload) => callback(action, payload);
    ipcRenderer.on("inapp-control", handler);
    return () => ipcRenderer.removeListener("inapp-control", handler);
  },
  onInAppTrackChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("inapp-track-changed", handler);
    return () => ipcRenderer.removeListener("inapp-track-changed", handler);
  },
  onInAppStateSync: (callback) => {
    const handler = (event, state) => callback(state);
    ipcRenderer.on("inapp-state-sync", handler);
    return () => ipcRenderer.removeListener("inapp-state-sync", handler);
  },
  
  getPlaylists: () => ipcRenderer.invoke("get-playlists"),
  createPlaylist: (data) => ipcRenderer.invoke("create-playlist", data),
  updatePlaylist: (id, data) => ipcRenderer.invoke("update-playlist", id, data),
  deletePlaylist: (id) => ipcRenderer.invoke("delete-playlist", id),
  addToPlaylist: (playlistId, track) => ipcRenderer.invoke("add-to-playlist", playlistId, track),
  removeFromPlaylist: (playlistId, trackId) => ipcRenderer.invoke("remove-from-playlist", playlistId, trackId),
  playPlaylist: (playlistId, startIndex, shuffle) => ipcRenderer.invoke("play-playlist", playlistId, startIndex, shuffle),
  setStartupPlaylist: (playlistId) => ipcRenderer.invoke("set-startup-playlist", playlistId),
  onPlayPlaylist: (callback) => {
    const handler = (event, payload) => callback(payload);
    ipcRenderer.on("play-playlist-queue", handler);
    return () => ipcRenderer.removeListener("play-playlist-queue", handler);
  },
  onPlaylistsChanged: (callback) => {
    const handler = (event, playlists) => callback(playlists);
    ipcRenderer.on("playlists-updated", handler);
    return () => ipcRenderer.removeListener("playlists-updated", handler);
  },
  
  getDiscordStatus: () => ipcRenderer.invoke("get-discord-status"),
  setDiscordRpcEnabled: (enabled) => ipcRenderer.invoke("set-discord-rpc-enabled", enabled),
  setDiscordClientId: (clientId) => ipcRenderer.invoke("set-discord-client-id", clientId),
  onDiscordStatusChange: (callback) => {
    const handler = (event, status) => callback(status);
    ipcRenderer.on("discord-status-updated", handler);
    return () => ipcRenderer.removeListener("discord-status-updated", handler);
  },
  
  resolveMediaUrl: (url) => ipcRenderer.invoke("resolve-media-url", url),
  
  getLyrics: (trackInfo) => ipcRenderer.invoke("get-lyrics", trackInfo),
  selectFontFile: () => ipcRenderer.invoke("select-font-file"),
  resetCustomFont: () => ipcRenderer.invoke("reset-custom-font"),
  toggleLyricsWidget: (show) => ipcRenderer.invoke("toggle-lyrics-widget", show),
  onToggleLyricsCard: (callback) => {
    const handler = (event, show) => callback(show);
    ipcRenderer.on("toggle-lyrics-card", handler);
    return () => ipcRenderer.removeListener("toggle-lyrics-card", handler);
  },
  
  openSearchTab: () => ipcRenderer.invoke("open-search-tab"),
  openPlaylistTab: () => ipcRenderer.invoke("open-playlist-tab"),
  onSwitchToSearchTab: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("switch-to-search-tab", handler);
    return () => ipcRenderer.removeListener("switch-to-search-tab", handler);
  },
  onSwitchToPlaylistTab: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("switch-to-playlist-tab", handler);
    return () => ipcRenderer.removeListener("switch-to-playlist-tab", handler);
  },
  
  enterEditMode: () => ipcRenderer.invoke("enter-edit-mode"),
  onEnterEditMode: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("enter-edit-mode", handler);
    return () => ipcRenderer.removeListener("enter-edit-mode", handler);
  },
  
  toggleClickThrough: (enabled) => ipcRenderer.invoke("set-click-through", enabled),
  setIgnoreMouse: (ignore, forward) => ipcRenderer.send("set-ignore-mouse-events", ignore, forward),
  setIgnoreMouseEvents: (ignore, forward) => ipcRenderer.send("set-ignore-mouse-events", ignore, forward),
  onTogglePlayerCard: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("toggle-player-card", handler);
    return () => ipcRenderer.removeListener("toggle-player-card", handler);
  },
  openSettings: () => ipcRenderer.invoke("open-settings"),
  closeSettings: () => ipcRenderer.invoke("close-settings"),
  minimizeToTray: () => ipcRenderer.invoke("minimize-to-tray"),
  closeApp: () => ipcRenderer.invoke("close-app"),
  
  getAudioSourceId: () => ipcRenderer.invoke("get-audio-source-id")
});
