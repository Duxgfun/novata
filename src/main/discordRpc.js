/**
 * Module Discord Rich Presence (RPC) cho Novata nvt_0.2
 * Kết nối trực tiếp qua Windows Named Pipe của Discord (\??\pipe\discord-ipc-0..9)
 * Không phụ thuộc thư viện ngoài, xử lý lỗi an toàn không gây crash app khi không có Discord.
 * Bình luận bằng tiếng Việt theo quy định toàn cục.
 */

const net = require('net');
const EventEmitter = require('events');

// Discord Application ID mặc định cho Novata Visualizer (hỗ trợ hiển thị trạng thái nghe nhạc)
const DEFAULT_CLIENT_ID = '807774172574253056';

// Các mã Opcode chuẩn của giao thức Discord RPC
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
    this.startTime = Math.floor(Date.now() / 1000);
  }

  /**
   * Khởi tạo kết nối Discord RPC
   * @param {Object} store Quản lý cấu hình store
   */
  init(store) {
    if (store) {
      this.isEnabled = store.get('discordRpcEnabled') !== false;
      const customId = store.get('discordClientId');
      if (customId && customId.trim()) {
        this.clientId = customId.trim();
      }
    }

    if (this.isEnabled) {
      this.connect();
    }
  }

  /**
   * Bật hoặc tắt Discord RPC từ giao diện Cài đặt
   * @param {boolean} enabled 
   */
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

  /**
   * Lấy trạng thái kết nối hiện tại
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      connected: this.isConnected,
      clientId: this.clientId
    };
  }

  /**
   * Tìm và kết nối đến Named Pipe của Discord
   */
  connect() {
    if (!this.isEnabled || this.isConnected || this.isConnecting) return;

    this.isConnecting = true;
    this.tryConnectPipe(0);
  }

  /**
   * Thử kết nối lần lượt các pipe từ discord-ipc-0 đến discord-ipc-9
   * @param {number} index Chỉ số pipe
   */
  tryConnectPipe(index) {
    if (index > 9 || !this.isEnabled) {
      // Đã thử hết các pipe nhưng Discord chưa mở, lên lịch thử lại sau 15 giây
      this.isConnecting = false;
      this.scheduleReconnect(15000);
      return;
    }

    const pipePath = `\\\\?\\pipe\\discord-ipc-${index}`;
    const sock = net.createConnection(pipePath);

    const onConnect = () => {
      sock.removeAllListeners('error');
      this.socket = sock;
      this.currentPipeIndex = index;
      this.isConnecting = false;
      this.isConnected = true;
      this.setupSocketListeners();
      this.sendHandshake();
      this.emit('connected');

      // Nếu có hoạt động đang chờ cập nhật thì gửi ngay
      if (this.currentActivity) {
        this.sendActivity(this.currentActivity);
      }
    };

    const onError = () => {
      sock.destroy();
      // Thử pipe tiếp theo
      this.tryConnectPipe(index + 1);
    };

    sock.once('connect', onConnect);
    sock.once('error', onError);
  }

  /**
   * Thiết lập các bộ lắng nghe sự kiện trên socket
   */
  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('data', (data) => {
      this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
      this.processBuffer();
    });

    this.socket.on('close', () => {
      this.handleDisconnect();
    });

    this.socket.on('error', () => {
      // Xử lý lỗi ngầm, tránh in log gây phiền khi người dùng tắt Discord
      this.handleDisconnect();
    });
  }

  /**
   * Phân tích và xử lý gói tin nhị phân nhận từ Discord
   */
  processBuffer() {
    while (this.receiveBuffer.length >= 8) {
      const opcode = this.receiveBuffer.readInt32LE(0);
      const length = this.receiveBuffer.readInt32LE(4);

      if (this.receiveBuffer.length < 8 + length) {
        // Chưa đủ dữ liệu cho toàn bộ gói tin, chờ tiếp
        break;
      }

      const bodyBuffer = this.receiveBuffer.subarray(8, 8 + length);
      this.receiveBuffer = this.receiveBuffer.subarray(8 + length);

      try {
        const payload = JSON.parse(bodyBuffer.toString('utf8'));
        this.handleMessage(opcode, payload);
      } catch (e) {
        // Bỏ qua nếu gói tin JSON bị lỗi cú pháp
      }
    }
  }

  /**
   * Xử lý thông điệp từ Discord
   * @param {number} opcode 
   * @param {Object} payload 
   */
  handleMessage(opcode, payload) {
    if (opcode === OPCODES.FRAME) {
      if (payload.evt === 'READY') {
        this.emit('ready', payload.data);
      }
    } else if (opcode === OPCODES.PING) {
      this.sendPacket(OPCODES.PONG, payload);
    } else if (opcode === OPCODES.CLOSE) {
      this.disconnect();
    }
  }

  /**
   * Gửi gói Handshake bắt tay với Discord
   */
  sendHandshake() {
    this.sendPacket(OPCODES.HANDSHAKE, {
      v: 1,
      client_id: this.clientId
    });
  }

  /**
   * Đóng gói nhị phân và gửi qua socket
   * @param {number} opcode 
   * @param {Object} payload 
   */
  sendPacket(opcode, payload) {
    if (!this.socket || !this.isConnected) return false;

    try {
      const jsonStr = JSON.stringify(payload);
      const jsonBuf = Buffer.from(jsonStr, 'utf8');
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

  /**
   * Cập nhật trạng thái bài hát đang nghe lên Discord
   * @param {Object} trackInfo Thông tin bài hát (tiêu đề, nghệ sĩ, nguồn, ảnh, trạng thái)
   */
  updateActivity(trackInfo) {
    if (!trackInfo || !trackInfo.Title) {
      this.clearActivity();
      return;
    }

    const title = (trackInfo.Title || 'Listening to Music').trim().substring(0, 120);
    const artist = (trackInfo.Artist || 'Novata Visualizer').trim().substring(0, 120);
    const source = (trackInfo.Source || 'Novata').trim();
    const isPlaying = trackInfo.Status ? trackInfo.Status.toLowerCase().includes('play') : true;

    // Xác định icon nguồn phát (YouTube, Spotify, SoundCloud, Novata In-App)
    let sourceLabel = 'Novata Player';
    let smallImage = 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/sound.svg';

    const srcLower = source.toLowerCase();
    if (srcLower.includes('spotify')) {
      sourceLabel = 'Spotify';
      smallImage = 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/spotify.svg';
    } else if (srcLower.includes('youtube')) {
      sourceLabel = 'YouTube Music';
      smallImage = 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/youtube.svg';
    } else if (srcLower.includes('sound') || srcLower.includes('cloud')) {
      sourceLabel = 'SoundCloud';
      smallImage = 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/soundcloud.svg';
    } else if (srcLower.includes('chrome') || srcLower.includes('edge') || srcLower.includes('browser')) {
      sourceLabel = 'Web Browser';
      smallImage = 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/chrome.svg';
    }

    // Thời gian tính từ lúc bắt đầu nghe để Discord hiển thị "elapsed"
    let startTimestamp = this.startTime;
    if (trackInfo.currentTime && typeof trackInfo.currentTime === 'number') {
      startTimestamp = Math.floor(Date.now() / 1000) - Math.floor(trackInfo.currentTime);
    }

    const activity = {
      details: title,
      state: isPlaying ? `by ${artist} • ${sourceLabel}` : `Paused • ${artist}`,
      timestamps: isPlaying ? { start: startTimestamp } : undefined,
      assets: {
        large_image: trackInfo.Thumbnail && trackInfo.Thumbnail.startsWith('http') 
          ? trackInfo.Thumbnail 
          : 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/sound.svg',
        large_text: `Novata nvt_0.2`,
        small_image: smallImage,
        small_text: `Playing via ${sourceLabel}`
      }
    };

    this.currentActivity = activity;

    if (!this.isConnected) {
      if (this.isEnabled && !this.isConnecting) {
        this.connect();
      }
      return;
    }

    // Giới hạn tần suất gửi không quá 1 lần mỗi 2.5 giây để tránh rate limit của Discord
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

  /**
   * Gửi gói tin SET_ACTIVITY đến Discord
   * @param {Object} activity 
   */
  sendActivity(activity) {
    if (!this.isConnected) return;

    this.lastUpdateTime = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);

    this.sendPacket(OPCODES.FRAME, {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: activity || null
      },
      nonce: nonce
    });
  }

  /**
   * Xóa trạng thái hoạt động trên Discord khi tạm dừng hoặc không có nhạc
   */
  clearActivity() {
    this.currentActivity = null;
    if (this.isConnected) {
      this.sendActivity(null);
    }
  }

  /**
   * Xử lý khi kết nối bị ngắt
   */
  handleDisconnect() {
    this.isConnected = false;
    this.isConnecting = false;
    this.receiveBuffer = Buffer.alloc(0);

    if (this.socket) {
      this.socket.removeAllListeners();
      try { this.socket.destroy(); } catch (e) {}
      this.socket = null;
    }

    this.emit('disconnected');

    // Lên lịch tự động kết nối lại nếu vẫn đang bật tính năng RPC
    if (this.isEnabled) {
      this.scheduleReconnect(15000);
    }
  }

  /**
   * Lên lịch tự động thử kết nối lại
   * @param {number} delay Thời gian chờ tính bằng mili-giây
   */
  scheduleReconnect(delay = 15000) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.isEnabled && !this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Ngắt kết nối và giải phóng tài nguyên
   */
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
      try { this.socket.destroy(); } catch (e) {}
      this.socket = null;
    }

    this.emit('disconnected');
  }

  /**
   * Dọn dẹp hoàn toàn khi ứng dụng thoát
   */
  destroy() {
    this.isEnabled = false;
    this.disconnect();
  }
}

module.exports = new DiscordRpcManager();
