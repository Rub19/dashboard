type ErrorListener = (message: string, args: unknown[]) => void;
let errorListener: ErrorListener | null = null;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
let currentLogLevel: LogLevel = 'info';

export const logger = {
  /** Permet au centre d'incidents de recevoir chaque erreur journalisée (sans dépendance circulaire). */
  setErrorListener: (fn: ErrorListener | null) => {
    errorListener = fn;
  },
  setLevel: (level: LogLevel) => {
    currentLogLevel = level;
  },
  getLevel: (): LogLevel => currentLogLevel,
  debug: (message: string, ...args: unknown[]) => {
    if (LEVEL_WEIGHTS[currentLogLevel] <= LEVEL_WEIGHTS.debug) {
      console.log(`\x1b[90m[${new Date().toISOString()}] [DEBUG]\x1b[0m ${message}`, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (LEVEL_WEIGHTS[currentLogLevel] <= LEVEL_WEIGHTS.info) {
      console.log(`\x1b[36m[${new Date().toISOString()}] [INFO]\x1b[0m ${message}`, ...args);
    }
  },
  success: (message: string, ...args: unknown[]) => {
    if (LEVEL_WEIGHTS[currentLogLevel] <= LEVEL_WEIGHTS.info) {
      console.log(`\x1b[32m[${new Date().toISOString()}] [SUCCESS]\x1b[0m ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (LEVEL_WEIGHTS[currentLogLevel] <= LEVEL_WEIGHTS.warn) {
      console.warn(`\x1b[33m[${new Date().toISOString()}] [WARN]\x1b[0m ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (LEVEL_WEIGHTS[currentLogLevel] <= LEVEL_WEIGHTS.error) {
      console.error(`\x1b[31m[${new Date().toISOString()}] [ERROR]\x1b[0m ${message}`, ...args);
    }
    try {
      errorListener?.(message, args);
    } catch {
      // le suivi des incidents ne doit jamais faire échouer un log
    }
  },
};
