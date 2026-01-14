/**
 * Message Normalizer Service
 *
 * Transforms provider-specific WebSocket messages to normalized StreamEvent format.
 * Features:
 * - Polymarket CLOB message normalization
 * - Kalshi WebSocket message normalization
 * - Event type detection and routing
 */

import type { StreamEvent, StreamEventType } from '@leet-terminal/shared/contracts';
import { getWebSocketManager } from './websocket-manager.js';
import { getSSEHandler } from './sse-handler.js';

// Polymarket CLOB message types
interface PolymarketPriceMessage {
  event_type: 'price_change' | 'last_trade_price';
  asset_id: string;
  price?: string;
  last_trade_price?: string;
  timestamp?: string;
}

interface PolymarketOrderbookMessage {
  event_type: 'book';
  asset_id: string;
  bids?: Array<{ price: string; size: string }>;
  asks?: Array<{ price: string; size: string }>;
  timestamp?: string;
}

interface PolymarketTradeMessage {
  event_type: 'trade';
  asset_id: string;
  price: string;
  size: string;
  side: 'BUY' | 'SELL';
  timestamp?: string;
}

// Kalshi message types
interface KalshiTickerMessage {
  type: 'ticker';
  msg: {
    market_ticker: string;
    yes_bid?: number;
    yes_ask?: number;
    last_price?: number;
    volume?: number;
    ts?: number;
  };
}

interface KalshiOrderbookMessage {
  type: 'orderbook_snapshot' | 'orderbook_delta';
  msg: {
    market_ticker: string;
    yes?: Array<[number, number]>; // [price_cents, size]
    no?: Array<[number, number]>;
    side?: 'yes' | 'no';
    price?: number;
    delta?: number;
    ts?: number;
  };
}

interface KalshiTradeMessage {
  type: 'trade';
  msg: {
    market_ticker: string;
    price: number;
    count: number;
    taker_side: 'yes' | 'no';
    ts?: number;
  };
}

type ProviderType = 'polymarket' | 'kalshi';

/**
 * Normalize Polymarket CLOB message
 */
function normalizePolymarketMessage(message: unknown): StreamEvent | null {
  if (!message || typeof message !== 'object') return null;

  const msg = message as Record<string, unknown>;
  const eventType = msg.event_type as string;
  const timestamp = msg.timestamp ? new Date(msg.timestamp as string).getTime() : Date.now();

  switch (eventType) {
    case 'price_change':
    case 'last_trade_price': {
      const priceMsg = msg as unknown as PolymarketPriceMessage;
      const price = parseFloat(priceMsg.price || priceMsg.last_trade_price || '0');

      return {
        type: 'price_update',
        channel: `price:pm-${priceMsg.asset_id}`,
        payload: {
          market_id: priceMsg.asset_id,
          price,
          timestamp,
        },
        timestamp,
      };
    }

    case 'book': {
      const bookMsg = msg as unknown as PolymarketOrderbookMessage;

      return {
        type: 'orderbook_snapshot',
        channel: `orderbook:pm-${bookMsg.asset_id}`,
        payload: {
          message: JSON.stringify({
            bids: bookMsg.bids,
            asks: bookMsg.asks,
          }),
        },
        timestamp,
      };
    }

    case 'trade': {
      const tradeMsg = msg as unknown as PolymarketTradeMessage;

      return {
        type: 'trade',
        channel: `trade:pm-${tradeMsg.asset_id}`,
        payload: {
          market_id: tradeMsg.asset_id,
          price: parseFloat(tradeMsg.price),
          size: parseFloat(tradeMsg.size),
          side: tradeMsg.side === 'BUY' ? 'buy' : 'sell',
          timestamp,
        },
        timestamp,
      };
    }

    default:
      return null;
  }
}

/**
 * Normalize Kalshi WebSocket message
 */
function normalizeKalshiMessage(message: unknown): StreamEvent | null {
  if (!message || typeof message !== 'object') return null;

  const msg = message as Record<string, unknown>;
  const msgType = msg.type as string;
  const innerMsg = msg.msg as Record<string, unknown> | undefined;

  if (!innerMsg) return null;

  const timestamp = (innerMsg.ts as number) || Date.now();

  switch (msgType) {
    case 'ticker': {
      const tickerMsg = msg as unknown as KalshiTickerMessage;
      const yesBid = (tickerMsg.msg.yes_bid || 0) / 100;
      const yesAsk = (tickerMsg.msg.yes_ask || 0) / 100;
      const lastPrice = (tickerMsg.msg.last_price || 50) / 100;
      const price = (yesBid + yesAsk) / 2 || lastPrice;

      return {
        type: 'price_update',
        channel: `price:kalshi-${tickerMsg.msg.market_ticker}`,
        payload: {
          market_id: tickerMsg.msg.market_ticker,
          price,
          best_bid: yesBid,
          best_ask: yesAsk,
          timestamp,
        },
        timestamp,
      };
    }

    case 'orderbook_snapshot':
    case 'orderbook_delta': {
      const bookMsg = msg as unknown as KalshiOrderbookMessage;
      const eventType: StreamEventType = msgType === 'orderbook_snapshot'
        ? 'orderbook_snapshot'
        : 'orderbook_delta';

      if (eventType === 'orderbook_delta' && bookMsg.msg.side && bookMsg.msg.price !== undefined) {
        return {
          type: 'orderbook_delta',
          channel: `orderbook:kalshi-${bookMsg.msg.market_ticker}`,
          payload: {
            market_id: bookMsg.msg.market_ticker,
            side: bookMsg.msg.side === 'yes' ? 'bid' : 'ask',
            price: bookMsg.msg.price / 100,
            size: bookMsg.msg.delta || 0,
            timestamp,
          },
          timestamp,
        };
      }

      return {
        type: eventType,
        channel: `orderbook:kalshi-${bookMsg.msg.market_ticker}`,
        payload: {
          message: JSON.stringify({
            yes: bookMsg.msg.yes,
            no: bookMsg.msg.no,
          }),
        },
        timestamp,
      };
    }

    case 'trade': {
      const tradeMsg = msg as unknown as KalshiTradeMessage;

      return {
        type: 'trade',
        channel: `trade:kalshi-${tradeMsg.msg.market_ticker}`,
        payload: {
          market_id: tradeMsg.msg.market_ticker,
          price: tradeMsg.msg.price / 100,
          size: tradeMsg.msg.count,
          side: tradeMsg.msg.taker_side === 'yes' ? 'buy' : 'sell',
          timestamp,
        },
        timestamp,
      };
    }

    default:
      return null;
  }
}

/**
 * Initialize message normalizer
 * Sets up listener on WebSocket manager to normalize and broadcast messages
 */
export function initializeMessageNormalizer(): void {
  const wsManager = getWebSocketManager();
  const sseHandler = getSSEHandler();

  wsManager.on('raw_message', ({ provider, message }: { provider: ProviderType; message: unknown }) => {
    let normalizedEvent: StreamEvent | null = null;

    if (provider === 'polymarket') {
      normalizedEvent = normalizePolymarketMessage(message);
    } else if (provider === 'kalshi') {
      normalizedEvent = normalizeKalshiMessage(message);
    }

    if (normalizedEvent) {
      // Broadcast to all clients subscribed to this channel
      const sent = sseHandler.broadcast(normalizedEvent.channel, normalizedEvent);

      // Also emit for any other listeners
      wsManager.emit('normalized_event', normalizedEvent);

      if (sent > 0) {
        console.debug(`[Normalizer] Broadcasted ${normalizedEvent.type} to ${sent} clients`);
      }
    }
  });

  console.log('[Normalizer] Message normalizer initialized');
}

/**
 * Parse channel to get provider and market info
 */
export function parseChannel(channel: string): { type: string; provider: ProviderType; marketId: string } | null {
  const match = channel.match(/^(price|orderbook|trade):(pm|kalshi)-(.+)$/);
  if (!match) return null;

  return {
    type: match[1],
    provider: match[2] === 'pm' ? 'polymarket' : 'kalshi',
    marketId: match[3],
  };
}

/**
 * Build channel string
 */
export function buildChannel(type: 'price' | 'orderbook' | 'trade', provider: ProviderType, marketId: string): string {
  const prefix = provider === 'polymarket' ? 'pm' : 'kalshi';
  return `${type}:${prefix}-${marketId}`;
}
