/**
 * Research History
 *
 * Persists deep research sessions to localStorage.
 * Follows the same singleton + subscribe pattern as alertsEngine.
 */

import { useState, useEffect } from 'react';
import logger from './logger';

const STORAGE_KEY = 'leet_terminal_research_history';
const MAX_SESSIONS = 50;

class ResearchHistory {
  constructor() {
    this.sessions = [];
    this.listeners = new Set();
    this.loadFromStorage();
  }

  /**
   * Load sessions from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.sessions = JSON.parse(stored);
        // Prune to max
        if (this.sessions.length > MAX_SESSIONS) {
          this.sessions = this.sessions.slice(-MAX_SESSIONS);
        }
      }
    } catch (e) {
      logger.error('Failed to load research history:', e);
      this.sessions = [];
    }
  }

  /**
   * Save sessions to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions));
    } catch (e) {
      logger.error('Failed to save research history:', e);
    }
  }

  /**
   * Save a new research session
   */
  save({ marketTicker, marketQuestion, query, depth, result }) {
    const session = {
      id: `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      marketTicker: marketTicker || null,
      marketQuestion: marketQuestion || null,
      query: query || null,
      depth: depth || 'deep',
      result,
      starred: false,
    };

    this.sessions.push(session);

    // Prune oldest (keep starred longer by removing unstarred first)
    if (this.sessions.length > MAX_SESSIONS) {
      const unstarredIndex = this.sessions.findIndex(s => !s.starred);
      if (unstarredIndex !== -1) {
        this.sessions.splice(unstarredIndex, 1);
      } else {
        this.sessions.shift();
      }
    }

    this.saveToStorage();
    this.notifyListeners();
    return session;
  }

  /**
   * Get all sessions, most recent first
   */
  getAll() {
    return [...this.sessions].reverse();
  }

  /**
   * Get a single session by id
   */
  get(id) {
    return this.sessions.find(s => s.id === id) || null;
  }

  /**
   * Remove a session by id
   */
  remove(id) {
    this.sessions = this.sessions.filter(s => s.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Clear all sessions
   */
  clear() {
    this.sessions = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Toggle star on a session
   */
  toggleStar(id) {
    const session = this.sessions.find(s => s.id === id);
    if (session) {
      session.starred = !session.starred;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to changes
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
        callback(this.getAll());
      } catch (e) {
        logger.error('Research history listener error:', e);
      }
    }
  }
}

// Singleton instance
export const researchHistory = new ResearchHistory();

/**
 * React hook for research history
 */
export function useResearchHistory() {
  const [sessions, setSessions] = useState(researchHistory.getAll());

  useEffect(() => {
    const unsubscribe = researchHistory.subscribe((updated) => {
      setSessions(updated);
    });
    return unsubscribe;
  }, []);

  return {
    sessions,
    save: (params) => researchHistory.save(params),
    get: (id) => researchHistory.get(id),
    remove: (id) => researchHistory.remove(id),
    clear: () => researchHistory.clear(),
    toggleStar: (id) => researchHistory.toggleStar(id),
  };
}
