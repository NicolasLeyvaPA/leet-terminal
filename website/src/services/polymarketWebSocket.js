/**
 * Polymarket WebSocket Service
 * 
 * Real-time price updates via WebSocket connection to Polymarket CLOB.
 * Docs: https://docs.polymarket.com/#websocket-api
 */

import { useState, useEffect } from 'react';
import logger from '../utils/logger';

const WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

class PolymarketWebSocket {
  constructor() {
    this.ws = null;
    this.subscriptions = new Map(); // tokenId -> Set of callbacks
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
    this.messageQueue = [];
    this.lastPrices = new Map(); // tokenId -> last price
    this.connectionStatus = 'disconnected';
    this.statusListeners = new Set();
  }

  /**
   * Connect to WebSocket
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          logger.log('[WS] Connected to Polymarket');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.setStatus('connected');

          // Process queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            this.ws.send(JSON.stringify(msg));
          }

          // Resubscribe to all active subscriptions
          for (const tokenId of this.subscriptions.keys()) {
            this.sendSubscribe(tokenId);
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          logger.error('[WS] Error:', error);
          this.isConnecting = false;
        };

        this.ws.onclose = (event) => {
          logger.log('[WS] Disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.setStatus('disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      // Handle different message types
      if (message.event_type === 'price_change' || message.type === 'price_change') {
        this.handlePriceChange(message);
      } else if (message.event_type === 'book' || message.type === 'book') {
        this.handleBookUpdate(message);
      } else if (message.event_type === 'trade' || message.type === 'trade') {
        this.handleTrade(message);
      } else if (message.event_type === 'tick_size_change') {
        // Ignore tick size changes
      } else if (message.event_type === 'last_trade_price') {
        this.handleLastTradePrice(message);
      } else {
        // Log unknown message types for debugging
        logger.debug('[WS] Unknown message type:', message);
      }
    } catch (error) {
      logger.warn('[WS] Failed to parse message:', error);
    }
  }

  /**
   * Handle price change event
   */
  handlePriceChange(message) {
    const tokenId = message.asset_id || message.token_id;
    const price = parseFloat(message.price || message.mid_price || 0);
    
    if (!tokenId || isNaN(price)) return;
    
    this.lastPrices.set(tokenId, price);
    this.notifySubscribers(tokenId, {
      type: 'price',
      tokenId,
      price,
      timestamp: message.timestamp || Date.now(),
    });
  }

  /**
   * Handle orderbook update
   */
  handleBookUpdate(message) {
    const tokenId = message.asset_id || message.token_id;
    if (!tokenId) return;

    const bids = message.bids || [];
    const asks = message.asks || [];
    
    // Calculate mid price from book
    const bestBid = bids.length > 0 ? parseFloat(bids[0].price || bids[0].p || 0) : 0;
    const bestAsk = asks.length > 0 ? parseFloat(asks[0].price || asks[0].p || 0) : 1;
    const midPrice = (bestBid + bestAsk) / 2;
    
    if (midPrice > 0 && midPrice < 1) {
      this.lastPrices.set(tokenId, midPrice);
    }

    this.notifySubscribers(tokenId, {
      type: 'book',
      tokenId,
      bids: bids.slice(0, 10),
      asks: asks.slice(0, 10),
      midPrice,
      timestamp: message.timestamp || Date.now(),
    });
  }

  /**
   * Handle trade event
   */
  handleTrade(message) {
    const tokenId = message.asset_id || message.token_id;
    const price = parseFloat(message.price || 0);
    const size = parseFloat(message.size || message.amount || 0);
    
    if (!tokenId) return;
    
    if (price > 0) {
      this.lastPrices.set(tokenId, price);
    }

    this.notifySubscribers(tokenId, {
      type: 'trade',
      tokenId,
      price,
      size,
      side: message.side,
      timestamp: message.timestamp || Date.now(),
    });
  }

  /**
   * Handle last trade price event
   */
  handleLastTradePrice(message) {
    const tokenId = message.asset_id || message.token_id;
    const price = parseFloat(message.price || 0);
    
    if (!tokenId || isNaN(price) || price <= 0) return;
    
    this.lastPrices.set(tokenId, price);
    this.notifySubscribers(tokenId, {
      type: 'price',
      tokenId,
      price,
      timestamp: message.timestamp || Date.now(),
    });
  }

  /**
   * Send subscription message
   */
  sendSubscribe(tokenId) {
    const message = {
      type: 'subscribe',
      channel: 'market',
      assets_ids: [tokenId],
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  /**
   * Send unsubscribe message
   */
  sendUnsubscribe(tokenId) {
    const message = {
      type: 'unsubscribe',
      channel: 'market',
      assets_ids: [tokenId],
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Subscribe to price updates for a token
   * @param {string} tokenId - CLOB token ID
   * @param {Function} callback - Called with price updates
   * @returns {Function} Unsubscribe function
   */
  subscribe(tokenId, callback) {
    if (!tokenId) return () => {};

    // Connect if not connected
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    // Add callback to subscriptions
    if (!this.subscriptions.has(tokenId)) {
      this.subscriptions.set(tokenId, new Set());
      this.sendSubscribe(tokenId);
    }
    this.subscriptions.get(tokenId).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(tokenId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(tokenId);
          this.sendUnsubscribe(tokenId);
        }
      }
    };
  }

  /**
   * Notify all subscribers for a token
   */
  notifySubscribers(tokenId, data) {
    const callbacks = this.subscriptions.get(tokenId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch (error) {
          logger.error('[WS] Callback error:', error);
        }
      }
    }
  }

  /**
   * Get last known price for a token
   */
  getLastPrice(tokenId) {
    return this.lastPrices.get(tokenId);
  }

  /**
   * Attempt to reconnect after disconnect
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn('[WS] Max reconnection attempts reached');
      this.setStatus('failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.setStatus('reconnecting');
    
    setTimeout(() => {
      if (this.subscriptions.size > 0) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Set connection status and notify listeners
   */
  setStatus(status) {
    this.connectionStatus = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (error) {
        logger.error('[WS] Status listener error:', error);
      }
    }
  }

  /**
   * Subscribe to connection status changes
   * @param {Function} callback - Called with status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'
   * @returns {Function} Unsubscribe function
   */
  onStatusChange(callback) {
    this.statusListeners.add(callback);
    // Immediately notify of current status
    callback(this.connectionStatus);
    return () => this.statusListeners.delete(callback);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    this.messageQueue = [];
    this.setStatus('disconnected');
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const polymarketWS = new PolymarketWebSocket();

// React hook for using WebSocket prices
export function usePolymarketPrice(tokenId) {
  const [price, setPrice] = useState(null);
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    if (!tokenId) return;

    const unsubPrice = polymarketWS.subscribe(tokenId, (data) => {
      if (data.type === 'price' || data.type === 'trade') {
        setPrice(data.price);
      }
    });

    const unsubStatus = polymarketWS.onStatusChange(setStatus);

    // Get cached price immediately
    const cached = polymarketWS.getLastPrice(tokenId);
    if (cached) setPrice(cached);

    return () => {
      unsubPrice();
      unsubStatus();
    };
  }, [tokenId]);

  return { price, status };
}
