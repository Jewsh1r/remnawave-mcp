import type { RemnawaveApiClient } from './registry.js';
import type { RemnawaveSupportedOperationContract } from './operation-contract.js';

export interface AtomicRuntimeClient {
  readonly getSystemStats: () => Promise<unknown>;
  readonly getMetadata: () => Promise<unknown>;
  readonly getSystemHealth: () => Promise<unknown>;
  readonly getBandwidthStats: () => Promise<unknown>;
  readonly getNodesStatistics: () => Promise<unknown>;
  readonly getNodesMetrics: () => Promise<unknown>;
  readonly getSystemRecap: () => Promise<unknown>;
  readonly getUsers: () => Promise<unknown>;
  readonly resolveUser: (uuid: string) => Promise<unknown>;
  readonly createUser: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly setUserState: (
    userUuid: string,
    action: 'enable' | 'disable' | 'reset-traffic',
    body?: Record<string, unknown>,
  ) => Promise<unknown>;
  readonly restartNode: (nodeUuid: string) => Promise<unknown>;
  readonly getHosts: () => Promise<unknown>;
  readonly bulkSetHostPort: (hostUuids: readonly string[], port: number) => Promise<unknown>;
  readonly getNodeMetadata: (nodeUuid: string) => Promise<unknown>;
  readonly upsertNodeMetadata: (nodeUuid: string, payload: Record<string, unknown>) => Promise<unknown>;
  readonly getUserMetadata: (userUuid: string) => Promise<unknown>;
  readonly upsertUserMetadata: (userUuid: string, payload: Record<string, unknown>) => Promise<unknown>;
  readonly getSubscriptionTemplates: () => Promise<unknown>;
  readonly getSubscriptionTemplateByUuid: (templateUuid: string) => Promise<unknown>;
  readonly createSubscriptionTemplate: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly updateSubscriptionTemplate: (templateUuid: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly deleteSubscriptionTemplate: (templateUuid: string) => Promise<unknown>;
  readonly listSnippets: () => Promise<unknown>;
  readonly createSnippet: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly updateSnippet: (snippetName: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly deleteSnippet: (snippetName: string) => Promise<unknown>;
  readonly getPublicSubscriptionInfo: (shortUuid: string) => Promise<unknown>;
  readonly getPublicSubscription: (shortUuid: string) => Promise<unknown>;
  readonly getPublicSubscriptionByClientType: (shortUuid: string, clientType: string) => Promise<unknown>;
  readonly getProfiles: () => Promise<unknown>;
  readonly getProfile: (profileUuid: string) => Promise<unknown>;
  readonly getComputedProfile: (profileUuid: string) => Promise<unknown>;
  readonly listProfileInbounds: (profileUuid: string) => Promise<unknown>;
  readonly revokeUserSubscription: (userUuid: string) => Promise<unknown>;
  readonly getSubscriptions: (params?: { readonly size?: number; readonly start?: number }) => Promise<unknown>;
  readonly getSubscriptionByUsername: (username: string) => Promise<unknown>;
  readonly getSubscriptionByShortUuid: (shortUuid: string) => Promise<unknown>;
  readonly getSubscriptionByUuid: (uuid: string) => Promise<unknown>;
  readonly getRawSubscriptionByShortUuid: (shortUuid: string, params?: { readonly withDisabledHosts?: boolean }) => Promise<unknown>;
  readonly getSubscriptionSubpageConfigByShortUuid: (shortUuid: string, body?: Record<string, unknown>) => Promise<unknown>;
  readonly getSubscriptionConnectionKeysByUuid: (uuid: string) => Promise<unknown>;
  readonly getSubscriptionRequestHistory: (params?: { readonly size?: number; readonly start?: number }) => Promise<unknown>;
  readonly getSubscriptionRequestHistoryStats: () => Promise<unknown>;
  readonly getSubscriptionPageConfigs: () => Promise<unknown>;
  readonly getUserSubscriptionRequestHistory: (userUuid: string) => Promise<unknown>;
  readonly getSubscriptionPolicySettings?: () => Promise<unknown>;
  readonly getInternalSquads?: () => Promise<unknown>;
  readonly bulkAddUsersToInternalSquad?: (squadUuid: string, userUuids: readonly string[]) => Promise<unknown>;
  readonly bulkRemoveUsersFromInternalSquad?: (squadUuid: string, userUuids: readonly string[]) => Promise<unknown>;
  readonly getExternalSquads?: () => Promise<unknown>;
  readonly getExternalSquadByUuid?: (squadUuid: string) => Promise<unknown>;
  readonly bulkAddUsersToExternalSquad?: (squadUuid: string, userUuids: readonly string[]) => Promise<unknown>;
  readonly bulkRemoveUsersFromExternalSquad?: (squadUuid: string, userUuids: readonly string[]) => Promise<unknown>;
  readonly executeOpenApiOperation?: (operation: RemnawaveSupportedOperationContract, payload: Record<string, unknown>) => Promise<unknown>;
}

export function createRemnawaveApiClientAdapter(remnawaveClient: AtomicRuntimeClient): RemnawaveApiClient {
  return {
    getSystemStats: () => remnawaveClient.getSystemStats(),
    getMetadata: () => remnawaveClient.getMetadata(),
    getSystemHealth: () => remnawaveClient.getSystemHealth(),
    getBandwidthStats: () => remnawaveClient.getBandwidthStats(),
    getNodesStatistics: () => remnawaveClient.getNodesStatistics(),
    getNodesMetrics: () => remnawaveClient.getNodesMetrics(),
    getSystemRecap: () => remnawaveClient.getSystemRecap(),
    getUsers: () => remnawaveClient.getUsers(),
    resolveUser: (uuid: string) => remnawaveClient.resolveUser(uuid),
    createUser: (payload: Record<string, unknown>) => remnawaveClient.createUser(payload),
    setUserState: (
      userUuid: string,
      action: 'enable' | 'disable' | 'reset-traffic',
      body?: Record<string, unknown>,
    ) => remnawaveClient.setUserState(userUuid, action, body),
    restartNode: (nodeUuid: string) => remnawaveClient.restartNode(nodeUuid),
    getHosts: () => remnawaveClient.getHosts(),
    bulkSetHostPort: (hostUuids: readonly string[], port: number) => remnawaveClient.bulkSetHostPort(hostUuids, port),
    getNodeMetadata: (nodeUuid: string) => remnawaveClient.getNodeMetadata(nodeUuid),
    upsertNodeMetadata: (nodeUuid: string, payload: Record<string, unknown>) => remnawaveClient.upsertNodeMetadata(nodeUuid, payload),
    getUserMetadata: (userUuid: string) => remnawaveClient.getUserMetadata(userUuid),
    upsertUserMetadata: (userUuid: string, payload: Record<string, unknown>) => remnawaveClient.upsertUserMetadata(userUuid, payload),
    getSubscriptionTemplates: () => remnawaveClient.getSubscriptionTemplates(),
    getSubscriptionTemplateByUuid: (templateUuid: string) => remnawaveClient.getSubscriptionTemplateByUuid(templateUuid),
    createSubscriptionTemplate: (payload: Record<string, unknown>) => remnawaveClient.createSubscriptionTemplate(payload),
    updateSubscriptionTemplate: (templateUuid: string, patch: Record<string, unknown>) => remnawaveClient.updateSubscriptionTemplate(templateUuid, patch),
    deleteSubscriptionTemplate: (templateUuid: string) => remnawaveClient.deleteSubscriptionTemplate(templateUuid),
    listSnippets: () => remnawaveClient.listSnippets(),
    createSnippet: (payload: Record<string, unknown>) => remnawaveClient.createSnippet(payload),
    updateSnippet: (snippetName: string, patch: Record<string, unknown>) => remnawaveClient.updateSnippet(snippetName, patch),
    deleteSnippet: (snippetName: string) => remnawaveClient.deleteSnippet(snippetName),
    getPublicSubscriptionInfo: (shortUuid: string) => remnawaveClient.getPublicSubscriptionInfo(shortUuid),
    getPublicSubscription: (shortUuid: string) => remnawaveClient.getPublicSubscription(shortUuid),
    getPublicSubscriptionByClientType: (shortUuid: string, clientType: string) => remnawaveClient.getPublicSubscriptionByClientType(shortUuid, clientType),
    getProfiles: () => remnawaveClient.getProfiles(),
    getProfile: (profileUuid: string) => remnawaveClient.getProfile(profileUuid),
    getComputedProfile: (profileUuid: string) => remnawaveClient.getComputedProfile(profileUuid),
    listProfileInbounds: (profileUuid: string) => remnawaveClient.listProfileInbounds(profileUuid),
    revokeUserSubscription: (userUuid: string) => remnawaveClient.revokeUserSubscription(userUuid),
    getSubscriptions: (params?: { readonly size?: number; readonly start?: number }) => remnawaveClient.getSubscriptions(params),
    getSubscriptionByUsername: (username: string) => remnawaveClient.getSubscriptionByUsername(username),
    getSubscriptionByShortUuid: (shortUuid: string) => remnawaveClient.getSubscriptionByShortUuid(shortUuid),
    getSubscriptionByUuid: (uuid: string) => remnawaveClient.getSubscriptionByUuid(uuid),
    getRawSubscriptionByShortUuid: (shortUuid: string, params?: { readonly withDisabledHosts?: boolean }) => remnawaveClient.getRawSubscriptionByShortUuid(shortUuid, params),
    getSubscriptionSubpageConfigByShortUuid: (shortUuid: string, body?: Record<string, unknown>) => remnawaveClient.getSubscriptionSubpageConfigByShortUuid(shortUuid, body),
    getSubscriptionConnectionKeysByUuid: (uuid: string) => remnawaveClient.getSubscriptionConnectionKeysByUuid(uuid),
    getSubscriptionRequestHistory: (params?: { readonly size?: number; readonly start?: number }) => remnawaveClient.getSubscriptionRequestHistory(params),
    getSubscriptionRequestHistoryStats: () => remnawaveClient.getSubscriptionRequestHistoryStats(),
    getSubscriptionPageConfigs: () => remnawaveClient.getSubscriptionPageConfigs(),
    getUserSubscriptionRequestHistory: (userUuid: string) => remnawaveClient.getUserSubscriptionRequestHistory(userUuid),
    getSubscriptionPolicySettings: remnawaveClient.getSubscriptionPolicySettings === undefined ? undefined : () => remnawaveClient.getSubscriptionPolicySettings?.() ?? Promise.reject(new Error('Subscription policy settings read is not available.')),
    getInternalSquads: remnawaveClient.getInternalSquads === undefined ? undefined : () => remnawaveClient.getInternalSquads?.() ?? Promise.reject(new Error('Internal squads read is not available.')),
    bulkAddUsersToInternalSquad: remnawaveClient.bulkAddUsersToInternalSquad === undefined ? undefined : (squadUuid: string, userUuids: readonly string[]) => remnawaveClient.bulkAddUsersToInternalSquad?.(squadUuid, userUuids) ?? Promise.reject(new Error('Internal squad add-users is not available.')),
    bulkRemoveUsersFromInternalSquad: remnawaveClient.bulkRemoveUsersFromInternalSquad === undefined ? undefined : (squadUuid: string, userUuids: readonly string[]) => remnawaveClient.bulkRemoveUsersFromInternalSquad?.(squadUuid, userUuids) ?? Promise.reject(new Error('Internal squad remove-users is not available.')),
    getExternalSquads: remnawaveClient.getExternalSquads === undefined ? undefined : () => remnawaveClient.getExternalSquads?.() ?? Promise.reject(new Error('External squads read is not available.')),
    getExternalSquadByUuid: remnawaveClient.getExternalSquadByUuid === undefined ? undefined : (squadUuid: string) => remnawaveClient.getExternalSquadByUuid?.(squadUuid) ?? Promise.reject(new Error('External squad read is not available.')),
    bulkAddUsersToExternalSquad: remnawaveClient.bulkAddUsersToExternalSquad === undefined ? undefined : (squadUuid: string, userUuids: readonly string[]) => remnawaveClient.bulkAddUsersToExternalSquad?.(squadUuid, userUuids) ?? Promise.reject(new Error('External squad add-users is not available.')),
    bulkRemoveUsersFromExternalSquad: remnawaveClient.bulkRemoveUsersFromExternalSquad === undefined ? undefined : (squadUuid: string, userUuids: readonly string[]) => remnawaveClient.bulkRemoveUsersFromExternalSquad?.(squadUuid, userUuids) ?? Promise.reject(new Error('External squad remove-users is not available.')),
    executeOpenApiOperation: remnawaveClient.executeOpenApiOperation === undefined
      ? undefined
      : (operation: RemnawaveSupportedOperationContract, payload: Record<string, unknown>) => remnawaveClient.executeOpenApiOperation?.(operation, payload) ?? Promise.reject(new Error('OpenAPI execution is not available.')),
  };
}
