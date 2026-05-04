import type { RemnawaveApiClient } from './registry.js';

export interface AtomicRuntimeClient {
  readonly getSystemStats: () => Promise<unknown>;
  readonly getUsers: () => Promise<unknown>;
  readonly resolveUser: (uuid: string) => Promise<unknown>;
  readonly createUser: (payload: Record<string, unknown>) => Promise<unknown>;
  readonly setUserState: (
    userUuid: string,
    action: 'enable' | 'disable' | 'reset-traffic',
    body?: Record<string, unknown>,
  ) => Promise<unknown>;
  readonly restartNode: (nodeUuid: string) => Promise<unknown>;
  readonly getHosts: () => Promise<unknown>;
  readonly bulkSetHostPort: (hostUuids: readonly string[], port: number) => Promise<unknown>;
}

export function createRemnawaveApiClientAdapter(remnawaveClient: AtomicRuntimeClient): RemnawaveApiClient {
  return {
    getSystemStats: () => remnawaveClient.getSystemStats(),
    getUsers: () => remnawaveClient.getUsers(),
    resolveUser: (uuid: string) => remnawaveClient.resolveUser(uuid),
    createUser: (payload: Record<string, unknown>) => remnawaveClient.createUser(payload),
    setUserState: (
      userUuid: string,
      action: 'enable' | 'disable' | 'reset-traffic',
      body?: Record<string, unknown>,
    ) => remnawaveClient.setUserState(userUuid, action, body),
    restartNode: (nodeUuid: string) => remnawaveClient.restartNode(nodeUuid),
    getHosts: () => remnawaveClient.getHosts(),
    bulkSetHostPort: (hostUuids: readonly string[], port: number) => remnawaveClient.bulkSetHostPort(hostUuids, port),
  };
}
