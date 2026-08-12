import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';

import { routeRemnawaveApiRequest } from '../src/remnawave-api/router.js';
import type { RemnawaveApiClient } from '../src/remnawave-api/registry.js';
import {
  clearPreviewApplyCacheForTests,
  createPreviewApplyEntry,
  getSupportedOperationOpenApiBinding,
  readPreviewApplyEntry,
} from '../src/remnawave-api/preview-apply-cache.js';

const HOST_1 = '11111111-1111-4111-8111-111111111111';
const HOST_2 = '22222222-2222-4222-8222-222222222222';
const MISSING_HOST = '33333333-3333-4333-8333-333333333333';

function createClient(overrides: Partial<RemnawaveApiClient> = {}): RemnawaveApiClient {
  return {
    getSystemStats: async () => ({}),
    getHosts: async () => ({
      total: 2,
      items: [
        { uuid: HOST_1, port: 80, enabled: true, fingerprint: 'fp-1' },
        { uuid: HOST_2, port: 81, enabled: true, fingerprint: 'fp-2' },
      ],
    }),
    executeOpenApiOperation: async (_operation, payload) => ({ updated: true, ...payload }),
    ...overrides,
  };
}

function expectCompact(value: unknown): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain('details');
  expect(serialized).not.toContain('suggested_next_step');
  expect(serialized).not.toContain('recommended_next_operations');
  expect(serialized).not.toContain('execution_eligibility');
}

async function preview(client: RemnawaveApiClient = createClient()): Promise<{ readonly applyToken: string; readonly expiresAt: string }> {
  const result = await routeRemnawaveApiRequest(
    { domain: 'hosts', operation: 'bulk_update', payload: { uuids: [HOST_1], port: 443 } },
    client,
  );

  expect(result).toMatchObject({
    applyToken: expect.any(String),
    expiresAt: expect.any(String),
    target: { type: 'hosts', hostUuids: [HOST_1] },
    changes: [{ target: HOST_1, before: { state: expect.objectContaining({ port: 80 }) }, after: { patch: { port: 443 } } }],
  });
  expectCompact(result);
  return result as { readonly applyToken: string; readonly expiresAt: string };
}

describe('remnawave_api preview/apply safety mode', () => {
  beforeEach(() => {
    clearPreviewApplyCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearPreviewApplyCacheForTests();
  });

  test('preview returns compact apply token without upstream write', async () => {
    const executeOpenApiOperation = vi.fn(createClient().executeOpenApiOperation!);

    await preview(createClient({ executeOpenApiOperation }));

    expect(executeOpenApiOperation).not.toHaveBeenCalled();
  });

  test('preview rejects missing requested hosts before token creation or upstream write', async () => {
    const executeOpenApiOperation = vi.fn(createClient().executeOpenApiOperation!);
    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { uuids: [HOST_1, MISSING_HOST], port: 443 } },
      createClient({ executeOpenApiOperation }),
    );

    expect(result).toMatchObject({
      error: {
        code: 'HOST_NOT_FOUND',
        kind: 'validation',
        issues: [{ field: 'payload.uuids', code: 'HOST_NOT_FOUND', message: `Host UUID not found: ${MISSING_HOST}.` }],
      },
    });
    expect(result).not.toHaveProperty('applyToken');
    expect(executeOpenApiOperation).not.toHaveBeenCalled();
    expectCompact(result);

    const applyAttempt = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken: 'missing-host-token' } },
      createClient({ executeOpenApiOperation }),
    );
    expect(applyAttempt).toMatchObject({ error: { code: 'APPLY_TOKEN_NOT_FOUND', kind: 'preview_invalid' } });
    expect(executeOpenApiOperation).not.toHaveBeenCalled();
  });

  test('apply rejects missing token before upstream write', async () => {
    const executeOpenApiOperation = vi.fn(createClient().executeOpenApiOperation!);
    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken: '' } },
      createClient({ executeOpenApiOperation }),
    );

    expect(result).toMatchObject({ error: { code: 'APPLY_TOKEN_MISSING', kind: 'preview_required' } });
    expect(executeOpenApiOperation).not.toHaveBeenCalled();
    expectCompact(result);
  });

  test('apply rejects expired tokens before upstream write', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T00:00:00.000Z'));
    const { applyToken } = await preview();
    vi.setSystemTime(new Date('2026-05-04T00:10:01.000Z'));
    const executeOpenApiOperation = vi.fn(createClient().executeOpenApiOperation!);

    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken } },
      createClient({ executeOpenApiOperation }),
    );

    expect(result).toMatchObject({ error: { code: 'APPLY_TOKEN_EXPIRED', kind: 'preview_invalid' } });
    expect(executeOpenApiOperation).not.toHaveBeenCalled();
  });

  test('apply rejects reused tokens after a successful consume-once apply', async () => {
    const { applyToken } = await preview();
    const executeOpenApiOperation = vi.fn(createClient().executeOpenApiOperation!);
    const client = createClient({ executeOpenApiOperation });

    const first = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken } },
      client,
    );
    const second = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken } },
      client,
    );

    expect(first).toEqual({ updated: { uuids: [HOST_1], port: 443, updated: true } });
    expect(second).toMatchObject({ error: { code: 'APPLY_TOKEN_REUSED', kind: 'preview_invalid' } });
    expect(executeOpenApiOperation).toHaveBeenCalledTimes(1);
  });

  test('apply consumes token before upstream write so failed attempts cannot be retried', async () => {
    const { applyToken } = await preview();
    const executeOpenApiOperation = vi.fn(async () => {
      throw new Error('network failure after upstream accepted request');
    });
    const client = createClient({ executeOpenApiOperation });

    const first = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken } },
      client,
    );
    const retry = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken } },
      client,
    );

    expect(first).toMatchObject({ error: { code: 'INTERNAL_ERROR', kind: 'internal' } });
    expect(retry).toMatchObject({ error: { code: 'APPLY_TOKEN_REUSED', kind: 'preview_invalid' } });
    expect(executeOpenApiOperation).toHaveBeenCalledTimes(1);
  });

  test('apply rejects payload overrides and repeated mutation fields', async () => {
    const { applyToken } = await preview();
    const executeOpenApiOperation = vi.fn(createClient().executeOpenApiOperation!);

    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken, port: 8443 } },
      createClient({ executeOpenApiOperation }),
    );

    expect(result).toMatchObject({ error: { code: 'APPLY_TOKEN_PAYLOAD_MISMATCHED', kind: 'preview_invalid' } });
    expect(executeOpenApiOperation).not.toHaveBeenCalled();
  });

  test('cache rejects wrong-operation tokens', () => {
    const openapi = getSupportedOperationOpenApiBinding('hosts', 'bulk_update');
    const entry = createPreviewApplyEntry({
      domain: 'hosts',
      operation: 'bulk_update',
      openapi,
      targetIdentity: { type: 'hosts', hostUuids: [HOST_1] },
      payload: { uuids: [HOST_1], port: 443 },
      preStateFingerprint: 'sha256:state',
      changes: [],
    });

    const result = readPreviewApplyEntry({
      applyToken: entry.applyToken,
      domain: 'hosts',
      operation: 'other_operation',
      openapi,
    });

    expect(result).toMatchObject({ ok: false, failure: { code: 'APPLY_TOKEN_WRONG_OPERATION' } });
  });

  test('apply rejects target mismatch before upstream write', async () => {
    const { applyToken } = await preview();
    const executeOpenApiOperation = vi.fn(createClient().executeOpenApiOperation!);

    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken } },
      createClient({
        executeOpenApiOperation,
        getHosts: async () => ({ total: 0, items: [] }),
      }),
    );

    expect(result).toMatchObject({ error: { code: 'APPLY_TOKEN_TARGET_MISMATCHED', kind: 'preview_invalid' } });
    expect(executeOpenApiOperation).not.toHaveBeenCalled();
  });

  test('apply rejects stale-state tokens before upstream write', async () => {
    const { applyToken } = await preview();
    const executeOpenApiOperation = vi.fn(createClient().executeOpenApiOperation!);

    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken } },
      createClient({
        executeOpenApiOperation,
        getHosts: async () => ({ total: 1, items: [{ uuid: HOST_1, port: 81, enabled: true, fingerprint: 'fp-1' }] }),
      }),
    );

    expect(result).toMatchObject({ error: { code: 'APPLY_TOKEN_STALE_STATE', kind: 'preview_invalid' } });
    expect(executeOpenApiOperation).not.toHaveBeenCalled();
  });

  test('generated preview/apply reads real collection pre-state and rejects stale apply before upstream write', async () => {
    const getProfiles = vi.fn(async () => ({ items: [{ uuid: 'profile-1', name: 'before', revision: 1 }] }));
    const executeOpenApiOperation = vi.fn(async () => ({ uuid: 'profile-1', name: 'after' }));
    const first = await routeRemnawaveApiRequest(
      { domain: 'profiles', operation: 'reorder', payload: { items: [{ uuid: '11111111-1111-4111-8111-111111111111', viewPosition: 1 }] } },
      createClient({ getProfiles, executeOpenApiOperation }),
    );

    expect(first).toMatchObject({
      applyToken: expect.any(String),
      target: { type: 'profiles', target: 'operation' },
      changes: [{ target: 'operation', before: { state: { items: [{ uuid: 'profile-1', name: 'before', revision: 1 }] } } }],
    });
    expect(getProfiles).toHaveBeenCalledTimes(1);
    expect(executeOpenApiOperation).not.toHaveBeenCalled();

    const stale = await routeRemnawaveApiRequest(
      { domain: 'profiles', operation: 'reorder', payload: { applyToken: (first as { readonly applyToken: string }).applyToken } },
      createClient({
        getProfiles: vi.fn(async () => ({ items: [{ uuid: 'profile-1', name: 'changed', revision: 2 }] })),
        executeOpenApiOperation,
      }),
    );

    expect(stale).toMatchObject({ error: { code: 'APPLY_TOKEN_STALE_STATE', kind: 'preview_invalid' } });
    expect(executeOpenApiOperation).not.toHaveBeenCalled();
  });
});
