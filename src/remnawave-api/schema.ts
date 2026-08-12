import { createRequire } from 'node:module';

import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv/dist/ajv.js';

import { REMNAWAVE_OPENAPI_EXTRACT } from './generated/operations.js';
import type { ValidationIssue } from './registry.js';

export type SchemaPrimitiveType = 'string' | 'integer' | 'boolean' | 'string_array' | 'record' | 'record_array';

export interface SchemaFieldDefinition {
  readonly type: SchemaPrimitiveType;
  readonly required: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minItems?: number;
  readonly itemMinLength?: number;
  readonly itemMaxLength?: number;
}

export interface OperationValidationSchema {
  readonly type: 'object';
  readonly additionalProperties: boolean;
  readonly required: readonly string[];
  readonly properties: Readonly<Record<string, SchemaFieldDefinition>>;
}

export interface OperationSchemaDefinition {
  readonly schemaSummary: string;
  readonly payloadExample: Record<string, unknown>;
  readonly validationSchema: OperationValidationSchema;
  readonly validatePayload: (payload: unknown) => readonly ValidationIssue[];
}

const FREE_FORM_OVERLAY_BYTE_CAP = 16_384;
const FORBIDDEN_OVERLAY_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const require = createRequire(import.meta.url);
const addFormats = require('ajv-formats') as (validator: Ajv) => Ajv;

type JsonSchema = Record<string, unknown>;

interface ExtractedPayloadValidator {
  readonly validate: ValidateFunction;
}

const ajv = new Ajv({
  allErrors: true,
  coerceTypes: true,
  strict: true,
  strictSchema: true,
  strictTypes: true,
  strictRequired: true,
});

addFormats(ajv);

const extractedPayloadValidators = new Map<string, ExtractedPayloadValidator | null>();

const EMPTY_OBJECT_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {},
};

const CREATE_USER_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['username', 'expireAt'],
  properties: {
    username: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 36,
    },
    telegramId: {
      type: 'integer',
      required: false,
      minimum: 1,
      maximum: 2147483647,
    },
    expireAt: {
      type: 'string',
      required: true,
      minLength: 1,
    },
  },
};

const NODE_INVESTIGATE_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['uuid', 'start', 'end'],
  properties: {
    uuid: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 128,
    },
    start: {
      type: 'integer',
      required: true,
      minimum: 0,
      maximum: 1000000000000000,
    },
    end: {
      type: 'integer',
      required: true,
      minimum: 0,
      maximum: 1000000000000000,
    },
  },
};

const RESOLVE_SELECTOR_PROPERTIES = {
  selector: {
    type: 'string',
    required: true,
  },
  reveal: {
    type: 'string',
    required: false,
  },
} as const satisfies Readonly<Record<string, SchemaFieldDefinition>>;

const USERS_RESOLVE_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {
    id: { type: 'integer', required: false, minimum: 1, maximum: 2147483647 },
    shortUuid: { type: 'string', required: false, minLength: 1, maxLength: 128 },
    username: { type: 'string', required: false, minLength: 1, maxLength: 128 },
  },
};

const SUBSCRIPTION_PAGE_PROPERTIES = {
  selector: {
    type: 'string',
    required: true,
  },
  reveal: {
    type: 'string',
    required: false,
  },
  includeRawKeys: {
    type: 'boolean',
    required: false,
  },
} as const satisfies Readonly<Record<string, SchemaFieldDefinition>>;

const TEMPLATE_INSPECT_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['uuid'],
  properties: {
    uuid: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 128,
    },
  },
};

const SUBSCRIPTION_PAGE_CONFIG_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['uuid'],
  properties: {
    uuid: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 128,
    },
    showConnectionKeys: {
      type: 'boolean',
      required: false,
    },
  },
};

const UUID_ONLY_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['uuid'],
  properties: {
    uuid: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 128,
    },
  },
};

const USER_ID_ONLY_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['userId'],
  properties: {
    userId: {
      type: 'integer',
      required: true,
      minimum: 1,
      maximum: Number.MAX_SAFE_INTEGER,
    },
  },
};


const METADATA_UPSERT_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: false, required: ['uuid', 'metadata'],
  properties: { uuid: { type: 'string', required: true, minLength: 1, maxLength: 128 }, metadata: { type: 'record', required: true } },
};
const USER_METADATA_UPSERT_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: false, required: ['userId', 'metadata'],
  properties: { userId: { type: 'integer', required: true, minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, metadata: { type: 'record', required: true } },
};
const TEMPLATE_CREATE_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: false, required: ['name', 'templateType'],
  properties: { name: { type: 'string', required: true, minLength: 2, maxLength: 255 }, templateType: { type: 'string', required: true, minLength: 1, maxLength: 64 } },
};
const TEMPLATE_UPDATE_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: false, required: ['uuid'],
  properties: { uuid: { type: 'string', required: true, minLength: 1, maxLength: 128 }, name: { type: 'string', required: false, minLength: 2, maxLength: 255 }, templateJson: { type: 'record', required: false }, encodedTemplateYaml: { type: 'string', required: false, minLength: 1 } },
};
const SNIPPET_WRITE_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: false, required: ['name', 'snippet'],
  properties: { name: { type: 'string', required: true, minLength: 2, maxLength: 255 }, snippet: { type: 'record_array', required: true, minItems: 1 } },
};
const NAME_ONLY_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: false, required: ['name'],
  properties: { name: { type: 'string', required: true, minLength: 2, maxLength: 255 } },
};
const SHORT_UUID_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: false, required: ['shortUuid'],
  properties: { shortUuid: { type: 'string', required: true, minLength: 1, maxLength: 128 } },
};
const USERNAME_ONLY_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: false, required: ['username'],
  properties: { username: { type: 'string', required: true, minLength: 1, maxLength: 128 } },
};
const WITH_DISABLED_HOSTS_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: false, required: ['shortUuid'],
  properties: { shortUuid: { type: 'string', required: true, minLength: 1, maxLength: 128 }, withDisabledHosts: { type: 'boolean', required: false } },
};
const SUBPAGE_CONFIG_READ_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: true, required: ['shortUuid'],
  properties: { shortUuid: { type: 'string', required: true, minLength: 1, maxLength: 128 } },
};
const PUBLIC_SUBSCRIPTION_CLIENT_TYPE_SCHEMA: OperationValidationSchema = {
  type: 'object', additionalProperties: false, required: ['shortUuid', 'clientType'],
  properties: { shortUuid: { type: 'string', required: true, minLength: 1, maxLength: 128 }, clientType: { type: 'string', required: true, minLength: 1, maxLength: 64 } },
};

const HOSTS_BULK_SET_PORT_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['hostUuids', 'port'],
  properties: {
    hostUuids: {
      type: 'string_array',
      required: true,
      minItems: 1,
      itemMinLength: 1,
      itemMaxLength: 128,
    },
    port: {
      type: 'integer',
      required: true,
      minimum: 1,
      maximum: 65535,
    },
  },
};

const SQUAD_BULK_USERS_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['uuid', 'userUuids'],
  properties: {
    uuid: { type: 'string', required: true, minLength: 1, maxLength: 128 },
    userUuids: { type: 'string_array', required: true, minItems: 1, itemMinLength: 1, itemMaxLength: 128 },
  },
};

const OPTIONAL_PAGINATION_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {
    size: {
      type: 'integer',
      required: false,
      minimum: 0,
      maximum: 1000,
    },
    start: {
      type: 'integer',
      required: false,
      minimum: 0,
      maximum: 1000000,
    },
  },
};

const SUBSCRIPTION_SETTINGS_PATCH_SCHEMA: OperationValidationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {
    responseRulesEnabled: {
      type: 'boolean',
      required: false,
    },
    defaultTemplateUuid: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 128,
    },
  },
};

export const SUPPORTED_OPERATION_SCHEMAS = {
  'system.get_stats': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'system.get_metadata': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'system.get_health': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'system.get_nodes_metrics': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'system.get_recap': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'system.get_request_history': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'system.get_bandwidth_stats': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'system.get_node_statistics': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'system.generate_x25519_keypairs': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'keygen.generate_node_secret': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),

  'metadata.get_node': createSchemaDefinition({ schemaSummary: 'payload requires uuid:string', payloadExample: { uuid: 'node-uuid' }, validationSchema: UUID_ONLY_SCHEMA }),
  'metadata.upsert_node': createSchemaDefinition({ schemaSummary: 'payload requires uuid:string and metadata:object', payloadExample: { uuid: 'node-uuid', metadata: { zone: 'edge' } }, validationSchema: METADATA_UPSERT_SCHEMA }),
  'metadata.get_user': createSchemaDefinition({ schemaSummary: 'payload requires userId:integer', payloadExample: { userId: 42 }, validationSchema: USER_ID_ONLY_SCHEMA }),
  'metadata.upsert_user': createSchemaDefinition({ schemaSummary: 'payload requires userId:integer and metadata:object', payloadExample: { userId: 42, metadata: { segment: 'partner' } }, validationSchema: USER_METADATA_UPSERT_SCHEMA }),
  'templates.list': createSchemaDefinition({ schemaSummary: 'payload must be an empty object', payloadExample: {}, validationSchema: EMPTY_OBJECT_SCHEMA }),
  'templates.get': createSchemaDefinition({ schemaSummary: 'payload requires uuid:string', payloadExample: { uuid: 'template-uuid' }, validationSchema: UUID_ONLY_SCHEMA }),
  'templates.create': createSchemaDefinition({ schemaSummary: 'payload requires name:string and templateType:string', payloadExample: { name: 'Default XRAY', templateType: 'XRAY_JSON' }, validationSchema: TEMPLATE_CREATE_SCHEMA }),
  'templates.update': createSchemaDefinition({ schemaSummary: 'payload requires uuid:string and optional name/templateJson/encodedTemplateYaml', payloadExample: { uuid: 'template-uuid', name: 'Updated XRAY' }, validationSchema: TEMPLATE_UPDATE_SCHEMA }),
  'templates.delete': createSchemaDefinition({ schemaSummary: 'payload requires uuid:string', payloadExample: { uuid: 'template-uuid' }, validationSchema: UUID_ONLY_SCHEMA }),
  'snippets.create': createSchemaDefinition({ schemaSummary: 'payload requires name:string and snippet:object[]', payloadExample: { name: 'headers', snippet: [{ key: 'value' }] }, validationSchema: SNIPPET_WRITE_SCHEMA }),
  'snippets.update': createSchemaDefinition({ schemaSummary: 'payload requires name:string and snippet:object[]', payloadExample: { name: 'headers', snippet: [{ key: 'updated' }] }, validationSchema: SNIPPET_WRITE_SCHEMA }),
  'snippets.delete': createSchemaDefinition({ schemaSummary: 'payload requires name:string', payloadExample: { name: 'headers' }, validationSchema: NAME_ONLY_SCHEMA }),
  'public_subscriptions.get_info': createSchemaDefinition({ schemaSummary: 'payload requires shortUuid:string', payloadExample: { shortUuid: 'abc123' }, validationSchema: SHORT_UUID_SCHEMA }),
  'public_subscriptions.get': createSchemaDefinition({ schemaSummary: 'payload requires shortUuid:string', payloadExample: { shortUuid: 'abc123' }, validationSchema: SHORT_UUID_SCHEMA }),
  'public_subscriptions.get_by_client_type': createSchemaDefinition({ schemaSummary: 'payload requires shortUuid:string and clientType:string', payloadExample: { shortUuid: 'abc123', clientType: 'singbox' }, validationSchema: PUBLIC_SUBSCRIPTION_CLIENT_TYPE_SCHEMA }),
  'profiles.get': createSchemaDefinition({ schemaSummary: 'payload requires uuid:string', payloadExample: { uuid: 'profile-uuid' }, validationSchema: UUID_ONLY_SCHEMA }),
  'profiles.get_computed': createSchemaDefinition({ schemaSummary: 'payload requires uuid:string', payloadExample: { uuid: 'profile-uuid' }, validationSchema: UUID_ONLY_SCHEMA }),
  'users.create': createSchemaDefinition({
    schemaSummary: 'payload requires username:string and expireAt:date-time string',
    payloadExample: {
      username: 'new-user',
      telegramId: 123456,
      expireAt: '2026-05-01T00:00:00.000Z',
    },
    validationSchema: CREATE_USER_SCHEMA,
  }),
  'users.list': createSchemaDefinition({
    schemaSummary: 'payload accepts optional size/start pagination',
    payloadExample: {},
    validationSchema: OPTIONAL_PAGINATION_SCHEMA,
  }),
  'users.get': createSchemaDefinition({
    schemaSummary: 'payload requires userId:integer',
    payloadExample: { userId: 42 },
    validationSchema: USER_ID_ONLY_SCHEMA,
  }),
  'users.get_subscription_request_history': createSchemaDefinition({
    schemaSummary: 'payload requires userId:integer',
    payloadExample: { userId: 42 },
    validationSchema: USER_ID_ONLY_SCHEMA,
  }),
  'users.revoke_subscription': createSchemaDefinition({
    schemaSummary: 'payload requires userId:integer',
    payloadExample: { userId: 42 },
    validationSchema: USER_ID_ONLY_SCHEMA,
  }),
  'users.disable': createSchemaDefinition({
    schemaSummary: 'payload requires userId:integer',
    payloadExample: { userId: 42 },
    validationSchema: USER_ID_ONLY_SCHEMA,
  }),
  'users.enable': createSchemaDefinition({
    schemaSummary: 'payload requires userId:integer',
    payloadExample: { userId: 42 },
    validationSchema: USER_ID_ONLY_SCHEMA,
  }),
  'users.resolve': createCustomSchemaDefinition({
    schemaSummary: 'payload requires exactly one of id, shortUuid, or username',
    payloadExample: {
      id: 42,
    },
    validationSchema: USERS_RESOLVE_SCHEMA,
    validatePayload: validateUsersResolvePayload,
  }),
  'users.inspect': createCustomSchemaDefinition({
    schemaSummary: 'payload requires selector with exactly one of uuid, shortUuid, username, or telegramId; optional reveal:"redacted"|"full"',
    payloadExample: {
      selector: { uuid: 'user-uuid' },
      reveal: 'redacted',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['selector'],
      properties: RESOLVE_SELECTOR_PROPERTIES,
    },
    validatePayload: validateSelectorPayload,
  }),
  'users.manage_lifecycle': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:update_settings|enable|disable|revoke_subscription|reset_traffic plus bounded single-user mutation fields',
    payloadExample: {
      action: 'disable',
      userUuid: 'user-uuid',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'userUuid'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 32,
        },
        userUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
        settings: {
          type: 'record',
          required: false,
        },
      },
    },
    validatePayload: validateUsersManageLifecyclePayload,
  }),
  'users.manage_devices': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:delete_device, userUuid:string, and hwid:string',
    payloadExample: {
      action: 'delete_device',
      userUuid: 'user-uuid',
      hwid: 'hwid-1',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'userUuid', 'hwid'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 32,
        },
        userUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
        hwid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 256,
        },
      },
    },
    validatePayload: validateUsersManageDevicesPayload,
  }),
  'subscriptions.list': createSchemaDefinition({
    schemaSummary: 'payload accepts optional size/start pagination',
    payloadExample: {},
    validationSchema: OPTIONAL_PAGINATION_SCHEMA,
  }),
  'subscriptions.get_by_username': createSchemaDefinition({ schemaSummary: 'payload requires username:string', payloadExample: { username: 'alice' }, validationSchema: USERNAME_ONLY_SCHEMA }),
  'subscriptions.get_by_short_uuid': createSchemaDefinition({ schemaSummary: 'payload requires shortUuid:string', payloadExample: { shortUuid: 'short-uuid' }, validationSchema: SHORT_UUID_SCHEMA }),
  'subscriptions.get_by_id': createSchemaDefinition({ schemaSummary: 'payload requires userId:integer', payloadExample: { userId: 42 }, validationSchema: USER_ID_ONLY_SCHEMA }),
  'subscriptions.get_raw_by_short_uuid': createSchemaDefinition({ schemaSummary: 'payload requires shortUuid:string and optional withDisabledHosts:boolean', payloadExample: { shortUuid: 'short-uuid', withDisabledHosts: false }, validationSchema: WITH_DISABLED_HOSTS_SCHEMA }),
  'subscriptions.get_subpage_config_by_short_uuid': createSchemaDefinition({ schemaSummary: 'payload requires shortUuid:string plus OpenAPI request-body fields when required by panel', payloadExample: { shortUuid: 'short-uuid' }, validationSchema: SUBPAGE_CONFIG_READ_SCHEMA }),
  'subscriptions.get_connection_keys_by_user_id': createSchemaDefinition({ schemaSummary: 'payload requires userId:integer', payloadExample: { userId: 42 }, validationSchema: USER_ID_ONLY_SCHEMA }),
  'subscription_request_history.list': createSchemaDefinition({
    schemaSummary: 'payload accepts optional size/start pagination',
    payloadExample: {},
    validationSchema: OPTIONAL_PAGINATION_SCHEMA,
  }),
  'subscription_request_history.get_stats': createSchemaDefinition({ schemaSummary: 'payload must be an empty object', payloadExample: {}, validationSchema: EMPTY_OBJECT_SCHEMA }),
  'subscriptions.inspect_support_context': createCustomSchemaDefinition({
    schemaSummary: 'payload requires selector with exactly one of uuid, shortUuid, username, or telegramId; optional reveal:"redacted"|"full"',
    payloadExample: {
      selector: { uuid: 'user-uuid' },
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['selector'],
      properties: RESOLVE_SELECTOR_PROPERTIES,
    },
    validatePayload: validateSelectorPayload,
  }),
  'subscriptions.inspect_page_delivery': createCustomSchemaDefinition({
    schemaSummary: 'payload requires selector with exactly one of uuid, shortUuid, username, or telegramId; optional reveal:"redacted"|"full" and includeRawKeys:boolean',
    payloadExample: {
      selector: { uuid: 'user-uuid' },
      reveal: 'full',
      includeRawKeys: true,
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['selector'],
      properties: SUBSCRIPTION_PAGE_PROPERTIES,
    },
    validatePayload: validateSubscriptionPagePayload,
  }),
  'subscriptions.inspect_global_settings': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'subscriptions.manage_global_settings': createCustomSchemaDefinition({
    schemaSummary: 'payload accepts only a compact bounded subscription-settings patch',
    payloadExample: {
      responseRulesEnabled: true,
      defaultTemplateUuid: 'template-1',
    },
    validationSchema: SUBSCRIPTION_SETTINGS_PATCH_SCHEMA,
    validatePayload: validateSubscriptionSettingsPatchPayload,
  }),
  'profiles.list': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'profiles.inspect': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'profile-1',
    },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'profiles.inspect_computed': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'profile-1',
    },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'profiles.list_inbounds': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'profile-1',
    },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'profiles.manage_lifecycle': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:create|update|delete and bounded single-profile mutation fields',
    payloadExample: {
      action: 'update',
      profileUuid: 'profile-uuid',
      patch: {
        name: 'Bridge Profile',
      },
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 16,
        },
        profileUuid: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 128,
        },
        patch: {
          type: 'record',
          required: false,
        },
        create: {
          type: 'record',
          required: false,
        },
      },
    },
    validatePayload: validateProfilesManageLifecyclePayload,
  }),
  'profiles.manage_inbounds': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:replace, profileUuid:string, and a bounded inbounds object array',
    payloadExample: {
      action: 'replace',
      profileUuid: 'profile-uuid',
      inbounds: [
        {
          uuid: 'inbound-1',
          tag: 'VLESS_MAIN',
          type: 'vless',
          network: 'tcp',
          security: 'reality',
          port: 443,
        },
      ],
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'profileUuid', 'inbounds'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 16,
        },
        profileUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
        inbounds: {
          type: 'record_array',
          required: true,
          minItems: 1,
        },
      },
    },
    validatePayload: validateProfilesManageInboundsPayload,
  }),
  'hosts.list': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'hosts.bulk_set_port': createSchemaDefinition({
    schemaSummary: 'payload requires hostUuids:string[] and port:integer',
    payloadExample: {
      hostUuids: ['host-uuid'],
      port: 443,
    },
    validationSchema: HOSTS_BULK_SET_PORT_SCHEMA,
  }),
  'hosts.inspect': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'host-1',
    },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'hosts.export_detailed': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'hosts.manage_lifecycle': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:create|update|delete|enable|disable and bounded single-host mutation fields',
    payloadExample: {
      action: 'update',
      hostUuid: 'host-uuid',
      patch: {
        remark: 'Bridge DE',
        isHidden: true,
      },
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 16,
        },
        hostUuid: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 128,
        },
        patch: {
          type: 'record',
          required: false,
        },
        create: {
          type: 'record',
          required: false,
        },
      },
    },
    validatePayload: validateHostManageLifecyclePayload,
  }),
  'hosts.manage_routing': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:set_inbound|set_port plus bounded single-host routing fields',
    payloadExample: {
      action: 'set_inbound',
      hostUuid: 'host-uuid',
      configProfileUuid: 'profile-uuid',
      configProfileInboundUuid: 'inbound-uuid',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'hostUuid'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 16,
        },
        hostUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
        configProfileUuid: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 128,
        },
        configProfileInboundUuid: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 128,
        },
        port: {
          type: 'integer',
          required: false,
          minimum: 1,
          maximum: 65535,
        },
      },
    },
    validatePayload: validateHostManageRoutingPayload,
  }),
  'hosts.manage_definition': createSchemaDefinition({
    schemaSummary: 'payload requires hostUuid:string and accepts optional bounded host patch fields',
    payloadExample: {
      hostUuid: 'host-uuid',
      remark: 'Bridge DE',
      isHidden: true,
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['hostUuid'],
      properties: {
        hostUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
        remark: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 256,
        },
        address: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 256,
        },
        port: {
          type: 'integer',
          required: false,
          minimum: 1,
          maximum: 65535,
        },
        isHidden: {
          type: 'boolean',
          required: false,
        },
        sni: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 256,
        },
        securityLayer: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 64,
        },
        fingerprint: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 64,
        },
      },
    },
  }),
  'internal_squads.list': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'internal_squads.inspect_access': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'squad-1',
    },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'internal_squads.manage_membership': createSchemaDefinition({
    schemaSummary: 'payload requires action:add_users|remove_users, squadUuid:string, and userUuids:string[]',
    payloadExample: {
      action: 'add_users',
      squadUuid: 'squad-uuid',
      userUuids: ['user-uuid'],
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'squadUuid', 'userUuids'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 32,
        },
        squadUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
        userUuids: {
          type: 'string_array',
          required: true,
          minItems: 1,
          itemMinLength: 1,
          itemMaxLength: 128,
        },
      },
    },
  }),
  'internal_squads.manage_definition': createSchemaDefinition({
    schemaSummary: 'payload requires squadUuid:string and accepts optional internal squad patch fields',
    payloadExample: {
      squadUuid: 'squad-uuid',
      name: 'Ops',
      inboundTags: ['VLESS_MAIN'],
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['squadUuid'],
      properties: {
        squadUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
        name: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 256,
        },
        inboundTags: {
          type: 'string_array',
          required: false,
          minItems: 1,
          itemMinLength: 1,
          itemMaxLength: 128,
        },
      },
    },
  }),
  'external_squads.list': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'external_squads.inspect_delivery': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'external-10',
    },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'external_squads.manage_definition': createSchemaDefinition({
    schemaSummary: 'payload requires squadUuid:string and accepts optional name:string, templateOverrides:object[], and settingsOverrides:object',
    payloadExample: {
      squadUuid: 'external-10',
      name: 'Iran Delivery Plus',
      templateOverrides: [
        {
          templateType: 'XRAY_JSON',
          templateName: 'tpl-xray-2',
        },
      ],
      settingsOverrides: {
        profileTitle: 'Iran Plus',
        randomizeHosts: false,
      },
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['squadUuid'],
      properties: {
        squadUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
        name: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 256,
        },
        templateOverrides: {
          type: 'record_array',
          required: false,
          minItems: 1,
        },
        settingsOverrides: {
          type: 'record',
          required: false,
        },
      },
    },
  }),
  'nodes.inspect': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'node-1',
    },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'nodes.investigate': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string, start:integer, and end:integer',
    payloadExample: {
      uuid: 'node-1',
      start: 0,
      end: 1700000000000,
    },
    validationSchema: NODE_INVESTIGATE_SCHEMA,
  }),
  'node_plugins.inspect': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'plugin-1',
    },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'node_plugins.manage_configuration': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:create|update|delete|reorder|clone and bounded plugin mutation fields',
    payloadExample: {
      action: 'update',
      pluginUuid: 'plugin-1',
      patch: {
        name: 'torrent-blocker-v2',
      },
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 16,
        },
        pluginUuid: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 128,
        },
        patch: {
          type: 'record',
          required: false,
        },
        create: {
          type: 'record',
          required: false,
        },
        orderedPluginUuids: {
          type: 'string_array',
          required: false,
          minItems: 1,
          itemMinLength: 1,
          itemMaxLength: 128,
        },
        sourcePluginUuid: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 128,
        },
      },
    },
    validatePayload: validateNodePluginsManageConfigurationPayload,
  }),
  'node_plugins.get_torrent_blocker_reports': createSchemaDefinition({
    schemaSummary: 'payload accepts optional size:integer and start:integer pagination fields',
    payloadExample: {
      size: 10,
      start: 0,
    },
    validationSchema: OPTIONAL_PAGINATION_SCHEMA,
  }),
  'node_plugins.get_torrent_blocker_stats': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'metadata.read_user': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'user-1',
    },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'metadata.read_node': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'node-1',
    },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'metadata.manage_user': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string and metadata:object',
    payloadExample: {
      uuid: 'user-1',
      metadata: {
        theme: 'dark',
      },
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['uuid', 'metadata'],
      properties: {
        uuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
        metadata: {
          type: 'record',
          required: true,
        },
      },
    },
  }),
  'external_squads.manage_membership': createSchemaDefinition({
    schemaSummary: 'payload requires action:add_users|remove_users, squadUuid:string, and userUuids:string[]',
    payloadExample: {
      action: 'add_users',
      squadUuid: 'external-squad',
      userUuids: ['user-uuid'],
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'squadUuid', 'userUuids'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 32,
        },
        squadUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
        userUuids: {
          type: 'string_array',
          required: true,
          minItems: 1,
          itemMinLength: 1,
          itemMaxLength: 128,
        },
      },
    },
  }),
  'nodes.manage_lifecycle': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:create|update|delete|enable|disable and bounded node mutation fields',
    payloadExample: {
      action: 'update',
      nodeUuid: 'node-1',
      patch: {
        name: 'nl-1-edge',
        address: 'nl-1.nodes.example.com',
      },
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 16,
        },
        nodeUuid: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 128,
        },
        patch: {
          type: 'record',
          required: false,
        },
        create: {
          type: 'record',
          required: false,
        },
      },
    },
    validatePayload: validateNodesManageLifecyclePayload,
  }),
  'nodes.manage_maintenance': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:restart|reset_traffic and nodeUuid:string',
    payloadExample: {
      action: 'restart',
      nodeUuid: 'node-1',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'nodeUuid'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 16,
        },
        nodeUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
      },
    },
    validatePayload: validateNodesManageMaintenancePayload,
  }),
  'nodes.list': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'nodes.restart': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: { uuid: 'node-uuid' },
    validationSchema: UUID_ONLY_SCHEMA,
  }),
  'node_plugins.list': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'infra_billing.list_providers': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'infra_billing.inspect_provider': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'provider-1',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['uuid'],
      properties: {
        uuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
      },
    },
  }),
  'infra_billing.manage_provider': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:create|update|delete and bounded provider mutation fields',
    payloadExample: {
      action: 'update',
      providerUuid: 'provider-1',
      patch: {
        name: 'Hetzner EU',
        enabled: true,
      },
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 16,
        },
        providerUuid: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 128,
        },
        patch: {
          type: 'record',
          required: false,
        },
        create: {
          type: 'record',
          required: false,
        },
      },
    },
    validatePayload: validateInfraBillingManageProviderPayload,
  }),
  'infra_billing.list_nodes': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'infra_billing.inspect_node': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'billing-node-1',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['uuid'],
      properties: {
        uuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
      },
    },
  }),
  'infra_billing.manage_node': createCustomSchemaDefinition({
    schemaSummary: 'payload requires action:create|update|delete and bounded billing-node mutation fields',
    payloadExample: {
      action: 'update',
      billingNodeUuid: 'billing-node-1',
      patch: {
        enabled: true,
        providerUuid: 'provider-1',
      },
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 16,
        },
        billingNodeUuid: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 128,
        },
        patch: {
          type: 'record',
          required: false,
        },
        create: {
          type: 'record',
          required: false,
        },
      },
    },
    validatePayload: validateInfraBillingManageNodePayload,
  }),
  'infra_billing.list_history': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
  'infra_billing.inspect_history': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'history-1',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['uuid'],
      properties: {
        uuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
      },
    },
  }),
  'ip_control.submit_user_fetch_job': createSchemaDefinition({
    schemaSummary: 'payload requires userUuid:string',
    payloadExample: {
      userUuid: 'user-1',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['userUuid'],
      properties: {
        userUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
      },
    },
  }),
  'ip_control.submit_node_fetch_job': createSchemaDefinition({
    schemaSummary: 'payload requires nodeUuid:string',
    payloadExample: {
      nodeUuid: 'node-1',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['nodeUuid'],
      properties: {
        nodeUuid: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
      },
    },
  }),
  'ip_control.inspect_job': createSchemaDefinition({
    schemaSummary: 'payload requires jobId:string',
    payloadExample: {
      jobId: 'job-user-1',
    },
    validationSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['jobId'],
      properties: {
        jobId: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 128,
        },
      },
    },
  }),
  'templates.inspect': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string',
    payloadExample: {
      uuid: 'template-1',
    },
    validationSchema: TEMPLATE_INSPECT_SCHEMA,
  }),
  'subscription_page.manage_configuration': createSchemaDefinition({
    schemaSummary: 'payload requires uuid:string and accepts optional showConnectionKeys:boolean',
    payloadExample: {
      uuid: 'config-1',
      showConnectionKeys: true,
    },
    validationSchema: SUBSCRIPTION_PAGE_CONFIG_SCHEMA,
  }),
  'snippets.list': createSchemaDefinition({
    schemaSummary: 'payload must be an empty object',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
  }),
} as const satisfies Readonly<Record<string, OperationSchemaDefinition>>;

export function getSupportedOperationSchema(domain: string, operation: string): OperationSchemaDefinition {
  const schema = SUPPORTED_OPERATION_SCHEMAS[`${domain}.${operation}` as keyof typeof SUPPORTED_OPERATION_SCHEMAS];
  if (schema === undefined) {
    return createGeneratedOperationSchemaDefinition(domain, operation);
  }

  return schema;
}

function createGeneratedOperationSchemaDefinition(domain: string, operation: string): OperationSchemaDefinition {
  const operationKey = `${domain}.${operation}`;
  const extracted = getExtractedPayloadValidator(operationKey);
  if (extracted === null) {
    throw new Error(`Unsupported schema lookup for ${operationKey}.`);
  }

  return {
    schemaSummary: 'payload is validated against the extracted OpenAPI operation contract',
    payloadExample: {},
    validationSchema: EMPTY_OBJECT_SCHEMA,
    validatePayload: (payload) => validateWithExtractedSchema(payload, extracted.validate) ?? [],
  };
}

function createSchemaDefinition(input: {
  readonly schemaSummary: string;
  readonly payloadExample: Record<string, unknown>;
  readonly validationSchema: OperationValidationSchema;
}): OperationSchemaDefinition {
  const operationKey = findOperationKeyBySchema(input.validationSchema);
  const extracted = operationKey === null ? null : getExtractedPayloadValidator(operationKey);

  return {
    schemaSummary: input.schemaSummary,
    payloadExample: input.payloadExample,
    validationSchema: input.validationSchema,
    validatePayload: (payload) => {
      const extractedIssues = extracted === null ? null : validateWithExtractedSchema(payload, extracted.validate);
      return extractedIssues ?? validateObjectPayload(payload, input.schemaSummary, input.validationSchema);
    },
  };
}

function createCustomSchemaDefinition(input: {
  readonly schemaSummary: string;
  readonly payloadExample: Record<string, unknown>;
  readonly validationSchema: OperationValidationSchema;
  readonly validatePayload: (payload: unknown) => readonly ValidationIssue[];
}): OperationSchemaDefinition {
  return {
    schemaSummary: input.schemaSummary,
    payloadExample: input.payloadExample,
    validationSchema: input.validationSchema,
    validatePayload: input.validatePayload,
  };
}

function validateObjectPayload(
  payload: unknown,
  schemaSummary: string,
  validationSchema: OperationValidationSchema,
): readonly ValidationIssue[] {
  if (payload === undefined) {
    return [
      {
        field: 'payload',
        code: 'PAYLOAD_REQUIRED',
        message: `payload is required; ${schemaSummary}.`,
      },
    ];
  }

  if (!isRecord(payload)) {
    return [
      {
        field: 'payload',
        code: 'INVALID_PAYLOAD',
        message: 'payload must be an object.',
      },
    ];
  }

  const issues: ValidationIssue[] = [];

  if (!validationSchema.additionalProperties) {
    for (const key of Object.keys(payload)) {
      if (!Object.hasOwn(validationSchema.properties, key)) {
        issues.push({
          field: `payload.${key}`,
          code: 'UNEXPECTED_FIELD',
          message: `payload.${key} is not supported for this operation.`,
        });
      }
    }
  }

  for (const [fieldName, fieldSchema] of Object.entries(validationSchema.properties)) {
    const fieldPath = `payload.${fieldName}`;
    const value = payload[fieldName];

    if (value === undefined) {
      if (fieldSchema.required) {
        issues.push({
          field: fieldPath,
          code: 'REQUIRED',
          message: `${fieldPath} is required.`,
        });
      }
      continue;
    }

    if (fieldSchema.type === 'string') {
      if (typeof value !== 'string') {
        issues.push({
          field: fieldPath,
          code: 'INVALID_TYPE',
          message: `${fieldPath} must be a string.`,
        });
        continue;
      }

      if (fieldSchema.minLength !== undefined && value.length < fieldSchema.minLength) {
        issues.push({
          field: fieldPath,
          code: 'MIN_LENGTH',
          message: `${fieldPath} must be at least ${fieldSchema.minLength} character long.`,
        });
      }

      if (fieldSchema.maxLength !== undefined && value.length > fieldSchema.maxLength) {
        issues.push({
          field: fieldPath,
          code: 'MAX_LENGTH',
          message: `${fieldPath} must be at most ${fieldSchema.maxLength} characters long.`,
        });
      }

      continue;
    }

    if (fieldSchema.type === 'integer') {
      if (!Number.isInteger(value)) {
        issues.push({
          field: fieldPath,
          code: 'INVALID_TYPE',
          message: `${fieldPath} must be an integer.`,
        });
        continue;
      }

      const integerValue = value as number;

      if (fieldSchema.minimum !== undefined && integerValue < fieldSchema.minimum) {
        issues.push({
          field: fieldPath,
          code: 'MIN_VALUE',
          message: `${fieldPath} must be greater than or equal to ${fieldSchema.minimum}.`,
        });
      }

      if (fieldSchema.maximum !== undefined && integerValue > fieldSchema.maximum) {
        issues.push({
          field: fieldPath,
          code: 'MAX_VALUE',
          message: `${fieldPath} must be less than or equal to ${fieldSchema.maximum}.`,
        });
      }

      continue;
    }

    if (fieldSchema.type === 'string_array') {
      if (!Array.isArray(value)) {
        issues.push({
          field: fieldPath,
          code: 'INVALID_TYPE',
          message: `${fieldPath} must be an array of strings.`,
        });
        continue;
      }

      if (fieldSchema.minItems !== undefined && value.length < fieldSchema.minItems) {
        issues.push({
          field: fieldPath,
          code: 'MIN_ITEMS',
          message: `${fieldPath} must include at least ${fieldSchema.minItems} item.`,
        });
      }

      for (const [index, entry] of value.entries()) {
        const itemPath = `${fieldPath}[${index}]`;
        if (typeof entry !== 'string') {
          issues.push({
            field: itemPath,
            code: 'INVALID_TYPE',
            message: `${itemPath} must be a string.`,
          });
          continue;
        }

        if (fieldSchema.itemMinLength !== undefined && entry.length < fieldSchema.itemMinLength) {
          issues.push({
            field: itemPath,
            code: 'MIN_LENGTH',
            message: `${itemPath} must be at least ${fieldSchema.itemMinLength} character long.`,
          });
        }

        if (fieldSchema.itemMaxLength !== undefined && entry.length > fieldSchema.itemMaxLength) {
          issues.push({
            field: itemPath,
            code: 'MAX_LENGTH',
            message: `${itemPath} must be at most ${fieldSchema.itemMaxLength} characters long.`,
          });
        }
      }

      continue;
    }

    if (fieldSchema.type === 'record') {
      if (!isRecord(value)) {
        issues.push({
          field: fieldPath,
          code: 'INVALID_TYPE',
          message: `${fieldPath} must be an object.`,
        });
      } else {
        issues.push(...validateFreeFormObjectOverlay(value, fieldPath));
      }
      continue;
    }

    if (fieldSchema.type === 'record_array') {
      if (!Array.isArray(value)) {
        issues.push({
          field: fieldPath,
          code: 'INVALID_TYPE',
          message: `${fieldPath} must be an array of objects.`,
        });
        continue;
      }

      if (fieldSchema.minItems !== undefined && value.length < fieldSchema.minItems) {
        issues.push({
          field: fieldPath,
          code: 'MIN_ITEMS',
          message: `${fieldPath} must include at least ${fieldSchema.minItems} item.`,
        });
      }

      for (const [index, entry] of value.entries()) {
        const itemPath = `${fieldPath}[${index}]`;
        if (!isRecord(entry)) {
          issues.push({
            field: itemPath,
            code: 'INVALID_TYPE',
            message: `${itemPath} must be an object.`,
          });
        } else {
          issues.push(...validateFreeFormObjectOverlay(entry, itemPath));
        }
      }

      continue;
    }

    if (typeof value !== 'boolean') {
      issues.push({
        field: fieldPath,
        code: 'INVALID_TYPE',
        message: `${fieldPath} must be a boolean.`,
      });
    }
  }

  return issues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateFreeFormObjectOverlay(value: unknown, fieldPath = 'payload'): readonly ValidationIssue[] {
  if (!isRecord(value)) {
    return [{
      field: fieldPath,
      code: 'INVALID_TYPE',
      message: `${fieldPath} must be an object.`,
    }];
  }

  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return [{
      field: fieldPath,
      code: 'INVALID_OBJECT',
      message: `${fieldPath} must be a plain JSON object.`,
    }];
  }

  const issues: ValidationIssue[] = [];
  collectForbiddenOverlayKeys(value, fieldPath, issues);

  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    issues.push({
      field: fieldPath,
      code: 'INVALID_JSON',
      message: `${fieldPath} must be JSON-serializable.`,
    });
  } else if (Buffer.byteLength(encoded, 'utf8') > FREE_FORM_OVERLAY_BYTE_CAP) {
    issues.push({
      field: fieldPath,
      code: 'BYTE_CAP_EXCEEDED',
      message: `${fieldPath} must be at most ${FREE_FORM_OVERLAY_BYTE_CAP} bytes when encoded as JSON.`,
    });
  }

  return issues;
}

function collectForbiddenOverlayKeys(value: unknown, fieldPath: string, issues: ValidationIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectForbiddenOverlayKeys(entry, `${fieldPath}[${index}]`, issues));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    const keyPath = `${fieldPath}.${key}`;
    if (FORBIDDEN_OVERLAY_KEYS.has(key)) {
      issues.push({
        field: keyPath,
        code: 'FORBIDDEN_KEY',
        message: `${keyPath} is not allowed in free-form object overlays.`,
      });
      continue;
    }

    collectForbiddenOverlayKeys(value[key], keyPath, issues);
  }
}

function findOperationKeyBySchema(schema: OperationValidationSchema): string | null {
  if (schema === CREATE_USER_SCHEMA) {
    return 'users.create';
  }
  if (schema === OPTIONAL_PAGINATION_SCHEMA) {
    return 'users.list';
  }
  if (schema === UUID_ONLY_SCHEMA) {
    return null;
  }
  if (schema === EMPTY_OBJECT_SCHEMA) {
    return null;
  }

  return null;
}

export function validateSquadBulkUsersPayload(payload: unknown): readonly ValidationIssue[] {
  return validateObjectPayload(payload, 'payload requires a squad uuid and one or more user UUIDs', SQUAD_BULK_USERS_SCHEMA);
}

function getExtractedPayloadValidator(operationKey: string): ExtractedPayloadValidator | null {
  if (extractedPayloadValidators.has(operationKey)) {
    return extractedPayloadValidators.get(operationKey) ?? null;
  }

  const schema = getExtractedPayloadSchema(operationKey);
  const validator = schema === null ? null : { validate: ajv.compile(schema) };
  extractedPayloadValidators.set(operationKey, validator);
  return validator;
}

function getExtractedPayloadSchema(operationKey: string): JsonSchema | null {
  const operation = REMNAWAVE_OPENAPI_EXTRACT.operations.find((entry) => entry.key === operationKey);
  if (operation === undefined) {
    return null;
  }

  if ('requestBody' in operation && operation.requestBody !== undefined) {
    return normalizeOpenApiSchema(operation.requestBody.schema as JsonSchema);
  }

  if (operation.parameters.length === 0) {
    return {
      type: 'object',
      additionalProperties: false,
      properties: {},
      required: [],
    };
  }

  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const parameter of operation.parameters) {
    properties[parameter.name] = normalizeOpenApiSchema(parameter.schema as JsonSchema);
    if (parameter.required) {
      required.push(parameter.name);
    }
  }

  return {
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  };
}

function normalizeOpenApiSchema(schema: JsonSchema): JsonSchema {
  const normalized: JsonSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'exclusiveMinimum' && value === false) {
      continue;
    }
    if (key === 'exclusiveMaximum' && value === false) {
      continue;
    }

    if (Array.isArray(value)) {
      normalized[key] = value.map((entry) => isRecord(entry) ? normalizeOpenApiSchema(entry) : entry);
      continue;
    }

    normalized[key] = isRecord(value) ? normalizeOpenApiSchema(value) : value;
  }

  if (schema.exclusiveMinimum === true && typeof schema.minimum === 'number') {
    normalized.exclusiveMinimum = schema.minimum;
    delete normalized.minimum;
  }
  if (schema.exclusiveMaximum === true && typeof schema.maximum === 'number') {
    normalized.exclusiveMaximum = schema.maximum;
    delete normalized.maximum;
  }

  return normalized;
}

function validateWithExtractedSchema(payload: unknown, validate: ValidateFunction): readonly ValidationIssue[] | null {
  if (payload === undefined) {
    return [{
      field: 'payload',
      code: 'PAYLOAD_REQUIRED',
      message: 'payload is required.',
    }];
  }

  if (isRecord(payload)) {
    const forbiddenTopLevelKeyIssues = Object.keys(payload)
      .filter((key) => FORBIDDEN_OVERLAY_KEYS.has(key))
      .map((key) => ({
        field: `payload.${key}`,
        code: 'UNEXPECTED_FIELD',
        message: `payload.${key} is not supported for this operation.`,
      }));
    if (forbiddenTopLevelKeyIssues.length > 0) {
      return forbiddenTopLevelKeyIssues;
    }
  }

  if (!validate(payload)) {
    return compactAjvErrors(validate.errors ?? []).map(toValidationIssue);
  }

  return [];
}

function compactAjvErrors(errors: readonly ErrorObject[]): readonly ErrorObject[] {
  const nonComposite = errors.filter((error) => error.keyword !== 'anyOf' && error.keyword !== 'oneOf' && error.keyword !== 'allOf');
  const hasNonNullTypeError = new Set(
    nonComposite
      .filter((error) => error.keyword === 'type' && 'type' in error.params && error.params.type !== 'null')
      .map((error) => error.instancePath),
  );

  return nonComposite.filter((error) => {
    if (error.keyword !== 'type' || !('type' in error.params)) {
      return true;
    }

    return error.params.type !== 'null' || !hasNonNullTypeError.has(error.instancePath);
  });
}

function toValidationIssue(error: ErrorObject): ValidationIssue {
  const field = toPayloadField(error);
  const code = toValidationCode(error.keyword);

  return {
    field,
    code,
    message: toValidationMessage(error, field),
  };
}

function toPayloadField(error: ErrorObject): string {
  if (error.keyword === 'required' && 'missingProperty' in error.params) {
    return `payload.${String(error.params.missingProperty)}`;
  }

  if (error.keyword === 'additionalProperties' && 'additionalProperty' in error.params) {
    return `payload.${String(error.params.additionalProperty)}`;
  }

  const path = error.instancePath
    .split('/')
    .filter((part) => part !== '')
    .map((part) => part.replace(/~1/gu, '/').replace(/~0/gu, '~'));

  return path.length === 0 ? 'payload' : `payload.${path.join('.')}`;
}

function toValidationCode(keyword: string): string {
  const codes: Readonly<Record<string, string>> = {
    required: 'REQUIRED',
    type: 'INVALID_TYPE',
    minLength: 'MIN_LENGTH',
    maxLength: 'MAX_LENGTH',
    minimum: 'MIN_VALUE',
    maximum: 'MAX_VALUE',
    pattern: 'INVALID_FORMAT',
    format: 'INVALID_FORMAT',
    enum: 'INVALID_VALUE',
    additionalProperties: 'UNEXPECTED_FIELD',
    minItems: 'MIN_ITEMS',
    maxItems: 'MAX_ITEMS',
  };

  return codes[keyword] ?? 'INVALID_VALUE';
}

function toValidationMessage(error: ErrorObject, field: string): string {
  if (error.keyword === 'required') {
    return `${field} is required.`;
  }
  if (error.keyword === 'additionalProperties') {
    return `${field} is not supported for this operation.`;
  }
  if (error.keyword === 'type' && 'type' in error.params) {
    return `${field} must be ${String(error.params.type)}.`;
  }
  if (error.keyword === 'minLength' && 'limit' in error.params) {
    return `${field} must be at least ${String(error.params.limit)} characters long.`;
  }
  if (error.keyword === 'maxLength' && 'limit' in error.params) {
    return `${field} must be at most ${String(error.params.limit)} characters long.`;
  }
  if (error.keyword === 'minimum' && 'limit' in error.params) {
    return `${field} must be greater than or equal to ${String(error.params.limit)}.`;
  }
  if (error.keyword === 'maximum' && 'limit' in error.params) {
    return `${field} must be less than or equal to ${String(error.params.limit)}.`;
  }
  if (error.keyword === 'minItems' && 'limit' in error.params) {
    return `${field} must include at least ${String(error.params.limit)} item.`;
  }
  if (error.keyword === 'maxItems' && 'limit' in error.params) {
    return `${field} must include at most ${String(error.params.limit)} items.`;
  }
  if (error.keyword === 'format' && 'format' in error.params) {
    return `${field} must match ${String(error.params.format)} format.`;
  }
  if (error.keyword === 'pattern') {
    return `${field} has an invalid format.`;
  }
  if (error.keyword === 'enum') {
    return `${field} has an unsupported value.`;
  }

  return `${field} is invalid.`;
}

function validateSelectorPayload(payload: unknown): readonly ValidationIssue[] {
  return validateSelectorBasedPayload(payload, false);
}

function validateUsersResolvePayload(payload: unknown): readonly ValidationIssue[] {
  const issues = validateObjectPayload(payload, 'payload requires exactly one of id, shortUuid, or username', USERS_RESOLVE_SCHEMA);
  if (issues.length > 0 || !isRecord(payload)) {
    return issues;
  }

  const selectors = ['id', 'shortUuid', 'username'].filter((key) => payload[key] !== undefined);
  if (selectors.length !== 1) {
    return [{
      field: 'payload',
      code: 'INVALID_SELECTOR',
      message: 'payload must include exactly one of id, shortUuid, or username.',
    }];
  }

  return [];
}

function validateLooseObjectPayload(payload: unknown): readonly ValidationIssue[] {
  if (payload === undefined) {
    return [{
      field: 'payload',
      code: 'PAYLOAD_REQUIRED',
      message: 'payload is required; send an object containing the settings fields to update.',
    }];
  }

  if (!isRecord(payload)) {
    return [{
      field: 'payload',
      code: 'INVALID_PAYLOAD',
      message: 'payload must be an object.',
    }];
  }

  return [];
}

function validateSubscriptionSettingsPatchPayload(payload: unknown): readonly ValidationIssue[] {
  const issues = validateObjectPayload(
    payload,
    'payload accepts only a compact bounded subscription-settings patch',
    SUBSCRIPTION_SETTINGS_PATCH_SCHEMA,
  );

  if (issues.length > 0 || !isRecord(payload)) {
    return issues;
  }

  if (Object.keys(payload).length === 0) {
    return [{
      field: 'payload',
      code: 'MIN_PROPERTIES',
      message: 'payload must include at least one supported subscription-settings field to update.',
    }];
  }

  return issues;
}

function validateUsersManageLifecyclePayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:update_settings|enable|disable|revoke_subscription|reset_traffic plus bounded single-user mutation fields',
    SUPPORTED_OPERATION_SCHEMAS['users.manage_lifecycle'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];
  const action = payload.action;

  if (
    action !== 'update_settings'
    && action !== 'enable'
    && action !== 'disable'
    && action !== 'revoke_subscription'
    && action !== 'reset_traffic'
  ) {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be one of "update_settings", "enable", "disable", "revoke_subscription", or "reset_traffic".',
    });
    return issues;
  }

  if (action === 'update_settings' && !isRecord(payload.settings)) {
    issues.push({
      field: 'payload.settings',
      code: 'REQUIRED',
      message: 'payload.settings is required for action=update_settings.',
    });
  }

  return issues;
}

function validateUsersManageDevicesPayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:delete_device, userUuid:string, and hwid:string',
    SUPPORTED_OPERATION_SCHEMAS['users.manage_devices'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];
  if (payload.action !== 'delete_device') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be "delete_device".',
    });
  }

  return issues;
}

function validateSubscriptionPagePayload(payload: unknown): readonly ValidationIssue[] {
  return validateSelectorBasedPayload(payload, true);
}

function validateSelectorBasedPayload(
  payload: unknown,
  allowIncludeRawKeys: boolean,
): readonly ValidationIssue[] {
  if (payload === undefined) {
    return [{
      field: 'payload',
      code: 'PAYLOAD_REQUIRED',
      message: 'payload is required; send an object containing selector and optional reveal controls.',
    }];
  }

  if (!isRecord(payload)) {
    return [{
      field: 'payload',
      code: 'INVALID_PAYLOAD',
      message: 'payload must be an object.',
    }];
  }

  const issues: ValidationIssue[] = [];
  const allowedKeys = allowIncludeRawKeys
    ? new Set(['selector', 'reveal', 'includeRawKeys'])
    : new Set(['selector', 'reveal']);

  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      issues.push({
        field: `payload.${key}`,
        code: 'UNEXPECTED_FIELD',
        message: `payload.${key} is not supported for this operation.`,
      });
    }
  }

  const selector = payload.selector;
  if (!isRecord(selector)) {
    issues.push({
      field: 'payload.selector',
      code: 'INVALID_SELECTOR',
      message: 'payload.selector must be an object.',
    });
  } else {
    const selectorKeys = ['uuid', 'shortUuid', 'username', 'telegramId'].filter((key) => selector[key] !== undefined);
    if (selectorKeys.length !== 1) {
      issues.push({
        field: 'payload.selector',
        code: 'INVALID_SELECTOR',
        message: 'payload.selector must provide exactly one of uuid, shortUuid, username, or telegramId.',
      });
    }

    if (selector.uuid !== undefined && !isNonEmptyString(selector.uuid)) {
      issues.push({
        field: 'payload.selector.uuid',
        code: 'INVALID_TYPE',
        message: 'payload.selector.uuid must be a non-empty string.',
      });
    }

    if (selector.shortUuid !== undefined && !isNonEmptyString(selector.shortUuid)) {
      issues.push({
        field: 'payload.selector.shortUuid',
        code: 'INVALID_TYPE',
        message: 'payload.selector.shortUuid must be a non-empty string.',
      });
    }

    if (selector.username !== undefined && !isNonEmptyString(selector.username)) {
      issues.push({
        field: 'payload.selector.username',
        code: 'INVALID_TYPE',
        message: 'payload.selector.username must be a non-empty string.',
      });
    }

    if (selector.telegramId !== undefined && !Number.isInteger(selector.telegramId)) {
      issues.push({
        field: 'payload.selector.telegramId',
        code: 'INVALID_TYPE',
        message: 'payload.selector.telegramId must be an integer.',
      });
    }
  }

  if (payload.reveal !== undefined && payload.reveal !== 'redacted' && payload.reveal !== 'full') {
    issues.push({
      field: 'payload.reveal',
      code: 'INVALID_VALUE',
      message: 'payload.reveal must be either "redacted" or "full".',
    });
  }

  if (allowIncludeRawKeys && payload.includeRawKeys !== undefined && typeof payload.includeRawKeys !== 'boolean') {
    issues.push({
      field: 'payload.includeRawKeys',
      code: 'INVALID_TYPE',
      message: 'payload.includeRawKeys must be a boolean.',
    });
  }

  return issues;
}

function validateInfraBillingManageProviderPayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:create|update|delete and bounded provider mutation fields',
    SUPPORTED_OPERATION_SCHEMAS['infra_billing.manage_provider'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];
  const action = payload.action;

  if (action !== 'create' && action !== 'update' && action !== 'delete') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be one of "create", "update", or "delete".',
    });
    return issues;
  }

  if (action === 'create') {
    if (!isRecord(payload.create)) {
      issues.push({
        field: 'payload.create',
        code: 'REQUIRED',
        message: 'payload.create is required for action=create.',
      });
    }

    return issues;
  }

  if (!isNonEmptyString(payload.providerUuid)) {
    issues.push({
      field: 'payload.providerUuid',
      code: 'REQUIRED',
      message: 'payload.providerUuid is required for action=update or action=delete.',
    });
  }

  if (action === 'update' && !isRecord(payload.patch)) {
    issues.push({
      field: 'payload.patch',
      code: 'REQUIRED',
      message: 'payload.patch is required for action=update.',
    });
  }

  return issues;
}

function validateInfraBillingManageNodePayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:create|update|delete and bounded billing-node mutation fields',
    SUPPORTED_OPERATION_SCHEMAS['infra_billing.manage_node'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];
  const action = payload.action;

  if (action !== 'create' && action !== 'update' && action !== 'delete') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be one of "create", "update", or "delete".',
    });
    return issues;
  }

  if (action === 'create') {
    if (!isRecord(payload.create)) {
      issues.push({
        field: 'payload.create',
        code: 'REQUIRED',
        message: 'payload.create is required for action=create.',
      });
    }

    return issues;
  }

  if (!isNonEmptyString(payload.billingNodeUuid)) {
    issues.push({
      field: 'payload.billingNodeUuid',
      code: 'REQUIRED',
      message: 'payload.billingNodeUuid is required for action=update or action=delete.',
    });
  }

  if (action === 'update' && !isRecord(payload.patch)) {
    issues.push({
      field: 'payload.patch',
      code: 'REQUIRED',
      message: 'payload.patch is required for action=update.',
    });
  }

  return issues;
}

function validateNodesManageLifecyclePayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:create|update|delete|enable|disable and bounded node mutation fields',
    SUPPORTED_OPERATION_SCHEMAS['nodes.manage_lifecycle'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];
  const action = payload.action;

  if (action !== 'create' && action !== 'update' && action !== 'delete' && action !== 'enable' && action !== 'disable') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be one of "create", "update", "delete", "enable", or "disable".',
    });
    return issues;
  }

  if (action === 'create') {
    if (!isRecord(payload.create)) {
      issues.push({
        field: 'payload.create',
        code: 'REQUIRED',
        message: 'payload.create is required for action=create.',
      });
    }
    return issues;
  }

  if (!isNonEmptyString(payload.nodeUuid)) {
    issues.push({
      field: 'payload.nodeUuid',
      code: 'REQUIRED',
      message: 'payload.nodeUuid is required for action=update, action=delete, action=enable, or action=disable.',
    });
  }

  if (action === 'update' && !isRecord(payload.patch)) {
    issues.push({
      field: 'payload.patch',
      code: 'REQUIRED',
      message: 'payload.patch is required for action=update.',
    });
  }

  return issues;
}

export function validateProfilesManageLifecyclePayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:create|update|delete and bounded single-profile mutation fields',
    SUPPORTED_OPERATION_SCHEMAS['profiles.manage_lifecycle'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];
  const action = payload.action;

  if (action !== 'create' && action !== 'update' && action !== 'delete') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be one of "create", "update", or "delete".',
    });
    return issues;
  }

  if (action === 'create') {
    if (!isRecord(payload.create)) {
      issues.push({
        field: 'payload.create',
        code: 'REQUIRED',
        message: 'payload.create is required for action=create.',
      });
    }
    return issues;
  }

  if (!isNonEmptyString(payload.profileUuid)) {
    issues.push({
      field: 'payload.profileUuid',
      code: 'REQUIRED',
      message: 'payload.profileUuid is required for action=update or action=delete.',
    });
  }

  if (action === 'update' && !isRecord(payload.patch)) {
    issues.push({
      field: 'payload.patch',
      code: 'REQUIRED',
      message: 'payload.patch is required for action=update.',
    });
  }

  return issues;
}

export function validateProfilesManageInboundsPayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:replace, profileUuid:string, and a bounded inbounds object array',
    SUPPORTED_OPERATION_SCHEMAS['profiles.manage_inbounds'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];

  if (payload.action !== 'replace') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be "replace".',
    });
  }

  if (!Array.isArray(payload.inbounds)) {
    return issues;
  }

  payload.inbounds.forEach((entry, index) => {
    const itemPath = `payload.inbounds[${index}]`;
    if (!isRecord(entry)) {
      issues.push({
        field: itemPath,
        code: 'INVALID_TYPE',
        message: `${itemPath} must be an object.`,
      });
      return;
    }

    const allowedKeys = new Set(['uuid', 'tag', 'type', 'network', 'security', 'port']);
    Object.keys(entry).forEach((key) => {
      if (!allowedKeys.has(key)) {
        issues.push({
          field: `${itemPath}.${key}`,
          code: 'UNEXPECTED_FIELD',
          message: `${itemPath}.${key} is not supported for this operation.`,
        });
      }
    });

    validateNestedInboundStringField(entry.uuid, `${itemPath}.uuid`, true, issues);
    validateNestedInboundStringField(entry.tag, `${itemPath}.tag`, true, issues);
    validateNestedInboundStringField(entry.type, `${itemPath}.type`, true, issues);
    validateNestedInboundStringField(entry.network, `${itemPath}.network`, false, issues);
    validateNestedInboundStringField(entry.security, `${itemPath}.security`, false, issues);

    if (entry.port !== undefined && entry.port !== null && !Number.isInteger(entry.port)) {
      issues.push({
        field: `${itemPath}.port`,
        code: 'INVALID_TYPE',
        message: `${itemPath}.port must be an integer.`,
      });
    }
  });

  return issues;
}

function validateNestedInboundStringField(
  value: unknown,
  fieldPath: string,
  required: boolean,
  issues: ValidationIssue[],
): void {
  if (value === undefined) {
    if (required) {
      issues.push({
        field: fieldPath,
        code: 'REQUIRED',
        message: `${fieldPath} is required.`,
      });
    }
    return;
  }

  if (value === null) {
    if (required) {
      issues.push({
        field: fieldPath,
        code: 'INVALID_TYPE',
        message: `${fieldPath} must be a string.`,
      });
    }
    return;
  }

  if (typeof value !== 'string') {
    issues.push({
      field: fieldPath,
      code: 'INVALID_TYPE',
      message: `${fieldPath} must be a string.`,
    });
    return;
  }

  if (value.length < 1) {
    issues.push({
      field: fieldPath,
      code: 'MIN_LENGTH',
      message: `${fieldPath} must be at least 1 character long.`,
    });
  }
}

function validateHostManageLifecyclePayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:create|update|delete|enable|disable and bounded single-host mutation fields',
    SUPPORTED_OPERATION_SCHEMAS['hosts.manage_lifecycle'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];
  const action = payload.action;

  if (action !== 'create' && action !== 'update' && action !== 'delete' && action !== 'enable' && action !== 'disable') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be one of "create", "update", "delete", "enable", or "disable".',
    });
    return issues;
  }

  if (action === 'create') {
    if (!isRecord(payload.create)) {
      issues.push({
        field: 'payload.create',
        code: 'REQUIRED',
        message: 'payload.create is required for action=create.',
      });
    }
    return issues;
  }

  if (!isNonEmptyString(payload.hostUuid)) {
    issues.push({
      field: 'payload.hostUuid',
      code: 'REQUIRED',
      message: 'payload.hostUuid is required for action=update, action=delete, action=enable, or action=disable.',
    });
  }

  if (action === 'update' && !isRecord(payload.patch)) {
    issues.push({
      field: 'payload.patch',
      code: 'REQUIRED',
      message: 'payload.patch is required for action=update.',
    });
  }

  return issues;
}

function validateHostManageRoutingPayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:set_inbound|set_port plus bounded single-host routing fields',
    SUPPORTED_OPERATION_SCHEMAS['hosts.manage_routing'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];
  const action = payload.action;

  if (action !== 'set_inbound' && action !== 'set_port') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be one of "set_inbound" or "set_port".',
    });
    return issues;
  }

  if (action === 'set_inbound') {
    if (!isNonEmptyString(payload.configProfileUuid)) {
      issues.push({
        field: 'payload.configProfileUuid',
        code: 'REQUIRED',
        message: 'payload.configProfileUuid is required for action=set_inbound.',
      });
    }

    if (!isNonEmptyString(payload.configProfileInboundUuid)) {
      issues.push({
        field: 'payload.configProfileInboundUuid',
        code: 'REQUIRED',
        message: 'payload.configProfileInboundUuid is required for action=set_inbound.',
      });
    }

    return issues;
  }

  if (!Number.isInteger(payload.port)) {
    issues.push({
      field: 'payload.port',
      code: payload.port === undefined ? 'REQUIRED' : 'INVALID_TYPE',
      message: payload.port === undefined
        ? 'payload.port is required for action=set_port.'
        : 'payload.port must be an integer.',
    });
  }

  return issues;
}

function validateNodesManageMaintenancePayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:restart|reset_traffic and nodeUuid:string',
    SUPPORTED_OPERATION_SCHEMAS['nodes.manage_maintenance'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];
  const action = payload.action;

  if (action !== 'restart' && action !== 'reset_traffic') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be one of "restart" or "reset_traffic".',
    });
  }

  return issues;
}

function validateNodePluginsManageConfigurationPayload(payload: unknown): readonly ValidationIssue[] {
  const baseIssues = validateObjectPayload(
    payload,
    'payload requires action:create|update|delete|reorder|clone and bounded plugin mutation fields',
    SUPPORTED_OPERATION_SCHEMAS['node_plugins.manage_configuration'].validationSchema,
  );

  if (baseIssues.length > 0 || !isRecord(payload)) {
    return baseIssues;
  }

  const issues: ValidationIssue[] = [...baseIssues];
  const action = payload.action;

  if (action !== 'create' && action !== 'update' && action !== 'delete' && action !== 'reorder' && action !== 'clone') {
    issues.push({
      field: 'payload.action',
      code: 'INVALID_VALUE',
      message: 'payload.action must be one of "create", "update", "delete", "reorder", or "clone".',
    });
    return issues;
  }

  if (action === 'create') {
    if (!isRecord(payload.create)) {
      issues.push({
        field: 'payload.create',
        code: 'REQUIRED',
        message: 'payload.create is required for action=create.',
      });
    }
    return issues;
  }

  if (action === 'update') {
    if (!isNonEmptyString(payload.pluginUuid)) {
      issues.push({
        field: 'payload.pluginUuid',
        code: 'REQUIRED',
        message: 'payload.pluginUuid is required for action=update.',
      });
    }
    if (!isRecord(payload.patch)) {
      issues.push({
        field: 'payload.patch',
        code: 'REQUIRED',
        message: 'payload.patch is required for action=update.',
      });
    }
    return issues;
  }

  if (action === 'delete') {
    if (!isNonEmptyString(payload.pluginUuid)) {
      issues.push({
        field: 'payload.pluginUuid',
        code: 'REQUIRED',
        message: 'payload.pluginUuid is required for action=delete.',
      });
    }
    return issues;
  }

  if (action === 'reorder') {
    if (!Array.isArray(payload.orderedPluginUuids) || payload.orderedPluginUuids.length === 0 || payload.orderedPluginUuids.some((entry) => !isNonEmptyString(entry))) {
      issues.push({
        field: 'payload.orderedPluginUuids',
        code: 'REQUIRED',
        message: 'payload.orderedPluginUuids is required for action=reorder and must be a non-empty string array.',
      });
    }
    return issues;
  }

  if (!isNonEmptyString(payload.sourcePluginUuid)) {
    issues.push({
      field: 'payload.sourcePluginUuid',
      code: 'REQUIRED',
      message: 'payload.sourcePluginUuid is required for action=clone.',
    });
  }

  return issues;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
