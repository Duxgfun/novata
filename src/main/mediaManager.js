
const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const EventEmitter = require('events');
const { app } = require('electron');

class MediaManager extends EventEmitter {
  constructor() {
    super();
    let p = path.join(__dirname, 'scripts', 'mediaServer.ps1');
    if (app && app.isPackaged) {
      p = p.replace('app.asar', 'app.asar.unpacked');
    }
    this.scriptPath = p;

    this.currentMedia = {
      Active: false,
      Title: 'Novata đang lắng nghe',
      Artist: 'Phát nhạc trên Spotify, YouTube hoặc SoundCloud...',
      Album: '',
      Source: 'System Audio',
      Status: 'Stopped',
      Repeat: 'None',
      Shuffle: false
    };

    this.childProcess = null;
    this.rl = null;
    this.commandQueue = [];
    this.isReady = false;
    this.pollingTimer = null;

    this.initProcess();
  }

  initProcess() {
    try {
      this.childProcess = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        this.scriptPath
      ], {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'ignore']
      });

      this.rl = readline.createInterface({
        input: this.childProcess.stdout,
        terminal: false
      });

      this.rl.on('line', (line) => {
        const trimmed = line.trim();
        if (trimmed === 'READY') {
          this.isReady = true;
          this.processQueue();
          return;
        }

        if (this.commandQueue.length > 0) {
          const req = this.commandQueue.shift();
          try {
            const data = JSON.parse(trimmed);
            req.resolve(data);
          } catch (e) {
            req.resolve({ success: false, raw: trimmed });
          }
        }
      });

      this.childProcess.on('exit', () => {
        this.childProcess = null;
        this.isReady = false;
      });

      this.childProcess.on('error', () => {
        this.childProcess = null;
        this.isReady = false;
      });
    } catch (err) {
      console.error('Không thể khởi tạo PowerShell Media Worker:', err);
    }
  }

  sendCommand(action = 'get') {
    return new Promise((resolve, reject) => {
      if (!this.childProcess) {
        this.initProcess();
      }

      this.commandQueue.push({ action, resolve, reject });
      if (this.isReady) {
        this.processQueue();
      }

      setTimeout(() => {
        const idx = this.commandQueue.findIndex(q => q.action === action);
        if (idx !== -1) {
          const timedOut = this.commandQueue.splice(idx, 1)[0];
          timedOut.resolve({ success: false, timeout: true });
        }
      }, 3000);
    });
  }

  processQueue() {
    if (!this.childProcess || !this.childProcess.stdin.writable || this.commandQueue.length === 0) return;
    const nextCmd = this.commandQueue[0];
    try {
      this.childProcess.stdin.write(nextCmd.action + '\n');
    } catch (err) {
      this.initProcess();
    }
  }

  startMonitoring() {
    if (this.pollingTimer) return;

    let idleCycles = 0;
    const poll = async () => {
      await this.queryMediaState();
      const isPlaying = this.currentMedia.Status && this.currentMedia.Status.toLowerCase().includes('play');
      if (!isPlaying) {
        idleCycles++;
        if (idleCycles % 4 === 0) {
          this.sendCommand('trim').catch(() => {});
        }
      } else {
        idleCycles = 0;
      }
      const nextDelay = isPlaying ? 2500 : 6000; 
      this.pollingTimer = setTimeout(poll, nextDelay);
    };

    this.pollingTimer = setTimeout(poll, 1500);
  }

  stopMonitoring() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.childProcess) {
      try {
        this.childProcess.stdin.write('exit\n');
        this.childProcess.kill();
      } catch (e) {}
      this.childProcess = null;
    }
  }

  async queryMediaState() {
    try {
      const info = await this.sendCommand('get');
      if (info && info.Title && (
        info.Title !== this.currentMedia.Title ||
        info.Status !== this.currentMedia.Status ||
        info.Artist !== this.currentMedia.Artist
      )) {
        this.currentMedia = { ...this.currentMedia, ...info };
        this.emit('media-changed', this.currentMedia);
      }
    } catch (err) {
    }
  }

  async sendAction(action) {
    try {
      const res = await this.sendCommand(action);
      setTimeout(() => this.queryMediaState(), 300);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  getCurrentMedia() {
    return this.currentMedia;
  }
}

module.exports = new MediaManager();
