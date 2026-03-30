import {
  RemnawaveApiError,
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
} from '../client/index.js';
import type {
  NormalizedBandwidthStats,
  NormalizedHwidInspection,
  NormalizedMetadata,
  NormalizedNodesResponse,
  NormalizedNodePluginsResponse,
  NormalizedSubscriptionsResponse,
  NormalizedSystemHealth,
  NormalizedSystemStats,
  NormalizedUsersResolveResponse,
  NormalizedUsersResponse,
} from '../client/index.js';
import {
  ADVANCED_TOOL_DEFINITIONS,
  STABLE_RESOURCE_DEFINITIONS,
  STABLE_TOOL_DEFINITIONS,
  type ResourceDefinition,
  type ToolDefinition,
} from '../server/discovery.js';

export interface StableCoreClient {
  readonly getUsers: () => Promise<NormalizedUsersResponse | unknown>;
  readonly resolveUser: (uuid: string) => Promise<NormalizedUsersResolveResponse | unknown>;
  readonly getNodes: () => Promise<NormalizedNodesResponse | unknown>;
  readonly getSystemStats: () => Promise<NormalizedSystemStats | unknown>;
  readonly getSystemHealth: () => Promise<NormalizedSystemHealth | unknown>;
  readonly getSubscriptions: () => Promise<NormalizedSubscriptionsResponse | unknown>;
  readonly getMetadata?: () => Promise<NormalizedMetadata | unknown>;
  readonly getNodePlugins?: () => Promise<NormalizedNodePluginsResponse | unknown>;
  readonly getBandwidthStats?: () => Promise<NormalizedBandwidthStats | unknown>;
  readonly getHwidInspection?: () => Promise<NormalizedHwidInspection | unknown>;
  readonly patchUserSettings?: (userUuid: string, settings: Record<string, unknown>) => Promise<unknown>;
}

interface StableCoreDependencies {
  readonly client: StableCoreClient;
}

type StableToolResult =
  | NormalizedUsersResponse
  | NormalizedUsersResolveResponse
  | NormalizedNodesResponse
  | MutationToolResult
  | {
      readonly summary: {
        readonly usersTotal: number;
        readonly usersOnlineNow: number;
        readonly nodesOnlineUsers: number;
        readonly cpuCores: number;
      };
      readonly stats: NormalizedSystemStats;
    }
  | {
      readonly summary: {
        readonly instances: number;
        readonly instanceTypes: readonly string[];
        readonly maxEventLoopDelayMs: number;
      };
      readonly health: NormalizedSystemHealth;
    }
  | {
      readonly total: number;
      readonly items: NormalizedSubscriptionsResponse['items'];
    }
  | NormalizedMetadata
  | NormalizedNodePluginsResponse
  | {
      readonly summary: {
        readonly lastTwoDaysDifference: string;
        readonly lastSevenDaysDifference: string;
      };
      readonly windows: NormalizedBandwidthStats['windows'];
    }
  | {
      readonly summary: {
        readonly totalUniqueDevices: number;
        readonly totalHwidDevices: number;
        readonly averageHwidDevicesPerUser: number;
        readonly topPlatform: {
          readonly platform: string;
          readonly count: number;
        } | null;
        readonly topApp: {
          readonly app: string;
          readonly count: number;
        } | null;
      };
      readonly byPlatform: NormalizedHwidInspection['byPlatform'];
      readonly byApp: NormalizedHwidInspection['byApp'];
      readonly stats: NormalizedHwidInspection['stats'];
    };

type SystemStatsToolResult = Extract<StableToolResult, { readonly stats: NormalizedSystemStats }>;
type SystemHealthToolResult = Extract<StableToolResult, { readonly health: NormalizedSystemHealth }>;
type SubscriptionsToolResult = Extract<
  StableToolResult,
  { readonly total: number; readonly items: NormalizedSubscriptionsResponse['items'] }
>;

type MutationMode = 'preview' | 'apply';
type MutationRisk = 'medium' | 'high';
type MutationFailureCategory = 'validation_failure' | 'auth_failure' | 'remote_failure' | 'internal_failure';
type SubscriptionStatus = 'ACTIVE' | 'DISABLED' | 'LIMITED' | 'EXPIRED';

interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly field: string;
}

interface MutationFailure {
  readonly index: number;
  readonly userUuid: string;
  readonly category: MutationFailureCategory;
  readonly code: string;
  readonly message: string;
}

interface MutationActionResult {
  readonly index: number;
  readonly userUuid: string;
  readonly kind: 'update_subscription' | 'assign_squads';
  readonly risk: MutationRisk;
  readonly status: 'planned' | 'applied' | 'failed';
  readonly changes: Record<string, unknown>;
  readonly error?: {
    readonly category: MutationFailureCategory;
    readonly code: string;
    readonly message: string;
  };
}

interface MutationToolResult {
  readonly mutation: {
    readonly domain: 'users';
    readonly supportsPreview: true;
    readonly risk: MutationRisk;
  };
  readonly mode: MutationMode;
  readonly success: boolean;
  readonly validation: {
    readonly ok: boolean;
    readonly errors: readonly ValidationIssue[];
  };
  readonly summary: {
    readonly planned: number;
    readonly applied: number;
    readonly failed: number;
    readonly skipped: number;
  };
  readonly actions: readonly MutationActionResult[];
  readonly failures: readonly MutationFailure[];
}

interface SubscriptionMutationOperation {
  readonly userUuid: string;
  readonly status?: SubscriptionStatus;
  readonly expireAt?: string;
}

interface SquadMutationOperation {
  readonly userUuid: string;
  readonly internalSquadUuid: string;
  readonly externalSquadUuid: string;
}

interface PlannedMutation {
  readonly index: number;
  readonly userUuid: string;
  readonly kind: 'update_subscription' | 'assign_squads';
  readonly risk: MutationRisk;
  readonly changes: Record<string, unknown>;
}

type StableToolResultByName = {
  readonly users_list: NormalizedUsersResponse;
  readonly users_resolve: NormalizedUsersResolveResponse;
  readonly nodes_list: NormalizedNodesResponse;
  readonly system_get_stats: SystemStatsToolResult;
  readonly system_get_health: SystemHealthToolResult;
  readonly subscriptions_list: SubscriptionsToolResult;
  readonly users_mutate_subscription: MutationToolResult;
  readonly users_mutate_squads: MutationToolResult;
  readonly advanced_get_metadata: NormalizedMetadata;
  readonly advanced_list_node_plugins: NormalizedNodePluginsResponse;
  readonly advanced_get_bandwidth_stats: Extract<StableToolResult, { readonly windows: NormalizedBandwidthStats['windows'] }>;
  readonly advanced_get_hwid_inspection: Extract<StableToolResult, { readonly byPlatform: NormalizedHwidInspection['byPlatform'] }>;
};

type StableResourceResultByUri = {
  readonly 'remnawave://panel/statistics': SystemStatsToolResult;
  readonly 'remnawave://nodes/status': NormalizedNodesResponse;
  readonly 'remnawave://system/health': SystemHealthToolResult;
};

type StableToolName = keyof StableToolResultByName;
type StableResourceUri = keyof StableResourceResultByUri;

export interface StableCoreRegistry {
  readonly tools: readonly ToolDefinition[];
  readonly resources: readonly ResourceDefinition[];
  readonly callTool: {
    <TName extends StableToolName>(name: TName, input: Record<string, unknown>): Promise<StableToolResultByName[TName]>;
    (name: string, input: Record<string, unknown>): Promise<StableToolResult>;
  };
  readonly readResource: {
    <TUri extends StableResourceUri>(uri: TUri): Promise<StableResourceResultByUri[TUri]>;
    (uri: string): Promise<StableToolResult>;
  };
}

export function createStableCoreTools(dependencies: StableCoreDependencies): StableCoreRegistry {
  return {
    tools: [...STABLE_TOOL_DEFINITIONS, ...ADVANCED_TOOL_DEFINITIONS],
    resources: STABLE_RESOURCE_DEFINITIONS,
    callTool: async (name: string, input: Record<string, unknown>) => executeTool(name, input, dependencies.client),
    readResource: async (uri: string) => executeResource(uri, dependencies.client),
  };
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  client: StableCoreClient,
): Promise<StableToolResult> {
  switch (name) {
    case 'users_list':
      return toUsersResponse(await client.getUsers());
    case 'users_resolve':
      return toUsersResolveResponse(await client.resolveUser(readRequiredUuid(input)));
    case 'nodes_list':
      return toNodesResponse(await client.getNodes());
    case 'system_get_stats': {
      const stats = toSystemStats(await client.getSystemStats());
      return {
        summary: {
          usersTotal: stats.users.total,
          usersOnlineNow: stats.online.now,
          nodesOnlineUsers: stats.nodes.totalOnlineUsers,
          cpuCores: stats.cpu.cores,
        },
        stats,
      };
    }
    case 'system_get_health': {
      const health = toSystemHealth(await client.getSystemHealth());
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
    case 'subscriptions_list': {
      const subscriptions = toSubscriptionsResponse(await client.getSubscriptions());
      return {
        total: subscriptions.items.length,
        items: subscriptions.items,
      };
    }
    case 'users_mutate_subscription':
      return executeUsersSubscriptionMutation(input, client);
    case 'users_mutate_squads':
      return executeUsersSquadMutation(input, client);
    case 'advanced_get_metadata':
      return toMetadataResponse(await requireAdvancedClient(client, 'getMetadata', 'advanced_get_metadata')());
    case 'advanced_list_node_plugins':
      return toNodePluginsResponse(await requireAdvancedClient(client, 'getNodePlugins', 'advanced_list_node_plugins')());
    case 'advanced_get_bandwidth_stats': {
      const bandwidth = toBandwidthStatsResponse(
        await requireAdvancedClient(client, 'getBandwidthStats', 'advanced_get_bandwidth_stats')(),
      );
      return {
        summary: {
          lastTwoDaysDifference: bandwidth.windows.lastTwoDays.difference,
          lastSevenDaysDifference: bandwidth.windows.lastSevenDays.difference,
        },
        windows: bandwidth.windows,
      };
    }
    case 'advanced_get_hwid_inspection': {
      const hwid = toHwidInspectionResponse(
        await requireAdvancedClient(client, 'getHwidInspection', 'advanced_get_hwid_inspection')(),
      );
      return {
        summary: {
          totalUniqueDevices: hwid.stats.totalUniqueDevices,
          totalHwidDevices: hwid.stats.totalHwidDevices,
          averageHwidDevicesPerUser: hwid.stats.averageHwidDevicesPerUser,
          topPlatform: hwid.byPlatform.length > 0 ? { platform: hwid.byPlatform[0].name, count: hwid.byPlatform[0].count } : null,
          topApp: hwid.byApp.length > 0 ? { app: hwid.byApp[0].name, count: hwid.byApp[0].count } : null,
        },
        byPlatform: hwid.byPlatform,
        byApp: hwid.byApp,
        stats: hwid.stats,
      };
    }
    default:
      throw new Error(`Unknown stable tool: ${name}`);
  }
}

async function executeResource(
  uri: string,
  client: StableCoreClient,
): Promise<StableToolResult> {
  switch (uri) {
    case 'remnawave://panel/statistics':
      return executeTool('system_get_stats', {}, client);
    case 'remnawave://nodes/status':
      return executeTool('nodes_list', {}, client);
    case 'remnawave://system/health':
      return executeTool('system_get_health', {}, client);
    default:
      throw new Error(`Unknown stable resource: ${uri}`);
  }
}

function readRequiredUuid(input: Record<string, unknown>): string {
  const value = input.uuid;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('users_resolve requires a non-empty uuid');
  }
  return value;
}

function executeUsersSubscriptionMutation(
  input: Record<string, unknown>,
  client: StableCoreClient,
): Promise<MutationToolResult> {
  const mode = readMutationMode(input);
  const rawOperations = readOperations(input);
  const operations: SubscriptionMutationOperation[] = [];
  const validationErrors: ValidationIssue[] = [];

  rawOperations.forEach((value, index) => {
    const operation = readRecord(value, `operations[${index}]`, validationErrors);
    if (operation === null) {
      return;
    }

    const userUuid = readRequiredString(operation.userUuid, `operations[${index}].userUuid`, validationErrors);
    const status = readOptionalStatus(operation.status, `operations[${index}].status`, validationErrors);
    const expireAt = readOptionalIsoDateString(operation.expireAt, `operations[${index}].expireAt`, validationErrors);

    if (status === undefined && expireAt === undefined) {
      validationErrors.push({
        code: 'EMPTY_MUTATION',
        message: 'At least one of status or expireAt must be provided.',
        field: `operations[${index}]`,
      });
    }

    if (userUuid !== null) {
      operations.push({
        userUuid,
        ...(status === undefined ? {} : { status }),
        ...(expireAt === undefined ? {} : { expireAt }),
      });
    }
  });

  const planned = operations.map<PlannedMutation>((operation, index) => {
    const changes: Record<string, unknown> = {};
    if (operation.status !== undefined) {
      changes.status = operation.status;
    }
    if (operation.expireAt !== undefined) {
      changes.expireAt = operation.expireAt;
    }
    return {
      index,
      userUuid: operation.userUuid,
      kind: 'update_subscription',
      risk: 'medium',
      changes,
    };
  });

  return executeMutationPlan({
    mode,
    risk: 'medium',
    planned,
    validationErrors,
    applyAction: async (entry) => {
      await runUserPatch(client, entry.userUuid, entry.changes);
    },
  });
}

function executeUsersSquadMutation(input: Record<string, unknown>, client: StableCoreClient): Promise<MutationToolResult> {
  const mode = readMutationMode(input);
  const rawOperations = readOperations(input);
  const operations: SquadMutationOperation[] = [];
  const validationErrors: ValidationIssue[] = [];

  rawOperations.forEach((value, index) => {
    const operation = readRecord(value, `operations[${index}]`, validationErrors);
    if (operation === null) {
      return;
    }

    const userUuid = readRequiredString(operation.userUuid, `operations[${index}].userUuid`, validationErrors);
    const internalSquadUuid = readRequiredString(
      operation.internalSquadUuid,
      `operations[${index}].internalSquadUuid`,
      validationErrors,
    );
    const externalSquadUuid = readRequiredString(
      operation.externalSquadUuid,
      `operations[${index}].externalSquadUuid`,
      validationErrors,
    );

    if (userUuid !== null && internalSquadUuid !== null && externalSquadUuid !== null) {
      operations.push({
        userUuid,
        internalSquadUuid,
        externalSquadUuid,
      });
    }
  });

  const planned = operations.map<PlannedMutation>((operation, index) => ({
    index,
    userUuid: operation.userUuid,
    kind: 'assign_squads',
    risk: 'high',
    changes: {
      activeInternalSquads: [operation.internalSquadUuid],
      externalSquadUuid: operation.externalSquadUuid,
    },
  }));

  return executeMutationPlan({
    mode,
    risk: 'high',
    planned,
    validationErrors,
    applyAction: async (entry) => {
      await runUserPatch(client, entry.userUuid, entry.changes);
    },
  });
}

interface ExecuteMutationPlanInput {
  readonly mode: MutationMode;
  readonly risk: MutationRisk;
  readonly planned: readonly PlannedMutation[];
  readonly validationErrors: readonly ValidationIssue[];
  readonly applyAction: (entry: PlannedMutation) => Promise<void>;
}

async function executeMutationPlan(input: ExecuteMutationPlanInput): Promise<MutationToolResult> {
  const validationFailureActions = input.planned.map<MutationActionResult>((entry) => ({
    index: entry.index,
    userUuid: entry.userUuid,
    kind: entry.kind,
    risk: entry.risk,
    status: 'failed',
    changes: entry.changes,
  }));

  if (input.validationErrors.length > 0) {
    return {
      mutation: {
        domain: 'users',
        supportsPreview: true,
        risk: input.risk,
      },
      mode: input.mode,
      success: false,
      validation: {
        ok: false,
        errors: [...input.validationErrors],
      },
      summary: {
        planned: input.planned.length,
        applied: 0,
        failed: input.planned.length,
        skipped: 0,
      },
      actions: validationFailureActions,
      failures: input.planned.map<MutationFailure>((entry) => ({
        index: entry.index,
        userUuid: entry.userUuid,
        category: 'validation_failure',
        code: 'VALIDATION_FAILED',
        message: 'Input validation failed for one or more fields.',
      })),
    };
  }

  if (input.mode === 'preview') {
    return {
      mutation: {
        domain: 'users',
        supportsPreview: true,
        risk: input.risk,
      },
      mode: 'preview',
      success: true,
      validation: {
        ok: true,
        errors: [],
      },
      summary: {
        planned: input.planned.length,
        applied: 0,
        failed: 0,
        skipped: 0,
      },
      actions: input.planned.map<MutationActionResult>((entry) => ({
        index: entry.index,
        userUuid: entry.userUuid,
        kind: entry.kind,
        risk: entry.risk,
        status: 'planned',
        changes: entry.changes,
      })),
      failures: [],
    };
  }

  const actions: MutationActionResult[] = [];
  const failures: MutationFailure[] = [];

  for (const entry of input.planned) {
    try {
      await input.applyAction(entry);
      actions.push({
        index: entry.index,
        userUuid: entry.userUuid,
        kind: entry.kind,
        risk: entry.risk,
        status: 'applied',
        changes: entry.changes,
      });
    } catch (error) {
      const mapped = mapMutationError(error);
      actions.push({
        index: entry.index,
        userUuid: entry.userUuid,
        kind: entry.kind,
        risk: entry.risk,
        status: 'failed',
        changes: entry.changes,
        error: {
          category: mapped.category,
          code: mapped.code,
          message: mapped.message,
        },
      });
      failures.push({
        index: entry.index,
        userUuid: entry.userUuid,
        category: mapped.category,
        code: mapped.code,
        message: mapped.message,
      });
    }
  }

  const failed = failures.length;
  const applied = input.planned.length - failed;

  return {
    mutation: {
      domain: 'users',
      supportsPreview: true,
      risk: input.risk,
    },
    mode: 'apply',
    success: failed === 0,
    validation: {
      ok: true,
      errors: [],
    },
    summary: {
      planned: input.planned.length,
      applied,
      failed,
      skipped: 0,
    },
    actions,
    failures,
  };
}

async function runUserPatch(
  client: StableCoreClient,
  userUuid: string,
  settings: Record<string, unknown>,
): Promise<void> {
  if (client.patchUserSettings === undefined) {
    throw new Error('Mutation support is unavailable: patchUserSettings is not configured.');
  }
  await client.patchUserSettings(userUuid, settings);
}

function readMutationMode(input: Record<string, unknown>): MutationMode {
  const rawMode = input.mode;
  if (rawMode === 'preview' || rawMode === 'apply') {
    return rawMode;
  }
  throw new Error('Mutation mode must be either "preview" or "apply".');
}

function readOperations(input: Record<string, unknown>): readonly unknown[] {
  const operations = input.operations;
  if (!Array.isArray(operations)) {
    throw new Error('Mutation input requires an operations array.');
  }
  return operations;
}

function readRecord(
  value: unknown,
  field: string,
  validationErrors: ValidationIssue[],
): Record<string, unknown> | null {
  if (isRecord(value)) {
    return value;
  }
  validationErrors.push({
    code: 'INVALID_OBJECT',
    message: 'Operation must be an object.',
    field,
  });
  return null;
}

function readRequiredString(
  value: unknown,
  field: string,
  validationErrors: ValidationIssue[],
): string | null {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  validationErrors.push({
    code: 'INVALID_STRING',
    message: 'Expected non-empty string.',
    field,
  });
  return null;
}

function readOptionalStatus(
  value: unknown,
  field: string,
  validationErrors: ValidationIssue[],
): SubscriptionStatus | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'ACTIVE' || value === 'DISABLED' || value === 'LIMITED' || value === 'EXPIRED') {
    return value;
  }
  validationErrors.push({
    code: 'INVALID_STATUS',
    message: 'Status must be one of ACTIVE, DISABLED, LIMITED, EXPIRED.',
    field,
  });
  return undefined;
}

function readOptionalIsoDateString(
  value: unknown,
  field: string,
  validationErrors: ValidationIssue[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    validationErrors.push({
      code: 'INVALID_EXPIRE_AT',
      message: 'expireAt must be a non-empty ISO 8601 date string.',
      field,
    });
    return undefined;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    validationErrors.push({
      code: 'INVALID_EXPIRE_AT',
      message: 'expireAt must be a valid ISO 8601 date string.',
      field,
    });
    return undefined;
  }

  return value;
}

function mapMutationError(error: unknown): {
  readonly category: MutationFailureCategory;
  readonly code: string;
  readonly message: string;
} {
  if (error instanceof RemnawaveApiError) {
    return {
      category: error.statusCode === 401 || error.statusCode === 403 ? 'auth_failure' : 'remote_failure',
      code: `HTTP_${error.statusCode}`,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      category: 'internal_failure',
      code: 'INTERNAL_ERROR',
      message: error.message,
    };
  }

  return {
    category: 'internal_failure',
    code: 'INTERNAL_ERROR',
    message: String(error),
  };
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

function toNodesResponse(value: unknown): NormalizedNodesResponse {
  if (isNormalizedNodesResponse(value)) {
    return value;
  }
  return normalizeNodesResponse(value);
}

function toSystemStats(value: unknown): NormalizedSystemStats {
  if (isNormalizedSystemStats(value)) {
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

function toSubscriptionsResponse(value: unknown): NormalizedSubscriptionsResponse {
  if (isNormalizedSubscriptionsResponse(value)) {
    return value;
  }
  return normalizeSubscriptionsResponse(value);
}

function toMetadataResponse(value: unknown): NormalizedMetadata {
  if (isNormalizedMetadata(value)) {
    return value;
  }
  return normalizeMetadataResponse(value);
}

function toNodePluginsResponse(value: unknown): NormalizedNodePluginsResponse {
  if (isNormalizedNodePluginsResponse(value)) {
    return value;
  }
  return normalizeNodePluginsResponse(value);
}

function toBandwidthStatsResponse(value: unknown): NormalizedBandwidthStats {
  if (isNormalizedBandwidthStats(value)) {
    return value;
  }
  return normalizeBandwidthStatsResponse(value);
}

function toHwidInspectionResponse(value: unknown): NormalizedHwidInspection {
  if (isNormalizedHwidInspection(value)) {
    return value;
  }
  return normalizeHwidInspectionResponse(value);
}

function requireAdvancedClient<TKey extends 'getMetadata' | 'getNodePlugins' | 'getBandwidthStats' | 'getHwidInspection'>(
  client: StableCoreClient,
  key: TKey,
  toolName: string,
): NonNullable<StableCoreClient[TKey]> {
  const method = client[key];
  if (typeof method !== 'function') {
    throw new Error(`Advanced tool ${toolName} is unavailable: ${key} is not configured.`);
  }
  return method as NonNullable<StableCoreClient[TKey]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNormalizedUsersResponse(value: unknown): value is NormalizedUsersResponse {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.items);
}

function isNormalizedUsersResolveResponse(value: unknown): value is NormalizedUsersResolveResponse {
  return isRecord(value) && typeof value.found === 'boolean' && 'match' in value;
}

function isNormalizedNodesResponse(value: unknown): value is NormalizedNodesResponse {
  return isRecord(value) && Array.isArray(value.items);
}

function isNormalizedSystemStats(value: unknown): value is NormalizedSystemStats {
  return isRecord(value) && isRecord(value.cpu) && isRecord(value.memory) && isRecord(value.users);
}

function isNormalizedSystemHealth(value: unknown): value is NormalizedSystemHealth {
  return isRecord(value) && Array.isArray(value.instances);
}

function isNormalizedSubscriptionsResponse(value: unknown): value is NormalizedSubscriptionsResponse {
  return isRecord(value) && Array.isArray(value.items);
}

function isNormalizedMetadata(value: unknown): value is NormalizedMetadata {
  return isRecord(value) && typeof value.version === 'string' && isRecord(value.build) && isRecord(value.git);
}

function isNormalizedNodePluginsResponse(value: unknown): value is NormalizedNodePluginsResponse {
  return isRecord(value) && typeof value.total === 'number' && Array.isArray(value.plugins);
}

function isNormalizedBandwidthStats(value: unknown): value is NormalizedBandwidthStats {
  return isRecord(value) && isRecord(value.windows);
}

function isNormalizedHwidInspection(value: unknown): value is NormalizedHwidInspection {
  return isRecord(value) && Array.isArray(value.byPlatform) && Array.isArray(value.byApp) && isRecord(value.stats);
}
