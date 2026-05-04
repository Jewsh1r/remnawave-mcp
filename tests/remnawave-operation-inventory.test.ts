import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  generateRemnawaveOperationInventory,
  readOperationInventoryOpenApi,
} from '../scripts/generate-remnawave-operation-inventory.js';
import { REMNAWAVE_OPERATION_INVENTORY } from '../src/remnawave-api/generated/operation-inventory.js';
import type { RemnawaveOperationContract } from '../src/remnawave-api/operation-contract.js';

const vendoredSnapshotPath = resolve('src/remnawave-api/openapi/remnawave-openapi-2.7.4.json');
const httpMethods = new Set(['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace']);

function operationCoordinate(operation: RemnawaveOperationContract): string {
  return `${operation.openapi.method.toUpperCase()} ${operation.openapi.path}`;
}

function enumerateOpenApiCoordinates(document: { readonly paths?: Record<string, Record<string, unknown>> }): readonly string[] {
  return Object.keys(document.paths ?? {})
    .sort()
    .flatMap((path) =>
      Object.keys(document.paths?.[path] ?? {})
        .filter((method) => httpMethods.has(method))
        .sort()
        .map((method) => `${method.toUpperCase()} ${path}`),
    );
}

describe('Remnawave operation inventory', () => {
  test('generated inventory matches deterministic OpenAPI classification output', () => {
    const document = readOperationInventoryOpenApi(vendoredSnapshotPath);
    const regenerated = generateRemnawaveOperationInventory(document);

    expect(REMNAWAVE_OPERATION_INVENTORY).toEqual(regenerated);
    expect(REMNAWAVE_OPERATION_INVENTORY.metadata).toEqual({
      generatedAt: 'static',
      openapi: '3.0.0',
      source: 'remnawave-openapi-2.7.4.json',
      title: 'Remnawave API v2.7.4',
      totalOperations: 185,
      version: '2.7.4',
    });
    expect(Object.keys(document.paths ?? {})).toHaveLength(141);
  });

  test('classifies every OpenAPI path and method exactly once', () => {
    const document = readOperationInventoryOpenApi(vendoredSnapshotPath);
    const openApiCoordinates = enumerateOpenApiCoordinates(document);
    const inventoryCoordinates = REMNAWAVE_OPERATION_INVENTORY.operations.map(operationCoordinate).sort();

    const inventoryKeys = REMNAWAVE_OPERATION_INVENTORY.operations.map((operation) => operation.key).sort();

    expect(inventoryCoordinates).toHaveLength(openApiCoordinates.length);
    expect(new Set(inventoryCoordinates).size).toBe(inventoryCoordinates.length);
    expect(new Set(inventoryKeys).size).toBe(inventoryKeys.length);
    expect(inventoryCoordinates).toEqual([...openApiCoordinates].sort());
    expect(REMNAWAVE_OPERATION_INVENTORY.operations.every((operation) => operation.status === 'supported' || operation.status === 'excluded')).toBe(
      true,
    );
  });

  test('requires complete atomic metadata for supported operations', () => {
    const supported = REMNAWAVE_OPERATION_INVENTORY.operations.filter((operation) => operation.status === 'supported');

    expect(supported.map((operation) => operation.key).sort()).toEqual([
      'hosts.bulk_set_port',
      'nodes.restart',
      'system.get_stats',
      'users.create_user',
      'users.disable',
      'users.enable',
      'users.get_by_uuid',
      'users.list',
    ]);

    for (const operation of supported) {
      expect(operation.domain).toBeTruthy();
      expect(operation.operation).toBeTruthy();
      expect(operation.operation.startsWith('manage_')).toBe(false);
      expect(operation.openapi.method).toBeTruthy();
      expect(operation.openapi.path).toMatch(/^\//);
      expect(operation.openapi.operationId).toBeTruthy();
      expect(operation.openapi.responseSchemaKeys.length).toBeGreaterThan(0);
      expect(typeof operation.write).toBe('boolean');
      expect(['direct', 'confirm', 'preview_apply']).toContain(operation.safetyMode);
      expect(['tier1', 'tier2', 'tier3']).toContain(operation.riskTier);
      expect(typeof operation.rawAllowed).toBe('boolean');
      expect(operation.rawPolicy).toBe(operation.rawAllowed ? 'raw_allowed' : 'raw_denied');
      expect(operation.normalizer).toBeTruthy();
      expect(operation.sideEffects.summary).toBeTruthy();
    }

    expect(supported.find((operation) => operation.key === 'users.create_user')).toMatchObject({
      openapi: {
        method: 'post',
        operationId: 'UsersController_createUser',
        path: '/api/users',
        requestSchemaKey: 'CreateUserRequestDto',
      },
      riskTier: 'tier2',
      safetyMode: 'direct',
      write: true,
    });
    expect(supported.find((operation) => operation.key === 'system.get_stats')).toMatchObject({
      normalizer: 'system_stats',
      rawAllowed: true,
      write: false,
    });
  });

  test('preserves machine-readable exclusion reasons without making excluded entries supported', () => {
    const excluded = REMNAWAVE_OPERATION_INVENTORY.operations.filter((operation) => operation.status === 'excluded');
    const supportedCoordinates = new Set(
      REMNAWAVE_OPERATION_INVENTORY.operations.filter((operation) => operation.status === 'supported').map(operationCoordinate),
    );

    expect(excluded.length).toBeGreaterThan(0);
    for (const operation of excluded) {
      expect(operation.exclusionReason).toBeTruthy();
      expect(supportedCoordinates.has(operationCoordinate(operation))).toBe(false);
      expect('safetyMode' in operation).toBe(false);
      expect('normalizer' in operation).toBe(false);
    }

    expect(excluded.find((operation) => operation.openapi.path === '/api/auth/login')).toMatchObject({
      domain: 'auth',
      exclusionReason: 'excluded_auth',
      status: 'excluded',
    });
    expect(excluded.find((operation) => operation.openapi.path === '/api/ip-control/fetch-users-ips/{nodeUuid}')).toMatchObject({
      domain: 'ip_control',
      exclusionReason: 'excluded_ip_control',
      status: 'excluded',
    });
    expect(excluded.find((operation) => operation.openapi.path === '/api/node-plugins')).toMatchObject({
      domain: 'node_plugins',
      exclusionReason: 'excluded_node_plugins',
      status: 'excluded',
    });
    expect(excluded.find((operation) => operation.openapi.path === '/api/remnawave-settings')).toMatchObject({
      exclusionReason: 'excluded_remnawave_settings',
      status: 'excluded',
    });
    expect(excluded.find((operation) => operation.openapi.path === '/api/keygen')).toMatchObject({
      exclusionReason: 'excluded_keygen',
      status: 'excluded',
    });
    expect(excluded.find((operation) => operation.openapi.path === '/api/system/tools/x25519/generate')).toMatchObject({
      exclusionReason: 'excluded_system_dangerous',
      status: 'excluded',
    });
  });

  test('does not classify old grouped manage operations as supported inventory capabilities', () => {
    const supportedKeys = REMNAWAVE_OPERATION_INVENTORY.operations
      .filter((operation) => operation.status === 'supported')
      .map((operation) => operation.key);

    expect(supportedKeys.every((key) => !key.split('.')[1]?.startsWith('manage_'))).toBe(true);
    expect(supportedKeys).not.toContain('users.manage_lifecycle');
    expect(supportedKeys).not.toContain('hosts.manage_routing');
    expect(supportedKeys).not.toContain('nodes.manage_maintenance');
    expect(supportedKeys).not.toContain('profiles.manage_lifecycle');
    expect(supportedKeys).toEqual(expect.arrayContaining([
      'users.disable',
      'users.enable',
      'nodes.restart',
      'hosts.bulk_set_port',
    ]));
  });
});
