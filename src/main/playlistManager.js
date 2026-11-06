const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const getUserDataPath = () => {
  if (app && typeof app.getPath === "function") {
    return app.getPath("userData");
  }
  const appData = process.env.APPDATA || (process.platform === "darwin" ? path.join(process.env.HOME || ".", "Library", "Application Support") : ".");
  const dir = path.join(appData, "novata");
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
    }
  }
  return dir;
};
const PLAYLISTS_PATH = path.join(getUserDataPath(), "novata-playlists.json");
class PlaylistManager {
  constructor() {
    this.playlists = this.load();
  }
  
  load() {
    try {
      if (fs.existsSync(PLAYLISTS_PATH)) {
        const raw = fs.readFileSync(PLAYLISTS_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const isLegacyDefaults = parsed.length > 0 && parsed.every((p) => ["favorites", "chill-lofi", "deep-focus"].includes(p.id));
          if (isLegacyDefaults) {
            this.saveToFile([]);
            return [];
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error("Kh\xF4ng th\u1EC3 \u0111\u1ECDc t\u1EC7p playlist:", err.message);
    }
    this.saveToFile([]);
    return [];
  }
  
  saveToFile(data) {
    try {
      fs.writeFileSync(PLAYLISTS_PATH, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.error("L\u1ED7i khi l\u01B0u danh s\xE1ch playlist:", err.message);
      return false;
    }
  }
  
  getAll() {
    return JSON.parse(JSON.stringify(this.playlists));
  }
  
  get(id) {
    const found = this.playlists.find((p) => p.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }
  
  create({ name }) {
    const cleanName = (name || "New Playlist").trim();
    const newId = "pl_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const newPlaylist = {
      id: newId,
      name: cleanName,
      createdAt: Date.now(),
      tracks: []
    };
    this.playlists.push(newPlaylist);
    this.saveToFile(this.playlists);
    return newPlaylist;
  }
  
  update(id, { name }) {
    const playlist = this.playlists.find((p) => p.id === id);
    if (!playlist) return null;
    if (name && typeof name === "string") {
      playlist.name = name.trim();
    }
    this.saveToFile(this.playlists);
    return playlist;
  }
  
  delete(id) {
    const index = this.playlists.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.playlists.splice(index, 1);
    this.saveToFile(this.playlists);
    return true;
  }
  
  addTrack(playlistId, track) {
    if (!track || !track.id) return { success: false, error: "Invalid track data" };
    let playlist = this.playlists.find((p) => p.id === playlistId);
    if (!playlist && this.playlists.length > 0) {
      playlist = this.playlists[0];
    }
    if (!playlist) return { success: false, error: "Playlist not found" };
    const existingIndex = playlist.tracks.findIndex((t) => t.id === track.id);
    if (existingIndex !== -1) {
      return { success: true, message: "Track already in playlist", duplicate: true, playlist };
    }
    const cleanTrack = {
      id: track.id,
      title: (track.title || "Unknown Title").trim(),
      artist: (track.artist || "Unknown Artist").trim(),
      duration: track.duration || "3:30",
      thumbnail: track.thumbnail || "",
      source: track.source || "YouTube Music",
      addedAt: Date.now()
    };
    playlist.tracks.push(cleanTrack);
    this.saveToFile(this.playlists);
    return { success: true, playlist, track: cleanTrack };
  }
  
  removeTrack(playlistId, trackId) {
    const playlist = this.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;
    const beforeLength = playlist.tracks.length;
    playlist.tracks = playlist.tracks.filter((t) => t.id !== trackId);
    if (playlist.tracks.length !== beforeLength) {
      this.saveToFile(this.playlists);
      return true;
    }
    return false;
  }
}
module.exports = new PlaylistManager();
