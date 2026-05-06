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

export function registerSnippetOperations(registry: OperationRegistry, context: RuntimeOperationFactoryContext): void {
  registry.register('snippets', 'list', context.supportedReadOperation('snippets', 'list', 'List snippets.', 'Send payload {} to list snippets.', 'OpenAPI-backed snippet list.', 'snippets_list', 'listSnippets', async (client) => ({ result: await call(client, context, 'listSnippets', 'snippets.list')() })));
  registry.register('snippets', 'create', context.supportedWriteOperation('snippets', 'create', 'Create one snippet.', 'Send payload with name and snippet array.', 'OpenAPI-backed snippet creation.', { name: 'headers', snippet: [{ key: 'value' }] }, 'snippets_create', 'createSnippet', validate('snippets', 'create'), async (client, payload) => ({ result: await call(client, context, 'createSnippet', 'snippets.create')(payload) })));
  registry.register('snippets', 'update', context.supportedWriteOperation('snippets', 'update', 'Update one snippet.', 'Send payload with name and snippet array.', 'OpenAPI-backed snippet update.', { name: 'headers', snippet: [{ key: 'updated' }] }, 'snippets_update', 'updateSnippet', validate('snippets', 'update'), async (client, payload) => ({ result: await call(client, context, 'updateSnippet', 'snippets.update')(text(payload, 'name'), record(payload, ['name'])) })));
  registry.register('snippets', 'delete', context.supportedWriteOperation('snippets', 'delete', 'Delete one snippet.', 'Send payload with name and confirm the returned token.', 'OpenAPI-backed snippet deletion.', { name: 'headers' }, 'snippets_delete', 'deleteSnippet', validate('snippets', 'delete'), async (client, payload) => ({ result: await call(client, context, 'deleteSnippet', 'snippets.delete')(text(payload, 'name')) })));
}
