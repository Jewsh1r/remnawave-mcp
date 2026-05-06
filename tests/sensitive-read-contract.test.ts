import { describe, expect, test } from 'vitest';

import { applySensitiveReadPolicy } from '../src/runtime/errors.js';

describe('sensitive-read contract', () => {
  test('redacts sensitive output by default', () => {
    const result = applySensitiveReadPolicy(
      {
        token: 'secret-token',
        nested: {
          authorization: 'Bearer abcdef',
        },
      },
      {},
    );

    expect(result.policy.mode).toBe('redacted');
    expect(result.policy.revealRequested).toBe(false);
    expect(result.data).toEqual({
      token: '<REDACTED_SECRET>',
      nested: {
        authorization: 'Bearer <REDACTED_SECRET>',
      },
    });
  });

  test('reveals sensitive output only with explicit reveal mode', () => {
    const result = applySensitiveReadPolicy(
      {
        token: 'secret-token',
      },
      {
        reveal: 'full',
      },
    );

    expect(result.policy.mode).toBe('revealed');
    expect(result.policy.revealRequested).toBe(true);
    expect(result.data).toEqual({
      token: 'secret-token',
    });
  });
});
