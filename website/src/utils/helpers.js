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

export function makeInitialTrades(ticker, n = 20) {
  const trades = [];
  let mc = 7.6;
  for (let i = 0; i < n; i++) {
    const t = makeRandomTrade(ticker, mc);
    mc = parseFloat(t.mc.replace("$", "").replace("M", "")) || mc;
    trades.push(t);
  }
  return trades;
}

