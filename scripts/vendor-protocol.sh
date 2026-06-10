#!/usr/bin/env bash
# Vendors the DeepBook Predict Move sources used by @mysten/codegen.
# The protocol branch is pinned; regenerate bindings with:
#   ./scripts/vendor-protocol.sh && pnpm --filter @callit/core codegen
set -euo pipefail

BRANCH="predict-testnet-4-16"
REPO="https://github.com/MystenLabs/deepbookv3.git"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/.vendor/deepbookv3"

if [ -d "$DEST/.git" ]; then
  echo "Updating existing vendor clone ($BRANCH)..."
  git -C "$DEST" fetch --depth 1 origin "$BRANCH"
  git -C "$DEST" checkout -q FETCH_HEAD
else
  rm -rf "$DEST"
  mkdir -p "$ROOT/.vendor"
  echo "Cloning $REPO@$BRANCH..."
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$DEST"
fi

echo "Vendored at $DEST"
