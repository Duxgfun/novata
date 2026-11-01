/**
 * Quản lý lưu trữ cấu hình người dùng của Novata
 * Phiên bản nvt_0.2 - Hỗ trợ Discord Rich Presence (RPC), Multi-Playlists, Auto-play Startup
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

const CONFIG_PATH = path.join(getUserDataPath(), 'novata-settings.json');

// Cấu hình mặc định phiên bản nvt_0.2
const DEFAULT_SETTINGS = {
  // Chế độ sóng âm: Thanh phổ dọc tỏa từ giữa màn hình
  visualizerMode: 'bars',
  spectrumSpread: 'center',
  // Màu sắc tùy chỉnh Hex và độ mờ của Waveform
  customColor: '#ffffff',
  waveformOpacity: 0.90,
  // Hướng mọc của sóng: 'bottom' (từ đáy màn hình lên trên taskbar)
  spectrumDirection: 'bottom',
  spectrumHeight: 160,
  // Tùy chọn thẻ điều khiển Glass UI góc màn hình
  showMediaCard: true,
  playerCardPos: null, // { left: 28, top: null } hoặc tọa độ tùy chỉnh qua nút Move
  // Sóng âm mặc định xuyên chuột và nằm ở lớp hình nền
  alwaysOnTop: false,
  clickThrough: true,
  // Cấu hình âm thanh
  sensitivity: 1.3,
  fftSmoothing: 0.82,
  barWidth: 6,
  barGap: 4,
  // Hệ thống
  launchOnStartup: false,
  minimizeToTray: true,
  // Tích hợp Discord Rich Presence (RPC)
  discordRpcEnabled: true,
  discordClientId: '807774172574253056',
  // Tự động phát nhạc khi khởi động (Default Music / Startup Playlist)
  autoPlayOnStartup: false,
  defaultStartupMode: 'playlist', // 'playlist' hoặc 'last_played'
  defaultPlaylistId: 'chill-lofi',
  lastPlayedTrack: null,
  // Chế độ phát danh sách: Xáo bài & Lặp lại
  shuffle: false,
  repeatMode: 'all' // 'all', 'one', 'none'
};

class Store {
  constructor() {
    this.settings = this.load();
  }

  load() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (err) {
      console.error('Không thể đọc cấu hình:', err);
    }
    return { ...DEFAULT_SETTINGS };
  }

  save(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.settings, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Lỗi khi lưu cấu hình:', err);
      return false;
    }
  }

  getAll() {
    return { ...this.settings };
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.save(this.settings);
  }
}

module.exports = new Store();
