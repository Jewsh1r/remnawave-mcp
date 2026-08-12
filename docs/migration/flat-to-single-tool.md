# Migration Guide: Flat-Tool to Single-Tool MCP

This guide documents the architectural transition from the legacy flat-tool MCP design to the current single-tool `remnawave_api` contract. It explains what changed, why it changed, and how to migrate existing usage.

## What Changed

### Before: Flat-Tool MCP (Legacy)

The legacy MCP server exposed multiple individual tools directly:

- `remnawave_users_list`
- `remnawave_users_create`
- `remnawave_nodes_list`
- `remnawave_system_stats`
- ...and many more individual tool names

Each operation was a separate MCP tool with its own schema and discovery entry.

### After: Single-Tool Contract (Current)

The current MCP server exposes **one tool only**: `remnawave_api`

All operations flow through this single tool using a three-state domain/operation/payload pattern:

1. **Discovery**: Send `domain` only → Get list of operations
2. **Describe**: Send `domain` + `operation` → Get schema and examples
3. **Execute**: Send `domain` + `operation` + `payload` → Get results

## Why It Changed

The flat-tool design had several limitations that the single-tool contract addresses:

1. **Discovery Surface Explosion**: Every new operation required a new tool name, cluttering MCP discovery
2. **Schema Fragmentation**: Each tool had its own isolated schema, making cross-cutting concerns harder
3. **Versioning Complexity**: Tool-level versioning created compatibility matrix nightmares
4. **Domain Logic Leakage**: Transport-level concerns leaked into domain semantics

The single-tool contract provides:

1. **Clean Separation**: Domain operations are grouped logically by domain (users, nodes, system, etc.)
2. **Unified Discovery**: One tool entry point with rich internal operation discovery
3. **Consistent Schema**: Shared validation, error handling, and payload patterns across all operations
4. **Simpler Versioning**: Version gating happens at the server level, not per-tool

## Migration Path

### For MCP Hosts/Clients

**Old pattern (no longer supported):**

```json
{
  "tool": "remnawave_users_create",
  "payload": {
    "username": "new-user",
    "telegramId": 123456
  }
}
```

**New pattern (required):**

```json
{
  "tool": "remnawave_api",
  "domain": "users",
  "operation": "create",
  "payload": {
    "username": "new-user",
    "telegramId": 123456,
    "expireAt": "2026-12-31T23:59:59Z"
  }
}
```

### Step-by-Step Migration

1. **Discover available domains**:
   ```json
   {
     "tool": "remnawave_api",
     "domain": "users"
   }
   ```

2. **Describe the operation you need**:
   ```json
   {
     "tool": "remnawave_api",
     "domain": "users",
     "operation": "create"
   }
   ```

3. **Execute with the described payload shape**:
   ```json
   {
     "tool": "remnawave_api",
     "domain": "users",
     "operation": "create",
     "payload": {
       "username": "new-user",
       "telegramId": 123456,
       "expireAt": "2026-12-31T23:59:59Z"
     }
   }
   ```

## Migrating from 0.1 grouped/envelope behavior to 0.2 compact v2

Version 0.2.0 is a contract-level revision. If you used 0.1.x, you need to update both operation names and response parsing.

### Operation name changes

0.1.x exposed grouped operation names that combined multiple actions under a single `domain.operation` key. 0.2.0 replaces these with atomic, individually supported operations.

| 0.1 grouped name | 0.2 atomic replacement |
|---|---|
| `users.manage_lifecycle` | `users.disable`, `users.enable`, `users.revoke_subscription` |
| `nodes.manage_maintenance` | `nodes.restart` |
| `hosts.manage_routing` | `hosts.bulk_update` |
| `profiles.manage_lifecycle` | Not yet available (absent from discovery) |

### Response envelope changes

0.1.x responses often wrapped results in enriched envelopes:

```json
// 0.1 legacy envelope (removed in 0.2)
{
  "ok": true,
  "details": {
    "result": { ... },
    "execution_eligibility": "eligible",
    "suggested_next_step": "..."
  }
}
```

0.2.0 returns direct compact payloads on success:

```json
// 0.2 direct success
{
  "stats": { "cpu": { "cores": 4 }, ... }
}
```

And compact errors on failure:

```json
// 0.2 compact error
{
  "error": {
    "code": "INVALID_PAYLOAD",
    "kind": "validation",
    "message": "Payload is missing or invalid for users.create.",
    "retryable": false,
    "issues": [
      { "field": "payload.expireAt", "code": "REQUIRED", "message": "payload.expireAt is required." }
    ]
  }
}
```

### Action items for 0.1 → 0.2 migration

1. Replace any grouped `manage_*` operation names with the equivalent atomic operations from the supported list
2. Remove parsing for `ok`, `details`, `details.result`, `suggested_next_step`, `recommended_next_operations`, and `execution_eligibility`
3. Read success results directly from the top-level response object
4. Read errors from the top-level `error` object
5. If you used `responseMode: "raw"`, verify the target operation is in the raw-allowlisted set (safe system reads only)
6. Update confirmation-gated flows to use the top-level `confirmToken` retry pattern instead of any nested confirmation object

## Compatibility Truth

### What Is NOT Available

- **Legacy multi-tool MCP discovery**: The old individual tool names are not discoverable
- **Backward-compatible tool aliases**: No shim layer exposes old tool names
- **Mixed-mode operation**: You cannot use both patterns simultaneously
- **Grouped operation names**: `users.manage_lifecycle`, `hosts.manage_routing`, `nodes.manage_maintenance`, and similar grouped names are not supported
- **Legacy envelopes**: `ok`, `result`, `details`, coaching, and execution-eligibility fields are not emitted

### What Remains Compatible

- **Semantic operation names**: The `domain.operation` identifiers (e.g., `users.create`) map to the same underlying functionality
- **Payload shapes**: Where possible, payload schemas remain similar to reduce migration friction
- **Error semantics**: Error categories and retry guidance remain consistent

### Internal Compatibility Only

Some legacy naming persists internally as implementation details:

- Registry helper function names may reference legacy tool concepts
- Internal logging may use historical operation identifiers
- Test fixtures may reference legacy patterns for historical context

These internal references do **not** constitute a published compatibility surface. They are not discoverable through MCP and should not be relied upon by callers.

## Verification

To verify you are using the single-tool contract correctly:

1. **Discovery should return only one tool**: `remnawave_api`
2. **Domain-only calls should return operation lists**: Not tool lists
3. **Execution requires all three fields**: `domain`, `operation`, and `payload`
4. **Responses are compact**: No `ok`, `details.result`, or coaching fields appear in success or error outputs

## Rollback and Support

There is no rollback path to the flat-tool design or the 0.1 grouped/envelope contract. The 0.2 compact v2 single-tool contract is the only supported MCP interface for this package.

If you encounter migration issues:

1. Check the [capability matrix](../scope/capability-matrix.md) for current operation support
2. Review the [v1 scope map](../scope/remnawave-api-v1-scope.md) for operation availability
3. Verify your payloads against the describe-operation schema

## Summary

| Aspect | Legacy (Not Supported) | 0.1 (Not Supported) | Current 0.2 (Required) |
|--------|------------------------|---------------------|------------------------|
| Discovery | Multiple tool names | Single tool `remnawave_api` | Single tool `remnawave_api` |
| Invocation | Tool-specific payloads | Domain/operation/payload | Domain/operation/payload |
| Operation names | Individual per-tool | Grouped `manage_*` names | Atomic supported names only |
| Schema | Fragmented per-tool | Unified with shared validation | Unified with shared validation |
| Success envelope | Direct per-tool | Enriched with `details.result` | Direct compact payload |
| Error envelope | Per-tool errors | Coaching/eligibility fields | Compact `error` object only |
| Versioning | Per-tool complexity | Server-level gating | Server-level gating |

The migration is complete when all callers use `remnawave_api` with the three-state pattern and compact v2 response handling documented above.
