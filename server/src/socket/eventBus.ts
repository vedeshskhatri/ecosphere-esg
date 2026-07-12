import { Server } from 'socket.io';

let io: Server | null = null;

/**
 * Initializes the Socket.IO server instance.
 * @param ioInstance The Socket.IO Server instance
 */
export function initSocket(ioInstance: Server): void {
  io = ioInstance;
}

/**
 * Gets the active Socket.IO server instance.
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
}

/**
 * Emits an event to all connected clients.
 * @param event The event name
 * @param data The payload data
 */
export function emitToAll(event: string, data: any): void {
  try {
    const server = getIO();
    server.emit(event, data);
  } catch (error) {
    console.error(`[EventBus] Error emitting event ${event} to all:`, error);
  }
}

/**
 * Emits an event to a specific user's private room.
 * @param userId The ID of the user
 * @param event The event name
 * @param data The payload data
 */
export function emitToUser(userId: string, event: string, data: any): void {
  try {
    const server = getIO();
    server.to(`user:${userId}`).emit(event, data);
  } catch (error) {
    console.error(`[EventBus] Error emitting event ${event} to user ${userId}:`, error);
  }
}
