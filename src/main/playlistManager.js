/**
 * Quản lý danh sách phát đa năng (Multi-Playlist Manager) cho Novata nvt_0.2
 * Lưu trữ tại %APPDATA%/novata/novata-playlists.json
 * Hỗ trợ tạo nhiều playlist theo tên, tự động phát bài kế tiếp, xáo bài.
 * Mới vào danh sách trống, người dùng tự tạo playlist theo ý thích.
 * Bình luận bằng tiếng Việt theo quy định toàn cục.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Lấy đường dẫn thư mục userData an toàn trong cả môi trường Electron lẫn môi trường kiểm thử Node
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

const PLAYLISTS_PATH = path.join(getUserDataPath(), 'novata-playlists.json');

class PlaylistManager {
  constructor() {
    this.playlists = this.load();
  }

  /**
   * Đọc dữ liệu playlist từ tệp JSON (Mới vào mặc định là danh sách trống)
   */
  load() {
    try {
      if (fs.existsSync(PLAYLISTS_PATH)) {
        const raw = fs.readFileSync(PLAYLISTS_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Xoa bo cac playlist mau cu neu con ton tai tu ban thu nghiem truoc
          const isLegacyDefaults = parsed.length > 0 && parsed.every(p => ['favorites', 'chill-lofi', 'deep-focus'].includes(p.id));
          if (isLegacyDefaults) {
            this.saveToFile([]);
            return [];
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error('Không thể đọc tệp playlist:', err.message);
    }
    // Mặc định rỗng khi mới cài đặt
    this.saveToFile([]);
    return [];
  }

  /**
   * Lưu dữ liệu playlist xuống tệp JSON
   * @param {Array} data 
   */
  saveToFile(data) {
    try {
      fs.writeFileSync(PLAYLISTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Lỗi khi lưu danh sách playlist:', err.message);
      return false;
    }
  }

  /**
   * Lấy toàn bộ danh sách phát
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.playlists));
  }

  /**
   * Lấy chi tiết một playlist theo ID
   * @param {string} id 
   */
  get(id) {
    const found = this.playlists.find(p => p.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  /**
   * Tạo playlist mới (chỉ cần tên, không cần description)
   * @param {Object} param0 { name }
   */
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

  /**
   * Đổi tên playlist
   * @param {string} id 
   * @param {Object} param1 { name }
   */
  update(id, { name }) {
    const playlist = this.playlists.find(p => p.id === id);
    if (!playlist) return null;

    if (name && typeof name === 'string') {
      playlist.name = name.trim();
    }

    this.saveToFile(this.playlists);
    return playlist;
  }

  /**
   * Xóa một playlist bất kỳ
   * @param {string} id 
   */
  delete(id) {
    const index = this.playlists.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.playlists.splice(index, 1);
    this.saveToFile(this.playlists);
    return true;
  }

  /**
   * Thêm bài hát vào playlist
   * @param {string} playlistId 
   * @param {Object} track Thông tin bài hát
   */
  addTrack(playlistId, track) {
    if (!track || !track.id) return { success: false, error: 'Invalid track data' };

    let playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist && this.playlists.length > 0) {
      playlist = this.playlists[0];
    }

    if (!playlist) return { success: false, error: 'Playlist not found' };

    // Kiểm tra xem bài hát đã tồn tại trong playlist chưa
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

  /**
   * Xóa bài hát khỏi playlist
   * @param {string} playlistId 
   * @param {string} trackId 
   */
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
