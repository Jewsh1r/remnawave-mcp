import { createHash } from 'node:crypto';

export type ContractMutationMode = 'preview' | 'apply';
export type MutationTier = 'tier1' | 'tier2' | 'tier3';

export interface MutationPolicy {
  readonly tier: MutationTier;
  readonly confirmationRequired: boolean;
}

export interface ContractValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly field: string;
}

export interface NoPreviewDeclaration {
  readonly declared: boolean;
  readonly reason?: string;
}

export interface PreviewBindingState {
  readonly bindingHash: string;
  readonly providedHash: string | null;
  readonly bindingMatched: boolean | null;
  readonly targetCount: number;
  readonly noPreviewDeclaration: NoPreviewDeclaration;
  readonly policy: MutationPolicy;
  readonly impactSummary: string;
}

export interface IdempotencyState {
  readonly key: string;
  readonly source: 'client_provided' | 'derived_deterministic';
}

export interface PartialFailureState {
  readonly targetCount: number;
  readonly appliedCount: number;
  readonly failedCount: number;
  readonly failedIndexes: readonly number[];
}

export function computePreviewBindingHash(value: unknown): string {
  const digest = createHash('sha256').update(stableJson(value), 'utf8').digest('hex');
  return `sha256:${digest}`;
}

export function buildPreviewBindingState(input: {
  readonly mode: ContractMutationMode;
  readonly targetCount: number;
  readonly bindingHash: string;
  readonly providedHash: string | null;
  readonly supportsPreview: boolean;
  readonly noPreviewDeclaration: NoPreviewDeclaration;
  readonly policy: MutationPolicy;
  readonly impactSummary: string;
}): {
  readonly state: PreviewBindingState;
  readonly validationErrors: readonly ContractValidationIssue[];
} {
  const validationErrors: ContractValidationIssue[] = [];
  const providedHash = input.providedHash?.trim() ? input.providedHash : null;
  const noPreviewDeclared = input.noPreviewDeclaration.declared;
  const confirmationRequired = input.policy.confirmationRequired;

  if (input.supportsPreview && confirmationRequired && noPreviewDeclared) {
    validationErrors.push({
      code: 'NO_PREVIEW_DECLARATION_FORBIDDEN',
      message: 'This action requires confirmation. noPreview.declared=true is not allowed.',
      field: 'noPreview.declared',
    });
  }

  let bindingMatched: boolean | null = null;
  if (input.mode === 'apply' && confirmationRequired) {
    if (!noPreviewDeclared && providedHash === null) {
      validationErrors.push({
        code: 'PREVIEW_BINDING_REQUIRED',
        message: 'Apply mode requires previewHash from a reviewed preview response.',
        field: 'previewHash',
      });
      bindingMatched = false;
    } else if (providedHash !== null) {
      bindingMatched = providedHash === input.bindingHash;
      if (!bindingMatched) {
        validationErrors.push({
          code: 'PREVIEW_BINDING_STALE',
          message: 'Provided previewHash does not match current planned operations.',
          field: 'previewHash',
        });
      }
    }
  }

  return {
    state: {
      bindingHash: input.bindingHash,
      providedHash,
      bindingMatched,
      targetCount: input.targetCount,
      noPreviewDeclaration: input.noPreviewDeclaration,
      policy: input.policy,
      impactSummary: input.impactSummary,
    },
    validationErrors,
  };
}

export function deriveIdempotencyState(input: {
  readonly providedKey: string | null;
  readonly bindingHash: string;
  readonly mode: ContractMutationMode;
  readonly targetCount: number;
}): IdempotencyState {
  const providedKey = input.providedKey?.trim() ? input.providedKey : null;
  if (providedKey !== null) {
    return {
      key: providedKey,
      source: 'client_provided',
    };
  }

  return {
    key: computePreviewBindingHash({
      mode: input.mode,
      bindingHash: input.bindingHash,
      targetCount: input.targetCount,
    }),
    source: 'derived_deterministic',
  };
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
