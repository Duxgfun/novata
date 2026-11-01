/**
 * LOGIC HOAT DONG TOAN DIEN CUA NOVATA WEB PREVIEW & LANDING (NVT_0.1)
 * - Giao dien Landing Page voi 2 nut: Download for Windows va Web Preview
 * - Chuyen doi muot ma sang Desktop Simulator Windows 11
 * - Dung chinh xac 100% ngon ngu, text va tinh nang tu ban goc ung dung
 * - Khong co nav bar o dinh man hinh
 * - Scrollbar toi mau dong bo theo he thong
 * - Ket noi HTML5 Audio truc tiep Web Audio API de song am nhay thoi gian thuc
 * - 3 bai hat demo chat luong cao co dinh (Synthwave, Lofi, Electronic Rave)
 */

// ==========================================================================
// CAU HINH LINK GITHUB REPOSITORY CUA DU AN (NGUOI DUNG THAY LINK O DAY)
// ==========================================================================
const GITHUB_REPO_URL = 'https://github.com/Duxgfun/novata';

// ==========================================================================
// DANH SACH 3 BAI HAT DEMO CO DINH CHAT LUONG CAO
// ==========================================================================
const FIXED_TRACKS = [
  {
    id: 'track-1',
    title: '80s Synthwave Vibe',
    artist: 'Retro Wave Chill',
    duration: '2:42',
    durationSec: 162,
    src: './assets/audio/synthwave_80s.mp3',
    cover: './assets/covers/synthwave.svg',
    genre: 'synthwave 80s electronic chill retro'
  },
  {
    id: 'track-2',
    title: 'Lofi Chill Study Beats',
    artist: 'Lofi Girl & Chillhop Records',
    duration: '3:02',
    durationSec: 182,
    src: './assets/audio/lofi_chill.mp3',
    cover: './assets/covers/lofi.svg',
    genre: 'lofi chill beats study relaxing instrumental'
  },
  {
    id: 'track-3',
    title: 'Electronic Rave Digger',
    artist: 'EDM Visual Club',
    duration: '3:30',
    durationSec: 210,
    src: './assets/audio/electronic_rave.mp3',
    cover: './assets/covers/rave.svg',
    genre: 'electronic rave edm club dance upbeat'
  }
];

// ==========================================================================
// CLASS AUDIO VISUALIZER: THUAT TOAN VE SONG AM DONG BO VOI APP GOC
// ==========================================================================
class WebAudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: true });

    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;

    this.fftSize = 256;
    this.frequencyData = new Uint8Array(this.fftSize / 2);

    // Cau hinh mac dinh tu store.js cua app goc
    this.customColor = '#ffffff';
    this.waveformOpacity = 0.90;
    this.direction = 'bottom';
    this.sensitivity = 1.3;
    this.barWidth = 6;
    this.barGap = 4;
    this.spectrumHeight = 160;
    this.fftSmoothing = 0.82;

    this.isRunning = false;
    this.demoPhase = 0;
    this.silentFrameCount = 0;
    this.lastFrameTime = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - 48; // Tru di thanh taskbar
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  initAudioWithElement(audioElement) {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx({ latencyHint: 'playback' });

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.fftSmoothing;

      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } catch (err) {
      console.warn('Web Audio Source warning:', err);
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

  // Vong lap ve song am (Render Loop) - 60 FPS khi phat, 30 FPS khi idle
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

    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData);

      let energySum = 0;
      for (let i = 0; i < 30; i++) {
        energySum += this.frequencyData[i];
      }

      if (energySum < 8) {
        this.silentFrameCount++;
        if (this.silentFrameCount > 30) {
          this.generateIdleData();
        }
      } else {
        this.silentFrameCount = 0;
      }
    } else {
      this.generateIdleData();
    }

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

  generateIdleData() {
    this.demoPhase += 0.03;
    const len = this.frequencyData.length;
    for (let i = 0; i < len; i++) {
      const idleWave = Math.sin(this.demoPhase + i * 0.15) * 8;
      const v = Math.max(3, 14 * Math.exp(-i / 18) + idleWave);
      this.frequencyData[i] = Math.min(255, Math.max(0, v));
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
    const barPitch = this.barWidth + this.barGap;
    const rx = this.barWidth / 2;
    const maxHeight = Math.min(this.height * 0.85, this.spectrumHeight || 160);

    this.ctx.fillStyle = this.getColorStyle(0.92);

    const centerX = this.width / 2;
    const halfBars = Math.floor(centerX / barPitch);

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
        if (typeof this.ctx.roundRect === 'function') {
          this.ctx.roundRect(xRight, 0, this.barWidth, barHeight, [0, 0, currentRx, currentRx]);
          this.ctx.roundRect(xLeft, 0, this.barWidth, barHeight, [0, 0, currentRx, currentRx]);
        } else {
          this.ctx.rect(xRight, 0, this.barWidth, barHeight);
          this.ctx.rect(xLeft, 0, this.barWidth, barHeight);
        }
      } else {
        const y = this.height - barHeight;
        if (typeof this.ctx.roundRect === 'function') {
          this.ctx.roundRect(xRight, y, this.barWidth, barHeight, [currentRx, currentRx, 0, 0]);
          this.ctx.roundRect(xLeft, y, this.barWidth, barHeight, [currentRx, currentRx, 0, 0]);
        } else {
          this.ctx.rect(xRight, y, this.barWidth, barHeight);
          this.ctx.rect(xLeft, y, this.barWidth, barHeight);
        }
      }
    }
    this.ctx.fill();
  }
}

// ==========================================================================
// KHOI DONG TOAN BO LOGIC UNG DUNG
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Dong bo toan bo link GitHub
  const downloadLinks = document.querySelectorAll('a[href*="github.com"]');
  downloadLinks.forEach(link => {
    link.href = GITHUB_REPO_URL;
  });

  // 2. Chuyen doi giua Landing Page va Desktop Simulator
  const landingPage = document.getElementById('landing-page');
  const desktopSimulator = document.getElementById('desktop-simulator');
  const btnLaunchPreview = document.getElementById('btn-launch-preview');
  const btnExitPreview = document.getElementById('btn-exit-preview');

  function openPreviewSimulator() {
    landingPage.classList.add('hidden');
    desktopSimulator.classList.remove('hidden');
    visualizer.resizeCanvas();
    ensureAudioInitialized();
  }

  function exitPreviewSimulator() {
    desktopSimulator.classList.add('hidden');
    landingPage.classList.remove('hidden');
  }

  if (btnLaunchPreview) btnLaunchPreview.addEventListener('click', openPreviewSimulator);
  if (btnExitPreview) btnExitPreview.addEventListener('click', exitPreviewSimulator);

  // 3. Khoi tao Audio va Visualizer
  const audioEl = document.getElementById('inapp-audio-player');
  const visualizer = new WebAudioVisualizer('visualizer-canvas');
  visualizer.start();

  let audioInitialized = false;
  function ensureAudioInitialized() {
    if (!audioInitialized) {
      visualizer.initAudioWithElement(audioEl);
      audioInitialized = true;
    }
    if (visualizer.audioContext && visualizer.audioContext.state === 'suspended') {
      visualizer.audioContext.resume();
    }
  }

  // 4. Trang thai phat nhac & Settings
  let currentTrackIndex = 0;
  let isPlaying = false;
  let isShuffle = false;
  let isRepeat = false;

  let appSettings = {
    customColor: '#ffffff',
    waveformOpacity: 0.90,
    spectrumDirection: 'bottom',
    spectrumHeight: 160,
    barWidth: 6,
    barGap: 4,
    sensitivity: 1.3,
    fftSmoothing: 0.82,
    showMediaCard: true,
    playerCardPos: null
  };

  // 5. Tham chieu DOM
  const playerCard = document.getElementById('player-card');
  const trackTitle = document.getElementById('track-title');
  const trackArtist = document.getElementById('track-artist');
  const trackTime = document.getElementById('track-time');
  const albumDisc = document.getElementById('album-disc');
  const albumIcon = document.getElementById('album-icon');
  const albumThumb = document.getElementById('album-thumb');
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const btnShuffle = document.getElementById('btn-shuffle');
  const btnPrev = document.getElementById('btn-prev');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playPauseIcon = document.getElementById('play-pause-icon');
  const btnNext = document.getElementById('btn-next');
  const btnRepeat = document.getElementById('btn-repeat');
  const btnEditPosition = document.getElementById('btn-edit-position');
  const btnConfirmPosition = document.getElementById('btn-confirm-position');
  const dragHint = document.getElementById('drag-hint');
  const btnOpenSearch = document.getElementById('btn-open-search');
  const btnOpenSettings = document.getElementById('btn-open-settings');

  const settingsWindow = document.getElementById('settings-window');
  const windowTitlebar = document.getElementById('window-titlebar');
  const btnMinWindow = document.getElementById('btn-min-window');
  const btnMaxWindow = document.getElementById('btn-max-window');
  const btnCloseWindow = document.getElementById('btn-close-window');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  const musicSearchInput = document.getElementById('music-search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const btnSubmitSearch = document.getElementById('btn-submit-search');
  const tagChips = document.querySelectorAll('.tag-chip');
  const searchStatusText = document.getElementById('search-status-text');
  const resultsCountBadge = document.getElementById('results-count-badge');
  const musicResultsList = document.getElementById('music-results-list');
  const miniPlayerThumb = document.getElementById('mini-player-thumb');
  const miniTitle = document.getElementById('mini-title');
  const miniArtist = document.getElementById('mini-artist');
  const miniBtnPrev = document.getElementById('mini-btn-prev');
  const miniBtnPlay = document.getElementById('mini-btn-play');
  const miniPlayIcon = document.getElementById('mini-play-icon');
  const miniBtnNext = document.getElementById('mini-btn-next');
  const miniTimeDisplay = document.getElementById('mini-time-display');

  const taskbarNovataBtn = document.getElementById('taskbar-novata-btn');
  const btnStartMenu = document.getElementById('btn-start-menu');
  const startMenuPopup = document.getElementById('start-menu-popup');
  const trayNovataIcon = document.getElementById('tray-novata-icon');
  const trayContextMenu = document.getElementById('tray-context-menu');
  const desktopContextMenu = document.getElementById('desktop-context-menu');
  const trayTimeDisplay = document.getElementById('tray-time-display');
  const trayDateDisplay = document.getElementById('tray-date-display');
  const trayShowDesktop = document.getElementById('tray-show-desktop');

  // ==========================================================================
  // 6. DIEU KHIEN PHAT NHAC VA DONG BO
  // ==========================================================================
  function loadTrack(index, autoPlay = true) {
    if (index < 0) index = FIXED_TRACKS.length - 1;
    if (index >= FIXED_TRACKS.length) index = 0;
    currentTrackIndex = index;

    const track = FIXED_TRACKS[currentTrackIndex];
    audioEl.src = track.src;

    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackTime.textContent = `0:00 / ${track.duration}`;
    progressFill.style.width = '0%';

    albumThumb.src = track.cover;
    albumThumb.classList.remove('hidden');
    albumIcon.classList.add('hidden');

    miniTitle.textContent = track.title;
    miniArtist.textContent = track.artist;
    miniPlayerThumb.src = track.cover;
    miniTimeDisplay.textContent = `0:00 / ${track.duration}`;

    highlightActiveTrackInList();

    if (autoPlay) {
      ensureAudioInitialized();
      audioEl.play().then(() => {
        setPlayState(true);
      }).catch(() => {});
    }
  }

  function setPlayState(playing) {
    isPlaying = playing;
    if (playing) {
      playPauseIcon.className = 'bi bi-pause-fill';
      miniPlayIcon.className = 'bi bi-pause-fill';
      albumThumb.classList.remove('paused');
      albumIcon.classList.add('active');
      document.getElementById('tray-play-icon').className = 'bi bi-pause-fill';
    } else {
      playPauseIcon.className = 'bi bi-play-fill';
      miniPlayIcon.className = 'bi bi-play-fill';
      albumThumb.classList.add('paused');
      albumIcon.classList.remove('active');
      document.getElementById('tray-play-icon').className = 'bi bi-play-fill';
    }
  }

  function togglePlayPause() {
    ensureAudioInitialized();
    if (audioEl.paused) {
      audioEl.play().then(() => {
        setPlayState(true);
      }).catch(() => {});
    } else {
      audioEl.pause();
      setPlayState(false);
    }
  }

  function playNextTrack() {
    if (isShuffle) {
      let randIndex = Math.floor(Math.random() * FIXED_TRACKS.length);
      if (randIndex === currentTrackIndex && FIXED_TRACKS.length > 1) {
        randIndex = (randIndex + 1) % FIXED_TRACKS.length;
      }
      loadTrack(randIndex, true);
    } else {
      loadTrack(currentTrackIndex + 1, true);
    }
  }

  function playPrevTrack() {
    loadTrack(currentTrackIndex - 1, true);
  }

  audioEl.addEventListener('timeupdate', () => {
    if (!audioEl.duration) return;
    const cur = audioEl.currentTime;
    const dur = audioEl.duration;
    const percent = Math.min(100, (cur / dur) * 100);

    progressFill.style.width = `${percent}%`;

    const curFormatted = formatTime(cur);
    const durFormatted = formatTime(dur);
    trackTime.textContent = `${curFormatted} / ${durFormatted}`;
    miniTimeDisplay.textContent = `${curFormatted} / ${durFormatted}`;
  });

  audioEl.addEventListener('play', () => setPlayState(true));
  audioEl.addEventListener('pause', () => setPlayState(false));
  audioEl.addEventListener('ended', () => {
    if (isRepeat) {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
    } else {
      playNextTrack();
    }
  });

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, clickX / rect.width));
    if (audioEl.duration) {
      audioEl.currentTime = percent * audioEl.duration;
    }
  });

  btnPlayPause.addEventListener('click', togglePlayPause);
  miniBtnPlay.addEventListener('click', togglePlayPause);
  btnNext.addEventListener('click', playNextTrack);
  miniBtnNext.addEventListener('click', playNextTrack);
  btnPrev.addEventListener('click', playPrevTrack);
  miniBtnPrev.addEventListener('click', playPrevTrack);

  btnShuffle.addEventListener('click', () => {
    isShuffle = !isShuffle;
    btnShuffle.classList.toggle('active', isShuffle);
  });

  btnRepeat.addEventListener('click', () => {
    isRepeat = !isRepeat;
    btnRepeat.classList.toggle('active', isRepeat);
    document.getElementById('repeat-icon').className = isRepeat ? 'bi bi-repeat-1' : 'bi bi-repeat';
  });

  // ==========================================================================
  // 7. DANH SACH BAI HAT & LOC TIM KIEM (TAB MUSIC PLAYER)
  // ==========================================================================
  function renderTracksList(tracksToDisplay) {
    musicResultsList.innerHTML = '';

    if (!tracksToDisplay || tracksToDisplay.length === 0) {
      musicResultsList.innerHTML = `
        <div style="text-align:center; padding: 24px; color: var(--text-dim); font-size: 12px;">
          <i class="bi bi-music-note-slash" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
          <span>No tracks found. Try different search terms.</span>
        </div>
      `;
      return;
    }

    tracksToDisplay.forEach((track) => {
      const originalIndex = FIXED_TRACKS.findIndex(t => t.id === track.id);
      const isCurrentPlaying = (originalIndex === currentTrackIndex && isPlaying);

      const card = document.createElement('div');
      card.className = `music-track-item ${originalIndex === currentTrackIndex ? 'playing' : ''}`;
      card.setAttribute('data-id', track.id);

      card.innerHTML = `
        <div class="track-item-left">
          <img src="${track.cover}" class="track-thumb" alt="${track.title}">
          <div class="track-info">
            <div class="track-title">${track.title}</div>
            <div class="track-artist">${track.artist}</div>
          </div>
        </div>
        <div class="track-item-right">
          <span class="track-duration-text">${track.duration}</span>
          <button class="btn-play-track" title="Play Track">
            <i class="bi ${isCurrentPlaying ? 'bi-pause-fill' : 'bi-play-fill'}"></i>
          </button>
        </div>
      `;

      const playBtn = card.querySelector('.btn-play-track');
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (originalIndex === currentTrackIndex) {
          togglePlayPause();
        } else {
          loadTrack(originalIndex, true);
        }
      });

      card.addEventListener('dblclick', () => {
        loadTrack(originalIndex, true);
      });

      musicResultsList.appendChild(card);
    });
  }

  function highlightActiveTrackInList() {
    const items = document.querySelectorAll('.music-track-item');
    items.forEach((item) => {
      const id = item.getAttribute('data-id');
      const track = FIXED_TRACKS[currentTrackIndex];
      if (track && id === track.id) {
        item.classList.add('playing');
        const icon = item.querySelector('.btn-play-track i');
        if (icon) icon.className = isPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill';
      } else {
        item.classList.remove('playing');
        const icon = item.querySelector('.btn-play-track i');
        if (icon) icon.className = 'bi bi-play-fill';
      }
    });
  }

  function filterMusic(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q || q === 'all') {
      searchStatusText.textContent = 'Trending recommendations';
      resultsCountBadge.textContent = '3 tracks ready';
      renderTracksList(FIXED_TRACKS);
      return;
    }

    searchStatusText.textContent = `Searching for "${query}"...`;
    resultsCountBadge.textContent = 'Loading';

    setTimeout(() => {
      const filtered = FIXED_TRACKS.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
      );

      searchStatusText.textContent = `Results for "${query}"`;
      resultsCountBadge.textContent = `${filtered.length} track${filtered.length > 1 ? 's' : ''}`;
      renderTracksList(filtered);
    }, 180);
  }

  musicSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') filterMusic(musicSearchInput.value);
  });

  btnSubmitSearch.addEventListener('click', () => filterMusic(musicSearchInput.value));

  musicSearchInput.addEventListener('input', () => {
    if (musicSearchInput.value.length > 0) {
      btnClearSearch.classList.remove('hidden');
    } else {
      btnClearSearch.classList.add('hidden');
      filterMusic('');
    }
  });

  btnClearSearch.addEventListener('click', () => {
    musicSearchInput.value = '';
    btnClearSearch.classList.add('hidden');
    filterMusic('');
    musicSearchInput.focus();
  });

  tagChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      musicSearchInput.value = (q === 'all') ? '' : q;
      if (musicSearchInput.value.length > 0) {
        btnClearSearch.classList.remove('hidden');
      } else {
        btnClearSearch.classList.add('hidden');
      }
      filterMusic(q);
    });
  });

  // ==========================================================================
  // 8. KEO THA THE GLASS UI (DRAGGABLE EDIT POSITION)
  // ==========================================================================
  let isEditMode = false;
  let isDraggingCard = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let cardInitialLeft = 0;
  let cardInitialTop = 0;

  btnEditPosition.addEventListener('click', (e) => {
    e.stopPropagation();
    isEditMode = true;
    btnEditPosition.classList.add('hidden');
    btnConfirmPosition.classList.remove('hidden');
    dragHint.classList.remove('hidden');
    playerCard.classList.add('in-edit-mode');
  });

  btnConfirmPosition.addEventListener('click', (e) => {
    e.stopPropagation();
    isEditMode = false;
    isDraggingCard = false;
    btnConfirmPosition.classList.add('hidden');
    btnEditPosition.classList.remove('hidden');
    dragHint.classList.add('hidden');
    playerCard.classList.remove('in-edit-mode');

    appSettings.playerCardPos = {
      left: playerCard.offsetLeft,
      top: playerCard.offsetTop
    };
  });

  playerCard.addEventListener('mousedown', (e) => {
    if (!isEditMode) return;
    if (e.target.closest('#btn-confirm-position')) return;

    isDraggingCard = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    cardInitialLeft = playerCard.offsetLeft;
    cardInitialTop = playerCard.offsetTop;
    playerCard.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingCard) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    let targetLeft = cardInitialLeft + deltaX;
    let targetTop = cardInitialTop + deltaY;

    targetLeft = Math.max(10, Math.min(window.innerWidth - playerCard.offsetWidth - 10, targetLeft));
    targetTop = Math.max(20, Math.min(window.innerHeight - playerCard.offsetHeight - 58, targetTop));

    playerCard.style.left = targetLeft + 'px';
    playerCard.style.top = targetTop + 'px';
    playerCard.style.bottom = 'auto';
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingCard) {
      isDraggingCard = false;
      playerCard.classList.remove('dragging');
    }
  });

  document.getElementById('btn-reset-player-pos').addEventListener('click', () => {
    playerCard.style.left = '28px';
    playerCard.style.bottom = '68px';
    playerCard.style.top = 'auto';
    appSettings.playerCardPos = null;
  });

  // ==========================================================================
  // 9. CUA SO CAI DAT: KEO THA, CHUYEN TAB, AN / HIEN
  // ==========================================================================
  let isWindowDragging = false;
  let winStartX = 0;
  let winStartY = 0;
  let winInitLeft = 0;
  let winInitTop = 0;

  windowTitlebar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.window-actions')) return;
    if (settingsWindow.classList.contains('window-maximized')) return;

    isWindowDragging = true;
    winStartX = e.clientX;
    winStartY = e.clientY;

    const rect = settingsWindow.getBoundingClientRect();
    winInitLeft = rect.left;
    winInitTop = rect.top;

    settingsWindow.style.transform = 'none';
    settingsWindow.style.left = winInitLeft + 'px';
    settingsWindow.style.top = winInitTop + 'px';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isWindowDragging) return;

    const deltaX = e.clientX - winStartX;
    const deltaY = e.clientY - winStartY;

    let targetLeft = winInitLeft + deltaX;
    let targetTop = winInitTop + deltaY;

    targetLeft = Math.max(0, Math.min(window.innerWidth - settingsWindow.offsetWidth, targetLeft));
    targetTop = Math.max(0, Math.min(window.innerHeight - settingsWindow.offsetHeight - 48, targetTop));

    settingsWindow.style.left = targetLeft + 'px';
    settingsWindow.style.top = targetTop + 'px';
  });

  window.addEventListener('mouseup', () => {
    isWindowDragging = false;
  });

  btnCloseWindow.addEventListener('click', () => {
    settingsWindow.classList.add('hidden');
    taskbarNovataBtn.classList.remove('active-running');
  });

  btnMinWindow.addEventListener('click', () => {
    settingsWindow.classList.add('window-minimized');
  });

  btnMaxWindow.addEventListener('click', () => {
    settingsWindow.classList.toggle('window-maximized');
  });

  function openSettingsWindow(targetTab = null) {
    settingsWindow.classList.remove('hidden');
    settingsWindow.classList.remove('window-minimized');
    taskbarNovataBtn.classList.add('active-running');
    if (targetTab) {
      switchTab(targetTab);
    }
  }

  function toggleSettingsWindow() {
    if (settingsWindow.classList.contains('hidden')) {
      openSettingsWindow();
    } else if (settingsWindow.classList.contains('window-minimized')) {
      settingsWindow.classList.remove('window-minimized');
    } else {
      settingsWindow.classList.add('window-minimized');
    }
  }

  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  btnOpenSearch.addEventListener('click', () => {
    openSettingsWindow('tab-music-search');
    musicSearchInput.focus();
  });

  btnOpenSettings.addEventListener('click', () => {
    openSettingsWindow('tab-appearance');
  });

  document.getElementById('icon-open-novata').addEventListener('click', () => {
    openSettingsWindow();
  });

  taskbarNovataBtn.addEventListener('click', toggleSettingsWindow);

  // ==========================================================================
  // 10. TAB APPEARANCE: DONG BO LIVE PARAMETERS
  // ==========================================================================
  function bindLiveSlider(sliderId, labelId, propertyName, unit = '', isPercent = false) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (!slider || !label) return;

    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (isPercent) {
        label.textContent = `${Math.round(val * 100)}${unit}`;
      } else {
        label.textContent = `${val}${unit}`;
      }
      appSettings[propertyName] = val;
      visualizer.updateSettings(appSettings);
    });
  }

  bindLiveSlider('range-waveform-opacity', 'val-waveform-opacity', 'waveformOpacity', '%', true);
  bindLiveSlider('range-spectrum-height', 'val-spectrum-height', 'spectrumHeight', 'px');
  bindLiveSlider('range-bar-width', 'val-bar-width', 'barWidth', 'px');
  bindLiveSlider('range-bar-gap', 'val-bar-gap', 'barGap', 'px');
  bindLiveSlider('range-sensitivity', 'val-sensitivity', 'sensitivity', 'x');
  bindLiveSlider('range-smoothing', 'val-smoothing', 'fftSmoothing', '');

  const dirChoices = document.querySelectorAll('.mono-choice-card[data-direction]');
  dirChoices.forEach(card => {
    card.addEventListener('click', () => {
      dirChoices.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const dir = card.getAttribute('data-direction');
      appSettings.spectrumDirection = dir;
      visualizer.updateSettings(appSettings);

      const canvas = document.getElementById('visualizer-canvas');
      if (dir === 'top') {
        canvas.classList.add('dir-top');
      } else {
        canvas.classList.remove('dir-top');
      }
    });
  });

  const checkShowCard = document.getElementById('check-show-media-card');
  checkShowCard.addEventListener('change', (e) => {
    appSettings.showMediaCard = e.target.checked;
    playerCard.classList.toggle('hidden', !appSettings.showMediaCard);
  });

  const quickSwatches = document.querySelectorAll('.swatch-btn[data-color]');
  quickSwatches.forEach(btn => {
    btn.addEventListener('click', () => {
      applyWaveformColor(btn.getAttribute('data-color'));
    });
  });

  function applyWaveformColor(hexColor) {
    const clean = hexColor.toUpperCase();
    appSettings.customColor = clean;
    visualizer.updateSettings(appSettings);

    const currSwatch = document.getElementById('curr-swatch-display');
    const currHex = document.getElementById('curr-hex-display');
    if (currSwatch) currSwatch.style.background = clean;
    if (currHex) currHex.textContent = clean;
  }

  // ==========================================================================
  // 11. MODAL CHINH MAU (COLOR MODAL)
  // ==========================================================================
  const colorModal = document.getElementById('color-modal');
  const btnTriggerModal = document.getElementById('btn-trigger-color-modal');
  const btnCloseModal = document.getElementById('btn-close-color-modal');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalApply = document.getElementById('btn-modal-apply');
  const modalSwatchBox = document.getElementById('modal-swatch-box');
  const modalNativePicker = document.getElementById('modal-native-color-picker');
  const modalHexInput = document.getElementById('modal-hex-input');
  const modalBtnPick = document.getElementById('modal-btn-pick');
  const modalRangeOpacity = document.getElementById('modal-range-opacity');
  const modalOpacityVal = document.getElementById('modal-opacity-val');

  let tempModalColor = '#FFFFFF';
  let tempModalOpacity = 0.90;

  function openColorModal() {
    tempModalColor = appSettings.customColor || '#FFFFFF';
    tempModalOpacity = appSettings.waveformOpacity !== undefined ? appSettings.waveformOpacity : 0.90;

    modalSwatchBox.style.background = tempModalColor;
    modalNativePicker.value = tempModalColor;
    modalHexInput.value = tempModalColor.replace('#', '');
    modalRangeOpacity.value = tempModalOpacity;
    modalOpacityVal.textContent = `${Math.round(tempModalOpacity * 100)}%`;

    colorModal.classList.remove('hidden');
  }

  function closeColorModal() {
    colorModal.classList.add('hidden');
  }

  btnTriggerModal.addEventListener('click', openColorModal);
  btnCloseModal.addEventListener('click', closeColorModal);
  btnModalCancel.addEventListener('click', closeColorModal);

  modalNativePicker.addEventListener('input', (e) => {
    tempModalColor = e.target.value.toUpperCase();
    modalSwatchBox.style.background = tempModalColor;
    modalHexInput.value = tempModalColor.replace('#', '');
  });

  modalHexInput.addEventListener('input', (e) => {
    let clean = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    e.target.value = clean.toUpperCase();
    if (clean.length === 6) {
      tempModalColor = '#' + clean.toUpperCase();
      modalSwatchBox.style.background = tempModalColor;
      modalNativePicker.value = tempModalColor;
    }
  });

  modalRangeOpacity.addEventListener('input', (e) => {
    tempModalOpacity = parseFloat(e.target.value);
    modalOpacityVal.textContent = `${Math.round(tempModalOpacity * 100)}%`;
  });

  const paletteSwatches = document.querySelectorAll('.palette-swatch[data-hex]');
  paletteSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      const hex = swatch.getAttribute('data-hex').toUpperCase();
      tempModalColor = hex;
      modalSwatchBox.style.background = hex;
      modalNativePicker.value = hex;
      modalHexInput.value = hex.replace('#', '');
    });
  });

  if (modalBtnPick) {
    modalBtnPick.addEventListener('click', async () => {
      if ('EyeDropper' in window) {
        try {
          const eyeDropper = new window.EyeDropper();
          const res = await eyeDropper.open();
          if (res && res.sRGBHex) {
            tempModalColor = res.sRGBHex.toUpperCase();
            modalSwatchBox.style.background = tempModalColor;
            modalNativePicker.value = tempModalColor;
            modalHexInput.value = tempModalColor.replace('#', '');
          }
        } catch (e) {}
      } else {
        modalNativePicker.click();
      }
    });
  }

  btnModalApply.addEventListener('click', () => {
    applyWaveformColor(tempModalColor);
    appSettings.waveformOpacity = tempModalOpacity;
    visualizer.updateSettings(appSettings);

    const rangeWaveOpacity = document.getElementById('range-waveform-opacity');
    const valWaveOpacity = document.getElementById('val-waveform-opacity');
    if (rangeWaveOpacity) rangeWaveOpacity.value = tempModalOpacity;
    if (valWaveOpacity) valWaveOpacity.textContent = `${Math.round(tempModalOpacity * 100)}%`;

    closeColorModal();
  });

  // ==========================================================================
  // 12. TASKBAR & SYSTEM TRAY & START MENU
  // ==========================================================================
  let trayClickTimeout = null;

  trayNovataIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    if (trayClickTimeout) {
      clearTimeout(trayClickTimeout);
      trayClickTimeout = null;
      openSettingsWindow();
    } else {
      trayClickTimeout = setTimeout(() => {
        trayClickTimeout = null;
        playerCard.classList.toggle('hidden');
        checkShowCard.checked = !playerCard.classList.contains('hidden');
      }, 250);
    }
  });

  trayNovataIcon.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPopups();
    trayContextMenu.style.bottom = '56px';
    trayContextMenu.style.right = '10px';
    trayContextMenu.classList.remove('hidden');
  });

  document.getElementById('tray-item-playpause').addEventListener('click', () => {
    togglePlayPause();
    trayContextMenu.classList.add('hidden');
  });

  document.getElementById('tray-item-next').addEventListener('click', () => {
    playNextTrack();
    trayContextMenu.classList.add('hidden');
  });

  document.getElementById('tray-item-toggle-card').addEventListener('click', () => {
    playerCard.classList.toggle('hidden');
    checkShowCard.checked = !playerCard.classList.contains('hidden');
    trayContextMenu.classList.add('hidden');
  });

  document.getElementById('tray-item-open-settings').addEventListener('click', () => {
    openSettingsWindow();
    trayContextMenu.classList.add('hidden');
  });

  btnStartMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllPopups(startMenuPopup);
    startMenuPopup.classList.toggle('hidden');
  });

  document.getElementById('start-item-novata').addEventListener('click', () => {
    openSettingsWindow();
    startMenuPopup.classList.add('hidden');
  });

  document.getElementById('start-item-settings').addEventListener('click', () => {
    openSettingsWindow('tab-appearance');
    startMenuPopup.classList.add('hidden');
  });

  document.getElementById('start-btn-restart').addEventListener('click', () => {
    location.reload();
  });

  document.getElementById('desktop-simulator').addEventListener('contextmenu', (e) => {
    if (e.target.closest('#settings-window') || e.target.closest('#player-card') || e.target.closest('#fake-taskbar')) {
      return;
    }
    e.preventDefault();
    closeAllPopups();
    desktopContextMenu.style.top = Math.min(window.innerHeight - 180, e.clientY) + 'px';
    desktopContextMenu.style.left = Math.min(window.innerWidth - 200, e.clientX) + 'px';
    desktopContextMenu.classList.remove('hidden');
  });

  document.getElementById('ctx-open-novata').addEventListener('click', () => {
    openSettingsWindow();
    desktopContextMenu.classList.add('hidden');
  });

  document.getElementById('ctx-toggle-card').addEventListener('click', () => {
    playerCard.classList.toggle('hidden');
    checkShowCard.checked = !playerCard.classList.contains('hidden');
    desktopContextMenu.classList.add('hidden');
  });

  document.getElementById('ctx-next-wallpaper').addEventListener('click', () => {
    const list = ['bloom_dark', 'cyberpunk', 'minimal_obsidian', 'aurora'];
    const curWp = (document.getElementById('desktop-wallpaper').className.match(/wp-([a-z_]+)/) || [])[1] || 'bloom_dark';
    const nextWp = list[(list.indexOf(curWp) + 1) % list.length];
    document.getElementById('desktop-wallpaper').className = `desktop-wallpaper-layer wp-${nextWp}`;
    desktopContextMenu.classList.add('hidden');
  });

  trayShowDesktop.addEventListener('click', () => {
    settingsWindow.classList.add('window-minimized');
  });

  function closeAllPopups(exceptEl = null) {
    if (exceptEl !== startMenuPopup) startMenuPopup.classList.add('hidden');
    if (exceptEl !== trayContextMenu) trayContextMenu.classList.add('hidden');
    if (exceptEl !== desktopContextMenu) desktopContextMenu.classList.add('hidden');
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#start-menu-popup') && !e.target.closest('#btn-start-menu')) startMenuPopup.classList.add('hidden');
    if (!e.target.closest('#tray-context-menu') && !e.target.closest('#tray-novata-icon')) trayContextMenu.classList.add('hidden');
    if (!e.target.closest('#desktop-context-menu')) desktopContextMenu.classList.add('hidden');
  });

  // ==========================================================================
  // 13. DONG HO TRAY
  // ==========================================================================
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    trayTimeDisplay.textContent = `${hours}:${minutes}`;
    trayDateDisplay.textContent = `${day}/${month}/${year}`;
  }

  setInterval(updateClock, 1000);
  updateClock();

  // Khoi tao ban dau
  renderTracksList(FIXED_TRACKS);
  loadTrack(0, false);
});
