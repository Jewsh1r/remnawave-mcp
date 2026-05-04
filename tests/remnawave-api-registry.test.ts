import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test, vi } from 'vitest';

import {
  DEFAULT_OPERATION_REGISTRY,
  OperationRegistry,
  type OperationRegistration,
  type RegistryRiskTier,
} from '../src/remnawave-api/registry.js';

function createRegistration(overrides: Partial<OperationRegistration> = {}): OperationRegistration {
  const execute = vi.fn(async () => ({
    result: { ok: true },
  }));

  return {
    discovery: {
      domain: 'system',
      operation: 'get_stats',
      description: 'Return normalized panel statistics.',
      helpText: 'Use payload {} to read current system stats.',
    },
    validation: {
      payloadExample: {},
      validatePayload: () => [],
      schemaSummary: 'payload must be an empty object',
      validationSchema: {
        type: 'object',
        additionalProperties: false,
        required: [],
        properties: {},
      },
    },
    execution: {
      execute,
      clientMethod: 'getSystemStats',
      deferred: false,
    },
    risk: {
      tier: 'tier_1_read',
    },
    sideEffects: {
      summary: 'No side effects; reads normalized stats only.',
      asyncBehavior: 'synchronous',
    },
    disposition: 'supported',
    write: false,
    rawAllowed: false,
    normalizer: overrides.normalizer ?? 'none',
    responseMapper: overrides.responseMapper ?? ((value: unknown) => value),
    ...overrides,
    safetyMode: overrides.safetyMode ?? 'direct',
    openapi: overrides.openapi ?? {
      method: 'get',
      path: '/api/system/stats',
      operationId: 'SystemController_getStats',
      requestSchemaKey: null,
      responseSchemaKeys: [],
    },
  };
}

describe('OperationRegistry', () => {
  test('is deny-by-default for unknown domain and operation pairs', () => {
    const registry = new OperationRegistry();

    expect(registry.has('system', 'get_stats')).toBe(false);
    expect(registry.get('system', 'get_stats')).toBeUndefined();
    expect(registry.listDomains()).toEqual([]);
    expect(registry.listOperations('system')).toEqual([]);
    expect(registry.describeOperation('system', 'get_stats')).toBeNull();
  });

  test('registers operations and exposes their metadata for retrieval', () => {
    const registry = new OperationRegistry();
    const registration = createRegistration();

    registry.register('system', 'get_stats', registration);

    expect(registry.has('system', 'get_stats')).toBe(true);
    expect(registry.get('system', 'get_stats')).toMatchObject({
      discovery: {
        domain: 'system',
        operation: 'get_stats',
      },
      validation: {
        payloadExample: {},
        schemaSummary: 'payload must be an empty object',
        validationSchema: {
          type: 'object',
          additionalProperties: false,
          required: [],
          properties: {},
        },
      },
      execution: {
        clientMethod: 'getSystemStats',
        deferred: false,
      },
      risk: {
        tier: 'tier_1_read',
      },
      sideEffects: {
        asyncBehavior: 'synchronous',
      },
      disposition: 'supported',
      write: false,
    });
  });

  test('lists domains and operations in deterministic order', () => {
    const registry = new OperationRegistry();

    registry.register('users', 'create_user', createRegistration({
      discovery: {
        domain: 'users',
        operation: 'create_user',
        description: 'Create a new panel user.',
        helpText: 'Provide username and telegramId.',
      },
      validation: {
        payloadExample: { username: 'new-user', telegramId: 123456 },
        validatePayload: () => [],
        schemaSummary: 'payload requires username and telegramId',
        validationSchema: {
          type: 'object',
          additionalProperties: false,
          required: ['username', 'telegramId'],
          properties: {
            username: { type: 'string', required: true, minLength: 1, maxLength: 64 },
            telegramId: { type: 'integer', required: true, minimum: 1, maximum: 2147483647 },
          },
        },
      },
      execution: {
        execute: vi.fn(async () => ({ result: { created: true } })),
        clientMethod: 'createUser',
        deferred: false,
      },
      risk: { tier: 'tier_2_bounded_mutation' },
      sideEffects: {
        summary: 'Creates a single user record.',
        asyncBehavior: 'synchronous',
      },
      disposition: 'supported',
      write: true,
      rawAllowed: false,
    }));

    registry.register('system', 'get_stats', createRegistration());
    registry.register('system', 'get_health', createRegistration({
      discovery: {
        domain: 'system',
        operation: 'get_health',
        description: 'Return normalized Remnawave health diagnostics.',
        helpText: 'Deferred until a later single-tool read expansion.',
      },
      execution: {
        execute: vi.fn(async () => ({ result: { instances: [] } })),
        clientMethod: 'getSystemHealth',
        deferred: true,
      },
      disposition: 'deferred',
      risk: { tier: 'tier_1_read' },
      sideEffects: {
        summary: 'Read-only health diagnostics.',
        asyncBehavior: 'synchronous',
      },
    }));

    expect(registry.listDomains()).toEqual(['system', 'users']);
    expect(registry.listOperations('system').map((entry) => entry.discovery.operation)).toEqual([
      'get_health',
      'get_stats',
    ]);
    expect(registry.listOperations('users').map((entry) => entry.discovery.operation)).toEqual([
      'create_user',
    ]);
  });

  test('generates compact discovery output entirely from registry data', () => {
    const registry = new OperationRegistry();

    registry.register('system', 'get_stats', createRegistration());
    registry.register('system', 'get_health', createRegistration({
      discovery: {
        domain: 'system',
        operation: 'get_health',
        description: 'Return normalized Remnawave health diagnostics.',
        helpText: 'Deferred until later expansion.',
      },
      execution: {
        execute: vi.fn(async () => ({ result: { instances: [] } })),
        clientMethod: 'getSystemHealth',
        deferred: true,
      },
      disposition: 'deferred',
      risk: { tier: 'tier_1_read' },
      sideEffects: {
        summary: 'Read-only health diagnostics.',
        asyncBehavior: 'synchronous',
      },
    }));

    expect(registry.generateDiscovery()).toEqual([
      {
        domain: 'system',
        description: 'Panel diagnostics and summary reads.',
        operations: [
          {
            operation: 'get_health',
            disposition: 'deferred',
            description: 'Return normalized Remnawave health diagnostics.',
            helpText: 'Deferred until later expansion.',
            riskTier: 'tier_1_read',
            deferred: true,
          },
          {
            operation: 'get_stats',
            disposition: 'supported',
            description: 'Return normalized panel statistics.',
            helpText: 'Use payload {} to read current system stats.',
            riskTier: 'tier_1_read',
            deferred: false,
          },
        ],
      },
    ]);
  });

  test('produces compact describe-operation output without giant inline schemas', () => {
    const registry = new OperationRegistry();
    registry.register('users', 'create_user', createRegistration({
      discovery: {
        domain: 'users',
        operation: 'create_user',
        description: 'Create a user when the payload is complete and valid.',
        helpText: 'Provide username and telegramId; execution creates one user.',
      },
      validation: {
        payloadExample: { username: 'new-user', telegramId: 123456 },
        validatePayload: () => [],
        schemaSummary: 'payload requires username:string and telegramId:integer',
        validationSchema: {
          type: 'object',
          additionalProperties: false,
          required: ['username', 'telegramId'],
          properties: {
            username: { type: 'string', required: true, minLength: 1, maxLength: 64 },
            telegramId: { type: 'integer', required: true, minimum: 1, maximum: 2147483647 },
          },
        },
      },
      execution: {
        execute: vi.fn(async () => ({ result: { created: true } })),
        clientMethod: 'createUser',
        deferred: false,
      },
      risk: { tier: 'tier_2_bounded_mutation' },
      sideEffects: {
        summary: 'Creates a single user record in the panel.',
        asyncBehavior: 'synchronous',
      },
      disposition: 'supported',
      write: true,
    }));

    expect(registry.describeOperation('users', 'create_user')).toEqual({
      domain: 'users',
      operation: 'create_user',
      disposition: 'supported',
      description: 'Create a user when the payload is complete and valid.',
      helpText: 'Provide username and telegramId; execution creates one user.',
      write: true,
      rawAllowed: false,
      normalizer: 'none',
      safetyMode: 'direct',
      openapi: {
        method: 'get',
        path: '/api/system/stats',
        operationId: 'SystemController_getStats',
        requestSchemaKey: null,
        responseSchemaKeys: [],
      },
      riskTier: 'tier_2_bounded_mutation',
      deferred: false,
      schemaSummary: 'payload requires username:string and telegramId:integer',
      validationRulesSummary: [
        'payload must be an object',
        'only the documented fields are allowed',
        'payload.username is required and must be a string (1-64 chars).',
        'payload.telegramId is required and must be an integer (1-2147483647).',
      ],
      payloadExample: { username: 'new-user', telegramId: 123456 },
      sideEffects: {
        summary: 'Creates a single user record in the panel.',
        asyncBehavior: 'synchronous',
      },
      execution: {
        clientMethod: 'createUser',
      },
    });
  });

  test('rejects duplicate registrations and invalid domains or operations', () => {
    const registry = new OperationRegistry();

    registry.register('system', 'get_stats', createRegistration());

    expect(() => registry.register('system', 'get_stats', createRegistration())).toThrowError(
      'Operation already registered: system/get_stats.',
    );
    expect(() => registry.register('', 'get_stats', createRegistration())).toThrowError(
      'domain must be a non-empty string.',
    );
    expect(() => registry.register('system', '   ', createRegistration())).toThrowError(
      'operation must be a non-empty string.',
    );
  });

  test('answers what executes an operation, what risk tier it has, and whether it is deferred', () => {
    const registry = new OperationRegistry();
    const execute = vi.fn(async () => ({ result: { instances: [] } }));
    const riskTier: RegistryRiskTier = 'tier_1_read';

    registry.register('system', 'get_health', createRegistration({
      discovery: {
        domain: 'system',
        operation: 'get_health',
        description: 'Return normalized Remnawave health diagnostics.',
        helpText: 'Deferred until later expansion.',
      },
      execution: {
        execute,
        clientMethod: 'getSystemHealth',
        deferred: true,
      },
      risk: { tier: riskTier },
      disposition: 'deferred',
    }));

    const operation = registry.get('system', 'get_health');

    expect(operation?.execution.execute).toBe(execute);
    expect(operation?.execution.clientMethod).toBe('getSystemHealth');
    expect(operation?.risk.tier).toBe(riskTier);
    expect(operation?.execution.deferred).toBe(true);
  });

  test('default runtime registry exposes atomic inventory-backed operations only', () => {
    const scope = DEFAULT_OPERATION_REGISTRY.getScopeMap();

    expect(scope.supported).toEqual(expect.arrayContaining([
      'users.disable',
      'users.enable',
      'nodes.restart',
      'hosts.bulk_set_port',
    ]));
    expect(scope.supported).not.toContain('users.manage_lifecycle');
    expect(scope.supported).not.toContain('hosts.manage_routing');
    expect(scope.supported).not.toContain('nodes.manage_maintenance');
    expect(DEFAULT_OPERATION_REGISTRY.hasDomain('auth')).toBe(false);
    expect(DEFAULT_OPERATION_REGISTRY.hasDomain('ip_control')).toBe(false);
    expect(DEFAULT_OPERATION_REGISTRY.hasDomain('node_plugins')).toBe(false);
  });

  test('default registry construction does not use post-hoc legacy cleanup', () => {
    const source = readFileSync(resolve('src/remnawave-api/registry.ts'), 'utf8');
    const defaultFactory = source.match(/export function createDefaultOperationRegistry\(\): OperationRegistry \{[\s\S]*?\n\}/)?.[0] ?? '';

    expect(defaultFactory).toContain('registerRuntimeDomainOperations');
    expect(defaultFactory).not.toContain('keepOnlyOperations');
    expect(defaultFactory).not.toContain('manage_lifecycle');
    expect(defaultFactory).not.toContain('manage_routing');
    expect(defaultFactory).not.toContain("registerDomain(registry, 'auth'");
    expect(defaultFactory).not.toContain("registerDomain(registry, 'ip_control'");
    expect(defaultFactory).not.toContain("registerDomain(registry, 'node_plugins'");
  });
});
