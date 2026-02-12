/**
 * Text sanitization utilities to prevent XSS attacks
 * Used for any user-generated or external API content
 */

import logger from './logger';

// HTML entities to escape
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for HTML rendering
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') {
    return str === null || str === undefined ? '' : String(str);
  }
  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char]);
}

/**
 * Sanitize a string for safe display
 * Removes potential script injections and escapes HTML
 * @param {string} str - String to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} - Sanitized string
 */
export function sanitizeText(str, options = {}) {
  const { 
    maxLength = 10000,
    allowNewlines = true,
    trimWhitespace = true,
  } = options;

  if (typeof str !== 'string') {
    return str === null || str === undefined ? '' : String(str);
  }

  let result = str;

  // Trim if requested
  if (trimWhitespace) {
    result = result.trim();
  }

  // Truncate if too long
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength) + '...';
  }

  // Remove null bytes and other control characters (except newlines/tabs if allowed)
  if (allowNewlines) {
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    result = result.replace(/[\x00-\x1F\x7F]/g, ' ');
  }

  // Escape HTML
  result = escapeHtml(result);

  return result;
}

/**
 * Sanitize a URL to prevent javascript: and data: XSS
 * @param {string} url - URL to sanitize
 * @returns {string|null} - Safe URL or null if dangerous
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return null;
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    logger.warn('Blocked dangerous URL:', url.slice(0, 50));
    return null;
  }

  // Only allow http, https, and relative URLs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    !trimmed.includes(':')
  ) {
    return url;
  }

  logger.warn('Blocked unknown protocol URL:', url.slice(0, 50));
  return null;
}

/**
 * Sanitize market data object from API
 * @param {object} market - Market data object
 * @returns {object} - Sanitized market object
 */
export function sanitizeMarketData(market) {
  if (!market || typeof market !== 'object') return market;

  return {
    ...market,
    // Sanitize text fields that might be rendered
    question: sanitizeText(market.question, { maxLength: 500 }),
    description: sanitizeText(market.description, { maxLength: 2000 }),
    ticker: sanitizeText(market.ticker, { maxLength: 20, allowNewlines: false }),
    category: sanitizeText(market.category, { maxLength: 100, allowNewlines: false }),
    subcategory: sanitizeText(market.subcategory, { maxLength: 100, allowNewlines: false }),
    resolution_source: sanitizeText(market.resolution_source, { maxLength: 500 }),
    // Sanitize any URLs
    ...(market.image_url && { image_url: sanitizeUrl(market.image_url) }),
    ...(market.link && { link: sanitizeUrl(market.link) }),
  };
}

/**
 * Sanitize an array of market objects
 * @param {array} markets - Array of market objects
 * @returns {array} - Array of sanitized market objects
 */
export function sanitizeMarkets(markets) {
  if (!Array.isArray(markets)) return [];
  return markets.map(sanitizeMarketData);
}
