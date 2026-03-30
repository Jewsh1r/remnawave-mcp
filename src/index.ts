import { loadRuntimeConfig } from './runtime/config.js';
import { RuntimeConfigError, redactSecrets } from './runtime/errors.js';
import { createStderrLogger } from './runtime/logger.js';
import { startServer } from './server.js';

async function main(): Promise<void> {
  try {
    const config = loadRuntimeConfig(process.env);
    await startServer(config);
  } catch (error) {
    const logger = createStderrLogger('error');

    if (error instanceof RuntimeConfigError) {
      logger.error('startup_failed', {
        category: error.category,
        code: error.code,
        message: error.message,
        details: redactSecrets(error.details),
      });
      process.exit(1);
    }

    logger.error('startup_failed', {
      category: 'internal',
      code: 'STARTUP_INTERNAL_ERROR',
      message: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

void main();
