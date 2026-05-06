# Remnawave Contract Validation Report (Task 3)

## Capture scope

- Capture source: **live Remnawave panel** (fresh capture, not the stale 2026-03-23 snapshot)
- Capture timestamp (UTC): `2026-03-30T07:49:25Z`
- Baseline host/auth source: local secure credentials in `.secure/`
- Fixture storage: `fixtures/contracts/*.json`
- Sanitization: secrets, identifiers, subscription links, host-specific URLs/tokens are redacted

## Frozen fixture inventory

| Domain | Endpoint | Status | Fixture |
|---|---|---:|---|
| nodes | `GET /api/nodes` | 200 | `fixtures/contracts/nodes.json` |
| users | `GET /api/users` | 200 | `fixtures/contracts/users.json` |
| subscriptions | `GET /api/subscriptions` | 200 | `fixtures/contracts/subscriptions.json` |
| system stats | `GET /api/system/stats` | 200 | `fixtures/contracts/system_stats.json` |
| system health | `GET /api/system/health` | 200 | `fixtures/contracts/system_health.json` |
| metadata | `GET /api/system/metadata` | 200 | `fixtures/contracts/metadata.json` |
| users resolve | `POST /api/users/resolve` | 200 | `fixtures/contracts/users_resolve.json` |
| node plugins | `GET /api/node-plugins` | 200 | `fixtures/contracts/node_plugins.json` |
| bandwidth stats | `GET /api/system/stats/bandwidth` | 200 | `fixtures/contracts/bandwidth_stats.json` |
| HWID | `GET /api/hwid/devices/stats` | 200 | `fixtures/contracts/hwid.json` |
| auth/error path | `GET /api/system/stats` (without auth) | 401 | `fixtures/contracts/auth_error.json` |

## Comparison against bundled OpenAPI (`src/remnawave-api/openapi/remnawave-openapi-2.7.4.json`)

| Claim | Result | Evidence |
|---|---|---|
| Required Task 3 domain routes exist in bundled OpenAPI and are callable on live panel | **confirmed** | OpenAPI path entries + live 200 fixtures for nodes/users/subscriptions/system/metadata/users-resolve/plugins/bandwidth/HWID |
| `POST /api/users/resolve` exists and accepts identifier-based body (`uuid`, `id`, `shortUuid`, `username`) | **confirmed** | OpenAPI `ResolveUserRequestBodyDto`; live `users_resolve.json` succeeded with `uuid` |
| `GET /api/system/stats/recap` is available for baseline | **uncertain** | Route is in OpenAPI/changelog, but not captured in this Task 3 fixture set |

## Comparison against MCP benchmark notes

| Benchmark claim | Result | Evidence |
|---|---|---|
| MCP benchmark references broad coverage across users/nodes/subscriptions/HWID/system domains | **confirmed** | Live panel endpoints in these domains respond successfully in fixtures |
| "51 tools" / "3 resources" / "5 guided prompts" | **uncertain** | This task validates panel contract surface, not MCP server discovery enumeration |
| "Type-safe API via @remnawave/backend-contract" | **uncertain** | Not directly verifiable from panel HTTP payload captures alone |

## Comparison against published changelog / API drift claims

Sources:
- `https://docs.rw/docs/changelog/remnawave-panel/`
- `https://docs.rw/blog/api-changelog/v232-v240/`
- `https://docs.rw/blog/api-changelog/v244-v250/`

| External claim | Result | Evidence |
|---|---|---|
| New endpoint `POST /api/users/resolve` (2.7.0 changes) | **confirmed** | Live `users_resolve.json` status 200 |
| Metadata API endpoint exists (`GET /api/system/metadata`) | **confirmed** | Live `metadata.json` status 200 |
| Node plugins endpoints exist (`GET /api/node-plugins`) | **confirmed** | Live `node_plugins.json` status 200 |
| `/api/system/health` uses `runtimeMetrics` replacement | **confirmed** | `system_health.json` contains `response.runtimeMetrics` |
| Node response drift: modern `system`/`versions` shape present | **confirmed** | `nodes.json` includes `system` and `versions` objects |
| Panel is already on latest changelog version `2.7.4` | **confirmed** | Live `metadata.json` reports panel version `2.7.4` |
| Removed endpoint `/api/bandwidth-stats/nodes/realtime` is no longer reachable | **uncertain** | Not explicitly probed in this fixture set |
| `subLastOpenedAt` / `subLastUserAgent` removed from user payloads | **confirmed** | Not present in sampled `users.json` payload entries |

## Notes and constraints

- Captures were performed with read-only calls only (plus one deliberate unauthenticated request for failure-path evidence).
- No production state mutation was performed.
- Fixtures are intentionally sanitized and representative (not raw full-fidelity secrets).
- Any domain not explicitly probed is marked `uncertain` rather than inferred.
