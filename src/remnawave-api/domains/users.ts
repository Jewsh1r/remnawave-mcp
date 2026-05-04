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
      result: context.toUsersListResult(await context.requireClientMethod(client, 'getUsers', 'users.list')()),
    }),
  ));

  registry.register('users', 'create_user', context.supportedWriteOperation(
    'users',
    'create_user',
    'Create a user when the payload is complete and valid.',
    'Provide username, telegramId, and expireAt to create a single user.',
    'Generated OpenAPI-backed user creation.',
    { username: 'new-user', telegramId: 123456, expireAt: '2026-05-01T00:00:00.000Z' },
    'users_create_user',
    'createUser',
    context.validateCreateUserPayload,
    async (client, payload) => ({
      result: {
        created: await context.requireClientMethod(client, 'createUser', 'users.create_user')(payload),
      },
    }),
  ));

  registry.register('users', 'get_by_uuid', context.supportedReadOperation(
    'users',
    'get_by_uuid',
    'Read one user by UUID.',
    'Send payload with uuid to read one user by UUID.',
    'Generated OpenAPI-backed user entity read.',
    'users_get_by_uuid',
    'resolveUser',
    async (client, payload) => ({
      result: {
        user: context.toUsersResolveResponse(await context.requireClientMethod(client, 'resolveUser', 'users.get_by_uuid')(
          context.readUuidPayload(payload, 'users.get_by_uuid'),
        )),
      },
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
      result: {
        updated: await context.requireClientMethod(client, 'setUserState', 'users.disable')(
          context.readUuidPayload(payload, 'users.disable'),
          'disable',
        ),
      },
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
      result: {
        updated: await context.requireClientMethod(client, 'setUserState', 'users.enable')(
          context.readUuidPayload(payload, 'users.enable'),
          'enable',
        ),
      },
    }),
  ));
}
