import { describe, expect, test } from 'vitest';

import { getRemnawaveApiScopeMap, listRemnawaveApiSupportedOperations } from '../src/remnawave-api/contract.js';
import { SUPPORTED_REMNAWAVE_OPERATIONS } from '../src/remnawave-api/domains/runtime-scope.js';

describe('remnawave_api scope sync', () => {
  test('implementation scope is sourced from supported generated inventory operations', () => {
    const implementation = getRemnawaveApiScopeMap();
    const inventoryKeys = SUPPORTED_REMNAWAVE_OPERATIONS.map((operation) => operation.key).sort();

    expect([...implementation.supported].sort()).toEqual(inventoryKeys);
    expect(implementation.deferred).toEqual([]);
    expect(implementation.denied).toEqual([]);
    expect(listRemnawaveApiSupportedOperations()).not.toHaveLength(0);
  });

  test('atomic operations replace grouped lifecycle and routing names', () => {
    const implementation = getRemnawaveApiScopeMap();

    expect(implementation.supported).toEqual(expect.arrayContaining([
      'system.get_metadata',
      'system.get_health',
      'system.get_bandwidth_stats',
      'system.get_node_statistics',
      'system.get_nodes_metrics',
      'system.get_recap',
      'keygen.generate_node_secret',
      'system.generate_x25519_keypairs',
      'users.disable',
      'users.enable',
      'nodes.restart',
      'hosts.bulk_set_port',
    ]));
    expect(implementation.supported).not.toContain('users.manage_lifecycle');
    expect(implementation.supported).not.toContain('hosts.manage_routing');
    expect(implementation.supported).not.toContain('nodes.manage_maintenance');
  });

  test('excluded domains and dangerous surfaces are absent from discovery scope', () => {
    const implementation = getRemnawaveApiScopeMap();
    const serialized = JSON.stringify(implementation);

    expect(Object.keys(implementation.domains)).toEqual(expect.arrayContaining(['keygen']));
    expect(Object.keys(implementation.domains)).not.toEqual(expect.arrayContaining(['auth', 'ip_control', 'node_plugins']));
    expect(serialized).not.toContain('remnawave-settings');
    expect(serialized).not.toContain('encrypt_happ_payload');
    expect(serialized).not.toContain('debug_srr_matcher');
  });
});
