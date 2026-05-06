# Production MCP Audit — 2026-04-21

This document records only issues and findings verified through live MCP calls against the production Remnawave panel.

## Scope

- Execution surface: `remnawave_api`
- Environment: production panel via OpenCode-configured local MCP
- Safety boundary:
  - read-only calls first
  - describe-mode coverage for write endpoints where possible
  - no edits/deletes of pre-existing production resources
  - disposable write attempts allowed only if they do not touch existing resources

## Verified Working Areas

- MCP stdio startup and tool discovery work correctly with `remnawave_api`
- `system.get_stats` executes successfully against production
- `system.get_health` executes successfully against production
- `system.get_bandwidth_stats` executes successfully against production
- `users.list` executes successfully against production
- `subscriptions.list` executes successfully against production
- `profiles.list` executes successfully against production
- `hosts.list` executes successfully against production
- `internal_squads.list` executes successfully against production
- `external_squads.list` executes successfully against production
- `nodes.list` executes successfully against production
- `node_plugins.list` executes successfully against production
- `infra_billing.list_nodes` executes successfully against production
- `infra_billing.list_history` executes successfully against production
- `snippets.list` executes successfully against production
- `ip_control.inspect_job` reaches the upstream and returns a real upstream 404 for nonexistent job IDs

## Verified Issues

### 1. `infra_billing.list_providers` contract drift

- Endpoint status: executable in MCP registry
- Live result: fails at MCP normalization layer
- Verified error:

```text
RemnawaveContractDriftError: Expected string at billing.providers[0].key
```

Impact:

- The MCP cannot successfully normalize the live production response for `infra_billing.list_providers`.
- This is a real runtime compatibility bug, not just a docs mismatch.

### 2. `users.create_user` MCP schema is incomplete versus live upstream requirements

- MCP describe-mode currently states:
  - payload requires `username:string`
  - payload requires `telegramId:integer`
- Live production upstream rejects a contract-valid MCP call with:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "path": ["expireAt"],
      "message": "Expiration date is required"
    }
  ]
}
```

Impact:

- The MCP advertises `users.create_user` as supported and executable.
- The modeled payload is insufficient for the real production API.
- Disposable create-path testing cannot proceed correctly until the contract is updated.

### 3. `users.create_user` validation guidance currently encourages an upstream-failing payload

- MCP suggested payload example:

```json
{
  "username": "new-user",
  "telegramId": 123456
}
```

- This payload shape is accepted by MCP validation but rejected by the live production API because `expireAt` is required.

Impact:

- Agents can be guided into a failing write path even when they follow describe-mode guidance exactly.

### 4. `users.manage_lifecycle` payload field naming differs from a natural single-object convention

- Verified describe-mode requires `userUuid`
- A natural `uuid` payload shape is rejected at MCP validation time

This is not necessarily a bug by itself, but it is a practical sharp edge because several other operations use `uuid` directly.

### 5. `users.inspect` and `users.resolve` require selector-object payloads

- Verified describe-mode requires:

```json
{
  "selector": {
    "uuid": "..."
  }
}
```

- Direct payloads like `{ "uuid": "..." }` are rejected by MCP validation.

This is also not necessarily a bug, but it is a practical contract sharp edge and worth keeping in mind during operator usage and future audit work.

### 6. `metadata.manage_user` expects `metadata`, not `data`

- Verified describe-mode requires:

```json
{
  "uuid": "user-1",
  "metadata": {
    "theme": "dark"
  }
}
```

- A natural payload like `{ uuid, data: {...} }` is not the modeled contract.

This is another practical contract sharp edge rather than a confirmed runtime bug.

### 7. `hosts.export_detailed` contract drift

- Endpoint status: executable in MCP registry
- Live result: fails at MCP normalization layer
- Verified error:

```text
RemnawaveContractDriftError: Expected string at hosts[40].inbound.configProfileInboundUuid
```

Impact:

- The MCP cannot successfully normalize the live production response for `hosts.export_detailed`.

### 8. `node_plugins.get_torrent_blocker_reports` is published as supported but not wired in runtime

- Endpoint status: executable in MCP registry / describe surface
- Live result: fails with MCP internal runtime error
- Verified error:

```text
node_plugins.get_torrent_blocker_reports is not configured in this runtime.
```

Impact:

- The operation is advertised as supported/executable but is not actually wired in the server runtime.

### 9. `node_plugins.get_torrent_blocker_stats` is published as supported but not wired in runtime

- Endpoint status: executable in MCP registry / describe surface
- Live result: fails with MCP internal runtime error
- Verified error:

```text
node_plugins.get_torrent_blocker_stats is not configured in this runtime.
```

Impact:

- The operation is advertised as supported/executable but is not actually wired in the server runtime.

### 10. `system.generate_x25519` performs real write-like generation work on production

- Live result: executes successfully and returns batches of generated keypairs.

This is not a contract bug, but it is an operational note for future audits: despite being modeled as low-risk and non-mutating from a panel-state perspective, it is still a live action against production and should not be spammed unnecessarily during future verification runs.

### 11. `nodes.inspect` contract drift

- Endpoint status: executable in MCP registry
- Live result: fails at MCP normalization layer
- Verified error:

```text
RemnawaveContractDriftError: Expected array at nodes.response[0].configProfile.activeInbounds
```

Impact:

- The MCP cannot successfully normalize the live production response for `nodes.inspect`.

### 12. `nodes.investigate` MCP schema is incomplete versus live upstream requirements

- MCP allows execution with a payload containing only `uuid`
- Live production upstream rejects the request with validation errors for missing `start` and `end`

Verified upstream error shape:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "path": ["start"], "message": "Required" },
    { "path": ["end"], "message": "Required" }
  ]
}
```

Impact:

- The MCP advertises a supported executable operation, but the modeled payload is insufficient for the live production API.

### 13. `node_plugins.inspect` contract drift

- Endpoint status: executable in MCP registry
- Live result: fails at MCP normalization layer
- Verified error:

```text
RemnawaveContractDriftError: Expected string at node_plugins.response.nodePlugins[0].uuid
```

Impact:

- The MCP cannot successfully normalize the live production response for `node_plugins.inspect`.

### 14. `metadata.read_user` may validly return upstream 404 on real users with no metadata

- Verified against a real resolved production user UUID.
- Live upstream response: `404 Metadata not found`.

This is not a bug by itself, but it is a verified behavior that callers need to handle.

## Safety Outcome

- No pre-existing production resources were modified during this audit segment.
- Disposable write attempts did not mutate production state because:
  - one attempt was blocked by MCP validation (`telegramId` max-value violation)
  - one attempt reached the upstream and was rejected before creation because `expireAt` was missing

## Status

Audit still in progress. Additional endpoint coverage should be appended below as more live MCP calls are executed.

## Additional Verified Coverage

The following endpoints were additionally exercised successfully during continued live audit:

- `system.get_metrics`
- `system.get_node_statistics`
- `system.get_recap`
- `system.get_request_history`
- `system.generate_x25519`
- `subscriptions.inspect_global_settings`
- `profiles.inspect`
- `profiles.inspect_computed`
- `profiles.list_inbounds`
- `external_squads.inspect_delivery`
- `internal_squads.inspect_access`
- `users.resolve`
- `users.inspect`
- `users.get_subscription_history`
- `subscriptions.inspect_support_context`
- `subscriptions.inspect_page_delivery`

The following endpoints were verified in describe mode with live MCP responses:

- `subscriptions.inspect_support_context`
- `subscriptions.inspect_page_delivery`
- `subscriptions.inspect_global_settings`
- `profiles.inspect`
- `profiles.inspect_computed`
- `profiles.list_inbounds`
- `hosts.inspect`
- `nodes.inspect`
- `nodes.investigate`
- `node_plugins.inspect`
- `metadata.read_node`
- `infra_billing.inspect_provider`
- `infra_billing.inspect_node`
- `infra_billing.inspect_history`
- `templates.inspect`
- `subscription_page.manage_configuration`
- `ip_control.submit_user_fetch_job`
- `ip_control.submit_node_fetch_job`
- `ip_control.inspect_job`

The following endpoints were executed against production and returned real upstream/domain failures that are still useful audit evidence:

- `metadata.read_node` → upstream 404 `Metadata not found`
- `metadata.read_user` → upstream 404 `Metadata not found`
- `nodes.investigate` → upstream 400 requiring `start` and `end`

## Approximate Endpoint Coverage Status

By the end of this audit segment, the following categories were covered through live MCP interaction:

- discovery surface: yes
- describe-mode coverage across most supported write endpoints: yes
- execution coverage for the majority of supported read endpoints: yes
- safe negative-path execution for several write/read endpoints with real upstream or contract responses: yes

Areas still not fully executed against production state were mostly bounded write endpoints that would require creating or mutating resources, which was intentionally avoided after upstream/model mismatches made disposable-create validation incomplete.
