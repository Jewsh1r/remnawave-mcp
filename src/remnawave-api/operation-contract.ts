export const REMNAWAVE_HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'] as const;
export const REMNAWAVE_OPERATION_SAFETY_MODES = ['direct', 'confirm', 'preview_apply'] as const;
export const REMNAWAVE_OPERATION_RISK_TIERS = ['tier1', 'tier2', 'tier3'] as const;
export const REMNAWAVE_RAW_POLICY_IDS = ['raw_allowed', 'raw_denied'] as const;
export const REMNAWAVE_NORMALIZER_IDS = ['none', 'system_stats', 'users_list', 'user'] as const;
export const REMNAWAVE_OPERATION_STATUSES = ['supported', 'excluded'] as const;
export const REMNAWAVE_EXCLUSION_REASONS = [
  'excluded_auth',
  'excluded_tokens',
  'excluded_ip_control',
  'excluded_node_plugins',
  'excluded_system_dangerous',
  'excluded_remnawave_settings',
  'excluded_keygen',
  'not_selected_initial_inventory',
] as const;

export type RemnawaveHttpMethod = (typeof REMNAWAVE_HTTP_METHODS)[number];
export type RemnawaveOperationSafetyMode = (typeof REMNAWAVE_OPERATION_SAFETY_MODES)[number];
export type RemnawaveOperationRiskTier = (typeof REMNAWAVE_OPERATION_RISK_TIERS)[number];
export type RemnawaveRawPolicyId = (typeof REMNAWAVE_RAW_POLICY_IDS)[number];
export type RemnawaveNormalizerId = (typeof REMNAWAVE_NORMALIZER_IDS)[number];
export type RemnawaveOperationStatus = (typeof REMNAWAVE_OPERATION_STATUSES)[number];
export type RemnawaveExclusionReason = (typeof REMNAWAVE_EXCLUSION_REASONS)[number];

export interface RemnawaveOpenApiBinding {
  readonly method: RemnawaveHttpMethod;
  readonly path: string;
  readonly operationId: string;
  readonly requestSchemaKey: string | null;
  readonly responseSchemaKeys: readonly string[];
}

export interface RemnawaveOperationSideEffects {
  readonly kind: 'none' | 'create' | 'update' | 'delete' | 'restart' | 'bulk_update' | 'bulk_delete';
  readonly summary: string;
}

export interface RemnawaveSupportedOperationContract {
  readonly status: 'supported';
  readonly key: `${string}.${string}`;
  readonly domain: string;
  readonly operation: string;
  readonly openapi: RemnawaveOpenApiBinding;
  readonly write: boolean;
  readonly safetyMode: RemnawaveOperationSafetyMode;
  readonly riskTier: RemnawaveOperationRiskTier;
  readonly rawAllowed: boolean;
  readonly rawPolicy: RemnawaveRawPolicyId;
  readonly normalizer: RemnawaveNormalizerId;
  readonly sideEffects: RemnawaveOperationSideEffects;
}

export interface RemnawaveExcludedOperationContract {
  readonly status: 'excluded';
  readonly key: `${string}.${string}`;
  readonly domain: string;
  readonly operation: string;
  readonly openapi: RemnawaveOpenApiBinding;
  readonly exclusionReason: RemnawaveExclusionReason;
}

export type RemnawaveOperationContract = RemnawaveSupportedOperationContract | RemnawaveExcludedOperationContract;

export interface RemnawaveOperationInventoryMetadata {
  readonly source: 'remnawave-openapi-2.7.4.json';
  readonly openapi: string;
  readonly title: string;
  readonly version: string;
  readonly generatedAt: 'static';
  readonly totalOperations: number;
}

export interface RemnawaveOperationInventory {
  readonly metadata: RemnawaveOperationInventoryMetadata;
  readonly operations: readonly RemnawaveOperationContract[];
}
