import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  SELECTED_OPENAPI_OPERATIONS,
  UnsupportedSchemaError,
  extractOpenApiSnapshot,
  readOpenApiSnapshot,
} from '../scripts/extract-remnawave-openapi.js';
import { REMNAWAVE_OPENAPI_EXTRACT } from '../src/remnawave-api/generated/operations.js';
import { SUPPORTED_REMNAWAVE_OPERATIONS } from '../src/remnawave-api/domains/runtime-scope.js';

const vendoredSnapshotPath = resolve('src/remnawave-api/openapi/remnawave-openapi-3.2.3.json');
const sourceSnapshotPath = process.env.REMNAWAVE_OPENAPI_SOURCE_SNAPSHOT ?? resolve('__missing_openapi_source_snapshot__.json');

describe('Remnawave OpenAPI extraction', () => {
  const sourceSnapshotTest = existsSync(sourceSnapshotPath) ? test : test.skip;

  sourceSnapshotTest('vendors the pinned Remnawave 3.2.3 OpenAPI snapshot exactly', () => {
    expect(readFileSync(vendoredSnapshotPath, 'utf8')).toBe(readFileSync(sourceSnapshotPath, 'utf8'));
  });

  test('generated artifact matches deterministic extraction output', () => {
    const document = readOpenApiSnapshot(vendoredSnapshotPath);
    const extracted = extractOpenApiSnapshot(document);

    expect(extracted).toEqual(REMNAWAVE_OPENAPI_EXTRACT);
    expect(extracted.metadata).toMatchObject({
      openapi: '3.0.0',
      title: 'Remnawave API v3.2.3',
      version: '3.2.3',
      source: 'remnawave-openapi-3.2.3.json',
    });
    expect(extracted.operations.map((operation) => operation.key).sort()).toEqual(
      SUPPORTED_REMNAWAVE_OPERATIONS.map((operation) => operation.key).sort(),
    );
  });

  test('extracts all current supported Task 11 operation families', () => {
    const extractedByKey = new Map(REMNAWAVE_OPENAPI_EXTRACT.operations.map((operation) => [operation.key, operation]));

    expect([...extractedByKey.keys()].sort()).toEqual(SUPPORTED_REMNAWAVE_OPERATIONS.map((operation) => operation.key).sort());
    expect(extractedByKey.get('metadata.upsert_node')).toMatchObject({
      method: 'put',
      path: '/api/metadata/node/{uuid}',
      operationId: 'MetadataController_upsertNodeMetadata',
    });
    expect(extractedByKey.get('metadata.upsert_user')).toMatchObject({
      method: 'put',
      path: '/api/metadata/user/{userId}',
      operationId: 'MetadataController_upsertUserMetadata',
    });
    expect(extractedByKey.get('templates.create')).toMatchObject({ method: 'post', path: '/api/subscription-templates' });
    expect(extractedByKey.get('templates.delete')).toMatchObject({ method: 'delete', path: '/api/subscription-templates/{uuid}' });
    expect(extractedByKey.get('snippets.create')).toMatchObject({ method: 'post', path: '/api/snippets' });
    expect(extractedByKey.get('snippets.delete')).toMatchObject({ method: 'delete', path: '/api/snippets' });
    expect(extractedByKey.get('public_subscriptions.get_info')).toMatchObject({ method: 'get', path: '/api/sub/{shortUuid}/info' });
    expect(extractedByKey.get('public_subscriptions.get_by_client_type')).toMatchObject({ method: 'get', path: '/api/sub/{shortUuid}/{clientType}' });
    expect(extractedByKey.get('profiles.get_computed')).toMatchObject({ method: 'get', path: '/api/config-profiles/{uuid}/computed-config' });
    expect(extractedByKey.get('profiles.list_inbounds')).toMatchObject({ method: 'get', path: '/api/config-profiles/{uuid}/inbounds' });
    expect(extractedByKey.get('users.revoke_subscription')).toMatchObject({ method: 'post', path: '/api/users/{userId}/actions/revoke' });
  });

  test('extracts CreateUserBodyDto constraints without permissive fallbacks', () => {
    const createUser = REMNAWAVE_OPENAPI_EXTRACT.operations.find((operation) => operation.key === 'users.create');
    expect(createUser?.requestBody?.required).toBe(true);

    const schema = createUser?.requestBody?.schema;
    expect(schema).toMatchObject({
      type: 'object',
      required: ['expireAt', 'username'],
      properties: {
        username: {
          type: 'string',
          minLength: 3,
          maxLength: 36,
          pattern: '^[a-zA-Z0-9_-]+$',
        },
        expireAt: {
          type: 'string',
          format: 'date-time',
        },
        trafficLimitStrategy: {
          type: 'string',
          enum: ['NO_RESET', 'DAY', 'WEEK', 'MONTH', 'MONTH_ROLLING'],
        },
        activeInternalSquads: {
          type: 'array',
          items: {
            type: 'string',
            format: 'uuid',
          },
        },
        tag: {
          anyOf: [
            {
              type: 'string',
              maxLength: 16,
              pattern: '^[A-Z0-9_]+$',
            },
            { type: 'null' },
          ],
        },
        telegramId: {
          anyOf: [{ type: 'number' }, { type: 'null' }],
        },
        email: {
          anyOf: [{ type: 'string', format: 'email' }, { type: 'null' }],
        },
        externalSquadUuid: {
          anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }],
        },
      },
    });
  });

  test('extracts path parameters, query parameters, and response schemas', () => {
    const getById = REMNAWAVE_OPENAPI_EXTRACT.operations.find((operation) => operation.key === 'users.get');
    expect(getById?.parameters).toEqual([
      {
        in: 'path',
        name: 'userId',
        required: true,
        schema: { exclusiveMinimum: true, minimum: 0, type: 'number' },
      },
    ]);
    expect(getById?.responses['200'].schema).toMatchObject({
      type: 'object',
      properties: {
        response: {
          type: 'object',
          properties: expect.objectContaining({ id: { type: 'number' } }),
        },
      },
    });

    const listUsers = REMNAWAVE_OPENAPI_EXTRACT.operations.find((operation) => operation.key === 'users.list');
    expect(listUsers?.parameters.map((parameter) => parameter.name)).toEqual([
      'start',
      'size',
      'filters',
      'filterModes',
      'globalFilterMode',
      'sorting',
    ]);
    expect(listUsers?.responses['200'].schema).toMatchObject({
      type: 'object',
      properties: {
        response: {
          type: 'object',
          properties: expect.objectContaining({ total: { type: 'number' } }),
        },
      },
    });
  });

  test('fails when a selected operation references a missing path or mismatched operationId', () => {
    const document = readOpenApiSnapshot(vendoredSnapshotPath);
    const createUserSelection = SELECTED_OPENAPI_OPERATIONS.find((operation) => operation.key === 'users.create');

    expect(createUserSelection).toBeDefined();

    expect(() =>
      extractOpenApiSnapshot(document, [
        {
          key: 'missing.path',
          method: 'get',
          path: '/api/does-not-exist',
          operationId: 'MissingController_missing',
        },
      ]),
    ).toThrow('Selected OpenAPI path not found: GET /api/does-not-exist.');

    expect(() =>
      extractOpenApiSnapshot(document, [
        {
          ...createUserSelection!,
          operationId: 'UsersController_wrongOperation',
        },
      ]),
    ).toThrow('Selected OpenAPI operationId mismatch for POST /api/users');
  });

  test('fails loudly for unsupported schema constructs', () => {
    const document = structuredClone(readOpenApiSnapshot(vendoredSnapshotPath)) as Record<string, any>;
    document.components.schemas.CreateUserBodyDto.properties.username = {
      type: 'string',
      not: { enum: ['root'] },
    };

    expect(() => extractOpenApiSnapshot(document)).toThrow(UnsupportedSchemaError);
    expect(() => extractOpenApiSnapshot(document)).toThrow('Unsupported schema at requestBody.properties.username: not is not supported.');
  });
});
