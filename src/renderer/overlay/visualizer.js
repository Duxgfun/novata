/**
 * Bộ dựng sóng âm thanh Visualizer - Phiên bản nvt_0.4 beta
 * - Hỗ trợ 2 chế độ hiển thị: Thanh phổ dọc ('bars') và Dạng sóng liên tục ('wave')
 * - Dạng sóng gồm 2 phần riêng biệt: Bên trong (phần thân) và Viền (chỉ tính viền trên cùng)
 * - Hỗ trợ 2 dạng chất liệu (Material): Solid Color (màu đơn sắc) và Glass (kính trong suốt)
 * - Glass có thể chỉnh độ trong (opacity) và độ mờ (blur), tuyệt đối không màu, trong suốt thuần khiết
 * - Luôn tỏa đối xứng từ tâm màn hình sang hai bên (Centered Symmetrical)
 * - Hoàn toàn không có hộp nền, 100% trong suốt
 * - Bình luận bằng tiếng Việt theo quy định toàn cục.
 */

class AudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });

    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.mediaStream = null;

    this.fftSize = 128; // 64 dai tan so chuan (giam 50% thoi gian tinh FFT cua Web Audio)
    this.frequencyData = new Uint8Array(this.fftSize / 2);

    // Cấu hình tần số quét FPS và tối ưu hóa bộ nhớ
    this.targetFps = 30; // 30 FPS mặc định (tiết kiệm CPU ~3-5% khi phát nhạc)
    this.wavePointsY = new Float32Array(128);
    this.waveLUT = [];
    this.barsLUT = [];
    this.cachedInnerColor = null;
    this.cachedBorderColor = null;
    this.cachedBarsColor = null;
    this.cachedInnerGlassGrad = null;
    this.cachedBarsGlassGrad = null;

    // Cấu hình chế độ hiển thị: 'bars' (dạng cột) hoặc 'wave' (dạng sóng)
    this.visualizerMode = 'bars';

    // 1. Cấu hình chất liệu cho dạng cột (Bars): 'solid' hoặc 'glass'
    this.barsMaterial = 'solid';
    this.customColor = '#ffffff';
    this.waveformOpacity = 1.00;
    this.barsGlassOpacity = 0.28;
    this.barsGlassBlur = 10;

    // 2. Cấu hình Dạng sóng (Continuous Wave): Gồm 2 phần độc lập, mỗi phần có tùy chọn Solid / Glass riêng
    // 2a. Phần viền trên cùng (Top Crest Border - như màu đỏ trong hình vẽ)
    this.waveBorderMaterial = 'solid';
    this.waveBorderColor = '#ef4444';
    this.waveBorderOpacity = 1.00;
    this.waveBorderWidth = 3.0;
    this.waveBorderGlassOpacity = 0.70;
    this.waveBorderGlassBlur = 6;

    // 2b. Phần thân bên trong (Wave Inner Body - như màu cam trong hình vẽ)
    this.waveInnerMaterial = 'solid';
    this.waveInnerColor = '#f97316';
    this.waveInnerOpacity = 1.00;
    this.waveInnerGlassOpacity = 0.25;
    this.waveInnerGlassBlur = 12;

    // Tương thích ngược
    this.waveMaterial = 'solid';
    this.waveGlassOpacity = 0.28;
    this.waveGlassBlur = 10;

    // Hướng mọc của sóng: 'bottom' (từ đáy màn hình lên trên) hoặc 'top'
    this.direction = 'bottom';
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

  // Tiền tính toán bảng tra cứu (LUT) cho dạng sóng Wave để loại bỏ 100% Math.pow
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

  // Tiền tính toán bảng tra cứu (LUT) cho dạng cột Bars để loại bỏ 100% Math.pow
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

  // Tạm ngắt nguồn âm thanh loopback hệ thống khi ứng dụng đang phát nhạc nội bộ (tránh trùng lặp và giảm tải)
  pauseSystemAudio() {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
    }
  }

  // Kết nối lại nguồn âm thanh loopback hệ thống khi nhạc nội bộ tạm dừng hoặc kết thúc
  resumeSystemAudio() {
    if (this.sourceNode && this.analyser) {
      try {
        this.sourceNode.connect(this.analyser);
      } catch (e) {}
    }
  }

  // Xóa vùng vẽ của sóng âm (chỉ bằng chiều cao dải sóng thay vì toàn màn hình 1080p/4K)
  clearVisualizerArea() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // Khởi tạo Web Audio context và kết nối nguồn âm thanh loopback
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

      // Thu thập âm thanh loopback từ hệ thống Windows (Spotify, YouTube, Browser...)
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

          // Dừng ngay lập tức track video để giải phóng triệt để Desktop Duplication DXGI (tiết kiệm 150%+ GPU/CPU)
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
    this.renderLoop();
  }

  stop() {
    this.isRunning = false;
  }

  // Vòng lặp vẽ sóng âm tối ưu CPU (Nhịp thời gian kiểm soát tốc độ FPS & Ngủ đông khi im lặng)
  renderLoop(timestamp) {
    if (!this.isRunning) return;

    const now = timestamp || performance.now();

    // 1. Kiểm soát tần số quét FPS chính xác: Tự động cho CPU nghỉ bằng setTimeout thay vì quay cuồng ở 144Hz/240Hz
    const targetFps = this.targetFps || 30;
    const targetInterval = 1000 / targetFps;
    const elapsed = now - this.lastFrameTime;

    if (elapsed < targetInterval) {
      const delay = Math.max(3, Math.floor((targetInterval - elapsed) * 0.75));
      setTimeout(() => {
        if (this.isRunning) {
          requestAnimationFrame((t) => this.renderLoop(t));
        }
      }, delay);
      return;
    }
    this.lastFrameTime = now - (elapsed % targetInterval);

    // 2. Chế độ Demo
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

    // 3. Phân tích dữ liệu âm thanh Web Audio (CHỈ chạy đúng nhịp khi vẽ frame)
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);

      let energySum = 0;
      for (let i = 0; i < 24; i++) {
        energySum += this.frequencyData[i];
      }

      if (energySum < 8) {
        this.silentFrameCount++;
      } else {
        this.silentFrameCount = 0;
      }
    } else {
      this.silentFrameCount++;
    }

    // 4. Khi im lặng kéo dài (> 20 frame ~ 0.6s), chuyển sang chế độ ngủ đông tiết kiệm CPU tuyệt đối
    if (this.silentFrameCount > 20) {
      if (this.silentFrameCount === 21) {
        this.clearVisualizerArea();
      }
      // Thăm dò năng lượng âm thanh với chu kỳ thấp 180ms, đưa CPU về mức 0.0%
      setTimeout(() => {
        if (this.isRunning) {
          requestAnimationFrame((t) => this.renderLoop(t));
        }
      }, 180);
      return;
    }

    // 5. Dựng hình frame hiện tại (Chỉ xóa và vẽ lại dải sóng âm cần thiết)
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

    // Viền trên cùng (Top Crest Border)
    if (settings.waveBorderMaterial) this.waveBorderMaterial = settings.waveBorderMaterial;
    if (settings.waveBorderColor) this.waveBorderColor = settings.waveBorderColor;
    if (typeof settings.waveBorderOpacity === 'number') this.waveBorderOpacity = settings.waveBorderOpacity;
    if (typeof settings.waveBorderWidth === 'number') this.waveBorderWidth = settings.waveBorderWidth;
    if (typeof settings.waveBorderGlassOpacity === 'number') this.waveBorderGlassOpacity = settings.waveBorderGlassOpacity;
    if (typeof settings.waveBorderGlassBlur === 'number') this.waveBorderGlassBlur = settings.waveBorderGlassBlur;

    // Thân bên trong (Wave Inner Body)
    if (settings.waveInnerMaterial) this.waveInnerMaterial = settings.waveInnerMaterial;
    if (settings.waveInnerColor) this.waveInnerColor = settings.waveInnerColor;
    if (typeof settings.waveInnerOpacity === 'number') this.waveInnerOpacity = settings.waveInnerOpacity;
    if (typeof settings.waveInnerGlassOpacity === 'number') this.waveInnerGlassOpacity = settings.waveInnerGlassOpacity;
    if (typeof settings.waveInnerGlassBlur === 'number') this.waveInnerGlassBlur = settings.waveInnerGlassBlur;

    // Tương thích ngược cấu hình cũ
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

  // Chuyển đổi mã Hex thành chuỗi RGBA kèm độ mờ alpha và độ sáng brightness
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

  // Tạo màu sắc RGBA thuần túy từ mã Hex, hệ số alpha và độ sáng brightness
  getDirectColor(alpha = 1, brightness = 1.0) {
    return this.hexToRgba(this.customColor, alpha, brightness);
  }

  // Tạo màu sắc RGBA từ mã Hex và hệ số opacity
  getColorStyle(alpha = 1) {
    const finalAlpha = Math.min(1, Math.max(0, alpha * (this.waveformOpacity !== undefined ? this.waveformOpacity : 0.9)));
    return this.getDirectColor(finalAlpha);
  }

  // Sóng dao động nhẹ khi không phát âm thanh
  generateIdleData() {
    this.demoPhase += 0.03;
    const len = this.frequencyData.length;
    for (let i = 0; i < len; i++) {
      const idleWave = Math.sin(this.demoPhase + i * 0.15) * 8;
      const v = Math.max(3, 14 * Math.exp(-i / 18) + idleWave);
      this.frequencyData[i] = Math.min(255, Math.max(0, v));
    }
  }

  // Dữ liệu mô phỏng demo
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

  // Lấy mẫu tần số phi tuyến tính (Logarithmic) tỏa từ giữa màn hình ra 2 bên
  getFrequencySample(t) {
    // t chạy từ 0 (chính giữa tâm màn hình) đến 1 (mép ngoài cùng)
    const maxBin = Math.min(this.frequencyData.length - 1, 65);
    const floatIndex = Math.pow(Math.max(0, Math.min(1, t)), 1.35) * maxBin;
    const i0 = Math.floor(floatIndex);
    const i1 = Math.min(this.frequencyData.length - 1, i0 + 1);
    const frac = floatIndex - i0;

    const v0 = this.frequencyData[i0] || 0;
    const v1 = this.frequencyData[i1] || 0;
    const rawVal = v0 + (v1 - v0) * frac;

    // Treble boost để 2 biên không bị bẹp phẳng
    const boost = 1.0 + Math.pow(t, 1.2) * 1.6;
    return rawVal * this.sensitivity * boost;
  }

  // 1. Chế độ vẽ dạng cột (Bars): Tỏa đối xứng từ tâm màn hình sang 2 bên (Sử dụng bảng tra cứu barsLUT và 0 cấp phát heap)
  drawBars() {
    const isTop = this.direction === 'top';
    const maxHeight = Math.min(this.height * 0.85, this.spectrumHeight || 160);
    const isGlass = (this.barsMaterial || this.waveMaterial) === 'glass';

    if (!this.barsLUT || this.barsLUT.length === 0) {
      this.rebuildBarsLUT();
    }

    const rx = Math.min(this.barWidth / 2, 4);
    const len = this.barsLUT.length;

    // Gom toàn bộ thanh phổ vào 1 Path duy nhất để tối ưu hiệu năng draw call
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
      // Chất liệu Glass: Tái sử dụng cached gradient để tránh cấp phát C++ SkShader mỗi frame
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
      // Chất liệu Solid Color: Sử dụng chuỗi màu đã cache sẵn để không phân tích regex mỗi frame
      if (!this.cachedBarsColor) {
        const solidAlpha = Math.min(1.0, Math.max(0.05, this.waveformOpacity !== undefined ? this.waveformOpacity : 1.0));
        this.cachedBarsColor = this.hexToRgba(this.customColor || '#ffffff', solidAlpha);
      }
      this.ctx.fillStyle = this.cachedBarsColor;
      this.ctx.fill();
    }
  }

  // 2. Chế độ vẽ dạng sóng liên tục (Wave): Gồm 2 phần độc lập (bên trong và viền trên cùng, 0 cấp phát bộ nhớ heap)
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

    // =========================================================================
    // PHẦN 1: BÊN TRONG CỦA DẠNG SÓNG (Inner Area Body) - Tùy chọn Solid / Glass riêng
    // =========================================================================
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
      // Tái sử dụng cached gradient để tránh cấp phát C++ SkShader mỗi frame
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
      // Chất liệu Solid Color cho bên trong: MÀU ĐẶC THUẦN TÚY (Lưu cache chuỗi RGBA không parse lại mỗi frame)
      if (!this.cachedInnerColor) {
        const innerColor = this.waveInnerColor || '#f97316';
        const innerOpacity = typeof this.waveInnerOpacity === 'number' ? this.waveInnerOpacity : 1.0;
        this.cachedInnerColor = this.hexToRgba(innerColor, innerOpacity);
      }
      this.ctx.fillStyle = this.cachedInnerColor;
      this.ctx.fill();
    }

    // =========================================================================
    // PHẦN 2: VIỀN CỦA DẠNG SÓNG (Top Crest Border) - Tùy chọn Solid / Glass riêng
    // =========================================================================
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
      // Viền kính thủy tinh: Đỉnh phản xạ ánh sáng (Rim reflection) thuần trắng trong suốt (không dùng shadowBlur CPU)
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
      // Viền Solid Color: Nổi bật sắc nét ở đường trên cùng (Lưu cache chuỗi RGBA)
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
