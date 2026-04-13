#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
export COREPACK_HOME="$PROJECT_ROOT/.corepack"
export YARN_CACHE_FOLDER="$PROJECT_ROOT/.yarn-cache"
export YARN_GLOBAL_FOLDER="$PROJECT_ROOT/.yarn-global"

mkdir -p "$COREPACK_HOME" "$YARN_CACHE_FOLDER" "$YARN_GLOBAL_FOLDER"

corepack prepare yarn@1.22.22 --activate >/dev/null

exec yarn "$@"
