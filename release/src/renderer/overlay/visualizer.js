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

    this.fftSize = 256;
    this.frequencyData = new Uint8Array(this.fftSize / 2);
    this.timeDomainData = new Uint8Array(this.fftSize);

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
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
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

          // Vô hiệu hóa track hình ảnh nhưng không đóng capture session
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

  // Vòng lặp vẽ sóng âm - Giới hạn 60 FPS khi phát nhạc / 30 FPS khi im lặng để tiết kiệm CPU
  renderLoop(timestamp) {
    if (!this.isRunning) return;

    const now = timestamp || performance.now();
    const isIdle = this.silentFrameCount > 30;
    const targetInterval = isIdle ? 33.3 : 16.6;
    const elapsed = now - this.lastFrameTime;

    if (elapsed < targetInterval) {
      requestAnimationFrame((t) => this.renderLoop(t));
      return;
    }
    this.lastFrameTime = now - (elapsed % targetInterval);

    // Xóa sạch toàn bộ canvas mỗi frame để triệt tiêu bóng ma
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.isDemoMode) {
      this.generateDemoData();
    } else if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeDomainData);

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

    // Vẽ theo chế độ được cấu hình: Dạng cột ('bars') hoặc Dạng sóng ('wave')
    if (this.visualizerMode === 'wave') {
      this.drawWave();
    } else {
      this.drawBars();
    }

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  updateSettings(settings) {
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

  // 1. Chế độ vẽ dạng cột (Bars): Tỏa đối xứng từ tâm màn hình sang 2 bên
  drawBars() {
    const isTop = this.direction === 'top';
    const barPitch = this.barWidth + this.barGap;
    const rx = this.barWidth / 2;
    const maxHeight = Math.min(this.height * 0.85, this.spectrumHeight || 160);
    const isGlass = (this.barsMaterial || this.waveMaterial) === 'glass';

    const centerX = this.width / 2;
    const halfBars = Math.floor(centerX / barPitch);

    // Gom toàn bộ thanh phổ vào 1 Path duy nhất để tối ưu hiệu năng draw call
    this.ctx.beginPath();
    for (let k = 0; k < halfBars; k++) {
      const t = k / halfBars;
      const value = this.getFrequencySample(t);
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

    if (isGlass) {
      // Chất liệu Glass: Tuyệt đối không có màu, trong suốt, có độ trong và độ mờ
      const glassAlpha = Math.min(1.0, Math.max(0.04, this.barsGlassOpacity !== undefined ? this.barsGlassOpacity : (this.waveGlassOpacity || 0.28)));
      const blurVal = this.barsGlassBlur !== undefined ? this.barsGlassBlur : (this.waveGlassBlur || 10);
      this.ctx.save();
      if (blurVal > 0) {
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
        this.ctx.shadowBlur = Math.min(16, blurVal);
      }
      this.ctx.fillStyle = `rgba(255, 255, 255, ${glassAlpha})`;
      this.ctx.fill();
      this.ctx.restore();
    } else {
      // Chất liệu Solid Color: Sử dụng màu đặc thuần túy, đúng độ mờ người dùng cài đặt
      const solidAlpha = Math.min(1.0, Math.max(0.05, this.waveformOpacity !== undefined ? this.waveformOpacity : 1.0));
      this.ctx.fillStyle = this.hexToRgba(this.customColor || '#ffffff', solidAlpha);
      this.ctx.fill();
    }
  }

  // 2. Chế độ vẽ dạng sóng liên tục (Wave): Gồm 2 phần độc lập (bên trong và viền trên cùng)
  drawWave() {
    const isTop = this.direction === 'top';
    const maxHeight = Math.min(this.height * 0.85, this.spectrumHeight || 160);
    const centerX = this.width / 2;
    const baselineY = isTop ? 0 : this.height;

    // Số điểm lấy mẫu trên toàn bộ chiều rộng màn hình (mỗi ~8-10px lấy 1 điểm mượt mà)
    const numPoints = Math.max(80, Math.min(260, Math.floor(this.width / 8)));
    const step = this.width / (numPoints - 1);
    const points = [];

    for (let i = 0; i < numPoints; i++) {
      const x = i * step;
      const distFromCenter = Math.abs(x - centerX);
      const t = Math.min(1.0, distFromCenter / (centerX || 1));
      const value = this.getFrequencySample(t);
      const normalizedRatio = Math.min(1.0, Math.max(0, value / 255));
      const amp = Math.max(2, normalizedRatio * maxHeight);

      const y = isTop ? amp : (this.height - amp);
      points.push({ x, y });
    }

    // Hàm phụ trợ nối các điểm thành đường cong Bezier mượt mà dọc theo đỉnh sóng
    const addCrestBeziers = (ctx, pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    };

    // =========================================================================
    // PHẦN 1: BÊN TRONG CỦA DẠNG SÓNG (Inner Area Body) - Tùy chọn Solid / Glass riêng
    // Khép kín hoàn hảo: (0, baselineY) -> (0, y0) -> lượn sóng -> (width, yN) -> (width, baselineY) -> đáy
    // =========================================================================
    this.ctx.beginPath();
    this.ctx.moveTo(0, baselineY);
    this.ctx.lineTo(points[0].x, points[0].y);
    addCrestBeziers(this.ctx, points);
    this.ctx.lineTo(this.width, baselineY);
    this.ctx.closePath();

    const isInnerGlass = (this.waveInnerMaterial || this.waveMaterial) === 'glass';

    if (isInnerGlass) {
      // Chất liệu Glass cho bên trong: Tuyệt đối không màu, trong suốt, độ trong và độ mờ
      const gAlpha = Math.min(1.0, Math.max(0.02, typeof this.waveInnerGlassOpacity === 'number' ? this.waveInnerGlassOpacity : 0.25));
      this.ctx.save();
      const blurVal = typeof this.waveInnerGlassBlur === 'number' ? this.waveInnerGlassBlur : 12;
      if (blurVal > 0) {
        this.ctx.filter = `blur(${Math.min(20, blurVal)}px)`;
      }

      const grad = this.ctx.createLinearGradient(0, isTop ? 0 : this.height - maxHeight, 0, baselineY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${gAlpha * 1.15})`);
      grad.addColorStop(0.4, `rgba(240, 240, 245, ${gAlpha * 0.75})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${gAlpha * 0.20})`);

      this.ctx.fillStyle = grad;
      this.ctx.fill();
      this.ctx.restore();
    } else {
      // Chất liệu Solid Color cho bên trong: MÀU ĐẶC THUẦN TÚY (Che phủ hoàn toàn nền desktop như màu cam)
      const innerColor = this.waveInnerColor || '#f97316';
      const innerOpacity = typeof this.waveInnerOpacity === 'number' ? this.waveInnerOpacity : 1.0;
      this.ctx.fillStyle = this.hexToRgba(innerColor, innerOpacity);
      this.ctx.fill();
    }

    // =========================================================================
    // PHẦN 2: VIỀN CỦA DẠNG SÓNG (Top Crest Border) - Tùy chọn Solid / Glass riêng
    // CHỈ TÍNH VIỀN Ở BÊN TRÊN CÙNG
    // =========================================================================
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    addCrestBeziers(this.ctx, points);

    const bWidth = typeof this.waveBorderWidth === 'number' ? this.waveBorderWidth : 3.0;
    const isBorderGlass = (this.waveBorderMaterial || this.waveMaterial) === 'glass';

    if (isBorderGlass) {
      // Viền kính thủy tinh: Đỉnh phản xạ ánh sáng (Rim reflection) thuần trắng trong suốt
      const rimAlpha = Math.min(1.0, Math.max(0.1, typeof this.waveBorderGlassOpacity === 'number' ? this.waveBorderGlassOpacity : 0.70));
      this.ctx.save();
      const bBlur = typeof this.waveBorderGlassBlur === 'number' ? this.waveBorderGlassBlur : 6;
      if (bBlur > 0) {
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.75)';
        this.ctx.shadowBlur = Math.min(14, bBlur);
      }
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${rimAlpha})`;
      this.ctx.lineWidth = bWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
      this.ctx.restore();
    } else {
      // Viền Solid Color: Nổi bật sắc nét ở đường trên cùng (như màu đỏ viền)
      const borderColor = this.waveBorderColor || '#ef4444';
      const borderOpacity = typeof this.waveBorderOpacity === 'number' ? this.waveBorderOpacity : 1.0;
      this.ctx.strokeStyle = this.hexToRgba(borderColor, borderOpacity);
      this.ctx.lineWidth = bWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
    }
  }
}

window.AudioVisualizer = AudioVisualizer;
