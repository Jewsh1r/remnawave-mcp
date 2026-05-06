import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test, vi } from 'vitest';

import {
  RemnawaveApiError,
  RemnawaveContractDriftError,
  RemnawaveClient,
  normalizeBandwidthStatsResponse,
  normalizeBillingProvidersResponse,
  normalizeExternalSquadsResponse,
  normalizeHwidInspectionResponse,
  normalizeHostsResponse,
  normalizeInternalSquadsResponse,
  normalizeMetadataResponse,
  normalizeProfileResponse,
  normalizeNodesResponse,
  normalizeNodePluginsResponse,
  normalizeSubscriptionsResponse,
  normalizeSystemHealthResponse,
  normalizeSystemStatsResponse,
  normalizeUsersResolveResponse,
  normalizeUsersResponse,
} from '../src/client/index.js';
import { REMNAWAVE_OPERATION_INVENTORY } from '../src/remnawave-api/generated/operation-inventory.js';

const fixturesDir = path.resolve(import.meta.dirname, '..', 'fixtures', 'contracts');

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'));
}

describe('normalization layer', () => {
  test('normalizes nodes fixture into stable internal shape', () => {
    const normalized = normalizeNodesResponse(readFixture('nodes.json'));

    expect(normalized.items.length).toBeGreaterThan(0);
    expect(normalized.items[0]).toMatchObject({
      name: 'nl-1',
      endpoint: 'nl-1.nodes.example.test:2222',
      connection: {
        state: 'connected',
      },
      traffic: {
        usedBytes: 21677431006187,
        limitBytes: 0,
        trackingEnabled: true,
      },
      system: {
        cpuCores: 1,
        memoryTotalBytes: 2063589376,
      },
      versions: {
        node: '2.7.0',
        xray: '26.3.27',
      },
    });
    expect(normalized.items[0]?.inbounds[0]).toMatchObject({
      tag: 'BRIDGE_IN_NL',
      protocol: 'vless',
      network: 'xhttp',
      security: 'reality',
      port: 2443,
    });
    expect(normalized.items[0]).not.toHaveProperty('rawHosts');
  });

  test('rejects stale node payloads that rely on removed rawHosts fields', () => {
    expect(() =>
      normalizeNodesResponse({
        response: [
          {
            uuid: 'node-1',
            name: 'legacy-node',
            address: 'legacy.example.test',
            port: 443,
            rawHosts: ['legacy.example.test'],
          },
        ],
      }),
    ).toThrowError(RemnawaveContractDriftError);
  });

  test('normalizes users fixture into stable internal shape', () => {
    const normalized = normalizeUsersResponse(readFixture('users.json'));

    expect(normalized.total).toBe(2691);
    expect(normalized.items[0]).toMatchObject({
      status: 'ACTIVE',
      traffic: {
        usedBytes: 0,
        lifetimeUsedBytes: 0,
        limitBytes: 0,
        strategy: 'NO_RESET',
      },
      squads: {
        internalNames: ['PLAN-PRO'],
      },
    });
  });

  test('normalizes users resolve fixture into stable read-only lookup shape', () => {
    const normalized = normalizeUsersResolveResponse(readFixture('users_resolve.json'));

    expect(normalized).toEqual({
      found: true,
      match: {
        uuid: '<REDACTED>',
        shortUuid: '<REDACTED>',
        username: '<REDACTED>',
      },
    });
  });

  test('normalizes subscriptions fixture into stable internal shape', () => {
    const normalized = normalizeSubscriptionsResponse(readFixture('subscriptions.json'));

    expect(normalized.items.length).toBeGreaterThan(0);
    expect(normalized.items[0]).toMatchObject({
      lookupFound: true,
      user: {
        daysLeft: 13,
        usedBytes: 637087700,
        limitBytes: 0,
        isActive: true,
        status: 'ACTIVE',
      },
    });
    expect(normalized.items[0]?.links.length).toBeGreaterThan(0);
  });

  test('normalizes system stats fixture without stale cpuCount assumptions', () => {
    const normalized = normalizeSystemStatsResponse(readFixture('system_stats.json'));

    expect(normalized).toEqual({
      cpu: {
        cores: 2,
      },
      memory: {
        totalBytes: 4105080832,
        freeBytes: 1357496320,
        usedBytes: 2747584512,
      },
      uptimeSeconds: 712368.03,
      generatedAtUnixMs: 1774856966386,
      users: {
        total: 2691,
        active: 1241,
        disabled: 731,
        limited: 0,
        expired: 719,
      },
      online: {
        now: 421,
        lastDay: 896,
        lastWeek: 1088,
        never: 1311,
      },
      nodes: {
        totalOnlineUsers: 417,
        lifetimeBytes: 71674855442882n,
      },
    });
  });

  test('rejects stale system stats payloads that still use cpuCount', () => {
    expect(() =>
      normalizeSystemStatsResponse({
        response: {
          cpuCount: 8,
          memory: { total: 1024, free: 512, used: 512 },
          uptime: 1,
          timestamp: 1,
          users: { statusCounts: { ACTIVE: 1, DISABLED: 0, LIMITED: 0, EXPIRED: 0 }, totalUsers: 1 },
          onlineStats: { onlineNow: 0, lastDay: 0, lastWeek: 0, neverOnline: 0 },
          nodes: { totalOnline: 0, totalBytesLifetime: '0' },
        },
      }),
    ).toThrowError(RemnawaveContractDriftError);
  });

  test('normalizes system health fixture into runtime instance metrics', () => {
    const normalized = normalizeSystemHealthResponse(readFixture('system_health.json'));

    expect(normalized.instances).toHaveLength(3);
    expect(normalized.instances[0]).toMatchObject({
      type: 'api',
      pid: 125,
      activeHandles: 29,
      eventLoopDelayMs: 20.201005788617888,
    });
  });

  test('normalizes bandwidth stats fixture from replacement route', () => {
    const normalized = normalizeBandwidthStatsResponse(readFixture('bandwidth_stats.json'));

    expect(normalized.windows).toEqual({
      lastTwoDays: {
        current: '535.87 GiB',
        previous: '2.69 TiB',
        difference: '-2.17 TiB',
      },
      lastSevenDays: {
        current: '17.85 TiB',
        previous: '21.39 TiB',
        difference: '-3.54 TiB',
      },
      lastThirtyDays: {
        current: '60.16 TiB',
        previous: '5.03 TiB',
        difference: '55.13 TiB',
      },
      calendarMonth: {
        current: '60.16 TiB',
        previous: '5.03 TiB',
        difference: '55.13 TiB',
      },
      currentYear: {
        current: '65.19 TiB',
        previous: '0',
        difference: '65.19 TiB',
      },
    });
  });

  test('normalizes metadata fixture with optional git/frontend details intact', () => {
    const normalized = normalizeMetadataResponse(readFixture('metadata.json'));

    expect(normalized).toMatchObject({
      version: '2.7.4',
      build: {
        time: '2026-03-29T22:11:10Z',
        number: '207',
      },
      git: {
        backend: {
          branch: 'main',
        },
        frontend: {},
      },
    });
  });

  test('normalizes node plugins fixture into advanced inventory shape', () => {
    const normalized = normalizeNodePluginsResponse(readFixture('node_plugins.json'));

    expect(normalized.total).toBe(1);
    expect(normalized.plugins[0]).toEqual({
      uuid: '<REDACTED>',
      viewPosition: 1,
      name: 'torrent-blocker',
      hasConfig: false,
    });
  });

  test('normalizes profile inbounds when activeSquads contains string or partial entries', () => {
    const normalized = normalizeProfileResponse({
      response: {
        uuid: 'profile-1',
        name: 'Bridge-V2-EU4',
        config: {},
        inbounds: [
          {
            uuid: 'inbound-1',
            profileUuid: 'profile-1',
            tag: 'VLESS_MAIN',
            type: 'vless',
            network: 'tcp',
            security: 'reality',
            port: 443,
            activeSquads: [
              'internal-squad-1',
              { name: 'Internal Squad 2' },
              { uuid: 'internal-squad-3' },
            ],
          },
        ],
        attachedNodes: [],
      },
    });

    expect(normalized.inbounds[0]?.activeSquads).toEqual([
      { uuid: 'internal-squad-1', name: 'internal-squad-1' },
      { uuid: 'Internal Squad 2', name: 'Internal Squad 2' },
      { uuid: 'internal-squad-3', name: 'internal-squad-3' },
    ]);
  });

  test('normalizes hosts when nodes contains UUID strings instead of full objects', () => {
    const normalized = normalizeHostsResponse({
      response: {
        items: [
          {
            uuid: 'host-1',
            remark: 'Bridge DE',
            address: 'de.example.com',
            port: 443,
            isDisabled: false,
            isHidden: true,
            sni: 'de.example.com',
            securityLayer: 'reality',
            fingerprint: 'chrome',
            viewPosition: 2,
            inbound: {
              configProfileUuid: 'profile-1',
              configProfileInboundUuid: 'inbound-1',
              tag: 'VLESS_MAIN',
            },
            nodes: ['node-1', 'node-2'],
          },
        ],
      },
    });

    expect(normalized.items[0]).toMatchObject({
      uuid: 'host-1',
      nodes: [
        { uuid: 'node-1', name: 'node-1' },
        { uuid: 'node-2', name: 'node-2' },
      ],
    });
  });

  test('normalizes billing providers when key drifts into an object but uuid remains stable', () => {
    const normalized = normalizeBillingProvidersResponse({
      response: {
        providers: [
          {
            uuid: 'provider-1',
            key: { value: 'hetzner' },
            name: 'Hetzner EU',
            enabled: true,
            isDefault: false,
          },
        ],
      },
    });

    expect(normalized.items).toEqual([
      {
        uuid: 'provider-1',
        key: 'hetzner',
        name: 'Hetzner EU',
        enabled: true,
        isDefault: false,
        support: 'local_service_evidence_only',
      },
    ]);
  });

  test('normalizes hosts when inbound uuid only exists on nested object', () => {
    const normalized = normalizeHostsResponse({
      response: {
        items: [
          {
            uuid: 'host-2',
            remark: 'Bridge FR',
            address: 'fr.example.com',
            port: 8443,
            isDisabled: false,
            isHidden: false,
            inbound: {
              configProfileUuid: 'profile-2',
              configProfileInboundUuid: { uuid: 'inbound-2' },
              configProfileInbound: {
                uuid: 'inbound-2',
                tag: 'VLESS_FR',
              },
            },
            nodes: [],
          },
        ],
      },
    });

    expect(normalized.items[0]?.inbound).toMatchObject({
      configProfileUuid: 'profile-2',
      configProfileInboundUuid: 'inbound-2',
      tag: 'VLESS_FR',
    });
  });

  test('normalizes nodes when active inbounds drift to configProfile.inbounds', () => {
    const normalized = normalizeNodesResponse({
      response: [
        {
          uuid: 'node-2',
          name: 'fr-1',
          address: 'fr-1.nodes.example.com',
          port: 443,
          tags: [],
          isDisabled: false,
          isConnected: true,
          trafficLimitBytes: 0,
          trafficUsedBytes: 0,
          isTrafficTrackingActive: true,
          consumptionMultiplier: 1,
          system: {
            info: { cpus: 2, memoryTotal: 4096, cpuModel: 'x86' },
            stats: { memoryUsed: 1024, memoryFree: 3072, uptime: 100, loadAvg: [0.1] },
          },
          versions: { node: '2.7.4', xray: '1.8.0' },
          configProfile: {
            inbounds: [
              {
                tag: 'BRIDGE_FR',
                type: 'vless',
                network: 'tcp',
                security: 'reality',
                port: 443,
              },
            ],
          },
        },
      ],
    });

    expect(normalized.items[0]?.inbounds).toEqual([
      {
        tag: 'BRIDGE_FR',
        protocol: 'vless',
        network: 'tcp',
        security: 'reality',
        port: 443,
      },
    ]);
  });

  test('normalizes node plugins when uuid drifts into nested plugin object', () => {
    const normalized = normalizeNodePluginsResponse({
      response: {
        total: 1,
        nodePlugins: [
          {
            uuid: { value: 'plugin-2' },
            plugin: { uuid: 'plugin-2' },
            viewPosition: 2,
            name: 'torrent-blocker',
            pluginConfig: { enabled: true },
          },
        ],
      },
    });

    expect(normalized.plugins).toEqual([
      {
        uuid: 'plugin-2',
        viewPosition: 2,
        name: 'torrent-blocker',
        hasConfig: true,
      },
    ]);
  });

  test('normalizes internal squads fixture into stable internal shape', () => {
    const normalized = normalizeInternalSquadsResponse({
      response: {
        total: 1,
        internalSquads: [
          {
            uuid: 'internal-1',
            name: 'PLAN-PRO',
            viewPosition: 1,
            access: {
              inboundTags: ['VLESS_MAIN'],
            },
            membership: {
              totalMembers: 2,
              members: [{ uuid: 'user-1', username: 'alice' }],
            },
            accessibleNodes: [{ uuid: 'node-1', name: 'nl-1' }],
          },
        ],
      },
    });

    expect(normalized.total).toBe(1);
    expect(normalized.items[0]).toMatchObject({
      uuid: 'internal-1',
      name: 'PLAN-PRO',
    });
  });

  test('normalizes external squads when template overrides use nested template objects', () => {
    const normalized = normalizeExternalSquadsResponse({
      response: {
        items: [
          {
            uuid: 'external-9',
            name: 'Android Delivery',
            memberCount: 1,
            members: [{ uuid: 'user-1', username: 'alice' }],
            overrides: {
              templateOverrides: [
                {
                  templateType: 'XRAY_JSON',
                  template: {
                    uuid: 'tpl-1',
                    name: 'Happ Android',
                  },
                },
              ],
              settingsOverrides: {
                announce: 'hello',
              },
            },
          },
        ],
      },
    });

    expect(normalized).toMatchObject({
      total: 1,
      items: [
        {
          uuid: 'external-9',
          name: 'Android Delivery',
          deliveryPolicy: {
            templateOverrides: [
              {
                templateType: 'XRAY_JSON',
                templateName: 'Happ Android',
              },
            ],
            settingsOverrides: {
              announce: 'hello',
            },
          },
        },
      ],
    });
  });

  test('normalizes external squads when panel payload uses templates plus subscriptionSettings', () => {
    const normalized = normalizeExternalSquadsResponse({
      response: {
        total: 1,
        externalSquads: [
          {
            uuid: 'external-10',
            viewPosition: 10,
            name: 'Iran Delivery',
            info: {
              membersCount: 3,
            },
            templates: [
              {
                templateUuid: 'tpl-xray-1',
                templateType: 'XRAY_JSON',
              },
            ],
            subscriptionSettings: {
              profileTitle: 'Iran',
              randomizeHosts: true,
            },
            hostOverrides: null,
            responseHeaders: null,
            hwidSettings: null,
            customRemarks: null,
            subpageConfigUuid: null,
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
          },
        ],
      },
    });

    expect(normalized).toMatchObject({
      total: 1,
      items: [
        {
          uuid: 'external-10',
          name: 'Iran Delivery',
          position: 10,
          membership: {
            totalMembers: 3,
          },
          deliveryPolicy: {
            templateOverrides: [
              {
                templateType: 'XRAY_JSON',
                templateName: 'tpl-xray-1',
              },
            ],
            settingsOverrides: {
              profileTitle: 'Iran',
              randomizeHosts: true,
            },
          },
        },
      ],
    });
  });

  test('client reads external squad by uuid from single-item response shape', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          response: {
            uuid: 'external-10',
            viewPosition: 10,
            name: 'Iran Delivery',
            info: {
              membersCount: 3,
            },
            templates: [
              {
                templateUuid: 'tpl-xray-1',
                templateType: 'XRAY_JSON',
              },
            ],
            subscriptionSettings: {
              profileTitle: 'Iran',
              randomizeHosts: true,
            },
            hostOverrides: null,
            responseHeaders: null,
            hwidSettings: null,
            customRemarks: null,
            subpageConfigUuid: null,
            createdAt: '2026-04-03T00:00:00.000Z',
            updatedAt: '2026-04-03T00:00:00.000Z',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock as typeof fetch,
    });

    const squad = await client.getExternalSquadByUuid('external-10');

    expect(squad).toMatchObject({
      uuid: 'external-10',
      name: 'Iran Delivery',
      membership: {
        totalMembers: 3,
      },
      deliveryPolicy: {
        templateOverrides: [
          {
            templateType: 'XRAY_JSON',
            templateName: 'tpl-xray-1',
          },
        ],
        settingsOverrides: {
          profileTitle: 'Iran',
          randomizeHosts: true,
        },
      },
    });
  });

  test('normalizes hwid fixture into advanced platform/app inspection shape', () => {
    const normalized = normalizeHwidInspectionResponse(readFixture('hwid.json'));

    expect(normalized.stats).toEqual({
      totalUniqueDevices: 1975,
      totalHwidDevices: 2092,
      averageHwidDevicesPerUser: 1.5,
    });
    expect(normalized.byPlatform[0]).toEqual({ name: 'iOS', count: 1282 });
    expect(normalized.byApp[0]).toEqual({ name: 'Happ', count: 1846 });
  });
});

describe('RemnawaveClient', () => {
  test('uses centralized replacement routes and normalizes responses', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(),
    );
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify((readFixture('bandwidth_stats.json') as { response: { body: unknown } }).response.body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    const normalized = await client.getBandwidthStats();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://panel.example.test/api/system/stats/bandwidth',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-value',
        }),
      }),
    );
    expect(normalized.windows.currentYear.current).toBe('65.19 TiB');
  });

  test('raises structured API errors for non-success responses', async () => {
    const authErrorFixture = readFixture('auth_error.json') as {
      response: { status: number; body: unknown };
    };
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(),
    );
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(authErrorFixture.response.body), {
        status: authErrorFixture.response.status,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'bad-token',
      fetch: fetchMock,
    });

    await expect(client.getSystemStats()).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });

  test('executes generated OpenAPI writes without leaking body fields into the query string', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ response: { ok: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const operation = REMNAWAVE_OPERATION_INVENTORY.operations.find((entry) => entry.key === 'profiles.update');

    if (operation?.status !== 'supported') {
      throw new Error('profiles.update operation fixture is missing.');
    }

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    await client.executeOpenApiOperation(operation, { uuid: 'profile-1', name: 'Edge profile' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://panel.example.test/api/config-profiles',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ uuid: 'profile-1', name: 'Edge profile' }),
      }),
    );
  });

  test('executes generated OpenAPI reads with only declared query parameters in the URL', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ response: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const operation = REMNAWAVE_OPERATION_INVENTORY.operations.find((entry) => entry.key === 'bandwidth_stats.list_nodes_usage');

    if (operation?.status !== 'supported') {
      throw new Error('bandwidth_stats.list_nodes_usage operation fixture is missing.');
    }

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    await client.executeOpenApiOperation(operation, {
      topNodesLimit: 5,
      start: '2026-05-01',
      end: '2026-05-06',
      ignoredBodyField: 'not-openapi-query',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://panel.example.test/api/bandwidth-stats/nodes?topNodesLimit=5&start=2026-05-01&end=2026-05-06',
      expect.objectContaining({
        method: 'GET',
        body: undefined,
      }),
    );
  });

  test('sends snippet delete body with name field', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ response: { deleted: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    await client.deleteSnippet('headers');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://panel.example.test/api/snippets',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ name: 'headers' }),
      }),
    );
  });

  test('posts user resolution lookups through the centralized adapter', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(),
    );
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify((readFixture('users_resolve.json') as { response: { body: unknown } }).response.body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    const resolved = await client.resolveUser('user-uuid');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://panel.example.test/api/users/resolve',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ uuid: 'user-uuid' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer token-value',
        }),
      }),
    );
    expect(resolved).toEqual({
      found: true,
      match: {
        uuid: '<REDACTED>',
        shortUuid: '<REDACTED>',
        username: '<REDACTED>',
      },
    });
  });

  test('patches user settings through centralized users mutation route', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(),
    );
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    await client.patchUserSettings('user-uuid', {
      status: 'ACTIVE',
      expireAt: '2026-04-01T00:00:00.000Z',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://panel.example.test/api/users',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          uuid: 'user-uuid',
          status: 'ACTIVE',
          expireAt: '2026-04-01T00:00:00.000Z',
        }),
      }),
    );
  });

  test('routes advanced node plugins and HWID inspection through centralized adapter', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify((readFixture('node_plugins.json') as { response: { body: unknown } }).response.body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify((readFixture('hwid.json') as { response: { body: unknown } }).response.body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    const plugins = await client.getNodePlugins();
    const hwid = await client.getHwidInspection();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://panel.example.test/api/node-plugins',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://panel.example.test/api/hwid/devices/stats',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(plugins.plugins[0]?.name).toBe('torrent-blocker');
    expect(hwid.stats.totalUniqueDevices).toBe(1975);
  });

  test('routes recap and request-history analytics through dedicated panel-backed endpoints', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          response: {
            totalUsers: 2691,
            activeUsers: 1241,
            inactiveUsers: 731,
            expiredUsers: 719,
            generatedAt: '2026-04-01T00:00:00.000Z',
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          response: [
            {
              requestedAt: '2026-04-01T01:00:00.000Z',
              source: 'telegram_bot',
              outcome: 'issued',
              subscriptionUrl: 'https://sub.example/alice',
              clientHints: ['ios'],
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          response: {
            totalRequests: 1,
            uniqueUsers: 1,
            issued: 1,
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    const recap = await client.getSystemRecap();
    const requestHistory = await client.getSubscriptionRequestHistory();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://panel.example.test/api/system/stats/recap',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://panel.example.test/api/subscription-request-history',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://panel.example.test/api/subscription-request-history/stats',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(recap).toMatchObject({
      totalUsers: 2691,
      activeUsers: 1241,
    });
    expect(requestHistory).toEqual({
      items: [
        {
          requestedAt: '2026-04-01T01:00:00.000Z',
          source: 'telegram_bot',
          outcome: 'issued',
          subscriptionUrl: 'https://sub.example/alice',
          clientHints: ['ios'],
        },
      ],
      stats: {
        totalRequests: 1,
        uniqueUsers: 1,
        issued: 1,
      },
    });
  });

  test('routes metrics and node-statistics analytics through distinct endpoints', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([{ nodeUuid: 'node-1', nodeName: 'nl-1', cpuLoad: 0.5 }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([{ nodeUuid: 'node-1', nodeName: 'nl-1', onlineUsers: 12 }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    const metrics = await client.getNodesMetrics();
    const statistics = await client.getNodesStatistics();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://panel.example.test/api/system/nodes/metrics',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://panel.example.test/api/system/stats/nodes',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(metrics).toEqual([{ nodeUuid: 'node-1', nodeName: 'nl-1', cpuLoad: 0.5 }]);
    expect(statistics).toEqual([{ nodeUuid: 'node-1', nodeName: 'nl-1', onlineUsers: 12 }]);
  });

  test('uses POST for torrent-blocker truncate endpoint at transport layer', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(),
    );
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    await client.truncateTorrentBlockerReports();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://panel.example.test/api/node-plugins/torrent-blocker/truncate',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  test('routes IP-control async submit and poll endpoints with explicit job-id semantics', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) => new Response(),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ jobId: 'job-user-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ jobId: 'job-node-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jobId: 'job-user-1',
          isCompleted: true,
          isFailed: false,
          progress: 100,
          result: { items: [] },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jobId: 'job-node-1',
          isCompleted: false,
          isFailed: false,
          progress: null,
          result: null,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ queued: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new RemnawaveClient({
      baseUrl: 'https://panel.example.test',
      apiToken: 'token-value',
      fetch: fetchMock,
    });

    const userJob = await client.fetchIpsForUser('user-1');
    const nodeJob = await client.fetchUsersIpsForNode('node-1');
    const userJobResult = await client.getUserIpsFetchJobResult('job-user-1');
    const nodeJobResult = await client.getNodeUsersIpsFetchJobResult('job-node-1');
    const drop = await client.dropConnections({ nodeUuid: 'node-1', userUuid: 'user-1' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://panel.example.test/api/ip-control/fetch-ips/user-1',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://panel.example.test/api/ip-control/fetch-users-ips/node-1',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://panel.example.test/api/ip-control/fetch-ips/result/job-user-1',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'https://panel.example.test/api/ip-control/fetch-users-ips/result/job-node-1',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      'https://panel.example.test/api/ip-control/drop-connections',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ nodeUuid: 'node-1', userUuid: 'user-1' }),
      }),
    );

    expect(userJob).toEqual({ jobId: 'job-user-1' });
    expect(nodeJob).toEqual({ jobId: 'job-node-1' });
    expect(userJobResult).toEqual({
      jobId: 'job-user-1',
      isCompleted: true,
      isFailed: false,
      progress: 100,
      result: { items: [] },
    });
    expect(nodeJobResult).toEqual({
      jobId: 'job-node-1',
      isCompleted: false,
      isFailed: false,
      progress: null,
      result: null,
    });
    expect(drop).toEqual({ queued: true });
  });
});
