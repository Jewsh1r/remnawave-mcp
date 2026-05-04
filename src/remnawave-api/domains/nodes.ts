import type { OperationRegistry, RuntimeOperationFactoryContext } from '../registry.js';

export function registerNodeOperations(
  registry: OperationRegistry,
  context: RuntimeOperationFactoryContext,
): void {
  registry.register('nodes', 'restart', context.supportedWriteOperation(
    'nodes',
    'restart',
    'Restart one node.',
    'Send payload with uuid to restart one node.',
    'Atomic OpenAPI-backed node restart action.',
    { uuid: 'node-uuid' },
    'nodes_restart',
    'restartNode',
    context.validateNodesRestartPayload,
    async (client, payload) => ({
      result: await context.requireClientMethod(client, 'restartNode', 'nodes.restart')(
        context.readUuidPayload(payload, 'nodes.restart'),
      ),
    }),
  ));
}
