/**
 * Quản lý lưu trữ cấu hình người dùng của Novata
 * Phiên bản nvt_0.4 beta - Hỗ trợ Dạng sóng (Waveform), Chất liệu Solid/Glass trong suốt, Multi-Playlists & Discord RPC
 */

const fs = require('fs');
const path = require('path');
let app;
try {
  const electron = require('electron');
  app = electron.app;
} catch (e) {}

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

// Cấu hình mặc định phiên bản nvt_0.4 beta
const DEFAULT_SETTINGS = {
  // Chế độ sóng âm: 'bars' (dạng cột) hoặc 'wave' (dạng sóng)
  visualizerMode: 'bars',
  spectrumSpread: 'center',

  // 1. Cấu hình chất liệu cho dạng cột (Bars Material): 'solid' hoặc 'glass'
  barsMaterial: 'solid',
  customColor: '#ffffff',
  waveformOpacity: 1.00,
  barsGlassOpacity: 0.28,
  barsGlassBlur: 10,

  // 2. Cấu hình Dạng sóng (Continuous Wave): Gồm 2 phần độc lập, mỗi phần có tùy chọn Solid / Glass riêng
  // 2a. Phần viền trên cùng (Top Crest Border - như màu đỏ trong hình vẽ)
  waveBorderMaterial: 'solid',     // 'solid' hoặc 'glass'
  waveBorderColor: '#ef4444',      // Màu sắc viền trên cùng (mặc định đỏ nổi bật hoặc trắng)
  waveBorderOpacity: 1.00,         // Độ mờ viền solid
  waveBorderWidth: 3.0,            // Độ dày viền bên trên cùng (chỉ tính viền trên)
  waveBorderGlassOpacity: 0.70,     // Độ trong suốt khi viền là glass (không màu)
  waveBorderGlassBlur: 6,          // Độ mờ tán xạ khi viền là glass (px)

  // 2b. Phần thân bên trong (Wave Inner Body - như màu cam trong hình vẽ)
  waveInnerMaterial: 'solid',      // 'solid' hoặc 'glass'
  waveInnerColor: '#f97316',       // Màu sắc thân bên trong (mặc định cam nổi bật hoặc trắng)
  waveInnerOpacity: 1.00,          // Độ mờ thân solid (100% màu đặc thuần túy che kín nền)
  waveInnerGlassOpacity: 0.25,     // Độ trong suốt khi thân trong là glass (không màu)
  waveInnerGlassBlur: 12,          // Độ mờ tán xạ khi thân trong là glass (px)

  // Thuộc tính cũ giữ lại để đảm bảo tương thích ngược
  waveMaterial: 'solid',
  waveGlassOpacity: 0.28,
  waveGlassBlur: 10,

  // Chất liệu bảng widget (player card): 'solid' hoặc 'glass'
  widgetMaterial: 'glass',
  // Thuộc tính glass cho bảng widget: chỉnh độ trong, độ mờ, tuyệt đối không có màu (trong suốt)
  widgetGlassOpacity: 0.18, // Độ trong (transparency)
  widgetGlassBlur: 20,       // Độ mờ (blur tính theo px)

  // Hướng mọc của sóng: 'bottom' (từ đáy màn hình lên trên taskbar)
  spectrumDirection: 'bottom',
  spectrumHeight: 160,

  // Tùy chọn thẻ điều khiển widget góc màn hình
  showMediaCard: true,
  playerCardPos: null,  // { left: 28, top: null } hoặc tọa độ tùy chỉnh
  playerCardSize: null, // { width: 360, height: null } kích thước tùy chỉnh co giãn

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
  defaultPlaylistId: null,
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
