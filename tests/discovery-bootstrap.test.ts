import { describe, expect, test } from 'vitest';

import { loadRuntimeConfig } from '../src/runtime/config.js';
import { RuntimeConfigError } from '../src/runtime/errors.js';
import {
  buildDiscoveryManifest,
  buildServerDefinition,
  listDiscoveryCapabilities,
  registerDiscoverySurface,
} from '../src/server/discovery.js';

describe('discovery bootstrap', () => {
  test('lists the exact stable-core discovery surface in deterministic order for the supported mode', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '2.7.3',
    });

    const manifest = buildDiscoveryManifest(config);

    expect(manifest.tools.map((tool) => tool.name)).toEqual([
      'users_list',
      'users_resolve',
      'nodes_list',
      'system_get_stats',
      'system_get_health',
      'subscriptions_list',
      'users_mutate_subscription',
      'users_mutate_squads',
      'advanced_get_metadata',
      'advanced_list_node_plugins',
      'advanced_get_bandwidth_stats',
      'advanced_get_hwid_inspection',
    ]);
    expect(manifest.resources.map((resource) => resource.uri)).toEqual([
      'remnawave://panel/statistics',
      'remnawave://nodes/status',
      'remnawave://system/health',
    ]);
    expect(manifest.prompts.map((prompt) => prompt.name)).toEqual([
      'operator_diagnostics',
      'user_resolution',
      'node_investigation',
      'traffic_interpretation',
      'plugin_investigation',
    ]);
  });

  test('returns the same ordered discovery surface across repeated builds and registration passes', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '2.7.3',
    });

    const firstManifest = buildDiscoveryManifest(config);
    const secondManifest = buildDiscoveryManifest(config);
    const firstServer = buildServerDefinition(config);
    const secondServer = buildServerDefinition(config);

    expect(secondManifest).toEqual(firstManifest);
    expect(listDiscoveryCapabilities(firstServer)).toEqual(listDiscoveryCapabilities(secondServer));
    expect(registerDiscoverySurface(firstServer)).toEqual(registerDiscoverySurface(firstServer));
  });

  test('fails fast when a capability would be advertised but version gating blocks it', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '3.0.0',
    });

    expect(() => buildDiscoveryManifest(config)).toThrowError(RuntimeConfigError);
    expect(() => buildServerDefinition(config)).toThrowError(
      expect.objectContaining({
        category: 'version',
        code: 'REMNAWAVE_VERSION_UNSUPPORTED',
      }),
    );
  });

  test('keeps deferred and dropped matrix capabilities out of discovery', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '2.7.3',
    });

    const surface = listDiscoveryCapabilities(buildServerDefinition(config));

    expect(surface.tools.map((tool) => tool.name)).not.toContain('hosts_list');
    expect(surface.tools.map((tool) => tool.name)).not.toContain('config_profiles_list');
    expect(surface.tools.map((tool) => tool.name)).not.toContain('inbounds_list');
    expect(surface.tools.map((tool) => tool.name)).not.toContain('squads_list');
    expect(surface.tools.map((tool) => tool.name)).not.toContain('subscription_page_configs_list');
    expect(surface.tools.map((tool) => tool.name)).not.toContain('ip_control_list');
    expect(surface.tools.map((tool) => tool.name)).not.toContain('bulk_actions_plan');
    expect(surface.tools.map((tool) => tool.name)).not.toContain('recap_get');
    expect(surface.resources.map((resource) => resource.uri)).not.toContain('remnawave://metadata');
  });
});
