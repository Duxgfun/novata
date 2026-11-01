/**
 * Logic dieu khien cua ung dung Cai dat Novata Settings & Music Center - Phien ban nvt_0.1
 * - Giao dien tieng Anh than thien voi nguoi dung pho thong
 * - Pop up chinh mau Hex dong bo phong cach Settings toi gian
 * - Trinh tim kiem va phat nhac In-App voi phan hoi thoi gian thuc
 */

document.addEventListener('DOMContentLoaded', async () => {
  let settings = {};
  let currentSearchResults = [];
  let activeInAppTrack = null;
  let inAppIsPlaying = false;

  // 1. Chuyen doi cac Tab ben Sidebar
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(targetId) {
    tabButtons.forEach(b => {
      if (b.getAttribute('data-tab') === targetId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    tabPanes.forEach(p => {
      if (p.id === targetId) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  // Lang nghe tin hieu mo nhanh Tab Tim nhac
  window.novata.onSwitchToSearchTab(() => {
    switchTab('tab-music-search');
    const searchInput = document.getElementById('music-search-input');
    if (searchInput) searchInput.focus();
  });

  // Nut dong cua so Cai dat
  const btnClose = document.getElementById('btn-close-window');
  if (btnClose) {
    btnClose.addEventListener('click', async () => {
      await window.novata.closeSettings();
    });
  }

  // 2. Tai va dong bo cau hinh nguoi dung tu Store
  try {
    settings = await window.novata.getSettings();
    populateUI(settings);
  } catch (err) {
    console.error('Loi khi tai cai dat:', err);
  }

  function populateUI(cfg) {
    // 2.1. Huong song (bottom, top)
    const dirCards = document.querySelectorAll('.mono-choice-card[data-direction]');
    dirCards.forEach(card => {
      if (card.getAttribute('data-direction') === (cfg.spectrumDirection || 'bottom')) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    // 2.2. Mau sac Hex & Do mo hien tai
    const currColor = (cfg.customColor || '#ffffff').toUpperCase();
    const currSwatch = document.getElementById('curr-swatch-display');
    const currHex = document.getElementById('curr-hex-display');
    if (currSwatch) currSwatch.style.background = currColor;
    if (currHex) currHex.textContent = currColor;

    const opacityVal = typeof cfg.waveformOpacity === 'number' ? cfg.waveformOpacity : 0.90;
    setSlider('range-waveform-opacity', 'val-waveform-opacity', opacityVal, '%', true);

    // 2.3. Cac thanh truot kich thuoc song am
    setSlider('range-spectrum-height', 'val-spectrum-height', cfg.spectrumHeight || 160, 'px');
    setSlider('range-bar-width', 'val-bar-width', cfg.barWidth || 6, 'px');
    setSlider('range-bar-gap', 'val-bar-gap', cfg.barGap || 4, 'px');
    setSlider('range-sensitivity', 'val-sensitivity', cfg.sensitivity || 1.3, 'x');
    setSlider('range-smoothing', 'val-smoothing', cfg.fftSmoothing || 0.82, '');

    // 2.4. Cong tac bat tat
    setCheckbox('check-show-media-card', cfg.showMediaCard !== false);
    setCheckbox('check-startup', !!cfg.launchOnStartup);
    setCheckbox('check-minimize-tray', cfg.minimizeToTray !== false);
  }

  function setSlider(sliderId, labelId, val, unit, isPercent = false) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (slider) slider.value = val;
    if (label) {
      if (isPercent) {
        label.textContent = `${Math.round(val * 100)}${unit}`;
      } else {
        label.textContent = `${val}${unit}`;
      }
    }
  }

  function setCheckbox(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  }

  // 3. Ham luu cai dat cap nhat thoi gian thuc
  async function updateSetting(diff) {
    settings = { ...settings, ...diff };
    await window.novata.saveSettings(diff);
  }

  // 4. Lang nghe cac tuong tac cai dat
  // 4.1. Huong song
  const dirCards = document.querySelectorAll('.mono-choice-card[data-direction]');
  dirCards.forEach(card => {
    card.addEventListener('click', () => {
      dirCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const dir = card.getAttribute('data-direction');
      updateSetting({ spectrumDirection: dir });
    });
  });

  // 4.2. Bang mau goi y nhanh Quick Presets
  const quickSwatches = document.querySelectorAll('.swatch-btn[data-color]');
  quickSwatches.forEach(btn => {
    btn.addEventListener('click', () => {
      const col = btn.getAttribute('data-color');
      applyColorUpdate(col);
    });
  });

  function applyColorUpdate(hexStr) {
    let clean = hexStr.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    if (clean.length === 6) {
      const fullHex = '#' + clean.toUpperCase();
      const currSwatch = document.getElementById('curr-swatch-display');
      const currHex = document.getElementById('curr-hex-display');
      if (currSwatch) currSwatch.style.background = fullHex;
      if (currHex) currHex.textContent = fullHex;
      updateSetting({ customColor: fullHex });
    }
  }

  // 4.3. Pop up Chinh Mau Hex Dong Bo Phong Cach Settings (In-Style Color Modal)
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

  let modalSelectedColor = '#FFFFFF';
  let modalSelectedOpacity = 0.90;

  function openColorModal() {
    if (!colorModal) return;
    modalSelectedColor = (settings.customColor || '#FFFFFF').toUpperCase();
    modalSelectedOpacity = typeof settings.waveformOpacity === 'number' ? settings.waveformOpacity : 0.90;

    if (modalSwatchBox) modalSwatchBox.style.background = modalSelectedColor;
    if (modalNativePicker) modalNativePicker.value = modalSelectedColor;
    if (modalHexInput) modalHexInput.value = modalSelectedColor.replace('#', '');
    if (modalRangeOpacity) modalRangeOpacity.value = modalSelectedOpacity;
    if (modalOpacityVal) modalOpacityVal.textContent = `${Math.round(modalSelectedOpacity * 100)}%`;

    colorModal.classList.remove('hidden');
  }

  function closeColorModal() {
    if (colorModal) colorModal.classList.add('hidden');
  }

  if (btnTriggerModal) {
    btnTriggerModal.addEventListener('click', openColorModal);
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeColorModal);
  }

  if (btnModalCancel) {
    btnModalCancel.addEventListener('click', closeColorModal);
  }

  // Dong modal khi nhan ra ngoai nen toi hoac phim Escape
  if (colorModal) {
    colorModal.addEventListener('click', (e) => {
      if (e.target === colorModal) closeColorModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && colorModal && !colorModal.classList.contains('hidden')) {
      closeColorModal();
    }
  });

  // Nut Eyedropper / Mo bang mau he thong
  if (modalBtnPick && modalNativePicker) {
    modalBtnPick.addEventListener('click', () => {
      modalNativePicker.click();
    });
  }

  if (modalNativePicker) {
    modalNativePicker.addEventListener('input', (e) => {
      setModalColor(e.target.value);
    });
  }

  function setModalColor(hex) {
    let clean = hex.replace('#', '').trim().toUpperCase();
    if (clean.length > 6) clean = clean.substring(0, 6);
    modalSelectedColor = '#' + clean;
    if (modalHexInput) modalHexInput.value = clean;
    if (modalSwatchBox) modalSwatchBox.style.background = modalSelectedColor;
    if (modalNativePicker) modalNativePicker.value = modalSelectedColor;
  }

  if (modalHexInput) {
    modalHexInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      e.target.value = val;
      if (val.length === 6 || val.length === 3) {
        setModalColor(val);
      }
    });

    modalHexInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        applyModalChanges();
      }
    });
  }

  // 16 Mau trong bang Curated Palette
  const paletteSwatches = document.querySelectorAll('.palette-swatch[data-hex]');
  paletteSwatches.forEach(btn => {
    btn.addEventListener('click', () => {
      const hex = btn.getAttribute('data-hex');
      setModalColor(hex);
    });
  });

  // Thanh truot do mo trong modal
  if (modalRangeOpacity && modalOpacityVal) {
    modalRangeOpacity.addEventListener('input', (e) => {
      modalSelectedOpacity = parseFloat(e.target.value);
      modalOpacityVal.textContent = `${Math.round(modalSelectedOpacity * 100)}%`;
    });
  }

  function applyModalChanges() {
    let clean = (modalHexInput ? modalHexInput.value : '').replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    if (clean.length !== 6) {
      clean = 'FFFFFF';
    }
    const finalHex = '#' + clean.toUpperCase();

    // Cap nhat UI chinh
    const currSwatch = document.getElementById('curr-swatch-display');
    const currHex = document.getElementById('curr-hex-display');
    if (currSwatch) currSwatch.style.background = finalHex;
    if (currHex) currHex.textContent = finalHex;

    setSlider('range-waveform-opacity', 'val-waveform-opacity', modalSelectedOpacity, '%', true);

    updateSetting({
      customColor: finalHex,
      waveformOpacity: modalSelectedOpacity
    });

    closeColorModal();
  }

  if (btnModalApply) {
    btnModalApply.addEventListener('click', applyModalChanges);
  }

  // 4.4. Thanh truot Do mo chinh
  bindSlider('range-waveform-opacity', 'val-waveform-opacity', '%', (val) => {
    updateSetting({ waveformOpacity: parseFloat(val) });
  }, true);

  // 4.5. Cac thanh truot kich thuoc song am
  bindSlider('range-spectrum-height', 'val-spectrum-height', 'px', (val) => {
    updateSetting({ spectrumHeight: parseInt(val, 10) });
  });

  bindSlider('range-bar-width', 'val-bar-width', 'px', (val) => {
    updateSetting({ barWidth: parseInt(val, 10) });
  });

  bindSlider('range-bar-gap', 'val-bar-gap', 'px', (val) => {
    updateSetting({ barGap: parseInt(val, 10) });
  });

  bindSlider('range-sensitivity', 'val-sensitivity', 'x', (val) => {
    updateSetting({ sensitivity: parseFloat(val) });
  });

  bindSlider('range-smoothing', 'val-smoothing', '', (val) => {
    updateSetting({ fftSmoothing: parseFloat(val) });
  });

  // 4.6. Cong tac Hien the dieu khien & Dat lai vi tri
  const checkShowCard = document.getElementById('check-show-media-card');
  if (checkShowCard) {
    checkShowCard.addEventListener('change', (e) => {
      updateSetting({ showMediaCard: e.target.checked });
    });
  }

  const btnResetPos = document.getElementById('btn-reset-player-pos');
  if (btnResetPos) {
    btnResetPos.addEventListener('click', async () => {
      await updateSetting({ playerCardPos: null });
      const prevHtml = btnResetPos.innerHTML;
      btnResetPos.innerHTML = '<i class="bi bi-check2"></i> Position Reset!';
      setTimeout(() => {
        btnResetPos.innerHTML = prevHtml;
      }, 1500);
    });
  }

  // 4.7. Cai dat he thong
  const checkStartup = document.getElementById('check-startup');
  if (checkStartup) {
    checkStartup.addEventListener('change', (e) => {
      updateSetting({ launchOnStartup: e.target.checked });
    });
  }

  const checkMinimize = document.getElementById('check-minimize-tray');
  if (checkMinimize) {
    checkMinimize.addEventListener('change', (e) => {
      updateSetting({ minimizeToTray: e.target.checked });
    });
  }

  function bindSlider(sliderId, labelId, unit, onChange, isPercent = false) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (!slider || !label) return;

    slider.addEventListener('input', (e) => {
      const v = e.target.value;
      if (isPercent) {
        label.textContent = `${Math.round(parseFloat(v) * 100)}${unit}`;
      } else {
        label.textContent = `${v}${unit}`;
      }
      onChange(v);
    });
  }

  // 5. Logic Tim kiem & Phat nhac In-App
  const searchInput = document.getElementById('music-search-input');
  const btnSubmitSearch = document.getElementById('btn-submit-search');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const resultsList = document.getElementById('music-results-list');
  const searchStatusText = document.getElementById('search-status-text');
  const resultsCountBadge = document.getElementById('results-count-badge');

  const miniPlayerThumb = document.getElementById('mini-player-thumb');
  const miniTitle = document.getElementById('mini-title');
  const miniArtist = document.getElementById('mini-artist');
  const miniPlayIcon = document.getElementById('mini-play-icon');
  const miniBtnPlay = document.getElementById('mini-btn-play');
  const miniBtnPrev = document.getElementById('mini-btn-prev');
  const miniBtnNext = document.getElementById('mini-btn-next');
  const miniTimeDisplay = document.getElementById('mini-time-display');

  // Tai danh sach nhac goi y sau khi cua so da hien thi
  setTimeout(() => {
    executeSearch('chill lofi beats');
  }, 350);

  async function executeSearch(query) {
    if (!query || !query.trim()) return;
    const cleanQ = query.trim();

    if (searchStatusText) searchStatusText.textContent = `Searching for "${cleanQ}"...`;
    if (resultsCountBadge) resultsCountBadge.textContent = 'Loading';

    if (resultsList) {
      resultsList.innerHTML = `
        <div class="search-loading-state">
          <i class="bi bi-arrow-repeat spin-icon"></i>
          <span>Finding high-quality audio streams...</span>
        </div>
      `;
    }

    try {
      const tracks = await window.novata.searchMusic(cleanQ);
      currentSearchResults = tracks || [];

      if (resultsCountBadge) resultsCountBadge.textContent = `${currentSearchResults.length} tracks`;
      if (searchStatusText) searchStatusText.textContent = `Results for "${cleanQ}"`;

      renderSearchResults(currentSearchResults);
    } catch (err) {
      if (resultsCountBadge) resultsCountBadge.textContent = 'Error';
      if (searchStatusText) searchStatusText.textContent = 'Search failed';
      if (resultsList) {
        resultsList.innerHTML = `
          <div class="search-empty-state">
            <i class="bi bi-exclamation-circle"></i>
            <span>Unable to load music. Please check your connection.</span>
          </div>
        `;
      }
    }
  }

  function renderSearchResults(tracks) {
    if (!resultsList) return;
    resultsList.innerHTML = '';

    if (!tracks || tracks.length === 0) {
      resultsList.innerHTML = `
        <div class="search-empty-state">
          <i class="bi bi-music-note-slash"></i>
          <span>No tracks found. Try different search terms.</span>
        </div>
      `;
      return;
    }

    tracks.forEach((track, index) => {
      const card = document.createElement('div');
      card.className = 'music-track-item';
      if (activeInAppTrack && activeInAppTrack.id === track.id) {
        card.classList.add('playing');
      }

      const thumbUrl = track.thumbnail || '../assets/icon.png';

      card.innerHTML = `
        <div class="track-item-left">
          <img src="${thumbUrl}" class="track-thumb" alt="Thumb" onerror="this.src='../assets/icon.png'">
          <div class="track-info">
            <div class="track-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</div>
            <div class="track-artist">${escapeHtml(track.artist)}</div>
          </div>
        </div>
        <div class="track-item-right">
          <span class="track-duration-text">${track.duration || '3:30'}</span>
          <button class="btn-play-track" title="Play Track">
            <i class="bi bi-play-fill"></i>
          </button>
        </div>
      `;

      const playBtn = card.querySelector('.btn-play-track');
      playBtn.addEventListener('click', async () => {
        await playTrackInApp(track, playBtn);
      });

      card.addEventListener('dblclick', async () => {
        await playTrackInApp(track, playBtn);
      });

      resultsList.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function playTrackInApp(track, playBtn) {
    activeInAppTrack = track;
    inAppIsPlaying = true;
    updateMiniPlayer(track, true, 'Loading audio stream...');

    // Danh dau track dang phat trong danh sach
    const allItems = document.querySelectorAll('.music-track-item');
    allItems.forEach(item => item.classList.remove('playing'));
    if (playBtn) {
      const parent = playBtn.closest('.music-track-item');
      if (parent) parent.classList.add('playing');
    }

    let prevHtml = null;
    if (playBtn) {
      prevHtml = playBtn.innerHTML;
      playBtn.innerHTML = '<i class="bi bi-arrow-repeat spin-icon"></i>';
      playBtn.disabled = true;
    }

    try {
      await window.novata.playInAppTrack(track);
      if (playBtn) {
        playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        playBtn.disabled = false;
      }
    } catch (err) {
      if (playBtn) {
        playBtn.innerHTML = prevHtml || '<i class="bi bi-play-fill"></i>';
        playBtn.disabled = false;
      }
    }
  }

  function updateMiniPlayer(track, isPlaying, statusNote) {
    if (!track) return;
    if (miniTitle) miniTitle.textContent = track.title;
    if (miniArtist) miniArtist.textContent = statusNote || track.artist;
    if (miniPlayerThumb && track.thumbnail) miniPlayerThumb.src = track.thumbnail;
    if (miniPlayIcon) {
      miniPlayIcon.className = isPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill';
    }
  }

  // Lang nghe su kien tim kiem
  if (btnSubmitSearch && searchInput) {
    btnSubmitSearch.addEventListener('click', () => {
      executeSearch(searchInput.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeSearch(searchInput.value);
      }
    });
  }

  if (searchInput && btnClearSearch) {
    searchInput.addEventListener('input', () => {
      if (searchInput.value.length > 0) {
        btnClearSearch.classList.remove('hidden');
      } else {
        btnClearSearch.classList.add('hidden');
      }
    });

    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      btnClearSearch.classList.add('hidden');
      searchInput.focus();
    });
  }

  // Chips goi y tu khoa nhanh
  const tagChips = document.querySelectorAll('.tag-chip[data-query]');
  tagChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (searchInput) searchInput.value = q;
      if (btnClearSearch) btnClearSearch.classList.remove('hidden');
      executeSearch(q);
    });
  });

  // Dieu khien qua Mini Player
  if (miniBtnPlay) {
    miniBtnPlay.addEventListener('click', async () => {
      inAppIsPlaying = !inAppIsPlaying;
      if (miniPlayIcon) {
        miniPlayIcon.className = inAppIsPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill';
      }
      await window.novata.controlInAppPlayer('toggle');
    });
  }

  if (miniBtnPrev) {
    miniBtnPrev.addEventListener('click', async () => {
      await window.novata.controlInAppPlayer('prev');
    });
  }

  if (miniBtnNext) {
    miniBtnNext.addEventListener('click', async () => {
      await window.novata.controlInAppPlayer('next');
    });
  }

  // Dong bo thoi gian tu Overlay Player
  window.novata.onInAppStateSync((state) => {
    if (!state) return;
    inAppIsPlaying = state.isPlaying;
    if (miniPlayIcon) {
      miniPlayIcon.className = inAppIsPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill';
    }

    if (miniTimeDisplay && state.duration) {
      const curr = formatTime(state.currentTime);
      const total = formatTime(state.duration);
      miniTimeDisplay.textContent = `${curr} / ${total}`;
    }
  });

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
});
