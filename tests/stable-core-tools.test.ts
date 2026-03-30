import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { createStableCoreTools } from '../src/tools/index.js';

const fixturesDir = path.resolve(import.meta.dirname, '..', 'fixtures', 'contracts');

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'));
}

describe('stable core tools', () => {
  test('exposes handlers for every advertised stable read-only tool and resource', () => {
    const stableCore = createStableCoreTools({
      client: {
        getUsers: async () => ({ total: 0, items: [] }),
        resolveUser: async () => ({ found: false, match: null }),
        getNodes: async () => ({ items: [] }),
        getSystemStats: async () => ({
          cpu: { cores: 0 },
          memory: { totalBytes: 0, freeBytes: 0, usedBytes: 0 },
          uptimeSeconds: 0,
          generatedAtUnixMs: 0,
          users: { total: 0, active: 0, disabled: 0, limited: 0, expired: 0 },
          online: { now: 0, lastDay: 0, lastWeek: 0, never: 0 },
          nodes: { totalOnlineUsers: 0, lifetimeBytes: 0n },
        }),
        getSystemHealth: async () => ({ instances: [] }),
        getSubscriptions: async () => ({ items: [] }),
      },
    });

    expect(stableCore.tools.map((tool) => tool.name)).toEqual([
      'users_list',
      'users_resolve',
      'nodes_list',
      'system_get_stats',
      'system_get_health',
      'subscriptions_list',
      'users_mutate_subscription',
      'users_mutate_squads',
      'advanced_get_metadata',
      'advanced_list_node_plugins',
      'advanced_get_bandwidth_stats',
      'advanced_get_hwid_inspection',
    ]);
    expect(stableCore.resources.map((resource) => resource.uri)).toEqual([
      'remnawave://panel/statistics',
      'remnawave://nodes/status',
      'remnawave://system/health',
    ]);
  });

  test('returns operator-friendly normalized results for fixture-backed stable tools and resources', async () => {
    const users = readFixture('users.json');
    const usersResolve = readFixture('users_resolve.json');
    const nodes = readFixture('nodes.json');
    const stats = readFixture('system_stats.json');
    const health = readFixture('system_health.json');
    const subscriptions = readFixture('subscriptions.json');
    const metadata = readFixture('metadata.json');
    const nodePlugins = readFixture('node_plugins.json');
    const bandwidthStats = readFixture('bandwidth_stats.json');
    const hwid = readFixture('hwid.json');

    const stableCore = createStableCoreTools({
      client: {
        getUsers: async () => users,
        resolveUser: async () => usersResolve,
        getNodes: async () => nodes,
        getSystemStats: async () => stats,
        getSystemHealth: async () => health,
        getSubscriptions: async () => subscriptions,
        getMetadata: async () => metadata,
        getNodePlugins: async () => nodePlugins,
        getBandwidthStats: async () => bandwidthStats,
        getHwidInspection: async () => hwid,
      },
    });

    const usersList = await stableCore.callTool('users_list', {});
    expect(usersList.total).toBe(2691);
    expect(usersList.items[0]).toMatchObject({
      status: 'ACTIVE',
      squads: { internalNames: ['PLAN-PRO'] },
    });
    expect(usersList.items[0]).not.toHaveProperty('email');
    expect(usersList.items[0]).not.toHaveProperty('trojanPassword');

    const resolvedUser = await stableCore.callTool('users_resolve', { uuid: 'ignored-for-fixture' });
    expect(resolvedUser).toEqual({
      found: true,
      match: {
        uuid: '<REDACTED>',
        shortUuid: '<REDACTED>',
        username: '<REDACTED>',
      },
    });

    const nodesList = await stableCore.callTool('nodes_list', {});
    expect(nodesList.items[0]).toMatchObject({
      name: 'nl-1',
      endpoint: 'nl-1.nodes.redivo.ru:2222',
      connection: { state: 'connected' },
    });
    expect(nodesList.items[0]).not.toHaveProperty('rawHosts');

    const systemStats = await stableCore.callTool('system_get_stats', {});
    expect(systemStats.summary).toEqual({
      usersTotal: 2691,
      usersOnlineNow: 421,
      nodesOnlineUsers: 417,
      cpuCores: 2,
    });
    expect(systemStats.stats.nodes.lifetimeBytes).toBe(71674855442882n);

    const systemHealth = await stableCore.callTool('system_get_health', {});
    expect(systemHealth.summary).toEqual({
      instances: 3,
      instanceTypes: ['api', 'processor', 'scheduler'],
      maxEventLoopDelayMs: 20.201005788617888,
    });

    const subscriptionsList = await stableCore.callTool('subscriptions_list', {});
    expect(subscriptionsList.total).toBeGreaterThan(0);
    expect(subscriptionsList.items[0]).toMatchObject({
      lookupFound: true,
      user: {
        status: 'ACTIVE',
      },
    });

    await expect(stableCore.readResource('remnawave://panel/statistics')).resolves.toEqual(systemStats);
    await expect(stableCore.readResource('remnawave://nodes/status')).resolves.toEqual(nodesList);
    await expect(stableCore.readResource('remnawave://system/health')).resolves.toEqual(systemHealth);

    const metadataResult = await stableCore.callTool('advanced_get_metadata', {});
    expect(metadataResult.version).toBe('2.7.3');
    expect(metadataResult.git.backend.branch).toBe('main');

    const nodePluginsResult = await stableCore.callTool('advanced_list_node_plugins', {});
    expect(nodePluginsResult.total).toBe(1);
    expect(nodePluginsResult.plugins[0]).toMatchObject({
      name: 'torrent-blocker',
      viewPosition: 1,
      hasConfig: false,
    });

    const bandwidthStatsResult = await stableCore.callTool('advanced_get_bandwidth_stats', {});
    expect(bandwidthStatsResult.windows.currentYear.current).toBe('65.19 TiB');
    expect(bandwidthStatsResult.summary.lastSevenDaysDifference).toBe('-3.54 TiB');

    const hwidInspectionResult = await stableCore.callTool('advanced_get_hwid_inspection', {});
    expect(hwidInspectionResult.summary.totalUniqueDevices).toBe(1975);
    expect(hwidInspectionResult.summary.topPlatform).toEqual({
      platform: 'iOS',
      count: 1282,
    });
  });

  test('rejects unsupported stable-core calls cleanly', async () => {
    const stableCore = createStableCoreTools({
      client: {
        getUsers: async () => ({ total: 0, items: [] }),
        resolveUser: async () => ({ found: false, match: null }),
        getNodes: async () => ({ items: [] }),
        getSystemStats: async () => ({
          cpu: { cores: 0 },
          memory: { totalBytes: 0, freeBytes: 0, usedBytes: 0 },
          uptimeSeconds: 0,
          generatedAtUnixMs: 0,
          users: { total: 0, active: 0, disabled: 0, limited: 0, expired: 0 },
          online: { now: 0, lastDay: 0, lastWeek: 0, never: 0 },
          nodes: { totalOnlineUsers: 0, lifetimeBytes: 0n },
        }),
        getSystemHealth: async () => ({ instances: [] }),
        getSubscriptions: async () => ({ items: [] }),
      },
    });

    await expect(stableCore.callTool('bulk_actions_plan', {})).rejects.toThrow('Unknown stable tool');
    await expect(stableCore.callTool('config_profiles_list', {})).rejects.toThrow('Unknown stable tool');
    await expect(stableCore.callTool('squads_list', {})).rejects.toThrow('Unknown stable tool');
    await expect(stableCore.callTool('subscription_page_configs_list', {})).rejects.toThrow('Unknown stable tool');
    await expect(stableCore.callTool('ip_control_list', {})).rejects.toThrow('Unknown stable tool');
    await expect(stableCore.callTool('recap_get', {})).rejects.toThrow('Unknown stable tool');
    await expect(stableCore.callTool('hosts_list', {})).rejects.toThrow('Unknown stable tool');
    await expect(stableCore.readResource('remnawave://metadata')).rejects.toThrow('Unknown stable resource');
  });
});
