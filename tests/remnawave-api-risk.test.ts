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

describe('remnawave_api compact risk behavior', () => {
  test('tier1 reads execute directly and return normalized payloads', async () => {
    const result = await routeRemnawaveApiRequest(
      { domain: 'system', operation: 'get_stats', payload: {} },
      createClient(),
    );

    expect(result).toMatchObject({ stats: { cpu: { cores: 4 } } });
    expectCompact(result);
  });

  test('tier2 bounded mutations execute directly and return normalized payloads', async () => {
    const createUser = vi.fn(async (payload: Record<string, unknown>) => ({ uuid: 'user-1', ...payload }));
    const result = await routeRemnawaveApiRequest(
      {
        domain: 'users',
        operation: 'create_user',
        payload: { username: 'new-user', telegramId: 123456, expireAt: '2026-05-01T00:00:00.000Z' },
      },
      createClient({ createUser }),
    );

    expect(result).toMatchObject({ created: { uuid: 'user-1', username: 'new-user' } });
    expect(createUser).toHaveBeenCalledTimes(1);
    expectCompact(result);
  });

  test('tier3 mutations return compact confirmation errors before execution', async () => {
    const deleteNode = vi.fn(async (nodeUuid: string) => ({ uuid: nodeUuid, deleted: true }));
    const result = await routeRemnawaveApiRequest(
      { domain: 'nodes', operation: 'manage_lifecycle', payload: { action: 'delete', nodeUuid: 'node-1' } },
      createClient({ deleteNode }),
    );

    expect(result).toMatchObject({
      error: {
        code: 'CONFIRMATION_REQUIRED',
        kind: 'confirmation_required',
        message: 'Confirmation token required before executing nodes.manage_lifecycle.',
        retryable: false,
        token: expect.stringMatching(/^sha256:/),
      },
    });
    expect(deleteNode).not.toHaveBeenCalled();
    expectCompact(result);
  });
});
