type ErrorListener = (message: string, args: unknown[]) => void;
let errorListener: ErrorListener | null = null;

export const logger = {
  /** Permet au centre d'incidents de recevoir chaque erreur journalisée (sans dépendance circulaire). */
  setErrorListener: (fn: ErrorListener | null) => {
    errorListener = fn;
  },
  info: (message: string, ...args: unknown[]) => {
    console.log(`\x1b[36m[${new Date().toISOString()}] [INFO]\x1b[0m ${message}`, ...args);
  },
  success: (message: string, ...args: unknown[]) => {
    console.log(`\x1b[32m[${new Date().toISOString()}] [SUCCESS]\x1b[0m ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`\x1b[33m[${new Date().toISOString()}] [WARN]\x1b[0m ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`\x1b[31m[${new Date().toISOString()}] [ERROR]\x1b[0m ${message}`, ...args);
    try {
      errorListener?.(message, args);
    } catch {
      // le suivi des incidents ne doit jamais faire échouer un log
    }
  },
};
