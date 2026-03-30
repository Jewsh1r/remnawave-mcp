export type UserStatus = 'ACTIVE' | 'DISABLED' | 'LIMITED' | 'EXPIRED';

export interface NormalizedNodeInbound {
  readonly tag: string;
  readonly protocol: string;
  readonly network: string | null;
  readonly security: string | null;
  readonly port: number;
}

export interface NormalizedNode {
  readonly uuid: string;
  readonly name: string;
  readonly endpoint: string;
  readonly countryCode: string | null;
  readonly tags: readonly string[];
  readonly connection: {
    readonly state: 'connected' | 'connecting' | 'disconnected' | 'disabled';
    readonly lastChangedAt: string | null;
    readonly lastMessage: string | null;
  };
  readonly traffic: {
    readonly resetDay: number | null;
    readonly limitBytes: number;
    readonly usedBytes: number;
    readonly trackingEnabled: boolean;
    readonly consumptionMultiplier: number;
  };
  readonly provider: {
    readonly uuid: string | null;
    readonly name: string | null;
  };
  readonly inbounds: readonly NormalizedNodeInbound[];
  readonly system: {
    readonly cpuCores: number | null;
    readonly cpuModel: string | null;
    readonly memoryTotalBytes: number | null;
    readonly memoryUsedBytes: number | null;
    readonly memoryFreeBytes: number | null;
    readonly uptimeSeconds: number | null;
    readonly loadAverage: readonly number[];
  };
  readonly versions: {
    readonly node: string | null;
    readonly xray: string | null;
  };
}

export interface NormalizedNodesResponse {
  readonly items: readonly NormalizedNode[];
}

export interface NormalizedUser {
  readonly uuid: string;
  readonly shortUuid: string;
  readonly username: string;
  readonly status: UserStatus;
  readonly telegramId: number | string | null;
  readonly subscriptionUrl: string | null;
  readonly expiresAt: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly traffic: {
    readonly usedBytes: number;
    readonly lifetimeUsedBytes: number;
    readonly limitBytes: number;
    readonly strategy: string | null;
    readonly onlineAt: string | null;
    readonly lastConnectedNodeUuid: string | null;
  };
  readonly squads: {
    readonly internalNames: readonly string[];
    readonly externalUuid: string | null;
  };
}

export interface NormalizedUsersResponse {
  readonly total: number;
  readonly items: readonly NormalizedUser[];
}

export interface NormalizedResolvedUser {
  readonly uuid: string;
  readonly shortUuid: string;
  readonly username: string;
}

export interface NormalizedUsersResolveResponse {
  readonly found: boolean;
  readonly match: NormalizedResolvedUser | null;
}

export interface NormalizedSubscriptionItem {
  readonly lookupFound: boolean;
  readonly subscriptionUrl: string | null;
  readonly links: readonly string[];
  readonly user: {
    readonly shortUuid: string;
    readonly username: string;
    readonly daysLeft: number;
    readonly usedBytes: number;
    readonly lifetimeUsedBytes: number;
    readonly limitBytes: number;
    readonly expiresAt: string | null;
    readonly isActive: boolean;
    readonly status: UserStatus;
    readonly strategy: string | null;
  };
}

export interface NormalizedSubscriptionsResponse {
  readonly items: readonly NormalizedSubscriptionItem[];
}

export interface NormalizedSystemStats {
  readonly cpu: {
    readonly cores: number;
  };
  readonly memory: {
    readonly totalBytes: number;
    readonly freeBytes: number;
    readonly usedBytes: number;
  };
  readonly uptimeSeconds: number;
  readonly generatedAtUnixMs: number;
  readonly users: {
    readonly total: number;
    readonly active: number;
    readonly disabled: number;
    readonly limited: number;
    readonly expired: number;
  };
  readonly online: {
    readonly now: number;
    readonly lastDay: number;
    readonly lastWeek: number;
    readonly never: number;
  };
  readonly nodes: {
    readonly totalOnlineUsers: number;
    readonly lifetimeBytes: bigint;
  };
}

export interface NormalizedSystemHealth {
  readonly instances: readonly {
    readonly type: string;
    readonly instanceId: string | null;
    readonly pid: number;
    readonly rssBytes: number;
    readonly heapUsedBytes: number;
    readonly heapTotalBytes: number;
    readonly activeHandles: number;
    readonly uptimeSeconds: number;
    readonly generatedAtUnixMs: number;
    readonly eventLoopDelayMs: number;
    readonly eventLoopP99Ms: number;
  }[];
}

export interface BandwidthWindow {
  readonly current: string;
  readonly previous: string;
  readonly difference: string;
}

export interface NormalizedBandwidthStats {
  readonly windows: {
    readonly lastTwoDays: BandwidthWindow;
    readonly lastSevenDays: BandwidthWindow;
    readonly lastThirtyDays: BandwidthWindow;
    readonly calendarMonth: BandwidthWindow;
    readonly currentYear: BandwidthWindow;
  };
}

export interface NormalizedMetadata {
  readonly version: string;
  readonly build: {
    readonly time: string | null;
    readonly number: string | null;
  };
  readonly git: {
    readonly backend: {
      readonly commitSha: string | null;
      readonly branch: string | null;
      readonly commitUrl: string | null;
    };
    readonly frontend: {
      readonly commitSha: string | null;
      readonly branch: string | null;
      readonly commitUrl: string | null;
    };
  };
}

export interface NormalizedNodePlugin {
  readonly uuid: string;
  readonly viewPosition: number;
  readonly name: string;
  readonly hasConfig: boolean;
}

export interface NormalizedNodePluginsResponse {
  readonly total: number;
  readonly plugins: readonly NormalizedNodePlugin[];
}

export interface HwidCountEntry {
  readonly name: string;
  readonly count: number;
}

export interface NormalizedHwidInspection {
  readonly byPlatform: readonly HwidCountEntry[];
  readonly byApp: readonly HwidCountEntry[];
  readonly stats: {
    readonly totalUniqueDevices: number;
    readonly totalHwidDevices: number;
    readonly averageHwidDevicesPerUser: number;
  };
}
