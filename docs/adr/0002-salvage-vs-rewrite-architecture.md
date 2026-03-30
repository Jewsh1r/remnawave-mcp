# ADR 0002: Salvage-vs-Rewrite Architecture for mcp-remnawave

**Date:** 2026-03-30  
**Status:** Accepted  
**Deciders:** Инди Братья

---

## Context

We need an architecture decision for how much of upstream `TrackLine/mcp-remnawave` should be retained versus redesigned while building a local-first implementation.

Upstream shape (from project tree and README context):
- `src/index.ts`, `server.ts`, `config.ts`
- `client/index.ts`
- `tools/*` (tool-centric MCP server)
- `resources/index.ts`
- `prompts/index.ts`
- readonly gating and stdio transport
- backend contracts via `@remnawave/backend-contract`

Local Redivo reference patterns (from existing Python integration) emphasize:
- typed normalization at the boundary (`services/remnawave/contracts.py`)
- explicit plan/apply separation (`services/remnawave/reconcile.py`, `scripts/remnawave_safe_reconcile.py`)
- dry-run-first, operator-safe posture (`remnawave_safe_reconcile.py` default mode)

Task goal: freeze a practical salvage-vs-rewrite default for implementation tasks that follow.

---

## Evaluation Criteria

Each upstream area is classified using these criteria:

1. **Separation of transport/validation/tool semantics**: can the area remain cleanly separated so MCP transport details do not leak into domain semantics?
2. **API drift**: how likely is mismatch between upstream assumptions and our Remnawave deployment/runtime behavior?
3. **test reuse**: can existing tests or test intent be reused with low adaptation cost?
4. **time-to-safe-delivery**: which choice gets us to an operator-safe baseline fastest without hidden coupling?
5. **Schema coupling risk**: default to rewrite where coupling to legacy/upstream schema conventions is high.

Allowed labels are strictly: `reuse`, `transplant concept only`, `rewrite`.

---

## Adapter Boundary (Authoritative)

The **adapter boundary** is between:

- **Raw Remnawave contracts** (wire-format payloads, HTTP/client DTOs, backend contract details), and
- **MCP-facing tool semantics** (normalized tool inputs/outputs, tool-safe error mapping, dry-run/plan/apply semantics).

Rules:
- Everything at or below raw API payload shape is adapter-layer concern.
- MCP tools must consume normalized internal models, not raw backend contract objects.
- Validation and normalization happen before tool semantics are evaluated.
- Plan generation and apply execution are separate phases; dry-run is default for mutating flows.

This boundary is mandatory for all domain modules.

---

## Domain Classification Matrix

| Upstream Area | Classification | Rationale |
|---|---|---|
| Bootstrap / entrypoint (`src/index.ts`, `server.ts`) | transplant concept only | Keep the idea of a thin bootstrap and stdio MCP startup, but re-implement to enforce our boundary, lifecycle hooks, and safety defaults. |
| Config (`config.ts`) | rewrite | High environment/schema coupling risk; we need explicit local config contracts and safety-oriented defaults aligned with operator usage. |
| Client (`client/index.ts`) | transplant concept only | Keep layering idea (single API client), but rewrite concrete contract mapping and error taxonomy around local normalization requirements. |
| Tool registration (tool registry wiring) | transplant concept only | Registry composition pattern is reusable, but registration must be rebuilt around plan/apply split and dry-run-first semantics. |
| Per-domain tool modules (`tools/*`) | rewrite | Highest schema/behavior coupling. Domain behavior must be rebuilt around normalized models, explicit reconcile planning, and safe mutation boundaries. |
| Resources (`resources/index.ts`) | rewrite | Resource surface should be minimized and aligned to local operator workflows; upstream assumptions likely drift. |
| Prompts (`prompts/index.ts`) | rewrite | Prompt semantics are product-specific and tightly coupled to tool outputs; low direct salvage value. |
| Helper formatting/utilities | transplant concept only | Formatting ideas can be borrowed, but helper code should be rewritten to match local typing, naming, and error contracts. |
| Validation / contract boundary (including backend-contract usage) | rewrite | This is the critical safety boundary. We require strict normalization before tool semantics; direct contract passthrough is rejected. |

---

## Final Architecture Decision

**Decision:** Adopt a **rewrite-default architecture** with selective concept transplants; do not reuse upstream modules verbatim as the baseline.

Interpretation:
- Default action for new implementation work is `rewrite`, especially for schema-coupled domains.
- `transplant concept only` is allowed for structural ideas (bootstrap shape, registry, client layering) but code is re-authored.
- `reuse` is currently not selected for major areas because current priorities are boundary correctness and safe delivery under likely API drift.

Why this is accepted:
- Preserves strict adapter boundary between raw contracts and MCP semantics.
- Aligns with local proven pattern: normalization first, then plan/apply, with dry-run as default operator posture.
- Optimizes for time-to-safe-delivery while avoiding hidden coupling that would degrade maintainability.

---

## Legacy Compatibility Treatment

- Provide compatibility at the adapter edge only (field aliasing/normalization where needed).
- Do not propagate legacy/raw shape into tool-facing contracts.
- If upstream behavior is emulated for continuity, emulate at semantic level (tool result meaning), not by preserving upstream internal module structure.
- Compatibility shims are transitional and must be removable without touching MCP tool contracts.

---

## Consequences

- Implementation tasks should start from local domain contracts and tool semantics, then map to raw Remnawave payloads in adapter code.
- Test strategy prioritizes semantic tests (tool behavior, plan/apply invariants, dry-run guarantees) over direct structural parity with upstream files.
- Any future proposal to mark a major domain as `reuse` requires a follow-up ADR addendum with explicit risk and verification plan.
