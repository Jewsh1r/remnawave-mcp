import { describe, expect, test } from 'vitest';

import { loadRuntimeConfig } from '../src/runtime/config.js';
import {
  buildDiscoveryManifest,
} from '../src/server/discovery.js';

describe('single-tool discovery inventory', () => {
  test('discovery exposes only remnawave_api in single-tool mode', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '3.2.3',
    });

    const manifest = buildDiscoveryManifest(config);

    expect(manifest.tools).toHaveLength(1);
    expect(manifest.tools[0]?.name).toBe('remnawave_api');
  });

  test('single-tool discovery only contains remnawave_api', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '3.2.3',
    });

    const manifest = buildDiscoveryManifest(config);
    const manifestToolNames = manifest.tools.map((tool) => tool.name);

    expect(manifestToolNames).toEqual(['remnawave_api']);
  });
});
