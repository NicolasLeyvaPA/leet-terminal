// ============================================
// TICKER MAPPING UTILITY
// Generates short tickers for market options
// Supports: Sports teams, Politicians, Dates, Generic
// ============================================

// NFL Teams
const NFL_TEAMS = {
  'seattle': 'SEA', 'seahawks': 'SEA',
  'los angeles rams': 'LAR', 'rams': 'LAR', 'la rams': 'LAR',
  'buffalo': 'BUF', 'bills': 'BUF',
  'new england': 'NE', 'patriots': 'NE', 'pats': 'NE',
  'denver': 'DEN', 'broncos': 'DEN',
  'houston': 'HOU', 'texans': 'HOU',
  'chicago': 'CHI', 'bears': 'CHI',
  'san francisco': 'SF', '49ers': 'SF', 'niners': 'SF',
  'pittsburgh': 'PIT', 'steelers': 'PIT',
  'kansas city': 'KC', 'chiefs': 'KC',
  'miami': 'MIA', 'dolphins': 'MIA',
  'dallas': 'DAL', 'cowboys': 'DAL',
  'green bay': 'GB', 'packers': 'GB',
  'new york giants': 'NYG', 'giants': 'NYG',
  'new york jets': 'NYJ', 'jets': 'NYJ',
  'philadelphia': 'PHI', 'eagles': 'PHI',
  'las vegas': 'LV', 'raiders': 'LV',
  'los angeles chargers': 'LAC', 'chargers': 'LAC',
  'baltimore': 'BAL', 'ravens': 'BAL',
  'cincinnati': 'CIN', 'bengals': 'CIN',
  'cleveland': 'CLE', 'browns': 'CLE',
  'tennessee': 'TEN', 'titans': 'TEN',
  'indianapolis': 'IND', 'colts': 'IND',
  'jacksonville': 'JAX', 'jaguars': 'JAX',
  'atlanta': 'ATL', 'falcons': 'ATL',
  'carolina': 'CAR', 'panthers': 'CAR',
  'new orleans': 'NO', 'saints': 'NO',
  'tampa bay': 'TB', 'buccaneers': 'TB', 'bucs': 'TB',
  'arizona': 'ARI', 'cardinals': 'ARI',
  'detroit': 'DET', 'lions': 'DET',
  'minnesota': 'MIN', 'vikings': 'MIN',
  'washington': 'WAS', 'commanders': 'WAS',
};

// NBA Teams
const NBA_TEAMS = {
  'lakers': 'LAL', 'los angeles lakers': 'LAL',
  'celtics': 'BOS', 'boston': 'BOS',
  'warriors': 'GSW', 'golden state': 'GSW',
  'nets': 'BKN', 'brooklyn': 'BKN',
  'knicks': 'NYK', 'new york knicks': 'NYK',
  'heat': 'MIA', 'miami heat': 'MIA',
  'bulls': 'CHI', 'chicago bulls': 'CHI',
  'suns': 'PHX', 'phoenix': 'PHX',
  'mavericks': 'DAL', 'dallas mavericks': 'DAL', 'mavs': 'DAL',
  'nuggets': 'DEN', 'denver nuggets': 'DEN',
  'bucks': 'MIL', 'milwaukee': 'MIL',
  'sixers': 'PHI', '76ers': 'PHI', 'philadelphia 76ers': 'PHI',
  'raptors': 'TOR', 'toronto': 'TOR',
  'clippers': 'LAC', 'la clippers': 'LAC',
  'spurs': 'SAS', 'san antonio': 'SAS',
  'thunder': 'OKC', 'oklahoma city': 'OKC',
  'timberwolves': 'MIN', 'minnesota timberwolves': 'MIN',
  'pelicans': 'NOP', 'new orleans pelicans': 'NOP',
  'grizzlies': 'MEM', 'memphis': 'MEM',
  'cavaliers': 'CLE', 'cleveland cavaliers': 'CLE', 'cavs': 'CLE',
};

// Politicians
const POLITICIANS = {
  'donald trump': 'TRUMP', 'trump': 'TRUMP',
  'joe biden': 'BIDEN', 'biden': 'BIDEN',
  'kamala harris': 'HARRIS', 'harris': 'HARRIS',
  'j.d. vance': 'VANCE', 'jd vance': 'VANCE', 'vance': 'VANCE',
  'gavin newsom': 'NEWSOM', 'newsom': 'NEWSOM',
  'ron desantis': 'DESANTIS', 'desantis': 'DESANTIS',
  'marco rubio': 'RUBIO', 'rubio': 'RUBIO',
  'nikki haley': 'HALEY', 'haley': 'HALEY',
  'vivek ramaswamy': 'VIVEK', 'ramaswamy': 'VIVEK',
  'pete buttigieg': 'PETE', 'buttigieg': 'PETE',
  'elizabeth warren': 'WARREN', 'warren': 'WARREN',
  'bernie sanders': 'BERNIE', 'sanders': 'BERNIE',
  'aoc': 'AOC', 'alexandria ocasio-cortez': 'AOC',
  'ted cruz': 'CRUZ', 'cruz': 'CRUZ',
  'josh hawley': 'HAWLEY', 'hawley': 'HAWLEY',
  'tim scott': 'TSCOTT', 'scott': 'TSCOTT',
  'michelle obama': 'MOBAMA', 'michelle': 'MOBAMA',
  'elon musk': 'MUSK', 'musk': 'MUSK',
};

// Political parties
const PARTIES = {
  'republican': { short: 'R', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  'democratic': { short: 'D', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  'democrat': { short: 'D', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  'independent': { short: 'I', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.1)' },
  'libertarian': { short: 'L', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  'green': { short: 'G', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
};

// Combine all mappings
const ALL_TICKERS = {
  ...NFL_TEAMS,
  ...NBA_TEAMS,
  ...POLITICIANS,
};

// Team/candidate colors for charts
const ENTITY_COLORS = {
  // NFL
  'SEA': '#69BE28', 'LAR': '#003594', 'BUF': '#00338D', 'NE': '#002244',
  'DEN': '#FB4F14', 'HOU': '#03202F', 'CHI': '#0B162A', 'SF': '#AA0000',
  'PIT': '#FFB612', 'KC': '#E31837', 'MIA': '#008E97', 'DAL': '#003594',
  'GB': '#203731', 'PHI': '#004C54', 'BAL': '#241773', 'CIN': '#FB4F14',
  // NBA
  'LAL': '#552583', 'BOS': '#007A33', 'GSW': '#1D428A', 'BKN': '#000000',
  'NYK': '#006BB6', 'PHX': '#1D1160', 'MIL': '#00471B', 'DEN': '#0E2240',
  // Politicians
  'TRUMP': '#E91D0E', 'BIDEN': '#0015BC', 'HARRIS': '#0015BC', 'VANCE': '#E91D0E',
  'NEWSOM': '#0015BC', 'DESANTIS': '#E91D0E', 'RUBIO': '#E91D0E', 'HALEY': '#E91D0E',
};

/**
 * Get ticker from option name
 * @param {string} name - The option name (e.g., "Seattle Seahawks", "J.D. Vance")
 * @returns {string} - Short ticker (e.g., "SEA", "VANCE")
 */
export function getTickerFromName(name) {
  if (!name) return 'N/A';

  const normalized = name.toLowerCase().trim();

  // Direct lookup
  if (ALL_TICKERS[normalized]) {
    return ALL_TICKERS[normalized];
  }

  // Check if any key is contained in the name
  for (const [key, ticker] of Object.entries(ALL_TICKERS)) {
    if (normalized.includes(key)) {
      return ticker;
    }
  }

  // Fallback: Generate smart ticker
  return generateSmartTicker(name);
}

/**
 * Generate a smart ticker from any text
 * @param {string} text - Any text to convert to ticker
 * @returns {string} - Generated ticker (2-5 chars)
 */
export function generateSmartTicker(text) {
  if (!text) return 'N/A';

  // Handle dates (e.g., "January 20, 2025" -> "JAN20")
  const dateMatch = text.match(/^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
  if (dateMatch) {
    const monthAbbr = dateMatch[1].substring(0, 3).toUpperCase();
    return `${monthAbbr}${dateMatch[2]}`;
  }

  // Handle "Yes" / "No" options
  if (text.toLowerCase() === 'yes') return 'YES';
  if (text.toLowerCase() === 'no') return 'NO';

  // Handle negation patterns (e.g., "Not Trump" -> "!TRUMP")
  const notMatch = text.match(/^not\s+(.+)$/i);
  if (notMatch) {
    const baseTicker = getTickerFromName(notMatch[1]);
    return `!${baseTicker}`;
  }

  // Generate from significant words
  const words = text.split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !['the', 'and', 'for', 'are', 'was', 'has', 'have', 'will', 'not'].includes(w.toLowerCase()));

  if (words.length === 0) {
    return text.substring(0, 3).toUpperCase();
  }

  if (words.length === 1) {
    // Single word: take first 3-4 chars
    return words[0].substring(0, 4).toUpperCase();
  }

  // Multiple words: take first letter of each (up to 4)
  return words.slice(0, 4).map(w => w[0]).join('').toUpperCase();
}

/**
 * Get party info from option name or subtitle
 * @param {string} name - Option name
 * @param {string} subtitle - Optional subtitle
 * @returns {object|null} - Party info { short, color, bgColor } or null
 */
export function getPartyInfo(name, subtitle = '') {
  const combined = `${name} ${subtitle}`.toLowerCase();

  for (const [party, info] of Object.entries(PARTIES)) {
    if (combined.includes(party)) {
      return { ...info, name: party.charAt(0).toUpperCase() + party.slice(1) };
    }
  }

  return null;
}

/**
 * Get color for a ticker (for charts)
 * @param {string} ticker - The ticker symbol
 * @returns {string} - Hex color code
 */
export function getTickerColor(ticker) {
  return ENTITY_COLORS[ticker] || '#f97316'; // Default to orange
}

/**
 * Detect market type from market data
 * @param {object} market - Market object
 * @returns {string} - Market type: 'sports', 'politics', 'dates', 'binary', 'other'
 */
export function detectMarketType(market) {
  if (!market) return 'other';

  const question = (market.question || market.title || '').toLowerCase();
  const category = (market.category || '').toLowerCase();

  // Sports
  if (category.includes('sports') ||
      question.includes('super bowl') ||
      question.includes('championship') ||
      question.includes('playoffs') ||
      question.includes('nfl') ||
      question.includes('nba') ||
      question.includes('mlb') ||
      question.includes('world series')) {
    return 'sports';
  }

  // Politics
  if (category.includes('politics') ||
      question.includes('election') ||
      question.includes('president') ||
      question.includes('congress') ||
      question.includes('senate') ||
      question.includes('governor')) {
    return 'politics';
  }

  // Date-based
  if (question.includes('by ') ||
      question.includes('before ') ||
      question.includes('on ') ||
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(question)) {
    return 'dates';
  }

  // Binary (Yes/No)
  const outcomes = market.outcomes || market.allOutcomes || [];
  if (outcomes.length === 2) {
    const names = outcomes.map(o => (typeof o === 'string' ? o : o.name || '').toLowerCase());
    if (names.includes('yes') && names.includes('no')) {
      return 'binary';
    }
  }

  return 'other';
}

/**
 * Format volume for display
 * @param {number} volume - Volume in dollars
 * @returns {string} - Formatted string (e.g., "$7.1M", "$500K")
 */
export function formatVolume(volume) {
  if (!volume || isNaN(volume)) return '$0';
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
}

/**
 * Get initials for profile placeholder
 * @param {string} name - Full name
 * @returns {string} - Initials (e.g., "JD" for "J.D. Vance")
 */
export function getInitials(name) {
  if (!name) return '?';
  const words = name.replace(/[.]/g, '').split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default {
  getTickerFromName,
  generateSmartTicker,
  getPartyInfo,
  getTickerColor,
  detectMarketType,
  formatVolume,
  getInitials,
};
