import { randomBytes } from 'node:crypto';

import { computePreviewBindingHash } from '../safety/contract.js';

export type RiskTier = 'tier1' | 'tier2' | 'tier3';
export type RiskEffect = 'read' | 'create' | 'update' | 'delete' | 'restart';
export type RiskScope = 'single_response' | 'single_entity' | 'bounded_set' | 'fleet';
export type RiskBlastRadius = 'single_response' | 'single_entity' | 'bounded_set' | 'mass_or_destructive';

export interface OperationRiskProfile {
  readonly tier: RiskTier;
  readonly effect: RiskEffect;
  readonly scope: RiskScope;
  readonly blastRadius: RiskBlastRadius;
  readonly confirmationRequired: boolean;
  readonly rationale: string;
}

export interface Tier3ConfirmationInput {
  readonly domain: string;
  readonly operation: string;
  readonly effect: Exclude<RiskEffect, 'read'>;
  readonly scope: Exclude<RiskScope, 'single_response'>;
  readonly blastRadius: 'mass_or_destructive';
  readonly impactSummary: string;
  readonly payload: Record<string, unknown>;
  readonly confirmationToken: string | null;
}

export interface Tier3ConfirmationResult {
  readonly ok: boolean;
  readonly tier: 'tier3';
  readonly confirmationRequired: true;
  readonly token: string;
  readonly impactSummary: string;
}

const CONFIRMATION_TOKEN_TTL_MS = 10 * 60 * 1000;

interface ConfirmationTokenEntry {
  readonly token: string;
  readonly bindingHash: string;
  readonly expiresAtMs: number;
  consumed: boolean;
}

const confirmationTokens = new Map<string, ConfirmationTokenEntry>();

export const SUPPORTED_OPERATION_RISK: Readonly<Record<string, OperationRiskProfile>> = {
  // Tiering is based on operator impact: this is a pure read with response-only scope.
  'system.get_stats': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads diagnostics only; it does not mutate remote state and its blast radius is limited to one response payload.',
  },
  'system.get_metadata': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads system metadata diagnostics without mutating remote state.',
  },
  'system.get_health': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads current service health diagnostics without mutating remote state.',
  },
  'system.get_nodes_metrics': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads current node metrics as a diagnostics payload without mutating remote state.',
  },
  'system.get_recap': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads aggregate recap data only; it does not mutate remote state.',
  },
  'system.get_request_history': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads aggregate subscription request-history data without mutating remote state.',
  },
  'system.get_bandwidth_stats': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads aggregate bandwidth statistics without mutating remote state.',
  },
  'system.get_node_statistics': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads aggregate node statistics without mutating remote state.',
  },
  'system.generate_x25519': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Generates one x25519 keypair without mutating panel data.',
  },
  // Creation is a write, but it is still bounded: one new user record, no destructive fleet-wide side effect.
  'users.create': {
    tier: 'tier2',
    effect: 'create',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Creates one user entity with bounded scope; this is a routine mutation that should stay fast after validation.',
  },
  'users.list': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists users as a read-only response without mutating remote state.',
  },
  'users.get': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one user by UUID without mutating remote state.',
  },
  'users.disable': {
    tier: 'tier3',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'mass_or_destructive',
    confirmationRequired: true,
    rationale: 'Disables one user account and can interrupt access, so it requires confirmation.',
  },
  'users.enable': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Enables one user account with bounded single-entity scope.',
  },
  'users.resolve': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Resolves one user from stable selectors and returns a read-only result.',
  },
  'users.inspect': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Inspects support context for a single user without mutating upstream state.',
  },
  'users.get_subscription_request_history': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one user subscription request-history trail without mutating remote state.',
  },
  'users.manage_lifecycle': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Applies bounded single-user lifecycle mutations through existing model-facing seams without bulk or destructive fleet-wide impact.',
  },
  'users.manage_devices': {
    tier: 'tier2',
    effect: 'delete',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Deletes one HWID device for one user through an existing model-facing seam without broader user-admin or fleet-wide side effects.',
  },
  'subscriptions.list': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists subscriptions as a read-only inspection response.',
  },
  'subscriptions.get_by_username': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one protected subscription by username without mutating remote state.',
  },
  'subscriptions.get_by_short_uuid': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one protected subscription by short UUID without mutating remote state.',
  },
  'subscriptions.get': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one protected subscription by UUID without mutating remote state.',
  },
  'subscriptions.get_raw_by_short_uuid': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one protected raw subscription endpoint with MCP raw response mode disabled and no mutation.',
  },
  'subscriptions.get_subpage_config_by_short_uuid': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one protected subscription subpage config without mutating remote state.',
  },
  'subscriptions.get_connection_keys_by_uuid': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads protected subscription connection-key data without mutating remote state.',
  },
  'subscription_request_history.list': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists subscription request history without mutating remote state.',
  },
  'subscription_request_history.get_stats': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads subscription request-history stats without mutating remote state.',
  },
  'subscriptions.inspect_support_context': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads subscription support context for one user without mutating upstream state.',
  },
  'subscriptions.inspect_page_delivery': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads subscription page-delivery posture for one user without mutating upstream state.',
  },
  'subscriptions.inspect_global_settings': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads global subscription settings without mutating remote state.',
  },
  'subscriptions.manage_global_settings': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Updates one bounded subscription-settings document without destructive or fleet-wide side effects.',
  },
  'profiles.list': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists config profiles as a read-only inventory without mutating remote state.',
  },
  'profiles.inspect': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one config profile without mutating remote state.',
  },
  'profiles.inspect_computed': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one computed config profile output without mutating remote state.',
  },
  'profiles.list_inbounds': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one profile inbound inventory without mutating remote state.',
  },
  'profiles.manage_lifecycle': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Applies bounded single-profile lifecycle mutations through existing model-facing seams without broad profile-admin or reorder side effects.',
  },
  'profiles.manage_inbounds': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Replaces one profile inbound set through the existing single-profile update seam after strict nested validation, without exposing raw profile patching or broader admin behavior.',
  },
  'hosts.list': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists hosts as a read-only inventory without mutating remote state.',
  },
  'hosts.bulk_set_port': {
    tier: 'tier3',
    effect: 'update',
    scope: 'bounded_set',
    blastRadius: 'mass_or_destructive',
    confirmationRequired: true,
    rationale: 'Bulk host port changes can affect multiple routes and require confirmation.',
  },
  'hosts.inspect': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one host from the existing host inventory without mutating remote state.',
  },
  'hosts.export_detailed': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Exports the current detailed host inventory without mutating remote state.',
  },
  'hosts.manage_lifecycle': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Applies bounded single-host lifecycle mutations through existing model-facing seams while keeping reorder and broader host rewrites out of scope.',
  },
  'hosts.manage_routing': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Applies bounded single-host routing-adjacent updates for inbound attachment or port changes without enabling multi-host rewrites.',
  },
  'hosts.manage_definition': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Updates one bounded host definition without destructive or fleet-wide side effects.',
  },
  'internal_squads.list': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists internal squads as a read-only inventory without mutating remote state.',
  },
  'internal_squads.inspect_access': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one internal squad access view without mutating remote state.',
  },
  'internal_squads.manage_membership': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Adds or removes a bounded user set for one internal squad without broader definition changes.',
  },
  'internal_squads.manage_definition': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Updates one bounded internal squad definition without bulk membership side effects.',
  },
  'external_squads.list': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists external squads as a read-only delivery inventory without mutating remote state.',
  },
  'external_squads.inspect_delivery': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one external squad delivery policy without mutating remote state.',
  },
  'external_squads.manage_membership': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Adds or removes a bounded user set for one external squad without changing delivery-policy definitions.',
  },
  'external_squads.manage_definition': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Updates one bounded external squad delivery-policy definition without changing squad ordering.',
  },
  'nodes.list': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists nodes as a read-only infrastructure inventory without mutating remote state.',
  },
  'nodes.restart': {
    tier: 'tier3',
    effect: 'restart',
    scope: 'single_entity',
    blastRadius: 'mass_or_destructive',
    confirmationRequired: true,
    rationale: 'Restarting one node can interrupt active traffic and requires confirmation.',
  },
  'nodes.inspect': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one node details view without mutating remote state.',
  },
  'nodes.investigate': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one node-scoped usage diagnostics view without mutating remote state.',
  },
  'nodes.manage_lifecycle': {
    tier: 'tier3',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'mass_or_destructive',
    confirmationRequired: true,
    rationale: 'Node lifecycle mutations can disable connectivity or delete infrastructure state, so they require tier3 confirmation even when scoped to one node.',
  },
  'nodes.manage_maintenance': {
    tier: 'tier3',
    effect: 'restart',
    scope: 'single_entity',
    blastRadius: 'mass_or_destructive',
    confirmationRequired: true,
    rationale: 'Node maintenance actions can interrupt active traffic and reset counters, so they require tier3 confirmation before execution.',
  },
  'node_plugins.list': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists node plugins as a read-only plugin inventory without mutating remote state.',
  },
  'node_plugins.inspect': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one node plugin details view without mutating remote state.',
  },
  'node_plugins.manage_configuration': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Creates, updates, deletes, reorders, or clones bounded plugin configuration workflows without destructive fleet-wide side effects.',
  },
  'node_plugins.get_torrent_blocker_reports': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads torrent-blocker reports as a paginated diagnostics response without mutating remote state.',
  },
  'node_plugins.get_torrent_blocker_stats': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads torrent-blocker report statistics without mutating remote state.',
  },
  'metadata.read_user': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one user metadata document without mutating remote state.',
  },
  'metadata.read_node': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one node metadata document without mutating remote state.',
  },
  'metadata.manage_user': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Updates one user metadata document without broader fleet-wide or destructive side effects.',
  },
  'infra_billing.list_providers': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists infra billing providers as a read-only finance inventory without mutating remote state.',
  },
  'infra_billing.inspect_provider': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one infra billing provider from the current provider inventory without mutating remote state.',
  },
  'infra_billing.manage_provider': {
    tier: 'tier3',
    effect: 'delete',
    scope: 'single_entity',
    blastRadius: 'mass_or_destructive',
    confirmationRequired: true,
    rationale: 'Infra billing provider lifecycle mutations alter control-plane finance configuration and include destructive delete paths, so they require tier3 confirmation before execution.',
  },
  'infra_billing.list_nodes': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists infra billing nodes as a read-only finance inventory without mutating remote state.',
  },
  'infra_billing.inspect_node': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one infra billing node from the current billing-node inventory without mutating remote state.',
  },
  'infra_billing.manage_node': {
    tier: 'tier3',
    effect: 'delete',
    scope: 'single_entity',
    blastRadius: 'mass_or_destructive',
    confirmationRequired: true,
    rationale: 'Infra billing node lifecycle mutations alter billing-control state and include destructive delete paths, so they require tier3 confirmation before execution.',
  },
  'infra_billing.list_history': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists infra billing history as a read-only finance inventory without mutating remote state.',
  },
  'infra_billing.inspect_history': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one infra billing history record from the current billing history inventory without mutating remote state.',
  },
  'ip_control.submit_user_fetch_job': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Submits one user-scoped IP-control fetch job without destructive side effects.',
  },
  'ip_control.submit_node_fetch_job': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Submits one node-scoped IP-control fetch job without destructive side effects.',
  },
  'ip_control.inspect_job': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one async IP-control job state without mutating remote state.',
  },
  'templates.inspect': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Reads one subscription template without mutating remote state.',
  },
  'subscription_page.manage_configuration': {
    tier: 'tier2',
    effect: 'update',
    scope: 'single_entity',
    blastRadius: 'single_entity',
    confirmationRequired: false,
    rationale: 'Updates one subscription-page configuration with bounded blast radius.',
  },
  'snippets.list': {
    tier: 'tier1',
    effect: 'read',
    scope: 'single_response',
    blastRadius: 'single_response',
    confirmationRequired: false,
    rationale: 'Lists snippets as a read-only admin inventory response.',
  },
};

export function getSupportedOperationRisk(domain: string, operation: string): OperationRiskProfile {
  const key = `${domain}.${operation}`;
  const profile = SUPPORTED_OPERATION_RISK[key];
  if (profile === undefined) {
    if (operation.startsWith('get') || operation === 'list' || operation === 'list_inbounds') {
      return {
        tier: 'tier1',
        effect: 'read',
        scope: 'single_response',
        blastRadius: 'single_response',
        confirmationRequired: false,
        rationale: `Reads ${domain}.${operation} without mutating remote state.`,
      };
    }
    if (operation === 'delete' || operation === 'revoke_subscription') {
      return {
        tier: 'tier3',
        effect: operation === 'delete' ? 'delete' : 'update',
        scope: 'single_entity',
        blastRadius: 'mass_or_destructive',
        confirmationRequired: true,
        rationale: `Mutates ${domain}.${operation} and requires confirmation before execution.`,
      };
    }
    return {
      tier: 'tier2',
      effect: operation === 'create' ? 'create' : 'update',
      scope: 'single_entity',
      blastRadius: 'single_entity',
      confirmationRequired: false,
      rationale: `Applies a bounded ${domain}.${operation} mutation after schema validation.`,
    };
  }

  return profile;
}

export function buildTier3ConfirmationState(input: Tier3ConfirmationInput): Tier3ConfirmationResult {
  const bindingHash = computePreviewBindingHash({
    domain: input.domain,
    operation: input.operation,
    effect: input.effect,
    scope: input.scope,
    blastRadius: input.blastRadius,
    payload: input.payload,
    impactSummary: input.impactSummary,
  });

  const confirmed = consumeConfirmationToken(input.confirmationToken, bindingHash);

  if (!confirmed) {
    const token = createConfirmationToken(bindingHash);
    return {
      ok: false,
      tier: 'tier3',
      confirmationRequired: true,
      token,
      impactSummary: input.impactSummary,
    };
  }

  return {
    ok: true,
    tier: 'tier3',
    confirmationRequired: true,
    token: input.confirmationToken ?? '',
    impactSummary: input.impactSummary,
  };
}

export function clearTier3ConfirmationTokensForTests(): void {
  confirmationTokens.clear();
}

function createConfirmationToken(bindingHash: string): string {
  const token = randomBytes(32).toString('base64url');
  confirmationTokens.set(token, {
    token,
    bindingHash,
    expiresAtMs: Date.now() + CONFIRMATION_TOKEN_TTL_MS,
    consumed: false,
  });
  return token;
}

function consumeConfirmationToken(token: string | null, bindingHash: string): boolean {
  if (token === null) {
    return false;
  }

  const entry = confirmationTokens.get(token);
  if (entry === undefined) {
    return false;
  }

  if (entry.consumed || entry.expiresAtMs <= Date.now()) {
    confirmationTokens.delete(token);
    return false;
  }

  if (entry.bindingHash !== bindingHash) {
    return false;
  }

  entry.consumed = true;
  return true;
}
