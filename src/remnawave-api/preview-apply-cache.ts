import { createHash, randomBytes } from 'node:crypto';

import { REMNAWAVE_OPERATION_INVENTORY } from './generated/operation-inventory.js';
import type { RemnawaveOpenApiBinding } from './operation-contract.js';

export const PREVIEW_APPLY_TOKEN_TTL_MS = 10 * 60 * 1000;

export interface PreviewApplyChange {
  readonly target: string;
  readonly before: Record<string, unknown>;
  readonly after: Record<string, unknown>;
}

export interface PreviewApplyEntry {
  readonly applyToken: string;
  readonly domain: string;
  readonly operation: string;
  readonly method: string;
  readonly path: string;
  readonly targetIdentity: Record<string, unknown>;
  readonly payloadHash: string;
  readonly remnawaveVersion: string | null;
  readonly preStateFingerprint: string;
  readonly changes: readonly PreviewApplyChange[];
  readonly originalPayload: Record<string, unknown>;
  readonly createdAt: string;
  readonly expiresAt: string;
  consumed: boolean;
}

export type PreviewApplyTokenFailureCode =
  | 'APPLY_TOKEN_MISSING'
  | 'APPLY_TOKEN_EXPIRED'
  | 'APPLY_TOKEN_REUSED'
  | 'APPLY_TOKEN_NOT_FOUND'
  | 'APPLY_TOKEN_WRONG_OPERATION'
  | 'APPLY_TOKEN_PAYLOAD_MISMATCHED'
  | 'APPLY_TOKEN_TARGET_MISMATCHED'
  | 'APPLY_TOKEN_STALE_STATE';

export interface PreviewApplyTokenFailure {
  readonly code: PreviewApplyTokenFailureCode;
  readonly message: string;
  readonly expiresAt?: string;
}

const previewApplyEntries = new Map<string, PreviewApplyEntry>();

export function createPreviewApplyEntry(input: {
  readonly domain: string;
  readonly operation: string;
  readonly openapi: RemnawaveOpenApiBinding;
  readonly targetIdentity: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
  readonly preStateFingerprint: string;
  readonly changes: readonly PreviewApplyChange[];
  readonly now?: Date;
  readonly remnawaveVersion?: string | null;
}): PreviewApplyEntry {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + PREVIEW_APPLY_TOKEN_TTL_MS);
  const entry: PreviewApplyEntry = {
    applyToken: randomBytes(32).toString('base64url'),
    domain: input.domain,
    operation: input.operation,
    method: input.openapi.method,
    path: input.openapi.path,
    targetIdentity: input.targetIdentity,
    payloadHash: computeCanonicalPayloadHash(input.payload),
    remnawaveVersion: input.remnawaveVersion ?? null,
    preStateFingerprint: input.preStateFingerprint,
    changes: input.changes,
    originalPayload: { ...input.payload },
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    consumed: false,
  };

  previewApplyEntries.set(entry.applyToken, entry);
  return entry;
}

export function readPreviewApplyEntry(input: {
  readonly applyToken: string;
  readonly domain: string;
  readonly operation: string;
  readonly openapi: RemnawaveOpenApiBinding;
  readonly now?: Date;
}): { readonly ok: true; readonly entry: PreviewApplyEntry } | { readonly ok: false; readonly failure: PreviewApplyTokenFailure } {
  const applyToken = input.applyToken.trim();
  if (applyToken === '') {
    return { ok: false, failure: { code: 'APPLY_TOKEN_MISSING', message: 'Apply token is required.' } };
  }

  const entry = previewApplyEntries.get(applyToken);
  if (entry === undefined) {
    return { ok: false, failure: { code: 'APPLY_TOKEN_NOT_FOUND', message: 'Apply token was not found.' } };
  }

  const now = input.now ?? new Date();
  if (Date.parse(entry.expiresAt) <= now.getTime()) {
    previewApplyEntries.delete(applyToken);
    return { ok: false, failure: { code: 'APPLY_TOKEN_EXPIRED', message: 'Apply token has expired.', expiresAt: entry.expiresAt } };
  }

  if (entry.consumed) {
    return { ok: false, failure: { code: 'APPLY_TOKEN_REUSED', message: 'Apply token was already used.', expiresAt: entry.expiresAt } };
  }

  if (entry.domain !== input.domain || entry.operation !== input.operation || entry.method !== input.openapi.method || entry.path !== input.openapi.path) {
    return { ok: false, failure: { code: 'APPLY_TOKEN_WRONG_OPERATION', message: 'Apply token is bound to a different operation.', expiresAt: entry.expiresAt } };
  }

  return { ok: true, entry };
}

export function markPreviewApplyEntryConsumed(applyToken: string): void {
  const entry = previewApplyEntries.get(applyToken);
  if (entry !== undefined) {
    entry.consumed = true;
  }
}

export function clearPreviewApplyCacheForTests(): void {
  previewApplyEntries.clear();
}

export function computeCanonicalPayloadHash(payload: unknown): string {
  const digest = createHash('sha256').update(stableJson(payload), 'utf8').digest('hex');
  return `sha256:${digest}`;
}

export function computeStateFingerprint(value: unknown): string {
  const digest = createHash('sha256').update(stableJson(value), 'utf8').digest('hex');
  return `sha256:${digest}`;
}

export function getSupportedOperationOpenApiBinding(domain: string, operation: string): RemnawaveOpenApiBinding {
  const key = `${domain}.${operation}`;
  const contract = REMNAWAVE_OPERATION_INVENTORY.operations.find((entry) => entry.key === key);
  if (contract?.status !== 'supported') {
    throw new Error(`Supported OpenAPI binding not found for ${key}.`);
  }

  return contract.openapi;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }

  return value;
}
