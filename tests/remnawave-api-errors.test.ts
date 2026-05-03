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

describe('Remnawave API compact errors', () => {
  test('malformed requests return canonical validation errors', async () => {
    const result = await routeRemnawaveApiRequest(null as never, createClient());

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

  test('upstream API failures use compact upstream errors', async () => {
    const createUser = vi.fn(async () => {
      throw new RemnawaveApiError(502, 'POST /api/users failed: Remote validation failed', { trace: 'internal' });
    });

    const result = await routeRemnawaveApiRequest(
      {
        domain: 'users',
        operation: 'create_user',
        payload: { username: 'new-user', telegramId: 123456, expireAt: '2026-05-01T00:00:00.000Z' },
      },
      createClient({ createUser }),
    );

    expect(result).toEqual({
      error: {
        code: 'UPSTREAM_ERROR',
        kind: 'upstream',
        message: 'Remnawave API request failed.',
        retryable: true,
        statusCode: 502,
      },
    });
    expectNoLegacyFields(result);
  });

  test('runtime execution failures use compact internal errors', async () => {
    const createUser = vi.fn(async () => {
      throw new Error('ENOENT: failed at /Users/local/private.ts');
    });

    const result = await routeRemnawaveApiRequest(
      {
        domain: 'users',
        operation: 'create_user',
        payload: { username: 'new-user', telegramId: 123456, expireAt: '2026-05-01T00:00:00.000Z' },
      },
      createClient({ createUser }),
    );

    expect(result).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        kind: 'internal',
        message: 'The Remnawave MCP could not complete the request.',
        retryable: false,
      },
    });
    expectNoLegacyFields(result);
  });
});
