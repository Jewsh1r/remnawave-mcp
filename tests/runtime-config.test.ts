import { describe, expect, test } from 'vitest';

import { loadRuntimeConfig } from '../src/runtime/config.js';
import { RuntimeConfigError, redactSecrets } from '../src/runtime/errors.js';

describe('loadRuntimeConfig', () => {
  test('returns config and marks fixture version 2.7.3 as supported', () => {
    const config = loadRuntimeConfig({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      LOG_LEVEL: 'debug',
      REMNAWAVE_VERSION: '2.7.3',
    });

    expect(config.remnawaveBaseUrl).toBe('https://panel.example.test');
    expect(config.remnawaveApiToken).toBe('token-value');
    expect(config.logLevel).toBe('debug');
    expect(config.startupDiagnostics.remnawaveVersion).toEqual({
      supported: true,
      status: 'supported',
      value: '2.7.3',
    });
    expect(config.startupDiagnostics.capabilities.tools).toBe(true);
    expect(config.startupDiagnostics.capabilities.resources).toBe(true);
    expect(config.startupDiagnostics.capabilities.prompts).toBe(true);
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
    });
    expect(config.startupDiagnostics.capabilities).toEqual({
      tools: false,
      resources: false,
      prompts: false,
    });
  });

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
    });
    expect(config.startupDiagnostics.capabilities).toEqual({
      tools: false,
      resources: false,
      prompts: false,
    });
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
