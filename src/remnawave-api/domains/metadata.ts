import { getSupportedOperationSchema } from '../schema.js';
import type { OperationRegistry, RemnawaveApiClient, RuntimeOperationFactoryContext } from '../registry.js';

function validate(domain: string, operation: string) {
  return (payload: unknown) => getSupportedOperationSchema(domain, operation).validatePayload(payload);
}
function record(payload: Record<string, unknown>, omitted: readonly string[] = []): Record<string, unknown> {
  const next = { ...payload };
  for (const key of omitted) delete next[key];
  return next;
}
function text(payload: Record<string, unknown>, key: string): string {
  return String(payload[key] ?? '');
}
function call(client: RemnawaveApiClient, context: RuntimeOperationFactoryContext, method: keyof RemnawaveApiClient, op: string) {
  return context.requireClientMethod(client, method, op) as (...args: readonly unknown[]) => Promise<unknown>;
}

export function registerMetadataOperations(registry: OperationRegistry, context: RuntimeOperationFactoryContext): void {
  registry.register('metadata', 'get_node', context.supportedReadOperation('metadata', 'get_node', 'Read one node metadata document.', 'Send payload with uuid to read node metadata.', 'OpenAPI-backed metadata read.', 'metadata_get_node', 'getNodeMetadata', async (client, payload) => ({ result: await call(client, context, 'getNodeMetadata', 'metadata.get_node')(text(payload, 'uuid')) })));
  registry.register('metadata', 'upsert_node', context.supportedWriteOperation('metadata', 'upsert_node', 'Upsert one node metadata document.', 'Send payload with uuid and metadata to upsert node metadata.', 'OpenAPI-backed metadata upsert with free-form object caps.', { uuid: 'node-uuid', metadata: { key: 'value' } }, 'metadata_upsert_node', 'upsertNodeMetadata', validate('metadata', 'upsert_node'), async (client, payload) => ({ result: await call(client, context, 'upsertNodeMetadata', 'metadata.upsert_node')(text(payload, 'uuid'), record(payload, ['uuid'])) })));
}
