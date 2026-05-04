import type { OperationRegistry, RuntimeOperationFactoryContext } from '../registry.js';

export function registerSystemOperations(
  registry: OperationRegistry,
  context: RuntimeOperationFactoryContext,
): void {
  registry.register('system', 'get_stats', context.supportedReadOperation(
    'system',
    'get_stats',
    'Return normalized panel statistics.',
    'Send payload {} to read current system stats.',
    'Generated OpenAPI-backed system statistics read.',
    'system_get_stats',
    'getSystemStats',
    async (client) => ({
      result: {
        stats: context.toLooseSystemStats(await client.getSystemStats()),
      },
    }),
  ));
}
