import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) || 'http://localhost:5000';

class SocketService {
  private static instance: SocketService;
  public socket: Socket;

  private constructor() {
    this.socket = io(SOCKET_URL, {
      autoConnect: false,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to server:', this.socket.id);
      const userId = localStorage.getItem('ecosphere_user_id');
      if (userId) {
        this.socket.emit('join:user', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
    });
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  public disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }
}

export const socketService = SocketService.getInstance();
export const socket = socketService.socket;
