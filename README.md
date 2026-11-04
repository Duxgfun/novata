# Novata - User Guide & Documentation Wiki

Welcome to **Novata** - a minimalist desktop audio spectrum visualizer and background music streamer engineered specifically for Windows 10 and Windows 11. Novata combines a sleek monochrome matte aesthetic with floating frosted glass UI elements designed to sit unobtrusively on your desktop.

---

## Table of Contents

1. [Overview](#1-overview)
2. [What's New in nvt_0.4 Beta](#2-whats-new-in-nvt_04-beta)
3. [System Requirements & Quick Start](#3-system-requirements--quick-start)
4. [Desktop Widget & 8-Direction Resizing](#4-desktop-widget--8-direction-resizing)
5. [Visualizer & Material Customization](#5-visualizer--material-customization)
6. [Music Streaming & Playlist Management](#6-music-streaming--playlist-management)
7. [Discord Rich Presence (RPC)](#7-discord-rich-presence-rpc)
8. [Shortcuts & Quick Actions](#8-shortcuts--quick-actions)
9. [Troubleshooting & FAQ](#9-troubleshooting--faq)

---

## 1. Overview

Novata is built from the ground up to integrate seamlessly into your daily desktop workflow:

- **Unobtrusive Desktop Integration**: Renders directly above your Windows taskbar without any bulky borders or black bounding boxes. Mouse events pass through the spectrum canvas natively (click-through) so your gaming, coding, and browsing remain entirely uninterrupted.
- **Real-Time Dual Audio Capture**: Automatically detects and visualizes desktop audio from external applications (Spotify, YouTube on Chrome/Edge/Firefox, Apple Music, games) or directly streams audio in-app with zero latency.
- **Minimalist Aesthetic**: Inspired by modern architectural matte finishes and authentic translucent glassmorphism.

---

## 2. What's New in nvt_0.5 Beta

Version `nvt_0.5 beta` introduces real-time synchronized floating lyrics, custom font file loading, direct music link pasting across multiple platforms, and Discord RPC application customization:

- **Desktop Floating Lyrics Widget**:
  - A separate, floating frosted glass lyrics card that syncs with your music in real time.
  - Supports 8-direction freeform window resizing and drag-to-position with automatic state saving.
  - Powered by LRCLIB: parses millisecond-precision synchronized LRC timestamps (`[mm:ss.xx]`) with smooth vertical auto-scroll and line highlighting.
  - Click any lyric line to jump directly to that point in the track (In-App playback).
  - Automatically fetches and displays lyrics for external media (Spotify, YouTube on web, SoundCloud).
- **Custom Typography & Font File Loading**:
  - Load your own font files (`.ttf`, `.otf`, `.woff`, `.woff2`) directly via the native Windows file picker.
  - Dynamic font rendering using CSS `FontFace` API without needing system font installation.
  - Adjustable font size (12px to 36px) and alignment (Center or Left).
- **Direct Link Pasting (Spotify, YouTube Music, SoundCloud, Apple Music)**:
  - Paste any track link from Spotify, YouTube / YouTube Music, SoundCloud, or Apple Music / iTunes directly into the search bar or use the new one-click "Paste" button.
  - Seamlessly extracts metadata (title, artist, high-res artwork) and resolves high-fidelity audio streams.
- **Discord Rich Presence (RPC) Customization**:
  - Configurable Discord Application ID (Client ID) in Settings to display "Novata" as your Discord activity instead of third-party player names.
- **Branding Streamlining**:
  - Standardized product name from "Novata Visualizer" to "Novata" across shortcuts, titles, installer, and UI.

---

## 3. What's New in nvt_0.4 Beta

Version `nvt_0.4 beta` introduces major visual, material, and interaction enhancements:

- **Continuous Waveform with Dual-Layer Materials**: Alongside vertical spectrum bars, users can enable a smooth, organic continuous wave. The waveform features two independently configurable components:
  - **Top Crest Border**: A crisp outline along the upper crest of the wave with dedicated color pickers, opacity control, or pure frosted glass reflection.
  - **Wave Inner Body**: The filled region beneath the wave down to the baseline, supporting either a 100% solid color fill or pure monochrome frosted glass.
- **Pure Colorless Frosted Glass**: Both wave layers and the desktop widget offer genuine translucent frosted glass with independent **Transparency** and **Blur** sliders and zero artificial tinting.
- **Streamlined Desktop Widget**:
  - Direct **Move & Resize** button (`arrows-move`) and **Settings** button (`gear-fill`) placed conveniently on the widget control bar.
  - Replaced dark muddy blocks with translucent frosted glass buttons for high legibility across light and dark wallpapers.
  - Enhanced typography contrast ensures track titles and artist names remain legible on bright backgrounds.
- **8-Direction Window-Like Resizing**: Freely resize the player widget from any of its 4 edges or 4 corners just like a native Windows window, or drag to position anywhere on screen.

---

## 3. System Requirements & Quick Start

### 3.1. System Requirements
- **Operating System**: Windows 10 or Windows 11 (64-bit).
- **Runtime**: Node.js v18 or later (Node.js v20 or v24 recommended).

### 3.2. Installation & Running from Source

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Duxgfun/novata.git
   cd novata
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Launch the application in development mode**:
   ```bash
   npm start
   ```

4. **Package the standalone Windows installer (optional)**:
   ```bash
   npm run build
   ```
   The generated NSIS setup executable and unpacked binaries will be located in the `dist/` directory.

---

## 4. Desktop Widget & 8-Direction Resizing

The Desktop Widget is a floating media controller card layered smoothly over your desktop.

### 4.1. Widget Control Buttons
- **Play / Pause**: Start or pause audio playback.
- **Next / Previous**: Skip to the next or previous track in the active queue.
- **Shuffle**: Toggle randomized playback order on or off.
- **Repeat**: Cycle through repeat modes (Repeat All, Repeat One, No Repeat).
- **Move & Resize Button (4-way arrows icon)**: Toggle widget editing mode.
- **Settings Button (gear icon)**: Open the Novata Settings window immediately.

### 4.2. Move & Resize Editing Mode
1. Click the **Move & Resize** button on the widget (or right-click the widget surface).
2. The widget will display a dashed outline indicating editing mode is active:
   - **Repositioning**: Left-click and drag from the center area of the widget to reposition it anywhere on your desktop.
   - **8-Direction Resizing**: Hover over any of the 4 edges (`North`, `South`, `East`, `West`) or 4 corners (`NW`, `NE`, `SW`, `SE`). The cursor will switch to a native resize arrow. Click and drag to expand or shrink the widget freely.
3. Click the **Move & Resize** button again (or right-click) to lock the position and dimensions. Coordinates and dimensions are automatically persisted across launches.

---

## 5. Visualizer & Material Customization

Open **Settings** and navigate to the **Appearance** tab to customize your visualizer:

### 5.1. Waveform Types
- **Vertical Bars**: Classic spectrum analyzer bars pulsing symmetrically from the center outward to both screen edges.
- **Continuous Wave**: Organic flowing wave driven by Catmull-Rom to Cubic Bezier curve interpolation.

### 5.2. Waveform Material System
When Continuous Wave is active, you can configure both layers independently:

1. **Top Crest Border**:
   - **Solid Color**: Pick any solid color (pure white, coral, blue, emerald) with adjustable opacity.
   - **Glass**: Colorless translucent frosted glass with fine-tuned Blur (px) and Transparency sliders.
2. **Wave Inner Body**:
   - **Solid Color**: Fills the entire area beneath the wave with vibrant 100% solid color coverage.
   - **Glass**: Turns the area beneath the wave into a pure, colorless translucent frosted glass panel that organically reflects your wallpaper.

### 5.3. Widget Board Material
- **Solid**: Sleek matte dark finish (`#111116`) with subtle edge highlights.
- **Glass**: Authentic frosted glass surface with customizable Blur radius and Transparency.

### 5.4. Dimensions & Sensitivity
- **Spectrum Height**: Adjust peak visualizer amplitude (from 40px up to 320px).
- **Audio Sensitivity**: Fine-tune responsiveness to low-volume or high-gain audio sources (0.1x to 2.0x).

---

## 6. Music Streaming & Playlist Management

### 6.1. Search & In-App Streaming
1. Open **Settings** and navigate to the **Music Player** tab.
2. Enter any song, artist, or album title into the search field and press Enter.
3. Click any search result to begin streaming immediately with real-time waveform visualization.

### 6.2. Custom Playlists
- Navigate to the **Playlists** tab to create, rename, and manage custom collections (e.g., Focus, Lo-Fi, Workout).
- Add songs to playlists with a single click from search results or the active player card.

### 6.3. Default Music (Startup Auto-Play)
- Configure Novata to automatically resume playback on application launch. Mark any playlist as default using the star icon, or select "Last Played Track" in settings.

### 6.4. Windows SMTC Automatic Synchronization
- When playing music externally through Spotify, YouTube (Chrome/Edge/Firefox), or Apple Music, Novata automatically synchronizes metadata (title, artist, artwork) and renders real-time loopback waveforms.

---

## 7. Discord Rich Presence (RPC)

Novata features native Discord Rich Presence integration via Win32 Named Pipes:
1. Open **Settings** -> **General**.
2. Enable the **Discord Rich Presence** toggle.
3. Your Discord profile will automatically display the track title, artist, elapsed timer, album thumbnail, and playback source.

---

## 8. Shortcuts & Quick Actions

| Action | Result |
| :--- | :--- |
| **Left-Click Widget Body** | Focus widget |
| **Right-Click Widget Body** | Toggle Move & Resize editing mode |
| **Drag Widget Center** | Reposition widget across screens |
| **Drag Widget Handles (8 directions)** | Resize widget width and height |
| **Keyboard Media Play / Pause** | Toggle play and pause |
| **Keyboard Media Next / Previous** | Skip to next or previous track |

---

## 9. Troubleshooting & FAQ

### 9.1. Waveform does not react to system audio
- Ensure your Windows system output volume is not muted.
- If streaming from a web browser, confirm that audio is actively playing through the tab.
- In **Settings** -> **Appearance**, increase the **Audio Sensitivity** slider (e.g., set to 0.8x - 1.2x).

### 9.2. Discord does not display the current song
- Ensure the Discord desktop app is running.
- In Discord, verify that **User Settings** -> **Activity Privacy** -> "Display current activity as a status message" is enabled.
- Toggle the **Discord Rich Presence** switch off and back on in Novata Settings to re-establish the named pipe connection.

### 9.3. Widget is positioned outside the visible screen
- Open **Settings** -> **Appearance** and click the **Reset Widget Position** button to instantly restore default coordinates at the bottom-left of your primary display.
