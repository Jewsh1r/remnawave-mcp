import {
  normalizeBandwidthStatsResponse,
  normalizeHwidInspectionResponse,
  normalizeMetadataResponse,
  normalizeNodesResponse,
  normalizeNodePluginsResponse,
  normalizeSubscriptionsResponse,
  normalizeSystemHealthResponse,
  normalizeSystemStatsResponse,
  normalizeUsersResolveResponse,
  normalizeUsersResponse,
} from './normalize.js';
import { RemnawaveApiError } from './errors.js';

import type {
  NormalizedBandwidthStats,
  NormalizedHwidInspection,
  NormalizedMetadata,
  NormalizedNodesResponse,
  NormalizedNodePluginsResponse,
  NormalizedSubscriptionsResponse,
  NormalizedSystemHealth,
  NormalizedSystemStats,
  NormalizedUsersResolveResponse,
  NormalizedUsersResponse,
} from './types.js';

export interface RemnawaveClientOptions {
  readonly baseUrl: string;
  readonly apiToken: string;
  readonly fetch?: typeof globalThis.fetch;
}

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'X-Forwarded-Proto': 'https',
  'X-Forwarded-For': '127.0.0.1',
} as const;

const ROUTES = {
  nodes: '/api/nodes',
  users: '/api/users',
  subscriptions: '/api/subscriptions',
  usersResolve: '/api/users/resolve',
  systemStats: '/api/system/stats',
  systemHealth: '/api/system/health',
  bandwidthStats: '/api/system/stats/bandwidth',
  metadata: '/api/system/metadata',
  nodePlugins: '/api/node-plugins',
  hwidInspection: '/api/hwid/devices/stats',
} as const;

export class RemnawaveClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  public constructor(options: RemnawaveClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiToken = options.apiToken;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  public async getNodes(): Promise<NormalizedNodesResponse> {
    return normalizeNodesResponse(await this.getJson(ROUTES.nodes));
  }

  public async getUsers(): Promise<NormalizedUsersResponse> {
    return normalizeUsersResponse(await this.getJson(ROUTES.users));
  }

  public async resolveUser(uuid: string): Promise<NormalizedUsersResolveResponse> {
    return normalizeUsersResolveResponse(await this.sendJson(ROUTES.usersResolve, { uuid }));
  }

  public async getSubscriptions(): Promise<NormalizedSubscriptionsResponse> {
    return normalizeSubscriptionsResponse(await this.getJson(ROUTES.subscriptions));
  }

  public async patchUserSettings(userUuid: string, settings: Record<string, unknown>): Promise<unknown> {
    return this.requestJson(ROUTES.users, 'PATCH', { uuid: userUuid, ...settings });
  }

  public async getSystemStats(): Promise<NormalizedSystemStats> {
    return normalizeSystemStatsResponse(await this.getJson(ROUTES.systemStats));
  }

  public async getSystemHealth(): Promise<NormalizedSystemHealth> {
    return normalizeSystemHealthResponse(await this.getJson(ROUTES.systemHealth));
  }

  public async getBandwidthStats(): Promise<NormalizedBandwidthStats> {
    return normalizeBandwidthStatsResponse(await this.getJson(ROUTES.bandwidthStats));
  }

  public async getMetadata(): Promise<NormalizedMetadata> {
    return normalizeMetadataResponse(await this.getJson(ROUTES.metadata));
  }

  public async getNodePlugins(): Promise<NormalizedNodePluginsResponse> {
    return normalizeNodePluginsResponse(await this.getJson(ROUTES.nodePlugins));
  }

  public async getHwidInspection(): Promise<NormalizedHwidInspection> {
    return normalizeHwidInspectionResponse(await this.getJson(ROUTES.hwidInspection));
  }

  private async getJson(path: string): Promise<unknown> {
    return this.requestJson(path, 'GET');
  }

  private async sendJson(path: string, body: unknown): Promise<unknown> {
    return this.requestJson(path, 'POST', body);
  }

  private async requestJson(path: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = await parseResponseBody(response);

    if (!response.ok) {
      const message = extractErrorMessage(payload, response.statusText);
      throw new RemnawaveApiError(response.status, message, payload);
    }

    return payload;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }
  return fallback || 'Remnawave request failed';
}

export { ROUTES as REMNAWAVE_ROUTES };
