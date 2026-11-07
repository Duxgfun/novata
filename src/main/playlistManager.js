
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const getUserDataPath = () => {
  if (app && typeof app.getPath === 'function') {
    return app.getPath('userData');
  }
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '.', 'Library', 'Application Support') : '.');
  const dir = path.join(appData, 'novata');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  return dir;
};

const getPersistentBackupDir = () => {
  const home = process.env.USERPROFILE || process.env.HOME || getUserDataPath();
  const backupDir = path.join(home, '.novata');
  if (!fs.existsSync(backupDir)) {
    try { fs.mkdirSync(backupDir, { recursive: true }); } catch (e) {}
  }
  return backupDir;
};

const PLAYLISTS_PATH = path.join(getUserDataPath(), 'novata-playlists.json');
const BACKUP_PLAYLISTS_PATH = path.join(getPersistentBackupDir(), 'novata-playlists.json');

class PlaylistManager {
  constructor() {
    this.playlists = this.load();
  }

  load() {
    let result = null;

    try {
      if (fs.existsSync(PLAYLISTS_PATH)) {
        const raw = fs.readFileSync(PLAYLISTS_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          result = parsed;
        }
      }
    } catch (err) {
      console.warn('Không thể đọc tệp playlist chính:', err.message);
    }

    if (!result || result.length === 0) {
      try {
        if (fs.existsSync(BACKUP_PLAYLISTS_PATH)) {
          const rawBackup = fs.readFileSync(BACKUP_PLAYLISTS_PATH, 'utf-8');
          const parsedBackup = JSON.parse(rawBackup);
          if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
            result = parsedBackup;
            console.log('Đã tự động khôi phục danh sách playlist từ bản sao lưu bền vững.');
          }
        }
      } catch (backupErr) {
        console.warn('Không thể đọc tệp playlist sao lưu:', backupErr.message);
      }
    }

    if (Array.isArray(result)) {
      const isLegacyDefaults = result.length > 0 && result.every(p => ['favorites', 'chill-lofi', 'deep-focus'].includes(p.id));
      if (!isLegacyDefaults) {
        this.saveToFile(result);
        return result;
      }
    }

    this.saveToFile([]);
    return [];
  }

  saveToFile(data) {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      fs.writeFileSync(PLAYLISTS_PATH, jsonStr, 'utf-8');
      try {
        fs.writeFileSync(BACKUP_PLAYLISTS_PATH, jsonStr, 'utf-8');
      } catch (e) {}
      return true;
    } catch (err) {
      console.error('Lỗi khi lưu danh sách playlist:', err.message);
      return false;
    }
  }

  getAll() {
    return JSON.parse(JSON.stringify(this.playlists));
  }

  get(id) {
    const found = this.playlists.find(p => p.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  create({ name }) {
    const cleanName = (name || 'New Playlist').trim();
    const newId = 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const newPlaylist = {
      id: newId,
      name: cleanName,
      createdAt: Date.now(),
      tracks: []
    };

    this.playlists.push(newPlaylist);
    this.saveToFile(this.playlists);
    return newPlaylist;
  }

  update(id, { name }) {
    const playlist = this.playlists.find(p => p.id === id);
    if (!playlist) return null;

    if (name && typeof name === 'string') {
      playlist.name = name.trim();
    }

    this.saveToFile(this.playlists);
    return playlist;
  }

  delete(id) {
    const index = this.playlists.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.playlists.splice(index, 1);
    this.saveToFile(this.playlists);
    return true;
  }

  addTrack(playlistId, track) {
    if (!track || !track.id) return { success: false, error: 'Invalid track data' };

    let playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist && this.playlists.length > 0) {
      playlist = this.playlists[0];
    }

    if (!playlist) return { success: false, error: 'Playlist not found' };

    const existingIndex = playlist.tracks.findIndex(t => t.id === track.id);
    if (existingIndex !== -1) {
      return { success: true, message: 'Track already in playlist', duplicate: true, playlist };
    }

    const cleanTrack = {
      id: track.id,
      title: (track.title || 'Unknown Title').trim(),
      artist: (track.artist || 'Unknown Artist').trim(),
      duration: track.duration || '3:30',
      thumbnail: track.thumbnail || '',
      source: track.source || 'YouTube Music',
      addedAt: Date.now()
    };

    playlist.tracks.push(cleanTrack);
    this.saveToFile(this.playlists);
    return { success: true, playlist, track: cleanTrack };
  }

  removeTrack(playlistId, trackId) {
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist) return false;

    const beforeLength = playlist.tracks.length;
    playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);

    if (playlist.tracks.length !== beforeLength) {
      this.saveToFile(this.playlists);
      return true;
    }
    return false;
  }
}

module.exports = new PlaylistManager();
