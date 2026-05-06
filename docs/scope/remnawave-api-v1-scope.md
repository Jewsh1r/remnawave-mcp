# remnawave_api v1 scope map

`src/remnawave-api/contract.ts` and `src/remnawave-api/registry.ts` are the canonical sources of truth for the `remnawave_api` v1 boundary. This document is the published operator snapshot for the single-tool contract and must stay aligned with the registry-generated scope map.

## Single-tool usage contract

The v1 public interface is the single MCP tool `remnawave_api`.

- `domain` only → discovery for that domain
- `domain` + `operation` → describe the selected operation
- `domain` + `operation` + `payload` → execute the selected operation

This is the published three-state flow:

1. `domain`
2. `domain + operation`
3. `domain + operation + payload`

All callers should use `remnawave_api` directly. The runtime no longer publishes legacy tool aliases.

### Migration from legacy flat-tool designs

The current compact v2 contract is intentionally single-tool only. Legacy MCP designs that exposed individual tools per operation (flat-tool pattern) are not supported.

**What changed:**

- **Before**: Multiple tool names (`remnawave_users_list`, `remnawave_nodes_create`, etc.)
- **After**: Single tool `remnawave_api` with domain/operation/payload pattern

**Migration requirement:**

All callers must migrate to the three-state single-tool contract. There is no published compatibility layer for legacy tool names.

See the [migration guide](../migration/flat-to-single-tool.md) for detailed migration instructions and compatibility notes.

## Compact v2 scope summary

The v1 discovery surface publishes the registry-backed compact v2 runtime surface. It currently exposes 150 supported operations across 19 domains.

Accepted baseline for this audited repo state:

- runtime discovery publishes one MCP tool: `remnawave_api`
- the registry snapshot below is the source for `supported`, `deferred`, and `denied`
- legacy tool aliases are not part of the published `remnawave_api` contract surface

### Executable operations

These operations are currently `supported` and executable through the v1 single-tool contract:

- `system.get_stats`
- `system.get_metadata`
- `system.get_health`
- `system.get_bandwidth_stats`
- `system.get_node_statistics`
- `system.get_nodes_metrics`
- `system.get_recap`
- `system.generate_x25519_keypairs`
- `keygen.generate_node_secret`
- `users.list`
- `users.create`
- `users.get`
- `users.get_subscription_request_history`
- `users.revoke_subscription`
- `users.disable`
- `users.enable`
- `users.update`
- `users.bulk_all_extend_expiration_date`
- `users.bulk_all_reset_traffic`
- `users.bulk_all_update`
- `users.bulk_delete`
- `users.bulk_delete_by_status`
- `users.bulk_extend_expiration_date`
- `users.bulk_reset_traffic`
- `users.bulk_revoke_subscription`
- `users.bulk_update`
- `users.bulk_update_squads`
- `users.get_by_email`
- `users.get_by_id`
- `users.get_by_short_uuid`
- `users.get_by_tag`
- `users.get_by_telegram_id`
- `users.get_by_username`
- `users.resolve`
- `users.list_tags`
- `users.delete`
- `users.get_accessible_nodes`
- `users.reset_traffic`
- `hosts.bulk_set_port`
- `hosts.list`
- `hosts.update`
- `hosts.create`
- `hosts.reorder`
- `hosts.bulk_delete`
- `hosts.bulk_disable`
- `hosts.bulk_enable`
- `hosts.bulk_set_inbound`
- `hosts.list_tags`
- `hosts.delete`
- `hosts.get`
- `nodes.restart`
- `nodes.list`
- `nodes.update`
- `nodes.create`
- `nodes.reorder`
- `nodes.restart_all`
- `nodes.bulk_actions`
- `nodes.profile_modification`
- `nodes.bulk_update`
- `nodes.list_tags`
- `nodes.delete`
- `nodes.get`
- `nodes.disable`
- `nodes.enable`
- `nodes.reset_traffic`
- `metadata.get_node`
- `metadata.upsert_node`
- `metadata.get_user`
- `metadata.upsert_user`
- `templates.list`
- `templates.get`
- `templates.create`
- `templates.update`
- `templates.delete`
- `templates.reorder`
- `snippets.list`
- `snippets.create`
- `snippets.update`
- `snippets.delete`
- `public_subscriptions.get_info`
- `public_subscriptions.get`
- `public_subscriptions.get_by_client_type`
- `subscriptions.list`
- `subscriptions.get_by_username`
- `subscriptions.get_by_short_uuid`
- `subscriptions.get_by_uuid`
- `subscriptions.get_raw_by_short_uuid`
- `subscriptions.get_subpage_config_by_short_uuid`
- `subscriptions.get_connection_keys_by_uuid`
- `subscription_request_history.list`
- `subscription_request_history.get_stats`
- `profiles.list`
- `profiles.get`
- `profiles.get_computed`
- `profiles.list_inbounds`
- `profiles.update`
- `profiles.create`
- `profiles.reorder`
- `profiles.list_all_inbounds`
- `profiles.delete`
- `bandwidth_stats.list_nodes_usage`
- `bandwidth_stats.get_node_users_usage`
- `bandwidth_stats.get_node_user_usage_legacy`
- `bandwidth_stats.get_user_usage`
- `bandwidth_stats.get_user_usage_legacy`
- `external_squads.list`
- `external_squads.update`
- `external_squads.create`
- `external_squads.reorder`
- `external_squads.delete`
- `external_squads.get`
- `external_squads.add_users`
- `external_squads.remove_users`
- `hwid.list_users`
- `hwid.create_device`
- `hwid.delete_device`
- `hwid.delete_all_devices`
- `hwid.get_stats`
- `hwid.get_top_users`
- `hwid.get_user_devices`
- `infra_billing.list_history`
- `infra_billing.create_history_record`
- `infra_billing.delete_history_record`
- `infra_billing.list_nodes`
- `infra_billing.update_node`
- `infra_billing.create_node`
- `infra_billing.delete_node`
- `infra_billing.list_providers`
- `infra_billing.update_provider`
- `infra_billing.create_provider`
- `infra_billing.delete_provider`
- `infra_billing.get_provider`
- `internal_squads.list`
- `internal_squads.update`
- `internal_squads.create`
- `internal_squads.reorder`
- `internal_squads.delete`
- `internal_squads.get`
- `internal_squads.get_accessible_nodes`
- `internal_squads.add_users`
- `internal_squads.remove_users`
- `subscription_page_configs.list`
- `subscription_page_configs.update`
- `subscription_page_configs.create`
- `subscription_page_configs.clone`
- `subscription_page_configs.reorder`
- `subscription_page_configs.delete`
- `subscription_page_configs.get`
- `subscription_settings.get`
- `subscription_settings.update`

### Deferred operations

Operations marked `deferred` are intentionally outside the current executable boundary. The generated runtime scope currently has no deferred entries; unsupported or excluded direct calls return compact unsupported-operation errors.

### Explicitly excluded

Operations marked `denied` are intentionally outside the v1 boundary and should not be treated as pending support promises.

## Runtime domain list

The single-tool discovery inventory currently includes these domains:

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
- `keygen`

The runtime excludes auth/bootstrap, token, node-plugin, IP-control, and Remnawave-settings surfaces, plus dangerous/internal system-helper surfaces such as HAPP encryption and SRR matcher endpoints. Sensitive key generation is published through `keygen.generate_node_secret` and `system.generate_x25519_keypairs`.


## Registry-aligned scope snapshot

```json
{
  "supported": [
    "system.get_stats",
    "system.get_metadata",
    "system.get_health",
    "system.get_bandwidth_stats",
    "system.get_node_statistics",
    "system.get_nodes_metrics",
    "system.get_recap",
    "system.generate_x25519_keypairs",
    "keygen.generate_node_secret",
    "users.list",
    "users.create",
    "users.get",
    "users.get_subscription_request_history",
    "users.revoke_subscription",
    "users.disable",
    "users.enable",
    "users.update",
    "users.bulk_all_extend_expiration_date",
    "users.bulk_all_reset_traffic",
    "users.bulk_all_update",
    "users.bulk_delete",
    "users.bulk_delete_by_status",
    "users.bulk_extend_expiration_date",
    "users.bulk_reset_traffic",
    "users.bulk_revoke_subscription",
    "users.bulk_update",
    "users.bulk_update_squads",
    "users.get_by_email",
    "users.get_by_id",
    "users.get_by_short_uuid",
    "users.get_by_tag",
    "users.get_by_telegram_id",
    "users.get_by_username",
    "users.resolve",
    "users.list_tags",
    "users.delete",
    "users.get_accessible_nodes",
    "users.reset_traffic",
    "hosts.bulk_set_port",
    "hosts.list",
    "hosts.update",
    "hosts.create",
    "hosts.reorder",
    "hosts.bulk_delete",
    "hosts.bulk_disable",
    "hosts.bulk_enable",
    "hosts.bulk_set_inbound",
    "hosts.list_tags",
    "hosts.delete",
    "hosts.get",
    "nodes.restart",
    "nodes.list",
    "nodes.update",
    "nodes.create",
    "nodes.reorder",
    "nodes.restart_all",
    "nodes.bulk_actions",
    "nodes.profile_modification",
    "nodes.bulk_update",
    "nodes.list_tags",
    "nodes.delete",
    "nodes.get",
    "nodes.disable",
    "nodes.enable",
    "nodes.reset_traffic",
    "metadata.get_node",
    "metadata.upsert_node",
    "metadata.get_user",
    "metadata.upsert_user",
    "templates.list",
    "templates.get",
    "templates.create",
    "templates.update",
    "templates.delete",
    "templates.reorder",
    "snippets.list",
    "snippets.create",
    "snippets.update",
    "snippets.delete",
    "public_subscriptions.get_info",
    "public_subscriptions.get",
    "public_subscriptions.get_by_client_type",
    "subscriptions.list",
    "subscriptions.get_by_username",
    "subscriptions.get_by_short_uuid",
    "subscriptions.get_by_uuid",
    "subscriptions.get_raw_by_short_uuid",
    "subscriptions.get_subpage_config_by_short_uuid",
    "subscriptions.get_connection_keys_by_uuid",
    "subscription_request_history.list",
    "subscription_request_history.get_stats",
    "profiles.list",
    "profiles.get",
    "profiles.get_computed",
    "profiles.list_inbounds",
    "profiles.update",
    "profiles.create",
    "profiles.reorder",
    "profiles.list_all_inbounds",
    "profiles.delete",
    "bandwidth_stats.list_nodes_usage",
    "bandwidth_stats.get_node_users_usage",
    "bandwidth_stats.get_node_user_usage_legacy",
    "bandwidth_stats.get_user_usage",
    "bandwidth_stats.get_user_usage_legacy",
    "external_squads.list",
    "external_squads.update",
    "external_squads.create",
    "external_squads.reorder",
    "external_squads.delete",
    "external_squads.get",
    "external_squads.add_users",
    "external_squads.remove_users",
    "hwid.list_users",
    "hwid.create_device",
    "hwid.delete_device",
    "hwid.delete_all_devices",
    "hwid.get_stats",
    "hwid.get_top_users",
    "hwid.get_user_devices",
    "infra_billing.list_history",
    "infra_billing.create_history_record",
    "infra_billing.delete_history_record",
    "infra_billing.list_nodes",
    "infra_billing.update_node",
    "infra_billing.create_node",
    "infra_billing.delete_node",
    "infra_billing.list_providers",
    "infra_billing.update_provider",
    "infra_billing.create_provider",
    "infra_billing.delete_provider",
    "infra_billing.get_provider",
    "internal_squads.list",
    "internal_squads.update",
    "internal_squads.create",
    "internal_squads.reorder",
    "internal_squads.delete",
    "internal_squads.get",
    "internal_squads.get_accessible_nodes",
    "internal_squads.add_users",
    "internal_squads.remove_users",
    "subscription_page_configs.list",
    "subscription_page_configs.update",
    "subscription_page_configs.create",
    "subscription_page_configs.clone",
    "subscription_page_configs.reorder",
    "subscription_page_configs.delete",
    "subscription_page_configs.get",
    "subscription_settings.get",
    "subscription_settings.update"
  ],
  "deferred": [],
  "denied": [],
  "domains": {
    "system": {
      "supported": [
        "get_stats",
        "get_metadata",
        "get_health",
        "get_bandwidth_stats",
        "get_node_statistics",
        "get_nodes_metrics",
        "get_recap"
      ],
      "deferred": [],
      "denied": []
    },
    "users": {
      "supported": [
        "list",
        "create",
        "get",
        "get_subscription_request_history",
        "revoke_subscription",
        "disable",
        "enable",
        "update",
        "bulk_all_extend_expiration_date",
        "bulk_all_reset_traffic",
        "bulk_all_update",
        "bulk_delete",
        "bulk_delete_by_status",
        "bulk_extend_expiration_date",
        "bulk_reset_traffic",
        "bulk_revoke_subscription",
        "bulk_update",
        "bulk_update_squads",
        "get_by_email",
        "get_by_id",
        "get_by_short_uuid",
        "get_by_tag",
        "get_by_telegram_id",
        "get_by_username",
        "resolve",
        "list_tags",
        "delete",
        "get_accessible_nodes",
        "reset_traffic"
      ],
      "deferred": [],
      "denied": []
    },
    "hosts": {
      "supported": [
        "bulk_set_port",
        "list",
        "update",
        "create",
        "reorder",
        "bulk_delete",
        "bulk_disable",
        "bulk_enable",
        "bulk_set_inbound",
        "list_tags",
        "delete",
        "get"
      ],
      "deferred": [],
      "denied": []
    },
    "nodes": {
      "supported": [
        "restart",
        "list",
        "update",
        "create",
        "reorder",
        "restart_all",
        "bulk_actions",
        "profile_modification",
        "bulk_update",
        "list_tags",
        "delete",
        "get",
        "disable",
        "enable",
        "reset_traffic"
      ],
      "deferred": [],
      "denied": []
    },
    "metadata": {
      "supported": [
        "get_node",
        "upsert_node",
        "get_user",
        "upsert_user"
      ],
      "deferred": [],
      "denied": []
    },
    "templates": {
      "supported": [
        "list",
        "get",
        "create",
        "update",
        "delete",
        "reorder"
      ],
      "deferred": [],
      "denied": []
    },
    "snippets": {
      "supported": [
        "list",
        "create",
        "update",
        "delete"
      ],
      "deferred": [],
      "denied": []
    },
    "public_subscriptions": {
      "supported": [
        "get_info",
        "get",
        "get_by_client_type"
      ],
      "deferred": [],
      "denied": []
    },
    "subscriptions": {
      "supported": [
        "list",
        "get_by_username",
        "get_by_short_uuid",
        "get_by_uuid",
        "get_raw_by_short_uuid",
        "get_subpage_config_by_short_uuid",
        "get_connection_keys_by_uuid"
      ],
      "deferred": [],
      "denied": []
    },
    "subscription_request_history": {
      "supported": [
        "list",
        "get_stats"
      ],
      "deferred": [],
      "denied": []
    },
    "profiles": {
      "supported": [
        "list",
        "get",
        "get_computed",
        "list_inbounds",
        "update",
        "create",
        "reorder",
        "list_all_inbounds",
        "delete"
      ],
      "deferred": [],
      "denied": []
    },
    "bandwidth_stats": {
      "supported": [
        "list_nodes_usage",
        "get_node_users_usage",
        "get_node_user_usage_legacy",
        "get_user_usage",
        "get_user_usage_legacy"
      ],
      "deferred": [],
      "denied": []
    },
    "external_squads": {
      "supported": [
        "list",
        "update",
        "create",
        "reorder",
        "delete",
        "get",
        "add_users",
        "remove_users"
      ],
      "deferred": [],
      "denied": []
    },
    "hwid": {
      "supported": [
        "list_users",
        "create_device",
        "delete_device",
        "delete_all_devices",
        "get_stats",
        "get_top_users",
        "get_user_devices"
      ],
      "deferred": [],
      "denied": []
    },
    "infra_billing": {
      "supported": [
        "list_history",
        "create_history_record",
        "delete_history_record",
        "list_nodes",
        "update_node",
        "create_node",
        "delete_node",
        "list_providers",
        "update_provider",
        "create_provider",
        "delete_provider",
        "get_provider"
      ],
      "deferred": [],
      "denied": []
    },
    "internal_squads": {
      "supported": [
        "list",
        "update",
        "create",
        "reorder",
        "delete",
        "get",
        "get_accessible_nodes",
        "add_users",
        "remove_users"
      ],
      "deferred": [],
      "denied": []
    },
    "subscription_page_configs": {
      "supported": [
        "list",
        "update",
        "create",
        "clone",
        "reorder",
        "delete",
        "get"
      ],
      "deferred": [],
      "denied": []
    },
    "subscription_settings": {
      "supported": [
        "get",
        "update"
      ],
      "deferred": [],
      "denied": []
    }
  }
}
```

## Domain-by-domain compact v2 framing

| Domain | Runtime state | Notes |
|---|---|---|
| `system` | supported | `get_stats`, `get_metadata`, `get_health`, `get_nodes_metrics`, `get_recap`, `get_bandwidth_stats`, and `get_node_statistics` are supported read-only diagnostics. |
| `users` | supported | User reads, create/update, lookup, lifecycle actions, and generated bulk preview/apply workflows are supported. |
| `hosts` | supported | Host list/read/create/update, tags, deletes, reorder, and generated bulk preview/apply workflows are supported. |
| `nodes` | supported | Node list/read/create/update, lifecycle actions, and generated preview/apply bulk/profile workflows are supported. `nodes.restart` uses tier3 confirmation. |
| `profiles` | partially supported | `list`, `get`, `get_computed`, and `list_inbounds` are supported; profile mutations remain out of scope. |
| `metadata` | partially supported | `get_node`, `upsert_node`, `get_user`, and `upsert_user` are supported. |
| `templates` | partially supported | `list`, `get`, `create`, `update`, and `delete` are supported; template reorder remains out of scope. |
| `snippets` | partially supported | `list`, `create`, `update`, and `delete` are supported; snippet reorder remains out of scope. |
| `public_subscriptions` | partially supported | `get_info`, `get`, and `get_by_client_type` are supported public subscription reads. |
| `subscriptions` | supported | Protected subscription reads are supported with MCP raw response mode disabled. |
| `subscription_request_history` | partially supported | `list` and `get_stats` are supported request-history reads. |
| `routing` | excluded | No operations are currently executable; routing remains deferred from the MCP surface. Routing effects are only available through supported profile/host endpoints. |
| `internal_squads` | supported | Internal squad list/read/create/update/delete/reorder and membership actions are supported. |
| `external_squads` | supported | External squad list/read/create/update/delete/reorder and membership actions are supported. |
| `infra_billing` | supported | Billing provider, node, and history reads and guarded mutations are supported. |
| `node_plugins` | excluded | Node plugin operations remain excluded from runtime discovery. |
| `ip_control` | excluded | IP-control operations remain excluded from runtime discovery. |
| `auth` | excluded | Authentication and settings surfaces are intentionally excluded from v1. |

## Single-tool request workflow

Use the single `remnawave_api` tool with this sequence:

1. **Discover** with `domain` only to confirm current disposition
2. **Describe** with `domain` + `operation` to see schema and examples
3. **Execute** only if disposition is `supported` with a valid payload

### Key execution rules

**Rule 1: Disposition determines executability**
Only operations marked `supported` can be executed. Deferred and excluded operations are absent from discovery; direct calls return compact unsupported-operation errors.

**Rule 2: Use discovery to check current status**
Operations may change disposition between releases. Always check discovery before assuming an operation is supported.

**Rule 3: Payload shapes may differ**
Always use the describe-operation response to get the current payload example and validation rules.

**Rule 4: Dangerous operations require confirmation**
Operations with tier3 risk classification (such as `nodes.restart`, `templates.delete`, and `snippets.delete`) require a two-step preview/confirm flow. The first call returns a confirmation token; the second call includes that token in the `confirmToken` field to execute. See the [danger classes reference](../safety/danger-classes-and-side-effects.md) for details.

### Example: Reading system stats

```json
{
  "tool": "remnawave_api",
  "domain": "system",
  "operation": "get_stats",
  "payload": {}
}
```

### Example: Creating a user

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

## PRD Domain Coverage and Final Product Truth Table

This section maps the PRD-defined target domains to their final disposition in the compact v2 single-tool contract.

### PRD domain -> registry domain mapping

| PRD domain | Maps to registry | Disposition | Notes |
|---|---|---|---|
| users | `users` | supported | Core reads, lookup, create/update, lifecycle, and bulk preview/apply workflows are supported. |
| nodes | `nodes` | supported | Node reads, lifecycle, and guarded bulk/profile workflows are supported. |
| hosts | `hosts` | supported | Host reads/writes and guarded bulk workflows are supported. |
| config profiles | `profiles` | supported | Profile reads and guarded lifecycle/reorder workflows are supported. |
| internal squads | `internal_squads` | supported | Internal squad lifecycle and membership operations are supported. |
| external squads | `external_squads` | supported | External squad lifecycle and membership operations are supported. |
| subscription settings | `subscription_settings` | supported | Settings read and guarded update are supported. |
| subscription templates | `templates` | supported | Template CRUD and reorder are supported. |
| subscription page configs | `subscription_page_configs` | supported | Page-config lifecycle, clone, reorder, and reads are supported. |
| snippets | `snippets` | supported | Snippet CRUD is supported. |
| metadata | `metadata` | supported | User and node metadata reads/upserts are supported. |
| bandwidth stats | `bandwidth_stats` | supported | Node/user bandwidth stat reads are supported. |
| system observability/admin-safe utilities | `system` | partially supported | Diagnostics and `system.generate_x25519_keypairs` are supported; debug helpers are denied. |
| key generation | `keygen` | supported | `keygen.generate_node_secret` is supported for node onboarding secret material. |
| infra billing | `infra_billing` | supported | Billing provider, node, and history reads/mutations are supported. |
| hwid | `hwid` | supported | HWID reads/stats and guarded actions are supported. |
| ip control | `ip_control` | dropped | IP-control operations remain excluded. |
| node plugins | `node_plugins` | dropped | Node plugin operations remain excluded. |
| subscription request history | `subscription_request_history` | supported | Request-history reads and stats are supported. |
| routing / control-plane rule management | N/A | deferred | No operations are currently executable through a standalone routing domain; routing effects are only available through supported profile/host endpoints. |

### Final product truth table

| Domain category | PRD domains | Final state |
|---|---|---|
| **Fully supported** | users, nodes, hosts, config profiles, internal squads, external squads, subscription settings, subscription templates, subscription page configs, snippets, metadata, bandwidth stats, infra billing, hwid, subscription request history | Targeted compact v2 operations are supported through registry-backed runtime execution. |
| **Partially supported** | system observability | Diagnostics and `system.generate_x25519_keypairs` are supported; debug helpers are denied. |
| **Deferred** | routing / standalone control-plane rule management | No standalone routing domain is published. |
| **Denied per PRD** | auth flows, token/bootstrap flows, ip control, node plugins, debug/internal actions | Explicitly excluded from runtime discovery. |

### Coverage completeness check

Every PRD domain from section 6.2 is accounted for in the table above.
