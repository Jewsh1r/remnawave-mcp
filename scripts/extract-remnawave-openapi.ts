import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface SelectedOpenApiOperation {
  readonly key: string;
  readonly method: string;
  readonly path: string;
  readonly operationId: string;
}

export interface ExtractedOpenApiOperation extends SelectedOpenApiOperation {
  readonly summary?: string;
  readonly parameters: readonly ExtractedParameter[];
  readonly requestBody?: ExtractedRequestBody;
  readonly responses: Readonly<Record<string, ExtractedResponse>>;
}

export interface ExtractedParameter {
  readonly name: string;
  readonly in: 'path' | 'query';
  readonly required: boolean;
  readonly schema: CompactJsonSchema;
  readonly description?: string;
}

export interface ExtractedRequestBody {
  readonly required: boolean;
  readonly contentType: 'application/json';
  readonly schema: CompactJsonSchema;
}

export interface ExtractedResponse {
  readonly description: string;
  readonly schema?: CompactJsonSchema;
}

export type CompactJsonSchema = Readonly<Record<string, unknown>>;

interface OpenApiDocument {
  readonly openapi?: string;
  readonly info?: { readonly title?: string; readonly version?: string };
  readonly paths?: Record<string, PathItem>;
  readonly components?: { readonly schemas?: Record<string, unknown> };
}

type PathItem = Record<string, OperationObject | unknown>;
type OperationObject = Record<string, unknown> & {
  readonly operationId?: string;
  readonly summary?: string;
  readonly parameters?: readonly unknown[];
  readonly requestBody?: unknown;
  readonly responses?: Record<string, unknown>;
};

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace']);
const DEFAULT_SOURCE = 'src/remnawave-api/openapi/remnawave-openapi-2.7.4.json';
const DEFAULT_OUTPUT = 'src/remnawave-api/generated/operations.ts';

export const SELECTED_OPENAPI_OPERATIONS = [
  {
    key: 'subscriptions.list',
    method: 'get',
    path: '/api/subscriptions',
    operationId: 'SubscriptionsController_getAllSubscriptions',
  },
  {
    key: 'subscriptions.get_by_username',
    method: 'get',
    path: '/api/subscriptions/by-username/{username}',
    operationId: 'SubscriptionsController_getSubscriptionByUsername',
  },
  {
    key: 'subscriptions.get_by_short_uuid',
    method: 'get',
    path: '/api/subscriptions/by-short-uuid/{shortUuid}',
    operationId: 'SubscriptionsController_getSubscriptionByShortUuidProtected',
  },
  {
    key: 'subscriptions.get_by_uuid',
    method: 'get',
    path: '/api/subscriptions/by-uuid/{uuid}',
    operationId: 'SubscriptionsController_getSubscriptionByUuid',
  },
  {
    key: 'subscriptions.get_raw_by_short_uuid',
    method: 'get',
    path: '/api/subscriptions/by-short-uuid/{shortUuid}/raw',
    operationId: 'SubscriptionsController_getRawSubscriptionByShortUuid',
  },
  {
    key: 'subscriptions.get_subpage_config_by_short_uuid',
    method: 'get',
    path: '/api/subscriptions/subpage-config/{shortUuid}',
    operationId: 'SubscriptionsController_getSubpageConfigByShortUuid',
  },
  {
    key: 'subscriptions.get_connection_keys_by_uuid',
    method: 'get',
    path: '/api/subscriptions/connection-keys/{uuid}',
    operationId: 'SubscriptionsController_getConnectionKeysByUuid',
  },
  {
    key: 'subscription_request_history.list',
    method: 'get',
    path: '/api/subscription-request-history',
    operationId: 'UserSubscriptionRequestHistoryController_getSubscriptionRequestHistory',
  },
  {
    key: 'subscription_request_history.get_stats',
    method: 'get',
    path: '/api/subscription-request-history/stats',
    operationId: 'UserSubscriptionRequestHistoryController_getSubscriptionRequestHistoryStats',
  },
  {
    key: 'users.get_subscription_request_history',
    method: 'get',
    path: '/api/users/{uuid}/subscription-request-history',
    operationId: 'UsersController_getUserSubscriptionRequestHistory',
  },
  {
    key: 'profiles.list',
    method: 'get',
    path: '/api/config-profiles',
    operationId: 'ConfigProfileController_getConfigProfiles',
  },
  {
    key: 'profiles.get',
    method: 'get',
    path: '/api/config-profiles/{uuid}',
    operationId: 'ConfigProfileController_getConfigProfileByUuid',
  },
  {
    key: 'profiles.get_computed',
    method: 'get',
    path: '/api/config-profiles/{uuid}/computed-config',
    operationId: 'ConfigProfileController_getComputedConfigProfileByUuid',
  },
  {
    key: 'profiles.list_inbounds',
    method: 'get',
    path: '/api/config-profiles/{uuid}/inbounds',
    operationId: 'ConfigProfileController_getInboundsByProfileUuid',
  },
  {
    key: 'hosts.bulk_set_port',
    method: 'post',
    path: '/api/hosts/bulk/set-port',
    operationId: 'HostsBulkActionsController_setPortToHosts',
  },
  {
    key: 'metadata.get_node',
    method: 'get',
    path: '/api/metadata/node/{uuid}',
    operationId: 'MetadataController_getNodeMetadata',
  },
  {
    key: 'metadata.upsert_node',
    method: 'put',
    path: '/api/metadata/node/{uuid}',
    operationId: 'MetadataController_upsertNodeMetadata',
  },
  {
    key: 'metadata.get_user',
    method: 'get',
    path: '/api/metadata/user/{uuid}',
    operationId: 'MetadataController_getUserMetadata',
  },
  {
    key: 'metadata.upsert_user',
    method: 'put',
    path: '/api/metadata/user/{uuid}',
    operationId: 'MetadataController_upsertUserMetadata',
  },
  {
    key: 'nodes.restart',
    method: 'post',
    path: '/api/nodes/{uuid}/actions/restart',
    operationId: 'NodesController_restartNode',
  },
  {
    key: 'snippets.delete',
    method: 'delete',
    path: '/api/snippets',
    operationId: 'SnippetsController_deleteSnippetByName',
  },
  {
    key: 'snippets.list',
    method: 'get',
    path: '/api/snippets',
    operationId: 'SnippetsController_getSnippets',
  },
  {
    key: 'snippets.update',
    method: 'patch',
    path: '/api/snippets',
    operationId: 'SnippetsController_updateSnippet',
  },
  {
    key: 'snippets.create',
    method: 'post',
    path: '/api/snippets',
    operationId: 'SnippetsController_createSnippet',
  },
  {
    key: 'public_subscriptions.get',
    method: 'get',
    path: '/api/sub/{shortUuid}',
    operationId: 'SubscriptionController_getSubscription',
  },
  {
    key: 'public_subscriptions.get_info',
    method: 'get',
    path: '/api/sub/{shortUuid}/info',
    operationId: 'SubscriptionController_getSubscriptionInfoByShortUuid',
  },
  {
    key: 'public_subscriptions.get_by_client_type',
    method: 'get',
    path: '/api/sub/{shortUuid}/{clientType}',
    operationId: 'SubscriptionController_getSubscriptionByClientType',
  },
  {
    key: 'templates.list',
    method: 'get',
    path: '/api/subscription-templates',
    operationId: 'SubscriptionTemplateController_getAllTemplates',
  },
  {
    key: 'templates.update',
    method: 'patch',
    path: '/api/subscription-templates',
    operationId: 'SubscriptionTemplateController_updateTemplate',
  },
  {
    key: 'templates.create',
    method: 'post',
    path: '/api/subscription-templates',
    operationId: 'SubscriptionTemplateController_createTemplate',
  },
  {
    key: 'templates.delete',
    method: 'delete',
    path: '/api/subscription-templates/{uuid}',
    operationId: 'SubscriptionTemplateController_deleteTemplate',
  },
  {
    key: 'templates.get',
    method: 'get',
    path: '/api/subscription-templates/{uuid}',
    operationId: 'SubscriptionTemplateController_getTemplateByUuid',
  },
  {
    key: 'system.get_health',
    method: 'get',
    path: '/api/system/health',
    operationId: 'SystemController_getRemnawaveHealth',
  },
  {
    key: 'system.get_metadata',
    method: 'get',
    path: '/api/system/metadata',
    operationId: 'SystemController_getMetadata',
  },
  {
    key: 'system.get_nodes_metrics',
    method: 'get',
    path: '/api/system/nodes/metrics',
    operationId: 'SystemController_getNodesMetrics',
  },
  {
    key: 'users.create',
    method: 'post',
    path: '/api/users',
    operationId: 'UsersController_createUser',
  },
  {
    key: 'users.list',
    method: 'get',
    path: '/api/users',
    operationId: 'UsersController_getAllUsers',
  },
  {
    key: 'users.get',
    method: 'get',
    path: '/api/users/{uuid}',
    operationId: 'UsersController_getUserByUuid',
  },
  {
    key: 'system.get_stats',
    method: 'get',
    path: '/api/system/stats',
    operationId: 'SystemController_getStats',
  },
  {
    key: 'system.get_bandwidth_stats',
    method: 'get',
    path: '/api/system/stats/bandwidth',
    operationId: 'SystemController_getBandwidthStats',
  },
  {
    key: 'system.get_node_statistics',
    method: 'get',
    path: '/api/system/stats/nodes',
    operationId: 'SystemController_getNodesStatistics',
  },
  {
    key: 'system.get_recap',
    method: 'get',
    path: '/api/system/stats/recap',
    operationId: 'SystemController_getRecap',
  },
  {
    key: 'system.generate_x25519_keypairs',
    method: 'get',
    path: '/api/system/tools/x25519/generate',
    operationId: 'SystemController_getX25519Keypairs',
  },
  {
    key: 'keygen.generate_node_secret',
    method: 'get',
    path: '/api/keygen',
    operationId: 'KeygenController_generateKey',
  },
  {
    key: 'users.disable',
    method: 'post',
    path: '/api/users/{uuid}/actions/disable',
    operationId: 'UsersController_disableUser',
  },
  {
    key: 'users.enable',
    method: 'post',
    path: '/api/users/{uuid}/actions/enable',
    operationId: 'UsersController_enableUser',
  },
  {
    key: 'users.revoke_subscription',
    method: 'post',
    path: '/api/users/{uuid}/actions/revoke',
    operationId: 'UsersController_revokeUserSubscription',
  },
] as const satisfies readonly SelectedOpenApiOperation[];

export class UnsupportedSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedSchemaError';
  }
}

export function extractOpenApiSnapshot(
  document: OpenApiDocument,
  selectedOperations: readonly SelectedOpenApiOperation[] = deriveSelectedOpenApiOperations(document),
): { readonly metadata: Record<string, unknown>; readonly operations: readonly ExtractedOpenApiOperation[] } {
  if (!document.paths || typeof document.paths !== 'object') {
    throw new Error('OpenAPI document is missing paths.');
  }

  return {
    metadata: sortObject({
      openapi: document.openapi,
      title: document.info?.title,
      version: document.info?.version,
      extractedAt: 'static',
      source: 'remnawave-openapi-2.7.4.json',
    }),
    operations: selectedOperations.map((selection) => extractOperation(document, selection)),
  };
}

export function readOpenApiSnapshot(path: string): OpenApiDocument {
  return JSON.parse(readFileSync(path, 'utf8')) as OpenApiDocument;
}

function deriveSelectedOpenApiOperations(document: OpenApiDocument): readonly SelectedOpenApiOperation[] {
  return enumerateOpenApiOperations(document)
    .map((operation) => ({
      key: classifySupportedOperation(operation)?.key ?? '',
      method: operation.method,
      path: operation.path,
      operationId: operation.operationId,
    }))
    .filter((operation) => operation.key !== '');
}

interface OpenApiEnumeration {
  readonly method: string;
  readonly path: string;
  readonly operationId: string;
}

function enumerateOpenApiOperations(document: OpenApiDocument): readonly OpenApiEnumeration[] {
  const operations: OpenApiEnumeration[] = [];
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
      if (isRecord(operation) && typeof operation.operationId === 'string') {
        operations.push({ method, path, operationId: operation.operationId });
      }
    }
  }
  return operations;
}

function classifySupportedOperation(operation: OpenApiEnumeration): { readonly key: string } | null {
  const routeKey = `${operation.method} ${operation.path}`;
  const staticKeys: Readonly<Record<string, string>> = {
    'get /api/subscriptions': 'subscriptions.list',
    'get /api/subscriptions/by-username/{username}': 'subscriptions.get_by_username',
    'get /api/subscriptions/by-short-uuid/{shortUuid}': 'subscriptions.get_by_short_uuid',
    'get /api/subscriptions/by-uuid/{uuid}': 'subscriptions.get_by_uuid',
    'get /api/subscriptions/by-short-uuid/{shortUuid}/raw': 'subscriptions.get_raw_by_short_uuid',
    'get /api/subscriptions/subpage-config/{shortUuid}': 'subscriptions.get_subpage_config_by_short_uuid',
    'get /api/subscriptions/connection-keys/{uuid}': 'subscriptions.get_connection_keys_by_uuid',
    'get /api/subscription-request-history': 'subscription_request_history.list',
    'get /api/subscription-request-history/stats': 'subscription_request_history.get_stats',
    'get /api/users/{uuid}/subscription-request-history': 'users.get_subscription_request_history',
    'post /api/users': 'users.create',
    'patch /api/users': 'users.update',
    'get /api/users': 'users.list',
    'delete /api/users/{uuid}': 'users.delete',
    'get /api/users/{uuid}': 'users.get',
    'get /api/users/tags': 'users.list_tags',
    'get /api/users/{uuid}/accessible-nodes': 'users.get_accessible_nodes',
    'get /api/users/by-short-uuid/{shortUuid}': 'users.get_by_short_uuid',
    'get /api/users/by-username/{username}': 'users.get_by_username',
    'get /api/users/by-id/{id}': 'users.get_by_id',
    'get /api/users/by-telegram-id/{telegramId}': 'users.get_by_telegram_id',
    'get /api/users/by-email/{email}': 'users.get_by_email',
    'get /api/users/by-tag/{tag}': 'users.get_by_tag',
    'post /api/users/{uuid}/actions/revoke': 'users.revoke_subscription',
    'post /api/users/{uuid}/actions/disable': 'users.disable',
    'post /api/users/{uuid}/actions/enable': 'users.enable',
    'post /api/users/{uuid}/actions/reset-traffic': 'users.reset_traffic',
    'post /api/users/resolve': 'users.resolve',
    'post /api/users/bulk/delete-by-status': 'users.bulk_delete_by_status',
    'post /api/users/bulk/delete': 'users.bulk_delete',
    'post /api/users/bulk/revoke-subscription': 'users.bulk_revoke_subscription',
    'post /api/users/bulk/reset-traffic': 'users.bulk_reset_traffic',
    'post /api/users/bulk/update': 'users.bulk_update',
    'post /api/users/bulk/update-squads': 'users.bulk_update_squads',
    'post /api/users/bulk/extend-expiration-date': 'users.bulk_extend_expiration_date',
    'post /api/users/bulk/all/update': 'users.bulk_all_update',
    'post /api/users/bulk/all/reset-traffic': 'users.bulk_all_reset_traffic',
    'post /api/users/bulk/all/extend-expiration-date': 'users.bulk_all_extend_expiration_date',
    'get /api/system/stats': 'system.get_stats',
    'get /api/system/metadata': 'system.get_metadata',
    'get /api/system/health': 'system.get_health',
    'get /api/system/stats/bandwidth': 'system.get_bandwidth_stats',
    'get /api/system/stats/nodes': 'system.get_node_statistics',
    'get /api/system/nodes/metrics': 'system.get_nodes_metrics',
    'get /api/system/stats/recap': 'system.get_recap',
    'get /api/system/tools/x25519/generate': 'system.generate_x25519_keypairs',
    'get /api/keygen': 'keygen.generate_node_secret',
    'get /api/metadata/node/{uuid}': 'metadata.get_node',
    'put /api/metadata/node/{uuid}': 'metadata.upsert_node',
    'get /api/metadata/user/{uuid}': 'metadata.get_user',
    'put /api/metadata/user/{uuid}': 'metadata.upsert_user',
    'get /api/subscription-templates': 'templates.list',
    'get /api/subscription-templates/{uuid}': 'templates.get',
    'post /api/subscription-templates': 'templates.create',
    'patch /api/subscription-templates': 'templates.update',
    'delete /api/subscription-templates/{uuid}': 'templates.delete',
    'post /api/subscription-templates/actions/reorder': 'templates.reorder',
    'get /api/snippets': 'snippets.list',
    'post /api/snippets': 'snippets.create',
    'patch /api/snippets': 'snippets.update',
    'delete /api/snippets': 'snippets.delete',
    'get /api/sub/{shortUuid}/info': 'public_subscriptions.get_info',
    'get /api/sub/{shortUuid}': 'public_subscriptions.get',
    'get /api/sub/{shortUuid}/{clientType}': 'public_subscriptions.get_by_client_type',
    'get /api/config-profiles': 'profiles.list',
    'post /api/config-profiles': 'profiles.create',
    'patch /api/config-profiles': 'profiles.update',
    'get /api/config-profiles/inbounds': 'profiles.list_all_inbounds',
    'get /api/config-profiles/{uuid}/inbounds': 'profiles.list_inbounds',
    'get /api/config-profiles/{uuid}': 'profiles.get',
    'delete /api/config-profiles/{uuid}': 'profiles.delete',
    'get /api/config-profiles/{uuid}/computed-config': 'profiles.get_computed',
    'post /api/config-profiles/actions/reorder': 'profiles.reorder',
    'get /api/nodes/tags': 'nodes.list_tags',
    'post /api/nodes': 'nodes.create',
    'get /api/nodes': 'nodes.list',
    'patch /api/nodes': 'nodes.update',
    'get /api/nodes/{uuid}': 'nodes.get',
    'delete /api/nodes/{uuid}': 'nodes.delete',
    'post /api/nodes/{uuid}/actions/enable': 'nodes.enable',
    'post /api/nodes/{uuid}/actions/disable': 'nodes.disable',
    'post /api/nodes/{uuid}/actions/restart': 'nodes.restart',
    'post /api/nodes/{uuid}/actions/reset-traffic': 'nodes.reset_traffic',
    'post /api/nodes/actions/restart-all': 'nodes.restart_all',
    'post /api/nodes/actions/reorder': 'nodes.reorder',
    'post /api/nodes/bulk-actions/profile-modification': 'nodes.profile_modification',
    'post /api/nodes/bulk-actions': 'nodes.bulk_actions',
    'post /api/nodes/bulk-actions/update': 'nodes.bulk_update',
    'get /api/hosts/tags': 'hosts.list_tags',
    'post /api/hosts': 'hosts.create',
    'patch /api/hosts': 'hosts.update',
    'get /api/hosts': 'hosts.list',
    'get /api/hosts/{uuid}': 'hosts.get',
    'delete /api/hosts/{uuid}': 'hosts.delete',
    'post /api/hosts/actions/reorder': 'hosts.reorder',
    'post /api/hosts/bulk/delete': 'hosts.bulk_delete',
    'post /api/hosts/bulk/disable': 'hosts.bulk_disable',
    'post /api/hosts/bulk/enable': 'hosts.bulk_enable',
    'post /api/hosts/bulk/set-inbound': 'hosts.bulk_set_inbound',
    'post /api/hosts/bulk/set-port': 'hosts.bulk_set_port',
    'get /api/bandwidth-stats/nodes': 'bandwidth_stats.list_nodes_usage',
    'get /api/bandwidth-stats/nodes/{uuid}/users': 'bandwidth_stats.get_node_users_usage',
    'get /api/bandwidth-stats/nodes/{uuid}/users/legacy': 'bandwidth_stats.get_node_user_usage_legacy',
    'get /api/bandwidth-stats/users/{uuid}': 'bandwidth_stats.get_user_usage',
    'get /api/bandwidth-stats/users/{uuid}/legacy': 'bandwidth_stats.get_user_usage_legacy',
    'get /api/hwid/devices': 'hwid.list_users',
    'post /api/hwid/devices': 'hwid.create_device',
    'post /api/hwid/devices/delete': 'hwid.delete_device',
    'post /api/hwid/devices/delete-all': 'hwid.delete_all_devices',
    'get /api/hwid/devices/stats': 'hwid.get_stats',
    'get /api/hwid/devices/top-users': 'hwid.get_top_users',
    'get /api/hwid/devices/{userUuid}': 'hwid.get_user_devices',
    'get /api/subscription-settings': 'subscription_settings.get',
    'patch /api/subscription-settings': 'subscription_settings.update',
    'get /api/subscription-page-configs': 'subscription_page_configs.list',
    'patch /api/subscription-page-configs': 'subscription_page_configs.update',
    'post /api/subscription-page-configs': 'subscription_page_configs.create',
    'post /api/subscription-page-configs/actions/clone': 'subscription_page_configs.clone',
    'post /api/subscription-page-configs/actions/reorder': 'subscription_page_configs.reorder',
    'delete /api/subscription-page-configs/{uuid}': 'subscription_page_configs.delete',
    'get /api/subscription-page-configs/{uuid}': 'subscription_page_configs.get',
    'get /api/internal-squads': 'internal_squads.list',
    'post /api/internal-squads': 'internal_squads.create',
    'patch /api/internal-squads': 'internal_squads.update',
    'post /api/internal-squads/actions/reorder': 'internal_squads.reorder',
    'delete /api/internal-squads/{uuid}': 'internal_squads.delete',
    'get /api/internal-squads/{uuid}': 'internal_squads.get',
    'get /api/internal-squads/{uuid}/accessible-nodes': 'internal_squads.get_accessible_nodes',
    'post /api/internal-squads/{uuid}/bulk-actions/add-users': 'internal_squads.add_users',
    'delete /api/internal-squads/{uuid}/bulk-actions/remove-users': 'internal_squads.remove_users',
    'get /api/external-squads': 'external_squads.list',
    'post /api/external-squads': 'external_squads.create',
    'patch /api/external-squads': 'external_squads.update',
    'post /api/external-squads/actions/reorder': 'external_squads.reorder',
    'delete /api/external-squads/{uuid}': 'external_squads.delete',
    'get /api/external-squads/{uuid}': 'external_squads.get',
    'post /api/external-squads/{uuid}/bulk-actions/add-users': 'external_squads.add_users',
    'delete /api/external-squads/{uuid}/bulk-actions/remove-users': 'external_squads.remove_users',
    'get /api/infra-billing/providers': 'infra_billing.list_providers',
    'post /api/infra-billing/providers': 'infra_billing.create_provider',
    'patch /api/infra-billing/providers': 'infra_billing.update_provider',
    'get /api/infra-billing/providers/{uuid}': 'infra_billing.get_provider',
    'delete /api/infra-billing/providers/{uuid}': 'infra_billing.delete_provider',
    'get /api/infra-billing/nodes': 'infra_billing.list_nodes',
    'post /api/infra-billing/nodes': 'infra_billing.create_node',
    'patch /api/infra-billing/nodes': 'infra_billing.update_node',
    'delete /api/infra-billing/nodes/{uuid}': 'infra_billing.delete_node',
    'get /api/infra-billing/history': 'infra_billing.list_history',
    'post /api/infra-billing/history': 'infra_billing.create_history_record',
    'delete /api/infra-billing/history/{uuid}': 'infra_billing.delete_history_record',
  };

  const key = staticKeys[routeKey];
  return key === undefined ? null : { key };
}

export function writeGeneratedOperationsModule(extracted: ReturnType<typeof extractOpenApiSnapshot>, outputPath: string): void {
  const body = stableStringify(extracted);
  const content = `// Generated by scripts/extract-remnawave-openapi.ts. Do not edit by hand.\n\nexport const REMNAWAVE_OPENAPI_EXTRACT = (${body.trimEnd()}) as const;\n\nexport type RemnawaveOpenApiExtract = typeof REMNAWAVE_OPENAPI_EXTRACT;\nexport type RemnawaveOpenApiOperation = RemnawaveOpenApiExtract['operations'][number];\n`;
  writeFileSync(outputPath, content);
}

function extractOperation(document: OpenApiDocument, selection: SelectedOpenApiOperation): ExtractedOpenApiOperation {
  const pathItem = document.paths?.[selection.path];
  if (!isRecord(pathItem)) {
    throw new Error(`Selected OpenAPI path not found: ${selection.method.toUpperCase()} ${selection.path}.`);
  }

  const method = selection.method.toLowerCase();
  if (!HTTP_METHODS.has(method)) {
    throw new Error(`Unsupported HTTP method in selection ${selection.key}: ${selection.method}.`);
  }

  const operation = pathItem[method];
  if (!isRecord(operation)) {
    throw new Error(`Selected OpenAPI operation not found: ${selection.method.toUpperCase()} ${selection.path}.`);
  }

  if (operation.operationId !== selection.operationId) {
    throw new Error(
      `Selected OpenAPI operationId mismatch for ${selection.method.toUpperCase()} ${selection.path}: expected ${selection.operationId}, got ${String(operation.operationId)}.`,
    );
  }

  return sortObject({
    key: selection.key,
    method,
    path: selection.path,
    operationId: selection.operationId,
    summary: typeof operation.summary === 'string' ? operation.summary : undefined,
    parameters: extractParameters(document, operation.parameters),
    requestBody: extractRequestBody(document, operation.requestBody),
    responses: extractResponses(document, operation.responses),
  }) as unknown as ExtractedOpenApiOperation;
}

function extractParameters(document: OpenApiDocument, parameters: unknown): readonly ExtractedParameter[] {
  if (parameters === undefined) {
    return [];
  }
  if (!Array.isArray(parameters)) {
    throw new Error('Operation parameters must be an array when present.');
  }

  return parameters.map((parameter, index) => {
    const resolved = resolveReference(document, parameter, `parameters[${index}]`, []);
    if (!isRecord(resolved)) {
      throw new Error(`Parameter at index ${index} must be an object.`);
    }
    if (resolved.in !== 'path' && resolved.in !== 'query') {
      throw new UnsupportedSchemaError(`Unsupported parameter location at parameters[${index}]: ${String(resolved.in)}.`);
    }
    if (typeof resolved.name !== 'string') {
      throw new Error(`Parameter at index ${index} is missing name.`);
    }
    if (!isRecord(resolved.schema)) {
      throw new Error(`Parameter ${resolved.name} is missing schema.`);
    }

    return sortObject({
      name: resolved.name,
      in: resolved.in,
      required: resolved.required === true,
      description: typeof resolved.description === 'string' ? resolved.description : undefined,
      schema: compactSchema(document, resolved.schema, `parameter ${resolved.name}`, []),
    }) as unknown as ExtractedParameter;
  });
}

function extractRequestBody(document: OpenApiDocument, requestBody: unknown): ExtractedRequestBody | undefined {
  if (requestBody === undefined) {
    return undefined;
  }

  const resolved = resolveReference(document, requestBody, 'requestBody', []);
  if (!isRecord(resolved)) {
    throw new Error('requestBody must be an object.');
  }

  const mediaType = getJsonMediaType(resolved, 'requestBody');
  if (!isRecord(mediaType.schema)) {
    throw new Error('JSON requestBody is missing schema.');
  }

  return sortObject({
    required: resolved.required === true,
    contentType: 'application/json',
    schema: compactSchema(document, mediaType.schema, 'requestBody', []),
  }) as unknown as ExtractedRequestBody;
}

function extractResponses(document: OpenApiDocument, responses: unknown): Readonly<Record<string, ExtractedResponse>> {
  if (!isRecord(responses)) {
    throw new Error('Operation responses must be an object.');
  }

  const extracted: Record<string, ExtractedResponse> = {};
  for (const status of Object.keys(responses).sort()) {
    const resolved = resolveReference(document, responses[status], `responses.${status}`, []);
    if (!isRecord(resolved)) {
      throw new Error(`Response ${status} must be an object.`);
    }
    const mediaType = getOptionalJsonMediaType(resolved);
    extracted[status] = sortObject({
      description: typeof resolved.description === 'string' ? resolved.description : '',
      schema: isRecord(mediaType?.schema) ? compactSchema(document, mediaType.schema, `responses.${status}`, []) : undefined,
    }) as unknown as ExtractedResponse;
  }

  return sortObject(extracted) as Readonly<Record<string, ExtractedResponse>>;
}

function compactSchema(document: OpenApiDocument, schema: unknown, location: string, stack: readonly string[]): CompactJsonSchema {
  const resolved = resolveReference(document, schema, location, stack);
  if (!isRecord(resolved)) {
    throw new UnsupportedSchemaError(`Unsupported schema at ${location}: expected object.`);
  }

  if (Object.keys(resolved).length === 0) {
    return {};
  }

  if ('not' in resolved) {
    throw new UnsupportedSchemaError(`Unsupported schema at ${location}: not is not supported.`);
  }
  if ('discriminator' in resolved) {
    throw new UnsupportedSchemaError(`Unsupported schema at ${location}: discriminator is not supported.`);
  }

  const nullable = resolved.nullable === true;
  const withoutNullable = { ...resolved };
  delete withoutNullable.nullable;
  const compact = compactNonNullableSchema(document, withoutNullable, location, stack);

  if (!nullable) {
    return compact;
  }

  return sortObject({ anyOf: [compact, { type: 'null' }] });
}

function compactNonNullableSchema(
  document: OpenApiDocument,
  schema: Record<string, unknown>,
  location: string,
  stack: readonly string[],
): CompactJsonSchema {
  const combiners = ['allOf', 'oneOf', 'anyOf'] as const;
  for (const combiner of combiners) {
    if (combiner in schema) {
      if (!Array.isArray(schema[combiner]) || schema[combiner].length === 0) {
        throw new UnsupportedSchemaError(`Unsupported schema at ${location}: ${combiner} must be a non-empty array.`);
      }
      return sortObject({
        ...copySchemaAnnotations(schema),
        [combiner]: (schema[combiner] as readonly unknown[]).map((item, index) =>
          compactSchema(document, item, `${location}.${combiner}[${index}]`, stack),
        ),
      });
    }
  }

  const type = schema.type ?? (isRecord(schema.properties) ? 'object' : undefined);
  if (typeof type !== 'string') {
    if (Object.keys(schema).length === 0) {
      return {};
    }
    if ('additionalProperties' in schema || Object.keys(copyScalarConstraints(schema)).length > 0 || Object.keys(copySchemaAnnotations(schema)).length > 0) {
      return sortObject({ ...copySchemaAnnotations(schema), ...copyScalarConstraints(schema) });
    }
    if (location.startsWith('responses.')) {
      return {};
    }
    throw new UnsupportedSchemaError(`Unsupported schema at ${location}: missing explicit type.`);
  }

  switch (type) {
    case 'string':
    case 'integer':
    case 'number':
    case 'boolean':
      return sortObject({ ...copySchemaAnnotations(schema), type, ...copyScalarConstraints(schema) });
    case 'array':
      if (!isRecord(schema.items)) {
        throw new UnsupportedSchemaError(`Unsupported schema at ${location}: array schema is missing object items.`);
      }
      return sortObject({
        ...copySchemaAnnotations(schema),
        type,
        ...copyArrayConstraints(schema),
        items: compactSchema(document, schema.items, `${location}.items`, stack),
      });
    case 'object':
      return compactObjectSchema(document, schema, location, stack);
    default:
      throw new UnsupportedSchemaError(`Unsupported schema at ${location}: unsupported type ${type}.`);
  }
}

function compactObjectSchema(
  document: OpenApiDocument,
  schema: Record<string, unknown>,
  location: string,
  stack: readonly string[],
): CompactJsonSchema {
  const properties = isRecord(schema.properties) ? schema.properties : undefined;
  const compactProperties: Record<string, CompactJsonSchema> = {};
  if (properties) {
    for (const propertyName of Object.keys(properties).sort()) {
      compactProperties[propertyName] = compactSchema(document, properties[propertyName], `${location}.properties.${propertyName}`, stack);
    }
  }

  const additionalProperties = schema.additionalProperties;
  let compactAdditionalProperties: boolean | CompactJsonSchema | undefined;
  if (additionalProperties === undefined) {
    compactAdditionalProperties = undefined;
  } else if (typeof additionalProperties === 'boolean') {
    compactAdditionalProperties = additionalProperties;
  } else if (isRecord(additionalProperties)) {
    compactAdditionalProperties = compactSchema(document, additionalProperties, `${location}.additionalProperties`, stack);
  } else {
    throw new UnsupportedSchemaError(`Unsupported schema at ${location}: additionalProperties must be boolean or schema object.`);
  }

  return sortObject({
    ...copySchemaAnnotations(schema),
    type: 'object',
    additionalProperties: compactAdditionalProperties,
    properties: Object.keys(compactProperties).length > 0 ? sortObject(compactProperties) : undefined,
    required: normalizeStringArray(schema.required, `${location}.required`),
  });
}

function resolveReference(document: OpenApiDocument, value: unknown, location: string, stack: readonly string[]): unknown {
  if (!isRecord(value) || typeof value.$ref !== 'string') {
    return value;
  }

  const ref = value.$ref;
  if (!ref.startsWith('#/')) {
    throw new UnsupportedSchemaError(`Unsupported reference at ${location}: only local refs are supported (${ref}).`);
  }
  if (stack.includes(ref)) {
    throw new UnsupportedSchemaError(`Unsupported reference cycle at ${location}: ${[...stack, ref].join(' -> ')}.`);
  }

  const resolved = ref
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce<unknown>((current, part) => (isRecord(current) ? current[part] : undefined), document as unknown);

  if (resolved === undefined) {
    throw new Error(`Unable to resolve reference at ${location}: ${ref}.`);
  }

  const siblingKeys = Object.keys(value).filter((key) => key !== '$ref');
  if (siblingKeys.length > 0) {
    throw new UnsupportedSchemaError(`Unsupported reference at ${location}: $ref siblings are not supported (${siblingKeys.join(', ')}).`);
  }

  return resolveReference(document, resolved, ref, [...stack, ref]);
}

function getJsonMediaType(container: Record<string, unknown>, location: string): Record<string, unknown> {
  const mediaType = getOptionalJsonMediaType(container);
  if (!mediaType) {
    throw new UnsupportedSchemaError(`Unsupported ${location}: application/json content is required.`);
  }
  return mediaType;
}

function getOptionalJsonMediaType(container: Record<string, unknown>): Record<string, unknown> | undefined {
  const content = container.content;
  if (!isRecord(content)) {
    return undefined;
  }
  const mediaType = content['application/json'];
  return isRecord(mediaType) ? mediaType : undefined;
}

function copySchemaAnnotations(schema: Record<string, unknown>): Record<string, unknown> {
  return pick(schema, ['description', 'format', 'default', 'deprecated', 'readOnly', 'writeOnly', 'enum']);
}

function copyScalarConstraints(schema: Record<string, unknown>): Record<string, unknown> {
  return pick(schema, [
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'minLength',
    'maxLength',
    'pattern',
    'multipleOf',
  ]);
}

function copyArrayConstraints(schema: Record<string, unknown>): Record<string, unknown> {
  return pick(schema, ['minItems', 'maxItems', 'uniqueItems']);
}

function pick(source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (source[key] !== undefined) {
      picked[key] = source[key];
    }
  }
  return picked;
}

function normalizeStringArray(value: unknown, location: string): readonly string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${location} must be an array of strings.`);
  }
  return [...value].sort();
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
  return `${JSON.stringify(sortObject(value), null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function runCli(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const source = resolve(root, process.argv[2] ?? DEFAULT_SOURCE);
  const output = resolve(root, process.argv[3] ?? DEFAULT_OUTPUT);
  const document = readOpenApiSnapshot(source);
  const extracted = extractOpenApiSnapshot(document);
  writeGeneratedOperationsModule(extracted, output);
  process.stdout.write(`Extracted ${extracted.operations.length} Remnawave OpenAPI operations to ${output}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
