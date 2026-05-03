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

describe('remnawave_api compact response contract', () => {
  test('createRemnawaveApiErrorResponse emits only the canonical error object', () => {
    const result = createRemnawaveApiErrorResponse({
      code: 'DOMAIN_REQUIRED',
      kind: 'validation',
      message: 'domain is required.',
      retryable: false,
      issues: [{ field: 'domain', code: 'DOMAIN_REQUIRED', message: 'domain must be a non-empty string.' }],
    });

    expect(result).toEqual({
      error: {
        code: 'DOMAIN_REQUIRED',
        kind: 'validation',
        message: 'domain is required.',
        retryable: false,
        issues: [{ field: 'domain', code: 'DOMAIN_REQUIRED', message: 'domain must be a non-empty string.' }],
      },
    });
    expectNoLegacyFields(result);
  });

  test('executeRemnawaveApiTool returns direct execution results', async () => {
    const stats = await createClient().getSystemStats!();
    const result = await executeRemnawaveApiTool(
      { domain: 'system', operation: 'get_stats', payload: {} },
      createClient(),
    );

    expect(result).toEqual({ stats });
    expectNoLegacyFields(result);
  });

  test('executeRemnawaveApiTool returns compact discovery and describe contract objects', async () => {
    const discovery = await executeRemnawaveApiTool({ domain: 'system' }, createClient());
    const description = await executeRemnawaveApiTool({ domain: 'system', operation: 'get_stats' }, createClient());

    expect(discovery).toMatchObject({
      domain: 'system',
      operations: expect.arrayContaining([expect.objectContaining({ name: 'get_stats' })]),
    });
    expect(description).toMatchObject({
      domain: 'system',
      operation: expect.objectContaining({ name: 'get_stats' }),
      risk: { tier: 'tier1' },
    });
    expectNoLegacyFields(discovery);
    expectNoLegacyFields(description);
  });

  test('executeRemnawaveApiTool returns compact validation errors', async () => {
    const result = await executeRemnawaveApiTool({ payload: {} }, createClient());

    expect(result).toMatchObject({
      error: {
        code: 'DOMAIN_REQUIRED',
        kind: 'validation',
        message: 'domain is required.',
        retryable: false,
        issues: [expect.objectContaining({ field: 'domain', code: 'DOMAIN_REQUIRED' })],
      },
    });
    expectNoLegacyFields(result);
  });
});
