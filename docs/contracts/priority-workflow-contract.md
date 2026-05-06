# Priority Workflow Contract

## Scope

This contract defines planning targets for high-priority Remnawave workflows explicitly requested by the user. It is not the runtime support contract; current executable support remains the registry-backed `remnawave_api` scope map.

### In scope
- New node/server/host onboarding on the Remnawave side
- Full node/profile/host configuration needed for production use
- Routing, server-routing, and response-rule reconfiguration for real transport chains
- Internal and external squad management for access-control and white-label onboarding
- Node and host ordering where it affects subscription output
- Subscription delivery template management with emphasis on advanced Xray JSON

### Explicitly out of scope
- Mass user actions and most bulk-user administration
- Passwords, passkeys, admin login settings, and general auth-hardening flows
- BotFather/domain-binding, webhook infra setup/signing, security hardening, upgrade flows, rescue CLI
- Generic endpoint-parity work that does not increase the workflows above

## Workflow A — New node/server/host onboarding

### Required outcome
An agent must be able to complete the full Remnawave-side portion of adding a new server into the fleet.

### Required steps
1. Create the node record in Remnawave.
2. Retrieve or generate the panel-side bootstrap secret/material needed for node connection.
3. Create a config profile for the new node.
4. Configure the profile fields fully, including inbounds and any profile-level routing/delivery settings required by the scenario.
5. Retrieve computed config / output material for the profile.
6. Configure one or more hosts for the new topology.
7. Apply advanced host options if the topology requires them.
8. Attach the node, profile, hosts, and related access surfaces coherently.
9. Add the node to the required internal squads.
10. Optionally create a test squad/test user and attach them for verification.
11. Set node/host ordering if ordering matters for subscription output.

### Current gap map
| Step | Current support | Evidence |
|---|---|---|
| 1 | partial | Task 8 `task8.nodes.create-edit-lifecycle` |
| 2 | partial | plan/audit gap around profile material issuance and node bootstrap material; no end-to-end workflow proof |
| 3 | full | Task 8 `task8.config-profiles.lifecycle-inbounds-computed` |
| 4 | partial | Task 8 `task8.config-profiles.assignment-activation-downstream`, `task8.templates.delivery-control` |
| 5 | full | Task 8 `task8.config-profiles.lifecycle-inbounds-computed` |
| 6 | full for basic / partial for advanced | Task 8 `task8.hosts.create-edit-definition`, `task8.hosts.advanced-options` |
| 7 | partial | Task 8 `task8.hosts.advanced-options` |
| 8 | partial | Task 8 `task8.config-profiles.assignment-activation-downstream` |
| 9 | full for internal squads | Task 7 internal squad lifecycle/membership rows |
| 10 | mostly available but not primary blocker | Task 7 user lifecycle + squad assignment rows |
| 11 | partial | Task 8 `task8.nodes.bulk-reorder`, host ordering in host bulk operations |

## Workflow B — Full topology reconfiguration

### Required outcome
An agent must be able to reconfigure an existing transport topology, including node/profile/host relationships and ordering.

### Required steps
1. Inspect the existing nodes, hosts, squads, profiles, and related outputs.
2. Change node/profile bindings where required.
3. Update host definitions and advanced options where required.
4. Reorder nodes and hosts deliberately.
5. Validate resulting computed config / delivery output.

### Current gap map
| Step | Current support | Evidence |
|---|---|---|
| 1 | mostly full | existing inspect/read surfaces in audit Tasks 7-8 |
| 2 | partial | Task 8 `task8.config-profiles.assignment-activation-downstream` |
| 3 | partial | Task 8 host advanced-options gap |
| 4 | partial | Task 8 node reorder + host bulk/ordering gap |
| 5 | partial | computed profile config exists, but full downstream validation workflow is not proven |

## Workflow C — Routing / server-routing / response-rule change

### Required outcome
An agent must be able to change routing behavior to produce real chain topologies such as: user → VLESS → RU node → WireGuard → Germany.

Routing / server-routing / response-rule change remains deferred from the current MCP support promise.
Truthful support today is narrower: `hosts.bulk_set_port` supports only bounded host port updates through preview/apply. It does not expose legacy grouped host routing, inbound association, generic profile routing-rule edits, or response-rule orchestration as executable semantic actions.

### Required steps
1. Inspect the current public profile, bridge profile, relevant inbounds, outbounds, snippets, and response-rule state before editing.
2. Define desired chain intent in operator terms, including:
   - entry profile / inbound that receives user traffic
   - bridge target node/profile that will act as the next hop
   - outbound protocol/material required for the bridge (`shadowsocks`, `vless`, `wireguard`, or equivalent Xray outbound block)
   - ordered routing intent such as `geoip:ru -> DIRECT` and `default -> DE bridge`
   - any response-rule override that changes what client apps receive
3. Apply topology changes coherently, not one field at a time:
   - add or update the bridge outbound in the public profile
   - add or update ordered routing rules in the public profile
   - create or update the bridge/server-side profile if the exit node needs its own dedicated inbound/outbound layout
   - create or update any response rules needed for template/header/app-specific delivery behavior
4. Validate the resulting intended topology by inspecting computed config/output and confirming rule ordering matches the declared chain intent.

### Semantic action contract

The implementation for this workflow is only acceptable if the MCP exposes semantic actions that let an autonomous agent express routing intent directly instead of stitching together raw JSON updates by hand.

Required semantic capabilities:

1. **Topology inspection**
   - summarize profile inbounds, outbounds, routing rules, and response-rule posture relevant to a target topology
   - highlight ordered rule evaluation where first-match semantics matter
2. **Bridge topology planning**
   - declare a topology intent with:
     - source/public profile
     - bridge/exit profile or target node
     - outbound tag/protocol details
     - ordered direct-vs-bridge routing conditions
   - preview the exact profile/rule changes before apply
3. **Bridge topology apply**
   - apply the bridge outbound and ordered routing-rule mutations as one semantic plan
   - preserve rule order intentionally because Xray rules are evaluated top-to-bottom
4. **Response-rule orchestration**
   - inspect and update response rules in an order-aware way
   - support the override semantics needed to steer subscription delivery for client apps, templates, or partner-specific cases tied to routing behavior
5. **Topology validation**
   - inspect computed profile output after changes
   - report whether the final shape still matches the declared chain intent

### Concrete workflow target

Minimum workflow that must be supportable after implementation:

1. Agent inspects `RU Public Profile` and `DE Bridge Profile` state.
2. Agent declares the intent: `users enter via PUBLIC_RU_INBOUND; RU keeps .ru traffic direct; all other traffic is forwarded through a DE bridge outbound; response rules still return the intended template/profile behavior to clients`.
3. MCP previews the outbound additions/updates, ordered routing rules, and any response-rule edits.
4. MCP applies the semantic plan.
5. MCP inspects the resulting computed config/output and confirms the ordered topology still resolves to the intended RU-direct / DE-bridge chain.

### Current gap map
| Step | Current support | Evidence |
|---|---|---|
| 1 | partial | Task 8 server-routing and response-rules rows remain partial; current MCP can inspect some profile state but not topology posture end-to-end |
| 2 | missing as semantic workflow | no existing composite topology intent layer; agent still has to reason in raw field mutations |
| 3 | partial | Task 8 `task8.server-routing.bridge-setup`, `task8.server-routing.public-profile-rule-editing`, `task8.response-rules.create-ordering`, `task8.response-rules.header-template-overrides` |
| 4 | partial | computed profile inspection exists for config profiles, but there is no semantic validation that resulting rule order/outbound layout still matches the declared chain intent |

### Source-backed implementation notes

- Official server-routing docs define the user-priority bridge pattern as a public profile whose `outbounds` and ordered `routing.rules` send selected traffic from an RU entry node to a DE bridge node/profile.
- Official config-profile docs confirm snippets can inject reusable `routing` blocks across profiles, which matters for maintaining shared routing behavior without hand-editing each profile.
- Xray routing rules are order-sensitive and are evaluated from top to bottom, so any MCP action that mutates them must preserve explicit ordering semantics.

## Workflow D — External squad onboarding / white-label partner setup

### Required outcome
An agent must eventually be able to onboard and maintain a partner-facing external squad with meaningful override settings.

### Current MCP-safe steps
No external squad operation is currently executable through the compact v2 `remnawave_api` runtime. External squad lifecycle, delivery-definition patches, and membership control are planning-only in this contract.

### Semantic action contract

The current single-tool MCP contract for external squads is intentionally deferred. Future support must not be published as current runtime behavior until registry-backed operations exist and pass safety review.

Required future capabilities:

1. **External squad inspection**
   - summarize override posture, template bindings, subscription-setting overrides, and header overrides relevant to white-label delivery
2. **External squad bounded delivery-definition patching**
   - patch one existing external squad through a validated runtime operation after the seam exists
3. **External squad bounded membership management**
   - add or remove explicit user UUIDs for one external squad after the seam exists
4. **Access-control coexistence**
   - leave internal squad workflows separate from partner delivery overrides

Not currently supported through the MCP surface: create external squads, inspect external squad delivery posture, patch external squad definitions, manage external squad membership, reorder external squads, preview/apply job semantics, or dedicated partner-field affordances such as `subpageConfigUuid` and `responseHeaders.profile-web-page-url`.

### Concrete workflow target

Minimum future workflow after implementation:

1. Agent inspects an existing partner-facing external squad, e.g. `Bat Connect Pro`.
2. Agent updates supported delivery overrides represented in a bounded patch seam.
3. Agent applies the external squad patch through the designed mutation.
4. Agent adds or removes users through a designed membership operation when assignment changes are needed.
5. Agent can coordinate internal-squad assignment separately for access-control workflows.

### Current gap map
| Step | Current support | Evidence |
|---|---|---|
| 1 | not supported | `external_squads` domain is absent from runtime discovery |
| 2 | not supported | no registry-backed external squad patch operation |
| 3 | not supported | no registry-backed external squad mutation operation |
| 4 | not supported | no registry-backed external squad membership operation |
| 5 | not supported | internal squad operations are also outside the current runtime scope |

### Source-backed implementation notes

- Official squads docs define external squads as the place to override Templates and subscription Settings for a user group.
- OpenAPI breadth and prior rollout notes mention richer lifecycle and ordering behavior, but those routes are not promoted into the current model-facing MCP contract and must not be published as supported runtime behavior.

## Workflow E — Template delivery control / advanced Xray JSON

### Required outcome
An agent must stay inside the currently truthful single-tool contract for subscription templates, subscription page configs, and snippets.

### Current MCP-safe steps
1. List or read subscription templates with `templates.list` and `templates.get`.
2. Create, update, or delete subscription templates with `templates.create`, `templates.update`, and confirmation-gated `templates.delete`.
3. List, create, update, or delete snippets with `snippets.list`, `snippets.create`, `snippets.update`, and confirmation-gated `snippets.delete`.

### Semantic action contract

The current single-tool MCP contract supports atomic template CRUD and atomic snippet CRUD. It does not support legacy grouped template inspection, legacy grouped template management, legacy grouped snippet lifecycle management, subscription-page config mutation, template reorder, snippet reorder, advanced `XRAY_JSON` validation workflows, or public subscription-page delivery management.

Supported now:

1. **Template CRUD**
   - `templates.list` returns subscription template inventory
   - `templates.get` reads one subscription template
   - `templates.create` creates one subscription template
   - `templates.update` updates one subscription template
   - `templates.delete` deletes one subscription template after tier3 confirmation
2. **Snippet CRUD**
   - `snippets.list` returns snippet inventory
   - `snippets.create` creates one snippet
   - `snippets.update` updates one snippet
   - `snippets.delete` deletes one snippet after tier3 confirmation

Deferred from the current MCP surface: template reorder and broader delivery workflows, advanced `XRAY_JSON` validation semantics, snippet reorder or composite snippet lifecycle workflows, subscription-page config mutation, and any public subscription-page delivery or `/sub/*` management flow.

### Concrete truthful workflow target

Minimum workflow that is truthfully supportable in the current MCP surface:

1. Agent lists templates or reads a known template with `templates.list` / `templates.get`.
2. Agent creates or updates a template using the atomic template operations when it already has a valid payload.
3. Agent lists, creates, updates, or deletes snippets through the atomic snippet operations.

### Current gap map
| Step | Current support | Evidence |
|---|---|---|
| Template list/read | supported | `templates.list`, `templates.get` |
| Template create/update/delete | supported | `templates.create`, `templates.update`, `templates.delete` |
| Template reorder/broader delivery workflow | not supported | no registry-backed reorder or composite delivery operation |
| Snippet list/create/update/delete | supported | `snippets.list`, `snippets.create`, `snippets.update`, `snippets.delete` |
| Subscription-page config mutation | not supported | no `subscription_page` runtime domain |
| Public subscription-page delivery management | not supported | outside v1 MCP boundary |

### Source-backed implementation notes

- `src/remnawave-api/registry.ts` and the scope docs publish atomic `templates.*` CRUD and atomic `snippets.*` CRUD operations as supported.
- Broader OpenAPI inventory for template reorder, clone, public subscription-page delivery, subscription-page config mutation, or composite snippet workflows is not sufficient evidence for promotion unless the single-tool runtime/client seam also exposes those operations truthfully.
