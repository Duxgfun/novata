/**
 * Quản lý lưu trữ cấu hình người dùng của Novata
 * Phiên bản Thuần Đen Trắng (Monochrome Minimalist) - Loại bỏ hoàn toàn Glass
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CONFIG_PATH = path.join(app.getPath('userData'), 'novata-settings.json');

// Cau hinh mac dinh phien ban nvt_0.1
const DEFAULT_SETTINGS = {
  // Che do song am: Luon la thanh pho doc toa tu giua man hinh
  visualizerMode: 'bars',
  spectrumSpread: 'center',
  // Mau sac tuy chinh Hex va do mo cua Waveform
  customColor: '#ffffff',
  waveformOpacity: 0.90,
  // Huong moc cua song: 'bottom' (tu day man hinh len tren taskbar)
  spectrumDirection: 'bottom',
  spectrumHeight: 160,
  // Tuy chon the dieu khien Glass UI goc man hinh
  showMediaCard: true,
  playerCardPos: null, // { left: 28, top: null } hoac toa do tuy chinh qua nut Edit
  // Song am mac dinh xuyen chuot va nam o lop hinh nen
  alwaysOnTop: false,
  clickThrough: true,
  // Cau hinh am thanh
  sensitivity: 1.3,
  fftSmoothing: 0.82,
  barWidth: 6,
  barGap: 4,
  // He thong
  launchOnStartup: false,
  minimizeToTray: true
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
