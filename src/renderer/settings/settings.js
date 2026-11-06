document.addEventListener("DOMContentLoaded", async () => {
  let settings = {};
  let currentSearchResults = [];
  let activeInAppTrack = null;
  let inAppIsPlaying = false;
  let playlists = [];
  let activePlaylistId = null;
  let editingPlaylistId = null;
  let trackToAddToPlaylist = null;
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  function switchTab(targetId) {
    tabButtons.forEach((b) => {
      if (b.getAttribute("data-tab") === targetId) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });
    tabPanes.forEach((p) => {
      if (p.id === targetId) {
        p.classList.add("active");
      } else {
        p.classList.remove("active");
      }
    });
    if (targetId === "tab-playlists") {
      renderPlaylistsList();
      renderActivePlaylistDetails();
    }
  }
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      switchTab(targetId);
    });
  });
  window.novata.onSwitchToSearchTab(() => {
    switchTab("tab-music-search");
    const searchInput2 = document.getElementById("music-search-input");
    if (searchInput2) searchInput2.focus();
  });
  window.novata.onSwitchToPlaylistTab(() => {
    switchTab("tab-playlists");
  });
  const btnClose = document.getElementById("btn-close-window");
  if (btnClose) {
    btnClose.addEventListener("click", async () => {
      await window.novata.closeSettings();
    });
  }
  function populateUI(cfg) {
    const modeCards2 = document.querySelectorAll(".mono-choice-card[data-visualizer-mode]");
    const currentMode = cfg.visualizerMode || "bars";
    modeCards2.forEach((card) => {
      if (card.getAttribute("data-visualizer-mode") === currentMode) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
    updateVisualizerModeVisibility(currentMode);
    const barsMatCards2 = document.querySelectorAll(".mono-choice-card[data-bars-mat]");
    const currentBarsMat = cfg.barsMaterial || cfg.waveMaterial || "solid";
    barsMatCards2.forEach((card) => {
      if (card.getAttribute("data-bars-mat") === currentBarsMat) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
    updateBarsMaterialVisibility(currentBarsMat);
    const currColor = (cfg.customColor || "#ffffff").toUpperCase();
    const currSwatch = document.getElementById("curr-swatch-display");
    const currHex = document.getElementById("curr-hex-display");
    if (currSwatch) currSwatch.style.background = currColor;
    if (currHex) currHex.textContent = currColor;
    setSlider("range-waveform-opacity", "val-waveform-opacity", cfg.waveformOpacity !== void 0 ? cfg.waveformOpacity : 1, "%", true);
    setSlider("range-bars-glass-opacity", "val-bars-glass-opacity", cfg.barsGlassOpacity !== void 0 ? cfg.barsGlassOpacity : 0.28, "%", true);
    setSlider("range-bars-glass-blur", "val-bars-glass-blur", cfg.barsGlassBlur !== void 0 ? cfg.barsGlassBlur : 10, "px");
    const waveBorderMatCards2 = document.querySelectorAll(".mono-choice-card[data-wave-border-mat]");
    const currentBorderMat = cfg.waveBorderMaterial || cfg.waveMaterial || "solid";
    waveBorderMatCards2.forEach((card) => {
      if (card.getAttribute("data-wave-border-mat") === currentBorderMat) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
    updateWaveBorderMaterialVisibility(currentBorderMat);
    const borderColor = (cfg.waveBorderColor || "#ef4444").toUpperCase();
    const borderSwatch = document.getElementById("border-swatch-display");
    const borderHex = document.getElementById("border-hex-display");
    if (borderSwatch) borderSwatch.style.background = borderColor;
    if (borderHex) borderHex.textContent = borderColor;
    setSlider("range-wave-border-opacity", "val-wave-border-opacity", cfg.waveBorderOpacity !== void 0 ? cfg.waveBorderOpacity : 1, "%", true);
    setSlider("range-wave-border-glass-opacity", "val-wave-border-glass-opacity", cfg.waveBorderGlassOpacity !== void 0 ? cfg.waveBorderGlassOpacity : 0.7, "%", true);
    setSlider("range-wave-border-glass-blur", "val-wave-border-glass-blur", cfg.waveBorderGlassBlur !== void 0 ? cfg.waveBorderGlassBlur : 6, "px");
    setSlider("range-wave-border-width", "val-wave-border-width", cfg.waveBorderWidth !== void 0 ? cfg.waveBorderWidth : 3, "px");
    const waveInnerMatCards2 = document.querySelectorAll(".mono-choice-card[data-wave-inner-mat]");
    const currentInnerMat = cfg.waveInnerMaterial || cfg.waveMaterial || "solid";
    waveInnerMatCards2.forEach((card) => {
      if (card.getAttribute("data-wave-inner-mat") === currentInnerMat) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
    updateWaveInnerMaterialVisibility(currentInnerMat);
    const innerColor = (cfg.waveInnerColor || "#f97316").toUpperCase();
    const innerSwatch = document.getElementById("inner-swatch-display");
    const innerHex = document.getElementById("inner-hex-display");
    if (innerSwatch) innerSwatch.style.background = innerColor;
    if (innerHex) innerHex.textContent = innerColor;
    setSlider("range-wave-inner-opacity", "val-wave-inner-opacity", cfg.waveInnerOpacity !== void 0 ? cfg.waveInnerOpacity : 1, "%", true);
    setSlider("range-wave-inner-glass-opacity", "val-wave-inner-glass-opacity", cfg.waveInnerGlassOpacity !== void 0 ? cfg.waveInnerGlassOpacity : 0.25, "%", true);
    setSlider("range-wave-inner-glass-blur", "val-wave-inner-glass-blur", cfg.waveInnerGlassBlur !== void 0 ? cfg.waveInnerGlassBlur : 12, "px");
    updatePlayerUI(cfg);
    updateLyricsUI(cfg);
    const dirCards2 = document.querySelectorAll(".mono-choice-card[data-direction]");
    dirCards2.forEach((card) => {
      if (card.getAttribute("data-direction") === (cfg.spectrumDirection || "bottom")) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
    setSlider("range-spectrum-height", "val-spectrum-height", cfg.spectrumHeight || 160, "px");
    setSlider("range-bar-width", "val-bar-width", cfg.barWidth || 6, "px");
    setSlider("range-bar-gap", "val-bar-gap", cfg.barGap || 4, "px");
    setSlider("range-sensitivity", "val-sensitivity", cfg.sensitivity || 1.3, "x");
    setSlider("range-smoothing", "val-smoothing", cfg.fftSmoothing || 0.82, "");
    const selFps2 = document.getElementById("select-render-fps");
    if (selFps2) {
      selFps2.value = String(cfg.renderFps || 30);
    }
    setCheckbox("check-show-media-card", cfg.showMediaCard !== false);
    setCheckbox("check-startup", !!cfg.launchOnStartup);
    setCheckbox("check-minimize-tray", cfg.minimizeToTray !== false);
    setCheckbox("check-discord-rpc", cfg.discordRpcEnabled !== false);
    setCheckbox("check-autoplay-startup", !!cfg.autoPlayOnStartup);
    setCheckbox("check-show-lyrics", cfg.showLyricsWidget !== false);
    setSlider("range-lyrics-font-size", "val-lyrics-font-size", cfg.lyricsFontSize || 18, "px");
    updateLyricsFontUI(cfg);
    updateLyricsAlignUI(cfg.lyricsTextAlign || "center");
    const selectStartupSource2 = document.getElementById("select-startup-source");
    if (selectStartupSource2) {
      selectStartupSource2.value = cfg.defaultStartupMode || "playlist";
      updateStartupSourceRow(selectStartupSource2.value);
    }
    updateAppearanceSummary(cfg);
  }
  function updateAppearanceSummary(cfg) {
    if (!cfg) cfg = settings;
    const summaryShape = document.getElementById("summary-shape");
    const summaryEdge = document.getElementById("summary-edge");
    const summaryFps = document.getElementById("summary-fps");
    if (summaryShape) summaryShape.textContent = cfg.visualizerMode === "wave" ? "Continuous Wave" : "Vertical Bars";
    if (summaryEdge) summaryEdge.textContent = cfg.spectrumDirection === "top" ? "Top Edge" : "Bottom Edge";
    if (summaryFps) summaryFps.textContent = `${cfg.renderFps || 30} FPS`;
    const summaryWaveMat = document.getElementById("summary-wave-material");
    const dotWaveColor = document.getElementById("dot-wave-color");
    const labelWaveColor = document.getElementById("label-wave-color");
    if (summaryWaveMat) {
      if (cfg.visualizerMode === "wave") {
        const bMat = (cfg.waveBorderMaterial || "solid").toUpperCase();
        const iMat = (cfg.waveInnerMaterial || "solid").toUpperCase();
        summaryWaveMat.textContent = `${bMat} / ${iMat}`;
      } else {
        const mat = (cfg.barsMaterial || cfg.waveMaterial || "solid").toUpperCase();
        summaryWaveMat.textContent = `${mat} Color`;
      }
    }
    const activeColor = cfg.visualizerMode === "wave" ? cfg.waveBorderColor || "#EF4444" : cfg.customColor || "#FFFFFF";
    if (dotWaveColor) dotWaveColor.style.background = activeColor;
    if (labelWaveColor) labelWaveColor.textContent = activeColor.toUpperCase();
    const summaryPlayerStyle = document.getElementById("summary-player-style");
    const summaryPlayerBorder = document.getElementById("summary-player-border");
    const summaryPlayerVisible = document.getElementById("summary-player-visible");
    const pMat = cfg.widgetMaterial || "glass";
    if (summaryPlayerStyle) {
      summaryPlayerStyle.textContent = pMat === "glass" ? "Frosted Glass" : pMat === "solid" ? "Solid Surface" : "Transparent";
    }
    if (summaryPlayerBorder) {
      if (pMat === "transparent") {
        summaryPlayerBorder.textContent = cfg.widgetBorderEnabled !== false ? "Border On" : "No Border";
      } else {
        const bOp = cfg.widgetBorderOpacity !== void 0 ? cfg.widgetBorderOpacity : 0.18;
        summaryPlayerBorder.textContent = bOp > 0 ? `Border ${Math.round(bOp * 100)}%` : "Border Off";
      }
    }
    if (summaryPlayerVisible) {
      summaryPlayerVisible.textContent = cfg.showMediaCard !== false ? "Visible" : "Hidden";
    }
    const summaryLyricsStyle = document.getElementById("summary-lyrics-style");
    const summaryLyricsSize = document.getElementById("summary-lyrics-size");
    const summaryLyricsVisible = document.getElementById("summary-lyrics-visible");
    const lMat = cfg.lyricsMaterial || "glass";
    if (summaryLyricsStyle) {
      summaryLyricsStyle.textContent = lMat === "glass" ? "Frosted Glass" : lMat === "solid" ? "Solid Surface" : "Transparent";
    }
    if (summaryLyricsSize) {
      summaryLyricsSize.textContent = `${cfg.lyricsFontSize || 18}px`;
    }
    if (summaryLyricsVisible) {
      summaryLyricsVisible.textContent = cfg.showLyricsWidget !== false ? "Visible" : "Hidden";
    }
  }
  function updatePlayerUI(cfg) {
    const currentWidgetMat = cfg.widgetMaterial || "glass";
    const widgetMatCards = document.querySelectorAll(".mono-choice-card[data-player-mat]");
    widgetMatCards.forEach((card) => {
      if (card.getAttribute("data-player-mat") === currentWidgetMat) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
    updatePlayerMaterialVisibility(currentWidgetMat);
    const playerBg = (cfg.widgetBgColor || "#111116").toUpperCase();
    const playerBgSwatch = document.getElementById("player-bg-swatch-display");
    const playerBgHex = document.getElementById("player-bg-hex-display");
    if (playerBgSwatch) playerBgSwatch.style.background = playerBg;
    if (playerBgHex) playerBgHex.textContent = playerBg;
    const playerBorder = (cfg.widgetBorderColor || "#ffffff").toUpperCase();
    ["player-border-swatch-display", "player-glass-border-swatch", "player-trans-border-swatch"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.background = playerBorder;
    });
    ["player-border-hex-display", "player-glass-border-hex", "player-trans-border-hex"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = playerBorder;
    });
    const borderOp = cfg.widgetBorderOpacity !== void 0 ? cfg.widgetBorderOpacity : 0.18;
    setSlider("range-player-border-opacity", "val-player-border-opacity", borderOp, "%", true);
    setSlider("range-player-glass-border-opacity", "val-player-glass-border-opacity", borderOp, "%", true);
    setSlider("range-player-trans-border-opacity", "val-player-trans-border-opacity", cfg.widgetBorderOpacity !== void 0 ? cfg.widgetBorderOpacity : 0.35, "%", true);
    setSlider("range-widget-glass-opacity", "val-widget-glass-opacity", cfg.widgetGlassOpacity !== void 0 ? cfg.widgetGlassOpacity : 0.18, "%", true);
    setSlider("range-widget-glass-blur", "val-widget-glass-blur", cfg.widgetGlassBlur !== void 0 ? cfg.widgetGlassBlur : 20, "px");
    const borderEnabled = cfg.widgetBorderEnabled !== false;
    setCheckbox("check-player-border-enabled", borderEnabled);
    const transBorderBox = document.getElementById("player-trans-border-box");
    if (transBorderBox) transBorderBox.classList.toggle("hidden", !borderEnabled);
    const playerText = (cfg.widgetTextColor || "#ffffff").toUpperCase();
    const playerTextSwatch = document.getElementById("player-text-swatch");
    const playerTextHex = document.getElementById("player-text-hex");
    if (playerTextSwatch) playerTextSwatch.style.background = playerText;
    if (playerTextHex) playerTextHex.textContent = playerText;
    setSlider("range-player-text-size", "val-player-text-size", cfg.widgetTextSize || 14, "px");
    setSlider("range-player-border-radius", "val-player-border-radius", cfg.widgetBorderRadius !== void 0 ? cfg.widgetBorderRadius : 20, "px");
  }
  function updateLyricsUI(cfg) {
    const currentLyricsMat = cfg.lyricsMaterial || "glass";
    const lyricsMatCards2 = document.querySelectorAll(".mono-choice-card[data-lyrics-mat]");
    lyricsMatCards2.forEach((card) => {
      if (card.getAttribute("data-lyrics-mat") === currentLyricsMat) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
    updateLyricsMaterialVisibility(currentLyricsMat);
    const lyricsBg = (cfg.lyricsBgColor || "#111116").toUpperCase();
    const lyricsBgSwatch = document.getElementById("lyrics-bg-swatch-display");
    const lyricsBgHex = document.getElementById("lyrics-bg-hex-display");
    if (lyricsBgSwatch) lyricsBgSwatch.style.background = lyricsBg;
    if (lyricsBgHex) lyricsBgHex.textContent = lyricsBg;
    const lyricsBorder = (cfg.lyricsBorderColor || "#ffffff").toUpperCase();
    ["lyrics-border-swatch-display", "lyrics-glass-border-swatch", "lyrics-trans-border-swatch"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.background = lyricsBorder;
    });
    ["lyrics-border-hex-display", "lyrics-glass-border-hex", "lyrics-trans-border-hex"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = lyricsBorder;
    });
    const borderOp = cfg.lyricsBorderOpacity !== void 0 ? cfg.lyricsBorderOpacity : 0.18;
    setSlider("range-lyrics-border-opacity", "val-lyrics-border-opacity", borderOp, "%", true);
    setSlider("range-lyrics-glass-border-opacity", "val-lyrics-glass-border-opacity", borderOp, "%", true);
    setSlider("range-lyrics-trans-border-opacity", "val-lyrics-trans-border-opacity", cfg.lyricsBorderOpacity !== void 0 ? cfg.lyricsBorderOpacity : 0.35, "%", true);
    setSlider("range-lyrics-glass-opacity", "val-lyrics-glass-opacity", cfg.lyricsGlassOpacity !== void 0 ? cfg.lyricsGlassOpacity : 0.18, "%", true);
    setSlider("range-lyrics-glass-blur", "val-lyrics-glass-blur", cfg.lyricsGlassBlur !== void 0 ? cfg.lyricsGlassBlur : 20, "px");
    const borderEnabled = cfg.lyricsBorderEnabled !== false;
    setCheckbox("check-lyrics-border-enabled", borderEnabled);
    const transBorderBox = document.getElementById("lyrics-trans-border-box");
    if (transBorderBox) transBorderBox.classList.toggle("hidden", !borderEnabled);
    const lyricsText = (cfg.lyricsTextColor || "#ffffff").toUpperCase();
    const lyricsTextSwatch = document.getElementById("lyrics-text-swatch");
    const lyricsTextHex = document.getElementById("lyrics-text-hex");
    if (lyricsTextSwatch) lyricsTextSwatch.style.background = lyricsText;
    if (lyricsTextHex) lyricsTextHex.textContent = lyricsText;
    setSlider("range-lyrics-inactive-opacity", "val-lyrics-inactive-opacity", cfg.lyricsInactiveOpacity !== void 0 ? cfg.lyricsInactiveOpacity : 0.35, "%", true);
    setSlider("range-lyrics-border-radius", "val-lyrics-border-radius", cfg.lyricsBorderRadius !== void 0 ? cfg.lyricsBorderRadius : 20, "px");
  }
  function updateVisualizerModeVisibility(mode) {
    const isWave = mode === "wave";
    const sectionBars = document.getElementById("section-bars-settings");
    const sectionWave = document.getElementById("section-wave-settings");
    const rowBarWidth = document.getElementById("row-bar-width");
    const rowBarGap = document.getElementById("row-bar-gap");
    if (sectionBars) sectionBars.classList.toggle("hidden", isWave);
    if (sectionWave) sectionWave.classList.toggle("hidden", !isWave);
    if (rowBarWidth) rowBarWidth.classList.toggle("hidden", isWave);
    if (rowBarGap) rowBarGap.classList.toggle("hidden", isWave);
  }
  function updateBarsMaterialVisibility(mat) {
    const isGlass = mat === "glass";
    const solidControls = document.getElementById("bars-solid-controls");
    const glassControls = document.getElementById("bars-glass-controls");
    if (solidControls) solidControls.classList.toggle("hidden", isGlass);
    if (glassControls) glassControls.classList.toggle("hidden", !isGlass);
  }
  function updateWaveBorderMaterialVisibility(mat) {
    const isGlass = mat === "glass";
    const solidControls = document.getElementById("wave-border-solid-controls");
    const glassControls = document.getElementById("wave-border-glass-controls");
    if (solidControls) solidControls.classList.toggle("hidden", isGlass);
    if (glassControls) glassControls.classList.toggle("hidden", !isGlass);
  }
  function updateWaveInnerMaterialVisibility(mat) {
    const isGlass = mat === "glass";
    const solidControls = document.getElementById("wave-inner-solid-controls");
    const glassControls = document.getElementById("wave-inner-glass-controls");
    if (solidControls) solidControls.classList.toggle("hidden", isGlass);
    if (glassControls) glassControls.classList.toggle("hidden", !isGlass);
  }
  function updatePlayerMaterialVisibility(mat) {
    const isSolid = mat === "solid";
    const isGlass = mat === "glass";
    const isTrans = mat === "transparent";
    const solidBox = document.getElementById("player-solid-controls");
    const glassBox = document.getElementById("player-glass-controls");
    const transBox = document.getElementById("player-trans-controls");
    if (solidBox) solidBox.classList.toggle("hidden", !isSolid);
    if (glassBox) glassBox.classList.toggle("hidden", !isGlass);
    if (transBox) transBox.classList.toggle("hidden", !isTrans);
  }
  function updateLyricsMaterialVisibility(mat) {
    const isSolid = mat === "solid";
    const isGlass = mat === "glass";
    const isTrans = mat === "transparent";
    const solidBox = document.getElementById("lyrics-solid-controls");
    const glassBox = document.getElementById("lyrics-glass-controls");
    const transBox = document.getElementById("lyrics-trans-controls");
    if (solidBox) solidBox.classList.toggle("hidden", !isSolid);
    if (glassBox) glassBox.classList.toggle("hidden", !isGlass);
    if (transBox) transBox.classList.toggle("hidden", !isTrans);
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
  function updateLyricsFontUI(cfg) {
    const fontLabel = document.getElementById("font-file-name-label");
    const btnResetFont = document.getElementById("btn-reset-font-file");
    const selectFont = document.getElementById("select-lyrics-font");
    const optCustom = document.getElementById("opt-custom-font");
    if (cfg.lyricsCustomFont && cfg.lyricsCustomFont.name) {
      if (fontLabel) fontLabel.textContent = cfg.lyricsCustomFont.fileName || cfg.lyricsCustomFont.name;
      if (btnResetFont) btnResetFont.classList.remove("hidden");
      if (optCustom) {
        optCustom.disabled = false;
        optCustom.textContent = `Custom: ${cfg.lyricsCustomFont.name}`;
      }
      if (selectFont) selectFont.value = "custom";
    } else {
      if (fontLabel) fontLabel.textContent = "Default System Font";
      if (btnResetFont) btnResetFont.classList.add("hidden");
      if (optCustom) {
        optCustom.disabled = true;
        optCustom.textContent = "Custom Uploaded Font";
      }
      if (selectFont) {
        selectFont.value = cfg.lyricsFontFamily && cfg.lyricsFontFamily !== "custom" ? cfg.lyricsFontFamily : "system";
      }
    }
  }
  function updateLyricsAlignUI(align) {
    const btnCenter = document.getElementById("btn-align-center");
    const btnLeft = document.getElementById("btn-align-left");
    if (btnCenter && btnLeft) {
      btnCenter.classList.toggle("active", align === "center");
      btnLeft.classList.toggle("active", align === "left");
    }
  }
  async function updateSetting(diff) {
    settings = { ...settings, ...diff };
    await window.novata.saveSettings(diff);
    updateAppearanceSummary(settings);
  }
  const modeCards = document.querySelectorAll(".mono-choice-card[data-visualizer-mode]");
  modeCards.forEach((card) => {
    card.addEventListener("click", () => {
      modeCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      const mode = card.getAttribute("data-visualizer-mode");
      updateVisualizerModeVisibility(mode);
      updateSetting({ visualizerMode: mode });
    });
  });
  const barsMatCards = document.querySelectorAll(".mono-choice-card[data-bars-mat]");
  barsMatCards.forEach((card) => {
    card.addEventListener("click", () => {
      barsMatCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      const mat = card.getAttribute("data-bars-mat");
      updateBarsMaterialVisibility(mat);
      updateSetting({ barsMaterial: mat, waveMaterial: mat });
    });
  });
  const waveBorderMatCards = document.querySelectorAll(".mono-choice-card[data-wave-border-mat]");
  waveBorderMatCards.forEach((card) => {
    card.addEventListener("click", () => {
      waveBorderMatCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      const mat = card.getAttribute("data-wave-border-mat");
      updateWaveBorderMaterialVisibility(mat);
      updateSetting({ waveBorderMaterial: mat });
    });
  });
  const waveInnerMatCards = document.querySelectorAll(".mono-choice-card[data-wave-inner-mat]");
  waveInnerMatCards.forEach((card) => {
    card.addEventListener("click", () => {
      waveInnerMatCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      const mat = card.getAttribute("data-wave-inner-mat");
      updateWaveInnerMaterialVisibility(mat);
      updateSetting({ waveInnerMaterial: mat });
    });
  });
  const playerMatCards = document.querySelectorAll(".mono-choice-card[data-player-mat]");
  playerMatCards.forEach((card) => {
    card.addEventListener("click", () => {
      playerMatCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      const mat = card.getAttribute("data-player-mat");
      updatePlayerMaterialVisibility(mat);
      updateSetting({ widgetMaterial: mat });
    });
  });
  const lyricsMatCards = document.querySelectorAll(".mono-choice-card[data-lyrics-mat]");
  lyricsMatCards.forEach((card) => {
    card.addEventListener("click", () => {
      lyricsMatCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      const mat = card.getAttribute("data-lyrics-mat");
      updateLyricsMaterialVisibility(mat);
      updateSetting({ lyricsMaterial: mat });
    });
  });
  const checkPlayerBorder = document.getElementById("check-player-border-enabled");
  if (checkPlayerBorder) {
    checkPlayerBorder.addEventListener("change", (e) => {
      const enabled = e.target.checked;
      const borderBox = document.getElementById("player-trans-border-box");
      if (borderBox) borderBox.classList.toggle("hidden", !enabled);
      updateSetting({ widgetBorderEnabled: enabled });
    });
  }
  const checkLyricsBorder = document.getElementById("check-lyrics-border-enabled");
  if (checkLyricsBorder) {
    checkLyricsBorder.addEventListener("change", (e) => {
      const enabled = e.target.checked;
      const borderBox = document.getElementById("lyrics-trans-border-box");
      if (borderBox) borderBox.classList.toggle("hidden", !enabled);
      updateSetting({ lyricsBorderEnabled: enabled });
    });
  }
  bindSlider("range-player-border-opacity", "val-player-border-opacity", "%", (val) => {
    updateSetting({ widgetBorderOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-player-glass-border-opacity", "val-player-glass-border-opacity", "%", (val) => {
    updateSetting({ widgetBorderOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-player-trans-border-opacity", "val-player-trans-border-opacity", "%", (val) => {
    updateSetting({ widgetBorderOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-player-text-size", "val-player-text-size", "px", (val) => {
    updateSetting({ widgetTextSize: parseInt(val, 10) });
  });
  bindSlider("range-player-border-radius", "val-player-border-radius", "px", (val) => {
    updateSetting({ widgetBorderRadius: parseInt(val, 10) });
  });
  bindSlider("range-lyrics-border-opacity", "val-lyrics-border-opacity", "%", (val) => {
    updateSetting({ lyricsBorderOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-lyrics-glass-border-opacity", "val-lyrics-glass-border-opacity", "%", (val) => {
    updateSetting({ lyricsBorderOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-lyrics-trans-border-opacity", "val-lyrics-trans-border-opacity", "%", (val) => {
    updateSetting({ lyricsBorderOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-lyrics-inactive-opacity", "val-lyrics-inactive-opacity", "%", (val) => {
    updateSetting({ lyricsInactiveOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-lyrics-border-radius", "val-lyrics-border-radius", "px", (val) => {
    updateSetting({ lyricsBorderRadius: parseInt(val, 10) });
  });
  bindSlider("range-lyrics-glass-opacity", "val-lyrics-glass-opacity", "%", (val) => {
    updateSetting({ lyricsGlassOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-lyrics-glass-blur", "val-lyrics-glass-blur", "px", (val) => {
    updateSetting({ lyricsGlassBlur: parseInt(val, 10) });
  });
  const modalWaveform = document.getElementById("modal-config-waveform");
  const modalMaterial = document.getElementById("modal-config-material");
  const modalPlayer = document.getElementById("modal-config-player");
  const modalLyrics = document.getElementById("modal-config-lyrics");
  const cardOpenWave = document.getElementById("card-open-wave-config");
  const cardOpenMaterial = document.getElementById("card-open-material-config");
  const cardOpenPlayer = document.getElementById("card-open-player-config");
  const cardOpenLyrics = document.getElementById("card-open-lyrics-config");
  if (cardOpenWave && modalWaveform) {
    cardOpenWave.addEventListener("click", () => modalWaveform.classList.remove("hidden"));
  }
  if (cardOpenMaterial && modalMaterial) {
    cardOpenMaterial.addEventListener("click", () => modalMaterial.classList.remove("hidden"));
  }
  if (cardOpenPlayer && modalPlayer) {
    cardOpenPlayer.addEventListener("click", () => modalPlayer.classList.remove("hidden"));
  }
  if (cardOpenLyrics && modalLyrics) {
    cardOpenLyrics.addEventListener("click", () => modalLyrics.classList.remove("hidden"));
  }
  const allConfigModals = [modalWaveform, modalMaterial, modalPlayer, modalLyrics];
  allConfigModals.forEach((m) => {
    if (!m) return;
    const closeBtns = m.querySelectorAll(".btn-close-config-modal");
    closeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        m.classList.add("hidden");
        updateAppearanceSummary(settings);
      });
    });
    m.addEventListener("click", (e) => {
      if (e.target === m) {
        m.classList.add("hidden");
        updateAppearanceSummary(settings);
      }
    });
  });
  bindSlider("range-waveform-opacity", "val-waveform-opacity", "%", (val) => {
    updateSetting({ waveformOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-bars-glass-opacity", "val-bars-glass-opacity", "%", (val) => {
    updateSetting({ barsGlassOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-bars-glass-blur", "val-bars-glass-blur", "px", (val) => {
    updateSetting({ barsGlassBlur: parseInt(val, 10) });
  });
  bindSlider("range-wave-border-opacity", "val-wave-border-opacity", "%", (val) => {
    updateSetting({ waveBorderOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-wave-border-glass-opacity", "val-wave-border-glass-opacity", "%", (val) => {
    updateSetting({ waveBorderGlassOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-wave-border-glass-blur", "val-wave-border-glass-blur", "px", (val) => {
    updateSetting({ waveBorderGlassBlur: parseInt(val, 10) });
  });
  bindSlider("range-wave-border-width", "val-wave-border-width", "px", (val) => {
    updateSetting({ waveBorderWidth: parseFloat(val) });
  });
  bindSlider("range-wave-inner-opacity", "val-wave-inner-opacity", "%", (val) => {
    updateSetting({ waveInnerOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-wave-inner-glass-opacity", "val-wave-inner-glass-opacity", "%", (val) => {
    updateSetting({ waveInnerGlassOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-wave-inner-glass-blur", "val-wave-inner-glass-blur", "px", (val) => {
    updateSetting({ waveInnerGlassBlur: parseInt(val, 10) });
  });
  bindSlider("range-widget-glass-opacity", "val-widget-glass-opacity", "%", (val) => {
    updateSetting({ widgetGlassOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-widget-glass-blur", "val-widget-glass-blur", "px", (val) => {
    updateSetting({ widgetGlassBlur: parseInt(val, 10) });
  });
  const dirCards = document.querySelectorAll(".mono-choice-card[data-direction]");
  dirCards.forEach((card) => {
    card.addEventListener("click", () => {
      dirCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      const dir = card.getAttribute("data-direction");
      updateSetting({ spectrumDirection: dir });
    });
  });
  const quickSwatches = document.querySelectorAll(".swatch-btn[data-color]");
  quickSwatches.forEach((btn) => {
    btn.addEventListener("click", () => {
      const col = btn.getAttribute("data-color");
      const target = btn.getAttribute("data-target") || "bars";
      applyQuickColor(col, target);
    });
  });
  function applyQuickColor(hexStr, target = "bars") {
    let clean = hexStr.replace("#", "").trim();
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    if (clean.length === 6) {
      const fullHex = "#" + clean.toUpperCase();
      if (target === "waveBorder") {
        const borderSwatch = document.getElementById("border-swatch-display");
        const borderHex = document.getElementById("border-hex-display");
        if (borderSwatch) borderSwatch.style.background = fullHex;
        if (borderHex) borderHex.textContent = fullHex;
        updateSetting({ waveBorderColor: fullHex });
      } else if (target === "waveInner") {
        const innerSwatch = document.getElementById("inner-swatch-display");
        const innerHex = document.getElementById("inner-hex-display");
        if (innerSwatch) innerSwatch.style.background = fullHex;
        if (innerHex) innerHex.textContent = fullHex;
        updateSetting({ waveInnerColor: fullHex });
      } else {
        const currSwatch = document.getElementById("curr-swatch-display");
        const currHex = document.getElementById("curr-hex-display");
        if (currSwatch) currSwatch.style.background = fullHex;
        if (currHex) currHex.textContent = fullHex;
        updateSetting({ customColor: fullHex });
      }
    }
  }
  const colorModal = document.getElementById("color-modal");
  const modalTitleText = document.getElementById("modal-title-text");
  const btnCloseModal = document.getElementById("btn-close-color-modal");
  const btnModalCancel = document.getElementById("btn-modal-cancel");
  const btnModalApply = document.getElementById("btn-modal-apply");
  const modalSwatchBox = document.getElementById("modal-swatch-box");
  const modalNativePicker = document.getElementById("modal-native-color-picker");
  const modalHexInput = document.getElementById("modal-hex-input");
  const modalBtnPick = document.getElementById("modal-btn-pick");
  const modalRangeOpacity = document.getElementById("modal-range-opacity");
  const modalOpacityVal = document.getElementById("modal-opacity-val");
  let activeColorTarget = "bars";
  let modalSelectedColor = "#FFFFFF";
  let modalSelectedOpacity = 1;
  function openColorModal(target = "bars") {
    if (!colorModal) return;
    activeColorTarget = target;
    if (modalTitleText) {
      if (target === "waveBorder") {
        modalTitleText.textContent = "Customize Top Crest Border Color";
      } else if (target === "waveInner") {
        modalTitleText.textContent = "Customize Wave Inner Body Color";
      } else if (target === "playerBg") {
        modalTitleText.textContent = "Customize Player Background Color";
      } else if (target === "playerBorder") {
        modalTitleText.textContent = "Customize Player Border Color";
      } else if (target === "playerText") {
        modalTitleText.textContent = "Customize Player Text Color";
      } else if (target === "lyricsBg") {
        modalTitleText.textContent = "Customize Lyrics Background Color";
      } else if (target === "lyricsBorder") {
        modalTitleText.textContent = "Customize Lyrics Border Color";
      } else if (target === "lyricsText") {
        modalTitleText.textContent = "Customize Lyrics Text Color";
      } else {
        modalTitleText.textContent = "Customize Bars Color";
      }
    }
    if (target === "waveBorder") {
      modalSelectedColor = (settings.waveBorderColor || "#EF4444").toUpperCase();
      modalSelectedOpacity = typeof settings.waveBorderOpacity === "number" ? settings.waveBorderOpacity : 1;
    } else if (target === "waveInner") {
      modalSelectedColor = (settings.waveInnerColor || "#F97316").toUpperCase();
      modalSelectedOpacity = typeof settings.waveInnerOpacity === "number" ? settings.waveInnerOpacity : 1;
    } else if (target === "playerBg") {
      modalSelectedColor = (settings.widgetBgColor || "#111116").toUpperCase();
      modalSelectedOpacity = 1;
    } else if (target === "playerBorder") {
      modalSelectedColor = (settings.widgetBorderColor || "#FFFFFF").toUpperCase();
      modalSelectedOpacity = typeof settings.widgetBorderOpacity === "number" ? settings.widgetBorderOpacity : 0.18;
    } else if (target === "playerText") {
      modalSelectedColor = (settings.widgetTextColor || "#FFFFFF").toUpperCase();
      modalSelectedOpacity = 1;
    } else if (target === "lyricsBg") {
      modalSelectedColor = (settings.lyricsBgColor || "#111116").toUpperCase();
      modalSelectedOpacity = 1;
    } else if (target === "lyricsBorder") {
      modalSelectedColor = (settings.lyricsBorderColor || "#FFFFFF").toUpperCase();
      modalSelectedOpacity = typeof settings.lyricsBorderOpacity === "number" ? settings.lyricsBorderOpacity : 0.18;
    } else if (target === "lyricsText") {
      modalSelectedColor = (settings.lyricsTextColor || "#FFFFFF").toUpperCase();
      modalSelectedOpacity = 1;
    } else {
      modalSelectedColor = (settings.customColor || "#FFFFFF").toUpperCase();
      modalSelectedOpacity = typeof settings.waveformOpacity === "number" ? settings.waveformOpacity : 1;
    }
    if (modalSwatchBox) modalSwatchBox.style.background = modalSelectedColor;
    if (modalNativePicker) modalNativePicker.value = modalSelectedColor;
    if (modalHexInput) modalHexInput.value = modalSelectedColor.replace("#", "");
    if (modalRangeOpacity) modalRangeOpacity.value = modalSelectedOpacity;
    if (modalOpacityVal) modalOpacityVal.textContent = `${Math.round(modalSelectedOpacity * 100)}%`;
    colorModal.classList.remove("hidden");
  }
  function closeColorModal() {
    if (colorModal) colorModal.classList.add("hidden");
  }
  const btnTriggerModals = document.querySelectorAll(".btn-trigger-color-modal");
  btnTriggerModals.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target") || "bars";
      openColorModal(target);
    });
  });
  if (btnCloseModal) btnCloseModal.addEventListener("click", closeColorModal);
  if (btnModalCancel) btnModalCancel.addEventListener("click", closeColorModal);
  if (colorModal) {
    colorModal.addEventListener("click", (e) => {
      if (e.target === colorModal) closeColorModal();
    });
  }
  if (modalBtnPick && modalNativePicker) {
    modalBtnPick.addEventListener("click", () => modalNativePicker.click());
  }
  if (modalNativePicker) {
    modalNativePicker.addEventListener("input", (e) => setModalColor(e.target.value));
  }
  function setModalColor(hex) {
    let clean = hex.replace("#", "").trim().toUpperCase();
    if (clean.length > 6) clean = clean.substring(0, 6);
    modalSelectedColor = "#" + clean;
    if (modalHexInput) modalHexInput.value = clean;
    if (modalSwatchBox) modalSwatchBox.style.background = modalSelectedColor;
    if (modalNativePicker) modalNativePicker.value = modalSelectedColor;
  }
  if (modalHexInput) {
    modalHexInput.addEventListener("input", (e) => {
      let val = e.target.value.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
      e.target.value = val;
      if (val.length === 6 || val.length === 3) {
        setModalColor(val);
      }
    });
    modalHexInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyModalChanges();
    });
  }
  const paletteSwatches = document.querySelectorAll(".palette-swatch[data-hex]");
  paletteSwatches.forEach((btn) => {
    btn.addEventListener("click", () => {
      const hex = btn.getAttribute("data-hex");
      setModalColor(hex);
    });
  });
  if (modalRangeOpacity && modalOpacityVal) {
    modalRangeOpacity.addEventListener("input", (e) => {
      modalSelectedOpacity = parseFloat(e.target.value);
      modalOpacityVal.textContent = `${Math.round(modalSelectedOpacity * 100)}%`;
    });
  }
  function applyModalChanges() {
    let clean = (modalHexInput ? modalHexInput.value : "").replace("#", "").trim();
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    if (clean.length !== 6) clean = "FFFFFF";
    const finalHex = "#" + clean.toUpperCase();
    if (activeColorTarget === "waveBorder") {
      const borderSwatch = document.getElementById("border-swatch-display");
      const borderHex = document.getElementById("border-hex-display");
      if (borderSwatch) borderSwatch.style.background = finalHex;
      if (borderHex) borderHex.textContent = finalHex;
      setSlider("range-wave-border-opacity", "val-wave-border-opacity", modalSelectedOpacity, "%", true);
      updateSetting({
        waveBorderColor: finalHex,
        waveBorderOpacity: modalSelectedOpacity
      });
    } else if (activeColorTarget === "waveInner") {
      const innerSwatch = document.getElementById("inner-swatch-display");
      const innerHex = document.getElementById("inner-hex-display");
      if (innerSwatch) innerSwatch.style.background = finalHex;
      if (innerHex) innerHex.textContent = finalHex;
      setSlider("range-wave-inner-opacity", "val-wave-inner-opacity", modalSelectedOpacity, "%", true);
      updateSetting({
        waveInnerColor: finalHex,
        waveInnerOpacity: modalSelectedOpacity
      });
    } else if (activeColorTarget === "playerBg") {
      const bgSwatch = document.getElementById("player-bg-swatch-display");
      const bgHex = document.getElementById("player-bg-hex-display");
      if (bgSwatch) bgSwatch.style.background = finalHex;
      if (bgHex) bgHex.textContent = finalHex;
      updateSetting({ widgetBgColor: finalHex });
    } else if (activeColorTarget === "playerBorder") {
      const swatches = ["player-border-swatch-display", "player-glass-border-swatch", "player-trans-border-swatch"];
      const hexes = ["player-border-hex-display", "player-glass-border-hex", "player-trans-border-hex"];
      swatches.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.background = finalHex;
      });
      hexes.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = finalHex;
      });
      setSlider("range-player-border-opacity", "val-player-border-opacity", modalSelectedOpacity, "%", true);
      setSlider("range-player-glass-border-opacity", "val-player-glass-border-opacity", modalSelectedOpacity, "%", true);
      setSlider("range-player-trans-border-opacity", "val-player-trans-border-opacity", modalSelectedOpacity, "%", true);
      updateSetting({
        widgetBorderColor: finalHex,
        widgetBorderOpacity: modalSelectedOpacity
      });
    } else if (activeColorTarget === "playerText") {
      const textSwatch = document.getElementById("player-text-swatch");
      const textHex = document.getElementById("player-text-hex");
      if (textSwatch) textSwatch.style.background = finalHex;
      if (textHex) textHex.textContent = finalHex;
      updateSetting({ widgetTextColor: finalHex });
    } else if (activeColorTarget === "lyricsBg") {
      const bgSwatch = document.getElementById("lyrics-bg-swatch-display");
      const bgHex = document.getElementById("lyrics-bg-hex-display");
      if (bgSwatch) bgSwatch.style.background = finalHex;
      if (bgHex) bgHex.textContent = finalHex;
      updateSetting({ lyricsBgColor: finalHex });
    } else if (activeColorTarget === "lyricsBorder") {
      const swatches = ["lyrics-border-swatch-display", "lyrics-glass-border-swatch", "lyrics-trans-border-swatch"];
      const hexes = ["lyrics-border-hex-display", "lyrics-glass-border-hex", "lyrics-trans-border-hex"];
      swatches.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.background = finalHex;
      });
      hexes.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = finalHex;
      });
      setSlider("range-lyrics-border-opacity", "val-lyrics-border-opacity", modalSelectedOpacity, "%", true);
      setSlider("range-lyrics-glass-border-opacity", "val-lyrics-glass-border-opacity", modalSelectedOpacity, "%", true);
      setSlider("range-lyrics-trans-border-opacity", "val-lyrics-trans-border-opacity", modalSelectedOpacity, "%", true);
      updateSetting({
        lyricsBorderColor: finalHex,
        lyricsBorderOpacity: modalSelectedOpacity
      });
    } else if (activeColorTarget === "lyricsText") {
      const textSwatch = document.getElementById("lyrics-text-swatch");
      const textHex = document.getElementById("lyrics-text-hex");
      if (textSwatch) textSwatch.style.background = finalHex;
      if (textHex) textHex.textContent = finalHex;
      updateSetting({ lyricsTextColor: finalHex });
    } else {
      const currSwatch = document.getElementById("curr-swatch-display");
      const currHex = document.getElementById("curr-hex-display");
      if (currSwatch) currSwatch.style.background = finalHex;
      if (currHex) currHex.textContent = finalHex;
      setSlider("range-waveform-opacity", "val-waveform-opacity", modalSelectedOpacity, "%", true);
      updateSetting({
        customColor: finalHex,
        waveformOpacity: modalSelectedOpacity
      });
    }
    closeColorModal();
  }
  if (btnModalApply) btnModalApply.addEventListener("click", applyModalChanges);
  bindSlider("range-waveform-opacity", "val-waveform-opacity", "%", (val) => {
    updateSetting({ waveformOpacity: parseFloat(val) });
  }, true);
  bindSlider("range-spectrum-height", "val-spectrum-height", "px", (val) => {
    updateSetting({ spectrumHeight: parseInt(val, 10) });
  });
  bindSlider("range-bar-width", "val-bar-width", "px", (val) => {
    updateSetting({ barWidth: parseInt(val, 10) });
  });
  bindSlider("range-bar-gap", "val-bar-gap", "px", (val) => {
    updateSetting({ barGap: parseInt(val, 10) });
  });
  bindSlider("range-sensitivity", "val-sensitivity", "x", (val) => {
    updateSetting({ sensitivity: parseFloat(val) });
  });
  bindSlider("range-smoothing", "val-smoothing", "", (val) => {
    updateSetting({ fftSmoothing: parseFloat(val) });
  });
  const selFps = document.getElementById("select-render-fps");
  if (selFps) {
    selFps.addEventListener("change", (e) => {
      updateSetting({ renderFps: parseInt(e.target.value, 10) || 30 });
    });
  }
  const checkShowCard = document.getElementById("check-show-media-card");
  if (checkShowCard) {
    checkShowCard.addEventListener("change", (e) => {
      updateSetting({ showMediaCard: e.target.checked });
    });
  }
  const btnTriggerEdit = document.getElementById("btn-trigger-edit-mode");
  if (btnTriggerEdit) {
    btnTriggerEdit.addEventListener("click", async () => {
      if (window.novata.enterEditMode) {
        await window.novata.enterEditMode();
      }
      const prevHtml = btnTriggerEdit.innerHTML;
      btnTriggerEdit.innerHTML = '<i class="bi bi-check2"></i> Adjusting on Desktop!';
      setTimeout(() => {
        btnTriggerEdit.innerHTML = prevHtml;
      }, 1500);
    });
  }
  const btnResetPos = document.getElementById("btn-reset-player-pos");
  if (btnResetPos) {
    btnResetPos.addEventListener("click", async () => {
      await updateSetting({ playerCardPos: null, playerCardSize: null });
      const prevHtml = btnResetPos.innerHTML;
      btnResetPos.innerHTML = '<i class="bi bi-check2"></i> Reset to Default!';
      setTimeout(() => {
        btnResetPos.innerHTML = prevHtml;
      }, 1500);
    });
  }
  const checkStartup = document.getElementById("check-startup");
  if (checkStartup) {
    checkStartup.addEventListener("change", (e) => {
      updateSetting({ launchOnStartup: e.target.checked });
    });
  }
  const checkMinimize = document.getElementById("check-minimize-tray");
  if (checkMinimize) {
    checkMinimize.addEventListener("change", (e) => {
      updateSetting({ minimizeToTray: e.target.checked });
    });
  }
  const checkDiscordRpc = document.getElementById("check-discord-rpc");
  if (checkDiscordRpc) {
    checkDiscordRpc.addEventListener("change", async (e) => {
      const enabled = e.target.checked;
      const status = await window.novata.setDiscordRpcEnabled(enabled);
      updateDiscordBadge(status);
    });
  }
  async function checkDiscordStatus() {
    try {
      const status = await window.novata.getDiscordStatus();
      updateDiscordBadge(status);
    } catch (e) {
    }
  }
  function updateDiscordBadge(status) {
    const badge = document.getElementById("discord-rpc-status-badge");
    if (!badge) return;
    if (!status || !status.enabled) {
      badge.textContent = "Disabled";
      badge.className = "status-indicator-badge";
    } else if (status.connected) {
      badge.textContent = "Connected";
      badge.className = "status-indicator-badge connected";
    } else {
      badge.textContent = "Waiting for Discord";
      badge.className = "status-indicator-badge waiting";
    }
  }
  window.novata.onDiscordStatusChange((status) => {
    updateDiscordBadge(status);
  });
  const checkShowLyrics = document.getElementById("check-show-lyrics");
  if (checkShowLyrics) {
    checkShowLyrics.addEventListener("change", async (e) => {
      const show = e.target.checked;
      await updateSetting({ showLyricsWidget: show });
      await window.novata.toggleLyricsWidget(show);
    });
  }
  const btnChooseFontFile = document.getElementById("btn-choose-font-file");
  const btnResetFontFile = document.getElementById("btn-reset-font-file");
  const selectLyricsFont = document.getElementById("select-lyrics-font");
  if (btnChooseFontFile) {
    btnChooseFontFile.addEventListener("click", async () => {
      const res = await window.novata.selectFontFile();
      if (res && res.success && res.font) {
        settings.lyricsCustomFont = res.font;
        settings.lyricsFontFamily = res.font.name;
        updateLyricsFontUI(settings);
      }
    });
  }
  if (btnResetFontFile) {
    btnResetFontFile.addEventListener("click", async () => {
      await window.novata.resetCustomFont();
      settings.lyricsCustomFont = null;
      settings.lyricsFontFamily = "system";
      updateLyricsFontUI(settings);
    });
  }
  if (selectLyricsFont) {
    selectLyricsFont.addEventListener("change", async (e) => {
      const val = e.target.value;
      await updateSetting({ lyricsFontFamily: val });
    });
  }
  const rangeLyricsFontSize = document.getElementById("range-lyrics-font-size");
  const valLyricsFontSize = document.getElementById("val-lyrics-font-size");
  if (rangeLyricsFontSize && valLyricsFontSize) {
    rangeLyricsFontSize.addEventListener("input", (e) => {
      const size = parseInt(e.target.value, 10);
      valLyricsFontSize.textContent = `${size}px`;
      updateSetting({ lyricsFontSize: size });
    });
  }
  const btnAlignCenter = document.getElementById("btn-align-center");
  const btnAlignLeft = document.getElementById("btn-align-left");
  if (btnAlignCenter && btnAlignLeft) {
    btnAlignCenter.addEventListener("click", async () => {
      btnAlignCenter.classList.add("active");
      btnAlignLeft.classList.remove("active");
      await updateSetting({ lyricsTextAlign: "center" });
    });
    btnAlignLeft.addEventListener("click", async () => {
      btnAlignLeft.classList.add("active");
      btnAlignCenter.classList.remove("active");
      await updateSetting({ lyricsTextAlign: "left" });
    });
  }
  const btnTriggerLyricsEdit = document.getElementById("btn-trigger-lyrics-edit-mode");
  if (btnTriggerLyricsEdit) {
    btnTriggerLyricsEdit.addEventListener("click", async () => {
      await window.novata.enterEditMode();
    });
  }
  const checkAutoPlayStartup = document.getElementById("check-autoplay-startup");
  if (checkAutoPlayStartup) {
    checkAutoPlayStartup.addEventListener("change", (e) => {
      updateSetting({ autoPlayOnStartup: e.target.checked });
    });
  }
  const selectStartupSource = document.getElementById("select-startup-source");
  if (selectStartupSource) {
    selectStartupSource.addEventListener("change", (e) => {
      const mode = e.target.value;
      updateSetting({ defaultStartupMode: mode });
      updateStartupSourceRow(mode);
    });
  }
  function updateStartupSourceRow(mode) {
    const rowPlaylist = document.getElementById("row-startup-playlist");
    if (rowPlaylist) {
      if (mode === "playlist") {
        rowPlaylist.classList.remove("hidden");
      } else {
        rowPlaylist.classList.add("hidden");
      }
    }
  }
  const selectStartupPlaylist = document.getElementById("select-startup-playlist");
  if (selectStartupPlaylist) {
    selectStartupPlaylist.addEventListener("change", (e) => {
      updateSetting({ defaultPlaylistId: e.target.value });
      renderPlaylistsList();
      renderActivePlaylistDetails();
    });
  }
  function bindSlider(sliderId, labelId, unit, onChange, isPercent = false) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (!slider || !label) return;
    slider.addEventListener("input", (e) => {
      const v = e.target.value;
      if (isPercent) {
        label.textContent = `${Math.round(parseFloat(v) * 100)}${unit}`;
      } else {
        label.textContent = `${v}${unit}`;
      }
      onChange(v);
    });
  }
  const playlistsContainer = document.getElementById("playlists-pills-container");
  const playlistsZeroState = document.getElementById("playlists-zero-state");
  const playlistActiveView = document.getElementById("playlist-active-view");
  const btnZeroCreatePl = document.getElementById("btn-zero-create-pl");
  const plActiveTitle = document.getElementById("pl-active-title");
  const plActiveCount = document.getElementById("pl-active-track-count");
  const plActiveDuration = document.getElementById("pl-active-duration");
  const plActiveStartupBadge = document.getElementById("pl-active-startup-badge");
  const tracksContainer = document.getElementById("playlist-tracks-container");
  const btnPlayAllPl = document.getElementById("btn-play-all-playlist");
  const btnShufflePl = document.getElementById("btn-shuffle-playlist");
  const btnSetStartupPl = document.getElementById("btn-set-startup-playlist");
  const btnEditActivePl = document.getElementById("btn-edit-active-playlist");
  const btnDeleteActivePl = document.getElementById("btn-delete-active-playlist");
  const btnCreatePlTrigger = document.getElementById("btn-create-playlist-trigger");
  const modalPlaylistEdit = document.getElementById("modal-playlist-edit");
  const modalPlaylistTitleText = document.getElementById("modal-playlist-title-text");
  const inputPlName = document.getElementById("input-playlist-name");
  const btnClosePlModal = document.getElementById("btn-close-playlist-modal");
  const btnCancelPlModal = document.getElementById("btn-cancel-playlist-modal");
  const btnSavePlModal = document.getElementById("btn-save-playlist-modal");
  const btnSavePlLabel = document.getElementById("btn-save-playlist-label");
  const modalAddToPlaylist = document.getElementById("modal-add-to-playlist");
  const btnCloseAddModal = document.getElementById("btn-close-add-modal");
  const btnCancelAddModal = document.getElementById("btn-cancel-add-modal");
  const addTrackTargetThumb = document.getElementById("add-track-target-thumb");
  const addTrackTargetTitle = document.getElementById("add-track-target-title");
  const addTrackTargetArtist = document.getElementById("add-track-target-artist");
  const addPlaylistOptionsContainer = document.getElementById("add-playlist-options-container");
  if (btnZeroCreatePl) {
    btnZeroCreatePl.addEventListener("click", () => {
      if (btnCreatePlTrigger) btnCreatePlTrigger.click();
    });
  }
  async function loadPlaylists() {
    try {
      playlists = await window.novata.getPlaylists();
      if (!Array.isArray(playlists)) playlists = [];
      if (playlists.length === 0) {
        if (playlistsZeroState) playlistsZeroState.classList.remove("hidden");
        if (playlistActiveView) playlistActiveView.classList.add("hidden");
        activePlaylistId = null;
      } else {
        if (playlistsZeroState) playlistsZeroState.classList.add("hidden");
        if (playlistActiveView) playlistActiveView.classList.remove("hidden");
        if (!activePlaylistId || !playlists.find((p) => p.id === activePlaylistId)) {
          const defaultId = settings.defaultPlaylistId;
          const found = defaultId ? playlists.find((p) => p.id === defaultId) : null;
          activePlaylistId = found ? found.id : playlists[0].id;
        }
      }
      updateStartupPlaylistDropdown();
      renderPlaylistsList();
      renderActivePlaylistDetails();
    } catch (err) {
      console.error("L\u1ED7i t\u1EA3i danh s\xE1ch playlist:", err);
    }
  }
  function updateStartupPlaylistDropdown() {
    if (!selectStartupPlaylist) return;
    selectStartupPlaylist.innerHTML = "";
    if (playlists.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No playlists available";
      selectStartupPlaylist.appendChild(opt);
      return;
    }
    playlists.forEach((pl) => {
      const opt = document.createElement("option");
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
    playlistsContainer.innerHTML = "";
    if (playlists.length === 0) {
      playlistsContainer.innerHTML = '<div class="pills-empty-note">No playlists yet</div>';
      return;
    }
    playlists.forEach((pl) => {
      const pill = document.createElement("div");
      pill.className = "playlist-pill-item";
      if (pl.id === activePlaylistId) {
        pill.classList.add("active");
      }
      const isDefault = settings.defaultPlaylistId === pl.id;
      const count = pl.tracks ? pl.tracks.length : 0;
      pill.innerHTML = `
        <div class="pill-info">
          <div class="pill-name" title="${escapeHtml(pl.name)}">${escapeHtml(pl.name)}</div>
          <div class="pill-count">${count} ${count === 1 ? "track" : "tracks"}</div>
        </div>
        <div class="pill-icons">
          ${isDefault ? '<i class="bi bi-star-fill pill-startup-icon" title="Default Startup Playlist"></i>' : ""}
          <button class="pill-del-btn" title="Delete playlist" data-id="${pl.id}">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      `;
      pill.addEventListener("click", () => {
        activePlaylistId = pl.id;
        renderPlaylistsList();
        renderActivePlaylistDetails();
      });
      const btnDelPill = pill.querySelector(".pill-del-btn");
      if (btnDelPill) {
        btnDelPill.addEventListener("click", async (e) => {
          e.stopPropagation();
          await deletePlaylistWithConfirm(pl.id, pl.name);
        });
      }
      playlistsContainer.appendChild(pill);
    });
  }
  function renderActivePlaylistDetails() {
    if (playlists.length === 0 || !activePlaylistId) {
      if (tracksContainer) tracksContainer.innerHTML = "";
      return;
    }
    const pl = playlists.find((p) => p.id === activePlaylistId);
    if (!pl) return;
    const isDefault = settings.defaultPlaylistId === pl.id;
    const tracks = pl.tracks || [];
    if (plActiveTitle) plActiveTitle.textContent = pl.name;
    if (plActiveCount) plActiveCount.textContent = `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`;
    let totalSec = 0;
    tracks.forEach((t) => {
      if (t.duration && t.duration.includes(":")) {
        const parts = t.duration.split(":");
        totalSec += (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
      } else {
        totalSec += 210;
      }
    });
    if (plActiveDuration) plActiveDuration.textContent = formatDuration(totalSec);
    if (plActiveStartupBadge) {
      if (isDefault) {
        plActiveStartupBadge.classList.remove("hidden");
      } else {
        plActiveStartupBadge.classList.add("hidden");
      }
    }
    const btnStartupStar = document.getElementById("btn-startup-star-icon");
    const btnStartupLabel = document.getElementById("btn-startup-label");
    if (btnStartupStar && btnStartupLabel) {
      if (isDefault) {
        btnStartupStar.className = "bi bi-star-fill";
        btnStartupLabel.textContent = "Startup Set";
        btnSetStartupPl.classList.add("active");
      } else {
        btnStartupStar.className = "bi bi-star";
        btnStartupLabel.textContent = "Set Startup";
        btnSetStartupPl.classList.remove("active");
      }
    }
    if (btnDeleteActivePl) {
      btnDeleteActivePl.style.display = "inline-flex";
    }
    renderPlaylistTracks(tracks, pl.id);
  }
  function renderPlaylistTracks(tracks, playlistId) {
    if (!tracksContainer) return;
    tracksContainer.innerHTML = "";
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
      const btnJump = document.getElementById("btn-jump-to-search");
      if (btnJump) {
        btnJump.addEventListener("click", () => switchTab("tab-music-search"));
      }
      return;
    }
    tracks.forEach((track, idx) => {
      const card = document.createElement("div");
      card.className = "pl-track-card";
      if (activeInAppTrack && activeInAppTrack.id === track.id) {
        card.classList.add("playing");
      }
      const thumb = track.thumbnail || "../assets/icon.png";
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
          <span class="track-duration-text">${track.duration || "3:30"}</span>
          <button class="btn-play-track" title="Play Song">
            <i class="bi bi-play-fill"></i>
          </button>
          <button class="btn-remove-track" title="Remove from playlist">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      `;
      const btnPlay = card.querySelector(".btn-play-track");
      btnPlay.addEventListener("click", async () => {
        await window.novata.playPlaylist(playlistId, idx, false);
      });
      card.addEventListener("dblclick", async () => {
        await window.novata.playPlaylist(playlistId, idx, false);
      });
      const btnRemove = card.querySelector(".btn-remove-track");
      btnRemove.addEventListener("click", async (e) => {
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
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  }
  if (btnPlayAllPl) {
    btnPlayAllPl.addEventListener("click", async () => {
      if (!activePlaylistId) return;
      await window.novata.playPlaylist(activePlaylistId, 0, false);
    });
  }
  if (btnShufflePl) {
    btnShufflePl.addEventListener("click", async () => {
      if (!activePlaylistId) return;
      await window.novata.playPlaylist(activePlaylistId, 0, true);
    });
  }
  if (btnSetStartupPl) {
    btnSetStartupPl.addEventListener("click", async () => {
      if (!activePlaylistId) return;
      await window.novata.setStartupPlaylist(activePlaylistId);
      settings.defaultPlaylistId = activePlaylistId;
      settings.autoPlayOnStartup = true;
      setCheckbox("check-autoplay-startup", true);
      updateStartupPlaylistDropdown();
      renderPlaylistsList();
      renderActivePlaylistDetails();
    });
  }
  if (btnCreatePlTrigger) {
    btnCreatePlTrigger.addEventListener("click", () => {
      editingPlaylistId = null;
      if (modalPlaylistTitleText) modalPlaylistTitleText.textContent = "Create New Playlist";
      if (btnSavePlLabel) btnSavePlLabel.textContent = "Create Playlist";
      if (inputPlName) inputPlName.value = "";
      if (modalPlaylistEdit) modalPlaylistEdit.classList.remove("hidden");
      if (inputPlName) inputPlName.focus();
    });
  }
  if (btnEditActivePl) {
    btnEditActivePl.addEventListener("click", () => {
      const pl = playlists.find((p) => p.id === activePlaylistId);
      if (!pl) return;
      editingPlaylistId = pl.id;
      if (modalPlaylistTitleText) modalPlaylistTitleText.textContent = "Rename Playlist";
      if (btnSavePlLabel) btnSavePlLabel.textContent = "Save Changes";
      if (inputPlName) inputPlName.value = pl.name || "";
      if (modalPlaylistEdit) modalPlaylistEdit.classList.remove("hidden");
      if (inputPlName) inputPlName.focus();
    });
  }
  async function deletePlaylistWithConfirm(id, name) {
    const ok = confirm(`Are you sure you want to delete playlist "${name}"?`);
    if (!ok) return;
    await window.novata.deletePlaylist(id);
    if (settings.defaultPlaylistId === id) {
      settings.defaultPlaylistId = null;
      await updateSetting({ defaultPlaylistId: null });
    }
    if (activePlaylistId === id) {
      activePlaylistId = null;
    }
    await loadPlaylists();
  }
  if (btnDeleteActivePl) {
    btnDeleteActivePl.addEventListener("click", async () => {
      const pl = playlists.find((p) => p.id === activePlaylistId);
      if (!pl) return;
      await deletePlaylistWithConfirm(pl.id, pl.name);
    });
  }
  function closePlaylistModal() {
    if (modalPlaylistEdit) modalPlaylistEdit.classList.add("hidden");
  }
  if (btnClosePlModal) btnClosePlModal.addEventListener("click", closePlaylistModal);
  if (btnCancelPlModal) btnCancelPlModal.addEventListener("click", closePlaylistModal);
  if (btnSavePlModal) {
    btnSavePlModal.addEventListener("click", async () => {
      const name = (inputPlName ? inputPlName.value : "").trim();
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
  function openAddToPlaylistModal(track) {
    trackToAddToPlaylist = track;
    if (!modalAddToPlaylist) return;
    if (addTrackTargetTitle) addTrackTargetTitle.textContent = track.title;
    if (addTrackTargetArtist) addTrackTargetArtist.textContent = track.artist;
    if (addTrackTargetThumb) addTrackTargetThumb.src = track.thumbnail || "../assets/icon.png";
    renderAddPlaylistOptions();
    modalAddToPlaylist.classList.remove("hidden");
  }
  function renderAddPlaylistOptions() {
    if (!addPlaylistOptionsContainer) return;
    addPlaylistOptionsContainer.innerHTML = "";
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
      const btnQuick = document.getElementById("btn-quick-create-pl");
      if (btnQuick) {
        btnQuick.addEventListener("click", () => {
          closeAddModal();
          if (btnCreatePlTrigger) btnCreatePlTrigger.click();
        });
      }
      return;
    }
    playlists.forEach((pl) => {
      const item = document.createElement("div");
      item.className = "add-playlist-item";
      const count = pl.tracks ? pl.tracks.length : 0;
      const alreadyHas = pl.tracks && pl.tracks.some((t) => t.id === trackToAddToPlaylist?.id);
      item.innerHTML = `
        <div class="add-pl-item-info">
          <span class="add-pl-item-name">${escapeHtml(pl.name)}</span>
          <span class="add-pl-item-count">${count} tracks</span>
        </div>
        <button class="btn-add-to-target-pl ${alreadyHas ? "added" : ""}" data-pl-id="${pl.id}">
          <i class="bi ${alreadyHas ? "bi-check-lg" : "bi-plus-lg"}"></i>
          <span>${alreadyHas ? "Added" : "Add"}</span>
        </button>
      `;
      const btnAdd = item.querySelector(".btn-add-to-target-pl");
      btnAdd.addEventListener("click", async () => {
        if (!trackToAddToPlaylist) return;
        await window.novata.addToPlaylist(pl.id, trackToAddToPlaylist);
        btnAdd.classList.add("added");
        btnAdd.innerHTML = '<i class="bi bi-check-lg"></i> <span>Added</span>';
        await loadPlaylists();
      });
      addPlaylistOptionsContainer.appendChild(item);
    });
  }
  function closeAddModal() {
    if (modalAddToPlaylist) modalAddToPlaylist.classList.add("hidden");
    trackToAddToPlaylist = null;
  }
  if (btnCloseAddModal) btnCloseAddModal.addEventListener("click", closeAddModal);
  if (btnCancelAddModal) btnCancelAddModal.addEventListener("click", closeAddModal);
  window.novata.onPlaylistsChanged((updatedList) => {
    playlists = updatedList || [];
    renderPlaylistsList();
    renderActivePlaylistDetails();
    updateStartupPlaylistDropdown();
  });
  const searchInput = document.getElementById("music-search-input");
  const btnSubmitSearch = document.getElementById("btn-submit-search");
  const btnClearSearch = document.getElementById("btn-clear-search");
  const resultsList = document.getElementById("music-results-list");
  const searchStatusText = document.getElementById("search-status-text");
  const resultsCountBadge = document.getElementById("results-count-badge");
  const miniPlayerThumb = document.getElementById("mini-player-thumb");
  const miniTitle = document.getElementById("mini-title");
  const miniArtist = document.getElementById("mini-artist");
  const miniPlayIcon = document.getElementById("mini-play-icon");
  const miniBtnPlay = document.getElementById("mini-btn-play");
  const miniBtnPrev = document.getElementById("mini-btn-prev");
  const miniBtnNext = document.getElementById("mini-btn-next");
  const miniTimeDisplay = document.getElementById("mini-time-display");
  setTimeout(() => {
    executeSearch("chill lofi beats");
  }, 350);
  async function executeSearch(query) {
    if (!query || !query.trim()) return;
    const cleanQ = query.trim();
    if (searchStatusText) searchStatusText.textContent = `Searching for "${cleanQ}"...`;
    if (resultsCountBadge) resultsCountBadge.textContent = "Loading";
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
      if (resultsCountBadge) resultsCountBadge.textContent = "Error";
      if (searchStatusText) searchStatusText.textContent = "Search failed";
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
    resultsList.innerHTML = "";
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
      const card = document.createElement("div");
      card.className = "music-track-item";
      if (activeInAppTrack && activeInAppTrack.id === track.id) {
        card.classList.add("playing");
      }
      const thumbUrl = track.thumbnail || "../assets/icon.png";
      let badgeHtml = "";
      if (track.source) {
        const srcLower = track.source.toLowerCase();
        let badgeClass = "youtube";
        let badgeText = track.source;
        if (srcLower.includes("spotify")) {
          badgeClass = "spotify";
          badgeText = "Spotify";
        } else if (srcLower.includes("sound") || srcLower.includes("cloud")) {
          badgeClass = "soundcloud";
          badgeText = "SoundCloud";
        } else if (srcLower.includes("apple")) {
          badgeClass = "applemusic";
          badgeText = "Apple Music";
        } else if (track.isDirectLink) {
          badgeClass = "youtube";
          badgeText = "Direct Link";
        }
        badgeHtml = `<span class="direct-link-badge ${badgeClass}">${badgeText}</span>`;
      }
      card.innerHTML = `
        <div class="track-item-left">
          <img src="${thumbUrl}" class="track-thumb" alt="Thumb" onerror="this.src='../assets/icon.png'">
          <div class="track-info">
            <div class="track-title" title="${escapeHtml(track.title)}">
              <span>${escapeHtml(track.title)}</span>
              ${badgeHtml}
            </div>
            <div class="track-artist">${escapeHtml(track.artist)}</div>
          </div>
        </div>
        <div class="track-item-right">
          <button class="btn-add-track-playlist" title="Add to Playlist">
            <i class="bi bi-folder-plus"></i>
          </button>
          <span class="track-duration-text">${track.duration || "3:30"}</span>
          <button class="btn-play-track" title="Play Track">
            <i class="bi bi-play-fill"></i>
          </button>
        </div>
      `;
      const btnAdd = card.querySelector(".btn-add-track-playlist");
      btnAdd.addEventListener("click", (e) => {
        e.stopPropagation();
        openAddToPlaylistModal(track);
      });
      const playBtn = card.querySelector(".btn-play-track");
      playBtn.addEventListener("click", async () => {
        await playTrackInApp(track, playBtn);
      });
      card.addEventListener("dblclick", async () => {
        await playTrackInApp(track, playBtn);
      });
      resultsList.appendChild(card);
    });
  }
  function escapeHtml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  async function playTrackInApp(track, playBtn) {
    activeInAppTrack = track;
    inAppIsPlaying = true;
    updateMiniPlayer(track, true, "Loading audio stream...");
    const allItems = document.querySelectorAll(".music-track-item");
    allItems.forEach((item) => item.classList.remove("playing"));
    if (playBtn) {
      const parent = playBtn.closest(".music-track-item");
      if (parent) parent.classList.add("playing");
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
      miniPlayIcon.className = isPlaying ? "bi bi-pause-fill" : "bi bi-play-fill";
    }
  }
  if (btnSubmitSearch && searchInput) {
    btnSubmitSearch.addEventListener("click", () => executeSearch(searchInput.value));
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") executeSearch(searchInput.value);
    });
  }
  const btnPasteLink = document.getElementById("btn-paste-link");
  if (btnPasteLink && searchInput) {
    btnPasteLink.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          searchInput.value = text.trim();
          if (btnClearSearch) btnClearSearch.classList.remove("hidden");
          executeSearch(text.trim());
        }
      } catch (err) {
        console.warn("L\u1ED7i \u0111\u1ECDc d\u1EEF li\u1EC7u t\u1EEB clipboard:", err);
      }
    });
  }
  if (searchInput && btnClearSearch) {
    searchInput.addEventListener("input", () => {
      if (searchInput.value.length > 0) {
        btnClearSearch.classList.remove("hidden");
      } else {
        btnClearSearch.classList.add("hidden");
      }
    });
    btnClearSearch.addEventListener("click", () => {
      searchInput.value = "";
      btnClearSearch.classList.add("hidden");
      searchInput.focus();
    });
  }
  const tagChips = document.querySelectorAll(".tag-chip[data-query]");
  tagChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const q = chip.getAttribute("data-query");
      if (searchInput) searchInput.value = q;
      if (btnClearSearch) btnClearSearch.classList.remove("hidden");
      executeSearch(q);
    });
  });
  if (miniBtnPlay) {
    miniBtnPlay.addEventListener("click", async () => {
      inAppIsPlaying = !inAppIsPlaying;
      if (miniPlayIcon) {
        miniPlayIcon.className = inAppIsPlaying ? "bi bi-pause-fill" : "bi bi-play-fill";
      }
      await window.novata.controlInAppPlayer("toggle");
    });
  }
  if (miniBtnPrev) {
    miniBtnPrev.addEventListener("click", async () => {
      await window.novata.controlInAppPlayer("prev");
    });
  }
  if (miniBtnNext) {
    miniBtnNext.addEventListener("click", async () => {
      await window.novata.controlInAppPlayer("next");
    });
  }
  window.novata.onInAppTrackChanged((data) => {
    if (data && data.track) {
      activeInAppTrack = data.track;
      inAppIsPlaying = data.isPlaying;
      updateMiniPlayer(data.track, inAppIsPlaying);
      const allCards = document.querySelectorAll(".pl-track-card");
      allCards.forEach((c) => {
        const titleEl = c.querySelector(".pl-track-title");
        if (titleEl && titleEl.textContent === data.track.title) {
          c.classList.add("playing");
        } else {
          c.classList.remove("playing");
        }
      });
    }
  });
  window.novata.onInAppStateSync((state) => {
    if (!state) return;
    inAppIsPlaying = state.isPlaying;
    if (miniPlayIcon) {
      miniPlayIcon.className = inAppIsPlaying ? "bi bi-pause-fill" : "bi bi-play-fill";
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
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }
  try {
    settings = await window.novata.getSettings();
    populateUI(settings);
    await loadPlaylists();
    await checkDiscordStatus();
  } catch (err) {
    console.error("L\u1ED7i khi t\u1EA3i c\xE0i \u0111\u1EB7t:", err);
  }
});
