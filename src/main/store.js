
const fs = require('fs');
const path = require('path');
let app;
try {
  const electron = require('electron');
  app = electron.app;
} catch (e) {}

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

const CONFIG_PATH = path.join(getUserDataPath(), 'novata-settings.json');
const BACKUP_CONFIG_PATH = path.join(getPersistentBackupDir(), 'novata-settings.json');

const DEFAULT_SETTINGS = {
  visualizerMode: 'bars',
  spectrumSpread: 'center',

  barsMaterial: 'solid',
  customColor: '#ffffff',
  waveformOpacity: 1.00,
  barsGlassOpacity: 0.28,
  barsGlassBlur: 10,

  waveBorderMaterial: 'solid',     
  waveBorderColor: '#ef4444',      
  waveBorderOpacity: 1.00,         
  waveBorderWidth: 3.0,            
  waveBorderGlassOpacity: 0.70,    
  waveBorderGlassBlur: 6,          

  waveInnerMaterial: 'solid',      
  waveInnerColor: '#f97316',       
  waveInnerOpacity: 1.00,          
  waveInnerGlassOpacity: 0.25,     
  waveInnerGlassBlur: 12,          

  waveMaterial: 'solid',
  waveGlassOpacity: 0.28,
  waveGlassBlur: 10,

  widgetMaterial: 'glass',
  widgetBgColor: '#111116',        
  widgetBorderColor: '#ffffff',    
  widgetBorderOpacity: 0.18,       
  widgetBorderEnabled: true,       
  widgetGlassOpacity: 0.18,        
  widgetGlassBlur: 20,             
  widgetTextColor: '#ffffff',      
  widgetTextSize: 14,              
  widgetBorderRadius: 20,          

  spectrumDirection: 'bottom',
  spectrumHeight: 160,

  showMediaCard: true,
  playerCardPos: null,  
  playerCardSize: null, 

  showLyricsWidget: true,
  lyricsCardPos: null,  
  lyricsCardSize: null, 
  lyricsMaterial: 'glass',         
  lyricsBgColor: '#111116',        
  lyricsBorderColor: '#ffffff',    
  lyricsBorderOpacity: 0.18,       
  lyricsBorderEnabled: true,       
  lyricsGlassOpacity: 0.18,        
  lyricsGlassBlur: 20,             
  lyricsActiveColor: '#ffffff',    
  lyricsInactiveOpacity: 0.35,     
  lyricsFontSize: 18,              
  lyricsFontFamily: 'system',      
  lyricsCustomFont: null,          
  lyricsTextAlign: 'center',       
  lyricsFontWeight: '600',         
  lyricsBorderRadius: 20,          
  lyricsOffset: -0.8,              

  alwaysOnTop: false,
  clickThrough: true,

  renderFps: 30, 
  sensitivity: 1.3,
  fftSmoothing: 0.82,
  barWidth: 6,
  barGap: 4,

  launchOnStartup: false,
  minimizeToTray: true,

  discordRpcEnabled: true,
  discordClientId: '1567377198237618186',

  autoPlayOnStartup: false,
  defaultStartupMode: 'playlist', 
  defaultPlaylistId: null,
  lastPlayedTrack: null,

  shuffle: false,
  repeatMode: 'all' 
};

class Store {
  constructor() {
    this.settings = this.load();
  }

  load() {
    let loadedSettings = null;

    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        loadedSettings = JSON.parse(data);
      }
    } catch (err) {
      console.warn('Không thể đọc cấu hình chính:', err.message);
    }

    if (!loadedSettings || Object.keys(loadedSettings).length === 0) {
      try {
        if (fs.existsSync(BACKUP_CONFIG_PATH)) {
          const backupData = fs.readFileSync(BACKUP_CONFIG_PATH, 'utf-8');
          loadedSettings = JSON.parse(backupData);
          console.log('Đã tự động khôi phục cấu hình từ bản sao lưu bền vững.');
        }
      } catch (backupErr) {
        console.warn('Không thể đọc cấu hình sao lưu:', backupErr.message);
      }
    }

    const merged = { ...DEFAULT_SETTINGS, ...(loadedSettings || {}) };

    if (merged.playerCardLeft !== undefined && merged.playerCardLeft >= 0 && !merged.playerCardPos) {
      merged.playerCardPos = {
        left: merged.playerCardLeft,
        top: merged.playerCardTop >= 0 ? merged.playerCardTop : null
      };
    }

    try {
      const jsonStr = JSON.stringify(merged, null, 2);
      fs.writeFileSync(CONFIG_PATH, jsonStr, 'utf-8');
      fs.writeFileSync(BACKUP_CONFIG_PATH, jsonStr, 'utf-8');
    } catch (e) {}

    return merged;
  }

  save(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      const jsonStr = JSON.stringify(this.settings, null, 2);
      fs.writeFileSync(CONFIG_PATH, jsonStr, 'utf-8');
      try {
        fs.writeFileSync(BACKUP_CONFIG_PATH, jsonStr, 'utf-8');
      } catch (e) {}
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
