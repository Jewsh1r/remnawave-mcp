import { afterEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const registerToolMock = vi.fn();
  const connectMock = vi.fn(async () => undefined);
  const closeMock = vi.fn(async () => undefined);
  const routeRemnawaveApiRequestMock = vi.fn();
  const createRemnawaveApiClientAdapterMock = vi.fn();
  const constructedClients: Array<{ readonly instance: unknown; readonly options: Record<string, unknown> }> = [];
  const adapterClient = { getSystemStats: vi.fn(async () => ({ stats: true })) };

  return {
    registerToolMock,
    connectMock,
    closeMock,
    routeRemnawaveApiRequestMock,
    createRemnawaveApiClientAdapterMock,
    constructedClients,
    adapterClient,
  };
});

let capturedHandler: ((args: Record<string, unknown>) => Promise<{ structuredContent: Record<string, unknown>; isError?: boolean }>) | null = null;
let capturedMetadata: Record<string, unknown> | null = null;

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    registerTool = mocks.registerToolMock.mockImplementation(
      (
        _name: string,
        metadata: Record<string, unknown>,
        handler: (args: Record<string, unknown>) => Promise<{ structuredContent: Record<string, unknown>; isError?: boolean }>,
      ) => {
        capturedMetadata = metadata;
        capturedHandler = handler;
      },
    );

    connect = mocks.connectMock;

    close = mocks.closeMock;
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {
    public onclose: (() => void) | null = null;
    public onerror: ((error: Error) => void) | null = null;
  },
}));

vi.mock('../src/server/discovery.js', () => ({
  buildServerDefinition: vi.fn(() => ({ name: 'test-server' })),
  registerDiscoverySurface: vi.fn(() => ({ tools: [{ name: 'remnawave_api' }] })),
}));

vi.mock('../src/runtime/logger.js', () => ({
  createStderrLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../src/runtime/process-guard.js', () => ({
  installProcessGuards: vi.fn(),
}));

vi.mock('../src/client/index.js', () => ({
  RemnawaveClient: class {
    public constructor(options: Record<string, unknown>) {
      mocks.constructedClients.push({ instance: this, options });
    }
  },
}));

vi.mock('../src/remnawave-api/client-adapter.js', () => ({
  createRemnawaveApiClientAdapter: mocks.createRemnawaveApiClientAdapterMock,
}));

vi.mock('../src/remnawave-api/router.js', () => ({
  routeRemnawaveApiRequest: mocks.routeRemnawaveApiRequestMock,
}));

import { startServer } from '../src/server.js';

function createRuntimeConfig() {
  return {
    remnawaveBaseUrl: 'https://panel.example.test',
    remnawaveApiToken: 'token-value',
    logLevel: 'error' as const,
    startupDiagnostics: {
      transport: 'stdio' as const,
      remnawaveVersion: {
        supported: true,
        status: 'supported' as const,
        value: '3.2.3',
      },
      capabilities: {
        tools: true,
      },
      server: {
        name: 'remnawave-mcp',
        version: '0.3.0',
        protocolVersion: '2024-11-05',
      },
    },
  };
}

describe('server runtime wiring', () => {
  afterEach(() => {
    capturedHandler = null;
    capturedMetadata = null;
    mocks.registerToolMock.mockClear();
    mocks.connectMock.mockClear();
    mocks.closeMock.mockClear();
    mocks.routeRemnawaveApiRequestMock.mockReset();
    mocks.createRemnawaveApiClientAdapterMock.mockReset();
    mocks.constructedClients.length = 0;
  });

  test('registers the single remnawave_api tool and delegates execution through the extracted adapter', async () => {
    mocks.createRemnawaveApiClientAdapterMock.mockReturnValueOnce(mocks.adapterClient);
    mocks.routeRemnawaveApiRequestMock.mockResolvedValueOnce({ stats: { users: 1n, nested: [2n] } });

    const runtime = await startServer(createRuntimeConfig());

    expect(mocks.registerToolMock).toHaveBeenCalledWith(
      'remnawave_api',
      expect.any(Object),
      expect.any(Function),
    );
    expect(capturedMetadata?.description).toContain('domain only to discover operations');
    expect(capturedMetadata?.description).not.toContain('system.get_stats');
    expect(mocks.createRemnawaveApiClientAdapterMock).toHaveBeenCalledTimes(1);
    expect(mocks.createRemnawaveApiClientAdapterMock).toHaveBeenCalledWith(mocks.constructedClients[0]?.instance);
    expect(capturedHandler).not.toBeNull();

    const request = { domain: 'system', operation: 'get_stats', payload: {} };
    const response = await capturedHandler?.(request);

    expect(mocks.routeRemnawaveApiRequestMock).toHaveBeenCalledWith(request, mocks.adapterClient);
    expect(response).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ stats: { users: '1', nested: ['2'] } }, null, 2) }],
      structuredContent: { stats: { users: '1', nested: ['2'] } },
    });

    await runtime.close();
  });

  test('marks compact error envelopes as MCP tool errors without changing payload shape', async () => {
    mocks.createRemnawaveApiClientAdapterMock.mockReturnValueOnce(mocks.adapterClient);
    const compactError = {
      error: {
        code: 'INVALID_PAYLOAD',
        kind: 'validation',
        message: 'Payload is invalid.',
        retryable: false,
      },
    };
    mocks.routeRemnawaveApiRequestMock.mockResolvedValueOnce(compactError);

    const runtime = await startServer(createRuntimeConfig());
    const request = { domain: 'system', operation: 'get_stats', payload: { unexpected: true } };
    const response = await capturedHandler?.(request);

    expect(response).toEqual({
      content: [{ type: 'text', text: JSON.stringify(compactError, null, 2) }],
      structuredContent: compactError,
      isError: true,
    });

    await runtime.close();
  });
});
