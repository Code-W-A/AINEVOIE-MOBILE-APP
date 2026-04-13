#!/bin/sh
set -eu

targets=""

if [ -e "$HOME/.npm" ]; then
  targets="$targets $HOME/.npm"
fi

if [ -e "$HOME/.cache" ]; then
  targets="$targets $HOME/.cache"
fi

targets=$(printf '%s' "$targets" | sed 's/^ *//')

if [ -z "$targets" ]; then
  echo "No cache directories found to repair."
  exit 0
fi

# shellcheck disable=SC2086
sudo chown -R "$(id -u):$(id -g)" $targets
