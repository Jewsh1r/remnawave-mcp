import { describe, expect, test, vi } from 'vitest';

import { RemnawaveApiError } from '../src/client/index.js';
import { createStableCoreTools } from '../src/tools/index.js';

describe('stable core mutation tools', () => {
  test('preview mode returns intended actions and does not mutate remote state', async () => {
    const patchUserSettings = vi.fn(async () => ({}));
    const stableCore = createStableCoreTools({
      client: {
        getUsers: async () => ({ total: 0, items: [] }),
        resolveUser: async () => ({ found: false, match: null }),
        getNodes: async () => ({ items: [] }),
        getSystemStats: async () => ({
          cpu: { cores: 0 },
          memory: { totalBytes: 0, freeBytes: 0, usedBytes: 0 },
          uptimeSeconds: 0,
          generatedAtUnixMs: 0,
          users: { total: 0, active: 0, disabled: 0, limited: 0, expired: 0 },
          online: { now: 0, lastDay: 0, lastWeek: 0, never: 0 },
          nodes: { totalOnlineUsers: 0, lifetimeBytes: 0n },
        }),
        getSystemHealth: async () => ({ instances: [] }),
        getSubscriptions: async () => ({ items: [] }),
        patchUserSettings,
      },
    });

    const result = await stableCore.callTool('users_mutate_subscription', {
      mode: 'preview',
      operations: [
        {
          userUuid: 'user-1',
          status: 'ACTIVE',
          expireAt: '2026-04-01T00:00:00.000Z',
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.summary).toEqual({
      planned: 1,
      applied: 0,
      failed: 0,
      skipped: 0,
    });
    expect(result.mode).toBe('preview');
    expect(result.mutation).toMatchObject({
      supportsPreview: true,
      risk: 'medium',
      domain: 'users',
    });
    expect(result.actions).toEqual([
      {
        index: 0,
        userUuid: 'user-1',
        kind: 'update_subscription',
        risk: 'medium',
        status: 'planned',
        changes: {
          status: 'ACTIVE',
          expireAt: '2026-04-01T00:00:00.000Z',
        },
      },
    ]);
    expect(patchUserSettings).not.toHaveBeenCalled();
  });

  test('apply mode mutates after validation and reports success accounting', async () => {
    const patchUserSettings = vi.fn(async () => ({}));
    const stableCore = createStableCoreTools({
      client: {
        getUsers: async () => ({ total: 0, items: [] }),
        resolveUser: async () => ({ found: false, match: null }),
        getNodes: async () => ({ items: [] }),
        getSystemStats: async () => ({
          cpu: { cores: 0 },
          memory: { totalBytes: 0, freeBytes: 0, usedBytes: 0 },
          uptimeSeconds: 0,
          generatedAtUnixMs: 0,
          users: { total: 0, active: 0, disabled: 0, limited: 0, expired: 0 },
          online: { now: 0, lastDay: 0, lastWeek: 0, never: 0 },
          nodes: { totalOnlineUsers: 0, lifetimeBytes: 0n },
        }),
        getSystemHealth: async () => ({ instances: [] }),
        getSubscriptions: async () => ({ items: [] }),
        patchUserSettings,
      },
    });

    const result = await stableCore.callTool('users_mutate_squads', {
      mode: 'apply',
      operations: [
        {
          userUuid: 'user-1',
          internalSquadUuid: 'internal-1',
          externalSquadUuid: 'external-1',
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.summary).toEqual({
      planned: 1,
      applied: 1,
      failed: 0,
      skipped: 0,
    });
    expect(result.actions[0]).toMatchObject({
      index: 0,
      userUuid: 'user-1',
      kind: 'assign_squads',
      risk: 'high',
      status: 'applied',
      changes: {
        activeInternalSquads: ['internal-1'],
        externalSquadUuid: 'external-1',
      },
    });
    expect(patchUserSettings).toHaveBeenCalledWith('user-1', {
      activeInternalSquads: ['internal-1'],
      externalSquadUuid: 'external-1',
    });
  });

  test('invalid input fails validation before apply and performs no writes', async () => {
    const patchUserSettings = vi.fn(async () => ({}));
    const stableCore = createStableCoreTools({
      client: {
        getUsers: async () => ({ total: 0, items: [] }),
        resolveUser: async () => ({ found: false, match: null }),
        getNodes: async () => ({ items: [] }),
        getSystemStats: async () => ({
          cpu: { cores: 0 },
          memory: { totalBytes: 0, freeBytes: 0, usedBytes: 0 },
          uptimeSeconds: 0,
          generatedAtUnixMs: 0,
          users: { total: 0, active: 0, disabled: 0, limited: 0, expired: 0 },
          online: { now: 0, lastDay: 0, lastWeek: 0, never: 0 },
          nodes: { totalOnlineUsers: 0, lifetimeBytes: 0n },
        }),
        getSystemHealth: async () => ({ instances: [] }),
        getSubscriptions: async () => ({ items: [] }),
        patchUserSettings,
      },
    });

    const result = await stableCore.callTool('users_mutate_subscription', {
      mode: 'apply',
      operations: [
        {
          userUuid: 'user-1',
          status: 'UNKNOWN',
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.validation.ok).toBe(false);
    expect(result.validation.errors[0]).toMatchObject({
      code: 'INVALID_STATUS',
      field: 'operations[0].status',
    });
    expect(result.summary).toEqual({
      planned: 1,
      applied: 0,
      failed: 1,
      skipped: 0,
    });
    expect(patchUserSettings).not.toHaveBeenCalled();
  });

  test('auth failures are structured in apply mode', async () => {
    const patchUserSettings = vi.fn(async () => {
      throw new RemnawaveApiError(401, 'Unauthorized', { message: 'Unauthorized' });
    });
    const stableCore = createStableCoreTools({
      client: {
        getUsers: async () => ({ total: 0, items: [] }),
        resolveUser: async () => ({ found: false, match: null }),
        getNodes: async () => ({ items: [] }),
        getSystemStats: async () => ({
          cpu: { cores: 0 },
          memory: { totalBytes: 0, freeBytes: 0, usedBytes: 0 },
          uptimeSeconds: 0,
          generatedAtUnixMs: 0,
          users: { total: 0, active: 0, disabled: 0, limited: 0, expired: 0 },
          online: { now: 0, lastDay: 0, lastWeek: 0, never: 0 },
          nodes: { totalOnlineUsers: 0, lifetimeBytes: 0n },
        }),
        getSystemHealth: async () => ({ instances: [] }),
        getSubscriptions: async () => ({ items: [] }),
        patchUserSettings,
      },
    });

    const result = await stableCore.callTool('users_mutate_squads', {
      mode: 'apply',
      operations: [
        {
          userUuid: 'user-1',
          internalSquadUuid: 'internal-1',
          externalSquadUuid: 'external-1',
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.summary).toEqual({
      planned: 1,
      applied: 0,
      failed: 1,
      skipped: 0,
    });
    expect(result.failures).toEqual([
      {
        index: 0,
        userUuid: 'user-1',
        category: 'auth_failure',
        code: 'HTTP_401',
        message: 'Unauthorized',
      },
    ]);
  });

  test('partial failures keep deterministic success/failure accounting', async () => {
    const patchUserSettings = vi.fn(async (userUuid: string) => {
      if (userUuid === 'user-2') {
        throw new RemnawaveApiError(500, 'Remote exploded', { message: 'boom' });
      }
      return {};
    });
    const stableCore = createStableCoreTools({
      client: {
        getUsers: async () => ({ total: 0, items: [] }),
        resolveUser: async () => ({ found: false, match: null }),
        getNodes: async () => ({ items: [] }),
        getSystemStats: async () => ({
          cpu: { cores: 0 },
          memory: { totalBytes: 0, freeBytes: 0, usedBytes: 0 },
          uptimeSeconds: 0,
          generatedAtUnixMs: 0,
          users: { total: 0, active: 0, disabled: 0, limited: 0, expired: 0 },
          online: { now: 0, lastDay: 0, lastWeek: 0, never: 0 },
          nodes: { totalOnlineUsers: 0, lifetimeBytes: 0n },
        }),
        getSystemHealth: async () => ({ instances: [] }),
        getSubscriptions: async () => ({ items: [] }),
        patchUserSettings,
      },
    });

    const result = await stableCore.callTool('users_mutate_subscription', {
      mode: 'apply',
      operations: [
        {
          userUuid: 'user-1',
          status: 'ACTIVE',
        },
        {
          userUuid: 'user-2',
          status: 'DISABLED',
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.summary).toEqual({
      planned: 2,
      applied: 1,
      failed: 1,
      skipped: 0,
    });
    expect(result.actions).toEqual([
      {
        index: 0,
        userUuid: 'user-1',
        kind: 'update_subscription',
        risk: 'medium',
        status: 'applied',
        changes: {
          status: 'ACTIVE',
        },
      },
      {
        index: 1,
        userUuid: 'user-2',
        kind: 'update_subscription',
        risk: 'medium',
        status: 'failed',
        changes: {
          status: 'DISABLED',
        },
        error: {
          category: 'remote_failure',
          code: 'HTTP_500',
          message: 'Remote exploded',
        },
      },
    ]);
  });
});
