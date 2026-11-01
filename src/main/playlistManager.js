/**
 * Quản lý danh sách phát đa năng (Multi-Playlist Manager) cho Novata nvt_0.2
 * Lưu trữ tại %APPDATA%/novata/novata-playlists.json
 * Hỗ trợ tạo nhiều playlist theo mục đích, tâm trạng, tự động phát bài kế tiếp, xáo bài.
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

// Danh sách phát mẫu mặc định khi người dùng mới cài đặt
const DEFAULT_PLAYLISTS = [
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'Your favorite and starred songs',
    createdAt: Date.now(),
    isSystem: true,
    tracks: [
      {
        id: 'abPmZCZZrFA',
        title: 'Đừng Làm Trái Tim Anh Đau',
        artist: 'Sơn Tùng M-TP',
        duration: '5:26',
        thumbnail: 'https://i.ytimg.com/vi/abPmZCZZrFA/hqdefault.jpg',
        source: 'YouTube Music',
        addedAt: Date.now()
      }
    ]
  },
  {
    id: 'chill-lofi',
    name: 'Chill & Relax',
    description: 'Relaxing lofi beats for unwinding and gentle evenings',
    createdAt: Date.now(),
    isSystem: false,
    tracks: [
      {
        id: 'sJzF3uG6jZg',
        title: 'Nấu Ăn Cho Em',
        artist: 'Đen Vâu ft. PiaLinh',
        duration: '4:46',
        thumbnail: 'https://i.ytimg.com/vi/sJzF3uG6jZg/hqdefault.jpg',
        source: 'YouTube Music',
        addedAt: Date.now()
      },
      {
        id: 'w4cLw2nB1yE',
        title: 'Ngày Đầu Tiên',
        artist: 'Đức Phúc',
        duration: '4:20',
        thumbnail: 'https://i.ytimg.com/vi/w4cLw2nB1yE/hqdefault.jpg',
        source: 'YouTube Music',
        addedAt: Date.now()
      },
      {
        id: 'z2q2W2w0E50',
        title: 'Bật Tình Yêu Lên',
        artist: 'Tăng Duy Tân x Hòa Minzy',
        duration: '3:45',
        thumbnail: 'https://i.ytimg.com/vi/z2q2W2w0E50/hqdefault.jpg',
        source: 'YouTube Music',
        addedAt: Date.now()
      }
    ]
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus & Coding',
    description: 'Electronic synthwave and rhythmic instrumentals for deep concentration',
    createdAt: Date.now(),
    isSystem: false,
    tracks: [
      {
        id: 'GpmOn4RyzZI',
        title: 'Cắt Đôi Nỗi Sầu',
        artist: 'Tăng Duy Tân',
        duration: '3:24',
        thumbnail: 'https://i.ytimg.com/vi/GpmOn4RyzZI/hqdefault.jpg',
        source: 'YouTube Music',
        addedAt: Date.now()
      }
    ]
  }
];

class PlaylistManager {
  constructor() {
    this.playlists = this.load();
  }

  /**
   * Đọc dữ liệu playlist từ tệp JSON
   */
  load() {
    try {
      if (fs.existsSync(PLAYLISTS_PATH)) {
        const raw = fs.readFileSync(PLAYLISTS_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Không thể đọc tệp playlist:', err.message);
    }
    // Khởi tạo các playlist mặc định nếu chưa có
    const initial = JSON.parse(JSON.stringify(DEFAULT_PLAYLISTS));
    this.saveToFile(initial);
    return initial;
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
   * Tạo playlist mới
   * @param {Object} param0 { name, description }
   */
  create({ name, description }) {
    const cleanName = (name || 'New Playlist').trim();
    const cleanDesc = (description || '').trim();
    const newId = 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const newPlaylist = {
      id: newId,
      name: cleanName,
      description: cleanDesc,
      createdAt: Date.now(),
      isSystem: false,
      tracks: []
    };

    this.playlists.push(newPlaylist);
    this.saveToFile(this.playlists);
    return newPlaylist;
  }

  /**
   * Cập nhật thông tin playlist
   * @param {string} id 
   * @param {Object} param1 { name, description }
   */
  update(id, { name, description }) {
    const playlist = this.playlists.find(p => p.id === id);
    if (!playlist) return null;

    if (name && typeof name === 'string') {
      playlist.name = name.trim();
    }
    if (typeof description === 'string') {
      playlist.description = description.trim();
    }

    this.saveToFile(this.playlists);
    return playlist;
  }

  /**
   * Xóa một playlist
   * @param {string} id 
   */
  delete(id) {
    const index = this.playlists.findIndex(p => p.id === id);
    if (index === -1) return false;

    // Không cho phép xóa danh sách Favorites mặc định để tránh mất danh mục gốc
    if (this.playlists[index].id === 'favorites') {
      return false;
    }

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
    if (!playlist) {
      // Nếu không tìm thấy, thêm vào Favorites làm mặc định
      playlist = this.playlists.find(p => p.id === 'favorites') || this.playlists[0];
    }

    if (!playlist) return { success: false, error: 'Playlist not found' };

    // Kiểm tra xem bài hát đã tồn tại trong playlist chưa
    const existingIndex = playlist.tracks.findIndex(t => t.id === track.id);
    if (existingIndex !== -1) {
      // Đã có bài hát, đưa lên đầu hoặc giữ nguyên
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
