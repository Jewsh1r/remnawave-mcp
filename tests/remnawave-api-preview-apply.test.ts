import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';

import { routeRemnawaveApiRequest } from '../src/remnawave-api/router.js';
import type { RemnawaveApiClient } from '../src/remnawave-api/registry.js';
import {
  clearPreviewApplyCacheForTests,
  createPreviewApplyEntry,
  getSupportedOperationOpenApiBinding,
  readPreviewApplyEntry,
} from '../src/remnawave-api/preview-apply-cache.js';

function createClient(overrides: Partial<RemnawaveApiClient> = {}): RemnawaveApiClient {
  return {
    getSystemStats: async () => ({}),
    getHosts: async () => ({
      total: 2,
      items: [
        { uuid: 'host-1', port: 80, enabled: true, fingerprint: 'fp-1' },
        { uuid: 'host-2', port: 81, enabled: true, fingerprint: 'fp-2' },
      ],
    }),
    bulkSetHostPort: async (hostUuids, port) => ({ hostUuids, port, updated: true }),
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
    { domain: 'hosts', operation: 'bulk_set_port', payload: { hostUuids: ['host-1'], port: 443 } },
    client,
  );

  expect(result).toMatchObject({
    applyToken: expect.any(String),
    expiresAt: expect.any(String),
    target: { type: 'hosts', hostUuids: ['host-1'] },
    changes: [{ target: 'host-1', before: { port: 80 }, after: { port: 443 } }],
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
    const bulkSetHostPort = vi.fn(createClient().bulkSetHostPort);

    await preview(createClient({ bulkSetHostPort }));

    expect(bulkSetHostPort).not.toHaveBeenCalled();
  });

  test('apply rejects missing token before upstream write', async () => {
    const bulkSetHostPort = vi.fn(createClient().bulkSetHostPort);
    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_set_port', payload: { applyToken: '' } },
      createClient({ bulkSetHostPort }),
    );

    expect(result).toMatchObject({ error: { code: 'APPLY_TOKEN_MISSING', kind: 'preview_required' } });
    expect(bulkSetHostPort).not.toHaveBeenCalled();
    expectCompact(result);
  });

  test('apply rejects expired tokens before upstream write', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T00:00:00.000Z'));
    const { applyToken } = await preview();
    vi.setSystemTime(new Date('2026-05-04T00:10:01.000Z'));
    const bulkSetHostPort = vi.fn(createClient().bulkSetHostPort);

    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_set_port', payload: { applyToken } },
      createClient({ bulkSetHostPort }),
    );

    expect(result).toMatchObject({ error: { code: 'APPLY_TOKEN_EXPIRED', kind: 'preview_invalid' } });
    expect(bulkSetHostPort).not.toHaveBeenCalled();
  });

  test('apply rejects reused tokens after a successful consume-once apply', async () => {
    const { applyToken } = await preview();
    const bulkSetHostPort = vi.fn(createClient().bulkSetHostPort);
    const client = createClient({ bulkSetHostPort });

    const first = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_set_port', payload: { applyToken } },
      client,
    );
    const second = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_set_port', payload: { applyToken } },
      client,
    );

    expect(first).toEqual({ updated: { hostUuids: ['host-1'], port: 443, updated: true } });
    expect(second).toMatchObject({ error: { code: 'APPLY_TOKEN_REUSED', kind: 'preview_invalid' } });
    expect(bulkSetHostPort).toHaveBeenCalledTimes(1);
  });

  test('apply rejects payload overrides and repeated mutation fields', async () => {
    const { applyToken } = await preview();
    const bulkSetHostPort = vi.fn(createClient().bulkSetHostPort);

    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_set_port', payload: { applyToken, port: 8443 } },
      createClient({ bulkSetHostPort }),
    );

    expect(result).toMatchObject({ error: { code: 'APPLY_TOKEN_PAYLOAD_MISMATCHED', kind: 'preview_invalid' } });
    expect(bulkSetHostPort).not.toHaveBeenCalled();
  });

  test('cache rejects wrong-operation tokens', () => {
    const openapi = getSupportedOperationOpenApiBinding('hosts', 'bulk_set_port');
    const entry = createPreviewApplyEntry({
      domain: 'hosts',
      operation: 'bulk_set_port',
      openapi,
      targetIdentity: { type: 'hosts', hostUuids: ['host-1'] },
      payload: { hostUuids: ['host-1'], port: 443 },
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
    const bulkSetHostPort = vi.fn(createClient().bulkSetHostPort);

    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_set_port', payload: { applyToken } },
      createClient({
        bulkSetHostPort,
        getHosts: async () => ({ total: 0, items: [] }),
      }),
    );

    expect(result).toMatchObject({ error: { code: 'APPLY_TOKEN_TARGET_MISMATCHED', kind: 'preview_invalid' } });
    expect(bulkSetHostPort).not.toHaveBeenCalled();
  });

  test('apply rejects stale-state tokens before upstream write', async () => {
    const { applyToken } = await preview();
    const bulkSetHostPort = vi.fn(createClient().bulkSetHostPort);

    const result = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_set_port', payload: { applyToken } },
      createClient({
        bulkSetHostPort,
        getHosts: async () => ({ total: 1, items: [{ uuid: 'host-1', port: 81, enabled: true, fingerprint: 'fp-1' }] }),
      }),
    );

    expect(result).toMatchObject({ error: { code: 'APPLY_TOKEN_STALE_STATE', kind: 'preview_invalid' } });
    expect(bulkSetHostPort).not.toHaveBeenCalled();
  });
});
