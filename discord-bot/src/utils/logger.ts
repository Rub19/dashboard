export const logger = {
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
  },
};
