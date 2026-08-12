#!/usr/bin/env bash

set -euo pipefail

install -d -m 700 /etc/remnawave-mcp
IFS= read -rsp "Remnawave MCP token: " token
printf '\n'

if [[ -z "$token" ]]; then
  printf 'Token must not be empty.\n' >&2
  exit 64
fi

umask 077
env_file="$(mktemp /etc/remnawave-mcp/env.XXXXXX)"
trap 'rm -f "$env_file"' EXIT

printf '%s\n' \
  'REMNAWAVE_BASE_URL=http://remnawave:3000' \
  "REMNAWAVE_API_TOKEN=$token" \
  'REMNAWAVE_VERSION=3.2.3' \
  'LOG_LEVEL=error' >"$env_file"

chmod 600 "$env_file"
mv -f "$env_file" /etc/remnawave-mcp/env
trap - EXIT
unset token

printf 'Remnawave MCP token saved.\n'
