
class AudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });

    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.mediaStream = null;

    this.fftSize = 128; 
    this.frequencyData = new Uint8Array(this.fftSize / 2);

    this.targetFps = 30; 
    this.wavePointsY = new Float32Array(128);
    this.waveLUT = [];
    this.barsLUT = [];
    this.cachedInnerColor = null;
    this.cachedBorderColor = null;
    this.cachedBarsColor = null;
    this.cachedInnerGlassGrad = null;
    this.cachedBarsGlassGrad = null;

    this.visualizerMode = 'bars';

    this.barsMaterial = 'solid';
    this.customColor = '#ffffff';
    this.waveformOpacity = 1.00;
    this.barsGlassOpacity = 0.28;
    this.barsGlassBlur = 10;

    this.waveBorderMaterial = 'solid';
    this.waveBorderColor = '#ef4444';
    this.waveBorderOpacity = 1.00;
    this.waveBorderWidth = 3.0;
    this.waveBorderGlassOpacity = 0.70;
    this.waveBorderGlassBlur = 6;

    this.waveInnerMaterial = 'solid';
    this.waveInnerColor = '#f97316';
    this.waveInnerOpacity = 1.00;
    this.waveInnerGlassOpacity = 0.25;
    this.waveInnerGlassBlur = 12;

    this.waveMaterial = 'solid';
    this.waveGlassOpacity = 0.28;
    this.waveGlassBlur = 10;

    this.direction = 'bottom';
    this.sensitivity = 1.3;
    this.barWidth = 6;
    this.barGap = 4;
    this.spectrumHeight = 160;
    this.fftSmoothing = 0.82;

    this.isRunning = false;
    this.isSleeping = false;
    this.isDemoMode = false;
    this.demoPhase = 0;
    this.silentFrameCount = 0;
    this.lastFrameTime = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const isTop = this.direction === 'top';
    const canvasH = Math.min(window.innerHeight * 0.85, Math.max(120, (this.spectrumHeight || 160) + 40));

    this.canvas.width = window.innerWidth;
    this.canvas.height = canvasH;
    this.width = window.innerWidth;
    this.height = canvasH;

    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0px';
    this.canvas.style.width = '100%';
    this.canvas.style.height = `${canvasH}px`;
    if (isTop) {
      this.canvas.style.top = '0px';
      this.canvas.style.bottom = 'auto';
    } else {
      this.canvas.style.top = 'auto';
      this.canvas.style.bottom = '0px';
    }

    this.cachedInnerGlassGrad = null;
    this.cachedBarsGlassGrad = null;
    this.rebuildWaveLUT();
    this.rebuildBarsLUT();
  }

  rebuildWaveLUT() {
    const numPoints = Math.max(36, Math.min(64, Math.floor(this.width / 30)));
    const step = this.width / (numPoints - 1);
    const centerX = this.width / 2;
    const maxBin = Math.min(this.frequencyData.length - 1, 60);

    this.waveLUT = [];
    for (let i = 0; i < numPoints; i++) {
      const x = i * step;
      const distFromCenter = Math.abs(x - centerX);
      const t = Math.min(1.0, distFromCenter / (centerX || 1));
      const floatIndex = Math.pow(t, 1.35) * maxBin;
      const i0 = Math.floor(floatIndex);
      const i1 = Math.min(this.frequencyData.length - 1, i0 + 1);
      const frac = floatIndex - i0;
      const boost = 1.0 + Math.pow(t, 1.2) * 1.6;
      this.waveLUT.push({ x, i0, i1, frac, boost });
    }

    if (this.wavePointsY.length < numPoints) {
      this.wavePointsY = new Float32Array(numPoints);
    }
  }

  rebuildBarsLUT() {
    const barPitch = this.barWidth + this.barGap;
    const centerX = this.width / 2;
    const halfBars = Math.floor(centerX / barPitch);
    const maxBin = Math.min(this.frequencyData.length - 1, 60);

    this.barsLUT = [];
    for (let k = 0; k < halfBars; k++) {
      const t = k / halfBars;
      const floatIndex = Math.pow(t, 1.35) * maxBin;
      const i0 = Math.floor(floatIndex);
      const i1 = Math.min(this.frequencyData.length - 1, i0 + 1);
      const frac = floatIndex - i0;
      const boost = 1.0 + Math.pow(t, 1.2) * 1.6;
      const xRight = centerX + k * barPitch;
      const xLeft = centerX - (k + 1) * barPitch;
      this.barsLUT.push({ i0, i1, frac, boost, xRight, xLeft });
    }
  }

  pauseSystemAudio() {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
    }
  }

  resumeSystemAudio() {
    if (this.sourceNode && this.analyser) {
      try {
        this.sourceNode.connect(this.analyser);
      } catch (e) {}
    }
  }

  clearVisualizerArea() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  async initAudio(sourceType = 'system') {
    try {
      if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume().catch(() => {});
        }
      } else {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx({ latencyHint: 'playback' });
      }

      this.setupAnalyser();

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

          stream.getVideoTracks().forEach(track => {
            try {
              track.stop();
            } catch (e) {}
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
      console.warn('Lỗi khởi tạo AudioContext:', err);
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
    this.isSleeping = false;
    this.silentFrameCount = 0;
    this.lastFrameTime = performance.now();
    this.renderLoop();
  }

  stop() {
    this.isRunning = false;
    this.isSleeping = false;
  }

  wake() {
    if (this.isSleeping) {
      this.isSleeping = false;
      this.silentFrameCount = 0;
      this.lastFrameTime = performance.now();
      if (this.isRunning) {
        requestAnimationFrame((t) => this.renderLoop(t));
      }
    }
  }

  pollAudioWake() {
    if (!this.isRunning || !this.isSleeping) return;

    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);

      let maxEnergy = 0;
      let energySum = 0;
      for (let i = 2; i < 36; i++) {
        const val = this.frequencyData[i];
        energySum += val;
        if (val > maxEnergy) maxEnergy = val;
      }

      if (maxEnergy < 8 && energySum < 45) {
        setTimeout(() => this.pollAudioWake(), 350);
        return;
      }
    }

    this.isSleeping = false;
    this.silentFrameCount = 0;
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  renderLoop(timestamp) {
    if (!this.isRunning || this.isSleeping) return;

    const now = timestamp || performance.now();

    const targetFps = this.targetFps || 30;
    const targetInterval = 1000 / targetFps;
    const elapsed = now - this.lastFrameTime;

    if (elapsed < targetInterval) {
      const delay = Math.max(3, Math.floor((targetInterval - elapsed) * 0.75));
      setTimeout(() => {
        if (this.isRunning && !this.isSleeping) {
          requestAnimationFrame((t) => this.renderLoop(t));
        }
      }, delay);
      return;
    }
    this.lastFrameTime = now - (elapsed % targetInterval);

    if (this.isDemoMode) {
      this.clearVisualizerArea();
      this.generateDemoData();
      if (this.visualizerMode === 'wave') {
        this.drawWave();
      } else {
        this.drawBars();
      }
      requestAnimationFrame((t) => this.renderLoop(t));
      return;
    }

    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);

      let maxEnergy = 0;
      let energySum = 0;
      for (let i = 2; i < 36; i++) {
        const val = this.frequencyData[i];
        energySum += val;
        if (val > maxEnergy) maxEnergy = val;
      }

      if (maxEnergy < 8 && energySum < 45) {
        this.silentFrameCount++;
      } else {
        this.silentFrameCount = 0;
      }
    } else {
      this.silentFrameCount++;
    }

    if (this.silentFrameCount > 12) {
      this.clearVisualizerArea();
      this.isSleeping = true;
      setTimeout(() => this.pollAudioWake(), 350);
      return;
    }

    this.clearVisualizerArea();

    if (this.visualizerMode === 'wave') {
      this.drawWave();
    } else {
      this.drawBars();
    }

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  updateSettings(settings) {
    this.cachedInnerColor = null;
    this.cachedBorderColor = null;
    this.cachedBarsColor = null;
    this.cachedInnerGlassGrad = null;
    this.cachedBarsGlassGrad = null;
    if (typeof settings.renderFps === 'number') {
      this.targetFps = Math.max(15, Math.min(60, settings.renderFps));
    }
    if (settings.visualizerMode) this.visualizerMode = settings.visualizerMode;
    if (settings.barsMaterial) this.barsMaterial = settings.barsMaterial;
    if (settings.customColor) this.customColor = settings.customColor;
    if (typeof settings.waveformOpacity === 'number') this.waveformOpacity = settings.waveformOpacity;
    if (typeof settings.barsGlassOpacity === 'number') this.barsGlassOpacity = settings.barsGlassOpacity;
    if (typeof settings.barsGlassBlur === 'number') this.barsGlassBlur = settings.barsGlassBlur;

    if (settings.waveBorderMaterial) this.waveBorderMaterial = settings.waveBorderMaterial;
    if (settings.waveBorderColor) this.waveBorderColor = settings.waveBorderColor;
    if (typeof settings.waveBorderOpacity === 'number') this.waveBorderOpacity = settings.waveBorderOpacity;
    if (typeof settings.waveBorderWidth === 'number') this.waveBorderWidth = settings.waveBorderWidth;
    if (typeof settings.waveBorderGlassOpacity === 'number') this.waveBorderGlassOpacity = settings.waveBorderGlassOpacity;
    if (typeof settings.waveBorderGlassBlur === 'number') this.waveBorderGlassBlur = settings.waveBorderGlassBlur;

    if (settings.waveInnerMaterial) this.waveInnerMaterial = settings.waveInnerMaterial;
    if (settings.waveInnerColor) this.waveInnerColor = settings.waveInnerColor;
    if (typeof settings.waveInnerOpacity === 'number') this.waveInnerOpacity = settings.waveInnerOpacity;
    if (typeof settings.waveInnerGlassOpacity === 'number') this.waveInnerGlassOpacity = settings.waveInnerGlassOpacity;
    if (typeof settings.waveInnerGlassBlur === 'number') this.waveInnerGlassBlur = settings.waveInnerGlassBlur;

    if (settings.waveMaterial) {
      this.waveMaterial = settings.waveMaterial;
      if (!settings.waveBorderMaterial) this.waveBorderMaterial = settings.waveMaterial;
      if (!settings.waveInnerMaterial) this.waveInnerMaterial = settings.waveMaterial;
    }
    if (typeof settings.waveGlassOpacity === 'number') {
      this.waveGlassOpacity = settings.waveGlassOpacity;
      if (typeof settings.barsGlassOpacity !== 'number') this.barsGlassOpacity = settings.waveGlassOpacity;
    }
    if (typeof settings.waveGlassBlur === 'number') {
      this.waveGlassBlur = settings.waveGlassBlur;
      if (typeof settings.barsGlassBlur !== 'number') this.barsGlassBlur = settings.waveGlassBlur;
    }

    let needsResize = false;
    let needsBarsLut = false;
    if (settings.spectrumDirection && settings.spectrumDirection !== this.direction) {
      this.direction = settings.spectrumDirection;
      needsResize = true;
    }
    if (settings.sensitivity) this.sensitivity = settings.sensitivity;
    if (settings.barWidth && settings.barWidth !== this.barWidth) {
      this.barWidth = settings.barWidth;
      needsBarsLut = true;
    }
    if (settings.barGap && settings.barGap !== this.barGap) {
      this.barGap = settings.barGap;
      needsBarsLut = true;
    }
    if (typeof settings.spectrumHeight === 'number' && settings.spectrumHeight !== this.spectrumHeight) {
      this.spectrumHeight = settings.spectrumHeight;
      needsResize = true;
    }

    if (needsResize) {
      this.resizeCanvas();
    } else if (needsBarsLut) {
      this.rebuildBarsLUT();
    }

    if (settings.fftSmoothing && this.analyser) {
      this.fftSmoothing = settings.fftSmoothing;
      this.analyser.smoothingTimeConstant = this.fftSmoothing;
    }
  }

  hexToRgba(hexStr, alpha = 1.0, brightness = 1.0) {
    if (hexStr && hexStr.startsWith('#')) {
      let hex = hexStr.replace('#', '').trim();
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length === 6) {
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        if (brightness !== 1.0) {
          r = Math.min(255, Math.round(r * brightness));
          g = Math.min(255, Math.round(g * brightness));
          b = Math.min(255, Math.round(b * brightness));
        }
        return `rgba(${r}, ${g}, ${b}, ${Math.min(1.0, Math.max(0, alpha))})`;
      }
    }
    return `rgba(255, 255, 255, ${Math.min(1.0, Math.max(0, alpha))})`;
  }

  getDirectColor(alpha = 1, brightness = 1.0) {
    return this.hexToRgba(this.customColor, alpha, brightness);
  }

  getColorStyle(alpha = 1) {
    const finalAlpha = Math.min(1, Math.max(0, alpha * (this.waveformOpacity !== undefined ? this.waveformOpacity : 0.9)));
    return this.getDirectColor(finalAlpha);
  }

  generateIdleData() {
    this.demoPhase += 0.03;
    const len = this.frequencyData.length;
    for (let i = 0; i < len; i++) {
      const idleWave = Math.sin(this.demoPhase + i * 0.15) * 8;
      const v = Math.max(3, 14 * Math.exp(-i / 18) + idleWave);
      this.frequencyData[i] = Math.min(255, Math.max(0, v));
    }
  }

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

  getFrequencySample(t) {
    const maxBin = Math.min(this.frequencyData.length - 1, 65);
    const floatIndex = Math.pow(Math.max(0, Math.min(1, t)), 1.35) * maxBin;
    const i0 = Math.floor(floatIndex);
    const i1 = Math.min(this.frequencyData.length - 1, i0 + 1);
    const frac = floatIndex - i0;

    const v0 = this.frequencyData[i0] || 0;
    const v1 = this.frequencyData[i1] || 0;
    const rawVal = v0 + (v1 - v0) * frac;

    const boost = 1.0 + Math.pow(t, 1.2) * 1.6;
    return rawVal * this.sensitivity * boost;
  }

  drawBars() {
    const isTop = this.direction === 'top';
    const maxHeight = Math.min(this.height * 0.85, this.spectrumHeight || 160);
    const isGlass = (this.barsMaterial || this.waveMaterial) === 'glass';

    if (!this.barsLUT || this.barsLUT.length === 0) {
      this.rebuildBarsLUT();
    }

    const rx = Math.min(this.barWidth / 2, 4);
    const len = this.barsLUT.length;

    this.ctx.beginPath();
    for (let k = 0; k < len; k++) {
      const p = this.barsLUT[k];
      const v0 = this.frequencyData[p.i0] || 0;
      const v1 = this.frequencyData[p.i1] || 0;
      const rawVal = v0 + (v1 - v0) * p.frac;
      const val = rawVal * this.sensitivity * p.boost;
      const normalizedRatio = Math.min(1.0, Math.max(0, val / 255));
      const barHeight = Math.max(3, normalizedRatio * maxHeight);

      if (isTop) {
        this.ctx.roundRect(p.xRight, 0, this.barWidth, barHeight, rx);
        this.ctx.roundRect(p.xLeft, 0, this.barWidth, barHeight, rx);
      } else {
        const y = this.height - barHeight;
        this.ctx.roundRect(p.xRight, y, this.barWidth, barHeight, rx);
        this.ctx.roundRect(p.xLeft, y, this.barWidth, barHeight, rx);
      }
    }

    if (isGlass) {
      if (!this.cachedBarsGlassGrad) {
        const glassAlpha = Math.min(1.0, Math.max(0.04, this.barsGlassOpacity !== undefined ? this.barsGlassOpacity : (this.waveGlassOpacity || 0.28)));
        const grad = this.ctx.createLinearGradient(0, isTop ? 0 : this.height - maxHeight, 0, isTop ? maxHeight : this.height);
        grad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, glassAlpha * 1.5)})`);
        grad.addColorStop(0.5, `rgba(240, 240, 250, ${glassAlpha * 0.85})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${glassAlpha * 0.35})`);
        this.cachedBarsGlassGrad = grad;
      }
      this.ctx.fillStyle = this.cachedBarsGlassGrad;
      this.ctx.fill();
    } else {
      if (!this.cachedBarsColor) {
        const solidAlpha = Math.min(1.0, Math.max(0.05, this.waveformOpacity !== undefined ? this.waveformOpacity : 1.0));
        this.cachedBarsColor = this.hexToRgba(this.customColor || '#ffffff', solidAlpha);
      }
      this.ctx.fillStyle = this.cachedBarsColor;
      this.ctx.fill();
    }
  }

  drawWave() {
    const isTop = this.direction === 'top';
    const maxHeight = Math.min(this.height * 0.90, this.spectrumHeight || 160);
    const baselineY = isTop ? 0 : this.height;

    if (!this.waveLUT || this.waveLUT.length === 0) {
      this.rebuildWaveLUT();
    }

    const len = this.waveLUT.length;
    if (this.wavePointsY.length < len) {
      this.wavePointsY = new Float32Array(len);
    }

    for (let i = 0; i < len; i++) {
      const p = this.waveLUT[i];
      const v0 = this.frequencyData[p.i0] || 0;
      const v1 = this.frequencyData[p.i1] || 0;
      const rawVal = v0 + (v1 - v0) * p.frac;
      const val = rawVal * this.sensitivity * p.boost;
      const normalizedRatio = Math.min(1.0, Math.max(0, val / 255));
      const amp = Math.max(2, normalizedRatio * maxHeight);

      this.wavePointsY[i] = isTop ? amp : (this.height - amp);
    }

    this.ctx.beginPath();
    this.ctx.moveTo(0, baselineY);
    this.ctx.lineTo(this.waveLUT[0].x, this.wavePointsY[0]);
    for (let i = 0; i < len - 1; i++) {
      const mx = (this.waveLUT[i].x + this.waveLUT[i + 1].x) * 0.5;
      const my = (this.wavePointsY[i] + this.wavePointsY[i + 1]) * 0.5;
      this.ctx.quadraticCurveTo(this.waveLUT[i].x, this.wavePointsY[i], mx, my);
    }
    this.ctx.lineTo(this.waveLUT[len - 1].x, this.wavePointsY[len - 1]);
    this.ctx.lineTo(this.width, baselineY);
    this.ctx.closePath();

    const isInnerGlass = (this.waveInnerMaterial || this.waveMaterial) === 'glass';

    if (isInnerGlass) {
      if (!this.cachedInnerGlassGrad) {
        const gAlpha = Math.min(1.0, Math.max(0.02, typeof this.waveInnerGlassOpacity === 'number' ? this.waveInnerGlassOpacity : 0.25));
        const grad = this.ctx.createLinearGradient(0, isTop ? 0 : this.height - maxHeight, 0, baselineY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${gAlpha * 1.35})`);
        grad.addColorStop(0.4, `rgba(240, 240, 245, ${gAlpha * 0.80})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${gAlpha * 0.15})`);
        this.cachedInnerGlassGrad = grad;
      }
      this.ctx.fillStyle = this.cachedInnerGlassGrad;
      this.ctx.fill();
    } else {
      if (!this.cachedInnerColor) {
        const innerColor = this.waveInnerColor || '#f97316';
        const innerOpacity = typeof this.waveInnerOpacity === 'number' ? this.waveInnerOpacity : 1.0;
        this.cachedInnerColor = this.hexToRgba(innerColor, innerOpacity);
      }
      this.ctx.fillStyle = this.cachedInnerColor;
      this.ctx.fill();
    }

    this.ctx.beginPath();
    this.ctx.moveTo(this.waveLUT[0].x, this.wavePointsY[0]);
    for (let i = 0; i < len - 1; i++) {
      const mx = (this.waveLUT[i].x + this.waveLUT[i + 1].x) * 0.5;
      const my = (this.wavePointsY[i] + this.wavePointsY[i + 1]) * 0.5;
      this.ctx.quadraticCurveTo(this.waveLUT[i].x, this.wavePointsY[i], mx, my);
    }
    this.ctx.lineTo(this.waveLUT[len - 1].x, this.wavePointsY[len - 1]);

    const bWidth = typeof this.waveBorderWidth === 'number' ? this.waveBorderWidth : 3.0;
    const isBorderGlass = (this.waveBorderMaterial || this.waveMaterial) === 'glass';

    if (isBorderGlass) {
      const rimAlpha = Math.min(1.0, Math.max(0.1, typeof this.waveBorderGlassOpacity === 'number' ? this.waveBorderGlassOpacity : 0.70));
      this.ctx.save();
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${rimAlpha})`;
      this.ctx.lineWidth = bWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'miter';
      this.ctx.miterLimit = 2;
      this.ctx.stroke();
      this.ctx.restore();
    } else {
      if (!this.cachedBorderColor) {
        const borderColor = this.waveBorderColor || '#ef4444';
        const borderOpacity = typeof this.waveBorderOpacity === 'number' ? this.waveBorderOpacity : 1.0;
        this.cachedBorderColor = this.hexToRgba(borderColor, borderOpacity);
      }
      this.ctx.strokeStyle = this.cachedBorderColor;
      this.ctx.lineWidth = bWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'miter';
      this.ctx.miterLimit = 2;
      this.ctx.stroke();
    }
  }
}

window.AudioVisualizer = AudioVisualizer;
