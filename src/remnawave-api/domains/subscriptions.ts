import { getSupportedOperationSchema } from '../schema.js';
import type { OperationRegistry, RemnawaveApiClient, RuntimeOperationFactoryContext } from '../registry.js';

type ClientMethod = keyof RemnawaveApiClient;

function call(client: RemnawaveApiClient, context: RuntimeOperationFactoryContext, method: ClientMethod, op: string) {
  return context.requireClientMethod(client, method, op) as (...args: readonly unknown[]) => Promise<unknown>;
}

function text(payload: Record<string, unknown>, key: string): string {
  return String(payload[key] ?? '');
}

function optionalPagination(payload: Record<string, unknown>): { readonly size?: number; readonly start?: number } {
  return {
    size: typeof payload.size === 'number' ? payload.size : undefined,
    start: typeof payload.start === 'number' ? payload.start : undefined,
  };
}

function optionalRawParams(payload: Record<string, unknown>): { readonly withDisabledHosts?: boolean } {
  return {
    withDisabledHosts: typeof payload.withDisabledHosts === 'boolean' ? payload.withDisabledHosts : undefined,
  };
}

function recordWithout(payload: Record<string, unknown>, omitted: readonly string[]): Record<string, unknown> {
  const next = { ...payload };
  for (const key of omitted) delete next[key];
  return next;
}

export function registerSubscriptionOperations(registry: OperationRegistry, context: RuntimeOperationFactoryContext): void {
  registry.register('subscriptions', 'list', context.supportedReadOperation('subscriptions', 'list', 'List protected subscriptions.', 'Send payload {} or optional size/start.', 'OpenAPI-backed protected subscription collection read.', 'subscriptions_list', 'getSubscriptions', async (client, payload) => ({ result: await call(client, context, 'getSubscriptions', 'subscriptions.list')(optionalPagination(payload)) })));
  registry.register('subscriptions', 'get_by_username', context.supportedReadOperation('subscriptions', 'get_by_username', 'Read one protected subscription by username.', 'Send payload with username.', 'OpenAPI-backed protected subscription username lookup.', 'subscriptions_get_by_username', 'getSubscriptionByUsername', async (client, payload) => ({ result: await call(client, context, 'getSubscriptionByUsername', 'subscriptions.get_by_username')(text(payload, 'username')) })));
  registry.register('subscriptions', 'get_by_short_uuid', context.supportedReadOperation('subscriptions', 'get_by_short_uuid', 'Read one protected subscription by short UUID.', 'Send payload with shortUuid.', 'OpenAPI-backed protected subscription short UUID lookup.', 'subscriptions_get_by_short_uuid', 'getSubscriptionByShortUuid', async (client, payload) => ({ result: await call(client, context, 'getSubscriptionByShortUuid', 'subscriptions.get_by_short_uuid')(text(payload, 'shortUuid')) })));
  registry.register('subscriptions', 'get_by_uuid', context.supportedReadOperation('subscriptions', 'get_by_uuid', 'Read one protected subscription by UUID.', 'Send payload with uuid.', 'OpenAPI-backed protected subscription UUID lookup.', 'subscriptions_get_by_uuid', 'getSubscriptionByUuid', async (client, payload) => ({ result: await call(client, context, 'getSubscriptionByUuid', 'subscriptions.get_by_uuid')(text(payload, 'uuid')) })));
  registry.register('subscriptions', 'get_raw_by_short_uuid', context.supportedReadOperation('subscriptions', 'get_raw_by_short_uuid', 'Read protected raw subscription data by short UUID with raw response mode disabled.', 'Send payload with shortUuid and optional withDisabledHosts.', 'OpenAPI-backed protected subscription raw endpoint read; MCP raw response mode remains disabled.', 'subscriptions_get_raw_by_short_uuid', 'getRawSubscriptionByShortUuid', async (client, payload) => ({ result: await call(client, context, 'getRawSubscriptionByShortUuid', 'subscriptions.get_raw_by_short_uuid')(text(payload, 'shortUuid'), optionalRawParams(payload)) })));
  registry.register('subscriptions', 'get_subpage_config_by_short_uuid', context.supportedReadOperation('subscriptions', 'get_subpage_config_by_short_uuid', 'Read protected subscription subpage config by short UUID.', 'Send payload with shortUuid and the OpenAPI request body fields when required by the panel.', 'OpenAPI-backed protected subscription subpage-config read.', 'subscriptions_get_subpage_config_by_short_uuid', 'getSubscriptionSubpageConfigByShortUuid', async (client, payload) => ({ result: await call(client, context, 'getSubscriptionSubpageConfigByShortUuid', 'subscriptions.get_subpage_config_by_short_uuid')(text(payload, 'shortUuid'), recordWithout(payload, ['shortUuid'])) })));
  registry.register('subscriptions', 'get_connection_keys_by_uuid', context.supportedReadOperation('subscriptions', 'get_connection_keys_by_uuid', 'Read protected subscription connection keys by UUID.', 'Send payload with uuid.', 'OpenAPI-backed protected subscription connection-key read.', 'subscriptions_get_connection_keys_by_uuid', 'getSubscriptionConnectionKeysByUuid', async (client, payload) => ({ result: await call(client, context, 'getSubscriptionConnectionKeysByUuid', 'subscriptions.get_connection_keys_by_uuid')(text(payload, 'uuid')) })));

  registry.register('subscription_request_history', 'list', context.supportedReadOperation('subscription_request_history', 'list', 'List subscription request history.', 'Send payload {} or optional size/start.', 'OpenAPI-backed subscription request-history collection read.', 'subscription_request_history_list', 'getSubscriptionRequestHistory', async (client, payload) => ({ result: await call(client, context, 'getSubscriptionRequestHistory', 'subscription_request_history.list')(optionalPagination(payload)) })));
  registry.register('subscription_request_history', 'get_stats', context.supportedReadOperation('subscription_request_history', 'get_stats', 'Read subscription request-history stats.', 'Send payload {}.', 'OpenAPI-backed subscription request-history stats read.', 'subscription_request_history_get_stats', 'getSubscriptionRequestHistoryStats', async (client) => ({ result: await call(client, context, 'getSubscriptionRequestHistoryStats', 'subscription_request_history.get_stats')() })));
}

export function validateUserSubscriptionRequestHistoryPayload(payload: unknown) {
  return getSupportedOperationSchema('users', 'get_subscription_request_history').validatePayload(payload);
}
