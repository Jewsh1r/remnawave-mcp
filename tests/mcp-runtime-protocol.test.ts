import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterEach, describe, expect, test } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..');
const entrypoint = path.join(repoRoot, 'src', 'index.ts');

const transports: StdioClientTransport[] = [];
const clients: Client[] = [];

afterEach(async () => {
  while (clients.length > 0) {
    const client = clients.pop();
    if (client) {
      await client.close();
    }
  }

  while (transports.length > 0) {
    const transport = transports.pop();
    if (transport) {
      await transport.close();
    }
  }
});

function createProtocolClient(): { client: Client; transport: StdioClientTransport } {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', entrypoint],
    cwd: repoRoot,
    stderr: 'pipe',
    env: {
      ...process.env,
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '2.7.3',
      LOG_LEVEL: 'error',
    } as Record<string, string>,
  });

  const client = new Client({ name: 'test-client', version: '0.0.0' }, { capabilities: {} });

  transports.push(transport);
  clients.push(client);

  return { client, transport };
}

describe('mcp runtime protocol', () => {
  test('initializes over stdio and serves discovery from protocol handlers', async () => {
    const { client, transport } = createProtocolClient();
    await client.connect(transport, { timeout: 1500 });

    const tools = await client.listTools();
    const resources = await client.listResources();
    const prompts = await client.listPrompts();

    expect(tools.tools.map((tool) => tool.name)).toEqual([
      'users_list',
      'users_resolve',
      'nodes_list',
      'system_get_stats',
      'system_get_health',
      'subscriptions_list',
      'users_mutate_subscription',
      'users_mutate_squads',
      'advanced_get_metadata',
      'advanced_list_node_plugins',
      'advanced_get_bandwidth_stats',
      'advanced_get_hwid_inspection',
    ]);
    expect(resources.resources.map((resource) => resource.uri)).toEqual([
      'remnawave://panel/statistics',
      'remnawave://nodes/status',
      'remnawave://system/health',
    ]);
    expect(prompts.prompts.map((prompt) => prompt.name)).toEqual([
      'operator_diagnostics',
      'user_resolution',
      'node_investigation',
      'traffic_interpretation',
      'plugin_investigation',
    ]);
  });

  test('executes representative tool and prompt over MCP protocol', async () => {
    const { client, transport } = createProtocolClient();
    await client.connect(transport, { timeout: 1500 });

    const previewResult = await client.callTool({
      name: 'users_mutate_subscription',
      arguments: {
        mode: 'preview',
        operations: [
          {
            userUuid: 'user-1',
            status: 'ACTIVE',
          },
        ],
      },
    });

    expect(previewResult.isError).toBeFalsy();
    expect(previewResult.structuredContent).toMatchObject({
      mode: 'preview',
      success: true,
      summary: {
        planned: 1,
        applied: 0,
        failed: 0,
      },
    });

    const promptResult = await client.getPrompt({ name: 'operator_diagnostics', arguments: {} });
    expect(promptResult.messages).toHaveLength(1);
    expect(promptResult.messages[0]?.content.type).toBe('text');
  });
});
