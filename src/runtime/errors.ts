export type RuntimeErrorCategory = 'config' | 'version' | 'internal';

export type RuntimeErrorCode =
  | 'REMNAWAVE_BASE_URL_MISSING'
  | 'REMNAWAVE_API_TOKEN_MISSING'
  | 'REMNAWAVE_VERSION_UNSUPPORTED'
  | 'REMNAWAVE_VERSION_UNKNOWN'
  | 'STARTUP_INTERNAL_ERROR';

export interface RuntimeErrorDetails {
  readonly [key: string]: unknown;
}

export class RuntimeConfigError extends Error {
  public readonly category: RuntimeErrorCategory;
  public readonly code: RuntimeErrorCode;
  public readonly details?: RuntimeErrorDetails;

  public constructor(
    category: RuntimeErrorCategory,
    code: RuntimeErrorCode,
    message: string,
    details?: RuntimeErrorDetails,
  ) {
    super(message);
    this.name = 'RuntimeConfigError';
    this.category = category;
    this.code = code;
    this.details = details;
  }
}

const SECRET_KEY_PATTERN = /(token|secret|authorization|api[-_]?key|password)/i;
const REDACTED_SECRET = '<REDACTED_SECRET>';

export function redactSecrets<T>(value: T): T {
  return redactValue(value, false) as T;
}

function redactValue(value: unknown, forceRedaction: boolean): unknown {
  if (typeof value === 'string') {
    return forceRedaction ? redactForcedSecretString(value) : redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, forceRedaction));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        redactValue(entry, forceRedaction || SECRET_KEY_PATTERN.test(key)),
      ]),
    );
  }

  return value;
}

function redactString(value: string): string {
  return value
    .replace(/Bearer\s+[^\s]+/gi, `Bearer ${REDACTED_SECRET}`)
    .replace(/\b(?:token|secret|password|api[_-]?key)\b\s*[:=]?\s*[^\s,;]+/gi, ($0, offset, input) => {
      const prefixMatch = input.slice(offset).match(/^((?:token|secret|password|api[_-]?key)\b\s*[:=]?\s*)/i);
      return `${prefixMatch?.[1] ?? ''}${REDACTED_SECRET}`;
    });
}

function redactForcedSecretString(value: string): string {
  if (/^Bearer\s+/i.test(value)) {
    return value.replace(/^Bearer\s+.+$/i, `Bearer ${REDACTED_SECRET}`);
  }

  return REDACTED_SECRET;
}
