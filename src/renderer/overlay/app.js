/**
 * Logic dieu khien giao dien Novata Overlay - Phien ban nvt_0.1
 * - Song am 100% trong suot khong hop nen, mac dinh xuyen chuot
 * - The dieu khien Glass UI co the keo tha vi tri (Draggable) va luu toa do
 * - Trinh phat nhac In-App ket noi truc tiep vao Web Audio API
 */

document.addEventListener('DOMContentLoaded', async () => {
  const visualizer = new AudioVisualizer('visualizer-canvas');

  const playerCard = document.getElementById('player-card');
  const trackTitle = document.getElementById('track-title');
  const trackArtist = document.getElementById('track-artist');
  const trackTime = document.getElementById('track-time');
  const albumDisc = document.getElementById('album-disc');
  const albumIcon = document.getElementById('album-icon');
  const albumThumb = document.getElementById('album-thumb');
  const sourceIcon = document.getElementById('source-icon');
  const playPauseIcon = document.getElementById('play-pause-icon');
  const repeatIcon = document.getElementById('repeat-icon');
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');

  const btnShuffle = document.getElementById('btn-shuffle');
  const btnPrev = document.getElementById('btn-prev');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnNext = document.getElementById('btn-next');
  const btnRepeat = document.getElementById('btn-repeat');
  const btnEditPosition = document.getElementById('btn-edit-position');
  const btnConfirmPosition = document.getElementById('btn-confirm-position');
  const dragHint = document.getElementById('drag-hint');
  const btnOpenSearch = document.getElementById('btn-open-search');
  const btnOpenSettings = document.getElementById('btn-open-settings');

  const audioEl = document.getElementById('inapp-audio-player');

  // Trang thai phat nhac In-App
  let currentInAppTrack = null;
  let inAppIsPlaying = false;
  let inAppCurrentTime = 0;
  let inAppDuration = 0;
  let inAppQueue = [];
  let inAppQueueIndex = 0;
  let inAppAudioConnected = false;

  // Trang thai keo tha the Glass UI (Edit Mode)
  let isEditMode = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let cardInitialLeft = 0;
  let cardInitialTop = 0;

  let currentSettings = {};

  try {
    currentSettings = await window.novata.getSettings();
    applySettings(currentSettings);
  } catch (err) {
    console.error('Loi khi tai cai dat:', err);
  }

  await visualizer.initAudio('system');
  visualizer.start();

  // Ket noi the Audio Element vao Web Audio Analyser de song am nhay truc tiep theo nhac
  function connectAudioToVisualizer() {
    if (inAppAudioConnected || !visualizer.audioContext) return;
    try {
      if (visualizer.audioContext.state === 'suspended') {
        visualizer.audioContext.resume();
      }
      const source = visualizer.audioContext.createMediaElementSource(audioEl);
      source.connect(visualizer.analyser);
      source.connect(visualizer.audioContext.destination);
      inAppAudioConnected = true;
    } catch (e) {
      console.warn('Loi ket noi Web Audio Node:', e.message);
    }
  }

  window.novata.onSettingsChange((newSettings) => {
    currentSettings = { ...currentSettings, ...newSettings };
    applySettings(currentSettings);
  });

  function applySettings(settings) {
    visualizer.updateSettings(settings);

    // An/Hien the dieu khien
    if (playerCard) {
      if (settings.showMediaCard === false) {
        playerCard.classList.add('hidden');
      } else {
        playerCard.classList.remove('hidden');
      }

      // Vi tri the dieu khien: Neu nguoi dung da keo tha va luu toa do, su dung toa do do
      if (settings.playerCardPos && typeof settings.playerCardPos.left === 'number') {
        playerCard.style.left = settings.playerCardPos.left + 'px';
        playerCard.style.top = settings.playerCardPos.top + 'px';
        playerCard.style.bottom = 'auto';
        playerCard.style.right = 'auto';
      } else {
        // Mac dinh o goc duoi ben trai
        playerCard.style.left = '28px';
        playerCard.style.bottom = '24px';
        playerCard.style.top = 'auto';
        playerCard.style.right = 'auto';
      }
    }
  }

  // 1. Xu ly chuot tren the Glass UI: Chuyen trang thai xuyen chuot linh hoat
  if (playerCard) {
    playerCard.addEventListener('mouseenter', () => {
      window.novata.setIgnoreMouseEvents(false);
    });

    playerCard.addEventListener('mouseleave', () => {
      if (!isDragging && !isEditMode) {
        window.novata.setIgnoreMouseEvents(true, true);
      }
    });

    // Bat che do keo tha vi tri khi nhan nut Edit
    if (btnEditPosition && btnConfirmPosition) {
      btnEditPosition.addEventListener('click', (e) => {
        e.stopPropagation();
        isEditMode = true;
        btnEditPosition.classList.add('hidden');
        btnConfirmPosition.classList.remove('hidden');
        if (dragHint) dragHint.classList.remove('hidden');
        playerCard.classList.add('in-edit-mode');
        window.novata.setIgnoreMouseEvents(false);
      });

      // Xac nhan vi tri khi nhan nut Done
      btnConfirmPosition.addEventListener('click', async (e) => {
        e.stopPropagation();
        isEditMode = false;
        isDragging = false;
        btnConfirmPosition.classList.add('hidden');
        btnEditPosition.classList.remove('hidden');
        if (dragHint) dragHint.classList.add('hidden');
        playerCard.classList.remove('in-edit-mode');

        const savedPos = {
          left: playerCard.offsetLeft,
          top: playerCard.offsetTop
        };
        await window.novata.saveSettings({ playerCardPos: savedPos });
        window.novata.setIgnoreMouseEvents(true, true);
      });
    }

    // Keo tha the Glass UI khi o che do Edit Mode
    playerCard.addEventListener('mousedown', (e) => {
      if (!isEditMode) return;
      if (e.target.closest('#btn-confirm-position')) return;

      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      cardInitialLeft = playerCard.offsetLeft;
      cardInitialTop = playerCard.offsetTop;
      playerCard.classList.add('dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      let targetLeft = cardInitialLeft + deltaX;
      let targetTop = cardInitialTop + deltaY;

      // Gioi han khong cho the bi keo ra ngoai mep man hinh
      targetLeft = Math.max(8, Math.min(window.innerWidth - playerCard.offsetWidth - 8, targetLeft));
      targetTop = Math.max(8, Math.min(window.innerHeight - playerCard.offsetHeight - 8, targetTop));

      playerCard.style.left = targetLeft + 'px';
      playerCard.style.top = targetTop + 'px';
      playerCard.style.bottom = 'auto';
      playerCard.style.right = 'auto';
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        playerCard.classList.remove('dragging');
      }
    });
  }

  // 2. Lang nghe su kien click Tray icon de hien/an the Glass UI
  if (window.novata.onTogglePlayerCard) {
    window.novata.onTogglePlayerCard(() => {
      if (playerCard) {
        if (playerCard.classList.contains('hidden')) {
          playerCard.classList.remove('hidden');
          window.novata.saveSettings({ showMediaCard: true });
        } else {
          playerCard.classList.add('hidden');
          window.novata.saveSettings({ showMediaCard: false });
        }
      }
    });
  }

  // 3. Quan ly thong tin bai hat tu he thong Windows (Spotify, YouTube Web...)
  try {
    const initialMedia = await window.novata.getMediaState();
    if (!currentInAppTrack) {
      updateMediaUI(initialMedia);
    }
  } catch (e) {}

  window.novata.onMediaChange((media) => {
    if (!currentInAppTrack) {
      updateMediaUI(media);
    }
  });

  function updateMediaUI(media) {
    if (!media) return;

    trackTitle.textContent = media.Title || 'Ready to listen';
    trackArtist.textContent = media.Artist || 'Spotify / YouTube / Music Player';
    trackTime.textContent = '';
    progressFill.style.width = '0%';

    albumThumb.classList.add('hidden');
    albumIcon.classList.remove('hidden');

    const src = (media.Source || '').toLowerCase();
    if (src.includes('spotify')) {
      sourceIcon.className = 'bi bi-spotify';
    } else if (src.includes('youtube') || src.includes('chrome') || src.includes('edge')) {
      sourceIcon.className = 'bi bi-youtube';
    } else if (src.includes('soundcloud')) {
      sourceIcon.className = 'bi bi-soundwave';
    } else {
      sourceIcon.className = 'bi bi-music-note-beamed';
    }

    const isPlaying = media.Status && media.Status.toLowerCase().includes('play');
    if (isPlaying) {
      playPauseIcon.className = 'bi bi-pause-fill';
      albumIcon.classList.add('active');
    } else {
      playPauseIcon.className = 'bi bi-play-fill';
      albumIcon.classList.remove('active');
    }

    const rep = (media.Repeat || '').toLowerCase();
    if (rep.includes('track')) {
      repeatIcon.className = 'bi bi-repeat-1';
      btnRepeat.classList.add('active');
    } else if (rep.includes('list')) {
      repeatIcon.className = 'bi bi-repeat';
      btnRepeat.classList.add('active');
    } else {
      repeatIcon.className = 'bi bi-repeat';
      btnRepeat.classList.remove('active');
    }

    if (media.Shuffle) {
      btnShuffle.classList.add('active');
    } else {
      btnShuffle.classList.remove('active');
    }
  }

  // 4. Xu ly Phat nhac In-App truc tiep qua HTML5 Audio
  window.novata.onPlayInAppTrack((track) => {
    playInAppSong(track);
  });

  async function playInAppSong(track) {
    currentInAppTrack = track;
    inAppIsPlaying = true;
    inAppCurrentTime = 0;
    inAppDuration = 0;

    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackTime.textContent = `0:00 / ${track.duration || '--:--'}`;
    sourceIcon.className = 'bi bi-play-circle-fill';
    sourceIcon.title = 'In-App Player';

    if (track.thumbnail) {
      albumThumb.src = track.thumbnail;
      albumThumb.classList.remove('hidden');
      albumIcon.classList.add('hidden');
    } else {
      albumThumb.classList.add('hidden');
      albumIcon.classList.remove('hidden');
    }

    playPauseIcon.className = 'bi bi-pause-fill';
    albumIcon.classList.add('active');
    progressFill.style.width = '0%';

    let url = track.streamUrl;
    if (!url) {
      try {
        url = await window.novata.getAudioStream(track.id);
      } catch (e) {}
    }

    if (url) {
      audioEl.src = url;
      connectAudioToVisualizer();
      try {
        await audioEl.play();
      } catch (playErr) {
        console.error('Loi khi bat dau phat am thanh:', playErr);
      }
    } else {
      console.warn('Khong the lay duoc link audio stream.');
    }
  }

  // Lang nghe cac su kien tu the Audio HTML5
  if (audioEl) {
    audioEl.addEventListener('timeupdate', () => {
      inAppCurrentTime = audioEl.currentTime;
      inAppDuration = audioEl.duration || 0;

      if (inAppDuration > 0) {
        const percent = Math.min(100, Math.max(0, (inAppCurrentTime / inAppDuration) * 100));
        progressFill.style.width = `${percent}%`;
        trackTime.textContent = `${formatTime(inAppCurrentTime)} / ${formatTime(inAppDuration)}`;

        window.novata.syncInAppState({
          isPlaying: inAppIsPlaying,
          currentTime: inAppCurrentTime,
          duration: inAppDuration
        });
      }
    });

    audioEl.addEventListener('play', () => {
      inAppIsPlaying = true;
      playPauseIcon.className = 'bi bi-pause-fill';
      albumIcon.classList.add('active');
    });

    audioEl.addEventListener('pause', () => {
      inAppIsPlaying = false;
      playPauseIcon.className = 'bi bi-play-fill';
      albumIcon.classList.remove('active');
    });

    audioEl.addEventListener('ended', () => {
      handleInAppNext();
    });

    audioEl.addEventListener('error', () => {
      console.warn('Audio stream error event fired.');
    });
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function handleInAppPlayPause() {
    if (!currentInAppTrack || !audioEl) return;
    if (audioEl.paused) {
      audioEl.play().catch(() => {});
    } else {
      audioEl.pause();
    }
  }

  function handleInAppNext() {
    if (inAppQueue.length > 0 && inAppQueueIndex < inAppQueue.length - 1) {
      inAppQueueIndex++;
      playInAppSong(inAppQueue[inAppQueueIndex]);
    }
  }

  function handleInAppPrev() {
    if (inAppQueue.length > 0 && inAppQueueIndex > 0) {
      inAppQueueIndex--;
      playInAppSong(inAppQueue[inAppQueueIndex]);
    }
  }

  // Lang nghe lenh dieu khien In-App tu cua so Cai dat hoac Tray
  window.novata.onInAppControl((action, payload) => {
    switch (action) {
      case 'toggle':
        handleInAppPlayPause();
        break;
      case 'play':
        if (audioEl) audioEl.play().catch(() => {});
        break;
      case 'pause':
        if (audioEl) audioEl.pause();
        break;
      case 'next':
        handleInAppNext();
        break;
      case 'prev':
        handleInAppPrev();
        break;
      case 'seek':
        if (audioEl && payload && typeof payload.percent === 'number' && audioEl.duration) {
          audioEl.currentTime = (payload.percent / 100) * audioEl.duration;
        }
        break;
    }
  });

  // 5. Cac nut bam tren the dieu khien Glass UI
  btnPlayPause.addEventListener('click', async () => {
    if (currentInAppTrack) {
      handleInAppPlayPause();
    } else {
      await window.novata.controlMedia('play_pause');
    }
  });

  btnPrev.addEventListener('click', async () => {
    if (currentInAppTrack) {
      handleInAppPrev();
    } else {
      await window.novata.controlMedia('prev');
    }
  });

  btnNext.addEventListener('click', async () => {
    if (currentInAppTrack) {
      handleInAppNext();
    } else {
      await window.novata.controlMedia('next');
    }
  });

  btnShuffle.addEventListener('click', async () => {
    if (!currentInAppTrack) {
      await window.novata.controlMedia('shuffle');
    }
  });

  btnRepeat.addEventListener('click', async () => {
    if (currentInAppTrack) {
      audioEl.loop = !audioEl.loop;
      btnRepeat.classList.toggle('active', audioEl.loop);
    } else {
      await window.novata.controlMedia('repeat');
    }
  });

  // Tua nhac khi nhap chuot vao thanh tien trinh
  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, clickX / rect.width));

    if (currentInAppTrack && audioEl && audioEl.duration) {
      audioEl.currentTime = percent * audioEl.duration;
    }
  });

  // Mo tim kiem va phat nhac
  btnOpenSearch.addEventListener('click', async () => {
    await window.novata.openSettings();
    setTimeout(() => {
      window.novata.openSearchTab();
    }, 200);
  });

  // Mo cua so Cai dat
  btnOpenSettings.addEventListener('click', async () => {
    await window.novata.openSettings();
  });
});
