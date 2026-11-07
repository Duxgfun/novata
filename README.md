# Novata

> Minimalist Audio Visualizer, Music Player & Floating Lyrics Widget for Windows 10 & 11  
> Version **nvt_0.7 beta** (v0.7.0) &bull; [Website & Web Simulator](https://novata.duxgg.fun) &bull; [GitHub Releases](https://github.com/Duxgfun/novata/releases)

---

## Standalone Release Edition Notice

This repository represents the **official standalone production release** of Novata. It is completely decoupled and isolated from the internal developer environment (`dev/`):

- **Zero Developer Overhead**: Stripped of internal development scripts, test harnesses, inspection suites, and intermediate artifacts.
- **Clean Production Codebase**: Code files are comment-free, strictly optimized, and verified via AST analysis for runtime reliability and fast load times.
- **Minimal Asset Footprint**: Contains exclusively the assets required to build and execute the application (using standard woff2 web fonts and vector graphics).
- **Direct Build Reproducibility**: Running build commands directly within this repository produces binary artifacts matching official release installers.

---

## Key Features (nvt_0.7 Beta)

### 1. Instant Startup Optimization (~1.1s Cold Start)
- **Zero-Latency Audio Loopback**: Pre-warmed desktop screen source acquisition in the Main process eliminates the 3.1-second WebRTC DXGI desktop thumbnail capture delay and error retry loops.
- **Asynchronous Audio Binding**: Decoupled Web Audio Analyser and canvas rendering loop, allowing visualizer and overlay widgets to render immediately in under 1.1s.
- **Lazy C# Worker Compilation & Downloader**: Deferred runtime compilation in background scripts and lazy-loaded music search modules reduce startup memory footprint.

### 2. Player Widget Hamburger Menu & Tri-Material Inheritance
- **Unified Toolbar Menu**: Consolidated Lyrics toggle, Move & Resize, and Settings controls into a single elegant hamburger button (`bi-list`) on the outer player widget toolbar.
- **Adaptive Material & Border Inheritance**: The hamburger popup automatically mirrors the player widget's material mode (Solid, Glass, Transparent), inheriting background color, glass blur, opacity, text color, and border styling 100%.
- **Smart Viewport Positioning**: Automatically detects screen boundary and opens downwards when the player card is docked near the top of the display.

### 3. Simplified Edit Mode & Spatial Docking
- **Streamlined Move & Resize**: Removed the redundant "Done" button from the player widget during Edit Mode.
- **Intuitive Toggling**: Enter and exit Edit Mode directly via the Move button in the hamburger menu, right-clicking on either card, or pressing `Escape`.
- **Center Crosshair & Magnetic Docking**: Snaps widgets to the center of the screen (<18px) and locks a clean 12px gap between Player and Lyrics cards to prevent overlap.

### 4. Zen Floating Lyrics & Multi-Alignment Typography
- **Full-Bleed Viewport**: Removed the redundant close (`X`) button from the floating lyrics card header; lyrics scrolling area expands to 100% of the card height.
- **Multi-Alignment Typography**: Select between `Center`, `Left`, and `Right` text alignments in Settings under Appearance > Lyrics Widget.
- **Directional Scaling**: Active lyric line scaling dynamically originates from the selected alignment (`transform-origin: var(--lyrics-text-align)`).
- **Silent Lyrics Mode**: Non-intrusive empty states when lyrics are absent; leaves your desktop clean without error banners or message icons.

### 5. Zero-Idle Performance Engine (0% CPU Deep Sleep)
- **Visualizer Deep Sleep**: Automatically stops `requestAnimationFrame` when audio is silent for more than 12 frames (~200ms). The canvas is cleared once and rendering sleeps, using a low-overhead 350ms poll.
- **Instant Wake Mechanism**: Awakens rendering immediately upon track playback or external media state transitions without visual stutter.
- **Working Set RAM Trimming**: Background memory optimization drops idle memory footprint down to ~79MB and idle CPU across all processes to 0.00%.

### 6. Lyrics Timing Calibration & Smart Audio Matching
- **Interactive Offset Toolbar**: Unobtrusive `[-]` and `[+]` synchronization buttons and live delay indicator on the floating lyrics card on hover, enabling instant calibration on the fly.
- **Comprehensive Timing Settings**: Dedicated timing offset slider (`-5.0s` to `+5.0s`) and 9 one-click preset buttons (`-1.5s` to `+1.0s`) in Appearance > Lyrics Widget modal.
- **Smart Audio Search Ranking**: Heuristic scoring algorithm prioritizes Official Audio, Topic, and Lyric Videos (2:30–5:30) while demoting extended story/drama music videos, nightcore, and live covers.

### 7. Settings Persistence & Anti-Reset Dual Backup System
- **Dual-Storage Backup**: Dual-write logic writes settings simultaneously to standard application storage and external storage at `%USERPROFILE%\.novata\settings_backup.json`.
- **Automatic Migration & Recovery**: On application launch or installer update, automatically detects and restores widget positions, dimensions, and user preferences if standard app storage was wiped or reset during an update.

### 8. Multi-Platform Streaming & Discord RPC
- **Direct Link Playback**: Paste track links directly from Spotify, YouTube Music, SoundCloud, or Apple Music for instant metadata extraction and streaming.
- **System Media Bridge**: Detects external media playback from Spotify desktop, Chrome, and Edge via Windows SMTC.
- **Discord Rich Presence**: Native Win32 named pipe IPC showcasing active listening status on Discord.

---

## Installation & Downloads

### Option 1: Standalone Windows Installer (Recommended)
Download the latest Windows installer from [GitHub Releases](https://github.com/Duxgfun/novata/releases):
- File: `Novata Setup 0.7.0.exe`
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
- `dist/Novata Setup 0.7.0.exe` (NSIS installer)
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
