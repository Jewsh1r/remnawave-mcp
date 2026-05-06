import {
  normalizeSystemStatsResponse,
  normalizeUsersResolveResponse,
  normalizeUsersResponse,
  type NormalizedSystemStats,
  type NormalizedUsersResolveResponse,
  type NormalizedUsersResponse,
} from '../client/index.js';
import { redactSecrets } from '../runtime/errors.js';
import type { RemnawaveNormalizerId } from './operation-contract.js';

export type OperationResponseMapper = (value: unknown) => unknown;

const PUBLIC_SUBSCRIPTION_STRING_CAP = 4_096;

export function createOperationResponseMapper(input: {
  readonly domain: string;
  readonly operation: string;
  readonly normalizer: RemnawaveNormalizerId;
}): OperationResponseMapper {
  const operationKey = `${input.domain}.${input.operation}`;

  switch (input.normalizer) {
    case 'system_stats':
      return requireOperationMapper(operationKey, 'system.get_stats', (value) => ({
        stats: toLooseSystemStats(value),
      }));
    case 'users_list':
      return requireOperationMapper(operationKey, 'users.list', toUsersListResult);
    case 'user':
      return createUserNormalizerMapper(operationKey);
    case 'none':
      return createExplicitPassThroughMapper(operationKey);
  }
}

function createUserNormalizerMapper(operationKey: string): OperationResponseMapper {
  switch (operationKey) {
    case 'users.create':
      return (value) => ({ created: unwrapUpstreamResponse(value) });
    case 'users.get':
      return (value) => ({ user: toUsersResolveResponse(value) });
    default:
      return (value) => ({ user: unwrapUpstreamResponse(value) });
  }
}

function createExplicitPassThroughMapper(operationKey: string): OperationResponseMapper {
  switch (operationKey) {
    case 'system.get_metadata':
    case 'system.get_health':
    case 'system.get_bandwidth_stats':
    case 'system.get_node_statistics':
    case 'system.get_nodes_metrics':
    case 'system.get_recap':
      return unwrapUpstreamResponse;
    case 'metadata.get_node':
    case 'metadata.get_user':
    case 'templates.list':
    case 'templates.get':
    case 'snippets.list':
      return unwrapUpstreamResponse;
    case 'public_subscriptions.get_info':
    case 'public_subscriptions.get':
    case 'public_subscriptions.get_by_client_type':
      return toPublicSubscriptionCompactResponse;
    case 'subscriptions.list':
    case 'subscriptions.get_by_username':
    case 'subscriptions.get_by_short_uuid':
    case 'subscriptions.get_by_uuid':
    case 'subscriptions.get_raw_by_short_uuid':
    case 'subscriptions.get_subpage_config_by_short_uuid':
    case 'subscriptions.get_connection_keys_by_uuid':
    case 'subscription_request_history.list':
    case 'subscription_request_history.get_stats':
    case 'users.get_subscription_request_history':
    case 'profiles.list':
    case 'profiles.get':
    case 'profiles.get_computed':
    case 'profiles.list_inbounds':
      return unwrapUpstreamResponse;
    case 'users.disable':
    case 'users.enable':
    case 'nodes.restart':
    case 'hosts.bulk_set_port':
    case 'users.revoke_subscription':
    case 'metadata.upsert_node':
    case 'metadata.upsert_user':
    case 'templates.create':
    case 'templates.update':
    case 'templates.delete':
    case 'snippets.create':
    case 'snippets.update':
    case 'snippets.delete':
      return (value) => ({ updated: unwrapUpstreamResponse(value) });
    default:
      return isWriteOperationKey(operationKey)
        ? (value) => ({ updated: unwrapUpstreamResponse(value) })
        : unwrapUpstreamResponse;
  }
}

function isWriteOperationKey(operationKey: string): boolean {
  return /\.(create|update|delete|enable|disable|restart|reset_traffic|revoke_subscription|reorder|clone|bulk_|add_users|remove_users|profile_modification|create_|delete_|update_)/.test(operationKey);
}

function requireOperationMapper(
  operationKey: string,
  expectedOperationKey: string,
  mapper: OperationResponseMapper,
): OperationResponseMapper {
  if (operationKey !== expectedOperationKey) {
    throw new Error(`No response mapper is registered for ${operationKey}; expected ${expectedOperationKey}.`);
  }

  return mapper;
}

function toLooseSystemStats(value: unknown): NormalizedSystemStats | unknown {
  if (
    isRecord(value)
    && isRecord(value.cpu)
    && isRecord(value.memory)
    && isRecord(value.users)
    && isRecord(value.online)
    && isRecord(value.nodes)
  ) {
    return value;
  }

  return normalizeSystemStatsResponse(value);
}

function toUsersListResult(value: unknown): Record<string, unknown> {
  const users = toUsersResponse(value);
  return {
    total: users.total,
    items: users.items,
  };
}

function toUsersResponse(value: unknown): NormalizedUsersResponse {
  if (isNormalizedUsersResponse(value)) {
    return value;
  }

  return normalizeUsersResponse(value);
}

function toUsersResolveResponse(value: unknown): NormalizedUsersResolveResponse {
  if (isNormalizedUsersResolveResponse(value)) {
    return value;
  }

  return normalizeUsersResolveResponse(value);
}

function unwrapUpstreamResponse(value: unknown): unknown {
  if (isRecord(value) && Object.hasOwn(value, 'response')) {
    return value.response;
  }

  return value;
}

function toPublicSubscriptionCompactResponse(value: unknown): unknown {
  return capLargeStrings(redactSecrets(unwrapUpstreamResponse(value)));
}

function capLargeStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.length > PUBLIC_SUBSCRIPTION_STRING_CAP
      ? `${value.slice(0, PUBLIC_SUBSCRIPTION_STRING_CAP)}...[truncated ${value.length - PUBLIC_SUBSCRIPTION_STRING_CAP} chars]`
      : value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => capLargeStrings(entry));
  }

  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, capLargeStrings(entry)]));
  }

  return value;
}

function isNormalizedUsersResponse(value: unknown): value is NormalizedUsersResponse {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.items);
}

function isNormalizedUsersResolveResponse(value: unknown): value is NormalizedUsersResolveResponse {
  return isRecord(value) && typeof value.found === 'boolean' && Object.hasOwn(value, 'match');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
