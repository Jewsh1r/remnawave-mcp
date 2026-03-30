import { inspect } from 'node:util';

import { redactSecrets } from './errors.js';

export interface Logger {
  debug(message: string, details?: unknown): void;
  info(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createStderrLogger(level: LogLevel): Logger {
  return {
    debug: (message, details) => writeLog('debug', level, message, details),
    info: (message, details) => writeLog('info', level, message, details),
    warn: (message, details) => writeLog('warn', level, message, details),
    error: (message, details) => writeLog('error', level, message, details),
  };
}

function writeLog(level: LogLevel, threshold: LogLevel, message: string, details?: unknown): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[threshold]) {
    return;
  }

  const payload = {
    level,
    message,
    details: redactSecrets(details),
    timestamp: new Date().toISOString(),
  };

  process.stderr.write(`${inspect(payload, { breakLength: Infinity, compact: true, depth: 8 })}\n`);
}
