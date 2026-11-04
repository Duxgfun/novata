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
  const btnToggleLyrics = document.getElementById('btn-toggle-lyrics');

  // Các phần tử giao diện Thẻ Lời Bài Hát (Lyrics Widget)
  const lyricsCard = document.getElementById('lyrics-card');
  const lyricsScrollContainer = document.getElementById('lyrics-scroll-container');
  const lyricsLinesWrapper = document.getElementById('lyrics-lines-wrapper');
  const lyricsTypeBadge = document.getElementById('lyrics-type-badge');
  const lyricsDragHint = document.getElementById('lyrics-drag-hint');
  const btnEditLyricsPos = document.getElementById('btn-edit-lyrics-pos');
  const btnCloseLyrics = document.getElementById('btn-close-lyrics');
  const btnConfirmLyricsPos = document.getElementById('btn-confirm-lyrics-pos');

  const audioEl = document.getElementById('inapp-audio-player');

  // Trạng thái Lời bài hát & Đồng bộ thời gian
  let currentLyricsData = null;
  let parsedSyncedLyrics = [];
  let activeLyricIndex = -1;
  let lyricsLoadedFor = '';
  let externalMediaTimer = null;
  let externalEstimatedTime = 0;

  // Trạng thái căn chỉnh vị trí & kích cỡ thẻ Lyrics (Lyrics Edit Mode)
  let isLyricsEditMode = false;
  let isLyricsDragging = false;
  let isLyricsResizing = false;
  let lyricsResizeDir = null;
  let lyricsDragStartX = 0;
  let lyricsDragStartY = 0;
  let lyricsResizeStartX = 0;
  let lyricsResizeStartY = 0;
  let lyricsInitialLeft = 0;
  let lyricsInitialTop = 0;
  let initialLyricsRect = { left: 0, top: 0, width: 0, height: 0 };

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

  // Trạng thái căn chỉnh vị trí & kích cỡ thẻ Widget (Edit Mode)
  let isEditMode = false;
  let isDragging = false;
  let isResizing = false;
  let currentResizeDir = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let cardInitialLeft = 0;
  let cardInitialTop = 0;
  let initialCardRect = { left: 0, top: 0, width: 0, height: 0 };

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

    // Cập nhật giao diện thẻ Widget
    if (playerCard) {
      if (settings.showMediaCard === false) {
        playerCard.classList.add('hidden');
      } else {
        playerCard.classList.remove('hidden');
      }

      // 1. Áp dụng chất liệu thẻ Widget: Solid hoặc Glass trong suốt
      if (settings.widgetMaterial === 'solid') {
        playerCard.classList.remove('mat-glass');
        playerCard.classList.add('mat-solid');
      } else {
        playerCard.classList.remove('mat-solid');
        playerCard.classList.add('mat-glass');
        const gOpacity = typeof settings.widgetGlassOpacity === 'number' ? settings.widgetGlassOpacity : 0.18;
        const gBlur = typeof settings.widgetGlassBlur === 'number' ? settings.widgetGlassBlur : 20;
        playerCard.style.setProperty('--widget-glass-opacity', gOpacity);
        playerCard.style.setProperty('--widget-glass-blur', gBlur + 'px');
      }

      // 2. Vị trí thẻ Widget
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

      // 3. Kích thước co giãn tùy chỉnh của thẻ Widget (Window Resize)
      if (settings.playerCardSize && typeof settings.playerCardSize.width === 'number') {
        playerCard.style.width = settings.playerCardSize.width + 'px';
        if (typeof settings.playerCardSize.height === 'number' && settings.playerCardSize.height > 50) {
          playerCard.style.height = settings.playerCardSize.height + 'px';
        } else {
          playerCard.style.height = 'auto';
        }
      } else {
        playerCard.style.width = '360px';
        playerCard.style.height = 'auto';
      }
    }

    // 4. Cập nhật thẻ hiển thị lời bài hát (Lyrics Card Widget)
    if (lyricsCard) {
      if (settings.showLyricsWidget === false) {
        lyricsCard.classList.add('hidden');
      } else {
        lyricsCard.classList.remove('hidden');
      }

      // Áp dụng chất liệu Solid hoặc Kính mờ
      const lMat = settings.lyricsMaterial || settings.widgetMaterial || 'glass';
      if (lMat === 'solid') {
        lyricsCard.classList.remove('mat-glass');
        lyricsCard.classList.add('mat-solid');
      } else {
        lyricsCard.classList.remove('mat-solid');
        lyricsCard.classList.add('mat-glass');
        const gOpacity = typeof settings.lyricsGlassOpacity === 'number' ? settings.lyricsGlassOpacity : (typeof settings.widgetGlassOpacity === 'number' ? settings.widgetGlassOpacity : 0.18);
        const gBlur = typeof settings.lyricsGlassBlur === 'number' ? settings.lyricsGlassBlur : (typeof settings.widgetGlassBlur === 'number' ? settings.widgetGlassBlur : 20);
        lyricsCard.style.setProperty('--widget-glass-opacity', gOpacity);
        lyricsCard.style.setProperty('--widget-glass-blur', gBlur + 'px');
      }

      // Vị trí
      if (settings.lyricsCardPos && typeof settings.lyricsCardPos.left === 'number') {
        lyricsCard.style.left = settings.lyricsCardPos.left + 'px';
        lyricsCard.style.top = settings.lyricsCardPos.top + 'px';
        lyricsCard.style.bottom = 'auto';
        lyricsCard.style.right = 'auto';
      } else {
        lyricsCard.style.left = '28px';
        lyricsCard.style.top = '100px';
        lyricsCard.style.bottom = 'auto';
        lyricsCard.style.right = 'auto';
      }

      // Kích thước co giãn tùy chỉnh
      if (settings.lyricsCardSize && typeof settings.lyricsCardSize.width === 'number') {
        lyricsCard.style.width = settings.lyricsCardSize.width + 'px';
        if (typeof settings.lyricsCardSize.height === 'number' && settings.lyricsCardSize.height > 60) {
          lyricsCard.style.height = settings.lyricsCardSize.height + 'px';
        } else {
          lyricsCard.style.height = '260px';
        }
      } else {
        lyricsCard.style.width = '380px';
        lyricsCard.style.height = '260px';
      }

      // Cài đặt Typography & Font chữ
      if (typeof settings.lyricsFontSize === 'number') {
        lyricsCard.style.setProperty('--lyrics-font-size', settings.lyricsFontSize + 'px');
      }
      if (settings.lyricsTextAlign) {
        lyricsCard.style.setProperty('--lyrics-text-align', settings.lyricsTextAlign);
      }
      if (settings.lyricsFontWeight) {
        lyricsCard.style.setProperty('--lyrics-font-weight', settings.lyricsFontWeight);
      }
      if (settings.lyricsActiveColor) {
        lyricsCard.style.setProperty('--lyrics-active-color', settings.lyricsActiveColor);
      }
      if (typeof settings.lyricsInactiveOpacity === 'number') {
        lyricsCard.style.setProperty('--lyrics-inactive-opacity', settings.lyricsInactiveOpacity);
      }

      // Nạp Font chữ tùy chỉnh từ tệp người dùng chọn
      applyCustomFont(settings.lyricsCustomFont, settings.lyricsFontFamily);
    }
  }

  /**
   * Nạp tệp font chữ tùy chỉnh (.ttf, .otf, .woff, .woff2) thông qua CSS FontFace API
   * @param {Object} customFont { name, dataUrl }
   * @param {string} fontFamily Tên font hệ thống hoặc mặc định
   */
  async function applyCustomFont(customFont, fontFamily) {
    if (!lyricsCard) return;

    if (customFont && customFont.dataUrl) {
      try {
        const fontName = customFont.name || 'NovataLyricsCustomFont';
        const fontFace = new FontFace(fontName, `url(${customFont.dataUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        lyricsCard.style.setProperty('--lyrics-font-family', `"${fontName}", sans-serif`);
        return;
      } catch (err) {
        console.warn('Lỗi nạp font tùy chỉnh cho lyrics:', err);
      }
    }

    if (fontFamily && fontFamily !== 'system') {
      lyricsCard.style.setProperty('--lyrics-font-family', `"${fontFamily}", sans-serif`);
    } else {
      lyricsCard.style.removeProperty('--lyrics-font-family');
    }
  }

  // Khởi động chế độ căn chỉnh vị trí & kích cỡ (Edit Mode)
  function enterEditMode() {
    if (!playerCard) return;
    isEditMode = true;
    playerCard.classList.add('in-edit-mode');
    if (btnEditPosition) btnEditPosition.classList.add('hidden');
    if (btnConfirmPosition) btnConfirmPosition.classList.remove('hidden');
    if (dragHint) dragHint.classList.remove('hidden');
    window.novata.setIgnoreMouseEvents(false);
  }

  // Thoát chế độ căn chỉnh vị trí & kích cỡ và lưu cấu hình
  async function exitEditMode() {
    if (!playerCard) return;
    isEditMode = false;
    isDragging = false;
    isResizing = false;
    playerCard.classList.remove('in-edit-mode');
    playerCard.classList.remove('dragging');
    playerCard.classList.remove('resizing');
    if (btnConfirmPosition) btnConfirmPosition.classList.add('hidden');
    if (btnEditPosition) btnEditPosition.classList.remove('hidden');
    if (dragHint) dragHint.classList.add('hidden');

    const savedPos = {
      left: playerCard.offsetLeft,
      top: playerCard.offsetTop
    };
    const savedSize = {
      width: playerCard.offsetWidth,
      height: playerCard.offsetHeight
    };
    await window.novata.saveSettings({ playerCardPos: savedPos, playerCardSize: savedSize });
    window.novata.setIgnoreMouseEvents(true, true);
  }

  // Lắng nghe lệnh bật chế độ Edit Mode từ Cài đặt hoặc Tray menu
  if (window.novata.onEnterEditMode) {
    window.novata.onEnterEditMode(() => {
      enterEditMode();
    });
  }

  // 1. Xử lý chuột trên thẻ Glass UI: Chuyển trạng thái xuyên chuột linh hoạt
  if (playerCard) {
    playerCard.addEventListener('mouseenter', () => {
      window.novata.setIgnoreMouseEvents(false);
    });

    playerCard.addEventListener('mouseleave', () => {
      if (!isDragging && !isResizing && !isEditMode) {
        window.novata.setIgnoreMouseEvents(true, true);
      }
    });

    // Nhấp chuột phải vào thẻ widget để mở nhanh chế độ chỉnh vị trí & kích cỡ
    playerCard.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isEditMode) {
        enterEditMode();
      } else {
        exitEditMode();
      }
    });

    // Nút xác nhận vị trí & kích cỡ khi nhấn Done
    if (btnConfirmPosition) {
      btnConfirmPosition.addEventListener('click', (e) => {
        e.stopPropagation();
        exitEditMode();
      });
    }

    // Nút bật chế độ di chuyển & co giãn kích thước
    if (btnEditPosition) {
      btnEditPosition.addEventListener('click', (e) => {
        e.stopPropagation();
        enterEditMode();
      });
    }

    // Gắn sự kiện cho 8 điểm neo co giãn kích cỡ (Resize Handles)
    const resizeHandles = playerCard.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        if (!isEditMode) return;
        e.stopPropagation();
        e.preventDefault();
        isResizing = true;
        currentResizeDir = handle.getAttribute('data-dir');
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        initialCardRect = {
          left: playerCard.offsetLeft,
          top: playerCard.offsetTop,
          width: playerCard.offsetWidth,
          height: playerCard.offsetHeight
        };
        playerCard.classList.add('resizing');
      });
    });

    // Kéo di chuyển vị trí thẻ khi bấm vào phần thân thẻ ở chế độ Edit Mode
    playerCard.addEventListener('mousedown', (e) => {
      if (!isEditMode) return;
      if (e.target.closest('#btn-confirm-position') || e.target.closest('.resize-handle')) return;

      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      cardInitialLeft = playerCard.offsetLeft;
      cardInitialTop = playerCard.offsetTop;
      playerCard.classList.add('dragging');
    });

    window.addEventListener('mousemove', (e) => {
      // 1. Xử lý co giãn kích thước theo 8 hướng như cửa sổ Windows
      if (isResizing) {
        const dx = e.clientX - resizeStartX;
        const dy = e.clientY - resizeStartY;
        let newWidth = initialCardRect.width;
        let newHeight = initialCardRect.height;
        let newLeft = initialCardRect.left;
        let newTop = initialCardRect.top;

        const minW = 260;
        const maxW = Math.min(window.innerWidth - 20, 850);
        const minH = 68;
        const maxH = Math.min(window.innerHeight - 20, 400);

        // Trục ngang X
        if (currentResizeDir.includes('e')) {
          newWidth = Math.min(maxW, Math.max(minW, initialCardRect.width + dx));
        } else if (currentResizeDir.includes('w')) {
          const desiredWidth = initialCardRect.width - dx;
          if (desiredWidth >= minW && desiredWidth <= maxW) {
            newWidth = desiredWidth;
            newLeft = initialCardRect.left + dx;
          } else if (desiredWidth < minW) {
            newWidth = minW;
            newLeft = initialCardRect.left + (initialCardRect.width - minW);
          } else {
            newWidth = maxW;
            newLeft = initialCardRect.left + (initialCardRect.width - maxW);
          }
        }

        // Trục dọc Y
        if (currentResizeDir.includes('s')) {
          newHeight = Math.min(maxH, Math.max(minH, initialCardRect.height + dy));
        } else if (currentResizeDir.includes('n')) {
          const desiredHeight = initialCardRect.height - dy;
          if (desiredHeight >= minH && desiredHeight <= maxH) {
            newHeight = desiredHeight;
            newTop = initialCardRect.top + dy;
          } else if (desiredHeight < minH) {
            newHeight = minH;
            newTop = initialCardRect.top + (initialCardRect.height - minH);
          } else {
            newHeight = maxH;
            newTop = initialCardRect.top + (initialCardRect.height - maxH);
          }
        }

        // Giới hạn trong mép màn hình
        newLeft = Math.max(8, Math.min(window.innerWidth - newWidth - 8, newLeft));
        newTop = Math.max(8, Math.min(window.innerHeight - newHeight - 8, newTop));

        playerCard.style.left = newLeft + 'px';
        playerCard.style.top = newTop + 'px';
        playerCard.style.bottom = 'auto';
        playerCard.style.right = 'auto';
        playerCard.style.width = newWidth + 'px';
        playerCard.style.height = newHeight + 'px';
        return;
      }

      // 2. Xử lý di chuyển vị trí thẻ
      if (isDragging) {
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
        return;
      }

      // 3. Xử lý co giãn kích thước thẻ Lời bài hát theo 8 hướng
      if (isLyricsResizing && lyricsCard) {
        const dx = e.clientX - lyricsResizeStartX;
        const dy = e.clientY - lyricsResizeStartY;
        let newWidth = initialLyricsRect.width;
        let newHeight = initialLyricsRect.height;
        let newLeft = initialLyricsRect.left;
        let newTop = initialLyricsRect.top;

        const minW = 260;
        const maxW = Math.min(window.innerWidth - 20, 900);
        const minH = 120;
        const maxH = Math.min(window.innerHeight - 20, 600);

        // Trục ngang X
        if (lyricsResizeDir.includes('e')) {
          newWidth = Math.min(maxW, Math.max(minW, initialLyricsRect.width + dx));
        } else if (lyricsResizeDir.includes('w')) {
          const desiredWidth = initialLyricsRect.width - dx;
          if (desiredWidth >= minW && desiredWidth <= maxW) {
            newWidth = desiredWidth;
            newLeft = initialLyricsRect.left + dx;
          } else if (desiredWidth < minW) {
            newWidth = minW;
            newLeft = initialLyricsRect.left + (initialLyricsRect.width - minW);
          } else {
            newWidth = maxW;
            newLeft = initialLyricsRect.left + (initialLyricsRect.width - maxW);
          }
        }

        // Trục dọc Y
        if (lyricsResizeDir.includes('s')) {
          newHeight = Math.min(maxH, Math.max(minH, initialLyricsRect.height + dy));
        } else if (lyricsResizeDir.includes('n')) {
          const desiredHeight = initialLyricsRect.height - dy;
          if (desiredHeight >= minH && desiredHeight <= maxH) {
            newHeight = desiredHeight;
            newTop = initialLyricsRect.top + dy;
          } else if (desiredHeight < minH) {
            newHeight = minH;
            newTop = initialLyricsRect.top + (initialLyricsRect.height - minH);
          } else {
            newHeight = maxH;
            newTop = initialLyricsRect.top + (initialLyricsRect.height - maxH);
          }
        }

        newLeft = Math.max(8, Math.min(window.innerWidth - newWidth - 8, newLeft));
        newTop = Math.max(8, Math.min(window.innerHeight - newHeight - 8, newTop));

        lyricsCard.style.left = newLeft + 'px';
        lyricsCard.style.top = newTop + 'px';
        lyricsCard.style.bottom = 'auto';
        lyricsCard.style.right = 'auto';
        lyricsCard.style.width = newWidth + 'px';
        lyricsCard.style.height = newHeight + 'px';
        return;
      }

      // 4. Xử lý di chuyển vị trí thẻ Lời bài hát
      if (isLyricsDragging && lyricsCard) {
        const deltaX = e.clientX - lyricsDragStartX;
        const deltaY = e.clientY - lyricsDragStartY;

        let targetLeft = lyricsInitialLeft + deltaX;
        let targetTop = lyricsInitialTop + deltaY;

        targetLeft = Math.max(8, Math.min(window.innerWidth - lyricsCard.offsetWidth - 8, targetLeft));
        targetTop = Math.max(8, Math.min(window.innerHeight - lyricsCard.offsetHeight - 8, targetTop));

        lyricsCard.style.left = targetLeft + 'px';
        lyricsCard.style.top = targetTop + 'px';
        lyricsCard.style.bottom = 'auto';
        lyricsCard.style.right = 'auto';
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        playerCard.classList.remove('dragging');
      }
      if (isResizing) {
        isResizing = false;
        currentResizeDir = null;
        playerCard.classList.remove('resizing');
      }
      if (isLyricsDragging && lyricsCard) {
        isLyricsDragging = false;
        lyricsCard.classList.remove('dragging');
      }
      if (isLyricsResizing && lyricsCard) {
        isLyricsResizing = false;
        lyricsResizeDir = null;
        lyricsCard.classList.remove('resizing');
      }
    });
  }

  // ========================================================
  // XỬ LÝ SỰ KIỆN VÀ CHẾ ĐỘ CHỈNH VỊ TRÍ CHO THẺ LYRICS
  // ========================================================
  function enterLyricsEditMode() {
    if (!lyricsCard) return;
    isLyricsEditMode = true;
    lyricsCard.classList.add('in-edit-mode');
    if (btnEditLyricsPos) btnEditLyricsPos.classList.add('hidden');
    if (btnConfirmLyricsPos) btnConfirmLyricsPos.classList.remove('hidden');
    if (lyricsDragHint) lyricsDragHint.classList.remove('hidden');
    window.novata.setIgnoreMouseEvents(false);
  }

  async function exitLyricsEditMode() {
    if (!lyricsCard) return;
    isLyricsEditMode = false;
    isLyricsDragging = false;
    isLyricsResizing = false;
    lyricsCard.classList.remove('in-edit-mode');
    lyricsCard.classList.remove('dragging');
    lyricsCard.classList.remove('resizing');
    if (btnConfirmLyricsPos) btnConfirmLyricsPos.classList.add('hidden');
    if (btnEditLyricsPos) btnEditLyricsPos.classList.remove('hidden');
    if (lyricsDragHint) lyricsDragHint.classList.add('hidden');

    const savedPos = {
      left: lyricsCard.offsetLeft,
      top: lyricsCard.offsetTop
    };
    const savedSize = {
      width: lyricsCard.offsetWidth,
      height: lyricsCard.offsetHeight
    };
    await window.novata.saveSettings({ lyricsCardPos: savedPos, lyricsCardSize: savedSize });
    if (!isEditMode) {
      window.novata.setIgnoreMouseEvents(true, true);
    }
  }

  if (lyricsCard) {
    lyricsCard.addEventListener('mouseenter', () => {
      window.novata.setIgnoreMouseEvents(false);
    });

    lyricsCard.addEventListener('mouseleave', () => {
      if (!isDragging && !isResizing && !isEditMode && !isLyricsDragging && !isLyricsResizing && !isLyricsEditMode) {
        window.novata.setIgnoreMouseEvents(true, true);
      }
    });

    // Nhấp chuột phải vào thẻ lyrics để chuyển chế độ Move & Resize
    lyricsCard.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isLyricsEditMode) {
        enterLyricsEditMode();
      } else {
        exitLyricsEditMode();
      }
    });

    // Nút Move & Resize lyrics
    if (btnEditLyricsPos) {
      btnEditLyricsPos.addEventListener('click', (e) => {
        e.stopPropagation();
        enterLyricsEditMode();
      });
    }

    // Nút Done lưu vị trí lyrics
    if (btnConfirmLyricsPos) {
      btnConfirmLyricsPos.addEventListener('click', (e) => {
        e.stopPropagation();
        exitLyricsEditMode();
      });
    }

    // Nút Đóng / Ẩn thẻ lyrics
    if (btnCloseLyrics) {
      btnCloseLyrics.addEventListener('click', async (e) => {
        e.stopPropagation();
        lyricsCard.classList.add('hidden');
        await window.novata.saveSettings({ showLyricsWidget: false });
      });
    }

    // Gắn sự kiện cho 8 điểm neo co giãn kích cỡ của thẻ lyrics
    const lyricsHandles = lyricsCard.querySelectorAll('.resize-handle');
    lyricsHandles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        if (!isLyricsEditMode) return;
        e.stopPropagation();
        e.preventDefault();
        isLyricsResizing = true;
        lyricsResizeDir = handle.getAttribute('data-dir');
        lyricsResizeStartX = e.clientX;
        lyricsResizeStartY = e.clientY;
        initialLyricsRect = {
          left: lyricsCard.offsetLeft,
          top: lyricsCard.offsetTop,
          width: lyricsCard.offsetWidth,
          height: lyricsCard.offsetHeight
        };
        lyricsCard.classList.add('resizing');
      });
    });

    // Kéo di chuyển vị trí thẻ lyrics
    lyricsCard.addEventListener('mousedown', (e) => {
      if (!isLyricsEditMode) return;
      if (e.target.closest('#btn-confirm-lyrics-pos') || e.target.closest('.resize-handle') || e.target.closest('button')) return;

      isLyricsDragging = true;
      lyricsDragStartX = e.clientX;
      lyricsDragStartY = e.clientY;
      lyricsInitialLeft = lyricsCard.offsetLeft;
      lyricsInitialTop = lyricsCard.offsetTop;
      lyricsCard.classList.add('dragging');
    });
  }

  // Nút bật/tắt lyrics trên thanh công cụ của Player Card
  if (btnToggleLyrics) {
    btnToggleLyrics.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!lyricsCard) return;
      const isHidden = lyricsCard.classList.contains('hidden');
      if (isHidden) {
        lyricsCard.classList.remove('hidden');
        btnToggleLyrics.classList.add('active');
        await window.novata.saveSettings({ showLyricsWidget: true });
        // Cập nhật lại lyrics ngay nếu đang có nhạc
        if (currentInAppTrack) {
          updateLyricsForTrack(currentInAppTrack);
        }
      } else {
        lyricsCard.classList.add('hidden');
        btnToggleLyrics.classList.remove('active');
        await window.novata.saveSettings({ showLyricsWidget: false });
      }
    });
  }

  // Lắng nghe lệnh Toggle Lyrics từ Main Process / Tray
  if (window.novata.onToggleLyricsCard) {
    window.novata.onToggleLyricsCard((show) => {
      if (!lyricsCard) return;
      if (typeof show === 'boolean') {
        lyricsCard.classList.toggle('hidden', !show);
        if (btnToggleLyrics) btnToggleLyrics.classList.toggle('active', show);
      } else {
        const isHidden = lyricsCard.classList.contains('hidden');
        lyricsCard.classList.toggle('hidden', !isHidden);
        if (btnToggleLyrics) btnToggleLyrics.classList.toggle('active', isHidden);
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
    progressFill.style.transform = 'scaleX(0)';

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

    // Tự động tải lời bài hát cho nhạc phát từ hệ thống ngoài (Spotify, YouTube Web, SoundCloud)
    if (media.Active && media.Title && media.Title !== 'Ready to listen') {
      updateLyricsForTrack({ title: media.Title, artist: media.Artist });
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

        // Đồng bộ lời bài hát theo thời gian thực
        syncLyricsToTime(inAppCurrentTime);
        }
      }],
      ['seekbackward', (details) => {
        if (audioEl) {
          const offset = details.seekOffset || 10;
          audioEl.currentTime = Math.max(0, audioEl.currentTime - offset);
          updateMediaSessionPosition();

        // Đồng bộ lời bài hát theo thời gian thực
        syncLyricsToTime(inAppCurrentTime);
        }
      }],
      ['seekforward', (details) => {
        if (audioEl) {
          const offset = details.seekOffset || 10;
          const max = audioEl.duration || 0;
          audioEl.currentTime = Math.min(max, audioEl.currentTime + offset);
          updateMediaSessionPosition();

        // Đồng bộ lời bài hát theo thời gian thực
        syncLyricsToTime(inAppCurrentTime);
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

  // ========================================================
  // ENGINE HIỂN THỊ VÀ ĐỒNG BỘ LỜI BÀI HÁT (LYRICS ENGINE)
  // ========================================================

  /**
   * Phân tích cú pháp tệp lời bài hát đồng bộ LRC [mm:ss.xx]
   * @param {string} lrcText 
   */
  function parseLrc(lrcText) {
    if (!lrcText || typeof lrcText !== 'string') return [];
    const lines = lrcText.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      let match;
      const timestamps = [];
      while ((match = timeRegex.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? (match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10)) : 0;
        timestamps.push(min * 60 + sec + ms / 1000);
      }

      const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
      if (text && timestamps.length > 0) {
        for (const t of timestamps) {
          result.push({ time: t, text });
        }
      }
    }

    result.sort((a, b) => a.time - b.time);
    return result;
  }

  /**
   * Hiển thị danh sách lời đồng bộ thời gian
   * @param {Array} lines 
   */
  function renderSyncedLyrics(lines) {
    if (!lyricsLinesWrapper) return;
    lyricsLinesWrapper.innerHTML = '';
    activeLyricIndex = -1;
    activeLyricElement = null;

    lines.forEach((item, index) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'lyric-line';
      lineEl.setAttribute('data-index', index);
      lineEl.setAttribute('data-time', item.time);
      lineEl.textContent = item.text;

      // Nhấp vào dòng để tua đến đoạn đó (In-App Player)
      lineEl.addEventListener('click', () => {
        if (currentInAppTrack && audioEl && audioEl.duration) {
          audioEl.currentTime = item.time;
          syncLyricsToTime(item.time, true);
        }
      });

      lyricsLinesWrapper.appendChild(lineEl);
    });

    if (lyricsScrollContainer) {
      lyricsScrollContainer.scrollTop = 0;
    }
  }

  /**
   * Hiển thị lời bài hát văn bản thuần
   * @param {string} plainText 
   */
  function renderPlainLyrics(plainText) {
    if (!lyricsLinesWrapper) return;
    lyricsLinesWrapper.innerHTML = '';
    activeLyricIndex = -1;
    activeLyricElement = null;

    const lines = plainText.split('\n');
    lines.forEach(text => {
      const trimmed = text.trim();
      if (!trimmed) {
        const spacer = document.createElement('div');
        spacer.style.height = '10px';
        lyricsLinesWrapper.appendChild(spacer);
        return;
      }
      const lineEl = document.createElement('div');
      lineEl.className = 'lyric-line plain';
      lineEl.textContent = trimmed;
      lyricsLinesWrapper.appendChild(lineEl);
    });

    if (lyricsScrollContainer) {
      lyricsScrollContainer.scrollTop = 0;
    }
  }

  /**
   * Hiển thị trạng thái khi không tìm thấy lời
   * @param {string} title 
   */
  function renderNoLyrics(title) {
    if (!lyricsLinesWrapper) return;
    lyricsLinesWrapper.innerHTML = `
      <div class="lyrics-idle-prompt">
        <i class="bi bi-chat-square-dots"></i>
        <span>No lyrics found for "${escapeHtml(title)}"</span>
      </div>
    `;
    if (lyricsTypeBadge) {
      lyricsTypeBadge.textContent = 'No Lyrics';
      lyricsTypeBadge.className = 'lyrics-badge';
    }
  }

  /**
   * Cập nhật dòng lời bài hát đang phát theo thời gian thực (LRC Sync)
   * @param {number} currentTime Thời gian hiện tại tính bằng giây
   * @param {boolean} forceScroll Cuộn ngay lập tức không cần trễ
   */
  let activeLyricElement = null;
  function syncLyricsToTime(currentTime, forceScroll = false) {
    if (!parsedSyncedLyrics || parsedSyncedLyrics.length === 0 || !lyricsLinesWrapper) return;

    // Tìm chỉ số dòng phù hợp nhất với currentTime
    let newIndex = -1;
    for (let i = 0; i < parsedSyncedLyrics.length; i++) {
      if (parsedSyncedLyrics[i].time <= currentTime) {
        newIndex = i;
      } else {
        break;
      }
    }

    if (newIndex === activeLyricIndex && !forceScroll) return;
    activeLyricIndex = newIndex;

    const targetEl = lyricsLinesWrapper.children[activeLyricIndex];
    if (activeLyricElement && activeLyricElement !== targetEl) {
      activeLyricElement.classList.remove('active');
    }

    if (targetEl) {
      targetEl.classList.add('active');
      activeLyricElement = targetEl;

      // Tự động cuộn mượt mà đưa dòng đang hát vào giữa khung nhìn (chỉ thực hiện khi đổi dòng)
      if (lyricsScrollContainer) {
        const containerHeight = lyricsScrollContainer.clientHeight;
        const elTop = targetEl.offsetTop - lyricsLinesWrapper.offsetTop;
        const elHeight = targetEl.clientHeight;
        const targetScroll = elTop - (containerHeight / 2) + (elHeight / 2);
        lyricsScrollContainer.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: forceScroll ? 'auto' : 'smooth'
        });
      }
    }
  }

  /**
   * Tải lời bài hát cho track chỉ định qua LRCLIB API
   * @param {Object} track 
   */
  async function updateLyricsForTrack(track) {
    if (!lyricsCard || !track || !track.title) return;
    const cleanKey = `${track.title}___${track.artist || ''}`.toLowerCase();
    if (lyricsLoadedFor === cleanKey) return;
    lyricsLoadedFor = cleanKey;

    if (lyricsTypeBadge) {
      lyricsTypeBadge.textContent = 'Searching...';
      lyricsTypeBadge.className = 'lyrics-badge';
    }

    if (lyricsLinesWrapper) {
      lyricsLinesWrapper.innerHTML = `
        <div class="lyrics-idle-prompt">
          <i class="bi bi-arrow-repeat spin-icon"></i>
          <span>Searching synchronized lyrics...</span>
        </div>
      `;
    }

    try {
      let durSec = null;
      if (audioEl && audioEl.duration && !isNaN(audioEl.duration)) {
        durSec = audioEl.duration;
      } else if (track.duration && typeof track.duration === 'string' && track.duration.includes(':')) {
        const parts = track.duration.split(':');
        durSec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }

      const res = await window.novata.getLyrics({
        title: track.title,
        artist: track.artist || '',
        duration: durSec
      });

      if (res && res.success) {
        if (res.syncedLyrics && res.syncedLyrics.trim()) {
          parsedSyncedLyrics = parseLrc(res.syncedLyrics);
          if (parsedSyncedLyrics.length > 0) {
            renderSyncedLyrics(parsedSyncedLyrics);
            if (lyricsTypeBadge) {
              lyricsTypeBadge.textContent = 'Synced';
              lyricsTypeBadge.className = 'lyrics-badge synced';
            }
            // Đồng bộ ngay thời gian hiện tại
            const curTime = audioEl ? audioEl.currentTime : 0;
            syncLyricsToTime(curTime, true);
            return;
          }
        }

        if (res.plainLyrics && res.plainLyrics.trim()) {
          parsedSyncedLyrics = [];
          renderPlainLyrics(res.plainLyrics);
          if (lyricsTypeBadge) {
            lyricsTypeBadge.textContent = 'Plain';
            lyricsTypeBadge.className = 'lyrics-badge';
          }
          return;
        }
      }

      parsedSyncedLyrics = [];
      renderNoLyrics(track.title);
    } catch (err) {
      console.warn('Lỗi khi tải lyrics:', err);
      parsedSyncedLyrics = [];
      renderNoLyrics(track.title);
    }
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    progressFill.style.transform = 'scaleX(0)';

    // Cap nhat ngay lap tuc Windows SMTC va Lock Screen
    updateMediaSession(track);

    // Tự động tải và đồng bộ lời bài hát cho bài hát In-App
    updateLyricsForTrack(track);

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

        // Đồng bộ lời bài hát theo thời gian thực
        syncLyricsToTime(inAppCurrentTime);
      } catch (playErr) {
        console.error('Lỗi khi bắt đầu phát âm thanh:', playErr);
      }
    } else {
      console.warn('Không thể lấy được đường dẫn stream của bài hát.');
    }
  }

  // 6. Lắng nghe các sự kiện từ thẻ Audio HTML5
  let lastInAppStateSyncTime = 0;
  if (audioEl) {
    audioEl.addEventListener('timeupdate', () => {
      inAppCurrentTime = audioEl.currentTime;
      inAppDuration = audioEl.duration || 0;

      if (inAppDuration > 0) {
        const percent = Math.min(100, Math.max(0, (inAppCurrentTime / inAppDuration) * 100));
        progressFill.style.transform = `scaleX(${percent / 100})`;
        trackTime.textContent = `${formatTime(inAppCurrentTime)} / ${formatTime(inAppDuration)}`;

        updateMediaSessionPosition();

        // Đồng bộ lời bài hát theo thời gian thực
        syncLyricsToTime(inAppCurrentTime);

        // Giới hạn tần suất IPC đồng bộ tiến trình (2.5 giây/lần) để tránh nghẽn luồng IPC và CPU
        const nowMs = Date.now();
        if (nowMs - lastInAppStateSyncTime > 2500) {
          lastInAppStateSyncTime = nowMs;
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
      }
    });

    audioEl.addEventListener('play', () => {
      inAppIsPlaying = true;
      playPauseIcon.className = 'bi bi-pause-fill';
      albumIcon.classList.add('active');
      visualizer.pauseSystemAudio();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      updateMediaSessionPosition();
    });

    audioEl.addEventListener('pause', () => {
      inAppIsPlaying = false;
      playPauseIcon.className = 'bi bi-play-fill';
      albumIcon.classList.remove('active');
      visualizer.resumeSystemAudio();
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
  if (btnOpenSearch) {
    btnOpenSearch.addEventListener('click', async () => {
      await window.novata.openSearchTab();
    });
  }

  // Mở cửa sổ Cài đặt
  btnOpenSettings.addEventListener('click', async () => {
    await window.novata.openSettings();
  });
});
