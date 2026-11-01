<div align="center">

  <img src="assets/icon.png" width="120" height="120" alt="Novata Visualizer Logo" />

  # Novata

  **Minimalist Desktop Audio Visualizer & Background Music Streamer for Windows**

  [![Release](https://img.shields.io/badge/release-nvt__0.1-18181b?style=for-the-badge&logoColor=white)](https://github.com/Duxgfun/novata)
  [![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-18181b?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/Duxgfun/novata)
  [![Framework](https://img.shields.io/badge/framework-Electron-18181b?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
  [![Memory](https://img.shields.io/badge/memory-%3C60%20MB%20RAM-10b981?style=for-the-badge)](https://github.com/Duxgfun/novata)
  [![License](https://img.shields.io/badge/license-MIT-18181b?style=for-the-badge)](LICENSE)

  <p align="center">
    <a href="#overview">Overview</a> &bull;
    <a href="#key-features">Key Features</a> &bull;
    <a href="#installation">Installation</a> &bull;
    <a href="#quick-start">Quick Start</a> &bull;
    <a href="#architecture">Architecture</a> &bull;
    <a href="#shortcuts--controls">Controls</a> &bull;
    <a href="#performance">Performance</a> &bull;
    <a href="#project-structure">Structure</a> &bull;
    <a href="#license">License</a>
  </p>

</div>

---

## Overview

**Novata** is a lightweight, distraction-free desktop audio spectrum visualizer and music player designed specifically for Windows 10 and Windows 11.

Engineered with a **monochrome matte aesthetic** and a **floating frosted Glass UI player card**, Novata renders pure, responsive audio waveforms directly above your Windows taskbar. The waveform has no background box, integrates seamlessly with any desktop wallpaper, stays layered below active windows, and supports native click-through so you can work, game, or browse without disruption.

---

## Key Features

### Symmetrical Center-Out Waveform
- **Center-anchored energy**: Bass and low-end frequencies pulse dynamically from the center of your screen, rippling symmetrically outward toward both edges.
- **Logarithmic frequency mapping**: Employs non-linear band distribution (`Math.pow(t, 1.35)`) and dynamic high-frequency treble compensation, preventing waveform bunching on one side and delivering balanced motion across the entire screen.
- **Pure transparency**: Completely borderless and containerless canvas rendered flush against the desktop edge (bottom or top).
- **Native click-through**: Mouse clicks pass through the spectrum canvas directly to desktop icons, games, or underlying windows.

### In-App Music Discovery & Direct Audio Streaming
- **Universal audio search**: Search songs, artists, and albums directly within the app without switching windows.
- **Zero-latency playback**: Uses direct HTML5 audio connected to the Web Audio API `AnalyserNode` for instantaneous audio-to-visual synchronization.
- **Integrated Mini Player**: Track artwork, artist info, duration indicator, smooth progress seek bar, and transport controls.

### Universal System Media Sync (Windows SMTC)
- **Automatic external detection**: Seamlessly monitors active playback from **Spotify, YouTube (Chrome/Edge/Firefox), Apple Music, and SoundCloud** via Windows System Media Transport Controls (SMTC).
- **Loopback audio capture**: Renders real-time visuals for any sound playing on your system when not streaming in-app.

### Floating Frosted Glass UI Player Widget
- **Refined glassmorphism**: The floating media card features a translucent frosted glass finish with subtle border glow and clean typography.
- **Interactive drag-and-drop placement**: Click the **Move** button on the widget to reposition it anywhere on your desktop, then click **Done** to lock its coordinates.
- **Position memory**: Coordinates are preserved across application launches, with an instant one-click reset to the bottom-left corner in Settings.

### Precision Color Studio & Opacity Control
- **Matte Black customizer modal**: Consistent dark studio interface featuring a hex input field with live validation.
- **16 Curated aesthetic presets**: Handcrafted colorways including Pure White, Platinum, Zinc, Ice Blue, Mint, Amber, Sunset Coral, and Lavender.
- **Live opacity slider**: Adjust waveform transparency from 10% to 100% to match dark, light, or dynamic wallpapers.

### System Tray Workflow
- **Single-Click**: Instant toggle to show or hide the floating Glass UI desktop player widget.
- **Double-Click**: Quickly brings up the Settings & Music Search panel.
- **Context menu**: Right-click for playback controls (Play/Pause, Next, Previous), settings shortcut, and clean application exit.

### Zero-Lag Performance Engineering
- **Batched Canvas rendering**: All 100 frequency bars are compiled into a single contiguous `ctx.fill()` path operation per frame, eliminating GPU command overhead.
- **Dynamic frame rate governor**: Runs at a fluid 60 FPS during active audio playback and steps down to 30 FPS during idle states.
- **No screen recording**: Captures pure audio loopback without utilizing Desktop Duplication or video capture APIs, eliminating stutter and cursor hitching.
- **Offline Bootstrap Icons**: Fully self-contained icon library with zero external font dependencies and zero emojis.

---

## Technical Specifications

| Parameter | Specification |
|---|---|
| **Version** | `nvt_0.1` |
| **Operating System** | Windows 10 / Windows 11 (64-bit) |
| **Runtime Environment** | Electron 45.x with Node.js 24.x |
| **Memory Consumption** | ~35 MB - 55 MB Working Set (Target: <60 MB) |
| **CPU Utilization** | ~1.0% - 2.5% during playback; <0.5% idle |
| **Audio Pipeline** | Web Audio API (`AnalyserNode`, FFT Size: 512, Smoothing: 0.82) |
| **Rendering Target** | Transparent layered window with Hardware-Accelerated 2D Canvas |
| **IPC Architecture** | Context Isolation enabled, Preload script bridge |

---

## Installation

### Option 1: Automated Windows Installer (Recommended)
Download the installer from the [`dist/`](file:///c:/Users/zippo/Documents/project/Novata/dist) directory:
- **Installer binary**: `Novata Setup 0.1.0.exe`
- Runs standard NSIS installation with desktop shortcut creation and Start menu integration.
- Supports clean uninstallation via Windows Settings > Installed Apps.

### Option 2: Portable Executable
For a portable, zero-install experience:
- Run directly from: `dist/win-unpacked/Novata.exe`
- Ideal for USB drives or isolated testing without administrative elevation.

### Option 3: Interactive Web Preview
Test the complete Novata experience directly inside your browser:
```bash
npm run preview
```
Or open [`preview/index.html`](file:///c:/Users/zippo/Documents/project/Novata/preview/index.html) in any modern Chromium-based browser to simulate the Windows 11 desktop, interactive visualizer, draggable player card, and settings panel.

---

## Quick Start & Developer Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [npm](https://www.npmjs.com/) v9.0.0 or higher
- Windows 10 or 11 (x64)

### Setup & Run

```bash
# 1. Clone the repository
git clone https://github.com/Duxgfun/novata.git
cd novata

# 2. Install dependencies
npm install

# 3. Launch application in development mode
npm start

# 4. Launch visualizer alongside the Settings panel
npx electron . --settings

# 5. Build production Windows Installer and Portable binaries
npm run dist
```

---

## Architecture

The diagram below outlines the communication flow between the Main process, audio pipeline, and renderer windows:

```mermaid
flowchart TD
    subgraph AudioSource["Audio Input Pipeline"]
        A1["In-App Native Stream\n(HTML5 Audio Element)"]
        A2["Windows System Audio\n(Loopback Capture)"]
    end

    subgraph AudioEngine["Web Audio API Engine"]
        B1["MediaElementAudioSourceNode"]
        B2["AnalyserNode (FFT: 512, Smoothing: 0.82)"]
        B3["Logarithmic Mapping & Treble Boost"]
    end

    subgraph MainProcess["Electron Main Process"]
        C1["Window Lifecycle Manager"]
        C2["System Tray Controller"]
        C3["Configuration Store (novata-settings.json)"]
        C4["Windows SMTC PowerShell Session"]
    end

    subgraph Renderers["Hardware-Accelerated Renderers"]
        D1["Overlay Window\n(Transparent Canvas 2D + Glass UI Widget)"]
        D2["Settings & Search Window\n(Matte Black Control Panel)"]
    end

    A1 --> B1
    B1 --> B2
    A2 -.-> B2
    B2 --> B3
    B3 -->|"Single-Call Batch Render"| D1

    C3 <-->|"IPC Bridge"| D1
    C3 <-->|"IPC Bridge"| D2
    C2 -->|"Show/Hide Toggle"| D1
    C4 -.->|"Track Metadata"| D1
```

---

## Shortcuts & Controls

| Input / Action | Result |
|---|---|
| **Single-click Tray Icon** | Toggle visibility of the floating Glass UI player card |
| **Double-click Tray Icon** | Open the Settings & Music Search panel |
| **Right-click Tray Icon** | Open quick context menu (Play, Pause, Next, Prev, Exit) |
| **Click "Move" on Player Card** | Enable drag-and-drop mode to reposition the widget |
| **Click "Done" on Player Card** | Lock widget coordinates and save position to storage |
| **Click on Progress Bar** | Seek audio track to the selected timestamp |
| **Press ESC in Settings** | Instantly dismiss the Color Customizer modal |

---

## Performance & Optimization

Novata is built from the ground up to operate with minimal hardware impact:

- **Optimized Memory Footprint**: Streamlined dependencies and zero unnecessary runtime bloat keep active RAM usage under 60 MB.
- **Single-Path Canvas Drawing**: Frequency bars are constructed using vector rect operations inside a single path and committed with one `ctx.fill()` call, eliminating redundant GPU state switches.
- **Framerate Throttling**: Automatically adjusts render frequency based on audio activity:
  - **Active playback**: 60 FPS smooth motion.
  - **Silence / Standby**: Drops to 30 FPS with negligible CPU impact.
- **Zero Screen Duplication**: Audio frequencies are sourced purely from the audio stream or Windows loopback, avoiding costly Desktop Duplication API capture passes.

---

## Project Structure

```
Novata/
├── assets/                          # Application branding icons (.ico, .png)
├── dist/                            # Production build artifacts
│   ├── Novata Setup 0.1.0.exe       # Windows NSIS Automated Installer
│   └── win-unpacked/Novata.exe      # Portable executable
├── preview/                         # Interactive browser-based simulation
│   ├── index.html                   # Simulated Windows 11 Desktop interface
│   ├── style.css                    # Windows 11 styling & Matte Black UI
│   ├── app.js                       # Audio simulator, drag controller & settings logic
│   └── assets/                      # Demo audio files, wallpapers & icons
├── src/
│   ├── main/
│   │   ├── main.js                  # Main Electron entry, window & tray management
│   │   ├── store.js                 # Persistent user settings store
│   │   ├── musicSearch.js           # Audio search & stream extraction module
│   │   ├── mediaManager.js          # Windows SMTC metadata integration
│   │   ├── preload.js               # Secure IPC bridge (Context Isolation)
│   │   └── scripts/
│   │       └── mediaServer.ps1      # Persistent PowerShell SMTC backend
│   └── renderer/
│       ├── assets/
│       │   ├── icon.png             # Application logo asset
│       │   └── bootstrap-icons/     # Local offline Bootstrap Icons bundle
│       ├── overlay/                 # Visualizer canvas & Glass UI player card
│       │   ├── index.html           # Transparent overlay window layout
│       │   ├── style.css            # Glass UI styles & screen anchoring
│       │   ├── visualizer.js        # Waveform generation & Canvas drawing engine
│       │   └── app.js               # Mini player UI logic & drag positioning
│       └── settings/                # Settings & Music Search control panel
│           ├── index.html           # Plain English settings interface & color modal
│           ├── style.css            # Dark matte control panel styles
│           └── settings.js          # Real-time setting synchronization
└── package.json                     # Project manifest and build scripts
```

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full details.

Developed with care by the **Duxgg.fun**.
