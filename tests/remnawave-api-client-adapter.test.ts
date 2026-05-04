import { describe, expect, test, vi } from 'vitest';

import { createRemnawaveApiClientAdapter } from '../src/remnawave-api/client-adapter.js';
import { routeRemnawaveApiRequest } from '../src/remnawave-api/router.js';

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
    getAuthStatus: vi.fn(async () => ({ auth: true })),
    listApiTokens: vi.fn(async () => ({ tokens: [] })),
    fetchIpsForUser: vi.fn(async () => ({ jobId: 'job-1' })),
    createNodePlugin: vi.fn(async () => ({ plugin: true })),
    getKeygenMaterial: vi.fn(async () => ({ key: true })),
    generateX25519: vi.fn(async () => ({ publicKey: 'public' })),
    encryptHappPayload: vi.fn(async () => ({ encrypted: true })),
    executePluginExecutor: vi.fn(async () => ({ executed: true })),
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
    name: 'users.list',
    request: { domain: 'users', operation: 'list', payload: {} },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.getUsers).toHaveBeenCalledTimes(1);
    },
  },
  {
    name: 'users.get_by_uuid',
    request: { domain: 'users', operation: 'get_by_uuid', payload: { uuid: 'user-1' } },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.resolveUser).toHaveBeenCalledWith('user-1');
    },
  },
  {
    name: 'users.create_user',
    request: {
      domain: 'users',
      operation: 'create_user',
      payload: { username: 'alice-user', expireAt: '2026-05-01T00:00:00.000Z' },
    },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.createUser).toHaveBeenCalledWith({ username: 'alice-user', expireAt: '2026-05-01T00:00:00.000Z' });
    },
  },
  {
    name: 'users.disable',
    request: { domain: 'users', operation: 'disable', payload: { uuid: 'user-1' } },
    requiresConfirmation: true,
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.setUserState).toHaveBeenCalledWith('user-1', 'disable', undefined);
    },
  },
  {
    name: 'users.enable',
    request: { domain: 'users', operation: 'enable', payload: { uuid: 'user-1' } },
    assert: (panelClient: ReturnType<typeof createPanelClient>) => {
      expect(panelClient.setUserState).toHaveBeenCalledWith('user-1', 'enable', undefined);
    },
  },
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

  test('binds hosts.bulk_set_port preview/apply to getHosts and bulkSetHostPort only on apply', async () => {
    const panelClient = createPanelClient();
    const adapter = createRemnawaveApiClientAdapter(panelClient);

    const preview = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_set_port', payload: { hostUuids: ['host-1'], port: 443 } },
      adapter,
    );

    expect(preview).toMatchObject({ applyToken: expect.any(String) });
    expect(panelClient.getHosts).toHaveBeenCalledTimes(1);
    expect(panelClient.bulkSetHostPort).not.toHaveBeenCalled();

    const apply = await routeRemnawaveApiRequest(
      { domain: 'hosts', operation: 'bulk_set_port', payload: { applyToken: (preview as { applyToken: string }).applyToken } },
      adapter,
    );

    expect(apply).toEqual({ updated: { hostUuids: ['host-1'], port: 443, updated: true } });
    expect(panelClient.getHosts).toHaveBeenCalledTimes(2);
    expect(panelClient.bulkSetHostPort).toHaveBeenCalledWith(['host-1'], 443);
  });

  test('does not expose excluded client methods through the runtime adapter', () => {
    const adapter = createRemnawaveApiClientAdapter(createPanelClient());

    expect(Object.keys(adapter).sort()).toEqual([
      'bulkSetHostPort',
      'createUser',
      'getHosts',
      'getSystemStats',
      'getUsers',
      'resolveUser',
      'restartNode',
      'setUserState',
    ]);
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
      { domain: 'keygen', operation: 'generate', payload: {} },
      { domain: 'system', operation: 'generate_x25519', payload: {} },
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
    expect(panelClient.getKeygenMaterial).not.toHaveBeenCalled();
    expect(panelClient.generateX25519).not.toHaveBeenCalled();
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
