import { io } from "socket.io-client";

const getSocketURL = () => {
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL.replace(/\/+$/, "");
  }
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
  }
  return undefined;
};

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket) return;

    const targetUrl = getSocketURL();
    const options = {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    };

    this.socket = targetUrl ? io(targetUrl, options) : io(options);

    this.socket.on("connect", () => {
      console.log("[Socket.IO] Connected to backend live server, id:", this.socket.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket.IO] Disconnected:", reason);
    });

    // Re-attach registered event listeners
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
