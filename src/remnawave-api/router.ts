import { RemnawaveApiError } from '../client/index.js';
import {
  DEFAULT_OPERATION_REGISTRY,
  type DescribeOperationMetadata,
  type OperationRegistration,
  type RemnawaveApiClient,
  type ValidationIssue,
} from './registry.js';
import { buildTier3ConfirmationState, getSupportedOperationRisk } from './risk.js';
import {
  computeCanonicalPayloadHash,
  computeStateFingerprint,
  createPreviewApplyEntry,
  markPreviewApplyEntryConsumed,
  readPreviewApplyEntry,
  type PreviewApplyChange,
  type PreviewApplyTokenFailure,
} from './preview-apply-cache.js';
import {
  createRemnawaveApiErrorResponse,
  normalizeRemnawaveApiErrorMessage,
  sanitizeRemnawaveApiTopLevelMessage,
  type RemnawaveApiCompactErrorResponse,
  type RemnawaveApiResponse,
} from './contract.js';

export interface RemnawaveApiRequest {
  readonly domain?: unknown;
  readonly operation?: unknown;
  readonly payload?: unknown;
  readonly responseMode?: unknown;
  readonly confirmToken?: unknown;
}

const EMPTY_PAYLOAD_OBJECT: Record<string, unknown> = {};

export async function routeRemnawaveApiRequest(
  request: RemnawaveApiRequest,
  client: RemnawaveApiClient,
): Promise<RemnawaveApiResponse> {
  if (!isPlainObject(request)) {
    return validationError({
      message: 'request must be a plain object.',
      validationIssues: [
        {
          field: 'request',
          code: 'REQUEST_OBJECT_REQUIRED',
          message: 'request must be a non-null object with domain, optional operation, and optional payload.',
        },
      ],
    });
  }

  const domainValue = typeof request.domain === 'string' ? request.domain.trim() : '';
  const operationValue = typeof request.operation === 'string' ? request.operation.trim() : '';
  const responseModeValue = request.responseMode === undefined ? 'normalized' : request.responseMode;
  const hasPayloadField = Object.hasOwn(request, 'payload');
  const payloadValue = hasPayloadField ? request.payload : undefined;

  try {
    return await routeRemnawaveApiRequestUnsafe({
      domainValue,
      operationValue,
      hasPayloadField,
      payloadValue,
      responseModeValue,
      confirmTokenValue: typeof request.confirmToken === 'string' ? request.confirmToken.trim() : '',
      client,
    });
  } catch (error) {
    const upstream = normalizeRemnawaveApiErrorMessage(error);

    return createRemnawaveApiErrorResponse({
      code: 'INTERNAL_ERROR',
      kind: 'internal',
      message: sanitizeRemnawaveApiTopLevelMessage(
        upstream.message,
        'Unexpected runtime error while executing the request.',
      ),
      retryable: false,
    });
  }
}

async function routeRemnawaveApiRequestUnsafe(input: {
  readonly domainValue: string;
  readonly operationValue: string;
  readonly hasPayloadField: boolean;
  readonly payloadValue: unknown;
  readonly responseModeValue: unknown;
  readonly confirmTokenValue: string;
  readonly client: RemnawaveApiClient;
}): Promise<RemnawaveApiResponse> {
  const { domainValue, operationValue, hasPayloadField, payloadValue, responseModeValue, confirmTokenValue, client } = input;

  if (domainValue === '') {
    return validationError({
      message: 'domain is required.',
      validationIssues: [
        {
          field: 'domain',
          code: 'DOMAIN_REQUIRED',
          message: 'domain must be a non-empty string.',
        },
      ],
    });
  }

  if (responseModeValue !== 'normalized' && responseModeValue !== 'raw') {
    return validationError({
      message: 'responseMode must be either "normalized" or "raw".',
      validationIssues: [
        {
          field: 'responseMode',
          code: 'INVALID_RESPONSE_MODE',
          message: 'responseMode must be either "normalized" or "raw".',
        },
      ],
    });
  }

  if (!DEFAULT_OPERATION_REGISTRY.hasDomain(domainValue)) {
    return unsupportedOperationError({
      code: 'UNSUPPORTED_DOMAIN',
      message: `Unsupported domain: ${domainValue}.`,
      issue: {
        field: 'domain',
        code: 'UNSUPPORTED_DOMAIN',
        message: `Supported domains: ${DEFAULT_OPERATION_REGISTRY.listDomains().join(', ')}.`,
      },
    });
  }

  if (operationValue === '') {
    if (responseModeValue === 'raw') {
      return rawModePolicyError(domainValue, 'operation', 'raw response mode is only supported for allowlisted read execution.');
    }

    if (hasPayloadField) {
      return validationError({
        message: 'payload cannot be sent without operation.',
        validationIssues: [
          {
            field: 'operation',
            code: 'OPERATION_REQUIRED',
            message: 'operation must be provided when payload is present.',
          },
        ],
      });
    }

    return {
      domain: domainValue,
      operations: DEFAULT_OPERATION_REGISTRY.listOperations(domainValue).map((entry) => toOperationSummary(entry)),
    };
  }

  const operation = DEFAULT_OPERATION_REGISTRY.get(domainValue, operationValue);
  const domainOperations = DEFAULT_OPERATION_REGISTRY.listOperations(domainValue);

  if (operation === undefined) {
    return unsupportedOperationError({
      code: 'UNSUPPORTED_OPERATION',
      message: `Unsupported operation for ${domainValue}: ${operationValue}.`,
      issue: {
        field: 'operation',
        code: 'UNSUPPORTED_OPERATION',
        message: `Supported operations: ${domainOperations.map((entry) => entry.discovery.operation).join(', ')}.`,
      },
    });
  }

  if (responseModeValue === 'raw' && !hasPayloadField) {
    return rawModePolicyError(`${domainValue}.${operation.discovery.operation}`, 'responseMode', 'raw response mode is only supported for execution requests.');
  }

  if (operation.disposition !== 'supported') {
    return unsupportedOperationError({
      code: operation.disposition === 'deferred' ? 'DEFERRED_OPERATION' : 'DENIED_OPERATION',
      message: `${domainValue}.${operation.discovery.operation} is ${operation.disposition} from the v1 MVP scope.`,
      issue: {
        field: 'operation',
        code: operation.disposition === 'deferred' ? 'DEFERRED_OPERATION' : 'DENIED_OPERATION',
        message: operation.discovery.helpText,
      },
    });
  }

  if (responseModeValue === 'raw' && !canReturnRaw(operation)) {
    return rawModePolicyError(`${domainValue}.${operation.discovery.operation}`, 'responseMode', 'raw response mode is not allowed for this operation.');
  }

  if (!hasPayloadField) {
    return describeOperation(domainValue, operation, domainOperations);
  }

  if (operation.safetyMode === 'preview_apply') {
    if (responseModeValue === 'raw') {
      return rawModePolicyError(`${domainValue}.${operation.discovery.operation}`, 'responseMode', 'raw response mode is not allowed for preview/apply writes.');
    }

    return handlePreviewApplyOperation({
      domainValue,
      operation,
      payloadValue,
      client,
    });
  }

  const validationIssues = operation.validation.validatePayload(payloadValue);
  if (validationIssues.length > 0) {
    return validationError({
      message: `Payload is missing or invalid for ${domainValue}.${operation.discovery.operation}.`,
      validationIssues,
    });
  }

  const risk = getSupportedOperationRisk(domainValue, operation.discovery.operation);
  if (operation.safetyMode === 'confirm') {
    const payloadObject = payloadValue as Record<string, unknown>;
    const confirmationToken = readConfirmationToken(confirmTokenValue);
    const confirmation = buildTier3ConfirmationState({
      domain: domainValue,
      operation: operation.discovery.operation,
      effect: risk.effect === 'read' ? 'update' : risk.effect,
      scope: risk.scope === 'single_response' ? 'bounded_set' : risk.scope,
      blastRadius: 'mass_or_destructive',
      impactSummary: risk.rationale,
      payload: payloadObject,
      confirmationToken,
    });

    if (!confirmation.ok) {
      return createRemnawaveApiErrorResponse({
        code: 'CONFIRMATION_REQUIRED',
        kind: 'confirmation_required',
        message: `Confirmation token required before executing ${domainValue}.${operation.discovery.operation}.`,
        retryable: false,
        token: confirmation.token,
      });
    }
  }

  try {
    if (responseModeValue === 'raw') {
      return await executeRawRead(operation, client, payloadValue as Record<string, unknown>);
    }

    return await executeNormalizedOperation(operation, client, payloadValue as Record<string, unknown>);
  } catch (error) {
    if (error instanceof RemnawaveApiError) {
      const retryable = error.statusCode >= 500;

      return createRemnawaveApiErrorResponse({
        code: 'UPSTREAM_ERROR',
        kind: 'upstream',
        message: retryable
          ? 'Remnawave API request failed.'
          : 'Remnawave API rejected the request.',
        retryable,
        statusCode: error.statusCode,
      });
    }

    return createRemnawaveApiErrorResponse({
      code: 'INTERNAL_ERROR',
      kind: 'internal',
      message: 'The Remnawave MCP could not complete the request.',
      retryable: false,
    });
  }
}

async function handlePreviewApplyOperation(input: {
  readonly domainValue: string;
  readonly operation: OperationRegistration;
  readonly payloadValue: unknown;
  readonly client: RemnawaveApiClient;
}): Promise<RemnawaveApiResponse> {
  const payload = isPlainObject(input.payloadValue) ? input.payloadValue : null;
  if (payload === null) {
    return validationError({
      message: `Payload is missing or invalid for ${input.domainValue}.${input.operation.discovery.operation}.`,
      validationIssues: [
        {
          field: 'payload',
          code: 'INVALID_PAYLOAD',
          message: 'payload must be a plain object.',
        },
      ],
    });
  }

  if (Object.hasOwn(payload, 'applyToken')) {
    return handlePreviewApplyApply(input.domainValue, input.operation, payload, input.client);
  }

  const validationIssues = input.operation.validation.validatePayload(payload);
  if (validationIssues.length > 0) {
    return validationError({
      message: `Payload is missing or invalid for ${input.domainValue}.${input.operation.discovery.operation}.`,
      validationIssues,
    });
  }

  return handlePreviewApplyPreview(input.domainValue, input.operation, payload, input.client);
}

async function handlePreviewApplyPreview(
  domain: string,
  operation: OperationRegistration,
  payload: Record<string, unknown>,
  client: RemnawaveApiClient,
): Promise<RemnawaveApiResponse> {
  if (domain !== 'hosts' || operation.discovery.operation !== 'bulk_set_port') {
    return createRemnawaveApiErrorResponse({
      code: 'PREVIEW_APPLY_NOT_WIRED',
      kind: 'internal',
      message: `Preview/apply is not wired for ${domain}.${operation.discovery.operation}.`,
      retryable: false,
    });
  }

  const preview = await buildHostBulkSetPortPreview(client, payload);
  const entry = createPreviewApplyEntry({
    domain,
    operation: operation.discovery.operation,
    openapi: operation.openapi,
    targetIdentity: preview.targetIdentity,
    payload,
    preStateFingerprint: preview.preStateFingerprint,
    changes: preview.changes,
  });

  return {
    applyToken: entry.applyToken,
    expiresAt: entry.expiresAt,
    changes: entry.changes,
    target: entry.targetIdentity,
  };
}

async function handlePreviewApplyApply(
  domain: string,
  operation: OperationRegistration,
  payload: Record<string, unknown>,
  client: RemnawaveApiClient,
): Promise<RemnawaveApiResponse> {
  const payloadKeys = Object.keys(payload);
  if (payloadKeys.length !== 1 || typeof payload.applyToken !== 'string' || payload.applyToken.trim() === '') {
    return previewApplyError({
      code: payloadKeys.length === 1 ? 'APPLY_TOKEN_MISSING' : 'APPLY_TOKEN_PAYLOAD_MISMATCHED',
      message: payloadKeys.length === 1
        ? 'Apply token is required.'
        : 'Apply requests must send payload with applyToken only and cannot override previewed payload fields.',
    });
  }

  const tokenState = readPreviewApplyEntry({
    applyToken: payload.applyToken,
    domain,
    operation: operation.discovery.operation,
    openapi: operation.openapi,
  });
  if (!tokenState.ok) {
    return previewApplyError(tokenState.failure);
  }

  const entry = tokenState.entry;
  if (computeCanonicalPayloadHash(entry.originalPayload) !== entry.payloadHash) {
    return previewApplyError({ code: 'APPLY_TOKEN_PAYLOAD_MISMATCHED', message: 'Apply token payload binding does not match.' });
  }

  if (domain === 'hosts' && operation.discovery.operation === 'bulk_set_port') {
    const preview = await buildHostBulkSetPortPreview(client, entry.originalPayload);
    if (computeCanonicalPayloadHash(preview.targetIdentity) !== computeCanonicalPayloadHash(entry.targetIdentity)) {
      return previewApplyError({ code: 'APPLY_TOKEN_TARGET_MISMATCHED', message: 'Apply token target binding does not match.', expiresAt: entry.expiresAt });
    }

    if (preview.preStateFingerprint !== entry.preStateFingerprint) {
      return previewApplyError({ code: 'APPLY_TOKEN_STALE_STATE', message: 'Apply token pre-state fingerprint is stale.', expiresAt: entry.expiresAt });
    }
  }

  const result = await executeNormalizedOperation(operation, client, entry.originalPayload);
  markPreviewApplyEntryConsumed(entry.applyToken);
  return result;
}

async function buildHostBulkSetPortPreview(
  client: RemnawaveApiClient,
  payload: Record<string, unknown>,
): Promise<{
  readonly targetIdentity: Record<string, unknown>;
  readonly preStateFingerprint: string;
  readonly changes: readonly PreviewApplyChange[];
}> {
  const getHosts = client.getHosts;
  if (getHosts === undefined) {
    throw new Error('hosts.bulk_set_port preview requires getHosts client method.');
  }

  const hostUuids = readStringArray(payload.hostUuids);
  const nextPort = typeof payload.port === 'number' ? payload.port : 0;
  const hosts = readHostItems(await getHosts());
  const selectedHosts = hostUuids.map((uuid) => hosts.find((host) => host.uuid === uuid) ?? null);

  if (selectedHosts.some((host) => host === null)) {
    return {
      targetIdentity: { type: 'hosts', hostUuids, missingHostUuids: hostUuids.filter((uuid, index) => selectedHosts[index] === null) },
      preStateFingerprint: computeStateFingerprint({ missing: hostUuids }),
      changes: [],
    };
  }

  const existingHosts = selectedHosts as readonly HostPreviewState[];
  const preState = existingHosts.map((host) => ({ uuid: host.uuid, port: host.port, enabled: host.enabled, fingerprint: host.fingerprint }));

  return {
    targetIdentity: { type: 'hosts', hostUuids },
    preStateFingerprint: computeStateFingerprint(preState),
    changes: existingHosts.map((host) => ({
      target: host.uuid,
      before: { port: host.port },
      after: { port: nextPort },
    })),
  };
}

async function executeNormalizedOperation(
  operation: OperationRegistration,
  client: RemnawaveApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const execution = await operation.execution.execute(client, payload);
  return operation.responseMapper(execution.result);
}

function previewApplyError(failure: PreviewApplyTokenFailure): RemnawaveApiCompactErrorResponse {
  return createRemnawaveApiErrorResponse({
    code: failure.code,
    kind: failure.code === 'APPLY_TOKEN_MISSING' ? 'preview_required' : 'preview_invalid',
    message: failure.message,
    retryable: false,
    expiresAt: failure.expiresAt,
  });
}

interface HostPreviewState {
  readonly uuid: string;
  readonly port: number;
  readonly enabled?: boolean;
  readonly fingerprint?: string | null;
}

function readHostItems(value: unknown): readonly HostPreviewState[] {
  const record = isPlainObject(value) ? value : {};
  const items = Array.isArray(record.items) ? record.items : Array.isArray(record.hosts) ? record.hosts : [];
  return items.filter(isHostPreviewState);
}

function isHostPreviewState(value: unknown): value is HostPreviewState {
  return isPlainObject(value) && typeof value.uuid === 'string' && typeof value.port === 'number';
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function canReturnRaw(operation: OperationRegistration): boolean {
  return operation.disposition === 'supported' && !operation.write && operation.rawAllowed;
}

async function executeRawRead(
  operation: OperationRegistration,
  client: RemnawaveApiClient,
  payload: Record<string, unknown>,
): Promise<unknown> {
  if (operation.execution.clientMethod === 'getSystemStats') {
    return client.getSystemStats();
  }

  throw new Error(`Raw execution is not wired for ${operation.discovery.domain}.${operation.discovery.operation}.`);
}

function describeOperation(
  domain: string,
  operation: OperationRegistration,
  supportedOperations: readonly OperationRegistration[],
): Record<string, unknown> {
  return {
    domain,
    operation: toOperationDetails(
      DEFAULT_OPERATION_REGISTRY.describeOperation(domain, operation.discovery.operation),
      supportedOperations,
    ),
    risk: {
      tier: getSupportedOperationRisk(domain, operation.discovery.operation).tier,
    },
  };
}

function validationError(input: {
  readonly message: string;
  readonly validationIssues: readonly ValidationIssue[];
}): RemnawaveApiCompactErrorResponse {
  return createRemnawaveApiErrorResponse({
    code: input.message.startsWith('Payload is missing or invalid')
      ? 'INVALID_PAYLOAD'
      : input.validationIssues[0]?.code ?? 'VALIDATION_ERROR',
    kind: 'validation',
    message: input.message,
    retryable: false,
    issues: input.validationIssues,
  });
}

function unsupportedOperationError(input: {
  readonly code: string;
  readonly message: string;
  readonly issue: ValidationIssue;
}): RemnawaveApiCompactErrorResponse {
  return createRemnawaveApiErrorResponse({
    code: input.code,
    kind: 'unsupported_operation',
    message: input.message,
    retryable: false,
    issues: [input.issue],
  });
}

function rawModePolicyError(target: string, field: string, message: string): RemnawaveApiCompactErrorResponse {
  return createRemnawaveApiErrorResponse({
    code: 'RAW_RESPONSE_NOT_ALLOWED',
    kind: 'validation',
    message,
    retryable: false,
    issues: [
      {
        field,
        code: 'RAW_RESPONSE_NOT_ALLOWED',
        message: `responseMode=raw is not allowed for ${target}.`,
      },
    ],
  });
}

function toOperationSummary(operation: OperationRegistration): Record<string, unknown> {
  return {
    name: operation.discovery.operation,
    disposition: operation.disposition,
    write: operation.write,
    ...(operation.write ? { riskTier: operation.risk.tier } : {}),
    payloadRequired: true,
    summary: operation.discovery.description,
  };
}

function toOperationDetails(
  metadata: DescribeOperationMetadata | null,
  supportedOperations?: readonly OperationRegistration[],
): Record<string, unknown> {
  if (metadata === null) {
    return {
      supportedOperations: supportedOperations?.map((entry) => entry.discovery.operation),
    };
  }

  return {
    name: metadata.operation,
    disposition: metadata.disposition,
    description: metadata.description,
    helpText: metadata.helpText,
    write: metadata.write,
    schemaSummary: metadata.schemaSummary,
    validationRulesSummary: metadata.validationRulesSummary,
    payloadExample: metadata.payloadExample,
    riskTier: metadata.riskTier,
    sideEffects: metadata.sideEffects,
    rawAllowed: metadata.rawAllowed,
    normalizer: metadata.normalizer,
    safetyMode: metadata.safetyMode,
    openapi: metadata.openapi,
    execution: metadata.execution,
    supportedOperations: supportedOperations?.map((entry) => entry.discovery.operation),
  };
}

function readConfirmationToken(confirmTokenValue: string): string | null {
  return confirmTokenValue !== '' ? confirmTokenValue : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
