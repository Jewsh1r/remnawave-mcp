import type { Logger } from './logger.js';

export function installProcessGuards(logger: Logger): void {
  process.on('uncaughtException', (error) => {
    logger.error('uncaughtException', serializeError(error));
    process.exitCode = 1;
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', serializeError(reason));
    process.exitCode = 1;
  });

  process.on('SIGTERM', () => {
    logger.info('shutdown', { signal: 'SIGTERM' });
    process.exit(0);
  });
}

function serializeError(error: unknown): { name?: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}
