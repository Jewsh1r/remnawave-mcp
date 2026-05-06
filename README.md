# mcp-remnawave

`mcp-remnawave` is a private MCP server that exposes the Remnawave panel surface through a single unified tool interface. The published support promise is narrow and explicit: one MCP tool, strict version gating, and only the registry-backed operations marked `supported` are executable.

## Current status

- Package name: `@indiebrothers/mcp-remnawave`
- Server version: `0.2.0`
- MCP protocol version: `2025-06-18`
- Runtime model: local stdio server only
- Built entrypoint: `dist/index.js`
- Supported Remnawave version gate: `2.7.0` through `2.7.4`
- Unsupported or unknown Remnawave versions: startup fails before discovery is advertised

## Quickstart: Using the single-tool API

The MCP server exposes **one** tool: `remnawave_api`. All operations flow through this tool using a three-state pattern:

### Three-state calling pattern

| State | What you send | What you get back |
|-------|---------------|-------------------|
| **Discovery** | `domain` only | List of operations available in that domain |
| **Describe** | `domain` + `operation` | Schema, validation rules, and payload example |
| **Execute** | `domain` + `operation` + `payload` | Execution result or validation error |

### Example: Complete workflow

**Step 1 - Discover operations in a domain:**

```json
{
  "domain": "system"
}
```

Returns supported operations like `get_stats` with disposition and risk tier.

**Step 2 - Describe a specific operation:**

```json
{
  "domain": "system",
  "operation": "get_stats"
}
```

Returns schema summary, validation rules, and a payload example.

**Step 3 - Execute with payload:**

```json
{
  "domain": "system",
  "operation": "get_stats",
  "payload": {}
}
```

Returns the panel statistics directly:

```json
{
  "stats": {
    "cpu": { "cores": 4 },
    "memory": { "totalBytes": 10, "freeBytes": 4, "usedBytes": 6 },
    "uptimeSeconds": 120,
    "users": { "total": 8, "active": 6, "disabled": 1, "limited": 1, "expired": 0 }
  }
}
```

### Domain/operation naming

- Domain: semantic area like `system`, `users`, `nodes`, `hosts`
- Operation: action like `get_stats`, `create`, `list`
- Full identifier: `domain.operation` (for example, `system.get_stats`)

### Currently executable operations

Runtime discovery is supported-only. It lists only operations that are registered, validated, safety-classified, OpenAPI-bound, and executable through the runtime adapter. Excluded and not-yet-implemented OpenAPI surfaces are not discoverable at runtime, and direct calls to them return compact unsupported-operation errors.

These operations are currently `supported` and executable. The runtime exposes 148 supported operations across 18 domains. Use domain-only discovery to retrieve the authoritative operation list for a domain. Representative supported operations include:

- `system.get_metadata`, `system.get_stats`, `system.get_health`, `system.get_nodes_metrics`, `system.get_recap`, `system.get_bandwidth_stats`, `system.get_node_statistics`
- `users.list`, `users.create`, `users.get`, `users.update`, lookup reads such as `users.get_by_username`, single-user lifecycle actions, and bulk preview/apply actions such as `users.bulk_update`
- `hosts.list`, `hosts.get`, `hosts.create`, `hosts.update`, `hosts.bulk_set_port`, and other guarded bulk host actions
- `nodes.list`, `nodes.get`, `nodes.create`, `nodes.update`, `nodes.restart`, `nodes.restart_all`, and guarded node bulk/profile actions
- `profiles.list`, `profiles.get`, `profiles.get_computed`, `profiles.list_inbounds`, `profiles.create`, `profiles.update`, `profiles.delete`, and `profiles.reorder`
- `metadata.get_node`, `metadata.upsert_node`, `metadata.get_user`, `metadata.upsert_user`
- `templates.list`, `templates.get`, `templates.create`, `templates.update`, `templates.delete`, `templates.reorder`
- `snippets.list`, `snippets.create`, `snippets.update`, `snippets.delete`
- public and protected subscription reads, subscription page configs/settings, bandwidth stats, HWID reads/actions, infra billing, internal squads, and external squads

### Supported domains for discovery

The runtime discovery surface includes only domains that currently contain supported executable operations:

- `system`
- `users`
- `hosts`
- `nodes`
- `metadata`
- `templates`
- `snippets`
- `public_subscriptions`
- `subscriptions`
- `subscription_request_history`
- `profiles`
- `bandwidth_stats`
- `external_squads`
- `hwid`
- `infra_billing`
- `internal_squads`
- `subscription_page_configs`
- `subscription_settings`

Excluded surfaces are intentionally absent from discovery, including `auth`, `tokens`, `ip_control`, `node_plugins`, `remnawave_settings`, `keygen`, and dangerous/internal system helpers such as x25519, HAPP encryption, and SRR matcher endpoints.

### Response mode and raw policy

You can request raw upstream responses for safe system reads by adding `responseMode: "raw"` to the execution request. Only operations explicitly allowlisted as `rawAllowed` support this mode.

**Raw is allowed for:**
- Safe system reads such as `system.get_stats`, `system.get_health`, `system.get_metadata`

**Raw is rejected before execution for:**
- User-sensitive reads such as `users.get`
- Public subscription reads such as `public_subscriptions.get_info`
- Protected subscription reads such as `subscriptions.get_by_short_uuid` and request-history reads such as `subscription_request_history.list`
- All writes, preview/apply operations, and confirmation-gated actions

When raw is denied, the server returns a compact validation error:

```json
{
  "error": {
    "code": "RAW_RESPONSE_NOT_ALLOWED",
    "kind": "validation",
    "message": "Raw response mode is not allowed for this operation.",
    "retryable": false
  }
}
```

### Safety modes

Every supported operation has a safety mode that determines how it executes:

**Direct** - Executes immediately with no extra gate. Most reads and safe writes use this mode.

**Confirmation** - Returns a `confirmation_required` error with a `confirmToken` on the first call. Retry the same request with the token to execute. Used for destructive actions such as `users.revoke_subscription`, `templates.delete`, `snippets.delete`, and `nodes.restart`.

```json
// First call
{
  "domain": "users",
  "operation": "revoke_subscription",
  "payload": { "uuid": "user-1" }
}
// Response
{
  "error": {
    "code": "CONFIRMATION_REQUIRED",
    "kind": "confirmation_required",
    "message": "This operation requires confirmation.",
    "retryable": false,
    "token": "abc123"
  }
}

// Retry with token
{
  "domain": "users",
  "operation": "revoke_subscription",
  "payload": { "uuid": "user-1" },
  "confirmToken": "abc123"
}
// Response
{
  "updated": { "uuid": "user-1", "revoked": true }
}
```

**Preview/Apply** - Returns a preview with an `applyToken` on the first call. Retry with the token to apply the change. Used for guarded tier3 write operations such as host, user, node, profile, squad, subscription-settings, subscription-page-config, and template reorder/bulk actions. The preview reads current panel state, stores a pre-state fingerprint, and apply re-reads the same state before writing; stale state rejects before any upstream mutation. Tokens are single-use, bound to the original payload, and expire after 10 minutes.

```json
// Preview call
{
  "domain": "hosts",
  "operation": "bulk_set_port",
  "payload": { "hostUuids": ["host-1"], "port": 443 }
}
// Response
{
  "applyToken": "def456",
  "expiresAt": 1715432100000,
  "changes": [
    { "target": "host-1", "before": { "port": 80 }, "after": { "port": 443 } }
  ]
}

// Apply call
{
  "domain": "hosts",
  "operation": "bulk_set_port",
  "payload": { "applyToken": "def456" }
}
// Response
{
  "updated": { "hostUuids": ["host-1"], "port": 443, "updated": true }
}
```

### Compact errors

All errors use a single compact envelope. There are no legacy `ok`, `result`, `details`, coaching, or execution-eligibility fields.

```json
{
  "error": {
    "code": "INVALID_PAYLOAD",
    "kind": "validation",
    "message": "Payload is missing or invalid for users.create.",
    "retryable": false,
    "issues": [
      { "field": "payload.expireAt", "code": "REQUIRED", "message": "payload.expireAt is required." },
      { "field": "payload.username", "code": "MIN_LENGTH", "message": "payload.username must be at least 3 characters long." }
    ]
  }
}
```

Error kinds include:
- `validation` - Invalid payload, missing fields, or type mismatches
- `unsupported_operation` - Domain or operation is not supported or not discoverable
- `confirmation_required` - Destructive action needs an explicit confirmation token
- `preview_required` - Preview/apply operation needs a valid apply token
- `upstream` - Remnawave panel returned an error
- `internal` - Unexpected server error

### Minimal single-tool examples

Discovery for the `users` domain:

```json
{
  "domain": "users"
}
```

Describe `users.create` before execution:

```json
{
  "domain": "users",
  "operation": "create"
}
```

Execute `users.create` with a complete payload:

```json
{
  "domain": "users",
  "operation": "create",
  "payload": {
    "username": "new-user",
    "telegramId": 123456,
    "expireAt": "2026-12-31T23:59:59Z"
  }
}
```

Read current system stats:

```json
{
  "domain": "system",
  "operation": "get_stats",
  "payload": {}
}
```

## Requirements

- Node.js `>=20.11.0`
- npm `>=10.0.0`
- A reachable Remnawave panel base URL
- A valid Remnawave API token

## Installation

```bash
npm install
npm run build
```

The package `bin` entry maps `mcp-remnawave` to `dist/index.js`.

## Runtime model and compatibility policy

This project ships as a local stdio server. `stdout` is reserved for MCP protocol traffic, startup diagnostics go to `stderr`, and version gating happens before tools are advertised.

Compatibility is intentionally strict:

- supported now: `2.7.0` through `2.7.4`
- unsupported explicit versions: fail with `REMNAWAVE_VERSION_UNSUPPORTED`
- missing or unknown versions: fail with `REMNAWAVE_VERSION_UNKNOWN`

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `REMNAWAVE_BASE_URL` | yes | Base URL for the Remnawave panel API |
| `REMNAWAVE_API_TOKEN` | yes | API token used for Remnawave requests |
| `REMNAWAVE_VERSION` | recommended | Explicit Remnawave version gate. Versions `2.7.0` through `2.7.4` are supported |
| `LOG_LEVEL` | no | One of `debug`, `info`, `warn`, `error`. Defaults to `info` |

Example:

```bash
export REMNAWAVE_BASE_URL="https://panel.example.test"
export REMNAWAVE_API_TOKEN="replace-with-real-token"
export REMNAWAVE_VERSION="2.7.4"
export LOG_LEVEL="info"
```

## Running the server locally

```bash
REMNAWAVE_BASE_URL="https://panel.example.test" \
REMNAWAVE_API_TOKEN="replace-with-real-token" \
REMNAWAVE_VERSION="2.7.4" \
node dist/index.js
```

Important runtime behavior:

- `stdout` is reserved for MCP protocol traffic only
- Startup diagnostics and errors are written to `stderr` only
- The process keeps `stdin` open and exits cleanly when the host closes it
- If version gating fails, the server exits non-zero before exposing tools
- Only `remnawave_api` is exposed through MCP

## Migration from 0.1 grouped/envelope behavior to 0.2 compact v2

Version 0.2.0 replaces the legacy grouped operation names and enriched response envelopes with a compact, direct contract.

### What changed in 0.2.0

**Removed in 0.2.0:**
- Grouped operation names such as `users.manage_lifecycle`, `hosts.manage_routing`, `nodes.manage_maintenance`, and `profiles.manage_lifecycle`
- Legacy response envelopes containing `ok`, `result`, `details`, `suggested_next_step`, `recommended_next_operations`, and `execution_eligibility`
- Runtime discovery of deferred or denied operations

**Current in 0.2.0:**
- Only atomic, supported operations are discoverable and executable
- Success responses return the result directly (for example, `{ stats: {...} }`, `{ updated: {...} }`)
- Errors use the compact `{ error: { code, kind, message, retryable, ... } }` envelope
- `responseMode: "raw"` is supported only for explicitly allowlisted safe system reads

### Migrating from 0.1

If you used 0.1 grouped operations, replace them with the equivalent atomic operation:

| 0.1 grouped name | 0.2 atomic replacement |
|---|---|
| `users.manage_lifecycle` | `users.disable`, `users.enable`, `users.revoke_subscription` |
| `nodes.manage_maintenance` | `nodes.restart` |
| `hosts.manage_routing` | `hosts.bulk_set_port` |

If you parsed legacy envelope fields such as `details.result` or `suggested_next_step`, remove that parsing. Read the direct payload on success and the compact `error` object on failure.

See the [migration guide](docs/migration/flat-to-single-tool.md) for the full migration path from flat-tool and 0.1 envelope designs.

## Migration from legacy MCP designs

If you are migrating from an earlier flat-tool MCP design (where each operation was exposed as a separate tool), see the [migration guide](docs/migration/flat-to-single-tool.md).

Key migration facts:

- **Only `remnawave_api` is discoverable**: Legacy multi-tool aliases are not published
- **Domain/operation/payload pattern is required**: The old flat-tool invocation style is not supported
- **No compatibility shim**: There is no runtime layer that exposes old tool names

The migration guide documents the architectural transition and provides step-by-step migration instructions.
