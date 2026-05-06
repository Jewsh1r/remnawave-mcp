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
  for (const target of ['node', 'user'] as const) {
    const getMethod = target === 'node' ? 'getNodeMetadata' : 'getUserMetadata';
    const upsertMethod = target === 'node' ? 'upsertNodeMetadata' : 'upsertUserMetadata';
    registry.register('metadata', `get_${target}`, context.supportedReadOperation('metadata', `get_${target}`, `Read one ${target} metadata document.`, `Send payload with uuid to read ${target} metadata.`, 'OpenAPI-backed metadata read.', `metadata_get_${target}`, getMethod, async (client, payload) => ({ result: await call(client, context, getMethod, `metadata.get_${target}`)(text(payload, 'uuid')) })));
    registry.register('metadata', `upsert_${target}`, context.supportedWriteOperation('metadata', `upsert_${target}`, `Upsert one ${target} metadata document.`, `Send payload with uuid and metadata to upsert ${target} metadata.`, 'OpenAPI-backed metadata upsert with free-form object caps.', { uuid: `${target}-uuid`, metadata: { key: 'value' } }, `metadata_upsert_${target}`, upsertMethod, validate('metadata', `upsert_${target}`), async (client, payload) => ({ result: await call(client, context, upsertMethod, `metadata.upsert_${target}`)(text(payload, 'uuid'), record(payload, ['uuid'])) })));
  }
}
