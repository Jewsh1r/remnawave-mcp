import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { routeRemnawaveApiRequest } from '../src/remnawave-api/router.js';
import type { RemnawaveApiClient } from '../src/remnawave-api/registry.js';
import { clearTier3ConfirmationTokensForTests } from '../src/remnawave-api/risk.js';

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
    executeOpenApiOperation: async (_operation, payload) => ({ id: 1, ...payload }),
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
  beforeEach(() => {
    clearTier3ConfirmationTokensForTests();
  });

  afterEach(() => {
    clearTier3ConfirmationTokensForTests();
  });

  test('tier1 reads execute directly and return normalized payloads', async () => {
    const result = await routeRemnawaveApiRequest(
      { domain: 'system', operation: 'get_stats', payload: {} },
      createClient(),
    );

    expect(result).toMatchObject({ stats: { cpu: { cores: 4 } } });
    expectCompact(result);
  });

  test('tier2 bounded mutations execute directly and return normalized payloads', async () => {
    const executeOpenApiOperation = vi.fn(async (_operation, payload: Record<string, unknown>) => ({ id: 1, ...payload }));
    const result = await routeRemnawaveApiRequest(
      {
        domain: 'users',
        operation: 'create',
        payload: { username: 'new-user', telegramId: 123456, expireAt: '2026-05-01T00:00:00.000Z' },
      },
      createClient({ executeOpenApiOperation }),
    );

    expect(result).toMatchObject({ created: { id: 1, username: 'new-user' } });
    expect(executeOpenApiOperation).toHaveBeenCalledTimes(1);
    expectCompact(result);
  });

  test('tier3 mutations return compact confirmation errors before execution', async () => {
    const restartNode = vi.fn(async (nodeUuid: string) => ({ uuid: nodeUuid, restarted: true }));
    const result = await routeRemnawaveApiRequest(
      { domain: 'nodes', operation: 'restart', payload: { uuid: 'node-1' } },
      createClient({ restartNode }),
    );

    expect(result).toMatchObject({
      error: {
        code: 'CONFIRMATION_REQUIRED',
        kind: 'confirmation_required',
        message: 'Confirmation token required before executing nodes.restart.',
        retryable: false,
        token: expect.any(String),
      },
    });
    expect(restartNode).not.toHaveBeenCalled();
    expectCompact(result);
  });

  test('confirm safety mode executes only when top-level confirmToken matches', async () => {
    const restartNode = vi.fn(async (nodeUuid: string) => ({ uuid: nodeUuid, restarted: true }));
    const client = createClient({ restartNode });
    const first = await routeRemnawaveApiRequest(
      { domain: 'nodes', operation: 'restart', payload: { uuid: 'node-1' } },
      client,
    );

    const token = (first as { error: { token: string } }).error.token;
    const result = await routeRemnawaveApiRequest(
      { domain: 'nodes', operation: 'restart', payload: { uuid: 'node-1' }, confirmToken: token },
      client,
    );

    expect(result).toEqual({ updated: { uuid: 'node-1', restarted: true } });
    expect(restartNode).toHaveBeenCalledTimes(1);
    expectCompact(result);
  });

  test('confirm tokens are single-use and payload-bound', async () => {
    const restartNode = vi.fn(async (nodeUuid: string) => ({ uuid: nodeUuid, restarted: true }));
    const client = createClient({ restartNode });
    const first = await routeRemnawaveApiRequest(
      { domain: 'nodes', operation: 'restart', payload: { uuid: 'node-1' } },
      client,
    );
    const token = (first as { error: { token: string } }).error.token;

    const wrongPayload = await routeRemnawaveApiRequest(
      { domain: 'nodes', operation: 'restart', payload: { uuid: 'node-2' }, confirmToken: token },
      client,
    );
    const confirmed = await routeRemnawaveApiRequest(
      { domain: 'nodes', operation: 'restart', payload: { uuid: 'node-1' }, confirmToken: token },
      client,
    );
    const replay = await routeRemnawaveApiRequest(
      { domain: 'nodes', operation: 'restart', payload: { uuid: 'node-1' }, confirmToken: token },
      client,
    );

    expect(wrongPayload).toMatchObject({ error: { code: 'CONFIRMATION_REQUIRED', kind: 'confirmation_required', token: expect.any(String) } });
    expect(confirmed).toEqual({ updated: { uuid: 'node-1', restarted: true } });
    expect(replay).toMatchObject({ error: { code: 'CONFIRMATION_REQUIRED', kind: 'confirmation_required', token: expect.any(String) } });
    expect(restartNode).toHaveBeenCalledTimes(1);
  });
});
