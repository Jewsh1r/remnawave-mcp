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
    getMetadata: async () => ({ panel: 'rw', version: '2.7.4' }),
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
        expect.objectContaining({ name: 'create', disposition: 'supported', write: true, riskTier: 'tier_2_bounded_mutation' }),
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
    const rawMetadata = { panel: 'rw', version: '2.7.4' };
    const getSystemStats = vi.fn(async () => rawStats);
    const getMetadata = vi.fn(async () => rawMetadata);

    const statsResult = await routeRemnawaveApiRequest(
      { domain: 'system', operation: 'get_stats', payload: {}, responseMode: 'raw' },
      createClient({ getSystemStats }),
    );
    const metadataResult = await routeRemnawaveApiRequest(
      { domain: 'system', operation: 'get_metadata', payload: {}, responseMode: 'raw' },
      createClient({ getMetadata }),
    );

    expect(statsResult).toBe(rawStats);
    expect(metadataResult).toBe(rawMetadata);
    expect(getSystemStats).toHaveBeenCalledTimes(1);
    expect(getMetadata).toHaveBeenCalledTimes(1);
    expectNoLegacyFields(statsResult);
    expectNoLegacyFields(metadataResult);
  });

  test('responseMode raw is rejected for writes before execution', async () => {
    const createUser = vi.fn(async (payload: Record<string, unknown>) => ({ uuid: 'user-1', ...payload }));

    const result = await routeRemnawaveApiRequest(
      {
        domain: 'users',
        operation: 'create',
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
      { domain: 'users', operation: 'get', payload: { uuid: 'user-1' }, responseMode: 'raw' },
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
      { domain: 'users', operation: 'create', payload: { username: 'ab' } },
      createClient({ createUser }),
    );

    expect(result).toMatchObject({
      error: {
        code: 'INVALID_PAYLOAD',
        kind: 'validation',
        message: 'Payload is missing or invalid for users.create.',
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
        operation: 'create',
        payload: { username: 'bridge-operator', expireAt: '2026-05-01T00:00:00.000Z' },
      },
      createClient({ createUser: async (payload) => ({ response: { uuid: 'user-2', ...payload }, upstreamTrace: 'ignored' }) }),
    );
    const resolvedUser = await routeRemnawaveApiRequest(
      { domain: 'users', operation: 'get', payload: { uuid: 'user-1' } },
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


  test('executes Task 11 accepted capability examples with compact results and raw exclusions', async () => {
    const upsertNodeMetadata = vi.fn(async (uuid: string, metadata: Record<string, unknown>) => ({ uuid, metadata }));
    const createSubscriptionTemplate = vi.fn(async (payload: Record<string, unknown>) => ({ response: { uuid: 'template-1', ...payload } }));
    const updateSubscriptionTemplate = vi.fn(async (uuid: string, patch: Record<string, unknown>) => ({ response: { uuid, ...patch } }));
    const deleteSubscriptionTemplate = vi.fn(async (uuid: string) => ({ uuid, deleted: true }));
    const createSnippet = vi.fn(async (payload: Record<string, unknown>) => ({ response: payload }));
    const updateSnippet = vi.fn(async (name: string, patch: Record<string, unknown>) => ({ response: { name, ...patch } }));
    const deleteSnippet = vi.fn(async (name: string) => ({ name, deleted: true }));
    const getPublicSubscriptionInfo = vi.fn(async (shortUuid: string) => ({ shortUuid, status: 'active' }));
    const getProfile = vi.fn(async (uuid: string) => ({ uuid, name: 'profile' }));
    const client = createClient({
      upsertNodeMetadata,
      createSubscriptionTemplate,
      updateSubscriptionTemplate,
      deleteSubscriptionTemplate,
      createSnippet,
      updateSnippet,
      deleteSnippet,
      getPublicSubscriptionInfo,
      getProfile,
    });

    const metadata = await routeRemnawaveApiRequest({ domain: 'metadata', operation: 'upsert_node', payload: { uuid: 'node-1', metadata: { zone: 'edge' } } }, client);
    const templateCreate = await routeRemnawaveApiRequest({ domain: 'templates', operation: 'create', payload: { name: 'Default XRAY', templateType: 'XRAY_JSON' } }, client);
    const templateUpdate = await routeRemnawaveApiRequest({ domain: 'templates', operation: 'update', payload: { uuid: 'template-1', name: 'Updated XRAY' } }, client);
    const templateDeletePreview = await routeRemnawaveApiRequest({ domain: 'templates', operation: 'delete', payload: { uuid: 'template-1' } }, client);
    const templateDelete = isConfirmationRequired(templateDeletePreview)
      ? await routeRemnawaveApiRequest({ domain: 'templates', operation: 'delete', payload: { uuid: 'template-1' }, confirmToken: templateDeletePreview.error.token }, client)
      : templateDeletePreview;
    const snippetCreate = await routeRemnawaveApiRequest({ domain: 'snippets', operation: 'create', payload: { name: 'headers', snippet: [{ key: 'value' }] } }, client);
    const snippetUpdate = await routeRemnawaveApiRequest({ domain: 'snippets', operation: 'update', payload: { name: 'headers', snippet: [{ key: 'updated' }] } }, client);
    const snippetDeletePreview = await routeRemnawaveApiRequest({ domain: 'snippets', operation: 'delete', payload: { name: 'headers' } }, client);
    const snippetDelete = isConfirmationRequired(snippetDeletePreview)
      ? await routeRemnawaveApiRequest({ domain: 'snippets', operation: 'delete', payload: { name: 'headers' }, confirmToken: snippetDeletePreview.error.token }, client)
      : snippetDeletePreview;
    const publicInfo = await routeRemnawaveApiRequest({ domain: 'public_subscriptions', operation: 'get_info', payload: { shortUuid: 'short-1' } }, client);
    const publicRawDenied = await routeRemnawaveApiRequest({ domain: 'public_subscriptions', operation: 'get_info', payload: { shortUuid: 'short-1' }, responseMode: 'raw' }, client);
    const profile = await routeRemnawaveApiRequest({ domain: 'profiles', operation: 'get', payload: { uuid: 'profile-1' } }, client);
    const profileWritePreview = await routeRemnawaveApiRequest({ domain: 'profiles', operation: 'update', payload: { uuid: '11111111-1111-4111-8111-111111111111', name: 'next' } }, client);

    expect(metadata).toEqual({ updated: { uuid: 'node-1', metadata: { metadata: { zone: 'edge' } } } });
    expect(templateCreate).toEqual({ updated: { uuid: 'template-1', name: 'Default XRAY', templateType: 'XRAY_JSON' } });
    expect(templateUpdate).toEqual({ updated: { uuid: 'template-1', name: 'Updated XRAY' } });
    expect(templateDelete).toEqual({ updated: { uuid: 'template-1', deleted: true } });
    expect(snippetCreate).toEqual({ updated: { name: 'headers', snippet: [{ key: 'value' }] } });
    expect(snippetUpdate).toEqual({ updated: { name: 'headers', snippet: [{ key: 'updated' }] } });
    expect(snippetDelete).toEqual({ updated: { name: 'headers', deleted: true } });
    expect(publicInfo).toEqual({ shortUuid: 'short-1', status: 'active' });
    expect(publicRawDenied).toMatchObject({ error: { code: 'RAW_RESPONSE_NOT_ALLOWED', kind: 'validation' } });
    expect(profile).toEqual({ uuid: 'profile-1', name: 'profile' });
    expect(profileWritePreview).toMatchObject({ applyToken: expect.any(String) });
    expectNoLegacyFields(metadata);
    expectNoLegacyFields(publicRawDenied);
  });

  test('legacy public subscription placeholder operation remains unsupported', async () => {
    const result = await routeRemnawaveApiRequest(
      { domain: 'public_subscriptions', operation: 'read', payload: { shortUuid: 'short-1' } },
      createClient(),
    );

    expect(result).toMatchObject({ error: { kind: 'unsupported_operation' } });
    expectNoLegacyFields(result);
  });

});

function isConfirmationRequired(value: unknown): value is { readonly error: { readonly kind: 'confirmation_required'; readonly token: string } } {
  return isRecord(value)
    && isRecord(value.error)
    && value.error.kind === 'confirmation_required'
    && typeof value.error.token === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
