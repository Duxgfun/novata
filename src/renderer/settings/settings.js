/**
 * Logic điều khiển của ứng dụng Cài đặt Novata Settings & Music Center - Phiên bản nvt_0.2
 * - Giao diện tiếng Anh thân thiện với người dùng phổ thông
 * - Hỗ trợ hệ thống Multi-Playlists: tạo, sửa, xóa, phát danh sách, xáo bài
 * - Thêm bài hát vào playlist từ kết quả tìm kiếm
 * - Quản lý Discord Rich Presence (RPC) và cấu hình Default Music (Auto-play khi mở app)
 * - Bình luận bằng tiếng Việt theo quy định toàn cục.
 */

document.addEventListener('DOMContentLoaded', async () => {
  let settings = {};
  let currentSearchResults = [];
  let activeInAppTrack = null;
  let inAppIsPlaying = false;

  // Dữ liệu quản lý danh sách phát Playlists
  let playlists = [];
  let activePlaylistId = null;
  let editingPlaylistId = null;
  let trackToAddToPlaylist = null;

  // 1. Chuyển đổi các Tab bên Sidebar
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

    // Nếu chuyển sang tab Playlists, làm mới giao diện playlist
    if (targetId === 'tab-playlists') {
      renderPlaylistsList();
      renderActivePlaylistDetails();
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  // Lắng nghe tín hiệu mở nhanh Tab Tìm nhạc
  window.novata.onSwitchToSearchTab(() => {
    switchTab('tab-music-search');
    const searchInput = document.getElementById('music-search-input');
    if (searchInput) searchInput.focus();
  });

  // Lắng nghe tín hiệu mở nhanh Tab Danh sách phát Playlists
  window.novata.onSwitchToPlaylistTab(() => {
    switchTab('tab-playlists');
  });

  // Nút đóng cửa sổ Cài đặt
  const btnClose = document.getElementById('btn-close-window');
  if (btnClose) {
    btnClose.addEventListener('click', async () => {
      await window.novata.closeSettings();
    });
  }

  // 2. Tải và đồng bộ cấu hình người dùng từ Store
  try {
    settings = await window.novata.getSettings();
    populateUI(settings);
    await loadPlaylists();
    await checkDiscordStatus();
  } catch (err) {
    console.error('Lỗi khi tải cài đặt:', err);
  }

  function populateUI(cfg) {
    // 2.1. Hướng sóng (bottom, top)
    const dirCards = document.querySelectorAll('.mono-choice-card[data-direction]');
    dirCards.forEach(card => {
      if (card.getAttribute('data-direction') === (cfg.spectrumDirection || 'bottom')) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    // 2.2. Màu sắc Hex & Độ mờ hiện tại
    const currColor = (cfg.customColor || '#ffffff').toUpperCase();
    const currSwatch = document.getElementById('curr-swatch-display');
    const currHex = document.getElementById('curr-hex-display');
    if (currSwatch) currSwatch.style.background = currColor;
    if (currHex) currHex.textContent = currColor;

    const opacityVal = typeof cfg.waveformOpacity === 'number' ? cfg.waveformOpacity : 0.90;
    setSlider('range-waveform-opacity', 'val-waveform-opacity', opacityVal, '%', true);

    // 2.3. Các thanh trượt kích thước sóng âm
    setSlider('range-spectrum-height', 'val-spectrum-height', cfg.spectrumHeight || 160, 'px');
    setSlider('range-bar-width', 'val-bar-width', cfg.barWidth || 6, 'px');
    setSlider('range-bar-gap', 'val-bar-gap', cfg.barGap || 4, 'px');
    setSlider('range-sensitivity', 'val-sensitivity', cfg.sensitivity || 1.3, 'x');
    setSlider('range-smoothing', 'val-smoothing', cfg.fftSmoothing || 0.82, '');

    // 2.4. Công tắc bật tắt
    setCheckbox('check-show-media-card', cfg.showMediaCard !== false);
    setCheckbox('check-startup', !!cfg.launchOnStartup);
    setCheckbox('check-minimize-tray', cfg.minimizeToTray !== false);

    // 2.5. Discord RPC & Default Music Auto-Play
    setCheckbox('check-discord-rpc', cfg.discordRpcEnabled !== false);
    setCheckbox('check-autoplay-startup', !!cfg.autoPlayOnStartup);

    const selectStartupSource = document.getElementById('select-startup-source');
    if (selectStartupSource) {
      selectStartupSource.value = cfg.defaultStartupMode || 'playlist';
      updateStartupSourceRow(selectStartupSource.value);
    }
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

  // 3. Hàm lưu cài đặt cập nhật thời gian thực
  async function updateSetting(diff) {
    settings = { ...settings, ...diff };
    await window.novata.saveSettings(diff);
  }

  // 4. Lắng nghe các tương tác cài đặt
  // 4.1. Hướng sóng
  const dirCards = document.querySelectorAll('.mono-choice-card[data-direction]');
  dirCards.forEach(card => {
    card.addEventListener('click', () => {
      dirCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const dir = card.getAttribute('data-direction');
      updateSetting({ spectrumDirection: dir });
    });
  });

  // 4.2. Bảng màu gợi ý nhanh Quick Presets
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

  // 4.3. Pop up Chỉnh Màu Hex Đồng Bộ Phong Cách Settings
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

  if (btnTriggerModal) btnTriggerModal.addEventListener('click', openColorModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeColorModal);
  if (btnModalCancel) btnModalCancel.addEventListener('click', closeColorModal);

  if (colorModal) {
    colorModal.addEventListener('click', (e) => {
      if (e.target === colorModal) closeColorModal();
    });
  }

  if (modalBtnPick && modalNativePicker) {
    modalBtnPick.addEventListener('click', () => modalNativePicker.click());
  }

  if (modalNativePicker) {
    modalNativePicker.addEventListener('input', (e) => setModalColor(e.target.value));
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
      if (e.key === 'Enter') applyModalChanges();
    });
  }

  const paletteSwatches = document.querySelectorAll('.palette-swatch[data-hex]');
  paletteSwatches.forEach(btn => {
    btn.addEventListener('click', () => {
      const hex = btn.getAttribute('data-hex');
      setModalColor(hex);
    });
  });

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
    if (clean.length !== 6) clean = 'FFFFFF';
    const finalHex = '#' + clean.toUpperCase();

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

  if (btnModalApply) btnModalApply.addEventListener('click', applyModalChanges);

  // 4.4. Thanh trượt Độ mờ chính
  bindSlider('range-waveform-opacity', 'val-waveform-opacity', '%', (val) => {
    updateSetting({ waveformOpacity: parseFloat(val) });
  }, true);

  // 4.5. Các thanh trượt kích thước sóng âm
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

  // 4.6. Công tắc Hiện thẻ điều khiển & Đặt lại vị trí
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

  // 4.7. Cài đặt hệ thống & Discord RPC & Startup Music
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

  // Cấu hình Discord RPC
  const checkDiscordRpc = document.getElementById('check-discord-rpc');
  if (checkDiscordRpc) {
    checkDiscordRpc.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      const status = await window.novata.setDiscordRpcEnabled(enabled);
      updateDiscordBadge(status);
    });
  }

  async function checkDiscordStatus() {
    try {
      const status = await window.novata.getDiscordStatus();
      updateDiscordBadge(status);
    } catch (e) {}
  }

  function updateDiscordBadge(status) {
    const badge = document.getElementById('discord-rpc-status-badge');
    if (!badge) return;

    if (!status || !status.enabled) {
      badge.textContent = 'Disabled';
      badge.className = 'status-indicator-badge';
    } else if (status.connected) {
      badge.textContent = 'Connected';
      badge.className = 'status-indicator-badge connected';
    } else {
      badge.textContent = 'Waiting for Discord';
      badge.className = 'status-indicator-badge waiting';
    }
  }

  window.novata.onDiscordStatusChange((status) => {
    updateDiscordBadge(status);
  });

  // Cấu hình Auto-Play on Startup (Default Music)
  const checkAutoPlayStartup = document.getElementById('check-autoplay-startup');
  if (checkAutoPlayStartup) {
    checkAutoPlayStartup.addEventListener('change', (e) => {
      updateSetting({ autoPlayOnStartup: e.target.checked });
    });
  }

  const selectStartupSource = document.getElementById('select-startup-source');
  if (selectStartupSource) {
    selectStartupSource.addEventListener('change', (e) => {
      const mode = e.target.value;
      updateSetting({ defaultStartupMode: mode });
      updateStartupSourceRow(mode);
    });
  }

  function updateStartupSourceRow(mode) {
    const rowPlaylist = document.getElementById('row-startup-playlist');
    if (rowPlaylist) {
      if (mode === 'playlist') {
        rowPlaylist.classList.remove('hidden');
      } else {
        rowPlaylist.classList.add('hidden');
      }
    }
  }

  const selectStartupPlaylist = document.getElementById('select-startup-playlist');
  if (selectStartupPlaylist) {
    selectStartupPlaylist.addEventListener('change', (e) => {
      updateSetting({ defaultPlaylistId: e.target.value });
      renderPlaylistsList();
      renderActivePlaylistDetails();
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

  // ========================================================
  // 5. QUẢN LÝ MULTI-PLAYLISTS
  // ========================================================
  const playlistsContainer = document.getElementById('playlists-pills-container');
  const playlistsZeroState = document.getElementById('playlists-zero-state');
  const playlistActiveView = document.getElementById('playlist-active-view');
  const btnZeroCreatePl = document.getElementById('btn-zero-create-pl');

  const plActiveTitle = document.getElementById('pl-active-title');
  const plActiveCount = document.getElementById('pl-active-track-count');
  const plActiveDuration = document.getElementById('pl-active-duration');
  const plActiveStartupBadge = document.getElementById('pl-active-startup-badge');
  const tracksContainer = document.getElementById('playlist-tracks-container');

  const btnPlayAllPl = document.getElementById('btn-play-all-playlist');
  const btnShufflePl = document.getElementById('btn-shuffle-playlist');
  const btnSetStartupPl = document.getElementById('btn-set-startup-playlist');
  const btnEditActivePl = document.getElementById('btn-edit-active-playlist');
  const btnDeleteActivePl = document.getElementById('btn-delete-active-playlist');
  const btnCreatePlTrigger = document.getElementById('btn-create-playlist-trigger');

  // Modal tạo / sửa playlist (chỉ cần tên, không cần description)
  const modalPlaylistEdit = document.getElementById('modal-playlist-edit');
  const modalPlaylistTitleText = document.getElementById('modal-playlist-title-text');
  const inputPlName = document.getElementById('input-playlist-name');
  const btnClosePlModal = document.getElementById('btn-close-playlist-modal');
  const btnCancelPlModal = document.getElementById('btn-cancel-playlist-modal');
  const btnSavePlModal = document.getElementById('btn-save-playlist-modal');
  const btnSavePlLabel = document.getElementById('btn-save-playlist-label');

  // Modal thêm bài hát vào playlist
  const modalAddToPlaylist = document.getElementById('modal-add-to-playlist');
  const btnCloseAddModal = document.getElementById('btn-close-add-modal');
  const btnCancelAddModal = document.getElementById('btn-cancel-add-modal');
  const addTrackTargetThumb = document.getElementById('add-track-target-thumb');
  const addTrackTargetTitle = document.getElementById('add-track-target-title');
  const addTrackTargetArtist = document.getElementById('add-track-target-artist');
  const addPlaylistOptionsContainer = document.getElementById('add-playlist-options-container');

  // Nút tạo playlist khi đang ở trạng thái rỗng
  if (btnZeroCreatePl) {
    btnZeroCreatePl.addEventListener('click', () => {
      if (btnCreatePlTrigger) btnCreatePlTrigger.click();
    });
  }

  async function loadPlaylists() {
    try {
      playlists = await window.novata.getPlaylists();
      if (!Array.isArray(playlists)) playlists = [];

      // Kiểm tra nếu danh sách trống thì hiển thị Zero State
      if (playlists.length === 0) {
        if (playlistsZeroState) playlistsZeroState.classList.remove('hidden');
        if (playlistActiveView) playlistActiveView.classList.add('hidden');
        activePlaylistId = null;
      } else {
        if (playlistsZeroState) playlistsZeroState.classList.add('hidden');
        if (playlistActiveView) playlistActiveView.classList.remove('hidden');

        // Nếu chưa chọn playlist hoặc playlist được chọn không còn tồn tại
        if (!activePlaylistId || !playlists.find(p => p.id === activePlaylistId)) {
          const defaultId = settings.defaultPlaylistId;
          const found = defaultId ? playlists.find(p => p.id === defaultId) : null;
          activePlaylistId = found ? found.id : playlists[0].id;
        }
      }

      updateStartupPlaylistDropdown();
      renderPlaylistsList();
      renderActivePlaylistDetails();
    } catch (err) {
      console.error('Lỗi tải danh sách playlist:', err);
    }
  }

  function updateStartupPlaylistDropdown() {
    if (!selectStartupPlaylist) return;
    selectStartupPlaylist.innerHTML = '';

    if (playlists.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No playlists available';
      selectStartupPlaylist.appendChild(opt);
      return;
    }

    playlists.forEach(pl => {
      const opt = document.createElement('option');
      opt.value = pl.id;
      opt.textContent = `${pl.name} (${pl.tracks ? pl.tracks.length : 0} songs)`;
      if (pl.id === settings.defaultPlaylistId) {
        opt.selected = true;
      }
      selectStartupPlaylist.appendChild(opt);
    });
  }

  function renderPlaylistsList() {
    if (!playlistsContainer) return;
    playlistsContainer.innerHTML = '';

    if (playlists.length === 0) {
      playlistsContainer.innerHTML = '<div class="pills-empty-note">No playlists yet</div>';
      return;
    }

    playlists.forEach(pl => {
      const pill = document.createElement('div');
      pill.className = 'playlist-pill-item';
      if (pl.id === activePlaylistId) {
        pill.classList.add('active');
      }

      const isDefault = settings.defaultPlaylistId === pl.id;
      const count = pl.tracks ? pl.tracks.length : 0;

      pill.innerHTML = `
        <div class="pill-info">
          <div class="pill-name" title="${escapeHtml(pl.name)}">${escapeHtml(pl.name)}</div>
          <div class="pill-count">${count} ${count === 1 ? 'track' : 'tracks'}</div>
        </div>
        <div class="pill-icons">
          ${isDefault ? '<i class="bi bi-star-fill pill-startup-icon" title="Default Startup Playlist"></i>' : ''}
          <button class="pill-del-btn" title="Delete playlist" data-id="${pl.id}">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      `;

      // Bấm vào pill để chọn playlist
      pill.addEventListener('click', () => {
        activePlaylistId = pl.id;
        renderPlaylistsList();
        renderActivePlaylistDetails();
      });

      // Bấm nút xóa nhanh trên pill
      const btnDelPill = pill.querySelector('.pill-del-btn');
      if (btnDelPill) {
        btnDelPill.addEventListener('click', async (e) => {
          e.stopPropagation();
          await deletePlaylistWithConfirm(pl.id, pl.name);
        });
      }

      playlistsContainer.appendChild(pill);
    });
  }

  function renderActivePlaylistDetails() {
    if (playlists.length === 0 || !activePlaylistId) {
      if (tracksContainer) tracksContainer.innerHTML = '';
      return;
    }

    const pl = playlists.find(p => p.id === activePlaylistId);
    if (!pl) return;

    const isDefault = settings.defaultPlaylistId === pl.id;
    const tracks = pl.tracks || [];

    if (plActiveTitle) plActiveTitle.textContent = pl.name;
    if (plActiveCount) plActiveCount.textContent = `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`;

    // Tính tổng thời lượng ước lượng
    let totalSec = 0;
    tracks.forEach(t => {
      if (t.duration && t.duration.includes(':')) {
        const parts = t.duration.split(':');
        totalSec += (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
      } else {
        totalSec += 210;
      }
    });
    if (plActiveDuration) plActiveDuration.textContent = formatDuration(totalSec);

    // Cập nhật huy hiệu Startup
    if (plActiveStartupBadge) {
      if (isDefault) {
        plActiveStartupBadge.classList.remove('hidden');
      } else {
        plActiveStartupBadge.classList.add('hidden');
      }
    }

    // Cập nhật nút Set Startup
    const btnStartupStar = document.getElementById('btn-startup-star-icon');
    const btnStartupLabel = document.getElementById('btn-startup-label');
    if (btnStartupStar && btnStartupLabel) {
      if (isDefault) {
        btnStartupStar.className = 'bi bi-star-fill';
        btnStartupLabel.textContent = 'Startup Set';
        btnSetStartupPl.classList.add('active');
      } else {
        btnStartupStar.className = 'bi bi-star';
        btnStartupLabel.textContent = 'Set Startup';
        btnSetStartupPl.classList.remove('active');
      }
    }

    // Nút xóa luôn hiển thị cho mọi playlist
    if (btnDeleteActivePl) {
      btnDeleteActivePl.style.display = 'inline-flex';
    }

    renderPlaylistTracks(tracks, pl.id);
  }

  function renderPlaylistTracks(tracks, playlistId) {
    if (!tracksContainer) return;
    tracksContainer.innerHTML = '';

    if (!tracks || tracks.length === 0) {
      tracksContainer.innerHTML = `
        <div class="playlist-empty-state">
          <div class="empty-state-icon"><i class="bi bi-music-note-list"></i></div>
          <span>This playlist is currently empty.</span>
          <button class="mono-apply-btn" id="btn-jump-to-search">
            <i class="bi bi-search"></i>
            <span>Search & Add Tracks</span>
          </button>
        </div>
      `;
      const btnJump = document.getElementById('btn-jump-to-search');
      if (btnJump) {
        btnJump.addEventListener('click', () => switchTab('tab-music-search'));
      }
      return;
    }

    tracks.forEach((track, idx) => {
      const card = document.createElement('div');
      card.className = 'pl-track-card';
      if (activeInAppTrack && activeInAppTrack.id === track.id) {
        card.classList.add('playing');
      }

      const thumb = track.thumbnail || '../assets/icon.png';

      card.innerHTML = `
        <div class="pl-track-left">
          <span class="pl-track-num">${idx + 1}</span>
          <img src="${thumb}" class="pl-track-thumb" alt="Thumb" onerror="this.src='../assets/icon.png'">
          <div class="pl-track-info">
            <div class="pl-track-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</div>
            <div class="pl-track-artist">${escapeHtml(track.artist)}</div>
          </div>
        </div>
        <div class="pl-track-right">
          <span class="track-duration-text">${track.duration || '3:30'}</span>
          <button class="btn-play-track" title="Play Song">
            <i class="bi bi-play-fill"></i>
          </button>
          <button class="btn-remove-track" title="Remove from playlist">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      `;

      // Nút phát bài trong playlist
      const btnPlay = card.querySelector('.btn-play-track');
      btnPlay.addEventListener('click', async () => {
        await window.novata.playPlaylist(playlistId, idx, false);
      });

      card.addEventListener('dblclick', async () => {
        await window.novata.playPlaylist(playlistId, idx, false);
      });

      // Nút xóa bài khỏi playlist
      const btnRemove = card.querySelector('.btn-remove-track');
      btnRemove.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.novata.removeFromPlaylist(playlistId, track.id);
        await loadPlaylists();
      });

      tracksContainer.appendChild(card);
    });
  }

  function formatDuration(sec) {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }

  // Phát toàn bộ playlist
  if (btnPlayAllPl) {
    btnPlayAllPl.addEventListener('click', async () => {
      if (!activePlaylistId) return;
      await window.novata.playPlaylist(activePlaylistId, 0, false);
    });
  }

  // Xáo bài & Phát toàn bộ playlist (Shuffle & Play)
  if (btnShufflePl) {
    btnShufflePl.addEventListener('click', async () => {
      if (!activePlaylistId) return;
      await window.novata.playPlaylist(activePlaylistId, 0, true);
    });
  }

  // Đặt playlist này làm Default Music khi khởi động app
  if (btnSetStartupPl) {
    btnSetStartupPl.addEventListener('click', async () => {
      if (!activePlaylistId) return;
      await window.novata.setStartupPlaylist(activePlaylistId);
      settings.defaultPlaylistId = activePlaylistId;
      settings.autoPlayOnStartup = true;
      setCheckbox('check-autoplay-startup', true);
      updateStartupPlaylistDropdown();
      renderPlaylistsList();
      renderActivePlaylistDetails();
    });
  }

  // Modal tạo playlist mới
  if (btnCreatePlTrigger) {
    btnCreatePlTrigger.addEventListener('click', () => {
      editingPlaylistId = null;
      if (modalPlaylistTitleText) modalPlaylistTitleText.textContent = 'Create New Playlist';
      if (btnSavePlLabel) btnSavePlLabel.textContent = 'Create Playlist';
      if (inputPlName) inputPlName.value = '';
      if (modalPlaylistEdit) modalPlaylistEdit.classList.remove('hidden');
      if (inputPlName) inputPlName.focus();
    });
  }

  // Modal sửa / đổi tên playlist
  if (btnEditActivePl) {
    btnEditActivePl.addEventListener('click', () => {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (!pl) return;
      editingPlaylistId = pl.id;
      if (modalPlaylistTitleText) modalPlaylistTitleText.textContent = 'Rename Playlist';
      if (btnSavePlLabel) btnSavePlLabel.textContent = 'Save Changes';
      if (inputPlName) inputPlName.value = pl.name || '';
      if (modalPlaylistEdit) modalPlaylistEdit.classList.remove('hidden');
      if (inputPlName) inputPlName.focus();
    });
  }

  // Xóa playlist với hộp thoại xác nhận an toàn
  async function deletePlaylistWithConfirm(id, name) {
    const ok = confirm(`Are you sure you want to delete playlist "${name}"?`);
    if (!ok) return;

    await window.novata.deletePlaylist(id);

    // Nếu playlist này đang được chọn làm startup default, xóa cấu hình startup
    if (settings.defaultPlaylistId === id) {
      settings.defaultPlaylistId = null;
      await updateSetting({ defaultPlaylistId: null });
    }

    if (activePlaylistId === id) {
      activePlaylistId = null;
    }

    await loadPlaylists();
  }

  // Nút xóa playlist trên thanh công cụ
  if (btnDeleteActivePl) {
    btnDeleteActivePl.addEventListener('click', async () => {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (!pl) return;
      await deletePlaylistWithConfirm(pl.id, pl.name);
    });
  }

  function closePlaylistModal() {
    if (modalPlaylistEdit) modalPlaylistEdit.classList.add('hidden');
  }

  if (btnClosePlModal) btnClosePlModal.addEventListener('click', closePlaylistModal);
  if (btnCancelPlModal) btnCancelPlModal.addEventListener('click', closePlaylistModal);

  if (btnSavePlModal) {
    btnSavePlModal.addEventListener('click', async () => {
      const name = (inputPlName ? inputPlName.value : '').trim();
      if (!name) return;

      if (editingPlaylistId) {
        await window.novata.updatePlaylist(editingPlaylistId, { name });
      } else {
        const newPl = await window.novata.createPlaylist({ name });
        if (newPl && newPl.id) {
          activePlaylistId = newPl.id;
        }
      }

      closePlaylistModal();
      await loadPlaylists();
    });
  }

  // Modal Thêm bài hát vào Playlist (Add Track to Playlist)
  function openAddToPlaylistModal(track) {
    trackToAddToPlaylist = track;
    if (!modalAddToPlaylist) return;

    if (addTrackTargetTitle) addTrackTargetTitle.textContent = track.title;
    if (addTrackTargetArtist) addTrackTargetArtist.textContent = track.artist;
    if (addTrackTargetThumb) addTrackTargetThumb.src = track.thumbnail || '../assets/icon.png';

    renderAddPlaylistOptions();
    modalAddToPlaylist.classList.remove('hidden');
  }

  function renderAddPlaylistOptions() {
    if (!addPlaylistOptionsContainer) return;
    addPlaylistOptionsContainer.innerHTML = '';

    if (playlists.length === 0) {
      addPlaylistOptionsContainer.innerHTML = `
        <div class="add-pl-empty-prompt" style="padding: 18px 12px; text-align: center; color: var(--text-dim); font-size: 12.5px;">
          <p style="margin-bottom: 12px;">No playlists yet. Create a playlist first to add songs.</p>
          <button class="mono-apply-btn" id="btn-quick-create-pl" style="margin: 0 auto;">
            <i class="bi bi-plus-lg"></i>
            <span>Create Playlist</span>
          </button>
        </div>
      `;
      const btnQuick = document.getElementById('btn-quick-create-pl');
      if (btnQuick) {
        btnQuick.addEventListener('click', () => {
          closeAddModal();
          if (btnCreatePlTrigger) btnCreatePlTrigger.click();
        });
      }
      return;
    }

    playlists.forEach(pl => {
      const item = document.createElement('div');
      item.className = 'add-playlist-item';

      const count = pl.tracks ? pl.tracks.length : 0;
      const alreadyHas = pl.tracks && pl.tracks.some(t => t.id === trackToAddToPlaylist?.id);

      item.innerHTML = `
        <div class="add-pl-item-info">
          <span class="add-pl-item-name">${escapeHtml(pl.name)}</span>
          <span class="add-pl-item-count">${count} tracks</span>
        </div>
        <button class="btn-add-to-target-pl ${alreadyHas ? 'added' : ''}" data-pl-id="${pl.id}">
          <i class="bi ${alreadyHas ? 'bi-check-lg' : 'bi-plus-lg'}"></i>
          <span>${alreadyHas ? 'Added' : 'Add'}</span>
        </button>
      `;

      const btnAdd = item.querySelector('.btn-add-to-target-pl');
      btnAdd.addEventListener('click', async () => {
        if (!trackToAddToPlaylist) return;
        await window.novata.addToPlaylist(pl.id, trackToAddToPlaylist);
        btnAdd.classList.add('added');
        btnAdd.innerHTML = '<i class="bi bi-check-lg"></i> <span>Added</span>';
        await loadPlaylists();
      });

      addPlaylistOptionsContainer.appendChild(item);
    });
  }

  function closeAddModal() {
    if (modalAddToPlaylist) modalAddToPlaylist.classList.add('hidden');
    trackToAddToPlaylist = null;
  }

  if (btnCloseAddModal) btnCloseAddModal.addEventListener('click', closeAddModal);
  if (btnCancelAddModal) btnCancelAddModal.addEventListener('click', closeAddModal);

  // Lắng nghe cập nhật playlists từ các tiến trình khác
  window.novata.onPlaylistsChanged((updatedList) => {
    playlists = updatedList || [];
    renderPlaylistsList();
    renderActivePlaylistDetails();
    updateStartupPlaylistDropdown();
  });

  // ========================================================
  // 6. TÌM KIẾM & PHÁT NHẠC IN-APP
  // ========================================================
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

    tracks.forEach((track) => {
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
          <button class="btn-add-track-playlist" title="Add to Playlist">
            <i class="bi bi-folder-plus"></i>
          </button>
          <span class="track-duration-text">${track.duration || '3:30'}</span>
          <button class="btn-play-track" title="Play Track">
            <i class="bi bi-play-fill"></i>
          </button>
        </div>
      `;

      // Nút thêm vào Playlist
      const btnAdd = card.querySelector('.btn-add-track-playlist');
      btnAdd.addEventListener('click', (e) => {
        e.stopPropagation();
        openAddToPlaylistModal(track);
      });

      // Nút phát bài trực tiếp
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

  if (btnSubmitSearch && searchInput) {
    btnSubmitSearch.addEventListener('click', () => executeSearch(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeSearch(searchInput.value);
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

  const tagChips = document.querySelectorAll('.tag-chip[data-query]');
  tagChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (searchInput) searchInput.value = q;
      if (btnClearSearch) btnClearSearch.classList.remove('hidden');
      executeSearch(q);
    });
  });

  // Điều khiển qua Mini Player
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

  // Đồng bộ trạng thái bài hát từ Overlay
  window.novata.onInAppTrackChanged((data) => {
    if (data && data.track) {
      activeInAppTrack = data.track;
      inAppIsPlaying = data.isPlaying;
      updateMiniPlayer(data.track, inAppIsPlaying);

      // Cập nhật highlight bài hát trong danh sách playlist
      const allCards = document.querySelectorAll('.pl-track-card');
      allCards.forEach(c => {
        const titleEl = c.querySelector('.pl-track-title');
        if (titleEl && titleEl.textContent === data.track.title) {
          c.classList.add('playing');
        } else {
          c.classList.remove('playing');
        }
      });
    }
  });

  // Đồng bộ tiến trình phát từ Overlay Player
  window.novata.onInAppStateSync((state) => {
    if (!state) return;
    inAppIsPlaying = state.isPlaying;
    if (miniPlayIcon) {
      miniPlayIcon.className = inAppIsPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill';
    }

    if (state.track && (!activeInAppTrack || activeInAppTrack.id !== state.track.id)) {
      activeInAppTrack = state.track;
      updateMiniPlayer(state.track, inAppIsPlaying);
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
