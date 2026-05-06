# ADR 0001: Repository Origin and Bootstrap Strategy

**Date:** 2026-03-30  
**Status:** Accepted  
**Deciders:** Инди Братья

---

## Context

We are building an MCP server for the Remnawave VPN management API. An upstream open-source project, [`TrackLine/mcp-remnawave`](https://github.com/TrackLine/mcp-remnawave), already exists and is MIT-licensed. We need to decide:

1. Whether to fork the upstream repo or create an independent repository.
2. Whether to import upstream git history or start fresh.
3. What attribution obligations exist and how to meet them.

---

## Decision

### 1. Not a fork

We create `mcp-remnawave` as an **independent repository** in the Инди Братья organization. It is not a GitHub fork and shares no git history with `TrackLine/mcp-remnawave`.

**Why:**
- We want full control over naming, release cadence, tooling, and code direction without inheriting upstream's git topology.
- Forking creates a visible public relationship on GitHub that may not reflect our actual intent (significantly rewritten or divergent implementation).
- MIT License does not require forking; it only requires preserving copyright notices if substantial code is copied.

### 2. Fresh start (default), selective history import as fallback

The repository is initialized from scratch locally. No upstream code or commit history is imported at this time.

**Why:**
- We expect to rewrite substantial portions informed by upstream concepts rather than copy them verbatim. A fresh start keeps the diff legible and ownership clear.
- History preservation adds complexity (grafted branches, confusing `git log` output) without legal necessity under MIT.

**Fallback condition:** If a future task finds it necessary to import a large upstream module verbatim with minimal modification, the relevant files may be imported and their upstream origin noted explicitly in:
  - A commit message referencing this ADR.
  - An update to `NOTICE.md` with the upstream copyright notice.
  - A comment in the imported file(s), if appropriate.

This fallback is opt-in and requires a documented justification at the time of import.

### 3. Attribution strategy

The MIT License for `TrackLine/mcp-remnawave` requires preserving the upstream copyright notice only when **substantial portions** of the upstream code are distributed. Conceptual inspiration and reimplementation do not trigger this requirement.

Our approach:
- `NOTICE.md` tracks the current state: no upstream code incorporated at initialization.
- If upstream code is incorporated, `NOTICE.md` is updated immediately with the upstream copyright notice and a description of what was taken.
- `LICENSE` covers this repository's own code under MIT with Инди Братья copyright.

### 4. Local-first bootstrap

Remote repository creation and publication are handled separately from this local bootstrap. This task bootstraps the local git repository only. No remote is configured at initialization.

---

## Consequences

- Future contributors must check `NOTICE.md` before incorporating upstream code to understand current attribution status.
- Selective upstream imports are permitted but must be documented immediately in `NOTICE.md` and the relevant commit.
- The `docs/adr/` directory is the authoritative record of design decisions for this repository. New ADRs should follow this template.
- History imports (fallback path) should be done in a dedicated branch with a clear commit message explaining the source, not silently merged into main.

---

## Alternatives Considered

| Option | Rejected Because |
|---|---|
| GitHub fork of TrackLine/mcp-remnawave | Creates permanent upstream relationship we don't intend to maintain; complicates divergence. |
| Import full upstream git history by default | Adds noise to `git log`; MIT does not require it; complicates ownership narrative. |
| No attribution documentation | MIT requires copyright preservation if substantial code is copied; proactive documentation is safer. |
