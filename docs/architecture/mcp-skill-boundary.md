# MCP vs Skill Responsibility Boundary

This document defines the explicit separation of concerns between the RemnaWave MCP tool contract and the RemnaWave operator skill. This boundary ensures the MCP remains self-sufficient while the skill provides supplementary domain knowledge.

## Core Principle

**The MCP tool contract is the primary execution surface. The skill is supplementary guidance only.**

No critical execution path should depend on reading the skill first. The MCP must be fully usable through its own discovery, validation, and execution semantics.

---

## MCP Responsibilities (Execution Layer)

The MCP owns everything required to discover, validate, and execute operations without external guidance:

### 1. Execution
- **Tool routing and dispatch**: The `remnawave_api` tool handles all domain/operation routing
- **Handler mapping**: Registry maps domain/operation pairs to executable handlers
- **Client interaction**: Direct RemnaWave panel API communication
- **Response formatting**: Compact v2 direct payloads on success and compact error envelopes on failure

### 2. Discovery
- **Domain enumeration**: Listing supported domains via `domain`-only requests
- **Operation discovery**: Per-domain operation lists with risk markers
- **Schema exposure**: Compact describe-operation output for each supported operation
- **Tool inventory**: MCP `listTools` advertising the primary `remnawave_api` surface

### 3. Validation
- **Payload schema validation**: Per-operation validation functions
- **Field-level errors**: Specific validation issues with field paths and codes
- **Intent validation**: Ensuring payload semantics match operation requirements
- **Pre-execution checks**: All validation completes before any mutating call

### 4. Risk Metadata
- **Risk tier classification**: Tier 1 (read), Tier 2 (routine write), Tier 3 (dangerous)
- **Safety policy enforcement**: Dangerous-action gating with confirm-token requirements
- **Impact summaries**: Blast radius and side-effect documentation for Tier 3 operations
- **Write classification**: Clear mutability markers on all operations

### 5. Normalized Errors
- **Error envelope consistency**: All failures return the same top-level structure
- **Error categorization**: `validation`, `unsupported_operation`, `confirmation_required`, `preview_required`, `upstream`, `internal`
- **Upstream preservation**: Upstream panel errors are returned as compact `upstream` kind errors, never nested raw payloads at the top level
- **Retry guidance**: `retryable` flag for recovery
- **Sensitive data redaction**: Secrets and keys filtered per repo policy

The current runtime contract does not emit legacy `ok`, `result`, `details`, coaching, or `suggested_next_step` fields.

### 6. Contract States
The MCP implements three strict request states:
- **State A**: `domain` only → returns compact operation discovery
- **State B**: `domain + operation` without valid payload → returns compact describe-operation
- **State C**: `domain + operation + valid payload` → executes if validation and policy pass

---

## Skill Responsibilities (Guidance Layer)

The skill owns domain knowledge that helps operators make correct decisions but is not required for execution:

### 1. Panel Architecture Concepts
- **Control plane vs data plane**: Panel manages state; nodes run Xray
- **Object relationships**: How profiles, hosts, squads, and nodes interconnect
- **Delivery pipeline**: Request path from subscription to config output
- **Layer dependencies**: Which layers must work for traffic to flow

### 2. Entity Relationships
- **Internal squads**: Access control model (inclusion-based, not exclusion-based)
- **External squads**: Delivery override semantics and precedence rules
- **Profile composition**: How inbounds, routing, and snippets combine
- **Host inheritance**: What hosts derive from their bound inbounds
- **Node runtime**: Relationship between panel state and Xray process

### 3. Automatic Side Effects
- **Profile changes trigger node restarts**: Config profile updates restart affected nodes
- **Squad membership changes**: Adding users to squads may trigger subscription updates
- **Host mutations**: Changes propagate to subscription output on next request
- **Node maintenance actions**: Restart, disable, enable have cascading effects

### 4. Async Job Semantics
- **IP-control fetch jobs**: Submit → poll → result pattern
- **Job state transitions**: Pending → running → completed/failed
- **Result persistence**: How long job results remain queryable
- **Cancellation policies**: Which jobs can be aborted

### 5. Operator Judgment Guidance
- **Debug order**: Recommended layer-checking sequence (squads → hosts → profiles → nodes)
- **Dangerous operation awareness**: What makes an action high-blast-radius
- **Bridge vs direct patterns**: Architecture decision guidance
- **Experimental promotion**: When new protocols are safe for production
- **Common footguns**: Mistakes that waste time or cause incidents

---

## What the Skill Must NOT Contain

To maintain the boundary, the skill must never be the sole source for:

1. **Schema definitions**: Payload shapes must be discoverable through MCP describe-operation
2. **Validation rules**: Field requirements must be enforced by MCP validation
3. **Execution eligibility**: Whether an operation can run is determined by MCP registry
4. **Error codes**: Normalized error categories come from MCP error envelopes
5. **Tool names**: Primary tool is always `remnawave_api`, not skill-derived names
6. **Workflow cookbooks**: Fragile step-by-step scripts that bypass MCP discovery
7. **Endpoint mappings**: Direct API path references that skip the domain/operation abstraction

---

## Usage Pattern

### Correct Flow (MCP-First)

1. Call `remnawave_api` with `domain` only → discover available operations
2. Call with `domain + operation` → see compact schema and requirements
3. Build valid payload based on MCP-described schema
4. Execute through MCP → receive normalized response
5. **Optionally** consult skill for architectural context if result is unexpected

### Incorrect Flow (Skill-Dependent)

1. Read skill to find "how to do X"
2. Try to construct payload from skill examples
3. Hope the skill examples match current MCP contract
4. Execute and hope error handling matches skill description

---

## Verification

The boundary is verified by these tests:

1. **Self-sufficiency test**: MCP discovery, validation, and execution work without loading the skill
2. **Skill supplementary test**: Skill content contains no execution-critical details absent from MCP
3. **Contract completeness**: All execution paths are describable through MCP alone

---

## References

- Canonical contract: `src/remnawave-api/contract.ts`
- Design decision: MCP execution behavior is defined in-repo, not by an external operator skill
- Implementation scope: compact v2 runtime contract and registry-backed operation support
- Operator guidance: supplementary only; it must not contain execution-critical details absent from MCP

---

## Change Control

Updates to this boundary require:
1. Changes to MCP responsibilities → update contract.ts and this document
2. Changes to skill responsibilities → update SKILL.md and this document
3. Verification that no execution-critical rule exists only in the skill
4. Evidence files showing self-sufficiency is preserved
