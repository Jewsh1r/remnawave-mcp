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
    const result = await routeRemnawaveApiRequest({ domain: 'system' }, createClient());

    expect(result).toMatchObject({
      domain: 'system',
      operations: expect.arrayContaining([
        expect.objectContaining({ name: 'get_stats', disposition: 'supported' }),
      ]),
    });
    expectNoLegacyFields(result);
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

  test('invalid payload returns canonical compact validation error with stable issues', async () => {
    const createUser = vi.fn(async (payload: Record<string, unknown>) => ({ uuid: 'user-1', ...payload }));
    const result = await routeRemnawaveApiRequest(
      { domain: 'users', operation: 'create_user', payload: { username: '' } },
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
          expect.objectContaining({ field: 'payload.telegramId' }),
          expect.objectContaining({ field: 'payload.expireAt' }),
        ]),
      },
    });
    expect(createUser).not.toHaveBeenCalled();
    expectNoLegacyFields(result);
  });

  test('unsupported operations return compact unsupported_operation errors', async () => {
    const result = await routeRemnawaveApiRequest(
      { domain: 'system', operation: 'not_registered_anywhere', payload: {} },
      createClient(),
    );

    expect(result).toMatchObject({
      error: {
        code: 'UNSUPPORTED_OPERATION',
        kind: 'unsupported_operation',
        message: 'Unsupported operation for system: not_registered_anywhere.',
        retryable: false,
      },
    });
    expectNoLegacyFields(result);
  });
});
