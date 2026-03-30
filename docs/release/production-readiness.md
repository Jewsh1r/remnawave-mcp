# Production Readiness Report

This report is the authoritative release-readiness summary for the current repository state. It aligns package metadata, the operator README, and the published capability matrix with the implementation and verification evidence that actually exist in this repo.

## Release metadata summary

- Package name: `@indiebrothers/mcp-remnawave`
- Server version: `0.1.0`
- Runtime model: local stdio MCP server only
- Built entrypoint: `dist/index.js`
- Required runtimes: Node.js `>=20.11.0`, npm `>=10.0.0`
- Supported Remnawave version policy: `2.7.3` only

The package is intentionally conservative. It does not claim Docker packaging, remote transport hosting, or compatibility with unknown Remnawave panel versions.

## Compatibility policy

The current compatibility contract is intentionally strict.

- Supported: Remnawave `2.7.3`
- Unsupported explicit versions: startup fails with `REMNAWAVE_VERSION_UNSUPPORTED`
- Missing or unknown versions: startup fails with `REMNAWAVE_VERSION_UNKNOWN`
- Discovery gating: tools, resources, and prompts are not advertised when version gating fails

This policy is grounded in Task 3 contract evidence, where the live metadata fixture reports panel version `2.7.3` and contradicts the newer external changelog latest marker of `2.7.4`. The repo therefore publishes support only for the version it has verified directly.

## Capability matrix publication status

The published capability matrix remains the authoritative domain-level scope record:

- Matrix: [`docs/scope/capability-matrix.md`](../scope/capability-matrix.md)
- Contract evidence baseline: [`docs/contracts/remnawave-contract-report.md`](../contracts/remnawave-contract-report.md)

The matrix status values should be interpreted literally in release decisions:

- `supported` means the repo ships the capability now
- `compat` means semantic compatibility only, not upstream shape/count fidelity
- `deferred` means intentionally postponed and not part of the current support promise
- `dropped` means intentionally excluded from the shipped surface

## Supported stable domains

- Users tools/domain
- Users resolve
- Nodes tools/domain
- System diagnostics domain (`system_get_stats`, `system_get_health`)
- Subscriptions read domain
- Core resources:
  - `remnawave://panel/statistics`
  - `remnawave://nodes/status`
  - `remnawave://system/health`

These are the stable operator-facing domains that the repo treats as first-class and supported for the current release.

## Supported advanced domains

- Metadata
- Node plugins
- Bandwidth stats
- HWID inspection
- Guided operational prompts at semantic-compat level

These remain intentionally separated from the stable core because they have higher drift sensitivity, broader surface ambiguity, or prompt-level semantic rewrite constraints.

## Deferred domains

- Config profiles / inbounds
- Squads as a standalone domain
- Subscription page configs
- IP control
- Bulk actions
- Recap

Deferred domains are documented on purpose so operators do not infer support from upstream references, bundled OpenAPI breadth, or older benchmark claims.

## Dropped domains

- Hosts

The repo does not publish a separate hosts domain. Verified operator value is currently covered by nodes plus system diagnostics, and there is no live Task 3 fixture validating a first-class hosts surface.

## Mutation support boundary

The shipped mutation surface is narrower than the full upstream ecosystem and should be read as part of readiness:

- Supported mutating tools:
  - `users_mutate_subscription`
  - `users_mutate_squads`
- Required execution mode: explicit `preview` or `apply`
- Current safety posture: deterministic planning first, then optional apply

This repo does not claim generalized bulk mutation support, rollback orchestration, or unsafe write shortcuts.

## Known risks and limitations

- **Version drift risk:** external changelog material already references `2.7.4`, but this repo has only live-validated `2.7.3`.
- **Advanced-domain drift risk:** metadata, plugin, bandwidth, and HWID shapes are useful but more likely to drift than the stable core.
- **Environment verification gap:** TypeScript LSP diagnostics are not available in this environment because `typescript-language-server` is not installed.
- **Packaging/runtime limitation:** the repo ships local stdio execution only; Docker/container guidance is intentionally unsupported.
- **Deferred capability expectation risk:** upstream breadth references can cause operators to assume unsupported domains exist unless they read the matrix/README carefully.

## Upstream-relative notes

Relative to the upstream-inspired scope, this repository intentionally ships a smaller and more explicit surface:

- supported inventory is narrower and deterministic
- prompts are treated as semantic compatibility, not copied inventory promises
- deferred and dropped domains are published explicitly instead of being implied by upstream breadth
- unsupported runtime claims such as Docker are omitted until real artifacts exist

No separate migration guide is required for this repo state beyond those compatibility and scope notes.

## Verification evidence

This release-readiness report is supported by the following repo artifacts and command evidence:

- Contract baseline: [`docs/contracts/remnawave-contract-report.md`](../contracts/remnawave-contract-report.md)
- Scope baseline: [`docs/scope/capability-matrix.md`](../scope/capability-matrix.md)
- Prior implementation evidence:
  - `.sisyphus/evidence/task-6-config-errors.txt`
  - `.sisyphus/evidence/task-7-normalization.txt`
  - `.sisyphus/evidence/task-8-discovery.txt`
  - `.sisyphus/evidence/task-9-readonly-core.txt`
  - `.sisyphus/evidence/task-10-mutation-preview.txt`
  - `.sisyphus/evidence/task-11-advanced-domains.txt`
- Task 15 consistency/build/test evidence:
  - `.sisyphus/evidence/task-15-release-readiness.txt`
  - `.sisyphus/evidence/task-15-release-readiness-error.txt`

## Release decision

The current repository state is production-ready only within the boundaries described above:

- local stdio runtime only
- Remnawave `2.7.3` only
- published stable core plus published advanced set only
- deferred and dropped domains remain out of scope

Any broader release claim would overstate the verified implementation.
