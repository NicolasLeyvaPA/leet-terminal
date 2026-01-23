/**
 * Formatter utility
 * Handles formatting of data for display
 */

/**
 * Format timestamp to readable string
 */
export function formatTimestamp(timestamp, options = {}) {
  const { format = 'full', locale = 'en-US' } = options;
  const date = new Date(timestamp);

  switch (format) {
    case 'time':
      return date.toLocaleTimeString(locale);
    case 'date':
      return date.toLocaleDateString(locale);
    case 'relative':
      return formatRelativeTime(date);
    case 'full':
    default:
      return date.toLocaleString(locale);
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }

  return 'just now';
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format number with commas
 */
export function formatNumber(number, decimals = 0) {
  return Number(number).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage
 */
export function formatPercentage(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format JSON for display
 */
export function formatJSON(data, indent = 2) {
  return JSON.stringify(data, null, indent);
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength, suffix = '...') {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format API response for terminal display
 */
export function formatTerminalResponse(response) {
  if (typeof response === 'string') return response;
  if (typeof response === 'object') return formatJSON(response);
  return String(response);
}

export default {
  formatTimestamp,
  formatRelativeTime,
  formatFileSize,
  formatNumber,
  formatPercentage,
  formatJSON,
  formatDuration,
  truncate,
  formatTerminalResponse,
};
