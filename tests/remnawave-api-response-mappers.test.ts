import { describe, expect, test } from 'vitest';

import { REMNAWAVE_OPERATION_INVENTORY } from '../src/remnawave-api/generated/operation-inventory.js';
import { DEFAULT_OPERATION_REGISTRY } from '../src/remnawave-api/registry.js';

const expectedRuntimeNormalizers = new Map([
  ['system.get_stats', 'system_stats'],
  ['users.list', 'users_list'],
  ['users.create_user', 'user'],
  ['users.get_by_uuid', 'user'],
  ['users.disable', 'none'],
  ['users.enable', 'none'],
  ['nodes.restart', 'none'],
  ['hosts.bulk_set_port', 'none'],
]);

describe('Remnawave API response mappers', () => {
  test('every supported runtime operation has an inventory-backed normalizer and mapper', () => {
    const supportedInventory = REMNAWAVE_OPERATION_INVENTORY.operations.filter((operation) => operation.status === 'supported');

    expect([...DEFAULT_OPERATION_REGISTRY.getScopeMap().supported].sort()).toEqual([...expectedRuntimeNormalizers.keys()].sort());

    for (const inventoryOperation of supportedInventory) {
      const registration = DEFAULT_OPERATION_REGISTRY.get(inventoryOperation.domain, inventoryOperation.operation);

      expect(registration?.normalizer).toBe(inventoryOperation.normalizer);
      expect(registration?.normalizer).toBe(expectedRuntimeNormalizers.get(inventoryOperation.key));
      expect(registration?.responseMapper).toEqual(expect.any(Function));
    }
  });

  test('describe exposes the active normalizer id for the operation contract', () => {
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('system', 'get_stats')).toMatchObject({ normalizer: 'system_stats' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('users', 'list')).toMatchObject({ normalizer: 'users_list' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('users', 'create_user')).toMatchObject({ normalizer: 'user' });
    expect(DEFAULT_OPERATION_REGISTRY.describeOperation('hosts', 'bulk_set_port')).toMatchObject({ normalizer: 'none' });
  });
});
