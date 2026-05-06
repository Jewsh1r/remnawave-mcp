# Remnawave Final Backlog Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the remaining deferred `remnawave_api` backlog and admit the newly requested excluded operations using truthful single-tool contracts, explicit structural safety gates for dangerous actions, and fully synchronized docs/tests/runtime behavior.

**Architecture:** Continue the registry-driven promotion model already used for completed waves. Each wave must move as a unit across `registry.ts`, `schema.ts`, `risk.ts`, tests, server wiring, and scope docs. Read-only and bounded local/admin-safe operations should be promoted first; dangerous or mass-impact actions must use the existing tier3 confirmation/token machinery instead of being admitted as unrestricted writes.

**Tech Stack:** TypeScript, Vitest, tsup, registry-driven MCP contract, Remnawave client, tier3 confirmation safety flow.

---

### Task 1: Admit the remaining safe read/admin-safe diagnostics wave

**Files:**
- Modify: `src/remnawave-api/registry.ts`
- Modify: `src/remnawave-api/schema.ts`
- Modify: `src/remnawave-api/risk.ts`
- Modify: `src/server.ts`
- Modify: `tests/remnawave-api-router.test.ts`
- Modify: `tests/remnawave-api-contract.test.ts`
- Modify: `tests/remnawave-api-describe.test.ts`
- Modify: `tests/remnawave-api-risk.test.ts`
- Modify: `tests/remnawave-api-schema.test.ts`
- Modify: `tests/remnawave-api-scope-sync.test.ts`

**Scope:**
- `system.get_bandwidth_stats`
- `system.get_node_statistics`
- `system.generate_x25519`
- `system.debug_srr_matcher`
- `metadata.read_node`

**Step 1: Write failing tests**

Add one failing test per operation across router/contract/describe/risk/schema/scope-sync.

**Step 2: Run targeted tests to verify they fail**

Run: `npm test -- tests/remnawave-api-contract.test.ts tests/remnawave-api-router.test.ts tests/remnawave-api-describe.test.ts tests/remnawave-api-risk.test.ts tests/remnawave-api-schema.test.ts tests/remnawave-api-scope-sync.test.ts`

Expected: FAIL because the operations are still denied.

**Step 3: Write minimal implementation**

Promote only truthful existing client-backed operations. Keep result shapes minimal and avoid inventing synthetic aggregations.

**Step 4: Run targeted tests to verify they pass**

Run the same targeted suite.

---

### Task 2: Admit bounded node and metadata mutation wave

**Files:**
- Modify: `src/remnawave-api/registry.ts`
- Modify: `src/remnawave-api/schema.ts`
- Modify: `src/remnawave-api/risk.ts`
- Modify: `src/server.ts`
- Modify: `tests/remnawave-api-router.test.ts`
- Modify: `tests/remnawave-api-contract.test.ts`
- Modify: `tests/remnawave-api-describe.test.ts`
- Modify: `tests/remnawave-api-risk.test.ts`
- Modify: `tests/remnawave-api-schema.test.ts`
- Modify: `tests/remnawave-api-scope-sync.test.ts`

**Scope:**
- `metadata.manage_node`
- `nodes.manage_lifecycle`

**Step 1: Write failing tests**

Add failing tests for bounded single-node/node-metadata mutations only.

**Step 2: Run targeted tests to verify they fail**

Run the targeted node/metadata slice.

Expected: FAIL because the operations are still deferred/denied.

**Step 3: Write minimal implementation**

Use bounded single-entity contracts. Prefer explicit `action` enums for lifecycle mutations and direct single-node metadata record updates.

**Step 4: Run targeted tests to verify they pass**

Run the targeted slice again.

---

### Task 3: Admit dangerous node and plugin control wave with tier3 gates

**Files:**
- Modify: `src/remnawave-api/registry.ts`
- Modify: `src/remnawave-api/schema.ts`
- Modify: `src/remnawave-api/risk.ts`
- Modify: `src/server.ts`
- Modify: `tests/remnawave-api-router.test.ts`
- Modify: `tests/remnawave-api-contract.test.ts`
- Modify: `tests/remnawave-api-describe.test.ts`
- Modify: `tests/remnawave-api-risk.test.ts`
- Modify: `tests/remnawave-api-schema.test.ts`
- Modify: `tests/remnawave-api-scope-sync.test.ts`

**Scope:**
- `nodes.manage_maintenance`
- `node_plugins.truncate_torrent_blocker_reports`
- `node_plugins.execute_plugin_executor`

**Step 1: Write failing tests**

Add tests that assert tier3 preview/token behavior where blast radius is mass-impact or destructive.

**Step 2: Run targeted tests to verify they fail**

Run the targeted dangerous-action slice.

Expected: FAIL because operations are still denied/deferred.

**Step 3: Write minimal implementation**

Reuse the existing `buildTier3ConfirmationState(...)` flow. Do not admit these as direct tier2 writes if the operation can affect many nodes/users or erase diagnostics.

**Step 4: Run targeted tests to verify they pass**

Run the targeted slice again.

---

### Task 4: Finish remaining user/subscription/profile/template/snippet write wave

**Files:**
- Modify: `src/remnawave-api/registry.ts`
- Modify: `src/remnawave-api/schema.ts`
- Modify: `src/remnawave-api/risk.ts`
- Modify: `src/server.ts`
- Modify: `tests/remnawave-api-router.test.ts`
- Modify: `tests/remnawave-api-contract.test.ts`
- Modify: `tests/remnawave-api-describe.test.ts`
- Modify: `tests/remnawave-api-risk.test.ts`
- Modify: `tests/remnawave-api-schema.test.ts`
- Modify: `tests/remnawave-api-scope-sync.test.ts`

**Scope:**
- `users.manage_lifecycle`
- `users.manage_devices`
- `subscriptions.manage_lifecycle`
- `profiles.manage_lifecycle`
- `profiles.manage_inbounds`
- `templates.manage_subscription`
- `snippets.manage_lifecycle`

**Step 1: Write failing tests**

Add failing tests for each remaining bounded write contract.

**Step 2: Run targeted tests to verify they fail**

Run the targeted account/profile/template/snippet slice.

**Step 3: Write minimal implementation**

Promote only the exact contracts that map to existing client methods or already-proven action patterns.

**Step 4: Run targeted tests to verify they pass**

Run the targeted slice again.

---

### Task 5: Finish routing wave last

**Files:**
- Modify: `src/remnawave-api/registry.ts`
- Modify: `src/remnawave-api/schema.ts`
- Modify: `src/remnawave-api/risk.ts`
- Modify: `src/server.ts`
- Modify: `tests/remnawave-api-router.test.ts`
- Modify: `tests/remnawave-api-contract.test.ts`
- Modify: `tests/remnawave-api-describe.test.ts`
- Modify: `tests/remnawave-api-risk.test.ts`
- Modify: `tests/remnawave-api-schema.test.ts`
- Modify: `tests/remnawave-api-scope-sync.test.ts`

**Scope:**
- `routing.manage_rules`

**Step 1: Write the failing tests**

Define the smallest truthful routing contract the repo evidence supports.

**Step 2: Run the targeted tests to verify they fail**

Run the routing slice.

**Step 3: Write minimal implementation**

Admit only the bounded routing rule-management shape evidenced in the repo. If the repo only supports a narrower contract than the name suggests, keep the narrower truthful contract.

**Step 4: Run targeted tests to verify they pass**

Run the routing slice again.

---

### Task 6: Final publication and full verification

**Files:**
- Modify: `README.md`
- Modify: `docs/scope/capability-matrix.md`
- Modify: `docs/release/production-readiness.md`
- Modify: `docs/scope/remnawave-api-v1-scope.md`
- Test: `tests/task17-capability-matrix-publication.test.ts`
- Test: `tests/task20-release-readiness-consistency.test.ts`
- Test: `tests/prompt-resource-inventory.test.ts`

**Step 1: Sync documentation to the final boundary**

Update docs to reflect the final supported/deferred/denied split after all implementation waves.

**Step 2: Run doc consistency suites**

Run:
- `npm test -- tests/task17-capability-matrix-publication.test.ts`
- `npm test -- tests/task20-release-readiness-consistency.test.ts`
- `npm test -- tests/prompt-resource-inventory.test.ts`

**Step 3: Run full repository verification**

Run:
- `npm run check`
- `npm run build`
- `npm test`

Expected: all pass.
