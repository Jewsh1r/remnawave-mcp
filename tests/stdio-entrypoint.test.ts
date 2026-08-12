import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..');
const entrypoint = path.join(repoRoot, 'src', 'index.ts');

const children: Array<ReturnType<typeof spawn>> = [];

afterEach(() => {
  for (const child of children.splice(0)) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
});

function startEntrypoint(env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, ['--import', 'tsx', entrypoint], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  children.push(child);
  return child;
}

async function collectStream(stream: NodeJS.ReadableStream): Promise<string> {
  let output = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    output += chunk;
  });
  await once(stream, 'end');
  return output;
}

async function waitForStderrContains(
  child: ReturnType<typeof spawn>,
  expected: string,
  timeoutMs = 2000,
): Promise<string> {
  const stderrStream = child.stderr;

  if (!stderrStream) {
    throw new Error('Expected child stderr stream to be available');
  }

  let stderr = '';

  stderrStream.setEncoding('utf8');
  stderrStream.on('data', (chunk) => {
    stderr += chunk;
  });

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (stderr.includes(expected)) {
      return stderr;
    }

    if (child.exitCode !== null) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error(`Timed out waiting for stderr to include ${expected}\nCurrent stderr:\n${stderr}`);
}

describe('stdio entrypoint', () => {
  test('has a node shebang for npm bin execution', () => {
    expect(readFileSync(entrypoint, 'utf8').startsWith('#!/usr/bin/env node\n')).toBe(true);
  });

  test('starts with required env, emits diagnostics to stderr, and keeps stdout clean', async () => {
    const child = startEntrypoint({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      LOG_LEVEL: 'debug',
      REMNAWAVE_VERSION: '3.2.3',
    });

    const stderrStream = child.stderr;

    if (!stderrStream) {
      throw new Error('Expected child stderr stream to be available');
    }

    const stderrChunks: string[] = [];
    stderrStream.setEncoding('utf8');
    stderrStream.on('data', (chunk) => {
      stderrChunks.push(chunk);
    });

    const stderr = await waitForStderrContains(child, 'startup');

    expect(child.exitCode).toBeNull();
    expect(child.stdout.read()?.toString() ?? '').toBe('');
    expect(stderr).toContain('startup');
    expect(stderr).toContain('stdio');
    expect(stderr).toContain('supported');
    expect(stderr).toContain('remnawave_api');
  });

  test('fails non-zero on missing token with structured redacted stderr and no stdout contamination', async () => {
    const child = startEntrypoint({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'super-secret-token',
      LOG_LEVEL: 'debug',
    });

    child.kill('SIGTERM');
    children.pop();

    const failingChild = startEntrypoint({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: '',
      LOG_LEVEL: 'debug',
    });

    const stdoutPromise = collectStream(failingChild.stdout);
    const stderrPromise = collectStream(failingChild.stderr);
    const [exitCode] = (await once(failingChild, 'exit')) as [number | null, NodeJS.Signals | null];

    const stdout = await stdoutPromise;
    const stderr = await stderrPromise;

    expect(exitCode).not.toBe(0);
    expect(stdout).toBe('');
    expect(stderr).toContain('startup_failed');
    expect(stderr).toContain('REMNAWAVE_API_TOKEN_MISSING');
    expect(stderr).toContain("category: 'config'");
    expect(stderr).not.toContain('super-secret-token');
  });

  test('fails non-zero when version gating blocks the advertised discovery surface', async () => {
    const child = startEntrypoint({
      REMNAWAVE_BASE_URL: 'https://panel.example.test',
      REMNAWAVE_API_TOKEN: 'token-value',
      REMNAWAVE_VERSION: '3.0.0',
      LOG_LEVEL: 'debug',
    });

    const stdoutPromise = collectStream(child.stdout);
    const stderrPromise = collectStream(child.stderr);
    const [exitCode] = (await once(child, 'exit')) as [number | null, NodeJS.Signals | null];

    const stdout = await stdoutPromise;
    const stderr = await stderrPromise;

    expect(exitCode).not.toBe(0);
    expect(stdout).toBe('');
    expect(stderr).toContain('startup_failed');
    expect(stderr).toContain('REMNAWAVE_VERSION_UNSUPPORTED');
    expect(stderr).toContain("category: 'version'");
  });
});
