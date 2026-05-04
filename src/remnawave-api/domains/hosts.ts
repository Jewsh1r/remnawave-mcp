import type { OperationRegistry, RuntimeOperationFactoryContext } from '../registry.js';

export function registerHostOperations(
  registry: OperationRegistry,
  context: RuntimeOperationFactoryContext,
): void {
  registry.register('hosts', 'bulk_set_port', context.supportedWriteOperation(
    'hosts',
    'bulk_set_port',
    'Set host ports for a bounded host set.',
    'Send payload with hostUuids and port to set ports through the OpenAPI bulk endpoint.',
    'Atomic OpenAPI-backed host bulk set-port action.',
    { hostUuids: ['host-uuid'], port: 443 },
    'hosts_bulk_set_port',
    'bulkSetHostPort',
    context.validateHostsBulkSetPortPayload,
    async (client, payload) => ({
      result: await context.requireClientMethod(client, 'bulkSetHostPort', 'hosts.bulk_set_port')(
        context.readRequiredStringArrayField(payload, 'hostUuids', 'hosts.bulk_set_port'),
        context.readRequiredIntegerField(payload, 'port', 'hosts.bulk_set_port'),
      ),
    }),
  ));
}
