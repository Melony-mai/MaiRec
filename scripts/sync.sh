#!/usr/bin/env bash
# MaiRec Direct Repository Synchronization Wrapper
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${DIR}/.." && pwd)"

if command -v node >/dev/null 2>&1; then
  exec node "${DIR}/sync.mjs" "$@"
else
  echo "[MaiRec Sync] Error: Node.js is required to run sync.mjs." >&2
  exit 1
fi
