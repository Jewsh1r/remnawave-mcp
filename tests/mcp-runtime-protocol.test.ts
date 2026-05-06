import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterEach, describe, expect, test } from 'vitest';

import { loadRuntimeConfig } from '../src/runtime/config.js';
import {
  buildDiscoveryManifest,
} from '../src/server/discovery.js';

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
      REMNAWAVE_VERSION: '2.7.4',
      LOG_LEVEL: 'error',
    } as Record<string, string>,
  });

  const client = new Client({ name: 'test-client', version: '0.0.0' }, { capabilities: {} });

  transports.push(transport);
  clients.push(client);

  return { client, transport };
}

describe('mcp runtime protocol', () => {
  test('initializes over stdio and serves single-tool discovery', async () => {
    const { client, transport } = createProtocolClient();
    await client.connect(transport, { timeout: 5000 });

    const discoveryManifest = buildDiscoveryManifest(loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '2.7.4',
    }));

    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);
    const [primaryTool] = tools.tools;

    expect(primaryTool?.name).toBe('remnawave_api');
    expect(toolNames).toEqual(['remnawave_api']);
    expect(toolNames).toEqual(expect.arrayContaining(discoveryManifest.tools.map((tool) => tool.name)));

    const remnawaveApi = tools.tools.find((tool) => tool.name === 'remnawave_api');

    expect(remnawaveApi?.description).toContain('domain only to discover operations');
    expect(remnawaveApi?.description).not.toContain('system.get_stats');
    expect(remnawaveApi?.inputSchema).toMatchObject({
      type: 'object',
      required: ['domain'],
      properties: {
        domain: {
          type: 'string',
          minLength: 1,
        },
        operation: {
          type: 'string',
          minLength: 1,
        },
      },
    });
  });

  test('exposes remnawave_api discovery and describe-operation states over MCP protocol', async () => {
    const { client, transport } = createProtocolClient();
    await client.connect(transport, { timeout: 5000 });

    const tools = await client.listTools();
    const remnawaveApi = tools.tools.find((tool) => tool.name === 'remnawave_api');

    expect(remnawaveApi).toBeDefined();
    expect(remnawaveApi?.name).toBe('remnawave_api');
    expect(remnawaveApi?.description).toContain('domain only to discover operations');
    expect(remnawaveApi?.description).not.toContain('system.get_stats');
  });
});
