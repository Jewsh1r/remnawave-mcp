import { describe, expect, test } from 'vitest';

import { REMNAWAVE_OPERATION_INVENTORY } from '../src/remnawave-api/generated/operation-inventory.js';
import { DEFAULT_OPERATION_REGISTRY } from '../src/remnawave-api/registry.js';



describe('Remnawave API response mappers', () => {
  test('every supported runtime operation has an inventory-backed normalizer and mapper', () => {
    const supportedInventory = REMNAWAVE_OPERATION_INVENTORY.operations.filter((operation) => operation.status === 'supported');

    expect([...DEFAULT_OPERATION_REGISTRY.getScopeMap().supported].sort()).toEqual(supportedInventory.map((operation) => operation.key).sort());

    for (const inventoryOperation of supportedInventory) {
      const registration = DEFAULT_OPERATION_REGISTRY.get(inventoryOperation.domain, inventoryOperation.operation);

      expect(registration?.normalizer).toBe(inventoryOperation.normalizer);
      expect(registration?.responseMapper).toEqual(expect.any(Function));
    }
  });

  test('describe exposes the active normalizer id for the operation contract', () => {
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('system', 'get_stats')).toMatchObject({ normalizer: 'system_stats' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('system', 'get_metadata')).toMatchObject({ normalizer: 'none' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('system', 'get_health')).toMatchObject({ normalizer: 'none' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('users', 'list')).toMatchObject({ normalizer: 'users_list' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('users', 'create')).toMatchObject({ normalizer: 'user' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('hosts', 'bulk_update')).toMatchObject({ normalizer: 'none' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('metadata', 'upsert_node')).toMatchObject({ normalizer: 'none' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('templates', 'create')).toMatchObject({ normalizer: 'none' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('public_subscriptions', 'get_info')).toMatchObject({ rawAllowed: false, normalizer: 'none' });
  });
});
