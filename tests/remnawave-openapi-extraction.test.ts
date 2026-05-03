import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  SELECTED_OPENAPI_OPERATIONS,
  UnsupportedSchemaError,
  extractOpenApiSnapshot,
  readOpenApiSnapshot,
} from '../scripts/extract-remnawave-openapi.js';
import { REMNAWAVE_OPENAPI_EXTRACT } from '../src/remnawave-api/generated/operations.js';

const vendoredSnapshotPath = resolve('src/remnawave-api/openapi/remnawave-openapi-2.7.4.json');
const sourceSnapshotPath = '/Users/tyrell/Projects/redivo/redivo-proxy-bot/external_docs/remnawave-openapi-latest.json';

describe('Remnawave OpenAPI extraction', () => {
  test('vendors the pinned Remnawave 2.7.4 OpenAPI snapshot exactly', () => {
    expect(readFileSync(vendoredSnapshotPath, 'utf8')).toBe(readFileSync(sourceSnapshotPath, 'utf8'));
  });

  test('generated artifact matches deterministic extraction output', () => {
    const document = readOpenApiSnapshot(vendoredSnapshotPath);
    const extracted = extractOpenApiSnapshot(document);

    expect(extracted).toEqual(REMNAWAVE_OPENAPI_EXTRACT);
    expect(extracted.metadata).toMatchObject({
      openapi: '3.0.0',
      title: 'Remnawave API v2.7.4',
      version: '2.7.4',
      source: 'remnawave-openapi-2.7.4.json',
    });
    expect(extracted.operations.map((operation) => operation.key)).toEqual([
      'users.create_user',
      'users.list',
      'users.get_by_uuid',
      'system.get_stats',
    ]);
  });

  test('extracts CreateUserRequestDto constraints without permissive fallbacks', () => {
    const createUser = REMNAWAVE_OPENAPI_EXTRACT.operations.find((operation) => operation.key === 'users.create_user');
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
          anyOf: [{ type: 'integer' }, { type: 'null' }],
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
    const getByUuid = REMNAWAVE_OPENAPI_EXTRACT.operations.find((operation) => operation.key === 'users.get_by_uuid');
    expect(getByUuid?.parameters).toEqual([
      {
        description: 'UUID of the user',
        in: 'path',
        name: 'uuid',
        required: true,
        schema: { type: 'string' },
      },
    ]);
    expect(getByUuid?.responses['200'].schema).toMatchObject({
      type: 'object',
      properties: {
        response: {
          type: 'object',
          properties: expect.objectContaining({ uuid: { format: 'uuid', type: 'string' } }),
        },
      },
    });

    const listUsers = REMNAWAVE_OPENAPI_EXTRACT.operations.find((operation) => operation.key === 'users.list');
    expect(listUsers?.parameters).toEqual([
      {
        description: 'Page size for pagination',
        in: 'query',
        name: 'size',
        required: false,
        schema: { type: 'number' },
      },
      {
        description: 'Offset for pagination',
        in: 'query',
        name: 'start',
        required: false,
        schema: { type: 'number' },
      },
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
          ...SELECTED_OPENAPI_OPERATIONS[0],
          operationId: 'UsersController_wrongOperation',
        },
      ]),
    ).toThrow('Selected OpenAPI operationId mismatch for POST /api/users');
  });

  test('fails loudly for unsupported schema constructs', () => {
    const document = structuredClone(readOpenApiSnapshot(vendoredSnapshotPath)) as Record<string, any>;
    document.components.schemas.CreateUserRequestDto.properties.username = {
      type: 'string',
      not: { enum: ['root'] },
    };

    expect(() => extractOpenApiSnapshot(document)).toThrow(UnsupportedSchemaError);
    expect(() => extractOpenApiSnapshot(document)).toThrow('Unsupported schema at requestBody.properties.username: not is not supported.');
  });
});
