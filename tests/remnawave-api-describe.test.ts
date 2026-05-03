import { describe, expect, test, vi } from 'vitest';

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
    deleteNode: async (nodeUuid: string) => ({ uuid: nodeUuid, deleted: true }),
    ...overrides,
  };
}

function expectCompact(value: unknown): void {
  const serialized = JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item));
  expect(serialized).not.toContain('"ok"');
  expect(serialized).not.toContain('"details"');
  expect(serialized).not.toContain('suggested_next_step');
  expect(serialized).not.toContain('recommended_next_operations');
  expect(serialized).not.toContain('execution_eligibility');
  expect(serialized).not.toContain('coaching');
}

describe('remnawave_api compact describe responses', () => {
  test('describes supported operations as compact metadata', async () => {
    const result = await routeRemnawaveApiRequest({ domain: 'system', operation: 'get_stats' }, createClient());

    expect(result).toMatchObject({
      domain: 'system',
      operation: expect.objectContaining({
        name: 'get_stats',
        disposition: 'supported',
        payloadExample: {},
        supportedOperations: expect.arrayContaining(['get_stats']),
      }),
      risk: { tier: 'tier1' },
    });
    expectCompact(result);
  });

  test('denied operations return compact unsupported_operation errors', async () => {
    const result = await routeRemnawaveApiRequest({ domain: 'auth', operation: 'login', payload: {} }, createClient());

    expect(result).toMatchObject({
      error: {
        code: expect.stringMatching(/DENIED_OPERATION|UNSUPPORTED_OPERATION/),
        kind: 'unsupported_operation',
        retryable: false,
      },
    });
    expectCompact(result);
  });
});
