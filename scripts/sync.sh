#!/usr/bin/env bash
# MaiRec Direct Repository Synchronization Wrapper
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${DIR}/.." && pwd)"

NODE_BIN=""
if [ -n "$MAIREC_NODE" ] && [ -x "$MAIREC_NODE" ]; then
  NODE_BIN="$MAIREC_NODE"
elif [ -f "${DIR}/.node_path" ] && [ -x "$(cat "${DIR}/.node_path" 2>/dev/null)" ]; then
  NODE_BIN="$(cat "${DIR}/.node_path" 2>/dev/null)"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="node"
else
  for candidate in \
    "$HOME/.local/bin/node" \
    /usr/local/bin/node \
    /usr/bin/node \
    /bin/node \
    "$HOME/.nvm/versions/node"/*/bin/node \
    "$HOME/.local/share/fnm/current/bin/node" \
    "$HOME/.fnm/current/bin/node" \
    "$HOME/.asdf/shims/node" \
    "$HOME/.volta/bin/node" \
    /opt/homebrew/bin/node \
    /home/linuxbrew/.linuxbrew/bin/node; do
    if [ -x "$candidate" ]; then
      NODE_BIN="$candidate"
      break
    fi
  done
fi

if [ -n "$NODE_BIN" ]; then
  if [ "$NODE_BIN" != "node" ]; then
    NODE_DIR="$(dirname "$NODE_BIN")"
    export PATH="${NODE_DIR}:${PATH}"
  fi
  exec "$NODE_BIN" "${DIR}/sync.mjs" "$@"
else
  echo "[MaiRec Sync] Error: Node.js is required to run sync.mjs." >&2
  exit 1
fi
