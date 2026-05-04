import {
  normalizeSystemStatsResponse,
  normalizeUsersResolveResponse,
  normalizeUsersResponse,
  type NormalizedSystemStats,
  type NormalizedUsersResolveResponse,
  type NormalizedUsersResponse,
} from '../client/index.js';
import type { RemnawaveNormalizerId } from './operation-contract.js';

export type OperationResponseMapper = (value: unknown) => unknown;

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
    case 'users.create_user':
      return (value) => ({ created: unwrapUpstreamResponse(value) });
    case 'users.get_by_uuid':
      return (value) => ({ user: toUsersResolveResponse(value) });
    default:
      throw new Error(`No response mapper is registered for ${operationKey} with user normalizer.`);
  }
}

function createExplicitPassThroughMapper(operationKey: string): OperationResponseMapper {
  switch (operationKey) {
    case 'users.disable':
    case 'users.enable':
    case 'nodes.restart':
    case 'hosts.bulk_set_port':
      return (value) => ({ updated: unwrapUpstreamResponse(value) });
    default:
      throw new Error(`No explicit pass-through response mapper is registered for ${operationKey}.`);
  }
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

function isNormalizedUsersResponse(value: unknown): value is NormalizedUsersResponse {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.items);
}

function isNormalizedUsersResolveResponse(value: unknown): value is NormalizedUsersResolveResponse {
  return isRecord(value) && typeof value.found === 'boolean' && Object.hasOwn(value, 'match');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
