# Novata

> Minimalist Audio Visualizer, Music Player & Floating Lyrics Widget for Windows 10 & 11  
> Version **nvt_0.6 beta** (v0.6.0) &bull; [Website & Web Simulator](https://novata.duxgg.fun) &bull; [GitHub Releases](https://github.com/Duxgfun/novata/releases)

---

## Standalone Release Edition Notice

This repository represents the **official standalone production release** of Novata. It is completely decoupled and isolated from the internal developer environment (`dev/`):

- **Zero Developer Overhead**: Stripped of internal development scripts, test harnesses, inspection suites, and intermediate artifacts.
- **Clean Production Codebase**: Code files are comment-free, strictly optimized, and verified via AST analysis for runtime reliability and fast load times.
- **Minimal Asset Footprint**: Contains exclusively the assets required to build and execute the application (using standard woff2 web fonts and vector graphics).
- **Direct Build Reproducibility**: Running build commands directly within this repository produces binary artifacts matching official release installers.

---

## Key Features (nvt_0.6 Beta)

### 1. Symmetrical Continuous Wave & Spectrum Bars
- **Dual Visualizer Engines**: Toggle between smooth continuous flowing waves and crisp vertical spectrum bars.
- **Center-Out Symmetrical Energy**: Audio pulses emanate from the center of the display and ripple outward toward both edges.
- **100% Transparent Desktop Integration**: Visualizers sit directly above the taskbar on your desktop wallpaper with native click-through support.

### 2. Tri-Material Widget Styling Suite
Customize both the Desktop Player Widget and Floating Lyrics Widget independently across three distinct material styles:
- **Solid Mode**: Custom background color picker and solid border color picker.
- **Glass Mode**: Authentic, purely colorless frosted glass with independent controls for transparency (opacity) and Gaussian blur radius (`backdrop-filter`).
- **Transparent Mode**: Pure backgroundless mode with optional border toggle and custom border color selection.
- **Custom Typography**: Independent text color and font size controls for both widgets.

### 3. Smart Spatial Crosshairs & Magnetic Docking
- **Center Crosshair Overlay**: Central crosshair (+) and alignment guides appear automatically during widget edit mode (`Move & Resize`).
- **Center Magnetic Snap**: Snaps widgets directly to the horizontal and vertical center of the screen when within 18px.
- **12px Inter-Widget Docking**: Magnetic snapping between Player and Lyrics cards locks them into an exact 12px gap, completely eliminating card overlap.
- **Unified Move Control**: Move both widgets simultaneously from a single control point on the player widget.

### 4. Adaptive Responsive Button Scaling
- **Continuous Dynamic Scaling**: Dynamic `--player-scale` calculation ensures all 9 player controls scale down smoothly to narrow widths (down to 240px).
- **Zero Button Overflow**: Prevents control buttons from wrapping or clipping on compact widget sizes.

### 5. Floating Real-Time Synchronized Lyrics
- **LRCLIB Integration**: Queries open-source database for synchronized LRC lyrics (`[mm:ss.xx]`) with zero API keys required.
- **Real-Time Karaoke Synchronization**: Timed line highlighting with smooth automatic vertical centering.
- **Interactive Seek**: Click any lyric line to seek audio playback directly to that timestamp.
- **Silent Lyrics Mode**: Non-intrusive empty states when lyrics are absent; leaves your desktop clean without error banners or message icons.
- **Custom Font Loader**: Load any local `.ttf`, `.otf`, `.woff`, or `.woff2` font file via native Windows dialogs.

### 6. Multi-Platform Streaming & Discord RPC
- **Direct Link Playback**: Paste track links directly from Spotify, YouTube Music, SoundCloud, or Apple Music for instant metadata extraction and streaming.
- **System Media Bridge**: Detects external media playback from Spotify desktop, Chrome, and Edge via Windows SMTC.
- **Discord Rich Presence**: Native Win32 named pipe IPC showcasing active listening status on Discord.

---

## Installation & Downloads

### Option 1: Standalone Windows Installer (Recommended)
Download the latest Windows installer from [GitHub Releases](https://github.com/Duxgfun/novata/releases):
- File: `Novata Setup 0.6.0.exe`
- Architecture: Windows 10 / 11 (64-bit)
- Features: NSIS installation wizard, desktop shortcut, start menu entry, automatic uninstaller.

### Option 2: Portable Unpacked Binary
Download the pre-built portable archive and launch `Novata.exe` directly without installation.

---

## Building from Source

To run or build Novata directly from this release repository:

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Windows 10 or 11 (x64)

### Clone & Run
```bash
# Clone the repository
git clone https://github.com/Duxgfun/novata.git
cd novata

# Install dependencies
npm install

# Start the application
npm start
```

### Package Installer (.exe)
```bash
# Build the NSIS installer and unpacked binary
npm run build
```
Build artifacts are placed into the `dist/` directory:
- `dist/Novata Setup 0.6.0.exe` (NSIS installer)
- `dist/win-unpacked/Novata.exe` (Portable executable)

---

## Repository Structure

```text
novata/
├── .gitignore           # Git ignore rules for build artifacts and locks
├── package.json         # Build configuration and application metadata
├── README.md            # Standalone release documentation
├── assets/              # High-resolution application icons (.ico, .png)
└── src/
    ├── main/            # Electron main process (lifecycle, IPC, store, Discord RPC, SMTC)
    │   └── scripts/     # Native Windows PowerShell media transport bridges
    └── renderer/        # Renderer processes
        ├── assets/      # Bundled Bootstrap Icons (woff2) and fallback art
        ├── overlay/     # Symmetrical visualizer, player card, lyrics card
        └── settings/    # Tabbed configuration interface and appearance modals
```

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
