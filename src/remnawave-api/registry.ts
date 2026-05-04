import {
  normalizeBillingHistoryResponse,
  normalizeBillingNodesResponse,
  normalizeBillingProvidersResponse,
  normalizeExternalSquadsResponse,
  normalizeHostsResponse,
  normalizeInternalSquadsResponse,
  normalizeNodePluginsResponse,
  normalizeNodesResponse,
  normalizeProfileInboundsResponse,
  normalizeProfileResponse,
  normalizeProfilesResponse,
  normalizeSubscriptionsResponse,
  normalizeSystemHealthResponse,
  normalizeSystemStatsResponse,
  normalizeUsersResolveResponse,
  normalizeUsersResponse,
} from '../client/index.js';
import type {
  NormalizedBillingHistoryItem,
  NormalizedBillingNode,
  NormalizedBillingProvider,
  NormalizedHost,
  NormalizedNode,
  NormalizedNodeMetric,
  NormalizedNodeStatisticsItem,
  NormalizedInternalSquadItem,
  NormalizedProfile,
  NormalizedProfileInboundsResponse,
  NormalizedProfilesResponse,
  NormalizedInternalSquadsResponse,
  NormalizedSubscriptionItem,
  NormalizedSubscriptionPolicySettings,
  NormalizedSubscriptionRequestHistory,
  NormalizedSystemHealth,
  NormalizedSystemRecap,
  NormalizedUser,
  NormalizedUserHwidDevicesResponse,
  NormalizedUserSubscriptionHistoryResponse,
  NormalizedUsersResolveResponse,
  NormalizedUsersResponse,
} from '../client/index.js';
import { applySensitiveReadPolicy, type SensitiveReadRevealMode } from '../runtime/errors.js';
import { createOperationResponseMapper, type OperationResponseMapper } from './response-mappers.js';
import { registerRuntimeDomainOperations } from './domains/index.js';
import { REMNAWAVE_OPERATION_INVENTORY } from './generated/operation-inventory.js';
import type { RemnawaveNormalizerId, RemnawaveOpenApiBinding, RemnawaveOperationSafetyMode, RemnawaveSupportedOperationContract } from './operation-contract.js';
import { getSupportedOperationRisk } from './risk.js';
import {
  getSupportedOperationSchema,
  type SchemaFieldDefinition,
  type OperationValidationSchema,
  validateProfilesManageInboundsPayload,
  validateProfilesManageLifecyclePayload,
} from './schema.js';

export interface RemnawaveApiClient {
  readonly getSystemStats: () => Promise<unknown>;
  readonly getSystemHealth?: () => Promise<unknown>;
  readonly getNodesMetrics?: () => Promise<unknown>;
  readonly getBandwidthStats?: () => Promise<unknown>;
  readonly getNodesStatistics?: () => Promise<unknown>;
  readonly generateX25519?: () => Promise<unknown>;
  readonly getSystemRecap?: () => Promise<unknown>;
  readonly getSubscriptionRequestHistory?: () => Promise<unknown>;
  readonly getUsers?: () => Promise<unknown>;
  readonly resolveUser?: (uuid: string) => Promise<unknown>;
  readonly getUserSubscriptionRequestHistory?: (userUuid: string) => Promise<unknown>;
  readonly getUserHwidDevices?: (userUuid: string) => Promise<unknown>;
  readonly getSubscriptions?: () => Promise<unknown>;
  readonly getSubscriptionPolicySettings?: () => Promise<unknown>;
  readonly updateSubscriptionPolicySettings?: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly getSubscriptionTemplateByUuid?: (templateUuid: string) => Promise<unknown>;
  readonly patchSubscriptionPageConfig?: (configUuid: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly listSnippets?: () => Promise<unknown>;
  readonly getHosts?: () => Promise<unknown>;
  readonly createHost?: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly updateHost?: (hostUuid: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly deleteHost?: (hostUuid: string) => Promise<unknown>;
  readonly bulkEnableHosts?: (hostUuids: readonly string[]) => Promise<unknown>;
  readonly bulkDisableHosts?: (hostUuids: readonly string[]) => Promise<unknown>;
  readonly bulkSetHostInbound?: (
    hostUuids: readonly string[],
    inbound: { readonly configProfileUuid: string; readonly configProfileInboundUuid: string },
  ) => Promise<unknown>;
  readonly bulkSetHostPort?: (hostUuids: readonly string[], port: number) => Promise<unknown>;
  readonly getProfiles?: () => Promise<unknown>;
  readonly getProfile?: (profileUuid: string) => Promise<unknown>;
  readonly getComputedProfile?: (profileUuid: string) => Promise<unknown>;
  readonly listProfileInbounds?: (profileUuid: string) => Promise<unknown>;
  readonly createProfile?: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly updateProfile?: (profileUuid: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly deleteProfile?: (profileUuid: string) => Promise<unknown>;
  readonly getNodes?: () => Promise<unknown>;
  readonly getNode?: (nodeUuid: string) => Promise<unknown>;
  readonly getNodeUsersUsage?: (payload: {
    readonly uuid: string;
    readonly start: number;
    readonly end: number;
  }) => Promise<unknown>;
  readonly getNodeMetadata?: (nodeUuid: string) => Promise<unknown>;
  readonly createNode?: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly updateNode?: (nodeUuid: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly deleteNode?: (nodeUuid: string) => Promise<unknown>;
  readonly enableNode?: (nodeUuid: string) => Promise<unknown>;
  readonly disableNode?: (nodeUuid: string) => Promise<unknown>;
  readonly restartNode?: (nodeUuid: string) => Promise<unknown>;
  readonly resetNodeTraffic?: (nodeUuid: string) => Promise<unknown>;
  readonly getInternalSquads?: () => Promise<unknown>;
  readonly bulkAddUsersToInternalSquad?: (squadUuid: string, userUuids: readonly string[]) => Promise<unknown>;
  readonly bulkRemoveUsersFromInternalSquad?: (squadUuid: string, userUuids: readonly string[]) => Promise<unknown>;
  readonly patchInternalSquad?: (squadUuid: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly getExternalSquads?: () => Promise<unknown>;
  readonly getExternalSquadByUuid?: (squadUuid: string) => Promise<unknown>;
  readonly bulkAddUsersToExternalSquad?: (squadUuid: string, userUuids: readonly string[]) => Promise<unknown>;
  readonly bulkRemoveUsersFromExternalSquad?: (squadUuid: string, userUuids: readonly string[]) => Promise<unknown>;
  readonly patchExternalSquad?: (squadUuid: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly getUserMetadata?: (userUuid: string) => Promise<unknown>;
  readonly upsertUserMetadata?: (userUuid: string, payload: Record<string, unknown>) => Promise<unknown>;
  readonly getNodePlugins?: () => Promise<unknown>;
  readonly getNodePlugin?: (pluginUuid: string) => Promise<unknown>;
  readonly createNodePlugin?: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly updateNodePlugin?: (pluginUuid: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly deleteNodePlugin?: (pluginUuid: string) => Promise<unknown>;
  readonly reorderNodePlugins?: (orderedPluginUuids: readonly string[]) => Promise<unknown>;
  readonly cloneNodePlugin?: (sourcePluginUuid: string) => Promise<unknown>;
  readonly getTorrentBlockerReports?: (params?: { readonly size?: number; readonly start?: number }) => Promise<unknown>;
  readonly getTorrentBlockerStats?: () => Promise<unknown>;
  readonly getInfraProviders?: () => Promise<unknown>;
  readonly createInfraProvider?: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly updateInfraProvider?: (providerUuid: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly deleteInfraProvider?: (providerUuid: string) => Promise<unknown>;
  readonly getInfraBillingNodes?: () => Promise<unknown>;
  readonly createInfraBillingNode?: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly updateInfraBillingNode?: (nodeUuid: string, patch: Record<string, unknown>) => Promise<unknown>;
  readonly deleteInfraBillingNode?: (nodeUuid: string) => Promise<unknown>;
  readonly getInfraBillingHistory?: () => Promise<unknown>;
  readonly fetchIpsForUser?: (userUuid: string) => Promise<unknown>;
  readonly fetchUsersIpsForNode?: (nodeUuid: string) => Promise<unknown>;
  readonly getUserIpsFetchJobResult?: (jobId: string) => Promise<unknown>;
  readonly createUser?: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly patchUserSettings?: (userUuid: string, settings: Record<string, unknown>) => Promise<unknown>;
  readonly setUserState?: (
    userUuid: string,
    action: 'enable' | 'disable' | 'reset-traffic',
    body?: Record<string, unknown>,
  ) => Promise<unknown>;
  readonly revokeUserSubscription?: (userUuid: string) => Promise<unknown>;
  readonly deleteUserHwidDevice?: (userUuid: string, hwid: string) => Promise<unknown>;
}

export type ScopeDisposition = 'supported' | 'deferred' | 'denied';
export type RegistryRiskTier = 'tier_1_read' | 'tier_2_bounded_mutation' | 'tier_3_destructive_or_mass_impact' | 'unclassified';

export interface ValidationIssue {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export interface OperationExecutionResult {
  readonly result: unknown;
}

export interface DescribeOperationMetadata {
  readonly domain: string;
  readonly operation: string;
  readonly disposition: ScopeDisposition;
  readonly description: string;
  readonly helpText: string;
  readonly write: boolean;
  readonly riskTier: RegistryRiskTier;
  readonly deferred: boolean;
  readonly schemaSummary: string;
  readonly validationRulesSummary: readonly string[];
  readonly payloadExample: Record<string, unknown>;
  readonly sideEffects: OperationRegistration['sideEffects'];
  readonly rawAllowed: boolean;
  readonly normalizer: RemnawaveNormalizerId;
  readonly safetyMode: RemnawaveOperationSafetyMode;
  readonly openapi: RemnawaveOpenApiBinding;
  readonly execution: {
    readonly clientMethod: string;
  };
}

export interface OperationRegistration {
  readonly discovery: {
    readonly domain: string;
    readonly operation: string;
    readonly description: string;
    readonly helpText: string;
    readonly domainDescription?: string;
  };
  readonly validation: {
    readonly payloadExample: Record<string, unknown>;
    readonly validatePayload: (payload: unknown) => readonly ValidationIssue[];
    readonly schemaSummary: string;
    readonly validationSchema: OperationValidationSchema;
  };
  readonly execution: {
    readonly execute: (client: RemnawaveApiClient, payload: Record<string, unknown>) => Promise<OperationExecutionResult>;
    readonly clientMethod: string;
    readonly deferred: boolean;
  };
  readonly risk: {
    readonly tier: RegistryRiskTier;
  };
  readonly sideEffects: {
    readonly summary: string;
    readonly asyncBehavior: string;
  };
  readonly disposition: ScopeDisposition;
  readonly write: boolean;
  readonly rawAllowed: boolean;
  readonly normalizer: RemnawaveNormalizerId;
  readonly responseMapper: OperationResponseMapper;
  readonly safetyMode: RemnawaveOperationSafetyMode;
  readonly openapi: RemnawaveOpenApiBinding;
}

export interface RemnawaveApiScopeMap {
  readonly supported: readonly string[];
  readonly deferred: readonly string[];
  readonly denied: readonly string[];
  readonly domains: Readonly<Record<string, { readonly supported: readonly string[]; readonly deferred: readonly string[]; readonly denied: readonly string[] }>>;
}

export interface RuntimeOperationFactoryContext {
  readonly supportedReadOperation: typeof supportedReadOperation;
  readonly supportedWriteOperation: typeof supportedWriteOperation;
  readonly validateCreateUserPayload: typeof validateCreateUserPayload;
  readonly validateUsersDisablePayload: typeof validateUsersDisablePayload;
  readonly validateUsersEnablePayload: typeof validateUsersEnablePayload;
  readonly validateHostsBulkSetPortPayload: typeof validateHostsBulkSetPortPayload;
  readonly validateNodesRestartPayload: typeof validateNodesRestartPayload;
  readonly requireClientMethod: typeof requireClientMethod;
  readonly readUuidPayload: typeof readUuidPayload;
  readonly readRequiredStringArrayField: typeof readRequiredStringArrayField;
  readonly readRequiredIntegerField: typeof readRequiredIntegerField;
  readonly toLooseSystemStats: typeof toLooseSystemStats;
  readonly toUsersListResult: typeof toUsersListResult;
  readonly toUsersResolveResponse: typeof toUsersResolveResponse;
}

interface DomainRecord {
  description: string;
  operations: Map<string, OperationRegistration>;
}

const DEFAULT_DOMAIN_DESCRIPTIONS: Readonly<Record<string, string>> = {
  system: 'Panel diagnostics and summary reads.',
  users: 'User lifecycle reads and writes.',
  subscriptions: 'Subscription inspection and lifecycle semantics.',
  profiles: 'Config profile reads and bounded mutations.',
  routing: 'Deferred discovery placeholder for routing/control-plane rule management; no standalone executable seam is published yet.',
  hosts: 'Host inspection and bounded host-definition changes.',
  internal_squads: 'Internal squad inspection and membership control.',
  external_squads: 'External squad delivery-policy reads and mutations.',
  nodes: 'Node inventory, diagnostics, and lifecycle actions.',
  node_plugins: 'Node plugin configuration, reports, and executor actions.',
  ip_control: 'IP-control async fetch jobs and destructive connection actions.',
  metadata: 'Metadata reads and writes for users and nodes.',
  infra_billing: 'Infra billing providers, nodes, and history.',
  templates: 'Subscription template inspection and mutations.',
  subscription_page: 'Subscription-page configuration changes.',
  snippets: 'Snippet inventory and lifecycle management.',
  auth: 'Authentication, passkeys, tokens, and panel settings.',
  public_subscriptions: 'Public subscription endpoints under /sub/*.',
};

export class OperationRegistry {
  private readonly domains = new Map<string, DomainRecord>();

  register(domain: string, operation: string, metadata: OperationRegistration): void {
    const normalizedDomain = normalizeIdentifier(domain, 'domain');
    const normalizedOperation = normalizeIdentifier(operation, 'operation');
    const record = this.domains.get(normalizedDomain) ?? {
      description: metadata.discovery.domainDescription ?? DEFAULT_DOMAIN_DESCRIPTIONS[normalizedDomain] ?? '',
      operations: new Map<string, OperationRegistration>(),
    };

    if (record.operations.has(normalizedOperation)) {
      throw new Error(`Operation already registered: ${normalizedDomain}/${normalizedOperation}.`);
    }

    record.description = metadata.discovery.domainDescription ?? record.description ?? DEFAULT_DOMAIN_DESCRIPTIONS[normalizedDomain] ?? '';
    record.operations.set(normalizedOperation, {
      ...metadata,
      discovery: {
        ...metadata.discovery,
        domain: normalizedDomain,
        operation: normalizedOperation,
      },
    });
    this.domains.set(normalizedDomain, record);
  }

  has(domain: string, operation: string): boolean {
    return this.get(domain, operation) !== undefined;
  }

  get(domain: string, operation: string): OperationRegistration | undefined {
    const normalizedDomain = normalizeLookup(domain);
    const normalizedOperation = normalizeLookup(operation);
    if (normalizedDomain === null || normalizedOperation === null) {
      return undefined;
    }

    return this.domains.get(normalizedDomain)?.operations.get(normalizedOperation);
  }

  getDomainDescription(domain: string): string | undefined {
    const normalizedDomain = normalizeLookup(domain);
    if (normalizedDomain === null) {
      return undefined;
    }

    return this.domains.get(normalizedDomain)?.description;
  }

  hasDomain(domain: string): boolean {
    return this.getDomainDescription(domain) !== undefined;
  }

  listDomains(): string[] {
    return [...this.domains.keys()].sort((left, right) => left.localeCompare(right));
  }

  listOperations(domain: string): OperationRegistration[] {
    const normalizedDomain = normalizeLookup(domain);
    if (normalizedDomain === null) {
      return [];
    }

    const operations = this.domains.get(normalizedDomain)?.operations;
    if (operations === undefined) {
      return [];
    }

    return [...operations.values()].sort((left, right) => left.discovery.operation.localeCompare(right.discovery.operation));
  }

  getDomainOperations(domain: string): OperationRegistration[] {
    const normalizedDomain = normalizeLookup(domain);
    if (normalizedDomain === null) {
      return [];
    }

    const operations = this.domains.get(normalizedDomain)?.operations;
    return operations === undefined ? [] : [...operations.values()];
  }

  generateDiscovery(): Array<{
    readonly domain: string;
    readonly description: string;
    readonly operations: Array<{
      readonly operation: string;
      readonly disposition: ScopeDisposition;
      readonly description: string;
      readonly helpText: string;
      readonly riskTier: RegistryRiskTier;
      readonly deferred: boolean;
    }>;
  }> {
    return this.listDomains().map((domain) => ({
      domain,
      description: this.getDomainDescription(domain) ?? '',
      operations: this.listOperations(domain).map((operation) => ({
        operation: operation.discovery.operation,
        disposition: operation.disposition,
        description: operation.discovery.description,
        helpText: operation.discovery.helpText,
        riskTier: operation.risk.tier,
        deferred: operation.execution.deferred,
      })),
    }));
  }

  describeOperation(domain: string, operation: string): DescribeOperationMetadata | null {
    const registration = this.get(domain, operation);
    if (registration === undefined) {
      return null;
    }

    return {
      domain: registration.discovery.domain,
      operation: registration.discovery.operation,
      disposition: registration.disposition,
      description: registration.discovery.description,
      helpText: registration.discovery.helpText,
      write: registration.write,
      riskTier: registration.risk.tier,
      deferred: registration.execution.deferred,
      schemaSummary: registration.validation.schemaSummary,
      validationRulesSummary: summarizeValidationRules(registration.validation.validationSchema),
      payloadExample: registration.validation.payloadExample,
    sideEffects: registration.sideEffects,
    execution: {
      clientMethod: registration.execution.clientMethod,
    },
    rawAllowed: registration.rawAllowed,
    normalizer: registration.normalizer,
    safetyMode: registration.safetyMode,
    openapi: registration.openapi,
  };
  }

  getScopeMap(): RemnawaveApiScopeMap {
    const supported: string[] = [];
    const deferred: string[] = [];
    const denied: string[] = [];
    const domains: Record<string, { supported: string[]; deferred: string[]; denied: string[] }> = {};

    for (const [domain, record] of this.domains.entries()) {
      domains[domain] = { supported: [], deferred: [], denied: [] };

      for (const [operation, registration] of record.operations.entries()) {
        const qualifiedName = `${domain}.${operation}`;
        domains[domain][registration.disposition].push(operation);

        if (registration.disposition === 'supported') {
          supported.push(qualifiedName);
        } else if (registration.disposition === 'deferred') {
          deferred.push(qualifiedName);
        } else {
          denied.push(qualifiedName);
        }
      }
    }

    return {
      supported,
      deferred,
      denied,
      domains,
    };
  }

}

export function createDefaultOperationRegistry(): OperationRegistry {
  const registry = new OperationRegistry();
  registerRuntimeDomainOperations(registry, {
    supportedReadOperation,
    supportedWriteOperation,
    validateCreateUserPayload,
    validateUsersDisablePayload,
    validateUsersEnablePayload,
    validateHostsBulkSetPortPayload,
    validateNodesRestartPayload,
    requireClientMethod,
    readUuidPayload,
    readRequiredStringArrayField,
    readRequiredIntegerField,
    toLooseSystemStats,
    toUsersListResult,
    toUsersResolveResponse,
  });
  return registry;
}

export const DEFAULT_OPERATION_REGISTRY = createDefaultOperationRegistry();

function normalizeIdentifier(value: string, field: 'domain' | 'operation'): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeLookup(value: string): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

function registerDomain(registry: OperationRegistry, domain: string, operations: readonly OperationRegistration[]): void {
  for (const operation of operations) {
    registry.register(domain, operation.discovery.operation, operation);
  }
}

function supportedReadOperation(
  domain: string,
  operation: string,
  description: string,
  helpText: string,
  _internalLegacyNotes: string,
  _internalLegacyToolName: string,
  clientMethod: string,
  execute: (client: RemnawaveApiClient, payload: Record<string, unknown>) => Promise<OperationExecutionResult>,
): OperationRegistration {
  const schema = getSupportedOperationSchema(domain, operation);
  const contract = getSupportedInventoryContract(domain, operation);

  return {
    discovery: {
      domain,
      operation,
      description,
      helpText,
      domainDescription: DEFAULT_DOMAIN_DESCRIPTIONS[domain],
    },
    validation: {
      payloadExample: schema.payloadExample,
      validatePayload: schema.validatePayload,
      schemaSummary: schema.schemaSummary,
      validationSchema: schema.validationSchema,
    },
    execution: {
      execute,
      clientMethod,
      deferred: false,
    },
    risk: {
      tier: toRegistryRiskTier(getSupportedOperationRisk(domain, operation).tier),
    },
    sideEffects: {
      summary: `Reads remote state for ${domain}.${operation} without mutating panel data.`,
      asyncBehavior: 'synchronous request; returns current data only and does not trigger background work.',
    },
    disposition: 'supported',
    write: false,
    rawAllowed: contract.rawAllowed,
    normalizer: contract.normalizer,
    responseMapper: createOperationResponseMapper({ domain, operation, normalizer: contract.normalizer }),
    safetyMode: contract.safetyMode,
    openapi: contract.openapi,
  };
}

function supportedWriteOperation(
  domain: string,
  operation: string,
  description: string,
  helpText: string,
  _internalLegacyNotes: string,
  payloadExample: Record<string, unknown>,
  _internalLegacyToolName: string,
  clientMethod: string,
  validatePayload: (payload: unknown) => readonly ValidationIssue[],
  execute: (client: RemnawaveApiClient, payload: Record<string, unknown>) => Promise<OperationExecutionResult>,
): OperationRegistration {
  const schema = getSupportedOperationSchema(domain, operation);
  const contract = getSupportedInventoryContract(domain, operation);

  return {
    discovery: {
      domain,
      operation,
      description,
      helpText,
      domainDescription: DEFAULT_DOMAIN_DESCRIPTIONS[domain],
    },
    validation: {
      payloadExample,
      validatePayload,
      schemaSummary: schema.schemaSummary,
      validationSchema: schema.validationSchema,
    },
    execution: {
      execute,
      clientMethod,
      deferred: false,
    },
    risk: {
      tier: toRegistryRiskTier(getSupportedOperationRisk(domain, operation).tier),
    },
    sideEffects: {
      summary: `Mutates remote state for ${domain}.${operation} within its validated bounded scope.`,
      asyncBehavior: 'synchronous request; remote state changes immediately when the upstream accepts the payload.',
    },
    disposition: 'supported',
    write: true,
    rawAllowed: contract.rawAllowed,
    normalizer: contract.normalizer,
    responseMapper: createOperationResponseMapper({ domain, operation, normalizer: contract.normalizer }),
    safetyMode: contract.safetyMode,
    openapi: contract.openapi,
  };
}

function validateCreateUserPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('users', 'create_user').validatePayload(payload);
}

function validateUsersDisablePayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('users', 'disable').validatePayload(payload);
}

function validateUsersEnablePayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('users', 'enable').validatePayload(payload);
}

function validateUsersManageLifecyclePayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('users', 'manage_lifecycle').validatePayload(payload);
}

function validateUsersManageDevicesPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('users', 'manage_devices').validatePayload(payload);
}

function validateSettingsPatchPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('subscriptions', 'manage_global_settings').validatePayload(payload);
}

function validateHostManageLifecyclePayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('hosts', 'manage_lifecycle').validatePayload(payload);
}

function validateHostManageRoutingPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('hosts', 'manage_routing').validatePayload(payload);
}

function validateHostManageDefinitionPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('hosts', 'manage_definition').validatePayload(payload);
}

function validateHostsBulkSetPortPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('hosts', 'bulk_set_port').validatePayload(payload);
}

function validateInternalSquadManageMembershipPayload(payload: unknown): readonly ValidationIssue[] {
  const issues = [...getSupportedOperationSchema('internal_squads', 'manage_membership').validatePayload(payload)];

  if (issues.length > 0 || typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return issues;
  }

  const action = (payload as Record<string, unknown>).action;
  if (action !== 'add_users' && action !== 'remove_users') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be one of "add_users" or "remove_users".',
    });
  }

  return issues;
}

function validateInternalSquadManageDefinitionPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('internal_squads', 'manage_definition').validatePayload(payload);
}

function validateExternalSquadManageMembershipPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('external_squads', 'manage_membership').validatePayload(payload);
}

function validateExternalSquadManageDefinitionPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('external_squads', 'manage_definition').validatePayload(payload);
}

function validateNodesManageLifecyclePayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('nodes', 'manage_lifecycle').validatePayload(payload);
}

function validateNodesManageMaintenancePayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('nodes', 'manage_maintenance').validatePayload(payload);
}

function validateNodesRestartPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('nodes', 'restart').validatePayload(payload);
}

function validateNodePluginsManageConfigurationPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('node_plugins', 'manage_configuration').validatePayload(payload);
}

function validateMetadataManageUserPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('metadata', 'manage_user').validatePayload(payload);
}

function validateInfraBillingManageProviderPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('infra_billing', 'manage_provider').validatePayload(payload);
}

function validateInfraBillingManageNodePayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('infra_billing', 'manage_node').validatePayload(payload);
}

function validateSubscriptionPageConfigPayload(payload: unknown): readonly ValidationIssue[] {
  return getSupportedOperationSchema('subscription_page', 'manage_configuration').validatePayload(payload);
}

function deferredReadOperation(domain: string, operation: string, description: string, helpText: string, _internalLegacyToolName: string, clientMethod: string): OperationRegistration {
  return unsupportedOperation(domain, operation, description, helpText, {}, clientMethod, 'deferred', false);
}

function deferredWriteOperation(domain: string, operation: string, description: string, helpText: string, payloadExample: Record<string, unknown>, _internalLegacyToolName: string, clientMethod: string): OperationRegistration {
  return unsupportedOperation(domain, operation, description, helpText, payloadExample, clientMethod, 'deferred', true);
}

function deniedReadOperation(domain: string, operation: string, description: string, helpText: string, _internalLegacyToolName: string, clientMethod: string): OperationRegistration {
  return unsupportedOperation(domain, operation, description, helpText, {}, clientMethod, 'denied', false);
}

function deniedWriteOperation(domain: string, operation: string, description: string, helpText: string, payloadExample: Record<string, unknown>, _internalLegacyToolName: string, clientMethod: string): OperationRegistration {
  return unsupportedOperation(domain, operation, description, helpText, payloadExample, clientMethod, 'denied', true);
}

function unsupportedOperation(
  domain: string,
  operation: string,
  description: string,
  helpText: string,
  payloadExample: Record<string, unknown>,
  clientMethod: string,
  disposition: Exclude<ScopeDisposition, 'supported'>,
  write: boolean,
): OperationRegistration {
  return {
    discovery: {
      domain,
      operation,
      description,
      helpText,
      domainDescription: DEFAULT_DOMAIN_DESCRIPTIONS[domain],
    },
    validation: {
      payloadExample,
      validatePayload: () => [],
      schemaSummary: write ? 'operation is documented but not executable in v1 MVP' : 'read is documented but not executable in v1 MVP',
      validationSchema: {
        type: 'object',
        additionalProperties: true,
        required: [],
        properties: {},
      },
    },
    execution: {
      execute: unsupportedExecution,
      clientMethod,
      deferred: disposition === 'deferred',
    },
    risk: {
      tier: 'unclassified',
    },
    sideEffects: {
      summary: write ? 'Would mutate panel state if later admitted into scope.' : 'Read-only if admitted into a later scope.',
      asyncBehavior: 'not_executed',
    },
    disposition,
    write,
    rawAllowed: false,
    normalizer: 'none',
    responseMapper: (value: unknown) => value,
    safetyMode: write ? 'confirm' : 'direct',
    openapi: {
      method: 'get',
      path: '',
      operationId: clientMethod,
      requestSchemaKey: null,
      responseSchemaKeys: [],
    },
  };
}

function getSupportedInventoryContract(domain: string, operation: string): RemnawaveSupportedOperationContract {
  const key = `${domain}.${operation}`;
  const contract = REMNAWAVE_OPERATION_INVENTORY.operations.find((entry) => entry.key === key);

  if (contract?.status !== 'supported') {
    throw new Error(`Supported operation inventory entry not found for ${key}.`);
  }

  return contract;
}

async function unsupportedExecution(): Promise<OperationExecutionResult> {
  throw new Error('Unsupported operations must not execute.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toLooseSystemStats(value: unknown): unknown {
  if (
    isRecord(value)
    && isRecord(value.cpu)
    && isRecord(value.memory)
    && isRecord(value.users)
    && isRecord(value.online)
    && isRecord(value.nodes)
  ) {
    return value;
  }

  return normalizeSystemStatsResponse(value);
}

function toSystemHealth(value: unknown): NormalizedSystemHealth {
  if (isNormalizedSystemHealth(value)) {
    return value;
  }

  return normalizeSystemHealthResponse(value);
}

function toSystemRecap(value: unknown): NormalizedSystemRecap {
  if (isNormalizedSystemRecap(value)) {
    return value;
  }

  const record = toRecordOrNull(value) ?? {};
  return {
    totalUsers: readNumberLike(record.totalUsers),
    activeUsers: readNumberLike(record.activeUsers),
    inactiveUsers: readNumberLike(record.inactiveUsers),
    expiredUsers: readNumberLike(record.expiredUsers),
    generatedAt: readStringLike(record.generatedAt) ?? readStringLike(record.timestamp),
    raw: record,
  };
}

function toSystemHealthResult(value: unknown): Record<string, unknown> {
  const health = toSystemHealth(value);
  const instanceTypes = [...new Set(health.instances.map((instance) => instance.type))].sort();

  return {
    summary: {
      instances: health.instances.length,
      instanceTypes,
      maxEventLoopDelayMs: Math.max(0, ...health.instances.map((instance) => instance.eventLoopDelayMs)),
    },
    health,
  };
}

function toSystemRecapResult(value: unknown): Record<string, unknown> {
  const recap = toSystemRecap(value);

  return {
    summary: {
      totalUsers: recap.totalUsers ?? 0,
      activeUsers: recap.activeUsers ?? 0,
      inactiveUsers: recap.inactiveUsers ?? 0,
      expiredUsers: recap.expiredUsers ?? 0,
    },
    recap,
  };
}

function requireClientMethod<TName extends keyof RemnawaveApiClient>(
  client: RemnawaveApiClient,
  methodName: TName,
  operationName: string,
): NonNullable<RemnawaveApiClient[TName]> {
  const candidate = client[methodName];
  if (typeof candidate !== 'function') {
    throw new Error(`${operationName} is not configured in this runtime.`);
  }

  return candidate as NonNullable<RemnawaveApiClient[TName]>;
}

function toNodeMetrics(value: unknown): readonly NormalizedNodeMetric[] {
  return extractItemsArray(value).map((item) => {
    const record = isRecord(item) ? item : {};
    return {
      nodeUuid: readStringLike(record.nodeUuid) ?? readStringLike(record.uuid) ?? '',
      nodeName: readStringLike(record.nodeName) ?? readStringLike(record.name),
      cpuLoad: readNumberLike(record.cpuLoad) ?? readNumberLike(record.cpu),
      memoryUsageBytes:
        readNumberLike(record.memoryUsageBytes)
        ?? readNumberLike(record.memoryUsedBytes)
        ?? readNumberLike(record.memory),
      collectedAt: readStringLike(record.collectedAt) ?? readStringLike(record.timestamp),
      raw: record,
    };
  });
}

function toNodeStatistics(value: unknown): readonly NormalizedNodeStatisticsItem[] {
  return extractItemsArray(value).map((item) => {
    const record = isRecord(item) ? item : {};
    return {
      nodeUuid: readStringLike(record.nodeUuid) ?? readStringLike(record.uuid) ?? '',
      nodeName: readStringLike(record.nodeName) ?? readStringLike(record.name),
      onlineUsers: readNumberLike(record.onlineUsers),
      trafficUsedBytes: readStringLike(record.trafficUsedBytes),
      raw: record,
    };
  });
}

function toSubscriptionRequestHistory(value: unknown): NormalizedSubscriptionRequestHistory {
  if (isNormalizedSubscriptionRequestHistory(value)) {
    return value;
  }

  const record = toRecordOrNull(value);
  const items = extractItemsArray(record ?? value).map((item) => toSubscriptionRequestHistoryItem(item));
  const stats = record !== null && isRecord(record.stats)
    ? record.stats
    : {};

  return { items, stats };
}

function readNumberLike(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readStringLike(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function toRecordOrNull(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  return isRecord(value.response) ? value.response : value;
}

function extractItemsArray(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const response = toRecordOrNull(value);
  if (response === null) {
    return [];
  }

  if (Array.isArray(response.items)) {
    return response.items;
  }

  if (Array.isArray(response.response)) {
    return response.response;
  }

  if (Array.isArray(response.metrics)) {
    return response.metrics;
  }

  if (Array.isArray(response.nodes)) {
    return response.nodes;
  }

  if (Array.isArray(response.history)) {
    return response.history;
  }

  return [];
}

function toSubscriptionRequestHistoryItem(value: unknown): NormalizedSubscriptionRequestHistory['items'][number] {
  const record = isRecord(value) ? value : {};
  return {
    requestedAt: readStringLike(record.requestedAt),
    source: readStringLike(record.source),
    outcome: readStringLike(record.outcome),
    subscriptionUrl: readStringLike(record.subscriptionUrl),
    clientHints: Array.isArray(record.clientHints)
      ? record.clientHints.filter((entry): entry is string => typeof entry === 'string')
      : [],
  };
}

function isNormalizedSystemHealth(value: unknown): value is NormalizedSystemHealth {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Array.isArray(record.instances);
}

function isNormalizedSystemRecap(value: unknown): value is NormalizedSystemRecap {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return 'totalUsers' in record && 'activeUsers' in record && 'inactiveUsers' in record && 'expiredUsers' in record;
}

function isNormalizedSubscriptionRequestHistory(value: unknown): value is NormalizedSubscriptionRequestHistory {
  if (!isRecord(value)) {
    return false;
  }

  return Array.isArray(value.items) && isRecord(value.stats);
}

function toUsersResponse(value: unknown): NormalizedUsersResponse {
  if (isNormalizedUsersResponse(value)) {
    return value;
  }

  return normalizeUsersResponse(value);
}

function toUsersResolveResponse(value: unknown): NormalizedUsersResolveResponse {
  if (isNormalizedUsersResolveResponse(value)) {
    return value;
  }

  return normalizeUsersResolveResponse(value);
}

function toSubscriptionsResponse(value: unknown): { readonly items: readonly NormalizedSubscriptionItem[] } {
  if (isNormalizedSubscriptionsResponse(value)) {
    return value;
  }

  return normalizeSubscriptionsResponse(value);
}

function toUsersListResult(value: unknown): Record<string, unknown> {
  const users = toUsersResponse(value);
  return {
    total: users.total,
    items: users.items,
  };
}

function toSubscriptionsListResult(value: unknown): Record<string, unknown> {
  const subscriptions = toSubscriptionsResponse(value);
  return {
    total: subscriptions.items.length,
    items: subscriptions.items,
  };
}

function toSubscriptionPolicySettingsResult(value: unknown): NormalizedSubscriptionPolicySettings {
  if (isNormalizedSubscriptionPolicySettings(value)) {
    return value;
  }

  if (isRecord(value) && isRecord(value.values)) {
    return { values: value.values };
  }

  const response = toRecordOrNull(value);
  if (response !== null && isRecord(response.values)) {
    return { values: response.values };
  }

  return { values: response ?? {} };
}

function toCompactSubscriptionPolicySettingsResult(value: unknown): Record<string, unknown> {
  const settings = toSubscriptionPolicySettingsResult(value);
  const supportedPatch = {
    responseRulesEnabled: typeof settings.values.responseRulesEnabled === 'boolean'
      ? settings.values.responseRulesEnabled
      : null,
    defaultTemplateUuid: readStringLike(settings.values.defaultTemplateUuid),
  };
  const additionalSettingKeys = Object.keys(settings.values)
    .filter((key) => key !== 'responseRulesEnabled' && key !== 'defaultTemplateUuid')
    .sort();

  return {
    supportedPatch,
    additionalSettingKeys,
    additionalSettingKeyCount: additionalSettingKeys.length,
    rawValuesOmitted: additionalSettingKeys.length > 0,
  };
}

function toProfilesResponse(value: unknown): NormalizedProfilesResponse {
  if (isNormalizedProfilesResponse(value)) {
    return value;
  }

  return normalizeProfilesResponse(value);
}

function toProfileResult(value: unknown): NormalizedProfile {
  if (isNormalizedProfile(value)) {
    return value;
  }

  return normalizeProfileResponse(value);
}

function toProfileInboundsResponse(value: unknown): NormalizedProfileInboundsResponse {
  if (isNormalizedProfileInboundsResponse(value)) {
    return value;
  }

  return normalizeProfileInboundsResponse(value);
}

function toProfilesListResult(value: unknown): Record<string, unknown> {
  const profiles = toProfilesResponse(value);
  return {
    total: profiles.total,
    items: profiles.items,
  };
}

function toProfileInboundsResult(value: unknown): Record<string, unknown> {
  const inbounds = toProfileInboundsResponse(value);
  return {
    total: inbounds.total,
    items: inbounds.items,
  };
}

function toHostsListResult(value: unknown): Record<string, unknown> {
  const hosts = toHostsResponse(value);
  return {
    total: hosts.total,
    items: hosts.items,
  };
}

function toInternalSquadsListResult(value: unknown): Record<string, unknown> {
  const squads = toInternalSquadsResponse(value);
  return {
    total: squads.total,
    items: squads.items,
  };
}

function toExternalSquadsListResult(value: unknown): Record<string, unknown> {
  const squads = toExternalSquadsResponse(value);
  return {
    total: squads.total,
    items: squads.items,
  };
}

function toNodesListResult(value: unknown): Record<string, unknown> {
  const nodes = toNodesResponse(value);
  return {
    items: nodes.items,
  };
}

function toNodePluginsListResult(value: unknown): Record<string, unknown> {
  const plugins = toNodePluginsResponse(value);
  return {
    total: plugins.total,
    plugins: plugins.plugins,
  };
}

function toInfraBillingProvidersListResult(value: unknown): Record<string, unknown> {
  const providers = toInfraBillingProvidersResponse(value);
  return {
    items: providers.items,
  };
}

function toInfraBillingNodesListResult(value: unknown): Record<string, unknown> {
  const nodes = toInfraBillingNodesResponse(value);
  return {
    items: nodes.items,
  };
}

function toInfraBillingHistoryListResult(value: unknown): Record<string, unknown> {
  const history = toInfraBillingHistoryResponse(value);
  return {
    items: history.items,
  };
}

function toSnippetsListResult(value: unknown): Record<string, unknown> {
  const items = extractItemsArray(value).map((item) => {
    const record = isRecord(item) ? item : {};
    return {
      uuid: readStringLike(record.uuid) ?? '',
      name: readStringLike(record.name) ?? '',
      type: readStringLike(record.type),
      body: readStringLike(record.body),
      raw: record,
    };
  });

  return {
    total: items.length,
    items,
  };
}

async function executeUsersResolve(
  client: RemnawaveApiClient,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const revealMode = readSensitiveReadRevealMode(payload);
  const user = await resolveUserFromPayload(payload, client);
  const policy = applySensitiveReadPolicy<NormalizedUsersResolveResponse>(
    {
      found: true,
      match: {
        uuid: user.uuid,
        shortUuid: user.shortUuid,
        username: user.username,
      },
    },
    { reveal: revealMode },
  );

  return {
    sensitiveRead: policy.policy,
    data: policy.data,
  };
}

async function executeUsersInspect(
  client: RemnawaveApiClient,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const revealMode = readSensitiveReadRevealMode(payload);
  const user = await resolveUserFromPayload(payload, client);
  const subscriptions = toSubscriptionsResponse(
    await requireClientMethod(client, 'getSubscriptions', 'users.inspect')(),
  );
  const nodes = typeof client.getNodes === 'function'
    ? toNodesResponse(await client.getNodes())
    : { items: [] };
  const subscription = subscriptions.items.find((entry) => entry.user.shortUuid === user.shortUuid) ?? null;
  const devices = typeof client.getUserHwidDevices === 'function'
    ? toUserHwidDevicesResponse(await client.getUserHwidDevices(user.uuid))
    : { items: [] } satisfies NormalizedUserHwidDevicesResponse;
  const accessibleNodes = user.traffic.lastConnectedNodeUuid === null
    ? []
    : nodes.items
        .filter((node) => node.uuid === user.traffic.lastConnectedNodeUuid)
        .map((node) => ({ uuid: node.uuid, name: node.name }));

  const policy = applySensitiveReadPolicy(
    {
      identity: {
        uuid: user.uuid,
        shortUuid: user.shortUuid,
        username: user.username,
        telegramId: user.telegramId,
        status: user.status,
      },
      subscriptionSupport: {
        subscriptionUrl: subscription?.subscriptionUrl ?? user.subscriptionUrl,
        linkCount: subscription?.links.length ?? 0,
        expiresAt: user.expiresAt,
        internalSquads: user.squads.internalNames,
      },
      accessibleNodes,
      hwid: {
        deviceCount: devices.items.length,
        devices: devices.items,
      },
    },
    { reveal: revealMode },
  );

  return {
    sensitiveRead: policy.policy,
    data: policy.data,
  };
}

async function executeUsersSubscriptionHistory(
  client: RemnawaveApiClient,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const revealMode = readSensitiveReadRevealMode(payload);
  const user = await resolveUserFromPayload(payload, client);
  const history = toUserSubscriptionHistoryResponse(
    await requireClientMethod(client, 'getUserSubscriptionRequestHistory', 'users.get_subscription_history')(user.uuid),
  );
  const policy = applySensitiveReadPolicy(
    {
      total: history.items.length,
      items: history.items,
    },
    { reveal: revealMode },
  );

  return {
    sensitiveRead: policy.policy,
    data: policy.data,
  };
}

async function executeSubscriptionsSupportContext(
  client: RemnawaveApiClient,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const revealMode = readSensitiveReadRevealMode(payload);
  const user = await resolveUserFromPayload(payload, client);
  const subscriptions = toSubscriptionsResponse(
    await requireClientMethod(client, 'getSubscriptions', 'subscriptions.inspect_support_context')(),
  );
  const subscription = subscriptions.items.find((entry) => entry.user.shortUuid === user.shortUuid) ?? null;
  const result = {
    user: {
      uuid: user.uuid,
      shortUuid: user.shortUuid,
      username: user.username,
      status: user.status,
    },
    subscriptionUrl: subscription?.subscriptionUrl ?? user.subscriptionUrl,
    expiresAt: user.expiresAt,
    traffic: {
      usedBytes: subscription?.user.usedBytes ?? user.traffic.usedBytes,
      lifetimeUsedBytes: subscription?.user.lifetimeUsedBytes ?? user.traffic.lifetimeUsedBytes,
      limitBytes: subscription?.user.limitBytes ?? user.traffic.limitBytes,
    },
    connectionKeys: (subscription?.links ?? []).map((key) => `token=${key}`),
  };
  const guarded = {
    ...result,
    connectionKeys: result.connectionKeys.map((key) => `token=${key}`),
  };
  const policy = applySensitiveReadPolicy(result, { reveal: revealMode });

  return {
    sensitiveRead: policy.policy,
    data: revealMode === 'full' ? policy.data : applySensitiveReadPolicy(guarded, { reveal: revealMode }).data,
  };
}

async function executeSubscriptionsPageDelivery(
  client: RemnawaveApiClient,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const revealMode = readSensitiveReadRevealMode(payload);
  const includeRawKeys = payload.includeRawKeys === true;
  const user = await resolveUserFromPayload(payload, client);
  const subscriptions = toSubscriptionsResponse(
    await requireClientMethod(client, 'getSubscriptions', 'subscriptions.inspect_page_delivery')(),
  );
  const subscription = subscriptions.items.find((entry) => entry.user.shortUuid === user.shortUuid) ?? null;
  const result = {
    user: {
      uuid: user.uuid,
      shortUuid: user.shortUuid,
      username: user.username,
    },
    subscriptionUrl: subscription?.subscriptionUrl ?? user.subscriptionUrl,
    page: {
      showConnectionKeys: includeRawKeys && revealMode === 'full',
      hwidEnabled: null,
    },
    connectionKeys: subscription?.links ?? [],
  };
  const guarded = {
    ...result,
    connectionKeys: result.connectionKeys.map((key) => `token=${key}`),
  };
  const policy = applySensitiveReadPolicy(result, { reveal: revealMode });

  return {
    sensitiveRead: policy.policy,
    data: revealMode === 'full' ? policy.data : applySensitiveReadPolicy(guarded, { reveal: revealMode }).data,
  };
}

async function resolveUserFromPayload(
  payload: Record<string, unknown>,
  client: RemnawaveApiClient,
): Promise<NormalizedUser> {
  const selector = readUserSelector(payload.selector);

  try {
    return await resolveUserBySelector(selector, client);
  } catch (error) {
    if (selector.uuid !== null && typeof client.resolveUser === 'function') {
      const resolved = toUsersResolveResponse(await client.resolveUser(selector.uuid));
      if (resolved.found && resolved.match !== null) {
        return {
          uuid: resolved.match.uuid,
          shortUuid: resolved.match.shortUuid,
          username: resolved.match.username,
          status: 'ACTIVE',
          telegramId: null,
          subscriptionUrl: null,
          expiresAt: null,
          createdAt: null,
          updatedAt: null,
          traffic: {
            usedBytes: 0,
            lifetimeUsedBytes: 0,
            limitBytes: 0,
            strategy: null,
            onlineAt: null,
            lastConnectedNodeUuid: null,
          },
          squads: {
            internalNames: [],
            externalUuid: null,
          },
        };
      }
    }

    throw error;
  }
}

async function resolveUserBySelector(
  selector: ReturnType<typeof readUserSelector>,
  client: RemnawaveApiClient,
): Promise<NormalizedUser> {
  const users = await loadUsers(client, 'users.resolve');
  const matches = users.items.filter((candidate) => matchesUserSelector(candidate, selector));
  if (matches.length === 0) {
    throw new Error('User selector did not match any user.');
  }
  if (matches.length > 1) {
    throw new Error('Ambiguous user selector matched more than one user.');
  }

  return matches[0] as NormalizedUser;
}

async function loadUsers(
  client: RemnawaveApiClient,
  operationName: string,
): Promise<NormalizedUsersResponse> {
  return toUsersResponse(await requireClientMethod(client, 'getUsers', operationName)());
}

function readSensitiveReadRevealMode(payload: Record<string, unknown>): SensitiveReadRevealMode {
  return payload.reveal === 'full' ? 'full' : 'redacted';
}

function readUserSelector(value: unknown): {
  readonly uuid: string | null;
  readonly shortUuid: string | null;
  readonly username: string | null;
  readonly telegramId: number | null;
} {
  const selector = isRecord(value) ? value : null;
  if (selector === null) {
    throw new Error('payload.selector must be an object.');
  }

  const uuid = readStringLike(selector.uuid);
  const shortUuid = readStringLike(selector.shortUuid);
  const username = readStringLike(selector.username);
  const telegramId = typeof selector.telegramId === 'number' && Number.isInteger(selector.telegramId)
    ? selector.telegramId
    : null;
  const total = [uuid, shortUuid, username, telegramId].filter((entry) => entry !== null).length;
  if (total !== 1) {
    throw new Error('Selector must provide exactly one of uuid, shortUuid, username, or telegramId.');
  }

  return { uuid, shortUuid, username, telegramId };
}

function toUserSubscriptionHistoryResponse(value: unknown): NormalizedUserSubscriptionHistoryResponse {
  if (isNormalizedUserSubscriptionHistoryResponse(value)) {
    return value;
  }

  if (isRecord(value) && Array.isArray(value.items)) {
    return {
      items: value.items.map((entry) => toNormalizedHistoryItem(entry)),
    };
  }

  if (isRecord(value) && Array.isArray(value.response)) {
    return {
      items: value.response.map((entry) => toNormalizedHistoryItem(entry)),
    };
  }

  return { items: [] };
}

function toUserHwidDevicesResponse(value: unknown): NormalizedUserHwidDevicesResponse {
  if (isNormalizedUserHwidDevicesResponse(value)) {
    return value;
  }

  if (isRecord(value) && Array.isArray(value.items)) {
    return {
      items: value.items.map((entry) => toNormalizedHwidDevice(entry)),
    };
  }

  if (isRecord(value) && Array.isArray(value.devices)) {
    return {
      items: value.devices.map((entry) => toNormalizedHwidDevice(entry)),
    };
  }

  return { items: [] };
}

function toNormalizedHistoryItem(value: unknown): NormalizedUserSubscriptionHistoryResponse['items'][number] {
  const record = isRecord(value) ? value : {};
  return {
    requestedAt: readStringLike(record.requestedAt),
    source: readStringLike(record.source),
    outcome: readStringLike(record.outcome),
    subscriptionUrl: readStringLike(record.subscriptionUrl),
    clientHints: Array.isArray(record.clientHints)
      ? record.clientHints.filter((entry): entry is string => typeof entry === 'string')
      : [],
  };
}

function toNormalizedHwidDevice(value: unknown): NormalizedUserHwidDevicesResponse['items'][number] {
  const record = isRecord(value) ? value : {};
  return {
    hwid: readStringLike(record.hwid) ?? '',
    deviceModel: readStringLike(record.deviceModel) ?? readStringLike(record.model),
    platform: readStringLike(record.platform),
    createdAt: readStringLike(record.createdAt),
    updatedAt: readStringLike(record.updatedAt),
  };
}

function normalizeTelegramId(value: string | number | null): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

function matchesUserSelector(
  user: NormalizedUser,
  selector: ReturnType<typeof readUserSelector>,
): boolean {
  if (selector.uuid !== null) {
    return user.uuid === selector.uuid;
  }
  if (selector.shortUuid !== null) {
    return user.shortUuid === selector.shortUuid;
  }
  if (selector.username !== null) {
    return user.username === selector.username;
  }
  if (selector.telegramId !== null) {
    return normalizeTelegramId(user.telegramId) === selector.telegramId;
  }

  return false;
}

function isNormalizedSubscriptionPolicySettings(value: unknown): value is NormalizedSubscriptionPolicySettings {
  return isRecord(value) && isRecord(value.values);
}

function isNormalizedProfilesResponse(value: unknown): value is NormalizedProfilesResponse {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.items);
}

function isNormalizedProfile(value: unknown): value is NormalizedProfile {
  return isRecord(value) && typeof value.uuid === 'string' && typeof value.name === 'string' && Array.isArray(value.inbounds);
}

function isNormalizedProfileInboundsResponse(value: unknown): value is NormalizedProfileInboundsResponse {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.items);
}

function isNormalizedHostsResponse(value: unknown): value is { readonly total: number; readonly items: readonly NormalizedHost[] } {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.items);
}

function isNormalizedInternalSquadsResponse(value: unknown): value is NormalizedInternalSquadsResponse {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.items);
}

function toInternalSquadsResponse(value: unknown): NormalizedInternalSquadsResponse {
  if (isNormalizedInternalSquadsResponse(value)) {
    return value;
  }

  return normalizeInternalSquadsResponse(value);
}

function isNormalizedExternalSquadsResponse(value: unknown): value is { readonly total: number; readonly items: readonly unknown[] } {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.items);
}

function toExternalSquadsResponse(value: unknown): { readonly total: number; readonly items: readonly unknown[] } {
  if (isNormalizedExternalSquadsResponse(value)) {
    return value;
  }

  return normalizeExternalSquadsResponse(value);
}

function isNormalizedNodesResponse(value: unknown): value is { readonly items: readonly unknown[] } {
  return isRecord(value) && Array.isArray(value.items);
}

function toNodesResponse(value: unknown): { readonly items: readonly NormalizedNode[] } {
  if (isNormalizedNodesResponse(value)) {
    return value as { readonly items: readonly NormalizedNode[] };
  }

  return normalizeNodesResponse(value);
}

function normalizeNodeResult(value: unknown): NormalizedNode {
  if (
    isRecord(value)
    && typeof value.uuid === 'string'
    && typeof value.name === 'string'
    && typeof value.endpoint === 'string'
    && isRecord(value.connection)
    && isRecord(value.traffic)
    && isRecord(value.provider)
    && Array.isArray(value.inbounds)
    && isRecord(value.system)
    && isRecord(value.versions)
  ) {
    return {
      uuid: value.uuid,
      name: value.name,
      endpoint: value.endpoint,
      countryCode: typeof value.countryCode === 'string' ? value.countryCode : null,
      tags: Array.isArray(value.tags) ? value.tags.filter((entry): entry is string => typeof entry === 'string') : [],
      connection: value.connection as NormalizedNode['connection'],
      traffic: value.traffic as NormalizedNode['traffic'],
      provider: value.provider as NormalizedNode['provider'],
      inbounds: value.inbounds as NormalizedNode['inbounds'],
      system: value.system as NormalizedNode['system'],
      versions: value.versions as NormalizedNode['versions'],
    };
  }

  return toNodesResponse({ response: [value] }).items[0] as NormalizedNode;
}

function isNormalizedNodePluginsResponse(value: unknown): value is { readonly total: number; readonly plugins: readonly unknown[] } {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.plugins);
}

function toNodePluginsResponse(value: unknown): { readonly total: number; readonly plugins: readonly unknown[] } {
  if (isNormalizedNodePluginsResponse(value)) {
    return value;
  }

  return normalizeNodePluginsResponse(value);
}

function isNormalizedInfraBillingProvidersResponse(value: unknown): value is { readonly items: readonly NormalizedBillingProvider[] } {
  return isRecord(value) && Array.isArray(value.items);
}

function toInfraBillingProvidersResponse(value: unknown): { readonly items: readonly NormalizedBillingProvider[] } {
  if (isNormalizedInfraBillingProvidersResponse(value)) {
    return value;
  }

  return normalizeBillingProvidersResponse(value);
}

function isNormalizedInfraBillingNodesResponse(value: unknown): value is { readonly items: readonly NormalizedBillingNode[] } {
  return isRecord(value) && Array.isArray(value.items);
}

function toInfraBillingNodesResponse(value: unknown): { readonly items: readonly NormalizedBillingNode[] } {
  if (isNormalizedInfraBillingNodesResponse(value)) {
    return value;
  }

  return normalizeBillingNodesResponse(value);
}

function isNormalizedInfraBillingHistoryResponse(value: unknown): value is { readonly items: readonly NormalizedBillingHistoryItem[] } {
  return isRecord(value) && Array.isArray(value.items);
}

function toInfraBillingHistoryResponse(value: unknown): { readonly items: readonly NormalizedBillingHistoryItem[] } {
  if (isNormalizedInfraBillingHistoryResponse(value)) {
    return value;
  }

  return normalizeBillingHistoryResponse(value);
}

function normalizeNodePluginResult(value: unknown): { readonly uuid: string; readonly viewPosition: number; readonly name: string; readonly hasConfig: boolean } {
  if (
    isRecord(value)
    && typeof value.uuid === 'string'
    && typeof value.viewPosition === 'number'
    && typeof value.name === 'string'
    && typeof value.hasConfig === 'boolean'
  ) {
    return {
      uuid: value.uuid,
      viewPosition: value.viewPosition,
      name: value.name,
      hasConfig: value.hasConfig,
    };
  }

  return toNodePluginsResponse({ response: { total: 1, nodePlugins: [value] } }).plugins[0] as {
    readonly uuid: string;
    readonly viewPosition: number;
    readonly name: string;
    readonly hasConfig: boolean;
  };
}

function toHostsResponse(value: unknown): { readonly total: number; readonly items: readonly NormalizedHost[] } {
  if (isNormalizedHostsResponse(value)) {
    return value;
  }

  return normalizeHostsResponse(value);
}

function readUuidPayload(payload: Record<string, unknown>, operationName: string): string {
  const uuid = readStringLike(payload.uuid);
  if (uuid === null) {
    throw new Error(`${operationName} requires payload.uuid.`);
  }

  return uuid;
}

function readNodeInvestigatePayload(
  payload: Record<string, unknown>,
  operationName: string,
): { readonly uuid: string; readonly start: number; readonly end: number } {
  return {
    uuid: readUuidPayload(payload, operationName),
    start: readRequiredIntegerField(payload, 'start', operationName),
    end: readRequiredIntegerField(payload, 'end', operationName),
  };
}

function readRequiredStringField(payload: Record<string, unknown>, fieldName: string, operationName: string): string {
  const value = readStringLike(payload[fieldName]);
  if (value === null) {
    throw new Error(`${operationName} requires payload.${fieldName}.`);
  }

  return value;
}

function readRequiredStringArrayField(payload: Record<string, unknown>, fieldName: string, operationName: string): readonly string[] {
  const value = payload[fieldName];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw new Error(`${operationName} requires payload.${fieldName} as a non-empty string array.`);
  }

  return value;
}

function readRequiredRecordField(payload: Record<string, unknown>, fieldName: string, operationName: string): Record<string, unknown> {
  const value = payload[fieldName];
  if (!isRecord(value)) {
    throw new Error(`${operationName} requires payload.${fieldName} as an object.`);
  }

  return value;
}

function readRequiredIntegerField(payload: Record<string, unknown>, fieldName: string, operationName: string): number {
  const value = payload[fieldName];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${operationName} requires payload.${fieldName} as an integer.`);
  }

  return value;
}

function readOptionalPaginationPayload(payload: Record<string, unknown>): { readonly size?: number; readonly start?: number } | undefined {
  const pagination: { size?: number; start?: number } = {};

  if (typeof payload.size === 'number' && Number.isInteger(payload.size)) {
    pagination.size = payload.size;
  }

  if (typeof payload.start === 'number' && Number.isInteger(payload.start)) {
    pagination.start = payload.start;
  }

  return Object.keys(pagination).length === 0 ? undefined : pagination;
}

function isNormalizedUsersResponse(value: unknown): value is NormalizedUsersResponse {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.items);
}

function isNormalizedUsersResolveResponse(value: unknown): value is NormalizedUsersResolveResponse {
  return isRecord(value) && typeof value.found === 'boolean' && ('match' in value);
}

function isNormalizedSubscriptionsResponse(value: unknown): value is { readonly items: readonly NormalizedSubscriptionItem[] } {
  return isRecord(value) && Array.isArray(value.items);
}

function isNormalizedUserSubscriptionHistoryResponse(value: unknown): value is NormalizedUserSubscriptionHistoryResponse {
  return isRecord(value) && Array.isArray(value.items);
}

function isNormalizedUserHwidDevicesResponse(value: unknown): value is NormalizedUserHwidDevicesResponse {
  return isRecord(value) && Array.isArray(value.items);
}

function summarizeValidationRules(validationSchema: OperationValidationSchema): readonly string[] {
  const rules: string[] = ['payload must be an object'];

  if (!validationSchema.additionalProperties) {
    rules.push(
      Object.keys(validationSchema.properties).length === 0
        ? 'payload must not include any fields'
        : 'only the documented fields are allowed',
    );
  }

  if (validationSchema.required.length > 0) {
    for (const fieldName of validationSchema.required) {
      const fieldSchema = validationSchema.properties[fieldName];
      if (fieldSchema !== undefined) {
        rules.push(describeFieldRule(fieldName, fieldSchema));
      }
    }

    return rules;
  }

  if (Object.keys(validationSchema.properties).length === 0) {
    return ['payload is required', ...rules];
  }

  for (const [fieldName, fieldSchema] of Object.entries(validationSchema.properties)) {
    rules.push(describeFieldRule(fieldName, fieldSchema));
  }

  return rules;
}

function describeFieldRule(fieldName: string, fieldSchema: SchemaFieldDefinition): string {
  const requiredPrefix = fieldSchema.required ? 'is required and must be' : 'is optional and must be';
  const fieldPath = `payload.${fieldName}`;

  if (fieldSchema.type === 'string') {
    const bounds = describeStringBounds(fieldSchema);
    return `${fieldPath} ${requiredPrefix} a string${bounds}.`;
  }

  if (fieldSchema.type === 'integer') {
    const bounds = describeIntegerBounds(fieldSchema);
    return `${fieldPath} ${requiredPrefix} an integer${bounds}.`;
  }

  if (fieldSchema.type === 'string_array') {
    const bounds = describeStringArrayBounds(fieldSchema);
    return `${fieldPath} ${requiredPrefix} an array of strings${bounds}.`;
  }

  if (fieldSchema.type === 'record') {
    return `${fieldPath} ${requiredPrefix} an object.`;
  }

  if (fieldSchema.type === 'record_array') {
    const bounds = describeRecordArrayBounds(fieldSchema);
    return `${fieldPath} ${requiredPrefix} an array of objects${bounds}.`;
  }

  return `${fieldPath} ${requiredPrefix} a boolean.`;
}

function describeStringBounds(fieldSchema: SchemaFieldDefinition): string {
  if (fieldSchema.minLength !== undefined && fieldSchema.maxLength !== undefined) {
    return ` (${fieldSchema.minLength}-${fieldSchema.maxLength} chars)`;
  }

  if (fieldSchema.minLength !== undefined) {
    return ` (min ${fieldSchema.minLength} chars)`;
  }

  if (fieldSchema.maxLength !== undefined) {
    return ` (max ${fieldSchema.maxLength} chars)`;
  }

  return '';
}

function describeIntegerBounds(fieldSchema: SchemaFieldDefinition): string {
  if (fieldSchema.minimum !== undefined && fieldSchema.maximum !== undefined) {
    return ` (${fieldSchema.minimum}-${fieldSchema.maximum})`;
  }

  if (fieldSchema.minimum !== undefined) {
    return ` (>= ${fieldSchema.minimum})`;
  }

  if (fieldSchema.maximum !== undefined) {
    return ` (<= ${fieldSchema.maximum})`;
  }

  return '';
}

function describeStringArrayBounds(fieldSchema: SchemaFieldDefinition): string {
  const parts: string[] = [];

  if (fieldSchema.minItems !== undefined) {
    parts.push(`min ${fieldSchema.minItems} items`);
  }

  if (fieldSchema.itemMinLength !== undefined && fieldSchema.itemMaxLength !== undefined) {
    parts.push(`item length ${fieldSchema.itemMinLength}-${fieldSchema.itemMaxLength} chars`);
  } else if (fieldSchema.itemMinLength !== undefined) {
    parts.push(`item length min ${fieldSchema.itemMinLength} chars`);
  } else if (fieldSchema.itemMaxLength !== undefined) {
    parts.push(`item length max ${fieldSchema.itemMaxLength} chars`);
  }

  return parts.length === 0 ? '' : ` (${parts.join('; ')})`;
}

function describeRecordArrayBounds(fieldSchema: SchemaFieldDefinition): string {
  if (fieldSchema.minItems !== undefined) {
    return ` (min ${fieldSchema.minItems} items)`;
  }

  return '';
}

function toRegistryRiskTier(riskTier: 'tier1' | 'tier2' | 'tier3'): RegistryRiskTier {
  if (riskTier === 'tier1') {
    return 'tier_1_read';
  }

  if (riskTier === 'tier2') {
    return 'tier_2_bounded_mutation';
  }

  return 'tier_3_destructive_or_mass_impact';
}
