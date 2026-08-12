import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..');

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('task 20 release-readiness consistency', () => {
  test('keeps package metadata and published release boundary aligned', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      name: string;
      version: string;
      description: string;
      private?: boolean;
      bin: Record<string, string>;
      files: string[];
      license: string;
      scripts: Record<string, string>;
      engines: { node: string; npm: string };
    };
    const readme = readRepoFile('README.md');
    const readiness = readRepoFile('docs/release/production-readiness.md');

    expect(packageJson.name).toBe('remnawave-mcp');
    expect(packageJson.private).toBeUndefined();
    expect(packageJson.bin).toEqual({ 'remnawave-mcp': 'dist/index.js' });
    expect(packageJson.files).toEqual(['dist', 'README.md', 'LICENSE', 'NOTICE.md']);
    expect(packageJson.license).toBe('MIT');
    expect(packageJson.scripts.prepack).toBe('npm run build');
    expect(packageJson.version).toBe('0.3.0');
    expect(packageJson.engines).toEqual({
      node: '>=20.11.0',
      npm: '>=10.0.0',
    });

    for (const publishedText of [readme, readiness]) {
      expect(publishedText).toContain('3.2.3');
      expect(publishedText).toContain('remnawave_api');
    }

    expect(readme).toContain('local stdio server only');
    expect(readiness).toContain('local stdio MCP server only');
    expect(readme).toContain('- Package name: `remnawave-mcp`');
    expect(readme).toContain('npm install -g remnawave-mcp');
    expect(readme).toContain('The package `bin` entry maps `remnawave-mcp` to `dist/index.js`.');
    expect(readme).toContain('- Server version: `0.3.0`');
    expect(readme).toContain('These operations are currently `supported` and executable');
    expect(readme).toContain('system.get_stats');
    expect(readme).toContain('users.create');
  });

  test('anchors final readiness claims to single-tool MVP boundary', () => {
    const readme = readRepoFile('README.md');
    const matrix = readRepoFile('docs/scope/capability-matrix.md');
    const readiness = readRepoFile('docs/release/production-readiness.md');

    expect(readiness).toContain('local stdio runtime only');
    expect(readiness).toContain('Remnawave `3.2.3`');
    expect(readiness).toContain('single-tool contract');
    expect(readiness).toContain('remnawave_api');
    expect(readiness).toContain('Any broader release claim would overstate the verified implementation.');

    expect(readme).toContain('Only `remnawave_api` is exposed through MCP');
    expect(matrix).toContain('Do not read this matrix as endpoint coverage or as a claim that all OpenAPI paths are supported.');
    expect(readiness).toContain('This is a capability boundary, not an endpoint inventory.');

    expect(readiness).not.toContain('remote-hosted MCP service');
    expect(readiness).not.toContain('Docker image');
    expect(readiness).not.toContain('all OpenAPI paths are supported');
  });
});
