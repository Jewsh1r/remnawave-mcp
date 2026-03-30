import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test, vi } from 'vitest';

import {
  RemnawaveApiError,
  RemnawaveContractDriftError,
  RemnawaveClient,
  normalizeBandwidthStatsResponse,
  normalizeHwidInspectionResponse,
  normalizeMetadataResponse,
  normalizeNodesResponse,
  normalizeNodePluginsResponse,
  normalizeSubscriptionsResponse,
  normalizeSystemHealthResponse,
  normalizeSystemStatsResponse,
  normalizeUsersResolveResponse,
  normalizeUsersResponse,
} from '../src/client/index.js';

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
      endpoint: 'nl-1.nodes.redivo.ru:2222',
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
      version: '2.7.3',
      build: {
        time: '2026-03-29T22:11:10Z',
        number: '206',
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
});
