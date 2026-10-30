#!/usr/bin/env bash
# MaiRec Local Synchronization Bridge Native Host Wrapper
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "${DIR}/sync.mjs" --native "$@"
