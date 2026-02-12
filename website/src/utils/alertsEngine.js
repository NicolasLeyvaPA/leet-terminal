/**
 * Alerts Engine
 *
 * Price and volume alerts for prediction markets.
 * Persists to localStorage, triggers browser notifications.
 */

import logger from './logger';

const STORAGE_KEY = 'leet_terminal_alerts';
const TRIGGERED_KEY = 'leet_terminal_triggered_alerts';

// Alert types
export const ALERT_TYPES = {
  PRICE_ABOVE: 'price_above',
  PRICE_BELOW: 'price_below',
  PRICE_CROSS: 'price_cross', // Crosses target in either direction
  VOLUME_SPIKE: 'volume_spike', // Volume exceeds threshold
  SPREAD_WIDE: 'spread_wide', // Spread exceeds threshold
};

// Alert status
export const ALERT_STATUS = {
  ACTIVE: 'active',
  TRIGGERED: 'triggered',
  PAUSED: 'paused',
  EXPIRED: 'expired',
};

class AlertsEngine {
  constructor() {
    this.alerts = [];
    this.triggeredAlerts = [];
    this.listeners = new Set();
    this.notificationPermission = 'default';
    this.soundEnabled = true;
    this.lastPrices = new Map(); // marketId -> last price (for cross detection)
    
    this.loadFromStorage();
    this.requestNotificationPermission();
  }

  /**
   * Load alerts from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.alerts = JSON.parse(stored);
        // Clean up expired alerts
        this.alerts = this.alerts.filter(a => {
          if (a.expiresAt && new Date(a.expiresAt) < new Date()) {
            return false;
          }
          return true;
        });
      }
      
      const triggered = localStorage.getItem(TRIGGERED_KEY);
      if (triggered) {
        this.triggeredAlerts = JSON.parse(triggered);
        // Keep only last 50 triggered alerts
        if (this.triggeredAlerts.length > 50) {
          this.triggeredAlerts = this.triggeredAlerts.slice(-50);
        }
      }
    } catch (e) {
      logger.error('Failed to load alerts:', e);
      this.alerts = [];
      this.triggeredAlerts = [];
    }
  }

  /**
   * Save alerts to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alerts));
      localStorage.setItem(TRIGGERED_KEY, JSON.stringify(this.triggeredAlerts));
    } catch (e) {
      logger.error('Failed to save alerts:', e);
    }
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      logger.warn('Browser does not support notifications');
      return;
    }
    
    if (Notification.permission === 'granted') {
      this.notificationPermission = 'granted';
    } else if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
      } catch (e) {
        logger.error('Failed to request notification permission:', e);
      }
    }
  }

  /**
   * Create a new alert
   */
  createAlert({
    marketId,
    marketTicker,
    marketQuestion,
    type,
    targetValue,
    note = '',
    expiresAt = null,
    repeatOnce = true, // If false, alert can trigger multiple times
  }) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      marketId,
      marketTicker,
      marketQuestion,
      type,
      targetValue,
      note,
      status: ALERT_STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      expiresAt,
      repeatOnce,
      triggerCount: 0,
    };
    
    this.alerts.push(alert);
    this.saveToStorage();
    this.notifyListeners();
    
    return alert;
  }

  /**
   * Delete an alert
   */
  deleteAlert(alertId) {
    this.alerts = this.alerts.filter(a => a.id !== alertId);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Pause/resume an alert
   */
  toggleAlertPause(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = alert.status === ALERT_STATUS.PAUSED 
        ? ALERT_STATUS.ACTIVE 
        : ALERT_STATUS.PAUSED;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Check markets against active alerts
   * Call this whenever market data updates
   */
  checkAlerts(markets) {
    const triggered = [];
    
    for (const alert of this.alerts) {
      if (alert.status !== ALERT_STATUS.ACTIVE) continue;
      
      const market = markets.find(m => m.id === alert.marketId);
      if (!market) continue;
      
      const currentPrice = market.market_prob;
      const lastPrice = this.lastPrices.get(alert.marketId);
      let shouldTrigger = false;
      
      switch (alert.type) {
        case ALERT_TYPES.PRICE_ABOVE:
          shouldTrigger = currentPrice >= alert.targetValue;
          break;
          
        case ALERT_TYPES.PRICE_BELOW:
          shouldTrigger = currentPrice <= alert.targetValue;
          break;
          
        case ALERT_TYPES.PRICE_CROSS:
          if (lastPrice !== undefined) {
            const crossedUp = lastPrice < alert.targetValue && currentPrice >= alert.targetValue;
            const crossedDown = lastPrice > alert.targetValue && currentPrice <= alert.targetValue;
            shouldTrigger = crossedUp || crossedDown;
          }
          break;
          
        case ALERT_TYPES.VOLUME_SPIKE:
          shouldTrigger = (market.volume_24h || 0) >= alert.targetValue;
          break;
          
        case ALERT_TYPES.SPREAD_WIDE:
          shouldTrigger = (market.spread || 0) >= alert.targetValue;
          break;
      }
      
      if (shouldTrigger) {
        triggered.push({ alert, market, currentPrice });
        
        // Update alert status
        alert.triggerCount++;
        if (alert.repeatOnce) {
          alert.status = ALERT_STATUS.TRIGGERED;
        }
        
        // Record triggered alert
        this.triggeredAlerts.push({
          ...alert,
          triggeredAt: new Date().toISOString(),
          triggeredPrice: currentPrice,
        });
      }
      
      // Update last price for cross detection
      this.lastPrices.set(alert.marketId, currentPrice);
    }
    
    if (triggered.length > 0) {
      this.saveToStorage();
      this.notifyListeners();
      this.fireNotifications(triggered);
    }
    
    return triggered;
  }

  /**
   * Fire browser notifications and sounds for triggered alerts
   */
  fireNotifications(triggered) {
    for (const { alert, market, currentPrice } of triggered) {
      // Browser notification
      if (this.notificationPermission === 'granted') {
        const priceStr = (currentPrice * 100).toFixed(1);
        const targetStr = (alert.targetValue * 100).toFixed(1);
        
        new Notification(`🚨 Alert: ${alert.marketTicker}`, {
          body: `Price ${this.getAlertTypeLabel(alert.type)} ${targetStr}¢ (now ${priceStr}¢)`,
          icon: '/favicon.ico',
          tag: alert.id,
          requireInteraction: true,
        });
      }
      
      // Sound
      if (this.soundEnabled) {
        this.playAlertSound();
      }
    }
  }

  /**
   * Play alert sound
   */
  playAlertSound() {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      logger.warn('Failed to play alert sound:', e);
    }
  }

  /**
   * Get human-readable label for alert type
   */
  getAlertTypeLabel(type) {
    switch (type) {
      case ALERT_TYPES.PRICE_ABOVE: return 'above';
      case ALERT_TYPES.PRICE_BELOW: return 'below';
      case ALERT_TYPES.PRICE_CROSS: return 'crossed';
      case ALERT_TYPES.VOLUME_SPIKE: return 'volume above';
      case ALERT_TYPES.SPREAD_WIDE: return 'spread above';
      default: return type;
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts() {
    return this.alerts.filter(a => a.status === ALERT_STATUS.ACTIVE);
  }

  /**
   * Get all alerts (active + paused)
   */
  getAllAlerts() {
    return [...this.alerts];
  }

  /**
   * Get triggered alerts history
   */
  getTriggeredAlerts() {
    return [...this.triggeredAlerts].reverse(); // Most recent first
  }

  /**
   * Get alerts for a specific market
   */
  getAlertsForMarket(marketId) {
    return this.alerts.filter(a => a.marketId === marketId);
  }

  /**
   * Clear all triggered alerts history
   */
  clearTriggeredHistory() {
    this.triggeredAlerts = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Toggle sound
   */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  /**
   * Subscribe to alert changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    for (const callback of this.listeners) {
      try {
        callback(this.alerts, this.triggeredAlerts);
      } catch (e) {
        logger.error('Alert listener error:', e);
      }
    }
  }
}

// Singleton instance
export const alertsEngine = new AlertsEngine();

/**
 * React hook for alerts
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState(alertsEngine.getAllAlerts());
  const [triggered, setTriggered] = useState(alertsEngine.getTriggeredAlerts());
  
  useEffect(() => {
    const unsubscribe = alertsEngine.subscribe((newAlerts, newTriggered) => {
      setAlerts([...newAlerts]);
      setTriggered([...newTriggered].reverse());
    });
    return unsubscribe;
  }, []);
  
  return {
    alerts,
    triggeredAlerts: triggered,
    activeAlerts: alerts.filter(a => a.status === ALERT_STATUS.ACTIVE),
    createAlert: (params) => alertsEngine.createAlert(params),
    deleteAlert: (id) => alertsEngine.deleteAlert(id),
    togglePause: (id) => alertsEngine.toggleAlertPause(id),
    clearHistory: () => alertsEngine.clearTriggeredHistory(),
    checkAlerts: (markets) => alertsEngine.checkAlerts(markets),
    getAlertsForMarket: (id) => alertsEngine.getAlertsForMarket(id),
    soundEnabled: alertsEngine.soundEnabled,
    toggleSound: () => alertsEngine.toggleSound(),
  };
}

// Need to import useState and useEffect for the hook
import { useState, useEffect } from 'react';
