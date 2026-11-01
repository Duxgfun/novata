/**
 * Preload Script - Cung cấp cầu nối IPC an toàn cho giao diện Renderer
 * Tuân thủ bảo mật contextIsolation và cấm trực tiếp Node integration.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('novata', {
  // Cài đặt ứng dụng
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  onSettingsChange: (callback) => {
    const handler = (event, settings) => callback(settings);
    ipcRenderer.on('settings-updated', handler);
    return () => ipcRenderer.removeListener('settings-updated', handler);
  },

  // Điều khiển nhạc hệ thống (SMTC - Spotify, YouTube Music web, SoundCloud...)
  getMediaState: () => ipcRenderer.invoke('get-media-state'),
  controlMedia: (action) => ipcRenderer.invoke('control-media', action),
  onMediaChange: (callback) => {
    const handler = (event, media) => callback(media);
    ipcRenderer.on('media-updated', handler);
    return () => ipcRenderer.removeListener('media-updated', handler);
  },

  // Tìm kiếm & Trình phát nhạc In-App
  searchMusic: (query) => ipcRenderer.invoke('search-music', query),
  getAudioStream: (videoId) => ipcRenderer.invoke('get-audio-stream', videoId),
  playInAppTrack: (track) => ipcRenderer.invoke('play-inapp-track', track),
  controlInAppPlayer: (action, payload) => ipcRenderer.invoke('control-inapp-player', action, payload),
  syncInAppState: (state) => ipcRenderer.invoke('sync-inapp-state', state),
  
  onPlayInAppTrack: (callback) => {
    const handler = (event, track) => callback(track);
    ipcRenderer.on('inapp-play-track', handler);
    return () => ipcRenderer.removeListener('inapp-play-track', handler);
  },
  onInAppControl: (callback) => {
    const handler = (event, action, payload) => callback(action, payload);
    ipcRenderer.on('inapp-control', handler);
    return () => ipcRenderer.removeListener('inapp-control', handler);
  },
  onInAppTrackChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('inapp-track-changed', handler);
    return () => ipcRenderer.removeListener('inapp-track-changed', handler);
  },
  onInAppStateSync: (callback) => {
    const handler = (event, state) => callback(state);
    ipcRenderer.on('inapp-state-sync', handler);
    return () => ipcRenderer.removeListener('inapp-state-sync', handler);
  },

  // Chuyển nhanh đến Tab Tìm & Phát nhạc
  openSearchTab: () => ipcRenderer.invoke('open-search-tab'),
  onSwitchToSearchTab: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('switch-to-search-tab', handler);
    return () => ipcRenderer.removeListener('switch-to-search-tab', handler);
  },

  // Tuong tac chuot va hien thi the dieu khien Glass UI
  toggleClickThrough: (enabled) => ipcRenderer.invoke('set-click-through', enabled),
  setIgnoreMouse: (ignore, forward) => ipcRenderer.send('set-ignore-mouse-events', ignore, forward),
  setIgnoreMouseEvents: (ignore, forward) => ipcRenderer.send('set-ignore-mouse-events', ignore, forward),
  onTogglePlayerCard: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('toggle-player-card', handler);
    return () => ipcRenderer.removeListener('toggle-player-card', handler);
  },
  openSettings: () => ipcRenderer.invoke('open-settings'),
  closeSettings: () => ipcRenderer.invoke('close-settings'),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  closeApp: () => ipcRenderer.invoke('close-app'),

  // Lấy nguồn chụp màn hình / loopback audio cho Web Audio API
  getAudioSourceId: () => ipcRenderer.invoke('get-audio-source-id')
});
