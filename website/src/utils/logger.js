/**
 * Production-safe logger.
 * Suppresses all output in production unless VITE_DEBUG is set.
 */
const isDebug = import.meta.env.VITE_DEBUG === 'true';
const isDev = import.meta.env.DEV;
const shouldLog = isDev || isDebug;

const noop = () => {};

export const logger = {
  log: shouldLog ? console.log.bind(console) : noop,
  warn: shouldLog ? console.warn.bind(console) : noop,
  error: shouldLog ? console.error.bind(console) : noop,
  debug: shouldLog ? console.debug.bind(console) : noop,
  info: shouldLog ? console.info.bind(console) : noop,
};

export default logger;
