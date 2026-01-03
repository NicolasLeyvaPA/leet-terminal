// Utility helpers for data generation and formatting

// Generate price history fallback (when API fails)
export function generatePriceHistory(currentPrice, days) {
  const history = [];
  let price = currentPrice - (Math.random() * 0.12 - 0.04);
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price += (Math.random() - 0.48) * 0.015;
    price = Math.max(0.05, Math.min(0.95, price));
    history.push({
      date: date.toISOString().split("T")[0],
      time: date.getTime(),
      price: price,
      volume: Math.floor(Math.random() * 100000) + 50000,
      high: Math.min(0.95, price + Math.random() * 0.02),
      low: Math.max(0.05, price - Math.random() * 0.02),
    });
  }
  history[history.length - 1].price = currentPrice;
  return history;
}

// Generate orderbook fallback (when API fails)
export function generateOrderbook(midPrice) {
  const bids = [], asks = [];
  let bidCumulative = 0, askCumulative = 0;
  for (let i = 1; i <= 15; i++) {
    const bidSize = Math.floor(Math.random() * 80000) + 20000;
    const askSize = Math.floor(Math.random() * 80000) + 20000;
    bidCumulative += bidSize;
    askCumulative += askSize;
    bids.push({
      price: Math.max(0.01, midPrice - i * 0.005),
      size: bidSize,
      cumulative: bidCumulative,
    });
    asks.push({
      price: Math.min(0.99, midPrice + i * 0.005),
      size: askSize,
      cumulative: askCumulative,
    });
  }
  return {
    bids,
    asks,
    imbalance:
      (bidCumulative - askCumulative) /
      (bidCumulative + askCumulative || 1),
  };
}

// Generate simulated trade
export function makeRandomTrade(ticker, lastMc = 7.6) {
  const sides = ["Buy", "Sell"];
  const side = sides[Math.random() < 0.45 ? 0 : 1];
  const ageSeconds = Math.floor(Math.random() * 1200);
  const amountK = (Math.random() * 120 + 0.8).toFixed(1) + "K";
  const usd = (Math.random() * 900 + 5).toFixed(2);
  const mc = (lastMc + (Math.random() - 0.5) * 0.1).toFixed(1) + "M";
  return {
    id: ticker + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    ageLabel: ageSeconds < 60 ? `${ageSeconds}s` : `${Math.floor(ageSeconds / 60)}m`,
    side,
    mc,
    amount: amountK,
    usd,
  };
}

// Format numbers with appropriate suffixes
export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(2);
}

// Format probability as percentage
export function formatProb(prob) {
  return (prob * 100).toFixed(1) + '%';
}

// Format currency
export function formatCurrency(amount) {
  return '$' + formatNumber(amount);
}

// Calculate time remaining until date
export function timeUntil(dateStr) {
  if (!dateStr) return 'N/A';
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target - now;

  if (diff < 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 30) return `${Math.floor(days / 30)}mo`;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

// Parse Polymarket URL to extract event slug
export function parsePolymarketUrl(url) {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('polymarket')) return null;

    const pathParts = urlObj.pathname.split('/');
    const eventIndex = pathParts.indexOf('event');
    if (eventIndex !== -1 && pathParts[eventIndex + 1]) {
      return pathParts[eventIndex + 1].split('?')[0];
    }
    return null;
  } catch {
    return null;
  }
}
