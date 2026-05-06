# Production Readiness Report

This report is the authoritative release-readiness summary for the current repository state. It aligns package metadata, the operator README, the published capability matrix, runtime discovery, and the verification evidence that actually exist in this repo.

The publication boundary described here is based on the current audited repo state: what the runtime actually advertises, what the registry actually marks as `supported`/`deferred`/`denied`, and what the in-repo verification suite proves now.

## Release metadata summary

- Package name: `@indiebrothers/mcp-remnawave`
- Server version: `0.2.0`
- Runtime model: local stdio MCP server only
- Built entrypoint: `dist/index.js`
- Required runtimes: Node.js `>=20.11.0`, npm `>=10.0.0`
- Supported Remnawave version policy: `2.7.0` through `2.7.4`

The package is intentionally conservative. It does not claim Docker packaging, remote transport hosting, or compatibility with unknown Remnawave panel versions.

## Remnawave MCP v1 release target

This release is specifically about the `remnawave_api` v2 compact single-tool contract and its current registry-backed support boundary.

- Primary tool: `remnawave_api`
- Published flow: discovery → describe → execute
- State progression: `domain` → `domain + operation` → `domain + operation + payload`
- Success format: direct compact payload (no `ok`, `details`, `result`, or coaching fields)
- Error format: compact `{ error: { code, kind, message, retryable, ... } }` envelope
- Supported executable operations are the registry-backed `supported` entries published in `docs/scope/remnawave-api-v1-scope.md`

Release readiness therefore depends on two things being true at the same time:

1. the docs tell callers to use the single-tool contract first
2. the docs do not overstate the current executable boundary beyond the registry-backed support map

## Compatibility policy

The current compatibility contract is intentionally strict.

- Supported: Remnawave `2.7.0` through `2.7.4`
- Unsupported explicit versions: startup fails with `REMNAWAVE_VERSION_UNSUPPORTED`
- Missing or unknown versions: startup fails with `REMNAWAVE_VERSION_UNKNOWN`
- Discovery gating: the tool is not advertised when version gating fails

This policy remains grounded in the verified `2.7.x` evidence chain rather than newer upstream changelog markers.

## Capability matrix publication status

The published capability matrix remains the authoritative capability-level support record:

- Matrix: [`docs/scope/capability-matrix.md`](../scope/capability-matrix.md)
- Contract evidence baseline: [`docs/contracts/remnawave-contract-report.md`](../contracts/remnawave-contract-report.md)

This is a capability boundary, not an endpoint inventory.

For v1 single-tool publication, the scope source of truth is also:

- Single-tool scope map: [`docs/scope/remnawave-api-v1-scope.md`](../scope/remnawave-api-v1-scope.md)
- Contract implementation: [`src/remnawave-api/contract.ts`](../../src/remnawave-api/contract.ts)

The capability classes should be interpreted literally in release decisions:

- `supported` means the repo publishes the capability now
- `sensitive-read` means the repo supports the read but governs it with redaction/reveal policy
- `dangerous-write` means the repo supports high-impact writes through the shared tier3 safety gate
- `deferred` means intentionally outside the runnable support promise
- `dropped` means intentionally excluded from the shipped surface

## Published supported boundary

The shipped boundary for this release is registry-backed and intentionally explicit. It currently publishes 148 supported operations across 18 runtime domains:

- one published tool: `remnawave_api`
- executable behavior only for operations marked `supported` in the scope map
- excluded and deferred operations are absent from runtime discovery; direct calls return compact unsupported-operation errors
- runtime outputs do not emit legacy `ok`, `result`, `details`, coaching, or execution-eligibility fields

The currently supported atomic operations include safe system reads, user lookup/create/update/lifecycle/bulk workflows, node and host reads/writes plus guarded bulk workflows, profile lifecycle/reorder operations, metadata get/upsert, template CRUD/reorder, snippet CRUD, public and protected subscription reads, subscription request-history reads, subscription settings/page-config workflows, squad lifecycle and membership operations, HWID workflows, bandwidth stats, and infra-billing provider/node/history workflows.

Important supported examples include `nodes.restart` through the shared tier3 confirmation gate and Infra-billing provider, node, mutation, and history workflows through the generated runtime adapter. `hosts.bulk_set_port` covers bounded host port changes only; broader host changes use their specific atomic or guarded bulk operations rather than a legacy grouped routing operation.

- migration guidance remains single-tool-only: callers should use `remnawave_api` with `domain`, `operation`, and `payload`; legacy multi-tool or `tool_name` public surfaces are not part of the published contract

Dangerous node actions remain supported only through the shared tier3 confirmation gate; publication of these operations does not bypass the confirmation-required runtime path.

## Source-precedence and version-sensitive boundaries

- Support decisions prefer the observed panel model plus durable docs/spec agreement over raw path breadth.
- Response and delivery precedence is published as: Response Rules > External Squads > Host or template defaults.
- External squad semantics are version-sensitive where documented (`v2.2.0+`).
- Node plugin semantics are version/prerequisite-sensitive where documented (`v2.7.0+` panel/node context, torrent-blocker docs calling out Xray-core `26.3.27`, plus platform prerequisites such as `NET_ADMIN`, `nftables`, and supported kernel behavior).

## Deferred and excluded surfaces

Deferred capabilities and explicitly excluded surfaces are intentionally absent from runtime discovery. Direct calls to unsupported domains or operations return compact unsupported-operation errors.

- Auth/bootstrap, tokens, keygen, Remnawave-settings, node-plugin, and IP-control surfaces
- Dangerous/internal system helpers such as x25519 generation, HAPP encryption, and SRR matcher endpoints
- Standalone routing or response-rule control-plane seams outside the supported profile/host endpoints

No standalone routing or response-rule control-plane seam is published as executable in this release.

Excluded domains are documented on purpose so operators do not infer support from upstream references, bundled OpenAPI breadth, or older benchmark claims.

## Dropped publication claims

- Endpoint/path inventory framing
- "All OpenAPI paths supported" style claims
- Unsupported runtime claims such as Docker packaging or remote hosted transport

These are intentionally excluded so the published support boundary stays truthful.

## Known risks and limitations

- **Version drift risk:** upstream materials can reference versions newer than `2.7.4`, but this repo publishes support only for the verified `2.7.0` through `2.7.4` gate.
- **Advanced operational drift risk:** metadata, bandwidth, plugin, and composite/operator surfaces are useful but more drift-sensitive than the narrowest stable core.
- **Environment verification gap:** TypeScript LSP diagnostics are not available in this environment; authoritative verification here is command-based.
- **Packaging/runtime limitation:** the repo ships local stdio execution only; Docker/container guidance is intentionally unsupported.
- **Deferred capability expectation risk:** upstream breadth references can cause operators to assume richer workflows than the supported semantic surface unless they read the README carefully.
- **Dangerous action confirmation model:** tier3 operations (template/snippet delete, subscription revoke, node restart) require explicit confirmation before execution. See the [danger classes reference](../safety/danger-classes-and-side-effects.md).

## Release-readiness checklist

The following checklist must be satisfied before publishing or tagging the v1 single-tool release.

### Documentation gates

- [x] `README.md` explains that `remnawave_api` is the primary public interface
- [x] `README.md` documents the three-state flow: discovery → describe → execute
- [x] `README.md` describes the currently supported executable operations truthfully
- [x] `docs/scope/remnawave-api-v1-scope.md` matches the registry-backed supported/deferred/denied map
- [x] `docs/scope/remnawave-api-v1-scope.md` matches the registry-backed compact v2 domain list
- [x] release docs do not describe deferred or denied operations as executable support

### Test and verification gates

- [ ] `npm run check` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] any scope-sync or contract tests that validate the registry-backed scope snapshot pass
- [ ] documentation examples are manually reviewed against the current `contract.ts` and `registry.ts` behavior

### Version gates

- [ ] package version in `package.json` matches the intended release artifact (`0.2.0`)
- [ ] supported Remnawave version gate is `2.7.0` through `2.7.4`
- [ ] startup still fails closed for unsupported versions with `REMNAWAVE_VERSION_UNSUPPORTED`
- [ ] startup still fails closed for unknown or missing versions with `REMNAWAVE_VERSION_UNKNOWN`
- [ ] failed version gating still prevents tool advertisement

### Compatibility verification gates

- [ ] discovery advertises `remnawave_api` as the primary v1 interface
- [ ] `domain`-only calls produce operation discovery results
- [ ] `domain` + `operation` calls produce operation description metadata
- [ ] `domain` + `operation` + `payload` executes only supported operations and returns compact validation or unsupported errors otherwise
- [ ] supported examples in README remain valid for the currently documented `supported` operations

### Rollback plan

- [ ] preserve the previous published package artifact and release notes before shipping the new docs/version
- [ ] if the single-tool docs or discovery contract are found to misstate scope, revert the documentation change set and republish corrected release notes before widening support claims
- [ ] if version gating regresses, roll back to the last known-good artifact that still enforces the `2.7.x` gate before discovery
- [ ] if migration guidance breaks clients, temporarily restore the last accurate legacy guidance while fixing the `remnawave_api` docs and scope snapshot
- [ ] after rollback, rerun `npm run check`, `npm test`, and `npm run build` before any republish

## Rollback posture

Rollback for this release is intentionally simple and documentation-first:

1. revert the release commit or restore the last known-good package artifact
2. restore the previous README/scope/readiness files if the single-tool messaging is inaccurate
3. confirm the `2.7.x` gate still blocks unsupported startup before rediscovery is advertised
4. rerun the standard verification commands before reissuing any release statement

Because the current release is about truthful publication of the v2 compact contract, the main rollback risk is misleading callers about what is executable. The rollback response should prioritize restoring accurate documentation and version-gated behavior over preserving aspirational scope language.

## Verification evidence

This release-readiness report is supported by the following repo artifacts and command evidence:

- Contract baseline: [`docs/contracts/remnawave-contract-report.md`](../contracts/remnawave-contract-report.md)
- Scope baseline: [`docs/scope/capability-matrix.md`](../scope/capability-matrix.md)
- Prior implementation evidence:
  - `.sisyphus/evidence/task-8-discovery.txt`
  - `.sisyphus/evidence/task-13-docs.txt`
  - `.sisyphus/evidence/task-13-infra-billing.txt`
  - `.sisyphus/evidence/task-15-release-readiness.txt`

For Task 0 baseline freeze, the operative truth is the current in-repo runtime, registry, docs, and command verification rather than prior completion narratives.

## Release decision

The current repository state is production-ready only within the boundaries described above:

- local stdio runtime only
- Remnawave `2.7.0` through `2.7.4`
- only the published single-tool boundary described by the current registry-backed scope map
- compact v2 direct payload and error contract

Any broader release claim would overstate the verified implementation.

## Migration and compatibility

### From 0.1 grouped/envelope behavior to 0.2 compact v2

Version 0.2.0 removes grouped operation names and legacy response envelopes. Callers using 0.1.x must migrate to atomic operation names and compact direct payloads.

**Removed in 0.2.0:**

- Grouped operation names such as `users.manage_lifecycle`, `hosts.manage_routing`, `nodes.manage_maintenance`, and `profiles.manage_lifecycle`
- Legacy response envelopes containing `ok`, `result`, `details`, `suggested_next_step`, `recommended_next_operations`, and `execution_eligibility`
- Runtime discovery of deferred or denied operations

**Migration path:**

1. Replace grouped `manage_*` names with equivalent atomic operations
2. Remove parsing for legacy envelope fields
3. Read direct compact payloads on success and compact `error` objects on failure
4. Update confirmation-gated flows to use top-level `confirmToken` retry

See the [migration guide](../migration/flat-to-single-tool.md) for detailed migration instructions.

### From flat-tool to single-tool contract

This release represents a clean break from legacy flat-tool MCP designs. The single-tool `remnawave_api` contract is the only published interface.

**Not supported:**

- Legacy multi-tool discovery (individual tool names per operation)
- Backward-compatible tool aliases or shims
- Mixed-mode operation (old and new patterns simultaneously)

**Migration path:**

Callers using legacy flat-tool patterns must migrate to the three-state single-tool contract:

1. Use `remnawave_api` as the only tool name
2. Provide `domain` + `operation` + `payload` for execution
3. Use discovery to enumerate available operations within domains

See the [migration guide](../migration/flat-to-single-tool.md) for detailed migration instructions.

### Compatibility commitment

The published compatibility surface is:

- Single tool: `remnawave_api` only
- Domain/operation/payload invocation pattern
- Registry-backed `supported` operations only
- Remnawave version `2.7.0` through `2.7.4`
- Compact v2 direct payload and error contract

No legacy compatibility shims are published or discoverable.
