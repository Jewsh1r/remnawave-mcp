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

export function registerProfileOperations(registry: OperationRegistry, context: RuntimeOperationFactoryContext): void {
  registry.register('profiles', 'list', context.supportedReadOperation('profiles', 'list', 'List config profiles.', 'Send payload {} to list config profiles.', 'OpenAPI-backed config profile list.', 'profiles_list', 'getProfiles', async (client) => ({ result: await call(client, context, 'getProfiles', 'profiles.list')() })));
  registry.register('profiles', 'get', context.supportedReadOperation('profiles', 'get', 'Read one config profile.', 'Send payload with uuid.', 'OpenAPI-backed config profile read.', 'profiles_get', 'getProfile', async (client, payload) => ({ result: await call(client, context, 'getProfile', 'profiles.get')(text(payload, 'uuid')) })));
  registry.register('profiles', 'get_computed', context.supportedReadOperation('profiles', 'get_computed', 'Read one computed config profile.', 'Send payload with uuid.', 'OpenAPI-backed computed config profile read.', 'profiles_get_computed', 'getComputedProfile', async (client, payload) => ({ result: await call(client, context, 'getComputedProfile', 'profiles.get_computed')(text(payload, 'uuid')) })));
  registry.register('profiles', 'list_inbounds', context.supportedReadOperation('profiles', 'list_inbounds', 'List inbounds for one config profile.', 'Send payload with uuid.', 'OpenAPI-backed profile inbounds read.', 'profiles_list_inbounds', 'listProfileInbounds', async (client, payload) => ({ result: await call(client, context, 'listProfileInbounds', 'profiles.list_inbounds')(text(payload, 'uuid')) })));
}
