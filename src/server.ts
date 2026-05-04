import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';

import { RemnawaveClient } from './client/index.js';
import type { RuntimeConfig } from './runtime/config.js';
import { createStderrLogger } from './runtime/logger.js';
import { installProcessGuards } from './runtime/process-guard.js';
import { buildServerDefinition, registerDiscoverySurface, type DiscoveryManifest } from './server/discovery.js';

import { createRemnawaveApiClientAdapter } from './remnawave-api/client-adapter.js';
import { routeRemnawaveApiRequest } from './remnawave-api/router.js';
export interface ServerRuntime {
  readonly close: () => Promise<void>;
  readonly discovery: DiscoveryManifest;
}

export async function startServer(config: RuntimeConfig): Promise<ServerRuntime> {
  const logger = createStderrLogger(config.logLevel);
  const server = buildServerDefinition(config);
  const discovery = registerDiscoverySurface(server);
  const mcpServer = new McpServer(
    {
      name: config.startupDiagnostics.server.name,
      version: config.startupDiagnostics.server.version,
    },
    {
      capabilities: {
        tools: { listChanged: false },
      },
    },
  );

  const remnawaveClient = new RemnawaveClient({
    baseUrl: config.remnawaveBaseUrl,
    apiToken: config.remnawaveApiToken,
  });
  const remnawaveApiClient = createRemnawaveApiClientAdapter(remnawaveClient);
  const remnawaveApiToolInput = z
    .object({
      domain: z.string().min(1),
      operation: z.string().min(1).optional(),
      payload: z.unknown().optional(),
      responseMode: z.enum(['normalized', 'raw']).optional(),
      confirmToken: z.string().min(1).optional(),
    })
    .strict();

  mcpServer.registerTool(
    'remnawave_api',
    {
      title: 'Remnawave API',
      description: 'Primary interface for all Remnawave operations. Use domain + operation + payload pattern.',
      inputSchema: remnawaveApiToolInput,
    },
    async (args) => {
      const result = await routeRemnawaveApiRequest(args, remnawaveApiClient);
      const safeResult = toJsonSafe(result);
      return {
        content: [{ type: 'text', text: JSON.stringify(safeResult, null, 2) }],
        structuredContent: asStructuredContent(safeResult),
      };
    },
  );
  const transport = new StdioServerTransport();
  transport.onclose = () => {
    logger.info('shutdown', { reason: 'stdin_closed' });
    process.exit(0);
  };
  transport.onerror = (error) => {
    logger.error('transport_error', { message: error.message });
    process.exitCode = 1;
  };

  installProcessGuards(logger);
  logger.info('startup', {
    ...config.startupDiagnostics,
    discovery: {
      tools: discovery.tools.map((tool) => tool.name),
    },
  });
  await mcpServer.connect(transport);

  return {
    discovery,
    close: async () => {
      await mcpServer.close();
      logger.info('shutdown', { reason: 'runtime_closed' });
    },
  };
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonSafe(item)]);
    return Object.fromEntries(entries);
  }

  return value;
}

function asStructuredContent(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {
    value,
  };
}
