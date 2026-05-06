import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { buildRemnawaveApiToolDiscoveryDescription } from '../src/remnawave-api/contract.js';

const repoRoot = path.resolve(import.meta.dirname, '..');

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('docs consistency for 0.2.0 compact v2 contract', () => {
  const readme = readRepoFile('README.md');
  const migration = readRepoFile('docs/migration/flat-to-single-tool.md');
  const readiness = readRepoFile('docs/release/production-readiness.md');
  const matrix = readRepoFile('docs/scope/capability-matrix.md');
  const scopeDoc = readRepoFile('docs/scope/remnawave-api-v1-scope.md');
  const safetyDoc = readRepoFile('docs/safety/danger-classes-and-side-effects.md');
  const skillBoundary = readRepoFile('docs/architecture/mcp-skill-boundary.md');
  const actionRegistry = readRepoFile('docs/panel/action-registry.md');
  const workflowContract = readRepoFile('docs/contracts/priority-workflow-contract.md');
  const packageJson = JSON.parse(readRepoFile('package.json')) as { version: string };

  test('package version is 0.2.0', () => {
    expect(packageJson.version).toBe('0.2.0');
  });

  test('README and release docs contain version 0.2.0', () => {
    expect(readme).toContain('0.2.0');
    expect(readiness).toContain('0.2.0');
  });

  test('README documents compact v2 contract elements', () => {
    expect(readme).toContain('compact v2');
    expect(readme).toContain('Compact errors');
    expect(readme).toContain('responseMode');
    expect(readme).toContain('raw policy');
    expect(readme).toContain('preview/apply');
    expect(readme).toContain('confirmToken');
    expect(readme).toContain('applyToken');
    expect(readme).toContain('2.7.0');
    expect(readme).toContain('2.7.4');
    expect(readme).toContain('unsupported-operation errors');
    expect(readme).toContain('absent from discovery');
  });

  test('README examples match tested compact success and error fixtures', () => {
    expect(readme).toContain('"stats":');
    expect(readme).toContain('"error":');
    expect(readme).toContain('"code": "INVALID_PAYLOAD"');
    expect(readme).toContain('"kind": "validation"');
    expect(readme).toContain('"retryable": false');
  });

  test('README does not mention stale runtime-discoverable denied/deferred behavior', () => {
    const beforeMigration = readme.split('## Migration from 0.1')[0] ?? readme;
    expect(beforeMigration).not.toContain('2.8.x');
    expect(beforeMigration).not.toContain('2.8.');
  });

  test('migration guide covers 0.1 to 0.2 transition', () => {
    expect(migration).toContain('0.1');
    expect(migration).toContain('0.2');
    expect(migration).toContain('compact v2');
    expect(migration).toContain('grouped operation names');
    expect(migration).toContain('Legacy envelopes');
    expect(migration).toContain('direct compact payloads');
    expect(migration).toContain('confirmToken');
  });

  test('migration guide does not claim deferred/denied are runtime-discoverable', () => {
    expect(migration).not.toContain('deferred');
    expect(migration).not.toContain('denied');
    expect(migration).not.toContain('2.8.x');
    expect(migration).not.toContain('2.8.');
  });

  test('release readiness aligns with compact v2 and version gate', () => {
    expect(readiness).toContain('0.2.0');
    expect(readiness).toContain('2.7.0');
    expect(readiness).toContain('2.7.4');
    expect(readiness).toContain('compact v2');
    expect(readiness).toContain('absent from runtime discovery');
    expect(readiness).toContain('compact unsupported-operation errors');
    expect(readiness).not.toContain('2.8.x');
    expect(readiness).not.toContain('2.8.');
    expect(readiness).not.toContain('deferred domains are documented');
    expect(readiness).not.toContain('visible in discovery');
    expect(readiness).not.toContain('Server version: `0.1.0`');
    expect(readiness).not.toContain('2.7.4 only');
  });

  test('capability matrix does not claim deferred or excluded ops are runtime-discoverable', () => {
    expect(matrix).not.toContain('visible in discovery');
    expect(matrix).not.toContain('visible through discovery');
    expect(matrix).not.toContain('runtime-discoverable');
    expect(matrix).not.toContain('system.generate_x25519');
    expect(matrix).not.toContain('hosts.manage_routing');
    expect(matrix).not.toContain('2.7.4 only');
  });

  test('v1 scope doc does not claim deferred or excluded ops are runtime-discoverable', () => {
    expect(scopeDoc).not.toContain('visible in discovery');
    expect(scopeDoc).not.toContain('visible through discovery');
    expect(scopeDoc).not.toContain('runtime-discoverable');
    expect(scopeDoc).not.toContain('system.generate_x25519');
    expect(scopeDoc).not.toContain('hosts.manage_routing');
    expect(scopeDoc).not.toContain('nodes.manage_lifecycle');
    expect(scopeDoc).not.toContain('nodes.manage_maintenance');
    expect(scopeDoc).not.toContain('2.7.4 only');
  });

  test('v1 scope doc does not contradict public_subscriptions support status', () => {
    expect(scopeDoc).toContain('public_subscriptions.get_info');
    expect(scopeDoc).toContain('public_subscriptions.get');
    expect(scopeDoc).toContain('public_subscriptions.get_by_client_type');
    const exclusionSentence = scopeDoc.split('Domains such as')[1]?.split('.')[0] ?? '';
    expect(exclusionSentence).not.toContain('public_subscriptions');
    expect(scopeDoc).not.toContain('public_subscriptions is excluded from runtime discovery');
  });

  test('non-migration docs do not reference suggested_next_step as current behavior', () => {
    for (const text of [readme, skillBoundary, safetyDoc, matrix, scopeDoc, readiness, actionRegistry]) {
      const checkText = text === readme ? (readme.split('## Migration from 0.1')[0] ?? readme) : text === readiness ? (readiness.split('## Migration and compatibility')[0] ?? readiness) : text;
      if (text === skillBoundary || text === safetyDoc) {
        expect(checkText).toContain('suggested_next_step');
        continue;
      }
      expect(checkText).not.toContain('suggested_next_step');
    }
  });

  test('non-migration docs do not use legacy ok/details envelopes as current contract examples', () => {
    for (const text of [readme, safetyDoc, skillBoundary, matrix, scopeDoc, readiness, actionRegistry]) {
      if (text === migration) continue;
      expect(text).not.toContain('"ok":');
      expect(text).not.toContain('"details":');
    }
  });

  test('non-migration docs do not claim grouped manage_* node operations are current', () => {
    for (const text of [readme, safetyDoc, skillBoundary, matrix, scopeDoc, readiness, actionRegistry]) {
      const checkText = text === readme ? (readme.split('## Migration from 0.1')[0] ?? readme) : text === readiness ? (readiness.split('## Migration and compatibility')[0] ?? readiness) : text;
      expect(checkText).not.toContain('nodes.manage_lifecycle');
      expect(checkText).not.toContain('nodes.manage_maintenance');
    }
  });

  test('safety doc uses compact confirmation examples and absence-from-discovery wording', () => {
    expect(safetyDoc).toContain('"code": "CONFIRMATION_REQUIRED"');
    expect(safetyDoc).toContain('compact v2 contract does not emit legacy `ok`, `details`, `result`, coaching, or `suggested_next_step` fields');
    expect(safetyDoc).toContain('Absent from discovery');
    expect(safetyDoc).not.toContain('"ok": false');
    expect(safetyDoc).not.toContain('"details": {');
  });

  test('action registry marks itself as planning inventory and keeps node runtime wording atomic', () => {
    expect(actionRegistry).toContain('Historical note: this document is a planning inventory, not the current runtime contract.');
    expect(actionRegistry).toContain('| nodes | Node restart control | `nodes.restart` | atomic | high | supported | required | none | 2.7.4-verified-surface |');
    expect(actionRegistry).not.toContain('`nodes.manage_lifecycle`');
    expect(actionRegistry).not.toContain('`nodes.manage_maintenance`');
  });
  test('action registry does not claim excluded node_plugins surfaces are supported', () => {
    expect(actionRegistry).not.toContain('node_plugins.get_torrent_blocker_reports');
    expect(actionRegistry).not.toContain('node_plugins.get_torrent_blocker_stats');
    expect(actionRegistry).not.toContain('Torrent-blocker reporting remains supported through `node_plugins');
  });

  test('action registry does not claim template CRUD is deferred', () => {
    expect(actionRegistry).not.toContain('`templates.manage_subscription`');
    expect(actionRegistry).not.toContain('Create/update/delete/reorder semantics remain deferred');
    expect(actionRegistry).toContain('| templates | Subscription template delete | `templates.delete` | atomic | high | supported | required | none | 2.7.4-verified-surface |');
  });

  test('action registry does not claim snippet CRUD is deferred', () => {
    expect(actionRegistry).not.toContain('`snippets.manage_lifecycle`');
    expect(actionRegistry).not.toContain('Snippet create/update/delete behavior remains deferred');
    expect(actionRegistry).toContain('| snippets | Snippet delete | `snippets.delete` | atomic | high | supported | required | none | 2.7.4-verified-surface |');
  });



  test('priority workflow contract does not publish planning-only seams as current runtime support', () => {
    expect(workflowContract).toContain('It is not the runtime support contract');
    expect(workflowContract).toContain('`hosts.bulk_set_port` supports only bounded host port updates');
    expect(workflowContract).not.toContain('`hosts.manage_routing`');
    expect(workflowContract).not.toContain('`templates.inspect`');
    expect(workflowContract).not.toContain('`subscription_page.manage_configuration`');
    expect(workflowContract).not.toContain('`templates.manage_subscription`');
    expect(workflowContract).not.toContain('`snippets.manage_lifecycle`');
    expect(workflowContract).not.toContain('Current `external_squads.');
    expect(workflowContract).not.toContain('current `external_squads.');
    expect(workflowContract).toContain('No external squad operation is currently executable');
    expect(workflowContract).toContain('The current single-tool MCP contract supports atomic template CRUD and atomic snippet CRUD');
  });

  test('release readiness does not overclaim infra billing, inbound attachment, or stale grouped template snippet names', () => {
    const readinessBeforeMigration = readiness.split('## Migration and compatibility')[0] ?? readiness;
    expect(readinessBeforeMigration).toContain('Infra-billing provider, node, mutation, and history workflows');
    expect(readinessBeforeMigration).toContain('`hosts.bulk_set_port` covers bounded host port changes only');
    expect(readinessBeforeMigration).not.toContain('currently supported provider/node mutation and history inspect boundary');
    expect(readinessBeforeMigration).not.toContain('inbound attachment');
    expect(readinessBeforeMigration).not.toContain('templates.manage_subscription');
    expect(readinessBeforeMigration).not.toContain('snippets.manage_lifecycle');
  });

  test('v1 scope create-user example includes required expireAt', () => {
    const createUserExample = scopeDoc.split('### Example: Creating a user')[1]?.split('## PRD Domain Coverage')[0] ?? '';
    expect(createUserExample).toContain('"expireAt": "2026-12-31T23:59:59Z"');
  });

  test('capability matrix says template and snippet CRUD are supported while only broader workflows are deferred', () => {
    expect(matrix).toContain('Template list/read/create/update/delete are supported; template reorder and broader delivery workflows are deferred.');
    expect(matrix).toContain('Snippet inventory and CRUD are supported; snippet reorder and broader composite workflows are deferred.');
    expect(matrix).not.toContain('Template inspection and CRUD are supported; mutations deferred.');
    expect(matrix).not.toContain('Snippet inventory and CRUD are supported; lifecycle deferred.');
  });

  test('current runtime docs reference nodes.restart as the supported node operation', () => {
    expect(scopeDoc).toContain('nodes.restart');
    expect(safetyDoc).toContain('nodes.restart');
    expect(actionRegistry).toContain('nodes.restart');
  });

  test('docs do not claim 2.8.x support anywhere', () => {
    for (const text of [readme, migration, readiness]) {
      expect(text).not.toContain('2.8.x');
      expect(text).not.toContain('2.8.0');
      expect(text).not.toContain('2.8.1');
      expect(text).not.toContain('2.8.2');
      expect(text).not.toContain('2.8.3');
      expect(text).not.toContain('2.8.4');
    }
  });
  test('docs do not use legacy compact error kind names', () => {
    for (const text of [readme, safetyDoc, skillBoundary, matrix, scopeDoc, readiness, actionRegistry]) {
      expect(text).not.toContain('validation_error');
      expect(text).not.toContain('upstream_error');
      expect(text).not.toContain('internal_error');
    }
  });

  test('safety doc does not list hosts.bulk_set_port as confirmation-gated', () => {
    const confirmationSection = safetyDoc.split('### Tier 3: Confirmation Required')[1]?.split('### Tier 3: Preview/Apply Required')[0] ?? '';
    expect(confirmationSection).not.toContain('hosts.bulk_set_port');
  });

  test('current runtime docs and source do not use stale v1 contract wording', () => {
    const currentRuntimeTexts = [
      readme.split('## Migration from 0.1')[0] ?? readme,
      readiness.split('## Migration and compatibility')[0] ?? readiness,
      matrix,
      scopeDoc,
      safetyDoc,
      skillBoundary,
      actionRegistry,
      readRepoFile('src/remnawave-api/contract.ts'),
      buildRemnawaveApiToolDiscoveryDescription(),
    ];

    for (const text of currentRuntimeTexts) {
      expect(text).not.toContain('v1 contract');
      expect(text).not.toContain('MCP v1 contract');
    }
    expect(buildRemnawaveApiToolDiscoveryDescription()).toContain('compact v2 single-tool contract');
    expect(actionRegistry).toContain('current compact v2 single-tool runtime contract');
  });
});
