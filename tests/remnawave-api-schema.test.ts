import { describe, expect, test } from 'vitest';

import { DEFAULT_OPERATION_REGISTRY } from '../src/remnawave-api/registry.js';

describe('remnawave_api schema metadata and validation', () => {
  test('describeOperation exposes curated schema metadata for users.create_user', () => {
    const operation = DEFAULT_OPERATION_REGISTRY.describeOperation('users', 'create_user');

    expect(operation).toMatchObject({
      domain: 'users',
      operation: 'create_user',
      schemaSummary: 'payload requires username:string, telegramId:integer, and expireAt:string',
      validationRulesSummary: [
        'payload must be an object',
        'only the documented fields are allowed',
        'payload.username is required and must be a string (1-64 chars).',
        'payload.telegramId is required and must be an integer (1-2147483647).',
        'payload.expireAt is required and must be a string (min 1 chars).',
      ],
      payloadExample: {
        username: 'new-user',
        telegramId: 123456,
        expireAt: '2026-05-01T00:00:00.000Z',
      },
    });
    expect(operation).not.toHaveProperty('validationSchema');
  });

  test('describeOperation exposes empty-object schema metadata for system.get_stats', () => {
    const operation = DEFAULT_OPERATION_REGISTRY.describeOperation('system', 'get_stats');

    expect(operation).toMatchObject({
      domain: 'system',
      operation: 'get_stats',
      validationRulesSummary: [
        'payload is required',
        'payload must be an object',
        'payload must not include any fields',
      ],
    });
    expect(operation).not.toHaveProperty('validationSchema');
  });

  test('rejects missing required fields with field-specific codes', () => {
    const issues = DEFAULT_OPERATION_REGISTRY.get('users', 'create_user')?.validation.validatePayload({});

    expect(issues).toEqual([
      { field: 'payload.username', code: 'REQUIRED', message: 'payload.username is required.' },
      { field: 'payload.telegramId', code: 'REQUIRED', message: 'payload.telegramId is required.' },
      { field: 'payload.expireAt', code: 'REQUIRED', message: 'payload.expireAt is required.' },
    ]);
  });

  test('rejects type mismatches with field-specific codes', () => {
    const issues = DEFAULT_OPERATION_REGISTRY.get('users', 'create_user')?.validation.validatePayload({
      username: 42,
      telegramId: 'abc',
      expireAt: 123,
    });

    expect(issues).toEqual([
      { field: 'payload.username', code: 'INVALID_TYPE', message: 'payload.username must be a string.' },
      { field: 'payload.telegramId', code: 'INVALID_TYPE', message: 'payload.telegramId must be an integer.' },
      { field: 'payload.expireAt', code: 'INVALID_TYPE', message: 'payload.expireAt must be a string.' },
    ]);
  });

  test('rejects bounds violations precisely', () => {
    const issues = DEFAULT_OPERATION_REGISTRY.get('users', 'create_user')?.validation.validatePayload({
      username: '',
      telegramId: 0,
    });

    expect(issues).toEqual([
      { field: 'payload.username', code: 'MIN_LENGTH', message: 'payload.username must be at least 1 character long.' },
      { field: 'payload.telegramId', code: 'MIN_VALUE', message: 'payload.telegramId must be greater than or equal to 1.' },
      { field: 'payload.expireAt', code: 'REQUIRED', message: 'payload.expireAt is required.' },
    ]);
  });

  test('accepts valid inventory-backed runtime payloads', () => {
    expect(DEFAULT_OPERATION_REGISTRY.get('users', 'create_user')?.validation.validatePayload({
      username: 'bridge-operator',
      telegramId: 123456,
      expireAt: '2026-05-01T00:00:00.000Z',
    })).toEqual([]);
    expect(DEFAULT_OPERATION_REGISTRY.get('system', 'get_stats')?.validation.validatePayload({})).toEqual([]);
    expect(DEFAULT_OPERATION_REGISTRY.get('users', 'disable')?.validation.validatePayload({ uuid: 'user-1' })).toEqual([]);
    expect(DEFAULT_OPERATION_REGISTRY.get('users', 'enable')?.validation.validatePayload({ uuid: 'user-1' })).toEqual([]);
    expect(DEFAULT_OPERATION_REGISTRY.get('nodes', 'restart')?.validation.validatePayload({ uuid: 'node-1' })).toEqual([]);
    expect(DEFAULT_OPERATION_REGISTRY.get('hosts', 'bulk_set_port')?.validation.validatePayload({
      hostUuids: ['host-1'],
      port: 8443,
    })).toEqual([]);
  });

  test('rejects malformed atomic bulk host port payloads', () => {
    const issues = DEFAULT_OPERATION_REGISTRY.get('hosts', 'bulk_set_port')?.validation.validatePayload({
      hostUuids: [],
      port: 70000,
    });

    expect(issues).toEqual([
      { field: 'payload.hostUuids', code: 'MIN_ITEMS', message: 'payload.hostUuids must include at least 1 item.' },
      { field: 'payload.port', code: 'MAX_VALUE', message: 'payload.port must be less than or equal to 65535.' },
    ]);
  });
});
