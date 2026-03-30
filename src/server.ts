import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';

import { RemnawaveClient } from './client/index.js';
import { PROMPT_DEFINITIONS } from './prompts/index.js';
import type { RuntimeConfig } from './runtime/config.js';
import { createStderrLogger } from './runtime/logger.js';
import { installProcessGuards } from './runtime/process-guard.js';
import { buildServerDefinition, registerDiscoverySurface, type DiscoveryManifest } from './server/discovery.js';
import { createStableCoreTools } from './tools/index.js';

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
        resources: { listChanged: false },
        prompts: { listChanged: false },
      },
    },
  );

  const remnawaveClient = new RemnawaveClient({
    baseUrl: config.remnawaveBaseUrl,
    apiToken: config.remnawaveApiToken,
  });
  const toolRegistry = createStableCoreTools({
    client: {
      getUsers: () => remnawaveClient.getUsers(),
      resolveUser: (uuid: string) => remnawaveClient.resolveUser(uuid),
      getNodes: () => remnawaveClient.getNodes(),
      getSystemStats: () => remnawaveClient.getSystemStats(),
      getSystemHealth: () => remnawaveClient.getSystemHealth(),
      getSubscriptions: () => remnawaveClient.getSubscriptions(),
      getMetadata: () => remnawaveClient.getMetadata(),
      getNodePlugins: () => remnawaveClient.getNodePlugins(),
      getBandwidthStats: () => remnawaveClient.getBandwidthStats(),
      getHwidInspection: () => remnawaveClient.getHwidInspection(),
      patchUserSettings: (userUuid: string, settings: Record<string, unknown>) =>
        remnawaveClient.patchUserSettings(userUuid, settings),
    },
  });

  const genericToolInput = z.object({}).catchall(z.unknown()).default({});

  for (const tool of discovery.tools) {
    mcpServer.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: genericToolInput,
      },
      async (args) => {
        const result = await toolRegistry.callTool(tool.name, args);
        const safeResult = toJsonSafe(result);
        return {
          content: [{ type: 'text', text: JSON.stringify(safeResult, null, 2) }],
          structuredContent: asStructuredContent(safeResult),
        };
      },
    );
  }

  for (const resource of discovery.resources) {
    mcpServer.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
      },
      async () => {
        const result = await toolRegistry.readResource(resource.uri);
        const safeResult = toJsonSafe(result);
        return {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: JSON.stringify(safeResult, null, 2),
            },
          ],
        };
      },
    );
  }

  for (const prompt of PROMPT_DEFINITIONS) {
    mcpServer.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
      },
      async () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt.body,
            },
          },
        ],
      }),
    );
  }

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
      resources: discovery.resources.map((resource) => resource.uri),
      prompts: discovery.prompts.map((prompt) => prompt.name),
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
