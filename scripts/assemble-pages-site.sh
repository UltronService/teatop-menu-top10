#!/usr/bin/env bash
# Merge repo static assets with admin/dist → _site/admin/ for GitHub Pages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/_site"
ADMIN_DIST="$ROOT/admin/dist"

if [[ ! -f "$ADMIN_DIST/index.html" ]]; then
  echo "Missing $ADMIN_DIST/index.html — run: (cd admin && npm run build)" >&2
  exit 1
fi

rm -rf "$SITE"
mkdir -p "$SITE"

shopt -s dotglob nullglob
for item in "$ROOT"/*; do
  base="$(basename "$item")"
  case "$base" in
    _site | .git | admin | node_modules) continue ;;
  esac
  cp -a "$item" "$SITE/$base"
done
shopt -u dotglob nullglob

mkdir -p "$SITE/admin"
cp -a "$ADMIN_DIST"/. "$SITE/admin/"

echo "Assembled Pages site at _site/ (admin bundle: $SITE/admin/)"
