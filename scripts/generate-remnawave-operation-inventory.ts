import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractOpenApiSnapshot } from './extract-remnawave-openapi.js';
import type { RemnawaveExclusionReason, RemnawaveOperationContract, RemnawaveOperationInventory } from '../src/remnawave-api/operation-contract.js';

interface OpenApiDocument {
  readonly openapi?: string;
  readonly info?: { readonly title?: string; readonly version?: string };
  readonly paths?: Record<string, Record<string, OperationObject | unknown>>;
}

type OperationObject = Record<string, unknown> & {
  readonly operationId?: string;
  readonly requestBody?: unknown;
  readonly responses?: Record<string, unknown>;
};

interface SupportedSeed {
  readonly domain: string;
  readonly operation: string;
  readonly write: boolean;
  readonly safetyMode: 'direct' | 'confirm' | 'preview_apply';
  readonly riskTier: 'tier1' | 'tier2' | 'tier3';
  readonly rawAllowed: boolean;
  readonly normalizer: 'none' | 'system_stats' | 'users_list' | 'user';
  readonly sideEffects: RemnawaveOperationContract extends infer Contract
    ? Contract extends { readonly sideEffects: infer SideEffects }
      ? SideEffects
      : never
    : never;
}

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace']);
const DEFAULT_SOURCE = 'src/remnawave-api/openapi/remnawave-openapi-2.7.4.json';
const DEFAULT_OUTPUT = 'src/remnawave-api/generated/operation-inventory.ts';

const LEGACY_SUPPORTED_OPERATION_SEEDS: Readonly<Record<string, SupportedSeed>> = {
  'get /api/subscriptions': {
    domain: 'subscriptions', operation: 'list', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Lists protected subscriptions without mutating panel state.' },
  },
  'get /api/subscriptions/by-username/{username}': {
    domain: 'subscriptions', operation: 'get_by_username', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one protected subscription by username without mutating panel state.' },
  },
  'get /api/subscriptions/by-short-uuid/{shortUuid}': {
    domain: 'subscriptions', operation: 'get_by_short_uuid', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one protected subscription by short UUID without mutating panel state.' },
  },
  'get /api/subscriptions/by-uuid/{uuid}': {
    domain: 'subscriptions', operation: 'get_by_uuid', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one protected subscription by UUID without mutating panel state.' },
  },
  'get /api/subscriptions/by-short-uuid/{shortUuid}/raw': {
    domain: 'subscriptions', operation: 'get_raw_by_short_uuid', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one protected raw subscription payload by short UUID without mutating panel state.' },
  },
  'get /api/subscriptions/subpage-config/{shortUuid}': {
    domain: 'subscriptions', operation: 'get_subpage_config_by_short_uuid', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one protected subscription subpage config without mutating panel state.' },
  },
  'get /api/subscriptions/connection-keys/{uuid}': {
    domain: 'subscriptions', operation: 'get_connection_keys_by_uuid', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads protected subscription connection keys without mutating panel state.' },
  },
  'get /api/subscription-request-history': {
    domain: 'subscription_request_history', operation: 'list', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Lists subscription request history without mutating panel state.' },
  },
  'get /api/subscription-request-history/stats': {
    domain: 'subscription_request_history', operation: 'get_stats', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads subscription request-history stats without mutating panel state.' },
  },
  'get /api/users/{uuid}/subscription-request-history': {
    domain: 'users', operation: 'get_subscription_request_history', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one user subscription request-history trail without mutating panel state.' },
  },
  'post /api/users': {
    domain: 'users',
    operation: 'create',
    write: true,
    safetyMode: 'direct',
    riskTier: 'tier2',
    rawAllowed: false,
    normalizer: 'user',
    sideEffects: {
      kind: 'create',
      summary: 'Creates one user account.',
    },
  },
  'get /api/users': {
    domain: 'users',
    operation: 'list',
    write: false,
    safetyMode: 'direct',
    riskTier: 'tier1',
    rawAllowed: false,
    normalizer: 'users_list',
    sideEffects: {
      kind: 'none',
      summary: 'Reads user inventory without mutating panel state.',
    },
  },
  'get /api/users/{uuid}': {
    domain: 'users',
    operation: 'get',
    write: false,
    safetyMode: 'direct',
    riskTier: 'tier1',
    rawAllowed: false,
    normalizer: 'user',
    sideEffects: {
      kind: 'none',
      summary: 'Reads one user by UUID without mutating panel state.',
    },
  },
  'get /api/system/stats': {
    domain: 'system',
    operation: 'get_stats',
    write: false,
    safetyMode: 'direct',
    riskTier: 'tier1',
    rawAllowed: true,
    normalizer: 'system_stats',
    sideEffects: {
      kind: 'none',
      summary: 'Reads system statistics without mutating panel state.',
    },
  },

  'get /api/system/metadata': {
    domain: 'system',
    operation: 'get_metadata',
    write: false,
    safetyMode: 'direct',
    riskTier: 'tier1',
    rawAllowed: true,
    normalizer: 'none',
    sideEffects: {
      kind: 'none',
      summary: 'Reads system metadata without mutating panel state.',
    },
  },
  'get /api/system/health': {
    domain: 'system',
    operation: 'get_health',
    write: false,
    safetyMode: 'direct',
    riskTier: 'tier1',
    rawAllowed: true,
    normalizer: 'none',
    sideEffects: {
      kind: 'none',
      summary: 'Reads system health without mutating panel state.',
    },
  },
  'get /api/system/stats/bandwidth': {
    domain: 'system',
    operation: 'get_bandwidth_stats',
    write: false,
    safetyMode: 'direct',
    riskTier: 'tier1',
    rawAllowed: true,
    normalizer: 'none',
    sideEffects: {
      kind: 'none',
      summary: 'Reads aggregate bandwidth statistics without mutating panel state.',
    },
  },
  'get /api/system/stats/nodes': {
    domain: 'system',
    operation: 'get_node_statistics',
    write: false,
    safetyMode: 'direct',
    riskTier: 'tier1',
    rawAllowed: true,
    normalizer: 'none',
    sideEffects: {
      kind: 'none',
      summary: 'Reads aggregate node statistics without mutating panel state.',
    },
  },
  'get /api/system/nodes/metrics': {
    domain: 'system',
    operation: 'get_nodes_metrics',
    write: false,
    safetyMode: 'direct',
    riskTier: 'tier1',
    rawAllowed: true,
    normalizer: 'none',
    sideEffects: {
      kind: 'none',
      summary: 'Reads node metrics without mutating panel state.',
    },
  },
  'get /api/system/stats/recap': {
    domain: 'system',
    operation: 'get_recap',
    write: false,
    safetyMode: 'direct',
    riskTier: 'tier1',
    rawAllowed: true,
    normalizer: 'none',
    sideEffects: {
      kind: 'none',
      summary: 'Reads system recap statistics without mutating panel state.',
    },
  },
  'get /api/system/tools/x25519/generate': {
    domain: 'system', operation: 'generate_x25519_keypairs', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Generates X25519 keypair material without mutating panel state.' },
  },
  'get /api/keygen': {
    domain: 'keygen', operation: 'generate_node_secret', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Generates Remnawave node secret material without mutating panel state.' },
  },

  'get /api/metadata/node/{uuid}': {
    domain: 'metadata', operation: 'get_node', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one node metadata document without mutating panel state.' },
  },
  'put /api/metadata/node/{uuid}': {
    domain: 'metadata', operation: 'upsert_node', write: true, safetyMode: 'direct', riskTier: 'tier2', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'update', summary: 'Upserts one node metadata document.' },
  },
  'get /api/metadata/user/{uuid}': {
    domain: 'metadata', operation: 'get_user', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one user metadata document without mutating panel state.' },
  },
  'put /api/metadata/user/{uuid}': {
    domain: 'metadata', operation: 'upsert_user', write: true, safetyMode: 'direct', riskTier: 'tier2', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'update', summary: 'Upserts one user metadata document.' },
  },
  'get /api/subscription-templates': {
    domain: 'templates', operation: 'list', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Lists subscription templates without mutating panel state.' },
  },
  'get /api/subscription-templates/{uuid}': {
    domain: 'templates', operation: 'get', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one subscription template without mutating panel state.' },
  },
  'post /api/subscription-templates': {
    domain: 'templates', operation: 'create', write: true, safetyMode: 'direct', riskTier: 'tier2', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'create', summary: 'Creates one subscription template.' },
  },
  'patch /api/subscription-templates': {
    domain: 'templates', operation: 'update', write: true, safetyMode: 'direct', riskTier: 'tier2', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'update', summary: 'Updates one subscription template.' },
  },
  'delete /api/subscription-templates/{uuid}': {
    domain: 'templates', operation: 'delete', write: true, safetyMode: 'confirm', riskTier: 'tier3', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'delete', summary: 'Deletes one subscription template.' },
  },
  'get /api/snippets': {
    domain: 'snippets', operation: 'list', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Lists snippets without mutating panel state.' },
  },
  'post /api/snippets': {
    domain: 'snippets', operation: 'create', write: true, safetyMode: 'direct', riskTier: 'tier2', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'create', summary: 'Creates one snippet.' },
  },
  'patch /api/snippets': {
    domain: 'snippets', operation: 'update', write: true, safetyMode: 'direct', riskTier: 'tier2', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'update', summary: 'Updates one snippet.' },
  },
  'delete /api/snippets': {
    domain: 'snippets', operation: 'delete', write: true, safetyMode: 'confirm', riskTier: 'tier3', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'delete', summary: 'Deletes one snippet.' },
  },
  'get /api/sub/{shortUuid}/info': {
    domain: 'public_subscriptions', operation: 'get_info', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one public subscription info document without mutating panel state.' },
  },
  'get /api/sub/{shortUuid}': {
    domain: 'public_subscriptions', operation: 'get', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one public subscription response without mutating panel state.' },
  },
  'get /api/sub/{shortUuid}/{clientType}': {
    domain: 'public_subscriptions', operation: 'get_by_client_type', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one client-specific public subscription response without mutating panel state.' },
  },
  'get /api/config-profiles': {
    domain: 'profiles', operation: 'list', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Lists config profiles without mutating panel state.' },
  },
  'get /api/config-profiles/{uuid}': {
    domain: 'profiles', operation: 'get', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one config profile without mutating panel state.' },
  },
  'get /api/config-profiles/{uuid}/computed-config': {
    domain: 'profiles', operation: 'get_computed', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Reads one computed config profile without mutating panel state.' },
  },
  'get /api/config-profiles/{uuid}/inbounds': {
    domain: 'profiles', operation: 'list_inbounds', write: false, safetyMode: 'direct', riskTier: 'tier1', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'none', summary: 'Lists inbounds for one config profile without mutating panel state.' },
  },
  'post /api/users/{uuid}/actions/revoke': {
    domain: 'users', operation: 'revoke_subscription', write: true, safetyMode: 'confirm', riskTier: 'tier3', rawAllowed: false, normalizer: 'none',
    sideEffects: { kind: 'update', summary: 'Revokes one user subscription credentials.' },
  },
  'post /api/users/{uuid}/actions/disable': {
    domain: 'users',
    operation: 'disable',
    write: true,
    safetyMode: 'confirm',
    riskTier: 'tier3',
    rawAllowed: false,
    normalizer: 'none',
    sideEffects: {
      kind: 'update',
      summary: 'Disables one user account.',
    },
  },
  'post /api/users/{uuid}/actions/enable': {
    domain: 'users',
    operation: 'enable',
    write: true,
    safetyMode: 'direct',
    riskTier: 'tier2',
    rawAllowed: false,
    normalizer: 'none',
    sideEffects: {
      kind: 'update',
      summary: 'Enables one user account.',
    },
  },
  'post /api/nodes/{uuid}/actions/restart': {
    domain: 'nodes',
    operation: 'restart',
    write: true,
    safetyMode: 'confirm',
    riskTier: 'tier3',
    rawAllowed: false,
    normalizer: 'none',
    sideEffects: {
      kind: 'restart',
      summary: 'Restarts one node.',
    },
  },
  'post /api/hosts/bulk/set-port': {
    domain: 'hosts',
    operation: 'bulk_set_port',
    write: true,
    safetyMode: 'preview_apply',
    riskTier: 'tier3',
    rawAllowed: false,
    normalizer: 'none',
    sideEffects: {
      kind: 'bulk_update',
      summary: 'Sets the port for a bounded host set.',
    },
  },
};

export function readOperationInventoryOpenApi(path: string): OpenApiDocument {
  return JSON.parse(readFileSync(path, 'utf8')) as OpenApiDocument;
}

export function generateRemnawaveOperationInventory(document: OpenApiDocument): RemnawaveOperationInventory {
  if (!document.paths || typeof document.paths !== 'object') {
    throw new Error('OpenAPI document is missing paths.');
  }

  const operations = enumerateOpenApiOperations(document).map((operation) => classifyOperation(operation));

  return sortObject({
    metadata: {
      generatedAt: 'static',
      openapi: document.openapi ?? '',
      source: 'remnawave-openapi-2.7.4.json',
      title: document.info?.title ?? '',
      totalOperations: operations.length,
      version: document.info?.version ?? '',
    },
    operations,
  }) as RemnawaveOperationInventory;
}

export function writeGeneratedOperationInventoryModule(inventory: RemnawaveOperationInventory, outputPath: string): void {
  const body = stableStringify(inventory);
  const content = `// Generated by scripts/generate-remnawave-operation-inventory.ts. Do not edit by hand.

import type { RemnawaveOperationInventory } from '../operation-contract.js';

export const REMNAWAVE_OPERATION_INVENTORY = (${body.trimEnd()}) as const satisfies RemnawaveOperationInventory;

export type RemnawaveGeneratedOperationInventory = typeof REMNAWAVE_OPERATION_INVENTORY;
export type RemnawaveGeneratedOperationContract = RemnawaveGeneratedOperationInventory['operations'][number];
`;
  writeFileSync(outputPath, content);
}

function classifyOperation(operation: EnumeratedOperation): RemnawaveOperationContract {
  const supported = getSupportedSeed(operation);
  if (supported) {
    return sortObject({
      status: 'supported',
      key: `${supported.domain}.${supported.operation}`,
      domain: supported.domain,
      operation: supported.operation,
      openapi: operation.openapi,
      write: supported.write,
      safetyMode: supported.safetyMode,
      riskTier: supported.riskTier,
      rawAllowed: supported.rawAllowed,
      rawPolicy: supported.rawAllowed ? 'raw_allowed' : 'raw_denied',
      normalizer: supported.normalizer,
      sideEffects: supported.sideEffects,
    }) as RemnawaveOperationContract;
  }

  const domain = inferDomain(operation.path);
  const operationName = inferExcludedOperationName(operation);
  return sortObject({
    status: 'excluded',
    key: `${domain}.${operationName}`,
    domain,
    operation: operationName,
    openapi: operation.openapi,
    exclusionReason: exclusionReasonForPath(operation.path),
  }) as RemnawaveOperationContract;
}

function getSupportedSeed(operation: EnumeratedOperation): SupportedSeed | undefined {
  const legacy = LEGACY_SUPPORTED_OPERATION_SEEDS[`${operation.method} ${operation.path}`];
  if (legacy !== undefined) {
    return legacy;
  }

  const extracted = extractOpenApiSnapshot({
    openapi: '3.0.0',
    info: { title: '', version: '' },
    paths: { [operation.path]: { [operation.method]: { operationId: operation.openapi.operationId, responses: { 200: { description: 'OK' } } } } },
  }).operations[0];
  if (extracted === undefined) {
    return undefined;
  }

  const [domain, op] = extracted.key.split('.') as [string, string];
  const write = operation.method !== 'get';
  const safetyMode = inferSafetyMode(domain, op, operation);
  return {
    domain,
    operation: op,
    write,
    safetyMode,
    riskTier: safetyMode === 'direct' ? (write ? 'tier2' : 'tier1') : 'tier3',
    rawAllowed: isRawAllowed(domain, op),
    normalizer: inferNormalizer(domain, op),
    sideEffects: {
      kind: inferSideEffectKind(write, safetyMode, op),
      summary: write ? `Executes ${domain}.${op} through its OpenAPI endpoint.` : `Reads ${domain}.${op} without mutating panel state.`,
    },
  };
}

function inferSafetyMode(domain: string, operation: string, source: EnumeratedOperation): SupportedSeed['safetyMode'] {
  if (source.method === 'get') return 'direct';
  if (
    operation.includes('bulk')
    || operation === 'reorder'
    || operation === 'delete_all_devices'
    || domain === 'subscription_settings'
    || domain === 'subscription_page_configs'
    || (domain === 'profiles' && operation !== 'create')
    || (domain === 'nodes' && ['delete', 'reorder', 'profile_modification', 'bulk_actions', 'bulk_update'].includes(operation))
    || (domain === 'hosts' && ['delete', 'reorder', 'bulk_delete', 'bulk_disable', 'bulk_enable', 'bulk_set_inbound', 'bulk_set_port'].includes(operation))
    || (domain === 'templates' && operation === 'reorder')
  ) return 'preview_apply';
  if (['delete', 'disable', 'restart', 'restart_all', 'reset_traffic', 'revoke_subscription', 'delete_device', 'delete_provider', 'delete_node', 'delete_history_record'].includes(operation)) {
    return 'confirm';
  }
  return 'direct';
}

function isRawAllowed(domain: string, operation: string): boolean {
  return domain === 'system' && ['get_metadata', 'get_stats', 'get_bandwidth_stats', 'get_node_statistics', 'get_health', 'get_nodes_metrics', 'get_recap'].includes(operation);
}

function inferNormalizer(domain: string, operation: string): SupportedSeed['normalizer'] {
  if (domain === 'system' && operation === 'get_stats') return 'system_stats';
  if (domain === 'users' && operation === 'list') return 'users_list';
  if (domain === 'users' && (operation === 'get' || operation.startsWith('get_by_') || operation === 'create')) return 'user';
  return 'none';
}

function inferSideEffectKind(write: boolean, safetyMode: SupportedSeed['safetyMode'], operation: string): SupportedSeed['sideEffects']['kind'] {
  if (!write) return 'none';
  if (operation === 'create' || operation === 'create_device' || operation.startsWith('create_')) return 'create';
  if (operation.includes('delete')) return operation.includes('bulk') || operation.includes('all') ? 'bulk_delete' : 'delete';
  if (operation.includes('restart')) return 'restart';
  if (safetyMode === 'preview_apply' && operation.includes('bulk')) return 'bulk_update';
  return 'update';
}

interface EnumeratedOperation {
  readonly method: string;
  readonly path: string;
  readonly openapi: RemnawaveOperationContract['openapi'];
}

function enumerateOpenApiOperations(document: OpenApiDocument): readonly EnumeratedOperation[] {
  const operations: EnumeratedOperation[] = [];
  for (const path of Object.keys(document.paths ?? {}).sort()) {
    const pathItem = document.paths?.[path];
    if (!isRecord(pathItem)) {
      continue;
    }
    for (const method of Object.keys(pathItem).sort()) {
      if (!HTTP_METHODS.has(method)) {
        continue;
      }
      const operation = pathItem[method];
      if (!isRecord(operation) || typeof operation.operationId !== 'string') {
        throw new Error(`OpenAPI operation is missing operationId: ${method.toUpperCase()} ${path}.`);
      }
      operations.push({
        method,
        path,
        openapi: {
          method: method as RemnawaveOperationContract['openapi']['method'],
          operationId: operation.operationId,
          path,
          requestSchemaKey: extractRequestSchemaKey(operation),
          responseSchemaKeys: extractResponseSchemaKeys(operation),
        },
      });
    }
  }
  return operations;
}

function extractRequestSchemaKey(operation: OperationObject): string | null {
  const requestBody = resolveLocalRecord(operation.requestBody);
  const schema = resolveLocalRecord(resolveLocalRecord(resolveLocalRecord(requestBody?.content)?.['application/json'])?.schema);
  if (!schema) {
    return null;
  }
  return schemaKey(schema, `${operation.operationId}.requestBody`);
}

function extractResponseSchemaKeys(operation: OperationObject): readonly string[] {
  if (!isRecord(operation.responses)) {
    return [];
  }
  return Object.keys(operation.responses)
    .sort()
    .flatMap((status) => {
      const response = resolveLocalRecord(operation.responses?.[status]);
      const schema = resolveLocalRecord(resolveLocalRecord(resolveLocalRecord(response?.content)?.['application/json'])?.schema);
      return schema ? [`${status}:${schemaKey(schema, `${operation.operationId}.responses.${status}`)}`] : [];
    });
}

function schemaKey(schema: Record<string, unknown>, fallback: string): string {
  return typeof schema.$ref === 'string' ? schema.$ref.replace('#/components/schemas/', '') : fallback;
}

function resolveLocalRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function exclusionReasonForPath(path: string): RemnawaveExclusionReason {
  if (path.startsWith('/api/auth')) {
    return 'excluded_auth';
  }
  if (path.startsWith('/api/tokens')) {
    return 'excluded_tokens';
  }
  if (path.startsWith('/api/ip-control')) {
    return 'excluded_ip_control';
  }
  if (path.startsWith('/api/node-plugins')) {
    return 'excluded_node_plugins';
  }
  if (path === '/api/remnawave-settings') {
    return 'excluded_remnawave_settings';
  }
  if (path === '/api/system/tools/happ/encrypt' || path === '/api/system/testers/srr-matcher') {
    return 'excluded_system_dangerous';
  }
  return 'not_selected_initial_inventory';
}

function inferDomain(path: string): string {
  if (path.startsWith('/api/auth')) return 'auth';
  if (path.startsWith('/api/tokens')) return 'tokens';
  if (path.startsWith('/api/ip-control')) return 'ip_control';
  if (path.startsWith('/api/node-plugins')) return 'node_plugins';
  if (path.startsWith('/api/remnawave-settings')) return 'remnawave_settings';
  if (path.startsWith('/api/keygen')) return 'keygen';
  if (path.startsWith('/api/sub/')) return 'public_subscriptions';
  if (path.startsWith('/api/subscriptions')) return 'subscriptions';
  if (path.startsWith('/api/subscription-settings')) return 'subscription_settings';
  if (path.startsWith('/api/system')) return 'system';
  const match = path.match(/^\/api\/([^/{]+)/);
  return match ? toSnakeCase(match[1]) : 'unknown';
}

function inferExcludedOperationName(operation: EnumeratedOperation): string {
  const operationIdSlug = toSnakeCase(operation.openapi.operationId);
  const pathSlug = toSnakeCase(operation.path.replace(/^\/api\/?/, ''));
  return `${operation.method}_${operationIdSlug}_${pathSlug}`;
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

function sortObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sortObject(item)) as T;
  }
  if (!isRecord(value)) {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const item = value[key];
    if (item !== undefined) {
      output[key] = sortObject(item);
    }
  }
  return output as T;
}

function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortObject(value), null, 2)}
`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function runCli(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const source = resolve(root, process.argv[2] ?? DEFAULT_SOURCE);
  const output = resolve(root, process.argv[3] ?? DEFAULT_OUTPUT);
  const inventory = generateRemnawaveOperationInventory(readOperationInventoryOpenApi(source));
  writeGeneratedOperationInventoryModule(inventory, output);
  process.stdout.write(`Generated ${inventory.operations.length} Remnawave operation inventory entries to ${output}
`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
