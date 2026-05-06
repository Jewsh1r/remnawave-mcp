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

export function registerTemplateOperations(registry: OperationRegistry, context: RuntimeOperationFactoryContext): void {
  registry.register('templates', 'list', context.supportedReadOperation('templates', 'list', 'List subscription templates.', 'Send payload {} to list templates.', 'OpenAPI-backed template list.', 'templates_list', 'getSubscriptionTemplates', async (client) => ({ result: await call(client, context, 'getSubscriptionTemplates', 'templates.list')() })));
  registry.register('templates', 'get', context.supportedReadOperation('templates', 'get', 'Read one subscription template.', 'Send payload with uuid to read a template.', 'OpenAPI-backed template read.', 'templates_get', 'getSubscriptionTemplateByUuid', async (client, payload) => ({ result: await call(client, context, 'getSubscriptionTemplateByUuid', 'templates.get')(text(payload, 'uuid')) })));
  registry.register('templates', 'create', context.supportedWriteOperation('templates', 'create', 'Create one subscription template.', 'Send payload with name and templateType.', 'OpenAPI-backed template creation.', { name: 'Default XRAY', templateType: 'XRAY_JSON' }, 'templates_create', 'createSubscriptionTemplate', validate('templates', 'create'), async (client, payload) => ({ result: await call(client, context, 'createSubscriptionTemplate', 'templates.create')(payload) })));
  registry.register('templates', 'update', context.supportedWriteOperation('templates', 'update', 'Update one subscription template.', 'Send payload with uuid and update fields.', 'OpenAPI-backed template update.', { uuid: 'template-uuid', name: 'Updated XRAY' }, 'templates_update', 'updateSubscriptionTemplate', validate('templates', 'update'), async (client, payload) => ({ result: await call(client, context, 'updateSubscriptionTemplate', 'templates.update')(text(payload, 'uuid'), record(payload, ['uuid'])) })));
  registry.register('templates', 'delete', context.supportedWriteOperation('templates', 'delete', 'Delete one subscription template.', 'Send payload with uuid and confirm the returned token.', 'OpenAPI-backed template deletion.', { uuid: 'template-uuid' }, 'templates_delete', 'deleteSubscriptionTemplate', validate('templates', 'delete'), async (client, payload) => ({ result: await call(client, context, 'deleteSubscriptionTemplate', 'templates.delete')(text(payload, 'uuid')) })));
}
