import { describe, expect, test } from 'vitest';

import { loadRuntimeConfig } from '../src/runtime/config.js';
import { RuntimeConfigError, redactSecrets } from '../src/runtime/errors.js';
import { buildDiscoveryManifest } from '../src/server/discovery.js';

describe('loadRuntimeConfig', () => {
  const supportedRemnawaveVersions = ['2.7.0', '2.7.1', '2.7.2', '2.7.3', '2.7.4'] as const;
  const supportedRemnawaveRange = '2.7.0-2.7.4';

  test.each(supportedRemnawaveVersions)('marks supported Remnawave patch version %s as supported', (version) => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: version,
    });

    expect(config.startupDiagnostics.remnawaveVersion).toEqual({
      supported: true,
      status: 'supported',
      value: version,
      supportedRange: supportedRemnawaveRange,
    });
    expect(config.startupDiagnostics.capabilities.tools).toBe(true);
  });

  test('returns config and marks fixture version 2.7.4 as supported', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      LOG_LEVEL: 'debug',
      REMNAWAVE_VERSION: '2.7.4',
    });

    expect(config.remnawaveBaseUrl).toBe('https://panel.example.test');
    expect(config.remnawaveApiToken).toBe('token-value');
    expect(config.logLevel).toBe('debug');
    expect(config.startupDiagnostics.remnawaveVersion).toEqual({
      supported: true,
      status: 'supported',
      value: '2.7.4',
      supportedRange: supportedRemnawaveRange,
    });
    expect(config.startupDiagnostics.capabilities.tools).toBe(true);
    expect(config.startupDiagnostics.transport).toBe('stdio');
  });

  test('throws a structured error when base url is missing', () => {
    let thrown: unknown;

    try {
      loadRuntimeConfig({
        REMNAWAVE_API_TOKEN: 'token-value',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RuntimeConfigError);
    expect(thrown).toMatchObject({
      category: 'config',
      code: 'REMNAWAVE_BASE_URL_MISSING',
      message: 'Missing required environment variable: REMNAWAVE_BASE_URL',
    });
  });

  test('throws a structured error when api token is missing', () => {
    let thrown: unknown;

    try {
      loadRuntimeConfig({
        REMNAWAVE_BASE_URL: 'https://panel.example.test',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RuntimeConfigError);
    expect(thrown).toMatchObject({
      category: 'config',
      code: 'REMNAWAVE_API_TOKEN_MISSING',
      message: 'Missing required environment variable: REMNAWAVE_API_TOKEN',
    });
  });

  test('classifies unknown remnawave version explicitly', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
    });

    expect(config.startupDiagnostics.remnawaveVersion).toEqual({
      supported: false,
      status: 'unknown',
      value: null,
      supportedRange: supportedRemnawaveRange,
    });
    expect(config.startupDiagnostics.capabilities).toEqual({
      tools: false,
    });
  });

  const blockedRemnawaveVersions = [
    { label: 'missing', rawValue: undefined, expectedStatus: 'unknown', expectedValue: null },
    { label: 'whitespace', rawValue: '   ', expectedStatus: 'unknown', expectedValue: null },
    { label: 'latest', rawValue: 'latest', expectedStatus: 'unsupported', expectedValue: 'latest' },
    { label: '2.7', rawValue: '2.7', expectedStatus: 'unsupported', expectedValue: '2.7' },
    { label: '2.7.x', rawValue: '2.7.x', expectedStatus: 'unsupported', expectedValue: '2.7.x' },
    { label: 'v2.7.4', rawValue: 'v2.7.4', expectedStatus: 'unsupported', expectedValue: 'v2.7.4' },
    {
      label: '2.7.4-beta.1',
      rawValue: '2.7.4-beta.1',
      expectedStatus: 'unsupported',
      expectedValue: '2.7.4-beta.1',
    },
    { label: '2.6.4', rawValue: '2.6.4', expectedStatus: 'unsupported', expectedValue: '2.6.4' },
    { label: '2.8.0', rawValue: '2.8.0', expectedStatus: 'unsupported', expectedValue: '2.8.0' },
    { label: '2.8.1', rawValue: '2.8.1', expectedStatus: 'unsupported', expectedValue: '2.8.1' },
    { label: '3.0.0', rawValue: '3.0.0', expectedStatus: 'unsupported', expectedValue: '3.0.0' },
  ] as const;

  test.each(blockedRemnawaveVersions)(
    'blocks malformed or unsupported Remnawave version $label',
    ({ rawValue, expectedStatus, expectedValue }) => {
      const config = loadRuntimeConfig({
        REMNAWAVE_BASE_URL: 'https://panel.example.test',
        REMNAWAVE_API_TOKEN: 'token-value',
        REMNAWAVE_VERSION: rawValue,
      });

      expect(config.startupDiagnostics.remnawaveVersion).toEqual({
        supported: false,
        status: expectedStatus,
        value: expectedValue,
        supportedRange: supportedRemnawaveRange,
      });
      expect(config.startupDiagnostics.capabilities).toEqual({
        tools: false,
      });
    },
  );

  test('classifies unsupported remnawave version explicitly', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '3.0.0',
    });

    expect(config.startupDiagnostics.remnawaveVersion).toEqual({
      supported: false,
      status: 'unsupported',
      value: '3.0.0',
      supportedRange: supportedRemnawaveRange,
    });
    expect(config.startupDiagnostics.capabilities).toEqual({
      tools: false,
    });
  });

  test('fails closed during discovery when remnawave version is unknown', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
    });

    expect(() => buildDiscoveryManifest(config)).toThrowError(
      expect.objectContaining({
        category: 'version',
        code: 'REMNAWAVE_VERSION_UNKNOWN',
        message: 'Unknown Remnawave version cannot advertise the planned discovery surface.',
      }),
    );
  });
});

describe('redactSecrets', () => {
  test('redacts token values from nested diagnostics and log details', () => {
    const redacted = redactSecrets({
      token: 'super-secret-token',
      nested: {
        authorization: 'Bearer super-secret-token',
        safe: 'https://panel.example.test',
      },
      message: 'token super-secret-token should not leak',
    });

    expect(redacted).toEqual({
      token: '<REDACTED_SECRET>',
      nested: {
        authorization: 'Bearer <REDACTED_SECRET>',
        safe: 'https://panel.example.test',
      },
      message: 'token <REDACTED_SECRET> should not leak',
    });
  });
});
