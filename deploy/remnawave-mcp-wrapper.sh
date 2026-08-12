#!/bin/sh
set -eu

env_file="${REMNAWAVE_MCP_ENV_FILE:-/etc/remnawave-mcp/env}"
image="${REMNAWAVE_MCP_IMAGE:-remnawave-mcp:0.3.0}"
network="${REMNAWAVE_MCP_NETWORK:-remnawave-network}"

if [ ! -r "$env_file" ]; then
  echo "remnawave-mcp: environment file is not readable: $env_file" >&2
  exit 78
fi

if ! grep -Eq '^REMNAWAVE_API_TOKEN=.+$' "$env_file"; then
  echo "remnawave-mcp: set a dedicated REMNAWAVE_API_TOKEN in $env_file" >&2
  exit 78
fi

exec docker run --rm -i \
  --name "remnawave-mcp-$$" \
  --network "$network" \
  --env-file "$env_file" \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --pids-limit 128 \
  --memory 256m \
  --cpus 1 \
  "$image"
