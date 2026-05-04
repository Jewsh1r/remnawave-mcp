import { describe, expect, test } from 'vitest';

import { buildRemnawaveApiToolDiscoveryDescription } from '../src/remnawave-api/contract.js';
import { loadRuntimeConfig } from '../src/runtime/config.js';
import { RuntimeConfigError } from '../src/runtime/errors.js';
import {
  buildDiscoveryManifest,
  buildServerDefinition,
  listDiscoveryCapabilities,
  registerDiscoverySurface,
} from '../src/server/discovery.js';

describe('discovery bootstrap', () => {
  const supportedRemnawaveVersions = ['2.7.0', '2.7.1', '2.7.2', '2.7.3', '2.7.4'] as const;
  const blockedRemnawaveVersions = [
    { label: 'missing', rawValue: undefined, expectedCode: 'REMNAWAVE_VERSION_UNKNOWN' },
    { label: 'whitespace', rawValue: '   ', expectedCode: 'REMNAWAVE_VERSION_UNKNOWN' },
    { label: 'latest', rawValue: 'latest', expectedCode: 'REMNAWAVE_VERSION_UNSUPPORTED' },
    { label: '2.7', rawValue: '2.7', expectedCode: 'REMNAWAVE_VERSION_UNSUPPORTED' },
    { label: '2.7.x', rawValue: '2.7.x', expectedCode: 'REMNAWAVE_VERSION_UNSUPPORTED' },
    { label: 'v2.7.4', rawValue: 'v2.7.4', expectedCode: 'REMNAWAVE_VERSION_UNSUPPORTED' },
    { label: '2.7.4-beta.1', rawValue: '2.7.4-beta.1', expectedCode: 'REMNAWAVE_VERSION_UNSUPPORTED' },
    { label: '2.6.4', rawValue: '2.6.4', expectedCode: 'REMNAWAVE_VERSION_UNSUPPORTED' },
    { label: '2.8.0', rawValue: '2.8.0', expectedCode: 'REMNAWAVE_VERSION_UNSUPPORTED' },
    { label: '2.8.1', rawValue: '2.8.1', expectedCode: 'REMNAWAVE_VERSION_UNSUPPORTED' },
    { label: '3.0.0', rawValue: '3.0.0', expectedCode: 'REMNAWAVE_VERSION_UNSUPPORTED' },
  ] as const;

  test('lists only remnawave_api as the single discovery tool', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '2.7.4',
    });

    const manifest = buildDiscoveryManifest(config);

    expect(manifest.tools).toHaveLength(1);
    expect(manifest.tools[0]?.name).toBe('remnawave_api');
  });

  test.each(supportedRemnawaveVersions)(
    'advertises exactly remnawave_api for supported Remnawave version %s',
    (version) => {
      const config = loadRuntimeConfig({
        REMNAWAVE_BASE_URL: 'https://panel.example.test',
        REMNAWAVE_API_TOKEN: 'token-value',
        REMNAWAVE_VERSION: version,
      });

      const manifest = buildDiscoveryManifest(config);

      expect(manifest.tools).toHaveLength(1);
      expect(manifest.tools[0]?.name).toBe('remnawave_api');
    },
  );

  test('returns the same ordered discovery surface across repeated builds', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '2.7.4',
    });

    const firstManifest = buildDiscoveryManifest(config);
    const secondManifest = buildDiscoveryManifest(config);
    const firstServer = buildServerDefinition(config);
    const secondServer = buildServerDefinition(config);

    expect(secondManifest).toEqual(firstManifest);
    expect(listDiscoveryCapabilities(firstServer)).toEqual(listDiscoveryCapabilities(secondServer));
    expect(registerDiscoverySurface(firstServer)).toEqual(registerDiscoverySurface(firstServer));
  });

  test('fails fast when version gating blocks discovery', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '3.0.0',
    });

    expect(() => buildDiscoveryManifest(config)).toThrowError(RuntimeConfigError);
    expect(() => buildServerDefinition(config)).toThrowError(
      expect.objectContaining({
        category: 'version',
        code: 'REMNAWAVE_VERSION_UNSUPPORTED',
      }),
    );
  });

  test('fails fast when discovery is attempted without a known remnawave version', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
    });

    expect(() => buildDiscoveryManifest(config)).toThrowError(
      expect.objectContaining({
        category: 'version',
        code: 'REMNAWAVE_VERSION_UNKNOWN',
      }),
    );
  });

  test.each(blockedRemnawaveVersions)(
    'fails before advertising tools for blocked Remnawave version $label',
    ({ rawValue, expectedCode }) => {
      const config = loadRuntimeConfig({
        REMNAWAVE_BASE_URL: 'https://panel.example.test',
        REMNAWAVE_API_TOKEN: 'token-value',
        REMNAWAVE_VERSION: rawValue,
      });

      expect(() => buildDiscoveryManifest(config)).toThrowError(
        expect.objectContaining({
          category: 'version',
          code: expectedCode,
        }),
      );
      expect(() => buildServerDefinition(config)).toThrowError(
        expect.objectContaining({
          category: 'version',
          code: expectedCode,
        }),
      );
    },
  );

  test('publishes remnawave_api discovery text from contract', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '2.7.4',
    });

    const manifest = buildDiscoveryManifest(config);
    const remnawaveApiTool = manifest.tools.find((tool) => tool.name === 'remnawave_api');

    expect(remnawaveApiTool).toBeDefined();
    expect(remnawaveApiTool?.description).toBe(buildRemnawaveApiToolDiscoveryDescription());
  });

  test('advertises remnawave_api as the primary single-tool interface', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '2.7.4',
    });

    const manifest = buildDiscoveryManifest(config);
    const [primaryTool] = manifest.tools;

    expect(primaryTool?.name).toBe('remnawave_api');
    expect(primaryTool?.description).toContain('Primary interface');
  });
});
