import { describe, expect, test } from 'vitest';

import { DEFAULT_OPERATION_REGISTRY } from '../src/remnawave-api/registry.js';
import { validateFreeFormObjectOverlay } from '../src/remnawave-api/schema.js';

describe('remnawave_api schema metadata and validation', () => {
  test('describeOperation exposes curated schema metadata for users.create', () => {
    const operation = DEFAULT_OPERATION_REGISTRY.describeOperation('users', 'create');

    expect(operation).toMatchObject({
      domain: 'users',
      operation: 'create',
      schemaSummary: 'payload requires username:string and expireAt:date-time string',
      validationRulesSummary: [
        'payload must be an object',
        'only the documented fields are allowed',
        'payload.username is required and must be a string (3-36 chars).',
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
    const issues = DEFAULT_OPERATION_REGISTRY.get('users', 'create')?.validation.validatePayload({});

    expect(issues).toEqual(expect.arrayContaining([
      { field: 'payload.username', code: 'REQUIRED', message: 'payload.username is required.' },
      { field: 'payload.expireAt', code: 'REQUIRED', message: 'payload.expireAt is required.' },
    ]));
    expect(issues).toHaveLength(2);
  });

  test('rejects type mismatches with field-specific codes', () => {
    const issues = DEFAULT_OPERATION_REGISTRY.get('users', 'create')?.validation.validatePayload({
      username: 42,
      telegramId: 'abc',
      expireAt: 123,
    });

    expect(issues).toEqual(expect.arrayContaining([
      { field: 'payload.username', code: 'MIN_LENGTH', message: 'payload.username must be at least 3 characters long.' },
      { field: 'payload.expireAt', code: 'INVALID_FORMAT', message: 'payload.expireAt must match date-time format.' },
      { field: 'payload.telegramId', code: 'INVALID_TYPE', message: 'payload.telegramId must be integer.' },
    ]));
  });

  test('rejects bounds violations precisely', () => {
    const issues = DEFAULT_OPERATION_REGISTRY.get('users', 'create')?.validation.validatePayload({
      username: 'ab',
      telegramId: 0,
    });

    expect(issues).toEqual(expect.arrayContaining([
      { field: 'payload.username', code: 'MIN_LENGTH', message: 'payload.username must be at least 3 characters long.' },
      { field: 'payload.expireAt', code: 'REQUIRED', message: 'payload.expireAt is required.' },
    ]));
    expect(issues).toHaveLength(2);
  });

  test('rejects invalid OpenAPI create payloads before execution', () => {
    const issues = DEFAULT_OPERATION_REGISTRY.get('users', 'create')?.validation.validatePayload({
      username: 'ab',
    });

    expect(issues).toEqual(expect.arrayContaining([
      { field: 'payload.username', code: 'MIN_LENGTH', message: 'payload.username must be at least 3 characters long.' },
      { field: 'payload.expireAt', code: 'REQUIRED', message: 'payload.expireAt is required.' },
    ]));
    expect(issues).toHaveLength(2);
  });

  test('rejects strict-schema fields inherited from Object.prototype', () => {
    const issues = DEFAULT_OPERATION_REGISTRY.get('users', 'create')?.validation.validatePayload({
      username: 'bridge-operator',
      expireAt: '2026-05-01T00:00:00.000Z',
      constructor: 1,
    });

    expect(issues).toEqual(expect.arrayContaining([
      { field: 'payload.constructor', code: 'UNEXPECTED_FIELD', message: 'payload.constructor is not supported for this operation.' },
    ]));
  });

  test('accepts valid inventory-backed runtime payloads', () => {
    expect(DEFAULT_OPERATION_REGISTRY.get('users', 'create')?.validation.validatePayload({
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
    expect(DEFAULT_OPERATION_REGISTRY.get('users', 'resolve')?.validation.validatePayload({ uuid: 'user-1' })).toEqual([]);
  });

  test('rejects malformed users.resolve selector payloads', () => {
    expect(DEFAULT_OPERATION_REGISTRY.get('users', 'resolve')?.validation.validatePayload({ selector: { uuid: 'user-1' } })).toEqual([
      { field: 'payload.selector', code: 'UNEXPECTED_FIELD', message: 'payload.selector is not supported for this operation.' },
    ]);
    expect(DEFAULT_OPERATION_REGISTRY.get('users', 'resolve')?.validation.validatePayload({ uuid: 'user-1', username: 'alice' })).toEqual([
      { field: 'payload', code: 'INVALID_SELECTOR', message: 'payload must include exactly one of id, uuid, shortUuid, or username.' },
    ]);
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

  test('free-form object overlays require plain JSON objects', () => {
    expect(validateFreeFormObjectOverlay({ safe: true }, 'payload.metadata')).toEqual([]);
    expect(validateFreeFormObjectOverlay(Object.create(null), 'payload.metadata')).toEqual([
      { field: 'payload.metadata', code: 'INVALID_OBJECT', message: 'payload.metadata must be a plain JSON object.' },
    ]);
  });

  test('free-form object overlays reject prototype-related keys', () => {
    const payload = JSON.parse('{"nested":{"constructor":"blocked"}}') as Record<string, unknown>;

    expect(validateFreeFormObjectOverlay(payload, 'payload.metadata')).toEqual([
      {
        field: 'payload.metadata.nested.constructor',
        code: 'FORBIDDEN_KEY',
        message: 'payload.metadata.nested.constructor is not allowed in free-form object overlays.',
      },
    ]);
  });

  test('free-form object overlays enforce byte caps', () => {
    expect(validateFreeFormObjectOverlay({ value: 'x'.repeat(16_500) }, 'payload.metadata')).toEqual([
      {
        field: 'payload.metadata',
        code: 'BYTE_CAP_EXCEEDED',
        message: 'payload.metadata must be at most 16384 bytes when encoded as JSON.',
      },
    ]);
  });
});
