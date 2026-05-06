import {
  normalizeBillingHistoryResponse,
  normalizeBillingNodesResponse,
  normalizeBillingProvidersResponse,
  normalizeExternalSquadsResponse,
  normalizeBandwidthStatsResponse,
  normalizeHostsResponse,
  normalizeProfileInboundsResponse,
  normalizeProfileResponse,
  normalizeProfilesResponse,
  normalizeHwidInspectionResponse,
  normalizeInternalSquadsResponse,
  normalizeMetadataResponse,
  normalizeNodesResponse,
  normalizeNodePluginsResponse,
  normalizeSubscriptionPolicySettingsResponse,
  normalizeSubscriptionsResponse,
  normalizeSubscriptionTemplatesResponse,
  normalizeSubscriptionPageConfigsResponse,
  normalizeSystemHealthResponse,
  normalizeSystemStatsResponse,
  normalizeUsersResolveResponse,
  normalizeUsersResponse,
} from './normalize.js';
import { RemnawaveApiError } from './errors.js';

import type {
  NormalizedBillingHistoryResponse,
  NormalizedBillingNodesResponse,
  NormalizedBillingProvidersResponse,
  NormalizedExternalSquadsResponse,
  NormalizedBandwidthStats,
  NormalizedHostsResponse,
  NormalizedProfile,
  NormalizedProfileInboundsResponse,
  NormalizedProfilesResponse,
  NormalizedHwidInspection,
  NormalizedInternalSquadsResponse,
  NormalizedMetadata,
  NormalizedNodeMetric,
  NormalizedNodesResponse,
  NormalizedNodePluginsResponse,
  NormalizedNodeStatisticsItem,
  NormalizedSubscriptionRequestHistory,
  NormalizedSubscriptionPageConfigsResponse,
  NormalizedSubscriptionPolicySettings,
  NormalizedSubscriptionTemplatesResponse,
  NormalizedSubscriptionsResponse,
  NormalizedSystemHealth,
  NormalizedSystemRecap,
  NormalizedSystemStats,
  NormalizedUserHwidDevicesResponse,
  NormalizedUserSubscriptionHistoryResponse,
  NormalizedUsersResolveResponse,
  NormalizedUsersResponse,
} from './types.js';
import type { RemnawaveSupportedOperationContract } from '../remnawave-api/operation-contract.js';
import { REMNAWAVE_OPENAPI_EXTRACT } from '../remnawave-api/generated/operations.js';

export interface RemnawaveClientOptions {
  readonly baseUrl: string;
  readonly apiToken: string;
  readonly fetch?: typeof globalThis.fetch;
}

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'X-Forwarded-Proto': 'https',
  'X-Forwarded-For': '127.0.0.1',
} as const;


function buildQueryPath(path: string, params: Readonly<Record<string, unknown>> = {}): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      searchParams.set(key, String(value));
    }
    if (typeof value === 'boolean') {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query === '' ? path : `${path}?${query}`;
}

const ROUTES = {
  nodes: '/api/nodes',
  users: '/api/users',
  subscriptions: '/api/subscriptions',
  usersResolve: '/api/users/resolve',
  systemStats: '/api/system/stats',
  systemHealth: '/api/system/health',
  bandwidthStats: '/api/system/stats/bandwidth',
  metadata: '/api/system/metadata',
  nodePlugins: '/api/node-plugins',
  nodePluginsReorder: '/api/node-plugins/actions/reorder',
  nodePluginsClone: '/api/node-plugins/actions/clone',
  nodePluginsExecutor: '/api/node-plugins/executor',
  nodePluginsTorrentBlocker: '/api/node-plugins/torrent-blocker',
  nodePluginsTorrentBlockerStats: '/api/node-plugins/torrent-blocker/stats',
  nodePluginsTorrentBlockerTruncate: '/api/node-plugins/torrent-blocker/truncate',
  nodeMetadata: '/api/metadata/node',
  nodeUsersUsage: '/api/bandwidth-stats/nodes',
  nodesStats: '/api/system/stats/nodes',
  nodesMetrics: '/api/system/nodes/metrics',
  systemRecap: '/api/system/stats/recap',
  subscriptionRequestHistory: '/api/subscription-request-history',
  subscriptionRequestHistoryStats: '/api/subscription-request-history/stats',
  hwidInspection: '/api/hwid/devices/stats',
  hwidDevices: '/api/hwid/devices',
  hwidDelete: '/api/hwid/devices/delete',
  internalSquads: '/api/internal-squads',
  internalSquadsReorder: '/api/internal-squads/actions/reorder',
  externalSquads: '/api/external-squads',
  externalSquadsReorder: '/api/external-squads/actions/reorder',
  hosts: '/api/hosts',
  hostTags: '/api/hosts/tags',
  hostsReorder: '/api/hosts/actions/reorder',
  subscriptionSettings: '/api/subscription-settings',
  remnawaveSettings: '/api/remnawave-settings',
  authStatus: '/api/auth/status',
  subscriptionTemplates: '/api/subscription-templates',
  publicSubscriptions: '/api/sub',
  subscriptionPageConfigs: '/api/subscription-page-configs',
  tokens: '/api/tokens',
  passkeys: '/api/passkeys',
  passkeysRegistrationOptions: '/api/passkeys/registration/options',
  passkeysAuthenticationOptions: '/api/auth/passkey/authentication/options',
  snippets: '/api/snippets',
  userMetadata: '/api/metadata/user',
  keygen: '/api/keygen',
  x25519Generate: '/api/system/tools/x25519/generate',
  happEncrypt: '/api/system/tools/happ/encrypt',
  configProfiles: '/api/config-profiles',
  configProfilesInbounds: '/api/config-profiles/inbounds',
  ipControlFetchIps: '/api/ip-control/fetch-ips',
  ipControlFetchUsersIps: '/api/ip-control/fetch-users-ips',
  ipControlFetchIpsResult: '/api/ip-control/fetch-ips/result',
  ipControlFetchUsersIpsResult: '/api/ip-control/fetch-users-ips/result',
  ipControlDropConnections: '/api/ip-control/drop-connections',
  infraBillingProviders: '/api/infra-billing/providers',
  infraBillingHistory: '/api/infra-billing/history',
  infraBillingNodes: '/api/infra-billing/nodes',
} as const;

export class RemnawaveClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  public constructor(options: RemnawaveClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiToken = options.apiToken;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  public async getNodes(): Promise<NormalizedNodesResponse> {
    return normalizeNodesResponse(await this.getJson(ROUTES.nodes));
  }

  public async getNode(nodeUuid: string): Promise<unknown> {
    return this.getJson(`${ROUTES.nodes}/${nodeUuid}`);
  }

  public async createNode(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.nodes, payload);
  }

  public async updateNode(nodeUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.nodes, 'PATCH', { uuid: nodeUuid, ...patch });
  }

  public async deleteNode(nodeUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.nodes}/${nodeUuid}`, 'DELETE');
  }

  public async enableNode(nodeUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.nodes}/${nodeUuid}/actions/enable`, 'POST');
  }

  public async disableNode(nodeUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.nodes}/${nodeUuid}/actions/disable`, 'POST');
  }

  public async restartNode(nodeUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.nodes}/${nodeUuid}/actions/restart`, 'POST');
  }

  public async resetNodeTraffic(nodeUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.nodes}/${nodeUuid}/actions/reset-traffic`, 'POST');
  }

  public async restartAllNodes(): Promise<unknown> {
    return this.requestJson(`${ROUTES.nodes}/actions/restart-all`, 'POST');
  }

  public async reorderNodes(orderedNodeUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(`${ROUTES.nodes}/actions/reorder`, { nodeUuids: orderedNodeUuids });
  }

  public async profileModification(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(`${ROUTES.nodes}/bulk-actions/profile-modification`, payload);
  }

  public async bulkNodesActions(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(`${ROUTES.nodes}/bulk-actions`, payload);
  }

  public async bulkNodesUpdate(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(`${ROUTES.nodes}/bulk-actions/update`, payload);
  }

  public async getNodeMetadata(nodeUuid: string): Promise<unknown> {
    return this.getJson(`${ROUTES.nodeMetadata}/${nodeUuid}`);
  }

  public async upsertNodeMetadata(nodeUuid: string, payload: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(`${ROUTES.nodeMetadata}/${nodeUuid}`, 'PUT', payload);
  }

  public async getNodeUsersUsage(payload: {
    readonly uuid: string;
    readonly start: number;
    readonly end: number;
  }): Promise<unknown> {
    const searchParams = new URLSearchParams({
      start: String(payload.start),
      end: String(payload.end),
    });
    return this.getJson(`${ROUTES.nodeUsersUsage}/${payload.uuid}/users?${searchParams.toString()}`);
  }

  public async getNodeUsersUsageLegacy(nodeUuid: string): Promise<unknown> {
    return this.getJson(`${ROUTES.nodeUsersUsage}/${nodeUuid}/users/legacy`);
  }

  public async getNodesStatistics(): Promise<unknown> {
    return this.getJson(ROUTES.nodesStats);
  }

  public async getNodesMetrics(): Promise<unknown> {
    return this.getJson(ROUTES.nodesMetrics);
  }

  public async getSystemRecap(): Promise<NormalizedSystemRecap | unknown> {
    const payload = await this.getJson(ROUTES.systemRecap);
    if (typeof payload === 'object' && payload !== null && 'response' in (payload as Record<string, unknown>)) {
      return (payload as { response: unknown }).response;
    }
    return payload as NormalizedSystemRecap | unknown;
  }

  public async getSubscriptionRequestHistory(params?: { readonly size?: number; readonly start?: number }): Promise<NormalizedSubscriptionRequestHistory | unknown> {
    const [items, stats] = await Promise.all([
      this.getJson(buildQueryPath(ROUTES.subscriptionRequestHistory, params)),
      this.getSubscriptionRequestHistoryStats(),
    ]);
    return {
      items: Array.isArray((items as { items?: unknown[] }).items)
        ? (items as { items: unknown[] }).items
        : Array.isArray((items as { response?: unknown[] }).response)
          ? (items as { response: unknown[] }).response
          : Array.isArray(items)
            ? items
            : [],
      stats: (typeof stats === 'object' && stats !== null
        ? ('response' in (stats as Record<string, unknown>) && typeof (stats as { response?: unknown }).response === 'object' && (stats as { response?: object }).response !== null
            ? (stats as { response: Record<string, unknown> }).response
            : (stats as Record<string, unknown>))
        : {}) as Record<string, unknown>,
    };
  }

  public async getSubscriptionRequestHistoryStats(): Promise<unknown> {
    return this.getJson(ROUTES.subscriptionRequestHistoryStats);
  }

  public async getUsers(): Promise<NormalizedUsersResponse> {
    return normalizeUsersResponse(await this.getJson(ROUTES.users));
  }

  public async resolveUser(uuid: string): Promise<NormalizedUsersResolveResponse> {
    return normalizeUsersResolveResponse(await this.sendJson(ROUTES.usersResolve, { uuid }));
  }

  public async executeOpenApiOperation(
    operation: RemnawaveSupportedOperationContract,
    payload: Record<string, unknown>,
  ): Promise<unknown> {
    const path = buildOpenApiPath(operation, payload);
    const body = operation.openapi.method === 'get' || operation.openapi.method === 'delete'
      ? undefined
      : omitPathAndQueryParams(payload, operation);
    return this.requestJson(path, operation.openapi.method.toUpperCase() as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', body);
  }

  public async getUserSubscriptionRequestHistory(userUuid: string): Promise<NormalizedUserSubscriptionHistoryResponse> {
    return this.requestJson(`${ROUTES.users}/${userUuid}/subscription-request-history`, 'GET') as Promise<NormalizedUserSubscriptionHistoryResponse>;
  }

  public async getUserHwidDevices(userUuid: string): Promise<NormalizedUserHwidDevicesResponse> {
    return this.requestJson(`${ROUTES.hwidDevices}/${userUuid}`, 'GET') as Promise<NormalizedUserHwidDevicesResponse>;
  }

  public async getSubscriptions(params?: { readonly size?: number; readonly start?: number }): Promise<NormalizedSubscriptionsResponse> {
    return normalizeSubscriptionsResponse(await this.getJson(buildQueryPath(ROUTES.subscriptions, params)));
  }

  public async getSubscriptionByUsername(username: string): Promise<unknown> {
    return this.getJson(`${ROUTES.subscriptions}/by-username/${encodeURIComponent(username)}`);
  }

  public async getSubscriptionByShortUuid(shortUuid: string): Promise<unknown> {
    return this.getJson(`${ROUTES.subscriptions}/by-short-uuid/${encodeURIComponent(shortUuid)}`);
  }

  public async getSubscriptionByUuid(uuid: string): Promise<unknown> {
    return this.getJson(`${ROUTES.subscriptions}/by-uuid/${encodeURIComponent(uuid)}`);
  }

  public async getRawSubscriptionByShortUuid(shortUuid: string, params?: { readonly withDisabledHosts?: boolean }): Promise<unknown> {
    return this.getJson(buildQueryPath(`${ROUTES.subscriptions}/by-short-uuid/${encodeURIComponent(shortUuid)}/raw`, params));
  }

  public async getSubscriptionSubpageConfigByShortUuid(shortUuid: string, body?: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(`${ROUTES.subscriptions}/subpage-config/${encodeURIComponent(shortUuid)}`, 'GET', body);
  }

  public async getSubscriptionConnectionKeysByUuid(uuid: string): Promise<unknown> {
    return this.getJson(`${ROUTES.subscriptions}/connection-keys/${encodeURIComponent(uuid)}`);
  }

  public async getSubscriptionPolicySettings(): Promise<NormalizedSubscriptionPolicySettings> {
    return normalizeSubscriptionPolicySettingsResponse(await this.getJson(ROUTES.subscriptionSettings));
  }

  public async updateSubscriptionPolicySettings(patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.subscriptionSettings, 'PATCH', patch);
  }

  public async getInfraProviders(): Promise<NormalizedBillingProvidersResponse> {
    return normalizeBillingProvidersResponse(await this.getJson(ROUTES.infraBillingProviders));
  }

  public async createInfraProvider(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.infraBillingProviders, payload);
  }

  public async updateInfraProvider(providerUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.infraBillingProviders, 'PATCH', { uuid: providerUuid, ...patch });
  }

  public async deleteInfraProvider(providerUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.infraBillingProviders}/${providerUuid}`, 'DELETE');
  }

  public async getInfraBillingHistory(): Promise<NormalizedBillingHistoryResponse> {
    return normalizeBillingHistoryResponse(await this.getJson(ROUTES.infraBillingHistory));
  }

  public async getInfraBillingNodes(): Promise<NormalizedBillingNodesResponse> {
    return normalizeBillingNodesResponse(await this.getJson(ROUTES.infraBillingNodes));
  }

  public async createInfraBillingNode(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.infraBillingNodes, payload);
  }

  public async updateInfraBillingNode(nodeUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.infraBillingNodes, 'PATCH', { uuid: nodeUuid, ...patch });
  }

  public async deleteInfraBillingNode(nodeUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.infraBillingNodes}/${nodeUuid}`, 'DELETE');
  }

  public async getInternalSquads(): Promise<NormalizedInternalSquadsResponse> {
    return normalizeInternalSquadsResponse(await this.getJson(ROUTES.internalSquads));
  }

  public async patchInternalSquad(squadUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.internalSquads, 'PATCH', { uuid: squadUuid, ...patch });
  }

  public async bulkAddUsersToInternalSquad(squadUuid: string, userUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(`${ROUTES.internalSquads}/${squadUuid}/bulk-actions/add-users`, { userUuids });
  }

  public async bulkRemoveUsersFromInternalSquad(squadUuid: string, userUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(`${ROUTES.internalSquads}/${squadUuid}/bulk-actions/remove-users`, { userUuids });
  }

  public async getExternalSquads(): Promise<NormalizedExternalSquadsResponse> {
    return normalizeExternalSquadsResponse(await this.getJson(ROUTES.externalSquads));
  }

  public async getExternalSquadByUuid(squadUuid: string): Promise<NormalizedExternalSquadsResponse['items'][number]> {
    const payload = await this.getJson(`${ROUTES.externalSquads}/${squadUuid}`);
    const normalized = normalizeExternalSquadsResponse({
      response: {
        total: 1,
        externalSquads: [
          typeof payload === 'object' && payload !== null && 'response' in payload
            ? (payload as { response: unknown }).response
            : payload,
        ],
      },
    });
    const match = normalized.items.find((entry) => entry.uuid === squadUuid);
    if (match === undefined) {
      throw new Error('External squad was not found.');
    }
    return match;
  }

  public async getHosts(): Promise<NormalizedHostsResponse> {
    return normalizeHostsResponse(await this.getJson(ROUTES.hosts));
  }

  public async getProfiles(): Promise<NormalizedProfilesResponse> {
    return normalizeProfilesResponse(await this.getJson(ROUTES.configProfiles));
  }

  public async getProfile(profileUuid: string): Promise<NormalizedProfile> {
    return normalizeProfileResponse(await this.getJson(`${ROUTES.configProfiles}/${profileUuid}`));
  }

  public async getComputedProfile(profileUuid: string): Promise<NormalizedProfile> {
    return normalizeProfileResponse(await this.getJson(`${ROUTES.configProfiles}/${profileUuid}/computed-config`));
  }

  public async listAllInbounds(): Promise<NormalizedProfileInboundsResponse> {
    return normalizeProfileInboundsResponse(await this.getJson(ROUTES.configProfilesInbounds));
  }

  public async listProfileInbounds(profileUuid: string): Promise<NormalizedProfileInboundsResponse> {
    return normalizeProfileInboundsResponse(await this.getJson(`${ROUTES.configProfiles}/${profileUuid}/inbounds`));
  }

  public async createProfile(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.configProfiles, payload);
  }

  public async updateProfile(profileUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.configProfiles, 'PATCH', { uuid: profileUuid, ...patch });
  }

  public async deleteProfile(profileUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.configProfiles}/${profileUuid}`, 'DELETE');
  }

  public async reorderProfiles(orderedProfileUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(`${ROUTES.configProfiles}/actions/reorder`, {
      items: orderedProfileUuids.map((uuid, index) => ({ uuid, viewPosition: index + 1 })),
    });
  }

  public async getHostTags(): Promise<unknown> {
    return this.getJson(ROUTES.hostTags);
  }

  public async createHost(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.hosts, payload);
  }

  public async updateHost(hostUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.hosts, 'PATCH', { uuid: hostUuid, ...patch });
  }

  public async deleteHost(hostUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.hosts}/${hostUuid}`, 'DELETE');
  }

  public async reorderHosts(orderedHostUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(ROUTES.hostsReorder, {
      hosts: orderedHostUuids.map((uuid, index) => ({ uuid, viewPosition: index + 1 })),
    });
  }

  public async bulkEnableHosts(hostUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(`${ROUTES.hosts}/bulk/enable`, { uuids: hostUuids });
  }

  public async bulkDisableHosts(hostUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(`${ROUTES.hosts}/bulk/disable`, { uuids: hostUuids });
  }

  public async bulkDeleteHosts(hostUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(`${ROUTES.hosts}/bulk/delete`, { uuids: hostUuids });
  }

  public async bulkSetHostInbound(
    hostUuids: readonly string[],
    inbound: { configProfileUuid: string; configProfileInboundUuid: string },
  ): Promise<unknown> {
    return this.sendJson(`${ROUTES.hosts}/bulk/set-inbound`, {
      uuids: hostUuids,
      inbound,
    });
  }

  public async bulkSetHostPort(hostUuids: readonly string[], port: number): Promise<unknown> {
    return this.sendJson(`${ROUTES.hosts}/bulk/set-port`, {
      uuids: hostUuids,
      port,
    });
  }

  public async patchExternalSquad(squadUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.externalSquads, 'PATCH', { uuid: squadUuid, ...patch });
  }

  public async bulkAddUsersToExternalSquad(squadUuid: string, userUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(`${ROUTES.externalSquads}/${squadUuid}/bulk-actions/add-users`, { userUuids });
  }

  public async bulkRemoveUsersFromExternalSquad(squadUuid: string, userUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(`${ROUTES.externalSquads}/${squadUuid}/bulk-actions/remove-users`, { userUuids });
  }

  public async reorderExternalSquads(orderedSquadUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(ROUTES.externalSquadsReorder, { squadUuids: orderedSquadUuids });
  }

  public async getSubscriptionSettings(): Promise<NormalizedSubscriptionPolicySettings> {
    return normalizeSubscriptionPolicySettingsResponse(await this.getJson(ROUTES.subscriptionSettings));
  }

  public async getRemnawaveSettings(): Promise<unknown> {
    return this.getJson(ROUTES.remnawaveSettings);
  }

  public async updateRemnawaveSettings(settings: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.remnawaveSettings, 'PATCH', settings);
  }

  public async getAuthStatus(): Promise<unknown> {
    return this.getJson(ROUTES.authStatus);
  }

  public async setSubscriptionSettings(settings: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.subscriptionSettings, 'PATCH', settings);
  }

  public async getSubscriptionTemplates(): Promise<NormalizedSubscriptionTemplatesResponse> {
    return normalizeSubscriptionTemplatesResponse(await this.getJson(ROUTES.subscriptionTemplates));
  }

  public async getSubscriptionTemplateByUuid(templateUuid: string): Promise<NormalizedSubscriptionTemplatesResponse['items'][number]> {
    const templates = await this.getSubscriptionTemplates();
    const match = templates.items.find((entry) => entry.uuid === templateUuid);
    if (match === undefined) {
      throw new Error('Subscription template was not found.');
    }
    return match;
  }

  public async createSubscriptionTemplate(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.subscriptionTemplates, payload);
  }

  public async updateSubscriptionTemplate(templateUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.subscriptionTemplates, 'PATCH', { uuid: templateUuid, ...patch });
  }

  public async deleteSubscriptionTemplate(templateUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.subscriptionTemplates}/${templateUuid}`, 'DELETE');
  }

  public async getPublicSubscriptionInfo(shortUuid: string): Promise<unknown> {
    return this.getJson(`${ROUTES.publicSubscriptions}/${shortUuid}/info`);
  }

  public async getPublicSubscription(shortUuid: string): Promise<unknown> {
    return this.getJson(`${ROUTES.publicSubscriptions}/${shortUuid}`);
  }

  public async getPublicSubscriptionByClientType(shortUuid: string, clientType: string): Promise<unknown> {
    return this.getJson(`${ROUTES.publicSubscriptions}/${shortUuid}/${clientType}`);
  }

  public async listApiTokens(): Promise<unknown> {
    return this.getJson(ROUTES.tokens);
  }

  public async createApiToken(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.tokens, payload);
  }

  public async deleteApiToken(tokenUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.tokens}/${tokenUuid}`, 'DELETE');
  }

  public async listPasskeys(): Promise<unknown> {
    return this.getJson(ROUTES.passkeys);
  }

  public async getPasskeyRegistrationOptions(): Promise<unknown> {
    return this.getJson(ROUTES.passkeysRegistrationOptions);
  }

  public async getPasskeyAuthenticationOptions(): Promise<unknown> {
    return this.getJson(ROUTES.passkeysAuthenticationOptions);
  }

  public async updatePasskey(passkeyUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.passkeys, 'PATCH', { uuid: passkeyUuid, ...patch });
  }

  public async deletePasskey(passkeyUuid: string): Promise<unknown> {
    return this.requestJson(ROUTES.passkeys, 'DELETE', { uuid: passkeyUuid });
  }

  public async listSnippets(): Promise<unknown> {
    return this.getJson(ROUTES.snippets);
  }

  public async createSnippet(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.snippets, payload);
  }

  public async updateSnippet(snippetName: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.snippets, 'PATCH', { name: snippetName, ...patch });
  }

  public async deleteSnippet(snippetName: string): Promise<unknown> {
    return this.requestJson(ROUTES.snippets, 'DELETE', { name: snippetName });
  }

  public async getUserMetadata(userUuid: string): Promise<unknown> {
    return this.getJson(`${ROUTES.userMetadata}/${userUuid}`);
  }

  public async upsertUserMetadata(userUuid: string, payload: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(`${ROUTES.userMetadata}/${userUuid}`, 'PUT', payload);
  }

  public async getKeygenMaterial(): Promise<unknown> {
    return this.getJson(ROUTES.keygen);
  }

  public async generateX25519(): Promise<unknown> {
    return this.getJson(ROUTES.x25519Generate);
  }

  public async encryptHappPayload(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.happEncrypt, payload);
  }

  public async getSubscriptionPageConfigs(): Promise<NormalizedSubscriptionPageConfigsResponse> {
    return normalizeSubscriptionPageConfigsResponse(await this.getJson(ROUTES.subscriptionPageConfigs));
  }

  public async patchSubscriptionPageConfig(configUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.subscriptionPageConfigs, 'PATCH', {
      uuid: configUuid,
      ...patch,
    });
  }

  public async regenerateSubscription(userUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.users}/${userUuid}/actions/revoke`, 'POST', { revokeOnlyPasswords: true });
  }

  public async repairSubscription(userUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.users}/${userUuid}/actions/enable`, 'POST');
  }

  public async createUser(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.users, payload);
  }

  public async patchUserSettings(userUuid: string, settings: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.users, 'PATCH', { uuid: userUuid, ...settings });
  }

  public async setUserState(
    userUuid: string,
    action: 'enable' | 'disable' | 'revoke' | 'reset-traffic',
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    return this.requestJson(`${ROUTES.users}/${userUuid}/actions/${action}`, 'POST', body);
  }

  public async deleteUserHwidDevice(userUuid: string, hwid: string): Promise<unknown> {
    return this.sendJson(ROUTES.hwidDelete, { userUuid, hwid });
  }

  public async revokeUserSubscription(userUuid: string): Promise<unknown> {
    return this.setUserState(userUuid, 'revoke', { revokeOnlyPasswords: true });
  }

  public async getSystemStats(): Promise<NormalizedSystemStats> {
    return normalizeSystemStatsResponse(await this.getJson(ROUTES.systemStats));
  }

  public async getSystemHealth(): Promise<NormalizedSystemHealth> {
    return normalizeSystemHealthResponse(await this.getJson(ROUTES.systemHealth));
  }

  public async getBandwidthStats(): Promise<NormalizedBandwidthStats> {
    return normalizeBandwidthStatsResponse(await this.getJson(ROUTES.bandwidthStats));
  }

  public async getMetadata(): Promise<NormalizedMetadata> {
    return normalizeMetadataResponse(await this.getJson(ROUTES.metadata));
  }

  public async getNodePlugins(): Promise<NormalizedNodePluginsResponse> {
    return normalizeNodePluginsResponse(await this.getJson(ROUTES.nodePlugins));
  }

  public async getNodePlugin(pluginUuid: string): Promise<unknown> {
    return this.getJson(`${ROUTES.nodePlugins}/${pluginUuid}`);
  }

  public async createNodePlugin(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.nodePlugins, payload);
  }

  public async updateNodePlugin(pluginUuid: string, patch: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.nodePlugins, 'PATCH', { uuid: pluginUuid, ...patch });
  }

  public async deleteNodePlugin(pluginUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.nodePlugins}/${pluginUuid}`, 'DELETE');
  }

  public async reorderNodePlugins(orderedPluginUuids: readonly string[]): Promise<unknown> {
    return this.sendJson(ROUTES.nodePluginsReorder, {
      nodePlugins: orderedPluginUuids.map((uuid, index) => ({ uuid, viewPosition: index + 1 })),
    });
  }

  public async cloneNodePlugin(sourcePluginUuid: string): Promise<unknown> {
    return this.sendJson(ROUTES.nodePluginsClone, {
      cloneFromUuid: sourcePluginUuid,
    });
  }

  public async getTorrentBlockerReports(params?: { readonly size?: number; readonly start?: number }): Promise<unknown> {
    const searchParams = new URLSearchParams();
    if (typeof params?.size === 'number' && Number.isFinite(params.size)) {
      searchParams.set('size', String(params.size));
    }
    if (typeof params?.start === 'number' && Number.isFinite(params.start)) {
      searchParams.set('start', String(params.start));
    }
    const query = searchParams.toString();
    const path = query === '' ? ROUTES.nodePluginsTorrentBlocker : `${ROUTES.nodePluginsTorrentBlocker}?${query}`;
    return this.getJson(path);
  }

  public async getTorrentBlockerStats(): Promise<unknown> {
    return this.getJson(ROUTES.nodePluginsTorrentBlockerStats);
  }

  public async truncateTorrentBlockerReports(): Promise<unknown> {
    return this.requestJson(ROUTES.nodePluginsTorrentBlockerTruncate, 'POST');
  }

  public async executePluginExecutor(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.nodePluginsExecutor, payload);
  }

  public async getHwidInspection(): Promise<NormalizedHwidInspection> {
    return normalizeHwidInspectionResponse(await this.getJson(ROUTES.hwidInspection));
  }

  public async fetchIpsForUser(userUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.ipControlFetchIps}/${userUuid}`, 'POST');
  }

  public async fetchUsersIpsForNode(nodeUuid: string): Promise<unknown> {
    return this.requestJson(`${ROUTES.ipControlFetchUsersIps}/${nodeUuid}`, 'POST');
  }

  public async getUserIpsFetchJobResult(jobId: string): Promise<unknown> {
    return this.getJson(`${ROUTES.ipControlFetchIpsResult}/${jobId}`);
  }

  public async getNodeUsersIpsFetchJobResult(jobId: string): Promise<unknown> {
    return this.getJson(`${ROUTES.ipControlFetchUsersIpsResult}/${jobId}`);
  }

  public async dropConnections(payload: Record<string, unknown>): Promise<unknown> {
    return this.sendJson(ROUTES.ipControlDropConnections, payload);
  }

  private async getJson(path: string): Promise<unknown> {
    return this.requestJson(path, 'GET');
  }

  private async sendJson(path: string, body: unknown): Promise<unknown> {
    return this.requestJson(path, 'POST', body);
  }

  private async requestJson(path: string, method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = await parseResponseBody(response);

    if (!response.ok) {
      const message = extractErrorMessage(payload, response.statusText);
      throw new RemnawaveApiError(response.status, message, payload);
    }

    return payload;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

function buildOpenApiPath(operation: RemnawaveSupportedOperationContract, payload: Record<string, unknown>): string {
  const pathTemplate = operation.openapi.path;
  let path = pathTemplate.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = payload[name];
    return encodeURIComponent(typeof value === 'string' || typeof value === 'number' ? String(value) : '');
  });

  const queryParameterNames = getOpenApiParameterNames(operation.key, 'query');
  const query = new URLSearchParams();
  for (const key of queryParameterNames) {
    const value = payload[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      query.set(key, String(value));
    }
  }
  const queryString = query.toString();
  if (queryString !== '') {
    path = `${path}?${queryString}`;
  }
  return path;
}

function omitPathAndQueryParams(payload: Record<string, unknown>, operation: RemnawaveSupportedOperationContract): Record<string, unknown> {
  const body = { ...payload };
  for (const name of getOpenApiParameterNames(operation.key, 'path')) {
    delete body[name];
  }
  for (const name of getOpenApiParameterNames(operation.key, 'query')) {
    delete body[name];
  }
  return body;
}

function getOpenApiParameterNames(operationKey: string, location: 'path' | 'query'): readonly string[] {
  const operation = REMNAWAVE_OPENAPI_EXTRACT.operations.find((entry) => entry.key === operationKey);
  return operation?.parameters
    .filter((parameter) => parameter.in === location)
    .map((parameter) => parameter.name) ?? [];
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }
  return fallback || 'Remnawave request failed';
}

export { ROUTES as REMNAWAVE_ROUTES };
