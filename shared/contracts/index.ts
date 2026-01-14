/**
 * Leet Terminal Pro - Shared Contracts
 *
 * Zod schemas shared between backend and frontend for type-safe API contracts.
 * Version: 1.0.0
 */

import { z } from 'zod';

// === API VERSIONING ===
export const API_VERSION = 'v1';
export const CONTRACT_VERSION = '1.0.0';

// === FRESHNESS METADATA ===
export const DataFreshnessSchema = z.object({
  fetched_at: z.string().datetime(),
  ttl_seconds: z.number().int().positive(),
  is_stale: z.boolean(),
  source: z.enum(['kalshi', 'polymarket', 'news', 'computed', 'cache']),
  cache_hit: z.boolean(),
  partial: z.boolean().optional(),
  sources_status: z.record(z.enum(['ok', 'error', 'timeout', 'rate_limited'])).optional(),
});
export type DataFreshness = z.infer<typeof DataFreshnessSchema>;

// === MARKET TYPE ===
export const MarketTypeSchema = z.enum(['BINARY', 'CATEGORICAL', 'SCALAR']);
export type MarketType = z.infer<typeof MarketTypeSchema>;

// === OUTCOME TYPE ===
export const OutcomeTypeSchema = z.enum(['YES', 'NO', 'OPTION']);
export type OutcomeType = z.infer<typeof OutcomeTypeSchema>;

// === NORMALIZED OUTCOME ===
export const NormalizedOutcomeSchema = z.object({
  id: z.string(), // Platform-specific outcome/token ID
  label: z.string(), // Display label (e.g., "Kansas City Chiefs", "Yes", "No")
  type: OutcomeTypeSchema,
  probability: z.number().min(0).max(1), // Implied probability from price
  best_bid: z.number().min(0).max(1).optional(),
  best_ask: z.number().min(0).max(1).optional(),
  volume: z.number().min(0).optional(),
  liquidity: z.number().min(0).optional(),
  is_winner: z.boolean().optional(), // If market resolved
});
export type NormalizedOutcome = z.infer<typeof NormalizedOutcomeSchema>;

// === PLATFORM IDS ===
export const PlatformIdsSchema = z.object({
  market_id: z.string(),
  condition_id: z.string().optional(),
  clob_token_ids: z.array(z.string()).optional(),
  event_ticker: z.string().optional(),
});
export type PlatformIds = z.infer<typeof PlatformIdsSchema>;

// === MARKET SUMMARY ===
export const MarketSummarySchema = z.object({
  id: z.string(),
  ticker: z.string(),
  platform: z.enum(['Kalshi', 'Polymarket']),
  question: z.string(),
  description: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),

  // Market type - CRITICAL for correct UI rendering
  market_type: MarketTypeSchema.default('BINARY'),

  // Pricing (0-1 probability scale) - for binary markets or top outcome
  market_prob: z.number().min(0).max(1),
  model_prob: z.number().min(0).max(1),
  prev_prob: z.number().min(0).max(1),

  // Market metrics (aggregate for categorical)
  best_bid: z.number().min(0).max(1),
  best_ask: z.number().min(0).max(1),
  spread: z.number().min(0),
  volume_24h: z.number().min(0),
  volume_total: z.number().min(0),
  liquidity: z.number().min(0),
  open_interest: z.number().min(0),
  trades_24h: z.number().int().min(0),

  // Dates
  end_date: z.string().datetime().nullable(),
  created_at: z.string().datetime(),

  // Platform-specific IDs
  platform_ids: PlatformIdsSchema,

  // NORMALIZED OUTCOMES - proper multi-outcome support
  normalized_outcomes: z.array(NormalizedOutcomeSchema),

  // Legacy fields for backward compatibility (deprecated)
  outcomes: z.array(z.string()).optional(),
  outcome_prices: z.array(z.number()).optional(),
});
export type MarketSummary = z.infer<typeof MarketSummarySchema>;

/**
 * Helper to detect market type from outcomes
 */
export function detectMarketType(outcomes: NormalizedOutcome[]): MarketType {
  if (outcomes.length === 2) {
    const labels = outcomes.map(o => o.label.toLowerCase());
    const isBinary =
      (labels.includes('yes') && labels.includes('no')) ||
      (labels.includes('true') && labels.includes('false'));
    return isBinary ? 'BINARY' : 'CATEGORICAL';
  }
  return outcomes.length > 2 ? 'CATEGORICAL' : 'BINARY';
}

/**
 * Helper to check if market is categorical (multi-outcome)
 */
export function isCategoricalMarket(market: MarketSummary): boolean {
  return market.market_type === 'CATEGORICAL';
}

/**
 * Helper to get top N outcomes sorted by probability
 */
export function getTopOutcomes(market: MarketSummary, n: number = 5): NormalizedOutcome[] {
  return [...market.normalized_outcomes]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, n);
}

// === ORDERBOOK ===
export const OrderbookLevelSchema = z.object({
  price: z.number().min(0).max(1),
  size: z.number().min(0),
  cumulative: z.number().min(0),
});
export type OrderbookLevel = z.infer<typeof OrderbookLevelSchema>;

export const OrderbookSnapshotSchema = z.object({
  market_id: z.string(),
  bids: z.array(OrderbookLevelSchema),
  asks: z.array(OrderbookLevelSchema),
  imbalance: z.number().min(-1).max(1),
  spread: z.number().min(0),
  mid_price: z.number().min(0).max(1),
  freshness: DataFreshnessSchema,
});
export type OrderbookSnapshot = z.infer<typeof OrderbookSnapshotSchema>;

// === PRICE HISTORY ===
export const MarketHistoryPointSchema = z.object({
  timestamp: z.number().int(), // Unix ms
  date: z.string(), // YYYY-MM-DD
  price: z.number().min(0).max(1),
  volume: z.number().min(0),
  high: z.number().min(0).max(1),
  low: z.number().min(0).max(1),
});
export type MarketHistoryPoint = z.infer<typeof MarketHistoryPointSchema>;

export const MarketHistorySchema = z.object({
  market_id: z.string(),
  points: z.array(MarketHistoryPointSchema),
  freshness: DataFreshnessSchema,
});
export type MarketHistory = z.infer<typeof MarketHistorySchema>;

// === NEWS ===
export const NewsSentimentSchema = z.enum(['positive', 'negative', 'neutral', 'mixed']);
export type NewsSentiment = z.infer<typeof NewsSentimentSchema>;

export const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  url: z.string().url(),
  source: z.string(),
  source_domain: z.string().optional(),
  published_at: z.string().datetime(),
  sentiment: NewsSentimentSchema,
  sentiment_score: z.number().min(-1).max(1).optional(),
  relevance_score: z.number().min(0).max(1),
  matched_keywords: z.array(z.string()),
  matched_entities: z.array(z.string()).optional(),
  linked_market_ids: z.array(z.string()),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

export const NewsFeedSchema = z.object({
  items: z.array(NewsItemSchema),
  total_count: z.number().int().min(0),
  freshness: DataFreshnessSchema,
});
export type NewsFeed = z.infer<typeof NewsFeedSchema>;

// === HYPERSTITION SCORE ===
export const HyperstitionBandSchema = z.enum(['cold', 'warm', 'hot', 'viral']);
export type HyperstitionBand = z.infer<typeof HyperstitionBandSchema>;

export const HyperstitionComponentSchema = z.object({
  name: z.string(),
  value: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  description: z.string(),
  trend: z.enum(['rising', 'falling', 'stable']).optional(),
});
export type HyperstitionComponent = z.infer<typeof HyperstitionComponentSchema>;

export const HyperstitionScoreSchema = z.object({
  market_id: z.string(),
  overall: z.number().min(0).max(100),
  band: HyperstitionBandSchema,
  components: z.object({
    news_heat: HyperstitionComponentSchema,
    momentum: HyperstitionComponentSchema,
    liquidity_sensitivity: HyperstitionComponentSchema,
    volatility_reflex: HyperstitionComponentSchema,
    controversy: HyperstitionComponentSchema,
  }),
  top_drivers: z.array(z.string()).max(3),
  driver_explanations: z.array(z.object({
    driver: z.string(),
    explanation: z.string(),
    contribution: z.number(),
  })).optional(),
  linked_news: z.array(z.string()), // NewsItem IDs
  freshness: DataFreshnessSchema,
});
export type HyperstitionScore = z.infer<typeof HyperstitionScoreSchema>;

// === QUANT METRICS ===
export const SimulationAlgorithmSchema = z.enum([
  'bootstrap_historical',
  'student_t_parametric',
  'regime_switching',
]);
export type SimulationAlgorithm = z.infer<typeof SimulationAlgorithmSchema>;

export const MonteCarloConfigSchema = z.object({
  simulations: z.number().int().min(100).max(100000).default(5000),
  trades_per_sim: z.number().int().min(10).max(1000).default(100),
  starting_capital: z.number().positive().default(10000),
  kelly_fraction: z.number().min(0).max(1).default(0.25),
  max_bet_fraction: z.number().min(0).max(1).default(0.05),
  risk_free_rate: z.number().min(0).max(0.2).default(0.05), // Annual
  algorithm: SimulationAlgorithmSchema.default('bootstrap_historical'),
  seed: z.number().int().optional(),
});
export type MonteCarloConfig = z.infer<typeof MonteCarloConfigSchema>;

export const MonteCarloResultSchema = z.object({
  // Distribution statistics
  expected_return: z.number(),
  median_return: z.number(),
  std_deviation: z.number(),

  // Risk metrics (properly computed)
  sharpe_ratio: z.number(),
  sortino_ratio: z.number().optional(),
  var_95: z.number(),
  var_99: z.number(),
  cvar_95: z.number(), // Expected Shortfall
  cvar_99: z.number(),

  // Drawdown
  max_drawdown: z.number(),
  avg_drawdown: z.number(),
  drawdown_duration_avg: z.number().optional(),

  // Probability metrics
  prob_profit: z.number().min(0).max(1),
  prob_ruin: z.number().min(0).max(1),
  prob_loss_10pct: z.number().min(0).max(1),
  prob_loss_25pct: z.number().min(0).max(1),
  prob_double: z.number().min(0).max(1).optional(),

  // Growth metrics
  expected_log_growth: z.number(),
  geometric_mean_return: z.number().optional(),

  // Percentiles
  percentiles: z.object({
    p5: z.number(),
    p10: z.number(),
    p25: z.number(),
    p50: z.number(),
    p75: z.number(),
    p90: z.number(),
    p95: z.number(),
  }),

  // Sample paths for visualization (subset)
  sample_paths: z.array(z.array(z.number())).optional(),
  median_path: z.array(z.number()).optional(),

  // Metadata
  config: MonteCarloConfigSchema,
  computed_at: z.string().datetime(),
  computation_ms: z.number().int().min(0),
});
export type MonteCarloResult = z.infer<typeof MonteCarloResultSchema>;

// === API RESPONSE WRAPPER ===
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  source: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.nullable(),
    freshness: DataFreshnessSchema,
    errors: z.array(ApiErrorSchema).optional(),
    request_id: z.string().optional(),
  });
}

// Pre-defined response schemas
export const MarketsResponseSchema = createApiResponseSchema(z.array(MarketSummarySchema));
export type MarketsResponse = z.infer<typeof MarketsResponseSchema>;

export const MarketResponseSchema = createApiResponseSchema(MarketSummarySchema);
export type MarketResponse = z.infer<typeof MarketResponseSchema>;

export const OrderbookResponseSchema = createApiResponseSchema(OrderbookSnapshotSchema);
export type OrderbookResponse = z.infer<typeof OrderbookResponseSchema>;

export const HistoryResponseSchema = createApiResponseSchema(MarketHistorySchema);
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;

export const NewsResponseSchema = createApiResponseSchema(NewsFeedSchema);
export type NewsResponse = z.infer<typeof NewsResponseSchema>;

export const HyperstitionResponseSchema = createApiResponseSchema(HyperstitionScoreSchema);
export type HyperstitionResponse = z.infer<typeof HyperstitionResponseSchema>;

// === HEALTH & STATUS ===
export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const SourceHealthSchema = z.object({
  status: HealthStatusSchema,
  latency_ms: z.number().int().min(0).optional(),
  last_success: z.string().datetime().optional(),
  last_error: z.string().optional(),
  error_count_1h: z.number().int().min(0).optional(),
});
export type SourceHealth = z.infer<typeof SourceHealthSchema>;

export const HealthResponseSchema = z.object({
  status: HealthStatusSchema,
  timestamp: z.string().datetime(),
  version: z.string().optional(),
  uptime_seconds: z.number().int().min(0).optional(),
  sources: z.record(SourceHealthSchema).optional(),
  cache: z.object({
    markets: z.object({ size: z.number(), hit_rate: z.number() }).optional(),
    orderbooks: z.object({ size: z.number(), hit_rate: z.number() }).optional(),
    news: z.object({ size: z.number(), hit_rate: z.number() }).optional(),
  }).optional(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// === AGENT TYPES ===
export const AgentJobStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'awaiting_approval',
]);
export type AgentJobStatus = z.infer<typeof AgentJobStatusSchema>;

export const AgentJobSchema = z.object({
  id: z.string(),
  type: z.enum(['lint_fix', 'test_fix', 'build_fix', 'health_fix', 'custom']),
  status: AgentJobStatusSchema,
  trigger: z.string(),
  created_at: z.string().datetime(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  diff: z.string().optional(),
  diff_files: z.array(z.string()).optional(),
  diff_size_bytes: z.number().int().min(0).optional(),
  test_results: z.object({
    passed: z.number().int(),
    failed: z.number().int(),
    skipped: z.number().int(),
  }).optional(),
  logs: z.array(z.string()).optional(),
  error: z.string().optional(),
  approved_by: z.string().optional(),
  approved_at: z.string().datetime().optional(),
});
export type AgentJob = z.infer<typeof AgentJobSchema>;

export const AgentAuditLogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  action: z.string(),
  job_id: z.string().optional(),
  user: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type AgentAuditLogEntry = z.infer<typeof AgentAuditLogEntrySchema>;

// === UTILITY FUNCTIONS ===

/**
 * Create freshness metadata for a response
 */
export function createFreshness(
  source: DataFreshness['source'],
  ttlSeconds: number,
  cacheHit: boolean = false,
  partial: boolean = false,
  sourcesStatus?: DataFreshness['sources_status']
): DataFreshness {
  const fetchedAt = new Date().toISOString();
  return {
    fetched_at: fetchedAt,
    ttl_seconds: ttlSeconds,
    is_stale: false,
    source,
    cache_hit: cacheHit,
    partial,
    sources_status: sourcesStatus,
  };
}

/**
 * Check if data is stale based on freshness metadata
 */
export function isDataStale(freshness: DataFreshness): boolean {
  const fetchedAt = new Date(freshness.fetched_at).getTime();
  const now = Date.now();
  const ageSeconds = (now - fetchedAt) / 1000;
  return ageSeconds > freshness.ttl_seconds;
}

/**
 * Get age in seconds from freshness metadata
 */
export function getDataAge(freshness: DataFreshness): number {
  const fetchedAt = new Date(freshness.fetched_at).getTime();
  return Math.floor((Date.now() - fetchedAt) / 1000);
}

/**
 * Determine hyperstition band from score
 */
export function getHyperstitionBand(score: number): HyperstitionBand {
  if (score < 25) return 'cold';
  if (score < 50) return 'warm';
  if (score < 75) return 'hot';
  return 'viral';
}
