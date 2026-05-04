import { MCP_PROTOCOL_VERSION, SERVER_NAME, SERVER_VERSION } from './constants.js';
import { RuntimeConfigError } from './errors.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StartupDiagnostics {
  readonly server: {
    readonly name: string;
    readonly version: string;
    readonly protocolVersion: string;
  };
  readonly transport: 'stdio';
  readonly remnawaveVersion: {
    readonly supported: boolean;
    readonly status: 'supported' | 'unsupported' | 'unknown';
    readonly value: string | null;
    readonly supportedRange?: string;
  };
  readonly capabilities: {
    readonly tools: boolean;
  };
}

export interface RuntimeConfig {
  readonly remnawaveBaseUrl: string;
  readonly remnawaveApiToken: string;
  readonly logLevel: LogLevel;
  readonly startupDiagnostics: StartupDiagnostics;
}

const SUPPORTED_REMNAWAVE_VERSIONS = new Set(['2.7.0', '2.7.1', '2.7.2', '2.7.3', '2.7.4']);
const SUPPORTED_REMNAWAVE_RANGE = '2.7.0-2.7.4';

export function loadRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  const remnawaveBaseUrl = readRequiredEnv(env, 'REMNAWAVE_BASE_URL');
  const remnawaveApiToken = readRequiredEnv(env, 'REMNAWAVE_API_TOKEN');
  const remnawaveVersion = classifyRemnawaveVersion(env.REMNAWAVE_VERSION);

  return {
    remnawaveBaseUrl,
    remnawaveApiToken,
    logLevel: parseLogLevel(env.LOG_LEVEL),
    startupDiagnostics: {
      server: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        protocolVersion: MCP_PROTOCOL_VERSION,
      },
      transport: 'stdio',
      remnawaveVersion,
      capabilities: {
        tools: remnawaveVersion.supported,
      },
    },
  };
}






function readRequiredEnv(
  env: NodeJS.ProcessEnv,
  key: 'REMNAWAVE_BASE_URL' | 'REMNAWAVE_API_TOKEN',
): string {
  const value = env[key]?.trim();

  if (value) {
    return value;
  }

  if (key === 'REMNAWAVE_BASE_URL') {
    throw new RuntimeConfigError(
      'config',
      'REMNAWAVE_BASE_URL_MISSING',
      'Missing required environment variable: REMNAWAVE_BASE_URL',
      { envVar: key },
    );
  }

  throw new RuntimeConfigError(
    'config',
    'REMNAWAVE_API_TOKEN_MISSING',
    'Missing required environment variable: REMNAWAVE_API_TOKEN',
    { envVar: key },
  );
}

function classifyRemnawaveVersion(rawValue: string | undefined): StartupDiagnostics['remnawaveVersion'] {
  const value = rawValue?.trim();

  if (!value) {
    return {
      supported: false,
      status: 'unknown',
      value: null,
      supportedRange: SUPPORTED_REMNAWAVE_RANGE,
    };
  }

  if (SUPPORTED_REMNAWAVE_VERSIONS.has(value)) {
    return {
      supported: true,
      status: 'supported',
      value,
      supportedRange: SUPPORTED_REMNAWAVE_RANGE,
    };
  }

  return {
    supported: false,
    status: 'unsupported',
    value,
    supportedRange: SUPPORTED_REMNAWAVE_RANGE,
  };
}

function parseLogLevel(value: string | undefined): LogLevel {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }

  return 'info';
}
