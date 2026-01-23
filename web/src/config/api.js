/**
 * Centralized API Configuration
 * Single source of truth for all API endpoints
 */

// Backend API base URL - configured via environment variable
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// API endpoints - all go through backend
export const API_ENDPOINTS = {
  // Base API version
  BASE: `${API_BASE_URL}/api/v1`,
  
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
  },
  
  // News
  NEWS: {
    SOURCES: '/news/sources',
    SOURCE_BY_ID: (id) => `/news/sources/${id}`,
    TRIGGER_SCRAPE: (id) => `/news/sources/${id}/scrape`,
    ARTICLES: '/news/articles',
    ARTICLE_BY_ID: (id) => `/news/articles/${id}`,
    SEARCH: '/news/articles/search',
  },
  
  // Scraper
  SCRAPER: {
    JOBS: '/scraper/jobs',
    JOB_BY_ID: (id) => `/scraper/jobs/${id}`,
  },
  
  // Analysis
  ANALYSIS: {
    JOBS: '/analysis/jobs',
    JOB_BY_ID: (id) => `/analysis/jobs/${id}`,
  },
  
  // Predictions
  PREDICTIONS: {
    JOBS: '/predictions/jobs',
    JOB_BY_ID: (id) => `/predictions/jobs/${id}`,
  },
  
  // Polymarket (proxied through backend)
  POLYMARKET: {
    EVENTS: '/polymarket/events',
    EVENT_BY_ID: (id) => `/polymarket/events/${id}`,
  },
  
  // WebSocket
  WEBSOCKET: `${API_BASE_URL.replace('http', 'ws')}/api/v1/ws`,
};

/**
 * Build full URL for an endpoint
 * @param {string} endpoint - Endpoint path
 * @returns {string} Full URL
 */
export function buildUrl(endpoint) {
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  return `${API_ENDPOINTS.BASE}${endpoint}`;
}

/**
 * Get authentication headers
 * @param {string} token - JWT token
 * @returns {object} Headers object
 */
export function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * External service URLs (for documentation/links only - NOT for API calls)
 */
export const EXTERNAL_LINKS = {
  POLYMARKET: 'https://polymarket.com',
  PHANTOM_WALLET: 'https://phantom.app',
  METAMASK_WALLET: 'https://metamask.io',
};
