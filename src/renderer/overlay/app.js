document.addEventListener("DOMContentLoaded", async () => {
  const visualizer = new AudioVisualizer("visualizer-canvas");
  const playerCard = document.getElementById("player-card");
  const trackTitle = document.getElementById("track-title");
  const trackArtist = document.getElementById("track-artist");
  const trackTime = document.getElementById("track-time");
  const albumDisc = document.getElementById("album-disc");
  const albumIcon = document.getElementById("album-icon");
  const albumThumb = document.getElementById("album-thumb");
  const sourceIcon = document.getElementById("source-icon");
  const playPauseIcon = document.getElementById("play-pause-icon");
  const repeatIcon = document.getElementById("repeat-icon");
  const progressContainer = document.getElementById("progress-container");
  const progressFill = document.getElementById("progress-fill");
  const btnShuffle = document.getElementById("btn-shuffle");
  const btnPrev = document.getElementById("btn-prev");
  const btnPlayPause = document.getElementById("btn-play-pause");
  const btnNext = document.getElementById("btn-next");
  const btnRepeat = document.getElementById("btn-repeat");
  const btnEditPosition = document.getElementById("btn-edit-position");
  const btnConfirmPosition = document.getElementById("btn-confirm-position");
  const dragHint = document.getElementById("drag-hint");
  const btnOpenPlaylists = document.getElementById("btn-open-playlists");
  const btnOpenSearch = document.getElementById("btn-open-search");
  const btnOpenSettings = document.getElementById("btn-open-settings");
  const btnToggleLyrics = document.getElementById("btn-toggle-lyrics");
  const editGuidesLayer = document.getElementById("edit-guides-layer");
  const guideCrosshair = document.getElementById("guide-crosshair");
  const guideLineH = document.getElementById("guide-line-h");
  const guideLineV = document.getElementById("guide-line-v");
  const guideSnapLineX = document.getElementById("guide-snap-line-x");
  const guideSnapLineY = document.getElementById("guide-snap-line-y");
  const lyricsCard = document.getElementById("lyrics-card");
  const lyricsScrollContainer = document.getElementById("lyrics-scroll-container");
  const lyricsLinesWrapper = document.getElementById("lyrics-lines-wrapper");
  const btnCloseLyrics = document.getElementById("btn-close-lyrics");
  const audioEl = document.getElementById("inapp-audio-player");
  let currentLyricsData = null;
  let parsedSyncedLyrics = [];
  let activeLyricIndex = -1;
  let lyricsLoadedFor = "";
  let externalMediaTimer = null;
  let externalEstimatedTime = 0;
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
  let currentInAppTrack = null;
  let inAppIsPlaying = false;
  let inAppCurrentTime = 0;
  let inAppDuration = 0;
  let inAppQueue = [];
  let inAppQueueIndex = 0;
  let inAppAudioConnected = false;
  let currentPlaylistId = null;
  let currentPlaylistName = "";
  let isShuffle = false;
  let shuffleIndices = [];
  let shufflePointer = 0;
  let repeatMode = "all";
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
    if (typeof currentSettings.shuffle === "boolean") {
      isShuffle = currentSettings.shuffle;
      if (btnShuffle) btnShuffle.classList.toggle("active", isShuffle);
    }
    if (currentSettings.repeatMode) {
      repeatMode = currentSettings.repeatMode;
      updateRepeatUI();
    }
  } catch (err) {
    console.error("L\u1ED7i khi t\u1EA3i c\xE0i \u0111\u1EB7t ban \u0111\u1EA7u:", err);
  }
  await visualizer.initAudio("system");
  visualizer.start();
  initMediaSessionActionHandlers();
  function connectAudioToVisualizer() {
    if (inAppAudioConnected || !visualizer.audioContext) return;
    try {
      if (visualizer.audioContext.state === "suspended") {
        visualizer.audioContext.resume();
      }
      const source = visualizer.audioContext.createMediaElementSource(audioEl);
      source.connect(visualizer.analyser);
      source.connect(visualizer.audioContext.destination);
      inAppAudioConnected = true;
    } catch (e) {
      console.warn("L\u1ED7i k\u1EBFt n\u1ED1i Web Audio Node:", e.message);
    }
  }
  window.novata.onSettingsChange((newSettings) => {
    currentSettings = { ...currentSettings, ...newSettings };
    applySettings(currentSettings);
  });
  function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(255, 255, 255, ${alpha})`;
    if (hex.startsWith("rgba") || hex.startsWith("rgb")) return hex;
    let cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map((c) => c + c).join("");
    }
    const r = parseInt(cleanHex.substring(0, 2), 16) || 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  function updatePlayerScale(width) {
    if (!playerCard) return;
    const w = width || playerCard.offsetWidth || 360;
    const scale = Math.max(0.6, Math.min(1.4, w / 360));
    playerCard.style.setProperty("--player-scale", scale.toFixed(3));
  }
  function applySettings(settings) {
    visualizer.updateSettings(settings);
    if (playerCard) {
      if (settings.showMediaCard === false) {
        playerCard.classList.add("hidden");
      } else {
        playerCard.classList.remove("hidden");
      }
      const wMat = settings.widgetMaterial || "glass";
      playerCard.classList.remove("mat-solid", "mat-glass", "mat-transparent");
      playerCard.classList.add(`mat-${wMat}`);
      if (wMat === "solid") {
        const bgColor = settings.widgetBgColor || "#111116";
        const borderEnabled = settings.widgetBorderEnabled !== false;
        const borderColor = settings.widgetBorderColor || "#ffffff";
        const borderOpacity = typeof settings.widgetBorderOpacity === "number" ? settings.widgetBorderOpacity : 0.14;
        playerCard.style.setProperty("--widget-bg-color", bgColor);
        playerCard.style.setProperty("--widget-border", borderEnabled ? `1px solid ${hexToRgba(borderColor, borderOpacity)}` : "none");
      } else if (wMat === "glass") {
        const gOpacity = typeof settings.widgetGlassOpacity === "number" ? settings.widgetGlassOpacity : 0.18;
        const gBlur = typeof settings.widgetGlassBlur === "number" ? settings.widgetGlassBlur : 20;
        const borderEnabled = settings.widgetBorderEnabled !== false;
        const borderColor = settings.widgetBorderColor || "#ffffff";
        const borderOpacity = typeof settings.widgetBorderOpacity === "number" ? settings.widgetBorderOpacity : 0.22;
        playerCard.style.setProperty("--widget-glass-opacity", gOpacity);
        playerCard.style.setProperty("--widget-glass-blur", gBlur + "px");
        playerCard.style.setProperty("--widget-border", borderEnabled ? `1px solid ${hexToRgba(borderColor, borderOpacity)}` : "none");
      } else if (wMat === "transparent") {
        const borderEnabled = !!settings.widgetBorderEnabled;
        const borderColor = settings.widgetBorderColor || "#ffffff";
        const borderOpacity = typeof settings.widgetBorderOpacity === "number" ? settings.widgetBorderOpacity : 0.35;
        playerCard.style.setProperty("--widget-border", borderEnabled ? `1px solid ${hexToRgba(borderColor, borderOpacity)}` : "none");
      }
      if (settings.widgetTextColor) {
        playerCard.style.setProperty("--widget-text-color", settings.widgetTextColor);
      }
      if (typeof settings.widgetTextSize === "number") {
        playerCard.style.setProperty("--widget-text-size", settings.widgetTextSize + "px");
      }
      if (typeof settings.widgetBorderRadius === "number") {
        playerCard.style.setProperty("--widget-border-radius", settings.widgetBorderRadius + "px");
      }
      if (settings.playerCardPos && typeof settings.playerCardPos.left === "number") {
        playerCard.style.left = settings.playerCardPos.left + "px";
        playerCard.style.top = settings.playerCardPos.top + "px";
        playerCard.style.bottom = "auto";
        playerCard.style.right = "auto";
      } else {
        playerCard.style.left = "28px";
        playerCard.style.bottom = "24px";
        playerCard.style.top = "auto";
        playerCard.style.right = "auto";
      }
      let cardWidth = 360;
      if (settings.playerCardSize && typeof settings.playerCardSize.width === "number") {
        cardWidth = settings.playerCardSize.width;
        playerCard.style.width = cardWidth + "px";
        if (typeof settings.playerCardSize.height === "number" && settings.playerCardSize.height > 50) {
          playerCard.style.height = settings.playerCardSize.height + "px";
        } else {
          playerCard.style.height = "auto";
        }
      } else {
        playerCard.style.width = "360px";
        playerCard.style.height = "auto";
      }
      updatePlayerScale(cardWidth);
    }
    if (lyricsCard) {
      if (settings.showLyricsWidget === false) {
        lyricsCard.classList.add("hidden");
      } else {
        lyricsCard.classList.remove("hidden");
      }
      const lMat = settings.lyricsMaterial || "glass";
      lyricsCard.classList.remove("mat-solid", "mat-glass", "mat-transparent");
      lyricsCard.classList.add(`mat-${lMat}`);
      if (lMat === "solid") {
        const bgColor = settings.lyricsBgColor || "#111116";
        const borderEnabled = settings.lyricsBorderEnabled !== false;
        const borderColor = settings.lyricsBorderColor || "#ffffff";
        const borderOpacity = typeof settings.lyricsBorderOpacity === "number" ? settings.lyricsBorderOpacity : 0.14;
        lyricsCard.style.setProperty("--lyrics-bg-color", bgColor);
        lyricsCard.style.setProperty("--lyrics-border", borderEnabled ? `1px solid ${hexToRgba(borderColor, borderOpacity)}` : "none");
      } else if (lMat === "glass") {
        const gOpacity = typeof settings.lyricsGlassOpacity === "number" ? settings.lyricsGlassOpacity : 0.18;
        const gBlur = typeof settings.lyricsGlassBlur === "number" ? settings.lyricsGlassBlur : 20;
        const borderEnabled = settings.lyricsBorderEnabled !== false;
        const borderColor = settings.lyricsBorderColor || "#ffffff";
        const borderOpacity = typeof settings.lyricsBorderOpacity === "number" ? settings.lyricsBorderOpacity : 0.22;
        lyricsCard.style.setProperty("--lyrics-glass-opacity", gOpacity);
        lyricsCard.style.setProperty("--lyrics-glass-blur", gBlur + "px");
        lyricsCard.style.setProperty("--lyrics-border", borderEnabled ? `1px solid ${hexToRgba(borderColor, borderOpacity)}` : "none");
      } else if (lMat === "transparent") {
        const borderEnabled = !!settings.lyricsBorderEnabled;
        const borderColor = settings.lyricsBorderColor || "#ffffff";
        const borderOpacity = typeof settings.lyricsBorderOpacity === "number" ? settings.lyricsBorderOpacity : 0.35;
        lyricsCard.style.setProperty("--lyrics-border", borderEnabled ? `1px solid ${hexToRgba(borderColor, borderOpacity)}` : "none");
      }
      if (typeof settings.lyricsBorderRadius === "number") {
        lyricsCard.style.setProperty("--lyrics-border-radius", settings.lyricsBorderRadius + "px");
      }
      if (settings.lyricsCardPos && typeof settings.lyricsCardPos.left === "number") {
        lyricsCard.style.left = settings.lyricsCardPos.left + "px";
        lyricsCard.style.top = settings.lyricsCardPos.top + "px";
        lyricsCard.style.bottom = "auto";
        lyricsCard.style.right = "auto";
      } else {
        lyricsCard.style.left = "28px";
        lyricsCard.style.top = "100px";
        lyricsCard.style.bottom = "auto";
        lyricsCard.style.right = "auto";
      }
      if (settings.lyricsCardSize && typeof settings.lyricsCardSize.width === "number") {
        lyricsCard.style.width = settings.lyricsCardSize.width + "px";
        if (typeof settings.lyricsCardSize.height === "number" && settings.lyricsCardSize.height > 60) {
          lyricsCard.style.height = settings.lyricsCardSize.height + "px";
        } else {
          lyricsCard.style.height = "260px";
        }
      } else {
        lyricsCard.style.width = "380px";
        lyricsCard.style.height = "260px";
      }
      if (typeof settings.lyricsFontSize === "number") {
        lyricsCard.style.setProperty("--lyrics-font-size", settings.lyricsFontSize + "px");
      }
      if (settings.lyricsTextAlign) {
        lyricsCard.style.setProperty("--lyrics-text-align", settings.lyricsTextAlign);
      }
      if (settings.lyricsFontWeight) {
        lyricsCard.style.setProperty("--lyrics-font-weight", settings.lyricsFontWeight);
      }
      if (settings.lyricsActiveColor) {
        lyricsCard.style.setProperty("--lyrics-active-color", settings.lyricsActiveColor);
      }
      if (typeof settings.lyricsInactiveOpacity === "number") {
        lyricsCard.style.setProperty("--lyrics-inactive-opacity", settings.lyricsInactiveOpacity);
      }
      applyCustomFont(settings.lyricsCustomFont, settings.lyricsFontFamily);
    }
  }
  async function applyCustomFont(customFont, fontFamily) {
    if (!lyricsCard) return;
    if (customFont && customFont.dataUrl) {
      try {
        const fontName = customFont.name || "NovataLyricsCustomFont";
        const fontFace = new FontFace(fontName, `url(${customFont.dataUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        lyricsCard.style.setProperty("--lyrics-font-family", `"${fontName}", sans-serif`);
        return;
      } catch (err) {
        console.warn("L\u1ED7i n\u1EA1p font t\xF9y ch\u1EC9nh cho lyrics:", err);
      }
    }
    if (fontFamily && fontFamily !== "system") {
      lyricsCard.style.setProperty("--lyrics-font-family", `"${fontFamily}", sans-serif`);
    } else {
      lyricsCard.style.removeProperty("--lyrics-font-family");
    }
  }
  function applySnapping(targetLeft, targetTop, width, height, otherCard) {
    let snappedLeft = targetLeft;
    let snappedTop = targetTop;
    const SNAP_DIST = 16;
    const MARGIN_SNAP = 14;
    const DOCK_GAP = 12;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const screenCenterX = screenW / 2;
    const screenCenterY = screenH / 2;
    let snappedCenterH = false;
    let snappedCenterV = false;
    const cardCenterX = targetLeft + width / 2;
    const cardCenterY = targetTop + height / 2;
    if (Math.abs(cardCenterX - screenCenterX) < SNAP_DIST) {
      snappedLeft = Math.round(screenCenterX - width / 2);
      snappedCenterV = true;
    }
    if (Math.abs(cardCenterY - screenCenterY) < SNAP_DIST) {
      snappedTop = Math.round(screenCenterY - height / 2);
      snappedCenterH = true;
    }
    if (Math.abs(snappedLeft - 28) < MARGIN_SNAP) {
      snappedLeft = 28;
    } else if (Math.abs(screenW - snappedLeft - width - 28) < MARGIN_SNAP) {
      snappedLeft = screenW - width - 28;
    }
    if (Math.abs(screenH - snappedTop - height - 24) < MARGIN_SNAP) {
      snappedTop = screenH - height - 24;
    } else if (Math.abs(snappedTop - 28) < MARGIN_SNAP) {
      snappedTop = 28;
    }
    if (otherCard && !otherCard.classList.contains("hidden")) {
      const otherRect = {
        left: otherCard.offsetLeft,
        top: otherCard.offsetTop,
        width: otherCard.offsetWidth,
        height: otherCard.offsetHeight
      };
      if (Math.abs(snappedTop + height + DOCK_GAP - otherRect.top) < SNAP_DIST) {
        snappedTop = otherRect.top - height - DOCK_GAP;
      } else if (Math.abs(snappedTop - (otherRect.top + otherRect.height + DOCK_GAP)) < SNAP_DIST) {
        snappedTop = otherRect.top + otherRect.height + DOCK_GAP;
      }
      if (Math.abs(snappedLeft + width + DOCK_GAP - otherRect.left) < SNAP_DIST) {
        snappedLeft = otherRect.left - width - DOCK_GAP;
      } else if (Math.abs(snappedLeft - (otherRect.left + otherRect.width + DOCK_GAP)) < SNAP_DIST) {
        snappedLeft = otherRect.left + otherRect.width + DOCK_GAP;
      }
      if (Math.abs(snappedLeft - otherRect.left) < SNAP_DIST) {
        snappedLeft = otherRect.left;
      } else if (Math.abs(snappedLeft + width - (otherRect.left + otherRect.width)) < SNAP_DIST) {
        snappedLeft = otherRect.left + otherRect.width - width;
      } else if (Math.abs(snappedLeft + width / 2 - (otherRect.left + otherRect.width / 2)) < SNAP_DIST) {
        snappedLeft = Math.round(otherRect.left + otherRect.width / 2 - width / 2);
      }
      if (Math.abs(snappedTop - otherRect.top) < SNAP_DIST) {
        snappedTop = otherRect.top;
      } else if (Math.abs(snappedTop + height - (otherRect.top + otherRect.height)) < SNAP_DIST) {
        snappedTop = otherRect.top + otherRect.height - height;
      }
    }
    if (guideLineV) guideLineV.classList.toggle("active", snappedCenterV);
    if (guideLineH) guideLineH.classList.toggle("active", snappedCenterH);
    snappedLeft = Math.max(8, Math.min(screenW - width - 8, snappedLeft));
    snappedTop = Math.max(8, Math.min(screenH - height - 8, snappedTop));
    return { left: snappedLeft, top: snappedTop };
  }
  function enterEditMode() {
    isEditMode = true;
    if (playerCard) playerCard.classList.add("in-edit-mode");
    if (lyricsCard && !lyricsCard.classList.contains("hidden")) {
      lyricsCard.classList.add("in-edit-mode");
    }
    if (btnEditPosition) btnEditPosition.classList.add("hidden");
    if (btnConfirmPosition) btnConfirmPosition.classList.remove("hidden");
    if (dragHint) dragHint.classList.remove("hidden");
    if (editGuidesLayer) editGuidesLayer.classList.remove("hidden");
    window.novata.setIgnoreMouseEvents(false);
  }
  window.enterEditMode = enterEditMode;
  window.exitEditMode = exitEditMode;
  window.updatePlayerScale = updatePlayerScale;
  window.renderNoLyrics = renderNoLyrics;
  async function exitEditMode() {
    isEditMode = false;
    isDragging = false;
    isResizing = false;
    isLyricsDragging = false;
    isLyricsResizing = false;
    if (playerCard) {
      playerCard.classList.remove("in-edit-mode", "dragging", "resizing");
    }
    if (lyricsCard) {
      lyricsCard.classList.remove("in-edit-mode", "dragging", "resizing");
    }
    if (btnConfirmPosition) btnConfirmPosition.classList.add("hidden");
    if (btnEditPosition) btnEditPosition.classList.remove("hidden");
    if (dragHint) dragHint.classList.add("hidden");
    if (editGuidesLayer) editGuidesLayer.classList.add("hidden");
    if (guideLineV) guideLineV.classList.remove("active");
    if (guideLineH) guideLineH.classList.remove("active");
    const toSave = {};
    if (playerCard) {
      toSave.playerCardPos = {
        left: playerCard.offsetLeft,
        top: playerCard.offsetTop
      };
      toSave.playerCardSize = {
        width: playerCard.offsetWidth,
        height: playerCard.offsetHeight
      };
    }
    if (lyricsCard && !lyricsCard.classList.contains("hidden")) {
      toSave.lyricsCardPos = {
        left: lyricsCard.offsetLeft,
        top: lyricsCard.offsetTop
      };
      toSave.lyricsCardSize = {
        width: lyricsCard.offsetWidth,
        height: lyricsCard.offsetHeight
      };
    }
    await window.novata.saveSettings(toSave);
    window.novata.setIgnoreMouseEvents(true, true);
  }
  if (window.novata.onEnterEditMode) {
    window.novata.onEnterEditMode(() => {
      enterEditMode();
    });
  }
  if (playerCard) {
    playerCard.addEventListener("mouseenter", () => {
      window.novata.setIgnoreMouseEvents(false);
    });
    playerCard.addEventListener("mouseleave", () => {
      if (!isDragging && !isResizing && !isEditMode && !isLyricsDragging && !isLyricsResizing) {
        window.novata.setIgnoreMouseEvents(true, true);
      }
    });
    playerCard.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isEditMode) {
        enterEditMode();
      } else {
        exitEditMode();
      }
    });
    if (btnConfirmPosition) {
      btnConfirmPosition.addEventListener("click", (e) => {
        e.stopPropagation();
        exitEditMode();
      });
    }
    if (btnEditPosition) {
      btnEditPosition.addEventListener("click", (e) => {
        e.stopPropagation();
        enterEditMode();
      });
    }
    const resizeHandles = playerCard.querySelectorAll(".resize-handle");
    resizeHandles.forEach((handle) => {
      handle.addEventListener("mousedown", (e) => {
        if (!isEditMode) return;
        e.stopPropagation();
        e.preventDefault();
        isResizing = true;
        currentResizeDir = handle.getAttribute("data-dir");
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        initialCardRect = {
          left: playerCard.offsetLeft,
          top: playerCard.offsetTop,
          width: playerCard.offsetWidth,
          height: playerCard.offsetHeight
        };
        playerCard.classList.add("resizing");
      });
    });
    playerCard.addEventListener("mousedown", (e) => {
      if (!isEditMode) return;
      if (e.target.closest("#btn-confirm-position") || e.target.closest(".resize-handle") || e.target.closest("button")) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      cardInitialLeft = playerCard.offsetLeft;
      cardInitialTop = playerCard.offsetTop;
      playerCard.classList.add("dragging");
    });
    window.addEventListener("mousemove", (e) => {
      if (isResizing) {
        const dx = e.clientX - resizeStartX;
        const dy = e.clientY - resizeStartY;
        let newWidth = initialCardRect.width;
        let newHeight = initialCardRect.height;
        let newLeft = initialCardRect.left;
        let newTop = initialCardRect.top;
        const minW = 240;
        const maxW = Math.min(window.innerWidth - 20, 850);
        const minH = 56;
        const maxH = Math.min(window.innerHeight - 20, 400);
        if (currentResizeDir.includes("e")) {
          newWidth = Math.min(maxW, Math.max(minW, initialCardRect.width + dx));
        } else if (currentResizeDir.includes("w")) {
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
        if (currentResizeDir.includes("s")) {
          newHeight = Math.min(maxH, Math.max(minH, initialCardRect.height + dy));
        } else if (currentResizeDir.includes("n")) {
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
        newLeft = Math.max(8, Math.min(window.innerWidth - newWidth - 8, newLeft));
        newTop = Math.max(8, Math.min(window.innerHeight - newHeight - 8, newTop));
        playerCard.style.left = newLeft + "px";
        playerCard.style.top = newTop + "px";
        playerCard.style.bottom = "auto";
        playerCard.style.right = "auto";
        playerCard.style.width = newWidth + "px";
        playerCard.style.height = newHeight + "px";
        updatePlayerScale(newWidth);
        return;
      }
      if (isDragging) {
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        const rawLeft = cardInitialLeft + deltaX;
        const rawTop = cardInitialTop + deltaY;
        const snapped = applySnapping(rawLeft, rawTop, playerCard.offsetWidth, playerCard.offsetHeight, lyricsCard);
        playerCard.style.left = snapped.left + "px";
        playerCard.style.top = snapped.top + "px";
        playerCard.style.bottom = "auto";
        playerCard.style.right = "auto";
        return;
      }
      if (isLyricsResizing && lyricsCard) {
        const dx = e.clientX - lyricsResizeStartX;
        const dy = e.clientY - lyricsResizeStartY;
        let newWidth = initialLyricsRect.width;
        let newHeight = initialLyricsRect.height;
        let newLeft = initialLyricsRect.left;
        let newTop = initialLyricsRect.top;
        const minW = 240;
        const maxW = Math.min(window.innerWidth - 20, 900);
        const minH = 100;
        const maxH = Math.min(window.innerHeight - 20, 600);
        if (lyricsResizeDir.includes("e")) {
          newWidth = Math.min(maxW, Math.max(minW, initialLyricsRect.width + dx));
        } else if (lyricsResizeDir.includes("w")) {
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
        if (lyricsResizeDir.includes("s")) {
          newHeight = Math.min(maxH, Math.max(minH, initialLyricsRect.height + dy));
        } else if (lyricsResizeDir.includes("n")) {
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
        lyricsCard.style.left = newLeft + "px";
        lyricsCard.style.top = newTop + "px";
        lyricsCard.style.bottom = "auto";
        lyricsCard.style.right = "auto";
        lyricsCard.style.width = newWidth + "px";
        lyricsCard.style.height = newHeight + "px";
        return;
      }
      if (isLyricsDragging && lyricsCard) {
        const deltaX = e.clientX - lyricsDragStartX;
        const deltaY = e.clientY - lyricsDragStartY;
        const rawLeft = lyricsInitialLeft + deltaX;
        const rawTop = lyricsInitialTop + deltaY;
        const snapped = applySnapping(rawLeft, rawTop, lyricsCard.offsetWidth, lyricsCard.offsetHeight, playerCard);
        lyricsCard.style.left = snapped.left + "px";
        lyricsCard.style.top = snapped.top + "px";
        lyricsCard.style.bottom = "auto";
        lyricsCard.style.right = "auto";
      }
    });
    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        playerCard.classList.remove("dragging");
      }
      if (isResizing) {
        isResizing = false;
        currentResizeDir = null;
        playerCard.classList.remove("resizing");
      }
      if (isLyricsDragging && lyricsCard) {
        isLyricsDragging = false;
        lyricsCard.classList.remove("dragging");
      }
      if (isLyricsResizing && lyricsCard) {
        isLyricsResizing = false;
        lyricsResizeDir = null;
        lyricsCard.classList.remove("resizing");
      }
      if (guideLineV) guideLineV.classList.remove("active");
      if (guideLineH) guideLineH.classList.remove("active");
    });
  }
  if (lyricsCard) {
    lyricsCard.addEventListener("mouseenter", () => {
      window.novata.setIgnoreMouseEvents(false);
    });
    lyricsCard.addEventListener("mouseleave", () => {
      if (!isDragging && !isResizing && !isEditMode && !isLyricsDragging && !isLyricsResizing) {
        window.novata.setIgnoreMouseEvents(true, true);
      }
    });
    lyricsCard.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isEditMode) {
        enterEditMode();
      } else {
        exitEditMode();
      }
    });
    if (btnCloseLyrics) {
      btnCloseLyrics.addEventListener("click", async (e) => {
        e.stopPropagation();
        lyricsCard.classList.add("hidden");
        if (btnToggleLyrics) btnToggleLyrics.classList.remove("active");
        await window.novata.saveSettings({ showLyricsWidget: false });
      });
    }
    const lyricsHandles = lyricsCard.querySelectorAll(".resize-handle");
    lyricsHandles.forEach((handle) => {
      handle.addEventListener("mousedown", (e) => {
        if (!isEditMode) return;
        e.stopPropagation();
        e.preventDefault();
        isLyricsResizing = true;
        lyricsResizeDir = handle.getAttribute("data-dir");
        lyricsResizeStartX = e.clientX;
        lyricsResizeStartY = e.clientY;
        initialLyricsRect = {
          left: lyricsCard.offsetLeft,
          top: lyricsCard.offsetTop,
          width: lyricsCard.offsetWidth,
          height: lyricsCard.offsetHeight
        };
        lyricsCard.classList.add("resizing");
      });
    });
    lyricsCard.addEventListener("mousedown", (e) => {
      if (!isEditMode) return;
      if (e.target.closest("button") || e.target.closest(".resize-handle")) return;
      isLyricsDragging = true;
      lyricsDragStartX = e.clientX;
      lyricsDragStartY = e.clientY;
      lyricsInitialLeft = lyricsCard.offsetLeft;
      lyricsInitialTop = lyricsCard.offsetTop;
      lyricsCard.classList.add("dragging");
    });
  }
  if (btnToggleLyrics) {
    btnToggleLyrics.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!lyricsCard) return;
      const isHidden = lyricsCard.classList.contains("hidden");
      if (isHidden) {
        lyricsCard.classList.remove("hidden");
        btnToggleLyrics.classList.add("active");
        await window.novata.saveSettings({ showLyricsWidget: true });
        if (currentInAppTrack) {
          updateLyricsForTrack(currentInAppTrack);
        }
      } else {
        lyricsCard.classList.add("hidden");
        btnToggleLyrics.classList.remove("active");
        await window.novata.saveSettings({ showLyricsWidget: false });
      }
    });
  }
  if (window.novata.onToggleLyricsCard) {
    window.novata.onToggleLyricsCard((show) => {
      if (!lyricsCard) return;
      if (typeof show === "boolean") {
        lyricsCard.classList.toggle("hidden", !show);
        if (btnToggleLyrics) btnToggleLyrics.classList.toggle("active", show);
      } else {
        const isHidden = lyricsCard.classList.contains("hidden");
        lyricsCard.classList.toggle("hidden", !isHidden);
        if (btnToggleLyrics) btnToggleLyrics.classList.toggle("active", isHidden);
      }
    });
  }
  if (window.novata.onTogglePlayerCard) {
    window.novata.onTogglePlayerCard(() => {
      if (playerCard) {
        if (playerCard.classList.contains("hidden")) {
          playerCard.classList.remove("hidden");
          window.novata.saveSettings({ showMediaCard: true });
        } else {
          playerCard.classList.add("hidden");
          window.novata.saveSettings({ showMediaCard: false });
        }
      }
    });
  }
  try {
    const initialMedia = await window.novata.getMediaState();
    if (!currentInAppTrack) {
      updateMediaUI(initialMedia);
    }
  } catch (e) {
  }
  window.novata.onMediaChange((media) => {
    if (!currentInAppTrack) {
      updateMediaUI(media);
    }
  });
  function updateMediaUI(media) {
    if (!media) return;
    trackTitle.textContent = media.Title || "Ready to listen";
    trackArtist.textContent = media.Artist || "Spotify / YouTube / Music Player";
    trackTime.textContent = "";
    progressFill.style.transform = "scaleX(0)";
    albumThumb.classList.add("hidden");
    albumIcon.classList.remove("hidden");
    const src = (media.Source || "").toLowerCase();
    if (src.includes("spotify")) {
      sourceIcon.className = "bi bi-spotify";
      sourceIcon.title = "Playing on Spotify";
    } else if (src.includes("youtube") || src.includes("chrome") || src.includes("edge")) {
      sourceIcon.className = "bi bi-youtube";
      sourceIcon.title = "Playing on YouTube / Browser";
    } else if (src.includes("soundcloud")) {
      sourceIcon.className = "bi bi-soundwave";
      sourceIcon.title = "Playing on SoundCloud";
    } else {
      sourceIcon.className = "bi bi-music-note-beamed";
      sourceIcon.title = "System Media";
    }
    const isPlaying = media.Status && media.Status.toLowerCase().includes("play");
    if (isPlaying) {
      playPauseIcon.className = "bi bi-pause-fill";
      albumIcon.classList.add("active");
    } else {
      playPauseIcon.className = "bi bi-play-fill";
      albumIcon.classList.remove("active");
    }
    const rep = (media.Repeat || "").toLowerCase();
    if (rep.includes("track")) {
      repeatIcon.className = "bi bi-repeat-1";
      btnRepeat.classList.add("active");
    } else if (rep.includes("list")) {
      repeatIcon.className = "bi bi-repeat";
      btnRepeat.classList.add("active");
    } else {
      repeatIcon.className = "bi bi-repeat";
      btnRepeat.classList.remove("active");
    }
    if (media.Shuffle) {
      btnShuffle.classList.add("active");
    } else {
      btnShuffle.classList.remove("active");
    }
    if (media.Active && media.Title && media.Title !== "Ready to listen") {
      updateLyricsForTrack({ title: media.Title, artist: media.Artist });
    }
  }
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
    for (let i = restIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [restIndices[i], restIndices[j]] = [restIndices[j], restIndices[i]];
    }
    shuffleIndices = [firstIndex, ...restIndices];
    shufflePointer = 0;
  }
  window.novata.onPlayPlaylist((payload) => {
    if (!payload || !payload.tracks || payload.tracks.length === 0) return;
    currentPlaylistId = payload.playlistId;
    currentPlaylistName = payload.playlistName || "Playlist";
    inAppQueue = [...payload.tracks];
    const startIdx = typeof payload.startIndex === "number" ? payload.startIndex : 0;
    if (payload.shuffle || isShuffle) {
      isShuffle = true;
      if (btnShuffle) btnShuffle.classList.add("active");
      initShuffleOrder(startIdx);
      inAppQueueIndex = shuffleIndices[0];
    } else {
      inAppQueueIndex = startIdx;
    }
    playInAppSong(inAppQueue[inAppQueueIndex]);
  });
  window.novata.onPlayInAppTrack((track) => {
    const foundIdx = inAppQueue.findIndex((t) => t.id === track.id);
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
  function updateMediaSession(track) {
    if (!("mediaSession" in navigator)) return;
    if (!track) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      document.title = "Novata nvt_0.3";
      return;
    }
    const cleanTitle = (track.title || "Unknown Title").trim();
    const cleanArtist = (track.artist || "Novata Music").trim();
    const albumName = currentPlaylistName ? `Playlist: ${currentPlaylistName}` : track.source || "Novata Music";
    document.title = `${cleanTitle} \u2022 ${cleanArtist}`;
    const artworkList = [];
    let thumbUrl = track.thumbnail || "";
    if (thumbUrl) {
      if (thumbUrl.startsWith("//")) {
        thumbUrl = "https:" + thumbUrl;
      }
      if (thumbUrl.startsWith("http://") || thumbUrl.startsWith("https://") || thumbUrl.startsWith("data:")) {
        artworkList.push(
          { src: thumbUrl, sizes: "96x96" },
          { src: thumbUrl, sizes: "128x128" },
          { src: thumbUrl, sizes: "192x192" },
          { src: thumbUrl, sizes: "256x256" },
          { src: thumbUrl, sizes: "384x384" },
          { src: thumbUrl, sizes: "512x512" }
        );
      }
    }
    try {
      const fallbackUrl = new URL("../assets/icon.png", window.location.href).href;
      artworkList.push({ src: fallbackUrl, sizes: "512x512", type: "image/png" });
    } catch (e) {
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: cleanTitle,
        artist: cleanArtist,
        album: albumName,
        artwork: artworkList
      });
      navigator.mediaSession.playbackState = inAppIsPlaying ? "playing" : "paused";
    } catch (err) {
      console.warn("Loi khi tao MediaMetadata:", err.message);
    }
    updateMediaSessionPosition();
  }
  function updateMediaSessionPosition() {
    if (!("mediaSession" in navigator) || !("setPositionState" in navigator.mediaSession)) return;
    if (!audioEl || !audioEl.duration || isNaN(audioEl.duration) || !isFinite(audioEl.duration) || audioEl.duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: audioEl.duration,
        playbackRate: audioEl.playbackRate || 1,
        position: Math.min(Math.max(0, audioEl.currentTime || 0), audioEl.duration)
      });
    } catch (err) {
    }
  }
  function initMediaSessionActionHandlers() {
    if (!("mediaSession" in navigator)) return;
    const actionMap = [
      ["play", () => {
        if (currentInAppTrack) {
          handleInAppPlayPause();
        } else {
          window.novata.controlMedia("play_pause");
        }
      }],
      ["pause", () => {
        if (currentInAppTrack) {
          handleInAppPlayPause();
        } else {
          window.novata.controlMedia("play_pause");
        }
      }],
      ["previoustrack", () => {
        if (currentInAppTrack) {
          handleInAppPrev();
        } else {
          window.novata.controlMedia("prev");
        }
      }],
      ["nexttrack", () => {
        if (currentInAppTrack) {
          handleInAppNext();
        } else {
          window.novata.controlMedia("next");
        }
      }],
      ["stop", () => {
        if (audioEl) {
          audioEl.pause();
          audioEl.currentTime = 0;
        }
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "none";
        }
      }],
      ["seekto", (details) => {
        if (audioEl && typeof details.seekTime === "number" && !isNaN(details.seekTime)) {
          audioEl.currentTime = details.seekTime;
          updateMediaSessionPosition();
          syncLyricsToTime(inAppCurrentTime);
        }
      }],
      ["seekbackward", (details) => {
        if (audioEl) {
          const offset = details.seekOffset || 10;
          audioEl.currentTime = Math.max(0, audioEl.currentTime - offset);
          updateMediaSessionPosition();
          syncLyricsToTime(inAppCurrentTime);
        }
      }],
      ["seekforward", (details) => {
        if (audioEl) {
          const offset = details.seekOffset || 10;
          const max = audioEl.duration || 0;
          audioEl.currentTime = Math.min(max, audioEl.currentTime + offset);
          updateMediaSessionPosition();
          syncLyricsToTime(inAppCurrentTime);
        }
      }]
    ];
    for (const [action, handler] of actionMap) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (err) {
      }
    }
  }
  function parseLrc(lrcText) {
    if (!lrcText || typeof lrcText !== "string") return [];
    const lines = lrcText.split("\n");
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
        const ms = match[3] ? match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10) : 0;
        timestamps.push(min * 60 + sec + ms / 1e3);
      }
      const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, "").trim();
      if (text && timestamps.length > 0) {
        for (const t of timestamps) {
          result.push({ time: t, text });
        }
      }
    }
    result.sort((a, b) => a.time - b.time);
    return result;
  }
  function renderSyncedLyrics(lines) {
    if (!lyricsLinesWrapper) return;
    lyricsLinesWrapper.innerHTML = "";
    activeLyricIndex = -1;
    activeLyricElement = null;
    lines.forEach((item, index) => {
      const lineEl = document.createElement("div");
      lineEl.className = "lyric-line";
      lineEl.setAttribute("data-index", index);
      lineEl.setAttribute("data-time", item.time);
      lineEl.textContent = item.text;
      lineEl.addEventListener("click", () => {
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
  function renderPlainLyrics(plainText) {
    if (!lyricsLinesWrapper) return;
    lyricsLinesWrapper.innerHTML = "";
    activeLyricIndex = -1;
    activeLyricElement = null;
    const lines = plainText.split("\n");
    lines.forEach((text) => {
      const trimmed = text.trim();
      if (!trimmed) {
        const spacer = document.createElement("div");
        spacer.style.height = "10px";
        lyricsLinesWrapper.appendChild(spacer);
        return;
      }
      const lineEl = document.createElement("div");
      lineEl.className = "lyric-line plain";
      lineEl.textContent = trimmed;
      lyricsLinesWrapper.appendChild(lineEl);
    });
    if (lyricsScrollContainer) {
      lyricsScrollContainer.scrollTop = 0;
    }
  }
  function renderNoLyrics() {
    if (!lyricsLinesWrapper) return;
    lyricsLinesWrapper.innerHTML = "";
    activeLyricIndex = -1;
    activeLyricElement = null;
  }
  let activeLyricElement = null;
  function syncLyricsToTime(currentTime, forceScroll = false) {
    if (!parsedSyncedLyrics || parsedSyncedLyrics.length === 0 || !lyricsLinesWrapper) return;
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
      activeLyricElement.classList.remove("active");
    }
    if (targetEl) {
      targetEl.classList.add("active");
      activeLyricElement = targetEl;
      if (lyricsScrollContainer) {
        const containerHeight = lyricsScrollContainer.clientHeight;
        const elTop = targetEl.offsetTop - lyricsLinesWrapper.offsetTop;
        const elHeight = targetEl.clientHeight;
        const targetScroll = elTop - containerHeight / 2 + elHeight / 2;
        lyricsScrollContainer.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: forceScroll ? "auto" : "smooth"
        });
      }
    }
  }
  async function updateLyricsForTrack(track) {
    if (!lyricsCard || !track || !track.title) return;
    const cleanKey = `${track.title}___${track.artist || ""}`.toLowerCase();
    if (lyricsLoadedFor === cleanKey) return;
    lyricsLoadedFor = cleanKey;
    try {
      let durSec = null;
      if (audioEl && audioEl.duration && !isNaN(audioEl.duration)) {
        durSec = audioEl.duration;
      } else if (track.duration && typeof track.duration === "string" && track.duration.includes(":")) {
        const parts = track.duration.split(":");
        durSec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }
      const res = await window.novata.getLyrics({
        title: track.title,
        artist: track.artist || "",
        duration: durSec
      });
      if (res && res.success) {
        if (res.syncedLyrics && res.syncedLyrics.trim()) {
          parsedSyncedLyrics = parseLrc(res.syncedLyrics);
          if (parsedSyncedLyrics.length > 0) {
            renderSyncedLyrics(parsedSyncedLyrics);
            const curTime = audioEl ? audioEl.currentTime : 0;
            syncLyricsToTime(curTime, true);
            return;
          }
        }
        if (res.plainLyrics && res.plainLyrics.trim()) {
          parsedSyncedLyrics = [];
          renderPlainLyrics(res.plainLyrics);
          return;
        }
      }
      parsedSyncedLyrics = [];
      renderNoLyrics();
    } catch (err) {
      console.warn("L\u1ED7i khi t\u1EA3i lyrics:", err);
      parsedSyncedLyrics = [];
      renderNoLyrics();
    }
  }
  function escapeHtml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  async function playInAppSong(track) {
    if (!track) return;
    currentInAppTrack = track;
    inAppIsPlaying = true;
    inAppCurrentTime = 0;
    inAppDuration = 0;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    trackTime.textContent = `0:00 / ${track.duration || "--:--"}`;
    if (currentPlaylistName) {
      sourceIcon.className = "bi bi-collection-play-fill";
      sourceIcon.title = `Playlist: ${currentPlaylistName}`;
    } else {
      sourceIcon.className = "bi bi-play-circle-fill";
      sourceIcon.title = "Novata In-App Player";
    }
    if (track.thumbnail) {
      albumThumb.src = track.thumbnail;
      albumThumb.classList.remove("hidden");
      albumIcon.classList.add("hidden");
    } else {
      albumThumb.classList.add("hidden");
      albumIcon.classList.remove("hidden");
    }
    playPauseIcon.className = "bi bi-pause-fill";
    albumIcon.classList.add("active");
    progressFill.style.transform = "scaleX(0)";
    updateMediaSession(track);
    updateLyricsForTrack(track);
    let url = track.streamUrl;
    if (!url) {
      try {
        url = await window.novata.getAudioStream(track.id);
      } catch (e) {
      }
    }
    if (url) {
      audioEl.src = url;
      connectAudioToVisualizer();
      try {
        await audioEl.play();
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
        updateMediaSessionPosition();
        syncLyricsToTime(inAppCurrentTime);
      } catch (playErr) {
        console.error("L\u1ED7i khi b\u1EAFt \u0111\u1EA7u ph\xE1t \xE2m thanh:", playErr);
      }
    } else {
      console.warn("Kh\xF4ng th\u1EC3 l\u1EA5y \u0111\u01B0\u1EE3c \u0111\u01B0\u1EDDng d\u1EABn stream c\u1EE7a b\xE0i h\xE1t.");
    }
  }
  let lastInAppStateSyncTime = 0;
  if (audioEl) {
    audioEl.addEventListener("timeupdate", () => {
      inAppCurrentTime = audioEl.currentTime;
      inAppDuration = audioEl.duration || 0;
      if (inAppDuration > 0) {
        const percent = Math.min(100, Math.max(0, inAppCurrentTime / inAppDuration * 100));
        progressFill.style.transform = `scaleX(${percent / 100})`;
        trackTime.textContent = `${formatTime(inAppCurrentTime)} / ${formatTime(inAppDuration)}`;
        updateMediaSessionPosition();
        syncLyricsToTime(inAppCurrentTime);
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
    audioEl.addEventListener("play", () => {
      inAppIsPlaying = true;
      playPauseIcon.className = "bi bi-pause-fill";
      albumIcon.classList.add("active");
      visualizer.pauseSystemAudio();
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
      updateMediaSessionPosition();
    });
    audioEl.addEventListener("pause", () => {
      inAppIsPlaying = false;
      playPauseIcon.className = "bi bi-play-fill";
      albumIcon.classList.remove("active");
      visualizer.resumeSystemAudio();
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    });
    audioEl.addEventListener("durationchange", () => {
      updateMediaSessionPosition();
    });
    audioEl.addEventListener("ratechange", () => {
      updateMediaSessionPosition();
    });
    audioEl.addEventListener("seeked", () => {
      updateMediaSessionPosition();
    });
    audioEl.addEventListener("ended", () => {
      handleAutoNext();
    });
    audioEl.addEventListener("error", () => {
      console.warn("S\u1EF1 ki\u1EC7n l\u1ED7i t\u1EA3i lu\u1ED3ng \xE2m thanh.");
      setTimeout(() => {
        if (inAppQueue.length > 1) {
          handleInAppNext();
        }
      }, 2e3);
    });
  }
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }
  function handleInAppPlayPause() {
    if (!currentInAppTrack || !audioEl) return;
    if (audioEl.paused) {
      audioEl.play().catch(() => {
      });
    } else {
      audioEl.pause();
    }
  }
  function handleAutoNext() {
    if (repeatMode === "one") {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {
      });
      updateMediaSessionPosition();
      return;
    }
    if (isShuffle) {
      if (shufflePointer < shuffleIndices.length - 1) {
        shufflePointer++;
        inAppQueueIndex = shuffleIndices[shufflePointer];
        playInAppSong(inAppQueue[inAppQueueIndex]);
      } else if (repeatMode === "all") {
        initShuffleOrder(shuffleIndices[shuffleIndices.length - 1]);
        inAppQueueIndex = shuffleIndices[0];
        playInAppSong(inAppQueue[inAppQueueIndex]);
      } else {
        inAppIsPlaying = false;
        playPauseIcon.className = "bi bi-play-fill";
        albumIcon.classList.remove("active");
        updateMediaSession(null);
      }
      return;
    }
    if (inAppQueue.length > 0 && inAppQueueIndex < inAppQueue.length - 1) {
      inAppQueueIndex++;
      playInAppSong(inAppQueue[inAppQueueIndex]);
    } else if (repeatMode === "all" && inAppQueue.length > 0) {
      inAppQueueIndex = 0;
      playInAppSong(inAppQueue[0]);
    } else {
      inAppIsPlaying = false;
      playPauseIcon.className = "bi bi-play-fill";
      albumIcon.classList.remove("active");
      updateMediaSession(null);
    }
  }
  function handleInAppNext() {
    if (!inAppQueue || inAppQueue.length === 0) return;
    if (inAppQueue.length === 1) {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {
      });
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
  function handleInAppPrev() {
    if (!inAppQueue || inAppQueue.length === 0) return;
    if (audioEl && audioEl.currentTime > 3) {
      audioEl.currentTime = 0;
      updateMediaSessionPosition();
      return;
    }
    if (inAppQueue.length === 1) {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {
      });
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
  function updateRepeatUI() {
    if (!repeatIcon || !btnRepeat) return;
    if (repeatMode === "one") {
      repeatIcon.className = "bi bi-repeat-1";
      btnRepeat.classList.add("active");
      btnRepeat.title = "Repeat: Single Track";
    } else if (repeatMode === "all") {
      repeatIcon.className = "bi bi-repeat";
      btnRepeat.classList.add("active");
      btnRepeat.title = "Repeat: Entire Playlist";
    } else {
      repeatIcon.className = "bi bi-repeat";
      btnRepeat.classList.remove("active");
      btnRepeat.title = "Repeat: Off";
    }
  }
  window.novata.onInAppControl((action, payload) => {
    switch (action) {
      case "toggle":
        handleInAppPlayPause();
        break;
      case "play":
        if (audioEl) audioEl.play().catch(() => {
        });
        break;
      case "pause":
        if (audioEl) audioEl.pause();
        break;
      case "next":
        handleInAppNext();
        break;
      case "prev":
        handleInAppPrev();
        break;
      case "shuffle":
        isShuffle = !isShuffle;
        if (btnShuffle) btnShuffle.classList.toggle("active", isShuffle);
        if (isShuffle) initShuffleOrder(inAppQueueIndex);
        window.novata.saveSettings({ shuffle: isShuffle });
        break;
      case "seek":
        if (audioEl && payload && typeof payload.percent === "number" && audioEl.duration) {
          audioEl.currentTime = payload.percent / 100 * audioEl.duration;
        }
        break;
    }
  });
  btnPlayPause.addEventListener("click", async () => {
    if (currentInAppTrack) {
      handleInAppPlayPause();
    } else {
      await window.novata.controlMedia("play_pause");
    }
  });
  btnPrev.addEventListener("click", async () => {
    if (currentInAppTrack) {
      handleInAppPrev();
    } else {
      await window.novata.controlMedia("prev");
    }
  });
  btnNext.addEventListener("click", async () => {
    if (currentInAppTrack) {
      handleInAppNext();
    } else {
      await window.novata.controlMedia("next");
    }
  });
  btnShuffle.addEventListener("click", async () => {
    if (currentInAppTrack) {
      isShuffle = !isShuffle;
      btnShuffle.classList.toggle("active", isShuffle);
      if (isShuffle) {
        initShuffleOrder(inAppQueueIndex);
      }
      await window.novata.saveSettings({ shuffle: isShuffle });
    } else {
      await window.novata.controlMedia("shuffle");
    }
  });
  btnRepeat.addEventListener("click", async () => {
    if (currentInAppTrack) {
      if (repeatMode === "all") {
        repeatMode = "one";
      } else if (repeatMode === "one") {
        repeatMode = "none";
      } else {
        repeatMode = "all";
      }
      updateRepeatUI();
      await window.novata.saveSettings({ repeatMode });
    } else {
      await window.novata.controlMedia("repeat");
    }
  });
  progressContainer.addEventListener("click", (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, clickX / rect.width));
    if (currentInAppTrack && audioEl && audioEl.duration) {
      audioEl.currentTime = percent * audioEl.duration;
    }
  });
  if (btnOpenPlaylists) {
    btnOpenPlaylists.addEventListener("click", async () => {
      await window.novata.openPlaylistTab();
    });
  }
  if (btnOpenSearch) {
    btnOpenSearch.addEventListener("click", async () => {
      await window.novata.openSearchTab();
    });
  }
  btnOpenSettings.addEventListener("click", async () => {
    await window.novata.openSettings();
  });
});
