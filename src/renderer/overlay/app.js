/**
 * Logic điều khiển giao diện Novata Overlay - Phiên bản nvt_0.3
 * - Sóng âm 100% trong suốt không hộp nền, mặc định xuyên chuột
 * - Thẻ điều khiển Glass UI có thể kéo thả vị trí (Draggable) và lưu tọa độ
 * - Trình phát nhạc In-App hỗ trợ Multi-Playlists, Auto-next bài kế tiếp, Xáo bài (Shuffle), Lặp lại
 * - Bình luận bằng tiếng Việt theo quy định toàn cục.
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
  const btnOpenPlaylists = document.getElementById('btn-open-playlists');
  const btnOpenSearch = document.getElementById('btn-open-search');
  const btnOpenSettings = document.getElementById('btn-open-settings');

  const audioEl = document.getElementById('inapp-audio-player');

  // Trạng thái phát nhạc In-App & Hàng đợi Playlist
  let currentInAppTrack = null;
  let inAppIsPlaying = false;
  let inAppCurrentTime = 0;
  let inAppDuration = 0;
  let inAppQueue = [];
  let inAppQueueIndex = 0;
  let inAppAudioConnected = false;
  let currentPlaylistId = null;
  let currentPlaylistName = '';

  // Trạng thái xáo bài (Shuffle) và lặp lại (Repeat: 'all' | 'one' | 'none')
  let isShuffle = false;
  let shuffleIndices = [];
  let shufflePointer = 0;
  let repeatMode = 'all';

  // Trạng thái kéo thả thẻ Glass UI (Edit Mode)
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
    if (typeof currentSettings.shuffle === 'boolean') {
      isShuffle = currentSettings.shuffle;
      if (btnShuffle) btnShuffle.classList.toggle('active', isShuffle);
    }
    if (currentSettings.repeatMode) {
      repeatMode = currentSettings.repeatMode;
      updateRepeatUI();
    }
  } catch (err) {
    console.error('Lỗi khi tải cài đặt ban đầu:', err);
  }

  await visualizer.initAudio('system');
  visualizer.start();

  // Khoi tao bo dieu khien MediaSession cho Windows SMTC & Lock Screen
  initMediaSessionActionHandlers();

  // Kết nối thẻ Audio Element vào Web Audio Analyser để sóng âm nhảy trực tiếp theo nhạc
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
      console.warn('Lỗi kết nối Web Audio Node:', e.message);
    }
  }

  window.novata.onSettingsChange((newSettings) => {
    currentSettings = { ...currentSettings, ...newSettings };
    applySettings(currentSettings);
  });

  function applySettings(settings) {
    visualizer.updateSettings(settings);

    // Ẩn / Hiện thẻ điều khiển
    if (playerCard) {
      if (settings.showMediaCard === false) {
        playerCard.classList.add('hidden');
      } else {
        playerCard.classList.remove('hidden');
      }

      // Vị trí thẻ điều khiển: Nếu người dùng đã kéo thả và lưu tọa độ, sử dụng tọa độ đó
      if (settings.playerCardPos && typeof settings.playerCardPos.left === 'number') {
        playerCard.style.left = settings.playerCardPos.left + 'px';
        playerCard.style.top = settings.playerCardPos.top + 'px';
        playerCard.style.bottom = 'auto';
        playerCard.style.right = 'auto';
      } else {
        // Mặc định ở góc dưới bên trái màn hình
        playerCard.style.left = '28px';
        playerCard.style.bottom = '24px';
        playerCard.style.top = 'auto';
        playerCard.style.right = 'auto';
      }
    }
  }

  // 1. Xử lý chuột trên thẻ Glass UI: Chuyển trạng thái xuyên chuột linh hoạt
  if (playerCard) {
    playerCard.addEventListener('mouseenter', () => {
      window.novata.setIgnoreMouseEvents(false);
    });

    playerCard.addEventListener('mouseleave', () => {
      if (!isDragging && !isEditMode) {
        window.novata.setIgnoreMouseEvents(true, true);
      }
    });

    // Bật chế độ kéo thả vị trí khi nhấn nút Move
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

      // Xác nhận vị trí khi nhấn nút Done
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

    // Kéo thả thẻ Glass UI khi ở chế độ Edit Mode
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

      // Giới hạn không cho thẻ bị kéo ra ngoài mép màn hình
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

  // 2. Lắng nghe sự kiện click Tray icon để ẩn / hiện thẻ Glass UI
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

  // 3. Quản lý thông tin bài hát từ hệ thống Windows (Spotify, YouTube Web, SoundCloud...)
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
      sourceIcon.title = 'Playing on Spotify';
    } else if (src.includes('youtube') || src.includes('chrome') || src.includes('edge')) {
      sourceIcon.className = 'bi bi-youtube';
      sourceIcon.title = 'Playing on YouTube / Browser';
    } else if (src.includes('soundcloud')) {
      sourceIcon.className = 'bi bi-soundwave';
      sourceIcon.title = 'Playing on SoundCloud';
    } else {
      sourceIcon.className = 'bi bi-music-note-beamed';
      sourceIcon.title = 'System Media';
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

  // 4. Khởi tạo thứ tự phát xáo bài (Fisher-Yates Shuffle)
  function initShuffleOrder(firstIndex = 0) {
    if (inAppQueue.length <= 1) {
      shuffleIndices = [0];
      shufflePointer = 0;
      return;
    }

    const restIndices = [];
    for (let i = 0; i < inAppQueue.length; i++) {
      if (i !== firstIndex) restIndices.push(i);
    }

    // Xáo trộn mảng các bài còn lại
    for (let i = restIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [restIndices[i], restIndices[j]] = [restIndices[j], restIndices[i]];
    }

    shuffleIndices = [firstIndex, ...restIndices];
    shufflePointer = 0;
  }

  // 5. Lắng nghe lệnh phát toàn bộ Playlist từ IPC
  window.novata.onPlayPlaylist((payload) => {
    if (!payload || !payload.tracks || payload.tracks.length === 0) return;

    currentPlaylistId = payload.playlistId;
    currentPlaylistName = payload.playlistName || 'Playlist';
    inAppQueue = [...payload.tracks];

    const startIdx = typeof payload.startIndex === 'number' ? payload.startIndex : 0;

    if (payload.shuffle || isShuffle) {
      isShuffle = true;
      if (btnShuffle) btnShuffle.classList.add('active');
      initShuffleOrder(startIdx);
      inAppQueueIndex = shuffleIndices[0];
    } else {
      inAppQueueIndex = startIdx;
    }

    playInAppSong(inAppQueue[inAppQueueIndex]);
  });

  // Lắng nghe phát 1 bài đơn lẻ
  window.novata.onPlayInAppTrack((track) => {
    // Nếu bài này chưa có trong queue thì thêm vào queue
    const foundIdx = inAppQueue.findIndex(t => t.id === track.id);
    if (foundIdx !== -1) {
      inAppQueueIndex = foundIdx;
    } else {
      inAppQueue = [track];
      inAppQueueIndex = 0;
    }

    if (isShuffle) {
      initShuffleOrder(inAppQueueIndex);
    }

    playInAppSong(track);
  });

  // ========================================================
  // QUAN LY WINDOWS SYSTEM MEDIA TRANSPORT CONTROLS (SMTC)
  // Dong bo thong tin bai hat va dieu khien len Lock Screen / Flyout
  // ========================================================

  function updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;

    if (!track) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      document.title = 'Novata nvt_0.3';
      return;
    }

    const cleanTitle = (track.title || 'Unknown Title').trim();
    const cleanArtist = (track.artist || 'Novata Music').trim();
    const albumName = currentPlaylistName ? `Playlist: ${currentPlaylistName}` : (track.source || 'Novata Music');

    // Cap nhat tieu de cua so de cac thanh widget va Taskbar dong bo ten bai hat
    document.title = `${cleanTitle} • ${cleanArtist}`;

    // Tao danh sach artwork anh bia cho Windows SMTC va Lock Screen
    const artworkList = [];
    let thumbUrl = track.thumbnail || '';
    if (thumbUrl) {
      if (thumbUrl.startsWith('//')) {
        thumbUrl = 'https:' + thumbUrl;
      }
      if (thumbUrl.startsWith('http://') || thumbUrl.startsWith('https://') || thumbUrl.startsWith('data:')) {
        artworkList.push(
          { src: thumbUrl, sizes: '96x96' },
          { src: thumbUrl, sizes: '128x128' },
          { src: thumbUrl, sizes: '192x192' },
          { src: thumbUrl, sizes: '256x256' },
          { src: thumbUrl, sizes: '384x384' },
          { src: thumbUrl, sizes: '512x512' }
        );
      }
    }

    // Luon bo sung logo Novata mac dinh lam anh fallback
    try {
      const fallbackUrl = new URL('../assets/icon.png', window.location.href).href;
      artworkList.push({ src: fallbackUrl, sizes: '512x512', type: 'image/png' });
    } catch (e) {}

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: cleanTitle,
        artist: cleanArtist,
        album: albumName,
        artwork: artworkList
      });
      navigator.mediaSession.playbackState = inAppIsPlaying ? 'playing' : 'paused';
    } catch (err) {
      console.warn('Loi khi tao MediaMetadata:', err.message);
    }

    updateMediaSessionPosition();
  }

  function updateMediaSessionPosition() {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (!audioEl || !audioEl.duration || isNaN(audioEl.duration) || !isFinite(audioEl.duration) || audioEl.duration <= 0) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: audioEl.duration,
        playbackRate: audioEl.playbackRate || 1.0,
        position: Math.min(Math.max(0, audioEl.currentTime || 0), audioEl.duration)
      });
    } catch (err) {
      // Bo qua loi tam thoi khi audio dang load duration
    }
  }

  function initMediaSessionActionHandlers() {
    if (!('mediaSession' in navigator)) return;

    const actionMap = [
      ['play', () => {
        if (currentInAppTrack) {
          handleInAppPlayPause();
        } else {
          window.novata.controlMedia('play_pause');
        }
      }],
      ['pause', () => {
        if (currentInAppTrack) {
          handleInAppPlayPause();
        } else {
          window.novata.controlMedia('play_pause');
        }
      }],
      ['previoustrack', () => {
        if (currentInAppTrack) {
          handleInAppPrev();
        } else {
          window.novata.controlMedia('prev');
        }
      }],
      ['nexttrack', () => {
        if (currentInAppTrack) {
          handleInAppNext();
        } else {
          window.novata.controlMedia('next');
        }
      }],
      ['stop', () => {
        if (audioEl) {
          audioEl.pause();
          audioEl.currentTime = 0;
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
        }
      }],
      ['seekto', (details) => {
        if (audioEl && typeof details.seekTime === 'number' && !isNaN(details.seekTime)) {
          audioEl.currentTime = details.seekTime;
          updateMediaSessionPosition();
        }
      }],
      ['seekbackward', (details) => {
        if (audioEl) {
          const offset = details.seekOffset || 10;
          audioEl.currentTime = Math.max(0, audioEl.currentTime - offset);
          updateMediaSessionPosition();
        }
      }],
      ['seekforward', (details) => {
        if (audioEl) {
          const offset = details.seekOffset || 10;
          const max = audioEl.duration || 0;
          audioEl.currentTime = Math.min(max, audioEl.currentTime + offset);
          updateMediaSessionPosition();
        }
      }]
    ];

    for (const [action, handler] of actionMap) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (err) {
        // Bo qua cac action khong ho tro
      }
    }
  }

  /**
   * Phát bài hát In-App qua HTML5 Audio và trích xuất direct audio stream
   * @param {Object} track 
   */
  async function playInAppSong(track) {
    if (!track) return;
    currentInAppTrack = track;
    inAppIsPlaying = true;
    inAppCurrentTime = 0;
    inAppDuration = 0;

    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackTime.textContent = `0:00 / ${track.duration || '--:--'}`;

    if (currentPlaylistName) {
      sourceIcon.className = 'bi bi-collection-play-fill';
      sourceIcon.title = `Playlist: ${currentPlaylistName}`;
    } else {
      sourceIcon.className = 'bi bi-play-circle-fill';
      sourceIcon.title = 'Novata In-App Player';
    }

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

    // Cap nhat ngay lap tuc Windows SMTC va Lock Screen
    updateMediaSession(track);

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
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
        updateMediaSessionPosition();
      } catch (playErr) {
        console.error('Lỗi khi bắt đầu phát âm thanh:', playErr);
      }
    } else {
      console.warn('Không thể lấy được đường dẫn stream của bài hát.');
    }
  }

  // 6. Lắng nghe các sự kiện từ thẻ Audio HTML5
  if (audioEl) {
    audioEl.addEventListener('timeupdate', () => {
      inAppCurrentTime = audioEl.currentTime;
      inAppDuration = audioEl.duration || 0;

      if (inAppDuration > 0) {
        const percent = Math.min(100, Math.max(0, (inAppCurrentTime / inAppDuration) * 100));
        progressFill.style.width = `${percent}%`;
        trackTime.textContent = `${formatTime(inAppCurrentTime)} / ${formatTime(inAppDuration)}`;

        updateMediaSessionPosition();

        window.novata.syncInAppState({
          isPlaying: inAppIsPlaying,
          currentTime: inAppCurrentTime,
          duration: inAppDuration,
          track: currentInAppTrack,
          queueIndex: inAppQueueIndex,
          queueTotal: inAppQueue.length,
          playlistName: currentPlaylistName
        });
      }
    });

    audioEl.addEventListener('play', () => {
      inAppIsPlaying = true;
      playPauseIcon.className = 'bi bi-pause-fill';
      albumIcon.classList.add('active');
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      updateMediaSessionPosition();
    });

    audioEl.addEventListener('pause', () => {
      inAppIsPlaying = false;
      playPauseIcon.className = 'bi bi-play-fill';
      albumIcon.classList.remove('active');
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    });

    audioEl.addEventListener('durationchange', () => {
      updateMediaSessionPosition();
    });

    audioEl.addEventListener('ratechange', () => {
      updateMediaSessionPosition();
    });

    audioEl.addEventListener('seeked', () => {
      updateMediaSessionPosition();
    });

    // Tự động phát bài tiếp theo khi bài này phát xong (Auto-next)
    audioEl.addEventListener('ended', () => {
      handleAutoNext();
    });

    audioEl.addEventListener('error', () => {
      console.warn('Sự kiện lỗi tải luồng âm thanh.');
      // Nếu gặp bài lỗi luồng, tự động chuyển bài kế tiếp sau 2 giây
      setTimeout(() => {
        if (inAppQueue.length > 1) {
          handleInAppNext();
        }
      }, 2000);
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

  /**
   * Tự động phát bài kế tiếp khi bài hiện tại kết thúc
   */
  function handleAutoNext() {
    if (repeatMode === 'one') {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
      updateMediaSessionPosition();
      return;
    }

    if (isShuffle) {
      if (shufflePointer < shuffleIndices.length - 1) {
        shufflePointer++;
        inAppQueueIndex = shuffleIndices[shufflePointer];
        playInAppSong(inAppQueue[inAppQueueIndex]);
      } else if (repeatMode === 'all') {
        // Đã phát hết danh sách xáo bài, xáo lại từ đầu
        initShuffleOrder(shuffleIndices[shuffleIndices.length - 1]);
        inAppQueueIndex = shuffleIndices[0];
        playInAppSong(inAppQueue[inAppQueueIndex]);
      } else {
        inAppIsPlaying = false;
        playPauseIcon.className = 'bi bi-play-fill';
        albumIcon.classList.remove('active');
        updateMediaSession(null);
      }
      return;
    }

    // Chế độ phát tuần tự thông thường
    if (inAppQueue.length > 0 && inAppQueueIndex < inAppQueue.length - 1) {
      inAppQueueIndex++;
      playInAppSong(inAppQueue[inAppQueueIndex]);
    } else if (repeatMode === 'all' && inAppQueue.length > 0) {
      inAppQueueIndex = 0;
      playInAppSong(inAppQueue[0]);
    } else {
      inAppIsPlaying = false;
      playPauseIcon.className = 'bi bi-play-fill';
      albumIcon.classList.remove('active');
      updateMediaSession(null);
    }
  }

  /**
   * Chuyển bài kế tiếp theo thao tác người dùng
   */
  function handleInAppNext() {
    if (!inAppQueue || inAppQueue.length === 0) return;

    if (inAppQueue.length === 1) {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
      updateMediaSessionPosition();
      return;
    }

    if (isShuffle) {
      if (shufflePointer < shuffleIndices.length - 1) {
        shufflePointer++;
      } else {
        shufflePointer = 0;
      }
      inAppQueueIndex = shuffleIndices[shufflePointer];
      playInAppSong(inAppQueue[inAppQueueIndex]);
      return;
    }

    if (inAppQueue.length > 0) {
      if (inAppQueueIndex < inAppQueue.length - 1) {
        inAppQueueIndex++;
      } else {
        inAppQueueIndex = 0;
      }
      playInAppSong(inAppQueue[inAppQueueIndex]);
    }
  }

  /**
   * Quay lại bài trước
   */
  function handleInAppPrev() {
    if (!inAppQueue || inAppQueue.length === 0) return;

    // Nếu bài đã phát hơn 3 giây, tua lại từ đầu bài
    if (audioEl && audioEl.currentTime > 3) {
      audioEl.currentTime = 0;
      updateMediaSessionPosition();
      return;
    }

    if (inAppQueue.length === 1) {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
      updateMediaSessionPosition();
      return;
    }

    if (isShuffle) {
      if (shufflePointer > 0) {
        shufflePointer--;
      } else {
        shufflePointer = shuffleIndices.length - 1;
      }
      inAppQueueIndex = shuffleIndices[shufflePointer];
      playInAppSong(inAppQueue[inAppQueueIndex]);
      return;
    }

    if (inAppQueue.length > 0) {
      if (inAppQueueIndex > 0) {
        inAppQueueIndex--;
      } else {
        inAppQueueIndex = inAppQueue.length - 1;
      }
      playInAppSong(inAppQueue[inAppQueueIndex]);
    }
  }

  // Cập nhật giao diện nút lặp lại Repeat
  function updateRepeatUI() {
    if (!repeatIcon || !btnRepeat) return;
    if (repeatMode === 'one') {
      repeatIcon.className = 'bi bi-repeat-1';
      btnRepeat.classList.add('active');
      btnRepeat.title = 'Repeat: Single Track';
    } else if (repeatMode === 'all') {
      repeatIcon.className = 'bi bi-repeat';
      btnRepeat.classList.add('active');
      btnRepeat.title = 'Repeat: Entire Playlist';
    } else {
      repeatIcon.className = 'bi bi-repeat';
      btnRepeat.classList.remove('active');
      btnRepeat.title = 'Repeat: Off';
    }
  }

  // 7. Lắng nghe lệnh điều khiển In-App từ cửa sổ Cài đặt hoặc Tray
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
      case 'shuffle':
        isShuffle = !isShuffle;
        if (btnShuffle) btnShuffle.classList.toggle('active', isShuffle);
        if (isShuffle) initShuffleOrder(inAppQueueIndex);
        window.novata.saveSettings({ shuffle: isShuffle });
        break;
      case 'seek':
        if (audioEl && payload && typeof payload.percent === 'number' && audioEl.duration) {
          audioEl.currentTime = (payload.percent / 100) * audioEl.duration;
        }
        break;
    }
  });

  // 8. Các nút bấm trên thẻ điều khiển Glass UI
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

  // Nút xáo bài (Shuffle)
  btnShuffle.addEventListener('click', async () => {
    if (currentInAppTrack) {
      isShuffle = !isShuffle;
      btnShuffle.classList.toggle('active', isShuffle);
      if (isShuffle) {
        initShuffleOrder(inAppQueueIndex);
      }
      await window.novata.saveSettings({ shuffle: isShuffle });
    } else {
      await window.novata.controlMedia('shuffle');
    }
  });

  // Nút lặp lại (Repeat)
  btnRepeat.addEventListener('click', async () => {
    if (currentInAppTrack) {
      if (repeatMode === 'all') {
        repeatMode = 'one';
      } else if (repeatMode === 'one') {
        repeatMode = 'none';
      } else {
        repeatMode = 'all';
      }
      updateRepeatUI();
      await window.novata.saveSettings({ repeatMode });
    } else {
      await window.novata.controlMedia('repeat');
    }
  });

  // Tua nhạc khi nhấp chuột vào thanh tiến trình
  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, clickX / rect.width));

    if (currentInAppTrack && audioEl && audioEl.duration) {
      audioEl.currentTime = percent * audioEl.duration;
    }
  });

  // Mở tab Danh sách phát Playlists
  if (btnOpenPlaylists) {
    btnOpenPlaylists.addEventListener('click', async () => {
      await window.novata.openPlaylistTab();
    });
  }

  // Mở tìm kiếm và phát nhạc
  btnOpenSearch.addEventListener('click', async () => {
    await window.novata.openSearchTab();
  });

  // Mở cửa sổ Cài đặt
  btnOpenSettings.addEventListener('click', async () => {
    await window.novata.openSettings();
  });
});
