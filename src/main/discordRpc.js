const net = require("net");
const EventEmitter = require("events");
const DEFAULT_CLIENT_ID = "1567377198237618186";
const OPCODES = {
  HANDSHAKE: 0,
  FRAME: 1,
  CLOSE: 2,
  PING: 3,
  PONG: 4
};
class DiscordRpcManager extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.clientId = DEFAULT_CLIENT_ID;
    this.isEnabled = true;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectTimer = null;
    this.currentPipeIndex = 0;
    this.currentActivity = null;
    this.lastUpdateTime = 0;
    this.pendingUpdate = null;
    this.receiveBuffer = Buffer.alloc(0);
    this.startTime = Math.floor(Date.now() / 1e3);
  }
  
  init(store) {
    if (store) {
      this.isEnabled = store.get("discordRpcEnabled") !== false;
    }
    this.clientId = DEFAULT_CLIENT_ID;
    if (this.isEnabled) {
      this.connect();
    }
  }
  
  setEnabled(enabled) {
    this.isEnabled = !!enabled;
    if (this.isEnabled) {
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    } else {
      this.disconnect();
    }
  }
  
  updateClientId(newId) {
    if (!newId || !newId.trim()) return;
    const cleanId = newId.trim();
    if (cleanId === this.clientId) return;
    this.clientId = cleanId;
    if (this.isEnabled) {
      this.disconnect();
      setTimeout(() => {
        if (this.isEnabled) this.connect();
      }, 500);
    }
  }
  
  getStatus() {
    return {
      enabled: this.isEnabled,
      connected: this.isConnected,
      clientId: this.clientId
    };
  }
  
  connect() {
    if (!this.isEnabled || this.isConnected || this.isConnecting) return;
    this.isConnecting = true;
    this.tryConnectPipe(0);
  }
  
  tryConnectPipe(index) {
    if (index > 9 || !this.isEnabled) {
      this.isConnecting = false;
      this.scheduleReconnect(15e3);
      return;
    }
    const pipePath = `\\\\?\\pipe\\discord-ipc-${index}`;
    const sock = net.createConnection(pipePath);
    const onConnect = () => {
      sock.removeAllListeners("error");
      this.socket = sock;
      this.currentPipeIndex = index;
      this.isConnecting = false;
      this.isConnected = true;
      this.setupSocketListeners();
      this.sendHandshake();
      this.emit("connected");
      if (this.currentActivity) {
        this.sendActivity(this.currentActivity);
      }
    };
    const onError = () => {
      sock.destroy();
      this.tryConnectPipe(index + 1);
    };
    sock.once("connect", onConnect);
    sock.once("error", onError);
  }
  
  setupSocketListeners() {
    if (!this.socket) return;
    this.socket.on("data", (data) => {
      this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
      this.processBuffer();
    });
    this.socket.on("close", () => {
      this.handleDisconnect();
    });
    this.socket.on("error", () => {
      this.handleDisconnect();
    });
  }
  
  processBuffer() {
    while (this.receiveBuffer.length >= 8) {
      const opcode = this.receiveBuffer.readInt32LE(0);
      const length = this.receiveBuffer.readInt32LE(4);
      if (this.receiveBuffer.length < 8 + length) {
        break;
      }
      const bodyBuffer = this.receiveBuffer.subarray(8, 8 + length);
      this.receiveBuffer = this.receiveBuffer.subarray(8 + length);
      try {
        const payload = JSON.parse(bodyBuffer.toString("utf8"));
        this.handleMessage(opcode, payload);
      } catch (e) {
      }
    }
  }
  
  handleMessage(opcode, payload) {
    if (opcode === OPCODES.FRAME) {
      if (payload.evt === "READY") {
        this.emit("ready", payload.data);
      }
    } else if (opcode === OPCODES.PING) {
      this.sendPacket(OPCODES.PONG, payload);
    } else if (opcode === OPCODES.CLOSE) {
      this.disconnect();
    }
  }
  
  sendHandshake() {
    this.sendPacket(OPCODES.HANDSHAKE, {
      v: 1,
      client_id: this.clientId
    });
  }
  
  sendPacket(opcode, payload) {
    if (!this.socket || !this.isConnected) return false;
    try {
      const jsonStr = JSON.stringify(payload);
      const jsonBuf = Buffer.from(jsonStr, "utf8");
      const packet = Buffer.alloc(8 + jsonBuf.length);
      packet.writeInt32LE(opcode, 0);
      packet.writeInt32LE(jsonBuf.length, 4);
      jsonBuf.copy(packet, 8);
      this.socket.write(packet);
      return true;
    } catch (err) {
      return false;
    }
  }
  
  updateActivity(trackInfo) {
    if (!trackInfo || !trackInfo.Title) {
      this.clearActivity();
      return;
    }
    const title = (trackInfo.Title || "Listening to Music").trim().substring(0, 120);
    const artist = (trackInfo.Artist || "Novata").trim().substring(0, 120);
    const source = (trackInfo.Source || "Novata").trim();
    const isPlaying = trackInfo.Status ? trackInfo.Status.toLowerCase().includes("play") : true;
    let sourceLabel = "Novata Player";
    let smallImage = "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/sound.svg";
    const srcLower = source.toLowerCase();
    if (srcLower.includes("spotify")) {
      sourceLabel = "Spotify";
      smallImage = "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/spotify.svg";
    } else if (srcLower.includes("youtube")) {
      sourceLabel = "YouTube Music";
      smallImage = "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/youtube.svg";
    } else if (srcLower.includes("sound") || srcLower.includes("cloud")) {
      sourceLabel = "SoundCloud";
      smallImage = "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/soundcloud.svg";
    } else if (srcLower.includes("apple") || srcLower.includes("itunes")) {
      sourceLabel = "Apple Music";
      smallImage = "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/apple-music.svg";
    } else if (srcLower.includes("chrome") || srcLower.includes("edge") || srcLower.includes("browser")) {
      sourceLabel = "Web Browser";
      smallImage = "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/chrome.svg";
    }
    let startTimestamp = this.startTime;
    if (trackInfo.currentTime && typeof trackInfo.currentTime === "number") {
      startTimestamp = Math.floor(Date.now() / 1e3) - Math.floor(trackInfo.currentTime);
    }
    const activity = {
      details: title,
      state: isPlaying ? `by ${artist} \u2022 ${sourceLabel}` : `Paused \u2022 ${artist}`,
      timestamps: isPlaying ? { start: startTimestamp } : void 0,
      assets: {
        large_image: trackInfo.Thumbnail && trackInfo.Thumbnail.startsWith("http") ? trackInfo.Thumbnail : "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/sound.svg",
        large_text: `Novata nvt_0.6`,
        small_image: smallImage,
        small_text: `Playing via ${sourceLabel}`
      },
      
      type: 2
    };
    this.currentActivity = activity;
    if (!this.isConnected) {
      if (this.isEnabled && !this.isConnecting) {
        this.connect();
      }
      return;
    }
    const now = Date.now();
    if (now - this.lastUpdateTime < 2500) {
      if (this.pendingUpdate) clearTimeout(this.pendingUpdate);
      this.pendingUpdate = setTimeout(() => {
        this.sendActivity(this.currentActivity);
      }, 2500 - (now - this.lastUpdateTime));
      return;
    }
    this.sendActivity(activity);
  }
  
  sendActivity(activity) {
    if (!this.isConnected) return;
    this.lastUpdateTime = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    this.sendPacket(OPCODES.FRAME, {
      cmd: "SET_ACTIVITY",
      args: {
        pid: process.pid,
        activity: activity || null
      },
      nonce
    });
  }
  
  clearActivity() {
    this.currentActivity = null;
    if (this.isConnected) {
      this.sendActivity(null);
    }
  }
  
  handleDisconnect() {
    this.isConnected = false;
    this.isConnecting = false;
    this.receiveBuffer = Buffer.alloc(0);
    if (this.socket) {
      this.socket.removeAllListeners();
      try {
        this.socket.destroy();
      } catch (e) {
      }
      this.socket = null;
    }
    this.emit("disconnected");
    if (this.isEnabled) {
      this.scheduleReconnect(15e3);
    }
  }
  
  scheduleReconnect(delay = 15e3) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.isEnabled && !this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, delay);
  }
  
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearActivity();
    this.isConnected = false;
    this.isConnecting = false;
    if (this.socket) {
      this.socket.removeAllListeners();
      try {
        this.socket.destroy();
      } catch (e) {
      }
      this.socket = null;
    }
    this.emit("disconnected");
  }
  
  destroy() {
    this.isEnabled = false;
    this.disconnect();
  }
}
module.exports = new DiscordRpcManager();
