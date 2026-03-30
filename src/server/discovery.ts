import type { RuntimeConfig } from '../runtime/config.js';
import { PROMPT_DEFINITIONS } from '../prompts/index.js';
import { RESOURCE_DEFINITIONS } from '../resources/index.js';
import { RuntimeConfigError } from '../runtime/errors.js';

export interface ToolDefinition {
  readonly kind: 'tool';
  readonly name: string;
  readonly title: string;
  readonly description: string;
}

export interface ResourceDefinition {
  readonly kind: 'resource';
  readonly uri: string;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly mimeType: string;
}

export interface PromptDefinition {
  readonly kind: 'prompt';
  readonly name: string;
  readonly title: string;
  readonly description: string;
}

export interface DiscoveryManifest {
  readonly tools: readonly ToolDefinition[];
  readonly resources: readonly ResourceDefinition[];
  readonly prompts: readonly PromptDefinition[];
}

export interface ServerDefinition {
  readonly manifest: DiscoveryManifest;
  readonly capabilities: {
    readonly tools: { readonly listChanged: false };
    readonly resources: { readonly listChanged: false };
    readonly prompts: { readonly listChanged: false };
  };
}

export const STABLE_TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    kind: 'tool',
    name: 'users_list',
    title: 'List users',
    description: 'List normalized Remnawave users from the stable core surface.',
  },
  {
    kind: 'tool',
    name: 'users_resolve',
    title: 'Resolve user',
    description: 'Resolve a single user by UUID using the verified stable-core contract.',
  },
  {
    kind: 'tool',
    name: 'nodes_list',
    title: 'List nodes',
    description: 'List normalized Remnawave nodes from the stable core surface.',
  },
  {
    kind: 'tool',
    name: 'system_get_stats',
    title: 'Get panel statistics',
    description: 'Read normalized panel statistics from the stable diagnostics surface.',
  },
  {
    kind: 'tool',
    name: 'system_get_health',
    title: 'Get system health',
    description: 'Read normalized health diagnostics from the stable diagnostics surface.',
  },
  {
    kind: 'tool',
    name: 'subscriptions_list',
    title: 'List subscriptions',
    description: 'List normalized subscriptions from the stable core surface.',
  },
  {
    kind: 'tool',
    name: 'users_mutate_subscription',
    title: 'Mutate user subscription fields',
    description:
      'Safely mutate user subscription fields with explicit mode="preview"|"apply" and structured mutation accounting.',
  },
  {
    kind: 'tool',
    name: 'users_mutate_squads',
    title: 'Mutate user squads',
    description:
      'Safely assign user squads with explicit mode="preview"|"apply" and structured mutation accounting.',
  },
] as const;

export const ADVANCED_TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    kind: 'tool',
    name: 'advanced_get_metadata',
    title: 'Advanced: get metadata',
    description: 'Advanced diagnostics: inspect panel version/build/git metadata using a volatility-aware shape.',
  },
  {
    kind: 'tool',
    name: 'advanced_list_node_plugins',
    title: 'Advanced: list node plugins',
    description: 'Advanced diagnostics: list node plugins with normalized plugin inventory details.',
  },
  {
    kind: 'tool',
    name: 'advanced_get_bandwidth_stats',
    title: 'Advanced: get bandwidth stats',
    description: 'Advanced diagnostics: inspect normalized bandwidth windows with concise drift summaries.',
  },
  {
    kind: 'tool',
    name: 'advanced_get_hwid_inspection',
    title: 'Advanced: get HWID inspection',
    description: 'Advanced diagnostics: inspect normalized HWID platform/app distributions and totals.',
  },
] as const;

export const STABLE_RESOURCE_DEFINITIONS: readonly ResourceDefinition[] = RESOURCE_DEFINITIONS;

export const COMPAT_PROMPT_DEFINITIONS: readonly PromptDefinition[] = PROMPT_DEFINITIONS;

const EMPTY_DISCOVERY: DiscoveryManifest = {
  tools: [],
  resources: [],
  prompts: [],
};

export function buildDiscoveryManifest(config: RuntimeConfig): DiscoveryManifest {
  ensureDiscoveryGating(config);

  return {
    tools: [...STABLE_TOOL_DEFINITIONS, ...ADVANCED_TOOL_DEFINITIONS],
    resources: STABLE_RESOURCE_DEFINITIONS,
    prompts: COMPAT_PROMPT_DEFINITIONS,
  };
}

export function buildServerDefinition(config: RuntimeConfig): ServerDefinition {
  const manifest = buildDiscoveryManifest(config);

  return {
    manifest,
    capabilities: {
      tools: { listChanged: false },
      resources: { listChanged: false },
      prompts: { listChanged: false },
    },
  };
}

export function registerDiscoverySurface(server: ServerDefinition): DiscoveryManifest {
  return {
    tools: [...server.manifest.tools],
    resources: [...server.manifest.resources],
    prompts: [...server.manifest.prompts],
  };
}

export function listDiscoveryCapabilities(server: ServerDefinition): DiscoveryManifest {
  return registerDiscoverySurface(server);
}

export function buildDisabledDiscoveryManifest(): DiscoveryManifest {
  return EMPTY_DISCOVERY;
}

function ensureDiscoveryGating(config: RuntimeConfig): void {
  const { remnawaveVersion } = config.startupDiagnostics;

  if (remnawaveVersion.status === 'unsupported') {
    throw new RuntimeConfigError(
      'version',
      'REMNAWAVE_VERSION_UNSUPPORTED',
      'Unsupported Remnawave version cannot advertise the planned discovery surface.',
      { remnawaveVersion: remnawaveVersion.value },
    );
  }

  if (remnawaveVersion.status === 'unknown') {
    throw new RuntimeConfigError(
      'version',
      'REMNAWAVE_VERSION_UNKNOWN',
      'Unknown Remnawave version cannot advertise the planned discovery surface.',
    );
  }
}
