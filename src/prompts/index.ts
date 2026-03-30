import type { PromptDefinition } from '../server/discovery.js';

type SupportedPromptDomain = 'users' | 'nodes' | 'system' | 'subscriptions' | 'metadata' | 'plugins' | 'bandwidth' | 'hwid';

export interface PromptWorkflowDefinition extends PromptDefinition {
  readonly workflow: {
    readonly domains: readonly SupportedPromptDomain[];
    readonly toolNames: readonly string[];
    readonly resourceUris: readonly string[];
  };
  readonly body: string;
}

export const PROMPT_DEFINITIONS: readonly PromptWorkflowDefinition[] = [
  {
    kind: 'prompt',
    name: 'operator_diagnostics',
    title: 'Operator diagnostics',
    description: 'Universal workflow for checking current panel health, system load, and node posture using supported diagnostics only.',
    workflow: {
      domains: ['system', 'nodes', 'metadata'],
      toolNames: ['system_get_health', 'system_get_stats', 'nodes_list', 'advanced_get_metadata'],
      resourceUris: ['remnawave://system/health', 'remnawave://panel/statistics', 'remnawave://nodes/status'],
    },
    body: [
      'Use this workflow when an operator needs a current-state diagnosis without making changes.',
      '1. Start with remnawave://system/health to identify instance types, count, and event-loop pressure.',
      '2. Read remnawave://panel/statistics or call system_get_stats to interpret online users, node load, and CPU cores together.',
      '3. Call nodes_list when health or traffic numbers suggest node imbalance or a regional problem.',
      '4. Call advanced_get_metadata only if version or build context matters for the diagnosis.',
      '5. Keep the summary universal by default: describe symptoms, likely scope, and the next safe supported check.',
      'Example (Redivo-specific, optional): if you mention named regions such as nl-1, label them as examples rather than defaults.',
    ].join('\n'),
  },
  {
    kind: 'prompt',
    name: 'user_resolution',
    title: 'User resolution',
    description: 'Universal workflow for resolving one user and connecting their identity to subscription state and diagnostics-safe next steps.',
    workflow: {
      domains: ['users', 'subscriptions'],
      toolNames: ['users_resolve', 'users_list', 'subscriptions_list'],
      resourceUris: [],
    },
    body: [
      'Use this workflow when an operator starts from a user UUID and needs a supported-only resolution path.',
      '1. Call users_resolve with the provided uuid and confirm whether a match exists.',
      '2. If a match is found, use users_list for broader normalized user context only when necessary.',
      '3. Use subscriptions_list to connect the user to current subscription state when that affects the operator answer.',
      '4. Keep the response factual and universal: resolved identity, current status, relevant subscription context, and any missing data still needed.',
      'Do not assume local business policies, payment rules, or outreach steps unless the caller asks for examples explicitly.',
    ].join('\n'),
  },
  {
    kind: 'prompt',
    name: 'node_investigation',
    title: 'Node investigation',
    description: 'Universal workflow for investigating node-level issues using supported node, system, and plugin capabilities.',
    workflow: {
      domains: ['nodes', 'system', 'plugins'],
      toolNames: ['nodes_list', 'system_get_health', 'system_get_stats', 'advanced_list_node_plugins'],
      resourceUris: ['remnawave://nodes/status', 'remnawave://system/health'],
    },
    body: [
      'Use this workflow when an operator suspects a node-specific availability, capacity, or plugin issue.',
      '1. Start with remnawave://nodes/status or nodes_list to identify the affected node and its connection state.',
      '2. Read remnawave://system/health to see whether scheduler, processor, or api instances show shared stress indicators.',
      '3. Call system_get_stats to interpret whether node-level symptoms align with broader panel load.',
      '4. Call advanced_list_node_plugins if the investigation may involve plugin rollout, ordering, or missing plugin configuration.',
      '5. Summarize what is node-local versus panel-wide, and name the next supported observation rather than guessing at root cause.',
    ].join('\n'),
  },
  {
    kind: 'prompt',
    name: 'traffic_interpretation',
    title: 'Traffic interpretation',
    description: 'Universal workflow for interpreting bandwidth and traffic trends with supported stats only.',
    workflow: {
      domains: ['bandwidth', 'system', 'nodes'],
      toolNames: ['advanced_get_bandwidth_stats', 'system_get_stats', 'nodes_list'],
      resourceUris: ['remnawave://panel/statistics', 'remnawave://nodes/status'],
    },
    body: [
      'Use this workflow when an operator needs to explain usage trends instead of just repeating counters.',
      '1. Call advanced_get_bandwidth_stats to inspect normalized windows and recent differences.',
      '2. Compare those windows with remnawave://panel/statistics or system_get_stats so current load is not interpreted in isolation.',
      '3. Use nodes_list or remnawave://nodes/status if traffic patterns suggest uneven node distribution or a region-specific spike.',
      '4. Explain the direction of change, the time window it applies to, and whether the current panel snapshot supports the same conclusion.',
      'Do not reference unsupported realtime bandwidth endpoints or infer customer-level causes from panel-wide windows alone.',
    ].join('\n'),
  },
  {
    kind: 'prompt',
    name: 'plugin_investigation',
    title: 'Plugin investigation',
    description: 'Universal workflow for reviewing node plugin inventory alongside metadata and node health context.',
    workflow: {
      domains: ['plugins', 'nodes', 'metadata', 'system'],
      toolNames: ['advanced_list_node_plugins', 'advanced_get_metadata', 'nodes_list', 'system_get_health'],
      resourceUris: ['remnawave://nodes/status', 'remnawave://system/health'],
    },
    body: [
      'Use this workflow when an operator needs to inspect plugin inventory without assuming hidden rollout rules.',
      '1. Call advanced_list_node_plugins to inspect plugin names, view positions, and config availability.',
      '2. Use nodes_list or remnawave://nodes/status to relate plugin questions to the affected node fleet state.',
      '3. Read remnawave://system/health when the plugin question may overlap with broader service instability.',
      '4. Call advanced_get_metadata if build/version context matters for interpreting plugin behavior.',
      '5. Keep conclusions bounded to supported evidence: plugin inventory, node state, system health, and metadata context.',
    ].join('\n'),
  },
] as const;
