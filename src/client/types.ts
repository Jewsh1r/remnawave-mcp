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
  readonly id: number;
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
  readonly id: number;
  readonly shortUuid: string;
  readonly username: string;
}

export interface NormalizedUsersResolveResponse {
  readonly found: boolean;
  readonly match: NormalizedResolvedUser | null;
}

export interface NormalizedUserSubscriptionHistoryItem {
  readonly requestedAt: string | null;
  readonly source: string | null;
  readonly outcome: string | null;
  readonly subscriptionUrl: string | null;
  readonly clientHints: readonly string[];
}

export interface NormalizedUserSubscriptionHistoryResponse {
  readonly items: readonly NormalizedUserSubscriptionHistoryItem[];
}

export interface NormalizedUserHwidDevice {
  readonly hwid: string;
  readonly deviceModel: string | null;
  readonly platform: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface NormalizedUserHwidDevicesResponse {
  readonly items: readonly NormalizedUserHwidDevice[];
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

export interface NormalizedSubscriptionPolicySettings {
  readonly values: Record<string, unknown>;
}

export interface NormalizedSubscriptionTemplateItem {
  readonly uuid: string;
  readonly name: string;
  readonly templateType: string;
  readonly order: number | null;
  readonly body: string | null;
}

export interface NormalizedSubscriptionTemplatesResponse {
  readonly total: number;
  readonly items: readonly NormalizedSubscriptionTemplateItem[];
}

export interface NormalizedSubscriptionPageConfigItem {
  readonly uuid: string;
  readonly name: string;
  readonly showConnectionKeys: boolean;
  readonly order: number | null;
}

export interface NormalizedSubscriptionPageConfigsResponse {
  readonly total: number;
  readonly items: readonly NormalizedSubscriptionPageConfigItem[];
}

export interface NormalizedSquadMemberRef {
  readonly uuid: string;
  readonly username: string;
}

export interface NormalizedInternalSquadItem {
  readonly uuid: string;
  readonly name: string;
  readonly position: number | null;
  readonly access: {
    readonly inboundTags: readonly string[];
  };
  readonly membership: {
    readonly totalMembers: number;
    readonly members: readonly NormalizedSquadMemberRef[];
  };
  readonly accessibleNodes: readonly {
    readonly uuid: string;
    readonly name: string;
  }[];
}

export interface NormalizedInternalSquadsResponse {
  readonly total: number;
  readonly items: readonly NormalizedInternalSquadItem[];
}

export interface NormalizedExternalTemplateOverride {
  readonly templateType: string;
  readonly templateName: string;
}

export interface NormalizedExternalSquadItem {
  readonly uuid: string;
  readonly name: string;
  readonly position: number | null;
  readonly membership: {
    readonly totalMembers: number;
    readonly members: readonly NormalizedSquadMemberRef[];
  };
  readonly deliveryPolicy: {
    readonly templateOverrides: readonly NormalizedExternalTemplateOverride[];
    readonly settingsOverrides: Record<string, unknown>;
  };
}

export interface NormalizedExternalSquadsResponse {
  readonly total: number;
  readonly items: readonly NormalizedExternalSquadItem[];
}

export interface NormalizedHostInboundRef {
  readonly configProfileUuid: string;
  readonly configProfileInboundUuid: string;
  readonly tag: string | null;
  readonly profileName: string | null;
}

export interface NormalizedHost {
  readonly uuid: string;
  readonly viewPosition: number | null;
  readonly remark: string;
  readonly address: string;
  readonly port: number;
  readonly enabled: boolean;
  readonly isHidden: boolean;
  readonly sni: string | null;
  readonly securityLayer: string | null;
  readonly fingerprint: string | null;
  readonly nodes: readonly {
    readonly uuid: string;
    readonly name: string;
  }[];
  readonly inbound: NormalizedHostInboundRef;
}

export interface NormalizedHostsResponse {
  readonly total: number;
  readonly items: readonly NormalizedHost[];
}

export interface NormalizedProfileInboundSquadRef {
  readonly uuid: string;
  readonly name: string;
}

export interface NormalizedProfileInbound {
  readonly uuid: string;
  readonly profileUuid: string;
  readonly tag: string;
  readonly type: string;
  readonly network: string | null;
  readonly security: string | null;
  readonly port: number | null;
  readonly activeSquads: readonly NormalizedProfileInboundSquadRef[];
}

export interface NormalizedProfileNodeRef {
  readonly uuid: string;
  readonly name: string;
}

export interface NormalizedProfile {
  readonly uuid: string;
  readonly viewPosition: number | null;
  readonly name: string;
  readonly config: Record<string, unknown>;
  readonly inbounds: readonly NormalizedProfileInbound[];
  readonly attachedNodes: readonly NormalizedProfileNodeRef[];
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface NormalizedProfilesResponse {
  readonly total: number;
  readonly items: readonly NormalizedProfile[];
}

export interface NormalizedProfileInboundsResponse {
  readonly total: number;
  readonly items: readonly NormalizedProfileInbound[];
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

export interface NormalizedNodeMetric {
  readonly nodeUuid: string;
  readonly nodeName: string | null;
  readonly cpuLoad: number | null;
  readonly memoryUsageBytes: number | null;
  readonly collectedAt: string | null;
  readonly raw: Record<string, unknown>;
}

export interface NormalizedNodeStatisticsItem {
  readonly nodeUuid: string;
  readonly nodeName: string | null;
  readonly onlineUsers: number | null;
  readonly trafficUsedBytes: string | null;
  readonly raw: Record<string, unknown>;
}

export interface NormalizedSystemRecap {
  readonly totalUsers: number | null;
  readonly activeUsers: number | null;
  readonly inactiveUsers: number | null;
  readonly expiredUsers: number | null;
  readonly generatedAt: string | null;
  readonly raw: Record<string, unknown>;
}

export interface NormalizedSubscriptionRequestHistoryItem {
  readonly requestedAt: string | null;
  readonly source: string | null;
  readonly outcome: string | null;
  readonly subscriptionUrl: string | null;
  readonly clientHints: readonly string[];
}

export interface NormalizedSubscriptionRequestHistory {
  readonly items: readonly NormalizedSubscriptionRequestHistoryItem[];
  readonly stats: Record<string, unknown>;
}

export type BillingSupportClass = 'local_service_evidence_only';

export interface NormalizedBillingProvider {
  readonly uuid: string;
  readonly key: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly isDefault: boolean;
  readonly support: BillingSupportClass;
}

export interface NormalizedBillingProvidersResponse {
  readonly items: readonly NormalizedBillingProvider[];
}

export interface NormalizedBillingNode {
  readonly uuid: string;
  readonly nodeUuid: string;
  readonly nodeName: string;
  readonly providerUuid: string | null;
  readonly providerName: string | null;
  readonly enabled: boolean;
  readonly support: BillingSupportClass;
}

export interface NormalizedBillingNodesResponse {
  readonly items: readonly NormalizedBillingNode[];
}

export interface NormalizedBillingHistoryItem {
  readonly uuid: string;
  readonly providerUuid: string | null;
  readonly providerName: string | null;
  readonly nodeUuid: string | null;
  readonly nodeName: string | null;
  readonly amount: number | null;
  readonly currency: string | null;
  readonly status: string | null;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly createdAt: string | null;
  readonly support: BillingSupportClass;
}

export interface NormalizedBillingHistoryResponse {
  readonly items: readonly NormalizedBillingHistoryItem[];
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
