import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import { REMNAWAVE_OPERATION_INVENTORY } from '../src/remnawave-api/generated/operation-inventory.js';
import { DEFAULT_OPERATION_REGISTRY, type RemnawaveApiClient } from '../src/remnawave-api/registry.js';
import { SUPPORTED_OPERATION_RISK } from '../src/remnawave-api/risk.js';
import { routeRemnawaveApiRequest } from '../src/remnawave-api/router.js';
import { SUPPORTED_OPERATION_SCHEMAS } from '../src/remnawave-api/schema.js';

const legacyMarkers = [
  '"ok"',
  '"details"',
  '"result"',
  'suggested_next_step',
  'recommended_next_operations',
  'execution_eligibility',
  'coaching',
] as const;

const groupedOperationKeys = [
  'users.manage_lifecycle',
  'hosts.manage_routing',
  'nodes.manage_maintenance',
  'profiles.manage_lifecycle',
] as const;

const supportedInventory = REMNAWAVE_OPERATION_INVENTORY.operations.filter((operation) => operation.status === 'supported');
const HOST_UUID = '11111111-1111-4111-8111-111111111111';

function createClient(overrides: Partial<RemnawaveApiClient> = {}): RemnawaveApiClient {
  return {
    getSystemStats: async () => ({
      cpu: { cores: 4 },
      memory: { totalBytes: 10, freeBytes: 4, usedBytes: 6 },
      uptimeSeconds: 120,
      generatedAtUnixMs: 123,
      users: { total: 8, active: 6, disabled: 1, limited: 1, expired: 0 },
      online: { now: 2, lastDay: 4, lastWeek: 6, never: 0 },
      nodes: { totalOnlineUsers: 3, lifetimeBytes: 0 },
    }),
    getMetadata: async () => ({ panel: 'rw', version: '3.2.3' }),
    getSystemHealth: async () => ({ instances: [] }),
    getBandwidthStats: async () => ({ totalBytes: 1024 }),
    getNodesStatistics: async () => ({ items: [] }),
    getNodesMetrics: async () => ({ items: [] }),
    getSystemRecap: async () => ({ totalUsers: 8, activeUsers: 6, inactiveUsers: 2, expiredUsers: 0 }),
    getUsers: async () => ({ total: 1, items: [{ uuid: 'user-1', username: 'alice' }] }),
    resolveUser: async (uuid: string) => ({ found: true, match: { uuid, shortUuid: 'short-1', username: 'alice' } }),
    createUser: async (payload) => ({ response: { uuid: 'user-2', ...payload } }),
    setUserState: async (uuid, action) => ({ uuid, action }),
    revokeUserSubscription: async (uuid) => ({ uuid, revoked: true }),
    restartNode: async (uuid) => ({ uuid, restarted: true }),
    getHosts: async () => ({ items: [{ uuid: HOST_UUID, port: 80, enabled: true, fingerprint: 'fp-1' }] }),
    bulkSetHostPort: async (hostUuids, port) => ({ hostUuids, port, updated: true }),
    getNodeMetadata: async (uuid) => ({ uuid, metadata: { zone: 'edge' } }),
    upsertNodeMetadata: async (uuid, metadata) => ({ uuid, metadata }),
    getUserMetadata: async (uuid) => ({ uuid, metadata: { segment: 'partner' } }),
    upsertUserMetadata: async (uuid, metadata) => ({ uuid, metadata }),
    getSubscriptionTemplates: async () => ({ items: [{ uuid: 'template-1', name: 'Default XRAY' }] }),
    getSubscriptionTemplateByUuid: async (uuid) => ({ uuid, name: 'Default XRAY' }),
    createSubscriptionTemplate: async (payload) => ({ response: { uuid: 'template-1', ...payload } }),
    updateSubscriptionTemplate: async (uuid, patch) => ({ response: { uuid, ...patch } }),
    deleteSubscriptionTemplate: async (uuid) => ({ uuid, deleted: true }),
    listSnippets: async () => ({ items: [{ uuid: 'snippet-1', name: 'headers' }] }),
    createSnippet: async (payload) => ({ response: payload }),
    updateSnippet: async (name, patch) => ({ response: { name, ...patch } }),
    deleteSnippet: async (name) => ({ name, deleted: true }),
    getPublicSubscriptionInfo: async (shortUuid) => ({ shortUuid, status: 'active' }),
    getPublicSubscription: async (shortUuid) => ({ shortUuid, subscription: true }),
    getPublicSubscriptionByClientType: async (shortUuid, clientType) => ({ shortUuid, clientType }),
    getProfiles: async () => ({ items: [{ uuid: 'profile-1', name: 'Default' }] }),
    getProfile: async (uuid) => ({ uuid, name: 'Default' }),
    getComputedProfile: async (uuid) => ({ uuid, computed: true }),
    listProfileInbounds: async (uuid) => ({ uuid, items: [] }),
    executeOpenApiOperation: async (operation, payload) => {
      if (operation.key === 'users.enable') return { userId: payload.userId, action: 'enable' };
      if (operation.key === 'users.revoke_subscription') return { userId: payload.userId, revoked: true };
      if (operation.key === 'users.get_subscription_request_history') {
        return { items: [{ userId: payload.userId, requestedAt: '2026-05-05T00:00:00.000Z' }] };
      }
      if (operation.key === 'hosts.bulk_update') return { ...payload, updated: true };
      return { response: payload };
    },
    ...overrides,
  };
}

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve('fixtures/contracts', name), 'utf8')) as unknown;
}

function stringifyStable(value: unknown): string {
  return JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? Number(item) : item));
}

function expectCompact(value: unknown): void {
  const serialized = stringifyStable(value);
  for (const marker of legacyMarkers) {
    expect(serialized).not.toContain(marker);
  }
}

function isConfirmationRequired(value: unknown): value is { readonly error: { readonly token: string } } {
  return typeof value === 'object'
    && value !== null
    && 'error' in value
    && typeof (value as { readonly error?: { readonly kind?: unknown; readonly token?: unknown } }).error?.token === 'string'
    && (value as { readonly error?: { readonly kind?: unknown } }).error?.kind === 'confirmation_required';
}

describe('remnawave_api compact v2 contract matrix', () => {
  test('runtime discovery is supported-only and mirrors generated inventory metadata', async () => {
    const client = createClient();
    const supportedDomains = [...new Set(supportedInventory.map((operation) => operation.domain))].sort();

    expect(DEFAULT_OPERATION_REGISTRY.listDomains()).toEqual(supportedDomains);

    for (const domain of supportedDomains) {
      const discovery = await routeRemnawaveApiRequest({ domain }, client);
      const expectedOperationNames = supportedInventory
        .filter((operation) => operation.domain === domain)
        .map((operation) => operation.operation)
        .sort();

      expect(discovery).toMatchObject({ domain });
      expect((discovery as { readonly operations: readonly { readonly name: string }[] }).operations.map((operation) => operation.name).sort()).toEqual(expectedOperationNames);
      expectCompact(discovery);
    }
  });

  test('describe output exposes current raw, safety, OpenAPI, and execution contracts for every supported operation', async () => {
    for (const inventoryOperation of supportedInventory) {
      const description = await routeRemnawaveApiRequest(
        { domain: inventoryOperation.domain, operation: inventoryOperation.operation },
        createClient(),
      );

      expect(description).toMatchObject({
        domain: inventoryOperation.domain,
        operation: expect.objectContaining({
          name: inventoryOperation.operation,
          disposition: 'supported',
          rawAllowed: inventoryOperation.rawAllowed,
          normalizer: inventoryOperation.normalizer,
          safetyMode: inventoryOperation.safetyMode,
          openapi: inventoryOperation.openapi,
          execution: { clientMethod: expect.any(String) },
          supportedOperations: expect.arrayContaining([inventoryOperation.operation]),
        }),
      });
      expectCompact(description);
    }
  });

  test('golden fixtures pin representative compact direct success and error outputs', async () => {
    const success = await routeRemnawaveApiRequest({ domain: 'system', operation: 'get_stats', payload: {} }, createClient());
    const error = await routeRemnawaveApiRequest({ domain: 'users', operation: 'create', payload: { username: 'ab' } }, createClient());

    expect(success).toEqual(readFixture('compact_v2_direct_success.json'));
    expect(error).toEqual(readFixture('compact_v2_direct_error.json'));
    expectCompact(success);
    expectCompact(error);
  });

  test('safety modes each have happy and failure cases', async () => {
    const client = createClient();

    const directSuccess = await routeRemnawaveApiRequest({ domain: 'users', operation: 'enable', payload: { userId: 1 } }, client);
    const directFailure = await routeRemnawaveApiRequest({ domain: 'users', operation: 'create', payload: { username: 'ab' } }, client);
    const confirmFirst = await routeRemnawaveApiRequest({ domain: 'users', operation: 'revoke_subscription', payload: { userId: 1 } }, client);
    const confirmSuccess = isConfirmationRequired(confirmFirst)
      ? await routeRemnawaveApiRequest({ domain: 'users', operation: 'revoke_subscription', payload: { userId: 1 }, confirmToken: confirmFirst.error.token }, client)
      : confirmFirst;
    const preview = await routeRemnawaveApiRequest({ domain: 'hosts', operation: 'bulk_update', payload: { uuids: [HOST_UUID], port: 443 } }, client);
    const previewFailure = await routeRemnawaveApiRequest({ domain: 'hosts', operation: 'bulk_update', payload: { applyToken: '' } }, client);
    const applySuccess = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken: (preview as { readonly applyToken: string }).applyToken } },
      client,
    );

    expect(directSuccess).toEqual({ updated: { userId: 1, action: 'enable' } });
    expect(directFailure).toMatchObject({ error: { code: 'INVALID_PAYLOAD', kind: 'validation' } });
    expect(confirmFirst).toMatchObject({ error: { code: 'CONFIRMATION_REQUIRED', kind: 'confirmation_required', token: expect.any(String) } });
    expect(confirmSuccess).toEqual({ updated: { userId: 1, revoked: true } });
    expect(preview).toMatchObject({ applyToken: expect.any(String), changes: [{ target: HOST_UUID, before: { state: expect.objectContaining({ port: 80 }) }, after: { patch: { port: 443 } } }] });
    expect(previewFailure).toMatchObject({ error: { code: 'APPLY_TOKEN_MISSING', kind: 'preview_required' } });
    expect(applySuccess).toEqual({ updated: { uuids: [HOST_UUID], port: 443, updated: true } });
    [directSuccess, directFailure, confirmFirst, confirmSuccess, preview, previewFailure, applySuccess].forEach(expectCompact);
  });

  test('Task 11 accepted families are published with expected safety and raw policy', () => {
    const byKey = new Map(supportedInventory.map((operation) => [operation.key, operation]));
    const expected = [
      'metadata.get_node',
      'metadata.upsert_node',
      'metadata.get_user',
      'metadata.upsert_user',
      'templates.list',
      'templates.get',
      'templates.create',
      'templates.update',
      'templates.delete',
      'snippets.list',
      'snippets.create',
      'snippets.update',
      'snippets.delete',
      'public_subscriptions.get_info',
      'public_subscriptions.get',
      'public_subscriptions.get_by_client_type',
      'profiles.list',
      'profiles.get',
      'profiles.get_computed',
      'profiles.list_inbounds',
      'users.revoke_subscription',
    ] as const;

    for (const key of expected) {
      expect(byKey.get(key)).toMatchObject({ status: 'supported', rawAllowed: false, rawPolicy: 'raw_denied' });
    }
    expect(byKey.get('templates.delete')).toMatchObject({ safetyMode: 'confirm' });
    expect(byKey.get('snippets.delete')).toMatchObject({ safetyMode: 'confirm' });
    expect(byKey.get('users.revoke_subscription')).toMatchObject({ safetyMode: 'confirm' });
    expect(byKey.get('metadata.upsert_node')).toMatchObject({ safetyMode: 'direct' });
    expect(byKey.get('public_subscriptions.get')).toMatchObject({ safetyMode: 'direct', write: false });
    expect(byKey.get('keygen.generate_node_secret')).toMatchObject({ status: 'supported', rawAllowed: false, rawPolicy: 'raw_denied', safetyMode: 'direct', write: false });
    expect(byKey.get('system.generate_x25519_keypairs')).toMatchObject({ status: 'supported', rawAllowed: false, rawPolicy: 'raw_denied', safetyMode: 'direct', write: false });
  });

  test('raw policy allows system reads and rejects public subscription raw before execution', async () => {
    let publicSubscriptionCalled = false;
    const rawSystem = { upstream: true };
    const client = createClient({
      getSystemStats: async () => rawSystem,
      getPublicSubscriptionInfo: async () => {
        publicSubscriptionCalled = true;
        return { shortUuid: 'short-1' };
      },
    });

    const allowed = await routeRemnawaveApiRequest({ domain: 'system', operation: 'get_stats', payload: {}, responseMode: 'raw' }, client);
    const denied = await routeRemnawaveApiRequest({ domain: 'public_subscriptions', operation: 'get_info', payload: { shortUuid: 'short-1' }, responseMode: 'raw' }, client);

    expect(allowed).toBe(rawSystem);
    expect(denied).toMatchObject({ error: { code: 'RAW_RESPONSE_NOT_ALLOWED', kind: 'validation' } });
    expect(publicSubscriptionCalled).toBe(false);
    expectCompact(allowed);
    expectCompact(denied);
  });

  test('users subscription request history is the only current runtime history operation key', async () => {
    const staleKey = 'users.get_subscription_history';
    const currentKey = 'users.get_subscription_request_history';
    const scopeMap = DEFAULT_OPERATION_REGISTRY.getScopeMap();
    const allScopeText = stringifyStable(scopeMap);
    const supportedDescriptions: unknown[] = [];

    for (const operation of DEFAULT_OPERATION_REGISTRY.listOperations('users')) {
      supportedDescriptions.push(await routeRemnawaveApiRequest({ domain: 'users', operation: operation.discovery.operation }, createClient()));
    }

    expect(scopeMap.supported).toEqual(expect.arrayContaining([currentKey]));
    expect(scopeMap.supported).not.toEqual(expect.arrayContaining([staleKey]));
    expect(allScopeText).not.toContain(staleKey);
    expect(Object.keys(SUPPORTED_OPERATION_RISK)).toEqual(expect.arrayContaining([currentKey]));
    expect(Object.keys(SUPPORTED_OPERATION_RISK)).not.toEqual(expect.arrayContaining([staleKey]));
    expect(Object.keys(SUPPORTED_OPERATION_SCHEMAS)).toEqual(expect.arrayContaining([currentKey]));
    expect(Object.keys(SUPPORTED_OPERATION_SCHEMAS)).not.toEqual(expect.arrayContaining([staleKey]));
    expect(stringifyStable(supportedDescriptions)).not.toContain(staleKey);

    const executed = await routeRemnawaveApiRequest(
      { domain: 'users', operation: 'get_subscription_request_history', payload: { userId: 1 } },
      createClient(),
    );
    expect(executed).toEqual({ items: [{ userId: 1, requestedAt: '2026-05-05T00:00:00.000Z' }] });
  });

  test('public subscription compact output redacts secret-like fields and caps large strings', async () => {
    const longSubscription = `ss://${'a'.repeat(5_000)} token=plain-secret`;
    const client = createClient({
      getPublicSubscription: async (shortUuid) => ({
        shortUuid,
        token: 'token-value',
        nested: {
          apiKey: 'api-key-value',
          line: longSubscription,
        },
        lines: [`Bearer secret-token`, 'short line'],
      }),
    });

    const compact = await routeRemnawaveApiRequest({ domain: 'public_subscriptions', operation: 'get', payload: { shortUuid: 'short-1' } }, client);
    const serialized = stringifyStable(compact);

    expect(compact).toMatchObject({
      shortUuid: 'short-1',
      token: '<REDACTED_SECRET>',
      nested: { apiKey: '<REDACTED_SECRET>' },
    });
    expect(serialized).not.toContain('token-value');
    expect(serialized).not.toContain('api-key-value');
    expect(serialized).not.toContain('plain-secret');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).toContain('<REDACTED_SECRET>');
    expect(serialized).toContain('...[truncated ');
    expect(serialized.length).toBeLessThan(4_700);
    expectCompact(compact);
  });

  test('excluded domains, excluded surfaces, and legacy grouped names are absent and unreachable', async () => {
    const unsupportedRequests = [
      { domain: 'auth', operation: 'login', payload: {} },
      { domain: 'tokens', operation: 'list', payload: {} },
      { domain: 'ip_control', operation: 'submit_user_fetch_job', payload: { uuid: 'user-1' } },
      { domain: 'node_plugins', operation: 'execute_plugin_executor', payload: { pluginUuid: 'plugin-1' } },
      { domain: 'remnawave_settings', operation: 'update', payload: {} },
      { domain: 'system', operation: 'encrypt_happ_payload', payload: {} },
      { domain: 'system', operation: 'debug_srr_matcher', payload: {} },
      ...groupedOperationKeys.map((key) => {
        const [domain, operation] = key.split('.');
        return { domain, operation, payload: {} };
      }),
    ];
    const allDiscovery = stringifyStable(DEFAULT_OPERATION_REGISTRY.getScopeMap());

    expect(DEFAULT_OPERATION_REGISTRY.listDomains()).toEqual(expect.arrayContaining(['keygen']));
    expect(DEFAULT_OPERATION_REGISTRY.listDomains()).not.toEqual(expect.arrayContaining(['auth', 'tokens', 'ip_control', 'node_plugins', 'remnawave_settings']));
    for (const key of groupedOperationKeys) {
      expect(allDiscovery).not.toContain(key);
    }

    for (const request of unsupportedRequests) {
      const result = await routeRemnawaveApiRequest(request, createClient());
      expect(result).toMatchObject({ error: { kind: 'unsupported_operation' } });
      expectCompact(result);
    }
  });
});
