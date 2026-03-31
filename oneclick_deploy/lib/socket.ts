/**
 * Socket.io Client Configuration
 * 
 * Manages WebSocket connection to the backend server for real-time updates.
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/** Socket.io client instance (singleton) */
let socket: Socket | null = null;

/**
 * Get or create the Socket.io client instance
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt:', attemptNumber);
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed');
    });
  }

  return socket;
}

/**
 * Connect to the socket server
 */
export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

/**
 * Disconnect from the socket server
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

/**
 * Subscribe to updates for a specific instance
 */
export function subscribeToInstance(instanceId: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('subscribe:instance', instanceId);
    console.log('[Socket] Subscribed to instance:', instanceId);
  }
}

/**
 * Unsubscribe from updates for a specific instance
 */
export function unsubscribeFromInstance(instanceId: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('unsubscribe:instance', instanceId);
    console.log('[Socket] Unsubscribed from instance:', instanceId);
  }
}

/** Event types emitted by the server */
export interface InstanceStatusEvent {
  instanceId: string;
  state: string;
  publicIp: string | null;
  timestamp: string;
}

export interface InstancesAllEvent {
  instances: Array<{
    instanceId: string;
    name: string;
    state: string;
    publicIp: string | null;
    instanceType: string;
    launchTime: string;
  }>;
  timestamp: string;
}

export interface ConnectedEvent {
  message: string;
  timestamp: string;
}

/** Type-safe event listener */
export function onInstanceStatus(callback: (data: InstanceStatusEvent) => void): () => void {
  const s = getSocket();
  s.on('instance:status', callback);
  s.on('instance:updated', callback);
  
  // Return cleanup function
  return () => {
    s.off('instance:status', callback);
    s.off('instance:updated', callback);
  };
}

/** Subscribe to initial instances list */
export function onInstancesAll(callback: (data: InstancesAllEvent) => void): () => void {
  const s = getSocket();
  s.on('instances:all', callback);
  
  return () => {
    s.off('instances:all', callback);
  };
}

/** Subscribe to connection confirmation */
export function onConnected(callback: (data: ConnectedEvent) => void): () => void {
  const s = getSocket();
  s.on('connected', callback);
  
  return () => {
    s.off('connected', callback);
  };
}

export { socket };
export type { Socket };
