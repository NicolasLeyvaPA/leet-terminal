/**
 * WebSocket Service
 * Manages WebSocket connections for real-time updates
 */

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

export class WebSocketService {
  constructor(url = WS_BASE_URL) {
    this.baseUrl = url;
    this.connections = new Map();
  }

  connect(channel, callbacks = {}) {
    const url = `${this.baseUrl}/${channel}`;
    
    if (this.connections.has(channel)) {
      console.warn(`Already connected to channel: ${channel}`);
      return this.connections.get(channel);
    }

    const ws = new WebSocket(url);
    const connection = {
      ws,
      callbacks,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
    };

    ws.onopen = () => {
      console.log(`WebSocket connected: ${channel}`);
      connection.reconnectAttempts = 0;
      callbacks.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        callbacks.onError?.(error);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error on ${channel}:`, error);
      callbacks.onError?.(error);
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected: ${channel}`);
      this.connections.delete(channel);
      callbacks.onClose?.();

      // Auto-reconnect
      if (connection.reconnectAttempts < connection.maxReconnectAttempts) {
        connection.reconnectAttempts++;
        setTimeout(() => {
          console.log(`Reconnecting to ${channel}... (${connection.reconnectAttempts})`);
          this.connect(channel, callbacks);
        }, 5000);
      }
    };

    this.connections.set(channel, connection);
    return connection;
  }

  disconnect(channel) {
    const connection = this.connections.get(channel);
    if (connection) {
      connection.ws.close();
      this.connections.delete(channel);
    }
  }

  send(channel, message) {
    const connection = this.connections.get(channel);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      connection.ws.send(data);
    } else {
      console.warn(`Cannot send message. Channel ${channel} is not connected.`);
    }
  }

  disconnectAll() {
    for (const [channel] of this.connections) {
      this.disconnect(channel);
    }
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
export default wsService;
