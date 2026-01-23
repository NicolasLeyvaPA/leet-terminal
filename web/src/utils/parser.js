/**
 * Parser utility
 * Handles parsing of various data formats
 */

/**
 * Parse command string into command and arguments
 */
export function parseCommand(commandString) {
  const parts = commandString.trim().split(/\s+/);
  return {
    command: parts[0]?.toLowerCase() || '',
    args: parts.slice(1),
  };
}

/**
 * Parse URL and extract components
 */
export function parseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      isValid: true,
    };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

/**
 * Parse CSV string
 */
export function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }

  return data;
}

/**
 * Parse query string into object
 */
export function parseQueryString(queryString) {
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

/**
 * Parse error messages for better display
 */
export function parseError(error) {
  if (typeof error === 'string') {
    return error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unknown error occurred';
}

export default {
  parseCommand,
  parseUrl,
  parseCSV,
  parseQueryString,
  parseError,
};
