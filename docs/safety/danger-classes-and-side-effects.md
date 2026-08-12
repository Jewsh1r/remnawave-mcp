# Danger Classes and Side-Effects Reference

This document is the authoritative reference for the Remnawave MCP danger model, side-effect classification, and confirmation gating system. It explains the runtime language that docs, tests, and the router all share.

## Overview

The Remnawave MCP uses a three-tier risk classification system to govern operation execution. Every supported operation carries a risk profile that determines whether it executes immediately or requires explicit confirmation.

## Risk Tiers

| Tier | Name | Confirmation Required | Typical Effects | Blast Radius |
|------|------|----------------------|-----------------|--------------|
| `tier1` | Safe reads | No | `read` | `single_response` |
| `tier2` | Bounded mutations | No | `create`, `update`, `delete` | `single_entity` |
| `tier3` | Dangerous operations | **Yes** (confirmation or preview/apply) | `update`, `delete`, `restart` | `mass_or_destructive` |

### Tier Semantics

**Tier 1 (Safe Reads)**
- Pure read operations that return diagnostic or inventory data
- No mutation of remote state
- Blast radius limited to a single response payload
- Examples: `system.get_stats`, `users.list`, `profiles.list`

**Tier 2 (Bounded Mutations)**
- Mutations scoped to a single entity
- No destructive fleet-wide side effects
- Executes immediately after validation passes
- Examples: `users.create`, `templates.create`, `metadata.upsert_user`

**Tier 3 (Dangerous Operations)**
- Operations that can disable connectivity, delete infrastructure state, or interrupt active traffic
- Require explicit gating before execution
- Two gating styles exist: confirmation (`confirmToken`) and preview/apply (`applyToken`)
- Confirmation examples: `nodes.restart`, `users.disable`, `users.revoke_subscription`
- Preview/apply example: `hosts.bulk_update`

## Side-Effect Classification

| Effect | Description | Typical Tier |
|--------|-------------|--------------|
| `read` | Returns data without mutation | tier1 |
| `create` | Creates a new entity | tier2 |
| `update` | Modifies existing entity | tier2 or tier3 |
| `delete` | Removes an entity | tier2 or tier3 |
| `restart` | Restarts a service or resets state | tier3 |

## Scope and Blast Radius

| Scope | Description |
|-------|-------------|
| `single_response` | Effect limited to response payload only |
| `single_entity` | Effect scoped to one identifiable entity |
| `bounded_set` | Effect scoped to a bounded collection |
| `fleet` | Effect could impact multiple entities |

| Blast Radius | Description |
|--------------|-------------|
| `single_response` | No state mutation, read-only |
| `single_entity` | One entity affected, bounded impact |
| `bounded_set` | Multiple entities in a defined set |
| `mass_or_destructive` | Wide impact or destructive consequences |

## Confirmation Gating Model

### The Preview/Confirm Flow

Tier 3 confirmation-gated operations use a two-step flow.

**Step 1: First call returns `confirmation_required`**

```json
{
  "tool": "remnawave_api",
  "domain": "nodes",
  "operation": "restart",
  "payload": {
    "uuid": "node-1"
  }
}
```

Response:

```json
{
  "error": {
    "code": "CONFIRMATION_REQUIRED",
    "kind": "confirmation_required",
    "message": "This operation requires confirmation.",
    "retryable": false,
    "token": "sha256:abc123..."
  }
}
```

**Step 2: Retry the same request with `confirmToken`**

```json
{
  "tool": "remnawave_api",
  "domain": "nodes",
  "operation": "restart",
  "payload": {
    "uuid": "node-1"
  },
  "confirmToken": "sha256:abc123..."
}
```

### Critical Implementation Details

1. **Top-Level Field**: The confirmation token is a top-level request field named `confirmToken`, not a field inside `payload`
2. **Payload Preservation**: The follow-up request must preserve the exact same validated payload from the preview
3. **Token Binding**: The token is cryptographically bound to the domain, operation, effect, scope, blast radius, and payload
4. **One-Time Use**: Each token is valid for a single confirmation attempt

The current compact v2 contract does not emit legacy `ok`, `details`, `result`, coaching, or `suggested_next_step` fields.

### How Unsupported and Deferred Differ from Supported-But-Gated

| Category | Runtime Behavior | Discovery |
|----------|------------------|-----------|
| **Supported + Tier 3** | Returns `confirmation_required` or `preview_required`; executable with valid token | Listed as supported |
| **Deferred / excluded** | Returns compact `unsupported_operation` errors on direct calls; never executable | Absent from discovery |

The key distinction: tier 3 operations are **supported and executable** after confirmation, while deferred and excluded operations are **never executable** through the MCP runtime.

### The Preview/Apply Flow

Tier 3 preview/apply operations use a two-step flow.

**Step 1: Preview call returns preview with `applyToken`**

```json
{
  "tool": "remnawave_api",
  "domain": "hosts",
  "operation": "bulk_update",
  "payload": {
    "uuids": ["11111111-1111-4111-8111-111111111111"],
    "port": 443
  }
}
```

Response:

```json
{
  "applyToken": "def456",
  "expiresAt": "2026-05-01T00:10:00.000Z",
  "changes": [
    { "target": "11111111-1111-4111-8111-111111111111", "before": { "state": { "port": 80 } }, "after": { "patch": { "port": 443 } } }
  ]
}
```

**Step 2: Apply call with `applyToken`**

```json
{
  "tool": "remnawave_api",
  "domain": "hosts",
  "operation": "bulk_update",
  "payload": {
    "applyToken": "def456"
  }
}
```

Response: execution result with direct compact payload.

### Critical Preview/Apply Details

1. **Payload Field**: The apply token is passed inside `payload.applyToken` for the apply step
2. **Payload Binding**: The preview token is bound to the exact original payload; the apply step must use the cached payload, not a new one
3. **Token Binding**: The token is cryptographically bound to the domain, operation, effect, scope, blast radius, and payload
4. **One-Time Use**: Each token is valid for a single apply attempt
5. **TTL**: Tokens expire after 10 minutes
6. **Stale-State Rejection**: Preview reads current panel state and stores a pre-state fingerprint; apply re-reads the relevant state and rejects with `APPLY_TOKEN_STALE_STATE` before any upstream write when the fingerprint changed

## Dangerous Operations Reference

### Tier 3: Confirmation Required

These operations require explicit confirmation before execution:

| Domain | Operation | Effect | Why Tier 3 |
|--------|-----------|--------|------------|
| `nodes` | `restart` | `restart` | Can interrupt active traffic and reset counters |
| `users` | `disable` | `update` | Can disable connectivity for one user |
| `users` | `revoke_subscription` | `update` | Can immediately revoke one user's access |
| `templates` | `delete` | `delete` | Removes delivery configuration state |
| `snippets` | `delete` | `delete` | Removes reusable config fragments |

### Tier 3: Preview/Apply Required

These operations require a preview/apply token before execution:

| Domain | Operation | Effect | Why Tier 3 |
|--------|-----------|--------|------------|
| `hosts` | `bulk_update` | `update` | Can affect multiple routes |
| `profiles` | `update`, `delete`, `reorder` | `update/delete` | Changes delivery profile state; preview/apply protects against stale profile state |
| `hosts` | `delete`, `reorder`, `bulk_delete`, `bulk_disable`, `bulk_enable` | `update/delete` | Changes host routing state; preview/apply protects against stale host inventory |
| `nodes` | `delete`, `reorder`, `bulk_actions`, `bulk_update`, `profile_modification` | `update/delete` | Changes node/control-plane state; preview/apply protects against stale node inventory |
| `users` | `bulk_*` operations | `bulk update/delete` | Can mutate many users; preview/apply protects against stale user inventory |
| `subscription_settings` | `update` | `update` | Changes global subscription behavior; preview/apply protects against stale settings |
| `subscription_page_configs` | `create`, `update`, `delete`, `clone`, `reorder` | `create/update/delete` | Changes subscription-page configuration; preview/apply protects against stale page-config state |
| `templates` | `reorder` | `update` | Changes template ordering; preview/apply protects against stale template inventory |
| `internal_squads`, `external_squads` | `reorder` | `update` | Changes squad order; preview/apply protects against stale squad inventory |
| `hwid` | `delete_all_devices` | `bulk delete` | Removes HWID devices; preview/apply protects against stale user/HWID inventory |

### Operation-Level Gating for Atomic Dangerous Operations

When a supported atomic operation includes destructive or service-interrupting behavior, the entire operation is tier 3 gated. This keeps the runtime contract simple and truthful.

Example: `nodes.restart` always requires tier 3 confirmation because restarting a node can interrupt active traffic.

## Denied Operations (No Truthful Runtime Seam)

These operations remain denied because no model-facing runtime seam exists:

| Domain | Operation | Why Denied |
|--------|-----------|------------|
| `node_plugins` | `execute_plugin_executor` | No truthful executor seam in single-tool runtime |
| `node_plugins` | `truncate_torrent_blocker_reports` | No truthful truncation seam in single-tool runtime |
| `ip_control` | `drop_connections` | Destructive action, no model-facing runtime seam |
| `metadata` | `manage_node` | No truthful node-write seam in model-facing client contract |
| `system` | `debug_srr_matcher` | Debug-only endpoint, not for MCP exposure |

**Important**: Lower-level client helpers may exist for some denied operations, but without injection into the MCP-facing runtime in `src/server.ts`, they remain denied at the model-facing boundary.

## Deferred Operations

These categories remain outside the current runtime contract and are not discoverable through `remnawave_api`:

| Domain | Operation | Why Deferred |
|--------|-----------|--------------|
| `routing` | control-plane rule management | No standalone routing-rule management seam is published |
| `subscriptions` | broader lifecycle mutations | Subscription settings and broader lifecycle writes remain out of scope |
| `templates` | reorder semantics | Template reorder remains deferred pending a narrower contract |
| `snippets` | reorder semantics | Snippet reorder remains deferred pending a narrower contract |

## Risk Profile Structure

Every supported operation has a risk profile with these fields:

```typescript
interface OperationRiskProfile {
  readonly tier: 'tier1' | 'tier2' | 'tier3';
  readonly effect: 'read' | 'create' | 'update' | 'delete' | 'restart';
  readonly scope: 'single_response' | 'single_entity' | 'bounded_set' | 'fleet';
  readonly blastRadius: 'single_response' | 'single_entity' | 'bounded_set' | 'mass_or_destructive';
  readonly confirmationRequired: boolean;
  readonly rationale: string;
}
```

## Source of Truth

The canonical risk profiles live in `src/remnawave-api/risk.ts`. The `SUPPORTED_OPERATION_RISK` record contains the ground truth for every supported operation's risk classification.

Tests in `tests/remnawave-api-risk.test.ts` verify that:
1. Every supported operation has exactly one risk tier
2. Tier 3 operations return `confirmation_required` without a token
3. Tier 3 operations execute only when a valid `confirmToken` is provided
4. Tier 1 and Tier 2 operations execute immediately after validation

## Safety Guarantees

1. **Fail-Closed by Default**: Unknown operations are treated as unsupported and non-executable
2. **Structural Gating**: Tier 3 confirmation is enforced by the router, not just documented
3. **Token Binding**: Confirmation tokens are cryptographically bound to the specific action
4. **No Bypass**: There is no "force" or "skip confirmation" flag in the public API
5. **Consistent Language**: The same tier/effect/scope language appears in runtime, docs, and tests

## Usage Examples

### Executing a Tier 1 Read

```json
{
  "tool": "remnawave_api",
  "domain": "system",
  "operation": "get_stats",
  "payload": {}
}
```

Executes immediately and returns a direct compact payload.

### Executing a Tier 2 Mutation

```json
{
  "tool": "remnawave_api",
  "domain": "users",
  "operation": "create",
  "payload": {
    "username": "new-user",
    "telegramId": 123456
  }
}
```

Executes immediately after validation and returns a direct compact payload.

### Executing a Tier 3 Dangerous Operation

```json
{
  "tool": "remnawave_api",
  "domain": "nodes",
  "operation": "restart",
  "payload": {
    "uuid": "node-1"
  }
}
```

Response: `confirmation_required` with token.

**Confirm:**

```json
{
  "tool": "remnawave_api",
  "domain": "nodes",
  "operation": "restart",
  "payload": {
    "uuid": "node-1"
  },
  "confirmToken": "sha256:..."
}
```

Response: execution result with direct compact payload.

## See Also

- Risk implementation: `src/remnawave-api/risk.ts`
- Router implementation: `src/remnawave-api/router.ts`
- Risk tests: `tests/remnawave-api-risk.test.ts`
- Capability matrix: `docs/scope/capability-matrix.md`
- Scope map: `docs/scope/remnawave-api-v1-scope.md`
