import {
  DEFAULT_OPERATION_REGISTRY,
  type DescribeOperationMetadata,
  type RemnawaveApiClient,
  type RemnawaveApiScopeMap,
} from './registry.js';
import { getSupportedOperationRisk, type OperationRiskProfile } from './risk.js';

export type RemnawaveApiErrorKind =
  | 'validation'
  | 'upstream'
  | 'unsupported_operation'
  | 'confirmation_required'
  | 'preview_required'
  | 'preview_invalid'
  | 'version_unsupported'
  | 'internal';

export interface RemnawaveApiCompactError {
  readonly code: string;
  readonly kind: RemnawaveApiErrorKind;
  readonly message: string;
  readonly retryable: boolean;
  readonly issues?: readonly unknown[];
  readonly statusCode?: number;
  readonly token?: string;
  readonly expiresAt?: string;
}

export interface RemnawaveApiCompactErrorResponse {
  readonly error: RemnawaveApiCompactError;
}

export type RemnawaveApiResponse = unknown;

export type { DescribeOperationMetadata, RemnawaveApiClient, RemnawaveApiScopeMap } from './registry.js';

export interface RemnawaveApiErrorResponseInput {
  readonly code: string;
  readonly kind: RemnawaveApiErrorKind;
  readonly message: string;
  readonly retryable: boolean;
  readonly issues?: readonly unknown[];
  readonly statusCode?: number;
  readonly token?: string;
  readonly expiresAt?: string;
}

const STACK_TRACE_LINE_PATTERN = /^\s+at\s+/u;
const INTERNAL_PATH_PATTERN = /(?:\/[A-Za-z0-9._-]+)+/gu;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function firstMeaningfulLine(value: string): string {
  for (const rawLine of value.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || STACK_TRACE_LINE_PATTERN.test(rawLine)) {
      continue;
    }

    return line;
  }

  return '';
}

function sanitizeTopLevelMessage(value: string, fallback: string): string {
  const firstLine = firstMeaningfulLine(value);
  if (firstLine === '') {
    return fallback;
  }

  const withoutPaths = firstLine.replace(INTERNAL_PATH_PATTERN, '[redacted-path]');
  const collapsed = collapseWhitespace(withoutPaths);

  if (collapsed === '' || collapsed.includes('[redacted-path]') || /\b(?:enoent|eacces|stack|trace|error:)\b/iu.test(collapsed)) {
    return fallback;
  }

  return collapsed;
}

export function getRemnawaveApiScopeMap(): RemnawaveApiScopeMap {
  return DEFAULT_OPERATION_REGISTRY.getScopeMap();
}

export function listRemnawaveApiSupportedOperations(): readonly string[] {
  return getRemnawaveApiScopeMap().supported;
}

export function buildRemnawaveApiToolDiscoveryDescription(): string {
  const discovery = DEFAULT_OPERATION_REGISTRY.generateDiscovery();
  const domainSummary = discovery
    .map((domain) => `${domain.domain} (${domain.operations.filter((operation) => operation.disposition === 'supported').length} supported)`)
    .join(', ');

  return `Primary interface for the Remnawave MCP v1 contract. Use remnawave_api with domain, optional operation, and optional payload for deterministic discovery/describe/execute branching. domains: ${domainSummary}`;
}

export function createRemnawaveApiErrorResponse(input: RemnawaveApiErrorResponseInput): RemnawaveApiCompactErrorResponse {
  return {
    error: {
      code: input.code,
      kind: input.kind,
      message: input.message,
      retryable: input.retryable,
      ...(input.issues === undefined ? {} : { issues: input.issues }),
      ...(input.statusCode === undefined ? {} : { statusCode: input.statusCode }),
      ...(input.token === undefined ? {} : { token: input.token }),
      ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
    },
  };
}

export function normalizeRemnawaveApiErrorMessage(error: unknown): { readonly name?: string; readonly message: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

export function sanitizeRemnawaveApiTopLevelMessage(rawMessage: string, fallback: string): string {
  return sanitizeTopLevelMessage(rawMessage, fallback);
}

export function getRemnawaveApiOperationRisk(domain: string, operation: string): OperationRiskProfile {
  const registration = DEFAULT_OPERATION_REGISTRY.get(domain, operation);

  if (registration === undefined || registration.disposition !== 'supported') {
    throw new Error(`Unsupported operation for ${domain}: ${operation}.`);
  }

  return getSupportedOperationRisk(domain, operation);
}

export function describeRemnawaveApiOperation(
  domain: string,
  operation: string,
): DescribeOperationMetadata | null {
  return DEFAULT_OPERATION_REGISTRY.describeOperation(domain, operation);
}

export async function executeRemnawaveApiTool(
  input: Record<string, unknown>,
  client: RemnawaveApiClient,
): Promise<RemnawaveApiResponse> {
  try {
    const { routeRemnawaveApiRequest } = await import('./router.js');
    return await routeRemnawaveApiRequest(input, client);
  } catch (error) {
    const upstream = normalizeRemnawaveApiErrorMessage(error);
    const safeInput = input !== null && typeof input === 'object' ? input : {};

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
