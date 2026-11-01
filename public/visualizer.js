/**
 * Bo dung song am thanh Visualizer - Phien ban nvt_0.1 Thuan Den Trang (Monochrome)
 * - Mac dinh song toa doi xung tu tam man hinh sang hai ben (Centered Symmetrical)
 * - Hoan toan khong co hop nen (100% transparent background)
 * - Cac thanh pho doc don sac toi gian, dinh bo tron
 * - Ho tro mau Hex tuy chinh va do mo (Opacity)
 */

class AudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });

    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.mediaStream = null;

    this.fftSize = 256;
    this.frequencyData = new Uint8Array(this.fftSize / 2);
    this.timeDomainData = new Uint8Array(this.fftSize);

    // Cau hinh mau sac & hieu ung
    this.customColor = '#ffffff';
    this.waveformOpacity = 0.90;
    this.direction = 'bottom'; // 'bottom' (tu day len tren taskbar) hoac 'top'
    this.sensitivity = 1.3;
    this.barWidth = 6;
    this.barGap = 4;
    this.spectrumHeight = 160;
    this.fftSmoothing = 0.82;

    this.isRunning = false;
    this.isDemoMode = false;
    this.demoPhase = 0;
    this.silentFrameCount = 0;
    this.lastFrameTime = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  // Khoi tao Web Audio context va ket noi nguon am thanh
  async initAudio(sourceType = 'system') {
    try {
      if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      } else {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx({ latencyHint: 'playback' });
      }

      this.setupAnalyser();

      // Thu thu thap am thanh loopback tu he thong Windows (Spotify, YouTube, Browser...)
      if (sourceType === 'system' && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: {
              width: { max: 1 },
              height: { max: 1 },
              frameRate: { max: 1 },
              cursor: 'never'
            }
          });

          // An video stream nhung KHONG goi track.stop() de tranh Chromium dong toan bo capture session
          stream.getVideoTracks().forEach(track => {
            track.enabled = false;
          });

          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length > 0) {
            this.mediaStream = stream;
            this.sourceNode = this.audioContext.createMediaStreamSource(stream);
            this.sourceNode.connect(this.analyser);
            this.isDemoMode = false;
            return true;
          }
        } catch (displayErr) {
          console.warn('Loopback audio khong san sang:', displayErr.message);
        }
      }

      this.isDemoMode = false;
      return true;
    } catch (err) {
      console.warn('Loi khoi tao AudioContext:', err);
      this.isDemoMode = true;
      return false;
    }
  }

  setupAnalyser() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx({ latencyHint: 'playback' });
    }
    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.fftSmoothing;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.renderLoop();
  }

  stop() {
    this.isRunning = false;
  }

  // Vong lap ve song am Render Loop - Gioi han 60 FPS / 30 FPS khi idle de tiet kiem CPU toi da
  renderLoop(timestamp) {
    if (!this.isRunning) return;

    const now = timestamp || performance.now();
    const isIdle = this.silentFrameCount > 30;
    const targetInterval = isIdle ? 33.3 : 16.6; // 30 FPS khi idle, 60 FPS khi co nhac
    const elapsed = now - this.lastFrameTime;

    if (elapsed < targetInterval) {
      requestAnimationFrame((t) => this.renderLoop(t));
      return;
    }
    this.lastFrameTime = now - (elapsed % targetInterval);

    // Luon xoa sach toan bo canvas de triet tieu hoan toan bong ma song am lo lung
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.isDemoMode) {
      this.generateDemoData();
    } else if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeDomainData);

      // Kiem tra muc do am thanh: neu im lang, tao dao dong song nhe tu nhien
      let energySum = 0;
      for (let i = 0; i < 30; i++) {
        energySum += this.frequencyData[i];
      }

      if (energySum < 8) {
        this.silentFrameCount++;
        if (this.silentFrameCount > 60) {
          this.generateIdleData();
        }
      } else {
        this.silentFrameCount = 0;
      }
    }

    // Luon ve thanh pho doc toa tu tam man hinh sang hai ben
    this.drawBars();

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  updateSettings(settings) {
    if (settings.customColor) this.customColor = settings.customColor;
    if (typeof settings.waveformOpacity === 'number') this.waveformOpacity = settings.waveformOpacity;
    if (settings.spectrumDirection) this.direction = settings.spectrumDirection;
    if (settings.sensitivity) this.sensitivity = settings.sensitivity;
    if (settings.barWidth) this.barWidth = settings.barWidth;
    if (settings.barGap) this.barGap = settings.barGap;
    if (settings.spectrumHeight) this.spectrumHeight = settings.spectrumHeight;

    if (settings.fftSmoothing && this.analyser) {
      this.fftSmoothing = settings.fftSmoothing;
      this.analyser.smoothingTimeConstant = this.fftSmoothing;
    }
  }

  // Tao kieu mau sac tu ma Hex va he so do mo
  getColorStyle(alpha = 1) {
    const finalAlpha = Math.min(1, Math.max(0, alpha * (this.waveformOpacity !== undefined ? this.waveformOpacity : 0.9)));

    if (this.customColor && this.customColor.startsWith('#')) {
      let hex = this.customColor.replace('#', '').trim();
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          return `rgba(${r}, ${g}, ${b}, ${finalAlpha})`;
        }
      }
    }

    return `rgba(255, 255, 255, ${finalAlpha})`;
  }

  // Song dao dong cho khi khong co am thanh phat
  generateIdleData() {
    this.demoPhase += 0.03;
    const len = this.frequencyData.length;
    for (let i = 0; i < len; i++) {
      const idleWave = Math.sin(this.demoPhase + i * 0.15) * 8;
      const v = Math.max(3, 14 * Math.exp(-i / 18) + idleWave);
      this.frequencyData[i] = Math.min(255, Math.max(0, v));
    }
  }

  // Du lieu demo song dong
  generateDemoData() {
    this.demoPhase += 0.05;
    const len = this.frequencyData.length;
    for (let i = 0; i < len; i++) {
      const baseEnergy = Math.max(15, 220 * Math.exp(-i / 16));
      const wave1 = Math.sin(this.demoPhase * 1.5 + i * 0.2) * 45;
      const wave2 = Math.cos(this.demoPhase * 0.9 - i * 0.12) * 30;
      const v = baseEnergy + wave1 + wave2;
      this.frequencyData[i] = Math.min(255, Math.max(10, v));
    }
  }

  // Lay mau tan so phi tuyen tinh (Logarithmic) va tang cuong dai Treble bien ngoai
  getFrequencySample(t) {
    // t tu 0 (chinh giua tam man hinh) den 1 (mep man hinh)
    const maxBin = Math.min(this.frequencyData.length - 1, 65);
    const floatIndex = Math.pow(Math.max(0, Math.min(1, t)), 1.35) * maxBin;
    const i0 = Math.floor(floatIndex);
    const i1 = Math.min(this.frequencyData.length - 1, i0 + 1);
    const frac = floatIndex - i0;

    const v0 = this.frequencyData[i0] || 0;
    const v1 = this.frequencyData[i1] || 0;
    const rawVal = v0 + (v1 - v0) * frac;

    // Treble boost de 2 bien khong bi bet phang
    const boost = 1.0 + Math.pow(t, 1.2) * 1.6;
    return rawVal * this.sensitivity * boost;
  }

  // Ve cac thanh pho doc: Mac dinh bat dau tu tam man hinh toa deu sang hai ben
  drawBars() {
    const isTop = this.direction === 'top';
    const barPitch = this.barWidth + this.barGap;
    const rx = this.barWidth / 2;
    const maxHeight = Math.min(this.height * 0.85, this.spectrumHeight || 160);

    this.ctx.fillStyle = this.getColorStyle(0.92);

    const centerX = this.width / 2;
    const halfBars = Math.floor(centerX / barPitch);

    // Gom toan bo thanh pho vao duy nhat 1 Path va fill 1 lan de giam 99% GPU draw calls
    this.ctx.beginPath();
    for (let k = 0; k < halfBars; k++) {
      const t = k / halfBars;
      const value = this.getFrequencySample(t);
      // Gioi han chieu cao chuan hoa trong [0, 1] de thanh song khong vuot qua maxHeight
      const normalizedRatio = Math.min(1.0, Math.max(0, value / 255));
      const barHeight = Math.max(3, normalizedRatio * maxHeight);
      const currentRx = Math.min(rx, barHeight / 2);

      const xRight = centerX + k * barPitch;
      const xLeft = centerX - (k + 1) * barPitch;

      if (isTop) {
        this.ctx.roundRect(xRight, 0, this.barWidth, barHeight, [0, 0, currentRx, currentRx]);
        this.ctx.roundRect(xLeft, 0, this.barWidth, barHeight, [0, 0, currentRx, currentRx]);
      } else {
        const y = this.height - barHeight;
        this.ctx.roundRect(xRight, y, this.barWidth, barHeight, [currentRx, currentRx, 0, 0]);
        this.ctx.roundRect(xLeft, y, this.barWidth, barHeight, [currentRx, currentRx, 0, 0]);
      }
    }
    this.ctx.fill();
  }
}

window.AudioVisualizer = AudioVisualizer;
