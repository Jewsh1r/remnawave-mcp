import { getSupportedOperationSchema } from '../schema.js';
import type { OperationRegistry, RuntimeOperationFactoryContext } from '../registry.js';

export function registerUserOperations(
  registry: OperationRegistry,
  context: RuntimeOperationFactoryContext,
): void {
  registry.register('users', 'list', context.supportedReadOperation(
    'users',
    'list',
    'List users from the panel-backed user surface.',
    'Send payload {} to list current users.',
    'Generated OpenAPI-backed users collection read.',
    'users_list',
    'getUsers',
    async (client) => ({
      result: await context.requireClientMethod(client, 'getUsers', 'users.list')(),
    }),
  ));

  registry.register('users', 'create', context.supportedWriteOperation(
    'users',
    'create',
    'Create a user when the payload is complete and valid.',
    'Provide username, telegramId, and expireAt to create a single user.',
    'Generated OpenAPI-backed user creation.',
    { username: 'new-user', telegramId: 123456, expireAt: '2026-05-01T00:00:00.000Z' },
    'users_create',
    'createUser',
    context.validateCreateUserPayload,
    async (client, payload) => ({
      result: await context.requireClientMethod(client, 'createUser', 'users.create')(payload),
    }),
  ));

  registry.register('users', 'get', context.supportedReadOperation(
    'users',
    'get',
    'Read one user by UUID.',
    'Send payload with uuid to read one user by UUID.',
    'Generated OpenAPI-backed user entity read.',
    'users_get',
    'resolveUser',
    async (client, payload) => ({
      result: await context.requireClientMethod(client, 'resolveUser', 'users.get')(
        context.readUuidPayload(payload, 'users.get'),
      ),
    }),
  ));


  registry.register('users', 'get_subscription_request_history', context.supportedReadOperation(
    'users',
    'get_subscription_request_history',
    'Read one user subscription request-history trail.',
    'Send payload with uuid to read one user subscription request-history trail.',
    'Generated OpenAPI-backed user subscription request-history read.',
    'users_get_subscription_request_history',
    'getUserSubscriptionRequestHistory',
    async (client, payload) => ({
      result: await context.requireClientMethod(client, 'getUserSubscriptionRequestHistory', 'users.get_subscription_request_history')(
        context.readUuidPayload(payload, 'users.get_subscription_request_history'),
      ),
    }),
  ));

  registry.register('users', 'revoke_subscription', context.supportedWriteOperation(
    'users',
    'revoke_subscription',
    'Revoke one user subscription credentials.',
    'Send payload with uuid to revoke one user subscription credentials after confirmation.',
    'Atomic OpenAPI-backed user subscription revoke action.',
    { uuid: 'user-uuid' },
    'users_revoke_subscription',
    'revokeUserSubscription',
    (payload) => getSupportedOperationSchema('users', 'revoke_subscription').validatePayload(payload),
    async (client, payload) => ({
      result: await context.requireClientMethod(client, 'revokeUserSubscription', 'users.revoke_subscription')(
        context.readUuidPayload(payload, 'users.revoke_subscription'),
      ),
    }),
  ));

  registry.register('users', 'disable', context.supportedWriteOperation(
    'users',
    'disable',
    'Disable one user.',
    'Send payload with uuid to disable one user.',
    'Atomic OpenAPI-backed user disable action.',
    { uuid: 'user-uuid' },
    'users_disable',
    'setUserState',
    context.validateUsersDisablePayload,
    async (client, payload) => ({
      result: await context.requireClientMethod(client, 'setUserState', 'users.disable')(
        context.readUuidPayload(payload, 'users.disable'),
        'disable',
      ),
    }),
  ));

  registry.register('users', 'enable', context.supportedWriteOperation(
    'users',
    'enable',
    'Enable one user.',
    'Send payload with uuid to enable one user.',
    'Atomic OpenAPI-backed user enable action.',
    { uuid: 'user-uuid' },
    'users_enable',
    'setUserState',
    context.validateUsersEnablePayload,
    async (client, payload) => ({
      result: await context.requireClientMethod(client, 'setUserState', 'users.enable')(
        context.readUuidPayload(payload, 'users.enable'),
        'enable',
      ),
    }),
  ));
}
