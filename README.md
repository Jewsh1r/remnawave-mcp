# mcp-remnawave

`mcp-remnawave` is a private, stdio-only MCP server for the Remnawave panel API. The current build exposes a deliberately small, version-gated surface for operators who need supported Remnawave diagnostics, inventory reads, and two preview/apply mutation flows.

This README documents the repository exactly as it works today. It does not inherit upstream inventory counts, remote transport claims, or Docker workflows that are not implemented in this repo.

## Current status

- Package name: `@indiebrothers/mcp-remnawave`
- Server version: `0.1.0`
- MCP protocol version: `2025-06-18`
- Runtime model: local stdio server only
- Built entrypoint: `dist/index.js`
- Supported Remnawave version gate: `2.7.3`
- Unsupported or unknown Remnawave versions: startup fails before discovery is advertised

## Requirements

- Node.js `>=20.11.0`
- npm `>=10.0.0`
- A reachable Remnawave panel base URL
- A valid Remnawave API token

## Installation

Clone the repository, install dependencies, and build the distributable entrypoint:

```bash
npm install
npm run build
```

The server is packaged around `dist/index.js`, and the package `bin` entry maps `mcp-remnawave` to that built file. For local client integration in this repo state, use the built entrypoint directly.

## Environment variables

The runtime reads only these environment variables today:

| Variable | Required | Description |
|---|---|---|
| `REMNAWAVE_BASE_URL` | yes | Base URL for the Remnawave panel API. Missing values fail startup with `REMNAWAVE_BASE_URL_MISSING`. |
| `REMNAWAVE_API_TOKEN` | yes | API token used for Remnawave requests. Missing values fail startup with `REMNAWAVE_API_TOKEN_MISSING`. |
| `REMNAWAVE_VERSION` | recommended | Explicit Remnawave version gate. `2.7.3` is currently the only supported value. Omitted values are treated as `unknown` and fail gated startup. |
| `LOG_LEVEL` | no | One of `debug`, `info`, `warn`, `error`. Invalid or missing values default to `info`. |

Example shell environment:

```bash
export REMNAWAVE_BASE_URL="https://panel.example.test"
export REMNAWAVE_API_TOKEN="replace-with-real-token"
export REMNAWAVE_VERSION="2.7.3"
export LOG_LEVEL="info"
```

## Running the server locally

After building, run the stdio server with the required environment:

```bash
REMNAWAVE_BASE_URL="https://panel.example.test" \
REMNAWAVE_API_TOKEN="replace-with-real-token" \
REMNAWAVE_VERSION="2.7.3" \
node dist/index.js
```

Important runtime behavior:

- `stdout` is reserved for MCP protocol traffic only.
- Startup diagnostics and errors are written to `stderr` only.
- The process keeps `stdin` open and exits cleanly when the host closes it.
- If version gating fails, the server exits non-zero before exposing tools, resources, or prompts.

## Supported inventory

The current discovery surface is explicit and deterministic.

### Stable tools

- `users_list`
- `users_resolve`
- `nodes_list`
- `system_get_stats`
- `system_get_health`
- `subscriptions_list`
- `users_mutate_subscription`
- `users_mutate_squads`

### Advanced tools

- `advanced_get_metadata`
- `advanced_list_node_plugins`
- `advanced_get_bandwidth_stats`
- `advanced_get_hwid_inspection`

### Resources

- `remnawave://panel/statistics`
- `remnawave://nodes/status`
- `remnawave://system/health`

### Prompts

- `operator_diagnostics`
- `user_resolution`
- `node_investigation`
- `traffic_interpretation`
- `plugin_investigation`

## Mutation safety model

Two mutating tools are currently supported:

- `users_mutate_subscription`
- `users_mutate_squads`

Both require an explicit `mode` of `preview` or `apply`.

- `preview` returns the intended actions, risk labels, validation results, and structured accounting without remote writes.
- `apply` performs the planned writes after validation and returns deterministic `planned`, `applied`, `failed`, and `skipped` counts.
- Failure categories are structured and include `validation_failure`, `auth_failure`, `remote_failure`, and `internal_failure`.

This repo does not currently advertise bulk actions, IP control, recap, hosts, config profiles, or other deferred domains.

## Compatibility and version policy

This server is intentionally strict about Remnawave compatibility.

- Supported today: `2.7.3`
- Unsupported values: fail startup with `REMNAWAVE_VERSION_UNSUPPORTED`
- Missing or unknown values: fail startup with `REMNAWAVE_VERSION_UNKNOWN`

The point of this gate is to avoid advertising a tool/resource/prompt surface against an unverified panel version.

For the release-level support boundary, known risks, and published readiness summary, see [`docs/release/production-readiness.md`](./docs/release/production-readiness.md).

## Supported MCP host configuration examples

This project currently ships as a local stdio server. The examples below use the built `dist/index.js` entrypoint and follow MCP local-server configuration conventions.

Replace `/absolute/path/to/mcp-remnawave` with your checked-out repository path and replace the environment values with real credentials.

### Universal local stdio shape

Use this as the generic model for hosts that accept `command`, `args`, and `env`:

```json
{
  "mcpServers": {
    "mcp-remnawave": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-remnawave/dist/index.js"],
      "env": {
        "REMNAWAVE_BASE_URL": "https://panel.example.test",
        "REMNAWAVE_API_TOKEN": "replace-with-real-token",
        "REMNAWAVE_VERSION": "2.7.3",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Claude Desktop

Per the official MCP local-server guidance, Claude Desktop local servers are configured in `claude_desktop_config.json` under `mcpServers`.

```json
{
  "mcpServers": {
    "mcp-remnawave": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-remnawave/dist/index.js"],
      "env": {
        "REMNAWAVE_BASE_URL": "https://panel.example.test",
        "REMNAWAVE_API_TOKEN": "replace-with-real-token",
        "REMNAWAVE_VERSION": "2.7.3",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Cursor

Cursor supports local MCP server definitions using the same stdio shape. Use the built entrypoint rather than `src/index.ts`.

```json
{
  "mcpServers": {
    "mcp-remnawave": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-remnawave/dist/index.js"],
      "env": {
        "REMNAWAVE_BASE_URL": "https://panel.example.test",
        "REMNAWAVE_API_TOKEN": "replace-with-real-token",
        "REMNAWAVE_VERSION": "2.7.3"
      }
    }
  }
}
```

### Windsurf

Windsurf local MCP configuration also uses the same stdio command/args/env structure.

```json
{
  "mcpServers": {
    "mcp-remnawave": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-remnawave/dist/index.js"],
      "env": {
        "REMNAWAVE_BASE_URL": "https://panel.example.test",
        "REMNAWAVE_API_TOKEN": "replace-with-real-token",
        "REMNAWAVE_VERSION": "2.7.3",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Optional Redivo-compatible example

This is only an example for operators who already use Redivo naming conventions. It is not the default setup and does not imply any hidden Redivo-specific behavior in the server.

```json
{
  "mcpServers": {
    "redivo-remnawave": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-remnawave/dist/index.js"],
      "env": {
        "REMNAWAVE_BASE_URL": "https://panel.redivo.example",
        "REMNAWAVE_API_TOKEN": "replace-with-real-token",
        "REMNAWAVE_VERSION": "2.7.3",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Docker status

This repository does not currently ship a Dockerfile, image, or documented container entrypoint. Docker usage is therefore not a supported runtime path today.

If you need containerized execution later, add a real Docker artifact first and document it only after the image build and launch path are verified.

## Troubleshooting

### `REMNAWAVE_BASE_URL` is missing

Symptom:

- Startup exits non-zero.
- `stderr` includes `REMNAWAVE_BASE_URL_MISSING`.

Fix:

- Set `REMNAWAVE_BASE_URL` in the MCP host config `env` block.
- Use an absolute URL for the Remnawave panel API base.

### `REMNAWAVE_API_TOKEN` is missing

Symptom:

- Startup exits non-zero.
- `stderr` includes `REMNAWAVE_API_TOKEN_MISSING`.

Fix:

- Set `REMNAWAVE_API_TOKEN` in the MCP host config `env` block.
- Restart the MCP host after saving the config.

### Authentication failure during tool execution

Symptom:

- Reads or mutations fail after startup.
- Mutation results can report `auth_failure` with codes such as `HTTP_401`.
- Upstream API responses may contain `Unauthorized`.

Fix:

- Verify the token is valid for the configured panel.
- Make sure `REMNAWAVE_BASE_URL` and `REMNAWAVE_API_TOKEN` belong to the same Remnawave environment.
- Re-run with `LOG_LEVEL=debug` and inspect host-side MCP logs.

### Unsupported or unknown Remnawave version

Symptom:

- Startup exits non-zero before discovery is available.
- `stderr` includes either `REMNAWAVE_VERSION_UNSUPPORTED` or `REMNAWAVE_VERSION_UNKNOWN`.

Fix:

- Set `REMNAWAVE_VERSION=2.7.3` if that is the actual verified panel version.
- Do not remove the version gate to force startup; the current server intentionally refuses unverified versions.

### Unsupported or deferred capability behavior

Symptom:

- Calls to removed or deferred capabilities fail with errors such as `Unknown stable tool` or `Unknown stable resource`.
- Examples include `hosts_list`, `config_profiles_list`, `inbounds_list`, `squads_list`, `subscription_page_configs_list`, `ip_control_list`, `bulk_actions_plan`, `recap_get`, and `remnawave://metadata`.

Fix:

- Use only the supported inventory listed in this README.
- Do not copy upstream screenshots, examples, or capability counts into host configs or prompts.
- Treat deferred domains as not implemented until the repo advertises them explicitly.

### Host starts but no tools appear

Fix:

- Confirm you built the project with `npm run build` and that `dist/index.js` exists.
- Confirm the host config points to the built file, not `src/index.ts`.
- Check the host's MCP log output because this server writes diagnostics to `stderr`, not `stdout`.

## Validation commands

Useful local verification commands:

```bash
npm run check
npm test
npm run build
```

To manually probe startup behavior outside an MCP host:

```bash
REMNAWAVE_BASE_URL="https://panel.example.test" \
REMNAWAVE_API_TOKEN="replace-with-real-token" \
REMNAWAVE_VERSION="2.7.3" \
node dist/index.js
```

## Release readiness and published scope

The release/readiness baseline for this repository is intentionally concentrated in two published artifacts:

- [`docs/scope/capability-matrix.md`](./docs/scope/capability-matrix.md) for supported, deferred, compat, and dropped capability decisions
- [`docs/release/production-readiness.md`](./docs/release/production-readiness.md) for the explicit release metadata, compatibility policy, known risks, and verification references

If any other note, example, or external reference appears to conflict with those files, treat the README, capability matrix, and readiness report as authoritative for the current repo state.

## Provenance

This repository is an independent project created by Инди Братья and is not a fork of `TrackLine/mcp-remnawave`.

- No upstream source code, commit history, or binary artifacts were copied at repository initialization.
- Upstream influence is conceptual only unless `NOTICE.md` is updated to record a later import.

For attribution and repository-origin details, see [`NOTICE.md`](./NOTICE.md) and [`docs/adr/0001-repository-origin.md`](./docs/adr/0001-repository-origin.md).

## License

This repository uses the MIT License. See [`LICENSE`](./LICENSE).
