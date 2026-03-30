import type {
  GetAllNodesCommand,
  GetAllSubscriptionsCommand,
  GetAllUsersCommand,
  GetBandwidthStatsCommand,
  GetMetadataCommand,
  GetRemnawaveHealthCommand,
  GetStatsCommand,
} from '@remnawave/backend-contract';

import { RemnawaveContractDriftError } from './errors.js';
import type {
  BandwidthWindow,
  NormalizedBandwidthStats,
  NormalizedMetadata,
  NormalizedNode,
  NormalizedResolvedUser,
  NormalizedNodesResponse,
  NormalizedSubscriptionItem,
  NormalizedSubscriptionsResponse,
  NormalizedSystemHealth,
  NormalizedSystemStats,
  NormalizedUser,
  NormalizedUsersResolveResponse,
  NormalizedUsersResponse,
  NormalizedHwidInspection,
  NormalizedNodePlugin,
  NormalizedNodePluginsResponse,
  UserStatus,
} from './types.js';

type JsonRecord = Record<string, unknown>;

interface CapturedFixtureEnvelope {
  readonly response?: {
    readonly body?: unknown;
  };
}

export function normalizeNodesResponse(payload: unknown): NormalizedNodesResponse {
  const body = unwrapFixtureBody(payload);
  const response = getRecord(body, 'nodes response body').response;
  const items = getArray(response, 'nodes.response').map((entry, index) =>
    normalizeNode(getRecord(entry, `nodes.response[${index}]`), `nodes.response[${index}]`),
  );
  return { items };
}

export function normalizeUsersResponse(payload: unknown): NormalizedUsersResponse {
  const body = unwrapFixtureBody(payload);
  const response = getRecord(getRecord(body, 'users response body').response, 'users.response');
  const items = getArray(response.users, 'users.response.users').map((entry, index) =>
    normalizeUser(getRecord(entry, `users.response.users[${index}]`), `users.response.users[${index}]`),
  );
  return {
    total: getNumber(response.total, 'users.response.total'),
    items,
  };
}

export function normalizeUsersResolveResponse(payload: unknown): NormalizedUsersResolveResponse {
  const body = unwrapFixtureBody(payload);
  const response = getRecord(getRecord(body, 'users resolve response body').response, 'users_resolve.response');

  return {
    found: true,
    match: normalizeResolvedUser(response, 'users_resolve.response'),
  };
}

export function normalizeSubscriptionsResponse(payload: unknown): NormalizedSubscriptionsResponse {
  const body = unwrapFixtureBody(payload);
  const response = getRecord(getRecord(body, 'subscriptions response body').response, 'subscriptions.response');
  const items = getArray(response.subscriptions, 'subscriptions.response.subscriptions').map((entry, index) =>
    normalizeSubscription(
      getRecord(entry, `subscriptions.response.subscriptions[${index}]`),
      `subscriptions.response.subscriptions[${index}]`,
    ),
  );
  return { items };
}

export function normalizeSystemStatsResponse(payload: unknown): NormalizedSystemStats {
  const body = unwrapFixtureBody(payload);
  const response = getRecord(getRecord(body, 'system stats response body').response, 'system_stats.response');

  if ('cpuCount' in response) {
    throw new RemnawaveContractDriftError(
      'Legacy cpuCount field is unsupported; use cpu.cores from /api/system/stats',
      'system_stats.response.cpuCount',
    );
  }

  const cpu = getRecord(response.cpu, 'system_stats.response.cpu');
  const memory = getRecord(response.memory, 'system_stats.response.memory');
  const users = getRecord(response.users, 'system_stats.response.users');
  const statusCounts = getRecord(users.statusCounts, 'system_stats.response.users.statusCounts');
  const onlineStats = getRecord(response.onlineStats, 'system_stats.response.onlineStats');
  const nodes = getRecord(response.nodes, 'system_stats.response.nodes');

  return {
    cpu: {
      cores: getNumber(cpu.cores, 'system_stats.response.cpu.cores'),
    },
    memory: {
      totalBytes: getNumber(memory.total, 'system_stats.response.memory.total'),
      freeBytes: getNumber(memory.free, 'system_stats.response.memory.free'),
      usedBytes: getNumber(memory.used, 'system_stats.response.memory.used'),
    },
    uptimeSeconds: getNumber(response.uptime, 'system_stats.response.uptime'),
    generatedAtUnixMs: getNumber(response.timestamp, 'system_stats.response.timestamp'),
    users: {
      total: getNumber(users.totalUsers, 'system_stats.response.users.totalUsers'),
      active: getNumber(statusCounts.ACTIVE, 'system_stats.response.users.statusCounts.ACTIVE'),
      disabled: getNumber(statusCounts.DISABLED, 'system_stats.response.users.statusCounts.DISABLED'),
      limited: getNumber(statusCounts.LIMITED, 'system_stats.response.users.statusCounts.LIMITED'),
      expired: getNumber(statusCounts.EXPIRED, 'system_stats.response.users.statusCounts.EXPIRED'),
    },
    online: {
      now: getNumber(onlineStats.onlineNow, 'system_stats.response.onlineStats.onlineNow'),
      lastDay: getNumber(onlineStats.lastDay, 'system_stats.response.onlineStats.lastDay'),
      lastWeek: getNumber(onlineStats.lastWeek, 'system_stats.response.onlineStats.lastWeek'),
      never: getNumber(onlineStats.neverOnline, 'system_stats.response.onlineStats.neverOnline'),
    },
    nodes: {
      totalOnlineUsers: getNumber(nodes.totalOnline, 'system_stats.response.nodes.totalOnline'),
      lifetimeBytes: getBigInt(nodes.totalBytesLifetime, 'system_stats.response.nodes.totalBytesLifetime'),
    },
  };
}

export function normalizeSystemHealthResponse(payload: unknown): NormalizedSystemHealth {
  const body = unwrapFixtureBody(payload);
  const response = getRecord(getRecord(body, 'system health response body').response, 'system_health.response');
  return {
    instances: getArray(response.runtimeMetrics, 'system_health.response.runtimeMetrics').map((entry, index) => {
      const metric = getRecord(entry, `system_health.response.runtimeMetrics[${index}]`);
      return {
        type: getString(metric.instanceType, `${index}.instanceType`),
        instanceId: getOptionalString(metric.instanceId),
        pid: getNumber(metric.pid, `${index}.pid`),
        rssBytes: getNumber(metric.rss, `${index}.rss`),
        heapUsedBytes: getNumber(metric.heapUsed, `${index}.heapUsed`),
        heapTotalBytes: getNumber(metric.heapTotal, `${index}.heapTotal`),
        activeHandles: getNumber(metric.activeHandles, `${index}.activeHandles`),
        uptimeSeconds: getNumber(metric.uptime, `${index}.uptime`),
        generatedAtUnixMs: getNumber(metric.timestamp, `${index}.timestamp`),
        eventLoopDelayMs: getNumber(metric.eventLoopDelayMs, `${index}.eventLoopDelayMs`),
        eventLoopP99Ms: getNumber(metric.eventLoopP99Ms, `${index}.eventLoopP99Ms`),
      };
    }),
  };
}

export function normalizeBandwidthStatsResponse(payload: unknown): NormalizedBandwidthStats {
  const body = unwrapFixtureBody(payload);
  const response = getRecord(getRecord(body, 'bandwidth response body').response, 'bandwidth.response');
  return {
    windows: {
      lastTwoDays: normalizeBandwidthWindow(response.bandwidthLastTwoDays, 'bandwidth.response.bandwidthLastTwoDays'),
      lastSevenDays: normalizeBandwidthWindow(
        response.bandwidthLastSevenDays,
        'bandwidth.response.bandwidthLastSevenDays',
      ),
      lastThirtyDays: normalizeBandwidthWindow(
        response.bandwidthLast30Days,
        'bandwidth.response.bandwidthLast30Days',
      ),
      calendarMonth: normalizeBandwidthWindow(
        response.bandwidthCalendarMonth,
        'bandwidth.response.bandwidthCalendarMonth',
      ),
      currentYear: normalizeBandwidthWindow(response.bandwidthCurrentYear, 'bandwidth.response.bandwidthCurrentYear'),
    },
  };
}

export function normalizeMetadataResponse(payload: unknown): NormalizedMetadata {
  const body = unwrapFixtureBody(payload);
  const response = getRecord(getRecord(body, 'metadata response body').response, 'metadata.response');
  const build = getRecord(response.build, 'metadata.response.build');
  const git = getRecord(response.git, 'metadata.response.git');
  const backend = getOptionalRecord(git.backend);
  const frontend = getOptionalRecord(git.frontend);

  return {
    version: getString(response.version, 'metadata.response.version'),
    build: {
      time: getOptionalString(build.time),
      number: getOptionalString(build.number),
    },
    git: {
      backend: {
        commitSha: getOptionalString(backend?.commitSha),
        branch: getOptionalString(backend?.branch),
        commitUrl: getOptionalString(backend?.commitUrl),
      },
      frontend: {
        commitSha: getOptionalString(frontend?.commitSha),
        branch: getOptionalString(frontend?.branch),
        commitUrl: getOptionalString(frontend?.commitUrl),
      },
    },
  };
}

export function normalizeNodePluginsResponse(payload: unknown): NormalizedNodePluginsResponse {
  const body = unwrapFixtureBody(payload);
  const response = getRecord(getRecord(body, 'node plugins response body').response, 'node_plugins.response');
  const plugins = getArray(response.nodePlugins, 'node_plugins.response.nodePlugins').map((entry, index) =>
    normalizeNodePlugin(getRecord(entry, `node_plugins.response.nodePlugins[${index}]`), `node_plugins.response.nodePlugins[${index}]`),
  );

  return {
    total: getNumber(response.total, 'node_plugins.response.total'),
    plugins,
  };
}

export function normalizeHwidInspectionResponse(payload: unknown): NormalizedHwidInspection {
  const body = unwrapFixtureBody(payload);
  const response = getRecord(getRecord(body, 'hwid response body').response, 'hwid.response');
  const stats = getRecord(response.stats, 'hwid.response.stats');

  return {
    byPlatform: getArray(response.byPlatform, 'hwid.response.byPlatform').map((entry, index) =>
      normalizeHwidCountEntry(getRecord(entry, `hwid.response.byPlatform[${index}]`), `hwid.response.byPlatform[${index}]`, 'platform'),
    ),
    byApp: getArray(response.byApp, 'hwid.response.byApp').map((entry, index) =>
      normalizeHwidCountEntry(getRecord(entry, `hwid.response.byApp[${index}]`), `hwid.response.byApp[${index}]`, 'app'),
    ),
    stats: {
      totalUniqueDevices: getNumber(stats.totalUniqueDevices, 'hwid.response.stats.totalUniqueDevices'),
      totalHwidDevices: getNumber(stats.totalHwidDevices, 'hwid.response.stats.totalHwidDevices'),
      averageHwidDevicesPerUser: getNumber(stats.averageHwidDevicesPerUser, 'hwid.response.stats.averageHwidDevicesPerUser'),
    },
  };
}

export type ContractAnchor = {
  readonly nodes: GetAllNodesCommand.Response;
  readonly users: GetAllUsersCommand.Response;
  readonly usersResolve: {
    readonly response: {
      readonly uuid: string;
      readonly shortUuid: string;
      readonly username: string;
    };
  };
  readonly subscriptions: GetAllSubscriptionsCommand.Response;
  readonly systemStats: GetStatsCommand.Response;
  readonly systemHealth: GetRemnawaveHealthCommand.Response;
  readonly bandwidthStats: GetBandwidthStatsCommand.Response;
  readonly metadata: GetMetadataCommand.Response;
};

function normalizeNodePlugin(nodePlugin: JsonRecord, path: string): NormalizedNodePlugin {
  return {
    uuid: getString(nodePlugin.uuid, `${path}.uuid`),
    viewPosition: getNumber(nodePlugin.viewPosition, `${path}.viewPosition`),
    name: getString(nodePlugin.name, `${path}.name`),
    hasConfig: nodePlugin.pluginConfig != null,
  };
}

function normalizeHwidCountEntry(
  entry: JsonRecord,
  path: string,
  key: 'platform' | 'app',
): { readonly name: string; readonly count: number } {
  return {
    name: getString(entry[key], `${path}.${key}`),
    count: getNumber(entry.count, `${path}.count`),
  };
}

function normalizeResolvedUser(user: JsonRecord, path: string): NormalizedResolvedUser {
  return {
    uuid: getString(user.uuid, `${path}.uuid`),
    shortUuid: getString(user.shortUuid, `${path}.shortUuid`),
    username: getString(user.username, `${path}.username`),
  };
}

function normalizeNode(node: JsonRecord, path: string): NormalizedNode {
  if ('rawHosts' in node) {
    throw new RemnawaveContractDriftError(
      'Legacy rawHosts field is unsupported; derive endpoints from address and active inbounds instead',
      `${path}.rawHosts`,
    );
  }

  const system = getOptionalRecord(node.system);
  const info = getOptionalRecord(system?.info);
  const stats = getOptionalRecord(system?.stats);
  const configProfile = getOptionalRecord(node.configProfile);
  const inbounds = getArray(configProfile?.activeInbounds, `${path}.configProfile.activeInbounds`).map(
    (entry, index) => {
      const inbound = getRecord(entry, `${path}.configProfile.activeInbounds[${index}]`);
      return {
        tag: getString(inbound.tag, `${path}.configProfile.activeInbounds[${index}].tag`),
        protocol: getString(inbound.type, `${path}.configProfile.activeInbounds[${index}].type`),
        network: getOptionalString(inbound.network),
        security: getOptionalString(inbound.security),
        port: getNumber(inbound.port, `${path}.configProfile.activeInbounds[${index}].port`),
      };
    },
  );

  return {
    uuid: getString(node.uuid, `${path}.uuid`),
    name: getString(node.name, `${path}.name`),
    endpoint: `${getString(node.address, `${path}.address`)}:${getNumber(node.port, `${path}.port`)}`,
    countryCode: getOptionalString(node.countryCode),
    tags: getStringArray(node.tags, `${path}.tags`),
    connection: {
      state: node.isDisabled === true ? 'disabled' : node.isConnected === true ? 'connected' : node.isConnecting === true ? 'connecting' : 'disconnected',
      lastChangedAt: getOptionalString(node.lastStatusChange),
      lastMessage: getOptionalString(node.lastStatusMessage),
    },
    traffic: {
      resetDay: getOptionalNumber(node.trafficResetDay),
      limitBytes: getNumber(node.trafficLimitBytes, `${path}.trafficLimitBytes`),
      usedBytes: getNumber(node.trafficUsedBytes, `${path}.trafficUsedBytes`),
      trackingEnabled: getBoolean(node.isTrafficTrackingActive, `${path}.isTrafficTrackingActive`),
      consumptionMultiplier: getNumber(node.consumptionMultiplier, `${path}.consumptionMultiplier`),
    },
    provider: {
      uuid: getOptionalString(node.providerUuid),
      name: getOptionalString(getOptionalRecord(node.provider)?.name),
    },
    inbounds,
    system: {
      cpuCores: getOptionalNumber(info?.cpus),
      cpuModel: getOptionalString(info?.cpuModel),
      memoryTotalBytes: getOptionalNumber(info?.memoryTotal),
      memoryUsedBytes: getOptionalNumber(stats?.memoryUsed),
      memoryFreeBytes: getOptionalNumber(stats?.memoryFree),
      uptimeSeconds: getOptionalNumber(stats?.uptime),
      loadAverage: getNumberArray(stats?.loadAvg, `${path}.system.stats.loadAvg`),
    },
    versions: {
      node: getOptionalString(getOptionalRecord(node.versions)?.node),
      xray: getOptionalString(getOptionalRecord(node.versions)?.xray),
    },
  };
}

function normalizeUser(user: JsonRecord, path: string): NormalizedUser {
  const traffic = getOptionalRecord(user.userTraffic);
  const squads = getArray(user.activeInternalSquads, `${path}.activeInternalSquads`).map((entry, index) => {
    const squad = getRecord(entry, `${path}.activeInternalSquads[${index}]`);
    return getString(squad.name, `${path}.activeInternalSquads[${index}].name`);
  });

  return {
    uuid: getString(user.uuid, `${path}.uuid`),
    shortUuid: getString(user.shortUuid, `${path}.shortUuid`),
    username: getString(user.username, `${path}.username`),
    status: getUserStatus(user.status, `${path}.status`),
    telegramId: getOptionalNumberOrString(user.telegramId),
    subscriptionUrl: getOptionalString(user.subscriptionUrl),
    expiresAt: getOptionalString(user.expireAt),
    createdAt: getOptionalString(user.createdAt),
    updatedAt: getOptionalString(user.updatedAt),
    traffic: {
      usedBytes: getNumber(traffic?.usedTrafficBytes ?? 0, `${path}.userTraffic.usedTrafficBytes`),
      lifetimeUsedBytes: getNumber(
        traffic?.lifetimeUsedTrafficBytes ?? 0,
        `${path}.userTraffic.lifetimeUsedTrafficBytes`,
      ),
      limitBytes: getNumber(user.trafficLimitBytes, `${path}.trafficLimitBytes`),
      strategy: getOptionalString(user.trafficLimitStrategy),
      onlineAt: getOptionalString(traffic?.onlineAt),
      lastConnectedNodeUuid: getOptionalString(traffic?.lastConnectedNodeUuid),
    },
    squads: {
      internalNames: squads,
      externalUuid: getOptionalString(user.externalSquadUuid),
    },
  };
}

function normalizeSubscription(entry: JsonRecord, path: string): NormalizedSubscriptionItem {
  const user = getRecord(entry.user, `${path}.user`);
  return {
    lookupFound: getBoolean(entry.isFound, `${path}.isFound`),
    subscriptionUrl: getOptionalString(entry.subscriptionUrl),
    links: getStringArray(entry.links, `${path}.links`),
    user: {
      shortUuid: getString(user.shortUuid, `${path}.user.shortUuid`),
      username: getString(user.username, `${path}.user.username`),
      daysLeft: getNumber(user.daysLeft, `${path}.user.daysLeft`),
      usedBytes: getNumber(user.trafficUsedBytes, `${path}.user.trafficUsedBytes`),
      lifetimeUsedBytes: getNumber(user.lifetimeTrafficUsedBytes, `${path}.user.lifetimeTrafficUsedBytes`),
      limitBytes: getNumber(user.trafficLimitBytes, `${path}.user.trafficLimitBytes`),
      expiresAt: getOptionalString(user.expiresAt),
      isActive: getBoolean(user.isActive, `${path}.user.isActive`),
      status: getUserStatus(user.userStatus, `${path}.user.userStatus`),
      strategy: getOptionalString(user.trafficLimitStrategy),
    },
  };
}

function normalizeBandwidthWindow(value: unknown, path: string): BandwidthWindow {
  const window = getRecord(value, path);
  return {
    current: getString(window.current, `${path}.current`),
    previous: getString(window.previous, `${path}.previous`),
    difference: getString(window.difference, `${path}.difference`),
  };
}

function unwrapFixtureBody(payload: unknown): unknown {
  if (isRecord(payload) && isRecord((payload as CapturedFixtureEnvelope).response) && 'body' in (payload as CapturedFixtureEnvelope).response!) {
    return (payload as CapturedFixtureEnvelope).response?.body;
  }
  return payload;
}

function getRecord(value: unknown, path: string): JsonRecord {
  if (!isRecord(value)) {
    throw new RemnawaveContractDriftError(`Expected object at ${path}`, path);
  }
  return value;
}

function getOptionalRecord(value: unknown): JsonRecord | null {
  return isRecord(value) ? value : null;
}

function getArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new RemnawaveContractDriftError(`Expected array at ${path}`, path);
  }
  return value;
}

function getString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new RemnawaveContractDriftError(`Expected string at ${path}`, path);
  }
  return value;
}

function getOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getNumber(value: unknown, path: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  throw new RemnawaveContractDriftError(`Expected number-like value at ${path}`, path);
}

function getOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getOptionalNumberOrString(value: unknown): number | string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

function getBigInt(value: unknown, path: string): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return BigInt(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      return BigInt(value);
    } catch {}
  }
  throw new RemnawaveContractDriftError(`Expected bigint-like value at ${path}`, path);
}

function getBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new RemnawaveContractDriftError(`Expected boolean at ${path}`, path);
  }
  return value;
}

function getStringArray(value: unknown, path: string): string[] {
  return getArray(value, path).map((entry, index) => getString(entry, `${path}[${index}]`));
}

function getNumberArray(value: unknown, path: string): number[] {
  if (value == null) {
    return [];
  }
  return getArray(value, path).map((entry, index) => getNumber(entry, `${path}[${index}]`));
}

function getUserStatus(value: unknown, path: string): UserStatus {
  const status = getString(value, path).toUpperCase();
  if (status === 'ACTIVE' || status === 'DISABLED' || status === 'LIMITED' || status === 'EXPIRED') {
    return status;
  }
  throw new RemnawaveContractDriftError(`Unsupported user status at ${path}: ${status}`, path);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
