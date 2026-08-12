This matrix is the published capability-level support boundary for the current repository state. It is intentionally aligned to the single-tool `remnawave_api` contract, the runtime discovery surface, and the registry-backed scope map.

Do not read this matrix as endpoint coverage or as a claim that all OpenAPI paths are supported. The current runtime publishes 144 supported operations across 19 domains.

## Capability classes

| Capability class | Meaning |
|---|---|
| `supported` | Runnable and published as part of the current operator support promise. |
| `sensitive-read` | Supported read capability with explicit redaction/reveal governance because the output can expose secrets, keys, or admin-sensitive state. |
| `dangerous-write` | Supported high-impact writes that require preview/apply confirmation through the shared tier3 safety gate. |
| `deferred` | Intentionally out of runnable scope until stronger evidence or safer policy exists. |
| `dropped` | Intentionally not carried into the shipped surface. |

See the [danger classes and side-effects reference](../safety/danger-classes-and-side-effects.md) for the complete risk tier definitions, confirmation gating model, and dangerous operations list.

## Version and precedence notes that affect support claims

- Global runtime gate: this repo supports exactly Remnawave `3.2.3`; unknown or unsupported versions fail before discovery is advertised.
- Published support is capability-based and registry-backed, not path-count-based.
- Discovery is supported-only; deferred and excluded operations are absent from runtime discovery.

## Migration note: single-tool contract only

This matrix describes capabilities exposed exclusively through the single `remnawave_api` tool. Legacy multi-tool MCP designs (where each operation was a separate discoverable tool) are not supported.

**Key implications:**

- Discovery returns one tool: `remnawave_api`
- Operations are accessed via `domain` + `operation` + `payload`, not individual tool names
- No compatibility shims expose legacy tool aliases

See the [migration guide](../migration/flat-to-single-tool.md) for details on transitioning from flat-tool designs.

## Published capability boundary

| Capability area | Published class | Supported now | Notes / boundary |
|---|---|---|---|
| system | `supported` | `system.get_stats`, `system.get_metadata`, `system.get_health`, `system.get_bandwidth_stats`, `system.get_node_statistics`, `system.get_nodes_metrics`, `system.get_recap`, `system.generate_x25519_keypairs` | Runtime-discoverable through `remnawave_api`. |
| users | `supported` | `users.list`, `users.create`, `users.get`, `users.get_subscription_request_history`, `users.revoke_subscription`, `users.disable`, `users.enable`, `users.update`, `users.bulk_all_extend_expiration_date`, `users.bulk_all_reset_traffic`, `users.bulk_all_update`, `users.bulk_delete`, `users.bulk_delete_by_status`, `users.bulk_extend_expiration_date`, `users.bulk_reset_traffic`, `users.bulk_revoke_subscription`, `users.bulk_update`, `users.bulk_update_squads`, `users.get_by_email`, `users.get_by_id`, `users.get_by_short_uuid`, `users.get_by_tag`, `users.get_by_telegram_id`, `users.get_by_username`, `users.resolve`, `users.list_tags`, `users.delete`, `users.get_accessible_nodes`, `users.reset_traffic` | Runtime-discoverable through `remnawave_api`. |
| hosts | `supported` | `hosts.bulk_update`, `hosts.list`, `hosts.update`, `hosts.create`, `hosts.reorder`, `hosts.bulk_delete`, `hosts.bulk_disable`, `hosts.bulk_enable`, `hosts.list_tags`, `hosts.delete`, `hosts.get` | Runtime-discoverable through `remnawave_api`. |
| nodes | `supported` | `nodes.restart`, `nodes.list`, `nodes.update`, `nodes.create`, `nodes.reorder`, `nodes.restart_all`, `nodes.bulk_actions`, `nodes.profile_modification`, `nodes.bulk_update`, `nodes.list_tags`, `nodes.delete`, `nodes.get`, `nodes.disable`, `nodes.enable`, `nodes.reset_traffic` | Runtime-discoverable through `remnawave_api`. |
| metadata | `supported` | `metadata.get_node`, `metadata.upsert_node`, `metadata.get_user`, `metadata.upsert_user` | Runtime-discoverable through `remnawave_api`. |
| templates | `supported` | `templates.list`, `templates.get`, `templates.create`, `templates.update`, `templates.delete`, `templates.reorder` | Runtime-discoverable through `remnawave_api`. |
| Subscription templates | `supported` | `templates.list`, `templates.get`, `templates.create`, `templates.update`, `templates.delete`, `templates.reorder` | Template list/read/create/update/delete are supported; template reorder and broader delivery workflows are deferred. |
| snippets | `supported` | `snippets.list`, `snippets.create`, `snippets.update`, `snippets.delete` | Runtime-discoverable through `remnawave_api`. |
| Snippets | `supported` | `snippets.list`, `snippets.create`, `snippets.update`, `snippets.delete` | Snippet inventory and CRUD are supported; snippet reorder and broader composite workflows are deferred. |
| public_subscriptions | `supported` | `public_subscriptions.get_info`, `public_subscriptions.get`, `public_subscriptions.get_by_client_type` | Runtime-discoverable through `remnawave_api`. |
| subscriptions | `supported` | `subscriptions.list`, `subscriptions.get_by_username`, `subscriptions.get_by_short_uuid`, `subscriptions.get_by_id`, `subscriptions.get_raw_by_short_uuid`, `subscriptions.get_subpage_config_by_short_uuid`, `subscriptions.get_connection_keys_by_user_id` | Runtime-discoverable through `remnawave_api`. |
| subscription_request_history | `supported` | `subscription_request_history.list`, `subscription_request_history.get_stats` | Runtime-discoverable through `remnawave_api`. |
| profiles | `supported` | `profiles.list`, `profiles.get`, `profiles.get_computed`, `profiles.list_inbounds`, `profiles.update`, `profiles.create`, `profiles.reorder`, `profiles.list_all_inbounds`, `profiles.delete` | Runtime-discoverable through `remnawave_api`. |
| bandwidth_stats | `supported` | `bandwidth_stats.list_nodes_usage`, `bandwidth_stats.get_node_users_usage`, `bandwidth_stats.get_node_user_usage_legacy`, `bandwidth_stats.get_user_usage`, `bandwidth_stats.get_user_usage_legacy` | Runtime-discoverable through `remnawave_api`. |
| external_squads | `supported` | `external_squads.list`, `external_squads.update`, `external_squads.create`, `external_squads.reorder`, `external_squads.delete`, `external_squads.get`, `external_squads.add_users`, `external_squads.remove_users` | Runtime-discoverable through `remnawave_api`. |
| hwid | `supported` | `hwid.list_users`, `hwid.create_device`, `hwid.delete_device`, `hwid.delete_all_devices`, `hwid.get_stats`, `hwid.get_top_users`, `hwid.get_user_devices` | Runtime-discoverable through `remnawave_api`. |
| infra_billing | `supported` | `infra_billing.list_history`, `infra_billing.create_history_record`, `infra_billing.delete_history_record`, `infra_billing.list_nodes`, `infra_billing.update_node`, `infra_billing.create_node`, `infra_billing.delete_node`, `infra_billing.list_providers`, `infra_billing.update_provider`, `infra_billing.create_provider`, `infra_billing.delete_provider`, `infra_billing.get_provider` | Runtime-discoverable through `remnawave_api`. |
| internal_squads | `supported` | `internal_squads.list`, `internal_squads.update`, `internal_squads.create`, `internal_squads.reorder`, `internal_squads.delete`, `internal_squads.get`, `internal_squads.get_accessible_nodes`, `internal_squads.add_users`, `internal_squads.remove_users` | Runtime-discoverable through `remnawave_api`. |
| subscription_page_configs | `supported` | `subscription_page_configs.list`, `subscription_page_configs.update`, `subscription_page_configs.create`, `subscription_page_configs.clone`, `subscription_page_configs.reorder`, `subscription_page_configs.delete`, `subscription_page_configs.get` | Runtime-discoverable through `remnawave_api`. |
| subscription_settings | `supported` | `subscription_settings.get`, `subscription_settings.update` | Runtime-discoverable through `remnawave_api`. |
| keygen | `supported` | `keygen.generate_node_secret` | Supported sensitive node onboarding secret generation with an empty payload. |
| Explicitly excluded domains | `dropped` | `auth.*`, `tokens.*`, `ip_control.*`, `node_plugins.*`, `remnawave_settings`, HAPP encryption, SRR matcher | Intentionally outside the published v1 support promise. |
| Routing / control-plane rule management | `deferred` | No standalone executable seam | No routing-rule or response-rule management seam is currently exposed through the model-facing MCP runtime; generic topology/control-plane orchestration remains deferred. |

## Guardrails implied by this matrix

- Keep support language at the domain/action level.
- Keep runtime discovery, README wording, and release-readiness text aligned with the registry-backed scope map.
- Treat `sensitive-read` as a support-boundary class, not as an implementation footnote.
- Do not upgrade deferred discovery visibility into executable support claims.

The release-level summary for these scope decisions is published in [`docs/release/production-readiness.md`](../release/production-readiness.md).

## PRD Domain Coverage Matrix

This matrix maps every PRD-defined domain (section 6.2) to its final implementation state in the single-tool `remnawave_api` contract.

| PRD domain | Registry domain | Final state | Coverage notes |
|---|---|---|---|
| users | `users` | supported | User reads, lookup, create/update, lifecycle, and bulk preview/apply workflows are supported. |
| nodes | `nodes` | supported | Node reads, lifecycle, and guarded bulk/profile workflows are supported. |
| hosts | `hosts` | supported | Host reads, writes, tags, reorder, delete, and guarded bulk workflows are supported. |
| config profiles | `profiles` | supported | Profile reads, create/update/delete, reorder, and inbound reads are supported. |
| internal squads | `internal_squads` | supported | Internal squad lifecycle and membership operations are supported. |
| external squads | `external_squads` | supported | External squad lifecycle and membership operations are supported. |
| subscription settings | `subscription_settings` | supported | Settings read and guarded update are supported. |
| subscription templates | `templates` | supported | Template CRUD and reorder are supported. |
| subscription page configs | `subscription_page_configs` | supported | Page-config read/list and guarded lifecycle/reorder/clone operations are supported. |
| snippets | `snippets` | supported | Snippet CRUD is supported. |
| metadata | `metadata` | supported | User and node metadata reads/upserts are supported. |
| bandwidth stats | `bandwidth_stats` | supported | Node/user bandwidth stat reads are supported. |
| system observability | `system` | partially supported | Diagnostics and `system.generate_x25519_keypairs` are supported; debug helpers are denied. |
| system observability | `system` | partially supported | Diagnostics supported; debug endpoints are denied, while key-generation helpers are explicitly limited to `system.generate_x25519_keypairs`. |
| system observability | `system` | partially supported | `get_stats`, `get_metadata`, `get_health`, `get_nodes_metrics`, `get_recap`, and `get_node_statistics` are supported; debug endpoints are denied, while `system.generate_x25519_keypairs` is published as a sensitive key-generation workflow. |
| bandwidth stats | `system` | supported | `get_bandwidth_stats` operation provides aggregate bandwidth statistics. |
| key generation | `keygen` | supported | `keygen.generate_node_secret` is supported for Remnawave Node secret material. |
| infra billing | `infra_billing` | supported | Billing provider, node, and history reads/mutations are supported. |
| hwid | `hwid` | supported | HWID reads, stats, create, and guarded delete workflows are supported. |
| ip control | `ip_control` | dropped | IP-control async fetch jobs and connection drops remain excluded. |
| node plugins | `node_plugins` | dropped | Node plugin configuration and reports remain excluded. |
| subscription request history | `subscription_request_history` | supported | Request-history reads and stats are supported. |

> **Note on classification distinctions:** The PRD Domain Coverage Matrix rows above classify the *listed capability area* (the operations named in the row). The Truth Table below and Summary Counts provide the *overall capability-class view* for each PRD domain, accounting for denied or deferred subsets that exist elsewhere in the domain. For example, `system observability` lists supported diagnostic operations above, while the Truth Table marks it `partially supported` because debug endpoints are denied within that domain. Both views are correct: the row reflects the supported surface; the summary accounts for the full domain boundary.

### PRD domain state summary

| State | Count | Domains |
|---|---|---|
| Fully supported | 15 | users, nodes, hosts, config profiles, internal squads, external squads, subscription settings, subscription templates, subscription page configs, snippets, metadata, bandwidth stats, infra billing, hwid, subscription request history, keygen |
| Partially supported | 1 | system observability |
| Dropped | 2 | ip control, node plugins |
| Denied | 0 | N/A |

### Explicit exclusions from PRD scope

The following PRD-explicit exclusions (section 6.2) are correctly denied:

- Public `/sub/*` user delivery endpoints → denied
- Auth/passkeys/token bootstrap flows → `auth.*` denied
- Debug/internal-only actions → `system.debug_srr_matcher`, `node_plugins.execute_plugin_executor`, `ip_control.drop_connections`, `metadata.manage_node` denied

## Truth table: PRD domain → capability class

| PRD domain | Capability class | Rationale |
|---|---|---|
| users | `supported` | Core, lookup, lifecycle, and bulk workflows are supported. |
| nodes | `supported` | Node reads, lifecycle, and guarded bulk/profile workflows are supported. |
| hosts | `supported` | Host reads/writes and guarded bulk workflows are supported. |
| config profiles | `supported` | Profile reads and guarded lifecycle/reorder workflows are supported. |
| internal squads | `supported` | Internal squad lifecycle and membership operations are supported. |
| external squads | `supported` | External squad lifecycle and membership operations are supported. |
| subscription settings | `supported` | Settings read and guarded update are supported. |
| subscription templates | `supported` | Template CRUD and reorder are supported. |
| subscription page configs | `supported` | Page-config lifecycle, clone, reorder, and reads are supported. |
| snippets | `supported` | Snippet CRUD is supported. |
| metadata | `supported` | User and node metadata reads/upserts are supported. |
| bandwidth stats | `supported` | Bandwidth statistics are supported. |
| system observability | `partially supported` | Diagnostics and `system.generate_x25519_keypairs` are supported; debug endpoints are denied. |
| infra billing | `supported` | Billing provider, node, and history workflows are supported. |
| hwid | `supported` | HWID reads/stats and guarded actions are supported. |
| ip control | `dropped` | IP-control operations remain excluded. |
| node plugins | `dropped` | Node plugin operations remain excluded. |
| subscription request history | `supported` | Request-history reads and stats are supported. |
