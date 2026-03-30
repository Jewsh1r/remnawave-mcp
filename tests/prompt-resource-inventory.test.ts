import { describe, expect, test } from 'vitest';

import { loadRuntimeConfig } from '../src/runtime/config.js';
import {
  ADVANCED_TOOL_DEFINITIONS,
  STABLE_RESOURCE_DEFINITIONS,
  STABLE_TOOL_DEFINITIONS,
  buildDiscoveryManifest,
} from '../src/server/discovery.js';
import { PROMPT_DEFINITIONS } from '../src/prompts/index.js';
import { RESOURCE_DEFINITIONS } from '../src/resources/index.js';

const SUPPORTED_TOOL_NAMES = new Set([
  ...STABLE_TOOL_DEFINITIONS.map((tool) => tool.name),
  ...ADVANCED_TOOL_DEFINITIONS.map((tool) => tool.name),
]);

const SUPPORTED_RESOURCE_URIS = new Set(STABLE_RESOURCE_DEFINITIONS.map((resource) => resource.uri));
const SUPPORTED_DOMAINS = new Set(['users', 'nodes', 'system', 'subscriptions', 'metadata', 'plugins', 'bandwidth', 'hwid']);
const STALE_TOOL_NAMES = [
  'hosts_list',
  'config_profiles_list',
  'inbounds_list',
  'squads_list',
  'subscription_page_configs_list',
  'ip_control_list',
  'bulk_actions_plan',
  'recap_get',
] as const;
const STALE_RESOURCE_URIS = ['remnawave://metadata', 'remnawave://hosts', 'remnawave://bandwidth/realtime'] as const;

describe('prompt and resource inventory', () => {
  test('advertises deterministic prompt and resource definitions that match discovery exactly', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '2.7.3',
    });

    const manifest = buildDiscoveryManifest(config);

    expect(RESOURCE_DEFINITIONS.map((resource) => resource.uri)).toEqual(manifest.resources.map((resource) => resource.uri));
    expect(PROMPT_DEFINITIONS.map((prompt) => prompt.name)).toEqual(manifest.prompts.map((prompt) => prompt.name));
    expect(RESOURCE_DEFINITIONS.map((resource) => resource.uri)).toEqual([
      'remnawave://panel/statistics',
      'remnawave://nodes/status',
      'remnawave://system/health',
    ]);
    expect(PROMPT_DEFINITIONS.map((prompt) => prompt.name)).toEqual([
      'operator_diagnostics',
      'user_resolution',
      'node_investigation',
      'traffic_interpretation',
      'plugin_investigation',
    ]);
  });

  test('keeps prompt workflows truthful by referencing only supported tools, resources, and domains', () => {
    for (const prompt of PROMPT_DEFINITIONS) {
      for (const toolName of prompt.workflow.toolNames) {
        expect(SUPPORTED_TOOL_NAMES.has(toolName)).toBe(true);
      }

      for (const resourceUri of prompt.workflow.resourceUris) {
        expect(SUPPORTED_RESOURCE_URIS.has(resourceUri)).toBe(true);
      }

      for (const domain of prompt.workflow.domains) {
        expect(SUPPORTED_DOMAINS.has(domain)).toBe(true);
      }

      const body = `${prompt.description}\n${prompt.body}`;
      for (const staleToolName of STALE_TOOL_NAMES) {
        expect(body).not.toContain(staleToolName);
      }
      for (const staleResourceUri of STALE_RESOURCE_URIS) {
        expect(body).not.toContain(staleResourceUri);
      }
    }
  });
});
