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

describe('MCP single-tool compact boundary', () => {
  test('discovery exposes compact operation lists without envelope guidance', async () => {
    const result = await routeRemnawaveApiRequest({ domain: 'users' }, createClient());
    const hostsResult = await routeRemnawaveApiRequest({ domain: 'hosts' }, createClient());

    expect(result).toMatchObject({
      domain: 'users',
      operations: expect.arrayContaining([
        expect.objectContaining({ name: 'create_user', write: true, riskTier: 'tier_2_bounded_mutation' }),
      ]),
    });
    expect(JSON.stringify(result)).not.toContain('manage_lifecycle');
    expect(JSON.stringify(hostsResult)).not.toContain('manage_routing');
    expectCompact(result);
    expectCompact(hostsResult);
  });

  test('execution returns the direct operation payload through the boundary', async () => {
    const result = await routeRemnawaveApiRequest(
      { domain: 'system', operation: 'get_stats', payload: {} },
      createClient(),
    );

    expect(result).toMatchObject({ stats: { users: { total: 8 } } });
    expectCompact(result);
  });

  test('validation failures are canonical compact errors', async () => {
    const result = await routeRemnawaveApiRequest({ payload: {} }, createClient());

    expect(result).toMatchObject({
      error: {
        code: 'DOMAIN_REQUIRED',
        kind: 'validation',
        retryable: false,
        issues: [expect.objectContaining({ field: 'domain' })],
      },
    });
    expectCompact(result);
  });

  test('excluded surfaces return compact unsupported errors', async () => {
    const authResult = await routeRemnawaveApiRequest({ domain: 'auth', operation: 'login', payload: {} }, createClient());
    const keygenResult = await routeRemnawaveApiRequest({ domain: 'keygen', operation: 'generate', payload: {} }, createClient());
    const legacyResult = await routeRemnawaveApiRequest({ domain: 'users', operation: 'manage_lifecycle', payload: {} }, createClient());
    const nodePluginExecutorResult = await routeRemnawaveApiRequest({ domain: 'node_plugins', operation: 'execute_plugin_executor', payload: {} }, createClient());
    const hostRoutingResult = await routeRemnawaveApiRequest({ domain: 'hosts', operation: 'manage_routing', payload: {} }, createClient());

    expect(authResult).toMatchObject({ error: { code: 'UNSUPPORTED_DOMAIN', kind: 'unsupported_operation' } });
    expect(keygenResult).toMatchObject({ error: { code: 'UNSUPPORTED_DOMAIN', kind: 'unsupported_operation' } });
    expect(legacyResult).toMatchObject({ error: { code: 'UNSUPPORTED_OPERATION', kind: 'unsupported_operation' } });
    expect(nodePluginExecutorResult).toMatchObject({ error: { code: 'UNSUPPORTED_DOMAIN', kind: 'unsupported_operation' } });
    expect(hostRoutingResult).toMatchObject({ error: { code: 'UNSUPPORTED_OPERATION', kind: 'unsupported_operation' } });
    expectCompact(authResult);
    expectCompact(keygenResult);
    expectCompact(legacyResult);
    expectCompact(nodePluginExecutorResult);
    expectCompact(hostRoutingResult);
  });
});
