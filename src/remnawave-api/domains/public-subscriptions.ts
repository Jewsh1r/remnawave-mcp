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

export function registerPublicSubscriptionOperations(registry: OperationRegistry, context: RuntimeOperationFactoryContext): void {
  registry.register('public_subscriptions', 'get_info', context.supportedReadOperation('public_subscriptions', 'get_info', 'Read public subscription info.', 'Send payload with shortUuid.', 'OpenAPI-backed public subscription info read.', 'public_subscriptions_get_info', 'getPublicSubscriptionInfo', async (client, payload) => ({ result: await call(client, context, 'getPublicSubscriptionInfo', 'public_subscriptions.get_info')(text(payload, 'shortUuid')) })));
  registry.register('public_subscriptions', 'get', context.supportedReadOperation('public_subscriptions', 'get', 'Read public subscription response.', 'Send payload with shortUuid.', 'OpenAPI-backed public subscription read.', 'public_subscriptions_get', 'getPublicSubscription', async (client, payload) => ({ result: await call(client, context, 'getPublicSubscription', 'public_subscriptions.get')(text(payload, 'shortUuid')) })));
  registry.register('public_subscriptions', 'get_by_client_type', context.supportedReadOperation('public_subscriptions', 'get_by_client_type', 'Read client-specific public subscription response.', 'Send payload with shortUuid and clientType.', 'OpenAPI-backed public subscription client read.', 'public_subscriptions_get_by_client_type', 'getPublicSubscriptionByClientType', async (client, payload) => ({ result: await call(client, context, 'getPublicSubscriptionByClientType', 'public_subscriptions.get_by_client_type')(text(payload, 'shortUuid'), text(payload, 'clientType')) })));
}
