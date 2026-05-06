# Remnawave PRD Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring `mcp-remnawave` to the PRD-defined full single-tool control-plane boundary with truthful docs, tests, safety behavior, and runtime execution.

**Architecture:** Keep `remnawave_api` as the only model-facing primary tool and promote deferred operations into `supported` by reusing existing stable-core implementations and client methods. Each promotion wave must update the registry/schema/risk/docs/tests together so discovery, describe, execute, compatibility, and stable-core behavior stay aligned.

**Tech Stack:** TypeScript, Vitest, tsup, registry-driven MCP contract, stable-core tool layer, Remnawave client normalizers.

---

### Task 1: Freeze the current verified baseline in docs

**Files:**
- Modify: `docs/scope/remnawave-api-v1-scope.md`
- Modify: `docs/release/production-readiness.md`
- Test: `tests/remnawave-api-scope-sync.test.ts`

**Step 1: Write the failing doc-consistency expectation**

Add or update expectations so the docs stop describing the current state as a curated MVP when the code is already on the PRD-completion path.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/remnawave-api-scope-sync.test.ts`
Expected: FAIL if scope docs drift from the registry snapshot.

**Step 3: Write minimal documentation update**

Document the current supported baseline truthfully:
- `system.get_stats`
- `system.get_health`
- `system.get_metrics`
- `system.get_recap`
- `system.get_request_history`
- `users.create_user`

Also state that this file is a current-state boundary snapshot, not the final PRD completion claim.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/remnawave-api-scope-sync.test.ts`
Expected: PASS

---

### Task 2: Promote the user/subscription investigation read wave

**Files:**
- Modify: `src/remnawave-api/schema.ts`
- Modify: `src/remnawave-api/risk.ts`
- Modify: `src/remnawave-api/registry.ts`
- Modify: `tests/remnawave-api-router.test.ts`
- Modify: `tests/remnawave-api-contract.test.ts`
- Modify: `tests/remnawave-api-risk.test.ts`
- Modify: `tests/mcp-skill-boundary.test.ts`

**Step 1: Write failing tests for read-wave execution**

Add one failing execution test per operation:
- `users.list`
- `users.resolve`
- `users.inspect`
- `users.get_subscription_history`
- `subscriptions.list`
- `subscriptions.inspect_support_context`
- `subscriptions.inspect_page_delivery`

Each test should assert:
- discovery shows `supported`
- describe returns a compact contract
- execute returns the semantic stable-core-shaped result

**Step 2: Run targeted tests to verify they fail**

Run: `npm test -- tests/remnawave-api-router.test.ts`
Expected: FAIL on the newly added cases because the registry still marks them deferred.

**Step 3: Write minimal implementation**

Promote those operations from `deferred` to `supported` in `src/remnawave-api/registry.ts`, reusing the already-existing client/stable-core behavior:
- `getUsers`
- `resolveUser`
- `getSubscriptions`
- `getUserSubscriptionRequestHistory`
- `getUserHwidDevices`
- `getNodes`

Add only the schema and risk metadata needed for these operations in `schema.ts` and `risk.ts`.

**Step 4: Run targeted tests to verify they pass**

Run:
- `npm test -- tests/remnawave-api-router.test.ts`
- `npm test -- tests/remnawave-api-contract.test.ts`
- `npm test -- tests/remnawave-api-risk.test.ts`
- `npm test -- tests/mcp-skill-boundary.test.ts`

Expected: PASS

---

### Task 3: Promote the subscription settings/admin read-write wave

**Files:**
- Modify: `src/remnawave-api/schema.ts`
- Modify: `src/remnawave-api/risk.ts`
- Modify: `src/remnawave-api/registry.ts`
- Modify: `tests/remnawave-api-router.test.ts`
- Modify: `tests/remnawave-api-contract.test.ts`

**Step 1: Write failing tests**

Cover:
- `subscriptions.inspect_global_settings`
- `subscriptions.manage_global_settings`
- `templates.inspect`
- `subscription_page.manage_configuration`
- `snippets.list`

For writes, assert structured risk metadata and successful execution when payload is valid.

**Step 2: Run targeted tests to verify they fail**

Run: `npm test -- tests/remnawave-api-router.test.ts`
Expected: FAIL on newly added operations.

**Step 3: Write minimal implementation**

Promote these operations by reusing existing client methods and stable-core semantics:
- `getSubscriptionPolicySettings`
- `updateSubscriptionPolicySettings`
- `getSubscriptionTemplateByUuid`
- `patchSubscriptionPageConfig`
- `listSnippets`

Do not add new product surface beyond the PRD list.

**Step 4: Run targeted tests to verify they pass**

Run the targeted suites again.
Expected: PASS

---

### Task 4: Promote hosts, profiles, routing, and squads

**Files:**
- Modify: `src/remnawave-api/schema.ts`
- Modify: `src/remnawave-api/risk.ts`
- Modify: `src/remnawave-api/registry.ts`
- Modify: `tests/remnawave-api-router.test.ts`
- Modify: `tests/remnawave-api-contract.test.ts`

**Step 1: Write failing tests**

Cover:
- `profiles.list`
- `profiles.inspect`
- `profiles.inspect_computed`
- `profiles.list_inbounds`
- `profiles.manage_lifecycle`
- `profiles.manage_inbounds`
- `routing.manage_rules`
- `hosts.list`
- `hosts.inspect`
- `hosts.export_detailed`
- `hosts.manage_definition`
- `internal_squads.list`
- `internal_squads.inspect_access`
- `internal_squads.manage_membership`
- `internal_squads.manage_definition`
- `external_squads.list`
- `external_squads.inspect_delivery`
- `external_squads.manage_membership`
- `external_squads.manage_definition`

**Step 2: Run targeted tests to verify they fail**

Run the relevant router/contract tests.

**Step 3: Write minimal implementation**

Promote these operations in bounded groups while preserving the PRD risk model:
- reads as tier1
- routine bounded writes as tier2

Use the existing stable-core mutation/read handlers as the behavioral reference.

**Step 4: Run targeted tests to verify they pass**

Run the targeted suites again.
Expected: PASS

---

### Task 5: Promote nodes, plugins, infra billing, metadata, and IP-control jobs

**Files:**
- Modify: `src/remnawave-api/schema.ts`
- Modify: `src/remnawave-api/risk.ts`
- Modify: `src/remnawave-api/registry.ts`
- Modify: `tests/remnawave-api-router.test.ts`
- Modify: `tests/remnawave-api-contract.test.ts`

**Step 1: Write failing tests**

Cover:
- `nodes.list`
- `nodes.inspect`
- `nodes.investigate`
- `nodes.manage_lifecycle`
- `nodes.manage_maintenance`
- `node_plugins.list`
- `node_plugins.inspect`
- `node_plugins.manage_configuration`
- `node_plugins.get_torrent_blocker_reports`
- `node_plugins.get_torrent_blocker_stats`
- `infra_billing.list_providers`
- `infra_billing.inspect_provider`
- `infra_billing.manage_provider`
- `infra_billing.list_nodes`
- `infra_billing.inspect_node`
- `infra_billing.manage_node`
- `infra_billing.list_history`
- `infra_billing.inspect_history`
- `metadata.read_user`
- `metadata.manage_user`
- `ip_control.submit_user_fetch_job`
- `ip_control.submit_node_fetch_job`
- `ip_control.inspect_job`

**Step 2: Run targeted tests to verify they fail**

Run the router/contract tests.

**Step 3: Write minimal implementation**

Promote only PRD-included admin-safe operations. Preserve explicit denials for:
- `ip_control.drop_connections`
- `node_plugins.execute_plugin_executor`
- `node_plugins.truncate_torrent_blocker_reports`
- node metadata operations

**Step 4: Run targeted tests to verify they pass**

Run the targeted suites again.
Expected: PASS

---

### Task 6: Reconcile capability matrix, README, migration docs, and skill boundary

**Files:**
- Modify: `README.md`
- Modify: `docs/scope/capability-matrix.md`
- Modify: `docs/release/production-readiness.md`
- Modify: `docs/scope/remnawave-api-v1-scope.md`
- Modify: operator skill docs if they still describe the old boundary
- Test: `tests/task17-capability-matrix-publication.test.ts`
- Test: `tests/task20-release-readiness-consistency.test.ts`
- Test: `tests/prompt-resource-inventory.test.ts`

**Step 1: Write the failing consistency expectation**

Add or update tests so docs must describe the actual full support boundary and exclusions.

**Step 2: Run tests to verify they fail**

Run the three doc-consistency suites.

**Step 3: Write minimal documentation update**

Ensure the docs explicitly say:
- one main tool: `remnawave_api`
- full supported admin-facing boundary
- explicit exclusions remain excluded
- no misleading endpoint-parity claims
- dangerous actions are structurally gated

**Step 4: Run tests to verify they pass**

Run the three doc-consistency suites again.

---

### Task 7: Final full verification and manual QA

**Files:**
- No new files required unless a manual QA note is needed in release docs.

**Step 1: Run full automated verification**

Run:
- `npm test`
- `npm run check`
- `npm run build`

Expected: all pass.

**Step 2: Execute manual QA for the actual feature**

Run real end-to-end calls against the local MCP contract using representative cases:
- domain discovery (`domain` only)
- describe (`domain + operation`)
- successful safe execution (`domain + operation + payload`)
- structured validation failure
- structured denied/dangerous-action block

Capture and review the actual output.

**Step 3: Verify release criteria against the PRD**

Check that all of the following are true:
- single-tool UX works end-to-end
- full target support boundary is implemented
- docs/tests/runtime agree
- dangerous actions are structurally gated
- excluded surfaces remain excluded
- no misleading support claims remain

**Step 4: Commit**

Commit only after the full verification and manual QA evidence are complete.
