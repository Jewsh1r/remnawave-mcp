import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  generateRemnawaveOperationInventory,
  readOperationInventoryOpenApi,
} from '../scripts/generate-remnawave-operation-inventory.js';
import { REMNAWAVE_OPERATION_INVENTORY } from '../src/remnawave-api/generated/operation-inventory.js';
import type { RemnawaveOperationContract } from '../src/remnawave-api/operation-contract.js';

const vendoredSnapshotPath = resolve('src/remnawave-api/openapi/remnawave-openapi-3.2.3.json');
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
      source: 'remnawave-openapi-3.2.3.json',
      title: 'Remnawave API v3.2.3',
      totalOperations: 191,
      version: '3.2.3',
    });
    expect(Object.keys(document.paths ?? {})).toHaveLength(147);
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

    const supportedKeys = supported.map((operation) => operation.key).sort();
    expect(supportedKeys).toEqual(expect.arrayContaining([
      'metadata.upsert_node',
      'templates.create',
      'templates.update',
      'templates.delete',
      'snippets.create',
      'snippets.update',
      'snippets.delete',
      'public_subscriptions.get_info',
      'public_subscriptions.get',
      'public_subscriptions.get_by_client_type',
      'profiles.list',
      'profiles.get',
      'profiles.get_computed',
      'profiles.list_inbounds',
      'users.revoke_subscription',
    ]));

    for (const operation of supported) {
      expect(operation.domain).toBeTruthy();
      expect(operation.operation).toBeTruthy();
      expect(operation.operation.startsWith('manage_')).toBe(false);
      expect(operation.openapi.method).toBeTruthy();
      expect(operation.openapi.path).toMatch(/^\//);
      expect(operation.openapi.operationId).toBeTruthy();
      if (!operation.key.startsWith('public_subscriptions.')) {
        expect(operation.openapi.responseSchemaKeys.length).toBeGreaterThan(0);
      }
      expect(typeof operation.write).toBe('boolean');
      expect(['direct', 'confirm', 'preview_apply']).toContain(operation.safetyMode);
      expect(['tier1', 'tier2', 'tier3']).toContain(operation.riskTier);
      expect(typeof operation.rawAllowed).toBe('boolean');
      expect(operation.rawPolicy).toBe(operation.rawAllowed ? 'raw_allowed' : 'raw_denied');
      expect(operation.normalizer).toBeTruthy();
      expect(operation.sideEffects.summary).toBeTruthy();
    }

    expect(supported.find((operation) => operation.key === 'users.create')).toMatchObject({
      openapi: {
        method: 'post',
        operationId: 'UsersController_createUser',
        path: '/api/users',
        requestSchemaKey: 'CreateUserBodyDto',
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
    expect(supported.find((operation) => operation.key === 'system.get_metadata')).toMatchObject({
      normalizer: 'none',
      openapi: { method: 'get', path: '/api/system/metadata', operationId: 'SystemController_getMetadata' },
      rawAllowed: true,
      write: false,
    });
    expect(supported.find((operation) => operation.key === 'system.get_health')).toMatchObject({
      openapi: { method: 'get', path: '/api/system/health', operationId: 'SystemController_getRemnawaveHealth' },
      rawAllowed: true,
      write: false,
    });
    expect(supported.find((operation) => operation.key === 'users.resolve')).toMatchObject({
      openapi: { method: 'post', path: '/api/users/resolve', operationId: 'UsersController_resolveUser' },
      riskTier: 'tier1',
      safetyMode: 'direct',
      write: false,
    });
    expect(supported.find((operation) => operation.key === 'hosts.bulk_update')).toMatchObject({
      openapi: { method: 'patch', path: '/api/hosts/bulk/update', requestSchemaKey: 'UpdateManyHostsBodyDto' },
      riskTier: 'tier3',
      safetyMode: 'preview_apply',
      write: true,
    });
    expect(supported.find((operation) => operation.key === 'metadata.upsert_node')).toMatchObject({
      openapi: { method: 'put', path: '/api/metadata/node/{uuid}', operationId: 'MetadataController_upsertNodeMetadata' },
      rawAllowed: false,
      safetyMode: 'direct',
      write: true,
    });
    expect(supported.find((operation) => operation.key === 'templates.delete')).toMatchObject({ safetyMode: 'confirm', write: true });
    expect(supported.find((operation) => operation.key === 'snippets.delete')).toMatchObject({ safetyMode: 'confirm', write: true });
    expect(supported.find((operation) => operation.key === 'public_subscriptions.get_info')).toMatchObject({ rawAllowed: false, write: false });
    expect(supported.find((operation) => operation.key === 'keygen.generate_node_secret')).toMatchObject({
      openapi: { method: 'get', path: '/api/keygen', operationId: 'KeygenController_generateKey' },
      rawAllowed: false,
      safetyMode: 'direct',
      write: false,
    });
    expect(supported.find((operation) => operation.key === 'system.generate_x25519_keypairs')).toMatchObject({
      openapi: { method: 'get', path: '/api/system/tools/x25519/generate', operationId: 'SystemController_getX25519Keypairs' },
      rawAllowed: false,
      safetyMode: 'direct',
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
    expect(excluded.find((operation) => operation.openapi.path === '/api/connections/drop')).toMatchObject({
      domain: 'connections',
      exclusionReason: 'excluded_connections',
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
    const excludedPaths = new Set(excluded.map((operation) => operation.openapi.path as string));
    expect(excludedPaths.has('/api/keygen')).toBe(false);
    expect(excludedPaths.has('/api/system/tools/x25519/generate')).toBe(false);
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
      'hosts.bulk_update',
    ]));
  });
});
