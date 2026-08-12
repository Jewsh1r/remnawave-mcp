import { describe, expect, test, vi } from 'vitest';

import { createRemnawaveApiClientAdapter } from '../src/remnawave-api/client-adapter.js';
import { routeRemnawaveApiRequest } from '../src/remnawave-api/router.js';

const SQUAD_UUID = '11111111-1111-4111-8111-111111111111';

function createPanelClient() {
  return {
    getSystemStats: vi.fn(async () => ({
      cpu: { cores: 4 },
      memory: { totalBytes: 10, freeBytes: 4, usedBytes: 6 },
      uptimeSeconds: 120,
      generatedAtUnixMs: 123,
      users: { total: 1, active: 1, disabled: 0, limited: 0, expired: 0 },
      online: { now: 1, lastDay: 1, lastWeek: 1, never: 0 },
      nodes: { totalOnlineUsers: 1, lifetimeBytes: 0n },
    })),
    getMetadata: vi.fn(async () => ({ version: '3.2.3' })),
    getSystemHealth: vi.fn(async () => ({ status: 'ok' })),
    getBandwidthStats: vi.fn(async () => ({ totalBytes: 1024 })),
    getNodesStatistics: vi.fn(async () => ({ items: [] })),
    getNodesMetrics: vi.fn(async () => ({ items: [] })),
    getSystemRecap: vi.fn(async () => ({ totalUsers: 1 })),
    getUsers: vi.fn(async () => ({ total: 1, items: [{ uuid: 'user-1', username: 'alice' }] })),
    resolveUser: vi.fn(async (uuid: string) => ({ found: true, match: { uuid, shortUuid: 'short-1', username: 'alice' } })),
    createUser: vi.fn(async (payload: Record<string, unknown>) => ({ uuid: 'user-2', ...payload })),
    setUserState: vi.fn(async (uuid: string, action: string, body?: Record<string, unknown>) => ({ uuid, action, body })),
    restartNode: vi.fn(async (uuid: string) => ({ uuid, restarted: true })),
    getHosts: vi.fn(async () => ({
      total: 1,
      items: [{ uuid: 'host-1', port: 80, enabled: true, fingerprint: 'fp-1' }],
    })),
    bulkSetHostPort: vi.fn(async (hostUuids: readonly string[], port: number) => ({ hostUuids, port, updated: true })),
    getNodeMetadata: vi.fn(async (uuid: string) => ({ uuid, metadata: {} })),
    upsertNodeMetadata: vi.fn(async (uuid: string, metadata: Record<string, unknown>) => ({ uuid, metadata })),
    getUserMetadata: vi.fn(async (uuid: string) => ({ uuid, metadata: {} })),
    upsertUserMetadata: vi.fn(async (uuid: string, metadata: Record<string, unknown>) => ({ uuid, metadata })),
    getSubscriptionTemplates: vi.fn(async () => ({ items: [] })),
    getSubscriptionTemplateByUuid: vi.fn(async (uuid: string) => ({ uuid, name: 'template' })),
    createSubscriptionTemplate: vi.fn(async (payload: Record<string, unknown>) => ({ ...payload, uuid: 'template-1' })),
    updateSubscriptionTemplate: vi.fn(async (uuid: string, patch: Record<string, unknown>) => ({ uuid, ...patch })),
    deleteSubscriptionTemplate: vi.fn(async (uuid: string) => ({ uuid, deleted: true })),
    listSnippets: vi.fn(async () => ({ items: [] })),
    createSnippet: vi.fn(async (payload: Record<string, unknown>) => ({ ...payload, created: true })),
    updateSnippet: vi.fn(async (name: string, patch: Record<string, unknown>) => ({ name, ...patch })),
    deleteSnippet: vi.fn(async (name: string) => ({ name, deleted: true })),
    getPublicSubscriptionInfo: vi.fn(async (shortUuid: string) => ({ shortUuid, info: true })),
    getPublicSubscription: vi.fn(async (shortUuid: string) => ({ shortUuid, subscription: true })),
    getPublicSubscriptionByClientType: vi.fn(async (shortUuid: string, clientType: string) => ({ shortUuid, clientType })),
    getProfiles: vi.fn(async () => ({ items: [] })),
    getProfile: vi.fn(async (uuid: string) => ({ uuid, name: 'profile' })),
    getComputedProfile: vi.fn(async (uuid: string) => ({ uuid, computed: true })),
    listProfileInbounds: vi.fn(async (uuid: string) => ({ uuid, items: [] })),
    revokeUserSubscription: vi.fn(async (uuid: string) => ({ uuid, revoked: true })),
    getSubscriptions: vi.fn(async (params?: { readonly size?: number; readonly start?: number }) => ({ params, items: [] })),
    getSubscriptionByUsername: vi.fn(async (username: string) => ({ username, subscription: true })),
    getSubscriptionByShortUuid: vi.fn(async (shortUuid: string) => ({ shortUuid, subscription: true })),
    getSubscriptionByUuid: vi.fn(async (uuid: string) => ({ uuid, subscription: true })),
    getRawSubscriptionByShortUuid: vi.fn(async (shortUuid: string, params?: { readonly withDisabledHosts?: boolean }) => ({ shortUuid, params, raw: true })),
    getSubscriptionSubpageConfigByShortUuid: vi.fn(async (shortUuid: string, body?: Record<string, unknown>) => ({ shortUuid, body, config: true })),
    getSubscriptionConnectionKeysByUuid: vi.fn(async (uuid: string) => ({ uuid, keys: ['key-1'] })),
    getSubscriptionRequestHistory: vi.fn(async (params?: { readonly size?: number; readonly start?: number }) => ({ params, items: [] })),
    getSubscriptionRequestHistoryStats: vi.fn(async () => ({ total: 1 })),
    getSubscriptionPageConfigs: vi.fn(async () => ({ items: [] })),
    getUserSubscriptionRequestHistory: vi.fn(async (uuid: string) => ({ uuid, items: [] })),
    getSubscriptionPolicySettings: vi.fn(async () => ({ profileTitle: 'before' })),
    getInternalSquads: vi.fn(async () => ({ items: [] })),
    bulkAddUsersToInternalSquad: vi.fn(async (uuid: string, userUuids: readonly string[]) => ({ uuid, userUuids, added: true })),
    bulkRemoveUsersFromInternalSquad: vi.fn(async (uuid: string, userUuids: readonly string[]) => ({ uuid, userUuids, removed: true })),
    getExternalSquads: vi.fn(async () => ({ items: [] })),
    getExternalSquadByUuid: vi.fn(async (uuid: string) => ({ uuid, name: 'external' })),
    bulkAddUsersToExternalSquad: vi.fn(async (uuid: string, userUuids: readonly string[]) => ({ uuid, userUuids, added: true })),
    bulkRemoveUsersFromExternalSquad: vi.fn(async (uuid: string, userUuids: readonly string[]) => ({ uuid, userUuids, removed: true })),
    getAuthStatus: vi.fn(async () => ({ auth: true })),
    listApiTokens: vi.fn(async () => ({ tokens: [] })),
    fetchIpsForUser: vi.fn(async () => ({ jobId: 'job-1' })),
    createNodePlugin: vi.fn(async () => ({ plugin: true })),
    encryptHappPayload: vi.fn(async () => ({ encrypted: true })),
    executePluginExecutor: vi.fn(async () => ({ executed: true })),
    executeOpenApiOperation: vi.fn(async (operation, payload: Record<string, unknown>) => {
      if (operation.key === 'users.list') return { total: 1, items: [{ id: 1, username: 'alice' }] };
      if (operation.key === 'users.get') return { found: true, match: { id: 1, shortUuid: 'short-1', username: 'alice' } };
      return { resolved: payload };
    }),
  };
}

const supportedOperationCases = [
  {
    name: 'system.get_stats',
    request: { domain: 'system', operation: 'get_stats', payload: {} },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.getSystemStats).toHaveBeenCalledTimes(1);
    },
  },

  {
    name: 'system.get_metadata',
    request: { domain: 'system', operation: 'get_metadata', payload: {} },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.getMetadata).toHaveBeenCalledTimes(1);
    },
  },
  {
    name: 'system.get_health',
    request: { domain: 'system', operation: 'get_health', payload: {} },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.getSystemHealth).toHaveBeenCalledTimes(1);
    },
  },
  {
    name: 'system.get_bandwidth_stats',
    request: { domain: 'system', operation: 'get_bandwidth_stats', payload: {} },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.getBandwidthStats).toHaveBeenCalledTimes(1);
    },
  },
  {
    name: 'system.get_node_statistics',
    request: { domain: 'system', operation: 'get_node_statistics', payload: {} },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.getNodesStatistics).toHaveBeenCalledTimes(1);
    },
  },
  {
    name: 'system.get_nodes_metrics',
    request: { domain: 'system', operation: 'get_nodes_metrics', payload: {} },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.getNodesMetrics).toHaveBeenCalledTimes(1);
    },
  },
  {
    name: 'system.get_recap',
    request: { domain: 'system', operation: 'get_recap', payload: {} },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.getSystemRecap).toHaveBeenCalledTimes(1);
    },
  },
  {
    name: 'users.list',
    request: { domain: 'users', operation: 'list', payload: { size: 1000, start: 0 } },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'users.list' }),
        { size: 1000, start: 0 },
      );
    },
  },
  {
    name: 'users.get',
    request: { domain: 'users', operation: 'get', payload: { userId: 1 } },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'users.get' }), { userId: 1 });
    },
  },
  {
    name: 'users.create',
    request: {
      domain: 'users',
      operation: 'create',
      payload: { username: 'alice-user', expireAt: '2026-05-01T00:00:00.000Z' },
    },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'users.create' }), { username: 'alice-user', expireAt: '2026-05-01T00:00:00.000Z' });
    },
  },
  {
    name: 'users.disable',
    request: { domain: 'users', operation: 'disable', payload: { userId: 1 } },
    requiresConfirmation: true,
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'users.disable' }), { userId: 1 });
    },
  },
  {
    name: 'users.enable',
    request: { domain: 'users', operation: 'enable', payload: { userId: 1 } },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'users.enable' }), { userId: 1 });
    },
  },

  { name: 'metadata.upsert_node', request: { domain: 'metadata', operation: 'upsert_node', payload: { uuid: 'node-1', metadata: { zone: 'edge' } } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.upsertNodeMetadata).toHaveBeenCalledWith('node-1', { metadata: { zone: 'edge' } }); } },
  { name: 'templates.create', request: { domain: 'templates', operation: 'create', payload: { name: 'Default XRAY', templateType: 'XRAY_JSON' } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.createSubscriptionTemplate).toHaveBeenCalledWith({ name: 'Default XRAY', templateType: 'XRAY_JSON' }); } },
  { name: 'templates.update', request: { domain: 'templates', operation: 'update', payload: { uuid: 'template-1', name: 'Updated XRAY' } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.updateSubscriptionTemplate).toHaveBeenCalledWith('template-1', { name: 'Updated XRAY' }); } },
  { name: 'templates.delete', request: { domain: 'templates', operation: 'delete', payload: { uuid: 'template-1' } }, requiresConfirmation: true, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.deleteSubscriptionTemplate).toHaveBeenCalledWith('template-1'); } },
  { name: 'snippets.create', request: { domain: 'snippets', operation: 'create', payload: { name: 'headers', snippet: [{ key: 'value' }] } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.createSnippet).toHaveBeenCalledWith({ name: 'headers', snippet: [{ key: 'value' }] }); } },
  { name: 'snippets.update', request: { domain: 'snippets', operation: 'update', payload: { name: 'headers', snippet: [{ key: 'updated' }] } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.updateSnippet).toHaveBeenCalledWith('headers', { snippet: [{ key: 'updated' }] }); } },
  { name: 'snippets.delete', request: { domain: 'snippets', operation: 'delete', payload: { name: 'headers' } }, requiresConfirmation: true, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.deleteSnippet).toHaveBeenCalledWith('headers'); } },
  { name: 'public_subscriptions.get_info', request: { domain: 'public_subscriptions', operation: 'get_info', payload: { shortUuid: 'short-1' } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getPublicSubscriptionInfo).toHaveBeenCalledWith('short-1'); } },
  { name: 'public_subscriptions.get', request: { domain: 'public_subscriptions', operation: 'get', payload: { shortUuid: 'short-1' } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getPublicSubscription).toHaveBeenCalledWith('short-1'); } },
  { name: 'public_subscriptions.get_by_client_type', request: { domain: 'public_subscriptions', operation: 'get_by_client_type', payload: { shortUuid: 'short-1', clientType: 'singbox' } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getPublicSubscriptionByClientType).toHaveBeenCalledWith('short-1', 'singbox'); } },

  { name: 'subscriptions.list', request: { domain: 'subscriptions', operation: 'list', payload: { size: 25, start: 0 } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getSubscriptions).toHaveBeenCalledWith({ size: 25, start: 0 }); } },
  { name: 'subscriptions.get_by_username', request: { domain: 'subscriptions', operation: 'get_by_username', payload: { username: 'alice' } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getSubscriptionByUsername).toHaveBeenCalledWith('alice'); } },
  { name: 'subscriptions.get_by_short_uuid', request: { domain: 'subscriptions', operation: 'get_by_short_uuid', payload: { shortUuid: 'short-1' } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getSubscriptionByShortUuid).toHaveBeenCalledWith('short-1'); } },
  { name: 'subscriptions.get_by_id', request: { domain: 'subscriptions', operation: 'get_by_id', payload: { userId: 1 } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'subscriptions.get_by_id' }), { userId: 1 }); } },
  { name: 'subscriptions.get_raw_by_short_uuid', request: { domain: 'subscriptions', operation: 'get_raw_by_short_uuid', payload: { shortUuid: 'short-1', withDisabledHosts: true } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getRawSubscriptionByShortUuid).toHaveBeenCalledWith('short-1', { withDisabledHosts: true }); } },
  { name: 'subscriptions.get_subpage_config_by_short_uuid', request: { domain: 'subscriptions', operation: 'get_subpage_config_by_short_uuid', payload: { shortUuid: 'short-1', locale: 'en' } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getSubscriptionSubpageConfigByShortUuid).toHaveBeenCalledWith('short-1', { locale: 'en' }); } },
  { name: 'subscriptions.get_connection_keys_by_user_id', request: { domain: 'subscriptions', operation: 'get_connection_keys_by_user_id', payload: { userId: 1 } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'subscriptions.get_connection_keys_by_user_id' }), { userId: 1 }); } },
  { name: 'subscription_request_history.list', request: { domain: 'subscription_request_history', operation: 'list', payload: { size: 10, start: 5 } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getSubscriptionRequestHistory).toHaveBeenCalledWith({ size: 10, start: 5 }); } },
  { name: 'subscription_request_history.get_stats', request: { domain: 'subscription_request_history', operation: 'get_stats', payload: {} }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getSubscriptionRequestHistoryStats).toHaveBeenCalledTimes(1); } },
  { name: 'users.get_subscription_request_history', request: { domain: 'users', operation: 'get_subscription_request_history', payload: { userId: 1 } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'users.get_subscription_request_history' }), { userId: 1 }); } },
  { name: 'users.resolve', request: { domain: 'users', operation: 'resolve', payload: { id: 1 } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'users.resolve' }), { id: 1 }); } },
  { name: 'internal_squads.add_users', request: { domain: 'internal_squads', operation: 'add_users', payload: { uuid: SQUAD_UUID } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).not.toHaveBeenCalled(); } },
  { name: 'internal_squads.remove_users', request: { domain: 'internal_squads', operation: 'remove_users', payload: { uuid: SQUAD_UUID } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).not.toHaveBeenCalled(); } },
  { name: 'external_squads.add_users', request: { domain: 'external_squads', operation: 'add_users', payload: { uuid: SQUAD_UUID } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).not.toHaveBeenCalled(); } },
  { name: 'external_squads.remove_users', request: { domain: 'external_squads', operation: 'remove_users', payload: { uuid: SQUAD_UUID } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).not.toHaveBeenCalled(); } },
  { name: 'profiles.get', request: { domain: 'profiles', operation: 'get', payload: { uuid: 'profile-1' } }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.getProfile).toHaveBeenCalledWith('profile-1'); } },
  { name: 'keygen.generate_node_secret', request: { domain: 'keygen', operation: 'generate_node_secret', payload: {} }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'keygen.generate_node_secret' }), {}); } },
  { name: 'system.generate_x25519_keypairs', request: { domain: 'system', operation: 'generate_x25519_keypairs', payload: {} }, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'system.generate_x25519_keypairs' }), {}); } },
  { name: 'users.revoke_subscription', request: { domain: 'users', operation: 'revoke_subscription', payload: { userId: 1 } }, requiresConfirmation: true, assert: (panelClient: ReturnType<typeof createPanelClient>) => { expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(expect.objectContaining({ key: 'users.revoke_subscription' }), { userId: 1 }); } },
  {
    name: 'nodes.restart',
    request: { domain: 'nodes', operation: 'restart', payload: { uuid: 'node-1' } },
    requiresConfirmation: true,
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.restartNode).toHaveBeenCalledWith('node-1');
    },
  },
];

describe('Remnawave API client adapter', () => {
  test.each(supportedOperationCases)('binds $name to a concrete RemnawaveClient method', async ({ request, assert }) => {
    const panelClient = createPanelClient();
    const adapter = createRemnawaveApiClientAdapter(panelClient);

    const firstResult = await routeRemnawaveApiRequest(request, adapter);
    const result = isConfirmationRequired(firstResult)
      ? await routeRemnawaveApiRequest({ ...request, confirmToken: firstResult.error.token }, adapter)
      : firstResult;

    expect(result).not.toHaveProperty('error');
    assert(panelClient);
  });

  test('binds hosts.bulk_update preview/apply to getHosts and OpenAPI execution only on apply', async () => {
    const panelClient = createPanelClient();
    const adapter = createRemnawaveApiClientAdapter(panelClient);
    const hostUuid = '22222222-2222-4222-8222-222222222222';
    panelClient.getHosts.mockResolvedValue({ total: 1, items: [{ uuid: hostUuid, port: 80, enabled: true, fingerprint: 'fp-1' }] });

    const preview = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { uuids: [hostUuid], port: 443 } },
      adapter,
    );

    expect(preview).toMatchObject({ applyToken: expect.any(String) });
    expect(panelClient.getHosts).toHaveBeenCalledTimes(1);
    expect(panelClient.executeOpenApiOperation).not.toHaveBeenCalled();

    const apply = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_update', payload: { applyToken: (preview as { applyToken: string }).applyToken } },
      adapter,
    );

    expect(apply).toEqual({ updated: { resolved: { uuids: [hostUuid], port: 443 } } });
    expect(panelClient.getHosts).toHaveBeenCalledTimes(2);
    expect(panelClient.executeOpenApiOperation).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'hosts.bulk_update' }),
      { uuids: [hostUuid], port: 443 },
    );
  });

  test('does not expose excluded client methods through the runtime adapter', () => {
    const adapter = createRemnawaveApiClientAdapter(createPanelClient());

    expect(Object.keys(adapter).sort()).toEqual(expect.arrayContaining([
      'bulkSetHostPort',
      'createSnippet',
      'createSubscriptionTemplate',
      'createUser',
      'deleteSnippet',
      'deleteSubscriptionTemplate',
      'getNodeMetadata',
      'upsertNodeMetadata',
      'getPublicSubscriptionInfo',
      'getPublicSubscription',
      'getPublicSubscriptionByClientType',
      'getProfile',
      'getProfiles',
      'getSubscriptions',
      'getSubscriptionByUsername',
      'getSubscriptionByShortUuid',
      'getSubscriptionByUuid',
      'getRawSubscriptionByShortUuid',
      'getSubscriptionSubpageConfigByShortUuid',
      'getSubscriptionConnectionKeysByUuid',
      'getSubscriptionRequestHistory',
      'getSubscriptionRequestHistoryStats',
      'getUserSubscriptionRequestHistory',
      'listSnippets',
      'revokeUserSubscription',
      'updateSnippet',
      'updateSubscriptionTemplate',
    ]));
    expect(adapter).not.toHaveProperty('getAuthStatus');
    expect(adapter).not.toHaveProperty('listApiTokens');
    expect(adapter).not.toHaveProperty('fetchIpsForUser');
    expect(adapter).not.toHaveProperty('createNodePlugin');
    expect(adapter).not.toHaveProperty('getKeygenMaterial');
    expect(adapter).not.toHaveProperty('generateX25519');
    expect(adapter).not.toHaveProperty('encryptHappPayload');
    expect(adapter).not.toHaveProperty('executePluginExecutor');
  });

  test('excluded domains and legacy grouped operations return unsupported before excluded spies can be called', async () => {
    const panelClient = createPanelClient();
    const adapter = createRemnawaveApiClientAdapter(panelClient);

    const requests = [
      { domain: 'auth', operation: 'status', payload: {} },
      { domain: 'tokens', operation: 'list', payload: {} },
      { domain: 'ip_control', operation: 'submit_user_fetch_job', payload: { uuid: 'user-1' } },
      { domain: 'node_plugins', operation: 'execute_plugin_executor', payload: { command: 'block' } },
      { domain: 'system', operation: 'encrypt_happ_payload', payload: {} },
      { domain: 'system', operation: 'debug_srr_matcher', payload: {} },
      { domain: 'users', operation: 'manage_lifecycle', payload: { action: 'disable', uuid: 'user-1' } },
      { domain: 'nodes', operation: 'manage_maintenance', payload: { action: 'restart', uuid: 'node-1' } },
    ];

    for (const request of requests) {
      const result = await routeRemnawaveApiRequest(request, adapter);
      expect(result).toMatchObject({ error: { kind: 'unsupported_operation' } });
    }

    expect(panelClient.getAuthStatus).not.toHaveBeenCalled();
    expect(panelClient.listApiTokens).not.toHaveBeenCalled();
    expect(panelClient.fetchIpsForUser).not.toHaveBeenCalled();
    expect(panelClient.createNodePlugin).not.toHaveBeenCalled();
    expect(panelClient.encryptHappPayload).not.toHaveBeenCalled();
    expect(panelClient.executePluginExecutor).not.toHaveBeenCalled();
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
