import { describe, expect, test, vi } from 'vitest';

import { RemnawaveApiError } from '../src/client/index.js';
import { executeRemnawaveApiTool, createRemnawaveApiErrorResponse } from '../src/remnawave-api/contract.js';
import { routeRemnawaveApiRequest } from '../src/remnawave-api/router.js';
import type { RemnawaveApiClient } from '../src/remnawave-api/registry.js';

function createClient(overrides: Partial<RemnawaveApiClient> = {}): RemnawaveApiClient {
  return {
    getSystemStats: async () => ({
      cpu: { cores: 4 },
      memory: { totalBytes: 10, freeBytes: 4, usedBytes: 6 },
      uptimeSeconds: 120,
      generatedAtUnixMs: 123,
      users: { total: 8, active: 6, disabled: 1, limited: 1, expired: 0 },
      online: { now: 2, lastDay: 4, lastWeek: 6, never: 0 },
      nodes: { totalOnlineUsers: 3, lifetimeBytes: 0n },
    }),
    createUser: async (payload) => ({ uuid: 'user-1', ...payload }),
    ...overrides,
  };
}

function expectNoLegacyFields(value: unknown): void {
  const serialized = JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item));
  expect(serialized).not.toContain('"ok"');
  expect(serialized).not.toContain('"details"');
  expect(serialized).not.toContain('"result"');
  expect(serialized).not.toContain('suggested_next_step');
  expect(serialized).not.toContain('recommended_next_operations');
  expect(serialized).not.toContain('execution_eligibility');
  expect(serialized).not.toContain('coaching');
}

describe('routeRemnawaveApiRequest compact contract', () => {
  test('array top-level requests return compact validation errors', async () => {
    const result = await routeRemnawaveApiRequest([] as never, createClient());

    expect(result).toEqual({
      error: {
        code: 'REQUEST_OBJECT_REQUIRED',
        kind: 'validation',
        message: 'request must be a plain object.',
        retryable: false,
        issues: [
          {
            field: 'request',
            code: 'REQUEST_OBJECT_REQUIRED',
            message: 'request must be a non-null object with domain, optional operation, and optional payload.',
          },
        ],
      },
    });
    expectNoLegacyFields(result);
  });

  test('domain-only discovery returns a compact contract object without an envelope', async () => {
    const systemResult = await routeRemnawaveApiRequest({ domain: 'system' }, createClient());
    const usersResult = await routeRemnawaveApiRequest({ domain: 'users' }, createClient());

    expect(systemResult).toMatchObject({
      domain: 'system',
      operations: expect.arrayContaining([
        expect.objectContaining({ name: 'get_stats', disposition: 'supported', write: false }),
      ]),
    });
    expect(usersResult).toMatchObject({
      domain: 'users',
      operations: expect.arrayContaining([
        expect.objectContaining({ name: 'create_user', disposition: 'supported', write: true, riskTier: 'tier_2_bounded_mutation' }),
      ]),
    });
    expect(JSON.stringify(systemResult)).not.toContain('riskTier');
    expect(JSON.stringify(usersResult)).not.toContain('manage_lifecycle');
    expectNoLegacyFields(systemResult);
    expectNoLegacyFields(usersResult);
  });

  test('describe returns compact operation metadata without an envelope', async () => {
    const getSystemStats = vi.fn(createClient().getSystemStats);
    const result = await routeRemnawaveApiRequest(
      { domain: 'system', operation: 'get_stats' },
      createClient({ getSystemStats }),
    );

    expect(result).toMatchObject({
      domain: 'system',
      operation: expect.objectContaining({
        name: 'get_stats',
        disposition: 'supported',
        schemaSummary: 'payload must be an empty object',
        payloadExample: {},
      }),
      risk: { tier: 'tier1' },
    });
    expect(getSystemStats).not.toHaveBeenCalled();
    expectNoLegacyFields(result);
  });

  test('successful system.get_stats execution returns the normalized stats object directly', async () => {
    const stats = await createClient().getSystemStats!();
    const result = await routeRemnawaveApiRequest(
      { domain: 'system', operation: 'get_stats', payload: {} },
      createClient(),
    );

    expect(result).toEqual({ stats });
    expectNoLegacyFields(result);
  });

  test('responseMode raw returns upstream output for allowlisted safe system reads', async () => {
    const rawStats = { raw: true, cpu: { cores: 4 } };
    const getSystemStats = vi.fn(async () => rawStats);

    const result = await routeRemnawaveApiRequest(
      { domain: 'system', operation: 'get_stats', payload: {}, responseMode: 'raw' },
      createClient({ getSystemStats }),
    );

    expect(result).toBe(rawStats);
    expect(getSystemStats).toHaveBeenCalledTimes(1);
    expectNoLegacyFields(result);
  });

  test('responseMode raw is rejected for writes before execution', async () => {
    const createUser = vi.fn(async (payload: Record<string, unknown>) => ({ uuid: 'user-1', ...payload }));

    const result = await routeRemnawaveApiRequest(
      {
        domain: 'users',
        operation: 'create_user',
        payload: { username: 'bridge-operator', expireAt: '2026-05-01T00:00:00.000Z' },
        responseMode: 'raw',
      },
      createClient({ createUser }),
    );

    expect(result).toMatchObject({
      error: {
        code: 'RAW_RESPONSE_NOT_ALLOWED',
        kind: 'validation',
        issues: [expect.objectContaining({ field: 'responseMode' })],
      },
    });
    expect(createUser).not.toHaveBeenCalled();
    expectNoLegacyFields(result);
  });

  test('responseMode raw is rejected for user-sensitive reads', async () => {
    const resolveUser = vi.fn(async (uuid: string) => ({ uuid }));

    const result = await routeRemnawaveApiRequest(
      { domain: 'users', operation: 'get_by_uuid', payload: { uuid: 'user-1' }, responseMode: 'raw' },
      createClient({ resolveUser }),
    );

    expect(result).toMatchObject({
      error: {
        code: 'RAW_RESPONSE_NOT_ALLOWED',
        kind: 'validation',
        issues: [expect.objectContaining({ field: 'responseMode' })],
      },
    });
    expect(resolveUser).not.toHaveBeenCalled();
    expectNoLegacyFields(result);
  });

  test('invalid payload returns canonical compact validation error with stable issues', async () => {
    const createUser = vi.fn(async (payload: Record<string, unknown>) => ({ uuid: 'user-1', ...payload }));
    const result = await routeRemnawaveApiRequest(
      { domain: 'users', operation: 'create_user', payload: { username: 'ab' } },
      createClient({ createUser }),
    );

    expect(result).toMatchObject({
      error: {
        code: 'INVALID_PAYLOAD',
        kind: 'validation',
        message: 'Payload is missing or invalid for users.create_user.',
        retryable: false,
        issues: expect.arrayContaining([
          expect.objectContaining({ field: 'payload.username' }),
          expect.objectContaining({ field: 'payload.expireAt' }),
        ]),
      },
    });
    expect(createUser).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('minLength');
    expect(JSON.stringify(result)).not.toContain('schemaPath');
    expect(JSON.stringify(result)).not.toContain('"username":"ab"');
    expectNoLegacyFields(result);
  });

  test('unsupported operations return compact unsupported_operation errors', async () => {
    const unknownResult = await routeRemnawaveApiRequest(
      { domain: 'system', operation: 'not_registered_anywhere', payload: {} },
      createClient(),
    );
    const groupedHostResult = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'manage_routing', payload: { action: 'set_port' } },
      createClient(),
    );

    expect(unknownResult).toMatchObject({
      error: {
        code: 'UNSUPPORTED_OPERATION',
        kind: 'unsupported_operation',
        message: 'Unsupported operation for system: not_registered_anywhere.',
        retryable: false,
      },
    });
    expect(groupedHostResult).toMatchObject({
      error: {
        code: 'UNSUPPORTED_OPERATION',
        kind: 'unsupported_operation',
        message: 'Unsupported operation for hosts: manage_routing.',
        retryable: false,
      },
    });
    expectNoLegacyFields(unknownResult);
    expectNoLegacyFields(groupedHostResult);
  });

  test('normalizes supported operation responses through explicit mapper policies', async () => {
    const usersList = await routeRemnawaveApiRequest(
      { domain: 'users', operation: 'list', payload: {} },
      createClient({ getUsers: async () => ({ total: 1, items: [{ uuid: 'user-1', username: 'alice' }] }) }),
    );
    const createdUser = await routeRemnawaveApiRequest(
      {
        domain: 'users',
        operation: 'create_user',
        payload: { username: 'bridge-operator', expireAt: '2026-05-01T00:00:00.000Z' },
      },
      createClient({ createUser: async (payload) => ({ response: { uuid: 'user-2', ...payload }, upstreamTrace: 'ignored' }) }),
    );
    const resolvedUser = await routeRemnawaveApiRequest(
      { domain: 'users', operation: 'get_by_uuid', payload: { uuid: 'user-1' } },
      createClient({ resolveUser: async () => ({ response: { uuid: 'user-1', shortUuid: 'short-1', username: 'alice', extra: true } }) }),
    );

    expect(usersList).toEqual({ total: 1, items: [{ uuid: 'user-1', username: 'alice' }] });
    expect(createdUser).toEqual({
      created: { uuid: 'user-2', username: 'bridge-operator', expireAt: '2026-05-01T00:00:00.000Z' },
    });
    expect(resolvedUser).toEqual({
      user: { found: true, match: { uuid: 'user-1', shortUuid: 'short-1', username: 'alice' } },
    });
    expectNoLegacyFields(usersList);
    expectNoLegacyFields(createdUser);
    expectNoLegacyFields(resolvedUser);
  });

  test('public subscription reads are not runtime supported or raw-executable in the current inventory', async () => {
    const result = await routeRemnawaveApiRequest(
      { domain: 'public_subscriptions', operation: 'read', payload: { shortUuid: 'short-1' }, responseMode: 'raw' },
      createClient(),
    );

    expect(result).toMatchObject({ error: { kind: 'unsupported_operation' } });
    expectNoLegacyFields(result);
  });

});
