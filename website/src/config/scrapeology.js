/**
 * Scrapeology backend configuration.
 *
 * When VITE_SCRAPEOLOGY_URL is set the frontend routes market and news
 * requests through the Go backend, which eliminates CORS issues and
 * provides cached + enriched data from TimescaleDB.
 *
 * Without it the frontend falls back to direct API calls with CORS proxies.
 */
const SCRAPEOLOGY_URL = (import.meta.env.VITE_SCRAPEOLOGY_URL || '').replace(/\/+$/, '');

export const scrapeology = {
  /** Base URL of the Scrapeology backend (empty string = not configured) */
  url: SCRAPEOLOGY_URL,

  /** True when the backend is configured */
  isConfigured: () => !!SCRAPEOLOGY_URL,

  /** Build a full endpoint URL */
  endpoint: (path) => `${SCRAPEOLOGY_URL}/api/v1${path}`,
};

export default scrapeology;
